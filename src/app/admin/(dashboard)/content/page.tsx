import type { Metadata } from "next";
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
        Copy for the pages that carry a sales message. A blank box keeps the
        wording already written into the page, so an empty field is an unedited
        block rather than an empty one.
      </p>

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
