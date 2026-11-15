import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import NewsCard from '../../components/NewsCard.js';
import NewsService, { NEWS_CATEGORIES } from '../../services/NewsService.js';
import { escapeHtml } from '../../core/Html.js';

export default class NewsPage extends Page {
  static route = '/news';
  static access = 'public';
  static tabs = true;

  constructor(app, params = {}) {
    super(app, params);
    this.category = 'all';
    this.query = '';
    this.items = [];
  }

  async onEnter() {
    this.items = NewsService.getAll();
  }

  filtered() {
    const q = this.query.trim().toLowerCase();
    return this.items.filter(n => {
      const okCat = this.category === 'all' || n.category === this.category;
      const okSearch = !q || n.title.toLowerCase().includes(q) || (n.excerpt || '').toLowerCase().includes(q);
      return okCat && okSearch;
    });
  }

  // Seule cette partie est redessinée quand on filtre
  listHtml() {
    const list = this.filtered();
    if (list.length === 0) {
      return `<div class="glass card" style="text-align: center; padding: 24px;">
        <p class="muted">${this.t('news.empty')}</p></div>`;
    }
    return list.map(n => new NewsCard({ news: n }).render()).join('');
  }

  render() {
    const cats = ['all', ...NEWS_CATEGORIES];

    return `
      <section>
        ${this.header(this.t('news.title'), { back: false })}

        ${Auth.isLogged() ? `
          <button class="btn btn-lime" data-go="/news/new">${this.t('news.publishBtn')}</button>` : ''}

        <input id="newsSearchInput" class="field" placeholder="${this.t('news.search')}" value="${escapeHtml(this.query)}">

        <div class="chips">
          ${cats.map(c => `
            <button class="chip ${c === this.category ? 'on' : ''}" data-cat="${c}">
              ${c === 'all' ? this.t('news.all') : c}
            </button>`).join('')}
        </div>

        <div id="newsList">${this.listHtml()}</div>
      </section>
    `;
  }

  bindEvents() {
    const list = this.el.querySelector('#newsList');
    const chips = this.el.querySelectorAll('.chip[data-cat]');

    // Un seul écouteur sur la liste : il reste valable même quand la liste change
    list.onclick = (e) => {
      const card = e.target.closest('.news-card');
      if (card) this.app.router.go('/news/' + card.dataset.id);
    };

    chips.forEach(chip => {
      chip.onclick = () => {
        this.category = chip.dataset.cat;
        chips.forEach(c => c.classList.toggle('on', c === chip));
        list.innerHTML = this.listHtml();
      };
    });

    this.el.querySelector('#newsSearchInput').oninput = (e) => {
      this.query = e.target.value;
      list.innerHTML = this.listHtml();
    };
  }
}