const RULE_DRAW_MIN = 1;
const RULE_DRAW_MAX = 5;

const DEFAULT_GAMEPLAY_RULES = Object.freeze({
  coupCost: 7,
  mandatoryCoupCoins: 10,
  deckOverrides: Object.freeze({})
});

const ALT_RULE_PAGE_IDS = [
  ['justica-lenta', 'falso-duque', 'assassino-declarado', 'sangue-frio', 'ladrao-de-tumulos'],
  ['ultima-palavra', 'recompensa', 'espolio', 'votos-do-senado', 'mercado-negro', 'golpe-magno'],
  ['soberania-absoluta', 'contrabando', 'panico-economico', 'camara', 'corrupcao'],
  ['o-trio-falso', 'figura-publica', 'chantagem', 'imprensa', 'favor-da-coroa'],
  ['inversao-de-poder', 'espionagem', 'sorte-do-destino', 'conselho-de-emergencia', 'herdeiro-do-trono', 'golpe-declarado']
];

const ALT_RULE_PAGE_STYLES = [
  { titleSize: 9, ruleSize: 4.52, ruleGap: 3.7, blockWidth: 100, blockOffset: 0 },
  { titleSize: 9, ruleSize: 4.25, ruleGap: 4, blockWidth: 100, blockOffset: 0 },
  { titleSize: 9, ruleSize: 4.42, ruleGap: 3.3, blockWidth: 100, blockOffset: 0 },
  { titleSize: 9, ruleSize: 4.42, ruleGap: 4.4, blockWidth: 100, blockOffset: 0 },
  { titleSize: 9, ruleSize: 4.25, ruleGap: 2.6, blockWidth: 100, blockOffset: 0 }
];

const ALT_RULE_COPY = {
  pt: {
    title: 'Regras Alternativas',
    intro: 'Selecione até 5 regras alternativas para uma partida mais imprevisível',
    rules: {
      'justica-lenta': ['Justiça Lenta', 'Os golpes só podem ser dados com 10 moedas, ao invés de 7, sendo obrigatório com 15 moedas.'],
      'falso-duque': ['Falso Duque', 'Haverá apenas 1 Duque no baralho.'],
      'assassino-declarado': ['Assassino Declarado', 'Para o assassinato ter sucesso, o assassino deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.'],
      'sangue-frio': ['Sangue Frio', 'Após um assassinato bem-sucedido, o assassino ganha 2 moedas de recompensa.'],
      'ladrao-de-tumulos': ['Ladrão de Túmulos', 'Poderá pagar 4 moedas para trocar uma carta da mão com uma revelada na mesa.'],
      'ultima-palavra': ['Última Palavra', 'Quando for eliminado, você pode escolher um jogador para perder 2 moedas imediatamente.'],
      recompensa: ['Recompensa', 'Elimine um jogador com mais de 7 moedas e ganhe 2 moedas de recompensa por golpe, contestação, assassinato ou execução bruta.'],
      espolio: ['Espólio', 'Quando alguém é eliminado, suas moedas são divididas entre os jogadores restantes em partes iguais. Caso sobre, devolva para o banco.'],
      'votos-do-senado': ['Votos do Senado', 'Golpes de Estado precisam de aprovação da maioria dos jogadores vivos.'],
      'mercado-negro': ['Mercado Negro', 'Poderá pagar 2 moedas para trocar uma carta da mão com uma do baralho.'],
      'golpe-magno': ['Golpe Magno', 'Quando um jogador atingir 15 moedas, todos perdem 1 influência.'],
      'soberania-absoluta': ['Soberania Absoluta', 'Se possuir 2 Condessas, você pode bloquear qualquer ação contra si. Pode blefar, mas se for contestado e mentir, será eliminado. Se conseguir, deve trocar ambas as cartas.'],
      contrabando: ['Contrabando', 'Você pode sacrificar uma influência sua para ganhar 10 moedas automaticamente.'],
      'panico-economico': ['Pânico Econômico', 'Quando alguém acumular mais de 8 moedas, todos os jogadores recebem 1 moeda automaticamente.'],
      camara: ['Câmara', 'Todos vão receber 4 influências, e escolhem duas para ficar e duas para colocar no baralho.'],
      corrupcao: ['Corrupção', 'No início do jogo, receba duas cartas e selecione uma para manter e outra para descartar. Em seguida, sua segunda carta será sorteada aleatoriamente.'],
      'o-trio-falso': ['O Trio Falso', 'Em vez de 2 cartas, começa com 3, porém com 2 vidas apenas.'],
      'figura-publica': ['Figura Pública', 'Um personagem é revelado na mesa, só existirá ele no jogo e o uso dele é público, todos podem usar.'],
      chantagem: ['Chantagem', 'Ao gastar 7 moedas você poderá roubar uma influência de um jogador e pegar para você, porém você deverá dar uma de suas cartas para ele. Pode ser bloqueado pelo Embaixador, Inquisidor e Bufão.'],
      imprensa: ['Imprensa', 'Gaste 4 moedas para revelar uma carta de outro jogador para todos à sua escolha, porém o jogador afetado ganha 2 moedas.'],
      'favor-da-coroa': ['Favor da Coroa', 'Quando for alvo de uma ação, você pode pagar 3 moedas para bloqueá-la. Exceto Golpe de Estado.'],
      'inversao-de-poder': ['Inversão de Poder', 'Pague 3 moedas e mude a direção dos turnos.'],
      espionagem: ['Espionagem', 'Uma vez por turno, você pode pagar 2 moedas para olhar secretamente uma influência de qualquer jogador.'],
      'sorte-do-destino': ['Sorte do Destino', 'Sempre que um jogador perder uma influência, ele compra uma carta do topo do baralho. Pode ficar com ela ou devolvê-la ao fundo do baralho.'],
      'conselho-de-emergencia': ['Conselho de Emergência', 'Quando um jogador atingir 10 moedas, todos os jogadores vivos recebem 2 moedas.'],
      'herdeiro-do-trono': ['Herdeiro do Trono', 'Quando um jogador for eliminado, o responsável pela eliminação recebe imediatamente 3 moedas.'],
      'golpe-declarado': ['Golpe Declarado', 'Para o Golpe de Estado ter sucesso, o jogador deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.']
    }
  },
  en: {
    title: 'Alternative Rules',
    intro: 'Select up to 5 alternative rules for a more unpredictable match',
    rules: {
      'justica-lenta': ['Slow Justice', 'Coups can only be made with 10 coins instead of 7, and become mandatory with 15 coins.'],
      'falso-duque': ['False Duke', 'There will be only 1 Duke in the deck.'],
      'assassino-declarado': ['Declared Assassin', "For an assassination to succeed, the Assassin must guess the target's last influence. If they are wrong, they lose the coins and the target draws a new card."],
      'sangue-frio': ['Cold Blood', 'After a successful assassination, the Assassin gains a 2-coin reward.'],
      'ladrao-de-tumulos': ['Grave Robber', 'You may pay 4 coins to exchange a card from your hand with a revealed card on the table.'],
      'ultima-palavra': ['Last Word', 'When eliminated, you may choose a player to lose 2 coins immediately.'],
      recompensa: ['Reward', 'Eliminate a player with more than 7 coins and gain a 2-coin reward through coup, challenge, assassination, or brutal execution.'],
      espolio: ['Spoils', 'When someone is eliminated, their coins are divided equally among the remaining players. If any coins remain, return them to the bank.'],
      'votos-do-senado': ['Senate Votes', 'Coups require approval from the majority of living players.'],
      'mercado-negro': ['Black Market', 'You may pay 2 coins to exchange a card from your hand with one from the deck.'],
      'golpe-magno': ['Grand Coup', 'When a player reaches 15 coins, everyone loses 1 influence.'],
      'soberania-absoluta': ['Absolute Sovereignty', 'If you have 2 Contessas, you may block any action against yourself. You may bluff, but if challenged while lying, you are eliminated. If you prove it, you must exchange both cards.'],
      contrabando: ['Smuggling', 'You may sacrifice one of your own influences to gain 10 coins automatically.'],
      'panico-economico': ['Economic Panic', 'When someone accumulates more than 8 coins, all players automatically receive 1 coin.'],
      camara: ['Chamber', 'Everyone receives 4 influences and chooses two to keep and two to return to the deck.'],
      corrupcao: ['Corruption', 'At the start of the game, receive two cards and choose one to keep and one to discard. Then your second card is drawn randomly.'],
      'o-trio-falso': ['The False Trio', 'Instead of starting with 2 cards, each player starts with 3, but still has only 2 lives.'],
      'figura-publica': ['Public Figure', 'A character is revealed on the table. Only that character exists in the game and its use is public, so everyone may use it.'],
      chantagem: ['Blackmail', 'By spending 7 coins, you may steal an influence from another player and take it for yourself, but you must give that player one of your cards. It can be blocked by the Ambassador, Inquisitor, and Jester.'],
      imprensa: ['Press', 'Spend 4 coins to reveal a card from another player of your choice to everyone, but the affected player gains 2 coins.'],
      'favor-da-coroa': ["Crown's Favor", 'When targeted by an action, you may pay 3 coins to block it. This does not block a Coup.'],
      'inversao-de-poder': ['Power Shift', 'Pay 3 coins and change the direction of turns.'],
      espionagem: ['Espionage', "Once per turn, you may pay 2 coins to secretly look at any player's influence."],
      'sorte-do-destino': ['Luck of Fate', 'Whenever a player loses an influence, they draw a card from the top of the deck. They may keep it or return it to the bottom of the deck.'],
      'conselho-de-emergencia': ['Emergency Council', 'When a player reaches 10 coins, all living players receive 2 coins.'],
      'herdeiro-do-trono': ['Heir to the Throne', 'When a player is eliminated, the player responsible for the elimination immediately receives 3 coins.'],
      'golpe-declarado': ['Declared Coup', "For a Coup to succeed, the player must guess the target's last influence. If they are wrong, they lose the coins and the target draws a new card."]
    }
  }
};

const ALTERNATIVE_RULES = ALT_RULE_PAGE_IDS.flat().map(id => ({ id }));

function getGuideLanguage() {
  const language = globalThis.CoupLanguage?.getLanguage?.() || globalThis.document?.documentElement?.lang || 'pt-BR';
  return String(language).toLowerCase().startsWith('en') ? 'en' : 'pt';
}

function getAlternativeRuleCopy() {
  return ALT_RULE_COPY[getGuideLanguage()] || ALT_RULE_COPY.pt;
}

function getAlternativeRuleIds(source = {}) {
  const draw = source?.alternativeRuleDraw || source;
  return Array.isArray(draw?.ruleIds) ? draw.ruleIds : [];
}

function getAlternativeRuleEffects(source = {}) {
  const ids = new Set(getAlternativeRuleIds(source));
  return {
    coupCost: ids.has('justica-lenta') ? 10 : DEFAULT_GAMEPLAY_RULES.coupCost,
    mandatoryCoupCoins: ids.has('justica-lenta') ? 15 : DEFAULT_GAMEPLAY_RULES.mandatoryCoupCoins,
    deckOverrides: ids.has('falso-duque') ? { duque: 1 } : {}
  };
}

function applyAlternativeDeckRules(deckConfig = {}, source = {}) {
  return {
    ...deckConfig,
    ...getAlternativeRuleEffects(source).deckOverrides
  };
}

function clampRuleCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return RULE_DRAW_MIN;
  return Math.max(RULE_DRAW_MIN, Math.min(RULE_DRAW_MAX, Math.round(number)));
}

function getRuleById(ruleId) {
  return ALTERNATIVE_RULES.find(rule => rule.id === ruleId) || null;
}

function validAlternativeRuleIds(ids) {
  return [...new Set(Array.isArray(ids) ? ids : [])].filter(id => getRuleById(id)).slice(0, RULE_DRAW_MAX);
}

function getAlternativeRuleText(ruleId) {
  const copy = getAlternativeRuleCopy();
  const localized = copy.rules[ruleId] || ALT_RULE_COPY.pt.rules[ruleId] || [ruleId, ''];
  return {
    id: ruleId,
    title: localized[0] || ruleId,
    description: localized[1] || ''
  };
}

function buildAlternativeRulePages(drawData = null) {
  const ids = validAlternativeRuleIds(drawData?.ruleIds);
  if (ids.length) {
    return [{ pageIndex: 0, selected: true, rules: ids.map(getAlternativeRuleText) }];
  }

  return ALT_RULE_PAGE_IDS.map((ruleIds, pageIndex) => ({
    pageIndex,
    rules: ruleIds.map(getAlternativeRuleText)
  }));
}

function formatStyleNumber(value, digits = 2) {
  return Number(value).toFixed(digits).replace(/\.?0+$/, '');
}

function getAlternativeRuleStyleAttr(pageIndex) {
  const style = ALT_RULE_PAGE_STYLES[pageIndex] || ALT_RULE_PAGE_STYLES[0];
  return [
    `--alt-guide-title-size: ${formatStyleNumber(style.titleSize)}cqw`,
    `--alt-guide-rule-size: ${formatStyleNumber(style.ruleSize)}cqw`,
    '--alt-guide-title-intro-gap: 4cqw',
    '--alt-guide-header-list-gap: 2.1cqw',
    `--alt-guide-rule-gap: ${formatStyleNumber(style.ruleGap, 1)}%`,
    `--alt-guide-rule-block-width: ${formatStyleNumber(style.blockWidth, 1)}%`,
    `--alt-guide-rule-block-offset: ${formatStyleNumber(style.blockOffset, 1)}%`
  ].join('; ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAlternativeRule(rule) {
  return `
    <p class="alternative-rule-entry">
      <strong>${escapeHtml(rule.title)}:</strong>
      ${escapeHtml(rule.description)}
    </p>
  `;
}

function renderAlternativeRulePage(page) {
  const copy = getAlternativeRuleCopy();
  const pageIndex = page?.pageIndex || 0;
  const intro = pageIndex === 0 && !page?.selected
    ? `<p class="alternative-rules-intro">${escapeHtml(copy.intro)}</p>`
    : '';

  return `
    <article class="alternative-rules-page${page?.selected ? ' is-room-selection' : ''}" data-page="${pageIndex + 1}" style="${getAlternativeRuleStyleAttr(pageIndex)}">
      <div class="alternative-rules-inner">
        <header class="alternative-rules-header">
          <h2 class="alternative-rules-title">${escapeHtml(copy.title)}</h2>
          ${intro}
        </header>
        <div class="alternative-rule-list">
          ${(page?.rules || []).map(renderAlternativeRule).join('')}
        </div>
      </div>
    </article>
  `;
}

function createAlternativeRuleDraw(ruleIds = [], pinnedRuleIds = [], actorName = 'Host') {
  const ids = validAlternativeRuleIds(ruleIds);
  if (!ids.length) return null;
  const timestamp = Date.now();
  return {
    id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
    ruleIds: ids,
    pinnedRuleIds: validAlternativeRuleIds(pinnedRuleIds).filter(id => ids.includes(id)),
    count: ids.length,
    by: actorName,
    timestamp
  };
}

function pickRandomAlternativeRules(count, pinnedRuleIds = []) {
  const targetCount = clampRuleCount(count);
  const ids = validAlternativeRuleIds(pinnedRuleIds);
  const available = ALTERNATIVE_RULES.map(rule => rule.id).filter(id => !ids.includes(id));

  while (ids.length < targetCount && available.length) {
    ids.push(available.splice(Math.floor(Math.random() * available.length), 1)[0]);
  }

  return ids.slice(0, targetCount);
}

export {
  ALTERNATIVE_RULES,
  applyAlternativeDeckRules,
  buildAlternativeRulePages,
  clampRuleCount,
  createAlternativeRuleDraw,
  getAlternativeRuleEffects,
  getAlternativeRuleText,
  pickRandomAlternativeRules,
  renderAlternativeRulePage,
  validAlternativeRuleIds
};
