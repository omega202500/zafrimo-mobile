import Storage from './StorageService.js';

class I18nService {
  constructor() {
    this.dict = {};
    this.currentLang = Storage.get('lang') || 'it';
    this.availableLangs = ['it', 'fr', 'en'];
    this.langNames = {
      'it': 'Italiano',
      'fr': 'Français',
      'en': 'English'
    };
  }

  async load(lang) {
    if (!this.availableLangs.includes(lang)) {
      lang = 'it';
    }
    this.currentLang = lang;
    Storage.set('lang', lang);
    this.dict = await (await fetch(`js/locales/${lang}.json`)).json();
  }

  t(key) { return this.dict[key] ?? key; }

  getCurrentLang() { return this.currentLang; }

  getAvailableLangs() { return this.availableLangs; }

  getLangName(lang) { return this.langNames[lang] || lang; }

  async setLang(lang) {
    await this.load(lang);
    // Recharger la page pour appliquer la nouvelle langue
    location.reload();
  }
}
export default new I18nService();
