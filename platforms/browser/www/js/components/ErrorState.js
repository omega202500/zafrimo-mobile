import I18n from '../services/I18nService.js';

// Écran affiché quand une page n'a pas pu se charger (erreur, ou pas de connexion)
export default class ErrorState {
    static render({ offline = false } = {}) {
        const t = (key) => I18n.t(key);
        return `
            <section class="system-state">
                <div class="system-icon">${offline ? '📡' : '⚠️'}</div>
                <h1>${t(offline ? 'system.offlineTitle' : 'system.errorTitle')}</h1>
                <p class="muted">${t(offline ? 'system.offlineText' : 'system.errorText')}</p>
                <button class="btn btn-lime" data-retry>${t('system.retry')}</button>
                <button class="btn btn-glass" data-home>${t('system.home')}</button>
            </section>
        `;
    }

    static bind(root, { onRetry, onHome }) {
        root.querySelector('[data-retry]').onclick = onRetry;
        root.querySelector('[data-home]').onclick = onHome;
    }
}