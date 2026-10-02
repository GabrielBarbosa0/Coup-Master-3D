import assert from 'node:assert/strict';
import {
  createOfficialLogModel,
  getOfficialLogClipboardText
} from '../../js/three/official-log-service.js';

const t = (_key, _params, fallback) => fallback;

{
  const model = createOfficialLogModel([], t);
  assert.equal(model.items.length, 0);
  assert.equal(model.emptyText, 'Nenhum registro oficial ainda.');
  assert.equal(getOfficialLogClipboardText(model), 'Nenhum registro oficial ainda.');
}

{
  const model = createOfficialLogModel([
    { id: '1', message: 'A partida ranqueada começou.', type: 'system', timestamp: 1000, turn: 0 },
    { id: '2', message: '', type: 'info' },
    { id: '3', message: 'Gabriel escolheu Taxar.', type: 'action', timestamp: 2000, turn: 1 }
  ], t);

  assert.equal(model.items.length, 2);
  assert.equal(model.items[0].type, 'system');
  assert.equal(model.items[1].turn, 1);
  assert.equal(
    getOfficialLogClipboardText(model),
    'A partida ranqueada começou.\nGabriel escolheu Taxar.'
  );
}

console.log('official-log-service: model and clipboard text passed');
