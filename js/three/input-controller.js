// Registra listeners de mouse, teclado e botoes principais da mesa 3D.
export function setupInputController(options) {
  const {
    canvas,
    buttons,
    actions,
    isSandboxInteractionAllowed = () => true,
    isAnyModalOpen,
    windowTarget = window
  } = options;

  const runSandboxAction = (action) => (...args) => {
    if (!isSandboxInteractionAllowed()) return false;
    return action(...args);
  };

  buttons.drawBtn?.addEventListener('click', runSandboxAction(actions.drawCardToActivePlayer));
  buttons.goldCoinBtn?.addEventListener('click', runSandboxAction(actions.spawnGoldCoin));
  buttons.silverCoinBtn?.addEventListener('click', runSandboxAction(actions.spawnSilverCoin));
  buttons.asylumCardBtn?.addEventListener('click', runSandboxAction(actions.spawnAsylumCard));
  buttons.religionCardBtn?.addEventListener('click', runSandboxAction(actions.spawnReligionCard));
  buttons.diceBtn?.addEventListener('click', runSandboxAction(actions.spawnDie));
  buttons.rollBtn?.addEventListener('click', runSandboxAction(actions.rollDice));
  buttons.clearObjectsBtn?.addEventListener('click', runSandboxAction(actions.clearTableObjects));
  buttons.shuffleBtn?.addEventListener('click', runSandboxAction(actions.shuffleDeck));
  buttons.dealBtn?.addEventListener('click', runSandboxAction(actions.dealInitialHands));
  buttons.flipSelectionBtn?.addEventListener('click', runSandboxAction(actions.flipSelectedCards));
  buttons.rotateLeftBtn?.addEventListener('click', runSandboxAction(() => actions.rotateSelectedPiece(1)));
  buttons.rotateRightBtn?.addEventListener('click', runSandboxAction(() => actions.rotateSelectedPiece(-1)));
  buttons.deleteSelectionBtn?.addEventListener('click', runSandboxAction(actions.deleteSelectedPiece));
  buttons.focusCameraBtn?.addEventListener('click', actions.focusCamera);
  buttons.resetBtn?.addEventListener('pointerdown', actions.playResetSoundFromButton);
  buttons.resetBtn?.addEventListener('click', actions.triggerResetFromButton);

  windowTarget.addEventListener('resize', actions.resize);
  canvas.addEventListener('pointerdown', actions.onPointerDown);
  canvas.addEventListener('pointermove', actions.onPointerMove);
  windowTarget.addEventListener('pointerup', actions.onPointerUp);
  windowTarget.addEventListener('pointercancel', actions.onPointerUp);
  windowTarget.addEventListener('keydown', event => handleKeyDown(event, actions, isSandboxInteractionAllowed, isAnyModalOpen));
  windowTarget.addEventListener('keyup', event => handleKeyUp(event, actions));
  windowTarget.addEventListener('blur', actions.hideInspectOverlay);
  canvas.addEventListener('dblclick', actions.onDoubleClick);
}

// Centraliza camera, remove objetos ou vira carta via teclado.
function handleKeyDown(event, actions, isSandboxInteractionAllowed, isAnyModalOpen) {
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

  // No ranqueado, Backspace troca o atalho de exclusao por foco de camera.
  if (!isSandboxInteractionAllowed() && event.key === 'Backspace') {
    event.preventDefault();
    actions.focusCamera();
    return;
  }

  if (!isSandboxInteractionAllowed()) return;

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
