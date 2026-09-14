import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      title="Not found"
      description="That record does not exist, or it belongs to a different portal."
      action={
        <Button asChild variant="outline">
          <Link href="/app">Back to promotions</Link>
        </Button>
      }
    />
  );
}
