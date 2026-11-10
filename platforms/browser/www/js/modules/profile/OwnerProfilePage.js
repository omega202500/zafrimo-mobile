import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import StarRating from '../../components/StarRating.js';
import ListingCard from '../../components/ListingCard.js';
import ReportModal from '../../components/ReportModal.js';
import Dialog from '../../components/Dialog.js';
import ListingService from '../../services/ListingService.js';
import ConversationService from '../../services/ConversationService.js';
import Moderation from '../../services/ModerationService.js';
import { escapeHtml } from '../../core/Html.js';
import Consulting from '../../services/ConsultingService.js';

export default class OwnerProfilePage extends Page {
  static route = '/owner/:id';
  static access = 'public';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.owner = null;
    this.ownerListings = [];
  }

  async onEnter() {
    const ownerId = this.params.id;
    const allListings = ListingService.getAll();
    const match = allListings.find(l => String(l.owner?.id) === String(ownerId));
    // TODO API : GET /users/:id (le repli sur la 1re annonce n'existe que pour les données de test)
    this.owner = match ? match.owner : allListings[0]?.owner;
    this.ownerListings = ListingService.getByOwner(ownerId).filter(l => Moderation.isListingPublic(l));
  }

  render() {
    if (!this.owner) {
      return `<section><div class="glass card"><p class="muted">${this.t('common.loading')}</p></div></section>`;
    }

    const user = Auth.user();
    const isMe = !!user && String(this.owner.id) === 'u-' + user.email;
    const blocked = Moderation.isBlocked(this.owner.id);
    const isConsultant = !!this.owner.isConsultant;

    return `
      <section>
        ${this.header(this.t('owner.profileTitle'), { back: true })}

        <div class="glass card" style="text-align: center; padding: 24px;">
          <div style="width: 88px; height: 88px; border-radius: 50%; background: url('${this.owner.photo || 'assets/img/owner-avatar.webp'}') center/cover; margin: 0 auto 12px; border: 2px solid var(--lime);"></div>
          <h2 style="margin-bottom: 4px;">${escapeHtml(this.owner.name)}</h2>
          <p class="muted" style="margin-bottom: 8px;">${escapeHtml(this.owner.specialty || '')}</p>
          <div style="margin-bottom: 8px;">
            ${new StarRating({ value: this.owner.stars }).render()}
          </div>
          <span style="display: inline-block; padding: 4px 12px; border-radius: var(--r-pill); background: var(--glass); font-size: 13px;">
            ${this.owner.online ? '<span style="color: var(--lime);">●</span> ' + this.t('owner.online') : '<span class="muted">○</span> ' + this.t('owner.offline')}
          </span>
        </div>

        <div class="glass card">
          <div class="row" style="margin-bottom: 12px;">
            <span class="muted">${this.t('owner.city')}</span>
            <strong>${escapeHtml(this.owner.city)}</strong>
          </div>
          <div class="row">
            <span class="muted">${this.t('owner.hours')}</span>
            <strong>${escapeHtml(this.owner.hours || '09:00 - 18:00')}</strong>
          </div>
        </div>

        ${isConsultant && !isMe && !blocked ? `
        <div class="glass card">
          <div class="row" style="margin-bottom: 12px;">
            <span class="muted">${this.t('owner.rate')}</span>
            <span class="price" style="font-size: 22px;">${Consulting.formatMoney(Consulting.priceCents(this.owner))}</span>
          </div>
          <button class="btn btn-lime" data-go="/consultant/${encodeURIComponent(String(this.owner.id))}" style="margin-bottom: 0;">
            ${this.t('owner.consult')}
          </button>
        </div>
        ` : ''}

        ${!isMe && !blocked ? `
        <button class="btn btn-glass" data-contact>
          ${this.t('owner.contact')}
        </button>
        ` : ''}

        ${!isMe ? `
        <div class="safety-row">
          <button class="btn btn-glass" type="button" data-report-user>${this.t('report.user')}</button>
          <button class="btn btn-glass" type="button" data-block-user>${blocked ? this.t('block.unblock') : this.t('block.action')}</button>
        </div>
        ` : ''}

        <h3 style="margin: 20px 0 12px 0;">${this.t('owner.listingsTitle')} (${this.ownerListings.length})</h3>
        ${this.ownerListings.map(l => new ListingCard({ listing: l, t: this.t.bind(this) }).render()).join('')}
      </section>
    `;
  }

  bindEvents() {
    this.el.onclick = async (e) => {
      const card = e.target.closest('article[data-id]');
      const contactBtn = e.target.closest('[data-contact]');
      const reportBtn = e.target.closest('[data-report-user]');
      const blockBtn = e.target.closest('[data-block-user]');
      const user = Auth.user();

      // Signaler cet utilisateur
      if (reportBtn) {
        if (!user) { this.app.router.go('/login'); return; }
        ReportModal.open({ type: 'user', targetId: this.owner.id });
        return;
      }

      // Bloquer / débloquer
      if (blockBtn) {
        if (!user) { this.app.router.go('/login'); return; }

        if (Moderation.isBlocked(this.owner.id)) {
          Moderation.unblock(this.owner.id);
          this.reRender();
          return;
        }

        const ok = await Dialog.confirm({
          title: this.t('block.confirmTitle').replace('{name}', escapeHtml(this.owner.name || '')),
          message: this.t('block.confirmText'),
          confirmText: this.t('block.confirm'),
          cancelText: this.t('common.cancel'),
          danger: true
        });
        if (ok) {
          Moderation.block(this.owner);
          this.reRender();
        }
        return;
      }

      // Contacter (corrigé : on utilise Auth.user())
      if (contactBtn) {
        e.stopPropagation();
        if (!user) { this.app.router.go('/login'); return; }
        const conv = ConversationService.openFromOwner(this.owner, user);
        if (conv) {
          this.app.router.go('/chat/' + conv.id);
        }
        return;
      }

      if (card) {
        this.app.router.go('/listings/' + card.dataset.id);
      }
    };
  }
}