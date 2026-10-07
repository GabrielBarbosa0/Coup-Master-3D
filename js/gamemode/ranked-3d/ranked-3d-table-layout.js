const TABLE_PLAYER_COUNT = 6;
const HAND_RADIUS = 3.08;
const CARD_REST_Y = 0.068;
const COIN_AREA_RADIUS = 2.3;
const REVEAL_AREA_RADIUS = 1.7;
const EXCHANGE_AREA_RADIUS = 1.92;
const HAND_AREA_RADIUS = 3.14;
const SHARED_CENTER_OFFSET = 0.464;
const TREASURY_OFFSET_X = 1.46;
const COIN_AREA_SLOT_COUNT = 12;
const COIN_SPAWN_RADIAL_JITTER = 0.06;
const COIN_SPAWN_TANGENT_JITTER = 0.24;
const COIN_SPAWN_HEIGHT = CARD_REST_Y;

// Cria os pontos fixos da mesa usados pela representacao visual do ranqueado.
export function createRanked3dTableLayout(options = {}) {
  const cemeteryCount = Math.max(0, Number(options.cemeteryCount) || 0);
  const usesSharedCenter = cemeteryCount > 0;
  const deckX = usesSharedCenter ? SHARED_CENTER_OFFSET : 0;
  const cemeteryX = usesSharedCenter ? -SHARED_CENTER_OFFSET : 0;
  const seats = Array.from({ length: TABLE_PLAYER_COUNT }, (_, index) => createSeatLayout(index + 1));

  return {
    deck: createPoint(deckX, CARD_REST_Y, 0, 0),
    cemetery: createPoint(cemeteryX, CARD_REST_Y, 0, 0),
    treasury: createPoint(-TREASURY_OFFSET_X, CARD_REST_Y, 0, 0),
    seats,
    usesSharedCenter
  };
}

// Retorna a area relativa a um assento para moedas e revelacoes publicas.
function createSeatLayout(seat) {
  const angle = getRankedPlayerAngle(seat);
  const radial = { x: Math.cos(angle), z: Math.sin(angle) };
  const tangent = { x: -Math.sin(angle), z: Math.cos(angle) };
  const coinArea = createPoint(
    radial.x * COIN_AREA_RADIUS,
    CARD_REST_Y,
    radial.z * COIN_AREA_RADIUS,
    getRankedCardRotation(seat)
  );
  const hand = createPoint(
    radial.x * HAND_AREA_RADIUS,
    CARD_REST_Y,
    radial.z * HAND_AREA_RADIUS,
    getRankedCardRotation(seat)
  );
  const reveal = createPoint(
    radial.x * REVEAL_AREA_RADIUS,
    CARD_REST_Y,
    radial.z * REVEAL_AREA_RADIUS,
    getRankedCardRotation(seat)
  );
  const exchange = createPoint(
    radial.x * EXCHANGE_AREA_RADIUS,
    CARD_REST_Y,
    radial.z * EXCHANGE_AREA_RADIUS,
    getRankedCardRotation(seat)
  );

  return {
    seat,
    hand,
    coinArea: {
      ...coinArea,
      slots: createCoinSlots(coinArea, radial, tangent)
    },
    reveal,
    exchange
  };
}

// Replica a faixa frontal do spawn casual com moedas ja assentadas no carregamento do estado.
function createCoinSlots(anchor, radial, tangent) {
  return Array.from({ length: COIN_AREA_SLOT_COUNT }, (_, index) => {
    const radialOffset = (seededUnit(index * 2 + 1) * 2 - 1) * COIN_SPAWN_RADIAL_JITTER;
    const tangentOffset = (seededUnit(index * 2 + 2) * 2 - 1) * COIN_SPAWN_TANGENT_JITTER;
    const spawnHeight = COIN_SPAWN_HEIGHT;

    return createPoint(
      anchor.x + radial.x * radialOffset + tangent.x * tangentOffset,
      spawnHeight,
      anchor.z + radial.z * radialOffset + tangent.z * tangentOffset,
      anchor.rotationY
    );
  });
}

// Produz uma variacao deterministica para todos os clientes receberem a mesma area de nascimento.
function seededUnit(seed) {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Mantem o formato serializavel do snapshot independente de Three.js.
function createPoint(x, y, z, rotationY) {
  return { x, y, z, rotationY };
}

// Calcula o angulo radial de um assento na mesa hexagonal.
export function getRankedPlayerAngle(seat) {
  return -Math.PI / 2 + ((seat - 1) / TABLE_PLAYER_COUNT) * Math.PI * 2;
}

// Alinha uma carta com a borda interna do assento correspondente.
export function getRankedCardRotation(seat) {
  return -getRankedPlayerAngle(seat) - Math.PI / 2;
}

// Gera o ID estavel de uma moeda visual a partir do assento e indice do saldo.
export function getRankedCoinId(seat, index) {
  return `ranked-coin-${seat}-${index + 1}`;
}

// Converte o saldo em fichas fisicas: ouro vale cinco pratas.
export function createRankedCoinRepresentation(balance) {
  const value = Math.max(0, Number(balance) || 0);
  const goldCount = Math.floor(value / 5);
  const silverCount = value % 5;
  return [
    ...Array.from({ length: goldCount }, () => 'gold'),
    ...Array.from({ length: silverCount }, () => 'silver')
  ];
}

// Mantem a moeda temporaria prata quando nao ha uma ficha final para reutilizar.
export function getRankedCoinType() {
  return 'silver';
}
