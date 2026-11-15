import test from 'node:test';
import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
  clear: () => values.clear()
};
const { default: Auth } = await import('../www/js/services/AuthService.js');

test('logout efface les donnees de session et conserve la langue', () => {
  const keys = ['token', 'user', 'pendingRegistration', 'otpEmail', 'otpVerified', 'resetEmail', 'starsRequest', 'notif_prefs', 'blocked_users', 'conversations_custom', 'conversations_seeded'];
  for (const key of [...keys, 'lang']) localStorage.setItem(key, JSON.stringify('present'));
  Auth.logout();
  for (const key of keys) assert.equal(localStorage.getItem(key), null, `${key} doit etre supprime`);
  assert.equal(localStorage.getItem('lang'), JSON.stringify('present'));
});
