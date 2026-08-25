import { NextRequest, NextResponse } from "next/server";
import { rateLimit, resetRateLimit, clientIp } from "@/lib/rateLimit";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  const limit = rateLimit("admin-login", ip, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${Math.ceil(limit.retryAfterSec / 60)} minuto(s).` },
      { status: 429 }
    );
  }

  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD não configurada no servidor. Defina a variável de ambiente." },
      { status: 500 }
    );
  }

  let password = "";
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  resetRateLimit("admin-login", ip);
  return NextResponse.json({ ok: true });
}
