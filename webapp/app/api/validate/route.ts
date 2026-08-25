import { NextRequest, NextResponse } from "next/server";
import { loadCategories } from "@/lib/categoryStore";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const HOURS_PER_CREDIT = 16;
const EMPRESA_JUNIOR_COMBINED_MAX = 4;
const EMPRESA_JUNIOR_TYPES = ["empresa_junior_diretivo", "empresa_junior_assessor", "empresa_junior_participante"];
const ANAIS_COMBINED_MAX = 5;
const ANAIS_TYPES = ["trabalho_anais_resumo", "trabalho_anais_completo"];

function extractEnrollmentYear(rga: string): number | null {
  if (!/^\d{12}$/.test(rga)) return null;
  const year = parseInt(rga.substring(0, 4));
  return year >= 1900 && year <= 2100 ? year : null;
}

export async function POST(req: NextRequest) {
  // Cálculo é barato, mas limitar evita abuso automatizado.
  const limit = rateLimit("validate", clientIp(req), 60, 5 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Muitas requisições. Aguarde ${Math.ceil(limit.retryAfterSec / 60)} minuto(s).` },
      { status: 429 }
    );
  }

  try {
    const { student, autonomous, guided } = await req.json();
    const CATEGORY_CONFIG = loadCategories();
    const enrollmentYear = extractEnrollmentYear(student.rga);
    if (!enrollmentYear)
      return NextResponse.json({ error: "RGA inválido. Deve ter 12 dígitos no formato YYYYXXXXXXXX." }, { status: 400 });

    // ── 1. Separate valid from rejected ──────────────────────────────────
    const validActivities: any[] = [];
    const rejectedActivities: any[] = [];

    const currentYear = new Date().getFullYear(); // dinâmico: vira 2027 em 2027, etc.

    for (const a of (autonomous || [])) {
      const certYear = Number(a.certificateYear);
      if (certYear < enrollmentYear - 2) {
        rejectedActivities.push({
          type: a.type, certificateYear: certYear, description: a.description,
          reason: `Certificado do ano ${certYear} está fora da janela permitida (mínimo: ${enrollmentYear - 2}).`,
        });
      } else if (certYear > currentYear) {
        rejectedActivities.push({
          type: a.type, certificateYear: certYear, description: a.description,
          reason: `Certificado do ano ${certYear} é inválido (máximo permitido: ${currentYear}).`,
        });
      } else {
        validActivities.push({ ...a, certificateYear: certYear, quantity: Number(a.quantity) });
      }
    }

    // ── 2. Compute raw credits PER ENTRY (one row per activity) ──────────
    const entries: { type: string; label: string; description: string; quantity: number; rawCredits: number; }[] = [];

    for (const a of validActivities) {
      const cfg = CATEGORY_CONFIG[a.type];
      if (!cfg) {
        rejectedActivities.push({ type: a.type, certificateYear: a.certificateYear, reason: `Tipo desconhecido: "${a.type}".` });
        continue;
      }
      entries.push({
        type:        a.type,
        label:       cfg.label,
        description: a.description?.trim() || "",
        quantity:    a.quantity,
        rawCredits:  parseFloat((cfg.creditsPerUnit * a.quantity).toFixed(4)),
      });
    }

    // ── 3. Accumulate totals per type to apply caps ───────────────────────
    const rawAccumulator: Record<string, number> = {};
    for (const e of entries) {
      rawAccumulator[e.type] = (rawAccumulator[e.type] ?? 0) + e.rawCredits;
    }

    const cappedAccumulator: Record<string, number> = {};
    for (const [type, raw] of Object.entries(rawAccumulator)) {
      cappedAccumulator[type] = CATEGORY_CONFIG[type] ? Math.min(raw, CATEGORY_CONFIG[type].maxCredits) : 0;
    }

    // Combined caps
    let ejTotal = EMPRESA_JUNIOR_TYPES.reduce((s, t) => s + (cappedAccumulator[t] ?? 0), 0);
    if (ejTotal > EMPRESA_JUNIOR_COMBINED_MAX) {
      let toReduce = ejTotal - EMPRESA_JUNIOR_COMBINED_MAX;
      for (const t of ["empresa_junior_participante", "empresa_junior_assessor", "empresa_junior_diretivo"]) {
        const val = cappedAccumulator[t] ?? 0; if (toReduce <= 0) break;
        const red = Math.min(val, toReduce); cappedAccumulator[t] = val - red; toReduce -= red;
      }
    }
    let anaisTotal = ANAIS_TYPES.reduce((s, t) => s + (cappedAccumulator[t] ?? 0), 0);
    if (anaisTotal > ANAIS_COMBINED_MAX) {
      let toReduce = anaisTotal - ANAIS_COMBINED_MAX;
      for (const t of ["trabalho_anais_completo", "trabalho_anais_resumo"]) {
        const val = cappedAccumulator[t] ?? 0; if (toReduce <= 0) break;
        const red = Math.min(val, toReduce); cappedAccumulator[t] = val - red; toReduce -= red;
      }
    }

    // ── 4. Distribute capped credits back proportionally per entry ────────
    // For each type, if total was capped, scale each entry's credits proportionally
    const cappedPerEntry: number[] = entries.map(e => {
      const raw = rawAccumulator[e.type];
      const capped = cappedAccumulator[e.type] ?? 0;
      if (raw === 0) return 0;
      return parseFloat(((e.rawCredits / raw) * capped).toFixed(4));
    });

    // ── 5. Build breakdown — one row per entry ────────────────────────────
    const breakdown = entries.map((e, i) => {
      const capped = cappedPerEntry[i];
      const totalRawForType = rawAccumulator[e.type];
      const totalCappedForType = cappedAccumulator[e.type] ?? 0;
      const typeLimited = totalRawForType > (CATEGORY_CONFIG[e.type]?.maxCredits ?? Infinity);
      return {
        category:     e.label,
        description:  e.description,
        quantity:     e.quantity,
        rawCredits:   e.rawCredits,
        cappedCredits: capped,
        hours:        parseFloat((capped * HOURS_PER_CREDIT).toFixed(2)),
        limited:      typeLimited,
      };
    });

    const autonomousCredits = parseFloat(cappedPerEntry.reduce((s, v) => s + v, 0).toFixed(4));
    const autonomousHours   = parseFloat((autonomousCredits * HOURS_PER_CREDIT).toFixed(2));

    // ── 6. Guided ─────────────────────────────────────────────────────────
    const guidedBreakdown = (guided || []).filter((g: any) => g.name?.trim()).map((g: any) => {
      const hrs     = Math.max(0, Number(g.hours));
      const credits = parseFloat((hrs / HOURS_PER_CREDIT).toFixed(4));
      return { name: g.name.trim(), semester: g.semester ?? "—", hours: hrs, credits, attachmentFileName: g.fileName };
    });
    const guidedHours   = parseFloat(guidedBreakdown.reduce((s: number, g: any) => s + g.hours, 0).toFixed(2));
    const guidedCredits = parseFloat((guidedHours / HOURS_PER_CREDIT).toFixed(4));

    return NextResponse.json({
      success: true,
      autonomousCredits, autonomousHours,
      guidedCredits, guidedHours,
      totalCredits: parseFloat((autonomousCredits + guidedCredits).toFixed(4)),
      totalHours:   parseFloat((autonomousHours + guidedHours).toFixed(2)),
      breakdown, guidedBreakdown, rejectedActivities,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
