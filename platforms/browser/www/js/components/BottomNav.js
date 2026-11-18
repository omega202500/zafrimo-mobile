import Component from '../core/Component.js';
import ConversationService from '../services/ConversationService.js';
import I18n from '../services/I18nService.js';
import { visibleTabs } from '../core/Tabs.js';

// Barre d'onglets du bas. La pastille de messages non lus est mise à jour en direct par NotificationHub.
export default class BottomNav extends Component {
  isActive(tab) {
    const current = this.props.active || '';
    return tab.matches.some(m => current.startsWith(m));
  }

  render() {
    if (!this.props.show) return '';

    const unreadCount = ConversationService.totalUnread();

    return `
      <div class="bottom-nav glass">
        ${visibleTabs().map(tab => {
          const label = I18n.t(tab.labelKey);
          const active = this.isActive(tab);
          return `
          <button
            type="button"
            data-to="${tab.path}"
            aria-label="${label}"
            title="${label}"
            ${active ? 'aria-current="page"' : ''}
            class="${active ? 'on' : ''}"
            style="position: relative;"
          >
            ${tab.icon}
            <span class="nav-label">${label}</span>
            ${tab.hasBadge ? `<span class="nav-badge" data-nav-badge ${unreadCount > 0 ? '' : 'hidden'}>${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
          </button>
        `;
        }).join('')}
      </div>
    `;
  }

  bindEvents(c) {
    c.querySelectorAll('[data-to]').forEach(b => {
      b.onclick = () => {
        if (b.classList.contains('on')) {
          // Onglet déjà ouvert : on remonte simplement en haut de la page
          const view = document.getElementById('view');
          if (view) view.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        this.props.router.go(b.dataset.to);
      };
    });
  }
}