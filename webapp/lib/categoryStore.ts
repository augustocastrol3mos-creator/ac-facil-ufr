import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const STORE_PATH = path.join(process.cwd(), "data", "categories.enc");
// Chave de criptografia. Defina STORE_SECRET_CATEGORIES no ambiente para não depender do padrão.
const SECRET = process.env.STORE_SECRET_CATEGORIES || "UFR_PROGRAD_SECRET_2026_ADM";
const ALGORITHM = "aes-256-gcm";

// Default categories (same as validationService.ts CATEGORY_CONFIG)
export const DEFAULT_CATEGORIES: Record<string, any> = {
  artigo_periodico:                { label: "Artigo em Periódico Indexado", creditsPerUnit: 2, maxCredits: 8, hoursPerCredit: 16 },
  livro:                           { label: "Livro", creditsPerUnit: 8, maxCredits: 8, hoursPerCredit: 16 },
  capitulo_livro:                  { label: "Capítulo de Livro", creditsPerUnit: 3, maxCredits: 9, hoursPerCredit: 16 },
  trabalho_anais_resumo:           { label: "Trabalho em Anais (Resumo)", creditsPerUnit: 0.5, maxCredits: 5, hoursPerCredit: 16 },
  trabalho_anais_completo:         { label: "Trabalho em Anais (Completo)", creditsPerUnit: 1, maxCredits: 5, hoursPerCredit: 16 },
  textos_jornal_revista:           { label: "Textos em Jornal ou Revistas", creditsPerUnit: 0.25, maxCredits: 5, hoursPerCredit: 16 },
  participacao_evento:             { label: "Participação em Eventos Culturais/Científicos", creditsPerUnit: 1, maxCredits: 4, hoursPerCredit: 16 },
  palestrante_conferencista:       { label: "Palestrante, Conferencista ou Ministrante", creditsPerUnit: 2, maxCredits: 6, hoursPerCredit: 16 },
  apresentacao_oral_poster:        { label: "Apresentação Oral ou Pôster", creditsPerUnit: 1, maxCredits: 4, hoursPerCredit: 16 },
  premios_academicos:              { label: "Prêmios Acadêmicos/Científicos", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  software_computacional:          { label: "Software Computacional", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  software_multimidia:             { label: "Software Multimídia", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  produto_tecnologico_projeto:     { label: "Produto Tecnológico (Projeto)", creditsPerUnit: 1, maxCredits: 2, hoursPerCredit: 16 },
  produto_tecnologico_prototipo:   { label: "Produto Tecnológico (Protótipo)", creditsPerUnit: 2, maxCredits: 2, hoursPerCredit: 16 },
  produto_tecnologico_estudo_piloto: { label: "Produto Tecnológico (Estudo Piloto)", creditsPerUnit: 3, maxCredits: 3, hoursPerCredit: 16 },
  relatorios_pesquisa:             { label: "Relatórios, Processos e Pareceres", creditsPerUnit: 1, maxCredits: 4, hoursPerCredit: 16 },
  restauracao_obras:               { label: "Restauração de Obras", creditsPerUnit: 1, maxCredits: 4, hoursPerCredit: 16 },
  elaboracao_mapa:                 { label: "Elaboração de Mapa, Carta ou Similar", creditsPerUnit: 1, maxCredits: 4, hoursPerCredit: 16 },
  colegiados_congregacao:          { label: "Colegiados e Congregação", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  conselhos_superiores_ufr:        { label: "Conselhos Superiores da UFR", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  comissoes_permanentes_ufr:       { label: "Comissões Permanentes da UFR", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  membro_comissoes_grupos:         { label: "Membro de Comissões/Grupos de Trabalho", creditsPerUnit: 1, maxCredits: 4, hoursPerCredit: 16 },
  cargo_diretivo_da_ca_liga:       { label: "Cargo Diretivo (DA, CA, Ligas Acadêmicas)", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  empresa_junior_diretivo:         { label: "Empresa Júnior – Cargo Diretivo", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  empresa_junior_assessor:         { label: "Empresa Júnior – Assessor", creditsPerUnit: 1, maxCredits: 2, hoursPerCredit: 16 },
  empresa_junior_participante:     { label: "Empresa Júnior – Participante", creditsPerUnit: 1, maxCredits: 2, hoursPerCredit: 16 },
  mesario_eleitoral:               { label: "Mesário em Processo Eleitoral", creditsPerUnit: 1, maxCredits: 2, hoursPerCredit: 16 },
  curso_extensao:                  { label: "Curso de Extensão ou Aperfeiçoamento (horas)", creditsPerUnit: 0.0625, maxCredits: 7, hoursPerCredit: 16 },
  disciplina_outro_curso:          { label: "Aprovação em Disciplina de Outro Curso", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
  acao_social_extensionista:       { label: "Ação Social, Comunitária ou Extensionista (horas)", creditsPerUnit: 0.0625, maxCredits: 4, hoursPerCredit: 16 },
  estagio_nao_obrigatorio:         { label: "Estágio Supervisionado Não Obrigatório", creditsPerUnit: 2, maxCredits: 4, hoursPerCredit: 16 },
};

function deriveKey(): Buffer {
  return crypto.scryptSync(SECRET, "ufr-salt-2026", 32);
}

export function encryptAndSave(data: object): void {
  const { mkdirSync } = require("fs");
  mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);
  writeFileSync(STORE_PATH, payload.toString("base64"), "utf8");
}

export function loadCategories(): Record<string, any> {
  if (!existsSync(STORE_PATH)) return DEFAULT_CATEGORIES;
  try {
    const payload = Buffer.from(readFileSync(STORE_PATH, "utf8"), "base64");
    const iv = payload.slice(0, 16);
    const authTag = payload.slice(16, 32);
    const encrypted = payload.slice(32);
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}
