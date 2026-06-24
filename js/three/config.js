export const PLAYER_COUNT = 8;
export const DEFAULT_MUSIC_VOLUME = 0.1;
export const DEFAULT_VFX_VOLUME = 0.5;

export const CARD_LIBRARY = [
  { type: 'duque', folder: 'base' },
  { type: 'capitao', folder: 'base' },
  { type: 'assassino', folder: 'base' },
  { type: 'condessa', folder: 'base' },
  { type: 'embaixador', folder: 'base' },
  { type: 'inquisidor', folder: 'base' },
  { type: 'bufao', folder: 'promo' },
  { type: 'burocrata', folder: 'promo' },
  { type: 'benfeitor', folder: 'promo' },
  { type: 'burgues', folder: 'promo' },
  { type: 'marionetista', folder: 'dlc1' },
  { type: 'diplomata', folder: 'dlc1' },
  { type: 'mercenario', folder: 'dlc1' },
  { type: 'bispo', folder: 'dlc1' },
  { type: 'tesoureiro', folder: 'dlc1' },
  { type: 'vigilante', folder: 'dlc1' },
  { type: 'pistoleiro', folder: 'dlc2' },
  { type: 'magnata', folder: 'dlc2' },
  { type: 'estrategista', folder: 'dlc2' },
  { type: 'ladrao', folder: 'dlc2' },
  { type: 'vigarista', folder: 'dlc2' },
  { type: 'xerife', folder: 'dlc2' }
];

export const CARD_LABELS = {
  assassino: 'Assassino',
  benfeitor: 'Benfeitor',
  bispo: 'Bispo',
  bufao: 'Bufão',
  burocrata: 'Burocrata',
  burgues: 'Burguês',
  capitao: 'Capitão',
  condessa: 'Condessa',
  diplomata: 'Diplomata',
  duque: 'Duque',
  embaixador: 'Embaixador',
  estrategista: 'Estrategista',
  inquisidor: 'Inquisidor',
  ladrao: 'Ladrão',
  magnata: 'Magnata',
  marionetista: 'Marionetista',
  mercenario: 'Mercenário',
  pistoleiro: 'Pistoleiro',
  tesoureiro: 'Tesoureiro',
  vigarista: 'Vigarista',
  vigilante: 'Vigilante',
  xerife: 'Xerife'
};

export const DEFAULT_DECK_CONFIG = Object.fromEntries(
  CARD_LIBRARY.map(({ type, folder }) => [type, folder === 'base' ? 5 : 0])
);

export const RULE_CARD_GROUPS = {
  base: ['duque', 'capitao', 'assassino', 'condessa', 'embaixador', 'inquisidor'],
  promo: ['bufao', 'benfeitor', 'burgues', 'burocrata'],
  revolution: ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro', 'vigilante'],
  shadows: ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife']
};

export const ALT_RULE_IMAGES = [
  'assets/img/guides/alternative-rules1.png',
  'assets/img/guides/alternative-rules2.png',
  'assets/img/guides/alternative-rules3.png',
  'assets/img/guides/alternative-rules4.png',
  'assets/img/guides/alternative-rules5.png'
];
