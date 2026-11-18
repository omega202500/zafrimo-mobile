import mockMessages from '../mocks/messages.js';
import Storage from './StorageService.js';
import Moderation from './ModerationService.js';
import Notifications from './NotificationService.js';
import I18n from './I18nService.js';

const SEEDED_KEY = 'conversations_seeded';
const LOCALES = { it: 'it-IT', fr: 'fr-FR', en: 'en-GB' };
const KEY = 'conversations_custom';

// TODO API : chaque mÃ©thode correspondra Ã  une route Laravel (GET/POST/PUT/DELETE /conversations)
class ConversationService {
    constructor() {
        this.listeners = new Map();
    }

    // TEST : au premier lancement, les conversations d'exemple sont copiÃ©es dans le stockage.
    // Ainsi les messages envoyÃ©s et l'Ã©tat "lu / non lu" sont conservÃ©s comme pour de vraies conversations.
    seed() {
        if (Storage.get(SEEDED_KEY)) return;
        Storage.set(SEEDED_KEY, true);
        Storage.set(KEY, [...(Storage.get(KEY) || []), ...this.convertMocks()]);
    }

    custom() {
        this.seed();
        return Storage.get(KEY) || [];
    }

    // Toutes les conversations (les plus rÃ©centes d'abord Ã  l'affichage, voir list())
    getAll() {
        return this.custom();
    }

    // Convertit les mocks en format moderne avec timestamps
    // Convertit les exemples en conversations complÃ¨tes, avec des horodatages fixes
    convertMocks() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        return mockMessages.map(m => {
            const messages = m.messages.map((msg, i) => ({
                id: 'm' + m.id + '-' + msg.id,
                sender: msg.sender,
                text: msg.text,
                sentAt: msg.sentAt || (now - (m.messages.length - i) * oneHour)
            }));

            // Les derniers messages (unreadCount) sont non lus : lastReadAt = le message juste avant
            const unread = Math.min(m.unreadCount || 0, messages.length);
            let lastReadAt = now;
            if (unread > 0) {
                const lastRead = messages[messages.length - unread - 1];
                lastReadAt = lastRead ? lastRead.sentAt : 0;
            }

            return {
                id: m.id,
                type: m.type || 'direct',
                other: {
                    id: m.ownerId || ('u-' + m.name.toLowerCase().replace(/\s+/g, '-')),
                    name: m.name,
                    photo: m.avatar,
                    online: m.online
                },
                listingId: null,
                listingTitle: m.listingTitle || '',
                messages,
                lastReadAt,
                expiresAt: m.expiresAt || null
            };
        });
    }

    list(user) {
        if (!user) return [];
        const all = this.getAll();
        return all
            .filter(c => c.messages && c.messages.length > 0)
            .sort((a, b) => {
                const lastA = a.messages[a.messages.length - 1]?.sentAt || 0;
                const lastB = b.messages[b.messages.length - 1]?.sentAt || 0;
                return lastB - lastA;
            });
    }

    getById(id) {
        return this.getAll().find(c => String(c.id) === String(id)) || null;
    }

    // Cherche une conversation existante pour le couple propriÃ©taire + annonce
    findByOwnerAndListing(ownerId, listingId) {
        return this.getAll().find(c =>
            c.type === 'direct' &&
            String(c.other.id) === String(ownerId) &&
            (listingId ? String(c.listingId) === String(listingId) : !c.listingId)
        );
    }

    // Cherche une conversation existante pour le propriÃ©taire (sans annonce)
    findByOwner(ownerId) {
        return this.getAll().find(c =>
            c.type === 'direct' &&
            String(c.other.id) === String(ownerId) &&
            !c.listingId
        );
    }

    // Ouvre une conversation depuis une annonce
    openFromListing(listing, user) {
        if (!user) return null;
        if (!listing || !listing.owner) return null;

        // Interdit de s'Ã©crire Ã  soi-mÃªme
        if (listing.ownerEmail && listing.ownerEmail === user.email) {
            return null;
        }

        const existing = this.findByOwnerAndListing(listing.owner.id, listing.id);
        if (existing) return existing;

        const newConv = {
            id: 'c' + Date.now(),
            type: 'direct',
            other: {
                id: listing.owner.id,
                name: listing.owner.name,
                photo: listing.owner.photo,
                online: listing.owner.online
            },
            listingId: listing.id,
            listingTitle: listing.title,
            messages: [],
            lastReadAt: Date.now(),
            expiresAt: null
        };

        Storage.set(KEY, [newConv, ...this.custom()]);
        return newConv;
    }

    // Ouvre une conversation depuis un profil (sans annonce)
    openFromOwner(owner, user) {
        if (!user) return null;
        if (!owner) return null;

        // Interdit de s'Ã©crire Ã  soi-mÃªme
        if (owner.ownerEmail && owner.ownerEmail === user.email) {
            return null;
        }

        const existing = this.findByOwner(owner.id);
        if (existing) return existing;

        const newConv = {
            id: 'c' + Date.now(),
            type: 'direct',
            other: {
                id: owner.id,
                name: owner.name,
                photo: owner.photo,
                online: owner.online
            },
            listingId: null,
            listingTitle: '',
            messages: [],
            lastReadAt: Date.now(),
            expiresAt: null
        };

        Storage.set(KEY, [newConv, ...this.custom()]);
        return newConv;
    }

    // Ouvre une conversation de consultation (aprÃ¨s paiement confirmÃ©)
    openConsultation({ consultant, user, durationHours }) {
        if (!user) return null;
        if (!consultant) return null;

        const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;

        const newConv = {
            id: 'consult-' + Date.now(),
            type: 'consultation',
            other: {
                id: consultant.id,
                name: consultant.name,
                photo: consultant.photo,
                online: consultant.online
            },
            listingId: null,
            listingTitle: '',
            messages: [],
            lastReadAt: Date.now(),
            expiresAt
        };

        Storage.set(KEY, [newConv, ...this.custom()]);
        return newConv;
    }

    // Envoie un message
    send(convId, text, audio = null) {
        const trimmed = String(text || '').trim();
        const audioData = audio && audio.src;
        if (!trimmed && !audioData) return false;
        if (trimmed.length > 1000) return false;
        if (audioData && (!/^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,/i.test(audioData) || audioData.length > 7000000)) return false;

        const conv = this.getById(convId);
        if (!conv) return false;
        // Interdit d'Ã©crire Ã  un utilisateur bloquÃ©
        if (Moderation.isBlocked(conv.other?.id)) return false;

        // Refuse l'envoi si la consultation est expirÃ©e
        if (conv.type === 'consultation' && this.isExpired(conv)) {
            return false;
        }

        const message = {
            id: 'm' + Date.now(),
            sender: 'me',
            text: trimmed,
            ...(audioData && { type: 'audio', audio: audioData, durationMs: audio.durationMs || 0 }),
            sentAt: Date.now(),
            status: 'sent'
        };

        conv.messages.push(message);
        this.persist(conv);

        // Notifie les Ã©couteurs
        this.notifyListeners(convId, message);

        // MOCK (Ã  supprimer au branchement du WebSocket) : accusÃ©s puis rÃ©ponse automatique
        if (conv.type === 'direct') {
            setTimeout(() => this.setStatus(convId, message.id, 'delivered'), 600);

            setTimeout(() => {
                const reply = {
                    id: 'm' + (Date.now() + 1),
                    sender: 'other',
                    text: 'Grazie per il messaggio! Ti risponderÃ² presto.',
                    sentAt: Date.now()
                };
                conv.messages.push(reply);
                this.persist(conv);

                const watching = this.listeners.get(convId) && this.listeners.get(convId).size > 0;
                this.setStatus(convId, message.id, 'read');
                this.notifyListeners(convId, reply);

                // Page fermÃ©e : on prÃ©vient par une notification
                if (!watching) {
                    Notifications.add({
                        event: 'message.received',
                        params: { name: conv.other ? conv.other.name : '' },
                        link: '/chat/' + convId,
                        uid: 'msg:' + reply.id
                    });
                }
            }, 1500);
        }

        return true;
    }
    
        // Enregistre une conversation modifiÃ©e
    persist(conv) {
        const customs = this.custom();
        const index = customs.findIndex(c => String(c.id) === String(conv.id));
        if (index !== -1) {
            customs[index] = conv;
            Storage.set(KEY, customs);
        }
    }

    // sent -> delivered -> read, jamais en arriÃ¨re
    // TODO API : ces Ã©tats viendront du serveur (Ã©vÃ©nement WebSocket "message.status")
    setStatus(convId, msgId, status) {
        const order = { sent: 1, delivered: 2, read: 3 };
        const conv = this.getById(convId);
        const msg = conv && conv.messages.find(m => m.id === msgId);
        if (!msg || (order[msg.status] || 0) >= order[status]) return;
        msg.status = status;
        this.persist(conv);
        window.dispatchEvent(new CustomEvent('zafrimo:message-status', { detail: { convId, msgId, status } }));
    }
    // Marque comme lus
    markRead(convId) {
        const conv = this.getById(convId);
        if (!conv) return;

        conv.lastReadAt = Date.now();

        const customs = this.custom();
        const index = customs.findIndex(c => String(c.id) === String(convId));
        if (index !== -1) {
            customs[index] = conv;
            Storage.set(KEY, customs);
        }

        // Ouvrir la conversation marque aussi ses notifications comme lues
        Notifications.markReadByLink('/chat/' + convId);
        Notifications.markReadByLink('/consultation/' + convId);
        window.dispatchEvent(new CustomEvent('zafrimo:unread-changed'));
    }

    // Nombre de messages non lus dans une conversation
    unreadCount(conv) {
        if (!conv || !conv.messages) return 0;
        return conv.messages.filter(m =>
            m.sender === 'other' && m.sentAt > (conv.lastReadAt || 0)
        ).length;
    }

    // Total de messages non lus pour l'utilisateur
    totalUnread() {
        const all = this.getAll();
        return all.reduce((sum, conv) => sum + this.unreadCount(conv), 0);
    }

    // VÃ©rifie si une consultation est expirÃ©e
    isExpired(conv) {
        if (!conv || conv.type !== 'consultation' || !conv.expiresAt) return false;
        return Date.now() > conv.expiresAt;
    }

    // Temps restant en millisecondes
    remainingMs(conv) {
        if (!conv || conv.type !== 'consultation' || !conv.expiresAt) return 0;
        return Math.max(0, conv.expiresAt - Date.now());
    }

    // Liste des consultations
    consultations() {
        return this.getAll().filter(c => c.type === 'consultation');
    }

    // Abstraction temps rÃ©el : s'abonner aux nouveaux messages
    onMessage(convId, callback) {
        if (!this.listeners.has(convId)) {
            this.listeners.set(convId, new Set());
        }
        this.listeners.get(convId).add(callback);

        // Retourne une fonction de dÃ©sinscription
        return () => {
            const set = this.listeners.get(convId);
            if (set) {
                set.delete(callback);
                if (set.size === 0) {
                    this.listeners.delete(convId);
                }
            }
        };
    }

    notifyListeners(convId, message) {
        const set = this.listeners.get(convId);
        if (set) {
            set.forEach(callback => callback(message));
        }
        // Les compteurs (onglet Messages, icÃ´ne) se mettent Ã  jour en direct
        window.dispatchEvent(new CustomEvent('zafrimo:unread-changed'));
    }

    // Formatage selon la langue active.
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const locale = LOCALES[I18n.getCurrentLang()] || 'it-IT';

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        }

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return I18n.t('notif.time.yesterday'); // clÃ© crÃ©Ã©e au module 6
        }

        return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    }
}

export default new ConversationService();


