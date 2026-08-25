import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";

const STORE_PATH = path.join(process.cwd(), "data", "settings.enc");
// Chave de criptografia. Defina STORE_SECRET_SETTINGS no ambiente para não depender do padrão.
const SECRET = process.env.STORE_SECRET_SETTINGS || "UFR_PROGRAD_SETTINGS_2026";
const ALGORITHM = "aes-256-gcm";

export type AppSettings = {
  requireAttachment: boolean;   // comprovante obrigatório
  enforceMinHours: boolean;     // bloquear envio abaixo do mínimo de horas autônomas
  minAutonomousHours: number;   // mínimo de horas autônomas válidas para gerar PDF
};

export const DEFAULT_SETTINGS: AppSettings = {
  requireAttachment: true,
  enforceMinHours: false,       // padrão: só avisa, não bloqueia
  minAutonomousHours: 112,      // 112h conforme resolução
};

function deriveKey(): Buffer {
  return crypto.scryptSync(SECRET, "ufr-settings-salt-2026", 32);
}

export function saveSettings(settings: AppSettings): void {
  mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(settings);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);
  writeFileSync(STORE_PATH, payload.toString("base64"), "utf8");
}

export function loadSettings(): AppSettings {
  if (!existsSync(STORE_PATH)) return DEFAULT_SETTINGS;
  try {
    const payload = Buffer.from(readFileSync(STORE_PATH, "utf8"), "base64");
    const iv = payload.slice(0, 16);
    const authTag = payload.slice(16, 32);
    const encrypted = payload.slice(32);
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return { ...DEFAULT_SETTINGS, ...JSON.parse(decrypted.toString("utf8")) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
