import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";

const STORE_PATH = path.join(process.cwd(), "data", "alert.enc");
const SECRET = "UFR_PROGRAD_ALERT_2026";
const ALGORITHM = "aes-256-gcm";

export type AlertConfig = {
  enabled: boolean;
  message: string;
  type: "info" | "warning" | "success";
};

export const DEFAULT_ALERT: AlertConfig = {
  enabled: false,
  message: "",
  type: "info",
};

function deriveKey(): Buffer {
  return crypto.scryptSync(SECRET, "ufr-alert-salt-2026", 32);
}

export function saveAlert(alert: AlertConfig): void {
  mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(alert), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  writeFileSync(STORE_PATH, Buffer.concat([iv, authTag, encrypted]).toString("base64"), "utf8");
}

export function loadAlert(): AlertConfig {
  // 1. Try encrypted file first
  if (existsSync(STORE_PATH)) {
    try {
      const payload = Buffer.from(readFileSync(STORE_PATH, "utf8"), "base64");
      const iv = payload.slice(0, 16);
      const authTag = payload.slice(16, 32);
      const encrypted = payload.slice(32);
      const key = deriveKey();
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return { ...DEFAULT_ALERT, ...JSON.parse(decrypted.toString("utf8")) };
    } catch { /* fall through */ }
  }

  // 2. Fallback: read from environment variable (Railway persistent config)
  // Set UFR_ALERT env var as JSON: {"enabled":true,"message":"...","type":"warning"}
  const envAlert = process.env.UFR_ALERT;
  if (envAlert) {
    try {
      return { ...DEFAULT_ALERT, ...JSON.parse(envAlert) };
    } catch { /* fall through */ }
  }

  return DEFAULT_ALERT;
}
