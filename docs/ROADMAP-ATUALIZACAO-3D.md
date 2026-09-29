# Roadmap De Atualizacao - Coup Master 3D

Documento de planejamento para atualizar o **Coup Master 3D** usando como referencia os sistemas ja amadurecidos no repositorio **Coup Master Original**.

Repositorio fonte:

```txt
C:\Users\barbo\Downloads\REPOSITORIOS-GITHUB\Coup-Master
```

Repositorio alvo:

```txt
C:\Users\barbo\Downloads\REPOSITORIOS-GITHUB\Coup-Master-3D
```

## 1. Visao

O Coup Master Original evoluiu para uma base mais modular, com modo ranqueado, sala personalizada, estatisticas, conquistas, leaderboard, presets de baralho, labs de comportamento visual e motores de regras testaveis.

O Coup Master 3D deve absorver essas melhorias sem perder sua identidade principal: uma mesa 3D sandbox confortavel, fisica e manipulavel. A migracao deve acontecer por camadas, primeiro trazendo estrutura e ferramentas de evolucao, depois configuracao dinamica e progresso, e por ultimo modos automatizados/rankeados.

## 2. Principios Da Migracao

- Preservar o modo 3D casual como sandbox manual.
- Nao transformar o 3D em ranqueado antes de a mesa 3D estar estavel.
- Migrar sistemas por contratos pequenos, nao copiando telas inteiras sem adaptacao.
- Preferir modulos testaveis antes de integra-los em `js/three/app.js`.
- Usar labs para testar fisica, animacoes, UI e comportamento antes de mexer no runtime principal.
- Manter o app estatico e sem build step enquanto isso continuar suficiente.
- Separar claramente dados casuais, personalizados e ranqueados.
- Tratar ranking/conquistas como beta ate existir validacao autoritativa.

## 3. Inventario Do Coup Master Original Que Vale Aproveitar

### Arquitetura E Modularizacao

- `js/gamemode/casual/`: servicos separados de audio, chat, settings, modais, guias, espectadores, presets e renderizacao.
- `js/gamemode/ranked/`: motor ranqueado, regras, renderizacao e coordenacao Firebase.
- `js/gamemode/personalized/`: modo automatizado customizado separado do ranqueado.
- `js/gamemode/game-modes.js`: identificacao de modos `casual`, `ranked` e `personalized`.
- `js/core/rules.js`: lista mestre de cartas, criacao de deck e utilitarios de cartas.
- `lab/`: ambiente isolado para experimentar cartas, fisica, animacoes, lobby, loading e guias.

### Sistemas De Produto

- Perfil ranqueado no lobby.
- Estatisticas persistidas em `rankedStats/{uid}`.
- Resultados em `rankedResults/{resultKey}`.
- Leaderboard/classificacao.
- Conquistas derivadas de estatisticas.
- Modo ranqueado automatizado com bots.
- Sala personalizada automatizada com host e bots.
- Sistema de presets/configuracao de baralho.
- Labs visuais e comportamentais.

### Testes Existentes

- Testes do motor ranqueado.
- Testes de decisoes de bot.
- Testes de falas/callouts.
- Testes de distribuicao casual.
- Testes de sala personalizada.

## 4. Estado Atual Do Coup Master 3D

O 3D ja possui:

- login Google e visitante;
- lobby simples;
- salas online por codigo;
- mesa Three.js/Rapier;
- deck fisico com limite visual;
- cartas, pilhas, moedas e extras manipulaveis;
- chat;
- espectador;
- snapshots finais sincronizados;
- acoes discretas para animacoes previsiveis;
- PWA;
- teste de merge de estado.

Principais dividas antes de importar sistemas grandes:

- `js/three/app.js` ainda concentra a maior parte do jogo;
- regras Firebase ainda sao permissivas para um MVP casual;
- nao existe uma pasta `lab/` no 3D;
- configuracao de baralho ainda depende de HTML e constantes locais;
- ranking/conquistas nao devem entrar sem separacao clara entre casual, personalizado e ranqueado.

## 5. Fase 0 - Higiene Antes Da Migracao

Objetivo: deixar o 3D pronto para receber sistemas maiores sem acumular ruido.

Tarefas:

- Corrigir metadados de SEO em `index.html` (`og:title` e `twitter:title` com `>` extra).
- Atualizar `docs/GDD.md` e `docs/TDD.md` para trocar referencias antigas de "MVP local" por "MVP online casual", quando fizer sentido.
- Decidir o comportamento do botao de historico existente no HTML: implementar, esconder ou remover temporariamente.
- Revisar referencias do service worker e `CACHE_VERSION` antes de qualquer mudanca grande em shell/JS/CSS.
- Manter `node --check` e `tests/automated/test-table-state-merge.mjs` como checagem minima.

Resultado esperado:

- documentacao e shell coerentes;
- menos inconsistencias pequenas antes da migracao real.

## 6. Fase 1 - Criar Um Lab Do 3D

Objetivo: trazer para o Coup Master 3D a pratica que funcionou no Original: testar ideias fora do runtime principal.

Estrutura sugerida:

```txt
lab/
|-- index.html
|-- card-physics-3d.html
|-- deck-config-lab.html
|-- tabletop-interaction-lab.html
|-- ranked-flow-lab.html
`-- assets-lab.html
```

Tarefas:

- Criar uma pagina indice simples para labs.
- Criar um lab de fisica 3D para cartas, pilhas e moedas.
- Criar um lab de configuracao dinamica de baralho.
- Criar um lab de animacoes de acoes e feedback visual.
- Criar um lab de HUD/touch para testar botoes sem teclado.
- Documentar que labs podem quebrar mais livremente, mas nao devem comprometer a mesa principal.

Resultado esperado:

- prototipos ficam isolados;
- fisica/animacoes podem ser refinadas antes de entrar em `app.js`;
- queda de risco em mudancas visuais grandes.

## 7. Fase 2 - Catalogo Dinamico De Cartas E Assets

Objetivo: substituir configuracoes hardcoded espalhadas por uma fonte de verdade reutilizavel.

Arquivos fonte de referencia no Original:

- `js/core/rules.js`
- `js/gamemode/casual/deck-presets.js`
- `js/gamemode/casual/rules-guides.js`
- `js/ui/asset-preloader.js`

Estrutura sugerida no 3D:

```txt
js/core/
|-- card-catalog.js
|-- deck-builder.js
`-- asset-catalog.js
```

Tarefas:

- Criar um catalogo unico com cartas base, promo, DLC 1, DLC 2 e cartas especiais.
- Centralizar label, tipo, pasta, caminho da imagem, grupo e cor.
- Fazer `js/three/config.js` consumir esse catalogo, sem perder compatibilidade com o estado atual.
- Criar presets compartilhados: `standard`, `base_promo`, `base_dlc1`, `base_dlc2`, `test`, `clear`.
- Preparar o caminho para adicionar novas cartas sem editar varios pontos.
- Adicionar teste simples para garantir que todos os assets referenciados existem.

Resultado esperado:

- configuracao de baralho fica menos manual;
- assets dinamicos podem alimentar mesa 3D, guias, preview e futuros modos.

## 8. Fase 3 - Novo Sistema De Configuracao De Baralho

Objetivo: trazer o sistema mais flexivel do Original para o 3D, adaptado ao HUD/modal atual.

Tarefas:

- Separar leitura/escrita da configuracao do DOM.
- Criar um modulo de deck config para o 3D.
- Gerar a lista de cartas do modal a partir do catalogo.
- Manter permissao de host para aplicar e resetar.
- Sincronizar `deckConfig` em `tableState`.
- Validar limites por carta antes de criar o deck.
- Testar presets e reset online com dois clientes.

Resultado esperado:

- novas cartas e expansoes entram pelo catalogo;
- modal de baralho deixa de depender de HTML repetitivo;
- host controla configuracao sem misturar regra com render 3D.

## 9. Fase 4 - Modularizacao Inicial Do 3D

Objetivo: reduzir a pressao sobre `js/three/app.js` antes de sistemas como ranking e modo automatizado.

Ordem recomendada:

1. Extrair catalogo/deck builder.
2. Extrair audio para `js/three/audio-service.js`.
3. Extrair chat para `js/three/chat-service.js`.
4. Extrair modais e HUD simples para `js/three/hud-service.js`.
5. Extrair helpers de sincronizacao para `js/three/table-sync.js`.
6. Extrair criacao de objetos 3D aos poucos: deck, cartas, moedas, extras.

Regra importante:

Nao fazer uma reescrita grande. Cada extracao deve manter comportamento igual e passar pelas checagens atuais.

Resultado esperado:

- `app.js` continua coordenador, mas perde responsabilidades perifericas;
- fica mais seguro integrar sistemas vindos do Original.

## 10. Fase 5 - Perfil, Estatisticas E Conquistas Beta

Objetivo: aproveitar a camada de progressao do Original sem transformar o casual 3D em competitivo.

Fonte de referencia:

- `rankedStats/{uid}`
- `rankedResults/{resultKey}`
- funcoes de conquistas em `js/lobby/lobby-manager.js`
- perfil rapido em `js/gamemode/casual/quick-actions.js`

Tarefas:

- Definir se o 3D vai reutilizar `rankedStats` ou criar `profileStats3d`.
- Criar um painel de perfil no lobby/mesa 3D.
- Comecar com estatisticas nao competitivas:
  - salas jogadas;
  - cartas compradas;
  - cartas viradas;
  - moedas criadas;
  - partidas resetadas pelo host;
  - tempo aproximado em mesa;
  - conquistas cosmeticas do sandbox.
- Separar conquistas casuais 3D de conquistas ranqueadas.
- Evitar pontuar ranking a partir do sandbox manual.

Resultado esperado:

- jogadores sentem progresso;
- dados casuais nao contaminam ranking;
- base preparada para conquistas reais do ranqueado depois.

## 11. Fase 6 - Sala Personalizada Automatizada Em 3D

Objetivo: criar um meio-termo antes do ranqueado: regras automatizadas, mas sem ranking.

Fonte de referencia:

- `js/gamemode/personalized/personalized-rules.js`
- `js/gamemode/personalized/personalized-engine.js`
- `docs/modos-de-jogo/modo-personalizado.md`

Decisao de produto:

A sala personalizada 3D pode usar a mesa 3D como visualizacao/experiencia, mas o motor automatizado deve ser a fonte de verdade das regras. Jogadores nao devem conseguir quebrar a partida ranqueada arrastando cartas livremente durante um fluxo automatizado.

Tarefas:

- Criar `mode = "personalized-3d"` ou adaptar `personalized` com flag 3D.
- Criar estado separado no Firebase, por exemplo `personalized3dState`.
- Prototipar no lab primeiro.
- Definir quais objetos fisicos ficam livres e quais ficam travados pelo motor.
- Mostrar turnos, acoes, respostas, bloqueios e perdas de influencia no HUD 3D.
- Usar bots IA do Original como base.
- Garantir que nao grava `rankedStats` nem `rankedResults`.

Resultado esperado:

- primeiro modo assistido/automatizado no 3D;
- base segura para testar motor com visual 3D;
- ranking ainda fica protegido.

## 12. Fase 7 - Modo Ranqueado 3D Beta

Objetivo: portar o ranqueado como modo separado, sem contaminar o sandbox casual.

Fonte de referencia:

- `js/gamemode/ranked/ranked-rules.js`
- `js/gamemode/ranked/ranked-engine.js`
- `js/gamemode/ranked/ranked-game.js`
- `docs/modos-de-jogo/modo-ranqueado.md`

Condicoes antes de comecar:

- catalogo dinamico funcionando;
- lab 3D disponivel;
- modulo de sync mais isolado;
- sala personalizada 3D testada;
- regras Firebase mais restritas ou pelo menos documentadas/versionadas.

Tarefas:

- Criar fluxo visual separado no lobby: Casual 3D, Personalizado 3D e Ranqueado 3D.
- Definir limite inicial de jogadores do ranqueado 3D, provavelmente 6 como no Original.
- Usar motor de regras como fonte de verdade.
- Bloquear manipulação livre de cartas ranqueadas fora das acoes permitidas.
- Adaptar resultado, pontuacao e perfil.
- Marcar claramente como beta enquanto resultado for client-side.

Resultado esperado:

- ranqueado 3D experimental;
- experiencia automatizada visualmente mais rica;
- sandbox casual preservado.

## 13. Fase 8 - Firebase Rules E Validacao

Objetivo: reduzir o risco de importar ranking/conquistas para um ambiente com escrita ampla.

Tarefas:

- Revisar `js/firebase/firebase-rules.json`.
- Separar permissoes por caminho:
  - sala casual;
  - tableState;
  - tableActions;
  - chat;
  - spectatorRequests;
  - profileStats/conquistas;
  - rankedStats/rankedResults;
  - modos automatizados.
- Criar `database.rules.json` versionado se o projeto passar a usar fluxo Firebase CLI/emulator.
- Documentar diferenca entre seguranca beta e seguranca competitiva.
- Avaliar Cloud Functions ou backend autoritativo para ranking real.

Resultado esperado:

- menos dependencia de checagem no cliente;
- base mais confiavel para ranked;
- risco menor de alguem escrever resultados falsos.

## 14. Fase 9 - Matchmaking, Temporadas E Ranking Confiavel

Objetivo: transformar o ranqueado 3D de beta em sistema competitivo real.

Tarefas:

- Separar ranking beta de ranking oficial.
- Criar matchmaking real ou fila simples.
- Definir abandono, reconexao e preenchimento com bots.
- Tornar resultados idempotentes.
- Mover validacao de resultado para backend autoritativo quando possivel.
- Criar temporadas, divisao ou ligas apenas depois da validacao.

Resultado esperado:

- leaderboard deixa de ser apenas experimental;
- ranking fica menos manipulavel;
- produto pode sustentar competicao real.

## 15. Ordem Pratica Recomendada

1. Corrigir pequenas inconsistencias do 3D.
2. Criar `lab/` no 3D.
3. Criar catalogo dinamico de cartas/assets.
4. Migrar presets e configuracao dinamica de baralho.
5. Extrair audio/chat/HUD/sync de `app.js` aos poucos.
6. Criar perfil e conquistas casuais 3D beta.
7. Portar sala personalizada automatizada para lab 3D.
8. Integrar sala personalizada 3D no produto.
9. Endurecer Firebase Rules.
10. Portar ranqueado 3D beta.
11. Evoluir ranking para validacao autoritativa.

## 16. Checklist De Aceite Por Fase

### Para mudancas em JS 3D

```powershell
node --check js\three\app.js
node --check js\three\boot.js
node --check js\firebase\room-service.js
node tests\automated\test-table-state-merge.mjs
```

### Para novos modulos

- Rodar `node --check` no modulo novo.
- Adicionar teste Node quando houver funcao pura.
- Validar que imports funcionam em navegador sem build step.

### Para mudancas visuais/interativas

- Abrir `http://127.0.0.1:4173/index.html`.
- Testar desktop e viewport mobile.
- Testar mouse e touch quando a mudanca envolver HUD/drag.
- Testar carta, pilha, deck, moeda e extra se houver fisica envolvida.

### Para mudancas online

- Testar com dois clientes na mesma sala.
- Confirmar que host e nao-host veem permissoes corretas.
- Confirmar que snapshots remotos nao apagam interacao local pendente.
- Confirmar que reentrada preserva slot.

## 17. Riscos Especificos

| Risco | Cuidado |
| --- | --- |
| Copiar UI 2D direto para o 3D | Adaptar para HUD 3D e fluxo de mesa, nao transplantar telas inteiras. |
| Misturar sandbox e ranqueado | Manter modos e estados separados. |
| `app.js` crescer ainda mais | Extrair perifericos antes de importar sistemas grandes. |
| Ranking client-side parecer oficial | Rotular como beta e separar de ranking competitivo real. |
| Assets dinamicos quebrarem cartas 3D | Criar teste de existencia de assets e lab de renderizacao. |
| Firebase permissivo demais | Versionar/revisar rules antes de liberar progresso sensivel. |
| Fisica conflitar com motor automatizado | Em modos automatizados, o motor manda; fisica vira apresentacao/controlada. |

## 18. Decisoes A Tomar

- O 3D deve reutilizar `rankedStats` do Original ou criar estatisticas separadas?
- O ranqueado 3D substitui o ranqueado 2D no futuro ou vira modo alternativo?
- A sala personalizada 3D tera manipulacao livre ou mesa travada pelo motor?
- O catalogo de cartas sera copiado para ambos os repositorios ou mantido separado por enquanto?
- Labs do 3D devem viver em `lab/` no proprio repositorio ou em uma area externa de prototipos?
- O projeto deve continuar sem build step apos crescer em modulos ES?

## 19. Primeira Entrega Recomendada

Primeiro pacote pequeno:

1. Criar `lab/index.html`.
2. Criar `js/core/card-catalog.js`.
3. Criar `js/core/deck-builder.js`.
4. Fazer `js/three/config.js` consumir o catalogo sem alterar visual.
5. Criar teste simples de catalogo/assets.
6. Migrar presets de baralho para modulo proprio.

Esse pacote prepara o terreno para quase todo o restante e tem risco menor do que iniciar por ranking, conquistas ou modo ranqueado.
