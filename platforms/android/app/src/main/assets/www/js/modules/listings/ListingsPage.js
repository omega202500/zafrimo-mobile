import Page from '../../core/Page.js';
import ListingCard from '../../components/ListingCard.js';
import FilterPanel from '../../components/FilterPanel.js';
import ListingService, { KINDS, PAGE_SIZE, DEFAULT_FILTERS } from '../../services/ListingService.js';
import Auth from '../../services/AuthService.js';
import ConversationService from '../../services/ConversationService.js';
import { escapeHtml } from '../../core/Html.js';

export default class ListingsPage extends Page {
  static route = '/listings';
  static access = 'public';
  static tabs = true;

  constructor(app, params = {}) {
    super(app, params);
    this.items = [];
    this.filteredItems = [];
    this.displayedCount = PAGE_SIZE;
    this.filterPanelOpen = false;
  }

  async onEnter() {
    this.items = ListingService.getPublic();
    this.applyFilters();
  }

  applyFilters() {
    this.filteredItems = ListingService.apply(this.items, ListingService.filters);
    this.displayedCount = PAGE_SIZE;
  }

  activeFilterCount() {
    const f = ListingService.filters;
    let count = 0;
    if (f.kind) count++;
    if (f.propertyType) count++;
    if (f.city) count++;
    if (f.minPrice !== '') count++;
    if (f.maxPrice !== '') count++;
    if (f.period) count++;
    if (f.sort !== 'recent') count++;
    return count;
  }

  listHtml() {
    const toShow = this.filteredItems.slice(0, this.displayedCount);
    if (toShow.length === 0) {
      return `<div class="glass card" style="text-align: center; padding: 24px;">
        <p class="muted">${this.t('listings.noResults')}</p></div>`;
    }
    return toShow.map(l => new ListingCard({ listing: l, t: this.t.bind(this) }).render()).join('');
  }

  render() {
    const filterCount = this.activeFilterCount();
    const currentCity = ListingService.filters.city || this.t('listings.allCities');

    return `<section>
      <div class="topbar">
        <div style="cursor: pointer;" id="cityBtn">
          <span class="muted">${this.t('listings.location')}</span><br>
          <strong>${escapeHtml(currentCity)} ⌄</strong>
        </div>
        ${Auth.isLogged() ? '<button class="round" data-go="/notifications">🔔</button>' : '<span></span>'}
      </div>

      <div class="row">
        <input id="searchInput" class="field" style="margin:0" placeholder="${this.t('listings.searchPlaceholder')}" value="${escapeHtml(ListingService.filters.query)}">
        <button class="round" id="filterBtn" style="position: relative;">
          ☰
          ${filterCount > 0 ? `<span class="filter-badge">${filterCount}</span>` : ''}
        </button>
      </div>

      <div class="chips">
        <button class="chip ${!ListingService.filters.kind ? 'on' : ''}" data-kind="">${this.t('filters.all')}</button>
        ${KINDS.map(k => `
          <button class="chip ${ListingService.filters.kind === k ? 'on' : ''}" data-kind="${k}">${this.t('kind.' + k)}</button>
        `).join('')}
      </div>

      <div class="row" style="margin-bottom: 12px; font-size: 13px; color: var(--text-2);">
        <span>${this.filteredItems.length} ${this.t('listings.results')}</span>
      </div>

      <div id="listBox">
        ${this.listHtml()}
      </div>

      ${this.filteredItems.length > this.displayedCount ? `
        <button class="btn btn-glass" id="loadMoreBtn" style="margin-top: 16px;">
          ${this.t('listings.loadMore')}
        </button>
      ` : ''}

      ${Auth.isLogged() ? `
        <button class="btn btn-lime" data-go="/listings/new" style="margin-top: 16px;">
          ${this.t('listings.publishBtn')}
        </button>
      ` : ''}
    </section>`;
  }

  bindEvents() {
    // Search input
    const searchInput = this.el.querySelector('#searchInput');
    if (searchInput) {
      searchInput.oninput = () => {
        ListingService.filters.query = searchInput.value;
        this.applyFilters();
        this.updateList();
      };
    }

    // City button opens filter panel
    this.el.querySelector('#cityBtn').onclick = () => {
      this.openFilterPanel();
    };

    // Filter button opens filter panel
    this.el.querySelector('#filterBtn').onclick = () => {
      this.openFilterPanel();
    };

    // Kind chips
    this.el.querySelectorAll('.chip[data-kind]').forEach(btn => {
      btn.onclick = () => {
        this.el.querySelectorAll('.chip[data-kind]').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        ListingService.filters.kind = btn.dataset.kind;
        this.applyFilters();
        this.updateList();
      };
    });

    // Load more
    const loadMoreBtn = this.el.querySelector('#loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.onclick = () => {
        this.displayedCount += PAGE_SIZE;
        this.updateList();
      };
    }

    // Delegated events for cards and contact buttons
    this.el.onclick = (e) => {
      const card = e.target.closest('article[data-id]');
      const contactBtn = e.target.closest('[data-contact]');

      if (contactBtn) {
        e.stopPropagation();
        const listingId = contactBtn.dataset.contact;
        const user = Auth.user();

        if (!user) {
          this.app.router.go('/login');
          return;
        }

        const listing = this.filteredItems.find(l => String(l.id) === String(listingId));
        if (listing) {
          const conv = ConversationService.openFromListing(listing, user);
          if (conv) {
            this.app.router.go('/chat/' + conv.id);
          }
        }
        return;
      }

      if (card) {
        this.app.router.go('/listings/' + card.dataset.id);
      }
    };
  }

  updateList() {
    const listBox = this.el.querySelector('#listBox');
    if (listBox) {
      listBox.innerHTML = this.listHtml();
    }

    // Update results count
    const countSpan = this.el.querySelector('.row[style*="margin-bottom: 12px"]');
    if (countSpan) {
      countSpan.innerHTML = `<span>${this.filteredItems.length} ${this.t('listings.results')}</span>`;
    }

    // Update load more button
    const loadMoreBtn = this.el.querySelector('#loadMoreBtn');
    if (loadMoreBtn) {
      if (this.filteredItems.length > this.displayedCount) {
        loadMoreBtn.style.display = '';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }

    // Update filter badge
    const filterBtn = this.el.querySelector('#filterBtn');
    if (filterBtn) {
      const badge = filterBtn.querySelector('.filter-badge');
      const filterCount = this.activeFilterCount();
      if (filterCount > 0) {
        if (!badge) {
          const newBadge = document.createElement('span');
          newBadge.className = 'filter-badge';
          newBadge.textContent = filterCount;
          filterBtn.appendChild(newBadge);
        } else {
          badge.textContent = filterCount;
        }
      } else if (badge) {
        badge.remove();
      }
    }
  }

  openFilterPanel() {
    if (this.filterPanelOpen) return;
    this.filterPanelOpen = true;

    const panel = new FilterPanel({
      filters: { ...ListingService.filters },
      resultCount: ListingService.activeCount(ListingService.filters),
      t: this.t.bind(this),
      onApply: (newFilters) => {
        ListingService.filters = { ...newFilters };
        this.applyFilters();
        this.updateList();
        this.closeFilterPanel();
      },
      onReset: () => {
        ListingService.filters = { ...DEFAULT_FILTERS };
        this.applyFilters();
        this.updateList();
        this.closeFilterPanel();
      },
      onClose: () => {
        this.closeFilterPanel();
      }
    });

    const overlay = document.createElement('div');
    overlay.innerHTML = panel.render();
    document.body.appendChild(overlay);
    panel.bindEvents(overlay);
  }

  closeFilterPanel() {
    const overlay = document.querySelector('.filter-panel-overlay');
    if (overlay) {
      overlay.remove();
    }
    this.filterPanelOpen = false;
  }
}
