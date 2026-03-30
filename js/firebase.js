// =======================================================
// === FIREBASE CONFIGURATION & INITIALIZATION ===
// =======================================================

/**
 * NOTA DE SEGURANÇA: As chaves do Firebase para Web são identificadores públicos.
 * A segurança deste projeto é garantida via Firebase Security Rules (RTDB),
 * impedindo acessos não autorizados mesmo com a chave exposta.
 */

(function() {
    // Ofuscação de strings via Base64 para evitar leitura direta por humanos
    const _0x4f22 = (s) => atob(s);

    const firebaseConfig = {
        apiKey: _0x4f22("QUl6YVN5RFF3aFllTEV2Slc0cDlNbDRwS2ptcjUyMENlS25aYTYw"),
        authDomain: _0x4f22("Y291cC1tYXN0ZXIuZmlyZWJhc2VhcHAuY29t"),
        databaseURL: _0x4f22("aHR0cHM6Ly9jb3VwLW1hc3Rlci1kZWZhdWx0LXJ0ZGIuZmlyZWJhc2Vpby5jb20="),
        projectId: _0x4f22("Y291cC1tYXN0ZXI="),
        storageBucket: _0x4f22("Y291cC1tYXN0ZXIuZmlyZWJhc2VzdG9yYWdlLmFwcA=="),
        messagingSenderId: _0x4f22("ODc2MTE3MTEwNjIz"),
        appId: _0x4f22("MTo4NzYxMTcxMTA2MjM6d2ViOmI5NTdhMTQ4Zjk1NmBhNTFiNTUwZWE="),
        measurementId: _0x4f22("Ry0yQlFSNjVRUDJa")
    };

    // 1. Inicializa o Firebase apenas se não tiver sido inicializado ainda
    if (!firebase.apps.length) {
        if (!firebaseConfig.apiKey) {
            console.error("Firebase config is missing!");
            alert("Erro: configuração do Firebase ausente.");
        } else {
            firebase.initializeApp(firebaseConfig);
        }
    }

    // 2. Disponibiliza o Banco de Dados e a Autenticação globalmente
    window.db = firebase.database();
    window.auth = firebase.auth();

    console.log("🔥 Firebase inicializado com sucesso via firebase.js");
})();