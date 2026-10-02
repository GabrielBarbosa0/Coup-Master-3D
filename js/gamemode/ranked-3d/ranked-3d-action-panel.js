import {
  ACTION_DEFINITIONS,
  PHASES,
  ROLE_DEFINITIONS,
  isActionAvailable
} from './ranked-3d-actions.js';
import {
  getRanked3dActionTargets,
  getRanked3dBlockClaimsForPlayer,
  getRanked3dPlayers,
  getRanked3dResponseUids
} from './ranked-3d-engine.js';

const PANEL_ID = 'rankedActionPanel';
const ACTION_ORDER = [
  'income',
  'foreign-aid',
  'tax',
  'steal',
  'assassinate',
  'exchange-ambassador',
  'exchange-inquisitor',
  'examine',
  'coup'
];

// Cria o painel visual que chama as acoes do motor ranqueado.
export function createRanked3dActionPanel(options = {}) {
  const root = options.root || document.body;
  const panel = ensurePanel(root);
  let rankedState = null;
  let busy = false;

  const getActions = options.getActions || (() => null);
  const getLocalUid = options.getLocalUid || (() => null);

  async function run(action) {
    if (busy) return;
    const actions = getActions();
    if (!actions) return renderError('Acoes ranqueadas indisponiveis.');
    busy = true;
    panel.classList.add('is-busy');
    try {
      await action(actions);
      renderError('');
    } catch (error) {
      renderError(error?.message || 'Nao foi possivel executar a acao.');
    } finally {
      busy = false;
      panel.classList.remove('is-busy');
    }
  }

  function update(nextRankedState) {
    rankedState = nextRankedState;
    const model = getRanked3dActionPanelModel(rankedState, getLocalUid());
    renderPanel(panel, model, run);
  }

  update(null);
  return { update };
}

// Gera um modelo puro da UI de turno/desafio a partir do estado do motor.
export function getRanked3dActionPanelModel(rankedState, localUid) {
  if (!rankedState || rankedState.status !== 'active') {
    return { visible: false, title: '', description: '', controls: [] };
  }

  const localPlayer = rankedState.players?.[localUid];
  if (!localPlayer || localPlayer.eliminated) {
    return createStatusModel('Modo ranqueado', 'Acompanhe a resolucao da partida.', rankedState);
  }

  if (rankedState.phase === PHASES.TURN) {
    return createTurnModel(rankedState, localPlayer);
  }

  if (rankedState.phase === PHASES.RESPONSE) {
    return createResponseModel(rankedState, localPlayer);
  }

  if (rankedState.phase === PHASES.BLOCK_CHALLENGE) {
    return createBlockChallengeModel(rankedState, localPlayer);
  }

  if (rankedState.phase === PHASES.CHALLENGE_REVEAL) {
    return createChallengeRevealModel(rankedState, localPlayer);
  }

  if (rankedState.phase === PHASES.INFLUENCE_LOSS) {
    return createInfluenceLossModel(rankedState, localPlayer);
  }

  if (rankedState.phase === PHASES.FINISHED) {
    const winner = rankedState.players?.[rankedState.winnerUid];
    return {
      visible: true,
      tone: 'success',
      title: 'Partida finalizada',
      description: winner ? `${winner.name} venceu a partida.` : 'A partida foi finalizada.',
      controls: []
    };
  }

  return createStatusModel('Modo ranqueado', getPhaseLabel(rankedState.phase), rankedState);
}

function createTurnModel(state, localPlayer) {
  const activeUid = state.turnOrder?.[state.turnIndex] || null;
  const activePlayer = state.players?.[activeUid];
  if (activeUid !== localPlayer.uid) {
    return createStatusModel('Aguardando turno', `Turno de ${activePlayer?.name || 'outro jogador'}.`, state);
  }

  return {
    visible: true,
    title: 'Seu turno',
    description: localPlayer.coins >= 10
      ? 'Com 10 moedas ou mais, o Golpe de Estado e obrigatorio.'
      : 'Escolha uma acao do motor ranqueado.',
    controls: ACTION_ORDER
      .filter((actionType) => ACTION_DEFINITIONS[actionType])
      .map((actionType) => createTurnActionControl(state, localPlayer.uid, actionType))
      .filter(Boolean)
  };
}

function createTurnActionControl(state, localUid, actionType) {
  const action = ACTION_DEFINITIONS[actionType];
  if (!isActionAvailable(state, actionType)) return null;
  const targets = action.requiresTarget ? getRanked3dActionTargets(state, localUid, actionType) : [];
  if (action.requiresTarget && targets.length === 0) return null;
  if (state.players?.[localUid]?.coins < action.cost) return null;
  if (state.players?.[localUid]?.coins >= 10 && actionType !== 'coup') return null;

  return {
    type: 'action',
    actionType,
    label: action.label,
    detail: getActionDetail(action),
    targetOptions: targets.map((player) => ({ uid: player.uid, label: player.name }))
  };
}

function createResponseModel(state, localPlayer) {
  const pending = state.pendingAction;
  const actor = state.players?.[pending?.actorUid];
  const action = ACTION_DEFINITIONS[pending?.type];
  const canRespond = getRanked3dResponseUids(state).includes(localPlayer.uid);
  if (!pending || !canRespond) {
    return createStatusModel('Resposta pendente', 'Aguardando respostas dos outros jogadores.', state);
  }

  const blockClaims = getRanked3dBlockClaimsForPlayer(state, localPlayer.uid);
  const controls = [];
  if (pending.claim && !pending.claimConfirmed) {
    controls.push({ type: 'challenge-action', label: 'Contestar' });
  }
  blockClaims.forEach((role) => {
    controls.push({
      type: 'declare-block',
      role,
      label: `Bloquear com ${ROLE_DEFINITIONS[role]?.label || role}`
    });
  });
  controls.push({ type: 'pass-response', label: 'Passar' });

  return {
    visible: true,
    title: 'Responder ação',
    description: `${actor?.name || 'Jogador'} declarou ${action?.label || pending.type}.`,
    controls
  };
}

function createBlockChallengeModel(state, localPlayer) {
  const pending = state.pendingAction;
  const block = pending?.block;
  if (!pending || !block || block.uid === localPlayer.uid || pending.passes?.[localPlayer.uid]) {
    return createStatusModel('Bloqueio declarado', 'Aguardando resolucao do bloqueio.', state);
  }

  const blocker = state.players?.[block.uid];
  const roleLabel = ROLE_DEFINITIONS[block.claim]?.label || block.claim;
  return {
    visible: true,
    title: 'Responder bloqueio',
    description: `${blocker?.name || 'Jogador'} bloqueou com ${roleLabel}.`,
    controls: [
      { type: 'challenge-block', label: 'Contestar bloqueio' },
      { type: 'pass-response', label: 'Aceitar bloqueio' }
    ]
  };
}

function createChallengeRevealModel(state, localPlayer) {
  const challenge = state.pendingAction?.challenge;
  if (!challenge || challenge.playerUid !== localPlayer.uid) {
    return createStatusModel('Contestação aberta', 'Aguardando revelação da influência contestada.', state);
  }

  return {
    visible: true,
    tone: 'warning',
    title: 'Revelar influência',
    description: `Mostre ${ROLE_DEFINITIONS[challenge.claim]?.label || challenge.claim} ou ceda a contestação.`,
    controls: getHiddenInfluences(localPlayer).map((card) => ({
      type: 'reveal-challenge',
      cardId: card.id,
      label: `Revelar ${ROLE_DEFINITIONS[card.role]?.label || card.role}`
    }))
  };
}

function createInfluenceLossModel(state, localPlayer) {
  const pendingLoss = state.pendingLoss;
  if (!pendingLoss || pendingLoss.playerUid !== localPlayer.uid) {
    return createStatusModel('Perda de influência', 'Aguardando escolha do jogador afetado.', state);
  }

  return {
    visible: true,
    tone: 'danger',
    title: 'Perder influência',
    description: pendingLoss.reason || 'Escolha uma influência para revelar.',
    controls: getHiddenInfluences(localPlayer).map((card) => ({
      type: 'lose-influence',
      cardId: card.id,
      label: `Perder ${ROLE_DEFINITIONS[card.role]?.label || card.role}`
    }))
  };
}

function createStatusModel(title, description, state) {
  return {
    visible: true,
    title,
    description,
    controls: [],
    phase: state?.phase || null
  };
}

function getHiddenInfluences(player) {
  return (player?.influences || []).filter((card) => !card.revealed);
}

function getActionDetail(action) {
  const details = [];
  if (action.cost) details.push(`${action.cost} moedas`);
  if (action.claim) details.push(ROLE_DEFINITIONS[action.claim]?.label || action.claim);
  return details.join(' - ');
}

function getPhaseLabel(phase) {
  return ({
    [PHASES.STARTER_DRAW]: 'Sorteando jogador inicial.',
    [PHASES.DEALING]: 'Distribuindo influências.',
    [PHASES.ANIMATING]: 'Resolvendo animação do motor.',
    [PHASES.EXCHANGE]: 'Aguardando troca de influências.',
    [PHASES.EXAMINE]: 'Aguardando investigação.'
  })[phase] || 'Aguardando o motor ranqueado.';
}

function ensurePanel(root) {
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;
  panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'ranked-action-panel';
  panel.setAttribute('aria-live', 'polite');
  root.appendChild(panel);
  return panel;
}

function renderPanel(panel, model, run) {
  if (!model.visible) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  panel.hidden = false;
  panel.dataset.tone = model.tone || 'default';
  panel.innerHTML = `
    <div class="ranked-action-panel-header">
      <strong>${escapeHtml(model.title)}</strong>
      <span>${escapeHtml(model.description || '')}</span>
    </div>
    <div class="ranked-action-panel-controls">
      ${model.controls.map(renderControl).join('')}
    </div>
    <p class="ranked-action-panel-error" aria-live="assertive"></p>
  `;

  panel.querySelectorAll('[data-ranked-control]').forEach((button) => {
    button.addEventListener('click', () => runControl(button, run));
  });
}

function renderControl(control, index) {
  const targetSelect = control.targetOptions?.length ? `
    <select class="ranked-action-target" data-ranked-target="${index}" aria-label="Alvo">
      ${control.targetOptions.map((target) => (
        `<option value="${escapeAttribute(target.uid)}">${escapeHtml(target.label)}</option>`
      )).join('')}
    </select>
  ` : '';

  return `
    <div class="ranked-action-control">
      ${targetSelect}
      <button class="settings-action-btn ranked-action-btn" type="button"
        data-ranked-control="${index}"
        data-type="${escapeAttribute(control.type)}"
        data-action-type="${escapeAttribute(control.actionType || '')}"
        data-role="${escapeAttribute(control.role || '')}"
        data-card-id="${escapeAttribute(control.cardId || '')}">
        <span>${escapeHtml(control.label)}</span>
        ${control.detail ? `<small>${escapeHtml(control.detail)}</small>` : ''}
      </button>
    </div>
  `;
}

function runControl(button, run) {
  const type = button.dataset.type;
  const target = button.parentElement?.querySelector('.ranked-action-target')?.value || null;
  const actionType = button.dataset.actionType || null;
  const role = button.dataset.role || null;
  const cardId = button.dataset.cardId || null;

  return run((actions) => {
    if (type === 'action') return actions.performAction(actionType, target);
    if (type === 'pass-response') return actions.passResponse();
    if (type === 'challenge-action') return actions.challengeAction();
    if (type === 'declare-block') return actions.declareBlock(role);
    if (type === 'challenge-block') return actions.challengeBlock();
    if (type === 'reveal-challenge') return actions.revealChallenge(cardId);
    if (type === 'lose-influence') return actions.loseInfluence(cardId);
    return Promise.resolve(null);
  });
}

function renderError(message) {
  const errorEl = document.querySelector(`#${PANEL_ID} .ranked-action-panel-error`);
  if (errorEl) errorEl.textContent = message || '';
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
