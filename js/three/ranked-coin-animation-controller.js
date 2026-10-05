import { createRankedCoinTransferPlan } from '../gamemode/ranked-3d/ranked-3d-coin-transfers.js';
import { getRankedCoinId, getRankedCoinType } from '../gamemode/ranked-3d/ranked-3d-table-layout.js';

const COIN_TRAVEL_SECONDS = 0.52;
const COIN_STAGGER_SECONDS = 0.075;
const COIN_ARC_HEIGHT = 0.32;

// Reproduz transferencias de saldo como moedas em movimento na mesa ranqueada.
export function createRankedCoinAnimationController(options) {
  const {
    createTransientCoin,
    getObjectById,
    removeTableObject
  } = options;
  let animations = [];
  let transientId = 0;

  // Inicia transferencias somente depois que o novo snapshot visual ja estiver aplicado.
  function transition({ previousBalances, nextBalances, layout }) {
    cancel();
    if (!Array.isArray(previousBalances) || !Array.isArray(nextBalances) || !layout) return;

    const transfers = createRankedCoinTransferPlan(previousBalances, nextBalances);
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
      const object = createTransferObject({
        source,
        target,
        coinIndex,
        transfer
      });
      if (!object) return;

      animations.push({
        object,
        transient: !transfer.toSeat,
        source: toVector3(source.point),
        target: toVector3(target.point),
        elapsed: -index * COIN_STAGGER_SECONDS
      });
    });
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
    const object = targetObject || createTransientCoin(getRankedCoinType(coinIndex), source.point, transientId++);
    if (!object) return null;

    object.collider?.setSensor?.(true);
    object.body.setTranslation(toVector3(source.point), true);
    return object;
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
