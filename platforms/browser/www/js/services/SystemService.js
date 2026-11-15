import Toast from '../components/Toast.js';
import I18n from './I18nService.js';

export const SESSION_EXPIRED_EVENT = 'zafrimo:session-expired';

// Réseau, session expirée et erreurs non gérées
class SystemService {
    constructor() {
        this.app = null;
        this.started = false;
    }

    start(app) {
        this.app = app;
        if (this.started) return;
        this.started = true;

        // Connexion : barre rouge hors ligne, message vert au retour
        window.addEventListener('offline', () => this.updateNetwork());
        window.addEventListener('online', () => {
            this.updateNetwork();
            Toast.show(I18n.t('system.backOnline'), { type: 'success' });
        });
        this.updateNetwork();

        // Session expirée (jeton refusé par l'API, voir ApiService) : retour à la connexion
        window.addEventListener(SESSION_EXPIRED_EVENT, () => {
            Toast.show(I18n.t('system.sessionExpired'), { type: 'error', duration: 5000 });
            this.app.router.go('/login');
        });

        // Erreur oubliée dans un clic ou un appel asynchrone : on prévient au lieu de ne rien afficher
        window.addEventListener('unhandledrejection', (event) => {
            console.error(event.reason);
            if (event.reason && event.reason.message === 'session-expired') return; // déjà signalée
            Toast.show(I18n.t(navigator.onLine ? 'system.errorToast' : 'system.offlineToast'), { type: 'error' });
        });
    }

    updateNetwork() {
        let bar = document.querySelector('.offline-bar');

        if (navigator.onLine) {
            if (bar) bar.remove();
            return;
        }

        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'offline-bar';
            bar.setAttribute('role', 'status');
            document.body.appendChild(bar);
        }
        bar.textContent = I18n.t('system.offlineBar');
    }
}

export default new SystemService();