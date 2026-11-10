import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';

export default class MyPaymentsPage extends Page {
  static route = '/my-payments';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.user = null;
  }

  async onEnter() {
    this.user = Auth.user();
  }

  render() {
    if (!this.user) {
      return `<section><div class="glass card"><p class="muted">${this.t('common.loading')}</p></div></section>`;
    }

    return `
      <section>
        ${this.header(this.t('profile.myPayments'), { back: true })}
        <div class="glass card" style="text-align: center; padding: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">💳</div>
          <h3>${this.t('myPayments.noPayments')}</h3>
          <p class="muted">${this.t('myPayments.noPaymentsDesc')}</p>
        </div>
      </section>
    `;
  }
}
