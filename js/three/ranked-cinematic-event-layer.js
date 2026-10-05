import { createRankedCinematicEvents } from './ranked-cinematic-events.js';

// Serializa efeitos cinematograficos para que eventos concorrentes nao poluam a mesa.
export function createRankedCinematicEventLayer(options = {}) {
  const coinAnimations = options.coinAnimations || null;
  const revealAnimations = options.revealAnimations || null;
  const onEvent = options.onEvent || (() => {});
  let queue = [];
  let activeEvent = null;

  // Adiciona ao fim da fila os efeitos derivados da mudanca de snapshot ranqueado.
  function transition(previousSnapshot, nextSnapshot) {
    const events = createRankedCinematicEvents(previousSnapshot, nextSnapshot);
    queue.push(...events.filter((event) => !isQueued(event.id)));
    startNext();
    return events;
  }

  // Avanca a animacao ativa e inicia o proximo evento somente quando ela terminar.
  function update(deltaSeconds) {
    if (activeEvent?.type === 'coins') coinAnimations?.update?.(deltaSeconds);
    if (activeEvent && !isEventActive(activeEvent)) {
      onEvent({ phase: 'finished', event: activeEvent });
      activeEvent = null;
      startNext();
    }
  }

  // Interrompe efeitos pendentes quando a representacao da mesa for descartada.
  function cancel() {
    coinAnimations?.cancel?.();
    revealAnimations?.cancel?.();
    queue = [];
    activeEvent = null;
  }

  function startNext() {
    if (activeEvent) return;
    const event = queue.shift();
    if (!event) return;
    activeEvent = event;
    onEvent({ phase: 'started', event });

    if (event.type === 'coins') {
      coinAnimations?.transition?.(event);
    } else if (event.type === 'reveals') {
      revealAnimations?.transition?.(event);
    }

    if (!isEventActive(event)) {
      onEvent({ phase: 'finished', event });
      activeEvent = null;
      startNext();
    }
  }

  function isQueued(id) {
    return activeEvent?.id === id || queue.some((event) => event.id === id);
  }

  function isEventActive(event) {
    if (event.type === 'coins') return Boolean(coinAnimations?.isActive?.());
    if (event.type === 'reveals') return Boolean(revealAnimations?.isActive?.());
    return false;
  }

  return {
    cancel,
    transition,
    update,
    isActive: () => Boolean(activeEvent || queue.length)
  };
}
