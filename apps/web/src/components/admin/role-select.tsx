"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ROLE_LABELS, ROLES, type Role } from "@field-agent/shared";
import { Select } from "@/components/ui/input";

export function RoleSelect({ userId, role, self }: { userId: string; role: Role; self: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Select
      value={role}
      disabled={busy || self}
      title={self ? "You cannot change your own role" : undefined}
      onChange={async (e) => {
        setBusy(true);
        try {
          const res = await fetch(`/backend/admin/users/${userId}/role`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ role: e.target.value }),
          });
          if (!res.ok) throw new Error(((await res.json()) as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
          toast.success("Role updated");
          router.refresh();
        } catch (err) {
          toast.error("Could not update role", { description: err instanceof Error ? err.message : String(err) });
        } finally {
          setBusy(false);
        }
      }}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </Select>
  );
}
