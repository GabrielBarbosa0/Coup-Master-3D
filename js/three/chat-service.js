import {
  chatBtn,
  chatForm,
  chatInput,
  chatMessagesList,
  chatModal,
  chatQuickMessages,
  chatStatusText,
  closeChatBtn,
  sendChatBtn
} from './dom.js';
import { closeModal, openModal } from './modal-service.js';

const CHAT_MESSAGE_MAX_LENGTH = 240;
const QUICK_CHAT_MESSAGES = [
  ['three.quickChat.duke', 'Sou o Duque'],
  ['three.quickChat.captain', 'Sou o Capitão'],
  ['three.quickChat.contessa', 'Sou a Condessa'],
  ['three.quickChat.tax', 'Taxar'],
  ['three.quickChat.extort', 'Extorquir'],
  ['three.quickChat.assassinate', 'Assassinar'],
  ['three.quickChat.exchange', 'Trocar'],
  ['three.quickChat.investigate', 'Investigar'],
  ['three.quickChat.challenge', 'Contesto'],
  ['three.quickChat.block', 'Bloqueio']
];

const chatState = {
  messages: [],
  initialized: false
};

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

// Configura o chat casual da sala e as mensagens rapidas.
function setupChatPanel() {
  chatBtn?.addEventListener('click', openChatModal);
  closeChatBtn?.addEventListener('click', () => closeModal(chatModal));

  chatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    sendChatMessage(chatInput?.value || '');
  });

  renderQuickChatButtons();
  renderChatMessages();
  window.addEventListener('coup:languagechange', () => {
    renderQuickChatButtons();
    renderChatMessages();
  });
}

// Abre o painel de chat e remove o indicador de mensagens novas.
function openChatModal() {
  chatBtn?.classList.remove('chat-btn-has-unread');
  openModal(chatModal);
  renderChatMessages();
  window.setTimeout(() => chatInput?.focus(), 60);
}

// Recebe mensagens sincronizadas pelo bootstrap online.
function setChatMessages(messages = []) {
  const previousLastId = chatState.messages.at(-1)?.id || null;
  chatState.messages = messages.slice(-60);
  const latest = chatState.messages.at(-1);
  const localUid = window.CoupMaster3DOnline?.user?.uid;

  if (
    chatState.initialized &&
    latest?.id &&
    latest.id !== previousLastId &&
    latest.actorUid !== localUid &&
    chatModal?.style.display === 'none'
  ) {
    chatBtn?.classList.add('chat-btn-has-unread');
  }

  chatState.initialized = true;
  renderChatMessages();
}

// Cria chips de mensagens comuns para partidas sem chamada de voz.
function renderQuickChatButtons() {
  if (!chatQuickMessages) return;
  chatQuickMessages.innerHTML = '';

  QUICK_CHAT_MESSAGES.forEach(([key, fallback]) => {
    const message = t(key, {}, fallback);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-quick-btn';
    button.textContent = message;
    button.addEventListener('click', () => sendChatMessage(message, 'quick'));
    chatQuickMessages.append(button);
  });
}

// Envia texto livre ou chip rapido para o Firebase.
async function sendChatMessage(text, type = 'text') {
  const messageText = String(text || '').trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
  if (!messageText) return;

  if (!window.CoupMaster3DOnline?.sendChatMessage) {
    if (chatStatusText) chatStatusText.textContent = t('three.chatUnavailable', {}, 'Chat online indisponivel.');
    return;
  }

  if (sendChatBtn) sendChatBtn.disabled = true;
  try {
    await window.CoupMaster3DOnline.sendChatMessage({ text: messageText, type });
    if (chatInput && type === 'text') chatInput.value = '';
    if (chatStatusText) chatStatusText.textContent = t('three.chatSubtitle', {}, 'Converse com a sala.');
  } catch (error) {
    console.error('Falha ao enviar mensagem.', error);
    if (chatStatusText) chatStatusText.textContent = t('three.chatSendError', {}, 'Nao foi possivel enviar a mensagem.');
  } finally {
    if (sendChatBtn) sendChatBtn.disabled = false;
    chatInput?.focus();
  }
}

// Desenha a lista de mensagens preservando texto como conteudo seguro.
function renderChatMessages() {
  if (!chatMessagesList) return;
  chatMessagesList.innerHTML = '';

  if (chatState.messages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chat-empty-message';
    empty.textContent = t('three.emptyChat', {}, 'Nenhuma mensagem ainda.');
    chatMessagesList.append(empty);
    return;
  }

  const localUid = window.CoupMaster3DOnline?.user?.uid;
  chatState.messages.forEach((message) => {
    const item = document.createElement('article');
    item.className = 'chat-message';
    if (message.actorUid === localUid) item.classList.add('is-own');
    if (message.type === 'quick') item.classList.add('is-quick');

    const meta = document.createElement('div');
    meta.className = 'chat-message-meta';

    const author = document.createElement('span');
    author.textContent = getChatAuthor(message);

    const time = document.createElement('span');
    time.textContent = formatChatTime(message.createdAt);

    const text = document.createElement('div');
    text.className = 'chat-message-text';
    text.textContent = message.text;

    meta.append(author, time);
    item.append(meta, text);
    chatMessagesList.append(item);
  });

  chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
}

// Formata o nome do autor com assento quando houver esse dado.
function getChatAuthor(message) {
  const name = message.actorName || t('common.player', {}, 'Jogador');
  return message.actorSeat ? `${name} · P${message.actorSeat}` : name;
}

// Mostra horario curto das mensagens no padrao local.
function formatChatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString(window.CoupLanguage?.getLanguage?.() || 'pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export {
  openChatModal,
  setChatMessages,
  setupChatPanel
};
