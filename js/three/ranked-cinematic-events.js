// Compara snapshots ranqueados e gera eventos visuais sem alterar o motor autoritativo.
export function createRankedCinematicEvents(previousSnapshot, nextSnapshot) {
  if (!isRankedSnapshot(previousSnapshot) || !isRankedSnapshot(nextSnapshot)) return [];

  const events = [];
  const previousRanked = previousSnapshot.ranked3d || {};
  const nextRanked = nextSnapshot.ranked3d || {};
  const layout = nextRanked.layout || null;

  const previousBalances = normalizeBalances(previousRanked.coinBalances);
  const nextBalances = normalizeBalances(nextRanked.coinBalances);
  if (hasBalanceChange(previousBalances, nextBalances)) {
    events.push({
      id: `coins:${getSnapshotKey(nextSnapshot)}`,
      type: 'coins',
      layout,
      previousBalances,
      nextBalances
    });
  }

  const previousRevealSequence = getHighestRevealSequence(previousRanked.publicReveals);
  const reveals = (nextRanked.publicReveals || [])
    .filter((reveal) => Number(reveal?.sequence) > previousRevealSequence)
    .sort((left, right) => Number(left.sequence) - Number(right.sequence));
  if (reveals.length) {
    events.push({
      id: `reveals:${reveals.map((reveal) => reveal.sequence).join(',')}`,
      type: 'reveals',
      layout,
      previousSequence: previousRevealSequence,
      reveals
    });
  }

  appendPrivatePresentationEvent(events, 'exchange', previousRanked.exchange, nextRanked.exchange);
  appendPrivatePresentationEvent(events, 'examine', previousRanked.examine, nextRanked.examine);
  return events;
}

// Mantem eventos privados como marcadores da timeline para extensoes visuais futuras.
function appendPrivatePresentationEvent(events, type, previousValue, nextValue) {
  const previousKey = getPresentationKey(type, previousValue);
  const nextKey = getPresentationKey(type, nextValue);
  if (previousKey === nextKey) return;
  events.push({
    id: `${type}:${nextKey || previousKey}`,
    type,
    state: nextValue ? 'opened' : 'closed',
    value: nextValue || null
  });
}

function isRankedSnapshot(snapshot) {
  return snapshot?.version === 1 && snapshot?.mode === 'ranked';
}

function normalizeBalances(values) {
  return Array.isArray(values) ? values.map((value) => Math.max(0, Number(value) || 0)) : [];
}

function hasBalanceChange(previousBalances, nextBalances) {
  const count = Math.max(previousBalances.length, nextBalances.length);
  return Array.from({ length: count }, (_, index) => previousBalances[index] !== nextBalances[index]).some(Boolean);
}

function getHighestRevealSequence(reveals) {
  return (reveals || []).reduce((highest, reveal) => Math.max(highest, Number(reveal?.sequence) || 0), 0);
}

function getPresentationKey(type, value) {
  if (!value) return '';
  if (type === 'exchange') return value.key || '';
  return `${value.actorUid || ''}:${value.targetUid || ''}:${value.cardId || ''}`;
}

function getSnapshotKey(snapshot) {
  const ranked = snapshot?.ranked3d || {};
  return `${Number(ranked.updatedAt) || 0}:${Number(ranked.turnNumber) || 0}:${Number(ranked.turnIndex) || 0}`;
}
