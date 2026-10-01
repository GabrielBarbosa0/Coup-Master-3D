import assert from 'node:assert/strict';
import {
  createRoomLaunchToken,
  getLobbyUrlForRoom,
  getSafeLoginNextPath,
  isValidRoomLaunchToken,
  normalizeEntryRoomCode
} from '../../js/navigation/entry-routing.js';

const now = 1_000_000;

assert.equal(normalizeEntryRoomCode(' ab-12! '), 'AB12');
assert.equal(getLobbyUrlForRoom('xj94'), 'lobby.html?room=XJ94');
assert.equal(getLobbyUrlForRoom(''), 'lobby.html');

const launchToken = createRoomLaunchToken('xj94', now);
assert.equal(isValidRoomLaunchToken(launchToken, 'XJ94', now + 1000), true);
assert.equal(isValidRoomLaunchToken(launchToken, 'ABCD', now + 1000), false);
assert.equal(isValidRoomLaunchToken(launchToken, 'XJ94', now + 20_000), false);
assert.equal(isValidRoomLaunchToken('invalid-json', 'XJ94', now + 1000), false);

assert.equal(
  getSafeLoginNextPath('index.html?room=xj94', 'https://coupmaster.com.br/login.html'),
  'lobby.html?room=XJ94'
);
assert.equal(
  getSafeLoginNextPath('https://evil.example/index.html?room=xj94', 'https://coupmaster.com.br/login.html'),
  'lobby.html'
);
assert.equal(
  getSafeLoginNextPath('lobby.html?room=xj94', 'https://coupmaster.com.br/login.html'),
  'lobby.html?room=xj94'
);
assert.equal(
  getSafeLoginNextPath('login.html', 'https://coupmaster.com.br/login.html'),
  'lobby.html'
);

console.log('entry-routing: ok');
