"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";

export function Pagination({ page, totalPages, total, pageSize }: { page: number; totalPages: number; total: number; pageSize: number }) {
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1).withOptions({ shallow: false, history: "push" }));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="mt-6 flex items-center justify-between gap-3 text-sm text-fg-muted">
      <span className="tabular">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft /> Prev
        </Button>
        <span className="px-2 tabular">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => void setPage(page + 1)} aria-label="Next page">
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
