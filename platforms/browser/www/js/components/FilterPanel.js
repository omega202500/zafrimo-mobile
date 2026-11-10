import Component from '../core/Component.js';
import { KINDS, PROPERTY_TYPES, PERIODS, CITIES } from '../services/ListingService.js';

export default class FilterPanel extends Component {
    render() {
        const {
            filters = {},
            resultCount = 0,
            onApply = () => {},
            onReset = () => {},
            onClose = () => {}
        } = this.props;

        const t = this.props.t || ((key) => key);

        return `
            <div class="filter-panel-overlay" id="filterOverlay">
                <div class="filter-panel glass">
                    <div class="filter-panel-header">
                        <h3>${t('filters.title')}</h3>
                        <button class="round" id="closeFilter">✕</button>
                    </div>

                    <div class="filter-section">
                        <label>${t('filters.kind')}</label>
                        <div class="chips">
                            <button type="button" class="chip ${!filters.kind ? 'on' : ''}" data-kind="">${t('filters.all')}</button>
                            ${KINDS.map(k => `
                                <button type="button" class="chip ${filters.kind === k ? 'on' : ''}" data-kind="${k}">${t('kind.' + k)}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="filter-section">
                        <label>${t('filters.propertyType')}</label>
                        <select class="field" id="filterPropertyType">
                            <option value="">${t('filters.all')}</option>
                            ${PROPERTY_TYPES.map(pt => `
                                <option value="${pt}" ${filters.propertyType === pt ? 'selected' : ''}>${t('ptype.' + pt)}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="filter-section">
                        <label>${t('filters.city')}</label>
                        <select class="field" id="filterCity">
                            <option value="">${t('filters.all')}</option>
                            ${CITIES.map(c => `
                                <option value="${c}" ${filters.city === c ? 'selected' : ''}>${c}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="filter-section">
                        <label>${t('filters.priceRange')}</label>
                        <div class="row" style="gap: 8px;">
                            <input type="number" class="field" id="filterMinPrice" placeholder="${t('filters.min')}" value="${filters.minPrice || ''}">
                            <input type="number" class="field" id="filterMaxPrice" placeholder="${t('filters.max')}" value="${filters.maxPrice || ''}">
                        </div>
                    </div>

                    <div class="filter-section">
                        <label>${t('filters.period')}</label>
                        <div class="chips">
                            <button type="button" class="chip ${!filters.period ? 'on' : ''}" data-period="">${t('filters.all')}</button>
                            ${PERIODS.map(p => `
                                <button type="button" class="chip ${filters.period === p ? 'on' : ''}" data-period="${p}">${t('period.' + p)}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="filter-section">
                        <label>${t('filters.sort')}</label>
                        <select class="field" id="filterSort">
                            <option value="recent" ${filters.sort === 'recent' ? 'selected' : ''}>${t('sort.recent')}</option>
                            <option value="price_asc" ${filters.sort === 'price_asc' ? 'selected' : ''}>${t('sort.priceAsc')}</option>
                            <option value="price_desc" ${filters.sort === 'price_desc' ? 'selected' : ''}>${t('sort.priceDesc')}</option>
                        </select>
                    </div>

                    <div class="filter-panel-footer">
                        <button class="btn btn-glass" id="resetFilters">${t('filters.reset')}</button>
                        <button class="btn btn-lime" id="applyFilters">${t('filters.showResults').replace('{n}', resultCount)}</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents(container) {
        const root = container || this.el;
        const overlay = root.querySelector('#filterOverlay');
        const panel = root.querySelector('.filter-panel');

        // Close on background click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.props.onClose();
            }
        };

        root.querySelector('#closeFilter').onclick = () => {
            this.props.onClose();
        };

        // Kind chips
        root.querySelectorAll('.chip[data-kind]').forEach(btn => {
            btn.onclick = () => {
                root.querySelectorAll('.chip[data-kind]').forEach(b => b.classList.remove('on'));
                btn.classList.add('on');
            };
        });

        // Period chips
        root.querySelectorAll('.chip[data-period]').forEach(btn => {
            btn.onclick = () => {
                root.querySelectorAll('.chip[data-period]').forEach(b => b.classList.remove('on'));
                btn.classList.add('on');
            };
        });

        // Reset
        root.querySelector('#resetFilters').onclick = () => {
            this.props.onReset();
        };

        // Apply
        root.querySelector('#applyFilters').onclick = () => {
            const newFilters = {
                kind: root.querySelector('.chip[data-kind].on')?.dataset.kind || '',
                propertyType: root.querySelector('#filterPropertyType').value,
                city: root.querySelector('#filterCity').value,
                minPrice: root.querySelector('#filterMinPrice').value,
                maxPrice: root.querySelector('#filterMaxPrice').value,
                period: root.querySelector('.chip[data-period].on')?.dataset.period || '',
                sort: root.querySelector('#filterSort').value
            };
            this.props.onApply(newFilters);
        };
    }
}
