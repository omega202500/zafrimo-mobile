import Component from '../core/Component.js';
import StarRating from './StarRating.js';
import { escapeHtml } from '../core/Html.js';

export default class NewsCard extends Component {
  render() {
    const n = this.props.news;
    return `
      <article class="glass card news-card" data-id="${n.id}" style="cursor: pointer; padding: 0; overflow: hidden; margin-bottom: 16px;">
        ${n.photo ? `
          <div style="height: 160px; background: url('${n.photo}') center/cover; position: relative;">
            <span class="badge" style="color: var(--lime); font-weight: 600;">${escapeHtml(n.category)}</span>
          </div>` : ''}
        <div style="padding: 16px;">
          <div class="row" style="margin-bottom: 8px; font-size: 12px; color: var(--text-2);">
            <span>${escapeHtml(n.date)}</span>
            <span>⏱ ${escapeHtml(n.readTime)}</span>
          </div>
          <h3 style="font-size: 16px; line-height: 1.4; margin-bottom: 8px;">${escapeHtml(n.title)}</h3>
          <p class="muted" style="font-size: 13px; line-height: 1.5; margin-bottom: 12px;">${escapeHtml(n.excerpt)}</p>
          <div class="row" style="font-size: 12px; color: var(--text-2);">
            <span>✍️ ${escapeHtml(n.author)} ${n.authorStars !== undefined ? new StarRating({ value: n.authorStars }).render() : ''}</span>
          </div>
        </div>
      </article>
    `;
  }
}