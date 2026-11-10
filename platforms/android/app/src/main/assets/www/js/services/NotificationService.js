import Storage from './StorageService.js';
import Auth from './AuthService.js';
import I18n from './I18nService.js';
import settings from '../mocks/settings.js';

// Types de notifications (cahier 8.3). "category" = la clé du réglage dans NotificationPrefsService.
export const EVENTS = {
    'message.received':  { category: 'messages',      icon: '💬' },
    'stars.granted':     { category: 'stars',         icon: '⭐' },
    'stars.removed':     { category: 'stars',         icon: '⭐' },
    'listing.validated': { category: 'listings',      icon: '✅' },
    'listing.rejected':  { category: 'listings',      icon: '⚠️' },
    'report.handled':    { category: 'listings',      icon: '🛡️' },
    'consultation.paid': { category: 'consultations', icon: '💼' },
    'payment.confirmed': { category: 'consultations', icon: '💳' },
    'consultation.ending': { category: 'consultations', icon: '⏳' }
};

const MAX_ITEMS = 100;
export const UNREAD_EVENT = 'zafrimo:unread-changed';
export const NEW_EVENT = 'zafrimo:notification';

// Centre de notifications. Une notification = { id, uid, event, params, link, createdAt, read }.
// On stocke l'événement et ses paramètres, jamais le texte : il est traduit à l'affichage.
// TODO API : GET /notifications · PATCH /notifications/:id/read · POST /notifications/read-all
class NotificationService {
    // ----- Stockage (une liste par utilisateur) -----
    key() {
        const user = Auth.user();
        return user ? 'notifications:' + user.email : null;
    }

    load() {
        const key = this.key();
        return key ? (Storage.get(key) || []) : [];
    }

    save(list) {
        const key = this.key();
        if (key) Storage.set(key, list.slice(0, MAX_ITEMS));
    }

    emit() {
        window.dispatchEvent(new CustomEvent(UNREAD_EVENT));
    }

    // ----- Lecture -----
    all() {
        this.seedDemo();
        return this.load().sort((a, b) => b.createdAt - a.createdAt);
    }

    unreadCount() {
        this.seedDemo();
        return this.load().filter(n => !n.read).length;
    }

    category(item) {
        return (EVENTS[item.event] || {}).category || 'listings';
    }

    // ----- Ajout (reçu du serveur, d'un push ou d'une action locale) -----
    // uid : identifiant unique pour éviter les doublons (ex. 'pay:p123')
    // silent : true = pas de bannière (l'écran affiche déjà l'information)
    add({ event, params = {}, link = '', uid = null, silent = false }) {
        if (!EVENTS[event] || !this.key()) return null;

        const list = this.load();
        if (uid && list.some(n => n.uid === uid)) return null;

        const item = {
            id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
            uid,
            event,
            params: this.cleanParams(params),
            link: this.safeLink(link),
            createdAt: Date.now(),
            read: false
        };
        this.save([item, ...list]);
        this.emit();

        if (!silent) {
            window.dispatchEvent(new CustomEvent(NEW_EVENT, { detail: { item } }));
        }
        return item;
    }

    // Les paramètres peuvent venir d'un push : on ne garde que du texte court et des nombres
    cleanParams(params) {
        return Object.fromEntries(
            Object.entries(params || {})
                .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
                .map(([k, v]) => [k, String(v).slice(0, 80)])
        );
    }

    // Seuls les chemins internes de l'app sont acceptés
    safeLink(link) {
        return typeof link === 'string' && /^\/[\w\-\/%.@]*$/.test(link) ? link : '';
    }

    // ----- Marquer comme lu -----
    update(predicate) {
        const list = this.load();
        let changed = false;
        list.forEach(n => {
            if (!n.read && predicate(n)) {
                n.read = true;
                changed = true;
            }
        });
        if (changed) {
            this.save(list);
            this.emit();
        }
    }

    markRead(id) { this.update(n => n.id === id); }
    markAllRead() { this.update(() => true); }
    markReadByLink(link) { if (link) this.update(n => n.link === link); }
    markReadByUid(uid) { if (uid) this.update(n => n.uid === uid); }

    // ----- Affichage -----
    // Renvoie { icon, title, text } traduits. À échapper avec escapeHtml avant tout innerHTML.
    describe(item) {
        const meta = EVENTS[item.event] || { icon: '🔔' };
        const fill = (text) => text.replace(/\{(\w+)\}/g, (m, name) =>
            item.params && item.params[name] !== undefined ? item.params[name] : '');
        return {
            icon: meta.icon,
            title: fill(I18n.t('notif.' + item.event + '.title')),
            text: fill(I18n.t('notif.' + item.event + '.text'))
        };
    }

    timeAgo(timestamp) {
        const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
        if (minutes < 1) return I18n.t('notif.time.now');
        if (minutes < 60) return I18n.t('notif.time.minutes').replace('{n}', String(minutes));
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return I18n.t('notif.time.hours').replace('{n}', String(hours));
        const days = Math.floor(hours / 24);
        if (days === 1) return I18n.t('notif.time.yesterday');
        return I18n.t('notif.time.days').replace('{n}', String(days));
    }

    // TEST uniquement : quelques notifications d'exemple à la première connexion
    seedDemo() {
        const user = Auth.user();
        if (!settings.mockNotifications || !user) return;

        const flag = 'notif_seeded:' + user.email;
        if (Storage.get(flag)) return;
        Storage.set(flag, true);

        const ago = (minutes) => Date.now() - minutes * 60000;
        const sample = (event, params, link, minutes, read) => ({
            id: 'seed-' + event + '-' + minutes,
            uid: null,
            event,
            params,
            link,
            createdAt: ago(minutes),
            read
        });

        this.save([
            sample('message.received', { name: 'Giulia R.' }, '/messages', 10, false),
            sample('stars.granted', { n: 3 }, '/my-stars', 120, false),
            sample('listing.validated', { title: 'Villa Aurora' }, '/my-listings', 60 * 26, false),
            sample('consultation.ending', { name: 'Giulia R.', minutes: 10 }, '/messages', 60 * 50, true),
            sample('payment.confirmed', { name: 'Giulia R.' }, '/my-payments', 60 * 72, true),
            sample('report.handled', {}, '', 60 * 96, true)
        ]);
    }
}

export default new NotificationService();