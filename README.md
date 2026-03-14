# Coup Master - Multiplayer Online Beta v0.4

![Status](https://img.shields.io/badge/Status-Beta_v0.4-blue) ![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Database-orange)

## 📖 Sobre o Projeto

**Coup Master** é um jogo multiplayer **sandbox** inspirado em jogos de blefe e estratégia política. 
Diferente de versões automatizadas, o foco aqui é reproduzir a experiência manual de uma mesa real, 
onde os próprios jogadores gerenciam ações, moedas e interações.

O sistema é sincronizado em tempo real via Firebase Realtime Database, utilizando uma arquitetura modular orientada a eventos,
com foco em escalabilidade e consistência de estado.


🔗 **Jogue agora:** [https://gabrielbarbosa0.github.io/Coup-Master](https://gabrielbarbosa0.github.io/Coup-Master)

---

## 🖼️ Preview

  <img src="./docs/game-preview.gif" width="800">

---

## 🧪 Demo Técnica

- Ambiente: Produção (GitHub Pages)
- Banco de Dados: Firebase Realtime Database
- Autenticação: Google OAuth 2.0
- Sincronização: Event-driven via listeners em tempo real

---


## ✨ Novidades da Versão Beta (v0.4)

### 🧹 Manutenção e Autodestruição de Salas
* **Limpeza Automática:** Implementação de um sistema de varredura que deleta automaticamente salas sem atividade por mais de 24 horas.
* **Registro de Atividade:** Cada ação realizada na mesa — como mover cartas, alterar moedas ou mudar religião — agora atualiza o carimbo de tempo (`lastActivity`) da sala.
* **Otimização de Banco de Dados:** A rotina de limpeza é executada de forma silenciosa sempre que um novo jogador acessa o lobby, garantindo que o Realtime Database permaneça leve e organizado.

### 🛠️ Estabilidade e Persistência
* **Sincronização de Estado:** Melhoria nos gatilhos de atualização para garantir que o status da sala reflita sempre a última interação válida de forma consistente.
* **Segurança de Remoção:** Configuração de novas regras no Firebase para permitir a exclusão segura de nós de salas órfãs por usuários autenticados.

---

## ✨ Novidades da Versão Beta (v0.3)

### 👻 Modo Espectador Fantasma
* **Visão de Jogo:** Jogadores eliminados (0 cartas) agora podem solicitar permissão para assistir a mão de outros jogadores ativos.
* **Sistema de Convites:** Envio de notificações em tempo real para o alvo, que pode aceitar ou negar ser espectado.
* **Feedback Visual:** Jogadores sendo assistidos recebem um brilho azul sutil em seus avatares.
* **Mecânica Híbrida:** O modo espectador é visual e não bloqueia ações técnicas, garantindo que o fluxo da mesa sandbox nunca trave.

### ⛪ Identidade Visual de Religiões
* **Ícones Dinâmicos:** Adição de escudos personalizados (`shield-cross` e `shield-sword`) ao lado do status de religião.
* **Cores Suavizadas:** Paleta de cores atualizada para as facções Católica e Protestante, facilitando a identificação rápida na mesa.
* **Filtros Adaptativos:** Ícones em formato SVG com tratamento visual branco para máxima legibilidade em temas escuros.

### ⚙️ Melhorias na Interface (UI)
* **Novo Menu de Controles:** Ícones reorganizados para facilitar o acesso às Regras Alternativas, Música, Configurações e Modo Espectador.
* **Modais Elegantes:** Substituição de prompts nativos por janelas modais personalizadas para seleção de jogadores e configuração de baralho.

---

## 🚀 Funcionalidades Principais

* **Sandbox Total:** Gestão manual de moedas, vidas, trocas de cartas e o prêmio do Asilo.
* **Login com Google:** Identificação automática com Nome e Foto via Firebase Auth.
* **Persistência de Slot:** Reconexão inteligente que reserva seu lugar na mesa através do seu UID único.
* **Deck Configurável:** O Host possui controle total sobre a quantidade de cada personagem (incluindo cartas de DLC's).
* **Suporte para 10 Jogadores:** Layout otimizado para partidas grandes, inclusive em dispositivos móveis.
* **Modo Espectador Fantasma:** Permite que jogadores com zero cartas na mão solicitem visão da mão de outros jogadores ativos.
* **Sistema de Notificações em Tempo Real:** Mecânica de "aceitar ou negar" para solicitações de espectador e alertas de interação.
* **Identidade Religiosa Visual:** Exibição de ícones de escudo (`shield-cross.svg` e `shield-sword.svg`) e cores dinâmicas para as facções Católica e Protestante.
* **Feedback Visual de Espectador:** Destaque com brilho azul suave e borda no avatar do jogador que está sendo assistido.
* **Interface Responsiva e Adaptável:** Ocultação automática do botão de espectador para jogadores que possuem cartas na mão.
* **Sistema de Salas Privadas:** Criação e entrada em salas via códigos únicos de 4 dígitos com função de cópia rápida no cabeçalho.
* **Controle de Áudio Integrado:** Música de fundo e efeitos sonoros sincronizados para ações como compra de cartas, moedas e impacto.
* **Gestão de Bots:** Capacidade de adicionar bots para testes de mesa.
* **Modais de Referência Rápida:** Visualização de guias de ações de personagens e regras alternativas através de cartas que giram (flip cards).

---

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript (ES Modules)
- **Arquitetura:** Modular com separação de responsabilidades
- **Backend (BaaS):** Firebase Realtime Database
- **Autenticação:** Firebase Authentication (Google Provider)
- **Hospedagem:** GitHub Pages

---

## 🎮 Como Jogar

1. **Acesso:** Faça login com sua conta Google no Lobby.
2. **Salas:** Crie uma nova sala como Host ou entre em uma existente usando o código de 4 dígitos.
3. **Mesa:**
   * **Host:** Configure o baralho no menu de engrenagem (⚙️) antes de iniciar.
   * **Ações:** Clique no Deck para comprar, arraste cartas para o Cemitério ou clique nos botões de moedas para atualizar seu saldo.
   * **Eliminação:** Se ficar sem cartas, clique no ícone do **Fantasma** para começar a espectar seus amigos.

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura modular com separação clara de responsabilidades:

- **firebase.js** → Inicialização e infraestrutura (Auth + Database)
- **rules.js** → Constantes e manipulação estrutural do baralho
- **gameState.js** → Gerenciamento de estado e transações Firebase
- **ui.js** → Renderização da interface e interações
- **lobby.js** → Autenticação e gerenciamento de salas

Essa divisão garante escalabilidade, manutenibilidade e separação entre lógica de domínio e camada de apresentação.

O projeto segue princípios de:
- Separação de responsabilidades (SRP)
- Modularização por domínio
- Controle de estado centralizado
- Arquitetura baseada em eventos (listeners do Firebase)

---

## 🛠️ Instalação e Configuração

### 2️⃣ Crie o Projeto no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em **Criar Projeto**
3. Adicione um **App Web (</>)**
4. Copie as credenciais do objeto `firebaseConfig`

---

### 3️⃣ Configure a Autenticação (Obrigatório)

Para que o login e a reserva de slots funcionem:

1. No Firebase Console, vá em **Build > Authentication**
2. Acesse a aba **Sign-in method**
3. Ative o provedor **Google**
4. Vá em **Settings > Authorized domains**
5. Adicione:
   - `seu-usuario.github.io`
   - `127.0.0.1` (para testes locais)

---

### 4️⃣ Configure o Realtime Database

1. Vá em **Build** > **Realtime Database** e crie uma instância.
2. Na aba **Regras**, utilize a configuração abaixo para permitir a manutenção automática:

```json
{
  "rules": {
    "salas": {
      // Permite listar salas para o cleanup do lobby e leitura geral
      ".read": "auth != null",
      ".write": "auth != null",
      "$roomCode": {
        // Garante que sub-itens como lastActivity e gameState sejam acessíveis
        ".write": "auth != null",
        "lastActivity": {
          // Proteção extra: só permite deletar se realmente for antigo (opcional)
          ".validate": "newData.isNumber()"
        }
      }
    }
  }
}
```

Isso garante que apenas usuários autenticados possam acessar as salas.

---

### 5️⃣ Vincule o Código ao Firebase

Atualize as credenciais no seu projeto  
(ex: `js/firebase.js`):

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

---

## 🧠 Desafios Técnicos

- Sincronização de estado em tempo real entre múltiplos jogadores
- Controle de concorrência em ações simultâneas
- Reconexão persistente via UID
- Gerenciamento de sala com slots reservados
- Renderização dinâmica com feedback visual em tempo real


## 📚 Aprendizados

Durante o desenvolvimento deste projeto, foram aplicados conceitos como:

- Sincronização de estado distribuído
- Tratamento de concorrência
- Arquitetura modular em JavaScript
- Design de sistemas multiplayer em tempo real
- Gerenciamento de autenticação e persistência com Firebase

## 🚀 Próximas Atualizações (Roadmap)

- [ ] **Custom Deck Engine:** Sistema de importação de baralhos via JSON personalizado, permitindo temas e regras totalmente customizáveis.
- [ ] **Card Previewer:** Visualização de cartas em alta definição ao clicar e segurar, facilitando a leitura de artes e habilidades.
- [ ] **Visual Stack:** Nova renderização de cartas em formato de leque ou pilha, otimizando o espaço da mesa para grandes grupos.
- [ ] **Coup Workshop:** Web app integrado para criação, edição e exportação de cartas personalizadas para a comunidade.
- [ ] **Logs de Ações:** Histórico detalhado da partida em tempo real para auditoria de jogadas e transparência no modo sandbox.
- [ ] **Estatísticas e Histórico:** Painel de perfil com registro de vitórias, derrotas e histórico de partidas passadas.
- [ ] **Ranking Competitivo:** Sistema opcional de classificação por níveis baseado no desempenho nas salas.
- [ ] **Expansões de Conteúdo:** Adição de novos sistemas de DLCs para integrar mecânicas complexas de forma modular.
- [ ] **Performance Mobile:** Otimização de renderização e controles touch para garantir fluidez em dispositivos de entrada.


---

## 📄 Licença
Este projeto é de código aberto sob a licença [MIT](LICENSE).