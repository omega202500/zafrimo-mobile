import Storage from './StorageService.js';
import Auth from './AuthService.js';

export const LIMITS = { usernameMin: 2, usernameMax: 30, specialtyMax: 60, descriptionMax: 500 };

// Profil du membre (cahier 6.2, 6.3 et 8.2)
// TODO API : PUT /me (profil) · PUT /me/availability
class ProfileService {
    // Propriétaire / professionnel / consultant : profil public complet
    isOwnerProfile(user) {
        return !!user && user.role !== 'visitor';
    }

    // Le membre est-il disponible pour répondre ? (cahier 8.2)
    isAvailable(user) {
        return !user || user.available !== false;
    }

    setAvailable(value) {
        const user = Auth.user();
        if (!user) return;
        Storage.set('user', { ...user, available: !!value });
    }

    // Réduit une photo de profil (max 400 px) pour garder un stockage léger
    shrinkImage(dataUrl, max = 400) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(1, max / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => reject(new Error('unsupported-format'));
            img.src = dataUrl;
        });
    }

    // Renvoie les erreurs sous la forme { champ: 'clé de traduction' } (vide si tout est bon)
    validate(data, { isOwner }) {
        const errors = {};
        const name = (data.username || '').trim();

        if (name.length < LIMITS.usernameMin || name.length > LIMITS.usernameMax) {
            errors.username = 'editProfile.errUsername';
        }
        if (!(data.city || '').trim()) {
            errors.city = 'editProfile.errCity';
        }
        if (isOwner) {
            const from = data.hoursFrom || '';
            const to = data.hoursTo || '';
            // Les deux heures ensemble ou aucune, et la fin après le début
            if ((from && !to) || (!from && to) || (from && to && to <= from)) {
                errors.hours = 'editProfile.errHours';
            }
        }
        return errors;
    }

    // Le numéro de téléphone n'est jamais modifié ni affiché ici (cahier 6.2)
    async update(data) {
        await new Promise(resolve => setTimeout(resolve, 300)); // simulation de l'API
        const user = Auth.user();
        if (!user) throw new Error('not-logged');

        const next = {
            ...user,
            username: data.username.trim(),
            name: data.username.trim(),
            city: data.city.trim(),
            photo: data.photo || ''
        };

        if (this.isOwnerProfile(user)) {
            next.specialty = (data.specialty || '').trim().slice(0, LIMITS.specialtyMax);
            next.hoursFrom = data.hoursFrom || '';
            next.hoursTo = data.hoursTo || '';
            next.description = (data.description || '').trim().slice(0, LIMITS.descriptionMax);
        }

        Storage.set('user', next);
        return next;
    }
}

export default new ProfileService();