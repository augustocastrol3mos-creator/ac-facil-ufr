"use client";
import { useState, useEffect } from "react";
import type { AutonomousEntry, GuidedEntry } from "@/app/page";

type Props = {
  autonomous: AutonomousEntry[];
  guided: GuidedEntry[];
  onChangeAutonomous: (a: AutonomousEntry[]) => void;
  onChangeGuided: (g: GuidedEntry[]) => void;
  onBack: () => void;
  onNext: () => void;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

// Limite por anexo. Arquivos viram base64 no corpo da requisição,
// então o limite protege tanto o navegador quanto o servidor.
const MAX_FILE_MB = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png"];

/** Retorna mensagem de erro, ou null se o arquivo estiver ok. */
function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXT.some(ext => name.endsWith(ext))) {
    return `Formato não aceito. Use PDF, JPG ou PNG.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `O arquivo "${file.name}" tem ${mb} MB. O limite é ${MAX_FILE_MB} MB por comprovante — reduza a qualidade do escaneamento ou comprima o PDF.`;
  }
  if (file.size === 0) {
    return `O arquivo "${file.name}" está vazio.`;
  }
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StepActivities({ autonomous, guided, onChangeAutonomous, onChangeGuided, onBack, onNext }: Props) {
  const [tab, setTab] = useState<"autonomous" | "guided">("autonomous");
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [minHours, setMinHours] = useState(112);

  useEffect(() => {
    fetch("/api/admin/categories").then(r => r.json()).then(setCategories);
    fetch("/api/settings").then(r => r.json()).then(d => { setRequireAttachment(d.requireAttachment ?? false); setMinHours(d.minAutonomousHours ?? 112); });
  }, []);

  const addAutonomous = () => {
    const firstKey = Object.keys(categories)[0] || "artigo_periodico";
    onChangeAutonomous([...autonomous, { id: crypto.randomUUID(), type: firstKey, certificateYear: CURRENT_YEAR, quantity: 1 }]);
  };
  const updateAutonomous = (id: string, field: string, value: any) =>
    onChangeAutonomous(autonomous.map(a => a.id === id ? { ...a, [field]: value } : a));
  const removeAutonomous = (id: string) => onChangeAutonomous(autonomous.filter(a => a.id !== id));

  const handleAutoFile = async (id: string, file: File | undefined) => {
    if (!file) {
      // Clear file fields
      onChangeAutonomous(autonomous.map(a => a.id === id ? { ...a, fileName: undefined, fileData: undefined, fileMime: undefined } : a));
      return;
    }
    const fileErr = validateFile(file);
    if (fileErr) { setError(fileErr); return; }
    setError("");
    const fileData = await readFileAsBase64(file);
    // Update all file fields in a single state update to avoid race conditions
    onChangeAutonomous(autonomous.map(a =>
      a.id === id ? { ...a, fileName: file.name, fileData, fileMime: file.type || "application/pdf" } : a
    ));
  };

  const addGuided = () =>
    onChangeGuided([...guided, { id: crypto.randomUUID(), name: "", semester: `${CURRENT_YEAR}/1`, hours: 16 }]);
  const updateGuided = (id: string, field: string, value: any) =>
    onChangeGuided(guided.map(g => g.id === id ? { ...g, [field]: value } : g));
  const removeGuided = (id: string) => onChangeGuided(guided.filter(g => g.id !== id));

  const handleGuidedFile = async (id: string, file: File | undefined) => {
    if (!file) {
      onChangeGuided(guided.map(g => g.id === id ? { ...g, fileName: undefined, fileData: undefined, fileMime: undefined } : g));
      return;
    }
    const fileErr = validateFile(file);
    if (fileErr) { setError(fileErr); return; }
    setError("");
    const fileData = await readFileAsBase64(file);
    onChangeGuided(guided.map(g =>
      g.id === id ? { ...g, fileName: file.name, fileData, fileMime: file.type || "application/pdf" } : g
    ));
  };

  // Estimate autonomous hours for the progress banner
  // For hour-based categories (curso_extensao, acao_social_extensionista) quantity = hours
  // For others, use 16h per credit as estimate (creditsPerUnit × quantity × 16)
  const HOUR_BASED = ["curso_extensao", "acao_social_extensionista"];
  const estimateAutoHours = (): number => {
    return autonomous.reduce((total, a) => {
      const cfg = (categories as any)[a.type];
      if (!cfg) return total;
      if (HOUR_BASED.includes(a.type)) {
        // quantity is already in hours
        return total + a.quantity;
      }
      // credits × hoursPerCredit
      const credits = Math.min(cfg.creditsPerUnit * a.quantity, cfg.maxCredits);
      return total + credits * (cfg.hoursPerCredit ?? 16);
    }, 0);
  };

  const estimatedHours = estimateAutoHours();
  const belowMin = autonomous.length > 0 && estimatedHours < minHours;

  const validate = () => {
    if (autonomous.length === 0 && guided.length === 0) { setError("Adicione pelo menos uma atividade."); return false; }
    if (requireAttachment) {
      for (const a of autonomous) {
        if (!(a as any).fileData) { setError("Comprovante obrigatório: anexe o arquivo de cada atividade autônoma antes de continuar."); return false; }
      }
      for (const g of guided) {
        if (!g.fileData) { setError("Comprovante obrigatório: anexe o arquivo de cada atividade guiada antes de continuar."); return false; }
      }
    }
    for (const g of guided) {
      if (!g.name.trim()) { setError("Preencha o nome de todas as atividades guiadas."); return false; }
      if (g.hours <= 0) { setError("As horas devem ser maiores que zero."); return false; }
    }
    setError(""); return true;
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 11px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "14px", color: "#1D1D1B", background: "white", outline: "none", WebkitAppearance: "none" };
  const lbl: React.CSSProperties = { fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.04em", display: "block", marginBottom: "5px" };

  // Quantity stepper — uses local string state so user can type freely (e.g. "200")
  // Value is only committed to parent on blur or stepper click
  const QuantityStepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const [raw, setRaw] = useState(String(value));

    // Keep raw in sync if parent changes value externally (e.g. on mount)
    const commit = (str: string) => {
      const n = parseInt(str);
      const valid = !isNaN(n) && n >= 1 ? n : 1;
      setRaw(String(valid));
      onChange(valid);
    };

    return (
      <div style={{ display: "flex", border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden", height: "41px" }}>
        <button type="button"
          onClick={() => { const next = Math.max(1, value - 1); setRaw(String(next)); onChange(next); }}
          style={{ width: "40px", background: "#f8fafc", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #e2e8f0" }}>−</button>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => commit(raw)}
          onKeyDown={e => e.key === "Enter" && commit(raw)}
          style={{ flex: 1, border: "none", textAlign: "center", fontSize: "15px", fontWeight: "600", color: "#1D1D1B", outline: "none", background: "white", width: "0", minWidth: "0" }}
        />
        <button type="button"
          onClick={() => { const next = value + 1; setRaw(String(next)); onChange(next); }}
          style={{ width: "40px", background: "#f8fafc", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #e2e8f0" }}>+</button>
      </div>
    );
  };

  const FileUploader = ({ fileName, onFile, accentColor = "#20376B", required = false }: { fileName?: string; onFile: (f: File | undefined) => void; accentColor?: string; required?: boolean }) => (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", background: "white", display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", height: "41px", overflow: "hidden" }}>
      <label style={{ fontSize: "12px", color: accentColor, fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
        📎 Anexar
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => onFile(e.target.files?.[0])} style={{ display: "none" }} />
      </label>
      <span style={{ fontSize: "12px", color: fileName ? "#1a2332" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {fileName || "Nenhum arquivo"}
      </span>
      {!fileName && required && <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: "700", flexShrink: 0 }}>Obrigatório</span>}
      {fileName && <button type="button" onClick={() => onFile(undefined)} style={{ border: "none", background: "none", color: "#94a3b8", fontSize: "14px", cursor: "pointer", flexShrink: 0 }}>✕</button>}
    </div>
  );

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ background: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>

        {/* Header + tabs */}
        <div style={{ padding: "18px 20px 0", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1D1D1B" }}>Registro de Atividades</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "3px", marginBottom: "14px" }}>
            Adicione atividades autônomas (Quadro I) e/ou guiadas (indicadas pelo Coordenador).
          </p>
          <div style={{ display: "flex" }}>
            {[
              { key: "autonomous", label: "Autônomas (Quadro I)", count: autonomous.length, color: "#20376B" },
              { key: "guided",     label: "Guiadas (Coordenador)", count: guided.length,    color: "#0369a1" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                style={{ padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", fontWeight: tab === t.key ? "700" : "500", color: tab === t.key ? t.color : "#94a3b8", borderBottom: tab === t.key ? `3px solid ${t.color}` : "3px solid transparent", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s" }}>
                {t.label}
                {t.count > 0 && <span style={{ background: tab === t.key ? t.color : "#e2e8f0", color: tab === t.key ? "white" : "#64748b", borderRadius: "10px", padding: "1px 7px", fontSize: "11px", fontWeight: "700" }}>{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px" }}>

          {/* AUTONOMOUS TAB */}
          {tab === "autonomous" && (
            <div>
              <div style={{ padding: "10px 13px", background: "#F0FBF2", border: "1px solid #B2DFBC", borderRadius: "7px", marginBottom: "16px", fontSize: "13px", color: "#1B6B35", lineHeight: "1.5" }}>
                ℹ️ Atividades do <strong>Quadro I</strong>. O sistema aplica limites por categoria e rejeita certificados anteriores a 2 anos da matrícula. Use <em>Descrição</em> para identificar o certificado. Anexe o comprovante para incluí-lo no PDF.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {autonomous.map((a, i) => (
                  <div key={a.id} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#20376B", color: "white", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>ATIVIDADE AUTÔNOMA</span>
                      </div>
                      <button onClick={() => removeAutonomous(a.id)} style={{ border: "none", background: "none", color: "#94a3b8", fontSize: "12px", cursor: "pointer", padding: "4px 8px", borderRadius: "5px" }}
                        onMouseOver={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fef2f2"; }}
                        onMouseOut={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}>
                        ✕ Remover
                      </button>
                    </div>

                    <div style={{ padding: "13px" }}>
                      {/* Row 1: Tipo + Ano + Quantidade */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px", marginBottom: "10px", alignItems: "end" }}>
                        <div>
                          <label style={lbl}>TIPO DE ATIVIDADE</label>
                          <select value={a.type} onChange={e => updateAutonomous(a.id, "type", e.target.value)} style={inp}>
                            {Object.entries(categories).map(([key, cfg]: any) => (
                              <option key={key} value={key}>{cfg.label}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ minWidth: "100px" }}>
                          <label style={lbl}>ANO CERT.</label>
                          <select value={a.certificateYear} onChange={e => updateAutonomous(a.id, "certificateYear", parseInt(e.target.value))} style={inp}>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div style={{ minWidth: "120px" }}>
                          <label style={lbl}>QUANTIDADE</label>
                          <QuantityStepper value={a.quantity} onChange={v => updateAutonomous(a.id, "quantity", v)} />
                        </div>
                      </div>

                      {/* Row 2: Descrição + Comprovante */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={lbl}>DESCRIÇÃO <span style={{ fontWeight: "400", color: "#94a3b8", textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(opcional)</span></label>
                          <input value={(a as any).description || ""} onChange={e => updateAutonomous(a.id, "description", e.target.value)}
                            placeholder="Ex.: Curso ENAP 2024, Artigo Revista X..."
                            style={inp} onFocus={e => e.target.style.borderColor = "#20376B"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                        </div>
                        <div>
                          <label style={lbl}>COMPROVANTE {requireAttachment
                            ? <span style={{ color: "#dc2626" }}>*</span>
                            : <span style={{ fontWeight: "400", color: "#94a3b8", textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(opcional)</span>}
                            {" "}<span style={{ fontWeight: "400", color: "#94a3b8", textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>— incluso no PDF · máx. {MAX_FILE_MB} MB</span>
                          </label>
                          <FileUploader fileName={(a as any).fileName} onFile={f => handleAutoFile(a.id, f)} required={requireAttachment} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addAutonomous}
                style={{ marginTop: "12px", width: "100%", padding: "12px", border: "2px dashed #B2DFBC", borderRadius: "8px", background: "none", color: "#20376B", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                onMouseOver={e => { e.currentTarget.style.background = "#f0f7f1"; e.currentTarget.style.borderColor = "#20376B"; }}
                onMouseOut={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#c6dfc9"; }}>
                + Adicionar Atividade Autônoma
              </button>
            </div>
          )}

          {/* GUIDED TAB */}
          {tab === "guided" && (
            <div>
              <div style={{ padding: "10px 13px", background: "#e0f2fe", border: "1px solid #bae6fd", borderRadius: "7px", marginBottom: "16px", fontSize: "13px", color: "#075985", lineHeight: "1.5" }}>
                ℹ️ Atividades <strong>indicadas pelo Coordenador</strong> a cada semestre. Carga horária computada integralmente. Gera PDF separado para processo SEI distinto.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {guided.map((g, i) => (
                  <div key={g.id} style={{ border: "1px solid #bae6fd", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0369a1", color: "white", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#075985" }}>ATIVIDADE GUIADA</span>
                      </div>
                      <button onClick={() => removeGuided(g.id)} style={{ border: "none", background: "none", color: "#94a3b8", fontSize: "12px", cursor: "pointer", padding: "4px 8px", borderRadius: "5px" }}
                        onMouseOver={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fef2f2"; }}
                        onMouseOut={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}>
                        ✕ Remover
                      </button>
                    </div>

                    <div style={{ padding: "13px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px", marginBottom: "10px", alignItems: "end" }}>
                        <div>
                          <label style={lbl}>NOME DA ATIVIDADE <span style={{ color: "#dc2626" }}>*</span></label>
                          <input value={g.name} onChange={e => updateGuided(g.id, "name", e.target.value)} placeholder="Ex.: Workshop de Inovação" style={inp}
                            onFocus={e => e.target.style.borderColor = "#0369a1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                        </div>
                        <div style={{ minWidth: "90px" }}>
                          <label style={lbl}>SEMESTRE</label>
                          <input value={g.semester} onChange={e => updateGuided(g.id, "semester", e.target.value)} placeholder="2024/1" style={inp}
                            onFocus={e => e.target.style.borderColor = "#0369a1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                        </div>
                        <div style={{ minWidth: "120px" }}>
                          <label style={lbl}>HORAS</label>
                          <QuantityStepper value={g.hours} onChange={v => updateGuided(g.id, "hours", v)} />
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>COMPROVANTE {requireAttachment
                          ? <span style={{ color: "#dc2626" }}>*</span>
                          : <span style={{ fontWeight: "400", color: "#94a3b8", textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(opcional)</span>}
                          {" "}<span style={{ fontWeight: "400", color: "#94a3b8", textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>— incluso no PDF · máx. {MAX_FILE_MB} MB</span>
                        </label>
                        <FileUploader fileName={g.fileName} onFile={f => handleGuidedFile(g.id, f)} accentColor="#0369a1" required={requireAttachment} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addGuided}
                style={{ marginTop: "12px", width: "100%", padding: "12px", border: "2px dashed #bae6fd", borderRadius: "8px", background: "none", color: "#0369a1", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                onMouseOver={e => { e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.borderColor = "#0369a1"; }}
                onMouseOut={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#bae6fd"; }}>
                + Adicionar Atividade Guiada
              </button>
            </div>
          )}

          {/* Hours progress banner — shown when autonomous tab has entries */}
          {autonomous.length > 0 && (
            <div style={{
              marginTop: "14px", padding: "12px 14px", borderRadius: "8px",
              background: belowMin ? "#fff8f0" : "#F0FBF2",
              border: `1px solid ${belowMin ? "#fed7aa" : "#B2DFBC"}`,
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              {/* Progress bar */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: belowMin ? "#92400e" : "#1B6B35" }}>
                    {belowMin ? "⚠ Horas insuficientes para processo SEI" : "✓ Mínimo atingido"}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: belowMin ? "#92400e" : "#1B6B35" }}>
                    {Math.round(estimatedHours)}h / {minHours}h
                  </span>
                </div>
                {/* Bar track */}
                <div style={{ height: "6px", background: belowMin ? "#fed7aa" : "#B2DFBC", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "3px", transition: "width 0.4s ease",
                    width: `${Math.min(100, (estimatedHours / minHours) * 100)}%`,
                    background: belowMin ? "#f97316" : "#20376B",
                  }} />
                </div>
                {belowMin && (
                  <p style={{ fontSize: "11.5px", color: "#92400e", marginTop: "5px", lineHeight: "1.5" }}>
                    Você possui aproximadamente <strong>{Math.round(estimatedHours)}h</strong> de atividades autônomas.
                    Para abertura de processo SEI são necessárias <strong>{minHours}h válidas</strong>.
                    Faltam ~<strong>{Math.round(minHours - estimatedHours)}h</strong>.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: "14px", padding: "10px 13px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "7px", fontSize: "13px", color: "#dc2626" }}>⚠ {error}</div>}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", gap: "10px" }}>
          <button onClick={onBack} style={{ padding: "11px 20px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "13px", fontWeight: "600", cursor: "pointer", flex: 1 }}>← Voltar</button>
          <button onClick={() => validate() && onNext()} style={{ padding: "11px 20px", background: "#20376B", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "700", cursor: "pointer", flex: 2 }}
            onMouseOver={e => e.currentTarget.style.background = "#172d5a"} onMouseOut={e => e.currentTarget.style.background = "#20376B"}>
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
}
