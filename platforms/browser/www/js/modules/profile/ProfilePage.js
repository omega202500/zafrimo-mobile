import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import ProfileService from '../../services/ProfileService.js';
import StarRating from '../../components/StarRating.js';
import { escapeHtml } from '../../core/Html.js';

export default class ProfilePage extends Page {
  static route = '/profile';
  static access = 'auth';
  static tabs = true;

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

    const u = this.user;
    const isOwner = ProfileService.isOwnerProfile(u);
    const available = ProfileService.isAvailable(u);

    const roleText = u.isConsultant
      ? this.t('register.professions.consultant')
      : (u.role === 'owner' ? this.t('register.owner') : this.t('register.visitor'));

    return `
      <section>
        ${this.header(this.t('profile.title'))}

        <div class="glass card" style="text-align: center; padding: 24px;">
          <img class="profile-avatar" src="${escapeHtml(u.photo || 'assets/img/owner-avatar.webp')}" alt="">
          <h2 style="margin-bottom: 4px;">${escapeHtml(u.name || u.username || 'Utente')}</h2>
          <p class="muted" style="margin-bottom: 8px;">${escapeHtml(u.email)}</p>
          <div style="margin-bottom: 10px;">${new StarRating({ value: u.stars || 0 }).render()}</div>
          <span style="display: inline-block; padding: 6px 16px; border-radius: var(--r-pill); background: var(--glass); font-size: 14px;">
            ${roleText}
          </span>
          <div class="profile-actions">
            <button class="btn btn-glass" data-go="/profile/edit">${this.t('profile.edit')}</button>
          </div>
        </div>

        ${isOwner ? `
        <div class="glass card availability-row">
          <div>
            <strong id="availLabel">${available ? this.t('profile.available') : this.t('profile.unavailable')}</strong>
            <p class="muted" style="font-size: 13px; margin-top: 2px;">${this.t('profile.availabilityHint')}</p>
          </div>
          <label class="toggle">
            <input type="checkbox" id="availToggle" ${available ? 'checked' : ''}>
            <span></span>
          </label>
        </div>
        ` : ''}

        <div class="glass card">
          <h3 style="margin-bottom: 16px;">${this.t('profile.menu')}</h3>
          <div class="menu-item" data-go="/my-listings">
            <span>🏠</span>
            <span>${this.t('profile.myListings')}</span>
            <span>›</span>
          </div>
          <div class="menu-item" data-go="/my-payments">
            <span>💳</span>
            <span>${this.t('profile.myPayments')}</span>
            <span>›</span>
          </div>
          ${u.isConsultant ? `
          <div class="menu-item" data-go="/my-earnings">
            <span>💰</span>
            <span>${this.t('profile.myEarnings')}</span>
            <span>›</span>
          </div>
          ` : ''}
          <div class="menu-item" data-go="/my-stars">
            <span>⭐</span>
            <span>${this.t('profile.myStars')}</span>
            <span>›</span>
          </div>
          ${u.isConsultant ? `
          <div class="menu-item" data-go="/my-rate">
            <span>📊</span>
            <span>${this.t('profile.myRate')}</span>
            <span>›</span>
          </div>
          ` : ''}
          <div class="menu-item" data-go="/settings">
            <span>⚙️</span>
            <span>${this.t('profile.settings')}</span>
            <span>›</span>
          </div>
        </div>

        <button class="btn btn-danger" id="logout">
          ${this.t('profile.logout')}
        </button>
      </section>
    `;
  }

  bindEvents() {
    // Statut disponible / indisponible (cahier 8.2) : on change seulement le texte, sans redessiner
    const toggle = this.el.querySelector('#availToggle');
    if (toggle) {
      toggle.onchange = () => {
        ProfileService.setAvailable(toggle.checked);
        this.el.querySelector('#availLabel').textContent =
          toggle.checked ? this.t('profile.available') : this.t('profile.unavailable');
      };
    }

    const logoutBtn = this.el.querySelector('#logout');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Auth.logout();
        this.app.router.go('/welcome');
      };
    }
  }
}