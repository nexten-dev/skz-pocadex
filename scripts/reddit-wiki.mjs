// Lê páginas de wiki de um subreddit pela API OFICIAL do Reddit (OAuth "application-only"),
// com as credenciais de um app do tipo "script" guardadas nos segredos do GitHub.
//
// Variáveis de ambiente (segredos do repositório):
//   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET  — do app criado em https://www.reddit.com/prefs/apps
//   REDDIT_USERNAME (opcional)              — usado no User-Agent, como o Reddit pede
//
// Uso: node scripts/reddit-wiki.mjs <subreddit> [pagina...]
//   sem páginas: lista as páginas da wiki e mostra a página "templates"
import { writeFileSync } from 'node:fs';

const [sub = 'skzcollection', ...pagesArg] = process.argv.slice(2);
const { REDDIT_CLIENT_ID: id, REDDIT_CLIENT_SECRET: secret, REDDIT_USERNAME: user } = process.env;

if (!id || !secret) {
  console.error(
    '❌ Faltam os segredos REDDIT_CLIENT_ID e REDDIT_CLIENT_SECRET.\n' +
      '   Crie um app do tipo "script" em https://www.reddit.com/prefs/apps e guarde os códigos em\n' +
      '   GitHub → Settings → Secrets and variables → Actions.',
  );
  process.exit(1);
}

const UA = `web:skz-pocadex:0.6 (projeto de fã; github.com/nexten-dev/skz-pocadex)${user ? ` by /u/${user}` : ''}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function token() {
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    body: 'grant_type=client_credentials',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`não foi possível autenticar no Reddit (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.access_token;
}

const access = await token();
console.log('✔ Autenticado na API do Reddit');

async function api(path) {
  await sleep(1100); // bem abaixo do limite de uso da API
  const res = await fetch(`https://oauth.reddit.com${path}${path.includes('?') ? '&' : '?'}raw_json=1`, {
    headers: { Authorization: `Bearer ${access}`, 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${path}`);
  return res.json();
}

const list = await api(`/r/${sub}/wiki/pages`);
const pages = list.data ?? [];
console.log(`\nPáginas da wiki de r/${sub} (${pages.length}): ${pages.join(', ')}`);

const wanted = pagesArg.length ? pagesArg : pages.filter((p) => /template/i.test(p)).slice(0, 10);
const out = {};
for (const page of wanted.length ? wanted : ['templates']) {
  let md = '';
  try {
    const d = await api(`/r/${sub}/wiki/${page}`);
    md = d.data?.content_md ?? '';
  } catch (e) {
    console.log(`\n(erro em ${page}: ${e.message})`);
    continue;
  }
  out[page] = md;
  const links = [...md.matchAll(/\]\((https?:\/\/[^)\s]+)\)|(?<!\()(https?:\/\/[^\s)\]]+)/g)].map((m) => m[1] ?? m[2]);
  const hosts = {};
  for (const l of links) {
    try {
      const h = new URL(l).host;
      hosts[h] = (hosts[h] ?? 0) + 1;
    } catch {}
  }
  console.log(`\n================ wiki/${page}: ${md.length} caracteres, ${links.length} links`);
  console.log('servidores dos links:', JSON.stringify(hosts));
  console.log('--- conteúdo ---');
  console.log(md.slice(0, 12000));
}
writeFileSync('reddit-wiki.json', JSON.stringify(out, null, 2));
