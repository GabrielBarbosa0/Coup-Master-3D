const CASUAL_DRAW_LIFT = 0.34;
const CASUAL_DEAL_STAGGER_MS = 140;

// Reproduz a distribuicao em rodadas do modo casual usando as cartas ja projetadas pelo motor.
export function createRankedInitialDealAnimationController(options) {
  const {
    getCardById,
    getCardPose,
    getDeckPose,
    placeCard,
    setCardVisible,
    tossTo,
    schedule = (callback, delay) => window.setTimeout(callback, delay),
    cancelSchedule = (timer) => window.clearTimeout(timer)
  } = options;
  let timers = [];
  let hiddenCards = new Set();
  let pendingCards = 0;
  let runId = 0;

  // Oculta as maos finais e inicia uma carta por vez a partir do baralho central.
  function transition({ deals }) {
    cancel();
    if (!Array.isArray(deals) || deals.length === 0) return;

    const preparedDeals = deals
      .map((deal) => {
        const card = getCardById(`ranked-${deal.cardId}`);
        const target = card ? getCardPose(card) : null;
        return card && target ? { deal, card, target } : null;
      })
      .filter(Boolean);
    if (preparedDeals.length === 0) return;

    preparedDeals.forEach(({ card }) => {
      setCardVisible(card, false);
      hiddenCards.add(card);
    });

    pendingCards = preparedDeals.length;
    const currentRunId = runId;
    const dealtHands = new Map();
    timers = preparedDeals.map(({ deal, card, target }, index) => schedule(() => {
      if (currentRunId !== runId) return;
      const dealtHand = dealtHands.get(deal.seat) || [];
      dealtHand.forEach((previous) => {
        tossTo(
          previous.card,
          previous.target.position,
          previous.target.rotationY,
          CASUAL_DRAW_LIFT,
          null,
          { suppressSync: true }
        );
      });
      hiddenCards.delete(card);
      setCardVisible(card, true);
      const deckPose = getDeckPose();
      const arrivalTarget = deal.openingPose || target;
      placeCard(card, deckPose.position, arrivalTarget.rotationY, false);
      tossTo(card, arrivalTarget.position, arrivalTarget.rotationY, CASUAL_DRAW_LIFT, () => {
        if (currentRunId !== runId) return;
        pendingCards -= 1;
      }, { suppressSync: true });
      dealtHand.push({ card, target });
      dealtHands.set(deal.seat, dealtHand);
    }, index * CASUAL_DEAL_STAGGER_MS));
  }

  // Restaura as cartas quando chega um novo snapshot antes do fim da sequencia.
  function cancel() {
    runId += 1;
    timers.forEach((timer) => cancelSchedule(timer));
    timers = [];
    hiddenCards.forEach((card) => setCardVisible(card, true));
    hiddenCards = new Set();
    pendingCards = 0;
  }

  return {
    cancel,
    transition,
    isActive: () => pendingCards > 0
  };
}
