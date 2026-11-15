import settings from '../mocks/settings.js';

// Service unique pour savoir qui a le droit de faire quoi (selon les étoiles).
class PermissionService {
    getSettings() {
        return settings; // TODO API : GET /settings
    }

    // Nombre d'étoiles demandé : 'publish' (annonces + actualités) ou 'consultant'
    required(kind = 'publish') {
        return kind === 'consultant' ? settings.consultantStars : settings.publishStars;
    }

    // Retourne tout ce qu'une page a besoin de savoir
    check(user, kind = 'publish') {
        const required = this.required(kind);
        const stars = (user && user.stars) || 0;
        return {
            allowed: stars >= required,
            required,
            stars,
            missing: Math.max(0, required - stars)
        };
    }

    canPublish(user) {
        return this.check(user, 'publish').allowed;
    }

    canBeConsultant(user) {
        return this.check(user, 'consultant').allowed;
    }
}

export default new PermissionService();