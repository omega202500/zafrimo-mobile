import Component from '../core/Component.js';
import StarRating from './StarRating.js';
import { escapeHtml } from '../core/Html.js';

export default class ListingCard extends Component {
  render() {
    const l = this.props.listing;
    const t = this.props.t || ((key) => key);

    const photo = l.photos && l.photos.length > 0 ? l.photos[0] : l.photo || '';
    const kindLabel = t('kind.' + l.kind) || l.kind;
    const propertyTypeLabel = t('ptype.' + l.propertyType) || l.propertyType;

    return `<article class="glass card" data-id="${l.id}" style="cursor: pointer; padding: 0; overflow: hidden; margin-bottom: 16px;">
      ${photo ? `
        <div style="height: 160px; background: url('${photo}') center/cover; position: relative;">
          <span class="badge" style="color: var(--lime); font-weight: 600;">${escapeHtml(kindLabel)}</span>
          ${l.hidden ? '<span class="badge" style="top: auto; bottom: 12px; right: 12px; background: rgba(0,0,0,0.6); color: white;">' + t('listings.hidden') + '</span>' : ''}
        </div>` : ''}
      <div style="padding: 16px;">
        <div class="row" style="margin-bottom: 8px;">
          <span class="muted">${escapeHtml(l.city)}</span>
          <span class="price">€${l.price.toLocaleString('it-IT')}</span>
        </div>
        <h3 style="font-size: 16px; line-height: 1.4; margin-bottom: 8px;">${escapeHtml(l.title)}</h3>
        <div class="tags" style="margin-bottom: 12px;">
          <span>${l.area} m²</span>
          ${l.beds > 0 ? `<span>${l.beds} ${t('listings.beds')}</span>` : ''}
          ${l.baths > 0 ? `<span>${l.baths} ${t('listings.baths')}</span>` : ''}
          ${l.parking > 0 ? `<span>${l.parking} ${t('listings.parking')}</span>` : ''}
        </div>
        <div class="row" style="font-size: 12px; color: var(--text-2); margin-bottom: 12px;">
          <span>👤 ${escapeHtml(l.owner?.name || '')} ${new StarRating({ value: l.owner?.stars || 0 }).render()}</span>
        </div>
        <button class="chip on" data-contact="${l.id}" style="margin-bottom: 0;">${t('listings.contact')}</button>
      </div>
    </article>`;
  }
}
