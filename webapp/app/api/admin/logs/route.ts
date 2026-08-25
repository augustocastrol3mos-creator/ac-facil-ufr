import { NextRequest, NextResponse } from "next/server";
import { loadLogs } from "@/lib/logStore";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD)
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  return NextResponse.json(loadLogs());
}
