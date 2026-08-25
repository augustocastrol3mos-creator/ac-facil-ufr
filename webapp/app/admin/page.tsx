"use client";
import { useState, useEffect } from "react";
type LogEntry = { id: string; generatedAt: string; pdfType: string; totalCredits: number; totalHours: number; activities: any[]; guidedActivities: any[]; rejectedCount: number; };

// Password is validated server-side. This is used for fetch request bodies only.
// Validado no servidor. Usado apenas para os corpos das requisições fetch.
const ADMIN_PASSWORD = "ufr@admin2026";

type CategoryConfig = { label: string; creditsPerUnit: number; maxCredits: number; hoursPerCredit?: number; };
type AppSettings = { requireAttachment: boolean; enforceMinHours: boolean; minAutonomousHours: number; };
type AlertConfig = { enabled: boolean; message: string; type: "info" | "warning" | "success"; };

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [activeTab, setActiveTab] = useState<"settings" | "categories" | "logs">("settings");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<Record<string, CategoryConfig>>({});
  const [savingCats, setSavingCats] = useState(false);
  const [catMsg, setCatMsg] = useState("");
  const [search, setSearch] = useState("");

  // Settings state
  const [settings, setSettings] = useState<AppSettings>({ requireAttachment: true, enforceMinHours: false, minAutonomousHours: 112 });
  const [alert, setAlert] = useState<AlertConfig>({ enabled: false, message: "", type: "info" });
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else setPwError("Senha incorreta.");
  };

  useEffect(() => {
    if (!authed) return;
    fetch("/api/admin/categories").then(r => r.json()).then(setCategories);
    fetch("/api/admin/settings").then(r => r.json()).then(setSettings);
    fetch("/api/admin/alert").then(r => r.json()).then(setAlert);
  }, [authed]);

  const updateCat = (key: string, field: keyof CategoryConfig, value: any) =>
    setCategories(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const saveCats = async () => {
    setSavingCats(true); setCatMsg("");
    try {
      const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: ADMIN_PASSWORD, categories }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setCatMsg("✓ Quadro de pontuações salvo com sucesso!");
      setTimeout(() => setCatMsg(""), 4000);
    } catch (e: any) { setCatMsg("Erro: " + e.message); }
    finally { setSavingCats(false); }
  };

  const resetCats = async () => {
    if (!confirm("Restaurar os valores originais do Quadro I?")) return;
    const res = await fetch("/api/admin/categories/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
    setCategories(await res.json());
    setCatMsg("✓ Valores restaurados para o padrão original.");
    setTimeout(() => setCatMsg(""), 4000);
  };

  const saveSettingsFn = async (newSettings: AppSettings) => {
    setSavingSettings(true); setSettingsMsg("");
    try {
      const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: ADMIN_PASSWORD, settings: newSettings }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSettingsMsg("✓ Configurações salvas!");
      setTimeout(() => setSettingsMsg(""), 3000);
    } catch (e: any) { setSettingsMsg("Erro: " + e.message); }
    finally { setSavingSettings(false); }
  };

  const toggleAttachment = async (val: boolean) => {
    const next = { ...settings, requireAttachment: val };
    setSettings(next);
    await saveSettingsFn(next);
  };

  const toggleEnforceMin = async (val: boolean) => {
    const next = { ...settings, enforceMinHours: val };
    setSettings(next);
    await saveSettingsFn(next);
  };

  const saveAlertFn = async (newAlert: AlertConfig) => {
    setSavingAlert(true); setAlertMsg("");
    try {
      const res = await fetch("/api/admin/alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: ADMIN_PASSWORD, alert: newAlert }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAlertMsg("✓ Alerta salvo com sucesso!");
      setTimeout(() => setAlertMsg(""), 3000);
    } catch (e: any) { setAlertMsg("Erro: " + e.message); }
    finally { setSavingAlert(false); }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
      const data = await res.json();
      setLogs(data);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  };

  const filtered = Object.entries(categories).filter(([, cfg]) =>
    cfg.label.toLowerCase().includes(search.toLowerCase())
  );

  // ── Login screen ────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "3px", background: "#20376B" }} />
        <header style={{ background: "#20376B", padding: "0 20px" }}>
          <div style={{ maxWidth: "400px", margin: "0 auto", height: "56px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "white", borderRadius: "6px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800", color: "#20376B" }}>UFR</div>
            <div style={{ color: "white", fontSize: "14px", fontWeight: "600" }}>Painel Administrativo</div>
          </div>
        </header>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", width: "100%", maxWidth: "360px", overflow: "hidden" }}>
            <div style={{ background: "#F0FBF2", borderBottom: "1px solid #e2e8f0", padding: "18px 22px" }}>
              <p style={{ fontSize: "15px", fontWeight: "700", color: "#1B6B35" }}>🔒 Acesso Restrito</p>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>Somente coordenadores autorizados</p>
            </div>
            <div style={{ padding: "22px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>SENHA DE ACESSO</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
                placeholder="Digite a senha" autoFocus
                style={{ width: "100%", padding: "11px 13px", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "14px", outline: "none", marginBottom: "8px" }} />
              {pwError && <p style={{ color: "#dc2626", fontSize: "12px", marginBottom: "10px" }}>⚠ {pwError}</p>}
              <button onClick={login} style={{ width: "100%", padding: "12px", background: "#20376B", color: "white", border: "none", borderRadius: "7px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>Acessar</button>
              <div style={{ marginTop: "16px", textAlign: "center" }}>
                <a href="/" style={{ fontSize: "12px", color: "#94a3b8", textDecoration: "none" }}>← Voltar ao sistema</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin panel ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "3px", background: "#20376B" }} />
      <header style={{ background: "#20376B", padding: "0 20px", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "white", borderRadius: "6px", padding: "4px 8px", display: "flex", alignItems: "center", height: "34px", flexShrink: 0 }}>
              <img src="/logo-acfacil.png" alt="AC Fácil" style={{ height: "24px", width: "auto" }} />
            </div>
            <div>
              <div style={{ color: "white", fontSize: "14px", fontWeight: "700" }}>AC Fácil · Painel Administrativo</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}>Configurações — Administração/PROGRAD</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <a href="/" style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", textDecoration: "none" }}>← Voltar</a>
            <button onClick={() => setAuthed(false)}
              style={{ padding: "6px 14px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", color: "white", fontSize: "12px", cursor: "pointer" }}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "24px 16px" }}>

        {/* Tabs */}
        <div style={{ background: "white", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            {[
              { key: "settings",   label: "⚙ Configurações Gerais" },
              { key: "categories", label: "📋 Quadro de Pontuações" },
              { key: "logs",       label: "📄 Log de Geração de PDFs" },
            ].map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key as any); if (t.key === 'logs') fetchLogs(); }}
                style={{ padding: "14px 20px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", fontWeight: activeTab === t.key ? "700" : "500", color: activeTab === t.key ? "#20376B" : "#64748b", borderBottom: activeTab === t.key ? "3px solid #20376B" : "3px solid transparent" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SETTINGS TAB ── */}
          {activeTab === "settings" && (
            <div style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1D1D1B", marginBottom: "4px" }}>Configurações Gerais do Sistema</h2>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>Essas configurações afetam o comportamento do formulário para todos os alunos.</p>

              {/* Attachment required toggle */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#1D1D1B" }}>Comprovante Obrigatório</p>
                    <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", lineHeight: "1.5" }}>
                      Quando ativado, o aluno é obrigado a anexar um comprovante (PDF, JPG ou PNG) para cada atividade antes de avançar.
                      O comprovante anexado é automaticamente incluído nas páginas seguintes do PDF gerado.
                    </p>
                    <p style={{ fontSize: "12px", color: settings.requireAttachment ? "#20376B" : "#94a3b8", marginTop: "6px", fontWeight: "600" }}>
                      Status atual: <strong>{settings.requireAttachment ? "Obrigatório" : "Opcional"}</strong>
                    </p>
                  </div>

                  {/* Toggle switch */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <button
                      onClick={() => toggleAttachment(!settings.requireAttachment)}
                      disabled={savingSettings}
                      style={{
                        width: "56px", height: "30px", borderRadius: "15px", border: "none", cursor: savingSettings ? "not-allowed" : "pointer",
                        background: settings.requireAttachment ? "#20376B" : "#cbd5e1",
                        position: "relative", transition: "background 0.2s", flexShrink: 0,
                      }}>
                      <span style={{
                        position: "absolute", top: "3px", width: "24px", height: "24px", borderRadius: "50%", background: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
                        left: settings.requireAttachment ? "29px" : "3px",
                      }} />
                    </button>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: settings.requireAttachment ? "#20376B" : "#94a3b8" }}>
                      {savingSettings ? "Salvando..." : settings.requireAttachment ? "ATIVADO" : "DESATIVADO"}
                    </span>
                  </div>
                </div>

                {/* Visual indicator */}
                <div style={{ padding: "12px 20px", background: settings.requireAttachment ? "#F0FBF2" : "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: "12px", color: settings.requireAttachment ? "#1B6B35" : "#64748b" }}>
                    {settings.requireAttachment
                      ? "✓ Os alunos devem anexar comprovante em cada atividade. Sem anexo, não é possível avançar."
                      : "○ Os alunos podem enviar atividades sem comprovante. O campo será exibido como opcional."}
                  </p>
                </div>
              </div>

              {/* ── Min Hours Section ── */}
              <div style={{ marginTop: "20px", border: "1px solid var(--ufr-border)", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderBottom: "1px solid var(--ufr-border)", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "var(--ufr-text)" }}>Bloquear envio abaixo do mínimo de horas</p>
                    <p style={{ fontSize: "13px", color: "var(--ufr-text-muted)", marginTop: "4px", lineHeight: "1.5" }}>
                      Quando ativado, impede o aluno de gerar o PDF de atividades autônomas se as horas válidas forem inferiores ao mínimo configurado.
                      Quando desativado, apenas exibe um aviso em tela.
                    </p>
                    <p style={{ fontSize: "12px", color: settings.enforceMinHours ? "#20376B" : "#94a3b8", marginTop: "6px", fontWeight: "600" }}>
                      Status atual: <strong>{settings.enforceMinHours ? "Bloqueio ativo" : "Só aviso (não bloqueia)"}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => toggleEnforceMin(!settings.enforceMinHours)}
                    disabled={savingSettings}
                    style={{ width: "52px", height: "28px", borderRadius: "14px", border: "none", cursor: savingSettings ? "not-allowed" : "pointer", background: settings.enforceMinHours ? "#20376B" : "#cbd5e1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: "3px", width: "22px", height: "22px", borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s", left: settings.enforceMinHours ? "27px" : "3px" }} />
                  </button>
                </div>
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ufr-text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>MÍNIMO DE HORAS AUTÔNOMAS VÁLIDAS</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="number" min={1} value={settings.minAutonomousHours}
                        onChange={e => setSettings(s => ({ ...s, minAutonomousHours: Math.max(1, parseInt(e.target.value) || 112) }))}
                        style={{ width: "100px", padding: "9px 12px", border: "1.5px solid var(--ufr-border)", borderRadius: "7px", fontSize: "15px", fontWeight: "700", color: "var(--ufr-text)", outline: "none", textAlign: "center" }}
                        onFocus={e => e.target.style.borderColor = "#20376B"}
                        onBlur={e => e.target.style.borderColor = "var(--ufr-border)"}
                      />
                      <span style={{ fontSize: "14px", color: "var(--ufr-text-muted)" }}>horas</span>
                      <button onClick={() => saveSettingsFn(settings)} disabled={savingSettings}
                        style={{ padding: "9px 20px", background: "#20376B", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "700", cursor: savingSettings ? "not-allowed" : "pointer" }}>
                        {savingSettings ? "Salvando..." : "💾 Salvar"}
                      </button>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--ufr-text-muted)", marginTop: "6px" }}>
                      Resolução vigente: 112h (7 créditos × 16h). O aviso sempre aparece independente do bloqueio.
                    </p>
                  </div>
                </div>
              </div>

              {settingsMsg && (
                <div style={{ marginTop: "14px", padding: "10px 14px", background: settingsMsg.startsWith("✓") ? "#F0FBF2" : "#fef2f2", border: `1px solid ${settingsMsg.startsWith("✓") ? "#B2DFBC" : "#fecaca"}`, borderRadius: "7px", fontSize: "13px", color: settingsMsg.startsWith("✓") ? "#1B6B35" : "#dc2626", fontWeight: "600" }}>
                  {settingsMsg}
                </div>
              )}

              {/* ── Alert Banner Editor ── */}
              <div style={{ marginTop: "28px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--ufr-text)", marginBottom: "4px" }}>Alerta para os Alunos</h3>
                <p style={{ fontSize: "13px", color: "var(--ufr-text-muted)", marginBottom: "16px" }}>
                  Quando ativado, exibe um aviso em destaque no topo do formulário para todos os alunos.
                  Use para prazos, avisos de manutenção ou informações importantes.
                </p>

                <div style={{ border: "1px solid var(--ufr-border)", borderRadius: "8px", overflow: "hidden" }}>
                  {/* Enable toggle */}
                  <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderBottom: "1px solid var(--ufr-border)", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--ufr-text)" }}>Exibir alerta</p>
                      <p style={{ fontSize: "12px", color: "var(--ufr-text-muted)", marginTop: "2px" }}>
                        Status atual: <strong>{alert.enabled ? "Visível para os alunos" : "Oculto"}</strong>
                      </p>
                    </div>
                    <button onClick={() => { const next = { ...alert, enabled: !alert.enabled }; setAlert(next); saveAlertFn(next); }}
                      style={{ width: "52px", height: "28px", borderRadius: "14px", border: "none", cursor: "pointer", background: alert.enabled ? "#20376B" : "#cbd5e1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: "3px", width: "22px", height: "22px", borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s", left: alert.enabled ? "27px" : "3px" }} />
                    </button>
                  </div>

                  {/* Message + type */}
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ufr-text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>MENSAGEM</label>
                      <textarea value={alert.message} onChange={e => setAlert(a => ({ ...a, message: e.target.value }))}
                        placeholder="Ex.: Janela para enviar processos SEI aberta até dia 10/06. Não perca o prazo!"
                        rows={3}
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--ufr-border)", borderRadius: "7px", fontSize: "14px", color: "var(--ufr-text)", background: "#F9FAFB", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }}
                        onFocus={e => e.target.style.borderColor = "#20376B"}
                        onBlur={e => e.target.style.borderColor = "var(--ufr-border)"}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ufr-text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: "8px" }}>TIPO DE ALERTA</label>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {([
                          { key: "info",    label: "ℹ Informativo", bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
                          { key: "warning", label: "⚠ Atenção",     bg: "#FFFBEB", border: "#FCD34D", color: "#92400E" },
                          { key: "success", label: "✓ Positivo",    bg: "#F0FBF2", border: "#B2DFBC", color: "#1B6B35" },
                        ] as const).map(t => (
                          <button key={t.key} onClick={() => setAlert(a => ({ ...a, type: t.key }))}
                            style={{ padding: "8px 16px", borderRadius: "7px", border: `2px solid ${alert.type === t.key ? t.color : "var(--ufr-border)"}`, background: alert.type === t.key ? t.bg : "white", color: alert.type === t.key ? t.color : "var(--ufr-text-muted)", fontSize: "13px", fontWeight: alert.type === t.key ? "700" : "400", cursor: "pointer", transition: "all 0.15s" }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    {alert.message && (
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ufr-text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>PRÉ-VISUALIZAÇÃO</label>
                        <div style={{
                          padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", lineHeight: "1.5",
                          background: alert.type === "info" ? "#EFF6FF" : alert.type === "warning" ? "#FFFBEB" : "#F0FBF2",
                          border: `1px solid ${alert.type === "info" ? "#BFDBFE" : alert.type === "warning" ? "#FCD34D" : "#B2DFBC"}`,
                          color: alert.type === "info" ? "#1D4ED8" : alert.type === "warning" ? "#92400E" : "#1B6B35",
                        }}>
                          {alert.type === "info" ? "ℹ " : alert.type === "warning" ? "⚠ " : "✓ "}{alert.message}
                        </div>
                      </div>
                    )}

                    <button onClick={() => saveAlertFn(alert)} disabled={savingAlert}
                      style={{ alignSelf: "flex-end", padding: "10px 24px", background: "#20376B", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "700", cursor: savingAlert ? "not-allowed" : "pointer" }}>
                      {savingAlert ? "Salvando..." : "💾 Salvar Alerta"}
                    </button>

                    {alertMsg && (
                      <p style={{ fontSize: "13px", fontWeight: "600", color: alertMsg.startsWith("✓") ? "#1B6B35" : "#dc2626" }}>{alertMsg}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LOGS TAB ── */}
          {activeTab === "logs" && (
            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: "700", color: "var(--ufr-text)", marginBottom: "4px" }}>Log de Geração de PDFs</h2>
                  <p style={{ fontSize: "13px", color: "var(--ufr-text-muted)" }}>Registro completo de todos os comprovantes gerados pelo sistema.</p>
                </div>
                <button onClick={fetchLogs} style={{ padding: "8px 16px", background: "#20376B", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                  ↺ Atualizar
                </button>
              </div>

              {logsLoading ? (
                <p style={{ textAlign: "center", color: "var(--ufr-text-muted)", padding: "40px 0" }}>Carregando logs...</p>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ufr-text-muted)" }}>
                  <p style={{ fontSize: "32px", marginBottom: "12px" }}>📄</p>
                  <p style={{ fontSize: "14px", fontWeight: "600" }}>Nenhum PDF gerado ainda</p>
                  <p style={{ fontSize: "13px", marginTop: "4px" }}>Os registros aparecerão aqui após o primeiro download.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ fontSize: "12px", color: "var(--ufr-text-muted)", marginBottom: "4px" }}>{logs.length} registro{logs.length !== 1 ? "s" : ""} encontrado{logs.length !== 1 ? "s" : ""}</p>
                  {logs.map((log, i) => (
                    <div key={log.id} style={{ border: "1px solid var(--ufr-border)", borderRadius: "8px", overflow: "hidden" }}>
                      {/* Log header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: i % 2 === 0 ? "white" : "#fafafa", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", background: log.pdfType === "autonomous" ? "#e8edf5" : "#e0f2fe", color: log.pdfType === "autonomous" ? "#20376B" : "#0369a1" }}>
                            {log.pdfType === "autonomous" ? "Autônoma" : "Guiada"}
                          </span>
                          <div>

                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "700", color: "#20376B" }}>{Number.isInteger(log.totalCredits) ? log.totalCredits : log.totalCredits.toFixed(2)} créditos</span>
                          <span style={{ fontSize: "11px", color: "var(--ufr-text-muted)" }}>{log.totalHours}h</span>
                          {log.rejectedCount > 0 && (
                            <span style={{ fontSize: "11px", color: "#dc2626", background: "#fef2f2", padding: "2px 7px", borderRadius: "10px" }}>⚠ {log.rejectedCount} rejeitada{log.rejectedCount !== 1 ? "s" : ""}</span>
                          )}
                          <span style={{ fontSize: "11px", color: "var(--ufr-text-muted)" }}>
                            {new Date(log.generatedAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      {/* Activities detail */}
                      {(log.activities.length > 0 || log.guidedActivities.length > 0) && (
                        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--ufr-border)", background: "#f8fafc" }}>
                          {log.activities.length > 0 && (
                            <div style={{ marginBottom: log.guidedActivities.length > 0 ? "8px" : "0" }}>
                              {log.activities.map((a, j) => (
                                <div key={j} style={{ display: "flex", gap: "8px", fontSize: "12px", color: "var(--ufr-text-muted)", padding: "2px 0" }}>
                                  <span style={{ color: "var(--ufr-text)", fontWeight: "500", flex: 1 }}>{a.type}</span>
                                  {a.description && <span style={{ fontStyle: "italic", flex: 1 }}>{a.description}</span>}
                                  <span>Qtd: {a.quantity}</span>
                                  <span style={{ color: "#20376B", fontWeight: "600" }}>{Number.isInteger(a.credits) ? a.credits : a.credits.toFixed(2)} cred.</span>
                                  {a.limited && <span style={{ color: "#d97706", fontSize: "11px" }}>⚠ limitado</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {log.guidedActivities.length > 0 && (
                            <div>
                              {log.guidedActivities.map((g, j) => (
                                <div key={j} style={{ display: "flex", gap: "8px", fontSize: "12px", color: "var(--ufr-text-muted)", padding: "2px 0" }}>
                                  <span style={{ color: "var(--ufr-text)", fontWeight: "500", flex: 1 }}>{g.name}</span>
                                  <span>{g.semester}</span>
                                  <span>{g.hours}h</span>
                                  <span style={{ color: "#0369a1", fontWeight: "600" }}>{Number.isInteger(g.credits) ? g.credits : g.credits.toFixed(2)} cred.</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CATEGORIES TAB ── */}
          {activeTab === "categories" && (
            <div>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#F0FBF2", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1B6B35" }}>Quadro I — Atividades Autônomas</h2>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>{Object.keys(categories).length} categorias</p>
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar categoria..."
                  style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", outline: "none", width: "200px" }} />
                <button onClick={resetCats} style={{ padding: "8px 14px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", cursor: "pointer", color: "#64748b", whiteSpace: "nowrap" }}>↺ Restaurar padrão</button>
                <button onClick={saveCats} disabled={savingCats}
                  style={{ padding: "8px 18px", background: "#20376B", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: savingCats ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                  {savingCats ? "Salvando..." : "💾 Salvar"}
                </button>
              </div>

              {catMsg && (
                <div style={{ padding: "10px 20px", background: catMsg.startsWith("✓") ? "#F0FBF2" : "#fef2f2", borderBottom: "1px solid #e2e8f0", fontSize: "13px", color: catMsg.startsWith("✓") ? "#1B6B35" : "#dc2626", fontWeight: "600" }}>
                  {catMsg}
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 130px 130px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", minWidth: "600px" }}>
                  {["Categoria", "Créd. / Unidade", "Máximo (curso)", "Horas / Crédito"].map(h => (
                    <div key={h} style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.04em" }}>{h}</div>
                  ))}
                </div>
                <div style={{ minWidth: "600px" }}>
                  {filtered.map(([key, cfg], i) => (
                    <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 140px 130px 130px", borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <div style={{ padding: "10px 14px" }}>
                        <p style={{ fontSize: "13px", color: "#1D1D1B", fontWeight: "500" }}>{cfg.label}</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", marginTop: "2px" }}>{key}</p>
                      </div>
                      {(["creditsPerUnit", "maxCredits", "hoursPerCredit"] as const).map(field => (
                        <div key={field} style={{ padding: "8px 10px", display: "flex", alignItems: "center" }}>
                          <input type="number" step={field === "creditsPerUnit" ? "0.5" : "1"} min="0"
                            value={cfg[field] ?? 16}
                            onChange={e => updateCat(key, field, parseFloat(e.target.value) || 0)}
                            style={{ width: "100%", padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", outline: "none", textAlign: "center" }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px", fontSize: "12px", color: "#92400e" }}>
          ⚠ Alterações afetam todos os alunos imediatamente. Certifique-se de que estão em conformidade com a resolução vigente da UFR.
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #e2e8f0", background: "white", padding: "12px 20px", textAlign: "center" }}>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>© 2026 UFR — Painel Administrativo · PROGRAD</span>
      </footer>
    </div>
  );
}
