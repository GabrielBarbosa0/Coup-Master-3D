# TDD - Coup Master

Documento técnico da mesa 2.5D do Coup Master.

| Campo | Valor |
| --- | --- |
| Runtime | Browser |
| Renderização | Three.js/WebGL |
| Câmera | Ortográfica fixa |
| Física | Não utilizada |
| Entrada | Pointer Events, mouse, toque e teclado |
| Online | Firebase Auth + Realtime Database |

## 1. Visão Técnica

`index.html`, `css/three-board.css` e `js/three/app.js` formam a partida. O runtime usa Three.js para tabuleiro,
slots, cartas e textos curtos. Modais, áudio e controles de utilidade permanecem no DOM.

O estado lógico não vive nas meshes. `state` guarda deck, jogadores, moedas, religião e cartas; `app` guarda renderer,
câmera, raycaster, animações e referências visuais.

Não existem OrbitControls, Rapier, rigid bodies, colliders ou correções de física por frame.

## 2. Arquivos Principais

```txt
index.html
css/three-board.css
js/three/
|-- boot.js
|-- app.js
|-- config.js
`-- dom.js
js/firebase/
|-- auth-service.js
|-- room-service.js
`-- table-state-merge.mjs
```

## 3. Inicialização

1. `boot.js` exige autenticação.
2. Valida o código e a existência da sala.
3. Reserva ou recupera o assento.
4. Importa `app.js`.
5. Lê ou cria `tableState`.
6. Assina jogadores, chat, ações, espectador e snapshots.
7. Remove a tela de carregamento.

`window.CoupMaster3D` mantém o contrato usado pelo boot:

- `getTableState`;
- `applyTableState`;
- `receiveTableState`;
- `applyTableAction`;
- `setAdminRole`;
- `setLocalPlayerSeat`;
- `setOnlinePlayerProfiles`;
- `setPlayerProfile`;
- `setChatMessages`;
- `showSpectatorRequest`;
- `showSpectatorResponse`;
- `startSpectatingPlayer`.

## 4. Cena WebGL

### Renderer

- `WebGLRenderer` com antialias;
- pixel ratio limitado a 2;
- `SRGBColorSpace`;
- canvas em tela cheia com `touch-action: none`.

### Câmera

- `OrthographicCamera`;
- sem zoom, pan ou rotação do usuário;
- paisagem usa área lógica `16 x 9`;
- retrato usa área lógica `9 x 16`;
- o resize preserva a área inteira sem gerar scroll.

### Layout

Paisagem:

- quatro slots superiores e quatro inferiores;
- asilo, cemitério e deck no centro.

Retrato:

- duas colunas e quatro fileiras de slots;
- áreas centrais redimensionadas;
- grupos WebGL são reposicionados sem recriar texturas.

## 5. Cartas

Cada carta visual possui:

- `Group`;
- sombra arredondada;
- contorno;
- mesh frontal;
- mesh traseira rotacionada em `Math.PI`;
- posição e rotação alvo;
- tilt alvo;
- escala alvo;
- animação opcional de movimento.

As UVs da `ShapeGeometry` arredondada são normalizadas manualmente para mapear a textura inteira.

### Hover

O raycaster intersecta apenas `app.interactives`. A posição local da interseção define `targetTiltX` e
`targetTiltY`. A carta recebe elevação visual, escala e tooltip.

### Arraste

- `pointerdown` seleciona e captura o ponteiro;
- `pointermove` projeta o ray em um plano paralelo ao canvas;
- `pointerup` identifica slot, cemitério ou deck;
- o estado final é publicado após a soltura;
- a implementação é a mesma para mouse, toque e caneta.

## 6. Estado

Estrutura serializada:

```txt
tableState
|-- version: 2
|-- syncRevision
|-- deckConfig
|-- deck[]
|-- players[]
|   |-- id
|   |-- coinCount
|   `-- cards[]
|-- cards[]
|   |-- data
|   |-- position
|   `-- quaternion
|-- objects[]
`-- stacks[]
```

`objects` guarda estados simples identificados:

- `asylum-counter`;
- `religion-1` até `religion-8`.

`stacks` permanece vazio para compatibilidade com o merge existente.

## 7. Sincronização

`room-service.js` continua usando transações e `table-state-merge.mjs`.

- compras usam `drawRoomCard()` para reservar uma carta única;
- alterações locais são agrupadas por `scheduleTableSync()`;
- o snapshot-base conhecido é enviado para mesclagem de três vias;
- snapshots recebidos durante drag ou publicação ficam pendentes;
- `draw-card` pode ser publicado como evento visual discreto;
- posições intermediárias do drag não são transmitidas.

Snapshots antigos de versão 1 podem ser lidos; propriedades físicas são ignoradas.

## 8. Privacidade Das Cartas

Uma frente é exibida quando:

- a carta está aberta e no cemitério;
- pertence ao assento local;
- pertence ao assento autorizado pelo modo espectador.

Trocar o assento observado apenas atualiza a renderização local.

## 9. DOM E HUD

O DOM contém:

- carregamento;
- barras de ações;
- código da sala;
- modais;
- chat;
- áudio;
- tooltip.

Perfis, contadores e emblemas dos oito slots ficam no WebGL. Clicar no cabeçalho do slot abre o modal de jogador.

## 10. Assets

- cartas: `assets/img/cards/`;
- asilo e religião: `assets/img/cards/religion/`;
- ícones: `assets/img/icons/`;
- guias: `assets/img/guides/`;
- fontes: `assets/fonts/`;
- áudio: `assets/sounds/`.

Texturas são reutilizadas pelo `textureCache`. Geometrias e materiais não são criados dentro do loop de animação.

## 11. Performance

- raycast limitado a faces e hitboxes interativos;
- câmera fixa evita custo de controles;
- sem solver de física;
- sem sombras dinâmicas;
- canvas de texto atualizado apenas quando o valor muda;
- animações usam interpolação no único `requestAnimationFrame`.

## 12. Responsividade

- breakpoint de layout WebGL por proporção, não apenas largura CSS;
- abaixo de `0.75` de aspect ratio entra o layout retrato;
- HUD reduz botões em telas baixas;
- modais ocupam a altura disponível;
- página e canvas não possuem scroll;
- Pointer Events e captura de ponteiro evitam divergências entre navegadores mobile.

## 13. PWA

Ao mudar arquivos do shell:

- atualizar `CACHE_VERSION`;
- validar sintaxe do service worker;
- confirmar que os caminhos do `APP_SHELL` existem;
- recarregar após a ativação para evitar assets antigos em stale-while-revalidate.

## 14. Verificação

```powershell
node --check js\three\app.js
node --check js\three\boot.js
node --check js\three\config.js
node --check js\three\dom.js
node --check service-worker.js
```

Playtest visual:

- desktop `1280 x 720`;
- mobile horizontal;
- mobile vertical `390 x 844`;
- comprar uma carta;
- confirmar hover e tilt;
- arrastar para o cemitério;
- confirmar contador e ausência de scroll;
- abrir modais principais;
- verificar console sem erro fatal.

## 15. Riscos

| Risco | Cuidado |
| --- | --- |
| `app.js` ainda grande | Modularizar por cena, cartas, estado e UI depois de estabilizar contratos. |
| Conflito no mesmo card | Última transação confirmada define o destino final. |
| Cache PWA | Incrementar versão quando shell ou runtime mudar. |
| CORS de avatar | Manter fallback de iniciais quando a foto remota falhar. |
| Layout cheio | Proteger cartas e nomes de sobreposição com o HUD em ambos os aspectos. |
