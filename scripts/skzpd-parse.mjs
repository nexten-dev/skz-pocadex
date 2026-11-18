// Lê as páginas do SKZPD (https://skzpd.com, código em github.com/manyodev/skzpd)
// e extrai, para cada lançamento ("album-card"), os blocos de photocards com
// o rótulo de cada bloco e a imagem de cada membro.
//
// Estrutura das páginas: <div class="album-card"> … seguido de vários
//   <div class="member"> <div class="..."> Nome <img src="…"> </div> … </div>
//   <div class="poca">Rótulo</div>        ← o rótulo vem DEPOIS do bloco
//
// Uso: node scripts/skzpd-parse.mjs <pasta-do-clone-skzpd> [saida.json]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
const text = (html) => decode(html.replace(/<[^>]+>/g, ' '));

/** Fecha o <div> que começa em `start` (conta divs aninhadas). */
function divEnd(html, start) {
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return html.length;
}

export function parsePage(html) {
  const body = html.slice(html.indexOf('</nav') > 0 ? html.indexOf('</nav') : html.indexOf('class="rightNav"'));
  const releases = [];
  let current = null;
  let pending = [];
  const re = /<div class="(album-card|member|poca)"[^>]*>/g;
  let m;
  while ((m = re.exec(body))) {
    const end = divEnd(body, m.index);
    const chunk = body.slice(m.index, end);
    if (m[1] === 'album-card') {
      const tags = [...chunk.matchAll(/<p class="album-tag">([\s\S]*?)<\/p>/g)].map((x) => text(x[1]));
      current = {
        title: text(chunk.match(/<p class="album-title">([\s\S]*?)<\/p>/)?.[1] ?? ''),
        id: chunk.match(/id="([^"]+)"/)?.[1] ?? null,
        cover: chunk.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? null,
        tags,
        blocks: [],
      };
      releases.push(current);
      pending = [];
    } else if (m[1] === 'member') {
      const cards = [];
      for (const c of chunk.matchAll(/<div class="([^"]*)"[^>]*>\s*([^<]*?)\s*<img[^>]*src="([^"]+)"/g)) {
        cards.push({ cls: c[1], name: decode(c[2]), img: decode(c[3]) });
      }
      if (!current) {
        current = { title: '(sem título)', id: null, cover: null, tags: [], blocks: [] };
        releases.push(current);
      }
      const block = { label: null, cards };
      current.blocks.push(block);
      pending.push(block);
    } else if (m[1] === 'poca') {
      const label = text(chunk);
      // O rótulo vale para os blocos imediatamente anteriores ainda sem rótulo
      for (const b of pending) b.label = label;
      pending = [];
    }
    re.lastIndex = end;
  }
  return releases;
}

export function parseSite(dir) {
  const src = join(dir, 'src');
  const pages = {};
  for (const f of readdirSync(src).filter((x) => x.endsWith('.html')).sort()) {
    const html = readFileSync(join(src, f), 'utf-8');
    const releases = parsePage(html);
    if (releases.some((r) => r.blocks.length)) {
      pages[f] = {
        title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? f).replace(/ - Stray Kids Photocard Database$/, ''),
        releases,
      };
    }
  }
  return pages;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, out] = process.argv.slice(2);
  const pages = parseSite(dir);
  if (out) writeFileSync(out, JSON.stringify(pages, null, 1));
  let total = 0;
  for (const [f, p] of Object.entries(pages)) {
    for (const r of p.releases) {
      const n = r.blocks.reduce((s, b) => s + b.cards.length, 0);
      total += n;
      console.log(`${f.padEnd(26)} ${(r.title || '?').slice(0, 34).padEnd(34)} ${r.tags.join(' / ').slice(0, 40).padEnd(40)} blocos=${r.blocks.length} cards=${n}`);
    }
  }
  console.log(`\nTotal: ${Object.keys(pages).length} páginas, ${total} imagens de cards`);
}
