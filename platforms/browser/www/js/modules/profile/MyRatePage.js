import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Consulting from '../../services/ConsultingService.js';
import settings from '../../mocks/settings.js';

// Tarif d'une consultation, fixé par le consultant dans la fourchette de l'administrateur (cahier 10.1 et 20)
export default class MyRatePage extends Page {
  static route = '/my-rate';
  static access = 'consultant';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.user = null;
    this.message = '';
    this.error = '';
  }

  async onEnter() {
    this.user = Auth.user();
  }

  render() {
    if (!this.user) {
      return `<section><div class="glass card"><p class="muted">${this.t('common.loading')}</p></div></section>`;
    }

    const min = settings.minConsultationPrice;
    const max = settings.maxConsultationPrice;
    const hours = String(settings.consultationDurationHours);
    const current = Number(this.user.rate) > 0 ? Number(this.user.rate) : settings.defaultConsultationPrice;

    return `
      <section>
        ${this.header(this.t('profile.myRate'), { back: true })}

        <div class="glass card" style="text-align: center; padding: 24px;">
          <h3>${this.t('myRate.currentRate')}</h3>
          <div class="price" style="font-size: 32px; margin: 12px 0 4px;">${Consulting.formatMoney(Math.round(current * 100))}</div>
          <p class="muted" style="font-size: 13px; margin-bottom: 12px;">${this.t('consultant.price')} · ${this.t('consultant.duration').replace('{n}', hours)}</p>
          <p class="muted">${this.t('myRate.rateDesc').replace('{n}', hours)}</p>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 16px;">${this.t('myRate.changeRate')}</h3>
          <input id="rateInput" class="field" type="number" min="${min}" max="${max}" step="1" inputmode="decimal" value="${current}" placeholder="${this.t('myRate.newRate')}">
          <p class="muted" style="font-size: 13px; margin-bottom: 12px;">${this.t('myRate.range').replace('{min}', String(min)).replace('{max}', String(max))}</p>
          ${this.error ? `<p class="pay-error">${this.error}</p>` : ''}
          ${this.message ? `<p style="color: var(--lime); font-size: 14px; margin-bottom: 12px;">${this.message}</p>` : ''}
          <button class="btn btn-lime" id="saveRateBtn">${this.t('myRate.save')}</button>
        </div>
      </section>
    `;
  }

  bindEvents() {
    const saveBtn = this.el.querySelector('#saveRateBtn');
    const input = this.el.querySelector('#rateInput');
    if (!saveBtn || !input) return;

    saveBtn.onclick = async () => {
      const value = parseFloat(input.value);
      const min = settings.minConsultationPrice;
      const max = settings.maxConsultationPrice;

      this.message = '';
      if (isNaN(value) || value < min || value > max) {
        this.error = this.t('myRate.range').replace('{min}', String(min)).replace('{max}', String(max));
        this.reRender();
        return;
      }

      this.error = '';
      saveBtn.disabled = true;
      saveBtn.classList.add('loading');
      // TODO API : PUT /me/consultant-rate
      await Auth.updateRate(value);
      this.user = Auth.user();
      this.message = this.t('myRate.savedSuccess');
      this.reRender();
    };
  }
}