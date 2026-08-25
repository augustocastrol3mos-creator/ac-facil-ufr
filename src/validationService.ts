// ============================================================
// Serviço de Validação de Atividades Complementares - UFR
// ============================================================

export type ActivityType =
  | "artigo_periodico"
  | "livro"
  | "capitulo_livro"
  | "trabalho_anais_resumo"
  | "trabalho_anais_completo"
  | "textos_jornal_revista"
  | "participacao_evento"
  | "palestrante_conferencista"
  | "apresentacao_oral_poster"
  | "premios_academicos"
  | "software_computacional"
  | "software_multimidia"
  | "produto_tecnologico_projeto"
  | "produto_tecnologico_prototipo"
  | "produto_tecnologico_estudo_piloto"
  | "relatorios_pesquisa"
  | "restauracao_obras"
  | "elaboracao_mapa"
  | "colegiados_congregacao"
  | "conselhos_superiores_ufr"
  | "comissoes_permanentes_ufr"
  | "membro_comissoes_grupos"
  | "cargo_diretivo_da_ca_liga"
  | "empresa_junior_diretivo"
  | "empresa_junior_assessor"
  | "empresa_junior_participante"
  | "mesario_eleitoral"
  | "curso_extensao"
  | "disciplina_outro_curso"
  | "acao_social_extensionista"
  | "estagio_nao_obrigatorio";

export interface Activity {
  type: ActivityType;
  /** Ano do certificado/comprovante */
  certificateYear: number;
  /** Quantidade (artigos, livros, semestres, textos, horas, etc.) */
  quantity: number;
}

// ── Atividade Guiada ────────────────────────────────────────────────────────
// Indicadas pelo coordenador a cada semestre. Não possuem tipo fixo nem limite
// de créditos — todo o comprovante é aceito integralmente. O estudante informa
// nome da atividade, semestre de referência, horas e anexa o comprovante.
export interface GuidedActivity {
  /** Nome/descrição da atividade indicada pelo coordenador */
  name: string;
  /** Ex.: "2024/1" */
  semester: string;
  /** Horas indicadas no comprovante */
  hours: number;
  /** Nome do arquivo anexado (PDF/imagem) — armazenado pelo frontend */
  attachmentFileName?: string;
}

export interface GuidedActivityBreakdown {
  name: string;
  semester: string;
  hours: number;
  credits: number;
  attachmentFileName?: string;
}

export interface ValidationResult {
  success: true;
  /** Créditos das atividades autônomas (Quadro I) */
  autonomousCredits: number;
  autonomousHours: number;
  /** Créditos das atividades guiadas */
  guidedCredits: number;
  guidedHours: number;
  /** Total geral (autônomas + guiadas) */
  totalCredits: number;
  totalHours: number;
  breakdown: CategoryBreakdown[];
  guidedBreakdown: GuidedActivityBreakdown[];
  rejectedActivities: RejectedActivity[];
}

export interface ValidationError {
  success: false;
  error: string;
}

export interface CategoryBreakdown {
  category: string;
  rawCredits: number;
  cappedCredits: number;
  hours: number;
}

export interface RejectedActivity {
  type: ActivityType;
  reason: string;
  certificateYear: number;
}

// ============================================================
// Configuração das Categorias (Quadro I)
// ============================================================
interface CategoryConfig {
  label: string;
  creditsPerUnit: number;
  maxCredits: number;
  /** Quando a unidade é "horas", informa quantas horas equivalem a 1 crédito */
  hoursPerCredit?: number;
}

const CATEGORY_CONFIG: Record<ActivityType, CategoryConfig> = {
  artigo_periodico: {
    label: "Artigo em Periódico Indexado",
    creditsPerUnit: 2,
    maxCredits: 8,
  },
  livro: {
    label: "Livro",
    creditsPerUnit: 8,
    maxCredits: 8,
  },
  capitulo_livro: {
    label: "Capítulo de Livro",
    creditsPerUnit: 3,
    maxCredits: 9,
  },
  trabalho_anais_resumo: {
    label: "Trabalho em Anais de Evento (Resumo)",
    creditsPerUnit: 0.5,
    maxCredits: 5,
  },
  trabalho_anais_completo: {
    label: "Trabalho em Anais de Evento (Completo)",
    creditsPerUnit: 1,
    maxCredits: 5,
  },
  textos_jornal_revista: {
    label: "Textos em Jornal ou Revistas",
    creditsPerUnit: 1 / 4, // 1 crédito a cada 4 textos
    maxCredits: 5,
  },
  participacao_evento: {
    label: "Participação em Eventos Culturais/Científicos",
    creditsPerUnit: 1,
    maxCredits: 4,
  },
  palestrante_conferencista: {
    label: "Palestrante, Conferencista ou Ministrante",
    creditsPerUnit: 2,
    maxCredits: 6,
  },
  apresentacao_oral_poster: {
    label: "Apresentação Oral ou Pôster",
    creditsPerUnit: 1,
    maxCredits: 4,
  },
  premios_academicos: {
    label: "Prêmios Acadêmicos/Científicos",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  software_computacional: {
    label: "Software Computacional",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  software_multimidia: {
    label: "Software Multimídia",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  produto_tecnologico_projeto: {
    label: "Produto Tecnológico (Projeto)",
    creditsPerUnit: 1,
    maxCredits: 2,
  },
  produto_tecnologico_prototipo: {
    label: "Produto Tecnológico (Protótipo)",
    creditsPerUnit: 2,
    maxCredits: 2,
  },
  produto_tecnologico_estudo_piloto: {
    label: "Produto Tecnológico (Estudo Piloto)",
    creditsPerUnit: 3,
    maxCredits: 3,
  },
  relatorios_pesquisa: {
    label: "Relatórios, Processos e Pareceres de Pesquisa",
    creditsPerUnit: 1,
    maxCredits: 4,
  },
  restauracao_obras: {
    label: "Restauração de Obras",
    creditsPerUnit: 1,
    maxCredits: 4,
  },
  elaboracao_mapa: {
    label: "Elaboração de Mapa, Carta ou Similar",
    creditsPerUnit: 1,
    maxCredits: 4,
  },
  colegiados_congregacao: {
    label: "Participação em Colegiados e Congregação",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  conselhos_superiores_ufr: {
    label: "Conselhos Superiores da UFR",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  comissoes_permanentes_ufr: {
    label: "Comissões Permanentes da UFR",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  membro_comissoes_grupos: {
    label: "Membro de Comissões/Grupos de Trabalho",
    creditsPerUnit: 1,
    maxCredits: 4,
  },
  cargo_diretivo_da_ca_liga: {
    label: "Cargo Diretivo (DA, CA, Ligas Acadêmicas)",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  empresa_junior_diretivo: {
    label: "Empresa Júnior – Cargo Diretivo",
    creditsPerUnit: 2,
    maxCredits: 4, // limite combinado empresa júnior = 4
  },
  empresa_junior_assessor: {
    label: "Empresa Júnior – Assessor",
    creditsPerUnit: 1,
    maxCredits: 2,
  },
  empresa_junior_participante: {
    label: "Empresa Júnior – Participante",
    creditsPerUnit: 1,
    maxCredits: 2,
  },
  mesario_eleitoral: {
    label: "Mesário em Processo Eleitoral",
    creditsPerUnit: 1,
    maxCredits: 2,
  },
  curso_extensao: {
    label: "Curso de Extensão ou Aperfeiçoamento",
    creditsPerUnit: 1 / 16, // 1 crédito a cada 16 horas
    maxCredits: 7,
    hoursPerCredit: 16,
  },
  disciplina_outro_curso: {
    label: "Aprovação em Disciplina de Outro Curso",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
  acao_social_extensionista: {
    label: "Ação Social, Comunitária ou Extensionista",
    creditsPerUnit: 1 / 16,
    maxCredits: 4,
    hoursPerCredit: 16,
  },
  estagio_nao_obrigatorio: {
    label: "Estágio Supervisionado Não Obrigatório",
    creditsPerUnit: 2,
    maxCredits: 4,
  },
};

// Empresa Júnior: limite combinado total de 4 créditos
const EMPRESA_JUNIOR_COMBINED_MAX = 4;
const EMPRESA_JUNIOR_TYPES: ActivityType[] = [
  "empresa_junior_diretivo",
  "empresa_junior_assessor",
  "empresa_junior_participante",
];

// Trabalho em anais: limite combinado total de 5 créditos
const ANAIS_COMBINED_MAX = 5;
const ANAIS_TYPES: ActivityType[] = [
  "trabalho_anais_resumo",
  "trabalho_anais_completo",
];

// Conversão base
const HOURS_PER_CREDIT = 16;

// ============================================================
// Funções auxiliares
// ============================================================

function extractEnrollmentYear(rga: string): number | null {
  if (!/^\d{12}$/.test(rga)) return null;
  const year = parseInt(rga.substring(0, 4), 10);
  if (year < 1900 || year > 2100) return null;
  return year;
}

function isWithinDateWindow(
  certificateYear: number,
  enrollmentYear: number
): boolean {
  return certificateYear >= enrollmentYear - 2;
}

// ============================================================
// Função principal de validação
// ============================================================

export function validateActivities(
  rga: string,
  activities: Activity[],
  guidedActivities: GuidedActivity[] = []
): ValidationResult | ValidationError {
  // 1. Validar e extrair ano do RGA
  const enrollmentYear = extractEnrollmentYear(rga);
  if (enrollmentYear === null) {
    return {
      success: false,
      error: `RGA inválido: "${rga}". O RGA deve ter exatamente 12 dígitos numéricos no formato YYYYXXXXXXXX.`,
    };
  }

  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      success: false,
      error: "Nenhuma atividade foi submetida para validação.",
    };
  }

  // 2. Separar atividades válidas das rejeitadas por data
  const validActivities: Activity[] = [];
  const rejectedActivities: RejectedActivity[] = [];

  for (const activity of activities) {
    if (!isWithinDateWindow(activity.certificateYear, enrollmentYear)) {
      rejectedActivities.push({
        type: activity.type,
        reason: `Certificado do ano ${activity.certificateYear} está fora da janela permitida (mínimo: ${enrollmentYear - 2}).`,
        certificateYear: activity.certificateYear,
      });
    } else {
      validActivities.push(activity);
    }
  }

  // 3. Acumular créditos brutos por tipo
  const rawAccumulator: Partial<Record<ActivityType, number>> = {};

  for (const activity of validActivities) {
    const config = CATEGORY_CONFIG[activity.type];
    if (!config) {
      rejectedActivities.push({
        type: activity.type,
        reason: `Tipo de atividade desconhecido: "${activity.type}".`,
        certificateYear: activity.certificateYear,
      });
      continue;
    }

    const earned = config.creditsPerUnit * activity.quantity;
    rawAccumulator[activity.type] =
      (rawAccumulator[activity.type] ?? 0) + earned;
  }

  // 4. Aplicar travas individuais por categoria
  const cappedAccumulator: Partial<Record<ActivityType, number>> = {};
  for (const [type, raw] of Object.entries(rawAccumulator) as [
    ActivityType,
    number
  ][]) {
    const config = CATEGORY_CONFIG[type];
    cappedAccumulator[type] = Math.min(raw, config.maxCredits);
  }

  // 5. Aplicar trava combinada de Empresa Júnior
  let empresaJuniorTotal = 0;
  for (const t of EMPRESA_JUNIOR_TYPES) {
    empresaJuniorTotal += cappedAccumulator[t] ?? 0;
  }
  if (empresaJuniorTotal > EMPRESA_JUNIOR_COMBINED_MAX) {
    const excess = empresaJuniorTotal - EMPRESA_JUNIOR_COMBINED_MAX;
    // Reduzir proporcionalmente (começando pelo participante, depois assessor, depois diretivo)
    const order: ActivityType[] = [
      "empresa_junior_participante",
      "empresa_junior_assessor",
      "empresa_junior_diretivo",
    ];
    let toReduce = excess;
    for (const t of order) {
      const val = cappedAccumulator[t] ?? 0;
      if (toReduce <= 0) break;
      const reduction = Math.min(val, toReduce);
      cappedAccumulator[t] = val - reduction;
      toReduce -= reduction;
    }
  }

  // 6. Aplicar trava combinada de Trabalho em Anais
  let anaisTotal = 0;
  for (const t of ANAIS_TYPES) {
    anaisTotal += cappedAccumulator[t] ?? 0;
  }
  if (anaisTotal > ANAIS_COMBINED_MAX) {
    const excess = anaisTotal - ANAIS_COMBINED_MAX;
    // Reduzir a partir do "completo"
    const order: ActivityType[] = [
      "trabalho_anais_completo",
      "trabalho_anais_resumo",
    ];
    let toReduce = excess;
    for (const t of order) {
      const val = cappedAccumulator[t] ?? 0;
      if (toReduce <= 0) break;
      const reduction = Math.min(val, toReduce);
      cappedAccumulator[t] = val - reduction;
      toReduce -= reduction;
    }
  }

  // 7. Montar breakdown de autônomas
  const breakdown: CategoryBreakdown[] = [];
  let autonomousCredits = 0;

  for (const [type, raw] of Object.entries(rawAccumulator) as [
    ActivityType,
    number
  ][]) {
    const config = CATEGORY_CONFIG[type];
    const capped = cappedAccumulator[type] ?? 0;
    breakdown.push({
      category: config.label,
      rawCredits: parseFloat(raw.toFixed(4)),
      cappedCredits: parseFloat(capped.toFixed(4)),
      hours: parseFloat((capped * HOURS_PER_CREDIT).toFixed(2)),
    });
    autonomousCredits += capped;
  }

  autonomousCredits = parseFloat(autonomousCredits.toFixed(4));
  const autonomousHours = parseFloat((autonomousCredits * HOURS_PER_CREDIT).toFixed(2));

  // 8. Processar atividades guiadas (sem limite — cômputo integral das horas)
  const guidedBreakdown: GuidedActivityBreakdown[] = [];
  let guidedHours = 0;

  for (const guided of guidedActivities) {
    if (!guided.name || guided.name.trim() === "") continue;
    const hrs = Math.max(0, guided.hours);
    const credits = parseFloat((hrs / HOURS_PER_CREDIT).toFixed(4));
    guidedBreakdown.push({
      name: guided.name.trim(),
      semester: guided.semester ?? "—",
      hours: hrs,
      credits,
      attachmentFileName: guided.attachmentFileName,
    });
    guidedHours += hrs;
  }

  guidedHours = parseFloat(guidedHours.toFixed(2));
  const guidedCredits = parseFloat((guidedHours / HOURS_PER_CREDIT).toFixed(4));

  const totalCredits = parseFloat((autonomousCredits + guidedCredits).toFixed(4));
  const totalHours = parseFloat((autonomousHours + guidedHours).toFixed(2));

  return {
    success: true,
    autonomousCredits,
    autonomousHours,
    guidedCredits,
    guidedHours,
    totalCredits,
    totalHours,
    breakdown,
    guidedBreakdown,
    rejectedActivities,
  };
}

// ============================================================
// Export de metadados das categorias (para o frontend/PDF)
// ============================================================
export { CATEGORY_CONFIG, HOURS_PER_CREDIT };
