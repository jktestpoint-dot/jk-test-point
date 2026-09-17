import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminFreeMcqImport } from "@/components/AdminFreeMcqImport";
import { getFreeSubjectDefinitions } from "@/lib/free-subject-catalog";

export default async function AdminFreeMcqsPage() { if (!await requireAdmin()) redirect("/dashboard"); return <AdminFreeMcqImport subjects={getFreeSubjectDefinitions()} />; }
