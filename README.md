# Coup Master

![Status](https://img.shields.io/badge/Status-MVP_em_desenvolvimento-blue)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black)
![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Realtime_Database-orange)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222222)
![License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <img src="./marketing/banners/banner-coup-master.png" alt="Banner do Coup Master" width="100%">
</p>

## Sobre O Projeto

Coup Master é um jogo de cartas online para navegador. A interface usa Three.js/WebGL para renderizar um tabuleiro
2.5D com oito jogadores, deck, asilo, cemitério e cartas responsivas.

A apresentação atual abandona a antiga simulação física de mesa e adota uma direção inspirada em jogos de cartas
estilizados:

- câmera ortográfica fixa;
- hover com perspectiva;
- cartas com elevação, outline, flip e giro;
- arraste compatível com mouse, toque e caneta;
- layouts próprios para paisagem e retrato;
- tipografia pixelada e botões elevados;
- estado lógico independente da cena.

Jogue em: [https://gabrielbarbosa0.github.io/Coup-Master-3D](https://gabrielbarbosa0.github.io/Coup-Master-3D)

## Estado Atual

| Área | Implementação |
| --- | --- |
| Login | Google ou visitante anônimo |
| Menu | Jogar, Opções, Voltar, Coleções e idioma |
| Salas | Código curto de quatro caracteres |
| Tabuleiro | Three.js 2.5D com oito slots |
| Interação | Pointer Events |
| Online | Firebase Auth + Realtime Database |
| Sincronização | Snapshots finais transacionais |
| Instalação | PWA standalone |

Movimentos de drag não são transmitidos frame a frame. O estado final é publicado quando a carta chega a um slot,
ao cemitério ou ao deck.

## Funcionalidades

### Tabuleiro

- quatro slots superiores e quatro inferiores no desktop;
- duas colunas e quatro fileiras em telas verticais;
- avatar, nome, assento, moedas e religião em cada slot;
- jogador local destacado;
- asilo com contador compartilhado;
- cemitério público;
- deck com contador.

### Cartas

- frente e verso texturizados;
- cantos arredondados;
- hover com tilt baseado na posição do ponteiro;
- seleção e outline;
- arraste entre slots e cemitério;
- flip e giro;
- compra transacional;
- distribuição inicial;
- privacidade das mãos;
- autorização de espectador.

### Interface

- menu e login no mesmo estilo visual;
- HUD compacto;
- chat e mensagens rápidas;
- música e efeitos;
- regras de personagens;
- regras alternativas;
- configuração de baralho pelo host;
- remoção de jogadores;
- tela cheia;
- feedback.

## Controles

| Ação | Controle |
| --- | --- |
| Comprar | Clique no deck ou botão Comprar |
| Arrastar | Pressionar e mover a carta |
| Selecionar | Clique |
| Virar | `F` ou botão de flip |
| Girar | `Q` / `E` ou botões |
| Remover | `Delete` / `Backspace` ou botão |
| Chat | `C` ou botão |
| Moedas | `-` e `+` no slot |
| Religião | Clique no emblema |

## Arquitetura

```txt
login.html
    |
    v
lobby.html
    |
    v
index.html
    |
    v
js/three/boot.js
    |-- valida autenticação e sala
    |-- reserva assento
    |-- conecta Firebase
    `-- importa app.js
            |
            v
js/three/app.js
    |-- câmera ortográfica
    |-- tabuleiro e cartas WebGL
    |-- Pointer Events
    |-- animações
    |-- HUD e modais
    `-- serialização do estado
            |
            v
Firebase Realtime Database
```

O contrato público da partida fica em `window.CoupMaster3D`. Firebase permanece isolado em `js/firebase/`.

## Estrutura

```txt
Coup-Master-3D/
|-- index.html
|-- login.html
|-- lobby.html
|-- manifest.webmanifest
|-- service-worker.js
|-- css/
|   |-- online.css
|   `-- three-board.css
|-- js/
|   |-- pwa.js
|   |-- firebase/
|   `-- three/
|       |-- app.js
|       |-- boot.js
|       |-- config.js
|       `-- dom.js
|-- assets/
|   |-- fonts/
|   |-- img/
|   |-- sounds/
|   `-- video/
`-- docs/
    |-- GDD.md
    `-- TDD.md
```

## Execução Local

```powershell
git clone https://github.com/GabrielBarbosa0/Coup-Master-3D.git
cd Coup-Master-3D
python -m http.server 4173
```

Abra:

```txt
http://127.0.0.1:4173/login.html
```

## Firebase

Configure o app Web em:

```txt
js/firebase/firebase-config.js
```

Ative:

- Google Authentication;
- Anonymous Authentication;
- Realtime Database;
- domínios autorizados para produção e desenvolvimento.

As regras de referência ficam em `js/firebase/firebase-rules.json`.

## PWA

O manifesto inicia no login e usa `display: standalone`. O service worker aplica:

- network-first para navegação;
- stale-while-revalidate para assets locais.

Ao mudar arquivos precacheados, incremente `CACHE_VERSION` em `service-worker.js`.

## Verificação

```powershell
node --check js\three\app.js
node --check js\three\boot.js
node --check js\three\config.js
node --check js\three\dom.js
node --check service-worker.js
```

Mudanças visuais devem ser testadas em desktop, celular horizontal e celular vertical.

## Roadmap

### Em andamento

- refinar slots ocupados e vazios;
- melhorar feedback de áreas de soltura;
- expandir animações de turno;
- modularizar o runtime;
- adicionar testes de estado;
- atualizar o preview oficial.

### Futuro

- logs e histórico avançado;
- conquistas;
- ranking;
- matchmaking;
- inventário;
- loja;
- backend autoritativo para modos competitivos.

## Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).
