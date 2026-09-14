"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description={error.message.includes("fetch failed") ? "The API is not reachable. Is the api service running on :4000?" : error.message}
      action={
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
      }
    />
  );
}
