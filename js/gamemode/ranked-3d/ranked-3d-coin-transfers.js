// Converte a diferenca de saldos em transferencias unitarias entre jogadores e tesouro.
export function createRankedCoinTransferPlan(previousBalances = [], nextBalances = []) {
  const playerCount = Math.max(previousBalances.length, nextBalances.length);
  const sources = [];
  const targets = [];
  const plan = [];

  for (let index = 0; index < playerCount; index += 1) {
    const seat = index + 1;
    const previous = normalizeBalance(previousBalances[index]);
    const next = normalizeBalance(nextBalances[index]);
    if (previous > next) sources.push({ seat, amount: previous - next });
    if (next > previous) targets.push({ seat, amount: next - previous });
  }

  while (sources.length > 0 && targets.length > 0) {
    const source = sources[0];
    const target = targets[0];
    const amount = Math.min(source.amount, target.amount);
    addTransfers(plan, source.seat, target.seat, amount);
    consumeTransferAmount(sources, source, amount);
    consumeTransferAmount(targets, target, amount);
  }

  sources.forEach((source) => addTransfers(plan, source.seat, null, source.amount));
  targets.forEach((target) => addTransfers(plan, null, target.seat, target.amount));
  return plan;
}

// Normaliza valores recebidos do snapshot do motor.
function normalizeBalance(value) {
  return Math.max(0, Number(value) || 0);
}

// Mantem uma transferencia por moeda para permitir efeito escalonado na mesa.
function addTransfers(plan, fromSeat, toSeat, amount) {
  for (let index = 0; index < amount; index += 1) {
    plan.push({ fromSeat, toSeat });
  }
}

// Consome a quantidade usada e remove a entrada esgotada.
function consumeTransferAmount(entries, entry, amount) {
  entry.amount -= amount;
  if (entry.amount <= 0) entries.shift();
}
