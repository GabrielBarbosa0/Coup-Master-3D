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

/**
 * LIMPEZA DO DOM (RESET VISUAL)
 * Remove todos os elementos dinâmicos do tabuleiro antes de uma nova renderização.
 * Isso evita a duplicação de cartas e slots ao atualizar o estado do jogo.
 */
function clearDOM() {
  // Limpa o conteúdo das mãos de todos os jogadores
  document.querySelectorAll('[data-hand]').forEach(h => h.innerHTML = '');

  // Remove cartas espalhadas na área livre (cemitério)
  freeArea.querySelectorAll('.card').forEach(n => n.remove());

  // Remove slots vazios remanescentes
  document.querySelectorAll('.slot').forEach(n => n.remove());

  // Remove a marcação visual de "jogador local" para reatribuição
  document.querySelectorAll('.player-area.local-player')
    .forEach(el => el.classList.remove('local-player'));
}

/**
 * LÓGICA DE VISIBILIDADE DE CARTAS
 * Determina se uma carta deve exibir o seu verso (back) ou a sua face frontal.
 * Leva em conta a localização da carta e permissões de espectador (Ghost Mode).
 */
function shouldShowBack(card) {
  // Cartas no deck sempre mostram o verso
  if (card.location === 'deck') return true;

  // Cartas na área livre (reveladas) sempre mostram a frente
  if (card.location === 'free') return false;

  // Lógica para cartas em posse de jogadores
  if (card.location?.startsWith('player-')) {
    const ownerId = card.owner;
    const owner = localGameState.players ? localGameState.players[ownerId] : null;

    // Verifica se o dono da carta permitiu que o usuário atual (espectador) veja sua mão
    const isSpectatingThisOwner = owner && owner.spectators && owner.spectators[myPlayerId];

    // Se você for o dono ou um espectador autorizado, vê a frente; caso contrário, vê o verso
    if (ownerId === myPlayerId || isSpectatingThisOwner) {
      return false; // Exibe a frente
    }
    return true; // Exibe o verso
  }
  return false;
}

/**
 * CRIAÇÃO DE ELEMENTO DE CARTA
 * Gera o elemento HTML para uma carta, define sua aparência (frente/verso), 
 * configura os eventos de Drag & Drop e aplica efeitos visuais.
 */
function createCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true; // Habilita o arrastar da carta
  el.dataset.cardId = card.id;

  // Define a aparência baseada na função de visibilidade
  if (shouldShowBack(card)) {
    el.classList.add('back');
  } else {
    const imageUrl = `./img/${card.type.toLowerCase()}.png`;
    el.style.backgroundImage = `url('${imageUrl}')`;
  }

  // --- EVENTOS DE ARRASTAR (DRAG & DROP) ---
  el.addEventListener('dragstart', (ev) => {
    ev.dataTransfer.setData('text/plain', card.id);
    ev.dataTransfer.effectAllowed = "move";
    el.classList.add('lifting'); // Efeito visual de "levantar" a carta

    // Pequeno atraso para aplicar a classe de arrasto sem bugar o "ghost image" do browser
    setTimeout(() => {
      el.classList.remove('lifting');
      el.classList.add('is-dragging');
    }, 0);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('lifting');
    el.classList.remove('is-dragging');
  });

  // --- INTERAÇÕES ADICIONAIS ---
  // Clique duplo devolve a carta automaticamente para o deck
  el.addEventListener('dblclick', () => {
    returnCardToDeck(card.id);
  });

  // Aplica o efeito visual de inclinação (Balatro Style)
  attachBalatroEffect(el);

  return el;
}



/**
 * FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO
 * Sincroniza o estado do Firebase com a interface e aplica permissões de Host (isAdmin).
 */
function renderAll() {
  const state = localGameState;
  if (!state || !state.players) return;

  // --- 1. TRAVAS DE ADMINISTRADOR (HOST) ---
  // Referências aos elementos de controle global
  const resetBtn = document.getElementById('resetBtn');
  const addBotBtn = document.getElementById('addBotBtn');
  const applyDeckBtn = document.getElementById('applyDeckConfigBtn');
  const configInputs = document.querySelectorAll('.card-config-item input');

  // Visibilidade dos botões Reset e Adicionar Bot
  if (resetBtn) resetBtn.style.display = isAdmin ? 'flex' : 'none';
  if (addBotBtn) {
    const botRow = addBotBtn.closest('.setting-row');
    if (botRow) botRow.style.display = isAdmin ? 'flex' : 'none';
  }

  // Habilita ou desabilita os campos de texto do baralho em tempo real
  configInputs.forEach(input => {
    input.disabled = !isAdmin;
  });

  // Configuração visual e funcional do botão de aplicar baralho
  if (applyDeckBtn) {
    if (!isAdmin) {
      applyDeckBtn.disabled = true;
      applyDeckBtn.style.background = '#555'; // Cinza para indicar bloqueio
      applyDeckBtn.textContent = 'Apenas o Host pode aplicar';
    } else {
      applyDeckBtn.disabled = false;
      applyDeckBtn.style.background = ''; // Reseta para a cor original do CSS
      applyDeckBtn.textContent = 'Aplicar e Resetar Jogo';
    }
  }


  // --- 1. LÓGICA DO SISTEMA DE ESPECTADOR (GHOST MODE) ---
  const spectatorBtn = document.getElementById('spectatorBtn');
  const spectatorModal = document.getElementById('spectatorModal');
  const spectatorList = document.getElementById('spectator-list');
  const closeSpectatorModalBtn = document.getElementById('closeSpectatorModalBtn');

  if (spectatorBtn && spectatorModal) {
    const myHand = state.players[myPlayerId]?.hand || [];

    if (myHand.length === 0) {
      spectatorBtn.style.display = 'block';
    } else {
      spectatorBtn.style.display = 'none';
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

  // Limpa o tabuleiro antes de desenhar o novo estado.
  clearDOM();

  // --- 2. RENDERIZAÇÃO DOS SLOTS DE JOGADORES (1 a 10) ---
  for (let pid = 1; pid <= 10; pid++) {
    const playerEl = document.getElementById(`player-${pid}`);
    if (!playerEl) continue;

    const player = state.players[pid] || { online: false, hand: [], score: 0, religion: 'catolico', uid: null };

    // Define se o slot do jogador deve estar visível ou oculto.
    if (player.online || player.uid) {
      playerEl.style.display = 'flex';
    } else {
      playerEl.style.display = 'none';
      continue;
    }




    // --- 2.1 IDENTIFICAÇÃO E CONTROLE DE MODERAÇÃO ---
    // Adiciona classe de destaque para o jogador local
    if (pid === myPlayerId) {
      playerEl.classList.add('local-player');
    }

    // Controle de Moderação: Botão de expulsar (X) visível apenas para o Host
    const removeBtn = playerEl.querySelector('.remove-player');
    if (removeBtn) {
      removeBtn.style.display = isAdmin ? 'block' : 'none';
    }

    // --- 2.2 CABEÇALHO DO JOGADOR (AVATAR E NOME) ---
    // Garante que a estrutura do cabeçalho exista para suporte a fotos de perfil
    let headerEl = playerEl.querySelector('.player-header');
    if (!headerEl) {
      const titleDiv = playerEl.querySelector('.player-title');
      headerEl = document.createElement('div');
      headerEl.className = 'player-header';

      const img = document.createElement('img');
      img.className = 'player-avatar';

      // Injeta o cabeçalho antes do título e reorganiza o DOM
      playerEl.insertBefore(headerEl, titleDiv);
      headerEl.appendChild(img);
      headerEl.appendChild(titleDiv);
    }

    const avatarImg = headerEl.querySelector('.player-avatar');
    const nameTxt = headerEl.querySelector('.player-title');

    if (avatarImg) avatarImg.src = player.photo || 'img/coup.png';
    if (nameTxt) nameTxt.textContent = player.name || `Jogador ${pid}`;

    // --- 2.3 STATUS DE RELIGIÃO ---
    // Atualiza ícones e classes CSS baseados na afiliação atual
    const religionEl = playerEl.querySelector('.religion-status');
    if (religionEl) {
      const isProtestante = player.religion === 'protestante';
      const iconFile = isProtestante ? 'shield-sword.svg' : 'shield-cross.svg';
      const religionText = isProtestante ? 'Protestante' : 'Católico';

      religionEl.innerHTML = `<img src="img/${iconFile}" class="religion-icon"> ${religionText}`;
      religionEl.className = `religion-status ${player.religion}`; // Aplica classe dinâmica
    }

    // --- 2.4 RENDERIZAÇÃO DA MÃO E PONTUAÇÃO ---
    const handContainer = playerEl.querySelector('[data-hand]');
    if (handContainer) {
      // Renderiza cada carta presente na mão do jogador
      player.hand?.forEach((card) => {
        const slot = document.createElement('div');
        slot.className = 'slot small';
        const el = createCardElement(card);
        el.classList.add('small');
        slot.appendChild(el);
        handContainer.appendChild(slot);
      });

      // Mantém um slot vazio por estética se não houver cartas
      if (!player.hand || player.hand.length === 0) {
        const slot = document.createElement('div');
        slot.className = 'slot small';
        handContainer.appendChild(slot);
      }
    }

    // --- RENDERIZAÇÃO DA MÃO E PONTUAÇÃO (Fim do Trecho 2) ---
    const scoreEl = playerEl.querySelector('.score');
    if (scoreEl) scoreEl.textContent = player.score || 0;

    // --- INTEGRAÇÃO DO TRECHO 3 (INDICADOR DE ESPECTADOR) ---
    // Em vez de um novo loop, fazemos a checagem aqui mesmo, aproveitando o 'pid' atual.
    if (player?.spectators && player.spectators[myPlayerId]) {
      playerEl.style.boxShadow = "0 0 8px #1e90ff";
      playerEl.style.border = "2px solid #1e90ff";
    } else {
      playerEl.style.boxShadow = "";
      playerEl.style.border = "";
    }
  }




  // --- 4. RENDERIZAÇÃO DO TABULEIRO CENTRAL (ÁREA LIVRE / DECK) ---
  // Exibe as cartas que estão abertas no cemitério e atualiza contadores.
  state.freeCards?.forEach(card => {
    const el = createCardElement(card);
    el.classList.add('small');
    freeArea.appendChild(el);
  });

  if (deckCountEl) deckCountEl.textContent = state.deck?.length || 0;
  if (asylumScoreEl) asylumScoreEl.textContent = state.asylumScore || 0;
}


// =======================================================
// === CONFIGURAÇÃO DE INTERAÇÕES (DRAG & DROP) ===
// =======================================================

/**
 * CONFIGURAÇÃO DE ZONAS DE DEPÓSITO (DROPZONES)
 * Define como o Deck, as Áreas de Jogadores e o Cemitério (Free Area) reagem ao 
 * arrasto e soltura de cartas ou ações de compra.
 */
function setupDropzones() {
  // --- CONFIGURAÇÃO DO DECK (BARALHO) ---
  // Inicia a ação de compra ao arrastar o Deck
  deckEl.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', 'DECK_DRAW_ACTION');
  });

  deckEl.ondragover = ev => ev.preventDefault();
  deckEl.ondrop = ev => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    // Se soltar uma carta no Deck, ela volta para o baralho
    if (id !== 'DECK_DRAW_ACTION') moveCard(id, 'deck');
  };

  // Clique simples no Deck compra uma carta para o jogador local
  deckEl.onclick = () => drawCard();

  // --- CONFIGURAÇÃO DAS ÁREAS DOS JOGADORES ---
  document.querySelectorAll('.player-area').forEach(area => {
    area.ondragover = ev => ev.preventDefault();
    area.ondrop = ev => {
      ev.preventDefault();
      const data = ev.dataTransfer.getData('text/plain');
      const pid = parseInt(area.dataset.player);

      // Se o dado for a ação do Deck, compra uma carta para aquele jogador específico
      if (data === 'DECK_DRAW_ACTION') {
        drawCard(pid);
      } else {
        // Caso contrário, move a carta arrastada para a mão do jogador
        moveCard(data, 'player', pid);
      }
    };
  });

  // --- CONFIGURAÇÃO DA ÁREA LIVRE (CEMITÉRIO/TABULEIRO) ---
  freeArea.ondragover = ev => ev.preventDefault();
  freeArea.ondrop = ev => {
    ev.preventDefault();
    const data = ev.dataTransfer.getData('text/plain');

    // Se arrastar do Deck para o meio, "queima" (revela) a carta do topo
    if (data === 'DECK_DRAW_ACTION') {
      burnTopCard();
    } else {
      // Move a carta arrastada para ficar visível a todos no centro
      moveCard(data, 'free');
    }
  };
}

// =======================================================
// === EFEITOS VISUAIS E EXPERIÊNCIA (UX) ===
// =======================================================

/**
 * EFEITO BALATRO (INCLINAÇÃO 3D)
 * Aplica um efeito de profundidade e sombra dinâmica ao elemento baseado 
 * na posição do mouse, simulando o movimento de cartas físicas.
 */
function attachBalatroEffect(element, isDeck = false) {
  if (!element) return;

  element.classList.add('balatro-effect');

  element.addEventListener('mousemove', (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left; // Posição X dentro do elemento
    const y = e.clientY - rect.top;  // Posição Y dentro do elemento
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const sensitivity = 5; // Define a força da inclinação

    const rotateX = -(y - centerY) / sensitivity;
    const rotateY = (x - centerX) / sensitivity;

    // Define a cor da sombra baseada no tipo de elemento
    let shadowColor = 'rgba(0, 191, 255, 0.2)';

    // Aplica a transformação de perspectiva e a sombra dinâmica
    element.style.transform = `perspective(300px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.08)`;
    element.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 40px ${shadowColor}`;
  });

  // Reseta o elemento para o estado original quando o mouse sai
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'perspective(300px) rotateX(0) rotateY(0) scale(1)';
    element.style.boxShadow = '';
  });
}

/**
 * ROLAGEM AUTOMÁTICA DURANTE DRAG
 * Permite que a página role para cima ou para baixo automaticamente quando 
 * o jogador arrasta uma carta para as extremidades da tela.
 */
function setupAutoScroll() {
  const threshold = 80; // Distância da borda para ativar o scroll
  const speed = 15;     // Velocidade da rolagem

  window.addEventListener('dragover', (e) => {
    const y = e.clientY;
    const viewportHeight = window.innerHeight;

    // Rola para cima se estiver perto do topo
    if (y < threshold) window.scrollBy(0, -speed);
    // Rola para baixo se estiver perto da base
    else if (y > (viewportHeight - threshold)) window.scrollBy(0, speed);
  });
}




/**
 * INICIALIZAÇÃO DOS COMPONENTES DA INTERFACE
 * Configura listeners de clique, estados iniciais de modais e controles de áudio/vídeo.
 */
function setupUI() {

  // --- 1. MODAIS DE AVISO E SISTEMA ---

  // Gerenciamento do Modal de Sala Cheia (Aviso de limite de Bots)
  const fullRoomModal = document.getElementById('fullRoomModal');
  const closeFullRoomBtn = document.getElementById('closeFullRoomBtn');

  if (closeFullRoomBtn && fullRoomModal) {
    closeFullRoomBtn.onclick = () => {
      playSound('click');
      fullRoomModal.style.display = 'none';
    };
  }

  // Configuração do Botão de Reset Principal (Abre confirmação)
  if (resetBtn) {
    resetBtn.onclick = () => {
      const resetModal = document.getElementById('resetModal');
      if (resetModal) {
        resetModal.style.display = 'flex';
      }
    };
  }


  // --- 2. CONTROLES DE AMBIENTE E TELA ---

  // Alternância de Tela Cheia (Fullscreen)
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.onclick = () => {
      playSound('click');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Erro ao ativar tela cheia: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    };
  }

  // Configuração de Áudio (BGM e Volume)
  const musicBtn = document.getElementById('musicBtn');
  const bgmAudio = document.getElementById('bgmAudio');
  const volumeSlider = document.getElementById('volumeSlider');

  if (bgmAudio) bgmAudio.volume = 0.1;

  if (musicBtn && bgmAudio) {
    bgmAudio.play()
      .then(() => musicBtn.classList.remove('muted'))
      .catch(() => musicBtn.classList.add('muted'));

    musicBtn.onclick = () => {
      if (bgmAudio.paused) {
        bgmAudio.play().then(() => musicBtn.classList.remove('muted'));
      } else {
        bgmAudio.pause();
        musicBtn.classList.add('muted');
      }
    };
  }

  if (volumeSlider && bgmAudio) {
    volumeSlider.value = bgmAudio.volume;
    volumeSlider.addEventListener('input', (e) => {
      bgmAudio.volume = e.target.value;
    });
  }


  // --- 3. INTERAÇÕES DE JOGO (ASILO, KICK, BOTS) ---

  // Atalho de Gesto: Saque rápido do Asilo via clique duplo na imagem
  const asylumArea = document.getElementById('asylumArea');
  if (asylumArea) {
    const asylumImage = asylumArea.querySelector('.asylum-image-wrapper img');
    if (asylumImage) {
      asylumImage.ondblclick = () => {
        withdrawAsylumCoins(); // Função no gameState.js
      };
    }
  }

  // Modal de Remoção de Jogador (Kick)
  const kickModal = document.getElementById('kickPlayerModal');
  const confirmKickBtn = document.getElementById('confirmKickBtn');
  const cancelKickBtn = document.getElementById('cancelKickBtn');

  if (confirmKickBtn) {
    confirmKickBtn.onclick = () => {
      confirmKickAction(); // Executa a remoção no Firebase
      if (kickModal) kickModal.style.display = 'none';
    };
  }

  if (cancelKickBtn) {
    cancelKickBtn.onclick = () => {
      if (kickModal) kickModal.style.display = 'none';
    };
  }

  // Modal Interno de Confirmação de Reset de Mesa
  const confirmBtn = document.getElementById('confirmResetBtn');
  const cancelBtn = document.getElementById('cancelResetBtn');
  const resetModal = document.getElementById('resetModal');

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      resetTable(); // Reinicia o estado global da partida
      if (resetModal) resetModal.style.display = 'none';
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      if (resetModal) resetModal.style.display = 'none';
    };
  }

  // Botão de Adicionar Bot (Menu de Configurações)
  const addBotBtn = document.getElementById('addBotBtn');
  if (addBotBtn) {
    addBotBtn.onclick = () => { addBot(); };
  }


  // --- 4. CONFIGURAÇÕES VISUAIS E CUSTOMIZAÇÃO ---

  // Menu de Configurações (Abertura/Fechamento)
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  if (settingsBtn && settingsModal) {
    settingsBtn.onclick = () => {
      playSound('click');
      settingsModal.style.display = 'flex';
    };
    if (closeSettingsBtn) {
      closeSettingsBtn.onclick = () => {
        playSound('click');
        settingsModal.style.display = 'none';
      };
    }
  }

  // Controle de Visibilidade do Header (Código da Sala)
  const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
  if (toggleHeaderBtn) {
    const header = document.querySelector('header');
    const spanText = toggleHeaderBtn.querySelector('span');

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

  // Configuração de Efeitos Balatro no Deck Central
  const deckContainer = document.getElementById('deck');
  attachBalatroEffect(deckContainer, true);


  // --- 5. CONFIGURAÇÃO DE BARALHO (HOST APENAS) ---

  const configModal = document.getElementById('configModal');
  const openDeckConfigBtn = document.getElementById('openDeckConfigBtn');
  const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
  const applyDeckConfigBtn = document.getElementById('applyDeckConfigBtn');
  const configInputs = document.querySelectorAll('.card-config-item input');

  // Navegação para o Modal de Baralho
  if (openDeckConfigBtn && configModal) {
    openDeckConfigBtn.onclick = () => {
      playSound('click');

      // --- NOVO: Sincroniza os inputs com a configuração salva no Firebase ---
      // Busca a configuração atual do estado local (ou a padrão se não existir)
      const currentConfig = localGameState.deckConfig;

      if (currentConfig) {
        // Percorre todos os inputs do modal
        configInputs.forEach(input => {
          const cardType = input.dataset.card; // Pega o tipo da carta (ex: 'duque')

          // Se o banco tiver um valor para essa carta, atualiza o campo de texto
          if (currentConfig[cardType] !== undefined) {
            input.value = currentConfig[cardType];
          }
        });
      }

      // Fecha o menu de configurações e abre o de baralho
      if (settingsModal) settingsModal.style.display = 'none';
      configModal.style.display = 'flex';
    };

    if (closeConfigModalBtn) {
      closeConfigModalBtn.onclick = () => {
        playSound('click');
        configModal.style.display = 'none';
        settingsModal.style.display = 'flex';
      };
    }
  }

  // Lógica de Permissão e Aplicação da Configuração (Apenas para o Host)
  configInputs.forEach(input => {
    input.disabled = !isAdmin;
  });

  if (applyDeckConfigBtn) {
    applyDeckConfigBtn.onclick = () => {
      // Verificação extra de segurança
      if (!isAdmin) return;

      playSound('click');
      const newConfig = {};
      const configInputs = document.querySelectorAll('.card-config-item input');

      configInputs.forEach(input => {
        let val = parseInt(input.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 10) val = 10;
        newConfig[input.dataset.card] = val;
      });

      resetTable(newConfig); // Aplica e reinicia a partida
      if (configModal) configModal.style.display = 'none';
    };
  }


  // --- 6. MODAL DE INFORMAÇÕES E REGRAS ---

  const infoBtn = document.getElementById('infoBtn');
  const infoModal = document.getElementById('infoModal');
  const closeInfoBtn = document.getElementById('closeModalBtn');
  const flipCard = document.querySelector('.flip-card');
  const frontImg = flipCard ? flipCard.querySelector('.flip-card-front img') : null;
  const backImg = flipCard ? flipCard.querySelector('.flip-card-back img') : null;

  let currentRuleImages = [];
  let currentRuleIndex = 0;

  if (infoBtn && infoModal) {
    infoBtn.onclick = () => {
      playSound('click');
      currentRuleImages = calculateRuleImages(); // Lógica de DLCs
      infoModal.style.display = 'flex';

      if (flipCard) {
        currentRuleIndex = 0;
        flipCard.classList.remove('is-flipped');
        frontImg.src = currentRuleImages[0];
        backImg.src = currentRuleImages.length > 1 ? currentRuleImages[1] : currentRuleImages[0];
      }
    };

    if (closeInfoBtn) {
      closeInfoBtn.onclick = () => {
        playSound('click');
        infoModal.style.display = 'none';
      };
    }
  }


  /**
 * Gerencia a exibição do tutorial inicial
 */
  function checkTutorial() {
    const tutorialModal = document.getElementById('tutorialModal');
    const closeBtn = document.getElementById('closeTutorialBtn');
    const startBtn = document.getElementById('startPlayBtn');

    // Verifica se o tutorial já foi visto nesta sessão de navegador
    const tutorialSeen = sessionStorage.getItem('tutorialSeen');

    if (!tutorialSeen) {
      if (tutorialModal) tutorialModal.style.display = 'flex';
    }

    const closeAction = () => {
      if (tutorialModal) tutorialModal.style.display = 'none';
      sessionStorage.setItem('tutorialSeen', 'true'); // Salva para não mostrar de novo
    };

    if (closeBtn) closeBtn.onclick = closeAction;
    if (startBtn) startBtn.onclick = closeAction;
  }



  /**
   * Gerencia a fila de imagens das cartas de ajuda (regras) baseada na composição atual do deck.
   * Verifica a presença de personagens de diferentes DLCs (Promo, Revolução e Sombras do Asilo)
   * para exibir apenas os guias de ações pertinentes aos jogadores na partida.
   */

  function calculateRuleImages() {
    const config = localGameState.deckConfig || {};
    let images = [];

    // Definição dos grupos de cartas
    const promoChars = ['bufao', 'benfeitor', 'burgues', 'burocrata'];
    const revolutionChars = ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro_da_coroa', 'vigilante'];
    const shadowsChars = ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife'];

    // Verifica se há alguma carta de cada expansão no set atual
    const hasPromo = promoChars.some(card => (config[card] || 0) > 0);
    const hasRevolution = revolutionChars.some(card => (config[card] || 0) > 0);
    const hasShadows = shadowsChars.some(card => (config[card] || 0) > 0);

    // 1. Carta Base (Alternativa se houver Revolução)
    if (hasRevolution) {
      images.push('img/front-actions-alternative.png');
    } else {
      images.push('img/front-actions.png');
    }

    // 2. Adiciona as cartas de regras das DLCs detectadas
    if (hasPromo) images.push('img/dlc-actions.png');
    if (hasRevolution) images.push('img/dlc2-actions.png');
    if (hasShadows) images.push('img/dlc3-actions.png'); // Nova carta de regras

    // 3. Verso das cartas de ajuda
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


  checkTutorial();
}



// =======================================================
// === INICIALIZAÇÃO E EVENTOS DE HEADER ===
// =======================================================

/**
 * CONFIGURAÇÃO DO EXIBIDOR DE CÓDIGO DA SALA
 * Define o texto do código da sala no cabeçalho e gerencia a funcionalidade 
 * de copiar para a área de transferência ao clicar.
 */
const roomHeader = document.getElementById('roomHeader');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');

// Define o código da sala se o elemento e a variável existirem
if (roomCodeDisplay && typeof roomCode !== 'undefined' && roomCode) {
  roomCodeDisplay.textContent = roomCode;
}

// Configura o evento de clique para copiar o código da sala
if (roomHeader) {
  roomHeader.onclick = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      playSound('pop'); // Som de confirmação
      roomHeader.classList.add('copied');

      const originalText = roomHeader.querySelector('p').textContent;
      roomHeader.querySelector('p').textContent = "CÓDIGO COPIADO!";

      // Reseta o estado visual do botão após 1.2 segundos
      setTimeout(() => {
        roomHeader.classList.remove('copied');
        roomHeader.querySelector('p').textContent = originalText;
      }, 1200);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      // Fallback em caso de falha na API de clipboard
      alert("Código da sala: " + roomCode);
    });
  };
}

// =======================================================
// === SISTEMA DE VISIBILIDADE DE RELIGIÃO ===
// =======================================================

const toggleReligionBtn = document.getElementById('toggleReligionBtn');

/**
 * APLICA A VISIBILIDADE DA RELIGIÃO
 * Controla as classes do body, textos do botão e ícones para ocultar ou 
 * mostrar as afiliações religiosas (Católico/Protestante) no tabuleiro.
 */
const applyReligionVisibility = (shouldHide) => {
  const body = document.body;

  if (toggleReligionBtn) {
    const img = toggleReligionBtn.querySelector('img');
    const span = toggleReligionBtn.querySelector('span');

    if (shouldHide) {
      // Estado OCULTO
      body.classList.add('hide-religion');
      if (span) span.textContent = "Oculto";
      toggleReligionBtn.style.opacity = '0.6';
      if (img) img.src = 'img/visibility_off.svg';
    } else {
      // Estado VISÍVEL
      body.classList.remove('hide-religion');
      if (span) span.textContent = "Visível";
      toggleReligionBtn.style.opacity = '1';
      if (img) img.src = 'img/eye.svg';
    }
  } else {
    // Fallback caso o botão não exista mas a configuração precise ser aplicada
    if (shouldHide) body.classList.add('hide-religion');
    else body.classList.remove('hide-religion');
  }

  // Persiste a preferência do usuário localmente
  localStorage.setItem('hideReligion', shouldHide);
};

/**
 * INICIALIZAÇÃO E LISTENER DE VISIBILIDADE
 * Carrega a preferência salva no navegador e configura o botão de alternância.
 */
if (toggleReligionBtn) {
  // Busca valor salvo ou define como 'true' (oculto) por padrão
  const storedValue = localStorage.getItem('hideReligion');
  const storedReligionSetting = storedValue === null ? true : (storedValue === 'true');

  applyReligionVisibility(storedReligionSetting);

  // Alterna o estado ao clicar no botão
  toggleReligionBtn.onclick = () => {
    playSound('click');
    const isCurrentlyHidden = document.body.classList.contains('hide-religion');
    applyReligionVisibility(!isCurrentlyHidden);
  };
}