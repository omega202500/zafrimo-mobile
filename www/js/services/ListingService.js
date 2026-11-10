import mockListings from '../mocks/listings.js';
import Storage from './StorageService.js';
import Moderation from './ModerationService.js';
import settings from '../mocks/settings.js';

const KEY = 'listings_custom';

export const KINDS = ['sale', 'rent', 'seasonal'];
export const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'penthouse', 'office', 'land'];
export const PERIODS = ['spring', 'summer', 'autumn', 'winter', 'year'];
export const CITIES = [
    'Milano', 'Roma', 'Napoli', 'Torino', 'Palermo',
    'Genova', 'Bologna', 'Firenze', 'Bari', 'Catania'
];
export const MAX_PHOTOS = 6;
export const PAGE_SIZE = 5;

export const DEFAULT_FILTERS = {
    query: '',
    kind: '',
    propertyType: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    period: '',
    sort: 'recent'
};

// TODO API : chaque méthode correspondra à une route Laravel (GET/POST/PUT/DELETE /listings)
class ListingService {
    constructor() {
        this.filters = { ...DEFAULT_FILTERS };
    }

    custom() {
        const list = Storage.get(KEY) || [];
        const me = Storage.get('user');
        if (!me) return list;
        // Mes annonces affichent toujours mon profil à jour (photo, statut, ville...)
        return list.map(l => (l.ownerEmail && l.ownerEmail === me.email) ? { ...l, owner: this.buildOwner(me) } : l);
    }

    // Les annonces des membres d'abord (les plus récentes en premier), puis les exemples
    getAll(user) {
        const custom = this.custom();
        const all = [...custom, ...mockListings];
        return user ? all : this.getPublic();
    }

       // Annonces visibles par tous : ni masquées, ni en attente/refusées, ni d'un utilisateur bloqué
    getPublic() {
        return [...this.custom(), ...mockListings].filter(l =>
            Moderation.isListingPublic(l) && !Moderation.isBlocked(l.owner?.id)
        );
    }

    getById(id) {
        return this.getAll().find(l => String(l.id) === String(id)) || null;
    }

    getMine(user) {
        if (!user) return [];
        return this.custom().filter(l => this.isAuthor(l, user));
    }

    getByOwner(ownerId) {
        return this.getAll().filter(l => String(l.owner?.id) === String(ownerId));
    }

    // Seul l'auteur peut modifier ou supprimer son annonce
    isAuthor(item, user) {
        return !!(item && user && item.ownerEmail && item.ownerEmail === user.email);
    }

    cities() {
        return CITIES;
    }

    // Recherche texte sans accents/casse sur titre, ville, adresse, description
    apply(items, filters) {
        let result = [...items];

        // Recherche texte
        if (filters.query) {
            const q = filters.query
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            result = result.filter(l => {
                const searchIn = [
                    l.title || '',
                    l.city || '',
                    l.address || '',
                    l.description || ''
                ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return searchIn.includes(q);
            });
        }

        // Filtre type d'annonce
        if (filters.kind) {
            result = result.filter(l => l.kind === filters.kind);
        }

        // Filtre type de bien
        if (filters.propertyType) {
            result = result.filter(l => l.propertyType === filters.propertyType);
        }

        // Filtre ville
        if (filters.city) {
            result = result.filter(l => l.city === filters.city);
        }

        // Filtre prix
        if (filters.minPrice !== '') {
            result = result.filter(l => l.price >= parseFloat(filters.minPrice));
        }
        if (filters.maxPrice !== '') {
            result = result.filter(l => l.price <= parseFloat(filters.maxPrice));
        }

        // Filtre période : une annonce "year" convient à toute saison
        // une annonce sans période est exclue si une saison est choisie
        if (filters.period && filters.period !== 'year') {
            result = result.filter(l => {
                if (!l.period) return false;
                if (l.period === 'year') return true;
                return l.period === filters.period;
            });
        }

        // Tri
        if (filters.sort === 'recent') {
            result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        } else if (filters.sort === 'price_asc') {
            result.sort((a, b) => a.price - b.price);
        } else if (filters.sort === 'price_desc') {
            result.sort((a, b) => b.price - a.price);
        }

        return result;
    }

    activeCount(filters) {
        return this.apply(this.getPublic(), filters).length;
    }

    formatPrice(listing) {
        return listing.price.toLocaleString('it-IT');
    }

    buildOwner(user) {
        return {
            id: 'u-' + user.email,
            name: user.name || user.username || 'Utente',
            stars: user.stars || 0,
            online: user.available !== false,
            isConsultant: !!user.isConsultant,
            specialty: user.specialty || (user.isConsultant ? 'Consulente' : 'Proprietario'),
            city: user.city || '',
            hours: (user.hoursFrom && user.hoursTo) ? `${user.hoursFrom} - ${user.hoursTo}` : '',
            rate: user.isConsultant ? user.rate : undefined,
            photo: user.photo || 'assets/img/owner-avatar.webp'
        };
    }

    build(data) {
        return {
            title: data.title,
            description: data.description,
            photos: data.photos || [],
            photo: data.photos && data.photos.length > 0 ? data.photos[0] : '',
            price: data.price,
            city: data.city,
            address: data.address || '',
            kind: data.kind,
            propertyType: data.propertyType,
            period: data.kind === 'seasonal' ? (data.period || '') : '',
            beds: data.beds || 0,
            baths: data.baths || 0,
            parking: data.parking || 0,
            area: data.area || 0,
            hidden: false,
            status: settings.preModeration ? 'pending' : 'published'
        };
    }

    create(user, data) {
        const item = {
            id: 'u' + Date.now(),
            ...this.build(data),
            owner: this.buildOwner(user),
            ownerEmail: user.email,
            createdAt: new Date().toISOString()
        };
        Storage.set(KEY, [item, ...this.custom()]);
        return item;
    }

    update(id, data) {
        const list = this.custom();
        const index = list.findIndex(l => String(l.id) === String(id));
        if (index === -1) throw new Error('not-found');
        list[index] = { ...list[index], ...this.build(data) };
        Storage.set(KEY, list);
        return list[index];
    }

    setHidden(id, hidden) {
        const list = this.custom();
        const index = list.findIndex(l => String(l.id) === String(id));
        if (index === -1) throw new Error('not-found');
        list[index].hidden = hidden;
        Storage.set(KEY, list);
    }

    remove(id) {
        Storage.set(KEY, this.custom().filter(l => String(l.id) !== String(id)));
    }
}

export default new ListingService();
