# TDD - Coup Master 3D

Documento tecnico do modo 3D do Coup Master.

| Campo | Valor |
| --- | --- |
| Projeto | Coup Master 3D |
| Documento | Technical Design Document |
| Status | MVP local em desenvolvimento |
| Runtime | Browser |
| Renderizacao | Three.js/WebGL |
| Fisica | Rapier 3D |
| Entrada | Pointer/mouse, touchscreen, teclado e OrbitControls |

## 1. Visao Tecnica

O modo 3D e uma aplicacao browser-first baseada em `index.html`, `css/three-board.css` e `js/three/app.js`.

O foco atual e manter uma mesa local funcional e iteravel. A arquitetura ainda esta concentrada em um unico arquivo JavaScript grande, mas as responsabilidades internas ja estao separadas por funcoes e comentarios. A modularizacao deve acontecer quando o comportamento estabilizar.

## 2. Arquivos Principais

```txt
Coup-Master/
|-- index.html
|-- css/
|   `-- three-board.css
|-- js/
|   |-- firebase/
|   |   |-- auth-service.js
|   |   |-- firebase-config.js
|   |   |-- login-page.js
|   |   |-- lobby-page.js
|   |   `-- room-service.js
|   `-- three/
|       |-- boot.js
|       `-- app.js
|-- assets/
|   |-- img/
|   |   |-- cards/
|   |   |-- coins/
|   |   |-- guides/
|   |   |-- icons/
|   |   `-- logo/
|   `-- sounds/
|       |-- soundtrack/
|       `-- vfx/
|-- docs/
|   |-- GDD.md
|   `-- TDD.md
|-- AGENTS.md
`-- README.md
```

Pastas antigas do modo 2D ou materiais nao usados no 3D podem ser removidas quando nao interferirem no modo 3D.

## 3. Stack

| Area | Tecnologia | Uso |
| --- | --- | --- |
| HTML | `index.html` | Estrutura da tela, HUD, modais, audio e import map |
| CSS | `css/three-board.css` | HUD, botoes, modais, responsividade e canvas |
| Renderizacao | Three.js | Cena, camera, luzes, mesa e meshes |
| Controles | OrbitControls | Rotacao, zoom e pan |
| Fisica | Rapier 3D | Corpos, colliders, moedas, cartas, pilhas, extras e deck |
| Online | Firebase Auth + Realtime Database | Login Google/anonimo, lobby e presenca de jogadores |
| PWA | Web App Manifest + Service Worker | Instalacao standalone e cache do shell local |
| Assets | PNG/SVG/canvas/audio | Cartas, moedas, icones, guias, sons e dado procedural |

## 3.1 Base Online

A base online fica isolada em `js/firebase/` para manter `js/three/app.js` focado na mesa 3D.

Arquivos:

- `login.html`: tela inicial com login Google e visitante anonimo.
- `lobby.html`: cria sala curta ou entra em sala existente e redireciona direto para a mesa casual.
- `js/firebase/firebase-config.js`: inicializa Firebase App, Auth e Realtime Database.
- `js/firebase/auth-service.js`: login, logout, observacao de sessao e guard de autenticacao.
- `js/firebase/room-service.js`: criacao de sala, entrada de jogador, remocao pelo host, assentos, assinatura de jogadores, snapshots de mesa, eventos discretos de mesa e pedidos de espectador.
- `js/three/boot.js`: valida login e sala antes de importar `app.js`, mantendo `index.html` em estado de carregamento ate o estado inicial ficar pronto.

Estrutura inicial no Realtime Database:

```txt
rooms/{roomCode}
|-- code
|-- createdAt
|-- createdBy
|-- status
|-- players/{uid}
|   |-- uid
|   |-- displayName
|   |-- photoURL
|   |-- connected
|   |-- seat
|   |-- joinedAt
|   `-- lastSeen
|-- seats/{seat}
|-- tableState
|   |-- version
|   |-- syncRevision
|   |-- deckConfig
|   |-- deck
|   |-- deckTransform
|   |-- players
|   |   |-- id
|   |   |-- coinCount
|   |   `-- cards
|   |-- tableCards
|   |-- cards
|   |-- objects
|   |-- stacks
|   |-- updatedAt
|   `-- updatedBy
|-- tableActions/{actionId}
|   |-- id
|   |-- type
|   |-- payload
|   |-- actorUid
|   |-- actorSeat
|   |-- createdAt
|   `-- serverCreatedAt
|-- chatMessages/{messageId}
|   |-- id
|   |-- type
|   |-- text
|   |-- actorUid
|   |-- actorName
|   |-- actorSeat
|   |-- createdAt
|   `-- serverCreatedAt
`-- spectatorRequests/{requestId}
    |-- requesterUid
    |-- targetUid
    |-- targetSeat
    |-- status
    |-- createdAt
    `-- respondedAt
```

A lista de jogadores com assento reservado define os badges, a lista textual do HUD e o assento local. Fechar ou minimizar a aba nao libera o slot; apenas a remocao explicita feita pelo host libera o assento em `rooms/{roomCode}/seats/{seat}` e remove `rooms/{roomCode}/players/{uid}`. A ordem de alocacao prioriza lados opostos da mesa, mas nao rebalanceia jogadores ja assentados para preservar o dono das cartas e o estado da partida.

O lobby casual nao segura jogadores em uma sala de espera; criar ou entrar em sala abre `index.html?room=CODIGO`. A mesa casual sincroniza snapshots finais via `tableState` usando transacoes do Realtime Database e usa `tableActions` para animacoes deterministicas de compra simples, distribuicao inicial e devolucao animada ao deck. Drag livre ainda nao transmite posicoes intermediarias.

Cada publicacao informa o snapshot-base conhecido pelo cliente. `room-service.js` executa `runTransaction()` e usa `table-state-merge.mjs` para fazer uma mesclagem de tres vias entre base, alteracao local e estado remoto atual. Cartas, objetos e pilhas sao mesclados por ID, e os contadores manuais de moedas sao combinados por diferenca. Assim, duas acoes simultaneas sobre entidades diferentes nao se apagam por uma gravacao de snapshot atrasada.

O contador manual de moedas exibido na lista de jogadores fica em `tableState.players[].coinCount`. Ele e separado dos objetos fisicos de moeda em `tableState.objects`, pois serve como anotacao rapida de mesa para partidas casuais.

O chat casual usa `chatMessages` com limite de leitura das ultimas mensagens. O `boot.js` assina esse caminho e entrega os dados para o HUD; o envio tambem passa por `room-service.js` para manter Firebase fora da renderizacao 3D.

## 3.2 PWA

A distribuicao instalavel usa:

- `manifest.webmanifest`: nome `Coup Master`, tema escuro, `start_url` no login e `display: standalone`;
- `service-worker.js`: navegacao network-first e cache stale-while-revalidate para assets locais;
- `js/pwa.js`: registro do service worker, prompt de instalacao e orientacao para iOS;
- icones `192x192` e `512x512` em `assets/img/logo/`.

O service worker nao transforma o multiplayer em modo offline. Firebase Authentication, Realtime Database e dependencias externas continuam exigindo rede. `CACHE_VERSION` deve mudar quando for necessario invalidar imediatamente arquivos precacheados.

## 4. Estado Local

O estado principal vive no objeto `state`:

- `activePlayer`;
- `viewPlayer`;
- `deck`;
- `tableCards`;
- `players`, incluindo cartas por assento e contador manual `coinCount`.

O runtime visual/fisico vive no objeto `app`:

- renderer, scene, camera e controls;
- world Rapier;
- deck mesh/body/rim;
- mapas de cards e objects;
- badges de jogadores;
- pilhas de mesa;
- zonas de drop;
- estados de hover, drag, camera focus, audio e animacoes.
- `tableSyncSuppressCount` para adiar snapshots finais enquanto uma animacao discreta esta rodando;
- `appliedTableActions` para deduplicar eventos discretos recebidos pela rede.

A cena Three.js nao deve ser a unica fonte de verdade. Sempre que uma carta, deck, objeto ou pilha muda, atualizar tambem o estado JS correspondente.

## 5. Convencoes De Codigo

### Nomes

Usar nomes simples, claros e em ingles para funcoes, variaveis e estruturas novas.

Exemplos bons:

```js
drawCardToPlayer();
flipCard();
flipTableStack();
shuffleDeck();
shuffleTableStack();
createDeck();
createDropZones();
updateHud();
syncPhysicsMeshes();
returnCardToDeck();
```

Evitar criar novas funcoes em portugues. O codigo deve usar ingles como padrao universal do projeto.

### Comentarios

Cada funcao relevante deve ter um comentario curto imediatamente acima explicando o que ela faz. O comentario pode estar em portugues, pois serve como orientacao rapida para quem esta lendo o projeto.

Exemplo:

```js
// Vira todas as cartas de uma pilha como uma unica orientacao de grupo.
function flipTableStack(stack) {
  // ...
}
```

Nao comentar obviedades linha a linha. Comentar intencao, regra de jogo, fluxo ou decisao tecnica.

## 6. Sistemas Atuais

### 6.1 Inicializacao

Fluxo:

```txt
RAPIER.init()
-> init()
-> resetMvp()
-> animate()
```

`init()` configura renderer, cena, camera, controles, fisica, luzes, mesa, deck, zonas, HUD, audio, modais e eventos.

### 6.2 Mesa

`createTable()` cria:

- base octogonal visual;
- feltro;
- area central octogonal;
- fundo/limbo;
- collider fisico do tampo.

`createBoundaries()` cria bordas fisicas invisiveis baixas para evitar apoio invisivel nos cantos.

`createPlayerBadges()` cria os nomes e avatares flutuantes de cada jogador. Esses badges ficam fora da fisica, usam texturas de canvas quando nao existe foto real, e acompanham a camera via billboard.

### 6.3 Deck

`createDeck()` cria hitbox fisico/selecionavel e camadas visuais de cartas empilhadas.

Responsabilidades:

- collider estavel para objetos;
- visual limitado a ate 8 cartas empilhadas;
- compra por clique;
- arrasto rapido de carta do topo;
- arrasto longo do deck inteiro;
- slot de retorno quando o deck esta vazio;
- auto-shuffle interno quando cartas ou pilhas fechadas entram;
- retorno ao centro no reset.
- eventos discretos de compra simples para outros clientes reproduzirem a animacao localmente.

A animacao de giro do deck ao embaralhar esta desativada temporariamente. `shuffle.mp3` nao deve tocar no retorno de carta ao deck.

### 6.4 Cartas

Cartas usam geometria customizada com cantos arredondados.

Responsabilidades:

- materiais separados para frente, verso e lateral;
- textura correta;
- corpo Rapier;
- collider fino;
- hover/tooltip;
- drag;
- flip animado;
- giro com `Q`/`E`;
- agrupamento em pilhas;
- retorno animado ao deck.
- devolucao animada ao deck publicada como evento discreto quando acontece por duplo clique.

### 6.5 Pilhas

`tableStacks` representa grupos de cartas na mesa.

Regras:

- pilhas guardam `id`, `faceUp`, `cards`, `position` e `rotationY`;
- carta so entra em pilha com mesma orientacao de face;
- pilha compativel pode se unir a outra pilha compativel;
- pilha pode ser arrastada;
- pilha pode ser embaralhada;
- pilha pode ser virada em grupo;
- pilha pode ser girada;
- pilha fechada pode voltar ao deck;
- pilha aberta nao deve entrar no deck;
- tooltip de pilha aberta resume personagens por contagem.

### 6.6 Objetos

`app.objects` guarda moedas, extras e dado.

Moedas:

- ouro;
- prata;
- texturas em `assets/img/coins`;
- fisica de cilindro;
- arrastaveis;
- removiveis com `Delete`/`Backspace`;
- SFX `falling-coin` ao criar.

Cartas especiais:

- `asilo`, com frente e verso em `assets/img/cards/religion`;
- `religiao`, com frente catolica e verso protestante;
- dimensoes especificas por tipo;
- flip, drag, giro e delete como objetos extras.

Dado:

- cubo fisico;
- faces procedurais em canvas;
- rolagem por impulso;
- botoes ocultos no HUD atual.

### 6.7 Audio

Audios DOM em `index.html`:

- BGM em `assets/sounds/soundtrack/bgm.mp3`;
- reset em `assets/sounds/vfx/reset-game.mp3`.

VFX carregados por demanda:

- `card-whoosh`;
- `falling-coin`;
- outros arquivos de `assets/sounds/vfx` podem ser usados futuramente.

Controles:

- botao de musica muta/desmuta;
- slider de musica altera BGM;
- slider de SFX altera efeitos;
- audio depende de interacao do usuario para iniciar no browser.

## 7. Entrada E Interacao

Eventos principais:

- `pointerdown`;
- `pointermove`;
- `pointerup`;
- `dblclick`;
- `keydown`.

Estados de drag:

- `card`;
- `object`;
- `deck`;
- `stack`.

Hover:

- usa raycaster;
- cria outline branca;
- mostra tooltip;
- seleciona automaticamente objeto/carta/pilha/deck para atalhos.

Touch:

- um dedo pode rotacionar camera via OrbitControls;
- dois dedos podem mover/pan quando suportado pelo controle;
- arrastar direto funciona para objetos;
- botoes inferiores devem cobrir comandos sem teclado.

## 8. Atalhos E Botoes Equivalentes

| Tecla/Botao | Funcao |
| --- | --- |
| `F` / `flip.svg` | Vira carta, pilha ou extra sob hover/selecao |
| `C` / `chat.svg` | Abre o chat da sala |
| `Q` / `arrow.svg` esquerda | Gira objeto selecionado para a esquerda |
| `E` / `arrow.svg` direita | Gira objeto selecionado para a direita |
| `R` | Embaralha deck ou pilha sob hover |
| `Alt` | Renderiza inspecao ampliada do objeto sob hover |
| `Delete` / `Backspace` / `delete.svg` | Remove objeto selecionado |
| `Space` / `focus.svg` | Reposiciona camera para o jogador ativo com animacao |

## 9. Controles De Camera

| Acao | Controle |
| --- | --- |
| Rotacao | OrbitControls |
| Pan | Botao do meio / clique no scroll |
| Zoom | Scroll |
| Foco | `Space` ou botao de foco |
| Tela cheia | Botao de fullscreen |

O pan nao deve depender do botao direito. Quando um objeto esta sendo arrastado, os controles de camera devem ser desabilitados temporariamente.

## 10. Fisica

Principios:

- Fisica deve ser previsivel, nao necessariamente hiper-realista.
- Evitar colliders invisiveis altos perto das bordas.
- Evitar sensores presos apos drag.
- Durante drag, objetos podem virar sensor para nao empurrar pilhas violentamente.
- Ao soltar, sensor deve ser desligado e corpo deve voltar para `Dynamic`.
- Objetos que caem no limbo devem voltar ao centro.

Decisao atual:

- O tampo fisico usa collider estavel para cobrir a mesa util.
- As paredes invisiveis sao baixas para nao criarem prateleiras nas bordas.
- Correcoes que reposicionam objetos a cada frame perto da mesa devem ser evitadas, pois causam tremor.

## 11. HUD E DOM

`index.html` define:

- tela de carregamento inicial (`bootLoadingOverlay`);
- botao de reset no topo esquerdo;
- lista textual de jogadores abaixo da barra superior direita;
- status acima da barra inferior;
- `topActions`/barra superior direita com utilidades;
- `quick-actions` na parte inferior;
- modais de configuracao, regras de personagens e regras alternativas;
- tooltip de hover;
- audio.

`css/three-board.css` define layout fixo/responsivo da HUD, botoes quadrados por icone, modais e bloqueio de selecao de texto.

Os botoes inferiores devem manter proporcao quadrada semelhante aos botoes superiores. Icones SVG devem ser brancos e com fundo transparente.

As barras de HUD nao devem usar sombra externa. Os icones do HUD devem evitar filtros de inversao quando o SVG ja possui cor clara, pois navegadores mobile com alto contraste podem inverter o resultado e deixar os icones escuros.

Perfis de jogador podem ser atualizados por `window.CoupMaster3D.setPlayerProfile(playerId, { displayName, photoURL })`. O `boot.js` usa esse gancho para refletir a lista online nos badges locais e na lista textual do HUD sem acoplar Firebase ao render 3D.

A lista textual tambem mostra o contador manual de moedas de cada assento reservado no formato `Nome - valor +`. Os botoes `-` e `+` sao circulares, usam destaque amarelo, nao permitem valor negativo e chamam `scheduleTableSync()` para publicar o novo `coinCount`.

O modal de jogador exibe nome, slot, status e perfil. Apenas o host recebe a acao de remover outro jogador da sala; jogadores comuns podem abrir o modal apenas para consulta.

O assento ativo local vem de `window.CoupMaster3DOnline.playerSeat`. O seletor manual P1-P8 foi removido para impedir troca de visao entre maos, mas o drag/drop fisico em slots de outros jogadores continua permitido.

`viewPlayer` pode ser diferente de `activePlayer` quando o modo espectador e aceito. Essa diferenca controla quais cartas privadas podem revelar textura localmente.

## 12. Assets

Pastas relevantes:

- `assets/img/cards/base`: cartas de personagem.
- `assets/img/cards/religion`: cartas de asilo e religiao.
- `assets/img/coins`: texturas de moedas.
- `assets/img/icons`: icones da HUD.
- `assets/img/guides`: imagens de regras/modais, incluindo `alternative-rules1.png` a `alternative-rules5.png`.
- `assets/sounds/soundtrack`: BGM.
- `assets/sounds/vfx`: efeitos sonoros.

Evitar hardcode de caminhos novos quando ja houver constantes de assets no JS.

## 13. Performance

Boas praticas:

- Reutilizar texturas via cache em `app.textures`.
- Reutilizar materiais quando possivel.
- Evitar criar geometrias dentro do loop `animate()`.
- Manter raycast restrito a objetos interativos.
- Evitar recriar colliders com frequencia, exceto quando deck muda de posicao ou tamanho visual.

## 14. Modularizacao Futura

Quando `js/three/app.js` ficar estavel, dividir em modulos:

```txt
js/three/
|-- app.js
|-- scene.js
|-- table.js
|-- deck.js
|-- cards.js
|-- stacks.js
|-- objects.js
|-- input.js
|-- camera.js
|-- physics.js
|-- audio.js
`-- hud.js
```

Essa divisao deve ser feita com testes manuais a cada etapa, porque muitos comportamentos dependem da interacao entre Three.js, Rapier e DOM.

## 15. Sincronizacao Casual

Multiplayer completo autoritativo ainda nao faz parte do MVP. A base Firebase atual sincroniza autenticacao, lobby, sala, lista de jogadores com assento reservado, presenca informativa, snapshots finais da mesa casual, eventos discretos de animacao e pedidos de espectador.

O snapshot atual inclui:

- configuracao e conteudo do deck;
- posicao/rotacao do deck;
- cartas em maos, mesa e pilhas;
- posicao/rotacao final de cartas soltas;
- moedas, dado e extras;
- pilhas e ordem das cartas;
- reset e distribuicao inicial como novo estado final.

`tableActions` publica eventos pequenos, deduplicados por ID, para acoes que possuem um gatilho claro e uma animacao previsivel:

- `draw-card`: clique simples no deck compra uma carta para um slot.
- `deal-initial-hands`: distribuicao inicial usa uma fila fixa de cartas e assentos.
- `return-card-to-deck`: duplo clique em carta fechada executa devolucao animada ao deck.

Enquanto uma acao discreta esta rodando, `tableSyncSuppressCount` adia a publicacao do `tableState`. Ao fim da animacao, o snapshot final e publicado como garantia para quem perdeu o evento, entrou depois ou ficou com estado divergente.

As gravacoes de `tableState` usam transacoes e mesclagem de tres vias:

- entidades independentes sao preservadas por ID quando dois clientes agem ao mesmo tempo;
- IDs de objetos compartilhados incluem cliente, horario e aleatoriedade para evitar colisoes;
- incrementos simultaneos do contador manual de moedas sao somados por delta;
- duas compras simultaneas do mesmo topo reservam cartas distintas na ordem restante do deck;
- cada cliente serializa suas gravacoes e recompoe a proxima carga sobre a ultima transacao confirmada;
- snapshots remotos recebidos durante drag ou gravacao local ficam pendentes ate a interacao terminar;
- `syncRevision` identifica a progressao dos estados confirmados.

Conflitos sobre o mesmo objeto continuam seguindo a ultima transacao confirmada, pois uma carta ou moeda nao pode terminar em duas posicoes ao mesmo tempo.

Nao sincronizar cada frame do drag nesta etapa. A intencao e que o outro jogador receba a posicao final quando a acao manual termina, mesmo que isso ainda pareca um teleporte visual.

### 15.1 Modo Espectador

Pedidos de espectador ficam em `rooms/{roomCode}/spectatorRequests`. O jogador alvo recebe um modal para aceitar ou recusar. Quando aceito, o solicitante altera apenas `viewPlayer`, sem mudar `activePlayer`; isso permite ver a mao autorizada sem trocar o assento real nem publicar mudancas indevidas.

## 16. Criterios De Aceite Tecnicos

Antes de finalizar uma mudanca relevante:

- `node --check js/three/app.js` deve passar quando JS for alterado.
- `node --check js/three/boot.js` deve passar quando o fluxo online da mesa for alterado.
- `node --check js/firebase/room-service.js` deve passar quando servicos Firebase forem alterados.
- `http://127.0.0.1:4173/index.html` deve carregar.
- Console do navegador nao deve mostrar erro fatal.
- Mudancas visuais devem ser verificadas no navegador quando possivel.
- Mudancas de fisica devem ser testadas com cartas, moedas, pilhas e deck.

## 17. Riscos Atuais

| Risco | Cuidado |
| --- | --- |
| `app.js` grande | Evitar refatorar junto com bugfix pequeno. |
| Fisica instavel | Preferir ajustes pequenos e testados. |
| Hover e drag interdependentes | Testar atalhos apos mexer em selecao. |
| Deck como hitbox + visual em camadas | Manter collider, slot vazio e camadas sincronizados. |
| Pilhas | Sempre atualizar `stack.faceUp`, `card.data.stackId` e layout. |
| Audio | Browser pode bloquear autoplay; iniciar BGM apos interacao. |
