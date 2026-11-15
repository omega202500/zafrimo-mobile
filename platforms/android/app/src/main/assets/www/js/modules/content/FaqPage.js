import Page from '../../core/Page.js';
import Content from '../../services/ContentService.js';
import { escapeHtml } from '../../core/Html.js';

// Questions fréquentes (cahier section 11). Chaque question est un bloc <details> : aucun JavaScript nécessaire.
export default class FaqPage extends Page {
  static route = '/faq';
  static access = 'public';
  static tabs = false;

  // Texte échappé, avec les retours à la ligne conservés
  multiline(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  render() {
    const groups = Content.faq();

    return `
      <section>
        ${this.header(this.t('faq.title'), { back: true })}
        <p class="muted" style="margin: 0 4px;">${this.t('faq.intro')}</p>

        ${groups.map(g => `
          <h3 class="faq-group-title">${escapeHtml(g.title)}</h3>
          ${g.items.map(item => `
            <details class="glass card faq-item">
              <summary>${escapeHtml(item.q)}</summary>
              <div class="faq-answer muted">${this.multiline(item.a)}</div>
            </details>
          `).join('')}
        `).join('')}

        <div class="glass card" style="text-align: center; margin-top: 20px;">
          <p class="muted" style="margin-bottom: 14px;">${this.t('faq.notFound')}</p>
          <button class="btn btn-glass" data-go="/support" style="margin-bottom: 0;">${this.t('faq.contact')}</button>
        </div>
      </section>
    `;
  }
}