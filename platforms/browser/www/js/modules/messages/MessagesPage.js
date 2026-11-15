import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import ConversationService from '../../services/ConversationService.js';
import Moderation from '../../services/ModerationService.js';
import { UNREAD_EVENT } from '../../services/NotificationService.js';
import { escapeHtml } from '../../core/Html.js';

const FILTERS = ['all', 'direct', 'consultation'];
const DEFAULT_AVATAR = 'assets/img/owner-avatar.webp';

// Liste des conversations (cahier 8.1) : discussions directes et consultations
export default class MessagesPage extends Page {
  static route = '/messages';
  static access = 'auth';
  static tabs = true;

  constructor(app, params = {}) {
    super(app, params);
    this.conversations = [];
    this.searchQuery = '';
    this.filter = 'all';
    this.onUnread = null;
  }

  async onEnter() {
    this.conversations = ConversationService.list(Auth.user());
  }

  onMounted() {
    this.onLeave(); // évite les doublons si la page est redessinée

    // Un message arrive pendant qu'on est sur la liste : on met à jour la liste seulement
    this.onUnread = () => {
      this.conversations = ConversationService.list(Auth.user());
      this.refreshList();
    };
    window.addEventListener(UNREAD_EVENT, this.onUnread);
  }

  onLeave() {
    if (this.onUnread) {
      window.removeEventListener(UNREAD_EVENT, this.onUnread);
      this.onUnread = null;
    }
  }

  // Conversations après filtre (type) et recherche (nom, annonce, dernier message)
  filtered() {
    const q = this.searchQuery.trim().toLowerCase();

    return this.conversations.filter(c => {
      if (this.filter !== 'all' && c.type !== this.filter) return false;
      if (!q) return true;

      const searchIn = [
        c.other?.name || '',
        c.listingTitle || '',
        c.messages[c.messages.length - 1]?.text || ''
      ].join(' ').toLowerCase();
      return searchIn.includes(q);
    });
  }

  chipLabel(filter) {
    if (filter === 'direct') return this.t('messages.direct');
    if (filter === 'consultation') return this.t('messages.consultations');
    return this.t('messages.all');
  }

  render() {
    return `
      <section>
        ${this.header(this.t('messages.title'))}

        <input id="searchInput" class="field" placeholder="${this.t('messages.searchPlaceholder')}" value="${escapeHtml(this.searchQuery)}" autocomplete="off">

        <div class="chips" style="margin-bottom: 14px;">
          ${FILTERS.map(f => `
            <button class="chip ${this.filter === f ? 'on' : ''}" data-filter="${f}">${this.chipLabel(f)}</button>
          `).join('')}
        </div>

        <div id="convList">${this.renderList()}</div>
      </section>
    `;
  }

  renderList() {
    // Aucune conversation du tout
    if (this.conversations.length === 0) {
      return `
        <div class="glass card" style="text-align: center; padding: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">💬</div>
          <h3>${this.t('messages.noConversations')}</h3>
          <p class="muted" style="margin-bottom: 16px;">${this.t('messages.noConversationsDesc')}</p>
          <button class="btn btn-lime" data-link="/listings">${this.t('messages.browseListings')}</button>
        </div>
      `;
    }

    const list = this.filtered();

    // Le filtre ou la recherche ne donne rien
    if (list.length === 0) {
      return `
        <div class="glass card" style="text-align: center; padding: 24px;">
          <h3>${this.t('messages.noResults')}</h3>
          <p class="muted">${this.t('messages.noResultsDesc')}</p>
        </div>
      `;
    }

    return `<div class="glass card conv-list">${list.map(c => this.renderConversationCard(c)).join('')}</div>`;
  }

  renderConversationCard(conv) {
    const last = conv.messages[conv.messages.length - 1];
    const unread = ConversationService.unreadCount(conv);
    const isConsultation = conv.type === 'consultation';
    const expired = isConsultation && ConversationService.isExpired(conv);
    const blocked = Moderation.isBlocked(conv.other?.id);
    const online = !!conv.other?.online;
    const preview = last ? (last.text.length > 50 ? last.text.slice(0, 50) + '…' : last.text) : '';

    return `
      <div class="conv-item" data-id="${escapeHtml(String(conv.id))}" data-type="${escapeHtml(conv.type)}">
        <div class="conv-avatar-wrap">
          <img class="conv-avatar ${online ? 'online' : ''}" src="${escapeHtml(conv.other?.photo || DEFAULT_AVATAR)}" alt="">
          ${online ? '<span class="conv-dot"></span>' : ''}
        </div>

        <div class="conv-main">
          <div class="conv-top">
            <span class="conv-name">${escapeHtml(conv.other?.name || '')}</span>
            <span class="conv-time">${last ? ConversationService.formatTime(last.sentAt) : ''}</span>
          </div>
          ${(isConsultation || blocked) ? `
          <div class="conv-tags">
            ${isConsultation ? `<span class="status-pill ${expired ? '' : 'published'}">${expired ? this.t('consultation.expired') : this.t('messages.consultationBadge')}</span>` : ''}
            ${blocked ? `<span class="status-pill failed">${this.t('messages.blocked')}</span>` : ''}
          </div>` : ''}
          ${conv.listingTitle ? `<div class="conv-listing">${escapeHtml(conv.listingTitle)}</div>` : ''}
          <p class="muted conv-preview">${escapeHtml(preview)}</p>
        </div>

        ${unread > 0 ? `<span class="conv-unread">${unread}</span>` : ''}
      </div>
    `;
  }

  // Redessine seulement la liste : le champ de recherche garde le clavier ouvert
  refreshList() {
    const list = this.el && this.el.querySelector('#convList');
    if (list) list.innerHTML = this.renderList();
  }

  bindEvents() {
    const search = this.el.querySelector('#searchInput');
    search.oninput = () => {
      this.searchQuery = search.value;
      this.refreshList();
    };

    this.el.querySelectorAll('.chip[data-filter]').forEach(btn => {
      btn.onclick = () => {
        this.filter = btn.dataset.filter;
        this.el.querySelectorAll('.chip[data-filter]').forEach(b => b.classList.toggle('on', b === btn));
        this.refreshList();
      };
    });

    // Un seul écouteur sur la liste : il continue de marcher quand la liste est redessinée
    this.el.querySelector('#convList').onclick = (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        this.app.router.go(link.dataset.link);
        return;
      }

      const item = e.target.closest('.conv-item');
      if (item) {
        const route = item.dataset.type === 'consultation' ? '/consultation/' : '/chat/';
        this.app.router.go(route + encodeURIComponent(item.dataset.id));
      }
    };
  }
}