# Testes automatizados

Esta pasta guarda testes pequenos de Node.js para regras puras e servicos sem navegador.

Execute a partir da raiz do projeto:

```powershell
node tests\automated\run-layer.mjs all
node tests\automated\run-layer.mjs navigation
node tests\automated\run-layer.mjs modes
node tests\automated\run-layer.mjs sync
node tests\automated\run-layer.mjs rules
node tests\automated\run-layer.mjs engine
node tests\automated\run-layer.mjs state
node tests\automated\run-layer.mjs ui
```

Camadas atuais:

| Camada | Cobertura |
| --- | --- |
| `navigation` | entrada segura, token de abertura de sala e redirecionamento para lobby |
| `modes` | registro dos modos, permissao de criacao e configuracao de rota/estado |
| `sync` | merge e sincronizacao de mesa casual sem navegador |
| `rules` | regras puras ranqueadas e requisitos de conquistas |
| `engine` | motor ranqueado, bots e persistencia de resultados |
| `state` | helpers de estado da sala ranqueada antes do Firebase |
| `ui` | modelos puros de painel, modal de resultados e adaptador visual da mesa |

Arquivos individuais:

```powershell
node tests\automated\test-entry-routing.mjs
node tests\automated\test-game-modes.mjs
node tests\automated\test-table-state-merge.mjs
node tests\automated\test-table-sync-service.mjs
node tests\automated\test-ranked-3d-actions.mjs
node tests\automated\test-ranked-3d-achievements.mjs
node tests\automated\test-ranked-3d-engine.mjs
node tests\automated\test-ranked-3d-bot-intelligence.mjs
node tests\automated\test-ranked-3d-results.mjs
node tests\automated\test-ranked-room-state.mjs
node tests\automated\test-official-log-service.mjs
node tests\automated\test-ranked-3d-action-panel.mjs
node tests\automated\test-ranked-3d-results-modal.mjs
node tests\automated\test-ranked-3d-table-adapter.mjs
```

Novos testes automatizados devem ficar aqui quando validarem modulos isolados do motor do jogo.
