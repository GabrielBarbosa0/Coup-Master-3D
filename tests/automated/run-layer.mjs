import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const layers = Object.freeze({
  navigation: [
    'tests/automated/test-entry-routing.mjs'
  ],
  modes: [
    'tests/automated/test-game-modes.mjs'
  ],
  sync: [
    'tests/automated/test-table-state-merge.mjs',
    'tests/automated/test-table-sync-service.mjs'
  ],
  rules: [
    'tests/automated/test-ranked-3d-actions.mjs',
    'tests/automated/test-ranked-3d-achievements.mjs'
  ],
  engine: [
    'tests/automated/test-ranked-3d-engine.mjs',
    'tests/automated/test-ranked-3d-bot-intelligence.mjs',
    'tests/automated/test-ranked-3d-results.mjs'
  ],
  state: [
    'tests/automated/test-ranked-room-state.mjs'
  ],
  ui: [
    'tests/automated/test-interaction-policy.mjs',
    'tests/automated/test-official-log-service.mjs',
    'tests/automated/test-ranked-3d-action-panel.mjs',
    'tests/automated/test-ranked-3d-results-modal.mjs',
    'tests/automated/test-ranked-3d-coin-transfers.mjs',
    'tests/automated/test-ranked-coin-animation-controller.mjs',
    'tests/automated/test-ranked-reveal-animation-controller.mjs',
    'tests/automated/test-ranked-initial-deal-animation-controller.mjs',
    'tests/automated/test-ranked-cinematic-event-layer.mjs',
    'tests/automated/test-ranked-3d-table-layout.mjs',
    'tests/automated/test-ranked-3d-table-adapter.mjs'
  ]
});

const selectedLayer = process.argv[2] || 'all';
const selectedFiles = selectedLayer === 'all'
  ? Object.values(layers).flat()
  : layers[selectedLayer];

if (!selectedFiles) {
  console.error(`Camada desconhecida: ${selectedLayer}`);
  console.error(`Camadas disponiveis: all, ${Object.keys(layers).join(', ')}`);
  process.exit(1);
}

for (const file of selectedFiles) {
  const result = spawnSync(process.execPath, [file], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`automated layer "${selectedLayer}": ${selectedFiles.length} test file(s) passed`);
