# Changelog

Todas as mudanças relevantes do app. Segue [Versionamento Semântico](https://semver.org/lang/pt-BR/):
`MAJOR.MINOR.PATCH`. Enquanto estivermos em `0.x`, novas funcionalidades sobem o MINOR e correções sobem o PATCH.

A **base de dados** tem versionamento próprio (`dataVersion`, formato `AAAA.MM.DD.N`), independente da versão do app.

## [Não lançado]

Mudanças já publicadas no site, que entram na próxima versão (a versão está congelada em 0.6.0 até concluirmos as imagens).

### Adicionado
- **Templates da comunidade** (wiki de [r/skzcollection](https://www.reddit.com/r/skzcollection/wiki/templates/)): 149 folhas com vários cards juntos, para consulta, com crédito ao autor e link para o post original.
  - Na página de cada álbum, uma faixa “Templates da comunidade” (25 lançamentos têm pelo menos um, inclusive THE SOUND, CIRCUS, Scars, ALL IN, TOP e SKZ2020, que ainda não têm fotos por card).
  - Página nova **Templates** no menu, organizada como a wiki (álbuns, shows, fanclub, Season’s Greetings, colaborações, por membro…), com busca.
- **Capas na página inicial**: cada lançamento mostra a capa do álbum (capa digital da Stray Kids Wiki; se não houver, a do SKZPD; sem nenhuma, um quadro com o título). No celular, os lançamentos aparecem em duas colunas.
- Automação “Wiki do Reddit” pela API oficial (aguardando credenciais do Reddit).

- **Tela de login ao abrir o app**: “Entrar com Google” (coleção salva no Google Drive da pessoa, numa pasta privada do app, e sincronizada entre aparelhos) ou “Entrar como visitante” (com aviso de que nada é salvo na nuvem).
- **Login com Microsoft (OneDrive)**: alternativa ao Google, com o arquivo na pasta “Aplicativos › SKZ Pocadex” do OneDrive. A Microsoft renova o acesso sozinha, então quase não aparece “Reconectar”.
- **Sincronização com o Google Drive**: marcações, fotos, preferências, itens e templates próprios. Mescla por item (vale a alteração mais recente) e remoções não “voltam” vindas de outro aparelho.
- **Configurações → Membros**: escolha de quais membros aparecem (inclusive Woojin e cards de grupo/unit). Vale para o app todo e é salva na nuvem, junto com as categorias de itens.
- **Meus itens** (nova aba): cadastro de itens não oficiais ou fora da base — nome, membro, tipo, origem, foto, observações e os mesmos status.
- **Templates próprios**: botão “+ Adicionar template” na página Templates (link ou imagem do aparelho, seção, lançamento, crédito). Aparecem marcados como “seu”, também na página do álbum, e podem ser sugeridos para todos.
- **Foto do card bem visível**: no detalhe do card (🔍 Ver), a seção “📷 Foto do card” permite enviar foto do celular (reduzida automaticamente) ou colar um link, remover a sua foto e sugerir a foto para todos.
- “Sugerir para todos” abre uma sugestão pronta no GitHub do projeto.
- Backup: importar agora pode **juntar** com a coleção atual (ou substituir).

### Corrigido
- Na primeira visita, o app recarregava a página sozinho uma vez ao ativar o modo offline.
- Menu do celular cabe inteiro em telas pequenas (“Minha coleção” vira “Coleção”).
- Miniaturas do Imgur usam o tamanho reduzido do próprio Imgur.

## [0.6.0] — 2026-11-18

### Adicionado
- **Fotos reais dos photocards**, importadas do [SKZPD — Stray Kids Photocard Database](https://skzpd.com/src/index.html) (por Manyo): **cerca de 2.000 fotos** em 27 páginas. Cada card mostra a foto do photocard de verdade (toque em “🔍 Ver” para ampliar).
- **Lista de cards conferida**: nos lançamentos cobertos pelo SKZPD, os grupos de cards seguem exatamente o SKZPD (versões, units, POBs de cada loja, lucky draws, pop-ups, transmissões…). Esses lançamentos deixam de ter a etiqueta “prévia”.
- **8 lançamentos novos**: Mixtape, edições de Taiwan (I Am NOT, I Am YOU, Clé 2: Yellow Wood), UNVEIL [Op. 01: I am NOT], MEET&GREET — I Am YOU e os fanclubs STAY 0ª e 1ª geração. Filtro **Taiwan** na página inicial.
- Sincronização semanal automática com o SKZPD (toda quarta-feira): novidades publicadas lá chegam ao app sozinhas.
- Miniaturas leves: imagens grandes passam por um redimensionador (`wsrv.nl`). Os scans do THIS & THAT, por exemplo, caem de até 1,3 MB para cerca de 20 KB cada.

### Alterado
- **Suas marcações são preservadas**: cards que mudaram de grupo (ex.: “MAXIDENT · GO · Felix”) têm as marcações e imagens escolhidas movidas automaticamente para o card novo.
- Os grupos que eram estimativas nossas foram substituídos pelos do SKZPD. Os “itens do álbum” (postcards, pôsteres, ID photos…) foram mantidos.
- O SKZPD não inclui o Woojin. Nos lançamentos de 2018–2019, os cards dele continuam no app, mas sem foto.
- As fotos de divulgação da wiki (📷) agora só aparecem quando não existe foto do photocard.

### Corrigido
- Quando uma miniatura não abre, o card tenta a imagem original antes de mostrar o cartão colorido.

## [0.5.1] — 2026-11-18

### Corrigido
- No celular, a faixa com as prévias das versões fazia a página inteira correr para o lado. Agora só a faixa de imagens rola na horizontal, dentro da largura da tela.

## [0.5.0] — 2026-11-18

### Adicionado
- **Status “Não quero”** 🚫: o item fica marcado, mas sai do progresso e do “faltando”.
- **Etapas da compra** no lugar de “A caminho”, na ordem:
  1. 🛒 Comprado → 2. 🔒 Garantido → 3. 📮 Enviado para Proxy → 4. ✈️ Frete Inter → 5. 💰 Taxa RF → 6. 🏠 Dispo Frete Casa → 7. 🚚 Enviado → ✓ Tenho
  - Na página do álbum, o modo “🚚 A caminho” tem o seletor **Etapa**.
  - No detalhe do card, uma linha do tempo mostra a etapa atual, com o botão **“Avançar →”**.
  - Em “Minha coleção”, os itens a caminho ficam agrupados por etapa. Tocar num card avança para a próxima etapa, e **“Todos → …”** avança o grupo inteiro.
  - Marcações “A caminho” das versões anteriores viram **Comprado** automaticamente.
- **Imagens da Stray Kids Wiki** nos 29 lançamentos:
  - **Prévia oficial do conteúdo de cada versão** do álbum, numa faixa no topo da página e em miniatura em cada grupo de cards. Toque para ampliar.
  - **Foto de divulgação de cada membro** naquela era (teaser oficial) no fundo dos cards, marcada com 📷. As wikis **não têm fotos individuais dos photocards**, e o app deixa isso claro.
  - Link para a galeria do álbum na wiki.
  - Em Configurações dá para desligar as fotos de divulgação nos cards.
- Automação **“Prévias das wikis”** no GitHub, que coleta as imagens toda segunda-feira e atualiza a base e o site. Também pode ser rodada manualmente nos modos diagnóstico, teste ou gravação.

### Alterado
- O app não consulta mais as wikis pelo navegador: as imagens vêm prontas na base de dados (mais rápido e funciona offline).

## [0.4.2] — 2026-11-18

### Alterado
- Projeto publicado no GitHub (`nexten-dev/skz-pocadex`).
- **Publicação automática**: a cada envio para a `main` com versão nova no `package.json`, o GitHub gera os 3 pacotes, cria a tag `vX.Y.Z` e publica a Release com os arquivos para download. Envios sem mudança de versão (ex.: só a base de dados) apenas atualizam o site.
- O workflow também cria no GitHub as tags das versões anteriores. Se o GitHub recusar alguma (restrição de segurança para commits com automações diferentes), ele só avisa e segue com a publicação.

## [0.4.1] — 2026-11-18

### Adicionado
- **Processo de publicação com 3 pacotes** (`npm run release`), gerados em `releases/vX.Y.Z/`:
  - **Source**: todos os arquivos do projeto, incluindo o contexto do Claude (`CLAUDE.md`) e o histórico de versões.
  - **Dist**: só o necessário para usar o app. Vem com `abrir.bat`, que abre o app **sem instalar nada** (usa o PowerShell do Windows), e um `LEIA-ME.txt`.
  - **Mobile**: gerado só quando há arquivos que precisam ir para o celular. Hoje não há (o app é instalado pelo endereço publicado), e isso fica registrado no `RELEASE.txt`.
  - `RELEASE.txt` com tamanho e SHA-256 de cada pacote, e `NOTES.md` com as novidades da versão.
- `CLAUDE.md`: contexto do projeto, regras, decisões e roteiro, para qualquer sessão do Claude continuar de onde paramos.
- Workflow `release.yml`: ao enviar uma tag `vX.Y.Z` para o GitHub, gera os pacotes e anexa à Release da versão.

## [0.4.0] — 2026-11-18

### Adicionado
- **App instalável (PWA)**: depois de publicado, dá para instalar no celular e no computador.
  - **iPhone**: Safari → Compartilhar → “Adicionar à Tela de Início”.
  - **Android**: Chrome → ⋮ → “Instalar app”.
  - Abre em tela cheia, com ícone próprio, e **funciona sem internet** (os arquivos do app ficam guardados no aparelho; a base de dados continua sendo atualizada a cada abertura quando há conexão).
- Ícones do app (tela inicial, favicon e ícone adaptável do Android).
- Aviso **“Nova versão do app disponível → Atualizar”** quando uma versão nova é publicada.
- Configurações → **“Instalar no celular ou computador”**, com botão de instalação (quando o navegador permite) e instruções para iPhone e Android.
- Ajustes de layout para a área do entalhe/barra de gestos em celulares com o app instalado.

### Alterado
- O modo normal e o modo dev (`iniciar.bat dev`) agora usam a **mesma porta (4173)**, então a coleção salva no navegador é a mesma nos dois modos.

## [0.3.0] — 2026-11-18

### Adicionado
- **Itens extras além dos photocards**, organizados em categorias:
  - 📦 **Itens do álbum**: postcards, mini pôsteres, ID photos, photo boards, 4-cuts, stickers…
  - 🛍️ **Benefícios de loja (POB)**: Target, Soundwave, Aladin, Withmuu, Barnes & Noble, Tower Records, HMV…
  - 🍀 **Lucky draws**
  - 🏪 **Pop-up stores**: itens das pop-ups oficiais (HOP, KARMA, DO IT, THIS & THAT…)
  - 🎤 **Eventos e merch** (categoria pronta para uso futuro)
- **Seletor do que mostrar**: por padrão o app mostra **só photocards**. Os chips “Mostrar” no topo da página inicial e de cada álbum incluem ou removem categorias, com a quantidade de itens de cada uma. A escolha vale para o app todo (progresso, “Minha coleção”) e fica salva. Em Configurações → “O que mostrar” há atalhos “Só photocards” e “Mostrar tudo”.
- “Minha coleção” mostra o progresso por categoria quando há mais de uma visível.
- Miniaturas no formato do item: horizontal para postcards, vertical para pôsteres e quadrado para stickers. Itens que não são photocards mostram o tipo no canto.
- Base de dados `2026.11.18.2`: 315 itens extras em 18 lançamentos. Os itens ainda não confirmados têm “(a confirmar)” na descrição.

### Alterado
- O set “Target exclusivo” virou a categoria POB (o ID dos cards não mudou, então as marcações continuam).

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
