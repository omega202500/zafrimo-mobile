import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Content from '../../services/ContentService.js';
import settings from '../../mocks/settings.js';
import { escapeHtml } from '../../core/Html.js';

// Assistance : contact officiel du titulaire de l'app (cahier section 20)
export default class SupportPage extends Page {
  static route = '/support';
  static access = 'public';
  static tabs = false;

  // Lien mailto avec les informations utiles au support
  mailtoHref() {
    const user = Auth.user();
    const platform = (window.cordova && window.cordova.platformId) || 'web';
    const lines = [
      '',
      '',
      '---',
      this.t('support.bodyDescribe'),
      user ? `${this.t('support.bodyAccount')}: ${user.email}` : '',
      `${this.t('support.bodyVersion')}: ${Content.appInfo().version} (${platform})`
    ].filter((line, index) => line !== '' || index < 2);

    const subject = 'ZAFrimo - ' + this.t('support.subject');
    return `mailto:${escapeHtml(settings.supportEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  }

  render() {
    return `
      <section>
        ${this.header(this.t('support.title'), { back: true })}

        <div class="glass card support-hero">
          <div style="font-size: 48px;">🛟</div>
          <h3>${this.t('support.title')}</h3>
          <p class="muted">${this.t('support.intro')}</p>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 8px;">${this.t('support.beforeTitle')}</h3>
          <p class="muted" style="margin-bottom: 14px;">${this.t('support.beforeText')}</p>
          <button class="btn btn-glass" data-go="/faq" style="margin-bottom: 0;">${this.t('support.faqButton')}</button>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 8px;">${this.t('support.writeTitle')}</h3>
          <p class="muted" style="margin-bottom: 14px;">${this.t('support.writeText')}</p>
          <div class="info-row" style="margin-bottom: 14px;">
            <span class="muted">${this.t('support.emailLabel')}</span>
            <strong>${escapeHtml(settings.supportEmail || '')}</strong>
          </div>
          <a class="btn btn-lime support-btn" href="${this.mailtoHref()}" style="margin-bottom: 0;">${this.t('support.writeButton')}</a>
        </div>
      </section>
    `;
  }
}