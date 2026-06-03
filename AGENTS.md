# AGENTS.md - Instrucoes Para O Codex

Este arquivo orienta como trabalhar no repositorio Coup Master.

O foco atual e o modo **Coup Master 3D**, uma mesa sandbox em Three.js/WebGL com fisica Rapier, inspirada no Tabletop Simulator.

## 1. Documentos Que Devem Ser Lidos

Antes de mudancas grandes, leia:

- `docs/GDD.md`
- `docs/TDD.md`
- `README.md`
- este `AGENTS.md`

O GDD define o produto e experiencia.

O TDD define arquitetura e decisoes tecnicas.

Este arquivo define regras de trabalho para agentes.

## 2. Objetivo Atual

Evoluir o modo 3D local ate ele ser uma mesa tabletop confortavel:

- mesa octogonal;
- ate 8 slots de jogador;
- deck central fisico com limite visual de 8 cartas;
- nomes e avatares flutuantes de jogadores preparados para Google Auth;
- cartas finas, arredondadas e texturizadas;
- pilhas de cartas que podem virar, girar, embaralhar e se agrupar;
- moedas de ouro e prata com textura;
- cartas especiais de asilo e religiao;
- hover com outline e tooltip;
- arraste de objetos;
- atalhos de teclado e botoes equivalentes para touchscreen;
- camera com foco por jogador;
- HUD por icones;
- musica e efeitos sonoros;
- fisica suficientemente estavel para uso casual.

## 3. Arquivos Principais

Trabalhe principalmente em:

- `index.html`
- `css/three-board.css`
- `js/three/app.js`
- `docs/GDD.md`
- `docs/TDD.md`
- `AGENTS.md`

Nao recrie pastas antigas do modo 2D sem necessidade.

## 4. Escopo Do MVP

Dentro do escopo:

- melhorar interacao 3D;
- melhorar visual e legibilidade da mesa;
- corrigir fisica local;
- melhorar HUD;
- melhorar acessibilidade para touchscreen;
- documentar decisoes;
- manter o codigo facil de continuar.

Fora do escopo, salvo pedido explicito:

- ranqueado;
- matchmaking;
- loja;
- DLC paga;
- backend autoritativo;
- multiplayer completo;
- bots inteligentes;
- mobile completo;
- automacao total das regras.

## 5. Convencoes De Codigo

### Idioma Dos Identificadores

Novas funcoes, variaveis e estruturas devem usar nomes em ingles.

Use nomes simples e diretos:

```js
createDeck();
drawCardToPlayer();
flipCard();
flipTableStack();
shuffleDeck();
returnCardToDeck();
updateHud();
syncPhysicsMeshes();
```

Nao criar novas funcoes em portugues. O projeto pode ter comentarios em portugues, mas o codigo deve seguir nomes em ingles.

### Comentarios

Cada funcao relevante deve ter um comentario curto acima explicando sua responsabilidade.

Bom:

```js
// Vira todas as cartas de uma pilha como uma unica orientacao de grupo.
function flipTableStack(stack) {
  // ...
}
```

Evite comentarios que apenas repetem a linha. Prefira explicar intencao, regra ou motivo.

### Estilo De Mudanca

- Faca mudancas pequenas e focadas.
- Evite refatorar junto com bugfix.
- Preserve alteracoes nao relacionadas feitas pelo usuario.
- Use `apply_patch` para edicoes manuais.
- Use `rg` para procurar arquivos/texto.

## 6. Padroes Three.js E Rapier

- Nao criar geometrias ou materiais novos a cada frame.
- Reutilizar texturas em cache.
- Usar `userData` para ligar mesh ao objeto logico.
- Manter raycast limitado a objetos interativos.
- Ao arrastar, desabilitar controles de camera.
- Se um collider virar sensor durante drag, religar ao soltar.
- Evitar paredes invisiveis altas que criem apoio falso.
- Evitar correcoes por frame que reposicionem objetos continuamente, pois isso causa tremor.

## 7. Regras De Interacao Esperadas

Atalhos atuais:

| Tecla | Acao |
| --- | --- |
| `F` | Vira carta, pilha ou extra |
| `C` | Abre o chat da sala |
| `Q` | Gira objeto selecionado para a esquerda |
| `E` | Gira objeto selecionado para a direita |
| `R` | Embaralha deck ou pilha sob hover |
| `Delete` / `Backspace` | Remove objeto selecionado |
| `Space` | Foca camera no jogador ativo |

Controles atuais:

| Acao | Controle |
| --- | --- |
| Zoom | Scroll |
| Pan | Botao do meio |
| Rotacao | OrbitControls / um dedo em touchscreen |
| Comprar carta | Clique no deck |
| Puxar carta do deck | Clique e arraste rapido |
| Mover deck | Clique, segure e arraste |
| Devolver carta | Duplo clique |
| Selecionar para atalho | Hover do mouse |

Botoes inferiores devem espelhar acoes importantes para touchscreen, incluindo flip, giro, deletar e foco de camera.

## 8. Regras De Jogo Ja Implementadas

Ao mexer em cartas/deck/pilhas, preservar:

- carta solta vira so ela;
- pilha vira todas as cartas com `F`;
- pilha fechada pode voltar ao deck;
- pilha aberta nao volta ao deck;
- pilhas compativeis podem se agrupar entre si;
- carta colocada na mesa nao revela automaticamente;
- carta fechada pode entrar no deck;
- carta aberta nao entra no deck;
- hover seleciona objeto para atalhos;
- deck tem limite visual de 8 cartas empilhadas;
- deck pode ser movido e comprado;
- cartas ou pilhas fechadas devolvidas ao deck embaralham internamente;
- botao textual de embaralhar, dado e rolar podem permanecer ocultos quando nao forem necessarios;
- `shuffle.mp3` nao deve ser reintroduzido no baralho sem pedido explicito.

## 9. HUD E Audio

HUD atual:

- sair da sala e reset no topo esquerdo;
- sem seletor manual P1 a P8;
- lista textual de jogadores abaixo da barra superior direita;
- status de sala/deck/mesa/objetos acima da barra inferior;
- barra superior direita com musica, feedback, regras alternativas, espectador placeholder, tela cheia, info e configuracoes;
- barra inferior com botoes quadrados por icone.
- `index.html` deve manter a tela de carregamento ate `js/three/boot.js` validar login, sala e estado inicial.
- O host pode remover jogadores pelo modal da lista; essa acao libera explicitamente o assento no Firebase.
- Regras alternativas usam imagens em `assets/img/guides/alternative-rules1.png` ate `alternative-rules5.png`.

Audio atual:

- BGM em `assets/sounds/soundtrack/bgm.mp3`;
- `card-whoosh.mp3` para acoes de cartas e navegacao de regras;
- `falling-coin.mp3` para moedas;
- `reset-game.mp3` para reset;
- sliders de volume de musica e SFX no modal de configuracoes.

## 10. Verificacao

Antes de finalizar mudanca em JS:

```powershell
node --check js\three\app.js
```

Quando houver mudanca visual ou interativa, abrir ou recarregar:

```txt
http://127.0.0.1:4173/index.html
```

Se o servidor local nao estiver rodando:

```powershell
python -m http.server 4173
```

## 11. Commits

Use commits pequenos e descritivos.

Exemplos:

```txt
Fix tabletop edge physics
Add stack-wide card flipping
Refine 3D deck interactions and HUD layout
Update 3D design and technical docs
```

Quando o usuario pedir para subir:

1. `git status --short --branch`
2. revisar diff;
3. rodar checagens relevantes;
4. `git add`;
5. `git commit`;
6. `git push`.

## 12. Como Responder Ao Usuario

Responder em portugues, de forma direta.

Ao finalizar:

- diga o que mudou;
- cite arquivos principais;
- diga se testes/checagens passaram;
- avise se algo nao foi testado.

Evite respostas longas demais quando o pedido for simples.

## 13. Observacao Importante

O projeto esta em desenvolvimento incremental. O objetivo agora e fazer o nucleo local 3D ficar bom: manipulacao, leitura visual, fisica, atalhos, audio, HUD e fluxo de mesa.

Nao transformar o MVP em produto completo antes de a mesa 3D estar confortavel.
