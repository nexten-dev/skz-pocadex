# Changelog

Todas as mudanças relevantes do app. Segue [Versionamento Semântico](https://semver.org/lang/pt-BR/):
`MAJOR.MINOR.PATCH`. Enquanto estivermos em `0.x`, novas funcionalidades sobem o MINOR e correções sobem o PATCH.

A **base de dados** tem versionamento próprio (`dataVersion`, formato `AAAA.MM.DD.N`), independente da versão do app.

## [0.1.0] — 2026-11-18

### Adicionado
- Lista de lançamentos físicos do Stray Kids (Coreia e Japão), com busca, filtro por mercado e ordenação por data.
- Página de cada lançamento com todos os photocards agrupados por set/versão, filtro por membro e por status.
- Marcação de photocards como **Tenho**, **A caminho** (comprado, ainda não chegou) e **Quero**, com modo de marcação por toque e “Marcar todos” por grupo.
- Página “Minha coleção”: totais, progresso por membro, lista de cards a caminho (com “Chegou tudo ✓”) e lista de desejos.
- Base de dados em `public/data/photocards.json`, baixada a cada abertura do app; avisa quando há versão nova e usa a cópia local quando offline.
- Exportar/importar backup da coleção (JSON).
- Tema claro/escuro automático e layout para celular.
- Script `npm run data:check` / `npm run data:bump` para validar e versionar a base.
- Workflow de deploy para GitHub Pages.

### Limitações conhecidas
- A base inicial é uma **prévia**: versões e quantidades de photocards foram montadas com base na Kpop Wiki, anúncios de lojas e conhecimento prévio, e ainda precisam ser conferidas com templates oficiais (todos os lançamentos estão marcados como `verified: false`).
- Sem imagens dos photocards (cards ilustrados com a cor do membro).
- POBs/benefícios de pré-venda de lojas coreanas e japonesas ainda não estão incluídos (apenas Target).
