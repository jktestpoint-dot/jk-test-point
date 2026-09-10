import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
export async function GET() { try { return NextResponse.json({ admin: Boolean(await requireAdmin()) }); } catch { return NextResponse.json({ admin: false, error: "Unable to verify account role." }, { status: 503 }); } }
