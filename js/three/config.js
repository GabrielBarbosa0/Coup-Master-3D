import * as THREE from 'three';

export const CARD_W = 0.72;
export const CARD_H = 1.04;
export const CARD_D = (0.035 / 5) * 0.9 * 0.95 * 0.9;
export const CARD_RADIUS = 0.055;
export const TABLE_RADIUS = 4.65;
export const FELT_RADIUS = 4.18;
export const PLAY_RADIUS = 3.62;
export const TABLE_PHYSICS_RADIUS = TABLE_RADIUS * Math.cos(Math.PI / 8);
export const PLAYER_COUNT = 8;
export const HAND_RADIUS = 3.08;
export const CARD_REST_Y = 0.068;
export const DECK_BASE_HEIGHT = 0.38 * 0.4;
export const HAND_LADDER_SPACING = 0.36;
export const HAND_LADDER_DEPTH = 0.075;
export const HAND_LADDER_LIFT = 0.012;
export const HAND_LADDER_ROTATION = 0.035;
export const GOLD_COIN_RADIUS = 0.16 * 1.1;
export const SILVER_COIN_RADIUS = GOLD_COIN_RADIUS * (940 / 1280);
export const COIN_HEIGHT = 0.055 / 3;
export const COIN_TEXTURES = {
  gold: 'assets/img/coins/moeda-ouro.png',
  silver: 'assets/img/coins/moeda-prata.png'
};
export const SPECIAL_CARD_TEXTURES = {
  asilo: {
    front: 'assets/img/cards/religion/asilo-frente.png',
    back: 'assets/img/cards/religion/asilo-verso.png'
  },
  religiao: {
    front: 'assets/img/cards/religion/catolico.png',
    back: 'assets/img/cards/religion/protestante.png'
  }
};
export const ASYLUM_CARD_AREA_SCALE = 2;
export const ASYLUM_CARD_ASPECT = 1024 / 736;
export const RELIGION_CARD_HEIGHT_SCALE = 0.7;
export const RELIGION_CARD_ASPECT = 880 / 1200;
export const DIE_SIZE = 0.42;
export const DECK_DRAG_HOLD_MS = 260;
export const CARD_RETURN_COOLDOWN_MS = 300;
export const LIMBO_Y = -2.2;
export const LIMBO_RADIUS = TABLE_RADIUS + 2.2;
export const TABLE_STACK_RADIUS = 0.58;
export const TABLE_STACK_MERGE_RADIUS = 0.72;
export const TABLE_STACK_GAP = 0.012;
export const DECK_STACK_GAP = TABLE_STACK_GAP;
export const DECK_ROTATION_Y = 0;
export const OBJECT_ROTATION_STEP = Math.PI / 12;
export const DEFAULT_CAMERA_HEIGHT = 10.0;
export const DEFAULT_CAMERA_DISTANCE = 9.0;
export const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
export const DEFAULT_MUSIC_VOLUME = 0.1;
export const DEFAULT_VFX_VOLUME = 0.5;
export const PLAYER_BADGE_HEIGHT = 0.86;
export const PLAYER_BADGE_RADIAL_OFFSET = 0.48;
export const PLAYER_AVATAR_SIZE = 0.38;
export const PLAYER_NAME_WIDTH = 1.22;
export const PLAYER_NAME_HEIGHT = 0.28;

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
  xerife: 'Xerife',
  asilo: 'Asilo',
  religiao: 'Religião'
};

export const SPECIAL_CARD_LABELS = {
  asilo: {
    front: 'Asilo',
    back: 'Asilo'
  },
  religiao: {
    front: 'Católico',
    back: 'Protestante'
  }
};

export const DEFAULT_DECK_CONFIG = Object.fromEntries(
  CARD_LIBRARY.map(({ type, folder }) => [type, folder === 'base' ? 5 : 0])
);

export const RULE_CARD_GROUPS = {
  promo: ['bufao', 'benfeitor', 'burgues', 'burocrata'],
  revolution: ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro', 'vigilante'],
  shadows: ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife']
};

export const ALT_RULE_IMAGES = [
  'assets/img/guides/alternative-rules1.png',
  'assets/img/guides/alternative-rules2.png',
  'assets/img/guides/alternative-rules3.png',
  'assets/img/guides/alternative-rules4.png'
];
