// Clona dados serializaveis para evitar referencias mutaveis entre estado e rede.
function cloneSerializable(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

// Clona snapshots serializaveis usados como base da mesclagem transacional.
function cloneTableState(snapshot) {
  return cloneSerializable(snapshot);
}

export {
  cloneSerializable,
  cloneTableState
};
