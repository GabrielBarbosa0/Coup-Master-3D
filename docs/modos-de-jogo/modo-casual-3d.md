# Coup Master 3D - Modo Casual

O **Modo Casual 3D** e o modo principal atual do Coup Master 3D. Ele representa a mesa sandbox manual: os jogadores controlam a partida socialmente, enquanto o sistema oferece mesa 3D, baralho, cartas, pilhas, moedas, chat, espectador, audio, HUD e sincronizacao casual.

## Objetivo

Reproduzir uma mesa fisica confortavel para jogar Coup com amigos, sem automatizar todas as regras.

Os jogadores continuam responsaveis por declarar acoes, contestar, bloquear, revelar influencias, combinar variantes e corrigir a mesa quando necessario.

## Entrada

- Login Google ou visitante.
- Lobby em `lobby.html`.
- Criacao ou entrada em sala por codigo curto.
- Abertura direta em `index.html?room=CODIGO`.

## Jogadores

- Ate 8 assentos.
- O criador da sala e o administrador permanente.
- Fechar ou minimizar a aba nao libera automaticamente o assento.
- O host pode remover jogadores e liberar assentos.

## Estado

O estado compartilhado vive em `rooms/{roomCode}`.

Principais caminhos:

- `players`: jogadores, assentos e presenca informativa.
- `seats`: reserva de assentos.
- `tableState`: snapshot final da mesa.
- `tableActions`: eventos discretos para animacoes previsiveis.
- `chatMessages`: chat da sala.
- `spectatorRequests`: pedidos de espectador.

## Regras De Mesa

- O baralho e configuravel pelo host.
- Cartas fechadas podem voltar ao baralho.
- Cartas abertas nao voltam automaticamente ao baralho.
- Pilhas fechadas podem voltar ao baralho.
- Pilhas abertas permanecem na mesa.
- Pilhas compativeis podem se agrupar.
- O drag livre publica estado final, nao posicoes frame a frame.

## Limites Atuais

- Nao gera ranking.
- Nao valida regras competitivas.
- Nao possui motor obrigatorio de turnos.
- Nao deve ser tratado como modo antifraude.

## Proximos Passos

- Refinar touch/mobile.
- Melhorar estabilidade fisica em casos extremos.
- Criar historico/logs de mesa.
- Expandir acoes discretas sincronizadas.
- Preparar tutorial inicial de controles.
