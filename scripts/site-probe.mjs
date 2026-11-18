// Diagnóstico: baixa uma página e os arquivos que ela carrega (JS/JSON/CSV),
// para descobrir de onde vêm os dados. Uso: node scripts/site-probe.mjs <url> [maxChars]
const start = process.argv[2];
const max = Number(process.argv[3] ?? 2500);
const UA = { 'User-Agent': 'Mozilla/5.0 (skz-pocadex; projeto de fã)' };

async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, type: res.headers.get('content-type'), text, url: res.url };
}

const page = await get(start);
console.log(`== ${start} → HTTP ${page.status} ${page.type} (${page.text.length} chars)`);
console.log(page.text.slice(0, max));

const refs = new Set();
for (const m of page.text.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)) refs.add(new URL(m[1], page.url).href);
for (const m of page.text.matchAll(/["'`]([^"'`\s]+\.(?:json|csv|js)(?:\?[^"'`\s]*)?)["'`]/g)) refs.add(new URL(m[1], page.url).href);
console.log(`\n== referências (${refs.size}):\n` + [...refs].join('\n'));

const seen = new Set();
async function dig(url, depth) {
  if (seen.has(url) || depth > 2 || seen.size > 25) return;
  seen.add(url);
  if (!/\.(js|mjs|json|csv)(\?|$)/i.test(url) || !url.startsWith(new URL(start).origin)) return;
  try {
    const r = await get(url);
    console.log(`\n======== ${url} → HTTP ${r.status} ${r.type} (${r.text.length} chars)`);
    console.log(r.text.slice(0, max));
    for (const m of r.text.matchAll(/["'`]([^"'`\s]+\.(?:json|csv|js)(?:\?[^"'`\s]*)?)["'`]/g)) {
      try {
        await dig(new URL(m[1], url).href, depth + 1);
      } catch {}
    }
  } catch (e) {
    console.log(`(erro ${url}: ${e.message})`);
  }
}
for (const r of refs) await dig(r, 0);
