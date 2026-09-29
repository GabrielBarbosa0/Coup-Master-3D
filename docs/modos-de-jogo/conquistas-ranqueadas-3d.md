# Coup Master 3D - Conquistas Ranqueadas

Este documento prepara o sistema de conquistas do futuro **Modo Ranqueado 3D**.

A fonte executavel das condicoes fica em:

```txt
js/gamemode/ranked-3d/ranked-3d-achievements.js
```

O teste de paridade fica em:

```txt
tools/test-ranked-3d-achievements.mjs
```

## Regras Gerais

- Conquistas pertencem ao ranqueado 3D.
- Modo casual 3D nao progride conquistas.
- Modo personalizado 3D nao deve progredir conquistas ranqueadas.
- Uma conquista desbloqueada permanece desbloqueada.
- Requisitos variaveis, como pontuacao e precisao de contestacao, nao removem conquistas ja obtidas.
- Uma partida deve ser contabilizada uma unica vez por chave de resultado.

## Persistencia Planejada

O progresso acumulado deve ficar em:

```txt
rankedStats/{uid}
```

O mapa permanente de desbloqueios deve ficar em:

```txt
rankedStats/{uid}/unlockedAchievements
```

Resultados de partida devem ficar em:

```txt
rankedResults/{resultKey}
```

## Contrato Com O Motor Ranqueado

O motor ranqueado 3D deve produzir `matchStats` por jogador ao final da partida. Esses dados sao acumulados em `rankedStats/{uid}`. Depois da acumulacao, `evaluateRanked3dAchievements(stats)` recalcula o mapa de conquistas desbloqueadas.

Campos esperados incluem:

- `games`, `wins`, `losses`, `rankScore`;
- `bestWinStreak`;
- `bluffs`, `provenBluffs`, `honestGames`, `honestWins`;
- `coups`, `forcedCoups`, `assassinations`, `steals`, `coinsStolen`;
- `challenges`, `successfulChallenges`, `failedChallenges`, `challengeAccuracy`;
- `condessaBlocks`, `foreignAidBlocks`, `captainBlocks`, `ambassadorBlocks`;
- `ambassadorExchanges`, `inquisitorInspections`;
- marcadores especiais como `perfectWins`, `comebackWins`, `revengeWins` e `allRolesClaimedWins`.

## Categorias

- Participacao e vitorias.
- Blefes e contestacoes.
- Acoes ofensivas.
- Personagens e bloqueios.
- Desempenho e situacoes especiais.

## Observacao

As 50 conquistas iniciais seguem a lista do Coup Master original. Se qualquer requisito mudar no codigo, este documento e o teste precisam ser atualizados juntos.
