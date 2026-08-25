import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/settingsStore";

export async function GET() {
  return NextResponse.json(loadSettings());
}
