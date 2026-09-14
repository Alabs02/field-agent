"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, type Role } from "@field-agent/shared";
import { Button } from "@/components/ui/button";

export function UserMenu({ user }: { user: { name: string; role: Role } | null }) {
  const router = useRouter();
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
        Sign in
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden sm:inline">
        <span className="font-medium text-fg">{user.name}</span> <span className="text-fg-muted">· {ROLE_LABELS[user.role]}</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Sign out"
        onClick={async () => {
          await fetch("/backend/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
          router.push("/login");
          router.refresh();
        }}
      >
        <LogOut />
      </Button>
    </div>
  );
}
