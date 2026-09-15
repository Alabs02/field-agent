import { PageHeader } from "@/components/shared/page-header";
import { Notifications } from "@/components/operations/notifications";
export const metadata = { title: "Notifications" };
export default function NotificationsPage() { return <><PageHeader eyebrow="Operations" title="Notifications" description="Run outcomes, source issues, and schedule changes, linked to the evidence." /><Notifications /></>; }
