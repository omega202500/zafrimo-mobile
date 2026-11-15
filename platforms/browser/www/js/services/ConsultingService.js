import Storage from './StorageService.js';
import Auth from './AuthService.js';
import I18n from './I18nService.js';
import ListingService from './ListingService.js';
import ConversationService from './ConversationService.js';
import settings from '../mocks/settings.js';
import Notifications from './NotificationService.js';

const PAYMENTS_KEY = 'payments';
const PAYOUTS_KEY = 'payouts';
const LOCALES = { it: 'it-IT', fr: 'fr-FR', en: 'en-GB' };

// Tous les montants sont stockés en centimes (entiers) pour éviter les erreurs d'arrondi.
// TODO API (Laravel) :
//   GET  /consultants/:id          -> getConsultant / getQuote
//   POST /consultations/checkout   -> createCheckout (le serveur calcule le montant)
//   GET  /payments/:id             -> getPayment (statut mis à jour par les webhooks Stripe/PayPal)
//   GET  /payments                 -> myPayments
//   GET  /earnings, GET /payouts   -> earnings, payouts
class ConsultingService {
    // ----- Formats -----
    locale() {
        return LOCALES[I18n.getCurrentLang()] || 'it-IT';
    }

    formatMoney(cents) {
        return (cents / 100).toLocaleString(this.locale(), { style: 'currency', currency: 'EUR' });
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString(this.locale(), { day: '2-digit', month: 'short', year: 'numeric' });
    }

    userId(user) {
        return user ? 'u-' + user.email : null;
    }

    // ----- Consultants -----
    // Un consultant = un propriétaire autorisé par l'administrateur (isConsultant)
    getConsultant(id) {
        if (!id) return null;
        const all = ListingService.getAll(Auth.user());
        const match = all.find(l => String(l.owner?.id) === String(id));
        return match && match.owner && match.owner.isConsultant ? match.owner : null;
    }

    priceCents(consultant) {
        const euros = Number(consultant?.rate) > 0 ? Number(consultant.rate) : settings.defaultConsultationPrice;
        return Math.round(euros * 100);
    }

    // Devis calculé par le "serveur" : jamais fourni par l'écran (cahier 10.7)
    getQuote(consultantId) {
        const consultant = this.getConsultant(consultantId);
        if (!consultant) return null;
        return {
            consultant,
            amountCents: this.priceCents(consultant),
            durationHours: settings.consultationDurationHours
        };
    }

    paymentMethods() {
        const list = ['card', 'paypal'];
        if (settings.mobileMoneyEnabled) list.push('mobile_money');
        return list;
    }

    // ----- Paiements -----
    all() {
        return Storage.get(PAYMENTS_KEY) || [];
    }

    // Crée un paiement "en attente". Montant et commission calculés ici, pas dans l'écran.
    createCheckout({ consultantId, method }) {
        const user = Auth.user();
        if (!user) throw new Error('not-logged');
        if (!this.paymentMethods().includes(method)) throw new Error('invalid-method');
        if (String(consultantId) === this.userId(user)) throw new Error('own-consultant');

        const quote = this.getQuote(consultantId);
        if (!quote) throw new Error('consultant-not-found');

        const commissionCents = Math.round(quote.amountCents * settings.commissionRate);
        const payment = {
            id: 'p' + Date.now(),
            reference: 'ZAF-' + String(Date.now()).slice(-6),
            clientEmail: user.email,
            consultantId: String(quote.consultant.id),
            consultantName: quote.consultant.name,
            consultantPhoto: quote.consultant.photo || '',
            method,
            currency: 'EUR',
            amountCents: quote.amountCents,
            commissionRate: settings.commissionRate,
            commissionCents,
            netCents: quote.amountCents - commissionCents,
            durationHours: quote.durationHours,
            status: 'pending', // 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
            conversationId: null,
            createdAt: Date.now(),
            paidAt: null
        };
        Storage.set(PAYMENTS_KEY, [payment, ...this.all()]);
        return payment;
    }

    // TEST uniquement : simule la confirmation du serveur (webhook) après un délai.
    // La conversation s'ouvre une seule fois : le statut passe de 'pending' à 'paid' une seule fois.
    mockSettle(payment) {
        const outcome = settings.mockPaymentOutcome;
        if (payment.status !== 'pending' || outcome === 'pending') return payment;
        if (Date.now() - payment.createdAt < settings.mockWebhookDelayMs) return payment;

        const next = { ...payment, status: outcome };
        if (outcome === 'paid') {
            next.paidAt = Date.now();
            const consultant = this.getConsultant(payment.consultantId) || {
                id: payment.consultantId,
                name: payment.consultantName,
                photo: payment.consultantPhoto,
                online: false
            };
            const conv = ConversationService.openConsultation({
                consultant,
                user: Auth.user(),
                durationHours: payment.durationHours
            });
            next.conversationId = conv ? conv.id : null;
                        // MOCK du serveur : notification "paiement confirmé" (sans bannière, l'écran de résultat l'affiche déjà)
            Notifications.add({
                event: 'payment.confirmed',
                params: { name: payment.consultantName },
                link: next.conversationId ? '/consultation/' + next.conversationId : '/my-payments',
                uid: 'pay:' + payment.id,
                silent: true
            });
        }
        return next;
    }

    getPayment(id) {
        const list = this.all();
        const index = list.findIndex(p => String(p.id) === String(id));
        if (index === -1) return null;

        const settled = this.mockSettle(list[index]);
        if (settled !== list[index]) {
            list[index] = settled;
            Storage.set(PAYMENTS_KEY, list);
        }
        return settled;
    }

    // Un paiement n'est visible que par son client
    getMyPayment(id, user) {
        const payment = this.getPayment(id);
        return payment && user && payment.clientEmail === user.email ? payment : null;
    }

    myPayments(user) {
        if (!user) return [];
        return this.all()
            .map(p => this.getPayment(p.id))
            .filter(p => p && p.clientEmail === user.email)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    // ----- Côté consultant -----
    isConsultantOf(payment, user) {
        if (!user) return false;
        if (String(payment.consultantId) === this.userId(user)) return true;
        // TEST uniquement : les données de test n'ont pas d'identifiants cohérents
        return !!settings.devConsultantSeesAll && !!user.isConsultant;
    }

    consultantPayments(user) {
        return this.all()
            .map(p => this.getPayment(p.id))
            .filter(p => p && p.status === 'paid' && this.isConsultantOf(p, user))
            .sort((a, b) => b.paidAt - a.paidAt);
    }

    // Versements effectués manuellement par l'administrateur (cahier 10.4)
    // Entrée : { id, consultantId, amountCents, date, note }
    payouts(user) {
        if (!user) return [];
        return (Storage.get(PAYOUTS_KEY) || [])
            .filter(po => String(po.consultantId) === this.userId(user) || (settings.devConsultantSeesAll && user.isConsultant))
            .sort((a, b) => b.date - a.date);
    }

    // Brut, commission, net, déjà versé, reste à recevoir (cahier 10.4)
    earnings(user) {
        const payments = this.consultantPayments(user);
        const payouts = this.payouts(user);
        const sum = (items, key) => items.reduce((total, item) => total + (item[key] || 0), 0);

        const grossCents = sum(payments, 'amountCents');
        const commissionCents = sum(payments, 'commissionCents');
        const netCents = grossCents - commissionCents;
        const paidOutCents = sum(payouts, 'amountCents');

        return {
            payments,
            payouts,
            grossCents,
            commissionCents,
            netCents,
            paidOutCents,
            toPayCents: Math.max(0, netCents - paidOutCents)
        };
    }
}

export default new ConsultingService();