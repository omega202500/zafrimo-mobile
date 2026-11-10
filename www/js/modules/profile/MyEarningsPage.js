import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Consulting from '../../services/ConsultingService.js';
import { escapeHtml } from '../../core/Html.js';

export default class MyEarningsPage extends Page {
  static route = '/my-earnings';
  static access = 'consultant';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.data = null;
  }

  async onEnter() {
    this.data = Consulting.earnings(Auth.user());
  }

  render() {
    const header = this.header(this.t('profile.myEarnings'), { back: true });
    const d = this.data;
    const money = (cents) => Consulting.formatMoney(cents);

    if (!d || (d.payments.length === 0 && d.payouts.length === 0)) {
      return `
        <section>
          ${header}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <h3>${this.t('myEarnings.noEarnings')}</h3>
            <p class="muted">${this.t('myEarnings.noEarningsDesc')}</p>
          </div>
        </section>
      `;
    }

    const ratePercent = d.payments.length > 0
      ? Math.round((d.payments[0].commissionRate || 0) * 100)
      : 0;

    return `
      <section>
        ${header}

        <div class="stat-grid">
          <div class="glass card stat">
            <div class="stat-label">${this.t('myEarnings.gross')}</div>
            <div class="stat-value">${money(d.grossCents)}</div>
          </div>
          <div class="glass card stat">
            <div class="stat-label">${this.t('myEarnings.commission').replace('{n}', String(ratePercent))}</div>
            <div class="stat-value">− ${money(d.commissionCents)}</div>
          </div>
          <div class="glass card stat">
            <div class="stat-label">${this.t('myEarnings.net')}</div>
            <div class="stat-value">${money(d.netCents)}</div>
          </div>
          <div class="glass card stat">
            <div class="stat-label">${this.t('myEarnings.paidOut')}</div>
            <div class="stat-value">${money(d.paidOutCents)}</div>
          </div>
          <div class="glass card stat accent stat-wide">
            <div class="stat-label">${this.t('myEarnings.toPay')}</div>
            <div class="stat-value">${money(d.toPayCents)}</div>
          </div>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 8px;">${this.t('myEarnings.lastTitle')}</h3>
          ${d.payments.length === 0 ? `<p class="muted">${this.t('myEarnings.noEarnings')}</p>` : d.payments.slice(0, 20).map(p => `
            <div class="earn-row">
              <div style="min-width: 0;">
                <div style="font-weight: 600;">${escapeHtml(p.reference)}</div>
                <div class="payment-row-meta">${Consulting.formatDate(p.paidAt)}</div>
              </div>
              <div style="text-align: right;">
                <div class="price" style="font-size: 16px;">${money(p.netCents)}</div>
                <div class="payment-row-meta">${money(p.amountCents)}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 8px;">${this.t('myEarnings.payoutsTitle')}</h3>
          ${d.payouts.length === 0 ? `<p class="muted">${this.t('myEarnings.noPayouts')}</p>` : d.payouts.map(po => `
            <div class="earn-row">
              <div style="min-width: 0;">
                <div style="font-weight: 600;">${escapeHtml(po.note || this.t('myEarnings.payoutNote'))}</div>
                <div class="payment-row-meta">${Consulting.formatDate(po.date)}</div>
              </div>
              <span class="price" style="font-size: 16px;">${money(po.amountCents)}</span>
            </div>
          `).join('')}
          <p class="muted" style="margin-top: 12px; font-size: 13px;">${this.t('myEarnings.payoutsInfo')}</p>
        </div>
      </section>
    `;
  }
}