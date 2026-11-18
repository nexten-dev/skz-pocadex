// Leitura de pastas PÚBLICAS do Google Drive sem chave de API,
// pela página "embeddedfolderview" (a mesma usada para incorporar pastas em sites).
// Usado pelos scripts drive-probe.mjs e drive-fetch.mjs (rodam no GitHub Actions).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

/** Lista o conteúdo de uma pasta pública: { title, folders: [{id,name}], files: [{id,name}] } */
export async function listFolder(id) {
  await sleep(350); // educado com o Google
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (skz-pocadex; projeto de fã)', 'Accept-Language': 'pt-BR,en;q=0.8' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} na pasta ${id}`);
  const html = await res.text();
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? id);
  const folders = [];
  const files = [];
  const re = /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]*)<\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, entryId, href, name] = m;
    if (/\/folders\//.test(href)) folders.push({ id: entryId, name: decode(name) });
    else files.push({ id: entryId, name: decode(name) });
  }
  return { id, title, folders, files };
}

/**
 * Percorre a árvore a partir de uma pasta. Chama onFolder(node, path) para cada pasta.
 * Retorna a lista de arquivos com o caminho completo de pastas.
 */
export async function crawl(rootId, { maxDepth = 8, maxFolders = 1500, onFolder } = {}) {
  const out = [];
  let count = 0;
  async function walk(id, path, depth) {
    if (depth > maxDepth || count >= maxFolders) return;
    count++;
    let node;
    try {
      node = await listFolder(id);
    } catch (e) {
      onFolder?.({ id, title: '(erro)', folders: [], files: [], error: e.message }, path);
      return;
    }
    const here = depth === 0 ? [node.title] : path;
    onFolder?.(node, here);
    for (const f of node.files) out.push({ ...f, path: here });
    for (const sub of node.folders) await walk(sub.id, [...here, sub.name], depth + 1);
  }
  await walk(rootId, [], 0);
  return out;
}

/** URLs públicas de imagem de um arquivo do Drive. */
export function driveImage(id, width = 600) {
  return {
    thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`,
    url: `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
    page: `https://drive.google.com/file/d/${id}/view`,
  };
}
