import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import I18n from '../../services/I18nService.js';
import { escapeHtml } from '../../core/Html.js';

export default class SettingsPage extends Page {
  static route = '/settings';
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
        ${this.header(this.t('profile.settings'), { back: true })}

        <div class="glass card">
          <h3 style="margin-bottom: 16px;">${this.t('settings.account')}</h3>
          <div class="menu-item">
            <span>📧</span>
            <span>${this.t('settings.email')}</span>
            <span class="muted">${escapeHtml(this.user.email)}</span>
          </div>
          <div class="menu-item" data-go="/change-password">
            <span>🔑</span>
            <span>${this.t('settings.changePassword')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/settings/blocked">
            <span>🚫</span>
            <span>${this.t('settings.blocked')}</span>
            <span>›</span>
          </div>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 16px;">${this.t('settings.preferences')}</h3>
          <div class="menu-item" data-go="/settings/notifications">
            <span>🔔</span>
            <span>${this.t('settings.notifications')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/language">
            <span>🌐</span>
            <span>${this.t('settings.language')}</span>
            <span class="muted">${I18n.getLangName(I18n.getCurrentLang())}</span>
            <span>›</span>
          </div>
        </div>

                <div class="glass card">
          <h3 style="margin-bottom: 16px;">${this.t('settings.help')}</h3>
          <div class="menu-item" data-go="/faq">
            <span>❓</span>
            <span>${this.t('faq.title')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/support">
            <span>🛟</span>
            <span>${this.t('support.title')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/about">
            <span>ℹ️</span>
            <span>${this.t('about.title')}</span>
            <span>›</span>
          </div>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 16px;">${this.t('settings.legal')}</h3>
          <div class="menu-item" data-go="/privacy">
            <span>📄</span>
            <span>${this.t('privacy.title')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/terms">
            <span>📋</span>
            <span>${this.t('terms.title')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/sales-terms">
            <span>🧾</span>
            <span>${this.t('salesTerms.title')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/legal">
            <span>⚖️</span>
            <span>${this.t('legal.title')}</span>
            <span>›</span>
          </div>
        </div>

        <button class="btn btn-danger" id="deleteAccount">
          ${this.t('settings.deleteAccount')}
        </button>
      </section>
    `;
  }

  bindEvents() {
    const deleteBtn = this.el.querySelector('#deleteAccount');
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        this.app.router.go('/settings/delete');
      };
    }
  }
}