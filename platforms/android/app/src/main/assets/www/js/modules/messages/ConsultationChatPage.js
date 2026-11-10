import Page from '../../core/Page.js';
import ConversationService from '../../services/ConversationService.js';
import Moderation from '../../services/ModerationService.js';
import ChatView from '../../components/ChatView.js';

// provisoire : à fixer par l'administrateur, voir cahier section 20
const WARN_MINUTES = 10;

export default class ConsultationChatPage extends Page {
  static route = '/consultation/:id';
  static access = 'auth';
  static tabs = false;
  static fullscreen = true;

  constructor(app, params = {}) {
    super(app, params);
    this.conv = null;
    this.view = null;
    this.unsubscribe = null;
    this.timerInterval = null;
  }

  async onEnter() {
    this.conv = ConversationService.getById(this.params.id);
    if (this.conv) ConversationService.markRead(this.conv.id);
  }

  onMounted() {
    if (!this.conv) return;

    // Sécurité : si la page est redessinée, on coupe l'ancien abonnement et l'ancien timer
    this.onLeave();

    const t = this.t.bind(this);
    const expired = ConversationService.isExpired(this.conv);
    const blocked = Moderation.isBlocked(this.conv.other?.id);

    this.view = new ChatView({ conv: this.conv, isExpired: expired, isBlocked: blocked, t });

    this.view.bindEvents(this.el, (text) => ConversationService.send(this.conv.id, text));
    this.view.scrollToBottom(this.el);

    ChatView.bindModeration(this.el, this.conv, {
      t,
      goTo: (path) => this.app.router.go(path),
      onChanged: () => this.reRender()
    });

    this.unsubscribe = ConversationService.onMessage(this.conv.id, (m) => this.onNewMessage(m));

    // Le DOM existe : on peut lancer le compte à rebours
    this.updateTimerDisplay();
    if (!expired) {
      this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
    }
  }

  onLeave() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  onNewMessage(message) {
    if (!this.conv || !this.view) return;
    this.view.appendMessage(this.el, message);
    ConversationService.markRead(this.conv.id);
  }

  updateTimerDisplay() {
    if (!this.conv || !this.el) return;
    const timerEl = this.el.querySelector('#timerDisplay');
    if (!timerEl) return;

    const remainingMs = ConversationService.remainingMs(this.conv);

    if (remainingMs <= 0) {
      timerEl.textContent = this.t('consultation.expired');
      timerEl.className = 'done';
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.lockInput();
      return;
    }

    const totalMinutes = Math.floor(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    timerEl.textContent = `${hours}h ${minutes}min ${seconds}s`;
    timerEl.className = totalMinutes <= WARN_MINUTES ? 'warn' : '';
  }

  // Fin de consultation : lecture seule, historique conservé
  lockInput() {
    const box = this.el.querySelector('.chat-input');
    if (box) {
      box.innerHTML = `<p class="muted chat-ended">${this.t('consultation.ended')}</p>`;
    }
  }

  render() {
    if (!this.conv) {
      return `
        <section>
          ${this.header(this.t('consultation.chatTitle'), { back: true })}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('chat.notFound')}</p>
          </div>
        </section>`;
    }

    const c = this.conv;
    const view = new ChatView({
      conv: c,
      isExpired: ConversationService.isExpired(c),
      isBlocked: Moderation.isBlocked(c.other?.id),
      t: this.t.bind(this)
    });

    return `
      <section class="chat-page">
        ${ChatView.header(c, this.t.bind(this))}

        <div class="glass card chat-timer">
          <span class="muted">${this.t('consultation.timeRemaining')} : </span>
          <strong id="timerDisplay">--</strong>
        </div>

        ${view.render()}
      </section>
    `;
  }
}