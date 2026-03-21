// =======================================================
// === CONTROLE DE ESTADO E FIREBASE (gameState.js) ===
// =======================================================

// 1. Pega o código da sala da URL (?room=XXXX)
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

// 2. Pega os dados do usuário logado (vindos do Lobby)
const currentUser = {
  uid: sessionStorage.getItem('currentUID'),
  name: sessionStorage.getItem('currentName'),
  photo: sessionStorage.getItem('currentPhoto')
};

// 3. Segurança: Se não tem sala ou não tem user logado, manda pro Lobby
if (!roomCode || !currentUser.uid) {
  window.location.href = 'lobby.html';
}

const gameStateRef = db.ref(`salas/${roomCode}/gameState`);

let localGameState = {};
let myPlayerId = null;
let isDrawingCard = false;
let lastSoundTimestamp = 0;


// Solicitar para espectar
function requestSpectate(targetPid) {
  const targetPlayer = localGameState.players[targetPid];
  if (!targetPlayer || !targetPlayer.uid) return;

  // Envia uma notificação/solicitação via Firebase
  db.ref(`salas/${roomCode}/notifications/${targetPlayer.uid}`).set({
    fromName: currentUser.name,
    fromPid: myPlayerId,
    type: 'SPECTATE_REQUEST',
    timestamp: Date.now()
  });
  alert("Solicitação enviada! Aguardando aprovação...");
}

// Ouvinte de notificações (Colocar dentro do initializeGame)
function setupNotificationListener() {
  db.ref(`salas/${roomCode}/notifications/${currentUser.uid}`).on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.type === 'SPECTATE_REQUEST') {
      const accept = confirm(`${data.fromName} deseja te espectar. Aceitar?`);
      if (accept) {
        // Adiciona o espectador na lista do jogador
        db.ref(`salas/${roomCode}/gameState/players/${myPlayerId}/spectators/${data.fromPid}`).set(data.fromName);
      }
      // Limpa a notificação
      snapshot.ref.remove();
    }
  });
}

// =======================================================
// === UTILITÁRIOS GLOBAIS DE SOM E ESTADO ===
// =======================================================

function playSound(id) {
  const sound = document.getElementById('audio-' + id);
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Erro ao tocar som:", e));
  }
}

function triggerSound(soundId) {
  db.ref(`salas/${roomCode}/gameState/lastSFX`).set({
    id: soundId,
    timestamp: Date.now()
  });
}

// =======================================================
// === AÇÕES DE CARTAS E BARALHO ===
// =======================================================

function resetTable(newConfig = null) {
  updateRoomActivity();
  console.log("Resetando a mesa...");
  triggerSound('8-bit-start');

  const configToUse = newConfig || localGameState.deckConfig || createDefaultDeckConfig();
  let newDeck = createDeck(configToUse);
  let currentPlayers = localGameState.players || {};

  let newPlayersState = {};

  for (let i = 1; i <= 10; i++) {
    newPlayersState[i] = {
      online: currentPlayers[i]?.online || false,
      uid: currentPlayers[i]?.uid || null,
      name: currentPlayers[i]?.name || null,
      photo: currentPlayers[i]?.photo || null,
      hand: [],
      score: 2,
      religion: (i % 2 === 1) ? 'catolico' : 'protestante'
    };
  }

  let initialState = {
    deck: newDeck,
    grave: [],
    freeCards: [],
    asylumScore: 0,
    deckConfig: configToUse,
    players: newPlayersState
  };

  gameStateRef.set(initialState);
}

function drawCard(targetPid = null) {
  const playerToReceive = targetPid || myPlayerId;
  if (!playerToReceive) return;

  if (isDrawingCard) return;
  isDrawingCard = true;
  triggerSound('card-slide');

  updateRoomActivity();

  gameStateRef.transaction((currentState) => {
    if (!currentState || !currentState.deck || currentState.deck.length === 0) {
      isDrawingCard = false;
      return;
    }

    const card = currentState.deck.pop();
    card.owner = playerToReceive;
    card.location = 'player-' + playerToReceive;
    card.visible = false;

    if (!currentState.players[playerToReceive].hand) {
      currentState.players[playerToReceive].hand = [];
    }
    currentState.players[playerToReceive].hand.push(card);

    return currentState;
  }, (error, committed) => {
    isDrawingCard = false;
  });
}

function returnCardToDeck(cardId) {
  triggerSound('shuffle');
  gameStateRef.transaction((currentState) => {
    if (!currentState) return currentState;
    const card = findCardById(currentState, cardId);
    if (!card) return currentState;

    removeCardFromLocation(currentState, cardId);
    card.owner = null;
    card.location = 'deck';
    card.visible = false;
    if (!currentState.deck) currentState.deck = [];
    currentState.deck.push(card);
    shuffle(currentState.deck);
    return currentState;
  });
}

function moveCard(cardId, targetLocation, targetPlayerId = null) {
  updateRoomActivity();
  if (targetLocation === 'player') triggerSound('card-slide');
  if (targetLocation === 'free') triggerSound('knife');
  if (targetLocation === 'deck') triggerSound('shuffle');

  gameStateRef.transaction((currentState) => {
    if (!currentState) return currentState;
    const card = findCardById(currentState, cardId);
    if (!card) return currentState;

    if (targetLocation === 'player') {
      removeCardFromLocation(currentState, cardId);
      card.owner = targetPlayerId;
      card.location = 'player-' + targetPlayerId;
      card.visible = false;
      if (!currentState.players[targetPlayerId].hand) currentState.players[targetPlayerId].hand = [];
      currentState.players[targetPlayerId].hand.push(card);
    }
    else if (targetLocation === 'free') {
      removeCardFromLocation(currentState, cardId);
      card.owner = null;
      card.location = 'free';
      card.visible = true;
      if (!currentState.freeCards) currentState.freeCards = [];
      currentState.freeCards.push(card);
    }
    else if (targetLocation === 'deck') {
      removeCardFromLocation(currentState, cardId);
      card.owner = null;
      card.location = 'deck';
      card.visible = false;
      if (!currentState.deck) currentState.deck = [];
      currentState.deck.push(card);
      shuffle(currentState.deck);
    }
    return currentState;
  });
}

function burnTopCard() {
  triggerSound('card-slide');
  gameStateRef.transaction((currentState) => {
    if (!currentState || !currentState.deck || currentState.deck.length === 0) return;
    const card = currentState.deck.pop();
    card.owner = null;
    card.location = 'free';
    card.visible = true;
    if (!currentState.freeCards) currentState.freeCards = [];
    currentState.freeCards.push(card);
    return currentState;
  });
}

// =======================================================
// === AÇÕES DE MESA (PONTOS, KICK, ETC) ===
// =======================================================

function kickPlayer(pid) {
  if (!confirm(`Tem certeza que deseja remover o Jogador ${pid}?`)) return;
  triggerSound('impact');

  if (pid === myPlayerId) {
    window.location.href = 'lobby.html';
  }

  db.ref(`salas/${roomCode}/gameState/players/${pid}`).update({
    online: false,
    uid: null,
    name: null,
    photo: null,
    hand: [],
    score: 2
  });
}

function updateScore(pid, amount) {
  triggerSound('coin');
  updateRoomActivity();
  const scoreRef = db.ref(`salas/${roomCode}/gameState/players/${pid}/score`);
  scoreRef.once('value', (snapshot) => {
    let newScore = (snapshot.val() || 0) + amount;
    if (newScore < 0) newScore = 0;
    scoreRef.set(newScore);
  });
}

function updateAsylumScore(amount) {
  triggerSound('coin');
  updateRoomActivity();
  const scoreRef = db.ref(`salas/${roomCode}/gameState/asylumScore`);
  scoreRef.once('value', (snapshot) => {
    let newScore = (snapshot.val() || 0) + amount;
    if (newScore < 0) newScore = 0;
    scoreRef.set(newScore);
  });
}


function toggleReligion(pid) {
  const player = localGameState.players[pid];
  if (!player) return;

  const currentRel = (player.religion || 'catolico').toLowerCase();
  const newRel = (currentRel === 'protestante') ? 'catolico' : 'protestante';

  // CORREÇÃO: Usando o som de papel/carta em vez de moeda
  playSound('paper'); 

  // Caminho correto para disparar a atualização visual no ui.js
  db.ref(`salas/${roomCode}/gameState/players/${pid}/religion`).set(newRel);
}

function addBot() {
  playSound('click');
  let botSlot = null;
  for (let i = 1; i <= 10; i++) {
    const p = localGameState.players[i];
    if (!p.uid && !p.online) {
      botSlot = i;
      break;
    }
  }

  if (botSlot) {
    let botCount = 0;
    for (let i = 1; i <= 10; i++) {
      if (localGameState.players[i].name && localGameState.players[i].name.startsWith('BOT')) {
        botCount++;
      }
    }
    const botName = `BOT ${botCount + 1}`;

    db.ref(`salas/${roomCode}/gameState/players/${botSlot}`).update({
      online: true,
      uid: 'bot-' + Date.now(),
      name: botName,
      photo: 'img/robot.svg',
      hand: [],
      score: 2,
      religion: (botSlot % 2 === 1) ? 'catolico' : 'protestante'
    });
  } else {
    alert("A sala está cheia! Não é possível adicionar bots.");
  }
}

// =======================================================
// === SISTEMA DE CONEXÃO E INICIALIZAÇÃO ===
// =======================================================

function setupDisconnectHandler(pid) {
  db.ref(`salas/${roomCode}/gameState/players/${pid}/online`).onDisconnect().set(false);
}

function joinGame() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) loadingOverlay.style.display = 'flex';

  gameStateRef.transaction((currentState) => {
    if (!currentState || !currentState.players) {
      const defaultConfig = createDefaultDeckConfig();
      let newDeck = createDeck(defaultConfig);

      let initialState = {
        deck: newDeck,
        grave: [],
        freeCards: [],
        asylumScore: 0,
        deckConfig: defaultConfig,
        players: {}
      };

      for (let i = 1; i <= 10; i++) {
        initialState.players[i] = {
          online: false,
          hand: [],
          score: 2,
          religion: (i % 2 === 1) ? 'catolico' : 'protestante',
          uid: null,
          name: null,
          photo: null
        };
      }

      initialState.players[1].uid = currentUser.uid;
      initialState.players[1].name = currentUser.name;
      initialState.players[1].photo = currentUser.photo;
      initialState.players[1].online = true;

      myPlayerId = 1;
      return initialState;
    }

    for (let i = 1; i <= 10; i++) {
      if (currentState.players[i] && currentState.players[i].uid === currentUser.uid) {
        currentState.players[i].online = true;
        currentState.players[i].name = currentUser.name;
        currentState.players[i].photo = currentUser.photo;
        myPlayerId = i;
        return currentState;
      }
    }

    for (let i = 1; i <= 10; i++) {
      if (!currentState.players[i].uid) {
        currentState.players[i].uid = currentUser.uid;
        currentState.players[i].name = currentUser.name;
        currentState.players[i].photo = currentUser.photo;
        currentState.players[i].online = true;
        currentState.players[i].hand = [];
        currentState.players[i].score = 2;
        myPlayerId = i;
        return currentState;
      }
    }

    return;

  }, (error, committed, snapshot) => {
    if (committed) {
      console.log(`Conectado com sucesso no Slot ${myPlayerId}`);
      setupDisconnectHandler(myPlayerId);
      if (loadingOverlay) loadingOverlay.style.display = 'none';
    } else if (error) {
      console.error("Erro na transação:", error);
      alert("Erro de conexão. Tentando novamente...");
      window.location.reload();
    } else {
      alert("Sala cheia! Todos os slots têm donos.");
      window.location.href = 'lobby.html';
    }
  });
}

function initializeGame() {
  gameStateRef.on('value', (snapshot) => {
    const state = snapshot.val();
    if (state) {
      if (state.lastSFX && state.lastSFX.timestamp > lastSoundTimestamp) {
        lastSoundTimestamp = state.lastSFX.timestamp;
        playSound(state.lastSFX.id);
      }
      localGameState = state;
      // renderAll() é chamada aqui, ela ficará no ui.js
      if (typeof renderAll === "function") {
        renderAll();
      }
    }
  });

  joinGame();
  setupNotificationListener(); // [ADICIONE ESTA LINHA AQUI]

  // As funções de UI ficarão no ui.js
  if (typeof setupUI === "function") setupUI();
  if (typeof setupDropzones === "function") setupDropzones();
  if (typeof setupAutoScroll === "function") setupAutoScroll();
}

// Inicia o jogo quando o Firebase Auth confirmar o login
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("Login confirmado. Iniciando jogo...");
    initializeGame();
  } else {
    console.log("Usuário não logado. Redirecionando...");
    window.location.href = 'lobby.html';
  }
});


// Sistema de Autodestruição: Registra a última interação na sala
function updateRoomActivity() {
  if (roomCode) {
    db.ref(`salas/${roomCode}/lastActivity`).set(Date.now());
  }
}