# Coup Master 3D

![Status](https://img.shields.io/badge/Status-MVP_local_em_desenvolvimento-blue)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black)
![Rapier](https://img.shields.io/badge/Physics-Rapier_3D-purple)

Coup Master 3D e uma mesa virtual sandbox para jogar Coup Master no navegador, inspirada na liberdade do Tabletop Simulator. O foco atual do repositorio e o modo 3D local: uma mesa fisica, manipulavel e legivel, onde os jogadores conduzem manualmente regras, blefes, trocas, desafios e combinados de mesa.

O objetivo nao e automatizar tudo. A ideia e dar uma mesa digital confortavel para comprar cartas, arrastar componentes, virar pilhas, devolver cartas ao deck, organizar moedas e jogar do jeito que o grupo decidir.

## Status Atual

O projeto esta em MVP 3D online casual, em desenvolvimento ativo.

Estado atual:

- Modo principal: `index.html`.
- Renderizacao: Three.js/WebGL.
- Fisica: Rapier 3D.
- Multiplayer casual: parcial, com sala, assentos, snapshots finais e algumas animacoes discretas sincronizadas.
- Modo 2D antigo: legado do projeto, nao e mais o foco desta branch.

## Funcionalidades

### Base Online

- Login em `login.html` com Google Authentication ou visitante anonimo via Firebase.
- Lobby em `lobby.html` para criar sala com codigo curto ou entrar em uma sala existente.
- Realtime Database registra jogadores em `rooms/{roomCode}/players/{uid}`.
- Lista de jogadores da sala sincronizada com assentos reservados.
- Fechar ou minimizar a aba nao libera o slot; o jogador volta para o mesmo assento ao reabrir a sala.
- A mesa casual sincroniza snapshots finais de cartas, pilhas, deck, moedas e extras via Realtime Database.
- Acoes discretas publicadas em `rooms/{roomCode}/tableActions` sincronizam animacoes previsiveis de comprar carta, distribuir cartas e devolver carta ao deck.
- O modo espectador permite pedir permissao para ver a mao de outro jogador.
- A mesa `index.html` exige login e sala valida antes de iniciar o modo Three.js.
- No modo casual, criar ou entrar em sala redireciona direto para a mesa.
- Movimentos durante drag nao sao transmitidos em tempo real nesta etapa; outros jogadores recebem o estado quando a acao termina.

### Mesa 3D

- Mesa octogonal com area central e ate 8 zonas de jogador.
- Slots P1 a P8 alinhados as faces internas da mesa.
- Assento local definido pela sala online, sem seletor manual P1-P8 para ver maos de outros jogadores.
- Em salas online, os primeiros assentos reservados priorizam lados opostos da mesa, mantendo cada conta no mesmo slot.
- Interacao fisica com cartas e objetos em qualquer slot continua permitida.
- Nome e avatar flutuante por jogador sincronizados a partir do perfil da sala.
- Camera orbitavel com zoom, pan e foco animado no jogador ativo.
- Resgate automatico de objetos que caem fora da mesa.

### Cartas E Deck

- Cartas 3D finas, texturizadas, com cantos arredondados reais.
- Frente, verso e lateral visiveis.
- Deck fisico no centro da mesa.
- Deck movel por drag.
- Clique no deck compra carta para o jogador ativo.
- Duplo clique em carta devolve ao deck com animacao.
- Cartas fechadas e pilhas fechadas podem voltar ao deck.
- Cartas abertas nao entram no deck.
- Deck tem limite visual de 8 cartas empilhadas, mesmo com mais cartas internamente.
- Quando o deck fica vazio, ainda existe um slot de retorno para receber cartas fechadas.

### Pilhas

- Cartas fechadas agrupam com cartas fechadas.
- Cartas abertas agrupam com cartas abertas.
- Pilhas compativeis podem se unir quando soltas perto ou sobre outra pilha.
- Pilhas podem ser arrastadas como conjunto.
- Pilhas podem ser viradas em grupo.
- Pilhas podem ser giradas.
- Pilhas abertas mostram tooltip com contagem por personagem.

### Objetos E Extras

- Moeda de ouro com textura.
- Moeda de prata com textura e proporcao menor.
- Moedas nascem proximas ao slot do jogador que pediu.
- Duplo clique em moeda de ouro ou prata remove a moeda da mesa.
- Carta especial de Asilo, horizontal.
- Carta especial de Religiao, com frente catolica e verso protestante.
- Cartas especiais nascem proximas ao slot do jogador que pediu.
- Extras podem ser arrastados, virados, girados e deletados.
- O codigo ainda preserva dado e rolagem, mas os botoes estao ocultos no HUD atual.

### HUD

- Botao de sair da sala no topo esquerdo.
- Botao de reset no topo esquerdo apenas para o administrador da sala.
- Barra superior direita com:
  - musica;
  - feedback;
  - regras alternativas;
  - modo espectador;
  - tela cheia;
  - regras de personagens;
  - configuracoes.
- Codigo da sala clicavel, contadores de deck, mesa e objetos acima da barra inferior.
- Barras de HUD sem sombra externa, com icones SVG claros para melhor compatibilidade com navegadores mobile em alto contraste.
- Barra inferior com botoes por icone para acoes rapidas:
  - ouro;
  - prata;
  - asilo;
  - religiao;
  - distribuir;
  - flip;
  - girar esquerda;
  - girar direita;
  - deletar;
  - focar camera.

### Audio

- Musica de fundo em volume inicial baixo.
- Botao para mutar/desmutar musica.
- Configuracoes com volume de musica e efeitos.
- Efeitos sonoros para cartas, moedas e reset.

## Controles

### Mouse E Touch

| Acao | Controle |
| --- | --- |
| Rotacionar camera | Botao esquerdo em area vazia / um dedo no touchscreen |
| Pan da camera | Botao do meio / clique no scroll / dois dedos no touchscreen |
| Zoom | Scroll |
| Comprar carta | Clique no deck |
| Puxar carta do deck | Clique e arraste rapido no deck |
| Mover deck | Clique, segure e arraste o deck |
| Arrastar carta, pilha, moeda ou extra | Clique, segure e arraste |
| Devolver carta ao deck | Duplo clique na carta |
| Selecionar para atalho | Hover do mouse |

### Teclado

| Tecla | Acao |
| --- | --- |
| `F` | Vira carta, pilha ou extra sob hover/selecao |
| `Q` | Gira objeto selecionado para a esquerda |
| `E` | Gira objeto selecionado para a direita |
| `R` | Embaralha deck ou pilha sob hover |
| `Delete` / `Backspace` | Remove objeto selecionado |
| `Space` | Foca a camera no jogador ativo |

## Como Rodar Localmente

Este modo roda como site estatico.

```powershell
python -m http.server 4173
```

Depois abra:

```txt
http://127.0.0.1:4173/index.html
```

Se voce ja usa outro servidor estatico, basta servir a raiz do repositorio e acessar `index.html`.

Para o fluxo online, abra primeiro:

```txt
http://127.0.0.1:4173/login.html
```

Depois do login, o lobby cria ou entra em uma sala e redireciona direto para `index.html?room=CODIGO`.

## Estrutura Principal

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

## Documentacao

- `docs/GDD.md`: visao de produto, regras de design, controles, HUD, roadmap e escopo.
- `docs/TDD.md`: arquitetura tecnica, estado local, sistemas, assets, fisica e criterios de aceite.
- `AGENTS.md`: instrucoes para agentes/colaboradores trabalharem no repositorio.

## Stack

| Area | Tecnologia |
| --- | --- |
| HTML/CSS | HTML5, CSS3 |
| JavaScript | Vanilla JS com ES Modules |
| Renderizacao 3D | Three.js |
| Controles de camera | OrbitControls |
| Fisica | Rapier 3D |
| Online | Firebase Authentication e Realtime Database |
| Assets | PNG, SVG, audio e canvas procedural |

## Desenvolvimento

Antes de finalizar mudancas em JavaScript:

```powershell
node --check js\three\app.js
```

Para mudancas visuais ou interativas, testar no navegador:

```txt
http://127.0.0.1:4173/index.html
```

Ao mexer em HUD, fisica, deck, pilhas ou controles, consulte tambem `docs/GDD.md`, `docs/TDD.md` e `AGENTS.md`.

## Roadmap

- Modularizar `js/three/app.js` quando o comportamento estabilizar.
- Refinar comandos para touchscreen.
- Expandir o modo espectador.
- Melhorar testes manuais e automatizados de fisica.
- Expandir sincronizacao casual sem transmitir drag frame a frame.
- Criar logs de mesa.
- Melhorar UX de inspecao de cartas.

## Licenca

Este projeto e de codigo aberto sob a licenca [MIT](LICENSE).
