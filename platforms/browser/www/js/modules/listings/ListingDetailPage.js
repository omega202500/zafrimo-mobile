import Page from '../../core/Page.js';
import StarRating from '../../components/StarRating.js';
import ListingService from '../../services/ListingService.js';
import Auth from '../../services/AuthService.js';
import ConversationService from '../../services/ConversationService.js';
import { escapeHtml, textToHtml } from '../../core/Html.js';
import Moderation from '../../services/ModerationService.js';
import ReportModal from '../../components/ReportModal.js';

export default class ListingDetailPage extends Page {
  static route = '/listings/:id';
  static access = 'public';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.listing = null;
    this.isMine = false;
  }

  async onEnter() {
    const user = Auth.user();
    this.listing = ListingService.getById(this.params.id);
    this.isMine = ListingService.isAuthor(this.listing, user);
  }

  render() {
    // Annonce introuvable ou masquée (hors auteur) : message clair
      if (!this.listing || (!this.isMine && (!Moderation.isListingPublic(this.listing) || Moderation.isBlocked(this.listing.owner?.id)))) {
      return `
        <section>
          ${this.header(this.t('listings.details'), { back: true })}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('listings.notFound')}</p>
          </div>
        </section>`;
    }

    const l = this.listing;
    const photos = l.photos && l.photos.length > 0 ? l.photos : (l.photo ? [l.photo] : []);
    const kindLabel = this.t('kind.' + l.kind) || l.kind;
    const propertyTypeLabel = this.t('ptype.' + l.propertyType) || l.propertyType;

    return `
      <section>
        ${this.header(this.t('listings.details'), { back: true })}

        ${this.isMine && (l.status === 'pending' || l.status === 'rejected') ? `
        <div class="glass card status-banner ${l.status}">
          ${this.t(l.status === 'pending' ? 'listings.pendingBanner' : 'listings.rejectedBanner')}
        </div>
        ` : ''}

        ${photos.length > 0 ? `
        <div class="photo-gallery glass">
          ${photos.map((p, i) => `
            <div class="photo-gallery-item" style="background-image: url('${p}');">
              ${photos.length > 1 ? `<span class="photo-gallery-counter">${i + 1} / ${photos.length}</span>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        <div class="glass card">
          <p class="muted">${escapeHtml(l.address)}${l.address && l.city ? ', ' : ''}${escapeHtml(l.city)}</p>
          <div class="price" style="font-size: 24px;">€${l.price.toLocaleString('it-IT')}</div>
          <div class="tags" style="margin-top: 12px;">
            <span>${escapeHtml(kindLabel)}</span>
            <span>${escapeHtml(propertyTypeLabel)}</span>
            ${l.period ? `<span>${this.t('period.' + l.period)}</span>` : ''}
          </div>
          <div class="tags" style="margin-top: 8px;">
            <span>${l.area} m²</span>
            ${l.beds > 0 ? `<span>${l.beds} ${this.t('listings.beds')}</span>` : ''}
            ${l.baths > 0 ? `<span>${l.baths} ${this.t('listings.baths')}</span>` : ''}
            ${l.parking > 0 ? `<span>${l.parking} ${this.t('listings.parking')}</span>` : ''}
          </div>
        </div>

        ${l.description ? `
        <div class="glass card">
          <h3 style="margin-bottom: 12px;">${this.t('listings.description')}</h3>
          <div style="line-height: 1.7; font-size: 15px;">${textToHtml(l.description)}</div>
        </div>
        ` : ''}

        <div class="glass card owner-card" data-go="/owner/${l.owner?.id || ''}">
          <div class="row" style="align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: url('${l.owner?.photo || 'assets/img/owner-avatar.webp'}') center/cover; border: 2px solid var(--lime);"></div>
            <div style="flex: 1;">
              <div style="font-size: 16px; font-weight: 600;">${escapeHtml(l.owner?.name || '')}</div>
              <div style="margin-top: 4px;">${new StarRating({ value: l.owner?.stars || 0 }).render()}</div>
            </div>
            <span style="font-size: 12px; color: var(--text-2);">
              ${l.owner?.online ? '<span style="color: var(--lime);">●</span> ' + this.t('owner.online') : '<span class="muted">○</span> ' + this.t('owner.offline')}
            </span>
          </div>
        </div>

            ${!this.isMine ? `
        <button class="btn btn-lime" data-contact="${l.id}">${this.t('listings.contact')}</button>
        <button class="btn btn-glass report-btn" type="button" data-report>${this.t('report.listing')}</button>
        ` : ''}

        ${this.isMine ? `
        <div class="glass card">
          <button class="btn btn-glass" data-go="/listings/${l.id}/edit">${this.t('listings.edit')}</button>
          <button class="btn btn-glass" id="toggleHiddenBtn">${l.hidden ? this.t('listings.show') : this.t('listings.hide')}</button>
          <div id="deleteZone">
            <button class="btn btn-glass" id="deleteBtn" style="margin-bottom: 0;">🗑 ${this.t('listings.delete')}</button>
          </div>
        </div>
        ` : ''}
      </section>
    `;
  }

  bindEvents() {
    // Owner card click
    const ownerCard = this.el.querySelector('.owner-card');
    if (ownerCard) {
      ownerCard.onclick = () => {
        const ownerId = this.listing.owner?.id;
        if (ownerId) {
          this.app.router.go('/owner/' + ownerId);
        }
      };
    }

    // Contact button for visitors
    const contactBtn = this.el.querySelector('[data-contact]');
    if (contactBtn) {
      contactBtn.onclick = () => {
        const user = Auth.user();
        if (!user) {
          this.app.router.go('/login');
          return;
        }

        const conv = ConversationService.openFromListing(this.listing, user);
        if (conv) {
          this.app.router.go('/chat/' + conv.id);
        }
      };
    }

    // Toggle hidden for author
    const toggleHiddenBtn = this.el.querySelector('#toggleHiddenBtn');
    if (toggleHiddenBtn) {
      toggleHiddenBtn.onclick = () => {
        const newHidden = !this.listing.hidden;
        ListingService.setHidden(this.listing.id, newHidden);
        this.listing.hidden = newHidden;
        this.reRender();
      };
    }

        // Signaler l'annonce
    const reportBtn = this.el.querySelector('[data-report]');
    if (reportBtn) {
      reportBtn.onclick = () => {
        if (!Auth.user()) {
          this.app.router.go('/login');
          return;
        }
        ReportModal.open({ type: 'listing', targetId: this.listing.id });
      };
    }

    // Delete confirmation for author
    const deleteZone = this.el.querySelector('#deleteZone');
    if (deleteZone) {
      deleteZone.querySelector('#deleteBtn').onclick = () => {
        deleteZone.innerHTML = `
          <p class="muted" style="margin-bottom: 12px;">${this.t('listings.confirmDelete')}</p>
          <button class="btn btn-lime" id="confirmYes">${this.t('listings.confirmYes')}</button>
          <button class="btn btn-glass" id="confirmNo" style="margin-bottom: 0;">${this.t('listings.cancel')}</button>`;

        deleteZone.querySelector('#confirmYes').onclick = () => {
          ListingService.remove(this.listing.id);
          this.app.router.go('/listings');
        };
        deleteZone.querySelector('#confirmNo').onclick = () => {
          deleteZone.innerHTML = `<button class="btn btn-glass" id="deleteBtn" style="margin-bottom: 0;">🗑 ${this.t('listings.delete')}</button>`;
          this.bindEvents();
        };
      };
    }
  }
}
