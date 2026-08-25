import { NextRequest, NextResponse } from "next/server";
import { loadCategories, encryptAndSave } from "@/lib/categoryStore";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ufr@admin2026";

export async function GET() {
  const cats = loadCategories();
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const { password, categories } = await req.json();
  if (password !== ADMIN_PASSWORD) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  encryptAndSave(categories);
  return NextResponse.json({ ok: true });
}
