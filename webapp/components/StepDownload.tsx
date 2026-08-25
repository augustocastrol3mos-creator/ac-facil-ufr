"use client";
import { useState, useEffect } from "react";
import type { AppData } from "@/app/page";

type Props = { appData: AppData; result: any; onBack: () => void };

export default function StepDownload({ appData, result, onBack }: Props) {
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [settings, setSettings] = useState<{ enforceMinHours: boolean; minAutonomousHours: number }>({ enforceMinHours: false, minAutonomousHours: 112 });
  const [showHoursWarning, setShowHoursWarning] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => setSettings({ enforceMinHours: d.enforceMinHours ?? false, minAutonomousHours: d.minAutonomousHours ?? 112 }));
    // Show warning on mount if hours are below minimum
  }, []);
  const [loadingGuided, setLoadingGuided] = useState(false);
  const [doneAuto, setDoneAuto] = useState(false);
  const [doneGuided, setDoneGuided] = useState(false);
  const [error, setError] = useState("");

  const autonomousHours = result?.autonomousHours ?? 0;
  const belowMinimum = autonomousHours < settings.minAutonomousHours;

  const download = async (type: "autonomous" | "guided") => {
    // Check minimum hours for autonomous PDF
    if (type === "autonomous" && belowMinimum) {
      if (settings.enforceMinHours) {
        setShowHoursWarning(true);
        return;
      }
      // Not enforced — show warning modal and let user confirm
      setShowHoursWarning(true);
      return;
    }
    proceedDownload(type);
  };

  const proceedDownload = async (type: "autonomous" | "guided") => {
    setShowHoursWarning(false);
    const setLoading = type === "autonomous" ? setLoadingAuto : setLoadingGuided;
    const setDone = type === "autonomous" ? setDoneAuto : setDoneGuided;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appData, result, type }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Erro ao gerar PDF"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "autonomous" ? "comprovante_atividades_autonomas.pdf" : "comprovante_atividades_guiadas.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
  const hasAuto   = result?.breakdown?.length > 0;
  const hasGuided = result?.guidedBreakdown?.length > 0;
  const hasBoth   = hasAuto && hasGuided;

  const countAttachments = (type: "autonomous" | "guided") => {
    const entries = type === "autonomous" ? appData.autonomous : appData.guided;
    return entries.filter((e: any) => e.fileData).length;
  };

  return (
    <div style={{ maxWidth: "760px" }}>
      {/* Hours warning modal */}
      {showHoursWarning && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "12px", maxWidth: "460px", width: "100%", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ background: "#dc2626", padding: "16px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "22px" }}>⚠️</span>
              <p style={{ color: "white", fontWeight: "700", fontSize: "15px" }}>Horas insuficientes</p>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "14px", color: "#1D1D1B", lineHeight: "1.6", marginBottom: "12px" }}>
                Você possui <strong style={{ color: "#dc2626" }}>{autonomousHours}h</strong> de atividades autônomas válidas,
                mas o mínimo exigido para abertura de processo SEI é de{" "}
                <strong>{settings.minAutonomousHours}h</strong>.
              </p>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                {settings.enforceMinHours
                  ? "O envio está bloqueado até que você complete o mínimo de horas exigido. Adicione mais atividades e recalcule."
                  : "Você pode continuar mesmo assim, mas seu processo SEI poderá ser indeferido pela Coordenação por não atingir o mínimo exigido."
                }
              </p>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowHoursWarning(false)}
                style={{ padding: "9px 20px", background: "white", border: "1.5px solid #e2e8f0", borderRadius: "7px", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "#475569" }}>
                ← Voltar e corrigir
              </button>
              {!settings.enforceMinHours && (
                <button onClick={() => proceedDownload("autonomous")}
                  style={{ padding: "9px 20px", background: "#dc2626", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                  Gerar mesmo assim
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div style={{ background: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>

        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1D1D1B" }}>Download dos Comprovantes</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>Baixe os PDFs e anexe no processo SEI conforme indicado.</p>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {hasBoth && (
            <div style={{ padding: "12px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#92400e" }}>⚠ Dois processos SEI necessários</p>
              <p style={{ fontSize: "12px", color: "#78350f", marginTop: "4px" }}>Autônomas e guiadas <strong>não podem estar no mesmo processo SEI</strong>. Baixe os dois PDFs e abra um processo para cada.</p>
            </div>
          )}

          {hasAuto && (
            <div style={{ border: "1px solid #B2DFBC", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ background: "#F0FBF2", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #B2DFBC", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "700", color: "#1B6B35" }}>📄 Atividades Autônomas</p>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>SEI: <strong>Atividades Complementares Autônomas</strong></p>
                  {countAttachments("autonomous") > 0 && (
                    <p style={{ fontSize: "11px", color: "#20376B", marginTop: "2px" }}>📎 {countAttachments("autonomous")} comprovante(s) incluído(s) no PDF</p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "24px", fontWeight: "800", color: "#1B6B35", lineHeight: 1 }}>{fmt(result.autonomousCredits)}</p>
                  <p style={{ fontSize: "11px", color: "#64748b" }}>créditos · {result.autonomousHours}h</p>
                </div>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <button onClick={() => download("autonomous")} disabled={loadingAuto}
                  style={{ width: "100%", padding: "13px", border: "none", borderRadius: "7px", fontSize: "14px", fontWeight: "700", cursor: loadingAuto ? "not-allowed" : "pointer", background: doneAuto ? "#16a34a" : "#20376B", color: "white" }}>
                  {loadingAuto ? "⏳ Gerando PDF..." : doneAuto ? "✓ PDF Baixado!" : "⬇ Baixar PDF — Autônomas"}
                </button>
              </div>
            </div>
          )}

          {hasGuided && (
            <div style={{ border: "1px solid #bae6fd", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ background: "#f0f9ff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #bae6fd", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "700", color: "#075985" }}>📄 Atividades Guiadas</p>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>SEI: <strong>Atividades Complementares Guiadas</strong></p>
                  {countAttachments("guided") > 0 && (
                    <p style={{ fontSize: "11px", color: "#0369a1", marginTop: "2px" }}>📎 {countAttachments("guided")} comprovante(s) incluído(s) no PDF</p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "24px", fontWeight: "800", color: "#075985", lineHeight: 1 }}>{fmt(result.guidedCredits)}</p>
                  <p style={{ fontSize: "11px", color: "#64748b" }}>créditos · {result.guidedHours}h</p>
                </div>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <button onClick={() => download("guided")} disabled={loadingGuided}
                  style={{ width: "100%", padding: "13px", border: "none", borderRadius: "7px", fontSize: "14px", fontWeight: "700", cursor: loadingGuided ? "not-allowed" : "pointer", background: doneGuided ? "#16a34a" : "#0369a1", color: "white" }}>
                  {loadingGuided ? "⏳ Gerando PDF..." : doneGuided ? "✓ PDF Baixado!" : "⬇ Baixar PDF — Guiadas"}
                </button>
              </div>
            </div>
          )}

          {error && <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "7px", color: "#dc2626", fontSize: "13px" }}>Erro: {error}</div>}

          <div style={{ border: "1px solid #BFDBFE", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>📋</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#1D4ED8" }}>Como peticionar no SEI</p>
                <p style={{ fontSize: "12px", color: "#3B82F6" }}>Siga os passos abaixo após baixar o PDF</p>
              </div>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { n: 1, content: <><p style={{ fontSize: "13px", color: "#1D1D1B", lineHeight: "1.6", flex: 1 }}>Acesse <strong>ufr.edu.br/sei</strong> e entre como <strong>Usuário Externo</strong> (estudantes da UFR).</p><a href="https://ufr.edu.br/sei/" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "white", background: "#1D4ED8", padding: "5px 12px", borderRadius: "6px", textDecoration: "none", fontWeight: "600", whiteSpace: "nowrap", flexShrink: 0 as const }}>Abrir SEI ↗</a></> },
                { n: 2, content: <p style={{ fontSize: "13px", color: "#1D1D1B", lineHeight: "1.6" }}>Abra o processo: <strong>"PROEG: ATIVIDADES COMPLEMENTARES — DISCENTE DE GRADUAÇÃO"</strong>, preencha todos os campos e o <strong>UFR: FORMULÁRIO PADRÃO ESTUDANTE</strong>.</p> },
                { n: 3, content: <p style={{ fontSize: "13px", color: "#1D1D1B", lineHeight: "1.6" }}>Anexe o <strong>PDF gerado por este sistema</strong> (já inclui os comprovantes).{hasBoth && <span style={{ color: "#dc2626" }}> Lembre-se: autônomas e guiadas em processos SEI <strong>separados</strong>.</span>}</p> },
                { n: 4, content: <p style={{ fontSize: "13px", color: "#1D1D1B", lineHeight: "1.6" }}>Anexe também o <strong>histórico escolar</strong> gerado pelo SUAP: <em>SUAP → Documentos → Histórico Parcial</em>.</p> },
                { n: 5, content: <p style={{ fontSize: "13px", color: "#1D1D1B", lineHeight: "1.6" }}>Conclua o peticionamento. O processo será encaminhado à <strong>FACAP CEG — Administração</strong> (Coordenação de Ensino de Graduação em Administração).</p> },
              ].map(step => (
                <div key={step.n} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#20376B", color: "white", fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step.n}</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" as const }}>{step.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: "10px" }}>
          <button onClick={onBack} style={{ padding: "11px 20px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "13px", fontWeight: "600", cursor: "pointer", flex: 1 }}>← Voltar</button>
          <button onClick={() => window.location.reload()} style={{ padding: "11px 20px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "13px", fontWeight: "600", cursor: "pointer", flex: 1 }}>↺ Novo</button>
        </div>
      </div>
    </div>
  );
}
