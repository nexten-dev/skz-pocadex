# SKZ Pocadex

Web app para organizar a coleção de photocards do **Stray Kids**: veja todos os photocards oficiais de cada lançamento e marque os que você **tem**, os que estão **a caminho** e os que **quer**.

> Projeto de fã, sem afiliação com a JYP Entertainment.

**Versão atual:** 0.1.0 — veja o [CHANGELOG](CHANGELOG.md).

## Rodando localmente

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

## Versionamento

- **App:** SemVer em `package.json` (`0.1.0`), exibido no rodapé. Cada versão ganha uma tag git `vX.Y.Z` e uma entrada no CHANGELOG.
- **Dados:** `dataVersion` no JSON (`AAAA.MM.DD.N`), incrementado com `npm run data:bump`.

## Deploy

Há um workflow do GitHub Actions (`.github/workflows/deploy.yml`) que publica no GitHub Pages a cada push na `main`. Em *Settings → Pages* do repositório, selecione **GitHub Actions** como fonte.

## Próximos passos sugeridos

- Conferir cada lançamento com templates oficiais e marcar `verified: true`.
- Imagens dos photocards, POBs de lojas, lucky draws e photocards de fanmeeting/turnê.
- Sincronização da coleção entre aparelhos (login).
- PWA instalável e com suporte offline completo.
