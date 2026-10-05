# Coup Master 3D - Modo Ranqueado

O **Modo Ranqueado 3D** esta em implementacao inicial. Ele deve usar a apresentacao 3D da mesa, mas com regras controladas por um motor de jogo mais rigido que o modo casual.

## Objetivo

Criar uma partida competitiva automatizada em que o sistema controla turnos, acoes, custos, alvos, bloqueios, contestacoes, perdas de influencia, eliminacao e resultado.

## Diferenca Para O Casual 3D

No casual, a mesa e sandbox e os jogadores resolvem a partida manualmente.

No ranqueado, o estado visual 3D deve ser consequencia do motor de regras, nao a autoridade principal da partida. Drag livre nao deve decidir regras competitivas.

## Entrada Planejada

- Exigir conta Google.
- Usar uma espera/matchmaking proprio em `ranked-waiting.html`.
- Suportar ate 6 jogadores em mesa hexagonal.
- Usar bots de matchmaking simulado com estrategia portada do Coup Master original.

## Estado Planejado

Estado separado do casual:

- `ranked3dState` para a partida.
- `rankedResults` para resultados beta.
- `rankedStats` para estatisticas do jogador.
- `rankedStats/{uid}/unlockedAchievements` para conquistas permanentes.

As conquistas ranqueadas planejadas estao documentadas em `docs/modos-de-jogo/conquistas-ranqueadas-3d.md` e avaliadas por `js/gamemode/ranked-3d/ranked-3d-achievements.js`.

## Motor Portado

O pacote `js/gamemode/ranked-3d/` porta o nucleo ranqueado do Coup Master original para ES Modules:

- `ranked-3d-actions.js`: baseado em `ranked-rules.js` do Coup Master original.
- `ranked-3d-action-panel.js`: painel da mesa 3D para turno, resposta, bloqueio, contestação, revelação e perda de influência.
- `ranked-3d-bot-intelligence.js`: estratégia dos bots portada de `ranked-game.js` do Coup Master original.
- `ranked-3d-hud.js`: HUD da mesa 3D para fase atual, prazo, jogadores, resultado e conquistas recentes.
- `ranked-3d-engine.js`: baseado em `ranked-engine.js` do Coup Master original.
- `ranked-3d-state.js`: reexports de estado para manter a estrutura planejada do pacote 3D.
- `ranked-3d-room-state.js`: helpers puros para criar e alterar o estado da sala ranqueada.
- `ranked-3d-results.js`: monta `rankedResults/{resultKey}` e acumula `rankedStats/{uid}`.
- `ranked-3d-table-adapter.js`: projeta o estado ranqueado em cartas, moedas, deck e perfis visuais da mesa 3D.
- `ranked-3d.js`: export agregador para consumidores futuros.

O arquivo `js/firebase/ranked-room-service.js` conecta essa camada ao Realtime Database. Ele cria salas `mode: ranked`, persiste `ranked3dState` em `rooms/{roomCode}/ranked3dState` e aplica mudancas do motor por transacao para evitar sobrescrita entre clientes.

O lobby 3D ja pode criar ou entrar em salas ranqueadas e abrir a espera `ranked-waiting.html`, cujo visual foi adaptado de `ranked/ranked-waiting.html` do Coup Master original. Essa espera assina `ranked3dState`, mostra jogadores, QR/codigo da sala, prontidao, avanca matchmaking/deadlines do motor e abre `index.html?mode=ranked` quando a partida comeca.

A mesa ranqueada 3D agora le `ranked3dState` diretamente e usa uma projecao visual local para desenhar moedas, deck e influencias na mesa. A HUD ranqueada mostra fase, prazo, jogadores, resultado e conquistas recentes, enquanto o painel ranqueado chama o motor para acoes de turno, passar, bloquear, contestar, revelar a carta contestada e escolher a influencia perdida.

## Layout Da Mesa Ranqueada

O adaptador visual define pontos fixos, serializaveis e relativos aos seis assentos para a evolucao das animacoes em mesa:

- cada assento possui uma area de moedas com posicoes estaveis e levemente variadas;
- cada assento possui uma area de revelacao voltada ao centro;
- o tesouro central possui um ponto proprio, preparado para futuros efeitos de moeda;
- influencias eliminadas formam uma pilha publica no cemiterio;
- sem cartas eliminadas, o deck permanece centralizado; ao existir cemiterio, deck e pilha dividem o centro com espaco simetrico.

Esses pontos vivem em `ranked3d.layout`, criado por `js/gamemode/ranked-3d/ranked-3d-table-layout.js`. O saldo anterior e o novo saldo sao comparados a cada snapshot ranqueado: moedas entram do tesouro, saem para o tesouro ou transitam entre assentos em arcos curtos, sem alterar o estado autoritativo do motor.

O ponto do tesouro tambem recebe uma sacolinha 3D fixa em `js/three/ranked-treasury-bag.js`. Ela e apenas uma referencia visual do estoque central: nao aceita raycast, fisica ou interacao sandbox, e as moedas animadas continuam sendo a representacao de cada transferencia.

O saldo atual de cada jogador e projetado como moedas 3D travadas na sua area de moedas. Cada moeda representa uma unidade, sem interacao sandbox e sem gravidade. A primeira carga apenas monta o saldo; transferencias so animam quando o motor confirma uma alteracao posterior.

O motor tambem publica `publicReveals` com sequencia, assento, carta e resultado. Revelacoes novas saem da mao para a area de revelacao, viram publicamente e seguem em fila: influencias perdidas vao ao cemiterio, enquanto provas retornam ao destino final definido pelo motor. Quando a prova exige substituicao, o evento tambem informa a nova carta: ela fica oculta durante a prova e sai do baralho para a mao apenas depois que a carta provada retorna ao deck.

`js/three/ranked-cinematic-events.js` compara snapshots visuais consecutivos e gera eventos de moedas, revelacoes, trocas privadas e investigacoes privadas. `ranked-cinematic-event-layer.js` executa os efeitos em fila e delega moedas e revelacoes aos controladores especializados. Assim, o motor e o Firebase continuam sendo autoritativos, enquanto novos efeitos da mesa podem ser adicionados a uma timeline sem acoplar regras a Three.js.

Enquanto a mesa ranqueada esta aberta, `js/three/boot.js` agenda deadlines do motor e decisoes de bot. Cada decisao passa por `advanceRankedBotDecision()` em `js/firebase/ranked-room-service.js`, mantendo a IA dentro de transacoes do Realtime Database.

Quando o estado chega em `finished`, a mesa chama `persistRankedMatchResult()`. O resultado completo e salvo uma unica vez em `rankedResults/{resultKey}` e o jogador autenticado acumula seu proprio `rankedStats/{uid}` com protecao por `countedRooms`.

As estatisticas acumuladas tambem sao lidas em tempo real para os jogadores visiveis na mesa. O modal de perfil mostra jogos, vitorias, derrotas, taxa de vitoria e pontuacao ranqueada (`rankScore`).

Cada acumulacao de stats calcula o delta de conquistas desbloqueadas pelo resultado. Esse delta fica em `rankedStats/{uid}/latestUnlockedAchievementKeys` e tambem e anexado ao proprio jogador dentro de `rankedResults/{resultKey}/players/{uid}`.

## Regras Planejadas

- Baralho padrao competitivo.
- Influencias ocultas controladas pelo motor.
- Turnos obrigatorios.
- Golpe obrigatorio quando aplicavel.
- Janelas de bloqueio e contestacao.
- Resultado calculado pelo sistema.

## Condicoes Antes De Implementar

- Mesa casual 3D confortavel.
- Regras Firebase mais restritas.
- Motor de regras testavel.
- Separacao clara entre estado casual e competitivo.
- Decisao sobre backend autoritativo ou Cloud Functions para validacoes criticas.
