import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Consulting from '../../services/ConsultingService.js';
import { escapeHtml } from '../../core/Html.js';

const POLL_MS = 2000;
const POLL_MAX = 30; // 30 x 2 s = 1 minute

const ICON_OK = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const ICON_KO = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
const ICON_INFO = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

// Résultat du paiement (cahier 10.1 et 10.3) : l'état vient du serveur, jamais d'un simple clic.
export default class PaymentResultPage extends Page {
  static route = '/payment-result/:id';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.payment = null;
    this.timer = null;
    this.tries = 0;
    this.slow = false;
  }

  async onEnter() {
    this.payment = Consulting.getMyPayment(this.params.id, Auth.user());
  }

  onMounted() {
    this.onLeave(); // évite les doublons si la page est redessinée
    if (this.payment && this.payment.status === 'pending' && !this.slow) {
      this.startPolling();
    }
  }

  onLeave() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  startPolling() {
    this.timer = setInterval(() => {
      this.tries += 1;
      const fresh = Consulting.getMyPayment(this.params.id, Auth.user());
      if (!fresh) return;
      this.payment = fresh;

      if (fresh.status !== 'pending') {
        this.onLeave();
        this.reRender();
      } else if (this.tries >= POLL_MAX) {
        this.onLeave();
        this.slow = true;
        this.reRender();
      }
    }, POLL_MS);
  }

  // Écran d'état commun
  state({ icon, tone, title, text, extra = '', buttons = '' }) {
    return `
      <section class="pay-state">
        ${icon ? `<div class="pay-icon ${tone}">${icon}</div>` : '<div class="pay-spinner"></div>'}
        <h1 style="font-size: 24px;">${title}</h1>
        <p class="muted" style="max-width: 320px; line-height: 1.6;">${text}</p>
        ${extra}
        ${buttons}
      </section>
    `;
  }

  summary(p) {
    return `
      <div class="glass card">
        <div class="row" style="margin-bottom: 8px;">
          <span class="muted">${this.t('payResult.reference')}</span>
          <strong>${escapeHtml(p.reference)}</strong>
        </div>
        <div class="row" style="margin-bottom: 8px;">
          <span class="muted">${this.t('payResult.consultant')}</span>
          <strong>${escapeHtml(p.consultantName)}</strong>
        </div>
        <div class="row">
          <span class="muted">${this.t('payResult.amount')}</span>
          <span class="price">${Consulting.formatMoney(p.amountCents)}</span>
        </div>
      </div>
    `;
  }

  render() {
    const p = this.payment;

    if (!p) {
      return this.state({
        icon: ICON_INFO,
        tone: 'neutral',
        title: this.t('payResult.notFound'),
        text: '',
        buttons: `<button class="btn btn-lime" data-go="/listings">${this.t('payResult.backListings')}</button>`
      });
    }

    const toPayments = `<button class="btn btn-glass" data-go="/my-payments">${this.t('payResult.myPayments')}</button>`;
    const retry = `<button class="btn btn-lime" data-go="/payment/${encodeURIComponent(p.consultantId)}">${this.t('payResult.retry')}</button>`;

    if (p.status === 'paid') {
      const open = p.conversationId
        ? `<button class="btn btn-lime" data-go="/consultation/${encodeURIComponent(p.conversationId)}">${this.t('payResult.openChat')}</button>`
        : '';
      return this.state({
        icon: ICON_OK,
        tone: 'ok',
        title: this.t('payResult.paidTitle'),
        text: this.t('payResult.paidText'),
        extra: this.summary(p),
        buttons: open + toPayments
      });
    }

    if (p.status === 'failed') {
      return this.state({
        icon: ICON_KO,
        tone: 'ko',
        title: this.t('payResult.failedTitle'),
        text: this.t('payResult.failedText'),
        extra: this.summary(p),
        buttons: retry + toPayments
      });
    }

    if (p.status === 'cancelled') {
      return this.state({
        icon: ICON_INFO,
        tone: 'neutral',
        title: this.t('payResult.cancelledTitle'),
        text: this.t('payResult.cancelledText'),
        buttons: retry + `<button class="btn btn-glass" data-go="/listings">${this.t('payResult.backListings')}</button>`
      });
    }

    if (p.status === 'refunded') {
      return this.state({
        icon: ICON_INFO,
        tone: 'neutral',
        title: this.t('payStatus.refunded'),
        text: '',
        extra: this.summary(p),
        buttons: toPayments
      });
    }

    // 'pending' : on attend la confirmation du serveur
    return this.state({
      icon: this.slow ? ICON_INFO : '',
      tone: 'neutral',
      title: this.t(this.slow ? 'payResult.slowTitle' : 'payResult.pendingTitle'),
      text: this.t(this.slow ? 'payResult.slowText' : 'payResult.pendingText'),
      buttons: toPayments
    });
  }
}