// Configura o modal proprio de feedback e sugestoes.
export function setupFeedbackService(options = {}) {
  const {
    feedbackBtn,
    feedbackModal,
    closeFeedbackBtn,
    cancelFeedbackBtn,
    feedbackForm,
    feedbackStatus,
    feedbackPage,
    feedbackRoom,
    feedbackPlayer,
    feedbackDate,
    openModal,
    closeModal,
    getRoomCode,
    getPlayerName,
    t = fallbackTranslate
  } = options;

  if (!feedbackModal || !feedbackForm) return;

  feedbackBtn?.addEventListener('click', () => {
    fillFeedbackMetadata({
      feedbackPage,
      feedbackRoom,
      feedbackPlayer,
      feedbackDate,
      getRoomCode,
      getPlayerName
    });
    setFeedbackStatus(feedbackStatus, '');
    openModal?.(feedbackModal);
  });

  closeFeedbackBtn?.addEventListener('click', () => closeModal?.(feedbackModal));
  cancelFeedbackBtn?.addEventListener('click', () => closeModal?.(feedbackModal));

  feedbackForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitFeedbackForm({
      form: feedbackForm,
      statusEl: feedbackStatus,
      fields: {
        feedbackPage,
        feedbackRoom,
        feedbackPlayer,
        feedbackDate,
        getRoomCode,
        getPlayerName
      },
      t
    });
  });
}

function fallbackTranslate(_key, _params, fallback = '') {
  return fallback;
}

// Atualiza metadados ocultos usados para identificar a origem do feedback.
function fillFeedbackMetadata(options) {
  const {
    feedbackPage,
    feedbackRoom,
    feedbackPlayer,
    feedbackDate,
    getRoomCode,
    getPlayerName
  } = options;

  if (feedbackPage) feedbackPage.value = window.location.href;
  if (feedbackRoom) feedbackRoom.value = getRoomCode?.() || '';
  if (feedbackPlayer) feedbackPlayer.value = getPlayerName?.() || 'Visitante';
  if (feedbackDate) feedbackDate.value = new Date().toISOString();
}

function setFeedbackStatus(statusEl, message, type = '') {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.toggle('is-success', type === 'success');
  statusEl.classList.toggle('is-error', type === 'error');
}

// Envia o formulario para o endpoint usado pelo Coup Master original.
async function submitFeedbackForm(options) {
  const { form, statusEl, fields, t } = options;
  const submitButton = form.querySelector('[type="submit"]');
  const originalLabel = submitButton?.textContent || t('common.send', {}, 'Enviar');

  fillFeedbackMetadata(fields);
  setFeedbackStatus(statusEl, t('feedback.submitting', {}, 'Enviando feedback...'));

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = t('feedback.sending', {}, 'Enviando...');
  }

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      body: new FormData(form)
    });

    if (!response.ok) throw new Error(`Formspark returned ${response.status}`);

    form.reset();
    setFeedbackStatus(
      statusEl,
      t('feedback.success', {}, 'Feedback enviado. Obrigado por ajudar o Coup Master!'),
      'success'
    );
  } catch (error) {
    console.error('Erro ao enviar feedback:', error);
    setFeedbackStatus(
      statusEl,
      t('feedback.error', {}, 'Nao foi possivel enviar agora. Tente novamente em instantes.'),
      'error'
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}
