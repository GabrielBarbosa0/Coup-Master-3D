# GDD - Coup Master 3D

Documento de design do modo 3D do Coup Master.

| Campo | Valor |
| --- | --- |
| Projeto | Coup Master 3D |
| Documento | Game Design Document |
| Status | MVP local em desenvolvimento |
| Plataforma alvo | Navegador desktop, com suporte crescente a touchscreen/tablet |
| Experiencia de referencia | Tabletop Simulator focado em Coup |
| Stack visual | Three.js/WebGL |
| Stack fisica | Rapier 3D |

## 1. Visao

Coup Master 3D e uma mesa virtual sandbox para jogar Coup Master com manipulacao fisica de cartas, pilhas, moedas, cartas especiais, deck e objetos auxiliares. A intencao do modo casual nao e automatizar todas as regras, e sim dar ao jogador uma mesa digital parecida com uma mesa fisica: ele pode comprar, arrastar, virar, agrupar, devolver, organizar e manipular componentes livremente.

O modo 3D deve parecer um tabletop digital, nao uma tela 2D com enfeites. A referencia principal e a liberdade do Tabletop Simulator, mas com controles, HUD e componentes direcionados para Coup Master.

## 2. Pilares De Design

| Pilar | Direcao |
| --- | --- |
| Sandbox manual | O modo casual facilita a partida, mas os jogadores continuam conduzindo regras, acordos e resolucoes. |
| Sensacao fisica | Cartas, pilhas, deck e moedas devem parecer objetos reais sobre uma mesa. |
| Clareza | A mesa precisa ser legivel com ate 8 jogadores, mesmo com cartas e objetos soltos. |
| Acessibilidade de interacao | Hover, tooltip, outline, atalhos e botoes de acao rapida devem reduzir cliques desnecessarios. |
| Touch em evolucao | Gestos nativos de toque ja funcionam em parte; botoes por icone devem cobrir acoes sem teclado. |
| Experiencia instalavel | A PWA deve abrir login, lobby e mesa em uma janela standalone quando instalada. |
| Evolucao incremental | Primeiro consolidar o nucleo local; multiplayer e ranqueado ficam para fases futuras. |

## 2.1 Base Online

O projeto agora possui uma primeira camada online para autenticacao, lobby e presenca de jogadores:

- Login Google ou visitante anonimo em `login.html`.
- Lobby em `lobby.html` para criar uma sala curta ou entrar por codigo.
- PWA opcional com nome `Coup Master 3D`, icone proprio e exibicao `standalone`.
- O fluxo instalado inicia no login e reutiliza a sessao Firebase para seguir ao lobby.
- Jogadores salvos em `rooms/{roomCode}/players/{uid}` no Firebase Realtime Database.
- Lista de jogadores da sala sincronizada na mesa, com assentos reservados por conta.
- A lista de jogadores exibe um contador manual de moedas por jogador, no formato `Nome - valor +`, sincronizado com o estado da mesa.
- Fechar ou minimizar a aba nao libera o assento; o jogador volta para o mesmo slot ao reabrir a sala.
- A mesa casual sincroniza snapshots finais de cartas, pilhas, deck, moedas e extras via Realtime Database.
- A mesa casual tambem publica eventos discretos em `rooms/{roomCode}/tableActions` para animacoes previsiveis, como comprar carta, distribuir cartas e devolver carta ao deck.
- O chat da sala sincroniza texto livre e mensagens rapidas de blefe/acao em tempo real.
- No modo casual, criar ou entrar em uma sala leva direto para a mesa 3D, sem sala de espera intermediaria.
- O criador da sala e o administrador permanente da sala casual.
- Jogadores comuns nao veem o botao de reset e nao podem aplicar configuracoes de baralho.
- O host pode remover jogadores pelo modal da lista de jogadores, liberando o assento explicitamente.
- O modo espectador permite pedir permissao para ver a mao de outro jogador; quando aceito, o espectador passa a enxergar as cartas daquele slot.
- `index.html` usa uma tela de carregamento durante autenticacao, validacao de sala e carregamento do estado inicial para evitar exibir HUD ou mesa vazia antes da hora.

Essa etapa nao sincroniza arrasto livre em tempo real. Movimentos manuais de cartas, deck, pilhas e objetos continuam sendo publicados como estado final; animacoes predefinidas podem ser reproduzidas por todos os jogadores quando houver um gatilho claro.

## 3. Mesa E Jogadores

O tabuleiro atual e uma mesa octogonal com ate 8 slots de jogador. Cada slot fica alinhado a face interna correspondente do octogono, com margem visual para nao encostar nas bordas.

Elementos atuais:

- Mesa octogonal com area central.
- Oito zonas de jogador, de P1 a P8.
- Destaque verde para o jogador ativo.
- Assento local definido pela sala online, sem seletor manual P1-P8 para acessar a visao de outros jogadores.
- Distribuicao online de assentos prioriza lados opostos nos primeiros jogadores, mas nao rebalanceia quem ja tem slot para preservar dono e estado das cartas.
- Interacao fisica com cartas, pilhas e objetos em qualquer slot continua permitida.
- Nome e avatar flutuante para cada jogador ao redor da mesa, preservados mesmo quando o jogador fica offline.
- Botoes de sair da sala e reset no topo esquerdo; reset aparece apenas para administrador.
- Barra superior direita com icones de utilidades.
- Lista textual de jogadores abaixo da barra superior direita; cada nome abre um modal com informacoes do jogador e cada linha possui contador manual de moedas.
- Barra inferior com acoes rapidas por icone.
- Deck central.
- Objetos de mesa: cartas, pilhas, moedas de ouro, moedas de prata, carta de asilo e carta de religiao.

Os nomes e avatares usam `displayName` e `photoURL` da sala online. O slot permanece identificado mesmo quando o jogador minimiza, fecha a aba ou fica offline.

## 4. Cartas

As cartas devem parecer cartas reais:

- geometria fina;
- cantos arredondados reais;
- frente e verso texturizados;
- lateral visivel;
- espessura reduzida;
- textura sem espelhamento horizontal;
- orientacao correta nas maos dos jogadores;
- suporte a sombra e colisao fisica;
- suporte a hover com outline e tooltip.

Comportamentos implementados:

- Comprar carta do deck para a mao do jogador ativo.
- Arrastar carta da mao para a mesa.
- Arrastar carta do deck para a mesa ou mao.
- Colocar carta na mesa sem revelar automaticamente.
- Virar carta com `F` ou pelo botao de flip da barra inferior.
- Flip animado horizontal, no estilo virar da esquerda para a direita.
- Girar objeto/carta/pilha com `Q` e `E` ou pelos botoes de giro.
- Duplo clique devolve carta ao deck com animacao ate a posicao atual do deck.
- Cooldown no duplo clique evita devolver cartas vizinhas por engano.
- Cartas fechadas podem entrar no deck.
- Cartas abertas nao entram no deck.
- Cartas semelhantes na mesa podem formar pilhas.
- Pilhas podem ser arrastadas como conjunto.
- Pilhas podem ter a carta do topo puxada.
- Pilhas fechadas podem voltar ao deck.
- Pilhas abertas nao se misturam com o deck.
- Ao apertar `F` sobre uma pilha, todas as cartas da pilha viram juntas.

## 5. Deck

O deck central deve se comportar como um baralho fisico, mas com altura visual limitada para nao virar uma torre quando houver muitas cartas.

Comportamentos implementados:

- Comeca no centro da mesa.
- Pode ser movido pela mesa ao clicar e segurar.
- Clique simples compra carta para o jogador ativo.
- Clique e arraste rapido puxa a carta do topo.
- Possui collider fisico para objetos nao atravessarem.
- Visualmente cresce ate 8 cartas empilhadas.
- Se houver mais de 8 cartas, a altura visual permanece equivalente a 8 cartas.
- Quando o deck chega a 7, 6, 5 cartas ou menos, a altura visual diminui.
- Quando o deck fica vazio, permanece uma area/slot de retorno para receber cartas fechadas.
- Cartas fechadas e pilhas fechadas devolvidas ao deck entram no baralho e embaralham internamente.
- O botao textual de embaralhar esta oculto no MVP atual.
- `R` ainda pode embaralhar o deck ou pilha sob o mouse quando essa funcao for desejada.
- A animacao de giro do deck ao embaralhar esta desativada temporariamente.
- `shuffle.mp3` nao deve tocar quando uma carta entra no deck.
- Em salas online, clique simples para comprar carta e distribuicao inicial publicam eventos discretos para que todos vejam a mesma animacao.

## 6. Pilhas De Cartas

Cartas na mesa podem formar pilhas quando estao proximas e tem a mesma orientacao de face.

Regras:

- Carta fechada agrupa com carta fechada.
- Carta aberta agrupa com carta aberta.
- Pilha fechada pode voltar ao deck.
- Pilha aberta nao volta ao deck.
- Pilhas compativeis podem se unir quando uma e solta perto/sobre a outra.
- Arrastar a pilha move o conjunto.
- Arrastar rapido a partir da pilha puxa a carta do topo.
- `R` sobre uma pilha embaralha a ordem interna.
- `F` sobre uma pilha vira todas as cartas do grupo.
- Tooltip de pilha aberta mostra resumo por personagem, um por linha, com contagem.
- Tooltip de pilha fechada mostra que e carta fechada/pilha fechada.

## 7. Moedas E Cartas Especiais

Moedas atuais:

- Moeda de ouro.
- Moeda de prata.
- Ouro e maior que prata.
- Prata segue a proporcao visual das imagens de referencia em relacao ao ouro.
- Moedas usam textura de frente e verso em `assets/img/coins`.
- Moedas tem espessura reduzida.
- Moedas sao objetos fisicos, arrastaveis e removiveis.
- Moedas nascem proximas ao slot do jogador que pediu.
- Duplo clique em moeda de ouro ou prata remove a moeda.
- Criar moeda toca `falling-coin.mp3`.
- O HUD tambem possui um contador manual de moedas por jogador, separado dos objetos fisicos, para facilitar partidas casuais sem depender de mover moedas reais o tempo todo.

Cartas especiais:

- Asilo: carta horizontal, maior que uma carta de personagem comum.
- Religiao: carta menor, com frente catolica e verso protestante.
- Asilo e religiao nascem proximos ao slot do jogador que pediu, sem cair sobre o deck.
- Asilo e religiao podem ser flipadas.
- Asilo e religiao sao extras de mesa e podem ser deletadas.

Dado:

- O codigo ainda preserva dado e rolagem, mas os botoes estao ocultos no HUD atual.
- Pode voltar a ser exposto quando a UI precisar.

## 8. Controles

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
| Hover | Mostra outline, tooltip e seleciona para atalhos |

### Teclado

| Tecla | Acao |
| --- | --- |
| `F` | Vira carta ou pilha sob selecao/hover |
| `C` | Abre o chat da sala |
| `Q` | Gira objeto selecionado para a esquerda |
| `E` | Gira objeto selecionado para a direita |
| `R` | Embaralha deck ou pilha sob o mouse |
| `Alt` | Inspeciona de perto o objeto sob o mouse |
| `Delete` / `Backspace` | Remove objeto selecionado |
| `Space` | Anima a camera de volta para a visao do jogador ativo |

## 9. HUD

A HUD atual tem:

- Codigo da sala clicavel, contador de deck, cartas na mesa e objetos acima da barra inferior.
- Botoes de sair da sala e reset no topo esquerdo; reset aparece apenas para administrador.
- Sem selecao manual P1-P8 na lateral esquerda.
- Lista de jogadores abaixo da barra superior direita, alinhada com os controles de utilidades.
- Cada jogador na lista aparece com contador manual de moedas no formato `Nome - valor +`; os botoes circulares amarelos diminuem ou aumentam a contagem sem permitir valor negativo.
- Barra superior direita com icones:
  - musica;
  - feedback;
  - regras alternativas;
  - modo espectador;
  - tela cheia;
  - informacoes/regras de personagens;
  - configuracoes.
- Barra inferior com acoes rapidas por icone:
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
- Barra lateral esquerda com chat e historico; o chat permite conversa por texto e mensagens rapidas como declarar personagem, acao, contestar ou bloquear.

Textos da interface devem ser evitados em botoes de acao quando houver icone claro. A barra inferior deve ajudar especialmente em touchscreen, onde atalhos de teclado como `F`, `Q`, `E`, `Delete` e `Space` nao existem.

As barras de HUD nao devem usar sombra externa. Os icones SVG devem permanecer claros tambem em navegadores mobile que ativam alto contraste ou ajuste automatico de cores.

## 10. Modais E Configuracoes

Modais atuais:

- Configuracoes, com controles funcionais de volume.
- Regras de personagens.
- Regras alternativas, atualmente com 5 paginas.
- Informacoes de jogador, com acao de remocao disponivel apenas para o host.

Regras de modal:

- A carta de regras fica sem moldura neon externa.
- O botao `X` fica proximo da carta, mas com distancia minima da borda.
- Navegacao lateral por setas toca som de carta.
- Contador de pagina fica abaixo da carta, com espaco visual.

Configuracoes atuais:

- Volume de musica.
- Volume de efeitos sonoros.

## 11. Audio

Audio atual:

- Musica de fundo em `assets/sounds/soundtrack/bgm.mp3`.
- Musica inicia em volume baixo.
- Botao de nota musical muta/desmuta a musica.
- Controle de volume de musica fica nas configuracoes.
- Controle de volume de SFX fica nas configuracoes.
- `card-whoosh.mp3` toca em acoes de cartas e navegacao de regras.
- `falling-coin.mp3` toca ao criar moedas.
- `reset-game.mp3` toca ao resetar.
- `shuffle.mp3` nao toca mais quando cartas entram no deck.

## 12. Distribuicao Inicial

Estado atual desejado:

- O jogo inicia com as maos vazias.
- O deck inicia cheio no centro.
- O botao `Distribuir` anima cartas saindo do deck para as maos dos jogadores.
- Cada jogador com slot reservado recebe ate 2 cartas conforme a distribuicao inicial.
- Distribuir cartas toca som de carta.
- Em salas online, a distribuicao inicial usa evento discreto com fila fixa de cartas para que todos vejam a mesma animacao.

## 13. Camera

A camera deve evitar que o jogador se perca na mesa.

Regras atuais:

- Zoom com scroll.
- Pan com botao do meio.
- Rotacao por orbit controls.
- `Space` ou botao de foco reposiciona a camera no jogador ativo.
- O retorno da camera e animado, nao um corte seco.
- A camera respeita o jogador selecionado: P1, P2, P3 etc.

## 14. Fisica

O jogo usa Rapier 3D para objetos fisicos.

Objetivos da fisica:

- Evitar objetos atravessando o deck.
- Evitar objetos caindo no limbo sem retorno.
- Evitar zonas invisiveis que fazem objetos flutuarem.
- Evitar paredes invisiveis altas nos cantos da mesa.
- Reduzir impulsos exagerados ao selecionar objetos empilhados.
- Manter a simulacao simples e previsivel, mais importante que fisica realista extrema.

Quando objetos caem fora da mesa ou abaixo do limite, eles devem voltar para o centro da mesa.

## 15. Fora Do Escopo Atual

Nao implementar no MVP local, exceto se pedido explicitamente:

- multiplayer completo;
- backend autoritativo;
- ranqueado;
- matchmaking;
- MMR/Elo;
- temporadas;
- loja;
- DLC paga;
- bots inteligentes;
- automacao completa das regras de Coup;
- mobile completo.

## 16. Roadmap

### Feito / em andamento

- Mesa 3D octogonal.
- Slots P1 a P8.
- Nome e avatar flutuante por jogador.
- Deck central fisico com limite visual de 8 cartas.
- Cartas 3D com frente, verso e cantos arredondados.
- Moedas de ouro e prata com textura.
- Cartas especiais de asilo e religiao.
- HUD com barras por icone.
- Modais de regras e configuracoes.
- Musica e SFX.
- Distribuir cartas.
- Sincronizacao por eventos discretos para compra simples, distribuicao inicial e devolucao animada ao deck.
- Modo espectador com aceite do jogador alvo.
- Auto-shuffle interno ao devolver cartas fechadas ao deck.
- Embaralhar pilhas.
- Agrupar pilhas compativeis.
- Flip animado de carta.
- Flip de pilha.
- Giro com `Q`/`E`.
- Camera com foco por jogador.
- Hover com outline e tooltip.
- Resgate de objetos no limbo.

### Proximas melhorias provaveis

- Separar `js/three/app.js` em modulos menores.
- Melhorar testes manuais e automatizados de fisica.
- Refinar comandos para touchscreen.
- Expandir modo espectador.
- Expandir multiplayer casual sem transmitir drag frame a frame.
- Avaliar novas acoes discretas para sincronizacao visual.
- Criar logs de mesa.
- Melhorar UX de inspecao de carta.
