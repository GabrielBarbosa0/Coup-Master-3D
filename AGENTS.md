# AGENTS.md - Instrucoes Para O Codex

Este arquivo orienta o trabalho no repositorio Coup Master.

O foco atual e uma mesa de cartas **2.5D em Three.js/WebGL**, com apresentacao inspirada em jogos de cartas
estilizados. A antiga direcao de sandbox fisico semelhante ao Tabletop Simulator foi encerrada.

## 1. Documentos Obrigatorios

Antes de mudancas grandes, leia:

- `docs/GDD.md`;
- `docs/TDD.md`;
- `README.md`;
- este `AGENTS.md`.

## 2. Objetivo Atual

Na branch `balatro-style`:

- `login.html` e a entrada de autenticacao;
- `lobby.html` e o menu principal;
- Jogar abre criacao ou entrada em sala num modal;
- `index.html` abre a partida autenticada;
- o fundo base usa `#171d26`;
- tipografia pixelada e botoes elevados formam a linguagem visual;
- o titulo Coup Master e o unico uso normal da fonte Tilda Script.

A partida deve preservar:

- oito slots de jogador;
- nome, avatar, assento, moedas e religiao por slot;
- deck, asilo e cemiterio;
- hover com tilt e outline;
- clique, selecao, flip, giro e arraste;
- Pointer Events para mouse, toque e caneta;
- camera ortografica fixa;
- layouts proprios para paisagem e retrato;
- chat, audio, modais, espectador e ferramentas do host;
- sincronizacao Firebase por snapshots finais e acoes discretas.

## 3. Arquivos Principais

- `index.html`;
- `login.html`;
- `lobby.html`;
- `manifest.webmanifest`;
- `service-worker.js`;
- `js/pwa.js`;
- `css/online.css`;
- `css/three-board.css`;
- `js/three/app.js`;
- `js/three/boot.js`;
- `js/three/config.js`;
- `js/three/dom.js`;
- `docs/GDD.md`;
- `docs/TDD.md`.

Nao recrie a mesa octogonal, a fisica Rapier ou pastas antigas do modo 2D.

## 4. Escopo Do MVP

Dentro do escopo:

- melhorar leitura e composicao do tabuleiro;
- melhorar interacao de cartas;
- melhorar responsividade;
- melhorar HUD e modais;
- preservar o fluxo online;
- documentar decisoes;
- manter estado logico separado da cena.

Fora do escopo, salvo pedido explicito:

- fisica de mesa;
- camera orbitavel;
- pilhas fisicas livres;
- moedas fisicas soltas;
- ranqueado;
- matchmaking;
- loja;
- backend autoritativo;
- bots inteligentes;
- automacao completa das regras.

## 5. Convencoes De Codigo

### Identificadores

Novas funcoes, variaveis e estruturas usam ingles:

```js
createDeck();
drawCardToPlayer();
layoutPlayerCard();
flipSelectedCard();
scheduleTableSync();
updateHud();
```

### Comentarios

Cada funcao relevante deve ter um comentario curto acima explicando responsabilidade ou intencao.

### Mudancas

- faca mudancas pequenas e focadas;
- preserve alteracoes nao relacionadas do usuario;
- use `apply_patch` para edicoes manuais;
- use `rg` para procurar arquivos e texto;
- nao reverta arquivos sujos sem pedido.

## 6. Padroes Three.js

- estado de jogo nao deve viver em meshes;
- use `userData` apenas para ligar objetos visuais a IDs ou acoes;
- limite raycast a `app.interactives`;
- reutilize texturas em cache;
- nao crie geometria ou material dentro de `animate()`;
- use camera ortografica fixa;
- menus e textos longos permanecem no DOM;
- capture o ponteiro durante drag;
- respeite `prefers-reduced-motion` no CSS;
- trate resize e mudanca entre paisagem/retrato.

Nao adicionar:

- OrbitControls;
- Rapier;
- rigid bodies;
- colliders;
- gravidade;
- correcao de objetos por frame.

## 7. Interacao Esperada

| Acao | Controle |
| --- | --- |
| Comprar | Clique no deck ou botao Comprar |
| Arrastar | Pressionar e mover carta |
| Selecionar | Clique na carta |
| Virar | `F` ou botao de flip |
| Girar | `Q` / `E` ou botoes |
| Remover | `Delete` / `Backspace` ou botao |
| Chat | `C` ou botao |
| Moedas | `-` e `+` dentro do slot |
| Religiao | Clique no emblema do slot |

Ao soltar uma carta:

- sobre um slot, ela passa a pertencer ao assento;
- no cemiterio, fica publica;
- no deck, so retorna se estiver fechada;
- fora de uma area valida, volta ao destino anterior.

## 8. Sincronizacao

Preservar:

- `window.CoupMaster3D` como contrato do `boot.js`;
- `tableState.version` atual;
- compra atomica por `drawRoomCard()`;
- merge de tres vias por `table-state-merge.mjs`;
- IDs unicos por entidade;
- snapshots remotos pendentes durante drag/publicacao;
- privacidade da mao local e do espectador autorizado;
- ausencia de sincronizacao frame a frame.

## 9. HUD E Audio

HUD:

- sair, reset e status no topo esquerdo;
- acoes de carta no topo central;
- utilidades no topo direito;
- chat e historico na lateral;
- perfis, moedas e religiao dentro dos slots WebGL;
- tela de carregamento ate validacao de login e sala.

Audio:

- `bgm.mp3`;
- `card-whoosh.mp3`;
- `falling-coin.mp3`;
- `reset-game.mp3`;
- sliders no modal de configuracoes.

## 10. Verificacao

Antes de finalizar JS:

```powershell
node --check js\three\app.js
node --check js\three\boot.js
node --check js\three\config.js
node --check js\three\dom.js
node --check service-worker.js
```

Para mudancas visuais:

```txt
http://127.0.0.1:4173/index.html
```

Validar:

- desktop;
- mobile horizontal;
- mobile vertical;
- compra;
- hover/tilt;
- arraste;
- flip;
- contador;
- console;
- ausencia de scroll.

Para PWA:

- validar `manifest.webmanifest`;
- validar `service-worker.js` e `js/pwa.js`;
- incrementar `CACHE_VERSION` quando o shell mudar;
- confirmar todos os arquivos do `APP_SHELL`.

## 11. Commits

Use commits pequenos e descritivos. Quando o usuario pedir para subir:

1. `git status --short --branch`;
2. revisar diff;
3. rodar checagens;
4. `git add`;
5. `git commit`;
6. `git push`.

## 12. Resposta Ao Usuario

Responder em portugues e de forma direta:

- dizer o que mudou;
- citar os arquivos principais;
- informar checagens;
- avisar o que nao foi testado.
