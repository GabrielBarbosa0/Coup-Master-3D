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

O modo 3D e uma aplicacao browser-first baseada em `3d.html`, `css/three-board.css` e `js/three/app.js`.

O foco atual e manter uma mesa local funcional e iteravel. A arquitetura ainda esta concentrada em um unico arquivo JavaScript grande, mas as responsabilidades internas ja estao separadas por funcoes e comentarios. A modularizacao deve acontecer quando o comportamento estabilizar.

## 2. Arquivos Principais

```txt
Coup-Master/
|-- 3d.html
|-- css/
|   `-- three-board.css
|-- js/
|   `-- three/
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
| HTML | `3d.html` | Estrutura da tela, HUD, modais, audio e import map |
| CSS | `css/three-board.css` | HUD, botoes, modais, responsividade e canvas |
| Renderizacao | Three.js | Cena, camera, luzes, mesa e meshes |
| Controles | OrbitControls | Rotacao, zoom e pan |
| Fisica | Rapier 3D | Corpos, colliders, moedas, cartas, pilhas, extras e deck |
| Assets | PNG/SVG/canvas/audio | Cartas, moedas, icones, guias, sons e dado procedural |

## 4. Estado Local

O estado principal vive no objeto `state`:

- `activePlayer`;
- `deck`;
- `tableCards`;
- `players`.

O runtime visual/fisico vive no objeto `app`:

- renderer, scene, camera e controls;
- world Rapier;
- deck mesh/body/rim;
- mapas de cards e objects;
- badges de jogadores;
- pilhas de mesa;
- zonas de drop;
- estados de hover, drag, camera focus, audio e animacoes.

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

Audios DOM em `3d.html`:

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
| `Q` / `arrow.svg` esquerda | Gira objeto selecionado para a esquerda |
| `E` / `arrow.svg` direita | Gira objeto selecionado para a direita |
| `R` | Embaralha deck ou pilha sob hover |
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

`3d.html` define:

- botao de reset no topo esquerdo;
- status abaixo da barra superior direita;
- `playerTabs` na lateral esquerda;
- `topActions`/barra superior direita com utilidades;
- `quick-actions` na parte inferior;
- modais de configuracao, regras de personagens e regras alternativas;
- tooltip de hover;
- audio.

`css/three-board.css` define layout fixo/responsivo da HUD, botoes quadrados por icone, modais e bloqueio de selecao de texto.

Os botoes inferiores devem manter proporcao quadrada semelhante aos botoes superiores. Icones SVG devem ser brancos e com fundo transparente.

Perfis de jogador podem ser atualizados por `window.CoupMaster3D.setPlayerProfile(playerId, { displayName, photoURL })`, mantendo a futura integracao com Google Auth isolada do sistema visual.

## 12. Assets

Pastas relevantes:

- `assets/img/cards/base`: cartas de personagem.
- `assets/img/cards/religion`: cartas de asilo e religiao.
- `assets/img/coins`: texturas de moedas.
- `assets/img/icons`: icones da HUD.
- `assets/img/guides`: imagens de regras/modais.
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

## 15. Sincronizacao Futura

Multiplayer ainda nao faz parte do MVP local.

Quando for implementado, sincronizar eventos discretos:

- carta comprada;
- carta devolvida ao deck;
- carta/pilha virada;
- carta/pilha girada;
- pilhas agrupadas;
- deck/pilha embaralhado;
- objeto criado/removido;
- posicao final ao soltar;
- reset;
- distribuicao inicial.

Evitar sincronizar cada frame do drag sem throttle.

## 16. Criterios De Aceite Tecnicos

Antes de finalizar uma mudanca relevante:

- `node --check js/three/app.js` deve passar quando JS for alterado.
- `http://127.0.0.1:4173/3d.html` deve carregar.
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
