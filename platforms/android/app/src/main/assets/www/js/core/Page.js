import I18n from '../services/I18nService.js';
import Auth from '../services/AuthService.js';
import Notifications from '../services/NotificationService.js';

export default class Page {
  static route = '/';
  static access = 'public';
  static tabs = false;       // true => affiche la barre de navigation
  static fullscreen = false; // true => page plein écran (chat)

  constructor(app, params = {}) {
    this.app = app;
    this.params = params;
    this.el = null;
  }

  t(key) {
    return I18n.t(key);
  }

  header(title, options = true) {
    const back = typeof options === 'boolean' ? options : (options?.back !== false);
    const showNotifications = typeof options === 'object' && options?.notifications !== undefined
      ? options.notifications
      : Auth.isLogged();
    const unread = showNotifications ? Notifications.unreadCount() : 0;

    return `<div class="topbar">
      ${back ? '<button class="round" data-back>‹</button>' : '<span></span>'}
      <strong>${title}</strong>
      ${showNotifications ? `<button class="round bell" data-go="/notifications" aria-label="${this.t('notif.title')}">🔔<span class="bell-badge" data-bell-badge ${unread ? '' : 'hidden'}>${unread > 9 ? '9+' : unread}</span></button>` : '<span></span>'}
    </div>`;
  }

  render() {
    return '';
  }

  async onEnter() {}   // chargement des données (le DOM n'existe pas encore)
  bindEvents() {}      // écouteurs propres à la page
  onMounted() {}       // appelé quand le DOM est prêt (timers, abonnements, scroll)
  onLeave() {}         // nettoyage (timers, sockets)

  // Boutons communs : navigation et retour
  bindCommon() {
    this.el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => this.app.router.go(b.dataset.go));
    this.el.querySelectorAll('[data-back]').forEach(b => b.onclick = () => this.app.router.back());
  }

  async mount(container, isStale = () => false) {
    await this.onEnter();
    if (isStale()) return false; // l'utilisateur a déjà navigué ailleurs
    container.innerHTML = this.render();
    this.el = container;
    this.bindCommon();
    this.bindEvents();
    this.onMounted();
    return true;
  }

  // Redessine la page (utilisé par MessagesPage, ListingDetailPage, MyListingsPage)
  reRender() {
    if (!this.el) return;
    this.el.innerHTML = this.render();
    this.bindCommon();
    this.bindEvents();
    this.onMounted();
  }
}