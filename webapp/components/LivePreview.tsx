"use client";
import type { AppData } from "@/app/page";

type Props = { appData: AppData; step: number };

const HOURS_PER_CREDIT = 16;

function fmt(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
}

export default function LivePreview({ appData, step }: Props) {
  const { student, autonomous, guided } = appData;
  const enrollYear = /^\d{12}$/.test(student.rga) ? parseInt(student.rga.substring(0, 4)) : null;

  // Quick credit estimate (no caps applied — just for preview)
  const autoHoursEst = autonomous.reduce((s, a) => s + a.quantity * HOURS_PER_CREDIT * 0.5, 0);
  const guidedHoursEst = guided.reduce((s, g) => s + g.hours, 0);
  const totalHoursEst = autoHoursEst + guidedHoursEst;

  const hasData = student.name || student.rga || autonomous.length > 0 || guided.length > 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#53B366", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: "12px", color: "var(--ufr-text-muted)", fontWeight: "600" }}>
          Pré-visualização ao vivo · requerimento_acg.pdf
        </span>
      </div>

      {/* Paper */}
      <div style={{
        background: "white", borderRadius: "4px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
        padding: "28px 28px 36px",
        fontFamily: "Arial, sans-serif",
        minHeight: "520px",
        position: "relative",
        border: "1px solid #e8eaf0",
      }}>
        {/* Paper header */}
        <div style={{ borderBottom: "2px solid var(--ufr-blue-dark)", paddingBottom: "10px", marginBottom: "14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo-ufr.png" alt="UFR" style={{ height: "28px", width: "auto" }} />
            <div>
              <div style={{ fontSize: "7px", color: "var(--ufr-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Universidade Federal de Rondonópolis</div>
              <div style={{ fontSize: "9px", fontWeight: "700", color: "var(--ufr-blue-dark)" }}>Requerimento de Atividades Complementares</div>
              <div style={{ fontSize: "7px", color: "var(--ufr-text-muted)" }}>PROGRAD · Pró-Reitoria de Ensino de Graduação</div>
            </div>
          </div>
        </div>

        {/* Section 1: Student ID */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "8px", fontWeight: "700", color: "var(--ufr-blue-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ display: "inline-block", width: "14px", height: "14px", background: "var(--ufr-blue-dark)", color: "white", borderRadius: "2px", textAlign: "center", lineHeight: "14px", fontSize: "7px", fontWeight: "800" }}>1</span>
            Identificação do Aluno
          </div>
          <div style={{ border: "1px solid #e2e6ef", borderRadius: "4px", overflow: "hidden" }}>
            {[
              ["Nome", student.name || <Placeholder text="Nome completo" />],
              ["Matrícula", student.rga || <Placeholder text="RGA (12 dígitos)" />],
              ["Curso", "Administração"],
            ].map(([l, v], i) => (
              <div key={i as number} style={{ display: "flex", borderBottom: i < 2 ? "1px solid #e2e6ef" : "none" }}>
                <div style={{ width: "70px", padding: "5px 8px", background: "#f7f8fb", fontSize: "7px", fontWeight: "700", color: "var(--ufr-text-muted)", flexShrink: 0 }}>{l as string}</div>
                <div style={{ padding: "5px 8px", fontSize: "8px", color: "var(--ufr-text)", flex: 1 }}>{v as any}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Activities */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "8px", fontWeight: "700", color: "var(--ufr-blue-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ display: "inline-block", width: "14px", height: "14px", background: "var(--ufr-blue-dark)", color: "white", borderRadius: "2px", textAlign: "center", lineHeight: "14px", fontSize: "7px", fontWeight: "800" }}>2</span>
            Atividades Complementares
          </div>

          {autonomous.length === 0 && guided.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", border: "1px dashed #d0d5e8", borderRadius: "4px" }}>
              <div style={{ fontSize: "8px", color: "#94a3b8" }}>Nenhuma atividade registrada ainda</div>
            </div>
          ) : (
            <div style={{ border: "1px solid #e2e6ef", borderRadius: "4px", overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 36px 36px", background: "var(--ufr-blue-dark)", gap: 0 }}>
                {["Cód.", "Atividade", "Qtd.", "Horas"].map(h => (
                  <div key={h} style={{ padding: "4px 5px", fontSize: "6.5px", fontWeight: "700", color: "white", textTransform: "uppercase" }}>{h}</div>
                ))}
              </div>
              {/* Autonomous rows */}
              {autonomous.map((a, i) => (
                <div key={a.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 36px 36px", borderBottom: "1px solid #e2e6ef", background: i % 2 === 0 ? "white" : "#f9fafb" }}>
                  <div style={{ padding: "4px 5px", fontSize: "6.5px", color: "#64748b", fontFamily: "monospace" }}>A-{i + 1}</div>
                  <div style={{ padding: "4px 5px", fontSize: "7px", color: "var(--ufr-text)" }}>
                    <div style={{ fontWeight: "500" }}>{a.description || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{a.type.replace(/_/g, " ")}</span>}</div>
                  </div>
                  <div style={{ padding: "4px 5px", fontSize: "7px", color: "#64748b", textAlign: "center" }}>{a.quantity}</div>
                  <div style={{ padding: "4px 5px", fontSize: "7px", color: "#64748b", textAlign: "center" }}>—</div>
                </div>
              ))}
              {/* Guided rows */}
              {guided.map((g, i) => (
                <div key={g.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 36px 36px", borderBottom: "1px solid #e2e6ef", background: (autonomous.length + i) % 2 === 0 ? "white" : "#f9fafb" }}>
                  <div style={{ padding: "4px 5px", fontSize: "6.5px", color: "#0369a1", fontFamily: "monospace" }}>G-{i + 1}</div>
                  <div style={{ padding: "4px 5px", fontSize: "7px", color: "var(--ufr-text)" }}>
                    <div style={{ fontWeight: "500" }}>{g.name || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Atividade guiada</span>}</div>
                    {g.semester && <div style={{ fontSize: "6px", color: "#64748b" }}>{g.semester}</div>}
                  </div>
                  <div style={{ padding: "4px 5px", fontSize: "7px", color: "#64748b", textAlign: "center" }}>1</div>
                  <div style={{ padding: "4px 5px", fontSize: "7px", color: "#0369a1", textAlign: "center", fontWeight: "600" }}>{g.hours}h</div>
                </div>
              ))}
              {/* Total row */}
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 36px 36px", background: "#f0f3fa", borderTop: "2px solid var(--ufr-blue-dark)" }}>
                <div style={{ padding: "5px", gridColumn: "1/3" }}>
                  <div style={{ fontSize: "7px", fontWeight: "700", color: "var(--ufr-blue-dark)", paddingLeft: "5px" }}>Total</div>
                </div>
                <div style={{ padding: "5px", fontSize: "7px", textAlign: "center", color: "#64748b" }}>—</div>
                <div style={{ padding: "5px", fontSize: "7.5px", fontWeight: "800", color: "var(--ufr-blue-dark)", textAlign: "center" }}>
                  {guidedHoursEst > 0 ? `${guidedHoursEst}h` : "—"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enrollment year notice */}
        {enrollYear && (
          <div style={{ padding: "5px 8px", background: "#f0f7f1", border: "1px solid #c6dfc9", borderRadius: "3px", marginBottom: "10px" }}>
            <div style={{ fontSize: "7px", color: "#1e5528" }}>
              Certificados válidos: {enrollYear - 2} — presente (baseado no ano de matrícula {enrollYear})
            </div>
          </div>
        )}

        {/* Footer of paper */}
        <div style={{ position: "absolute", bottom: "14px", left: "28px", right: "28px", borderTop: "1px solid #e2e6ef", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "6.5px", color: "#94a3b8" }}>UFR · PROGRAD · {new Date().getFullYear()}</span>
          <span style={{ fontSize: "6.5px", color: "#94a3b8" }}>Página 1 de 1 · gerado em {new Date().toLocaleDateString("pt-BR")}</span>
        </div>
      </div>

      <p style={{ fontSize: "11px", color: "var(--ufr-text-faint)", textAlign: "center", marginTop: "10px" }}>
        O documento é atualizado conforme você preenche.
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <span style={{ color: "#c8cdd8", fontStyle: "italic", fontSize: "7.5px" }}>{text}</span>
  );
}
