# AC Fácil — Sistema de Atividades Complementares (UFR)

Sistema web para geração de comprovantes PDF de Atividades Complementares do curso de
Administração da UFR, destinados ao processo SEI.

**Nome "AC Fácil"** proposto pelo Dr. André Luís Janzkovski Cardoso e integrantes do grupo de extensão.

## Desenvolvido durante o projeto de extensão por
- Profa. Daniela da Silva Carvalho (orientadora)
- Augusto Castro Lemos
- Izabela Souza Rodrigues
- Sabrina Dias Gonçalves
- Gyselle Gomes da Silva

## Stack
- Next.js 16 (TypeScript, App Router)
- Python 3 + ReportLab (geração de PDF, fonte Helvetica/WinAnsi)
- Deploy: Railway (Docker)

## Rodar localmente
```bash
npm install
npm run dev
```
Requer Python 3 e ReportLab instalados (`pip install reportlab`).

## Funcionalidades
- Formulário em 4 etapas (dados, atividades, revisão, download)
- Validação do Quadro I com limites individuais e combinados
- PDFs separados para atividades autônomas e guiadas (processos SEI distintos)
- Painel admin: quadro de pontuações editável, configurações, alerta, log de gerações
- Controle de horas mínimas (112h) configurável
- Instruções de peticionamento SEI no app e no PDF
- Ano de certificado dinâmico (atualiza automaticamente a cada ano)

## Admin
Acesse `/admin` — senha via env `ADMIN_PASSWORD` (fallback no código).
