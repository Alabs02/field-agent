import { notFound } from "next/navigation";
import { z } from "zod";
import { IsoDateTime, ROLE_LABELS, RoleSchema } from "@field-agent/shared";
import { RoleSelect } from "@/components/admin/role-select";
import { PageHeader } from "@/components/shared/page-header";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { authRequired, getSessionUser } from "@/lib/session";

const AdminUserSchema = z.object({ id: z.string(), email: z.string(), name: z.string(), role: RoleSchema.nullable(), createdAt: IsoDateTime });

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = authRequired() ? await getSessionUser() : null;
  if (!authRequired() || user?.role !== "super_admin") notFound();
  const users = await apiFetch("/admin/users", z.array(AdminUserSchema));
  const apiPublic = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return (
    <>
      <PageHeader
        eyebrow="Super admin"
        title="Users and queues"
        description="Change a persona's role, or open the raw BullMQ dashboard."
        actions={
          <a href={`${apiPublic}/admin/queues`} target="_blank" rel="noopener noreferrer" className="text-sm underline">
            Open Bull Board →
          </a>
        }
      />
      <div className="overflow-x-auto rounded-lg border border-line bg-bg-elev">
        <table className="w-full text-sm">
          <thead className="bg-bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                <td className="px-4 py-2.5 text-fg-muted">{u.email}</td>
                <td className="px-4 py-2.5">
                  <RoleSelect userId={u.id} role={u.role ?? "reviewer"} self={u.id === user.id} />
                </td>
                <td className="px-4 py-2.5 text-fg-muted tabular">{fmtDateTime(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-fg-subtle">
        Roles: {Object.values(ROLE_LABELS).join(" · ")}. Read is granted to every role; scrape and verify to operations, data engineer, and super admin; this page to super admin only.
      </p>
    </>
  );
}
