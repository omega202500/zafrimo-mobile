import Page from '../../core/Page.js';
import Content from '../../services/ContentService.js';
import { escapeHtml } from '../../core/Html.js';

// Documents et aide, regroupés sur une page
const LINKS = [
  { path: '/faq', icon: '❓', labelKey: 'faq.title' },
  { path: '/support', icon: '🛟', labelKey: 'support.title' },
  { path: '/terms', icon: '📋', labelKey: 'terms.title' },
  { path: '/privacy', icon: '📄', labelKey: 'privacy.title' },
  { path: '/sales-terms', icon: '🧾', labelKey: 'salesTerms.title' },
  { path: '/legal', icon: '⚖️', labelKey: 'legal.title' }
];

export default class AboutPage extends Page {
  static route = '/about';
  static access = 'public';
  static tabs = false;

  render() {
    const info = Content.appInfo();

    return `
      <section>
        ${this.header(this.t('about.title'), { back: true })}

        <div class="glass card about-hero">
          <img class="about-logo" src="assets/img/logo.svg" alt="${escapeHtml(info.name)}">
          <h2>${escapeHtml(info.name)}</h2>
          <p class="muted">${this.t('about.text')}</p>
          <p class="muted" style="font-size: 13px;">${this.t('about.version')} ${escapeHtml(info.version)}</p>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 16px;">${this.t('about.documents')}</h3>
          ${LINKS.map(link => `
            <div class="menu-item" data-go="${link.path}">
              <span>${link.icon}</span>
              <span>${this.t(link.labelKey)}</span>
              <span>›</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }
}