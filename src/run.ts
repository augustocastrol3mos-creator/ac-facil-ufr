// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require("child_process");
const { writeFileSync } = require("fs");
const { validateActivities } = require("./validationService");

const STUDENT = {
  name:   "Augusto",
  rga:    "202200012345", // <- substitua pelo RGA real
  course: "Administração",
};

const autonomousActivities = [
  { type: "artigo_periodico",          certificateYear: 2023, quantity: 2  },
  { type: "curso_extensao",            certificateYear: 2022, quantity: 48 },
  { type: "participacao_evento",       certificateYear: 2023, quantity: 3  },
];

const guidedActivities = [
  {
    name:               "Workshop de Inovação",
    semester:           "2023/1",
    hours:              32,
    attachmentFileName: "workshop.pdf",
  },
];

const enrollmentYear = parseInt(STUDENT.rga.substring(0, 4));
const result = validateActivities(STUDENT.rga, autonomousActivities, guidedActivities);

if (result.success === false) {
  console.error("Erro:", result.error);
  process.exit(1);
}

console.log("Creditos Autonomos:", result.autonomousCredits, "(" + result.autonomousHours + "h)");
console.log("Creditos Guiados:  ", result.guidedCredits,    "(" + result.guidedHours + "h)");
console.log("TOTAL:             ", result.totalCredits, "creditos /", result.totalHours, "h");

const payload = {
  studentName:    STUDENT.name,
  rga:            STUDENT.rga,
  course:         STUDENT.course,
  enrollmentYear: enrollmentYear,
  generatedAt:    new Date().toLocaleString("pt-BR"),
  result:         result,
};

writeFileSync("output\\payload.json", JSON.stringify(payload, null, 2));
console.log("payload.json salvo.");

execSync("python src\\generatePDF.py output\\payload.json output\\", { stdio: "inherit" });
console.log("PDFs gerados na pasta output\\");