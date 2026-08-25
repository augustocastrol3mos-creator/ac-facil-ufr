import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import crypto from "crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { loadCategories } from "@/lib/categoryStore";
import { appendLog, type LogEntry } from "@/lib/logStore";
import { PDFDocument } from "pdf-lib";

async function mergeAttachments(mainPdfBytes: Buffer, entries: any[]): Promise<Uint8Array> {
  const mainDoc = await PDFDocument.load(mainPdfBytes);

  for (const entry of entries) {
    if (!entry.fileData) continue;
    const mime: string = entry.fileMime || "application/pdf";
    const raw = Buffer.from(entry.fileData, "base64");

    if (mime === "application/pdf" || entry.fileName?.endsWith(".pdf")) {
      try {
        const attachDoc = await PDFDocument.load(raw);
        const pages = await mainDoc.copyPages(attachDoc, attachDoc.getPageIndices());
        pages.forEach(p => mainDoc.addPage(p));
      } catch { /* skip malformed PDFs */ }
    } else {
      // Image (jpg/png) — embed as a new page
      try {
        const page = mainDoc.addPage();
        const { width, height } = page.getSize();
        let img;
        if (mime.includes("png") || entry.fileName?.endsWith(".png")) {
          img = await mainDoc.embedPng(raw);
        } else {
          img = await mainDoc.embedJpg(raw);
        }
        const scale = Math.min(width / img.width, height / img.height, 1);
        const iw = img.width * scale;
        const ih = img.height * scale;
        page.drawImage(img, { x: (width - iw) / 2, y: (height - ih) / 2, width: iw, height: ih });
      } catch { /* skip */ }
    }
  }

  return mainDoc.save();
}

export async function POST(req: NextRequest) {
  try {
    const { appData, result, type } = await req.json();
    const enrollmentYear = parseInt(appData.student.rga.substring(0, 4));
    const categories = loadCategories();

    const payload = {
      studentName:  appData.student.name,
      rga:          appData.student.rga,
      course:       appData.student.course || "Administração",
      enrollmentYear,
      generatedAt:  new Date().toLocaleString("pt-BR"),
      categories,
      result,
    };

    // Use process.cwd()/tmp to avoid os.tmpdir() unicode issues on Windows
    const tmpId = Date.now();
    const tmpDir = path.join(process.cwd(), "tmp", `pdf-${tmpId}`);
    mkdirSync(tmpDir, { recursive: true });

    const payloadPath = path.join(tmpDir, "payload.json");
    writeFileSync(payloadPath, JSON.stringify(payload, null, 2));

    const scriptPath = path.join(process.cwd(), "lib", "generatePDF.py");
    const fileName = type === "autonomous"
      ? "comprovante_atividades_autonomas.pdf"
      : "comprovante_atividades_guiadas.pdf";

    // Try "python" first (Windows), then "python3" (Linux/Mac/Railway)
    let pythonOutput = "";
    for (const cmd of ["python", "python3"]) {
      try {
        const result = execSync(
          `${cmd} "${scriptPath}" "${payloadPath}" "${tmpDir}" ${type}`,
          { encoding: "utf-8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
        );
        pythonOutput = result || "";
        break;
      } catch (e: any) {
        const msg = String(e.stderr || "") + String(e.stdout || "") + String(e.message || "");
        pythonOutput = msg;
        if (msg.includes("not recognized") || msg.includes("command not found") || msg.includes("cannot find")) {
          continue;
        }
        throw new Error(`Erro no script Python:\n${msg.slice(0, 1200)}`);
      }
    }

    const pdfPath = path.join(tmpDir, fileName);
    if (!existsSync(pdfPath)) {
      throw new Error(`PDF não encontrado em ${pdfPath}. Saída: ${pythonOutput.slice(0, 800)}`);
    }

    let pdfBuffer: Buffer = readFileSync(pdfPath);

    // Collect attachments for this PDF type
    const attachments: any[] = [];
    if (type === "autonomous") {
      for (const entry of (appData.autonomous || [])) {
        if (entry.fileData) attachments.push(entry);
      }
    } else {
      for (const entry of (appData.guided || [])) {
        if (entry.fileData) attachments.push(entry);
      }
    }

    // Merge attachments as extra pages
    if (attachments.length > 0) {
      const merged = await mergeAttachments(pdfBuffer, attachments);
      pdfBuffer = Buffer.from(merged);
    }

    // Cleanup tmp directory
    try { rmSync(path.join(process.cwd(), "tmp", `pdf-${tmpId}`), { recursive: true, force: true }); } catch { /* ignore */ }

    // Write audit log
    try {
      const r = payload.result;
      const entry: LogEntry = {
        id:          crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        pdfType:     type as "autonomous" | "guided",
        totalCredits: type === "autonomous" ? r.autonomousCredits : r.guidedCredits,
        totalHours:   type === "autonomous" ? r.autonomousHours   : r.guidedHours,
        // Only log activities relevant to this PDF type
        activities: type === "autonomous"
          ? (r.breakdown || []).map((b: any) => ({
              type:            b.category,
              description:     b.description || "",
              quantity:        b.quantity    || 0,
              certificateYear: b.certificateYear,
              credits:         b.cappedCredits,
              hours:           b.hours,
              limited:         b.limited || false,
            }))
          : [],
        guidedActivities: type === "guided"
          ? (r.guidedBreakdown || []).map((g: any) => ({
              name:     g.name,
              semester: g.semester,
              hours:    g.hours,
              credits:  g.credits,
            }))
          : [],
        rejectedCount: type === "autonomous" ? (r.rejectedActivities || []).length : 0,
      };
      appendLog(entry);
    } catch (logErr) {
      console.error("Log write failed:", logErr);
    }

    return new Response(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
