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
            db.ref(`salas/${newCode}/gameState`).set({
                status: 'waiting',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
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