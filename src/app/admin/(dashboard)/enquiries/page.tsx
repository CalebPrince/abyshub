import type { Metadata } from "next";
import Link from "next/link";
import { BotIcon, Clock3Icon, MailIcon, MessageCircleIcon, MessagesSquareIcon, PhoneIcon, UserRoundIcon } from "lucide-react";

import { setLeadStage } from "@/app/admin/data-actions";
import { SetupNotice } from "@/components/admin/setup-notice";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/dal";
import { listChatSessions, listLeads, type ChatSessionRow, type LeadRow } from "@/lib/crm/queries";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox" };
const STAGES = ["new", "contacted", "quoted", "won", "lost"];
type InboxItem =
  | { kind: "lead"; id: string; updatedAt: string; lead: LeadRow }
  | { kind: "chat"; id: string; updatedAt: string; session: ChatSessionRow };
type Turn = { role: "user" | "assistant"; text: string };

export default async function AdminEnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  await requireAdmin();
  const connected = adminClientAvailable();
  const [{ thread }, leads, sessions] = await Promise.all([searchParams, listLeads(150), listChatSessions(150)]);
  const items: InboxItem[] = [
    ...leads.map((lead): InboxItem => ({ kind: "lead", id: lead.id, updatedAt: lead.created_at, lead })),
    ...sessions.filter((session) => readTurns(session.transcript_json).length > 0).map((session): InboxItem => ({ kind: "chat", id: session.id, updatedAt: session.updated_at, session })),
  ].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const requested = typeof thread === "string" ? thread : "";
  const selected = items.find((item) => itemKey(item) === requested) ?? items[0] ?? null;
  const waiting = sessions.filter((session) => session.needs_human).length;
  const newLeads = leads.filter((lead) => lead.stage === "new").length;

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">Correspondence desk</p>
          <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">Inbox</h1>
          <p className="text-muted-foreground mt-3 text-sm">Website enquiries, contact messages and Mimi conversations in one place.</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="border-border bg-card rounded-full border px-3 py-1.5">{newLeads} new messages</span>
          <span className={cn("rounded-full border px-3 py-1.5", waiting ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300" : "border-border bg-card")}>{waiting} need a person</span>
        </div>
      </div>
      {!connected ? <div className="mt-8"><SetupNotice /></div> : null}

      <div className="border-border bg-card mt-8 grid min-h-[650px] overflow-hidden rounded-2xl border shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-border border-b lg:border-r lg:border-b-0">
          <div className="border-border flex items-center justify-between border-b px-4 py-3"><span className="text-xs font-bold tracking-[0.14em] uppercase">All conversations</span><span className="text-muted-foreground text-xs">{items.length}</span></div>
          <div className="max-h-[440px] overflow-y-auto lg:max-h-[700px]">
            {items.length === 0 ? <div className="text-muted-foreground p-8 text-center text-sm"><MessagesSquareIcon className="mx-auto mb-3 size-8 opacity-40" />New messages will appear here.</div> : items.map((item) => <InboxRow key={itemKey(item)} item={item} active={selected ? itemKey(item) === itemKey(selected) : false} />)}
          </div>
        </aside>
        <section className="min-w-0 bg-muted/20">{selected ? <InboxDetail item={selected} /> : <div className="grid min-h-[500px] place-items-center p-8 text-center"><div><MessagesSquareIcon className="text-muted-foreground mx-auto size-10" /><h2 className="font-display mt-4 text-xl font-bold uppercase">Inbox clear</h2><p className="text-muted-foreground mt-2 text-sm">There are no enquiries or conversations yet.</p></div></div>}</section>
      </div>
    </div>
  );
}

function InboxRow({ item, active }: { item: InboxItem; active: boolean }) {
  const isChat = item.kind === "chat";
  const name = isChat ? item.session.client_name || item.session.client_phone || "WhatsApp customer" : item.lead.name;
  const preview = isChat ? readTurns(item.session.transcript_json).at(-1)?.text || "Conversation" : item.lead.details;
  const label = isChat ? channelLabel(item.session.channel) : sourceLabel(item.lead.source);
  const attention = isChat ? item.session.needs_human : item.lead.stage === "new";
  return (
    <Link href={`/admin/enquiries?thread=${encodeURIComponent(itemKey(item))}`} className={cn("border-border block border-b px-4 py-4 transition-colors", active ? "bg-primary/8 shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-muted/60")}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", isChat ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : "bg-primary/10 text-primary")}>{isChat ? <MessageCircleIcon className="size-4" /> : <MailIcon className="size-4" />}</span>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{name}</p>{attention ? <span className="bg-primary size-2 shrink-0 rounded-full" aria-label="Needs attention" /> : null}<time className="text-muted-foreground ml-auto shrink-0 text-[10px]">{shortDate(item.updatedAt)}</time></div><p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">{preview}</p><span className="text-muted-foreground mt-2 block text-[9px] font-bold tracking-[0.14em] uppercase">{label}</span></div>
      </div>
    </Link>
  );
}

function InboxDetail({ item }: { item: InboxItem }) {
  if (item.kind === "lead") return <LeadDetail lead={item.lead} />;
  const { session } = item;
  const turns = readTurns(session.transcript_json);
  const name = session.client_name || session.client_phone || "WhatsApp customer";
  return (
    <div>
      <DetailHeader name={name} label={`${channelLabel(session.channel)} conversation`} phone={session.client_phone} date={session.updated_at} attention={session.needs_human ? "Waiting for a person" : undefined} />
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
        <div className="text-muted-foreground flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase"><span className="bg-border h-px flex-1" />Conversation transcript<span className="bg-border h-px flex-1" /></div>
        {turns.map((turn, index) => <div key={`${index}-${turn.text.slice(0, 20)}`} className={cn("flex gap-3", turn.role === "user" ? "justify-start" : "justify-end")}>{turn.role === "user" ? <span className="bg-muted grid size-8 shrink-0 place-items-center rounded-full"><UserRoundIcon className="size-3.5" /></span> : null}<div className={cn("max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm", turn.role === "user" ? "border-border bg-background rounded-tl-sm border" : "bg-primary text-primary-foreground rounded-tr-sm")}><p className="whitespace-pre-wrap">{turn.text}</p></div>{turn.role === "assistant" ? <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full"><BotIcon className="size-3.5" /></span> : null}</div>)}
      </div>
    </div>
  );
}

function LeadDetail({ lead }: { lead: LeadRow }) {
  return <div><DetailHeader name={lead.name} label={sourceLabel(lead.source)} phone={lead.phone} email={lead.email} date={lead.created_at} attention={lead.stage === "new" ? "New message" : undefined} /><div className="mx-auto max-w-3xl p-4 sm:p-8"><article className="border-border bg-background rounded-2xl border p-5 shadow-sm sm:p-7"><p className="text-primary text-[10px] font-bold tracking-[0.18em] uppercase">Message</p><p className="mt-4 text-sm leading-7 whitespace-pre-wrap">{lead.details}</p>{lead.basket_summary && lead.basket_summary !== "No basket attached." ? <div className="border-border bg-muted/40 mt-6 rounded-xl border p-4"><p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Attached basket</p><p className="mt-2 text-sm">{lead.basket_summary}</p></div> : null}</article><form action={setLeadStage} className="border-border mt-5 flex flex-wrap items-center gap-3 rounded-xl border bg-background p-4"><input type="hidden" name="id" value={lead.id} /><label htmlFor={`stage-${lead.id}`} className="text-xs font-bold tracking-wider uppercase">Status</label><select id={`stage-${lead.id}`} name="stage" defaultValue={lead.stage} className="border-input bg-background h-9 rounded-md border px-3 text-sm capitalize">{STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select><Button type="submit" size="sm" variant="outline">Save status</Button></form></div></div>;
}

function DetailHeader({ name, label, phone, email, date, attention }: { name: string; label: string; phone?: string | null; email?: string | null; date: string; attention?: string }) {
  return <header className="border-border bg-background border-b p-4 sm:px-7 sm:py-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-extrabold tracking-tight uppercase">{name}</h2>{attention ? <span className="bg-amber-100 text-amber-800 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase dark:bg-amber-950 dark:text-amber-300">{attention}</span> : null}</div><p className="text-muted-foreground mt-1 text-xs font-semibold tracking-wider uppercase">{label}</p></div><time className="text-muted-foreground flex items-center gap-1.5 text-xs"><Clock3Icon className="size-3.5" />{longDate(date)}</time></div>{phone || email ? <div className="mt-4 flex flex-wrap gap-2">{phone ? <a href={`tel:${phone}`} className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"><PhoneIcon className="size-3.5" />{phone}</a> : null}{email ? <a href={`mailto:${email}`} className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"><MailIcon className="size-3.5" />{email}</a> : null}</div> : null}</header>;
}

function readTurns(value: unknown): Turn[] { if (!Array.isArray(value)) return []; return value.flatMap((entry): Turn[] => { if (!entry || typeof entry !== "object") return []; const record = entry as Record<string, unknown>; const text = typeof record.text === "string" ? record.text.trim() : ""; if (!text) return []; return [{ role: record.role === "assistant" ? "assistant" : "user", text }]; }); }
function itemKey(item: InboxItem) { return `${item.kind}:${item.id}`; }
function channelLabel(channel: ChatSessionRow["channel"]) { return channel === "whatsapp" ? "Mimi · WhatsApp" : channel === "voice" ? "Mimi · Voice" : "Mimi · Website chat"; }
function sourceLabel(source: string) { return source === "contact" ? "Contact form" : source === "chat" ? "Website chat handoff" : source === "enquiry" ? "Quote enquiry" : source; }
function shortDate(value: string) { return new Intl.DateTimeFormat("en-GH", { month: "short", day: "numeric" }).format(new Date(value)); }
function longDate(value: string) { return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
