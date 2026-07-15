"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";
import type { ChecklistItemRow } from "@/lib/types/contract";
import { toggleChecklistItem } from "@/lib/data/source";

/**
 * PreflightChecklist — the pre-move checklist (A6). Owner-scoped; each toggle
 * is optimistic and reverts on error. Sorted by due_offset (days before move_in).
 */
export function PreflightChecklist({ initial }: { initial: ChecklistItemRow[] }) {
  const [items, setItems] = useState<ChecklistItemRow[]>(
    [...initial].sort((a, b) => b.due_offset - a.due_offset)
  );
  const [, startTransition] = useTransition();
  const done = items.filter((i) => i.done).length;

  async function onToggle(id: string, next: boolean) {
    // Optimistic: flip locally, then write. Revert on error.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: next } : i)));
    startTransition(async () => {
      try {
        await toggleChecklistItem(id, next);
      } catch {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !next } : i)));
      }
    });
  }

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
      <CardContent>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <label
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sky-50 cursor-pointer transition-colors",
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
                    {item.due_offset === 0
                      ? "on move day"
                      : `${item.due_offset} day${item.due_offset === 1 ? "" : "s"} before move`}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
