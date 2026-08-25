"use client";
import { useState } from "react";
import type { StudentData } from "@/app/page";

type Props = { data: StudentData; onChange: (d: StudentData) => void; onNext: () => void };

export default function StepStudent({ data, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Partial<StudentData>>({});

  const set = (field: keyof StudentData, value: string) => {
    onChange({ ...data, [field]: value });
    setErrors(e => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e: Partial<StudentData> = {};
    if (!data.name.trim()) e.name = "Nome obrigatório";
    if (!/^\d{12}$/.test(data.rga)) e.rga = "RGA deve ter exatamente 12 dígitos numéricos";
    else {
      const year = parseInt(data.rga.substring(0, 4));
      if (year < 1990 || year > new Date().getFullYear()) e.rga = "Ano de matrícula inválido no RGA";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const enrollYear = /^\d{12}$/.test(data.rga) ? parseInt(data.rga.substring(0, 4)) : null;

  const card: React.CSSProperties = { background: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" };
  const inp = (err?: string): React.CSSProperties => ({ width: "100%", padding: "11px 13px", borderRadius: "7px", fontSize: "15px", outline: "none", color: "#1D1D1B", background: "#F9FAFB", border: `1.5px solid ${err ? "#E53E3E" : "#e2e8f0"}`, transition: "border-color 0.15s, box-shadow 0.15s", WebkitAppearance: "none" });
  const lbl: React.CSSProperties = { fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: "6px" };

  return (
    <div style={{ maxWidth: "520px" }}>
      <div style={card}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1D1D1B" }}>Identificação do Estudante</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>Informações exibidas no comprovante PDF enviado ao SEI.</p>
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={lbl}>NOME COMPLETO</label>
            <input value={data.name} onChange={e => set("name", e.target.value)} placeholder="Ex.: João da Silva Pereira" style={inp(errors.name)}
              onFocus={e => { e.target.style.borderColor = "#20376B"; e.target.style.boxShadow = "0 0 0 3px rgba(32,55,107,0.10)"; }} onBlur={e => { e.target.style.borderColor = errors.name ? "#E53E3E" : "var(--ufr-border)"; e.target.style.boxShadow = "none"; }} />
            {errors.name && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>⚠ {errors.name}</p>}
          </div>
          <div>
            <label style={lbl}>RGA — REGISTRO GERAL ACADÊMICO</label>
            <input value={data.rga} onChange={e => set("rga", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="202200012345"
              maxLength={12} inputMode="numeric" pattern="\d*"
              style={{ ...inp(errors.rga), fontFamily: "monospace", fontSize: "16px", letterSpacing: "2px" }}
              onFocus={e => { e.target.style.borderColor = "#20376B"; e.target.style.boxShadow = "0 0 0 3px rgba(32,55,107,0.10)"; }} onBlur={e => { e.target.style.borderColor = errors.rga ? "#E53E3E" : "var(--ufr-border)"; e.target.style.boxShadow = "none"; }} />
            {enrollYear ? (
              <div style={{ marginTop: "8px", padding: "9px 12px", background: "#F0FBF2", border: "1px solid #B2DFBC", borderRadius: "7px", fontSize: "13px", color: "#1B6B35" }}>
                ✓ Ano de matrícula: <strong>{enrollYear}</strong> — certificados válidos a partir de <strong>{enrollYear - 2}</strong>
              </div>
            ) : errors.rga ? (
              <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>⚠ {errors.rga}</p>
            ) : (
              <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>12 dígitos. Os 4 primeiros representam o ano de matrícula.</p>
            )}
          </div>
          {/* Curso — campo bloqueado */}
          <div>
            <label style={lbl}>CURSO</label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "#F9FAFB", border: "1.5px solid #e2e8f0", borderRadius: "7px", cursor: "not-allowed" }}>
              <span style={{ fontSize: "15px", color: "#1D1D1B" }}>Administração — UFR</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "#94a3b8" }}>
                <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>Definido pelo administrador. Para alterar, entre em contato com o coordenador.</p>
          </div>

          {/* Aviso de privacidade — LGPD */}
          <div style={{ display: "flex", gap: "9px", alignItems: "flex-start", padding: "11px 13px", background: "#F8FAFC", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px", color: "#64748b" }}>
              <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: "11.5px", color: "#64748b", lineHeight: "1.6" }}>
              <strong style={{ color: "#475569" }}>Privacidade.</strong> Seu nome, matrícula e comprovantes são usados apenas para
              montar o PDF nesta sessão e <strong>não são armazenados</strong> pelo sistema. O registro interno de gerações
              guarda somente créditos e horas, sem qualquer dado que identifique o estudante.
            </p>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => validate() && onNext()}
            style={{ padding: "12px 28px", background: "#20376B", color: "white", border: "none", borderRadius: "7px", fontSize: "14px", fontWeight: "700", cursor: "pointer", width: "100%", transition: "background 0.15s" }}
            onTouchStart={e => e.currentTarget.style.background = "#172d5a"} onTouchEnd={e => e.currentTarget.style.background = "#20376B"}
            onMouseOver={e => e.currentTarget.style.background = "#172d5a"} onMouseOut={e => e.currentTarget.style.background = "#20376B"}>
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
}
