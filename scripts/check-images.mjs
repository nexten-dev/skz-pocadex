// Verifica se as imagens da base abrem quando exibidas em outro site
// (sem cabeçalho Referer, como o app faz com referrerPolicy="no-referrer").
// Uso: node scripts/check-images.mjs [amostrasPorServidor=6]
import { readFileSync } from 'node:fs';

const db = JSON.parse(readFileSync(new URL('../public/data/photocards.json', import.meta.url), 'utf-8'));
const per = Number(process.argv[2] ?? 6);

// Mesma lógica de src/lib/images.ts (resolveImage)
function resolve(v, size, width = 360) {
  const m = v.match(/^([a-z0-9]+):(?!\/\/)(.+)$/i);
  const h = m && db.imageHosts?.[m[1]];
  const url = h ? encodeURI(h.base + m[2]) : v;
  if (h?.[size]) return url + h[size];
  const imgur = size === 'thumb' && url.match(/^(https:\/\/i\.imgur\.com\/[A-Za-z0-9]{5,8})\.(png|jpe?g|gif|webp)$/);
  if (imgur) return `${imgur[1]}l.${imgur[2]}`;
  if (size === 'thumb' && db.imageProxy) return db.imageProxy.replace('{url}', encodeURIComponent(url)).replace('{w}', String(width));
  return url;
}

const byHost = new Map();
for (const r of db.releases)
  for (const v of Object.values(r.images ?? {})) {
    const url = resolve(typeof v === 'string' ? v : v.url, 'thumb');
    const orig = resolve(typeof v === 'string' ? v : v.url, 'full');
    const host = `${new URL(orig).host} → ${new URL(url).host}`;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
  }

// Capas dos lançamentos (wiki e SKZPD)
for (const r of db.releases) {
  for (const [kind, c] of [
    ['capa wiki', r.media?.cover],
    ['capa skzpd', r.cover],
  ]) {
    if (!c) continue;
    const url = c.thumb ?? resolve(c.url, 'thumb', 320);
    const host = `${kind}: ${new URL(resolve(c.url, 'full')).host} → ${new URL(url).host}`;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
  }
}

// Templates da comunidade: miniatura (redimensionada) e original
for (const t of db.templates?.items ?? []) {
  if (!t.image) continue;
  for (const [kind, url] of [
    ['template miniatura', resolve(t.image, 'thumb', 480)],
    ['template original', t.image],
  ]) {
    const host = `${kind}: ${new URL(t.image).host} → ${new URL(url).host}`;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
  }
}

let bad = 0;
for (const [host, urls] of byHost) {
  const sample = urls.filter((_, i) => i % Math.max(1, Math.floor(urls.length / per)) === 0).slice(0, per);
  const results = [];
  for (const url of sample) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile' } });
      const buf = await res.arrayBuffer();
      const ok = res.ok && /^image\//.test(res.headers.get('content-type') ?? '');
      if (!ok) bad++;
      results.push(`${res.status} ${res.headers.get('content-type')} ${buf.byteLength}B`);
    } catch (e) {
      bad++;
      results.push(`erro ${e.message}`);
    }
  }
  console.log(`${host.padEnd(36)} ${String(urls.length).padStart(5)} imagens · amostra: ${results.join(' | ')}`);
}
console.log(bad ? `\n⚠ ${bad} imagens da amostra não abriram.` : '\n✔ Todas as imagens da amostra abriram.');
