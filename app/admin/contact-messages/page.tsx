import { redirect } from "next/navigation";

import { AdminContactMessages } from "@/components/AdminContactMessages";
import { requireAdmin } from "@/lib/admin-auth";

export default async function ContactMessagesPage() {
  if (!await requireAdmin()) redirect("/dashboard");
  return <AdminContactMessages />;
}
