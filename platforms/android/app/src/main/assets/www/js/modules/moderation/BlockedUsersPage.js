import Page from '../../core/Page.js';
import Moderation from '../../services/ModerationService.js';
import { escapeHtml } from '../../core/Html.js';

export default class BlockedUsersPage extends Page {
  static route = '/settings/blocked';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.users = [];
  }

  async onEnter() {
    this.users = Moderation.blockedUsers();
  }

  render() {
    const header = this.header(this.t('block.listTitle'), { back: true });

    if (this.users.length === 0) {
      return `
        <section>
          ${header}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <h3>${this.t('block.empty')}</h3>
            <p class="muted">${this.t('block.emptyDesc')}</p>
          </div>
        </section>`;
    }

    return `
      <section>
        ${header}
        <div class="glass card" style="padding: 6px;">
          ${this.users.map(u => `
            <div class="blocked-row">
              <img class="blocked-avatar" src="${escapeHtml(u.photo || 'assets/img/owner-avatar.webp')}" alt="">
              <span class="blocked-name">${escapeHtml(u.name)}</span>
              <button type="button" class="btn btn-glass" data-unblock="${escapeHtml(u.id)}">${this.t('block.unblock')}</button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  bindEvents() {
    this.el.querySelectorAll('[data-unblock]').forEach(btn => {
      btn.onclick = () => {
        Moderation.unblock(btn.dataset.unblock);
        this.users = Moderation.blockedUsers();
        this.reRender();
      };
    });
  }
}