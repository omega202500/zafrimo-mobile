import Page from '../../core/Page.js';

// Conditions de vente (cahier 10.6 et 11). Texte provisoire à faire valider.
export default class SalesTermsPage extends Page {
  static route = '/sales-terms';
  static access = 'public';
  static tabs = false;

  render() {
    const block = (key) => `
      <h3>${this.t('salesTerms.' + key + 'Title')}</h3>
      <p class="muted" style="margin-bottom: 16px;">${this.t('salesTerms.' + key + 'Text')}</p>`;

    return `
      <section>
        ${this.header(this.t('salesTerms.title'), { back: true })}
        <div class="glass card status-banner pending">${this.t('salesTerms.draftNote')}</div>
        <div class="glass card">
          ${block('service')}
          ${block('payment')}
          ${block('refund')}
          ${block('contact')}
        </div>
      </section>
    `;
  }
}