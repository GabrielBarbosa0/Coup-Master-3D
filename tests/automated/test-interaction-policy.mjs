import assert from 'node:assert/strict';
import { isSandboxTableInteractionAllowed } from '../../js/three/interaction-policy.js';

assert.equal(isSandboxTableInteractionAllowed('casual'), true);
assert.equal(isSandboxTableInteractionAllowed('ranked'), false);
assert.equal(isSandboxTableInteractionAllowed('RANKED'), false);
assert.equal(isSandboxTableInteractionAllowed(), true);

console.log('interaction-policy: ranked sandbox lock passed');
