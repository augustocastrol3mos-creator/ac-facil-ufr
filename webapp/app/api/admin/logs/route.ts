import { NextRequest, NextResponse } from "next/server";
import { loadLogs } from "@/lib/logStore";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ufr@admin2026";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== ADMIN_PASSWORD)
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  return NextResponse.json(loadLogs());
}
