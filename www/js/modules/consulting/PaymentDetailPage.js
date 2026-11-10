import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Consulting from '../../services/ConsultingService.js';
import ConversationService from '../../services/ConversationService.js';
import settings from '../../mocks/settings.js';
import { escapeHtml } from '../../core/Html.js';

// Détail d'un paiement côté client (cahier 10.5 et 10.6)
export default class PaymentDetailPage extends Page {
  static route = '/my-payments/:id';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.payment = null;
    this.conv = null;
  }

  async onEnter() {
    this.payment = Consulting.getMyPayment(this.params.id, Auth.user());
    this.conv = this.payment && this.payment.conversationId
      ? ConversationService.getById(this.payment.conversationId)
      : null;
  }

  render() {
    const header = this.header(this.t('payDetail.title'), { back: true });
    const p = this.payment;

    if (!p) {
      return `
        <section>
          ${header}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('payResult.notFound')}</p>
          </div>
        </section>`;
    }

    const row = (label, value) => `
      <div class="row" style="margin-bottom: 10px;">
        <span class="muted">${label}</span>
        <strong>${value}</strong>
      </div>`;

    return `
      <section>
        ${header}

        <div class="glass card">
          <div class="row" style="margin-bottom: 14px;">
            <span class="price" style="font-size: 26px;">${Consulting.formatMoney(p.amountCents)}</span>
            <span class="status-pill ${p.status}">${this.t('payStatus.' + p.status)}</span>
          </div>
          ${row(this.t('payResult.reference'), escapeHtml(p.reference))}
          ${row(this.t('payResult.consultant'), escapeHtml(p.consultantName))}
          ${row(this.t('payDetail.date'), Consulting.formatDate(p.createdAt))}
          ${row(this.t('payDetail.method'), this.t('pay.method.' + p.method))}
          ${row(this.t('pay.duration'), this.t('pay.durationValue').replace('{n}', String(p.durationHours)))}
        </div>

        ${p.status === 'pending' ? `
        <div class="glass card"><p class="muted">${this.t('payDetail.pendingHint')}</p></div>` : ''}

        ${p.status === 'paid' && this.conv ? `
        <button class="btn btn-lime" data-go="/consultation/${encodeURIComponent(this.conv.id)}">${this.t('payResult.openChat')}</button>` : ''}

        <div class="glass card">
          <h3 style="margin-bottom: 8px;">${this.t('payDetail.refundTitle')}</h3>
          <p class="muted" style="margin-bottom: 14px;">${this.t('payDetail.refundText')}</p>
          <a class="btn btn-glass" style="text-decoration: none;" href="mailto:${escapeHtml(settings.supportEmail || '')}?subject=${encodeURIComponent(p.reference)}">${this.t('payDetail.contact')}</a>
          <button class="btn btn-glass" data-go="/sales-terms" style="margin-bottom: 0;">${this.t('payDetail.termsLink')}</button>
        </div>
      </section>
    `;
  }
}