import Storage from './StorageService.js';
import settings from '../mocks/settings.js';

const BLOCKS_KEY = 'blocked_users';
const REPORTS_KEY = 'reports';

export const REPORT_TYPES = ['listing', 'news', 'user', 'conversation'];
export const REPORT_REASONS = ['spam', 'scam', 'fake', 'inappropriate', 'harassment', 'other'];

// Blocage, signalement et statuts de modération (cahier sections 8.1, 11 et 14)
// TODO API : POST /reports · GET /blocks · POST /blocks · DELETE /blocks/:userId
class ModerationService {
    // ----- Blocage -----
    blockedUsers() {
        return Storage.get(BLOCKS_KEY) || [];
    }

    isBlocked(userId) {
        if (userId === undefined || userId === null) return false;
        return this.blockedUsers().some(u => String(u.id) === String(userId));
    }

    // user : { id, name, photo }
    block(user) {
        if (!user || user.id === undefined || user.id === null) return false;
        if (this.isBlocked(user.id)) return true;
        const entry = {
            id: String(user.id),
            name: user.name || '',
            photo: user.photo || '',
            blockedAt: Date.now()
        };
        Storage.set(BLOCKS_KEY, [entry, ...this.blockedUsers()]);
        return true;
    }

    unblock(userId) {
        Storage.set(BLOCKS_KEY, this.blockedUsers().filter(u => String(u.id) !== String(userId)));
    }

    // ----- Signalement -----
    reports() {
        return Storage.get(REPORTS_KEY) || [];
    }

    hasReported(type, targetId) {
        return this.reports().some(r => r.type === type && String(r.targetId) === String(targetId));
    }

    report({ type, targetId, reason, details = '' }) {
        if (!REPORT_TYPES.includes(type) || !REPORT_REASONS.includes(reason) || targetId === undefined || targetId === null) {
            throw new Error('invalid-report');
        }
        if (this.hasReported(type, targetId)) return { duplicate: true };

        const item = {
            id: 'r' + Date.now(),
            type,
            targetId: String(targetId),
            reason,
            details: String(details).trim().slice(0, 500),
            status: 'pending', // traité ensuite par l'administrateur
            createdAt: Date.now()
        };
        Storage.set(REPORTS_KEY, [item, ...this.reports()]);
        return item;
    }

    // ----- Compte -----
    // Le statut vient du serveur : 'active' ou 'suspended'
    isSuspended(user) {
        return !!user && user.status === 'suspended';
    }

    // ----- Statut d'une annonce -----
    // 'pending' | 'rejected' | 'hidden' | 'published'
    listingStatus(listing) {
        if (!listing) return 'published';
        if (listing.status === 'pending' || listing.status === 'rejected') return listing.status;
        return listing.hidden ? 'hidden' : 'published';
    }

    // Visible par tout le monde (ni masquée, ni en attente, ni refusée)
    isListingPublic(listing) {
        return !!listing && !listing.hidden && (listing.status || 'published') === 'published';
    }

    // Modération préalable activée par l'administrateur (cahier section 11)
    preModeration() {
        return !!settings.preModeration;
    }
}

export default new ModerationService();