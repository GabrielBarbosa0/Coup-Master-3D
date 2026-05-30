# GDD - Coup Master 3D

Documento de design do modo 3D do Coup Master.

| Campo | Valor |
| --- | --- |
| Projeto | Coup Master 3D |
| Documento | Game Design Document |
| Status | MVP local em desenvolvimento |
| Plataforma alvo | Navegador desktop |
| Experiencia de referencia | Tabletop Simulator focado em Coup |
| Stack visual | Three.js/WebGL |
| Stack fisica | Rapier 3D |

## 1. Visao

Coup Master 3D e uma mesa virtual sandbox para jogar Coup Master com manipulacao fisica de cartas, moedas, dados e deck. A intencao do modo casual nao e automatizar todas as regras, e sim dar ao jogador uma mesa digital parecida com uma mesa fisica: ele pode comprar, arrastar, virar, agrupar, embaralhar e organizar componentes.

O modo 3D deve parecer um tabletop digital, nao uma tela 2D com enfeites. A referencia principal e a liberdade do Tabletop Simulator, mas com controles e componentes direcionados para Coup.

## 2. Pilares De Design

| Pilar | Direcao |
| --- | --- |
| Sandbox manual | O modo casual facilita a partida, mas os jogadores continuam conduzindo regras, acordos e resolucoes. |
| Sensacao fisica | Cartas, deck, moedas e dados devem parecer objetos reais sobre uma mesa. |
| Clareza | A mesa precisa ser legivel com ate 8 jogadores, mesmo com cartas e objetos soltos. |
| Acessibilidade de interacao | Hover, tooltip, outline e atalhos devem reduzir cliques desnecessarios. |
| Evolucao incremental | Primeiro consolidar o nucleo local; multiplayer e ranqueado ficam para fases futuras. |

## 3. Mesa E Jogadores

O tabuleiro atual e uma mesa octogonal com ate 8 slots de jogador. Cada slot fica alinhado a face interna correspondente do octogono.

Elementos atuais:

- Mesa octogonal com area central.
- Oito zonas de jogador, de P1 a P8.
- Destaque verde para o jogador ativo.
- HUD superior com selecao de jogador.
- Barra inferior com acoes rapidas.
- Deck central.
- Objetos de mesa: cartas, moedas de ouro, moedas de prata e dado.

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
- Virar carta com `F`.
- Flip animado horizontal, no estilo virar da esquerda para a direita.
- Duplo clique devolve carta ao deck, com cooldown para evitar devolver cartas vizinhas.
- Cartas fechadas podem entrar no deck.
- Cartas abertas nao entram no deck.
- Cartas semelhantes na mesa podem formar pilhas.
- Pilhas podem ser arrastadas como conjunto.
- Pilhas podem ter a carta do topo puxada.
- Pilhas fechadas podem voltar ao deck.
- Pilhas abertas nao se misturam com o deck.
- Ao apertar `F` sobre uma pilha, todas as cartas da pilha devem virar juntas.

## 5. Deck

O deck central deve se comportar como um baralho fisico.

Comportamentos implementados:

- Comeca no centro da mesa.
- Pode ser movido pela mesa ao clicar e segurar.
- Clique simples compra carta para o jogador ativo.
- Clique e arraste rapido puxa a carta do topo.
- Possui collider fisico para objetos nao atravessarem.
- Tem altura fixa, independente de quantas cartas existam no deck.
- Visualmente e composto por 8 camadas de cartas empilhadas.
- Pode ser embaralhado pelo botao `Embaralhar`.
- Pode ser embaralhado com `R` quando o mouse estiver sobre ele.

## 6. Pilhas De Cartas

Cartas na mesa podem formar pilhas quando estao proximas e tem a mesma orientacao de face.

Regras:

- Carta fechada agrupa com carta fechada.
- Carta aberta agrupa com carta aberta.
- Pilha fechada pode voltar ao deck.
- Pilha aberta nao volta ao deck.
- Arrastar a pilha move o conjunto.
- Arrastar rapido a partir da pilha puxa a carta do topo.
- `R` sobre uma pilha embaralha a ordem interna.
- `F` sobre uma pilha vira todas as cartas do grupo.

## 7. Moedas E Dado

Moedas atuais:

- Moeda de ouro.
- Moeda de prata.
- Ouro e maior que prata.
- Moedas tem espessura reduzida.
- Moedas sao objetos fisicos e arrastaveis.

Dado:

- Pode ser criado pelo botao `Dado`.
- Pode ser rolado pelo botao `Rolar`.
- Usa faces geradas em canvas.

## 8. Controles

### Mouse

| Acao | Controle |
| --- | --- |
| Rotacionar camera | Botao esquerdo em area vazia |
| Pan da camera | Botao do meio / clique no scroll |
| Zoom | Scroll |
| Comprar carta | Clique no deck |
| Puxar carta do deck | Clique e arraste rapido no deck |
| Mover deck | Clique, segure e arraste o deck |
| Arrastar carta, moeda ou dado | Clique, segure e arraste |
| Devolver carta ao deck | Duplo clique na carta |
| Hover | Mostra outline e tooltip do objeto |

### Teclado

| Tecla | Acao |
| --- | --- |
| `F` | Vira carta ou pilha sob selecao/hover |
| `R` | Embaralha deck ou pilha sob o mouse |
| `Delete` / `Backspace` | Remove objeto selecionado |
| `Space` | Anima a camera de volta para a visao do jogador ativo |

## 9. HUD

A HUD atual tem:

- Contador de deck.
- Contador de cartas na mesa.
- Contador de objetos.
- Selecao P1 a P8 centralizada no topo.
- Acoes rapidas centralizadas embaixo:
  - Comprar
  - Ouro
  - Prata
  - Dado
  - Rolar
  - Limpar
  - Embaralhar
  - Distribuir
  - Reset

## 10. Distribuicao Inicial

Estado atual desejado:

- O jogo inicia com as maos vazias.
- O deck inicia cheio no centro.
- O botao `Distribuir` anima cartas saindo do deck para as maos dos jogadores.
- Cada jogador recebe ate 2 cartas conforme a distribuicao inicial.

## 11. Camera

A camera deve evitar que o jogador se perca na mesa.

Regras atuais:

- Zoom com scroll.
- Pan com botao do meio.
- Rotacao por orbit controls.
- `Space` foca a camera no jogador ativo.
- O retorno da camera e animado, nao um corte seco.

## 12. Fisica

O jogo usa Rapier 3D para objetos fisicos.

Objetivos da fisica:

- Evitar objetos atravessando o deck.
- Evitar objetos caindo no limbo sem retorno.
- Evitar zonas invisiveis que fazem objetos flutuarem.
- Evitar paredes invisiveis altas nos cantos da mesa.
- Manter a simulacao simples e previsivel, mais importante que fisica realista extrema.

Quando objetos caem fora da mesa ou abaixo do limite, eles devem voltar para o centro da mesa.

## 13. Fora Do Escopo Atual

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

## 14. Roadmap

### Feito / em andamento

- Mesa 3D octogonal.
- Slots P1 a P8.
- Deck central fisico.
- Cartas 3D com frente, verso e cantos arredondados.
- Moedas de ouro e prata.
- Dado.
- HUD funcional.
- Distribuir cartas.
- Embaralhar deck.
- Embaralhar pilhas.
- Flip animado de carta.
- Flip de pilha.
- Camera com foco por jogador.
- Hover com outline e tooltip.
- Resgate de objetos no limbo.

### Proximas melhorias provaveis

- Separar `js/three/app.js` em modulos menores.
- Melhorar testes manuais e automatizados de fisica.
- Implementar multiplayer casual.
- Sincronizar objetos via Firebase ou outra solucao realtime.
- Criar logs de mesa.
- Melhorar UX de inspecao de carta.
