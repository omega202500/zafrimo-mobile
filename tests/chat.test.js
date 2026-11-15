import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { dispatchEvent() {} };
const { default: ChatView } = await import('../www/js/components/ChatView.js');

test('l’en-tête du chat utilise la fonction de traduction fournie', () => {
  const html = ChatView.header({ other: { name: 'Propriétaire' } }, key => key);
  assert.match(html, /aria-label="common\.back"/);
  assert.match(html, /Propriétaire/);
});

test('le chat expose le bouton micro et le lecteur audio', () => {
  const view = new ChatView({ conv: { messages: [] }, t: key => key });
  assert.match(view.renderInput(), /id="voiceBtn"/);
  assert.match(view.renderInput(), /id="voicePause"/);
  assert.match(view.renderInput(), /id="voiceSend"/);
  assert.match(view.renderInput(), /class="voice-wave"/);
  assert.match(view.renderMessage({ id: 'v1', sender: 'me', type: 'audio', audio: 'data:audio/webm;base64,YWJj', sentAt: Date.now() }), /<audio/);
});

test('le bouton envoyer arrete et envoie directement un enregistrement actif ou en pause', () => {
  for (const state of ['recording', 'paused']) {
    const nodes = Object.fromEntries(['chatInput','sendBtn','voiceBtn','voiceStatus','voiceCancel','voicePause','voiceSend'].map(id => [id, {}]));
    const root = { querySelector: selector => nodes[selector.slice(1)] };
    const view = new ChatView({ conv: { messages: [] }, t: key => key });
    view.bindEvents(root, () => true);
    let stopped = false;
    view.mediaRecorder = { state, stop() { stopped = true; } };
    nodes.voiceSend.onclick();
    assert.equal(stopped, true, 'Envoyer doit arreter le micro puis declencher l?envoi sans pause prealable');
  }
});
