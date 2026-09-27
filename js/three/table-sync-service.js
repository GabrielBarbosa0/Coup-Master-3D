import { mergeTableStates } from '../firebase/table-state-merge.mjs';

const tableSync = {
  getActivePlayer: null,
  getUserUid: null,
  getTableState: null,
  applyTableState: null,
  isApplyingRemoteState: null,
  isSceneInteractionPending: null,
  publishOnlineAction: null,
  publishOnlineState: null,
  syncTimer: null,
  syncGeneration: 0,
  pendingSyncCount: 0,
  syncQueued: false,
  syncRebaseState: null,
  pendingRemoteState: null,
  lastAppliedTableState: null,
  suppressCount: 0,
  appliedActions: new Set()
};

// Configura as pontes entre sincronizacao online e estado local da mesa.
export function setupTableSyncService(options) {
  tableSync.getActivePlayer = options.getActivePlayer;
  tableSync.getUserUid = options.getUserUid;
  tableSync.getTableState = options.getTableState;
  tableSync.applyTableState = options.applyTableState;
  tableSync.isApplyingRemoteState = options.isApplyingRemoteState;
  tableSync.isSceneInteractionPending = options.isSceneInteractionPending;
  tableSync.publishOnlineAction = options.publishOnlineAction;
  tableSync.publishOnlineState = options.publishOnlineState;
}

// Agenda uma transacao de estado final sem transmitir animacoes intermediarias.
export function scheduleTableSync() {
  if (tableSync.isApplyingRemoteState?.()) return;
  if (tableSync.suppressCount > 0) return;
  if (!tableSync.publishOnlineState?.()) return;

  tableSync.syncGeneration += 1;
  const generation = tableSync.syncGeneration;
  window.clearTimeout(tableSync.syncTimer);
  tableSync.syncTimer = window.setTimeout(() => publishScheduledTableState(generation), 180);
}

// Publica uma acao discreta para outros clientes reproduzirem a animacao.
export function publishTableAction(type, payload = {}) {
  const publish = tableSync.publishOnlineAction?.();
  if (!publish) return null;

  const action = {
    id: createTableActionId(),
    type,
    payload,
    actorSeat: tableSync.getActivePlayer?.(),
    createdAt: Date.now()
  };
  tableSync.appliedActions.add(action.id);
  publish(action);
  return action;
}

// Verifica se uma acao recebida ainda precisa ser aplicada localmente.
export function shouldApplyTableAction(action) {
  if (!action?.id || tableSync.appliedActions.has(action.id)) return false;
  if (action.actorUid && action.actorUid === tableSync.getUserUid?.()) return false;

  tableSync.appliedActions.add(action.id);
  return true;
}

// Bloqueia publicacao de tableState ate uma animacao discreta terminar.
export function runWithTableSyncSuppressed(durationMs, actionFn, onComplete = null) {
  tableSync.suppressCount += 1;

  try {
    actionFn();
  } finally {
    window.setTimeout(() => {
      tableSync.suppressCount = Math.max(0, tableSync.suppressCount - 1);
      onComplete?.();
      flushPendingRemoteState();
    }, durationMs);
  }
}

// Adia snapshots remotos enquanto uma interacao local ainda precisa ser publicada.
export function receiveTableState(snapshot) {
  if (!snapshot || snapshot.version !== 1) return;

  if (isLocalTableInteractionPending()) {
    const pendingRevision = Number(tableSync.pendingRemoteState?.syncRevision) || 0;
    const nextRevision = Number(snapshot.syncRevision) || 0;
    if (!tableSync.pendingRemoteState || nextRevision >= pendingRevision) {
      tableSync.pendingRemoteState = cloneTableState(snapshot);
    }
    return;
  }

  applyRemoteTableState(snapshot);
}

// Aplica o snapshot remoto mais recente assim que a fila local estiver livre.
export function flushPendingRemoteState() {
  if (!tableSync.pendingRemoteState || isLocalTableInteractionPending()) return;
  const snapshot = tableSync.pendingRemoteState;
  tableSync.pendingRemoteState = null;
  applyRemoteTableState(snapshot);
}

// Guarda a ultima base remota confirmada apos aplicacao direta pelo app.
export function setLastAppliedTableState(snapshot) {
  tableSync.lastAppliedTableState = cloneTableState(snapshot);
  tableSync.pendingRemoteState = null;
}

// Informa se o servico esta no meio de uma publicacao ou supressao.
export function isTableSyncBusy() {
  return Boolean(
    tableSync.syncTimer
    || tableSync.pendingSyncCount > 0
    || tableSync.suppressCount > 0
  );
}

// Serializa gravacoes locais para que toda transacao use a ultima base confirmada.
async function publishScheduledTableState(generation) {
  tableSync.syncTimer = null;
  if (tableSync.pendingSyncCount > 0) {
    tableSync.syncQueued = true;
    return;
  }

  tableSync.pendingSyncCount = 1;
  let retryDelay = 0;
  const localSceneState = tableSync.getTableState();
  let stateToPublish = localSceneState;
  const rebaseState = tableSync.syncRebaseState;

  if (rebaseState) {
    stateToPublish = mergeTableStates(
      rebaseState.base,
      localSceneState,
      rebaseState.remote
    );
    stateToPublish.syncRevision = Number(rebaseState.remote?.syncRevision) || 0;
    tableSync.syncRebaseState = null;
  }

  try {
    const mergedState = await tableSync.publishOnlineState()(
      stateToPublish,
      cloneTableState(tableSync.lastAppliedTableState)
    );
    if (mergedState) {
      tableSync.lastAppliedTableState = cloneTableState(mergedState);
      if (generation === tableSync.syncGeneration && !tableSync.syncQueued) {
        applyRemoteTableState(mergedState);
      } else {
        tableSync.syncRebaseState = {
          base: cloneTableState(localSceneState),
          remote: cloneTableState(mergedState)
        };
      }
    }
  } catch {
    if (rebaseState) tableSync.syncRebaseState = rebaseState;
    if (generation === tableSync.syncGeneration) {
      tableSync.syncQueued = true;
      retryDelay = 500;
    }
  } finally {
    tableSync.pendingSyncCount = 0;

    if (tableSync.syncQueued) {
      tableSync.syncQueued = false;
      const queuedGeneration = tableSync.syncGeneration;
      tableSync.syncTimer = window.setTimeout(
        () => publishScheduledTableState(queuedGeneration),
        retryDelay
      );
      return;
    }

    flushPendingRemoteState();
  }
}

// Detecta qualquer operacao local que seria perdida por um snapshot remoto imediato.
function isLocalTableInteractionPending() {
  return Boolean(
    isTableSyncBusy()
    || tableSync.isSceneInteractionPending?.()
  );
}

// Aplica estado remoto pela ponte do app e atualiza a base confirmada.
function applyRemoteTableState(snapshot) {
  tableSync.applyTableState(snapshot);
  setLastAppliedTableState(snapshot);
}

// Cria IDs locais estaveis o bastante para deduplicar eventos recebidos.
function createTableActionId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `action-${Date.now()}-${randomPart}`;
}

// Clona snapshots serializaveis usados como base da mesclagem transacional.
function cloneTableState(snapshot) {
  return snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;
}
