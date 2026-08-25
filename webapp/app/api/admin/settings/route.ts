import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settingsStore";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function GET() {
  return NextResponse.json(loadSettings());
}

export async function POST(req: NextRequest) {
  const { password, settings } = await req.json();
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD)
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  saveSettings(settings);
  return NextResponse.json({ ok: true });
}
