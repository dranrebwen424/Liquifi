import { notFound } from "next/navigation";
import { ActiveEventsClient } from "@/app/treasurer/events/client";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getDepartmentEvents } from "@/lib/queries/events";

export default async function AdminDepartmentEventsPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  await requireRole("admin");
  const { departmentId } = await params;
  const insforge = await createInsforgeServer();
  const { data: department, error } = await insforge.database
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .maybeSingle();

  if (error || !department) notFound();

  const events = await getDepartmentEvents(departmentId);

  return (
    <ActiveEventsClient
      events={events}
      basePath={`/admin/departments/${departmentId}/events`}
      homePath={`/admin/departments/${departmentId}`}
    />
  );
}
