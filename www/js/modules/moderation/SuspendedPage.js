import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import settings from '../../mocks/settings.js';
import { escapeHtml } from '../../core/Html.js';

const LOCK_ICON = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
</svg>`;

export default class SuspendedPage extends Page {
  static route = '/suspended';
  static access = 'public'; // public pour éviter une boucle de redirection avec la garde du Router
  static tabs = false;

  render() {
    return `
      <section class="suspended">
        <div class="suspended-icon">${LOCK_ICON}</div>
        <h1>${this.t('suspended.title')}</h1>
        <p class="muted">${this.t('suspended.text')}</p>
        <a class="btn btn-lime" href="mailto:${escapeHtml(settings.supportEmail || '')}">${this.t('suspended.contact')}</a>
        <button type="button" class="btn btn-glass" id="logoutBtn">${this.t('profile.logout')}</button>
      </section>
    `;
  }

  bindEvents() {
    this.el.querySelector('#logoutBtn').onclick = () => {
      Auth.logout();
      this.app.router.go('/welcome');
    };
  }
}