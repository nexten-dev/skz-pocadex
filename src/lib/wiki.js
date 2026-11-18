// Coleta de imagens nas wikis (MediaWiki/Fandom) para a base de dados.
// Roda no GitHub Actions (scripts/fetch-images.mjs), que tem acesso às wikis.
//
// O que a Stray Kids Wiki oferece (diagnóstico de nov/2026):
//  - NÃO há fotos individuais dos photocards;
//  - cada álbum tem a página "<Álbum>/Gallery" com:
//      * "Album Preview <versão>": imagem oficial do conteúdo de cada versão;
//      * teasers / fotos de capa de cada membro na era do álbum.

/** @type {{ id: string, name: string, api: string, wiki: string }[]} */
export const WIKI_SOURCES = [
  { id: 'skz', name: 'Stray Kids Wiki', api: 'https://stray-kids.fandom.com/api.php', wiki: 'https://stray-kids.fandom.com/wiki/' },
  { id: 'kpop', name: 'Kpop Wiki', api: 'https://kpop.fandom.com/api.php', wiki: 'https://kpop.fandom.com/wiki/' },
];

/** Apelidos usados para identificar o membro no nome do arquivo. */
export const MEMBER_ALIASES = {
  bangchan: ['bang chan', 'bangchan', 'christopher', 'chris', 'chan'],
  leeknow: ['lee know', 'leeknow', 'lee minho', 'minho'],
  changbin: ['seo changbin', 'changbin'],
  hyunjin: ['hwang hyunjin', 'hyunjin'],
  han: ['han jisung', 'jisung', 'han'],
  felix: ['lee felix', 'felix', 'yongbok'],
  seungmin: ['kim seungmin', 'seungmin'],
  in: ['yang jeongin', 'jeongin', 'i.n'],
  woojin: ['kim woojin', 'woojin'],
};

export function norm(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^file:/, '')
    .replace(/\.(png|jpe?g|gif|webp)$/, '')
    .replace(/[_\-()[\],'"“”&+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasWord(text, word) {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(text);
}

/** Qual membro aparece no nome do arquivo (null se nenhum ou mais de um). */
export function detectMember(title, memberIds) {
  const t = norm(title);
  const found = memberIds.filter((id) => (MEMBER_ALIASES[id] ?? [id]).some((a) => hasWord(t, a)));
  return found.length === 1 ? found[0] : null;
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const PERFORMANCE = /inkigayo|countdown|music core|music bank|show champion|the show|fancam|stage|airport|concert|tour|live|award|festival|radio|weverse|vlive|instagram|twitter|selca|mv shorts/i;

/** Pontuação de uma foto de divulgação (maior = melhor para representar o membro). */
function conceptScore(title, releaseNames = []) {
  // O nome do álbum não conta (ex.: "GO LIVE" não é foto de show "live").
  let t = title.toLowerCase();
  for (const n of releaseNames) t = t.split(n.toLowerCase()).join(' ');
  let s = 0;
  if (/teaser/.test(t)) s += 4;
  if (/jacket|concept|profile|promotional/.test(t)) s += 3;
  if (/clean/.test(t)) s += 1;
  if (/behind|making/.test(t)) s -= 1;
  if (PERFORMANCE.test(t)) s -= 10;
  return s;
}

async function api(source, params, fetchImpl) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetchImpl(`${source.api}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Todas as imagens usadas numa página (com paginação); null se a página não existe. */
async function pageImages(source, title, fetchImpl) {
  const out = [];
  let cont = {};
  for (let i = 0; i < 20; i++) {
    const d = await api(source, { action: 'query', prop: 'images', titles: title, imlimit: '500', ...cont }, fetchImpl);
    const p = d.query?.pages?.[0];
    if (!p || p.missing || p.invalid) return null;
    out.push(...(p.images ?? []).map((x) => x.title));
    if (!d.continue) break;
    cont = d.continue;
  }
  return out;
}

async function imageInfo(source, titles, fetchImpl) {
  const info = new Map();
  for (let i = 0; i < titles.length; i += 25) {
    const batch = titles.slice(i, i + 25);
    const d = await api(
      source,
      { action: 'query', prop: 'imageinfo', titles: batch.join('|'), iiprop: 'url', iiurlwidth: '480' },
      fetchImpl,
    );
    for (const p of d.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (ii) info.set(p.title, { url: ii.url, thumb: ii.thumburl || ii.url, page: ii.descriptionurl, title: p.title, source: source.name });
    }
  }
  return info;
}

/** Nomes de página prováveis para o lançamento na wiki. */
function pageNames(release) {
  return [...new Set([release.wikiPage, release.altTitle, release.title].filter(Boolean))];
}

/** Busca páginas da wiki pelo título (para nomes diferentes do app, ex.: singles japoneses). */
async function searchPages(source, release, fetchImpl) {
  const found = [];
  for (const q of pageNames(release)) {
    const d = await api(source, { action: 'query', list: 'search', srnamespace: '0', srlimit: '5', srsearch: q }, fetchImpl).catch(
      () => null,
    );
    for (const r of d?.query?.search ?? []) if (!r.title.includes('/')) found.push(r.title);
  }
  // Só aceita páginas que contêm uma palavra marcante do título (evita "I Am NOT" → "I Am WHO").
  const STOP = new Set(['the', 'and', 'ver', 'version', 'japanese', 'stray', 'kids', 'album', 'mini', 'special', 'skz']);
  const tokens = pageNames(release)
    .flatMap((n) => norm(n).split(/[\s/.:!?-]+/))
    .filter((t) => t.length >= 3 && !STOP.has(t));
  return [...new Set(found)].filter((title) => tokens.some((t) => hasWord(norm(title), t)));
}

/** Rótulo da versão a partir do nome do arquivo de prévia. */
export function previewLabel(title) {
  return title
    .replace(/^File:/, '')
    .replace(/\.\w+$/, '')
    .replace(/^.*album preview\s*/i, '')
    .trim();
}

/**
 * Associa cada prévia de versão aos grupos (set|versão) do app.
 * Retorna as chaves "setId|versaoSlug" que a prévia representa.
 */
export function previewKeys(previewTitle, sets, slug) {
  const label = norm(previewLabel(previewTitle));
  const keys = [];
  for (const set of sets) {
    const versions = set.versions?.length ? set.versions : [null];
    for (const v of versions) {
      const base = (v ?? set.name)
        .split('—')[0]
        .replace(/(^|\s)(ver|version|vers[aã]o|edi[cç][aã]o)\.?(?=\s|$)/gi, ' ')
        .trim();
      const tok = norm(base);
      if (tok && hasWord(label, tok)) keys.push(`${set.id}|${v ? slug(v) : '_'}`);
    }
  }
  return keys;
}

/**
 * Coleta as imagens de um lançamento: prévias das versões e uma foto de
 * divulgação por membro. Tenta as wikis em ordem e usa a primeira que tiver galeria.
 */
export async function collectReleaseMedia(release, memberIds, fetchImpl = fetch, sources = WIKI_SOURCES) {
  for (const source of sources) {
    let titles = [];
    let galleryPage = null;
    const tried = new Set();
    const names = [...pageNames(release)];
    const candidatesFor = async function* () {
      for (const n of names) yield n;
      for (const n of await searchPages(source, release, fetchImpl)) yield n;
    };
    for await (const name of candidatesFor()) {
      if (tried.has(name)) continue;
      tried.add(name);
      let imgs;
      try {
        imgs = await pageImages(source, `${name}/Gallery`, fetchImpl);
      } catch {
        imgs = null;
      }
      if (imgs?.length) {
        galleryPage = `${name}/Gallery`;
        const main = await pageImages(source, name, fetchImpl).catch(() => null);
        titles = [...new Set([...imgs, ...(main ?? [])])];
        break;
      }
    }
    if (!galleryPage) continue;

    const images = titles.filter((t) => IMAGE_EXT.test(t));
    const previews = images.filter((t) => /album preview/i.test(t)).sort();
    const memberPick = {};
    for (const id of memberIds) {
      const best = images
        .filter((t) => detectMember(t, memberIds) === id)
        .map((t) => ({ t, s: conceptScore(t, pageNames(release)) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s || a.t.localeCompare(b.t, undefined, { numeric: true }))[0];
      if (best) memberPick[id] = best.t;
    }
    const cover = images.find((t) => /digital cover/i.test(t));
    const info = await imageInfo(source, [...previews, ...Object.values(memberPick), ...(cover ? [cover] : [])], fetchImpl);

    return {
      source: source.name,
      gallery: source.wiki + encodeURIComponent(galleryPage.replace(/ /g, '_')).replace(/%2F/g, '/'),
      totalImages: images.length,
      cover: cover ? info.get(cover) ?? null : null,
      previews: previews.map((t) => info.get(t)).filter(Boolean).map((img) => ({ label: previewLabel(img.title), ...img })),
      members: Object.fromEntries(Object.entries(memberPick).map(([id, t]) => [id, info.get(t)]).filter(([, v]) => v)),
    };
  }
  return null;
}
