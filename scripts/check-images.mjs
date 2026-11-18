// Verifica se as imagens da base abrem quando exibidas em outro site
// (sem cabeçalho Referer, como o app faz com referrerPolicy="no-referrer").
// Uso: node scripts/check-images.mjs [amostrasPorServidor=6]
import { readFileSync } from 'node:fs';

const db = JSON.parse(readFileSync(new URL('../public/data/photocards.json', import.meta.url), 'utf-8'));
const per = Number(process.argv[2] ?? 6);

function resolve(v, size) {
  const m = v.match(/^([a-z0-9]+):(?!\/\/)(.+)$/i);
  const h = m && db.imageHosts?.[m[1]];
  return h ? encodeURI(h.base + m[2]) + (h[size] ?? '') : v;
}

const byHost = new Map();
for (const r of db.releases)
  for (const v of Object.values(r.images ?? {})) {
    const url = resolve(typeof v === 'string' ? v : v.url, 'thumb');
    const host = new URL(url).host;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
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
  console.log(`${host.padEnd(24)} ${String(urls.length).padStart(5)} imagens · amostra: ${results.join(' | ')}`);
}
console.log(bad ? `\n⚠ ${bad} imagens da amostra não abriram.` : '\n✔ Todas as imagens da amostra abriram.');
