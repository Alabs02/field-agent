import { z } from "zod";

export const ROLES = [
  "account_manager",
  "data_engineer",
  "operations",
  "reviewer",
  "super_admin",
] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const CAPABILITIES = ["read", "scrape", "verify", "admin"] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** Single source of truth for RBAC; the API guard and the UI both read this. */
export const PERMISSIONS: Record<Role, ReadonlySet<Capability>> = {
  account_manager: new Set(["read"]),
  reviewer: new Set(["read"]),
  data_engineer: new Set(["read", "scrape", "verify"]),
  operations: new Set(["read", "scrape", "verify"]),
  super_admin: new Set(["read", "scrape", "verify", "admin"]),
};

export const can = (role: Role | null | undefined, capability: Capability): boolean =>
  role != null && PERMISSIONS[role].has(capability);

export const rolesWith = (capability: Capability): Role[] =>
  ROLES.filter((r) => PERMISSIONS[r].has(capability));

export const ROLE_LABELS: Record<Role, string> = {
  account_manager: "Account manager",
  data_engineer: "Data engineer",
  operations: "Operations",
  reviewer: "Reviewer",
  super_admin: "Super admin",
};

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: RoleSchema,
});
export type SessionUser = z.infer<typeof SessionUserSchema>;
