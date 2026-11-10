import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Storage from '../../services/StorageService.js';
import Permission from '../../services/PermissionService.js';

export default class MyStarsPage extends Page {
  static route = '/my-stars';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.user = null;
    this.settings = null;
    this.request = null;
  }

  async onEnter() {
    this.user = Auth.user();
    this.settings = Permission.getSettings();
    this.request = Storage.get('starsRequest'); // { status: 'pending', date }
  }

  // Les conditions pour gagner une étoile (à confirmer avec l'administrateur)
  conditions() {
    const u = this.user || {};
    const minDays = this.settings.accountMinDays;
    // Si la date de création est inconnue (comptes de test), on considère la condition remplie
    const days = u.createdAt ? (Date.now() - u.createdAt) / 86400000 : minDays;

    return [
      { label: this.t('myStars.condProfile'), ok: !!((u.username || u.name) && u.city) },
      { label: this.t('myStars.condVerified'), ok: Storage.get('otpVerified') === true },
      { label: this.t('myStars.condSeniority').replace('{n}', minDays), ok: days >= minDays }
    ];
  }

  thresholdRow(label, required, stars) {
    const ok = stars >= required;
    return `
      <div class="row" style="margin-bottom: 10px;">
        <span>${label}</span>
        <span class="${ok ? 'price' : 'muted'}">${ok ? '✓ ' : ''}${required} ★</span>
      </div>`;
  }

  render() {
    if (!this.user) {
      return `<section><div class="glass card"><p class="muted">${this.t('common.loading')}</p></div></section>`;
    }

    const s = this.settings;
    const stars = this.user.stars || 0;
    const conditions = this.conditions();
    const allOk = conditions.every(c => c.ok);
    const needMore = stars < s.publishStars;

    // Zone de demande : seulement si l'utilisateur n'a pas encore assez d'étoiles
    let requestZone = '';
    if (this.request && this.request.status === 'pending') {
      requestZone = `<p class="muted" style="margin-top: 12px;">${this.t('myStars.pending')}</p>`;
    } else if (allOk) {
      requestZone = `<button class="btn btn-lime" id="requestBtn" style="margin-top: 12px;">${this.t('myStars.request')}</button>`;
    } else {
      requestZone = `<p class="muted" style="margin-top: 12px;">${this.t('myStars.notEligible')}</p>`;
    }

    return `
      <section>
        ${this.header(this.t('profile.myStars'), { back: true })}

        <div class="glass card" style="text-align: center; padding: 24px;">
          <div class="stars" style="font-size: 44px; margin-bottom: 8px;">${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, s.starsMax - stars))}</div>
          <h3>${stars} / ${s.starsMax}</h3>
          <p class="muted" style="margin-top: 8px;">${this.t('myStars.starsNote')}</p>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 14px;">${this.t('myStars.thresholds')}</h3>
          ${this.thresholdRow(this.t('myStars.toPublish'), s.publishStars, stars)}
          ${this.thresholdRow(this.t('myStars.toConsult'), s.consultantStars, stars)}
        </div>

        ${needMore ? `
        <div class="glass card">
          <h3 style="margin-bottom: 14px;">${this.t('myStars.conditions')}</h3>
          ${conditions.map(c => `
            <div class="row" style="justify-content: flex-start; margin-bottom: 10px;">
              <span class="${c.ok ? 'price' : 'muted'}" style="width: 24px;">${c.ok ? '✓' : '○'}</span>
              <span>${c.label}</span>
            </div>`).join('')}
          ${requestZone}
        </div>` : ''}

        <div class="glass card">
          <h3 style="margin-bottom: 8px;">${this.t('myStars.history')}</h3>
          <p class="muted">${this.t('myStars.noHistory')}</p>
        </div>
      </section>
    `;
  }

  bindEvents() {
    const btn = this.el.querySelector('#requestBtn');
    if (!btn) return;

    btn.onclick = () => {
      // TODO API : POST /stars/request (l'administrateur la traitera dans son panneau)
      Storage.set('starsRequest', { status: 'pending', date: Date.now() });
      // On remplace seulement le bouton, sans redessiner la page
      btn.outerHTML = `<p class="muted" style="margin-top: 12px;">${this.t('myStars.pending')}</p>`;
    };
  }
}