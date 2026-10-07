import { createRankedCoinTransferPlan } from '../gamemode/ranked-3d/ranked-3d-coin-transfers.js';
import {
  createRankedCoinRepresentation,
  getRankedCoinId,
  getRankedCoinType
} from '../gamemode/ranked-3d/ranked-3d-table-layout.js';

const COIN_TRAVEL_SECONDS = 0.87;
const COIN_STAGGER_SECONDS = 0.125;
const COIN_ARC_HEIGHT = 0.32;

// Reproduz transferencias de saldo como moedas em movimento na mesa ranqueada.
export function createRankedCoinAnimationController(options) {
  const {
    createTransientCoin,
    getObjectById,
    removeTableObject,
    setCoinKinematic = () => {},
    releaseCoinPhysics = () => {}
  } = options;
  let animations = [];
  let transientId = 0;

  // Inicia transferencias somente depois que o novo snapshot visual ja estiver aplicado.
  function transition({ previousBalances, nextBalances, layout }) {
    cancel();
    if (!Array.isArray(previousBalances) || !Array.isArray(nextBalances) || !layout) return;

    const plannedTransfers = createRankedCoinTransferPlan(previousBalances, nextBalances);
    const consolidations = findFiveCoinConsolidations(previousBalances, nextBalances);
    const goldBreaks = findGoldBreakTransfers(previousBalances, nextBalances, plannedTransfers);
    const consolidationSeats = new Set(consolidations.map((conversion) => conversion.seat));
    const goldBreakSeats = new Set(goldBreaks.map((conversion) => conversion.seat));
    const transfers = plannedTransfers.filter((transfer) => (
      !consolidationSeats.has(transfer.fromSeat)
      && !consolidationSeats.has(transfer.toSeat)
      && !goldBreakSeats.has(transfer.fromSeat)
    ));
    const incomingCounts = countTransfersBySeat(transfers, 'toSeat');
    const sourceIndexes = previousBalances.map((value) => Math.max(0, Number(value) || 0));
    const targetIndexes = nextBalances.map((value, index) => (
      Math.max(0, Number(value) || 0) - (incomingCounts.get(index + 1) || 0)
    ));

    transfers.forEach((transfer, index) => {
      const source = getTransferEndpoint(layout, transfer.fromSeat, sourceIndexes, true);
      const target = getTransferEndpoint(layout, transfer.toSeat, targetIndexes, false);
      if (!source || !target) return;

      const coinIndex = transfer.toSeat ? target.index : source.index;
      const transferObject = createTransferObject({
        source,
        target,
        coinIndex,
        transfer
      });
      if (!transferObject) return;

      animations.push({
        object: transferObject.object,
        transient: transferObject.transient,
        source: toVector3(source.point),
        target: toVector3(transferObject.target),
        elapsed: -index * COIN_STAGGER_SECONDS
      });
    });

    consolidations.forEach((conversion) => appendFiveCoinConsolidation(conversion, layout));
    goldBreaks.forEach((conversion) => appendGoldBreakTransfer(conversion, layout));
  }

  // Atualiza os arcos das moedas antes do passo fisico do Rapier.
  function update(deltaSeconds) {
    animations = animations.filter((animation) => {
      animation.elapsed += deltaSeconds;
      if (animation.elapsed < 0) return true;

      const progress = Math.min(1, animation.elapsed / COIN_TRAVEL_SECONDS);
      const eased = easeOutCubic(progress);
      const position = interpolatePoint(animation.source, animation.target, eased);
      position.y += Math.sin(progress * Math.PI) * COIN_ARC_HEIGHT;
      animation.object.body.setNextKinematicTranslation(position);

      if (progress < 1) return true;
      animation.object.body.setTranslation(animation.target, true);
      animation.object.collider?.setSensor?.(false);
      if (animation.transient) removeTableObject(animation.object, { update: false });
      else releaseCoinPhysics(animation.object);
      return false;
    });
  }

  // Interrompe efeitos pendentes antes que um novo snapshot substitua os objetos.
  function cancel() {
    animations.forEach((animation) => {
      if (animation.transient) removeTableObject(animation.object, { update: false });
    });
    animations = [];
  }

  // Resolve a moeda real que acabou de entrar no saldo ou cria uma moeda temporaria ao sair dele.
  function createTransferObject({ source, target, coinIndex, transfer }) {
    const targetObject = transfer.toSeat
      ? getObjectById(getRankedCoinId(transfer.toSeat, target.index))
      : null;
    const finalTarget = targetObject ? getObjectPosition(targetObject, target.point) : target.point;
    const object = targetObject || createTransientCoin(getRankedCoinType(coinIndex), source.point, transientId++);
    if (!object) return null;

    setCoinKinematic(object);
    object.collider?.setSensor?.(true);
    object.body.setTranslation(toVector3(source.point), true);
    return { object, transient: !targetObject, target: finalTarget };
}

// Consolida cinco pratas em ouro quando a renda leva um jogador de quatro para cinco moedas.
function appendFiveCoinConsolidation(conversion, layout) {
  const slots = layout.seats?.[conversion.seat - 1]?.coinArea?.slots || [];
  if (slots.length === 0) return;

  for (let index = 0; index < 5; index += 1) {
    addTransientAnimation('silver', slots[index] || slots[0], layout.treasury, index * COIN_STAGGER_SECONDS);
  }
  addFinalCoinAnimation(conversion.seat, 0, layout.treasury, 0.16);
}

// Quebra uma moeda de ouro ao perder moedas, entregando prata ao alvo e o troco ao antigo dono.
function appendGoldBreakTransfer(conversion, layout) {
  const slots = layout.seats?.[conversion.seat - 1]?.coinArea?.slots || [];
  if (slots.length === 0) return;

  createRankedCoinRepresentation(conversion.previousBalance).forEach((type, index) => {
    addTransientAnimation(type, slots[index] || slots[0], layout.treasury, index * COIN_STAGGER_SECONDS);
  });
  const remainingTokens = createRankedCoinRepresentation(conversion.nextBalance);
  remainingTokens.forEach((_type, index) => {
    addFinalCoinAnimation(conversion.seat, index, layout.treasury, (index + 2) * COIN_STAGGER_SECONDS);
  });

  const incomingBySeat = countTransfersBySeat(conversion.transfers, 'toSeat');
  incomingBySeat.forEach((count, seat) => {
    const recipientBalance = Math.max(0, Number(conversion.nextBalances[seat - 1]) || 0);
    const previousBalance = Math.max(0, Number(conversion.previousBalances[seat - 1]) || 0);
    const finalTokens = createRankedCoinRepresentation(recipientBalance);
    const crossedGoldBoundary = previousBalance < 5 && recipientBalance >= 5;
    const firstIncomingIndex = crossedGoldBoundary
      ? 0
      : Math.max(0, finalTokens.length - Math.min(count, finalTokens.length));
    finalTokens.slice(firstIncomingIndex).forEach((_type, index) => {
      addFinalCoinAnimation(seat, firstIncomingIndex + index, layout.treasury, (index + 1) * COIN_STAGGER_SECONDS);
    });
  });
}
// Gera uma ficha temporaria para movimentos cuja origem deixou de existir no novo snapshot.
function addTransientAnimation(type, source, target, delay) {
  const object = createTransientCoin(type, source, transientId++);
  if (!object) return;
  setCoinKinematic(object);
  object.collider?.setSensor?.(true);
  object.body.setTranslation(toVector3(source), true);
  animations.push({
    object,
    transient: true,
    source: toVector3(source),
    target: toVector3(target),
    elapsed: -delay
  });
}

// Move uma ficha final do tesouro, mantendo a representacao do novo saldo no assento.
function addFinalCoinAnimation(seat, index, source, delay) {
  const object = getObjectById(getRankedCoinId(seat, index));
  if (!object) return;
  const target = getObjectPosition(object, source);
  setCoinKinematic(object);
  object.collider?.setSensor?.(true);
  object.body.setTranslation(toVector3(source), true);
  animations.push({
    object,
    transient: false,
    source: toVector3(source),
    target,
    elapsed: -delay
  });
}

// Detecta a troca exata de quatro pratas por uma moeda de ouro.
function findFiveCoinConsolidations(previousBalances, nextBalances) {
  const count = Math.max(previousBalances.length, nextBalances.length);
  return Array.from({ length: count }, (_, index) => {
    const previous = Math.max(0, Number(previousBalances[index]) || 0);
    const next = Math.max(0, Number(nextBalances[index]) || 0);
    if (previous === 4 && next === 5) return { seat: index + 1 };
    return null;
  }).filter(Boolean);
}

// Identifica saidas de saldo que exigem destrocar ouro para as fichas finais de prata.
function findGoldBreakTransfers(previousBalances, nextBalances, transfers) {
  return previousBalances.flatMap((value, index) => {
    const seat = index + 1;
    const previousBalance = Math.max(0, Number(value) || 0);
    const nextBalance = Math.max(0, Number(nextBalances[index]) || 0);
    const outgoingTransfers = transfers.filter((transfer) => transfer.fromSeat === seat);
    if (previousBalance < 5 || nextBalance >= 5 || outgoingTransfers.length === 0) return [];
    return [{
      seat,
      previousBalance,
      nextBalance,
      previousBalances,
      nextBalances,
      transfers: outgoingTransfers
    }];
  });
}

// Captura a posicao de nascimento da moeda antes de ela ser movida para a animacao.
function getObjectPosition(object, fallback) {
  const position = object?.body?.translation?.();
  return position ? toVector3(position) : fallback;
}

  return { cancel, transition, update, isActive: () => animations.length > 0 };
}

// Resolve a origem ou destino de uma transferencia dentro da area fixa de moedas.
function getTransferEndpoint(layout, seat, indexes, consumesFromEnd) {
  if (!seat) return { point: layout.treasury, index: 0 };
  const slots = layout.seats?.[seat - 1]?.coinArea?.slots || [];
  if (slots.length === 0) return null;

  if (consumesFromEnd) {
    indexes[seat - 1] = Math.max(0, indexes[seat - 1] - 1);
  }
  const index = Math.min(Math.max(0, indexes[seat - 1]), slots.length - 1);
  if (!consumesFromEnd) indexes[seat - 1] += 1;
  return { point: slots[index], index };
}

// Conta entradas por assento para reservar as moedas que acabaram de surgir.
function countTransfersBySeat(transfers, key) {
  return transfers.reduce((counts, transfer) => {
    const seat = transfer[key];
    if (seat) counts.set(seat, (counts.get(seat) || 0) + 1);
    return counts;
  }, new Map());
}

// Converte um ponto serializavel do layout em coordenadas usadas pela animacao.
function toVector3(point) {
  return { x: Number(point.x) || 0, y: Number(point.y) || 0, z: Number(point.z) || 0 };
}

// Interpola posicoes sem criar dependencia de Three.js no controlador puro.
function interpolatePoint(source, target, amount) {
  return {
    x: source.x + (target.x - source.x) * amount,
    y: source.y + (target.y - source.y) * amount,
    z: source.z + (target.z - source.z) * amount
  };
}

// Desacelera a moeda ao se aproximar do destino.
function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}
