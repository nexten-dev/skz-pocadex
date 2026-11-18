// Diagnóstico: baixa páginas e os arquivos que elas carregam (JS/JSON/CSV), para
// descobrir de onde vêm os dados e quais APIs o site usa.
// Uso: node scripts/site-probe.mjs "<url> [url2 ...]" [maxChars]
const starts = (process.argv[2] ?? '').split(/\s+/).filter(Boolean);
const max = Number(process.argv[3] ?? 2500);
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
};

async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, type: res.headers.get('content-type'), text, url: res.url };
}

const API_RE = /["'`](https?:\/\/[^"'`\s]*(?:api|graphql|gateway)[^"'`\s]*|\/(?:api|v\d)\/[^"'`\s]{2,120})["'`]/gi;

for (const start of starts) {
  console.log(`\n################ ${start}`);
  let page;
  try {
    page = await get(start);
  } catch (e) {
    console.log(`erro: ${e.message}`);
    continue;
  }
  console.log(`== HTTP ${page.status} ${page.type} (${page.text.length} chars) → ${page.url}`);
  console.log(page.text.slice(0, max));

  const refs = new Set();
  for (const m of page.text.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)) {
    try {
      refs.add(new URL(m[1], page.url).href);
    } catch {}
  }
  console.log(`\n== referências (${refs.size}):\n` + [...refs].slice(0, 60).join('\n'));

  const apis = new Set([...page.text.matchAll(API_RE)].map((m) => m[1]));
  const origin = new URL(page.url).origin;
  let n = 0;
  for (const r of refs) {
    if (!/\.(js|mjs|json)(\?|$)/i.test(r) || n >= 25) continue;
    n++;
    try {
      const js = await get(r);
      console.log(`\n======== ${r} → HTTP ${js.status} (${js.text.length} chars)`);
      if (r.startsWith(origin) || /json/i.test(js.type ?? '')) console.log(js.text.slice(0, Math.min(max, 800)));
      for (const m of js.text.matchAll(API_RE)) apis.add(m[1]);
    } catch (e) {
      console.log(`(erro ${r}: ${e.message})`);
    }
  }
  console.log(`\n== possíveis endpoints de API (${apis.size}):\n` + [...apis].slice(0, 120).join('\n'));
}
