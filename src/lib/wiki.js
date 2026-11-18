// Busca de prévias de photocards em wikis MediaWiki (Fandom).
// Arquivo em JS puro para ser usado tanto pelo app (navegador) quanto pelo
// script scripts/fetch-images.mjs (Node).

/** @type {{ id: string, name: string, api: string }[]} */
export const WIKI_SOURCES = [
  { id: 'skz', name: 'Stray Kids Wiki', api: 'https://stray-kids.fandom.com/api.php' },
  { id: 'kpop', name: 'Kpop Wiki', api: 'https://kpop.fandom.com/api.php' },
];

const PC_RE = /photo ?cards?|\bpcs?\b|포토카드|トレカ|selfie ?card|\bpoca\b/;

/** Apelidos usados para identificar o membro no nome do arquivo (mais longos primeiro). */
export const MEMBER_ALIASES = {
  bangchan: ['bang chan', 'bangchan', 'christopher', 'chris', 'chan'],
  leeknow: ['lee know', 'leeknow', 'lee minho', 'minho'],
  changbin: ['seo changbin', 'changbin'],
  hyunjin: ['hwang hyunjin', 'hyunjin'],
  han: ['han jisung', 'jisung', 'han'],
  felix: ['lee felix', 'felix', 'yongbok'],
  seungmin: ['kim seungmin', 'seungmin'],
  in: ['yang jeongin', 'jeongin', 'i.n', 'i n'],
  woojin: ['kim woojin', 'woojin'],
};

export function norm(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^file:/, '')
    .replace(/\.(png|jpe?g|gif|webp)$/, '')
    .replace(/[_\-()[\],]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasWord(text, word) {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(text);
}

/** Descobre qual membro aparece no nome do arquivo (ou null se nenhum/mais de um). */
export function detectMember(title, memberIds) {
  const t = norm(title);
  const found = [];
  for (const id of memberIds) {
    const aliases = MEMBER_ALIASES[id] ?? [id];
    if (aliases.some((a) => hasWord(t, a))) found.push(id);
  }
  // "chan" casa dentro de "bang chan"; "han" isolado não deve casar com "changbin"
  return found.length === 1 ? found[0] : null;
}

export function isPhotocard(title) {
  return PC_RE.test(norm(title));
}

function releaseTokens(release) {
  return [release.title, release.altTitle]
    .filter(Boolean)
    .map((t) => norm(t).replace(/[^a-z0-9぀-ヿ一-鿿가-힯 ]/g, '').trim())
    .filter((t) => t.length >= 2);
}

function mentionsRelease(title, release) {
  const t = norm(title).replace(/[^a-z0-9぀-ヿ一-鿿가-힯 ]/g, '');
  return releaseTokens(release).some((tok) => t.includes(tok) || t.replace(/ /g, '').includes(tok.replace(/ /g, '')));
}

async function api(base, params, fetchImpl) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetchImpl(`${base}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function pagesToCandidates(pages, source) {
  const out = [];
  for (const p of pages ?? []) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    out.push({
      title: p.title,
      thumb: info.thumburl || info.url,
      url: info.url,
      page: info.descriptionurl,
      source: source.name,
    });
  }
  return out;
}

/**
 * Procura arquivos de photocard de um lançamento nas wikis.
 * Retorna candidatos { title, thumb, url, page, source, member }.
 */
export async function findReleaseImages(release, memberIds, fetchImpl = fetch, sources = WIKI_SOURCES) {
  const names = [release.title, release.altTitle].filter(Boolean);
  const seen = new Set();
  const all = [];
  for (const source of sources) {
    const batches = [];
    for (const name of names) {
      // 1) Busca no namespace de arquivos
      for (const kw of ['photocard', 'PC']) {
        batches.push(
          api(
            source.api,
            {
              action: 'query',
              generator: 'search',
              gsrnamespace: '6',
              gsrlimit: '50',
              gsrsearch: `${name} ${kw}`,
              prop: 'imageinfo',
              iiprop: 'url',
              iiurlwidth: '360',
            },
            fetchImpl,
          ).then((d) => pagesToCandidates(d.query?.pages, source)),
        );
      }
      // 2) Imagens da página de galeria do álbum
      for (const page of [`${name}/Gallery`, name]) {
        batches.push(
          api(
            source.api,
            {
              action: 'query',
              generator: 'images',
              titles: page,
              gimlimit: '200',
              prop: 'imageinfo',
              iiprop: 'url',
              iiurlwidth: '360',
            },
            fetchImpl,
          ).then((d) => pagesToCandidates(d.query?.pages, source)),
        );
      }
    }
    const results = await Promise.allSettled(batches);
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const c of r.value) {
        if (seen.has(c.url)) continue;
        seen.add(c.url);
        if (!isPhotocard(c.title)) continue;
        if (!mentionsRelease(c.title, release)) continue;
        const member = detectMember(c.title, memberIds);
        all.push({ ...c, member });
      }
    }
  }
  return all.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

function trailingNumber(title) {
  const m = norm(title).match(/(?:^| )(\d{1,2})$/);
  return m ? Number(m[1]) : null;
}

/**
 * Associa candidatos aos cards.
 * - "exact": membro + versão (quando houver) batem no nome do arquivo
 * - "member": só o membro bate; imagem é uma prévia aproximada
 * Retorna Map<cardId, { ...candidate, confidence }>.
 */
export function matchImages(cards, candidates) {
  const result = new Map();
  const used = new Set();
  const byMember = new Map();
  for (const c of candidates) {
    if (!c.member) continue;
    if (!byMember.has(c.member)) byMember.set(c.member, []);
    byMember.get(c.member).push(c);
  }
  const versionHit = (cand, version) => version && hasWord(norm(cand.title), norm(version));

  // Passo 1: membro + versão (+ número)
  for (const card of cards) {
    const list = byMember.get(card.memberId) ?? [];
    const hit =
      list.find((c) => !used.has(c.url) && versionHit(c, card.version) && trailingNumber(c.title) === card.index) ??
      list.find((c) => !used.has(c.url) && versionHit(c, card.version));
    if (hit) {
      used.add(hit.url);
      result.set(card.id, { ...hit, confidence: 'exact' });
    }
  }
  // Passo 2: membro com um único card no lançamento — o membro basta
  const perMemberCount = new Map();
  for (const card of cards) perMemberCount.set(card.memberId, (perMemberCount.get(card.memberId) ?? 0) + 1);
  for (const card of cards) {
    if (result.has(card.id) || perMemberCount.get(card.memberId) !== 1) continue;
    const hit = (byMember.get(card.memberId) ?? []).find((c) => !used.has(c.url));
    if (hit) {
      used.add(hit.url);
      result.set(card.id, { ...hit, confidence: 'exact' });
    }
  }
  // Passo 3: sobras do membro viram prévia aproximada (sem marcar como usadas)
  for (const card of cards) {
    if (result.has(card.id)) continue;
    const list = (byMember.get(card.memberId) ?? []).filter((c) => !used.has(c.url));
    if (list.length) result.set(card.id, { ...list[0], confidence: 'member' });
  }
  return result;
}
