import Page from '../../core/Page.js';
import Notifications from '../../services/NotificationService.js';
import PushService from '../../services/PushService.js';
import { escapeHtml } from '../../core/Html.js';

// Centre de notifications (cahier 8.3)
export default class NotificationsPage extends Page {
  static route = '/notifications';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.items = [];
    this.showPrompt = false;
  }

  async onEnter() {
    this.items = Notifications.all();
    this.showPrompt = await PushService.shouldAskPermission();
  }

  renderItem(item) {
    const info = Notifications.describe(item);
    return `
      <div class="notif-item ${item.read ? '' : 'unread'}" data-id="${escapeHtml(item.id)}" data-link="${escapeHtml(item.link || '')}">
        <div class="notif-icon">${info.icon}</div>
        <div class="notif-body">
          <div class="row">
            <strong style="font-size: 14px;">${escapeHtml(info.title)}</strong>
            <span class="muted notif-time">${Notifications.timeAgo(item.createdAt)}</span>
          </div>
          <p class="muted notif-text">${escapeHtml(info.text)}</p>
        </div>
      </div>
    `;
  }

  render() {
    const unread = this.items.filter(n => !n.read).length;

    return `
      <section>
        ${this.header(this.t('notif.title'), { back: true })}

        ${this.showPrompt ? `
        <div class="glass card push-prompt">
          <strong>${this.t('notif.promptTitle')}</strong>
          <p class="muted" style="font-size: 14px;">${this.t('notif.promptText')}</p>
          <div class="actions">
            <button class="btn btn-glass" id="promptLater">${this.t('notif.promptLater')}</button>
            <button class="btn btn-lime" id="promptEnable">${this.t('notif.promptEnable')}</button>
          </div>
        </div>
        ` : ''}

        ${this.items.length === 0 ? `
        <div class="glass card" style="text-align: center; padding: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🔔</div>
          <h3>${this.t('notif.empty')}</h3>
          <p class="muted">${this.t('notif.emptyDesc')}</p>
        </div>
        ` : `
        <div class="row" style="margin-bottom: 14px;">
          <span class="muted">${this.t('notif.unread').replace('{n}', String(unread))}</span>
          <button class="chip" id="markAllRead" style="font-size: 12px; padding: 6px 12px;" ${unread ? '' : 'hidden'}>${this.t('notif.markAll')}</button>
        </div>

        <div class="glass card" style="padding: 6px;">
          ${this.items.map(n => this.renderItem(n)).join('')}
        </div>
        `}
      </section>
    `;
  }

  bindEvents() {
    this.el.querySelectorAll('.notif-item').forEach(el => {
      el.onclick = () => {
        Notifications.markRead(el.dataset.id);
        if (el.dataset.link) {
          this.app.router.go(el.dataset.link);
        } else {
          this.items = Notifications.all();
          this.reRender();
        }
      };
    });

    const markAll = this.el.querySelector('#markAllRead');
    if (markAll) {
      markAll.onclick = () => {
        Notifications.markAllRead();
        this.items = Notifications.all();
        this.reRender();
      };
    }

    // Autorisation des notifications push (visible seulement dans l'application installée)
    const enable = this.el.querySelector('#promptEnable');
    if (enable) {
      enable.onclick = async () => {
        await PushService.register();
        PushService.dismissPrompt(); // on ne repose pas la question, l'utilisateur a répondu
        this.showPrompt = false;
        this.reRender();
      };
    }

    const later = this.el.querySelector('#promptLater');
    if (later) {
      later.onclick = () => {
        PushService.dismissPrompt();
        this.showPrompt = false;
        this.reRender();
      };
    }
  }
}