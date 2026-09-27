import { getAlternativeRuleEffects } from './alternative-rules-service.js';

const CARD_META = {
  duque: { folder: 'base', color: '#ff66c4', pt: 'Duque', en: 'Duke' },
  capitao: { folder: 'base', color: '#075dc3', pt: 'Capitão', en: 'Captain' },
  assassino: { folder: 'base', color: '#626262', pt: 'Assassino', en: 'Assassin' },
  condessa: { folder: 'base', color: '#11a7b9', pt: 'Condessa', en: 'Contessa' },
  embaixador: { folder: 'base', color: '#0dbf70', pt: 'Embaixador', en: 'Ambassador' },
  inquisidor: { folder: 'base', color: '#ff5757', pt: 'Inquisidor', en: 'Inquisitor' },
  bufao: { folder: 'promo', color: '#0dbf70', pt: 'Bufão', en: 'Jester' },
  burocrata: { folder: 'promo', color: '#ff66c4', pt: 'Burocrata', en: 'Bureaucrat' },
  benfeitor: { folder: 'promo', color: '#0dbf70', pt: 'Benfeitor', en: 'Benefactor' },
  burgues: { folder: 'promo', color: '#ff66c4', pt: 'Burguês', en: 'Bourgeois' },
  marionetista: { folder: 'dlc1', color: '#b947ff', pt: 'Marionetista', en: 'Puppeteer' },
  diplomata: { folder: 'dlc1', color: '#1a77d2', pt: 'Diplomata', en: 'Diplomat' },
  mercenario: { folder: 'dlc1', color: '#e1272f', pt: 'Mercenário', en: 'Mercenary' },
  bispo: { folder: 'dlc1', color: '#c7212f', pt: 'Bispo', en: 'Bishop' },
  tesoureiro: { folder: 'dlc1', color: '#d99a16', pt: 'Tesoureiro', en: 'Treasurer' },
  vigilante: { folder: 'dlc1', color: '#ff0054', pt: 'Vigilante', en: 'Vigilante' },
  pistoleiro: { folder: 'dlc2', color: '#e1272f', pt: 'Pistoleiro', en: 'Gunslinger' },
  magnata: { folder: 'dlc2', color: '#ff9900', pt: 'Magnata', en: 'Tycoon' },
  estrategista: { folder: 'dlc2', color: '#27aee4', pt: 'Estrategista', en: 'Strategist' },
  ladrao: { folder: 'dlc2', color: '#2a6b48', pt: 'Ladrão', en: 'Thief' },
  vigarista: { folder: 'dlc2', color: '#f17a21', pt: 'Vigarista', en: 'Swindler' },
  xerife: { folder: 'dlc2', color: '#075dc3', pt: 'Xerife', en: 'Sheriff' }
};

const CARD_GROUPS = {
  base: ['duque', 'capitao', 'assassino', 'condessa', 'embaixador', 'inquisidor'],
  promo: ['bufao', 'benfeitor', 'burgues', 'burocrata'],
  revolution: ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro', 'vigilante'],
  shadows: ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife']
};

const DEFAULT_DECK_CONFIG = Object.fromEntries(
  Object.values(CARD_GROUPS)
    .flat()
    .map(cardType => [cardType, CARD_GROUPS.base.includes(cardType) ? 5 : 0])
);

const ABILITY_LABELS = [
  'Taxar', 'Extorquir', 'Assassinar', 'Persuasão', 'Trocar', 'Investigar',
  'Desordem', 'Cooperação', 'Redistribuição', 'Dividendos', 'Puxar Fios',
  'Negociar', 'Interceder', 'Execução Bruta', 'Expurgar', 'Tributação',
  'Vingança', 'Cabeça a Prêmio', 'Suborno', 'Manobra', 'Roubo',
  'Fortuna Arriscada', 'Procurado', 'Renda', 'Ajuda Externa',
  'Golpe de Estado', 'Ação de um Personagem', 'Contestação',
  'Tax', 'Steal', 'Assassinate', 'Persuasion', 'Exchange', 'Investigate',
  'Disorder', 'Cooperation', 'Redistribution', 'Dividends', 'Pull Strings',
  'Negotiate', 'Intercede', 'Brutal Execution', 'Purge', 'Taxation',
  'Revenge', 'Bounty', 'Bribe', 'Maneuver', 'Robbery', 'Risky Fortune',
  'Wanted', 'Income', 'Foreign Aid', 'Coup', 'Character Action', 'Challenge'
];

const GUIDE_COPY = {
  pt: {
    titles: {
      characters: 'Ações de Personagens',
      backActions: 'Resumo de Turno',
      promo: 'Sombras do Palácio',
      revolution: 'A Revolução',
      dlc2: 'Lei e Desordem'
    },
    actions: {
      duke: (taxationBlock) => taxationBlock
        ? 'Taxar: Pegue 3 moedas do tesouro central. Bloqueia Tributação do Tesoureiro contra si.'
        : 'Taxar: Pegue 3 moedas do tesouro central. Não pode ser bloqueado.',
      captain: (blockers) => `Extorquir: Pegue 2 moedas de um oponente. ${blockers ? `Pode ser bloqueado pelo ${blockers}.` : 'Sem bloqueios ativos neste baralho.'}`,
      assassin: (blockers) => `Assassinar: Pague 3 moedas. Escolha um oponente que perderá uma influência. ${blockers ? `Pode ser bloqueado ${blockers}.` : 'Sem bloqueios ativos neste baralho.'}`,
      contessa: 'Persuasão: Bloqueia qualquer Assassinato direcionado a você. Não pode ser bloqueado.',
      ambassador: (expandedRules) => expandedRules
        ? 'Trocar: Pegue 2 cartas e em seguida devolva 2 cartas para o baralho. Bloqueia Extorsão direcionada a você.'
        : 'Trocar: Pegue 2 cartas e em seguida devolva 2 cartas ao baralho. Não pode ser bloqueado. Bloqueia Extorsão direcionada a você.',
      inquisitor: (bishop) => bishop
        ? 'Trocar: Compre 1 carta e em seguida devolva 1 carta para o baralho. Investigar: Escolha um jogador; olhe uma de suas cartas. Force, ou não a troca. Pode ser bloqueado pelo Bispo. Bloqueia Extorsão direcionada a você.'
        : 'Trocar: Compre 1 carta e em seguida devolva 1 carta para o baralho. Não pode ser bloqueado. Investigar: Escolha um jogador; olhe uma de suas cartas. Force, ou não a troca. Não pode ser bloqueado. Bloqueia Extorsão direcionada a você.',
      foreignAid: (blockers) => `Ajuda Externa: Pegue 2 moedas do Tesouro Central. ${blockers ? `Pode ser bloqueada pelo ${blockers}.` : 'Nenhuma carta ativa bloqueia esta ação.'}`,
      coup: (cost) => `Golpe de Estado: Pague ${cost} moedas e escolha um oponente; ele perderá uma de suas influências. Não pode ser bloqueado ou contestado.`,
      income: 'Renda: Pegue 1 moeda do Tesouro Central. Não pode ser bloqueado ou contestado.',
      turnIntro: 'No seu turno você deve realizar uma das seguintes ações.',
      characterAction: 'Ação de um Personagem: Declare um personagem. Você pode dizer a verdade ou blefar.',
      coinPressure: (coins) => `Se você possuir ${coins}+ moedas,\ndeverá dar um Golpe de Estado.`,
      bufao: 'Desordem: Pegue 1 carta do Baralho e 1 carta de um adversário (escolhida por ele). Escolha uma delas para trocar por uma de suas influências e devolva a outra ao seu local de origem. Pode bloquear Extorsão e Desordem. Ao bloquear Desordem, sua influência não é tomada, mas o jogador ativo ainda pega 1 carta do Baralho e pode realizar a troca normalmente.',
      burocrata: 'Cooperação: Pegue 3 moedas do Tesouro Central e entregue 1 moeda para um adversário. Pode bloquear Ajuda Externa.',
      benfeitor: 'Redistribuição: Pegue 3 moedas do jogador com mais moedas e entregue-as ao jogador com menos moedas. Em caso de empate, o jogador ativo escolhe o alvo. Qualquer jogador que declarar Benfeitor pode bloquear a Redistribuição, impedindo que qualquer moeda seja redistribuída.',
      burgues: 'Dividendos: Pegue 4 moedas. Outros jogadores podem declarar que possuem um Burguês. Após a resolução das contestações, o jogador ativo paga 1 moeda para cada declarante que não foi contestado com sucesso.',
      marionetista: 'Puxar Fios: Pague 3 moedas e escolha um jogador; você decide a próxima ação dele, exceto Golpe de Estado. O efeito termina após essa ação ou se o Marionetista morrer.',
      diplomata: 'Negociar: Pague 2 moedas, escolha dois jogadores (incluindo você, se desejar). Até seu próximo turno, eles não podem usar ações ofensivas um contra o outro. Não pode ser bloqueado. Interceder: Bloqueia Execução Bruta contra si.',
      mercenario: 'Execução Bruta: Pague 5 moedas para eliminar qualquer carta. Pode ser bloqueado pelo Diplomata.',
      bispo: 'Expurgar: Pague 2 moedas e escolha um jogador. Ele deve revelar uma influência e colocá-la permanentemente no cemitério. Em seguida, compra uma nova carta do baralho. Bloqueia ações do Inquisidor contra si.',
      tesoureiro: 'Tributação: Ganhe 2 moedas; todos os outros jogadores pagam 1 moeda ao banco. Pode ser bloqueado pelo Duque.',
      vigilante: 'Vingança: Escolha um jogador que tenha usado uma ação ofensiva contra você desde seu último turno. Ele deve lhe pagar 2 moedas. Se não puder, revela uma de suas influências e permanece com ela revelada no cemitério até que seja trocada.',
      pistoleiro: 'Cabeça a Prêmio: Pague 2 moedas e escolha um alvo. Outro jogador pode pagar 2 moedas para fazer o alvo perder 1 influência. Pode ser bloqueado pelo Xerife.',
      magnata: 'Suborno: Troque uma de suas cartas com o baralho. Você pode pagar X moedas para comprar X cartas extras, escolha uma e devolva o restante ao baralho.',
      estrategista: 'Manobra: Receba 1 moeda. Escolha e olhe uma carta de outro jogador. Você pode trocá-la por uma de suas cartas.',
      ladrao: 'Roubo: Pegue 1 moeda de cada jogador. Outros Ladrões bloqueiam o roubo contra si.',
      vigarista: 'Fortuna Arriscada: Dobre suas moedas (máx. 5). Se for contestado e perder, entregue todas as suas moedas ao desafiante.',
      xerife: 'Procurado: Pague 1 moeda e escolha um jogador. Até seu próximo turno, habilidades ofensivas usadas por ele que custem moedas custam 2 moedas adicionais. Bloqueia Cabeça a Prêmio contra qualquer jogador incluindo você.'
    }
  },
  en: {
    titles: {
      characters: 'Character Actions',
      backActions: 'Turn Summary',
      promo: 'Palace Shadows',
      revolution: 'The Revolution',
      dlc2: 'Law and Disorder'
    },
    actions: {
      duke: (taxationBlock) => taxationBlock
        ? "Tax: Take 3 coins from the central treasury. Blocks the Treasurer's Taxation against yourself."
        : 'Tax: Take 3 coins from the central treasury. Cannot be blocked.',
      captain: (blockers) => `Steal: Take 2 coins from an opponent. ${blockers ? `Can be blocked by ${blockers}.` : 'No active blockers in this deck.'}`,
      assassin: (blockers) => `Assassinate: Pay 3 coins. Choose an opponent who will lose one influence. ${blockers ? `Can be blocked by ${blockers}.` : 'No active blockers in this deck.'}`,
      contessa: 'Persuasion: Blocks any Assassination targeting you. Cannot be blocked.',
      ambassador: (expandedRules) => expandedRules
        ? 'Exchange: Draw 2 cards and then return 2 cards to the deck. Blocks Steal targeting you.'
        : 'Exchange: Draw 2 cards and then return 2 cards to the deck. Cannot be blocked. Blocks Steal targeting you.',
      inquisitor: (bishop) => bishop
        ? 'Exchange: Draw 1 card and then return 1 card to the deck. Investigate: Choose a player; look at one of their cards. Force the exchange, or not. Can be blocked by the Bishop. Blocks Steal targeting you.'
        : 'Exchange: Draw 1 card and then return 1 card to the deck. Cannot be blocked. Investigate: Choose a player; look at one of their cards. Force the exchange, or not. Cannot be blocked. Blocks Steal targeting you.',
      foreignAid: (blockers) => `Foreign Aid: Take 2 coins from the central treasury. ${blockers ? `Can be blocked by ${blockers}.` : 'No active card blocks this action.'}`,
      coup: (cost) => `Coup: Pay ${cost} coins and choose an opponent; they lose one influence. It cannot be blocked or challenged.`,
      income: 'Income: Take 1 coin from the central treasury. Cannot be blocked or challenged.',
      turnIntro: 'On your turn you must perform one of the following actions.',
      characterAction: 'Character Action: Declare a character. You may tell the truth or bluff.',
      coinPressure: (coins) => `If you have ${coins}+ coins,\nyou must launch a Coup.`,
      bufao: 'Disorder: Take 1 card from the deck and 1 card from an opponent (chosen by them). Choose one of them to exchange for one of your influences and return the other to its place of origin. Can block Steal and Disorder. When blocking Disorder, your influence is not taken, but the active player still takes 1 card from the deck and may perform the exchange normally.',
      burocrata: 'Cooperation: Take 3 coins from the central treasury and give 1 coin to an opponent. Can block Foreign Aid.',
      benfeitor: 'Redistribution: Take 3 coins from the player with the most coins and give them to the player with the fewest coins. In case of a tie, the active player chooses the target. Any player declaring Benefactor can block Redistribution, preventing any coins from being redistributed.',
      burgues: 'Dividends: Take 4 coins. Other players may declare that they have a Bourgeois. After challenges are resolved, the active player pays 1 coin to each claimant who was not successfully challenged.',
      marionetista: 'Pull Strings: Pay 3 coins and choose a player; you decide their next action, except Coup. The effect ends after that action or if the Puppeteer dies.',
      diplomata: 'Negotiate: Pay 2 coins, choose two players (including yourself, if desired). Until your next turn, they cannot use offensive actions against each other. Cannot be blocked. Intercede: Blocks Brutal Execution against yourself.',
      mercenario: 'Brutal Execution: Pay 5 coins to eliminate any card. Can be blocked by the Diplomat.',
      bispo: 'Purge: Pay 2 coins and choose a player. They must reveal an influence and place it permanently in the cemetery. Then they draw a new card from the deck. Blocks Inquisitor actions against yourself.',
      tesoureiro: 'Taxation: Gain 2 coins; all other players pay 1 coin to the bank. Can be blocked by the Duke.',
      vigilante: 'Revenge: Choose a player who used an offensive action against you since your last turn. They must pay you 2 coins. If they cannot, they reveal one of their influences and keep it revealed in the cemetery until it is exchanged.',
      pistoleiro: 'Bounty: Pay 2 coins and choose a target. Another player may pay 2 coins to make the target lose 1 influence. Can be blocked by the Sheriff.',
      magnata: 'Bribe: Exchange one of your cards with the deck. You may pay X coins to draw X extra cards, choose one, and return the rest to the deck.',
      estrategista: "Maneuver: Receive 1 coin. Choose and look at another player's card. You may exchange one of your cards for it.",
      ladrao: 'Robbery: Take 1 coin from each player. Other Thieves block the robbery against themselves.',
      vigarista: 'Risky Fortune: Double your coins (max. 5). If challenged and you lose, give all your coins to the challenger.',
      xerife: 'Wanted: Pay 1 coin and choose a player. Until your next turn, offensive abilities used by them that cost coins cost 2 additional coins. Blocks Bounty against any player including you.'
    }
  }
};

const GUIDE_PAGE_STYLES = {
  characters: { titleSize: 9, nameSize: 3.8, bodySize: 3.6, portraitSize: 15, listGap: 1.2, contentWidth: 100, listOffset: 0 },
  actions: { titleSize: 9, nameSize: 3.8, bodySize: 3.6, portraitSize: 15, turnIntroSize: 4, turnActionSize: 4.6, turnWarningSize: 4.8, listGap: 3.2, contentWidth: 90, listOffset: 1.5 },
  promo: { titleSize: 9, nameSize: 3.8, bodySize: 3.65, portraitSize: 15, listGap: 2, contentWidth: 100, listOffset: 0 },
  revolution: { titleSize: 9, nameSize: 3.6, bodySize: 3.15, portraitSize: 15, listGap: 2, contentWidth: 100, listOffset: 0 },
  dlc2: { titleSize: 9, nameSize: 3.8, bodySize: 3.6, portraitSize: 15, listGap: 2, contentWidth: 100, listOffset: 0 }
};

const GUIDE_PAGE_ORDER = ['characters', 'promo', 'revolution', 'dlc2', 'actions'];
const SHOW_REMOVED_GUIDE_CARDS = true;
const CENTER_REMAINING_GUIDE_CARDS = true;

function getGuideLanguage() {
  const language = globalThis.CoupLanguage?.getLanguage?.() || globalThis.document?.documentElement?.lang || 'pt-BR';
  return String(language).toLowerCase().startsWith('en') ? 'en' : 'pt';
}

function getGuideCopy() {
  return GUIDE_COPY[getGuideLanguage()] || GUIDE_COPY.pt;
}

function getResolvedDeckConfig(deckConfig = {}) {
  return deckConfig && Object.keys(deckConfig).length > 0 ? deckConfig : DEFAULT_DECK_CONFIG;
}

function hasCard(deckConfig, cardType) {
  return (getResolvedDeckConfig(deckConfig)[cardType] || 0) > 0;
}

function hasAnyCard(deckConfig, cardTypes) {
  return cardTypes.some(cardType => hasCard(deckConfig, cardType));
}

function getCardName(cardType) {
  const language = getGuideLanguage();
  return CARD_META[cardType]?.[language] || CARD_META[cardType]?.pt || cardType;
}

function getCardPortrait(cardType) {
  const meta = CARD_META[cardType];
  return meta ? `assets/img/perfil-cards/${meta.folder}/${cardType}.png` : '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatStyleNumber(value, digits = 2) {
  return Number(value).toFixed(digits).replace(/\.?0+$/, '');
}

function renderFormattedGuideText(value, color) {
  const labelColor = escapeHtml(color || '#111111');
  let html = escapeHtml(value).replace(/\n/g, '<br>');

  ABILITY_LABELS
    .slice()
    .sort((a, b) => b.length - a.length)
    .forEach((label) => {
      const escapedLabel = escapeHtml(label);
      const pattern = new RegExp(`(^|[\\s(])(${escapeRegExp(escapedLabel)}:)`, 'g');
      html = html.replace(pattern, `$1<span class="ability-label" style="color: ${labelColor};">$2</span>`);
    });

  return html;
}

function resolveGuideAction(action, ...args) {
  return typeof action === 'function' ? action(...args) : action;
}

function formatGuideList(cardTypes, options = {}) {
  const language = getGuideLanguage();
  const connector = options.connector || (language === 'en' ? 'or' : 'ou');
  const names = cardTypes.map(getCardName);

  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]} ${connector} ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} ${connector} ${names[names.length - 1]}`;
}

function formatAssassinBlockers(deckConfig) {
  if (!hasCard(deckConfig, 'condessa')) return '';
  return getGuideLanguage() === 'en' ? 'the Contessa' : 'pela Condessa';
}

function getGuidePageStyle(pageType) {
  return GUIDE_PAGE_STYLES[pageType] || GUIDE_PAGE_STYLES.characters;
}

function getDynamicGuideStyleAttr(pageType, overrides = {}) {
  const style = { ...getGuidePageStyle(pageType), ...overrides };
  return [
    `--guide-title-size: ${style.titleSize}cqw`,
    `--guide-name-size: ${formatStyleNumber(style.nameSize)}cqw`,
    `--guide-body-size: ${formatStyleNumber(style.bodySize)}cqw`,
    `--guide-portrait-size: ${formatStyleNumber(style.portraitSize)}%`,
    `--guide-list-gap: ${style.listGap}%`,
    `--guide-content-width: ${style.contentWidth}%`,
    `--guide-list-offset: ${style.listOffset}%`,
    `--guide-turn-intro-size: ${style.turnIntroSize || style.bodySize}cqw`,
    `--guide-turn-action-size: ${style.turnActionSize || style.bodySize}cqw`,
    `--guide-turn-warning-size: ${style.turnWarningSize || style.bodySize}cqw`
  ].join('; ');
}

function createDynamicGuideEntry(deckConfig, cardType, text) {
  return {
    cardType,
    name: getCardName(cardType),
    image: getCardPortrait(cardType),
    color: CARD_META[cardType]?.color || '#111111',
    text,
    muted: !hasCard(deckConfig, cardType)
  };
}

function buildBaseGuideEntries(deckConfig, copy) {
  const extortionBlockers = CARD_GROUPS.base
    .concat(['bufao'])
    .filter(cardType => ['capitao', 'embaixador', 'inquisidor', 'bufao'].includes(cardType) && hasCard(deckConfig, cardType));
  const foreignAidBlockers = ['duque', 'burocrata'].filter(cardType => hasCard(deckConfig, cardType));
  const hasBishop = hasCard(deckConfig, 'bispo');
  const hasTreasurer = hasCard(deckConfig, 'tesoureiro');

  return [
    createDynamicGuideEntry(deckConfig, 'duque', resolveGuideAction(copy.actions.duke, hasTreasurer)),
    createDynamicGuideEntry(deckConfig, 'capitao', resolveGuideAction(copy.actions.captain, formatGuideList(extortionBlockers))),
    createDynamicGuideEntry(deckConfig, 'assassino', resolveGuideAction(copy.actions.assassin, formatAssassinBlockers(deckConfig))),
    createDynamicGuideEntry(deckConfig, 'condessa', copy.actions.contessa),
    createDynamicGuideEntry(deckConfig, 'embaixador', resolveGuideAction(copy.actions.ambassador, hasBishop)),
    createDynamicGuideEntry(deckConfig, 'inquisidor', resolveGuideAction(copy.actions.inquisitor, hasBishop))
  ];
}

function buildActionGuideEntries(deckConfig, copy, alternativeRuleDraw = null) {
  const foreignAidBlockers = ['duque', 'burocrata'].filter(cardType => hasCard(deckConfig, cardType));
  const effects = getAlternativeRuleEffects(alternativeRuleDraw);

  return [
    { label: copy.actions.income, color: '#111111' },
    { label: resolveGuideAction(copy.actions.foreignAid, formatGuideList(foreignAidBlockers)), color: '#111111' },
    { label: resolveGuideAction(copy.actions.coup, effects.coupCost), color: '#111111' },
    { label: copy.actions.characterAction, color: '#111111' }
  ];
}

function buildGroupGuideEntries(deckConfig, copy, cardTypes) {
  return cardTypes.map(cardType => createDynamicGuideEntry(deckConfig, cardType, copy.actions[cardType]));
}

function prepareDynamicGuidePage(page) {
  if (!page.entries) return page;

  const allEntries = page.entries;
  const visibleEntries = (page.showRemovedCards ?? SHOW_REMOVED_GUIDE_CARDS)
    ? allEntries
    : allEntries.filter(entry => !entry.muted);
  const mutedEntries = allEntries.filter(entry => entry.muted).length;

  return {
    ...page,
    entries: visibleEntries,
    hasHiddenEntries: mutedEntries > 0
  };
}

function buildDynamicGuidePageByType(pageType, deckConfig, alternativeRuleDraw = null) {
  const resolvedDeckConfig = getResolvedDeckConfig(deckConfig);
  const copy = getGuideCopy();
  const title = copy.titles[pageType] || copy.titles.characters;

  if (pageType === 'actions') {
    const effects = getAlternativeRuleEffects(alternativeRuleDraw);
    return {
      type: pageType,
      title: copy.titles.backActions,
      intro: copy.actions.turnIntro,
      actions: buildActionGuideEntries(resolvedDeckConfig, copy, alternativeRuleDraw),
      warning: resolveGuideAction(copy.actions.coinPressure, effects.mandatoryCoupCoins)
    };
  }

  if (pageType === 'characters') {
    return prepareDynamicGuidePage({
      type: pageType,
      title,
      entries: buildBaseGuideEntries(resolvedDeckConfig, copy)
    });
  }

  const groups = {
    promo: CARD_GROUPS.promo,
    revolution: CARD_GROUPS.revolution,
    dlc2: CARD_GROUPS.shadows
  };

  return prepareDynamicGuidePage({
    type: pageType,
    title,
    entries: buildGroupGuideEntries(resolvedDeckConfig, copy, groups[pageType] || [])
  });
}

// Monta as paginas de regras de personagens conforme o baralho ativo.
function buildDynamicGuidePages(deckConfig = DEFAULT_DECK_CONFIG, alternativeRuleDraw = null) {
  const resolvedDeckConfig = getResolvedDeckConfig(deckConfig);
  const pages = [];

  GUIDE_PAGE_ORDER.forEach((pageType) => {
    if (pageType === 'actions') return;
    if (pageType === 'promo' && !hasAnyCard(resolvedDeckConfig, CARD_GROUPS.promo)) return;
    if (pageType === 'revolution' && !hasAnyCard(resolvedDeckConfig, CARD_GROUPS.revolution)) return;
    if (pageType === 'dlc2' && !hasAnyCard(resolvedDeckConfig, CARD_GROUPS.shadows)) return;

    const page = buildDynamicGuidePageByType(pageType, resolvedDeckConfig, alternativeRuleDraw);
    if (page.entries?.length > 0) pages.push(page);
  });

  pages.push(buildDynamicGuidePageByType('actions', resolvedDeckConfig, alternativeRuleDraw));
  return pages;
}

function renderDynamicGuideEntry(entry) {
  const color = escapeHtml(entry.color);
  const mutedClass = entry.muted ? ' is-muted' : '';

  return `
    <section class="guide-entry${mutedClass}" style="--role-color: ${color};">
      <img class="guide-portrait" src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.name)}">
      <div class="guide-copy">
        <h3>${escapeHtml(entry.name)}</h3>
        <p>${renderFormattedGuideText(entry.text, entry.color)}</p>
      </div>
    </section>
  `;
}

function renderDynamicAction(action) {
  return `
    <p class="guide-turn-action" style="--role-color: ${escapeHtml(action.color)};">
      ${renderFormattedGuideText(action.label, action.color)}
    </p>
  `;
}

// Renderiza uma pagina de guia como HTML pronto para uma face do flip-card.
function renderDynamicGuidePage(page) {
  const preparedPage = prepareDynamicGuidePage(page);
  const isTurnSummary = preparedPage.type === 'actions';
  const compactBase = preparedPage.type === 'characters' && preparedPage.entries.length <= 5;
  const hasInquisitor = preparedPage.entries?.some(entry => entry.cardType === 'inquisidor' && !entry.muted);
  const characterStyle = compactBase ? {
    titleSize: 9,
    nameSize: hasInquisitor ? 4.2 : 4.4,
    bodySize: hasInquisitor ? 4 : 4.1,
    portraitSize: 17,
    listGap: 3,
    contentWidth: 100,
    listOffset: 0
  } : {};
  const centeredClass = CENTER_REMAINING_GUIDE_CARDS && preparedPage.hasHiddenEntries
    ? ' removed-layout-centered'
    : ' removed-layout-distributed';
  const classes = `guide-page ${isTurnSummary ? 'turn-summary' : 'character-summary'}${centeredClass}`;

  if (isTurnSummary) {
    return `
      <article class="${classes}" style="${getDynamicGuideStyleAttr(preparedPage.type)}">
        <div class="guide-inner">
          <h2 class="guide-title">${escapeHtml(preparedPage.title)}</h2>
          <p class="guide-intro">${escapeHtml(preparedPage.intro)}</p>
          <div class="guide-turn-list">
            ${(preparedPage.actions || []).map(renderDynamicAction).join('')}
          </div>
          <p class="guide-turn-warning">${escapeHtml(preparedPage.warning)}</p>
        </div>
      </article>
    `;
  }

  return `
    <article class="${classes}" style="${getDynamicGuideStyleAttr(preparedPage.type, characterStyle)}">
      <div class="guide-inner">
        <h2 class="guide-title">${escapeHtml(preparedPage.title)}</h2>
        <div class="guide-list">
          ${(preparedPage.entries || []).map(renderDynamicGuideEntry).join('')}
        </div>
      </div>
    </article>
  `;
}

export {
  buildDynamicGuidePages,
  renderDynamicGuidePage
};
