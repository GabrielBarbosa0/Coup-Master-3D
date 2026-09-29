const spectatorService = {
  spectatorBtn: null,
  spectatorModal: null,
  closeSpectatorBtn: null,
  spectatorPlayerList: null,
  spectatorStatusText: null,
  spectatorRequestModal: null,
  spectatorRequestText: null,
  acceptSpectatorBtn: null,
  declineSpectatorBtn: null,
  openModal: null,
  closeModal: null,
  getPlayers: null,
  getOnlineService: null,
  setObservedPlayerSeat: null,
  t: fallbackTranslate,
  currentRequest: null
};

// Configura o fluxo de pedidos e respostas do modo espectador.
function setupSpectatorService(options = {}) {
  Object.assign(spectatorService, {
    ...options,
    t: options.t || fallbackTranslate
  });

  spectatorService.spectatorBtn?.addEventListener('click', openSpectatorModal);
  spectatorService.closeSpectatorBtn?.addEventListener('click', () => {
    spectatorService.closeModal?.(spectatorService.spectatorModal);
  });
  spectatorService.acceptSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('accepted'));
  spectatorService.declineSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('declined'));
}

// Abre a lista de jogadores conectados que podem autorizar espectador.
function openSpectatorModal() {
  renderSpectatorTargets();
  spectatorService.openModal?.(spectatorService.spectatorModal);
  spectatorService.spectatorBtn?.blur();
}

// Atualiza a lista de alvos disponiveis para espectar.
function renderSpectatorTargets(statusText = spectatorService.t('three.choosePlayer', {}, 'Escolha um jogador.')) {
  const {
    spectatorPlayerList,
    spectatorStatusText
  } = spectatorService;

  if (!spectatorPlayerList || !spectatorStatusText) return;

  const online = spectatorService.getOnlineService?.();
  const localUid = online?.user?.uid;
  const targets = getSpectatorTargets(spectatorService.getPlayers?.() || [], localUid);

  spectatorPlayerList.innerHTML = '';
  if (targets.length === 0) {
    spectatorStatusText.textContent = spectatorService.t(
      'three.noPlayerToSpectate',
      {},
      'Nao ha nenhum jogador para espectar.'
    );
    return;
  }

  spectatorStatusText.textContent = statusText;
  targets.forEach((player) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spectator-player-btn';
    button.innerHTML = `${player.name}<span>P${player.id}</span>`;
    button.addEventListener('click', () => requestSpectatorTarget(player));
    spectatorPlayerList.append(button);
  });
}

// Filtra jogadores online que podem receber pedido de espectador.
function getSpectatorTargets(players, localUid) {
  return players.filter((player) => player.uid && player.uid !== localUid && player.isOnline);
}

// Envia o pedido ao jogador escolhido na sala.
async function requestSpectatorTarget(player) {
  const online = spectatorService.getOnlineService?.();
  if (!online?.requestSpectate) return;

  spectatorService.spectatorStatusText.textContent = spectatorService.t(
    'three.requestSentTo',
    { name: player.name },
    `Pedido enviado para ${player.name}.`
  );
  spectatorService.spectatorPlayerList.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });

  try {
    await online.requestSpectate({
      uid: player.uid,
      seat: player.id,
      displayName: player.name,
      photoURL: player.avatarUrl || ''
    });
  } catch (error) {
    console.error('Falha ao pedir espectador.', error);
    renderSpectatorTargets('Nao foi possivel enviar o pedido.');
  }
}

// Mostra o pedido recebido pelo dono do slot.
function showSpectatorRequest(request) {
  spectatorService.currentRequest = request;
  if (spectatorService.spectatorRequestText) {
    spectatorService.spectatorRequestText.textContent = spectatorService.t(
      'three.spectatorRequestText',
      { name: request.requesterName || spectatorService.t('common.player', {}, 'Um jogador') },
      `${request.requesterName || 'Um jogador'} quer espectar sua mao.`
    );
  }
  spectatorService.openModal?.(spectatorService.spectatorRequestModal);
}

// Responde o pedido atualmente exibido.
async function respondCurrentSpectatorRequest(status) {
  const online = spectatorService.getOnlineService?.();
  if (!spectatorService.currentRequest || !online?.respondSpectateRequest) return;

  const request = spectatorService.currentRequest;
  spectatorService.currentRequest = null;
  spectatorService.closeModal?.(spectatorService.spectatorRequestModal);
  await online.respondSpectateRequest(request.id, status);
}

// Muda a visao local para o slot autorizado pelo jogador alvo.
function startSpectatingPlayer(request) {
  if (!request?.targetSeat) return;

  spectatorService.setObservedPlayerSeat?.(request.targetSeat, { focus: true });
  if (spectatorService.spectatorStatusText) {
    spectatorService.spectatorStatusText.textContent = spectatorService.t(
      'three.spectating',
      { name: request.targetName || spectatorService.t('common.player', {}, 'jogador') },
      `Espectando ${request.targetName || 'jogador'}.`
    );
    spectatorService.spectatorPlayerList.innerHTML = '';
    spectatorService.openModal?.(spectatorService.spectatorModal);
  }
}

// Mostra retorno de pedido recusado ou expirado.
function showSpectatorResponse(message) {
  if (!spectatorService.spectatorStatusText || !spectatorService.spectatorPlayerList) return;
  spectatorService.spectatorStatusText.textContent = message;
  spectatorService.spectatorPlayerList.innerHTML = '';
  spectatorService.openModal?.(spectatorService.spectatorModal);
}

function fallbackTranslate(_key, _params, fallback = '') {
  return fallback;
}

export {
  openSpectatorModal,
  renderSpectatorTargets,
  setupSpectatorService,
  showSpectatorRequest,
  showSpectatorResponse,
  startSpectatingPlayer
};
