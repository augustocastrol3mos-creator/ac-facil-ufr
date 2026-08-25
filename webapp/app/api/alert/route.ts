import { NextResponse } from "next/server";
import { loadAlert } from "@/lib/alertStore";

export async function GET() {
  return NextResponse.json(loadAlert());
}
