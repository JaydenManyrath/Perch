"use client";

import { useMemo, useState, useTransition } from "react";
import { Plane, Package, Briefcase, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";
import type { ChecklistCategory, ChecklistItemRow } from "@/lib/types/contract";
import { toggleChecklistItem } from "@/lib/data/source";

/**
 * PreflightChecklist - the pre-move checklist (A6 + RA36).
 * Owner-scoped; each toggle is optimistic and reverts on error.
 * Round 3: grouped by category (travel, logistics, packing, admin) with
 * per-group progress; within a group, items sort by due_offset (furthest out
 * first so it reads as a countdown).
 */
export function PreflightChecklist({ initial }: { initial: ChecklistItemRow[] }) {
  const [items, setItems] = useState<ChecklistItemRow[]>(initial);
  const [, startTransition] = useTransition();
  const done = items.filter((i) => i.done).length;

  async function onToggle(id: string, next: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: next } : i)));
    startTransition(async () => {
      try {
        await toggleChecklistItem(id, next);
      } catch {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !next } : i)));
      }
    });
  }

  const grouped = useMemo(() => groupByCategory(items), [items]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <CardTitle>Pre-flight</CardTitle>
            <CardDescription>
              Everything to handle before you leave the nest.
            </CardDescription>
          </div>
          <span className="text-caption text-ink-soft font-semibold whitespace-nowrap">
            {done} / {items.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {CATEGORY_ORDER.map((cat) => {
          const rows = grouped[cat];
          if (rows.length === 0) return null;
          const cDone = rows.filter((i) => i.done).length;
          return (
            <section key={cat} aria-labelledby={`preflight-${cat}`}>
              <header className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-500"
                  aria-hidden
                >
                  <CategoryIcon category={cat} />
                </span>
                <h3
                  id={`preflight-${cat}`}
                  className="text-caption font-semibold text-ink-strong uppercase tracking-wide"
                >
                  {CATEGORY_LABEL[cat]}
                </h3>
                <span className="ml-auto text-caption text-ink-soft font-semibold">
                  {cDone} / {rows.length}
                </span>
              </header>
              <ul className="flex flex-col gap-1">
                {rows.map((item) => (
                  <li key={item.id}>
                    <label
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-sky-50 cursor-pointer transition-colors",
                        item.done && "opacity-60"
                      )}
                    >
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={(v) => onToggle(item.id, v === true)}
                        aria-labelledby={`chk-${item.id}`}
                      />
                      <span className="flex-1 min-w-0">
                        <span
                          id={`chk-${item.id}`}
                          className={cn(
                            "block text-body text-ink-strong",
                            item.done && "line-through text-ink-soft"
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="block text-caption text-ink-soft">
                          {dueLabel(item.due_offset)}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

const CATEGORY_ORDER: ChecklistCategory[] = ["travel", "logistics", "packing", "admin"];
const CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  travel: "Travel",
  logistics: "Logistics",
  packing: "Packing",
  admin: "Admin",
};

function CategoryIcon({ category }: { category: ChecklistCategory }) {
  const cls = "h-3.5 w-3.5";
  if (category === "travel") return <Plane className={cls} aria-hidden />;
  if (category === "logistics") return <Package className={cls} aria-hidden />;
  if (category === "packing") return <Briefcase className={cls} aria-hidden />;
  return <FileText className={cls} aria-hidden />;
}

function dueLabel(offset: number) {
  if (offset === 0) return "on move day";
  return `${offset} day${offset === 1 ? "" : "s"} before move`;
}

function groupByCategory(items: ChecklistItemRow[]): Record<ChecklistCategory, ChecklistItemRow[]> {
  const buckets: Record<ChecklistCategory, ChecklistItemRow[]> = {
    travel: [],
    logistics: [],
    packing: [],
    admin: [],
  };
  for (const it of items) {
    const cat: ChecklistCategory = it.category ?? "admin";
    buckets[cat].push(it);
  }
  for (const cat of CATEGORY_ORDER) {
    buckets[cat].sort((a, b) => b.due_offset - a.due_offset);
  }
  return buckets;
}
