import { AlertTriangle, CircleCheck, CircleDashed, CircleX, HelpCircle } from "lucide-react";
import Link from "next/link";
import type { PromotionVerification } from "@field-agent/shared";
import { Badge } from "@/components/ui/badge";
import { relative } from "@/lib/format";

export function VerificationBadge({ v, compact = false }: { v: PromotionVerification; compact?: boolean }) {
  if (!v.lastOutcome) {
    return (
      <Badge tone="neutral" title="This promotion has not been verified against the source yet">
        <CircleDashed className="size-3" /> {compact ? "Unverified" : "Never verified"}
      </Badge>
    );
  }
  const when = relative(v.lastVerifiedAt);
  const link = v.lastRunId ? `/app/verify/${v.lastRunId}` : undefined;
  const inner = (() => {
    switch (v.lastOutcome) {
      case "clean":
        return (
          <Badge tone="ok" title={`Matched the source ${when}`}>
            <CircleCheck className="size-3" /> {compact ? "Verified" : `Verified ${when}`}
          </Badge>
        );
      case "changed":
        return (
          <Badge tone="warn" title={`Drifted from the source ${when}. Open the report for before/after.`}>
            <AlertTriangle className="size-3" /> Drifted
          </Badge>
        );
      case "missing_at_source":
        return (
          <Badge tone="bad" title={`Gone from the source ${when}`}>
            <CircleX className="size-3" /> Gone from source
          </Badge>
        );
      case "unverifiable":
        return (
          <Badge tone="neutral" title={`Could not be verified ${when}`}>
            <HelpCircle className="size-3" /> Could not verify
          </Badge>
        );
    }
  })();
  return link && v.lastOutcome !== "clean" ? <Link href={link}>{inner}</Link> : inner;
}
