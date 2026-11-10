import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Consulting from '../../services/ConsultingService.js';
import { escapeHtml } from '../../core/Html.js';

export default class PaymentPage extends Page {
  static route = '/payment/:id';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.quote = null;
    this.method = 'card';
    this.accepted = false;
    this.busy = false;
  }

  async onEnter() {
    this.quote = Consulting.getQuote(this.params.id);
  }

  render() {
    const header = this.header(this.t('pay.title'), { back: true });

    // Consultant introuvable : jamais de repli sur un autre consultant
    if (!this.quote) {
      return `
        <section>
          ${header}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('consultant.notFound')}</p>
          </div>
        </section>`;
    }

    const { consultant: c, amountCents, durationHours } = this.quote;
    const user = Auth.user();

    if (user && String(c.id) === 'u-' + user.email) {
      return `
        <section>
          ${header}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('consultant.own')}</p>
          </div>
        </section>`;
    }

    const total = Consulting.formatMoney(amountCents);

    return `
      <section>
        ${header}

        <div class="glass card">
          <div class="row" style="margin-bottom: 8px;">
            <span class="muted">${this.t('pay.service')}</span>
            <strong>${this.t('pay.serviceName')}</strong>
          </div>
          <div class="row" style="margin-bottom: 8px;">
            <span class="muted">${this.t('pay.consultant')}</span>
            <strong>${escapeHtml(c.name)}</strong>
          </div>
          <div class="row" style="margin-bottom: 8px;">
            <span class="muted">${this.t('pay.duration')}</span>
            <strong>${this.t('pay.durationValue').replace('{n}', String(durationHours))}</strong>
          </div>
          <div class="row" style="border-top: 1px solid var(--glass-line); padding-top: 10px; margin-top: 10px;">
            <span style="font-weight: 600;">${this.t('pay.total')}</span>
            <span class="price" style="font-size: 22px;">${total}</span>
          </div>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 12px;">${this.t('pay.methodTitle')}</h3>
          <div class="pay-methods">
            ${Consulting.paymentMethods().map(m => `
              <label class="pay-method">
                <input type="radio" name="method" value="${m}" ${m === this.method ? 'checked' : ''}>
                <span>${this.t('pay.method.' + m)}</span>
              </label>
            `).join('')}
          </div>
          <p class="muted pay-secure">${this.t('pay.secure')}</p>
        </div>

        <label class="pay-accept">
          <input type="checkbox" id="acceptTerms" ${this.accepted ? 'checked' : ''}>
          <span>${this.t('pay.accept')} <button type="button" class="pay-link" data-terms>${this.t('pay.viewTerms')}</button></span>
        </label>

        <p class="pay-error" id="payError"></p>

        <button class="btn btn-lime" id="payBtn" ${this.accepted ? '' : 'disabled'}>
          ${this.t('pay.button')} · ${total}
        </button>
      </section>
    `;
  }

  bindEvents() {
    const payBtn = this.el.querySelector('#payBtn');
    if (!payBtn) return;

    const accept = this.el.querySelector('#acceptTerms');
    const errorEl = this.el.querySelector('#payError');

    this.el.querySelectorAll('input[name="method"]').forEach(radio => {
      radio.onchange = () => { this.method = radio.value; };
    });

    accept.onchange = () => {
      this.accepted = accept.checked;
      payBtn.disabled = !this.accepted;
    };

    this.el.querySelector('[data-terms]').onclick = () => this.app.router.go('/sales-terms');

    payBtn.onclick = async () => {
      if (!this.accepted || this.busy) return;
      this.busy = true;
      payBtn.disabled = true;
      payBtn.classList.add('loading');
      errorEl.textContent = '';

      try {
        // TODO API :
        //   1. POST /consultations/checkout { consultantId, method } -> { paymentId, checkoutUrl }
        //   2. ouvrir checkoutUrl (Stripe Checkout / PayPal) avec cordova.InAppBrowser
        //   3. la confirmation arrive par webhook : la page de résultat interroge le serveur
        await new Promise(resolve => setTimeout(resolve, 700)); // simulation
        const payment = Consulting.createCheckout({
          consultantId: this.quote.consultant.id,
          method: this.method
        });
        this.app.router.go('/payment-result/' + encodeURIComponent(payment.id));
      } catch (err) {
        errorEl.textContent = this.t(err.message === 'own-consultant' ? 'consultant.own' : 'pay.error');
        this.busy = false;
        payBtn.disabled = !this.accepted;
        payBtn.classList.remove('loading');
      }
    };
  }
}