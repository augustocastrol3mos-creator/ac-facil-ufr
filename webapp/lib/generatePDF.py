#!/usr/bin/env python3
"""
Gerador de PDF - Comprovante de Atividades Complementares UFR
Gera PDFs separados para atividades autônomas e guiadas.
"""

import os
import json
import sys
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
# Fonte: Helvetica (equivalente ao Arial — fonte oficial UFR, Manual da Marca)
# Suporta português completo com WinAnsiEncoding
_FONT      = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"
_FONT_IT   = "Helvetica-Oblique"


SAMPLE_DATA = {
    "studentName": "João da Silva Pereira",
    "rga": "202200012345",
    "course": "Administração",
    "enrollmentYear": 2022,
    "generatedAt": datetime.now().strftime("%d/%m/%Y %H:%M"),
    "result": {
        "success": True,
        "autonomousCredits": 14.5,
        "autonomousHours": 232.0,
        "guidedCredits": 3.0,
        "guidedHours": 48.0,
        "totalCredits": 17.5,
        "totalHours": 280.0,
        "breakdown": [
            {"category": "Artigo em Periódico Indexado",        "rawCredits": 4.0, "cappedCredits": 4.0, "hours": 64.0},
            {"category": "Capítulo de Livro",                   "rawCredits": 6.0, "cappedCredits": 6.0, "hours": 96.0},
            {"category": "Participação em Eventos Culturais",   "rawCredits": 5.0, "cappedCredits": 4.0, "hours": 64.0},
            {"category": "Curso de Extensão ou Aperfeiçoamento","rawCredits": 3.0, "cappedCredits": 3.0, "hours": 48.0},
            {"category": "Palestrante ou Conferencista",        "rawCredits": 2.0, "cappedCredits": 2.0, "hours": 32.0},
        ],
        "guidedBreakdown": [
            {"name": "Workshop de Inovação e Empreendedorismo", "semester": "2023/1", "hours": 32.0, "credits": 2.0, "attachmentFileName": "workshop_inovacao_2023.pdf"},
            {"name": "Semana Academica de Administração",       "semester": "2023/2", "hours": 16.0, "credits": 1.0, "attachmentFileName": "semana_academica_adm.pdf"},
        ],
        "rejectedActivities": [
            {"type": "artigo_periodico", "certificateYear": 2019,
             "reason": "Certificado do ano 2019 está fora da janela permitida (mínimo: 2020)."},
        ]
    }
}


def fmt_credits(val: float) -> str:
    if val == int(val):
        return str(int(val))
    return f"{val:.2f}".rstrip("0").rstrip(".")


# ─── Cores e helpers compartilhados ───────────────────────────────────────────
DARK_BLUE  = colors.HexColor("#1a1a2e")
MID_BLUE   = colors.HexColor("#2c3e6b")
LIGHT_ROW  = colors.HexColor("#f0f4fa")
WHITE_ROW  = colors.white
GUIDED_HDR = colors.HexColor("#1a6b3a")

def _base_styles():
    return {
        "header":  ParagraphStyle("HeaderUFR", fontSize=9,   leading=12, alignment=TA_CENTER, textColor=colors.HexColor("#444444")),
        "title":   ParagraphStyle("TitleDoc",  fontSize=14,  leading=18, alignment=TA_CENTER, textColor=DARK_BLUE, fontName=_FONT_BOLD, spaceAfter=4),
        "sub":     ParagraphStyle("SubTitle",  fontSize=10,  leading=13, alignment=TA_CENTER, textColor=colors.HexColor("#444444"), spaceAfter=10),
        "sec":     ParagraphStyle("SecTitle",  fontSize=10,  leading=13, fontName=_FONT_BOLD, textColor=colors.white, alignment=TA_LEFT),
        "label":   ParagraphStyle("LabelSt",   fontSize=8,   leading=11, fontName=_FONT_BOLD, textColor=colors.HexColor("#555555")),
        "value":   ParagraphStyle("ValueSt",   fontSize=9,   leading=12, textColor=colors.HexColor("#111111")),
        "small":   ParagraphStyle("SmallSt",   fontSize=7.5, leading=10, textColor=colors.HexColor("#666666")),
        "obs":     ParagraphStyle("ObsSt",     fontSize=8,   leading=12, textColor=colors.HexColor("#333333")),
        "foot":    ParagraphStyle("FootSt",    fontSize=7,   leading=9,  alignment=TA_CENTER, textColor=colors.HexColor("#888888")),
        "warn":    ParagraphStyle("WarnSt",    fontSize=8.5, leading=12, textColor=colors.HexColor("#7a2800"), fontName=_FONT_BOLD),
    }


def _section_header(text, style, doc_width):
    tbl = Table([[Paragraph(text, style)]], colWidths=[doc_width])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), MID_BLUE),
        ("LEFTPADDING",  (0,0),(-1,-1), 6),
        ("RIGHTPADDING", (0,0),(-1,-1), 6),
        ("TOPPADDING",   (0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
    ]))
    return tbl


def _student_block(data, doc_width, s):
    enroll_year = data.get("enrollmentYear", 0)
    rows = [
        [Paragraph("Nome Completo:", s["label"]), Paragraph(data.get("studentName",""), s["value"]),
         Paragraph("RGA:", s["label"]),           Paragraph(data.get("rga",""), s["value"])],
        [Paragraph("Curso:", s["label"]),          Paragraph(data.get("course",""), s["value"]),
         Paragraph("Ano de Matrícula:", s["label"]), Paragraph(str(enroll_year), s["value"])],
        [Paragraph("Data de Emissão:", s["label"]), Paragraph(data.get("generatedAt",""), s["value"]),
         Paragraph("Janela de Certificados:", s["label"]),
         Paragraph(f"{enroll_year - 2} até a data atual", s["value"])],
    ]
    cw = [doc_width*0.18, doc_width*0.32, doc_width*0.22, doc_width*0.28]
    tbl = Table(rows, colWidths=cw)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), colors.HexColor("#f7f9fc")),
        ("GRID",         (0,0),(-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("LEFTPADDING",  (0,0),(-1,-1), 5), ("RIGHTPADDING",(0,0),(-1,-1), 5),
        ("TOPPADDING",   (0,0),(-1,-1), 4), ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
    ]))
    return tbl


def _quadro_table(doc_width, categories=None):
    q_hdr_s = ParagraphStyle("qh", fontSize=7.5, fontName=_FONT_BOLD, textColor=colors.white, leading=10)
    q_act_s = ParagraphStyle("qa", fontSize=7,   leading=9,  textColor=colors.HexColor("#111111"))
    q_crd_s = ParagraphStyle("qc", fontSize=7,   leading=9,  textColor=colors.HexColor("#1a3a6e"))

    # Build quadro_data dynamically from categories if provided
    quadro_data = [["Atividades", "Créditos e Limites"]]
    if categories:
        for key, cfg in categories.items():
            label = cfg.get("label", key)
            cpu   = cfg.get("creditsPerUnit", 0)
            maxi  = cfg.get("maxCredits", 0)
            hpc   = cfg.get("hoursPerCredit", 16)
            # Format credits per unit nicely
            if hpc and cpu < 1 and cpu > 0:
                unit_str = f"01 crédito a cada {int(round(1/cpu * hpc))} horas"
            elif cpu == int(cpu):
                unit_str = f"{int(cpu):02d} crédito{'s' if cpu != 1 else ''} por unidade"
            else:
                unit_str = f"{cpu} créditos por unidade"
            limit_str = f"máximo {int(maxi):02d} créditos no curso"
            quadro_data.append([label, f"{unit_str} ({limit_str})."])
    else:
        # Fallback static data
        quadro_data += [
            ["Artigo publicado em Periódico indexado.", "02 créditos por unidade (máximo 08 no curso)."],
            ["Livro", "08 créditos por unidade (máximo 08 no curso)."],
            ["Capítulo de Livro", "03 créditos por unidade (máximo 09 no curso)."],
            ["Trabalho em Anais (Resumo/Completo).", "0,5 ou 01 crédito por trabalho (máximo 05 no curso)."],
            ["Textos em Jornal ou Revistas.", "01 crédito a cada 64 horas (máximo 05 no curso)."],
            ["Participação em eventos culturais/cientificos.", "01 crédito por evento (máximo 04 no curso)."],
            ["Palestrante, conferencista ou ministrante.", "02 créditos por participacao (máximo 06 no curso)."],
            ["Apresentação oral ou pôster.", "01 crédito por apresentacao (máximo 04 no curso)."],
            ["Prêmios acadêmicos ou artísticos.", "02 créditos por premio (máximo 04 no curso)."],
            ["Software Computacional publicado.", "02 créditos por software (máximo 04 no curso)."],
            ["Software Multimidia publicado.", "02 créditos por software (máximo 04 no curso)."],
            ["Produto Tecnológico — Projeto.", "01 crédito por projeto (máximo 02 no curso)."],
            ["Produto Tecnológico — Protótipo.", "02 créditos por prototipo (máximo 02 no curso)."],
            ["Produto Tecnológico — Estudo Piloto.", "03 créditos por criação (máximo 03 no curso)."],
            ["Relatórios e pareceres de pesquisa.", "01 crédito por relatorio (máximo 04 no curso)."],
            ["Restauração de obras.", "01 crédito por restauracao (máximo 04 no curso)."],
            ["Elaboração de Mapa, Carta ou similar.", "01 crédito por elaboracao (máximo 04 no curso)."],
            ["Colegiados e Congregação.", "02 créditos por semestre (máximo 04 no curso)."],
            ["Conselhos Superiores da UFR.", "02 créditos por semestre (máximo 04 no curso)."],
            ["Comissões Permanentes da UFR.", "02 créditos por semestre (máximo 04 no curso)."],
            ["Membro de comissões/grupos da UFR.", "01 crédito por portaria (máximo 04 no curso)."],
            ["Cargo diretivo (DA, CA, Ligas Acadêmicas).", "02 créditos por semestre (máximo 04 no curso)."],
            ["Empresa Júnior ou Escritório Modelo.", "Máx. 04 créditos combinados entre diretivo/assessor/participante."],
            ["Mesário em processo eleitoral.", "01 crédito por participacao (máximo 02 no curso)."],
            ["Curso de extensão ou aperfeiçoamento.", "01 crédito a cada 16 horas (máximo 07 no curso)."],
            ["Aprovação em Disciplina de outro curso.", "02 créditos (máximo 04 no curso)."],
            ["Ação social ou extensionista.", "01 crédito a cada 16 horas (máximo 04 no curso)."],
            ["Estágio Supervisionado Não Obrigatório.", "02 créditos por semestre (máximo 04 no curso)."],
        ]

    rows = []
    for i, row in enumerate(quadro_data):
        if i == 0:
            rows.append([Paragraph(row[0], q_hdr_s), Paragraph(row[1], q_hdr_s)])
        else:
            rows.append([Paragraph(row[0], q_act_s), Paragraph(row[1], q_crd_s)])

    bg_styles = [("BACKGROUND",(0,i),(-1,i), colors.HexColor("#f7f9fc") if i%2==0 else colors.white) for i in range(1, len(rows))]
    qt = Table(rows, colWidths=[doc_width*0.50, doc_width*0.50])
    qt.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,0), MID_BLUE),
        ("GRID",       (0,0),(-1,-1), 0.4, colors.HexColor("#aaaaaa")),
        ("LEFTPADDING",(0,0),(-1,-1), 4), ("RIGHTPADDING",(0,0),(-1,-1), 4),
        ("TOPPADDING", (0,0),(-1,-1), 3), ("BOTTOMPADDING",(0,0),(-1,-1), 3),
        ("VALIGN",     (0,0),(-1,-1), "TOP"),
        *bg_styles,
    ]))
    return qt


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 1 — ATIVIDADES AUTÔNOMAS
# ═══════════════════════════════════════════════════════════════════════════════
def generate_autonomous_pdf(data: dict, output_path: str):
    doc = SimpleDocTemplate(output_path, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
        encrypt=None)
    result = data["result"]
    s = _base_styles()
    dw = doc.width
    story = []

    # Cabecalho
    story.append(Paragraph("UNIVERSIDADE FEDERAL DE RONDONÓPOLIS — UFR", s["header"]))
    story.append(Paragraph("Pró-Reitoria de Graduação — PROGRAD", s["header"]))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=DARK_BLUE))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("COMPROVANTE DE ATIVIDADES COMPLEMENTARES AUTÔNOMAS", s["title"]))
    story.append(Paragraph("Quadro I — Atividades Autônomas | Processo SEI — Atividades Autônomas", s["sub"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#aaaaaa")))
    story.append(Spacer(1, 5*mm))

    # Aviso SEI
    warn_box_data = [[Paragraph(
        "ATENÇÃO — PROCESSO SEI: Este documento refere-se EXCLUSIVAMENTE às Atividades "
        "Complementares AUTÔNOMAS e deve ser anexado em um processo SEI próprio para esse tipo. "
        "Atividades Guiadas possuem processo SEI separado e PDF próprio.",
        s["warn"]
    )]]
    warn_tbl = Table(warn_box_data, colWidths=[dw])
    warn_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), colors.HexColor("#fff3e0")),
        ("BOX",          (0,0),(-1,-1), 1.2, colors.HexColor("#e65100")),
        ("LEFTPADDING",  (0,0),(-1,-1), 8),
        ("RIGHTPADDING", (0,0),(-1,-1), 8),
        ("TOPPADDING",   (0,0),(-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
    ]))
    story.append(warn_tbl)
    story.append(Spacer(1, 5*mm))

    # 1. Dados do estudante
    story.append(_section_header("1. DADOS DO ESTUDANTE", s["sec"], dw))
    story.append(Spacer(1, 2*mm))
    story.append(_student_block(data, dw, s))
    story.append(Spacer(1, 5*mm))

    # 2. Detalhamento das autônomas
    story.append(_section_header("2. DETALHAMENTO POR CATEGORIA (Quadro I)", s["sec"], dw))
    story.append(Spacer(1, 2*mm))

    breakdown = result.get("breakdown", [])
    hdr_s  = ParagraphStyle("hdr",  fontSize=8, fontName=_FONT_BOLD, textColor=colors.white, leading=10)
    hdr_sc = ParagraphStyle("hdrc", fontSize=8, fontName=_FONT_BOLD, textColor=colors.white, alignment=TA_CENTER, leading=10)

    desc_style    = ParagraphStyle("desc",    fontSize=7.5, leading=10, textColor=colors.HexColor("#333333"), fontName=_FONT_IT)
    no_desc_style = ParagraphStyle("nodesc",  fontSize=7.5, leading=10, textColor=colors.HexColor("#aaaaaa"), fontName=_FONT_IT)
    cat_style     = ParagraphStyle("cat",     fontSize=7.5, leading=10, textColor=colors.HexColor("#555555"))

    auto_rows = [[
        Paragraph("Categoria / Atividade", hdr_s),
        Paragraph("Descricao",             hdr_s),
        Paragraph("Qtd.",    hdr_sc),
        Paragraph("Créditos Computados",   hdr_sc),
        Paragraph("Horas",   hdr_sc),
        Paragraph("Status",  hdr_sc),
    ]]
    for i, item in enumerate(breakdown):
        capped   = item["cappedCredits"]
        limited      = item.get("limited", False)
        status_txt   = "Limitado" if limited else "OK"
        status_color = colors.HexColor("#cc6600") if limited else colors.HexColor("#007700")
        desc     = item.get("description", "").strip()
        qty      = item.get("quantity", "")
        auto_rows.append([
            Paragraph(item["category"], cat_style),
            Paragraph(desc, desc_style) if desc else Paragraph("—", no_desc_style),
            Paragraph(str(qty), ParagraphStyle("qc", fontSize=8, alignment=TA_CENTER)),
            Paragraph(fmt_credits(capped), ParagraphStyle("cc", fontSize=8, alignment=TA_CENTER, fontName=_FONT_BOLD)),
            Paragraph(f"{item['hours']:.0f} h", ParagraphStyle("cc", fontSize=8, alignment=TA_CENTER)),
            Paragraph(status_txt, ParagraphStyle("cc", fontSize=8, alignment=TA_CENTER, textColor=status_color, fontName=_FONT_BOLD)),
        ])

    n = len(auto_rows)
    auto_rows.append([
        Paragraph("TOTAL — ATIVIDADES AUTÔNOMAS", ParagraphStyle("tot", fontSize=9, fontName=_FONT_BOLD)),
        Paragraph("", s["small"]),
        Paragraph("", s["small"]),
        Paragraph(fmt_credits(result.get("autonomousCredits",0)), ParagraphStyle("tot_c", fontSize=9, fontName=_FONT_BOLD, alignment=TA_CENTER)),
        Paragraph(f"{result.get('autonomousHours',0):.0f} h", ParagraphStyle("tot_c", fontSize=9, fontName=_FONT_BOLD, alignment=TA_CENTER)),
        Paragraph("", s["small"]),
    ])

    cw = [dw*0.27, dw*0.25, dw*0.07, dw*0.16, dw*0.10, dw*0.15]
    at = Table(auto_rows, colWidths=cw)
    row_bgs = [("BACKGROUND",(0,i+1),(-1,i+1), WHITE_ROW if i%2==0 else LIGHT_ROW) for i in range(len(breakdown))]
    at.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  MID_BLUE),
        ("BACKGROUND",   (0,n), (-1,n),  colors.HexColor("#dce8f0")),
        ("FONTNAME",     (0,n), (-1,n),  _FONT_BOLD),
        ("GRID",         (0,0), (-1,-1), 0.4, colors.HexColor("#bbbbbb")),
        ("LEFTPADDING",  (0,0), (-1,-1), 4), ("RIGHTPADDING",(0,0),(-1,-1), 4),
        ("TOPPADDING",   (0,0), (-1,-1), 4), ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        *row_bgs,
    ]))
    story.append(at)
    story.append(Spacer(1, 5*mm))

    # 3. Atividades rejeitadas
    rejected = result.get("rejectedActivities", [])
    if rejected:
        story.append(_section_header("3. ATIVIDADES REJEITADAS (fora da janela de certificação)", s["sec"], dw))
        story.append(Spacer(1, 2*mm))
        rej_rows = [[
            Paragraph("Tipo", ParagraphStyle("rh", fontSize=8, fontName=_FONT_BOLD, textColor=colors.white)),
            Paragraph("Ano",  ParagraphStyle("rhc",fontSize=8, fontName=_FONT_BOLD, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("Motivo", ParagraphStyle("rh",fontSize=8, fontName=_FONT_BOLD, textColor=colors.white)),
        ]]
        for item in rejected:
            rej_rows.append([
                Paragraph(item["type"], s["small"]),
                Paragraph(str(item["certificateYear"]), ParagraphStyle("sc",fontSize=7.5,alignment=TA_CENTER,textColor=colors.HexColor("#cc3333"))),
                Paragraph(item["reason"], s["small"]),
            ])
        rt = Table(rej_rows, colWidths=[dw*0.25, dw*0.10, dw*0.65])
        rt.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), colors.HexColor("#8b0000")),
            ("BACKGROUND",(0,1),(-1,-1),colors.HexColor("#fff5f5")),
            ("GRID",      (0,0),(-1,-1),0.4, colors.HexColor("#ddaaaa")),
            ("LEFTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),4),
            ("BOTTOMPADDING",(0,0),(-1,-1),4),("VALIGN",(0,0),(-1,-1),"TOP"),
        ]))
        story.append(rt)
        story.append(Spacer(1, 5*mm))

    # 4. Resumo
    story.append(_section_header("4. RESUMO — ATIVIDADES AUTÔNOMAS", s["sec"], dw))
    story.append(Spacer(1, 3*mm))
    sum_rows = [
        [Paragraph("Total de Créditos Computados:", ParagraphStyle("sl",fontSize=11,fontName=_FONT_BOLD,alignment=TA_CENTER)),
         Paragraph("Total em Horas Equivalentes:", ParagraphStyle("sl",fontSize=11,fontName=_FONT_BOLD,alignment=TA_CENTER))],
        [Paragraph(f"{fmt_credits(result.get('autonomousCredits',0))} créditos",
                   ParagraphStyle("sv",fontSize=16,fontName=_FONT_BOLD,textColor=MID_BLUE,alignment=TA_CENTER,leading=20)),
         Paragraph(f"{result.get('autonomousHours',0):.0f} horas",
                   ParagraphStyle("sv",fontSize=16,fontName=_FONT_BOLD,textColor=MID_BLUE,alignment=TA_CENTER,leading=20))],
    ]
    stbl = Table(sum_rows, colWidths=[dw*0.5, dw*0.5])
    stbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#dce8f0")),
        ("BACKGROUND",(0,1),(-1,1),colors.HexColor("#eaf2fb")),
        ("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#aaaaaa")),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    story.append(stbl)
    story.append(Spacer(1, 5*mm))

    # 5. Quadro de referencia
    story.append(_section_header("I. QUADRO DE PONTUAÇÕES — REFERÊNCIA (Quadro I)", s["sec"], dw))
    story.append(Spacer(1, 2*mm))
    story.append(_quadro_table(dw, data.get("categories")))
    story.append(Spacer(1, 5*mm))

    # 5. Como peticionar no SEI
    story.append(_section_header("5. COMO PETICIONAR NO SEI", s["sec"], dw))
    story.append(Spacer(1, 3*mm))
    sei_style = ParagraphStyle("sei", fontSize=8.5, leading=13, textColor=colors.HexColor("#1a1a2e"))
    for step in [
        "<b>1.</b> Acesse <b>https://ufr.edu.br/sei/</b> e entre como <b>Usuário Externo</b> (estudantes da UFR).",
        "<b>2.</b> Abra o processo: <b>PROEG: ATIVIDADES COMPLEMENTARES — DISCENTE DE GRADUAÇÃO</b>, preencha todos os campos e o <b>UFR: FORMULÁRIO PADRÃO ESTUDANTE</b>.",
        "<b>3.</b> Anexe este PDF gerado pelo sistema (já inclui os certificados das atividades autônomas).",
        "<b>4.</b> Anexe tambem o <b>histórico escolar</b> gerado pelo SUAP: <i>SUAP &gt; Documentos &gt; Histórico Parcial</i>.",
        "<b>5.</b> Conclua o peticionamento. O processo será encaminhado a <b>FACAP CEG — Administração</b> (Coordenação de Ensino de Graduação em Administração).",
    ]:
        story.append(Paragraph(step, sei_style))
        story.append(Spacer(1, 2*mm))

    story.append(Spacer(1, 3*mm))

    # 6. Observacoes
    story.append(_section_header("6. OBSERVAÇÕES", s["sec"], dw))
    story.append(Spacer(1, 3*mm))
    obs_text = (
        "<b>1</b> - Conversão base: <b>1 crédito = 16 horas</b>.<br/>"
        "<b>2</b> - São admitidos apenas certificados emitidos <b>até 24 meses antes</b> do ano de matrícula (RGA).<br/>"
        "<b>3</b> - Créditos excedentes ao limite máximo de cada categoria são descartados matematicamente.<br/>"
        "<b>4</b> - <b>PROCESSO SEI:</b> Este comprovante refere-se EXCLUSIVAMENTE às Atividades Autônomas. "
        "Deve ser anexado em um <b>processo SEI dedicado para Atividades Autônomas</b>. "
        "Caso possua Atividades Guiadas, utilize o PDF correspondente e abra um <b>processo SEI separado</b>.<br/>"
        "<b>5</b> - Documento gerado automaticamente pelo sistema. A validação final é de responsabilidade da Coordenação do Curso.<br/>"
    )
    story.append(Paragraph(obs_text, s["obs"]))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#aaaaaa")))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f"Emitido em: {data.get('generatedAt','---')} | Sistema de Gestão de Atividades Complementares — UFR | PROCESSO SEI: ATIVIDADES AUTÔNOMAS",
        s["foot"]
    ))

    doc.build(story)
    print(f"[PDF Autonomas] gerado: {output_path}")


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 2 — ATIVIDADES GUIADAS
# ═══════════════════════════════════════════════════════════════════════════════
def generate_guided_pdf(data: dict, output_path: str):
    doc = SimpleDocTemplate(output_path, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
        encrypt=None)
    result = data["result"]
    s = _base_styles()
    dw = doc.width
    story = []

    # Cabecalho
    story.append(Paragraph("UNIVERSIDADE FEDERAL DE RONDONÓPOLIS — UFR", s["header"]))
    story.append(Paragraph("Pró-Reitoria de Graduação — PROGRAD", s["header"]))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=GUIDED_HDR))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("COMPROVANTE DE ATIVIDADES COMPLEMENTARES GUIADAS", s["title"]))
    story.append(Paragraph("Atividades Indicadas pelo Coordenador | Processo SEI — Atividades Guiadas", s["sub"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#aaaaaa")))
    story.append(Spacer(1, 5*mm))

    # Aviso SEI
    warn_box_data = [[Paragraph(
        "ATENÇÃO — PROCESSO SEI: Este documento refere-se EXCLUSIVAMENTE às Atividades "
        "Complementares GUIADAS (indicadas pelo Coordenador) e deve ser anexado em um processo "
        "SEI próprio para esse tipo. Atividades Autônomas possuem processo SEI separado e PDF próprio.",
        s["warn"]
    )]]
    warn_tbl = Table(warn_box_data, colWidths=[dw])
    warn_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), colors.HexColor("#e8f5e9")),
        ("BOX",          (0,0),(-1,-1), 1.2, colors.HexColor("#1a6b3a")),
        ("LEFTPADDING",  (0,0),(-1,-1), 8),
        ("RIGHTPADDING", (0,0),(-1,-1), 8),
        ("TOPPADDING",   (0,0),(-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
    ]))
    story.append(warn_tbl)
    story.append(Spacer(1, 5*mm))

    # 1. Dados do estudante
    story.append(_section_header("1. DADOS DO ESTUDANTE", s["sec"], dw))
    story.append(Spacer(1, 2*mm))
    story.append(_student_block(data, dw, s))
    story.append(Spacer(1, 5*mm))

    # 2. Detalhamento das guiadas
    story.append(_section_header("2. ATIVIDADES GUIADAS — INDICADAS PELO COORDENADOR", s["sec"], dw))
    story.append(Spacer(1, 2*mm))

    g_obs = (
        "Atividades indicadas pelo Coordenador do Curso no início de cada semestre. "
        "A carga horária é computada integralmente, sem limite máximo de créditos por atividade. "
        "Os comprovantes devem ser anexados ao mesmo processo SEI deste documento."
    )
    story.append(Paragraph(g_obs, s["obs"]))
    story.append(Spacer(1, 2*mm))

    guided_bd = result.get("guidedBreakdown", [])
    g_hdr_s  = ParagraphStyle("gh",  fontSize=8, fontName=_FONT_BOLD, textColor=colors.white, leading=10)
    g_hdr_sc = ParagraphStyle("ghc", fontSize=8, fontName=_FONT_BOLD, textColor=colors.white, alignment=TA_CENTER, leading=10)

    guided_rows = [[
        Paragraph("Atividade / Descricao", g_hdr_s),
        Paragraph("Semestre", g_hdr_sc),
        Paragraph("Horas",    g_hdr_sc),
        Paragraph("Créditos", g_hdr_sc),
        Paragraph("Arquivo Comprovante", g_hdr_sc),
    ]]
    for i, g in enumerate(guided_bd):
        row_bg = colors.HexColor("#f0f9f4") if i%2==0 else colors.white
        guided_rows.append([
            Paragraph(g["name"], ParagraphStyle("gc",  fontSize=8, leading=10)),
            Paragraph(g.get("semester",""), ParagraphStyle("gcc", fontSize=8, alignment=TA_CENTER)),
            Paragraph(f"{g['hours']:.0f} h", ParagraphStyle("gcc", fontSize=8, alignment=TA_CENTER)),
            Paragraph(fmt_credits(g["credits"]), ParagraphStyle("gcc", fontSize=8, alignment=TA_CENTER, fontName=_FONT_BOLD)),
            Paragraph(g.get("attachmentFileName","—"), ParagraphStyle("gcc", fontSize=7.5, alignment=TA_CENTER, textColor=colors.HexColor("#1a5276"))),
        ])

    ng = len(guided_rows)
    guided_rows.append([
        Paragraph("TOTAL — ATIVIDADES GUIADAS", ParagraphStyle("gt", fontSize=9, fontName=_FONT_BOLD)),
        Paragraph("", s["small"]),
        Paragraph(f"{result.get('guidedHours',0):.0f} h", ParagraphStyle("gt_c", fontSize=9, fontName=_FONT_BOLD, alignment=TA_CENTER)),
        Paragraph(fmt_credits(result.get("guidedCredits",0)), ParagraphStyle("gt_c", fontSize=9, fontName=_FONT_BOLD, alignment=TA_CENTER)),
        Paragraph("", s["small"]),
    ])

    gcw = [dw*0.35, dw*0.12, dw*0.11, dw*0.12, dw*0.30]
    g_row_bgs = [("BACKGROUND",(0,i+1),(-1,i+1), colors.HexColor("#f0f9f4") if i%2==0 else colors.white) for i in range(len(guided_bd))]
    gt = Table(guided_rows, colWidths=gcw)
    gt.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),  (-1,0),  GUIDED_HDR),
        ("BACKGROUND",   (0,ng), (-1,ng), colors.HexColor("#d4edda")),
        ("FONTNAME",     (0,ng), (-1,ng), _FONT_BOLD),
        ("GRID",         (0,0),  (-1,-1), 0.4, colors.HexColor("#aaccaa")),
        ("LEFTPADDING",  (0,0),  (-1,-1), 5), ("RIGHTPADDING",(0,0),(-1,-1), 5),
        ("TOPPADDING",   (0,0),  (-1,-1), 4), ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("VALIGN",       (0,0),  (-1,-1), "MIDDLE"),
        *g_row_bgs,
    ]))
    story.append(gt)
    story.append(Spacer(1, 5*mm))

    # 3. Resumo
    story.append(_section_header("3. RESUMO — ATIVIDADES GUIADAS", s["sec"], dw))
    story.append(Spacer(1, 3*mm))
    sum_rows = [
        [Paragraph("Total de Créditos Computados:", ParagraphStyle("sl",fontSize=11,fontName=_FONT_BOLD,alignment=TA_CENTER)),
         Paragraph("Total em Horas Equivalentes:", ParagraphStyle("sl",fontSize=11,fontName=_FONT_BOLD,alignment=TA_CENTER))],
        [Paragraph(f"{fmt_credits(result.get('guidedCredits',0))} créditos",
                   ParagraphStyle("sv",fontSize=16,fontName=_FONT_BOLD,textColor=GUIDED_HDR,alignment=TA_CENTER,leading=20)),
         Paragraph(f"{result.get('guidedHours',0):.0f} horas",
                   ParagraphStyle("sv",fontSize=16,fontName=_FONT_BOLD,textColor=GUIDED_HDR,alignment=TA_CENTER,leading=20))],
    ]
    stbl = Table(sum_rows, colWidths=[dw*0.5, dw*0.5])
    stbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#d4edda")),
        ("BACKGROUND",(0,1),(-1,1),colors.HexColor("#eaf6ee")),
        ("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#aaccaa")),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    story.append(stbl)
    story.append(Spacer(1, 5*mm))

    # 4. Observacoes
    # SEI instructions section
    story.append(_section_header("4. COMO PETICIONAR NO SEI", s["sec"], dw))
    story.append(Spacer(1, 3*mm))

    sei_style2 = ParagraphStyle("sei2", fontSize=8.5, leading=13, textColor=colors.HexColor("#1a1a2e"))
    sei_steps2 = [
        "<b>1.</b> Acesse <b>https://ufr.edu.br/sei/</b> e entre como <b>Usuário Externo</b> (estudantes da UFR).",
        "<b>2.</b> Abra o processo: <b>PROEG: ATIVIDADES COMPLEMENTARES — DISCENTE DE GRADUAÇÃO</b>, preencha todos os campos e o <b>UFR: FORMULÁRIO PADRÃO ESTUDANTE</b>.",
        "<b>3.</b> Anexe este PDF gerado pelo sistema (já inclui os certificados das atividades guiadas).",
        "<b>4.</b> Anexe tambem o <b>histórico escolar</b> gerado pelo SUAP: <i>SUAP &gt; Documentos &gt; Histórico Parcial</i>.",
        "<b>5.</b> Conclua o peticionamento. O processo será encaminhado a <b>FACAP CEG — Administração</b> (Coordenação de Ensino de Graduação em Administração).",
    ]
    for step in sei_steps2:
        story.append(Paragraph(step, sei_style2))
        story.append(Spacer(1, 2*mm))

    story.append(Spacer(1, 3*mm))
    story.append(_section_header("5. OBSERVAÇÕES", s["sec"], dw))
    story.append(Spacer(1, 3*mm))
    obs_text = (
        "<b>1</b> - Conversão base: <b>1 crédito = 16 horas</b>.<br/>"
        "<b>2</b> - Atividades Guiadas são indicadas pelo Coordenador do Curso no início de cada semestre.<br/>"
        "<b>3</b> - A carga horária das Atividades Guiadas é computada <b>integralmente</b>, sem limite máximo de créditos.<br/>"
        "<b>4</b> - Os comprovantes físicos/digitais de cada atividade devem ser <b>anexados a este mesmo processo SEI</b>.<br/>"
        "<b>5</b> - <b>PROCESSO SEI:</b> Este comprovante refere-se EXCLUSIVAMENTE às Atividades Guiadas. "
        "Deve ser anexado em um <b>processo SEI dedicado para Atividades Guiadas</b>. "
        "Caso possua Atividades Autônomas, utilize o PDF correspondente e abra um <b>processo SEI separado e distinto</b>.<br/>"
        "<b>6</b> - Documento gerado automaticamente pelo sistema. A validação final é de responsabilidade da Coordenação do Curso.<br/>"
    )
    story.append(Paragraph(obs_text, s["obs"]))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#aaaaaa")))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f"Emitido em: {data.get('generatedAt','---')} | Sistema de Gestão de Atividades Complementares — UFR | PROCESSO SEI: ATIVIDADES GUIADAS",
        s["foot"]
    ))

    doc.build(story)
    print(f"[PDF Guiadas]   gerado: {output_path}")


# ═══════════════════════════════════════════════════════════════════════════════
# Funcao orquestradora — decide quais PDFs gerar
# ═══════════════════════════════════════════════════════════════════════════════
def generate_pdfs(data: dict, output_dir: str = "/mnt/user-data/outputs"):
    """
    Gera um ou dois PDFs dependendo do que o estudante submeteu:
      - Apenas autônomas  -> 1 PDF
      - Apenas guiadas    -> 1 PDF
      - Ambas             -> 2 PDFs separados (processos SEI distintos)
    Retorna lista com os caminhos gerados.
    """
    import os
    result = data.get("result", {})
    has_autonomous = bool(result.get("breakdown"))
    has_guided     = bool(result.get("guidedBreakdown"))

    generated = []

    if has_autonomous:
        path = os.path.join(output_dir, "comprovante_atividades_autonomas.pdf")
        generate_autonomous_pdf(data, path)
        generated.append(path)

    if has_guided:
        path = os.path.join(output_dir, "comprovante_atividades_guiadas.pdf")
        generate_guided_pdf(data, path)
        generated.append(path)

    if not generated:
        print("Nenhuma atividade encontrada para gerar PDF.")

    return generated


# ─── Entrypoint ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = SAMPLE_DATA

    output_dir = sys.argv[2] if len(sys.argv) > 2 else "/mnt/user-data/outputs"
    # Optional 3rd arg: "autonomous" | "guided" | omit for both
    pdf_type = sys.argv[3] if len(sys.argv) > 3 else None

    if pdf_type == "autonomous":
        path = os.path.join(output_dir, "comprovante_atividades_autonomas.pdf")
        generate_autonomous_pdf(data, path)
    elif pdf_type == "guided":
        path = os.path.join(output_dir, "comprovante_atividades_guiadas.pdf")
        generate_guided_pdf(data, path)
    else:
        generate_pdfs(data, output_dir)
