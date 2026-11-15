import test from 'node:test';
import assert from 'node:assert/strict';

const data = new Map();
globalThis.localStorage = {
  getItem: key => data.has(key) ? data.get(key) : null,
  setItem: (key, value) => data.set(key, String(value)),
  removeItem: key => data.delete(key),
  clear: () => data.clear()
};
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.window = { dispatchEvent() {} };
const [{ default: Conversations }, { default: Moderation }] = await Promise.all([
  import('../www/js/services/ConversationService.js'), import('../www/js/services/ModerationService.js')
]);
function fresh() { localStorage.clear(); return Conversations.openFromOwner({ id: 'owner-1', name: 'Owner' }, { email: 'guest@example.com' }); }

test('envoi et progression des statuts sans retour en arriere', () => {
  const conv = fresh();
  let message;
  Conversations.onMessage(conv.id, value => { message = value; });
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => 0;
  try {
    assert.equal(Conversations.send(conv.id, 'Bonjour'), true);
  } finally { globalThis.setTimeout = originalTimeout; }
  assert.equal(message.status, 'sent');
  Conversations.setStatus(conv.id, message.id, 'delivered');
  Conversations.setStatus(conv.id, message.id, 'read');
  Conversations.setStatus(conv.id, message.id, 'delivered');
  assert.equal(Conversations.getById(conv.id).messages[0].status, 'read');
});

test('refuse un message vers un utilisateur bloque', () => {
  const conv = fresh();
  Moderation.block({ id: conv.other.id, name: conv.other.name });
  assert.equal(Conversations.send(conv.id, 'Bonjour'), false);
});

test('refuse un message dans une consultation expiree', () => {
  localStorage.clear();
  const conv = Conversations.openConsultation({ consultant: { id: 'pro', name: 'Pro' }, user: { email: 'guest@example.com' }, durationHours: -1 });
  assert.equal(Conversations.send(conv.id, 'Bonjour'), false);
});

test('compte les messages recus apres le dernier marqueur de lecture', () => {
  const conv = fresh();
  conv.lastReadAt = 10;
  conv.messages = [{ sender: 'other', sentAt: 11 }, { sender: 'me', sentAt: 12 }, { sender: 'other', sentAt: 13 }];
  assert.equal(Conversations.unreadCount(conv), 2);
});


test('envoie et conserve un message vocal', () => {
  const conv = fresh();
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => 0;
  try {
    assert.equal(Conversations.send(conv.id, '', { src: 'data:audio/webm;base64,YWJj', durationMs: 1200 }), true);
  } finally { globalThis.setTimeout = originalTimeout; }
  const message = Conversations.getById(conv.id).messages[0];
  assert.equal(message.type, 'audio');
  assert.equal(message.durationMs, 1200);
  assert.equal(message.audio, 'data:audio/webm;base64,YWJj');
});
