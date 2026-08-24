import type { Metadata } from "next";
import { TriangleAlertIcon } from "lucide-react";

import { SetupNotice } from "@/components/admin/setup-notice";
import { ContentForm, type ContentBlock } from "@/components/admin/content-form";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listPageContent } from "@/lib/crm/queries";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Page content" };

/**
 * The blocks the shop has copy for. Defined here rather than discovered from
 * the table so the form has a stable shape on an empty database — a CMS whose
 * fields only appear once someone has already filled them in is no use.
 */
const schema: { page: string; title: string; blocks: Omit<ContentBlock, "value">[] }[] = [
  {
    page: "home",
    title: "Home",
    blocks: [
      { page: "home", key: "hero_eyebrow", label: "Eyebrow" },
      { page: "home", key: "hero_heading", label: "Heading", multiline: true },
      { page: "home", key: "hero_body", label: "Supporting text", multiline: true },
      { page: "home", key: "hero_cta", label: "Button label" },
    ],
  },
  {
    page: "products",
    title: "Shop",
    blocks: [
      { page: "products", key: "heading", label: "Heading" },
      { page: "products", key: "body", label: "Supporting text", multiline: true },
    ],
  },
  {
    page: "welcome",
    title: "Welcome modal",
    blocks: [
      { page: "welcome", key: "heading", label: "Heading", multiline: true },
      { page: "welcome", key: "body", label: "Body", multiline: true },
    ],
  },
];

export default async function AdminContentPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const stored = await listPageContent();

  const saved = new Map(
    stored.map((row) => [
      `${row.page}:${row.key}`,
      typeof row.value === "string" ? row.value : JSON.stringify(row.value),
    ])
  );

  const pages = schema.map((group) => ({
    page: group.page,
    title: group.title,
    blocks: group.blocks.map((block) => ({
      ...block,
      value: saved.get(`${block.page}:${block.key}`) ?? "",
    })),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Page content
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Copy for the pages that carry a sales message.
      </p>

      <div className="border-border bg-muted/40 mt-6 flex items-start gap-3 rounded-xl border border-dashed p-4">
        <TriangleAlertIcon className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">The pages are not reading this yet</p>
          <p className="text-muted-foreground mt-1">
            Copy is still written into the components. These blocks are stored
            and editable; pointing each page at them is the next step. A blank
            box means nothing has been saved for that block, not that the page
            is empty.
          </p>
        </div>
      </div>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : (
        <ContentForm pages={pages} />
      )}
    </div>
  );
}
