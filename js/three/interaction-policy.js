// Define se a mesa pode aceitar manipulacoes livres do modo sandbox.
export function isSandboxTableInteractionAllowed(mode = '') {
  return String(mode).trim().toLowerCase() !== 'ranked';
}
