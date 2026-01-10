# Coup Master - Multiplayer Online v0.2.1

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow) ![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Database-orange)

Uma versão web, multiplayer e **sandbox** do famoso jogo de tabuleiro "Coup" (incluindo a expansão "A Reforma").

Diferente de versões automatizadas, o **Coup Master** foca na liberdade: os jogadores aplicam as regras, movem moedas e trocam cartas manualmente, simulando a experiência real de uma mesa de jogo, mas com a conveniência da sincronização online e organização de salas.
https://gabrielbarbosa0.github.io/Coup-Master

![Interface do Lobby](img/image_47cdfb.png)
*(Tela de Login e Lobby)*

---

## ✨ Novas Funcionalidades (v0.2.0)

### 🔐 Autenticação e Identidade
* **Login com Google:** Integração segura via Firebase Authentication.
* **Perfis Reais:** O jogo exibe automaticamente o Nome e a Foto do perfil Google do jogador na mesa.
* **Segurança de Slot:** Se você cair (internet/F5), seu lugar fica reservado pelo seu ID único (UID). Ninguém pode roubar sua cadeira enquanto você reconecta.

### 🏠 Sistema de Salas (Lobby)
* **Salas Privadas:** Crie salas com códigos únicos de 4 dígitos (ex: `XJ94`).
* **Convite Fácil:** Clique no código da sala no topo da tela para copiá-lo automaticamente e enviar aos amigos.
* **Capacidade Expandida:** Suporte para até **10 Jogadores** simultâneos.

### 📱 Experiência Mobile (Modo Compacto)
* **Layout Responsivo:** O jogo detecta dispositivos móveis automaticamente.
* **Modo Compacto:** Uma opção nas configurações que reduz a escala de cartas, avatares e textos em 50% e organiza a mesa em 2 colunas. Isso permite visualizar 10 jogadores na tela do celular sem rolagem excessiva.

### ⚙️ Funcionalidades de Jogo
* **Sandbox Total:** Adicione/remova moedas, mude de religião (Católico/Protestante) e gerencie o Asilo manualmente.
* **Deck Configurável:** O Host (Jogador 1) pode configurar a quantidade exata de cada personagem no baralho.
* **Feedback Visual/Sonoro:** Sons para ações (moedas, cartas) e animações de feedback.

---

## 🚀 Tecnologias

* **Frontend:** HTML5, CSS3 (Flexbox/Grid), JavaScript Puro (Vanilla JS).
* **Backend (Serverless):** Firebase Realtime Database.
* **Auth:** Firebase Authentication (Google Provider).

---

## 🛠️ Instalação e Configuração

Este projeto requer configuração do Firebase para funcionar (especialmente o Login).

### 1. Clone o Projeto

```bash
git clone [https://github.com/seu-usuario/coup-master.git](https://github.com/seu-usuario/coup-master.git)
```

### 2. Crie o Projeto no Firebase
1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Crie um novo projeto.
3. Adicione um **App Web** (`</>`) e copie as credenciais (`firebaseConfig`).

### 3. Configure a Autenticação (IMPORTANTE)
Para o login funcionar, você precisa ativar o Google e autorizar seu domínio:

1. No console do Firebase, vá em **Criação (Build) > Authentication**.
2. Na aba **Sign-in method**, ative o provedor **Google**.
3. Na aba **Settings (Configurações)**, vá em **Authorized domains** (Domínios autorizados).
4. Adicione o domínio do seu site (ex: `seunome.github.io`) e também `127.0.0.1` (para testes locais).

### 4. Configure o Banco de Dados
1. Vá em **Realtime Database** e crie o banco.
2. Na aba **Regras**, defina como público (para teste) ou configure regras de segurança:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### 5. Atualize o Código
Abra os arquivos index.html e lobby.html. Procure pela constante firebaseConfig e substitua pelos seus dados:

JavaScript

const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "[https://seu-projeto-default-rtdb.firebaseio.com](https://seu-projeto-default-rtdb.firebaseio.com)",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};


## 🎮 Como Jogar

1. **Login:** Acesse o site e faça login com sua conta Google.
2. **Lobby:**
   * Clique em **"Criar Nova Sala"** para ser o Host.
   * Ou digite o código que seu amigo mandou e clique em **"Entrar na Sala"**.
3. **Na Mesa:**
   * **Host:** Vá nas configurações (⚙️) -> "Configurar Baralho" -> Defina as cartas -> "Aplicar e Resetar".
   * **Jogadores:** Cliquem no Deck para comprar cartas.
   * Usem os botões **+** e **-** para gerenciar moedas e vidas.
   * Arraste cartas para o "Cemitério" quando perder uma vida.

---

## 📄 Licença

Este projeto é de código aberto sob a licença [MIT](LICENSE). Sinta-se livre para contribuir!
