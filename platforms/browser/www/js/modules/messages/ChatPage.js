import Page from '../../core/Page.js';
import ConversationService from '../../services/ConversationService.js';
import Moderation from '../../services/ModerationService.js';
import ChatView from '../../components/ChatView.js';
import { escapeHtml } from '../../core/Html.js';

export default class ChatPage extends Page {
  static route = '/chat/:id';
  static access = 'auth';
  static tabs = false;
  static fullscreen = true;

  constructor(app, params = {}) {
    super(app, params);
    this.conv = null;
    this.view = null;
    this.unsubscribe = null;
  }

  async onEnter() {
    this.conv = ConversationService.getById(this.params.id);
    if (this.conv) ConversationService.markRead(this.conv.id);
  }

  onMounted() {
    if (!this.conv) return;

    // Sécurité : si la page est redessinée, on évite de cumuler les abonnements
    this.onLeave();

    const t = this.t.bind(this);
    const blocked = Moderation.isBlocked(this.conv.other?.id);

    this.view = new ChatView({ conv: this.conv, isExpired: false, isBlocked: blocked, t });

    // Envoi : le service prévient les écouteurs, l'affichage se fait dans onNewMessage
    this.view.bindEvents(this.el, (text) => ConversationService.send(this.conv.id, text));
    this.view.scrollToBottom(this.el);

    // Menu "⋯" (profil, bloquer, signaler) et bouton "Débloquer"
    ChatView.bindModeration(this.el, this.conv, {
      t,
      goTo: (path) => this.app.router.go(path),
      onChanged: () => this.reRender()
    });

    this.unsubscribe = ConversationService.onMessage(this.conv.id, (m) => this.onNewMessage(m));
  }

  onLeave() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  onNewMessage(message) {
    if (!this.conv || !this.view) return;
    this.view.appendMessage(this.el, message);
    ConversationService.markRead(this.conv.id);
  }

  render() {
    if (!this.conv) {
      return `
        <section>
          ${this.header(this.t('chat.title'), { back: true })}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('chat.notFound')}</p>
          </div>
        </section>`;
    }

    const c = this.conv;
    const view = new ChatView({
      conv: c,
      isExpired: false,
      isBlocked: Moderation.isBlocked(c.other?.id),
      t: this.t.bind(this)
    });

    return `
      <section class="chat-page">
        ${ChatView.header(c, this.t.bind(this))}

        ${c.listingTitle ? `
          <div class="glass card row chat-listing" data-go="/listings/${encodeURIComponent(String(c.listingId || ''))}">
            <span>${escapeHtml(c.listingTitle)}</span>
            <button class="chip on" type="button">${this.t('chat.viewListing')}</button>
          </div>
        ` : ''}

        ${view.render()}
      </section>
    `;
  }
}