import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/**
 * Gera os ícones do PWA a partir de um SVG.
 *
 *   npm run icons --workspace @circula/web
 *
 * Por que existem DUAS artes:
 *
 *  - **any**: o ícone completo, exibido como está (aba do navegador, desktop).
 *  - **maskable**: o Android recorta o ícone na forma do sistema — círculo,
 *    squircle, gota. Se a arte ocupar a borda, o recorte come parte dela. O
 *    padrão exige manter o conteúdo dentro de uma "zona segura" central de 80%
 *    do diâmetro, com o resto sendo fundo sacrificável.
 *
 * Usar a mesma imagem para os dois é o erro clássico: no Android o ícone
 * aparece com as pontas da folha cortadas.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');

const BRAND = '#1c37c4';

/**
 * Folha do `lucide-react`, o mesmo ícone usado no cabeçalho da aplicação.
 *
 * Reaproveitar o traçado mantém a identidade coerente entre o logo da interface
 * e o ícone instalado na tela inicial. É desenhado com **traço** (`stroke`), não
 * preenchimento — uma silhueta cheia vira uma mancha ilegível em 192px.
 */
const leafPaths = [
  'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
  'M2 21c0-3 1.85-5.36 3-6 1.14-.64 2.66-1.03 4-1',
];

/**
 * @param {number} contentScale fração do canvas ocupada pela arte (1 = tudo).
 */
function buildSvg(contentScale) {
  const size = 512;
  const content = size * contentScale;
  const offset = (size - content) / 2;
  // O ícone do lucide vive num viewBox de 24×24.
  const scale = content / 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})"
     fill="none" stroke="#ffffff" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round">
${leafPaths.map((d) => `    <path d="${d}"/>`).join('\n')}
  </g>
</svg>`;
}

/** Ícone comum: a arte ocupa 62% do canvas, com respiro nas bordas. */
const anySvg = buildSvg(0.62);

/**
 * Ícone maskable: arte menor (44%), garantindo que ela caiba na zona segura
 * central mesmo depois do recorte mais agressivo do sistema.
 */
const maskableSvg = buildSvg(0.44);

const targets = [
  { file: 'icon-192.png', size: 192, svg: anySvg },
  { file: 'icon-512.png', size: 512, svg: anySvg },
  { file: 'icon-maskable-192.png', size: 192, svg: maskableSvg },
  { file: 'icon-maskable-512.png', size: 512, svg: maskableSvg },
  { file: 'apple-touch-icon.png', size: 180, svg: anySvg },
];

mkdirSync(outDir, { recursive: true });

for (const { file, size, svg } of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(resolve(outDir, file));
  console.log(`✓ ${file} (${size}×${size})`);
}

// Favicon em SVG: escala em qualquer tamanho e pesa menos que um .ico.
writeFileSync(resolve(outDir, '../favicon.svg'), anySvg, 'utf8');
console.log('✓ favicon.svg');
