import { PHASES } from './ranked-3d-actions.js';
import { getRanked3dPlayers } from './ranked-3d-engine.js';

const HUD_ID = 'rankedMatchHud';

// Cria a HUD persistente do modo ranqueado e mantem o contador de prazo vivo.
export function createRanked3dHud(options = {}) {
  const root = options.root || document.body;
  const hud = ensureHud(root);
  const getLocalUid = options.getLocalUid || (() => null);
  const getRoomCode = options.getRoomCode || (() => '');
  let countdownTimer = null;

  function stopCountdown() {
    if (!countdownTimer) return;
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }

  function updateCountdown(deadline) {
    const countdownEl = hud.querySelector('[data-ranked-countdown]');
    if (!countdownEl) return;
    countdownEl.textContent = formatRanked3dCountdown(deadline);
  }

  function startCountdown(deadline) {
    stopCountdown();
    if (!deadline) return;
    updateCountdown(deadline);
    countdownTimer = window.setInterval(() => updateCountdown(deadline), 500);
  }

  function update(nextRankedState, context = {}) {
    const model = getRanked3dHudModel(nextRankedState, getLocalUid(), {
      roomCode: getRoomCode(),
      statsByUid: context.statsByUid || {}
    });
    renderHud(hud, model);
    startCountdown(model.deadline);
  }

  function destroy() {
    stopCountdown();
    hud.remove();
  }

  update(null);
  return { update, destroy };
}

// Monta um modelo puro para a HUD da partida ranqueada.
export function getRanked3dHudModel(rankedState, localUid, options = {}) {
  if (!rankedState) {
    return {
      visible: false,
      title: '',
      description: '',
      meta: [],
      players: [],
      result: null,
      deadline: null
    };
  }

  const players = getRanked3dPlayers(rankedState);
  const localPlayer = rankedState.players?.[localUid] || null;
  const activeUid = rankedState.turnOrder?.[rankedState.turnIndex] || null;
  const activePlayer = rankedState.players?.[activeUid] || null;
  const winner = rankedState.players?.[rankedState.winnerUid] || null;
  const isFinished = rankedState.phase === PHASES.FINISHED || rankedState.status === PHASES.FINISHED;
  const phaseInfo = getPhaseInfo(rankedState, localUid, activePlayer);
  const localStats = options.statsByUid?.[localUid] || null;

  return {
    visible: true,
    tone: isFinished ? 'success' : phaseInfo.tone,
    title: phaseInfo.title,
    description: phaseInfo.description,
    deadline: Number(rankedState.deadline || 0) || null,
    meta: [
      rankedState.turnNumber ? `Turno ${rankedState.turnNumber}` : '',
      activePlayer && !isFinished ? `Ativo: ${activePlayer.name}` : '',
      isFinished && winner ? `Vencedor: ${winner.name}` : ''
    ].filter(Boolean),
    players: players.map((player) => ({
      uid: player.uid,
      name: player.name,
      coins: Number(player.coins || 0),
      influences: (player.influences || []).filter((card) => !card.revealed).length,
      isLocal: player.uid === localUid,
      isActive: player.uid === activeUid && !isFinished,
      isWinner: player.uid === rankedState.winnerUid,
      eliminated: Boolean(player.eliminated)
    })),
    result: isFinished
      ? createResultModel(rankedState, localUid, localPlayer, winner, localStats)
      : null
  };
}

// Formata o prazo em MM:SS para exibir no HUD.
export function formatRanked3dCountdown(deadline, now = Date.now()) {
  const remaining = Math.max(0, Number(deadline || 0) - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getPhaseInfo(state, localUid, activePlayer) {
  const localPlayer = state.players?.[localUid] || null;
  const activeUid = state.turnOrder?.[state.turnIndex] || null;
  const pending = state.pendingAction;
  const actor = state.players?.[pending?.actorUid];
  const target = state.players?.[pending?.targetUid];

  if (state.phase === PHASES.TURN) {
    return activeUid === localUid
      ? { title: 'Seu turno ranqueado', description: 'Escolha uma acao antes do prazo.', tone: 'default' }
      : { title: 'Aguardando turno', description: `${activePlayer?.name || 'Outro jogador'} esta jogando.`, tone: 'default' };
  }

  if (state.phase === PHASES.RESPONSE) {
    const targetText = target ? ` em ${target.name}` : '';
    return {
      title: 'Resposta aberta',
      description: `${actor?.name || 'Jogador'} declarou ${pending?.type || 'acao'}${targetText}.`,
      tone: 'warning'
    };
  }

  if (state.phase === PHASES.BLOCK_CHALLENGE) {
    const blocker = state.players?.[pending?.block?.uid];
    return {
      title: 'Bloqueio em disputa',
      description: `${blocker?.name || 'Jogador'} declarou bloqueio. A mesa pode aceitar ou contestar.`,
      tone: 'warning'
    };
  }

  if (state.phase === PHASES.CHALLENGE_REVEAL) {
    const challenged = state.players?.[pending?.challenge?.playerUid];
    return {
      title: 'Revelacao obrigatoria',
      description: `${challenged?.name || 'Jogador'} precisa revelar uma influencia.`,
      tone: 'danger'
    };
  }

  if (state.phase === PHASES.INFLUENCE_LOSS) {
    const losingPlayer = state.players?.[state.pendingLoss?.playerUid];
    return {
      title: localPlayer?.uid === losingPlayer?.uid ? 'Voce perdeu influencia' : 'Perda de influencia',
      description: `${losingPlayer?.name || 'Jogador'} deve escolher uma carta para revelar.`,
      tone: 'danger'
    };
  }

  if (state.phase === PHASES.FINISHED || state.status === PHASES.FINISHED) {
    const winner = state.players?.[state.winnerUid];
    return {
      title: 'Partida finalizada',
      description: winner ? `${winner.name} venceu o modo ranqueado.` : 'Resultado ranqueado pronto.',
      tone: 'success'
    };
  }

  return {
    title: 'Modo ranqueado',
    description: getSetupDescription(state.phase),
    tone: 'default'
  };
}

function getSetupDescription(phase) {
  return ({
    [PHASES.WAITING]: 'Aguardando jogadores ficarem prontos.',
    [PHASES.STARTER_DRAW]: 'Sorteando quem inicia a partida.',
    [PHASES.DEALING]: 'Distribuindo as influencias iniciais.',
    [PHASES.ANIMATING]: 'Resolvendo a animacao do motor.',
    [PHASES.EXCHANGE]: 'Aguardando troca de cartas.',
    [PHASES.EXAMINE]: 'Aguardando investigacao.'
  })[phase] || 'Sincronizando estado ranqueado.';
}

function createResultModel(state, localUid, localPlayer, winner, localStats) {
  const matchStats = state.matchStats?.[localUid] || {};
  const performanceScore = Number(localPlayer?.performanceScore || matchStats.performanceScore || 0);
  const unlocked = localStats?.latestUnlockedAchievementKeys || [];
  return {
    title: localPlayer?.uid === winner?.uid ? 'Vitoria registrada' : 'Resultado registrado',
    summary: winner ? `${winner.name} venceu a partida.` : 'A partida terminou.',
    score: performanceScore,
    rankScore: Number(localStats?.rankScore || 0),
    achievements: unlocked
  };
}

function ensureHud(root) {
  let hud = document.getElementById(HUD_ID);
  if (hud) return hud;
  hud = document.createElement('section');
  hud.id = HUD_ID;
  hud.className = 'ranked-match-hud';
  hud.setAttribute('aria-live', 'polite');
  root.appendChild(hud);
  return hud;
}

function renderHud(hud, model) {
  if (!model.visible) {
    hud.hidden = true;
    hud.innerHTML = '';
    return;
  }

  hud.hidden = false;
  hud.dataset.tone = model.tone || 'default';
  hud.innerHTML = `
    <div class="ranked-match-hud-main">
      <span class="ranked-match-kicker">Ranqueado</span>
      <strong>${escapeHtml(model.title)}</strong>
      <small>${escapeHtml(model.description)}</small>
    </div>
    <div class="ranked-match-meta" aria-label="Estado da partida">
      ${model.meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}
      ${model.deadline ? '<span data-ranked-countdown>00:00</span>' : ''}
    </div>
    <div class="ranked-match-players" aria-label="Jogadores ranqueados">
      ${model.players.map(renderPlayerChip).join('')}
    </div>
    ${model.result ? renderResult(model.result) : ''}
  `;
}

function renderPlayerChip(player) {
  const state = [
    player.isLocal ? 'local' : '',
    player.isActive ? 'active' : '',
    player.isWinner ? 'winner' : '',
    player.eliminated ? 'eliminated' : ''
  ].filter(Boolean).join(' ');

  return `
    <span class="ranked-match-player" data-state="${escapeAttribute(state)}">
      <strong>${escapeHtml(player.name)}</strong>
      <small>${player.coins} moedas - ${player.influences} inf.</small>
    </span>
  `;
}

function renderResult(result) {
  const achievements = result.achievements.length
    ? result.achievements.map((key) => `<span>${escapeHtml(key)}</span>`).join('')
    : '<span>Nenhuma nova conquista</span>';
  return `
    <div class="ranked-match-result">
      <strong>${escapeHtml(result.title)}</strong>
      <span>${escapeHtml(result.summary)}</span>
      <div>
        <span>${Math.round(result.score)} desempenho</span>
        <span>${Math.round(result.rankScore)} pts</span>
      </div>
      <div class="ranked-match-achievements">${achievements}</div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
