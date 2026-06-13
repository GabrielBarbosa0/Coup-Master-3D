const MISSING = Symbol('missing');

// Mescla uma alteracao local com o estado mais recente sem apagar acoes concorrentes.
export function mergeTableStates(baseState, localState, remoteState) {
  const base = normalizeState(baseState);
  const local = normalizeState(localState);
  const remote = normalizeState(remoteState);

  if (!remoteState) {
    const initialState = cloneValue(local);
    initialState.syncRevision = Math.max(Number(local.syncRevision) || 0, 0) + 1;
    return initialState;
  }

  const merged = {
    version: Math.max(Number(local.version) || 1, Number(remote.version) || 1),
    syncRevision: Math.max(Number(remote.syncRevision) || 0, Number(local.syncRevision) || 0) + 1,
    deckConfig: mergeValue(base.deckConfig, local.deckConfig, remote.deckConfig),
    deck: mergeEntityList(base.deck, local.deck, remote.deck, getCardId),
    deckTransform: mergeValue(base.deckTransform, local.deckTransform, remote.deckTransform),
    objectId: Math.max(Number(base.objectId) || 1, Number(local.objectId) || 1, Number(remote.objectId) || 1),
    stackId: Math.max(Number(base.stackId) || 1, Number(local.stackId) || 1, Number(remote.stackId) || 1),
    players: mergePlayers(base.players, local.players, remote.players),
    cards: mergeEntityList(base.cards, local.cards, remote.cards, getCardEntryId),
    objects: mergeEntityList(base.objects, local.objects, remote.objects, item => item?.id),
    stacks: mergeEntityList(base.stacks, local.stacks, remote.stacks, item => item?.id)
  };

  preserveConcurrentDeckDraws(base, local, remote, merged);
  rebuildCardCollections(merged);
  return merged;
}

// Reserva atomicamente a proxima carta do deck para um assento especifico.
export function drawCardFromTableState(tableState, playerId, drawActionId) {
  const seat = Number(playerId);
  if (!tableState || !Number.isInteger(seat) || seat < 1 || seat > 8) return null;

  const state = cloneValue(tableState);
  state.deck = Array.isArray(state.deck) ? state.deck : [];
  state.cards = Array.isArray(state.cards) ? state.cards : [];
  state.players = Array.isArray(state.players) ? state.players : [];

  const existingEntry = state.cards.find(entry => entry?.drawActionId === drawActionId);
  if (existingEntry?.data) {
    return { state, card: cloneValue(existingEntry.data) };
  }

  const card = state.deck.pop();
  if (!card) return null;

  const drawnCard = {
    ...cloneValue(card),
    owner: seat,
    location: `player-${seat}`,
    faceUp: true,
    stackId: null
  };
  state.cards = state.cards.filter(entry => entry?.data?.id !== drawnCard.id);
  state.cards.push({
    data: drawnCard,
    position: { x: 0, y: 0.9, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    drawActionId
  });

  const player = state.players.find(item => Number(item?.id) === seat);
  if (player) {
    player.cards = Array.isArray(player.cards) ? player.cards : [];
    player.cards = player.cards.filter(item => item?.id !== drawnCard.id);
    player.cards.push(cloneValue(drawnCard));
  }

  state.syncRevision = (Number(state.syncRevision) || 0) + 1;
  return { state, card: cloneValue(drawnCard) };
}

// Preenche colecoes ausentes para simplificar a mesclagem.
function normalizeState(state) {
  return {
    version: Number(state?.version) || 1,
    syncRevision: Number(state?.syncRevision) || 0,
    deckConfig: state?.deckConfig || {},
    deck: Array.isArray(state?.deck) ? state.deck : [],
    deckTransform: state?.deckTransform || null,
    objectId: Number(state?.objectId) || 1,
    stackId: Number(state?.stackId) || 1,
    players: Array.isArray(state?.players) ? state.players : [],
    tableCards: Array.isArray(state?.tableCards) ? state.tableCards : [],
    cards: Array.isArray(state?.cards) ? state.cards : [],
    objects: Array.isArray(state?.objects) ? state.objects : [],
    stacks: Array.isArray(state?.stacks) ? state.stacks : []
  };
}

// Mescla contadores por delta para dois cliques simultaneos nao virarem apenas um.
function mergePlayers(basePlayers, localPlayers, remotePlayers) {
  const baseMap = mapById(basePlayers, player => player?.id);
  const localMap = mapById(localPlayers, player => player?.id);
  const remoteMap = mapById(remotePlayers, player => player?.id);
  const ids = new Set([...baseMap.keys(), ...remoteMap.keys(), ...localMap.keys()]);

  return [...ids]
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => {
      const base = baseMap.get(id) || { id, coinCount: 0 };
      const local = localMap.get(id) || base;
      const remote = remoteMap.get(id) || base;
      const baseCount = Number(base.coinCount) || 0;
      const localCount = Number(local.coinCount) || 0;
      const remoteCount = Number(remote.coinCount) || 0;
      const localChanged = localCount !== baseCount;
      const remoteChanged = remoteCount !== baseCount;
      let coinCount = baseCount;

      if (localChanged && remoteChanged) {
        coinCount = remoteCount + (localCount - baseCount);
      } else if (localChanged) {
        coinCount = localCount;
      } else if (remoteChanged) {
        coinCount = remoteCount;
      }

      return {
        id: Number(id),
        coinCount: Math.max(0, Math.min(99, coinCount)),
        cards: []
      };
    });
}

// Preserva duas compras que partiram do mesmo topo, atribuindo outra carta ao segundo jogador.
function preserveConcurrentDeckDraws(base, local, remote, merged) {
  const baseDeckIds = new Set(base.deck.map(getCardId).filter(Boolean));
  const baseCardIds = new Set(base.cards.map(getCardEntryId).filter(Boolean));
  const localCards = mapById(local.cards, getCardEntryId);
  const remoteCards = mapById(remote.cards, getCardEntryId);
  const mergedCards = mapById(merged.cards, getCardEntryId);

  localCards.forEach((localEntry, cardId) => {
    const remoteEntry = remoteCards.get(cardId);
    if (!remoteEntry || baseCardIds.has(cardId) || !baseDeckIds.has(cardId)) return;
    if (sameCardDestination(localEntry, remoteEntry)) return;

    const replacement = merged.deck[merged.deck.length - 1];
    if (!replacement) return;

    merged.deck.pop();
    mergedCards.set(cardId, cloneValue(remoteEntry));
    mergedCards.set(replacement.id, {
      ...cloneValue(localEntry),
      data: {
        ...cloneValue(replacement),
        faceUp: Boolean(localEntry.data?.faceUp),
        location: localEntry.data?.location || 'table',
        owner: localEntry.data?.owner ?? null,
        stackId: localEntry.data?.stackId || null
      }
    });
  });

  merged.cards = [...mergedCards.values()];
}

// Compara apenas o destino logico relevante de uma carta comprada.
function sameCardDestination(first, second) {
  return first?.data?.owner === second?.data?.owner
    && first?.data?.location === second?.data?.location;
}

// Reconstroi maos e cartas de mesa a partir da lista autoritativa de cartas.
function rebuildCardCollections(state) {
  const players = mapById(state.players, player => player?.id);
  state.tableCards = [];

  state.cards.forEach((entry) => {
    const data = entry?.data;
    if (!data?.id) return;

    if (data.owner) {
      const player = players.get(data.owner);
      if (player) player.cards.push(cloneValue(data));
      return;
    }

    if (data.location === 'table') state.tableCards.push(cloneValue(data));
  });
}

// Mescla listas identificadas sem transformar uma exclusao em perda de outra entidade.
function mergeEntityList(baseList, localList, remoteList, getId) {
  const baseMap = mapById(baseList, getId);
  const localMap = mapById(localList, getId);
  const remoteMap = mapById(remoteList, getId);
  const ids = new Set([...remoteMap.keys(), ...localMap.keys(), ...baseMap.keys()]);
  const mergedMap = new Map();

  ids.forEach((id) => {
    const value = mergeEntity(baseMap.get(id), localMap.get(id), remoteMap.get(id));
    if (value !== MISSING) mergedMap.set(id, value);
  });

  const orderedIds = [
    ...remoteList.map(getId),
    ...localList.map(getId),
    ...baseList.map(getId)
  ].filter(Boolean);

  return [...new Set(orderedIds)]
    .filter(id => mergedMap.has(id))
    .map(id => mergedMap.get(id));
}

// Resolve inclusao, alteracao e exclusao de uma unica entidade.
function mergeEntity(base, local, remote) {
  const hasBase = base !== undefined;
  const hasLocal = local !== undefined;
  const hasRemote = remote !== undefined;

  if (!hasLocal) {
    if (!hasBase) return hasRemote ? cloneValue(remote) : MISSING;
    return MISSING;
  }

  if (!hasRemote) {
    if (!hasBase) return cloneValue(local);
    return isDeepEqual(local, base) ? MISSING : cloneValue(local);
  }

  if (!hasBase) {
    return isDeepEqual(local, remote)
      ? cloneValue(local)
      : mergeValue({}, local, remote);
  }

  return mergeValue(base, local, remote);
}

// Faz a mesclagem recursiva de valores alterados pelos dois clientes.
function mergeValue(base, local, remote) {
  if (isDeepEqual(local, base)) return cloneValue(remote);
  if (isDeepEqual(remote, base)) return cloneValue(local);
  if (isDeepEqual(local, remote)) return cloneValue(local);

  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    if ([...base, ...local, ...remote].every(isPrimitive)) {
      return mergePrimitiveList(base, local, remote);
    }
    return cloneValue(local);
  }

  if (isPlainObject(local) && isPlainObject(remote)) {
    const baseObject = isPlainObject(base) ? base : {};
    const keys = new Set([
      ...Object.keys(baseObject),
      ...Object.keys(remote),
      ...Object.keys(local)
    ]);
    const result = {};

    keys.forEach((key) => {
      const value = mergeValue(baseObject[key], local[key], remote[key]);
      if (value !== undefined) result[key] = value;
    });
    return result;
  }

  return cloneValue(local);
}

// Mescla listas simples, preservando adicoes independentes e exclusoes explicitas.
function mergePrimitiveList(base, local, remote) {
  const values = new Set([...remote, ...local, ...base]);
  const result = [];

  values.forEach((value) => {
    const wasInBase = base.includes(value);
    const isLocal = local.includes(value);
    const isRemote = remote.includes(value);
    const keep = wasInBase ? isLocal && isRemote : isLocal || isRemote;
    if (keep) result.push(value);
  });

  const order = [...remote, ...local, ...base];
  return [...new Set(order)].filter(value => result.includes(value));
}

// Converte uma lista em mapa descartando entradas sem identificador.
function mapById(list, getId) {
  const map = new Map();
  list.forEach((item) => {
    const id = getId(item);
    if (id !== undefined && id !== null && id !== '') map.set(id, item);
  });
  return map;
}

function getCardId(card) {
  return card?.id;
}

function getCardEntryId(entry) {
  return entry?.data?.id;
}

function isPrimitive(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Compara estruturas serializaveis sem depender da ordem das propriedades.
function isDeepEqual(first, second) {
  if (Object.is(first, second)) return true;
  if (typeof first !== typeof second) return false;
  if (Array.isArray(first) || Array.isArray(second)) {
    if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return false;
    return first.every((value, index) => isDeepEqual(value, second[index]));
  }
  if (isPlainObject(first) || isPlainObject(second)) {
    if (!isPlainObject(first) || !isPlainObject(second)) return false;
    const firstKeys = Object.keys(first);
    const secondKeys = Object.keys(second);
    if (firstKeys.length !== secondKeys.length) return false;
    return firstKeys.every(key => Object.hasOwn(second, key) && isDeepEqual(first[key], second[key]));
  }
  return false;
}

function cloneValue(value) {
  if (value === undefined || value === MISSING) return value;
  return JSON.parse(JSON.stringify(value));
}
