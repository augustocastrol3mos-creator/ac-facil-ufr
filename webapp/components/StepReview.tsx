"use client";
import { useState } from "react";
import type { AppData } from "@/app/page";

type Props = { appData: AppData; onResult: (r: any) => void; onBack: () => void; onNext: () => void; };

export default function StepReview({ appData, onResult, onBack, onNext }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const calculate = async () => {
    setLoading(true); setError("");
    try {
      // Strip fileData before sending to validate (not needed, saves bandwidth)
      const payload = {
        ...appData,
        autonomous: appData.autonomous.map(({ fileData, fileMime, ...rest }: any) => rest),
        guided: appData.guided.map(({ fileData, fileMime, ...rest }: any) => rest),
      };
      const res = await fetch("/api/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao validar");
      setResult(data); onResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ background: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>

        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1D1D1B" }}>Revisão e Cálculo</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>Confirme os dados e calcule seus créditos antes de gerar os PDFs.</p>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Student summary */}
          <div style={{ padding: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <p style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", marginBottom: "10px" }}>IDENTIFICAÇÃO</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              {[["Nome", appData.student.name], ["RGA", appData.student.rga], ["Curso", "Administração"]].map(([l, v]) => (
                <div key={l}><p style={{ fontSize: "11px", color: "#94a3b8" }}>{l}</p><p style={{ fontSize: "14px", fontWeight: "600", wordBreak: "break-all" }}>{v || "—"}</p></div>
              ))}
            </div>
          </div>

          {/* Activities count */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ padding: "12px", background: "#F0FBF2", border: "1px solid #B2DFBC", borderRadius: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#1B6B35", marginBottom: "4px" }}>AUTÔNOMAS</p>
              <p style={{ fontSize: "22px", fontWeight: "800", color: "#20376B" }}>{appData.autonomous.length}</p>
              <p style={{ fontSize: "12px", color: "#64748b" }}>atividade{appData.autonomous.length !== 1 ? "s" : ""}</p>
            </div>
            <div style={{ padding: "12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#075985", marginBottom: "4px" }}>GUIADAS</p>
              <p style={{ fontSize: "22px", fontWeight: "800", color: "#0369a1" }}>{appData.guided.length}</p>
              <p style={{ fontSize: "12px", color: "#64748b" }}>atividade{appData.guided.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Calculate */}
          {!result && (
            <button onClick={calculate} disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "#6b7280" : "#20376B", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "⏳ Calculando..." : "🧮 Calcular Créditos"}
            </button>
          )}
          {error && <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "7px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}

          {/* Results */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Totals */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Autônomas", credits: result.autonomousCredits, hours: result.autonomousHours, color: "#20376B", bg: "#f0f7f1", border: "#c6dfc9" },
                  { label: "Guiadas",   credits: result.guidedCredits,    hours: result.guidedHours,    color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
                  { label: "Total",     credits: result.totalCredits,     hours: result.totalHours,     color: "#1D1D1B", bg: "#f8fafc", border: "#e2e8f0" },
                ].map(item => (
                  <div key={item.label} style={{ border: `1px solid ${item.border}`, borderRadius: "8px", padding: "12px", background: item.bg, textAlign: "center" }}>
                    <p style={{ fontSize: "10px", color: item.color, fontWeight: "700", marginBottom: "4px" }}>{item.label.toUpperCase()}</p>
                    <p style={{ fontSize: "24px", fontWeight: "800", color: item.color, lineHeight: 1 }}>{fmt(item.credits)}</p>
                    <p style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>{item.hours}h</p>
                  </div>
                ))}
              </div>

              {/* Breakdown table — scrollable on mobile */}
              {result.breakdown?.length > 0 && (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: "#F0FBF2", borderBottom: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "#1B6B35" }}>DETALHAMENTO — AUTÔNOMAS</p>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "480px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["Categoria", "Descrição", "Qtd.", "Créditos", "Horas", ""].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: h === "Categoria" || h === "Descrição" ? "left" : "center", fontSize: "11px", color: "#64748b", fontWeight: "600", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.breakdown.map((item: any, i: number) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 12px", color: "#475569", fontSize: "12px" }}>{item.category}</td>
                            <td style={{ padding: "8px 12px", color: "#1D1D1B", fontStyle: item.description ? "normal" : "italic" }}>{item.description || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                            <td style={{ padding: "8px 12px", textAlign: "center", color: "#64748b" }}>{item.quantity}</td>
                            <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: "700", color: "#1B6B35" }}>{fmt(item.cappedCredits)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "center", color: "#64748b" }}>{item.hours}h</td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              {item.limited
                                ? <span style={{ fontSize: "10px", color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: "10px", whiteSpace: "nowrap" }}>⚠ Limitado</span>
                                : <span style={{ fontSize: "10px", color: "#20376B", background: "#dcfce7", padding: "2px 6px", borderRadius: "10px" }}>✓ OK</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {result.rejectedActivities?.length > 0 && (
                <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#dc2626", marginBottom: "6px" }}>⚠ Atividades rejeitadas ({result.rejectedActivities.length})</p>
                  {result.rejectedActivities.map((r: any, i: number) => (
                    <p key={i} style={{ fontSize: "12px", color: "#b91c1c", marginTop: "3px" }}>{r.reason}</p>
                  ))}
                </div>
              )}

              {/* SEI warning */}
              {result.breakdown?.length > 0 && result.guidedBreakdown?.length > 0 && (
                <div style={{ padding: "12px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#92400e" }}>⚠ Dois processos SEI necessários</p>
                  <p style={{ fontSize: "12px", color: "#78350f", marginTop: "4px" }}>Você possui atividades autônomas e guiadas. O sistema gerará dois PDFs — cada um deve ser anexado em um processo SEI separado.</p>
                </div>
              )}

              <button onClick={() => { setResult(null); onResult(null); }}
                style={{ fontSize: "12px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start" }}>
                ↺ Recalcular
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: "10px" }}>
          <button onClick={onBack} style={{ padding: "11px 20px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "13px", fontWeight: "600", cursor: "pointer", flex: 1 }}>← Voltar</button>
          {result && <button onClick={onNext} style={{ padding: "11px 20px", background: "#20376B", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "700", cursor: "pointer", flex: 2 }}
            onMouseOver={e => e.currentTarget.style.background = "#172d5a"} onMouseOut={e => e.currentTarget.style.background = "#20376B"}>
            Gerar PDFs →
          </button>}
        </div>
      </div>
    </div>
  );
}
