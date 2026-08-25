import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CATEGORIES, encryptAndSave } from "@/lib/categoryStore";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  encryptAndSave(DEFAULT_CATEGORIES);
  return NextResponse.json(DEFAULT_CATEGORIES);
}
