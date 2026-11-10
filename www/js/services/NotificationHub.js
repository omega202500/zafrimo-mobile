import Notifications from './NotificationService.js';
import ConversationService from './ConversationService.js';
import Prefs from './NotificationPrefsService.js';
import PushService from './PushService.js';
import { UNREAD_EVENT, NEW_EVENT } from './NotificationService.js';
import { escapeHtml } from '../core/Html.js';

const BANNER_MS = 4500;

// Compteurs (cloche, onglet Messages, badge de l'icône) et bannière de notification
class NotificationHub {
    constructor() {
        this.app = null;
        this.started = false;
    }

    start(app) {
        this.app = app;
        if (this.started) return;
        this.started = true;

        window.addEventListener(UNREAD_EVENT, () => this.refreshBadges());
        window.addEventListener(NEW_EVENT, (e) => this.showBanner(e.detail && e.detail.item));
    }

    // Met à jour les pastilles déjà affichées, sans redessiner les pages
    refreshBadges() {
        const bell = Notifications.unreadCount();
        const messages = ConversationService.totalUnread();

        document.querySelectorAll('[data-bell-badge]').forEach(el => {
            el.textContent = bell > 9 ? '9+' : String(bell);
            el.hidden = bell === 0;
        });
        document.querySelectorAll('[data-nav-badge]').forEach(el => {
            el.textContent = messages > 99 ? '99+' : String(messages);
            el.hidden = messages === 0;
        });

        PushService.setBadge(bell + messages);
    }

    // Bannière affichée quand l'app est ouverte (si le type de notification est activé)
    showBanner(item) {
        if (!item || document.hidden) return;
        if (!Prefs.isEnabled(Notifications.category(item))) return;

        const info = Notifications.describe(item);
        document.querySelector('.notif-banner')?.remove();

        const el = document.createElement('div');
        el.className = 'notif-banner glass';
        el.setAttribute('role', 'status');
        el.innerHTML = `
            <span class="notif-banner-icon">${info.icon}</span>
            <div class="notif-banner-body">
                <strong>${escapeHtml(info.title)}</strong>
                <p>${escapeHtml(info.text)}</p>
            </div>
        `;

        const close = () => el.remove();
        el.onclick = () => {
            close();
            Notifications.markRead(item.id);
            if (item.link && this.app) this.app.router.go(item.link);
        };

        document.body.appendChild(el);
        setTimeout(close, BANNER_MS);
    }
}

export default new NotificationHub();