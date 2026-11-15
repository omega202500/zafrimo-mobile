import Page from '../../core/Page.js';

export default class TermsPage extends Page {
  static route = '/terms';
  static access = 'public';
  static tabs = false;

  render() {
    return `
      <section class="auth-page">
        <div class="hero"></div>
        <div class="content">
          ${this.header(this.t('terms.title'), { back: true })}
          <div class="glass card">
            <h2>${this.t('terms.title')}</h2>
            <p class="muted" style="margin-bottom: 16px;">${this.t('terms.lastUpdated')}</p>

            <h3>${this.t('terms.introTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('terms.introText')}</p>

            <h3>${this.t('terms.servicesTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('terms.servicesText')}</p>

            <h3>${this.t('terms.responsibilitiesTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('terms.responsibilitiesText')}</p>

            <h3>${this.t('terms.contentTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('terms.contentText')}</p>

            <h3>${this.t('terms.liabilityTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('terms.liabilityText')}</p>

            <h3>${this.t('terms.contactTitle')}</h3>
            <p class="muted">${this.t('terms.contactText')}</p>
          </div>
        </div>
      </section>
    `;
  }
}
