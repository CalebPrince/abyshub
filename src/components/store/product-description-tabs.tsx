"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function paragraphs(description: string) {
  return description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function ProductDescriptionTabs({
  tagline,
  description,
}: {
  tagline: string;
  description: string;
}) {
  const [activeTab, setActiveTab] = React.useState<"summary" | "details">("summary");
  const descriptionParagraphs = paragraphs(description);

  return (
    <div className="border-foreground/12 border-y py-5">
      <div className="flex gap-6 border-b pb-3" role="tablist" aria-label="Product information">
        {[
          { id: "summary" as const, label: "Short description" },
          { id: "details" as const, label: "Full description" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`product-description-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative pb-2 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id ? (
              <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5" />
            ) : null}
          </button>
        ))}
      </div>

      <div
        id={`product-description-${activeTab}`}
        role="tabpanel"
        aria-label={activeTab === "summary" ? "Short description" : "Full description"}
        className="text-muted-foreground pt-5 text-pretty"
      >
        {activeTab === "summary" ? (
          <p>{tagline || "A considered choice for everyday use."}</p>
        ) : descriptionParagraphs.length > 0 ? (
          <div className="space-y-4">
            {descriptionParagraphs.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p>No full description is available yet.</p>
        )}
      </div>
    </div>
  );
}
