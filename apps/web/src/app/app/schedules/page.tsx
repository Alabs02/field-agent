import Link from "next/link";
import { ScheduleSchema, OperationPolicySchema } from "@field-agent/shared";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { SchedulePanel } from "@/components/operations/schedule-panel";

export const metadata = { title: "Schedules" };
export default async function SchedulesPage() {
  const [schedule, policy] = await Promise.all([apiFetch("/schedules", ScheduleSchema), apiFetch("/operations/policy", OperationPolicySchema)]);
  return <><PageHeader eyebrow="Operations" title="Schedules" description="One shared schedule, a consistent source budget, and a record of every configuration change." actions={<Link href="/app/audit?action=schedule.updated" className="text-sm underline">Configuration history</Link>} /><SchedulePanel initial={schedule} canEdit={policy.canSchedule} /></>;
}
