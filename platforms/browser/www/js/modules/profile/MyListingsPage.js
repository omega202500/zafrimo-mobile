import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import ListingService from '../../services/ListingService.js';
import Permission from '../../services/PermissionService.js';
import LockedState from '../../components/LockedState.js';
import { escapeHtml } from '../../core/Html.js';
import Moderation from '../../services/ModerationService.js';

export default class MyListingsPage extends Page {
  static route = '/my-listings';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.user = null;
    this.listings = [];
  }

  async onEnter() {
    this.user = Auth.user();
    this.listings = ListingService.getMine(this.user);
  }

  statusLabel(l) {
    const s = Moderation.listingStatus(l);
    if (s === 'pending') return this.t('listings.statusPending');
    if (s === 'rejected') return this.t('listings.statusRejected');
    return s === 'hidden' ? this.t('listings.hidden') : this.t('listings.visible');
  }

  render() {
    if (!this.user) {
      return `<section><div class="glass card"><p class="muted">${this.t('common.loading')}</p></div></section>`;
    }

    // Le critère d'accès est basé sur les ÉTOILES, pas sur le rôle
    const canPublish = Permission.canPublish(this.user);

    if (!canPublish) {
      const check = Permission.check(this.user, 'publish');
      return `
        <section>
          ${this.header(this.t('profile.myListings'), { back: true })}
          ${new LockedState({
        title: this.t('stars.lockedTitle'),
        text: this.t('stars.lockedText').replace('{n}', check.required).replace('{have}', check.stars),
        required: check.required,
        stars: check.stars,
        progressLabel: this.t('stars.progress').replace('{have}', check.stars).replace('{n}', check.required),
        buttonLabel: this.t('stars.seeMine')
      }).render()}
        </section>`;
    }

    if (this.listings.length === 0) {
      return `
        <section>
          ${this.header(this.t('profile.myListings'), { back: true })}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <div style="font-size: 48px; margin-bottom: 12px;">🏠</div>
            <h3>${this.t('myListings.noListings')}</h3>
            <p class="muted" style="margin-bottom: 16px;">${this.t('myListings.noListingsDesc')}</p>
            <button class="btn btn-lime" data-go="/listings/new">${this.t('myListings.publish')}</button>
          </div>
        </section>`;
    }

    return `
      <section>
        <div class="my-listings-row">
          <h3>${this.t('profile.myListings')}</h3>
          <button class="btn btn-lime" data-go="/listings/new" style="margin-bottom: 0;">${this.t('myListings.publish')}</button>
        </div>

        ${this.listings.map(l => {
          const photo = l.photos && l.photos.length > 0 ? l.photos[0] : l.photo || '';
          const kindLabel = this.t('kind.' + l.kind) || l.kind;
          return `
            <div class="glass card" style="padding: 0; overflow: hidden; margin-bottom: 16px;">
              <div class="row" style="padding: 12px; align-items: center; gap: 12px;">
                ${photo ? `
                  <div style="width: 80px; height: 80px; border-radius: 8px; background: url('${photo}') center/cover; flex-shrink: 0;"></div>
                ` : ''}
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 12px; color: var(--text-2); margin-bottom: 4px;">
                    ${escapeHtml(kindLabel)} • ${escapeHtml(l.city)}
                  </div>
                  <div style="font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(l.title)}
                  </div>
                  <div class="price" style="font-size: 16px;">€${l.price.toLocaleString('it-IT')}</div>
                </div>
                <div style="text-align: right;">
                  <span class="status-pill ${Moderation.listingStatus(l)}">${this.statusLabel(l)}</span>
                </div>
              </div>
              <div class="row" style="padding: 0 12px 12px 12px; gap: 8px;">
                <button class="btn btn-glass" data-edit="${l.id}" style="flex: 1; margin-bottom: 0;">${this.t('listings.edit')}</button>
                <button class="btn btn-glass" data-toggle="${l.id}" style="flex: 1; margin-bottom: 0;">${l.hidden ? this.t('listings.show') : this.t('listings.hide')}</button>
                <button class="btn btn-glass" data-delete="${l.id}" style="flex: 1; margin-bottom: 0;">${this.t('listings.delete')}</button>
              </div>
            </div>
          `;
        }).join('')}
      </section>
    `;
  }

  bindEvents() {
    // Edit button
    this.el.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => {
        this.app.router.go('/listings/' + btn.dataset.edit + '/edit');
      };
    });

    // Toggle hidden button
    this.el.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.toggle;
        const listing = this.listings.find(l => String(l.id) === String(id));
        if (listing) {
          const newHidden = !listing.hidden;
          ListingService.setHidden(id, newHidden);
          listing.hidden = newHidden;
          this.reRender();
        }
      };
    });

    // Delete button with confirmation
    this.el.querySelectorAll('[data-delete]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.delete;
        const card = btn.closest('.glass.card');
        const actionsRow = card.querySelector('.row:last-child');

        actionsRow.innerHTML = `
          <p class="muted" style="grid-column: 1 / -1; margin-bottom: 8px;">${this.t('listings.confirmDelete')}</p>
          <button class="btn btn-lime" data-confirm-delete="${id}" style="flex: 1; margin-bottom: 0;">${this.t('listings.confirmYes')}</button>
          <button class="btn btn-glass" data-cancel-delete="${id}" style="flex: 1; margin-bottom: 0;">${this.t('listings.cancel')}</button>
        `;

        actionsRow.querySelector('[data-confirm-delete]').onclick = () => {
          ListingService.remove(id);
          this.listings = this.listings.filter(l => String(l.id) !== String(id));
          this.reRender();
        };

        actionsRow.querySelector('[data-cancel-delete]').onclick = () => {
          this.reRender();
        };
      };
    });
  }
}
