"use client";
import { createContext, useContext } from "react";
import { can, type Capability, type Role } from "@field-agent/shared";
const AccessContext = createContext<{ role: Role | null; authRequired: boolean }>({ role: null, authRequired: true });
export function AccessProvider({ children, role, authRequired }: { children: React.ReactNode; role: Role | null; authRequired: boolean }) { return <AccessContext.Provider value={{ role, authRequired }}>{children}</AccessContext.Provider>; }
export function useCan(capability: Capability) { const access = useContext(AccessContext); return !access.authRequired || can(access.role, capability); }
