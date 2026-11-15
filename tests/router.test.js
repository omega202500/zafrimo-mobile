import test from 'node:test';
import assert from 'node:assert/strict';
import Router from '../www/js/core/Router.js';

test('gardes Router pour les niveaux public, auth, owner et consultant', () => {
  assert.equal(Router.guardRedirect('public', false, null), null);
  assert.equal(Router.guardRedirect('auth', false, null), '/login');
  assert.equal(Router.guardRedirect('auth', true, { role: 'visitor' }), null);
  assert.equal(Router.guardRedirect('owner', true, { role: 'visitor' }), '/profile');
  assert.equal(Router.guardRedirect('owner', true, { role: 'owner' }), null);
  assert.equal(Router.guardRedirect('consultant', true, { role: 'owner' }), '/profile');
  assert.equal(Router.guardRedirect('consultant', true, { isConsultant: true }), null);
});
