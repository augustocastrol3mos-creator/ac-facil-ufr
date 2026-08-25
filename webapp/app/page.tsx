"use client";
import { useState, useEffect } from "react";
import StepStudent from "@/components/StepStudent";
import StepActivities from "@/components/StepActivities";
import StepReview from "@/components/StepReview";
import StepDownload from "@/components/StepDownload";

export type StudentData = { name: string; rga: string; };
export type AutonomousEntry = { id: string; type: string; certificateYear: number; quantity: number; fileName?: string; fileData?: string; description?: string; };
export type GuidedEntry = { id: string; name: string; semester: string; hours: number; fileName?: string; fileData?: string; };
export type AppData = { student: StudentData; autonomous: AutonomousEntry[]; guided: GuidedEntry[]; };

const STEPS = ["Dados do Aluno", "Atividades", "Revisão", "Download"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [alertConfig, setAlertConfig] = useState<{enabled:boolean;message:string;type:string}|null>(null);
  useEffect(() => { fetch("/api/alert").then(r=>r.json()).then(d=>{ if(d.enabled && d.message) setAlertConfig(d); }); }, []);
  const [appData, setAppData] = useState<AppData>({ student: { name: "", rga: "" }, autonomous: [], guided: [] });
  const [reviewResult, setReviewResult] = useState<any>(null);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f1f5f9" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* UFR Official Logo — Manual da Marca */}
            <img src="/logo-ufr.png" alt="UFR" style={{ height: "36px", width: "auto", flexShrink: 0 }} />
            {/* Divider */}
            <span style={{ color: "#cbd5e1", fontSize: "24px", fontWeight: "200", lineHeight: 1 }}>|</span>
            {/* AC Fácil Logo */}
            <img src="/logo-acfacil.png" alt="AC Fácil" style={{ height: "34px", width: "auto", flexShrink: 0 }} />
            <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "12px" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1D1D1B", lineHeight: "1.2" }}>AC Fácil</div>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Administração · PROGRAD/UFR</div>
            </div>
          </div>
          <a href="/admin" style={{ fontSize: "11px", color: "#64748b", textDecoration: "none", padding: "5px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontWeight: "500", whiteSpace: "nowrap" }}>⚙ Admin</a>
        </div>
      </header>

      {/* Step bar */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", overflowX: "auto" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 16px", display: "flex", minWidth: "fit-content" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => i < step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 8px", border: "none", background: "none", cursor: i < step ? "pointer" : "default", borderBottom: i === step ? "3px solid #20376B" : "3px solid transparent", color: i === step ? "#20376B" : i < step ? "#475569" : "#94a3b8", fontSize: "13px", fontWeight: i === step ? "700" : "400", whiteSpace: "nowrap", transition: "color 0.15s" }}>
                <span style={{
                  width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: "11px", fontWeight: "700", transition: "all 0.2s",
                  background: i < step ? "#53B366" : i === step ? "#20376B" : "white",
                  border: i < step ? "2px solid #53B366" : i === step ? "2px solid #20376B" : "2px solid #cbd5e1",
                  color: i <= step ? "white" : "#94a3b8",
                  boxShadow: i === step ? "0 0 0 3px rgba(32,55,107,0.12)" : "none",
                }}>
                  {i < step ? "✓" : i + 1}
                </span>
                {s}
              </button>
              {i < STEPS.length - 1 && (
                <div style={{ width: "32px", height: "2px", margin: "0 4px", background: i < step ? "#53B366" : "#e2e8f0", transition: "background 0.3s", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      {/* ── Alert banner ── */}
      {alertConfig && (
        <div style={{
          padding: "12px 24px",
          background: alertConfig.type === "info" ? "#EFF6FF" : alertConfig.type === "warning" ? "#FFFBEB" : "#F0FBF2",
          borderBottom: `1px solid ${alertConfig.type === "info" ? "#BFDBFE" : alertConfig.type === "warning" ? "#FCD34D" : "#B2DFBC"}`,
        }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>
              {alertConfig.type === "info" ? "ℹ️" : alertConfig.type === "warning" ? "⚠️" : "✅"}
            </span>
            <p style={{ fontSize: "13px", fontWeight: "600", lineHeight: "1.5", flex: 1,
              color: alertConfig.type === "info" ? "#1D4ED8" : alertConfig.type === "warning" ? "#92400E" : "#1B6B35" }}>
              {alertConfig.message}
            </p>
            <button onClick={() => setAlertConfig(null)}
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8", flexShrink: 0, padding: "2px 6px", lineHeight: 1 }}>
              ✕
            </button>
          </div>
        </div>
      )}

      <main style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "20px 16px" }}>
        {step === 0 && <StepStudent data={appData.student} onChange={s => setAppData(d => ({ ...d, student: s }))} onNext={() => setStep(1)} />}
        {step === 1 && <StepActivities autonomous={appData.autonomous} guided={appData.guided} onChangeAutonomous={a => setAppData(d => ({ ...d, autonomous: a }))} onChangeGuided={g => setAppData(d => ({ ...d, guided: g }))} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <StepReview appData={appData} onResult={setReviewResult} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <StepDownload appData={appData} result={reviewResult} onBack={() => setStep(2)} />}
      </main>

      <footer style={{ borderTop: "1px solid #e2e8f0", background: "white", padding: "20px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
          {/* Credits */}
          <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px" }}>
            © 2026 UFR — AC Fácil · Sistema de Atividades Complementares · PROGRAD
          </p>
          <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
            <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px", fontStyle: "italic" }}>
              Desenvolvido durante o projeto de extensão por:
            </p>
            <p style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
              Profa. Daniela da Silva Carvalho
            </p>
            <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.8" }}>
              Augusto Castro Lemos · Izabela Souza Rodrigues · Sabrina Dias Gonçalves · Gyselle Gomes da Silva
            </p>
            <p style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "10px", lineHeight: "1.6" }}>
              Nome "AC Fácil" proposto pelo Dr. André Luís Janzkovski Cardoso e integrantes do grupo.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
