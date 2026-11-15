import Storage from './StorageService.js';

const KEY = 'notif_prefs';

// Types de notifications (cahier 8.3)
export const NOTIF_TYPES = ['messages', 'stars', 'listings', 'consultations'];

const DEFAULTS = { push: true, messages: true, stars: true, listings: true, consultations: true };

// TODO API : GET/PUT /me/notification-settings
class NotificationPrefsService {
    get() {
        return { ...DEFAULTS, ...(Storage.get(KEY) || {}) };
    }

    set(key, value) {
        if (!(key in DEFAULTS)) return this.get();
        const next = { ...this.get(), [key]: !!value };
        Storage.set(KEY, next);
        return next;
    }

    // Une notification de ce type est-elle autorisée ? (interrupteur général ET type activé)
    isEnabled(type) {
        const prefs = this.get();
        return prefs.push && prefs[type] !== false;
    }
}

export default new NotificationPrefsService();