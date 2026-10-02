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
  let selectedControl = null;
  let countdownTimer = null;

  const getActions = options.getActions || (() => null);
  const getLocalUid = options.getLocalUid || (() => null);

  function stopCountdown() {
    if (!countdownTimer) return;
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }

  function updateCountdown(deadline) {
    const countdownEl = panel.querySelector('[data-ranked-action-countdown]');
    if (!countdownEl) return;
    countdownEl.textContent = formatCountdown(deadline);
    countdownEl.classList.toggle('is-urgent', getRemainingSeconds(deadline) <= 5);
  }

  function startCountdown(deadline) {
    stopCountdown();
    if (!deadline) return;
    updateCountdown(deadline);
    countdownTimer = window.setInterval(() => updateCountdown(deadline), 500);
  }

  async function run(action) {
    if (busy) return;
    const actions = getActions();
    if (!actions) return renderError('Acoes ranqueadas indisponiveis.');
    busy = true;
    panel.classList.add('is-busy');
    try {
      await action(actions);
      selectedControl = null;
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
    if (!model.controls.some((control) => isSameControl(control, selectedControl))) {
      selectedControl = null;
    }
    renderCurrentModel(model);
    startCountdown(model.deadline);
  }

  function renderCurrentModel(model) {
    renderPanel(panel, model, {
      run,
      getSelectedControl: () => selectedControl,
      setSelectedControl: (control) => {
        selectedControl = control;
        renderCurrentModel(model);
        startCountdown(model.deadline);
      }
    });
  }

  update(null);
  return {
    update,
    destroy: () => {
      stopCountdown();
      panel.remove();
    }
  };
}

// Gera um modelo puro da UI de turno/desafio a partir do estado do motor.
export function getRanked3dActionPanelModel(rankedState, localUid) {
  if (!rankedState || rankedState.status !== 'active') {
    return { visible: false, title: '', description: '', controls: [], deadline: null };
  }

  const localPlayer = rankedState.players?.[localUid];
  if (!localPlayer || localPlayer.eliminated) {
    return withDeadline(createStatusModel('Modo ranqueado', 'Acompanhe a resolucao da partida.', rankedState), rankedState);
  }

  if (rankedState.phase === PHASES.TURN) {
    return withDeadline(createTurnModel(rankedState, localPlayer), rankedState);
  }

  if (rankedState.phase === PHASES.RESPONSE) {
    return withDeadline(createResponseModel(rankedState, localPlayer), rankedState);
  }

  if (rankedState.phase === PHASES.BLOCK_CHALLENGE) {
    return withDeadline(createBlockChallengeModel(rankedState, localPlayer), rankedState);
  }

  if (rankedState.phase === PHASES.CHALLENGE_REVEAL) {
    return withDeadline(createChallengeRevealModel(rankedState, localPlayer), rankedState);
  }

  if (rankedState.phase === PHASES.INFLUENCE_LOSS) {
    return withDeadline(createInfluenceLossModel(rankedState, localPlayer), rankedState);
  }

  if (rankedState.phase === PHASES.FINISHED) {
    const winner = rankedState.players?.[rankedState.winnerUid];
    return withDeadline({
      visible: true,
      tone: 'success',
      title: 'Partida finalizada',
      description: winner ? `${winner.name} venceu a partida.` : 'A partida foi finalizada.',
      controls: []
    }, rankedState);
  }

  return withDeadline(createStatusModel('Modo ranqueado', getPhaseLabel(rankedState.phase), rankedState), rankedState);
}

function createTurnModel(state, localPlayer) {
  const activeUid = state.turnOrder?.[state.turnIndex] || null;
  const activePlayer = state.players?.[activeUid];
  if (activeUid !== localPlayer.uid) {
    return createStatusModel('Aguardando turno', `Turno de ${activePlayer?.name || 'outro jogador'}.`, state);
  }

  return {
    visible: true,
    stage: 'turn',
    title: 'Sua vez de jogar',
    description: localPlayer.coins >= 10
      ? 'Com 10 moedas ou mais, o Golpe de Estado e obrigatorio.'
      : '',
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
    role: action.claim || null,
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
    stage: 'response',
    title: 'Responder',
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
    stage: 'response',
    title: 'Responder',
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
    stage: 'response',
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
    stage: 'response',
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
    stage: 'centered',
    title,
    description,
    controls: [],
    phase: state?.phase || null
  };
}

function withDeadline(model, state) {
  return {
    ...model,
    deadline: Number(state?.deadline || 0) || null
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
  panel.className = 'ranked-action-panel rank-stage';
  panel.setAttribute('aria-live', 'polite');
  root.appendChild(panel);
  return panel;
}

function renderPanel(panel, model, context) {
  if (!model.visible) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  panel.hidden = false;
  syncPanelStageClass(panel, model, context.getSelectedControl());
  panel.dataset.tone = model.tone || 'default';
  const selectedControl = context.getSelectedControl();
  panel.innerHTML = `
    ${model.deadline ? `<div class="rank-timer" data-ranked-action-countdown>${formatCountdown(model.deadline)}</div>` : ''}
    <div class="rank-turn-bar">
      <h1>${escapeHtml(selectedControl ? 'Escolha o alvo' : model.title)}</h1>
    </div>
    <p class="rank-phase-description"${selectedControl || !model.description ? ' hidden' : ''}>${escapeHtml(model.description || '')}</p>
    <div class="rank-interaction">
      ${selectedControl ? renderTargetList(selectedControl) : renderControls(model.controls)}
    </div>
    <p class="ranked-action-panel-error" aria-live="assertive"></p>
  `;

  panel.querySelectorAll('[data-ranked-control]').forEach((button) => {
    button.addEventListener('click', () => runControl(button, context));
  });
  panel.querySelectorAll('[data-ranked-target]').forEach((button) => {
    button.addEventListener('click', () => runTarget(button, selectedControl, context.run));
  });
  panel.querySelector('[data-ranked-target-cancel]')?.addEventListener('click', () => {
    context.setSelectedControl(null);
  });
}

function syncPanelStageClass(panel, model, selectedControl) {
  panel.className = 'ranked-action-panel rank-stage';
  if (selectedControl) {
    panel.classList.add('is-centered-stage', 'is-target-stage');
  } else if (model.stage === 'response') {
    panel.classList.add('is-response-stage');
  } else if (model.stage === 'centered') {
    panel.classList.add('is-centered-stage');
  }
}

function renderControls(controls) {
  if (!controls.length) return '<div class="rank-waiting-interaction"></div>';
  const isResponse = controls.some((control) => control.type !== 'action');
  const className = isResponse
    ? `rank-response-actions rank-response-actions--count-${controls.length}`
    : 'rank-actions-grid';
  return `<div class="${className}">${controls.map(renderControl).join('')}</div>`;
}

function renderControl(control, index) {
  return `
      <button class="rank-action-btn" type="button"
        data-ranked-control="${index}"
        data-type="${escapeAttribute(control.type)}"
        data-action-type="${escapeAttribute(getVisualActionType(control))}"
        data-role="${escapeAttribute(control.role || '')}"
        data-card-id="${escapeAttribute(control.cardId || '')}"
        data-target-options="${escapeAttribute(JSON.stringify(control.targetOptions || []))}">
        <span class="rank-action-icon" aria-hidden="true"></span>
        <span class="rank-action-label">${escapeHtml(getControlLabel(control))}</span>
      </button>
  `;
}

function renderTargetList(control) {
  const targets = control?.targetOptions || [];
  const count = Math.min(targets.length, 5);
  return `
    <div class="rank-target-list rank-target-list--count-${count}">
      ${targets.map((target) => `
        <button class="rank-target-btn" type="button" data-ranked-target="${escapeAttribute(target.uid)}">
          ${escapeHtml(target.label)}
        </button>
      `).join('')}
      <button class="rank-secondary-btn rank-target-cancel" type="button" data-ranked-target-cancel>Cancelar</button>
    </div>
  `;
}

function runControl(button, context) {
  const type = button.dataset.type;
  const actionType = button.dataset.actionType || null;
  const role = button.dataset.role || null;
  const cardId = button.dataset.cardId || null;
  const controlIndex = Number(button.dataset.rankedControl);
  const control = getControlFromButton(button, controlIndex);

  if (type === 'action' && control?.targetOptions?.length) {
    context.setSelectedControl(control);
    return Promise.resolve(null);
  }

  return context.run((actions) => {
    if (type === 'action') return actions.performAction(actionType, null);
    if (type === 'pass-response') return actions.passResponse();
    if (type === 'challenge-action') return actions.challengeAction();
    if (type === 'declare-block') return actions.declareBlock(role);
    if (type === 'challenge-block') return actions.challengeBlock();
    if (type === 'reveal-challenge') return actions.revealChallenge(cardId);
    if (type === 'lose-influence') return actions.loseInfluence(cardId);
    return Promise.resolve(null);
  });
}

function runTarget(button, control, run) {
  const target = button.dataset.rankedTarget || null;
  if (!control?.actionType || !target) return Promise.resolve(null);
  return run((actions) => actions.performAction(control.actionType, target));
}

function getControlFromButton(button, index) {
  const controls = Array.from(button.closest('.rank-interaction')?.querySelectorAll('[data-ranked-control]') || []);
  const sourceButton = controls[index];
  if (!sourceButton) return null;
  const targetOptions = JSON.parse(sourceButton.dataset.targetOptions || '[]');
  return {
    type: sourceButton.dataset.type,
    actionType: sourceButton.dataset.actionType || null,
    role: sourceButton.dataset.role || null,
    cardId: sourceButton.dataset.cardId || null,
    targetOptions
  };
}

function getControlLabel(control) {
  if (control.type === 'action') {
    const roleSuffix = control.role ? ` (${ROLE_DEFINITIONS[control.role]?.label || control.role})` : '';
    if (control.actionType === 'assassinate') return control.label;
    return control.label.endsWith(roleSuffix) ? control.label : `${control.label}${roleSuffix}`;
  }
  return control.label;
}

function getVisualActionType(control) {
  if (control.type === 'action') return control.actionType || '';
  if (control.type === 'pass-response') return 'pass';
  if (control.type === 'declare-block') return 'block';
  if (control.type === 'challenge-action' || control.type === 'challenge-block') return 'challenge';
  return control.type || '';
}

function isSameControl(a, b) {
  if (!a || !b) return false;
  return a.type === b.type
    && a.actionType === b.actionType
    && a.role === b.role
    && a.cardId === b.cardId;
}

function getRemainingSeconds(deadline) {
  return Math.max(0, Math.ceil((Number(deadline || 0) - Date.now()) / 1000));
}

function formatCountdown(deadline) {
  return String(getRemainingSeconds(deadline)).padStart(2, '0');
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
