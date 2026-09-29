// Monta as acoes publicas disparadas por botoes e atalhos da mesa.
function createGameActionsController(options) {
  const {
    clearTableObjects,
    closeAllModals,
    dealInitialHands,
    deleteSelectedPiece,
    drawCardToPlayer,
    flipSelectedCards,
    focusTableCamera,
    getActivePlayer,
    getViewPlayer,
    hideInspectOverlay,
    onDoubleClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    openChatModal,
    playResetSoundFromButton,
    resize,
    rollDice,
    rotateSelectedPiece,
    setInspectAltDown,
    shuffleDeck,
    shuffleHoveredCards,
    spawnCoin,
    spawnDie,
    spawnSpecialCard,
    triggerResetFromButton,
    updateInspectOverlay
  } = options;

  return {
    clearTableObjects,
    closeAllModals,
    dealInitialHands,
    deleteSelectedPiece,
    drawCardToActivePlayer: () => drawCardToPlayer(getActivePlayer()),
    flipSelectedCards,
    focusCamera: () => focusTableCamera(getViewPlayer()),
    hideInspectOverlay,
    onDoubleClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    openChatModal,
    playResetSoundFromButton,
    resize,
    rollDice,
    rotateSelectedPiece,
    setInspectAltDown,
    shuffleDeck,
    shuffleHoveredCards,
    spawnAsylumCard: () => spawnSpecialCard('asilo'),
    spawnDie,
    spawnGoldCoin: () => spawnCoin('gold'),
    spawnReligionCard: () => spawnSpecialCard('religiao'),
    spawnSilverCoin: () => spawnCoin('silver'),
    triggerResetFromButton,
    updateInspectOverlay
  };
}

export {
  createGameActionsController
};
