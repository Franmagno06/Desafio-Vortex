import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

/**
 * Gera a apostila técnica em PDF a partir do markdown.
 *
 *   npm run apostila
 *
 * Pipeline: markdown → HTML estilizado → PDF (Edge/Chrome em modo headless).
 *
 * Por que headless em vez de uma biblioteca de PDF: o navegador já sabe paginar,
 * quebrar tabelas, aplicar `page-break` e renderizar tipografia decente. Uma
 * biblioteca daria menos controle sobre o resultado por muito mais código.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const inputPath = resolve(root, 'docs/estudo/apostila.md');
const htmlPath = resolve(root, 'docs/estudo/.apostila.html');
const pdfPath = resolve(root, 'docs/estudo/Circula-Apostila-Tecnica.pdf');

/** Navegadores que sabem `--headless --print-to-pdf`, em ordem de preferência. */
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const css = `
  @page { size: A4; margin: 18mm 16mm; }

  :root {
    --brand: #1c37c4;
    --brand-dark: #1c319e;
    --brand-light: #eef3ff;
    --ink: #0f172a;
    --muted: #475569;
    --line: #e2e8f0;
    --accent: #b45309;
    --accent-bg: #fff7ed;
  }

  * { box-sizing: border-box; }

  body {
    font-family: "Segoe UI", -apple-system, system-ui, sans-serif;
    font-size: 10.5pt;
    line-height: 1.62;
    color: var(--ink);
    margin: 0;
  }

  /* ---- Capa ---- */
  .capa {
    height: 247mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    page-break-after: always;
  }
  .capa .marca {
    font-size: 42pt; font-weight: 800; color: var(--brand);
    letter-spacing: -1.5px; margin-bottom: 4px;
  }
  .capa .sub { font-size: 15pt; color: var(--muted); margin-bottom: 40px; }
  .capa .titulo {
    font-size: 26pt; font-weight: 700; line-height: 1.25;
    border-top: 3px solid var(--brand); border-bottom: 3px solid var(--brand);
    padding: 22px 0; margin: 0 auto 36px; max-width: 80%;
  }
  .capa .meta { font-size: 10.5pt; color: var(--muted); line-height: 2; }
  .capa .meta strong { color: var(--ink); }

  /* ---- Títulos ---- */
  h1 {
    font-size: 19pt; color: var(--brand-dark); margin: 0 0 18px;
    padding-bottom: 8px; border-bottom: 2.5px solid var(--brand);
    page-break-before: always; page-break-after: avoid;
  }
  h1:first-of-type { page-break-before: avoid; }
  h2 {
    font-size: 14pt; color: var(--brand-dark); margin: 26px 0 10px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11.5pt; color: var(--ink); margin: 18px 0 8px;
    page-break-after: avoid;
  }

  p { margin: 0 0 11px; text-align: justify; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 5px; }

  strong { color: var(--brand-dark); }

  /* ---- Código ---- */
  code {
    font-family: "Cascadia Mono", Consolas, monospace;
    font-size: 9pt; background: #f1f5f9; padding: 1.5px 5px;
    border-radius: 3px; color: #0b3a8f;
  }
  pre {
    background: #f8fafc; border: 1px solid var(--line);
    border-left: 3.5px solid var(--brand); border-radius: 5px;
    padding: 11px 13px; overflow-x: auto; margin: 0 0 13px;
    page-break-inside: avoid;
  }
  pre code { background: none; padding: 0; font-size: 8.6pt; color: #1e293b; line-height: 1.5; }

  /* ---- Tabelas ---- */
  table {
    width: 100%; border-collapse: collapse; margin: 0 0 15px;
    font-size: 9.3pt; page-break-inside: avoid;
  }
  th {
    background: var(--brand); color: #fff; text-align: left;
    padding: 7px 9px; font-weight: 600;
  }
  td { padding: 6px 9px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }

  /* ---- Citações ---- */
  blockquote {
    margin: 0 0 14px; padding: 10px 15px;
    background: var(--brand-light); border-left: 3.5px solid var(--brand);
    border-radius: 0 5px 5px 0; page-break-inside: avoid;
  }
  blockquote p { margin: 0; }
  blockquote p + p { margin-top: 8px; }

  hr { border: none; border-top: 1px solid var(--line); margin: 22px 0; }

  /* ---- Blocos de pergunta e resposta ---- */
  .qa {
    border: 1px solid var(--line); border-radius: 6px;
    padding: 12px 15px; margin-bottom: 13px;
    page-break-inside: avoid; background: #fff;
  }
  .qa .pergunta {
    font-weight: 700; color: var(--brand-dark);
    font-size: 10.8pt; margin-bottom: 7px;
  }
  .qa .pergunta::before { content: "P. "; color: var(--brand); }
  .qa .resposta::before {
    content: "R. "; color: var(--accent); font-weight: 700;
  }

  a { color: var(--brand); text-decoration: none; }
`;

/**
 * Converte os blocos `<details>` do markdown original em cartões de Q&A,
 * porque `<details>` fechado não imprime o conteúdo em PDF.
 */
function expandirDetails(markdown) {
  return markdown.replace(
    /<details>\s*<summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g,
    (_match, pergunta, resposta) => {
      const limpa = pergunta.replace(/<\/?b>|<\/?strong>/g, '').trim();
      return `\n<div class="qa">\n<div class="pergunta">${limpa}</div>\n<div class="resposta">\n\n${resposta.trim()}\n\n</div>\n</div>\n`;
    },
  );
}

function main() {
  if (!existsSync(inputPath)) {
    console.error(`Fonte não encontrada: ${inputPath}`);
    process.exit(1);
  }

  const markdown = expandirDetails(readFileSync(inputPath, 'utf8'));

  // `capa` é separada por um marcador para receber layout próprio.
  const [capaRaw, ...resto] = markdown.split('<!-- FIM-CAPA -->');
  const corpo = resto.join('<!-- FIM-CAPA -->');

  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Circula — Apostila Técnica</title><style>${css}</style></head>
<body>
<div class="capa">${marked.parse(capaRaw)}</div>
${marked.parse(corpo)}
</body>
</html>`;

  mkdirSync(dirname(htmlPath), { recursive: true });
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`HTML gerado (${(html.length / 1024).toFixed(0)} KB)`);

  const browser = browsers.find((p) => existsSync(p));
  if (!browser) {
    console.error('Nenhum Chrome ou Edge encontrado para gerar o PDF.');
    console.error(`O HTML ficou em ${htmlPath} — dá para imprimir manualmente.`);
    process.exit(1);
  }

  console.log(`Renderizando com ${browser.split('/').pop()}...`);

  execFileSync(
    browser,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      // `--no-pdf-header-footer` remove a URL e a data que o navegador
      // imprimiria automaticamente nas margens.
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      `file:///${htmlPath.replace(/\\/g, '/')}`,
    ],
    { stdio: 'pipe', timeout: 120_000 },
  );

  console.log(`✓ PDF gerado: ${pdfPath}`);
}

main();
