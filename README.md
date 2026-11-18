# SKZ Pocadex

Web app para organizar a coleção de photocards do **Stray Kids**: veja todos os photocards oficiais de cada lançamento e marque os que você **tem**, os que estão **a caminho** e os que **quer**.

> Projeto de fã, sem afiliação com a JYP Entertainment.

**Versão atual:** 0.5.1

**App online:** https://nexten-dev.github.io/skz-pocadex/ · **Downloads:** [Releases](https://github.com/nexten-dev/skz-pocadex/releases) — veja o [CHANGELOG](CHANGELOG.md).

## Rodando no Windows (jeito mais fácil)

Dê dois cliques em **`iniciar.bat`**. Ele:

1. verifica se o Node.js 20+ está instalado e, se não estiver, oferece instalar o Node.js LTS via `winget` (o instalador oficial do Windows);
2. instala as dependências do projeto (só na primeira vez ou quando houver atualização);
3. gera o app e abre `http://localhost:4173` no navegador.

Para encerrar, feche a janela preta. Para o modo de desenvolvimento, que recarrega sozinho quando você edita o código, rode `iniciar.bat dev` no terminal.

> Se o Windows não tiver `winget`, o script abre a página de download do Node.js. Instale e execute o `iniciar.bat` de novo.

## Rodando manualmente (Windows, macOS ou Linux)

```bash
npm install
npm run dev
```

Build de produção (valida a base, checa tipos e gera `dist/`):

```bash
npm run build
```

## Como funciona a base de dados

- Toda a base fica em [`public/data/photocards.json`](public/data/photocards.json).
- **Ao abrir, o app sempre baixa esse arquivo de novo** (sem cache). Se a `dataVersion` mudou, ele mostra um aviso e passa a usar a nova versão. Sem internet, usa a última cópia salva no aparelho.
- Ou seja: para atualizar os dados de todo mundo, basta editar o JSON, rodar `npm run data:bump` e publicar. O app não precisa de nova versão.
- Dá para apontar para outra URL de dados com a variável `VITE_DATA_URL` no build ou em *Configurações → Fonte da base*.

### Formato

Cada lançamento tem `sets` de photocards. Um set descreve regras e o app gera os cards:

```jsonc
{
  "id": "maxident",
  "title": "MAXIDENT",
  "type": "mini",          // mini | full | repackage | special | single | compilation | mixtape
  "market": "KR",          // KR | JP
  "date": "2022-10-07",
  "members": ["..."],      // opcional — padrão: membros atuais
  "sets": [
    { "id": "std", "name": "Standard", "versions": ["GO", "T-CRUSH", "HEART"], "perMember": 1 },
    { "id": "unit", "name": "Unit", "perMember": 0, "extras": [{ "id": "unit-1", "label": "Unit 1" }] }
  ],
  "verified": false        // true depois de conferido com o template oficial
}
```

O ID de cada card é `release:set:versão:membro:n`. **Não renomeie `id`s já publicados**: a coleção dos usuários é salva por esses IDs.

## Itens extras e o seletor “Mostrar”

Além dos photocards dos álbuns, a base inclui itens do álbum, benefícios de loja (POB), lucky draws, pop-up stores e eventos. Por padrão o app mostra **só photocards**. Use os chips **Mostrar** no topo da página (ou *Configurações → O que mostrar*) para incluir outras categorias quando quiser. O progresso e os totais consideram apenas o que está visível.

Na base, cada set pode ter:

```jsonc
{
  "id": "pob-aladin",
  "name": "Aladin",
  "category": "pob",          // photocard (padrão) | inclusion | pob | luckydraw | popup | event
  "itemType": "Photocard",    // rótulo livre: Postcard, Mini pôster, ID photo…
  "store": "Aladin",          // loja ou evento de origem
  "format": "card",           // card (padrão) | wide | tall | square
  "perMember": 1,
  "note": "1 aleatório de 8"
}
```

## Status dos itens

| Status | Significado |
|---|---|
| ✓ Tenho | Está na sua coleção |
| 🛒 Comprado → 🔒 Garantido → 📮 Enviado para Proxy → ✈️ Frete Inter → 💰 Taxa RF → 🏠 Dispo Frete Casa → 🚚 Enviado | Etapas da compra até chegar (“a caminho”) |
| ♥ Quero | Lista de desejos |
| 🚫 Não quero | Fica fora do progresso e do “faltando” |

## Imagens

As imagens vêm da [Stray Kids Wiki](https://stray-kids.fandom.com) e ficam gravadas na base (`release.media`):

- **Prévias das versões**: a imagem oficial do conteúdo de cada versão do álbum (“Album Preview”).
- **Fotos de divulgação dos membros**: o teaser de cada membro na era, usado no fundo dos cards (📷). As wikis não têm fotos individuais dos photocards.
- Imagens escolhidas pelo usuário (modo “🔍 Ver”) têm prioridade e ficam só no aparelho dele.

A coleta roda no GitHub Actions, que tem acesso às wikis: workflow **“Prévias das wikis”**, toda segunda-feira, ou manualmente em *Actions → Prévias das wikis → Run workflow* (modos `diagnostico`, `testar`, `gravar`). Localmente: `npm run images:fetch -- --dry --verbose`.

## Publicar uma versão (3 pacotes)

Toda versão publicada gera três pacotes:

```bash
npm run release
```

Os arquivos ficam em `releases/vX.Y.Z/`:

| Pacote | Para quê | Conteúdo |
|---|---|---|
| **Source** `…-source.zip` | Continuar o desenvolvimento | Todo o projeto, incluindo `CLAUDE.md` e o histórico git (sem `node_modules`/`dist`) |
| **Dist** `…-dist.zip` | Só usar o app | Build pronto + `abrir.bat` (Windows, não precisa de Node) + `LEIA-ME.txt` |
| **Mobile** `…-mobile.zip` | Arquivos para o celular | Só existe quando necessário. Hoje não é: o app é instalado pelo endereço publicado |

O script exige que a versão esteja documentada no `CHANGELOG.md`. No GitHub isso é automático: ao enviar para a `main` um commit com versão nova no `package.json`, o workflow `release.yml` gera os pacotes, cria a tag e publica a Release.

## Versionamento

- **App:** SemVer em `package.json` (`0.1.0`), exibido no rodapé. Cada versão ganha uma tag git `vX.Y.Z` e uma entrada no CHANGELOG.
- **Dados:** `dataVersion` no JSON (`AAAA.MM.DD.N`), incrementado com `npm run data:bump`.

## Publicar e usar no celular

O app precisa estar num endereço na internet para abrir no celular (o `localhost` só existe no seu computador).

1. Crie um repositório **público** vazio no GitHub chamado `skz-pocadex` (sem README, .gitignore ou licença).
2. Envie o projeto:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/skz-pocadex.git
   ```
   ```bash
   git push -u origin main --tags
   ```
3. No repositório, vá em *Settings → Pages* e escolha **GitHub Actions** como fonte.
4. Em ~2 minutos o app estará em `https://SEU-USUARIO.github.io/skz-pocadex/`. Cada push na `main` publica de novo automaticamente (`.github/workflows/deploy.yml`).
5. No celular, abra esse endereço e instale:
   - **iPhone**: Safari → Compartilhar → “Adicionar à Tela de Início”.
   - **Android**: Chrome → ⋮ → “Instalar app”.

A coleção de cada aparelho fica salva nele mesmo. Para levar do PC para o celular, use *Configurações → Exportar/Importar backup* (até a sincronização com nuvem pessoal chegar).

## Próximos passos sugeridos

- Conferir cada lançamento com templates oficiais e marcar `verified: true`.
- Conferir os itens extras marcados “(a confirmar)” e completar POBs/lucky draws de lançamentos antigos; itens de fanmeeting/turnê.
- Sincronização da coleção pela nuvem pessoal (Google Drive, depois OneDrive/Dropbox).
