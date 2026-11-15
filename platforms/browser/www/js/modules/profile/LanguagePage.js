import Page from '../../core/Page.js';
import I18n from '../../services/I18nService.js';

// Langue de l'interface : italien par défaut, architecture prête pour d'autres langues (cahier section 4)
export default class LanguagePage extends Page {
  static route = '/language';
  static access = 'public';
  static tabs = false;

  render() {
    const current = I18n.getCurrentLang();

    return `
      <section>
        ${this.header(this.t('language.title'), { back: true })}
        <p class="muted" style="margin: 0 4px 14px;">${this.t('language.note')}</p>
        ${I18n.getAvailableLangs().map(lang => `
          <button type="button" class="lang-row ${lang === current ? 'on' : ''}" data-lang="${lang}">
            <span>${I18n.getLangName(lang)}</span>
            <span>${lang === current ? '✓' : ''}</span>
          </button>
        `).join('')}
      </section>
    `;
  }

  bindEvents() {
    this.el.querySelectorAll('[data-lang]').forEach(btn => {
      btn.onclick = async () => {
        await I18n.load(btn.dataset.lang);
        document.documentElement.lang = btn.dataset.lang;
        this.reRender();
      };
    });
  }
}