// Apresenta revelacoes publicas em fila, sem alterar o estado autoritativo ranqueado.
export function createRankedRevealAnimationController(options) {
  const {
    createTransientCard,
    getCardById,
    getCardPose,
    getDeckPose,
    placeCard,
    refreshCardMaterial,
    removeTransientCard,
    setCardVisible,
    startCardFlip,
    tossTo
  } = options;
  let queue = [];
  let activeTransientCard = null;
  const hiddenReplacementCards = new Set();
  let runId = 0;
  let isPlaying = false;

  // Enfileira somente eventos posteriores ao ultimo snapshot conhecido.
  function transition({ previousSequence, reveals, layout }) {
    cancel();
    if (!Number.isFinite(previousSequence) || !layout || !Array.isArray(reveals)) return;

    queue = reveals
      .filter((reveal) => Number(reveal?.sequence) > previousSequence)
      .sort((left, right) => Number(left.sequence) - Number(right.sequence));
    isPlaying = queue.length > 0;
    playNext(layout, runId);
  }

  // Descarta a fila e remove qualquer carta temporaria ainda em apresentacao.
  function cancel() {
    runId += 1;
    queue = [];
    if (activeTransientCard) removeTransientCard(activeTransientCard);
    activeTransientCard = null;
    hiddenReplacementCards.forEach((card) => setCardVisible(card, true));
    hiddenReplacementCards.clear();
    isPlaying = false;
  }

  // Mostra uma revelacao por vez para manter a mesa legivel em perdas consecutivas.
  function playNext(layout, currentRunId) {
    if (currentRunId !== runId) return;
    const reveal = queue.shift();
    if (!reveal) {
      isPlaying = false;
      return;
    }

    const seatLayout = layout.seats?.[Number(reveal.seat) - 1];
    if (!seatLayout?.hand || !seatLayout.reveal) {
      playNext(layout, currentRunId);
      return;
    }

    const finalCard = getCardById(`ranked-${reveal.cardId}`);
    const replacementCard = reveal.replacementCardId
      ? getCardById(`ranked-${reveal.replacementCardId}`)
      : null;
    const replacementPose = replacementCard ? getCardPose(replacementCard) : null;
    if (replacementCard && replacementPose) {
      setCardVisible(replacementCard, false);
      hiddenReplacementCards.add(replacementCard);
    }
    const finalData = finalCard ? { ...finalCard.data } : null;
    const finalPose = finalCard ? getCardPose(finalCard) : null;
    const isEliminated = Boolean(finalCard?.data.rankedRevealed);
    const card = finalCard || createTransientCard(reveal);
    if (!card) {
      playNext(layout, currentRunId);
      return;
    }

    const transient = !finalCard;
    if (transient) activeTransientCard = card;
    preparePublicPresentation(card, reveal, refreshCardMaterial);
    placeCard(card, seatLayout.hand, seatLayout.hand.rotationY, false);

    tossTo(card, seatLayout.reveal, seatLayout.reveal.rotationY, 0.32, () => {
      if (currentRunId !== runId) return;
      startCardFlip(card, true, false, () => {
        if (currentRunId !== runId) return;
        finishReveal({
          card,
          transient,
          isEliminated,
          finalData,
          finalPose,
          replacementCard,
          replacementPose,
          layout,
          currentRunId
        });
      }, false);
    }, { suppressSync: true });
  }

  // Devolve prova ao destino final ou envia uma influencia perdida ao cemiterio.
  function finishReveal({
    card,
    transient,
    isEliminated,
    finalData,
    finalPose,
    replacementCard,
    replacementPose,
    layout,
    currentRunId
  }) {
    if (isEliminated) {
      tossTo(card, layout.cemetery, layout.cemetery.rotationY, 0.2, () => playNext(layout, currentRunId), { suppressSync: true });
      return;
    }

    if (finalData && finalPose) {
      restoreFinalCard(card, finalData, refreshCardMaterial);
      tossTo(card, finalPose.position, finalPose.rotationY, 0.2, () => playNext(layout, currentRunId), { suppressSync: true });
      return;
    }

    const deckPose = getDeckPose();
    tossTo(card, deckPose.position, deckPose.rotationY, 0.28, () => {
      if (currentRunId !== runId) return;
      removeTransientCard(card);
      if (activeTransientCard?.id === card.id) activeTransientCard = null;
      animateReplacementCard(replacementCard, replacementPose, deckPose, layout, currentRunId);
    }, { suppressSync: true });
  }

  // Faz a nova influencia sair do baralho somente apos a prova retornar para ele.
  function animateReplacementCard(replacementCard, replacementPose, deckPose, layout, currentRunId) {
    if (!replacementCard || !replacementPose) {
      playNext(layout, currentRunId);
      return;
    }

    hiddenReplacementCards.delete(replacementCard);
    setCardVisible(replacementCard, true);
    placeCard(replacementCard, deckPose.position, deckPose.rotationY, false);
    tossTo(
      replacementCard,
      replacementPose.position,
      replacementPose.rotationY,
      0.3,
      () => playNext(layout, currentRunId),
      { suppressSync: true }
    );
  }

  return { cancel, transition, isActive: () => isPlaying };
}

// Mostra inicialmente o verso, mantendo a carta publica enquanto ela vira na area central.
function preparePublicPresentation(card, reveal, refreshCardMaterial) {
  card.data.owner = null;
  card.data.location = 'table';
  card.data.faceUp = false;
  card.data.rankedPresentation = true;
  card.data.rankedRole = reveal.role;
  refreshCardMaterial(card);
}

// Restaura a representacao final definida pelo adaptador apos uma prova temporaria.
function restoreFinalCard(card, finalData, refreshCardMaterial) {
  Object.assign(card.data, finalData);
  refreshCardMaterial(card);
}
