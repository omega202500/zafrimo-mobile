import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import NewsService from '../../services/NewsService.js';
import StarRating from '../../components/StarRating.js';
import { escapeHtml } from '../../core/Html.js';
import ReportModal from '../../components/ReportModal.js';
import PhotoViewer from '../../components/PhotoViewer.js';

export default class NewsDetailPage extends Page {
  static route = '/news/:id';
  static access = 'public';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.article = null;
    this.isMine = false;
  }

  async onEnter() {
    this.article = NewsService.getById(this.params.id);
    this.isMine = NewsService.isAuthor(this.article, Auth.user());
  }

  render() {
    // Actualité introuvable : message clair au lieu d'afficher une autre actualité
    if (!this.article) {
      return `
        <section>
          ${this.header(this.t('news.detailTitle'), { back: true })}
          <div class="glass card" style="text-align: center; padding: 24px;">
            <p class="muted">${this.t('news.notFound')}</p>
          </div>
        </section>`;
    }

    const a = this.article;

    return `
      <section>
        ${this.header(this.t('news.detailTitle'), { back: true })}

        ${a.photo ? `
        <div class="photo glass news-photo" data-viewer-photo style="height: 220px; margin-bottom: 14px;">
          <img src="${escapeHtml(a.photo)}" alt="">
          <span class="badge" style="color: var(--lime); font-weight: 600;">${escapeHtml(a.category)}</span>
        </div>` : ''}

        <div class="glass card">
          <div class="row" style="margin-bottom: 10px; font-size: 13px; color: var(--text-2);">
            <span>📅 ${escapeHtml(a.date)}</span>
            <span>⏱ ${escapeHtml(a.readTime)}</span>
          </div>

          <h1 style="font-size: 22px; line-height: 1.35; margin-bottom: 12px;">${escapeHtml(a.title)}</h1>

          <div style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--glass-line); border-bottom: 1px solid var(--glass-line); margin-bottom: 16px;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--glass); display: grid; place-items: center; font-size: 18px;">✍️</div>
            <div>
              <div style="font-size: 14px; font-weight: 600;">${escapeHtml(a.author)}</div>
              ${a.authorStars !== undefined
        ? new StarRating({ value: a.authorStars }).render()
        : `<div style="font-size: 12px; color: var(--text-2);">${this.t('news.certified')}</div>`}
            </div>
          </div>

          <div style="line-height: 1.7; font-size: 15px;">${a.content}</div>
        </div>

        ${!this.isMine ? `
        <button class="btn btn-glass report-btn" type="button" data-report>${this.t('report.news')}</button>
        ` : ''}

        ${this.isMine ? `
        <div class="glass card">
          <button class="btn btn-glass" data-go="/news/${a.id}/edit">${this.t('news.edit')}</button>
          <div id="deleteZone">
            <button class="btn btn-glass" id="deleteBtn" style="margin-bottom: 0;">🗑 ${this.t('news.delete')}</button>
          </div>
        </div>` : ''}

        <div class="glass card" style="text-align: center; padding: 20px;">
          <h4 style="margin-bottom: 8px;">${this.t('news.askTitle')}</h4>
          <p class="muted" style="margin-bottom: 14px; font-size: 13px;">${this.t('news.askText')}</p>
          <button class="btn btn-lime" data-go="/listings" style="margin-bottom: 0;">${this.t('news.askBtn')}</button>
        </div>
      </section>
    `;
  }

  bindEvents() {

    const reportBtn = this.el.querySelector('[data-report]');
    if (reportBtn) {
      reportBtn.onclick = () => {
        if (!Auth.user()) {
          this.app.router.go('/login');
          return;
        }
        ReportModal.open({ type: 'news', targetId: this.article.id });
      };
    }

    const photo = this.el.querySelector('[data-viewer-photo]');
    if (photo) {
      photo.onclick = () => PhotoViewer.open([this.article.photo], 0);
    }
    const zone = this.el.querySelector('#deleteZone');
    if (!zone) return;

    // Confirmation de suppression sur place, sans fenêtre du système
    zone.querySelector('#deleteBtn').onclick = () => {
      zone.innerHTML = `
        <p class="muted" style="margin-bottom: 12px;">${this.t('news.confirmDelete')}</p>
        <button class="btn btn-lime" id="confirmYes">${this.t('news.confirmYes')}</button>
        <button class="btn btn-glass" id="confirmNo" style="margin-bottom: 0;">${this.t('news.cancel')}</button>`;

      zone.querySelector('#confirmYes').onclick = () => {
        NewsService.remove(this.article.id);
        this.app.router.go('/news');
      };
      zone.querySelector('#confirmNo').onclick = () => {
        zone.innerHTML = `<button class="btn btn-glass" id="deleteBtn" style="margin-bottom: 0;">🗑 ${this.t('news.delete')}</button>`;
        this.bindEvents();
      };
    };
  }

}