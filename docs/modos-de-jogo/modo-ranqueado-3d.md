# Coup Master 3D - Modo Ranqueado

O **Modo Ranqueado 3D** e um modo planejado. Ele deve usar a apresentacao 3D da mesa, mas com regras controladas por um motor de jogo mais rigido que o modo casual.

## Objetivo

Criar uma partida competitiva automatizada em que o sistema controla turnos, acoes, custos, alvos, bloqueios, contestacoes, perdas de influencia, eliminacao e resultado.

## Diferenca Para O Casual 3D

No casual, a mesa e sandbox e os jogadores resolvem a partida manualmente.

No ranqueado, o estado visual 3D deve ser consequencia do motor de regras, nao a autoridade principal da partida. Drag livre nao deve decidir regras competitivas.

## Entrada Planejada

- Exigir conta Google.
- Usar uma espera/matchmaking proprio.
- Suportar ate 6 jogadores.
- Permitir bots apenas quando o design do ranqueado aceitar matchmaking simulado.

## Estado Planejado

Estado separado do casual:

- `ranked3dState` para a partida.
- `rankedResults` para resultados beta.
- `rankedStats` para estatisticas do jogador.
- `rankedStats/{uid}/unlockedAchievements` para conquistas permanentes.

As conquistas ranqueadas planejadas estao documentadas em `docs/modos-de-jogo/conquistas-ranqueadas-3d.md` e avaliadas por `js/gamemode/ranked-3d/ranked-3d-achievements.js`.

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
