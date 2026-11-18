// Diagnóstico: mostra o que as wikis devolvem (sem filtros) para alguns
// lançamentos, para entender como os arquivos de photocards são nomeados.
// Uso: node scripts/wiki-probe.mjs [ids...]   (padrão: maxident ate karma)
// Gera também wiki-probe.json com tudo que foi encontrado.
import { writeFileSync, readFileSync } from 'node:fs';
import { WIKI_SOURCES } from '../src/lib/wiki.js';

const db = JSON.parse(readFileSync(new URL('../public/data/photocards.json', import.meta.url), 'utf-8'));
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const releases = db.releases.filter((r) => (ids.length ? ids : ['maxident', 'ate', 'karma']).includes(r.id));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(base, params) {
  await sleep(300);
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const res = await fetch(`${base}?${qs}`, { headers: { 'User-Agent': 'skz-pocadex-probe/1.0' } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

const report = {};
for (const source of WIKI_SOURCES) {
  console.log(`\n=========== ${source.name} (${source.api})`);
  const site = await api(source.api, { action: 'query', meta: 'siteinfo' });
  console.log('site:', site.error ?? site.query?.general?.sitename);
  report[source.id] = {};

  // Busca geral por photocards de Stray Kids
  const general = await api(source.api, {
    action: 'query', list: 'search', srnamespace: '6', srlimit: '40', srsearch: 'Stray Kids photocard',
  });
  const gTitles = (general.query?.search ?? []).map((x) => x.title);
  console.log(`\n[busca "Stray Kids photocard"] ${gTitles.length} arquivos`);
  gTitles.slice(0, 40).forEach((t) => console.log('  ', t));
  report[source.id]._general = gTitles;

  for (const r of releases) {
    const name = r.title;
    const out = {};
    console.log(`\n--- ${name}`);
    for (const q of [`${name} photocard`, `${name} PC`, name]) {
      const d = await api(source.api, { action: 'query', list: 'search', srnamespace: '6', srlimit: '50', srsearch: q });
      const t = (d.query?.search ?? []).map((x) => x.title);
      out[`search:${q}`] = t;
      console.log(`[busca "${q}"] ${t.length}:`, t.slice(0, 25).join(' | '));
    }
    for (const page of [name, `${name}/Gallery`, `${name} (album)`, `${name}/Photocards`]) {
      const d = await api(source.api, { action: 'query', prop: 'images', titles: page, imlimit: '200' });
      const p = d.query?.pages?.[0];
      const t = (p?.images ?? []).map((x) => x.title);
      out[`page:${page}`] = p?.missing ? 'MISSING' : t;
      console.log(`[página "${page}"] ${p?.missing ? 'não existe' : `${t.length} imagens`}`, p?.missing ? '' : t.slice(0, 30).join(' | '));
    }
    // Subpáginas e páginas que mencionam o álbum
    const pref = await api(source.api, { action: 'query', list: 'allpages', apprefix: `${name}`, aplimit: '30' });
    const pages = (pref.query?.allpages ?? []).map((x) => x.title);
    out.pagesWithPrefix = pages;
    console.log(`[páginas com prefixo "${name}"]`, pages.join(' | '));
    report[source.id][r.id] = out;
  }
}
writeFileSync('wiki-probe.json', JSON.stringify(report, null, 2));
console.log('\n✔ wiki-probe.json gerado');
