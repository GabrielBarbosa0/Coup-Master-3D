import assert from 'node:assert/strict';

global.window = {
  setTimeout,
  clearTimeout
};

function state(overrides = {}) {
  return {
    version: 1,
    deckConfig: {},
    alternativeRuleDraw: null,
    deck: [{ id: 'deck-card-1', type: 'duque', location: 'deck', owner: null, faceUp: false }],
    deckTransform: null,
    objectId: 1,
    stackId: 1,
    players: [{ id: 1, coinCount: 0, cards: [] }],
    tableCards: [],
    cards: [],
    objects: [],
    stacks: [],
    ...overrides
  };
}

function cardEntry(id, owner = 1) {
  return {
    data: {
      id,
      type: 'duque',
      folder: 'base',
      faceUp: true,
      location: `player-${owner}`,
      owner,
      stackId: null
    },
    position: { x: 0, y: 0.42, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 }
  };
}

function wait(ms = 240) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function importFreshTableSyncService() {
  const suffix = `?test=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return import(`../../js/three/table-sync-service.js${suffix}`);
}

async function testEquivalentConfirmationDoesNotReapplyScene() {
  const {
    scheduleTableSync,
    setupTableSyncService
  } = await importFreshTableSyncService();

  const localState = state({
    deck: [],
    cards: [cardEntry('drawn-card-1')],
    players: [{ id: 1, coinCount: 0, cards: [cardEntry('drawn-card-1').data] }]
  });
  let applyCount = 0;
  let confirmCount = 0;

  setupTableSyncService({
    getActivePlayer: () => 1,
    getUserUid: () => 'user-local',
    getTableState: () => localState,
    applyTableState: () => {
      applyCount += 1;
    },
    isApplyingRemoteState: () => false,
    isSceneInteractionPending: () => false,
    publishOnlineState: () => async (tableState) => ({
      cards: JSON.parse(JSON.stringify(tableState.cards)).map(entry => ({
        quaternion: entry.quaternion,
        position: entry.position,
        data: {
          stackId: entry.data.stackId,
          owner: entry.data.owner,
          location: entry.data.location,
          faceUp: entry.data.faceUp,
          folder: entry.data.folder,
          type: entry.data.type,
          id: entry.data.id
        }
      })),
      deck: JSON.parse(JSON.stringify(tableState.deck)),
      players: JSON.parse(JSON.stringify(tableState.players)),
      version: tableState.version,
      deckConfig: JSON.parse(JSON.stringify(tableState.deckConfig)),
      alternativeRuleDraw: tableState.alternativeRuleDraw,
      deckTransform: tableState.deckTransform,
      objectId: tableState.objectId,
      stackId: tableState.stackId,
      tableCards: JSON.parse(JSON.stringify(tableState.tableCards)),
      objects: JSON.parse(JSON.stringify(tableState.objects)),
      stacks: JSON.parse(JSON.stringify(tableState.stacks)),
      syncRevision: 7,
      updatedAt: 123456,
      updatedBy: 'user-local'
    }),
    publishOnlineAction: () => null,
    confirmLocalTableState: () => {
      confirmCount += 1;
    }
  });

  scheduleTableSync();
  await wait();

  assert.equal(applyCount, 0, 'estado local confirmado nao deve recriar a cena');
  assert.equal(confirmCount, 1, 'estado local confirmado deve atualizar apenas a base de sync');
}

async function testLocalPublishResultDoesNotReapplyScene() {
  const {
    scheduleTableSync,
    setupTableSyncService
  } = await importFreshTableSyncService();

  const localState = state();
  let applyCount = 0;
  let confirmCount = 0;

  setupTableSyncService({
    getActivePlayer: () => 1,
    getUserUid: () => 'user-local',
    getTableState: () => localState,
    applyTableState: (snapshot) => {
      applyCount += 1;
      assert.equal(snapshot.objects.length, 1);
    },
    isApplyingRemoteState: () => false,
    isSceneInteractionPending: () => false,
    publishOnlineState: () => async (tableState) => ({
      ...JSON.parse(JSON.stringify(tableState)),
      objects: [{ id: 'remote-coin', kind: 'gold-coin' }],
      syncRevision: 8,
      updatedAt: 123457,
      updatedBy: 'user-remote'
    }),
    publishOnlineAction: () => null,
    confirmLocalTableState: () => {
      confirmCount += 1;
    }
  });

  scheduleTableSync();
  await wait();

  assert.equal(applyCount, 0, 'retorno de publicacao local nao deve recriar a cena');
  assert.equal(confirmCount, 1, 'retorno de publicacao local deve apenas confirmar base de sync');
}

async function testReceivedRemoteDifferenceStillReappliesScene() {
  const {
    receiveTableState,
    setupTableSyncService
  } = await importFreshTableSyncService();

  let applyCount = 0;
  let confirmCount = 0;

  setupTableSyncService({
    getActivePlayer: () => 1,
    getUserUid: () => 'user-local',
    getTableState: () => state(),
    applyTableState: (snapshot) => {
      applyCount += 1;
      assert.equal(snapshot.objects.length, 1);
    },
    isApplyingRemoteState: () => false,
    isSceneInteractionPending: () => false,
    publishOnlineState: () => null,
    publishOnlineAction: () => null,
    confirmLocalTableState: () => {
      confirmCount += 1;
    }
  });

  receiveTableState(state({
    objects: [{ id: 'remote-coin', kind: 'gold-coin' }],
    syncRevision: 8,
    updatedAt: 123457,
    updatedBy: 'user-remote'
  }));

  assert.equal(applyCount, 1, 'snapshot remoto diferente recebido deve ser aplicado na cena');
  assert.equal(confirmCount, 0, 'snapshot remoto recebido nao deve passar como confirmacao local');
}

async function testScheduledSyncWaitsForSceneInteraction() {
  const {
    scheduleTableSync,
    setupTableSyncService
  } = await importFreshTableSyncService();

  let scenePending = true;
  let publishCount = 0;

  setupTableSyncService({
    getActivePlayer: () => 1,
    getUserUid: () => 'user-local',
    getTableState: () => state(),
    applyTableState: () => {},
    isApplyingRemoteState: () => false,
    isSceneInteractionPending: () => scenePending,
    publishOnlineState: () => async (tableState) => {
      publishCount += 1;
      return tableState;
    },
    publishOnlineAction: () => null,
    confirmLocalTableState: () => {}
  });

  scheduleTableSync();
  await wait(260);
  assert.equal(publishCount, 0, 'sync nao deve publicar enquanto carta/gesto ainda esta em animacao');

  scenePending = false;
  await wait(180);
  assert.equal(publishCount, 1, 'sync deve publicar depois que a animacao local termina');
}

await testEquivalentConfirmationDoesNotReapplyScene();
await testLocalPublishResultDoesNotReapplyScene();
await testReceivedRemoteDifferenceStillReappliesScene();
await testScheduledSyncWaitsForSceneInteraction();

console.log('table-sync-service: ok');
