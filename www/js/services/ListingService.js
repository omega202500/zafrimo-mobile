import Api, { ApiError } from './ApiService.js';
import Moderation from './ModerationService.js';

export const KINDS = ['sale', 'rent', 'seasonal'];
// Codes de l'application. La correspondance avec les types de la base est faite par l'API (PropertyTypes.php)
export const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'penthouse', 'office', 'land', 'commercial', 'garage', 'rustic'];
export const PERIODS = ['spring', 'summer', 'autumn', 'winter', 'year'];
// Liste de secours : remplacée par les villes de l'API dès que la liste est chargée
export const CITIES = [
    'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo',
    'Genova', 'Bologna', 'Firenze', 'Bari', 'Venezia'
];
export const MAX_PHOTOS = 6;
export const PAGE_SIZE = 5;

const UPLOAD_TIMEOUT_MS = 90000; // l'envoi de plusieurs photos peut être long en 3G/4G
const MAX_API_PAGES = 10;        // 10 pages x 100 annonces

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

// CONNECTÉ À L'API : GET /cities · GET /listings · GET /listings/me · GET /listings/{id}
//   · POST /listings · POST /listings/{id} (_method=PUT) · PATCH /listings/{id}/hidden · DELETE /listings/{id}
//
// Les pages restent synchrones : elles appellent d'abord load() / loadMine() / fetch() dans onEnter(),
// puis lisent les annonces mises en mémoire avec getPublic(), getById()...
// Recherche, filtres et tri se font sur ces annonces (suffisant jusqu'à quelques centaines d'annonces).
class ListingService {
    constructor() {
        this.filters = { ...DEFAULT_FILTERS };
        this.items = [];      // annonces publiques
        this.mine = [];       // mes annonces (tous statuts)
        this.current = null;  // dernière annonce ouverte en détail
        this.citiesLoaded = false;
    }

    // ───────── Conversion API -> modèle de l'application ─────────
    fromApi(a) {
        const o = a.owner || {};
        const photos = (a.photos || []).map(p => p.url);
        const rate = o.is_consultant && o.consultation_price_cents ? o.consultation_price_cents / 100 : undefined;

        return {
            id: a.id,
            title: a.title,
            description: a.description,
            price: Number(a.price_cents || 0) / 100,
            city: a.city ? a.city.name : '',
            address: a.address_label || '',
            kind: a.listing_type,
            propertyType: a.property_type ? (a.property_type.code || a.property_type.slug) : '',
            period: a.season_period || '',
            beds: a.bedrooms || 0,
            baths: a.bathrooms || 0,
            parking: a.parking || 0,
            area: a.surface_m2 || 0,
            photos,
            photo: a.cover_photo_url || photos[0] || '',
            photoPaths: (a.photos || []).map(p => p.path), // chemins serveur, utiles pour modifier les photos
            status: a.status,
            hidden: a.status === 'hidden',
            moderationNote: a.moderation_note || '',
            createdAt: a.created_at,
            owner: {
                id: o.id,
                name: o.display_name || 'Utente',
                stars: o.stars_count || 0,
                online: o.availability_status !== 'unavailable',
                isConsultant: !!o.is_consultant,
                specialty: o.specialty || (o.is_consultant ? 'Consulente' : 'Proprietario'),
                city: o.city || '',
                hours: '',
                rate,
                photo: o.photo_url || 'assets/img/owner-avatar.webp'
            }
        };
    }

    // ───────── Chargement (à appeler dans onEnter) ─────────
    async fetchAll(path) {
        const out = [];
        for (let page = 1; page <= MAX_API_PAGES; page++) {
            const res = await Api.get(`${path}?per_page=100&page=${page}`);
            out.push(...res.data.map(a => this.fromApi(a)));
            if (page >= res.last_page) break;
        }
        return out;
    }

    async load() {
        const [items] = await Promise.all([this.fetchAll('/listings'), this.loadCities()]);
        this.items = items;
        return items;
    }

    async loadMine() {
        this.mine = await this.fetchAll('/listings/me');
        return this.mine;
    }

    async loadCities() {
        if (this.citiesLoaded) return;
        try {
            const res = await Api.get('/cities');
            const names = res.cities.map(c => c.name);
            // Modification sur place : FilterPanel, publication et profil partagent ce même tableau
            if (names.length) CITIES.splice(0, CITIES.length, ...names);
            this.citiesLoaded = true;
        } catch {
            // On garde la liste de secours
        }
    }

    // Détail d'une annonce. Renvoie null si elle n'existe pas ou n'est pas visible.
    async fetch(id) {
        try {
            const res = await Api.get('/listings/' + id);
            this.current = this.fromApi(res.listing);
            return this.current;
        } catch (err) {
            if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
            throw err;
        }
    }

    // ───────── Lecture synchrone (après chargement) ─────────
    getAll() {
        const ids = new Set();
        return [...this.mine, ...this.items].filter(l => (ids.has(l.id) ? false : ids.add(l.id)));
    }

    // Annonces visibles par tous : ni masquées, ni en attente/refusées, ni d'un utilisateur bloqué
    getPublic() {
        return this.items.filter(l => Moderation.isListingPublic(l) && !Moderation.isBlocked(l.owner?.id));
    }

    getById(id) {
        if (this.current && String(this.current.id) === String(id)) return this.current;
        return this.getAll().find(l => String(l.id) === String(id)) || null;
    }

    getMine(user) {
        return user ? this.mine : [];
    }

    getByOwner(ownerId) {
        return this.getAll().filter(l => String(l.owner?.id) === String(ownerId));
    }

    // Seul l'auteur peut modifier ou supprimer son annonce
    isAuthor(item, user) {
        return !!(item && user && item.owner && String(item.owner.id) === String(user.id));
    }

    cities() {
        return CITIES;
    }

    // Recherche texte sans accents/casse sur titre, ville, adresse, description
    apply(items, filters) {
        let result = [...items];

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

        if (filters.kind) {
            result = result.filter(l => l.kind === filters.kind);
        }
        if (filters.propertyType) {
            result = result.filter(l => l.propertyType === filters.propertyType);
        }
        if (filters.city) {
            result = result.filter(l => l.city === filters.city);
        }
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

    // ───────── Écriture ─────────
    // Convertit une photo "data:image/jpeg;base64,..." en fichier à envoyer
    // (sans fetch() : la CSP de l'application n'autorise pas les URL data: dans connect-src)
    dataUrlToBlob(dataUrl) {
        const [head, b64] = dataUrl.split(',');
        const mime = (head.match(/^data:(.*?);base64$/) || [])[1] || 'image/jpeg';
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    extension(blob) {
        return { 'image/png': 'png', 'image/webp': 'webp' }[blob.type] || 'jpg';
    }

    buildForm(data, original) {
        const fd = new FormData();
        fd.append('listing_type', data.kind);
        fd.append('property_type', data.propertyType);
        fd.append('title', data.title);
        fd.append('description', data.description);
        fd.append('price_cents', String(Math.round(data.price * 100)));
        fd.append('city', data.city);
        fd.append('address_label', data.address || '');
        fd.append('surface_m2', String(data.area));
        fd.append('bedrooms', String(data.beds || 0));
        fd.append('bathrooms', String(data.baths || 0));
        fd.append('parking', String(data.parking || 0));
        if (data.kind === 'seasonal' && data.period) fd.append('season_period', data.period);

        // Photos : les nouvelles (data:) sont envoyées ; les existantes sont désignées par leur chemin serveur.
        // photo_order donne l'ordre final, la première est la couverture.
        let newCount = 0;
        data.photos.forEach((photo, i) => {
            if (photo.startsWith('data:')) {
                const blob = this.dataUrlToBlob(photo);
                fd.append('photos[]', blob, `photo-${i}.${this.extension(blob)}`);
                if (original) fd.append('photo_order[]', `new:${newCount}`);
                newCount++;
            } else if (original) {
                const path = original.photoPaths[original.photos.indexOf(photo)];
                if (path) fd.append('photo_order[]', path);
            }
        });
        return fd;
    }

    // Transforme une erreur de l'API en Error('code') avec, si possible, le champ fautif
    toError(err) {
        if (!(err instanceof ApiError)) return err;

        let code = 'generic';
        let fields;
        if (err.status === 0) code = 'network';
        else if (err.status === 403 || err.status === 404) code = 'not-found';
        else if (err.status === 422) {
            const errors = (err.data && err.data.errors) || {};
            const MAP = {
                title: 'title', description: 'description', price_cents: 'price', city: 'city', city_id: 'city',
                property_type: 'propertyType', property_type_id: 'propertyType', surface_m2: 'area',
                season_period: 'period', photos: 'photo', photo_order: 'photo'
            };
            fields = {};
            Object.keys(errors).forEach(key => {
                const field = MAP[key.split('.')[0]];
                if (field) fields[field] = key.startsWith('photos.') ? 'photo-size' : 'invalid';
            });
            code = errors.stars ? 'not-enough-stars' : 'invalid';
        }

        const error = new Error(code);
        error.status = err.status;
        if (fields && Object.keys(fields).length) error.fields = fields;
        return error;
    }

    async create(user, data) {
        try {
            const res = await Api.post('/listings', this.buildForm(data), { timeout: UPLOAD_TIMEOUT_MS });
            const item = this.fromApi(res.listing);
            this.mine = [item, ...this.mine.filter(l => l.id !== item.id)];
            return item;
        } catch (err) {
            throw this.toError(err);
        }
    }

    async update(id, data) {
        const original = this.getById(id);
        if (!original) throw new Error('not-found');

        const fd = this.buildForm(data, original);
        fd.append('_method', 'PUT');
        try {
            const res = await Api.post('/listings/' + id, fd, { timeout: UPLOAD_TIMEOUT_MS });
            const item = this.fromApi(res.listing);
            this.current = item;
            this.mine = this.mine.map(l => (String(l.id) === String(id) ? item : l));
            this.items = this.items.filter(l => String(l.id) !== String(id));
            return item;
        } catch (err) {
            throw this.toError(err);
        }
    }

    async setHidden(id, hidden) {
        try {
            const res = await Api.patch(`/listings/${id}/hidden`, { hidden });
            const apply = l => (String(l.id) === String(id) ? { ...l, hidden: res.status === 'hidden', status: res.status } : l);
            this.mine = this.mine.map(apply);
            this.items = this.items.map(apply);
            if (this.current) this.current = apply(this.current);
        } catch (err) {
            throw this.toError(err);
        }
    }

    async remove(id) {
        try {
            await Api.delete('/listings/' + id);
        } catch (err) {
            throw this.toError(err);
        }
        const keep = l => String(l.id) !== String(id);
        this.mine = this.mine.filter(keep);
        this.items = this.items.filter(keep);
        if (this.current && String(this.current.id) === String(id)) this.current = null;
    }
}

export default new ListingService();
