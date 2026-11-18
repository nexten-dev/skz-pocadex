// Diagnóstico: mostra o que as wikis têm para alguns lançamentos, para
// entender como os arquivos de photocards são nomeados.
// Uso: node scripts/wiki-probe.mjs [ids...]   (padrão: maxident ate karma)
import { readFileSync, writeFileSync } from 'node:fs';
import { WIKI_SOURCES } from '../src/lib/wiki.js';

const db = JSON.parse(readFileSync(new URL('../public/data/photocards.json', import.meta.url), 'utf-8'));
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const releases = db.releases.filter((r) => (ids.length ? ids : ['maxident', 'ate', 'karma']).includes(r.id));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(base, params) {
  await sleep(250);
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const res = await fetch(`${base}?${qs}`, { headers: { 'User-Agent': 'skz-pocadex-probe/1.0' } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

/** Todas as imagens usadas numa página (com paginação). */
async function pageImages(base, title) {
  const out = [];
  let cont = {};
  for (let i = 0; i < 20; i++) {
    const d = await api(base, { action: 'query', prop: 'images', titles: title, imlimit: '500', ...cont });
    const p = d.query?.pages?.[0];
    if (!p || p.missing) return null;
    out.push(...(p.images ?? []).map((x) => x.title));
    if (!d.continue) break;
    cont = d.continue;
  }
  return out;
}

const KEY = /photo ?cards?|\bpcs?\b|poca|selfie|\bcard\b|postcard|polaroid|pob|benefit|lucky|preview|inclusion|unboxing|id photo|sticker|poster/i;
const report = {};

for (const source of WIKI_SOURCES) {
  console.log(`\n=========== ${source.name}`);
  report[source.id] = {};
  for (const r of releases) {
    const names = [...new Set([r.title, r.altTitle].filter(Boolean))];
    console.log(`\n--- ${r.title}`);
    const all = new Set();
    for (const name of names) {
      for (const page of [name, `${name}/Gallery`, `${name} (album)`, `${name} (Stray Kids)`, `${name}/Gallery (Stray Kids)`]) {
        const imgs = await pageImages(source.api, page);
        if (imgs) {
          console.log(`  página "${page}": ${imgs.length} imagens`);
          imgs.forEach((t) => all.add(t));
        }
      }
    }
    const hits = [...all].filter((t) => KEY.test(t)).sort();
    console.log(`  total ${all.size} imagens; ${hits.length} com palavras de itens/cards:`);
    hits.slice(0, 80).forEach((t) => console.log('    ', t));
    // Padrões de nome mais comuns (2 primeiras palavras após o nome do álbum)
    const pat = {};
    for (const t of all) {
      const k = t.replace(/^File:/, '').replace(/\(\d+\)|\d+/g, '#').split(/\s+/).slice(0, 3).join(' ');
      pat[k] = (pat[k] ?? 0) + 1;
    }
    const concept = [...all].filter((t) => /teaser|jacket|profile|concept|promotional/i.test(t)).sort();
    console.log(`  ${concept.length} teasers/fotos de divulgação (até 40):`);
    concept.slice(0, 40).forEach((t) => console.log('    ', t));
    const top = Object.entries(pat).sort((a, b) => b[1] - a[1]).slice(0, 25);
    console.log('  padrões mais comuns:', top.map(([k, n]) => `${k} (${n})`).join(' | '));
    report[source.id][r.id] = { total: all.size, hits };
  }
}
writeFileSync('wiki-probe.json', JSON.stringify(report, null, 2));
console.log('\n✔ fim do diagnóstico');
