# SKZ Pocadex — contexto do projeto

Web app (PWA) para organizar a coleção de photocards do **Stray Kids**: lista os itens oficiais de cada lançamento e permite marcar **Tenho**, **A caminho** (comprado, não chegou) e **Quero**. Projeto de fã, sem afiliação com a JYP.

- **Idioma**: toda a interface, documentação, commits e changelog em **português do Brasil**.
- O usuário não é desenvolvedor: explique decisões em linguagem simples e com passos concretos.

## Stack e estrutura

- Vite + React 19 + TypeScript, sem backend. Dados do usuário em `localStorage`.
- `public/data/photocards.json` — **a base de dados** (catálogo). O app baixa esse arquivo a cada abertura (sem cache) e guarda uma cópia para uso offline.
- `src/lib/expand.js` — gera os cards a partir das regras de cada set (JS puro, compartilhado com os scripts).
- `src/lib/wiki.js` — busca de prévias nas wikis (Fandom) direto do navegador; também usado por `scripts/fetch-images.mjs`.
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

- **Nunca renomeie IDs já publicados** (`release.id`, `set.id`, nomes de versão): a coleção do usuário é salva por ID de card `release:set:versão:membro:n`. Mudou um set? Crie um novo.
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
- Próximos passos sugeridos: sync com Google Drive (v0.5.0), conferir dados “(a confirmar)” com templates oficiais.

## Limitações do ambiente de nuvem do Claude

- As wikis (fandom.com), Wikipedia e sites de lojas costumam estar bloqueados na rede da sessão; a pesquisa foi feita por buscas. Testes de busca de imagens usam respostas simuladas.
- O ambiente é temporário: sempre entregue o pacote **Source** ao usuário ou envie ao GitHub antes de encerrar.
