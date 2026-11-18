# Changelog

Todas as mudanças relevantes do app. Segue [Versionamento Semântico](https://semver.org/lang/pt-BR/):
`MAJOR.MINOR.PATCH`. Enquanto estivermos em `0.x`, novas funcionalidades sobem o MINOR e correções sobem o PATCH.

A **base de dados** tem versionamento próprio (`dataVersion`, formato `AAAA.MM.DD.N`), independente da versão do app.

## [0.2.0] — 2026-11-18

### Adicionado
- **`iniciar.bat`** para Windows: verifica o Node.js (versão 20 ou mais nova), oferece instalar o Node.js LTS via `winget` se faltar, instala as dependências na primeira execução (ou quando o `package-lock.json` muda), gera o build e abre o app no navegador. Use `iniciar.bat dev` para o modo de desenvolvimento.
- **Prévias dos photocards**: ao abrir um álbum, o app procura imagens de photocards na Stray Kids Wiki e na Kpop Wiki (Fandom) e mostra nos cards. O resultado fica em cache por 7 dias.
  - Prioridade da imagem: escolhida por você → base de dados do app → encontrada na wiki.
  - Cards com **≈** usam prévia aproximada: mesmo membro e álbum, mas a versão não está confirmada no nome do arquivo.
- Modo **🔍 Ver** na página do álbum: abre o card em tamanho grande, com status, **quantidade de repetidos**, link para a origem da imagem e opção de escolher outra imagem da wiki ou colar um link próprio.
- Configurações: ligar/desligar a busca nas wikis e limpar o cache de imagens.
- O backup agora inclui as imagens escolhidas por você.
- Campo `images` na base de dados e script `npm run images:fetch`, que procura as prévias nas wikis e as grava no `photocards.json` para todos os usuários.

### Corrigido
- No celular, a barra de modos de marcação não cabia na tela.

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
