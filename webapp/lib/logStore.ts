import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";

const STORE_PATH = path.join(process.cwd(), "data", "logs.enc");
const SECRET = "UFR_PROGRAD_LOGS_2026";
const ALGORITHM = "aes-256-gcm";

export type ActivityLog = {
  type: string;
  description?: string;
  quantity: number;
  certificateYear?: number;
  credits: number;
  hours: number;
  limited: boolean;
};

export type GuidedLog = {
  name: string;
  semester: string;
  hours: number;
  credits: number;
};

export type LogEntry = {
  id: string;
  generatedAt: string;           // ISO string
  pdfType: "autonomous" | "guided";
  totalCredits: number;
  totalHours: number;
  activities: ActivityLog[];
  guidedActivities: GuidedLog[];
  rejectedCount: number;
};

function deriveKey(): Buffer {
  return crypto.scryptSync(SECRET, "ufr-logs-salt-2026", 32);
}

export function loadLogs(): LogEntry[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const payload = Buffer.from(readFileSync(STORE_PATH, "utf8"), "base64");
    const iv      = payload.slice(0, 16);
    const authTag = payload.slice(16, 32);
    const encrypted = payload.slice(32);
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return [];
  }
}

export function appendLog(entry: LogEntry): void {
  mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const logs = loadLogs();
  logs.unshift(entry); // newest first
  const json = JSON.stringify(logs);
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);
  writeFileSync(STORE_PATH, payload.toString("base64"), "utf8");
}
