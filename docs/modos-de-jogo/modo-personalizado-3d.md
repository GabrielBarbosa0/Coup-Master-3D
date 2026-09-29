# Coup Master 3D - Modo Personalizado

O **Modo Personalizado 3D** e um modo planejado para mesas automatizadas com amigos, sem gerar pontuacao ranqueada.

## Objetivo

Permitir uma sala com regras mais controladas que o casual, mas menos competitiva que o ranqueado.

Ele deve servir para jogar com amigos, testar bots, ajustar configuracoes e usar automacao parcial sem comprometer estatisticas competitivas.

## Diferenca Para Outros Modos

- Mais guiado que o casual.
- Menos competitivo que o ranqueado.
- Pode permitir host e configuracoes.
- Nao deve alterar ranking, conquistas ranqueadas ou estatisticas competitivas.

## Entrada Planejada

- Preferencialmente exigir conta Google.
- Criacao pelo lobby.
- Sala com codigo curto.
- Suporte a amigos e bots.

## Estado Planejado

Estado separado:

- `personalized3dState` para a partida.
- `players` e `seats` podem reaproveitar a base de sala.
- Configuracoes devem ficar isoladas do estado casual.

## Recursos Planejados

- Configuracao de bots.
- Presets de baralho.
- Variantes ativaveis.
- Automacao opcional de turnos e resolucoes.
- Ferramentas de host.

## Condicoes Antes De Implementar

- Catalogo unico de cartas.
- Presets compartilhados de baralho.
- Motor de regras reaproveitavel.
- Contrato claro para bots e host.
