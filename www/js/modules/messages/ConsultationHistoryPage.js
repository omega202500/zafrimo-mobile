import Page from '../../core/Page.js';
import ConversationService from '../../services/ConversationService.js';
import { escapeHtml } from '../../core/Html.js';

const DEFAULT_AVATAR = 'assets/img/owner-avatar.webp';

// Historique des consultations : actives puis terminées
export default class ConsultationHistoryPage extends Page {
  static route = '/consultations';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.consultations = [];
  }

  async onEnter() {
    this.consultations = ConversationService.consultations();
  }

  render() {
    const header = this.header(this.t('consultation.historyTitle'), { back: true });

    if (this.consultations.length === 0) {
      return `
        <section>
          ${header}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <div style="font-size: 48px; margin-bottom: 12px;">💬</div>
            <h3>${this.t('consultation.noConsultations')}</h3>
            <p class="muted">${this.t('consultation.noConsultationsDesc')}</p>
          </div>
        </section>`;
    }

    const active = this.consultations.filter(c => !ConversationService.isExpired(c));
    const expired = this.consultations.filter(c => ConversationService.isExpired(c));

    return `
      <section>
        ${header}

        ${active.length > 0 ? `
          <h3 style="margin: 16px 0 12px 0;">${this.t('consultation.active')} (${active.length})</h3>
          ${active.map(c => this.renderConsultationCard(c, true)).join('')}
        ` : ''}

        ${expired.length > 0 ? `
          <h3 style="margin: 24px 0 12px 0;">${this.t('consultation.terminated')} (${expired.length})</h3>
          ${expired.map(c => this.renderConsultationCard(c, false)).join('')}
        ` : ''}
      </section>
    `;
  }

  renderConsultationCard(conv, isActive) {
    const remainingMs = ConversationService.remainingMs(conv);
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

    let timeText = this.t('consultation.expired');
    if (isActive) timeText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

    const last = conv.messages[conv.messages.length - 1];
    const preview = last ? (last.text.length > 50 ? last.text.slice(0, 50) + '…' : last.text) : '';

    return `
      <div class="glass card conv-item" data-go="/consultation/${encodeURIComponent(String(conv.id))}">
        <div class="conv-avatar-wrap">
          <img class="conv-avatar ${isActive ? 'online' : ''}" src="${escapeHtml(conv.other?.photo || DEFAULT_AVATAR)}" alt="">
        </div>
        <div class="conv-main">
          <div class="conv-top">
            <span class="conv-name">${escapeHtml(conv.other?.name || '')}</span>
            <span class="status-pill ${isActive ? 'published' : ''}">${this.t('consultation.badge')}</span>
          </div>
          <p class="muted conv-preview">${escapeHtml(preview)}</p>
          <div class="conv-top" style="margin: 4px 0 0;">
            <span class="conv-time">${last ? ConversationService.formatTime(last.sentAt) : ''}</span>
            <span class="conv-time" style="color: ${isActive ? 'var(--lime)' : 'var(--text-2)'}; font-weight: 500;">${timeText}</span>
          </div>
        </div>
      </div>
    `;
  }
}