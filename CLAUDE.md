# SKZ Pocadex — contexto do projeto

Web app (PWA) para organizar a coleção de photocards do **Stray Kids**: lista os itens oficiais de cada lançamento e permite marcar **Tenho**, **A caminho** (comprado, não chegou) e **Quero**. Projeto de fã, sem afiliação com a JYP.

- **Idioma**: toda a interface, documentação, commits e changelog em **português do Brasil**.
- O usuário não é desenvolvedor: explique decisões em linguagem simples e com passos concretos.

## Stack e estrutura

- Vite + React 19 + TypeScript, sem backend. Dados do usuário em `localStorage`.
- `public/data/photocards.json` — **a base de dados** (catálogo). O app baixa esse arquivo a cada abertura (sem cache) e guarda uma cópia para uso offline.
- `src/lib/expand.js` — gera os cards a partir das regras de cada set (JS puro, compartilhado com os scripts).
- `src/lib/status.ts` — status dos itens: `owned`, etapas a caminho (`bought`→`secured`→`proxy`→`intl`→`tax`→`homeready`→`shipped`), `wish`, `notwant`. “Não quero” não conta no progresso. O antigo `transit` é migrado para `bought`.
- `src/lib/wiki.js` — coleta de imagens da Stray Kids Wiki (galeria `<Álbum>/Gallery`: “Album Preview” das versões + teaser de cada membro). Usado só por `scripts/fetch-images.mjs`, que roda no GitHub Actions (workflow `images.yml`, semanal + manual). As wikis **não têm fotos individuais de photocards**. O app só lê `release.media` da base.
- **Fonte principal dos photocards: SKZPD** (https://skzpd.com, repositório público `manyodev/skzpd`, **sem licença declarada**: só exibimos as imagens dos endereços originais com crédito e link, nunca copiamos arquivos para o repositório). `scripts/skzpd-parse.mjs` lê as páginas HTML (`album-card` → blocos `member` → rótulo `poca` que vem DEPOIS do bloco) e `scripts/skzpd-import.mjs` converte em sets `k-<rótulo>` com foto por card, classifica a categoria pelo rótulo e grava `db.idMigrations` (card antigo → novo). Workflow `skzpd.yml` (quarta-feira + manual, modos testar/gravar) e `scripts/check-images.mjs` (testa se as fotos abrem sem Referer). O SKZPD omite o Woojin: o import mantém os cards dele sem foto.
- `src/lib/images.ts` — resolve imagens: escolhida pelo usuário > `release.images` (compactas `prefixo:caminho` via `db.imageHosts`; miniaturas grandes via `db.imageProxy` = wsrv.nl) > foto de divulgação da wiki (📷).
- `src/lib/categories.ts` — categorias de itens (photocard, inclusion, pob, luckydraw, popup, event) e o seletor “Mostrar” (padrão: só photocards).
- `src/lib/pwa.ts` + `public/sw.js` + `public/manifest.webmanifest` — app instalável/offline. O build grava a versão no `sw.js`.
- `iniciar.bat` — inicializador Windows para o código-fonte (verifica/instala Node via winget, `npm ci`, build, abre o navegador).
- `packaging/dist/` — arquivos que vão junto do pacote **Dist** (inicializador sem Node).
- `scripts/` — `check-data.mjs` (valida/versiona a base), `fetch-images.mjs` (prévias), `release.mjs` (pacotes de release).

## Comandos

```bash
npm run dev            # desenvolvimento (localhost:4173)
npm run build          # valida base + typecheck + build em dist/
npm run data:check     # valida public/data/photocards.json
npm run data:bump      # incrementa dataVersion (AAAA.MM.DD.N) após editar a base
npm run images:fetch   # grava prévias das wikis na base (precisa de acesso às wikis)
npm run release        # gera os pacotes de release em releases/vX.Y.Z/
```

## Regras importantes

- **Nunca renomeie IDs já publicados** (`release.id`, `set.id`, nomes de versão): a coleção do usuário é salva por ID de card `release:set:versão:membro:n`. Se for inevitável (ex.: reimportação), registre `id antigo → id novo` em `db.idMigrations`: o app move marcações e imagens escolhidas ao abrir.
- Dev e preview usam **sempre a porta 4173** (a coleção no navegador é separada por endereço). O inicializador do pacote Dist também usa 4173.
- Dados não confirmados: marque o lançamento com `verified: false` e itens extras com “(a confirmar)” na nota. Não invente dados; deixe claro o que é estimativa.
- Não usar logos/arte oficiais. Prévias de imagens vêm das wikis com link de origem.

## Versionamento

- **App**: SemVer em `package.json` (começou em 0.1.0). Novas funcionalidades sobem o MINOR, correções/ferramentas sobem o PATCH. A versão aparece no rodapé.
- Cada versão: entrada no `CHANGELOG.md`, commit e **tag git `vX.Y.Z`**.
- **Base de dados**: `dataVersion` próprio (`AAAA.MM.DD.N`), via `npm run data:bump`. Atualizar a base não exige nova versão do app.

## Regra de publicação: sempre 3 pacotes

**Sempre que publicar uma versão, gere os pacotes com `npm run release`** (e entregue/anexe os arquivos ao usuário):

1. **Source** — `skz-pocadex-vX.Y.Z-source.zip`: todos os arquivos do projeto, incluindo este `CLAUDE.md`, `.claude/` (se existir) e o histórico git. Exclui só o que é regenerável (`node_modules/`, `dist/`, `releases/`).
2. **Dist** — `skz-pocadex-vX.Y.Z-dist.zip`: só o necessário para rodar (o build + inicializador `abrir.bat`/`servidor.ps1` que não precisa de Node + `LEIA-ME.txt`). Sem código-fonte, scripts de desenvolvimento ou contexto do Claude.
3. **Mobile** — só se houver arquivos que precisem ir para o celular. Hoje **não há**: o app é PWA e é instalado pelo endereço publicado. O script registra isso no `RELEASE.txt`. Se um dia existir um app nativo (ex.: Capacitor), coloque a configuração em `mobile/` e o script passa a gerar o pacote.

No GitHub (`nexten-dev/skz-pocadex`), o workflow `.github/workflows/release.yml` roda a cada push na `main`: se a versão do `package.json` ainda não tem Release, ele gera os pacotes, **cria a tag** e publica a GitHub Release com os arquivos. Também cria tags de versões antigas que faltem (pela versão citada no assunto do commit).

**Tags**: o ambiente de nuvem do Claude não consegue enviar tags (`git push --tags` é recusado). Crie a tag localmente como de costume, mas não tente enviá-la: o workflow cria a tag no GitHub. Por isso, mantenha a versão no assunto do commit de release (ex.: `feat: v0.5.0 — …`).

## Decisões e roteiro

- Nome “SKZ Pocadex” (poca = 포카, photocard; dex = Pokédex) — aprovado pelo usuário.
- **Publicação**: repositório público `nexten-dev/skz-pocadex`, site no GitHub Pages (`https://nexten-dev.github.io/skz-pocadex/`) via workflow `deploy.yml`. Pages **ativo** (Source: GitHub Actions) e repositório **público** desde a v0.4.2. Configurações do repositório (visibilidade, Pages) só podem ser alteradas pelo usuário — a API de settings não é acessível da sessão. Para republicar o site sem commit: `gh api repos/nexten-dev/skz-pocadex/actions/workflows/deploy.yml/dispatches -X POST -f ref=main`.
- **Sincronização entre aparelhos**: decidido usar a **nuvem pessoal do usuário** (Google Drive primeiro; OneDrive/Dropbox depois), arquivo da coleção numa pasta do app, mesclagem por card usando o timestamp `t`. **Não** usar Supabase por enquanto.
- Pastas do Google Drive indicadas pelo usuário (`data/drive-sources.json`) têm só **templates** (folhas com vários cards); foram trocadas pelo SKZPD, que tem uma foto por card. Os scripts `drive*.mjs`/`drive.yml` ficaram como diagnóstico.
- Próximos passos sugeridos: sync com Google Drive da coleção do usuário, conferir dados “(a confirmar)”, importar novas páginas do SKZPD quando forem publicadas (DO IT, GIANT, THE SOUND… ainda vazias lá).

## Limitações do ambiente de nuvem do Claude

- As wikis (fandom.com), Wikipedia e sites de lojas estão bloqueados na rede da sessão. Para acessar as wikis, use o workflow `images.yml` (as máquinas do GitHub têm acesso): dispare com `gh api repos/nexten-dev/skz-pocadex/actions/workflows/images.yml/dispatches -X POST -f ref=<branch> -f 'inputs[modo]=diagnostico|testar|gravar' -f 'inputs[lancamentos]=<ids>'` e leia o log do job pela API. Artefatos do Actions não podem ser baixados da sessão.
- Para testar mudanças antes de publicar, use um branch (o deploy só roda na `main`).
- O ambiente é temporário: sempre entregue o pacote **Source** ao usuário ou envie ao GitHub antes de encerrar.
