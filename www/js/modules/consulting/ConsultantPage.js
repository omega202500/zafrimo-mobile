import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Consulting from '../../services/ConsultingService.js';
import Moderation from '../../services/ModerationService.js';
import StarRating from '../../components/StarRating.js';
import { escapeHtml } from '../../core/Html.js';

// Fiche consultant (cahier 10.3) : tarif, durée de la conversation, bouton "Consulter".
// Pas de calendrier : la V1 n'a pas de créneaux (cahier 10.1).
export default class ConsultantPage extends Page {
  static route = '/consultant/:id';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.quote = null;
  }

  async onEnter() {
    this.quote = Consulting.getQuote(this.params.id);
  }

  render() {
    const header = this.header(this.t('consultant.title'), { back: true });

    if (!this.quote) {
      return `
        <section>
          ${header}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('consultant.notFound')}</p>
          </div>
        </section>`;
    }

    const { consultant: c, amountCents, durationHours } = this.quote;
    const user = Auth.user();
    const isMe = !!user && String(c.id) === 'u-' + user.email;
    const blocked = Moderation.isBlocked(c.id);
    const hours = String(durationHours);

    let action = `
      <button class="btn btn-lime" data-go="/payment/${encodeURIComponent(String(c.id))}">
        ${this.t('consultant.cta')} · ${Consulting.formatMoney(amountCents)}
      </button>`;
    if (isMe) action = `<p class="muted" style="text-align: center;">${this.t('consultant.own')}</p>`;
    else if (blocked) action = `<p class="muted" style="text-align: center;">${this.t('consultant.blocked')}</p>`;

    return `
      <section>
        ${header}

        <div class="glass card consult-hero">
          <img class="consult-avatar" src="${escapeHtml(c.photo || 'assets/img/owner-avatar.webp')}" alt="">
          <h2>${escapeHtml(c.name)}</h2>
          <p class="muted">${escapeHtml(c.specialty || '')}${c.city ? ' · ' + escapeHtml(c.city) : ''}</p>
          <div style="margin-top: 8px;">${new StarRating({ value: c.stars || 0 }).render()}</div>
          <div class="price consult-price">${Consulting.formatMoney(amountCents)}</div>
          <div class="consult-price-note">${this.t('consultant.price')} · ${this.t('consultant.duration').replace('{n}', hours)}</div>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 14px;">${this.t('consultant.howTitle')}</h3>
          <ol class="consult-steps">
            <li>${this.t('consultant.how1')}</li>
            <li>${this.t('consultant.how2').replace('{n}', hours)}</li>
            <li>${this.t('consultant.how3')}</li>
          </ol>
        </div>

        ${action}
      </section>
    `;
  }
}