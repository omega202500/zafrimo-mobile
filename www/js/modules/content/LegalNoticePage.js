import Page from '../../core/Page.js';
import Content from '../../services/ContentService.js';
import { escapeHtml } from '../../core/Html.js';

// Notes légales : coordonnées du titulaire de l'app (cahier sections 14 et 20). Texte provisoire à faire valider.
export default class LegalNoticePage extends Page {
  static route = '/legal';
  static access = 'public';
  static tabs = false;

  row(label, value) {
    return `
      <div class="info-row">
        <span class="muted">${label}</span>
        <span>${escapeHtml(value || '')}</span>
      </div>`;
  }

  render() {
    const info = Content.legalInfo();

    return `
      <section>
        ${this.header(this.t('legal.title'), { back: true })}
        <div class="glass card status-banner pending">${this.t('legal.draftNote')}</div>

        <div class="glass card">
          <h3 style="margin-bottom: 8px;">${this.t('legal.ownerTitle')}</h3>
          ${this.row(this.t('legal.companyLabel'), info.companyName)}
          ${this.row(this.t('legal.addressLabel'), info.address)}
          ${this.row(this.t('legal.vatLabel'), info.vatNumber)}
          ${this.row(this.t('legal.emailLabel'), info.email)}
        </div>

        <div class="glass card">
          <h3>${this.t('legal.hostingTitle')}</h3>
          <p class="muted" style="margin-bottom: 16px;">${this.t('legal.hostingText')}</p>

          <h3>${this.t('legal.contentTitle')}</h3>
          <p class="muted" style="margin-bottom: 16px;">${this.t('legal.contentText')}</p>

          <h3>${this.t('legal.lawTitle')}</h3>
          <p class="muted">${this.t('legal.lawText')}</p>
        </div>
      </section>
    `;
  }
}