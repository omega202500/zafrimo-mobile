import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import I18n from '../../services/I18nService.js';

export default class WelcomePage extends Page {
  static route = '/welcome';
  static access = 'public';
  static tabs = false;

  async onEnter() {
    if (Auth.isLogged()) {
      this.app.router.go('/listings');
    }
  }

  render() {
    // Italien seul sur l'accueil : on masque les boutons FR et EN tout en conservant l'architecture de traduction
    const currentLang = I18n.getCurrentLang();
    const visibleLangs = I18n.getAvailableLangs().filter(lang => lang === 'it');

    return `
      <section class="welcome">
        ${visibleLangs.length > 1 ? `
        <div class="lang-selector">
          ${visibleLangs.map(lang => `
            <button class="lang-btn ${lang === currentLang ? 'active' : ''}" data-lang="${lang}">
              ${lang.toUpperCase()}
            </button>
          `).join('')}
        </div>
        ` : ''}
        <div class="hero"></div>
        <h1>${this.t('welcome.title')}</h1>
        <p class="muted">${this.t('welcome.sub')}</p>
        <div class="pagination">
          <div class="dot active"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <button class="btn btn-lime" data-go="/register">${this.t('welcome.start')}</button>
        <button class="btn btn-glass" data-go="/login">${this.t('welcome.login')}</button>
      </section>
    `;
  }

  bindEvents() {
    const langBtns = this.el.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
      btn.onclick = async () => {
        await I18n.setLang(btn.dataset.lang);
      };
    });
  }
}
