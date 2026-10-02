// Configura o modal de registro oficial usado pelo modo ranqueado.
export function setupOfficialLogService(options = {}) {
  const {
    historyBtn,
    officialLogModal,
    closeOfficialLogBtn,
    officialLogList,
    copyOfficialLogBtn,
    officialLogStatus,
    openModal,
    closeModal,
    t = (_key, _params, fallback) => fallback
  } = options;

  let entries = [];

  function render() {
    const model = createOfficialLogModel(entries, t);
    renderOfficialLogList(officialLogList, model);
    if (officialLogStatus) officialLogStatus.textContent = '';
    return model;
  }

  function setEntries(nextEntries = []) {
    entries = Array.isArray(nextEntries) ? nextEntries.slice() : [];
    if (officialLogModal?.style.display !== 'none') render();
  }

  historyBtn?.addEventListener('click', () => {
    render();
    openModal?.(officialLogModal);
  });

  closeOfficialLogBtn?.addEventListener('click', () => closeModal?.(officialLogModal));

  copyOfficialLogBtn?.addEventListener('click', async () => {
    const model = createOfficialLogModel(entries, t);
    const text = getOfficialLogClipboardText(model);
    try {
      await navigator.clipboard.writeText(text);
      if (officialLogStatus) {
        officialLogStatus.textContent = t('three.logCopied', {}, 'Log copiado.');
      }
    } catch (_error) {
      if (officialLogStatus) {
        officialLogStatus.textContent = t('three.logCopyError', {}, 'Nao foi possivel copiar o log.');
      }
    }
  });

  setEntries([]);
  return { setEntries, render };
}

// Normaliza entradas do motor para o modelo visual do registro oficial.
export function createOfficialLogModel(entries = [], t = (_key, _params, fallback) => fallback) {
  const items = (Array.isArray(entries) ? entries : [])
    .map(normalizeOfficialLogEntry)
    .filter(Boolean);

  return {
    emptyText: t('three.officialLogEmpty', {}, 'Nenhum registro oficial ainda.'),
    items
  };
}

// Monta o texto usado pelo botao de copiar log.
export function getOfficialLogClipboardText(model) {
  if (!model?.items?.length) return model?.emptyText || '';
  return model.items.map((item) => item.text).join('\n');
}

function normalizeOfficialLogEntry(entry) {
  const message = String(entry?.message || '').trim();
  if (!message) return null;
  return {
    id: entry.id || `${entry.timestamp || 0}-${message}`,
    text: message,
    type: entry.type || 'info',
    turn: Number(entry.turn || 0),
    timestamp: Number(entry.timestamp || 0)
  };
}

function renderOfficialLogList(listEl, model) {
  if (!listEl) return;
  if (!model.items.length) {
    listEl.innerHTML = `<p class="official-log-empty">${escapeHtml(model.emptyText)}</p>`;
    return;
  }

  listEl.innerHTML = model.items.map((item) => `
    <p class="official-log-entry" data-type="${escapeAttribute(item.type)}">
      ${escapeHtml(item.text)}
    </p>
  `).join('');
  listEl.scrollTop = listEl.scrollHeight;
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
