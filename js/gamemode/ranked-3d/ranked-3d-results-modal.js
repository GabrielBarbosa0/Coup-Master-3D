import { PHASES } from './ranked-3d-actions.js';
import { buildMatchResults } from './ranked-3d-engine.js';

const MODAL_ID = 'rankMatchResultsModal';

// Controla o modal final do ranqueado com a mesma estrutura visual do Coup Master original.
export function createRanked3dResultsModal(options = {}) {
  const root = options.root || document.body;
  const getRoomCode = options.getRoomCode || (() => '');
  const onBackToLobby = options.onBackToLobby || (() => {});
  const onRestartMatch = options.onRestartMatch || (() => {});
  let dismissed = false;
  let resultKey = '';

  function update(rankedState, context = {}) {
    const model = getRanked3dResultsModalModel(rankedState, context);
    if (!model.visible) {
      root.querySelector(`#${MODAL_ID}`)?.remove();
      dismissed = false;
      resultKey = '';
      return;
    }

    const nextKey = `${getRoomCode()}:${model.winnerUid || 'finished'}:${model.finishedAt || ''}`;
    if (nextKey !== resultKey) {
      resultKey = nextKey;
      dismissed = false;
    }

    const overlay = ensureModal(root, {
      onBackToLobby,
      onRestartMatch,
      onDismiss: () => {
        dismissed = true;
      }
    });
    const body = overlay.querySelector('#rankMatchResultsBody');
    if (!body) return;

    body.innerHTML = renderResultsBody(model);
    overlay.hidden = dismissed;
  }

  function destroy() {
    root.querySelector(`#${MODAL_ID}`)?.remove();
  }

  function hide() {
    dismissed = true;
    const overlay = root.querySelector(`#${MODAL_ID}`);
    if (overlay) overlay.hidden = true;
  }

  return { update, destroy, hide };
}

// Gera dados puros para testar e renderizar o modal de resultado final.
export function getRanked3dResultsModalModel(rankedState, context = {}) {
  if (!rankedState || rankedState.status !== PHASES.FINISHED) {
    return { visible: false, players: [] };
  }

  const result = buildMatchResults(rankedState, context.now || Date.now());
  const players = Object.values(result.players || {})
    .sort((left, right) => Number(right.performanceScore || 0) - Number(left.performanceScore || 0))
    .map((player, index) => ({
      ...player,
      position: index + 1,
      score: Number(player.performanceScore || 0),
      breakdown: Array.isArray(player.performanceBreakdown) ? player.performanceBreakdown : []
    }));
  const winner = players.find((player) => player.uid === rankedState.winnerUid) || null;
  const best = players[0] || null;

  return {
    visible: true,
    winnerUid: rankedState.winnerUid || null,
    finishedAt: rankedState.finishedAt || result.endedAt || null,
    title: winner ? `${winner.name} venceu` : 'Partida encerrada',
    best,
    players
  };
}

function ensureModal(root, actions) {
  let overlay = root.querySelector(`#${MODAL_ID}`);
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = MODAL_ID;
  overlay.className = 'rank-modal-overlay rank-results-overlay';
  overlay.hidden = true;

  const modal = document.createElement('section');
  modal.className = 'rank-modal rank-results-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'rankMatchResultsTitle');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'rank-close-btn';
  close.setAttribute('aria-label', 'Fechar resultado');
  close.textContent = '×';
  close.addEventListener('click', () => {
    actions.onDismiss?.();
    overlay.hidden = true;
  });

  const body = document.createElement('div');
  body.id = 'rankMatchResultsBody';
  body.className = 'rank-results-scroll';

  modal.append(close, body);
  overlay.append(modal);
  root.appendChild(overlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      actions.onDismiss?.();
      overlay.hidden = true;
    }
  });
  overlay.addEventListener('click', (event) => {
    const button = event.target.closest('[data-ranked-result-action]');
    if (!button) return;
    if (button.dataset.rankedResultAction === 'lobby') actions.onBackToLobby();
    if (button.dataset.rankedResultAction === 'restart') actions.onRestartMatch();
  });

  return overlay;
}

function renderResultsBody(model) {
  return `
    <div class="rank-results-modal-heading">
      <span class="rank-kicker">Resultado final</span>
      <h2 id="rankMatchResultsTitle">${escapeHtml(model.title)}</h2>
    </div>
    <section class="rank-match-results">
      ${model.best ? renderMvp(model.best) : ''}
      <div class="rank-match-scoreboard">
        ${model.players.map(renderScoreRow).join('')}
      </div>
      <div class="rank-match-result-actions">
        <button class="rank-secondary-btn" type="button" data-ranked-result-action="lobby">Voltar ao lobby</button>
        <button class="rank-primary-btn" type="button" data-ranked-result-action="restart">Reiniciar partida</button>
      </div>
    </section>
  `;
}

function renderMvp(player) {
  return `
    <div class="rank-match-mvp">
      <img src="${escapeAttribute(player.photo || 'assets/img/icons/ghost.svg')}" alt="" referrerpolicy="no-referrer">
      <span class="rank-kicker">Melhor jogador da partida</span>
      <strong>${escapeHtml(player.name)}</strong>
      <em>${formatSignedPoints(player.score)}</em>
    </div>
  `;
}

function renderScoreRow(player) {
  const result = player.won ? 'Vencedor' : player.eliminated ? 'Eliminado' : 'Sobreviveu';
  return `
    <article class="rank-match-score-row${player.won ? ' is-winner' : ''}${player.position === 1 ? ' is-mvp' : ''}">
      <span class="rank-match-position">${player.position}</span>
      <strong class="rank-match-player-name">${escapeHtml(player.name)}</strong>
      <span class="rank-match-player-result">${result}</span>
      <strong class="rank-match-points ${player.score >= 0 ? 'is-positive' : 'is-negative'}">${formatSignedPoints(player.score)}</strong>
      ${renderBreakdown(player.breakdown)}
    </article>
  `;
}

function renderBreakdown(items) {
  const list = items.length
    ? items.map((item) => `
      <li>
        <span>${escapeHtml(item.label)}</span>
        <strong>${formatSignedPoints(item.points)}</strong>
      </li>
    `).join('')
    : '<li><span>Sem eventos pontuados.</span><strong>0 pts</strong></li>';
  return `
    <details class="rank-match-breakdown">
      <summary>Ver pontos</summary>
      <ul>${list}</ul>
    </details>
  `;
}

function formatSignedPoints(value) {
  const points = Math.round(Number(value || 0));
  return `${points > 0 ? '+' : ''}${points} pts`;
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
