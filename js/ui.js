// =======================================================
// === INTERFACE DO USUÁRIO E RENDERIZAÇÃO (ui.js) ===
// =======================================================

// Variáveis DOM
const deckCountEl = document.getElementById('deck-count');
const graveCountEl = document.getElementById('grave-count');
const deckEl = document.getElementById('deck');
const freeArea = document.getElementById('freeArea');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');
const asylumScoreEl = document.getElementById('asylum-score');
const asylumPlusBtn = document.getElementById('asylum-plus');
const asylumMinusBtn = document.getElementById('asylum-minus');

// =======================================================
// === FUNÇÕES DE RENDERIZAÇÃO ===
// =======================================================

function clearDOM() {
  document.querySelectorAll('[data-hand]').forEach(h => h.innerHTML = '');
  freeArea.querySelectorAll('.card').forEach(n => n.remove());
  document.querySelectorAll('.slot').forEach(n => n.remove());
  document.querySelectorAll('.player-area.local-player')
    .forEach(el => el.classList.remove('local-player'));
}

function shouldShowBack(card) {
  if (card.location === 'deck') return true;
  if (card.location === 'free') return false;

  if (card.location?.startsWith('player-')) {
    const ownerId = card.owner;
    const owner = localGameState.players ? localGameState.players[ownerId] : null;

    // Verifica se o dono da carta permitiu que VOCÊ (myPlayerId) o espectasse
    const isSpectatingThisOwner = owner && owner.spectators && owner.spectators[myPlayerId];

    if (ownerId === myPlayerId || isSpectatingThisOwner) {
      return false; // Vejo a frente
    }
    return true; // Vejo o verso
  }
  return false;
}

const updateAllCardImages = () => {
  const isRetro = document.body.classList.contains('theme-retro');
  const suffix = isRetro ? '-retro' : '';
  const cardsOnTable = document.querySelectorAll('.card');

  cardsOnTable.forEach(cardEl => {
    // Se a carta NÃO estiver de costas, atualiza a frente
    if (!cardEl.classList.contains('back')) {
      const currentBg = cardEl.style.backgroundImage;
      // Extrai o nome da carta (ex: duque) da URL atual
      const cardTypeMatch = currentBg.match(/\/([a-z0-9_-]+?)(?:-retro)?\.png/i);

      if (cardTypeMatch) {
        const cardType = cardTypeMatch[1].toLowerCase();
        cardEl.style.backgroundImage = `url('./img/${cardType}${suffix}.png')`;
      }
    } else {
      // Se estiver de costas, troca entre back.png e back-retro.png
      const backImg = isRetro ? 'back-retro.png' : 'back.png';
      cardEl.style.backgroundImage = `url('./img/${backImg}')`;
    }
  });
};


function createCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.dataset.cardId = card.id;

  // Local: ui.js -> Lógica de Imagem Dinâmica
  const isRetro = document.body.classList.contains('theme-retro');
  const suffix = isRetro ? '-retro' : '';

  if (shouldShowBack(card)) {
    el.classList.add('back');
    // Se for retro, aplicamos a imagem específica para o verso pixelado
    if (isRetro) {
      el.style.backgroundImage = "url('./img/back-retro.png')";
    }
  } else {
    // Busca a arte normal ou a versão -retro.png
    const imageUrl = `./img/${card.type.toLowerCase()}${suffix}.png`;
    el.style.backgroundImage = `url('${imageUrl}')`;
  }

  // Mantém os eventos de Drag and Drop e Efeitos
  el.addEventListener('dragstart', (ev) => {
    ev.dataTransfer.setData('text/plain', card.id);
    ev.dataTransfer.effectAllowed = "move";
    el.classList.add('lifting');
    setTimeout(() => {
      el.classList.remove('lifting');
      el.classList.add('is-dragging');
    }, 0);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('lifting');
    el.classList.remove('is-dragging');
  });

  el.addEventListener('dblclick', () => {
    returnCardToDeck(card.id);
  });

  attachBalatroEffect(el);

  return el;
}

function renderAll() {
  const state = localGameState;
  if (!state || !state.players) return;

  // --- LÓGICA DO BOTÃO FANTASMA (ESPECTADOR) ---
  const spectatorBtn = document.getElementById('spectatorBtn');
  const spectatorModal = document.getElementById('spectatorModal');
  const spectatorList = document.getElementById('spectator-list');
  const closeSpectatorModalBtn = document.getElementById('closeSpectatorModalBtn');

  if (spectatorBtn && spectatorModal) {
    const myHand = state.players[myPlayerId]?.hand || [];

    // O ícone SÓ aparece se a mão estiver vazia
    if (myHand.length === 0) {
      spectatorBtn.style.display = 'block';
    } else {
      spectatorBtn.style.display = 'none';
      // Caso o modal esteja aberto e o jogador receba uma carta, fecha o modal
      spectatorModal.style.display = 'none';
    }

    spectatorBtn.onclick = () => {
      playSound('click');
      spectatorList.innerHTML = '';

      for (let i = 1; i <= 10; i++) {
        const p = state.players[i];
        if (p && p.uid && i !== myPlayerId) {
          const btn = document.createElement('div');
          btn.className = 'spectator-target-btn';
          btn.innerHTML = `
            <img src="${p.photo || 'img/coup.png'}" alt="">
            <span>${p.name || 'Jogador ' + i}</span>
          `;
          btn.onclick = () => {
            playSound('pop');
            requestSpectate(i);
            spectatorModal.style.display = 'none';
          };
          spectatorList.appendChild(btn);
        }
      }

      if (spectatorList.innerHTML === '') {
        spectatorList.innerHTML = '<p class="muted">Nenhum outro jogador disponível.</p>';
      }
      spectatorModal.style.display = 'flex';
    };

    if (closeSpectatorModalBtn) {
      closeSpectatorModalBtn.onclick = () => {
        playSound('click');
        spectatorModal.style.display = 'none';
      };
    }
  }

  clearDOM();

  for (let pid = 1; pid <= 10; pid++) {
    const playerEl = document.getElementById(`player-${pid}`);
    if (!playerEl) continue;

    const player = state.players[pid] || { online: false, hand: [], score: 0, religion: 'catolico', uid: null };

    if (player.online || player.uid) {
      playerEl.style.display = 'flex';
    } else {
      playerEl.style.display = 'none';
      continue;
    }

    const handContainer = document.querySelector(`#player-${pid} [data-hand]`);

    if (pid === myPlayerId) {
      playerEl.classList.add('local-player');
    }

    let headerEl = playerEl.querySelector('.player-header');
    if (!headerEl) {
      const titleDiv = playerEl.querySelector('.player-title');
      headerEl = document.createElement('div');
      headerEl.className = 'player-header';
      const img = document.createElement('img');
      img.className = 'player-avatar';
      playerEl.insertBefore(headerEl, titleDiv);
      headerEl.appendChild(img);
      headerEl.appendChild(titleDiv);
    }

    const avatarImg = headerEl.querySelector('.player-avatar');
    const nameTxt = headerEl.querySelector('.player-title');

    avatarImg.src = player.photo || 'img/coup.png';
    nameTxt.textContent = player.name || `Jogador ${pid}`;
    playerEl.style.opacity = player.online ? '1' : '0.5';

    const religionEl = playerEl.querySelector('.religion-status');
    if (religionEl) {
      let iconFile = player.religion === 'protestante' ? 'shield-sword.svg' : 'shield-cross.svg';
      let religionText = player.religion === 'protestante' ? 'Protestante' : 'Católico';
      religionEl.innerHTML = `<img src="img/${iconFile}" class="religion-icon"> ${religionText}`;

      if (player.religion === 'protestante') {
        religionEl.classList.remove('catolico');
        religionEl.classList.add('protestante');
      } else {
        religionEl.classList.remove('protestante');
        religionEl.classList.add('catolico');
      }
    }

    player.hand?.forEach((card) => {
      const slot = document.createElement('div');
      slot.className = 'slot small';
      const el = createCardElement(card);
      el.classList.add('small');
      slot.appendChild(el);
      handContainer.appendChild(slot);
    });

    if (!player.hand || player.hand.length === 0) {
      const slot = document.createElement('div');
      slot.className = 'slot small';
      handContainer.appendChild(slot);
    }

    const scoreEl = document.querySelector(`#player-${pid} .score`);
    scoreEl.textContent = player.score || 0;
  }

  // --- [ADICIONE O INDICADOR AQUI] ---
  for (let pid = 1; pid <= 10; pid++) {
    const player = state.players[pid];
    const playerEl = document.getElementById(`player-${pid}`);

    if (playerEl && player?.spectators && player.spectators[myPlayerId]) {
      playerEl.style.boxShadow = "0 0 8px #1e90ff"; // Brilho azul de espectador
      playerEl.style.border = "2px solid #1e90ff";
    } else if (playerEl) {
      playerEl.style.boxShadow = "";
      playerEl.style.border = "";
    }
  }

  state.freeCards?.forEach(card => {
    const el = createCardElement(card);
    el.classList.add('small');
    freeArea.appendChild(el);
  });

  deckCountEl.textContent = state.deck?.length || 0;
  if (asylumScoreEl) asylumScoreEl.textContent = state.asylumScore || 0;
}

// =======================================================
// === EVENTOS DRAG & DROP ===
// =======================================================

function setupDropzones() {
  deckEl.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', 'DECK_DRAW_ACTION');
  });

  deckEl.ondragover = ev => ev.preventDefault();
  deckEl.ondrop = ev => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    if (id !== 'DECK_DRAW_ACTION') moveCard(id, 'deck');
  };

  deckEl.onclick = () => drawCard();

  document.querySelectorAll('.player-area').forEach(area => {
    area.ondragover = ev => ev.preventDefault();
    area.ondrop = ev => {
      ev.preventDefault();
      const data = ev.dataTransfer.getData('text/plain');
      const pid = parseInt(area.dataset.player);

      if (data === 'DECK_DRAW_ACTION') {
        drawCard(pid);
      } else {
        moveCard(data, 'player', pid);
      }
    };
  });

  freeArea.ondragover = ev => ev.preventDefault();
  freeArea.ondrop = ev => {
    ev.preventDefault();
    const data = ev.dataTransfer.getData('text/plain');

    if (data === 'DECK_DRAW_ACTION') {
      burnTopCard();
    } else {
      moveCard(data, 'free');
    }
  };
}

// =======================================================
// === EFEITOS VISUAIS ===
// =======================================================

function attachBalatroEffect(element, isDeck = false) {
  if (!element) return;

  element.classList.add('balatro-effect');

  element.addEventListener('mousemove', (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const sensitivity = 5;

    const rotateX = -(y - centerY) / sensitivity;
    const rotateY = (x - centerX) / sensitivity;

    let shadowColor;
    if (isDeck) {
      shadowColor = 'rgba(0, 191, 255, 0.2)';
    } else {
      shadowColor = 'rgba(255, 200, 80, 0.15)';
    }

    element.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.08)`;
    element.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 12px ${shadowColor}`;
  });

  element.addEventListener('mouseleave', () => {
    element.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale(1)';
    element.style.boxShadow = '';
  });
}

function setupAutoScroll() {
  const threshold = 80; const speed = 15;
  window.addEventListener('dragover', (e) => {
    const y = e.clientY; const viewportHeight = window.innerHeight;
    if (y < threshold) window.scrollBy(0, -speed);
    else if (y > (viewportHeight - threshold)) window.scrollBy(0, speed);
  });
}

// =======================================================
// === INICIALIZAÇÃO DA INTERFACE (Botões, Modais) ===
// =======================================================

function setupUI() {
  if (resetBtn) resetBtn.onclick = () => { if (confirm("Resetar mesa?")) resetTable(); };

  const musicBtn = document.getElementById('musicBtn');
  const bgmAudio = document.getElementById('bgmAudio');
  if (bgmAudio) bgmAudio.volume = 0.1;

  if (musicBtn && bgmAudio) {
    bgmAudio.play().then(() => musicBtn.classList.remove('muted')).catch(() => musicBtn.classList.add('muted'));
    musicBtn.onclick = () => {
      if (bgmAudio.paused) { bgmAudio.play().then(() => musicBtn.classList.remove('muted')); }
      else { bgmAudio.pause(); musicBtn.classList.add('muted'); }
    };
  }

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
  const openDeckConfigBtn = document.getElementById('openDeckConfigBtn');
  const addBotBtn = document.getElementById('addBotBtn');

  if (addBotBtn) {
    addBotBtn.onclick = () => { addBot(); };
  }

  if (settingsBtn && settingsModal) {
    settingsBtn.onclick = () => { playSound('click'); settingsModal.style.display = 'flex'; };
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => { playSound('click'); settingsModal.style.display = 'none'; };
  }

  if (volumeSlider && bgmAudio) {
    volumeSlider.value = bgmAudio.volume;
    volumeSlider.addEventListener('input', (e) => { bgmAudio.volume = e.target.value; });
  }

  if (toggleHeaderBtn) {
    const header = document.querySelector('header');
    const spanText = toggleHeaderBtn.querySelector('span');

    toggleHeaderBtn.querySelector('img').src = 'img/eye.svg';
    toggleHeaderBtn.style.opacity = '1';
    if (spanText) spanText.textContent = "Visível";

    toggleHeaderBtn.onclick = () => {
      playSound('click');
      if (header.style.display !== 'none') {
        header.style.display = 'none';
        toggleHeaderBtn.querySelector('img').src = 'img/visibility_off.svg';
        toggleHeaderBtn.style.opacity = '0.6';
        if (spanText) spanText.textContent = "Oculto";
      } else {
        header.style.display = 'block';
        toggleHeaderBtn.querySelector('img').src = 'img/eye.svg';
        toggleHeaderBtn.style.opacity = '1';
        if (spanText) spanText.textContent = "Visível";
      }
    };

  }


  const deckContainer = document.getElementById('deck');
  attachBalatroEffect(deckContainer, true);

  const configModal = document.getElementById('configModal');
  const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
  if (openDeckConfigBtn && configModal) {
    openDeckConfigBtn.onclick = () => { playSound('click'); settingsModal.style.display = 'none'; configModal.style.display = 'flex'; };
    if (closeConfigModalBtn) closeConfigModalBtn.onclick = () => { playSound('click'); configModal.style.display = 'none'; settingsModal.style.display = 'flex'; };
  }

  const applyDeckConfigBtn = document.getElementById('applyDeckConfigBtn');
  const configInputs = document.querySelectorAll('.card-config-item input');
  configInputs.forEach(input => { if (myPlayerId !== 1) input.disabled = true; });
  if (applyDeckConfigBtn) {
    if (myPlayerId !== 1) {
      applyDeckConfigBtn.disabled = true; applyDeckConfigBtn.style.background = '#555'; applyDeckConfigBtn.textContent = 'Apenas o Host pode aplicar';
    } else {
      applyDeckConfigBtn.onclick = () => {
        playSound('click');
        const newConfig = {};
        configInputs.forEach(input => {
          let val = parseInt(input.value);
          if (isNaN(val) || val < 0) val = 0; if (val > 10) val = 10;
          newConfig[input.dataset.card] = val;
        });
        resetTable(newConfig);
        configModal.style.display = 'none';
      };
    }
  }

  const infoBtn = document.getElementById('infoBtn');
  const infoModal = document.getElementById('infoModal');
  const closeInfoBtn = document.getElementById('closeModalBtn');
  const flipCard = document.querySelector('.flip-card');
  const frontImg = flipCard ? flipCard.querySelector('.flip-card-front img') : null;
  const backImg = flipCard ? flipCard.querySelector('.flip-card-back img') : null;

  const promoChars = ['bufao', 'benfeitor', 'burgues', 'burocrata'];
  const revolutionChars = ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro_da_coroa', 'vigilante'];

  let currentRuleImages = [];
  let currentRuleIndex = 0;

  function calculateRuleImages() {
    const config = localGameState.deckConfig || {};
    let images = [];
    const hasPromo = promoChars.some(card => (config[card] || 0) > 0);
    const hasRevolution = revolutionChars.some(card => (config[card] || 0) > 0);

    if (hasRevolution) {
      images.push('img/front-actions-alternative.png');
    } else {
      images.push('img/front-actions.png');
    }

    if (hasPromo) {
      images.push('img/dlc-actions.png');
    }
    if (hasRevolution) {
      images.push('img/dlc2-actions.png');
    }
    images.push('img/back-actions.png');

    return images;
  }

  if (infoBtn && infoModal) {
    infoBtn.onclick = () => {
      playSound('click');
      currentRuleImages = calculateRuleImages();
      infoModal.style.display = 'flex';

      if (flipCard) {
        currentRuleIndex = 0;
        flipCard.classList.remove('is-flipped');
        frontImg.src = currentRuleImages[0];
        backImg.src = currentRuleImages.length > 1 ? currentRuleImages[1] : currentRuleImages[0];
      }
    };

    if (closeInfoBtn) closeInfoBtn.onclick = () => {
      playSound('click');
      infoModal.style.display = 'none';
    };

    if (flipCard) {
      flipCard.onclick = () => {
        playSound('card-slide');
        flipCard.classList.toggle('is-flipped');
        currentRuleIndex = (currentRuleIndex + 1) % currentRuleImages.length;
        setTimeout(() => {
          const nextIndex = (currentRuleIndex + 1) % currentRuleImages.length;
          if (flipCard.classList.contains('is-flipped')) {
            frontImg.src = currentRuleImages[nextIndex];
          } else {
            backImg.src = currentRuleImages[nextIndex];
          }
        }, 500);
      };
    }
  }

  const altRulesBtn = document.getElementById('altRulesBtn');
  const altRulesModal = document.getElementById('altRulesModal');
  const closeAltRulesBtn = document.getElementById('closeAltRulesBtn');
  const altFlipCard = document.getElementById('altRulesFlipCard');
  const altFrontImg = altFlipCard ? altFlipCard.querySelector('.flip-card-front img') : null;
  const altBackImg = altFlipCard ? altFlipCard.querySelector('.flip-card-back img') : null;

  const altRuleImagesList = [
    'img/alternative-rules1.png',
    'img/alternative-rules2.png',
    'img/alternative-rules3.png',
    'img/alternative-rules4.png'
  ];

  let currentAltIndex = 0;

  if (altRulesBtn && altRulesModal) {
    altRulesBtn.onclick = () => {
      playSound('click');
      altRulesModal.style.display = 'flex';

      if (altFlipCard) {
        currentAltIndex = 0;
        altFlipCard.classList.remove('is-flipped');
        altFrontImg.src = altRuleImagesList[0];
        altBackImg.src = altRuleImagesList[1];
      }
    };

    if (closeAltRulesBtn) {
      closeAltRulesBtn.onclick = () => {
        playSound('click');
        altRulesModal.style.display = 'none';
      };
    }

    if (altFlipCard) {
      altFlipCard.onclick = () => {
        playSound('card-slide');
        altFlipCard.classList.toggle('is-flipped');
        currentAltIndex = (currentAltIndex + 1) % altRuleImagesList.length;
        setTimeout(() => {
          const nextImageIndex = (currentAltIndex + 1) % altRuleImagesList.length;
          if (altFlipCard.classList.contains('is-flipped')) {
            altFrontImg.src = altRuleImagesList[nextImageIndex];
          } else {
            altBackImg.src = altRuleImagesList[nextImageIndex];
          }
        }, 500);
      };
    }
  }

  document.querySelectorAll('.player-area').forEach(area => {
    const pid = parseInt(area.dataset.player);
    const removeBtn = area.querySelector('.remove-player');
    if (removeBtn) removeBtn.addEventListener('click', () => kickPlayer(pid));
    const religionEl = area.querySelector('.religion-status');
    if (religionEl) religionEl.addEventListener('click', () => toggleReligion(pid));
    area.querySelector('.plus').addEventListener('click', () => updateScore(pid, 1));
    area.querySelector('.minus').addEventListener('click', () => updateScore(pid, -1));
  });


  if (document.getElementById('asylum-plus')) {
    document.getElementById('asylum-plus').onclick = () => updateAsylumScore(1);
    document.getElementById('asylum-minus').onclick = () => updateAsylumScore(-1);
  }


  // Local: Dentro de setupUI() no ui.js
  const toggleRetroBtn = document.getElementById('toggleRetroThemeBtn');

  const applyRetroTheme = (isEnabled) => {
    const body = document.body;
    const btnSpan = toggleRetroBtn?.querySelector('span');
    const btnImg = toggleRetroBtn?.querySelector('img');

    if (isEnabled) {
      body.classList.add('theme-retro');
      if (btnSpan) btnSpan.textContent = "Ativado";
      if (toggleRetroBtn) toggleRetroBtn.style.opacity = "1";
    } else {
      body.classList.remove('theme-retro');
      if (btnSpan) btnSpan.textContent = "Desativado";
      if (toggleRetroBtn) toggleRetroBtn.style.opacity = "0.6";
    }

    localStorage.setItem('retroTheme', isEnabled);
  };

  if (toggleRetroBtn) {
    const isRetro = localStorage.getItem('retroTheme') === 'true';
    applyRetroTheme(isRetro); // Aplica o tema salvo ao carregar

    toggleRetroBtn.onclick = () => {
      playSound('click');
      const currentlyRetro = document.body.classList.contains('theme-retro');
      const nextState = !currentlyRetro;

      applyRetroTheme(nextState); // Altera cores e persistência
      updateAllCardImages();      // Atualiza as imagens das cartas
    };
  }
}

// =======================================================
// === INICIALIZAÇÃO E EVENTOS DE HEADER ===
// =======================================================

const roomHeader = document.getElementById('roomHeader');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');

if (roomCodeDisplay && typeof roomCode !== 'undefined' && roomCode) {
  roomCodeDisplay.textContent = roomCode;
}

if (roomHeader) {
  roomHeader.onclick = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      playSound('pop');
      roomHeader.classList.add('copied');
      const originalText = roomHeader.querySelector('p').textContent;
      roomHeader.querySelector('p').textContent = "CÓDIGO COPIADO!";
      setTimeout(() => {
        roomHeader.classList.remove('copied');
        roomHeader.querySelector('p').textContent = originalText;
      }, 1200);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      alert("Código da sala: " + roomCode);
    });
  };
}

const toggleReligionBtn = document.getElementById('toggleReligionBtn');

const applyReligionVisibility = (shouldHide) => {
  const body = document.body;

  if (toggleReligionBtn) {
    const img = toggleReligionBtn.querySelector('img');
    const span = toggleReligionBtn.querySelector('span');

    if (shouldHide) {
      body.classList.add('hide-religion');
      span.textContent = "Oculto";
      toggleReligionBtn.style.opacity = '0.6';
      if (img) img.src = 'img/visibility_off.svg';
    } else {
      body.classList.remove('hide-religion');
      span.textContent = "Visível";
      toggleReligionBtn.style.opacity = '1';
      if (img) img.src = 'img/eye.svg';
    }
  } else if (shouldHide) {
    body.classList.add('hide-religion');
  } else {
    body.classList.remove('hide-religion');
  }
  localStorage.setItem('hideReligion', shouldHide);
};

if (toggleReligionBtn) {
  const storedValue = localStorage.getItem('hideReligion');
  const storedReligionSetting = storedValue === null ? true : (storedValue === 'true');
  applyReligionVisibility(storedReligionSetting);

  toggleReligionBtn.onclick = () => {
    playSound('click');
    const isCurrentlyHidden = document.body.classList.contains('hide-religion');
    applyReligionVisibility(!isCurrentlyHidden);
  };
}