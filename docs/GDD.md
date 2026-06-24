# GDD - Coup Master

Documento de design da experiência atual do Coup Master.

| Campo | Valor |
| --- | --- |
| Projeto | Coup Master |
| Status | MVP online em desenvolvimento |
| Plataforma alvo | Navegadores desktop e mobile com WebGL |
| Referência visual | Jogos de cartas estilizados com apresentação 2.5D |
| Renderização | Three.js/WebGL |
| Entrada | Pointer Events, mouse, toque e teclado |

## 1. Visão

Coup Master é uma mesa digital de cartas com oito assentos fixos, leitura direta e movimentos simples. A apresentação
deve parecer um jogo de cartas moderno, não uma simulação física de mesa.

A partida usa profundidade visual apenas onde ela ajuda:

- cartas elevam e inclinam conforme a posição do ponteiro;
- compra, distribuição, flip e arraste possuem animações curtas;
- painéis usam volume, sombra curta e cores fortes;
- a câmera permanece estável e mostra toda a área de jogo.

As regras continuam sendo conduzidas pelos jogadores. O MVP não tenta automatizar todas as declarações, contestações,
bloqueios e eliminações.

## 2. Pilares

| Pilar | Direção |
| --- | --- |
| Leitura imediata | Oito slots, deck, asilo e cemitério devem ser reconhecidos sem mover a câmera. |
| Cartas responsivas | Hover, tilt, seleção e arraste precisam responder de forma previsível. |
| Compatibilidade | A mesma interação usa Pointer Events em mouse, toque e caneta. |
| Estilo consistente | Login, menu e partida compartilham tipografia pixelada, cores e botões. |
| Estado separado da cena | Regras e sincronização não dependem de posição de mesh ou física. |
| Multiplayer casual | Snapshots finais preservam a partida sem transmitir cada frame do arraste. |

## 3. Fluxo Online

- `login.html` autentica com Google ou visitante.
- `lobby.html` funciona como menu principal.
- Jogar abre um modal para criar ou entrar em uma sala.
- A entrada leva diretamente para `index.html?room=CODIGO`.
- Até oito contas recebem assentos persistentes.
- O host pode resetar, configurar o baralho e remover jogadores.
- O chat, a presença, os pedidos de espectador e o estado final da mesa usam Firebase Realtime Database.
- `index.html` permanece em carregamento até autenticação, sala e snapshot inicial estarem prontos.

O drag não é sincronizado frame a frame. A posição ou área final é publicada quando a interação termina.

## 4. Tabuleiro

### Paisagem

- quatro slots na fileira superior;
- quatro slots na fileira inferior;
- asilo à esquerda;
- cemitério no centro;
- deck à direita;
- HUD compacto na faixa superior.

### Retrato

- quatro fileiras com dois slots;
- áreas centrais mantidas entre os grupos de jogadores;
- cartas e textos permanecem na orientação correta;
- não existe rolagem da página.

Cada slot contém:

- avatar;
- nome;
- número do assento;
- estado ocupado/livre;
- contador manual de moedas com `-` e `+`;
- emblema religioso clicável;
- área para cartas.

O jogador local recebe contorno azul. Um assento observado recebe destaque próprio.

## 5. Cartas

Comportamentos atuais:

- clique no deck ou botão Comprar envia uma carta ao jogador local;
- Distribuir entrega até duas cartas para cada assento ocupado;
- hover eleva, amplia e inclina a carta conforme o ponteiro;
- clique seleciona a carta;
- arraste move a carta entre slots, cemitério e deck;
- uma carta no cemitério fica visível a todos;
- cartas de outros jogadores permanecem fechadas, salvo permissão de espectador;
- `F` ou o botão de flip vira a carta selecionada;
- `Q` e `E` ou os botões correspondentes giram a carta;
- `Delete` remove cartas públicas ou pertencentes ao jogador local;
- uma carta precisa estar fechada para voltar ao deck.

As cartas usam frente e verso texturizados, geometria arredondada, sombra e contorno de seleção. Não existem corpos
físicos, colliders, pilhas instáveis ou objetos que possam cair para fora da mesa.

## 6. Deck

- permanece em uma área fixa;
- mostra uma pilha visual curta;
- exibe a quantidade real de cartas;
- aceita clique e botão de compra;
- embaralha internamente cartas fechadas devolvidas;
- usa transação Firebase dedicada para reservar compras simultâneas;
- não pode ser arrastado.

## 7. Asilo, Religião E Moedas

- o asilo possui área própria e contador compartilhado manual;
- cada jogador possui contador manual de moedas;
- os controles nunca permitem valor negativo;
- o emblema de religião alterna entre católico e protestante;
- esses estados são salvos em `tableState.objects`.

Moedas físicas soltas e cartas especiais arrastáveis não fazem parte da nova base visual.

## 8. Cemitério

- ocupa a área central mais larga;
- recebe cartas arrastadas dos slots;
- revela as cartas colocadas nele;
- preserva a posição final dentro de seus limites;
- exibe a quantidade de cartas;
- não mostra instrução textual permanente.

## 9. HUD

Elementos persistentes:

- sair e reset no topo esquerdo;
- código da sala e contadores compactos;
- Comprar, Distribuir, girar, deletar e flip no topo central;
- música, feedback, regras alternativas, espectador, tela cheia, informações e configurações no topo direito;
- chat e histórico na lateral.

Textos longos e configurações permanecem em modais DOM. A área jogável e as informações dos slots são renderizadas
em WebGL.

## 10. Modais

- configurações de música e efeitos;
- configuração do baralho para o host;
- regras de personagens;
- regras alternativas;
- chat;
- espectador;
- informações e remoção de jogador.

Abrir um modal interrompe hover e interação com o canvas.

## 11. Áudio

- BGM: `assets/sounds/soundtrack/bgm.mp3`;
- cartas: `assets/sounds/vfx/card-whoosh.mp3`;
- moedas: `assets/sounds/vfx/falling-coin.mp3`;
- reset: `assets/sounds/vfx/reset-game.mp3`.

O navegador inicia a música somente após uma interação permitida.

## 12. Fora Do Escopo Atual

- câmera orbitável;
- física Rapier;
- mesa octogonal;
- simulação de Tabletop Simulator;
- moedas físicas soltas;
- pilhas físicas livres;
- dado;
- sincronização de drag frame a frame;
- backend autoritativo;
- matchmaking e ranqueado;
- loja e DLC paga;
- bots inteligentes;
- automação completa das regras.

## 13. Roadmap

### Feito

- fluxo de login, menu e salas;
- PWA;
- tabuleiro ortográfico 2.5D;
- oito slots em paisagem e retrato;
- deck, asilo e cemitério;
- perfil, moedas e religião por slot;
- hover com perspectiva;
- seleção, flip, giro e arraste por Pointer Events;
- compra transacional;
- chat, modais e espectador;
- snapshots finais da mesa.

### Próximas melhorias

- refinar composição visual de slots ocupados e vazios;
- adicionar animações de turno e eliminação;
- melhorar feedback de áreas válidas durante o arraste;
- expandir logs e histórico;
- modularizar `js/three/app.js`;
- adicionar testes automatizados do estado lógico;
- revisar o preview oficial do projeto.
