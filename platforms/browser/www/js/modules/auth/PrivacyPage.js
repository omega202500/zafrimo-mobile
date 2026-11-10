import Page from '../../core/Page.js';

export default class PrivacyPage extends Page {
  static route = '/privacy';
  static access = 'public';
  static tabs = false;

  render() {
    return `
      <section class="auth-page">
        <div class="hero"></div>
        <div class="content">
          ${this.header(this.t('privacy.title'), { back: true })}
          <div class="glass card">
            <h2>${this.t('privacy.title')}</h2>
            <p class="muted" style="margin-bottom: 16px;">${this.t('privacy.lastUpdated')}</p>

            <h3>${this.t('privacy.introTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('privacy.introText')}</p>

            <h3>${this.t('privacy.dataTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('privacy.dataText')}</p>

            <h3>${this.t('privacy.usageTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('privacy.usageText')}</p>

            <h3>${this.t('privacy.rightsTitle')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('privacy.rightsText')}</p>

            <h3>${this.t('privacy.contactTitle')}</h3>
            <p class="muted">${this.t('privacy.contactText')}</p>
          </div>
        </div>
      </section>
    `;
  }
}
