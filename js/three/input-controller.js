// Registra listeners de mouse, teclado e botoes principais da mesa 3D.
export function setupInputController(options) {
  const {
    canvas,
    buttons,
    actions,
    isAnyModalOpen,
    windowTarget = window
  } = options;

  buttons.drawBtn?.addEventListener('click', actions.drawCardToActivePlayer);
  buttons.goldCoinBtn?.addEventListener('click', actions.spawnGoldCoin);
  buttons.silverCoinBtn?.addEventListener('click', actions.spawnSilverCoin);
  buttons.asylumCardBtn?.addEventListener('click', actions.spawnAsylumCard);
  buttons.religionCardBtn?.addEventListener('click', actions.spawnReligionCard);
  buttons.diceBtn?.addEventListener('click', actions.spawnDie);
  buttons.rollBtn?.addEventListener('click', actions.rollDice);
  buttons.clearObjectsBtn?.addEventListener('click', actions.clearTableObjects);
  buttons.shuffleBtn?.addEventListener('click', actions.shuffleDeck);
  buttons.dealBtn?.addEventListener('click', actions.dealInitialHands);
  buttons.flipSelectionBtn?.addEventListener('click', actions.flipSelectedCards);
  buttons.rotateLeftBtn?.addEventListener('click', () => actions.rotateSelectedPiece(1));
  buttons.rotateRightBtn?.addEventListener('click', () => actions.rotateSelectedPiece(-1));
  buttons.deleteSelectionBtn?.addEventListener('click', actions.deleteSelectedPiece);
  buttons.focusCameraBtn?.addEventListener('click', actions.focusCamera);
  buttons.resetBtn?.addEventListener('pointerdown', actions.playResetSoundFromButton);
  buttons.resetBtn?.addEventListener('click', actions.triggerResetFromButton);
  buttons.roomCodeStatusBtn?.addEventListener('click', actions.copyRoomCodeFromHud);

  windowTarget.addEventListener('resize', actions.resize);
  canvas.addEventListener('pointerdown', actions.onPointerDown);
  canvas.addEventListener('pointermove', actions.onPointerMove);
  windowTarget.addEventListener('pointerup', actions.onPointerUp);
  windowTarget.addEventListener('pointercancel', actions.onPointerUp);
  windowTarget.addEventListener('keydown', event => handleKeyDown(event, actions, isAnyModalOpen));
  windowTarget.addEventListener('keyup', event => handleKeyUp(event, actions));
  windowTarget.addEventListener('blur', actions.hideInspectOverlay);
  canvas.addEventListener('dblclick', actions.onDoubleClick);
}

// Centraliza camera, remove objetos ou vira carta via teclado.
function handleKeyDown(event, actions, isAnyModalOpen) {
  if (event.key === 'Alt') {
    if (!isAnyModalOpen()) {
      event.preventDefault();
      actions.setInspectAltDown(true);
      actions.updateInspectOverlay();
    }
    return;
  }

  if (isAnyModalOpen()) {
    if (event.key === 'Escape') {
      actions.closeAllModals();
    }
    return;
  }

  if (event.key.toLowerCase() === 'c') {
    event.preventDefault();
    actions.openChatModal();
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    actions.focusCamera();
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!actions.deleteSelectedPiece()) return;
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() === 'r') {
    if (!actions.shuffleHoveredCards()) return;
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() === 'q' || event.key.toLowerCase() === 'e') {
    const direction = event.key.toLowerCase() === 'q' ? 1 : -1;
    if (!actions.rotateSelectedPiece(direction)) return;
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() !== 'f') return;
  if (!actions.flipSelectedCards()) return;
  event.preventDefault();
}

// Encerra atalhos temporarios acionados enquanto a tecla estava pressionada.
function handleKeyUp(event, actions) {
  if (event.key !== 'Alt') return;
  event.preventDefault();
  actions.hideInspectOverlay();
}
