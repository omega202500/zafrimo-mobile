import Notifications from './NotificationService.js';
import Storage from './StorageService.js';
import Auth from './AuthService.js';

const TOKEN_KEY = 'fcm_token';
const PROMPT_KEY = 'push_prompt';

// Notifications push FCM via cordova-plugin-firebasex (cahier 8.3 et 13).
// Contrat avec le serveur : message FCM contenant "event", "link", "uid" et "params" (texte JSON).
// TODO API : POST /me/devices { token, platform } · DELETE /me/devices/:token à la déconnexion
class PushService {
    constructor() {
        this.app = null;
        this.started = false;
    }

    available() {
        return !!(window.cordova && window.FirebasePlugin);
    }

    init(app) {
        this.app = app;
        if (!this.available() || this.started) return;
        this.started = true;

        const fb = window.FirebasePlugin;
        fb.onMessageReceived((message) => this.handleMessage(message), (err) => console.warn('push:', err));
        fb.onTokenRefresh((token) => this.saveToken(token), (err) => console.warn('push token:', err));

        // Si l'autorisation est déjà donnée, on récupère le jeton sans rien demander
        this.hasPermission().then(granted => {
            if (granted && Auth.isLogged()) this.fetchToken();
        });
    }

    hasPermission() {
        return new Promise(resolve => {
            if (!this.available()) return resolve(false);
            window.FirebasePlugin.hasPermission(ok => resolve(!!ok), () => resolve(false));
        });
    }

    // Faut-il proposer d'activer les notifications ? (jamais dans le navigateur)
    async shouldAskPermission() {
        if (!this.available() || Storage.get(PROMPT_KEY) === 'dismissed') return false;
        return !(await this.hasPermission());
    }

    dismissPrompt() {
        Storage.set(PROMPT_KEY, 'dismissed');
    }

    // Demande l'autorisation (iOS et Android 13+) puis enregistre le jeton
    async register() {
        if (!this.available()) return false;
        const fb = window.FirebasePlugin;

        const granted = await new Promise(resolve => {
            fb.grantPermission(ok => resolve(!!ok), () => resolve(false));
        });
        if (!granted) return false;

        this.fetchToken();
        return true;
    }

    fetchToken() {
        window.FirebasePlugin.getToken(
            (token) => this.saveToken(token),
            (err) => console.warn('push token:', err)
        );
    }

    saveToken(token) {
        if (!token) return;
        Storage.set(TOKEN_KEY, token);
        // TODO API : POST /me/devices { token, platform: cordova.platformId }
    }

    // Message reçu : l'app est ouverte (message.tap absent) ou l'utilisateur a tapé la notification
    handleMessage(message) {
        if (!message || !Auth.isLogged()) return;

        let params = message.params;
        if (typeof params === 'string') {
            try { params = JSON.parse(params); } catch (e) { params = {}; }
        }

        const tapped = !!message.tap;
        Notifications.add({
            event: message.event,
            params: params || {},
            link: message.link,
            uid: message.uid || null,
            silent: tapped // si l'utilisateur a tapé la notification, pas de bannière en plus
        });

        if (tapped) {
            Notifications.markReadByUid(message.uid);
            const link = Notifications.safeLink(message.link);
            if (link && this.app) this.app.router.go(link);
        }
    }

    // Badge sur l'icône de l'application
    setBadge(count) {
        if (!this.available() || !window.FirebasePlugin.setBadgeNumber) return;
        window.FirebasePlugin.setBadgeNumber(count);
    }
}

export default new PushService();