"use client";

import type { Category } from "@/domain/types";
import { Button } from "@/components/ui/button";

export const ALL_CATEGORIES = "all";

export function CategoryTabs({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange(v: string): void;
}) {
  const tabs = [{ id: ALL_CATEGORIES, name: "All" }, ...categories];
  return (
    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((c) => (
        <Button
          key={c.id}
          size="sm"
          variant={c.id === value ? "dark" : "secondary"}
          className={c.id === value ? "" : "border-hairline bg-white"}
          onClick={() => onChange(c.id)}
        >
          {c.name}
        </Button>
      ))}
    </div>
  );
}
