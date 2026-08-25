import { NextRequest, NextResponse } from "next/server";
import { loadAlert, saveAlert } from "@/lib/alertStore";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function GET() {
  return NextResponse.json(loadAlert());
}

export async function POST(req: NextRequest) {
  const { password, alert } = await req.json();
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD)
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  saveAlert(alert);
  return NextResponse.json({ ok: true });
}
