"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportMenu({ dataset, filters = {} }: { dataset: "promotions" | "brands" | "runs" | "findings" | "audit"; filters?: Record<string,string> }) {
  const [busy, setBusy] = useState(false);
  const generate = async (format: "csv" | "json" | "print") => {
    setBusy(true);
    const windowForPrint = format === "print" ? window.open("", "_blank") : null;
    try {
      const selectedFilters = { ...Object.fromEntries(new URLSearchParams(window.location.search)), ...filters };
      delete selectedFilters.page; delete selectedFilters.pageSize; delete selectedFilters.view;
      const response = await fetch("/backend/exports", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({dataset,format,filters:selectedFilters}) });
      if (!response.ok) throw new Error((await response.json()).error?.message ?? "Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (format === "print" && windowForPrint) windowForPrint.location.href = url;
      else { const link=document.createElement("a"); link.href=url; link.download=`field-agent-${dataset}.${format === "print" ? "html" : format}`; link.click(); }
      setTimeout(() => URL.revokeObjectURL(url),60_000);
      toast.success("Export generated", { description: format === "print" ? "Use the browser Print command to print or save as PDF." : "Includes all records matching your filters." });
    } catch(err) { windowForPrint?.close(); toast.error(err instanceof Error ? err.message : "Export failed"); }
    finally { setBusy(false); }
  };
  return <div className="flex gap-1" aria-label="Export all matching records">{(["csv","json","print"] as const).map(format => <Button key={format} size="sm" variant="outline" disabled={busy} onClick={() => void generate(format)}>{format === "print" ? "Print report" : format.toUpperCase()}</Button>)}</div>;
}
