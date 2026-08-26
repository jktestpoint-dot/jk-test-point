import { getStudents } from "@/lib/supabase";

/**
 * Secure server boundary for the existing Supabase `students` table.
 * Table access remains controlled by Supabase Row Level Security policies.
 */
export async function GET() {
  try {
    const students = await getStudents();
    return Response.json({ data: students });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load students.";
    const status = message.includes("not configured") ? 503 : 502;
    return Response.json({ error: message }, { status });
  }
}
