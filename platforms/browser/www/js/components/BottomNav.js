import Component from '../core/Component.js';
import ConversationService from '../services/ConversationService.js';
import I18n from '../services/I18nService.js';


const HOME_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  <polyline points="9 22 9 12 15 12 15 22"></polyline>
</svg>`;

const NEWS_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
  <path d="M18 14h-8"></path>
  <path d="M15 18h-5"></path>
  <path d="M10 6h8v4h-8z"></path>
</svg>`;

const MESSAGES_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`;

const PROFILE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
  <circle cx="12" cy="7" r="4"></circle>
</svg>`;

// Ordre des onglets : Accueil (Annonces) en premier, Notizie en second, Messaggi en troisième, Profilo en quatrième
const TABS = [
  { path: '/listings', labelKey: 'nav.listings', icon: HOME_ICON, matches: ['/listings'] },
  { path: '/news', labelKey: 'nav.news', icon: NEWS_ICON, matches: ['/news'] },
  { path: '/messages', labelKey: 'nav.messages', icon: MESSAGES_ICON, matches: ['/messages', '/chat', '/consultation'], hasBadge: true },
  { path: '/profile', labelKey: 'nav.profile', icon: PROFILE_ICON, matches: ['/profile', '/settings', '/my-'] }
];

export default class BottomNav extends Component {
  constructor(props) {
    super(props);
    this.badgeUnsubscribe = null;
  }

  onMount() {
    // S'abonner aux changements de conversations pour rafraîchir le badge
    this.badgeUnsubscribe = ConversationService.onMessage('__badge__', () => {
      if (this.el) {
        this.el.innerHTML = this.render();
        this.bindEvents(this.el);
      }
    });
  }

  onUnmount() {
    if (this.badgeUnsubscribe) {
      this.badgeUnsubscribe();
      this.badgeUnsubscribe = null;
    }
  }

  isActive(tab) {
    const current = this.props.active || '';
    return tab.matches.some(m => current.startsWith(m));
  }

  render() {
    if (!this.props.show) return '';

    const unreadCount = ConversationService.totalUnread();

    return `
      <div class="bottom-nav glass">
        ${TABS.map(tab => {
          const label = I18n.t(tab.labelKey);
          return `
          <button
            type="button"
            data-to="${tab.path}"
            aria-label="${label}"
            title="${label}"
            class="${this.isActive(tab) ? 'on' : ''}"
            style="position: relative;"
          >
            ${tab.icon}
            ${tab.hasBadge ? `<span class="nav-badge" data-nav-badge ${unreadCount > 0 ? '' : 'hidden'}>${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
          </button>
        `}).join('')}
      </div>
    `;
  }

  bindEvents(c) {
    c.querySelectorAll('[data-to]').forEach(b => {
      b.onclick = () => this.props.router.go(b.dataset.to);
    });
  }
}
