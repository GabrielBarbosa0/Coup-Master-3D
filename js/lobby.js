// ===================================
// DOM Elements
// ===================================
const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const userPhotoImg = document.getElementById('user-photo');
const roomActionsDiv = document.getElementById('room-actions');
const roomCodeInput = document.getElementById('room-code-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');

// ===================================
// FUNÇÕES DE AUTENTICAÇÃO
// ===================================
if (loginBtn) {
    loginBtn.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            alert("Erro ao fazer login: " + error.message);
        });
    };
}

if (logoutBtn) {
    logoutBtn.onclick = () => {
        auth.signOut();
    };
}

auth.onAuthStateChanged(user => {
    if (user) {
        // Logado
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfoDiv) userInfoDiv.style.display = 'block';
        if (roomActionsDiv) roomActionsDiv.style.display = 'block';

        let safeName = user.displayName;
        if (!safeName && user.email) {
            safeName = user.email.split('@')[0];
        } else if (!safeName) {
            safeName = "Convidado";
        }

        const safePhoto = user.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

        if (userNameSpan) userNameSpan.textContent = safeName;
        if (userPhotoImg) userPhotoImg.src = safePhoto;

        sessionStorage.setItem('currentUID', user.uid);
        sessionStorage.setItem('currentName', safeName);
        sessionStorage.setItem('currentPhoto', safePhoto);

    } else {
        // Deslogado
        if (loginBtn) loginBtn.style.display = 'flex';
        if (userInfoDiv) userInfoDiv.style.display = 'none';
        if (roomActionsDiv) roomActionsDiv.style.display = 'none';

        sessionStorage.removeItem('currentUID');
        sessionStorage.removeItem('currentName');
        sessionStorage.removeItem('currentPhoto');
    }
});

// ===================================
// FUNÇÕES DE SALA
// ===================================
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

if (joinRoomBtn) {
    joinRoomBtn.onclick = () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (code.length !== 4) {
            alert("O código da sala deve ter 4 caracteres.");
            return;
        }
        db.ref(`salas/${code}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                window.location.href = `index.html?room=${code}`;
            } else {
                alert(`A sala "${code}" não existe.`);
            }
        });
    };
}

if (createRoomBtn) {
    createRoomBtn.onclick = () => {
        const newCode = generateRoomCode();
        db.ref(`salas/${newCode}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                createRoomBtn.onclick(); // Tenta de novo se colidir (raro)
                return;
            }

            // Cria o estado inicial do jogo
            const initialData = {
                gameState: {
                    status: 'waiting',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                },
                // Define a atividade inicial para evitar autodestruição precoce
                lastActivity: Date.now()
            };

            db.ref(`salas/${newCode}`).set(initialData).then(() => {
                window.location.href = `index.html?room=${newCode}`;
            }).catch(error => {
                alert("Erro ao criar sala: " + error.message);
            });
        });
    };
}

// =======================================================
// === SCRIPT DE CARREGAMENTO DE FONTES / LOADER ===
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById('font-loader');

    const hideLoader = () => {
        if (loader) loader.style.display = 'none'; // Usando display none direto por segurança
    };

    if (document.fonts) {
        document.fonts.ready.then(() => {
            console.log('Fontes carregadas!');
            hideLoader();
        });
    } else {
        setTimeout(hideLoader, 1000);
    }

    setTimeout(hideLoader, 3000);
});


// =======================================================
// === MODAL DE COMUNIDADE (TUTORIAIS E APOIO) ===
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    const communityBtn = document.getElementById('communityBtn');
    const communityModal = document.getElementById('communityModal');
    const closeCommunityBtn = document.getElementById('closeCommunityBtn');

    if (communityBtn && communityModal) {
        // Abre o modal
        communityBtn.onclick = () => {
            communityModal.style.display = 'flex';
            // Removido o display: none daqui!
        };

        // Fecha o modal pelo botão X
        if (closeCommunityBtn) {
            closeCommunityBtn.onclick = () => {
                communityModal.style.display = 'none';
                // Removido o display: block daqui!
            };
        }

        // Fecha o modal clicando fora dele
        window.addEventListener('click', (e) => {
            if (e.target === communityModal) {
                communityModal.style.display = 'none';
                // Removido o display: block daqui!
            }
        });
    }
});



/**
 * SISTEMA DE AUTODESTRUIÇÃO (Beta v0.4)
 * Varre todas as salas do banco de dados e remove aquelas
 * que não tiveram atividade nas últimas 24 horas.
 */
function cleanupOldRooms() {
    const roomsRef = db.ref('salas');

    roomsRef.once('value', (snapshot) => {
        if (!snapshot.exists()) return;

        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        snapshot.forEach((roomSnap) => {
            const data = roomSnap.val();
            // O lastActivity é atualizado pelo gameState.js em cada ação
            const lastActivity = data.lastActivity || 0;

            if (now - lastActivity > TWENTY_FOUR_HOURS) {
                console.log(`🧹 Limpeza: Removendo sala inativa ${roomSnap.key}`);
                roomSnap.ref.remove()
                    .catch(err => console.error("Erro ao deletar sala:", err));
            }
        });
    });
}

// Executa a limpeza sempre que alguém abrir o Lobby
cleanupOldRooms();