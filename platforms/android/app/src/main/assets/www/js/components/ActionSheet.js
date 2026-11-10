import { escapeHtml } from '../core/Html.js';

export default class ActionSheet {
    // items : [{ label, danger?, onClick }]
    static open({ items, cancelText }) {
        const host = document.createElement('div');
        host.className = 'sheet-backdrop';
        host.innerHTML = `
            <div class="sheet glass" role="menu">
                ${items.map((it, i) => `
                    <button type="button" class="sheet-item ${it.danger ? 'danger' : ''}" data-i="${i}">${escapeHtml(it.label)}</button>
                `).join('')}
                <button type="button" class="sheet-item cancel" data-cancel>${escapeHtml(cancelText)}</button>
            </div>
        `;

        const close = () => host.remove();

        host.onclick = (e) => {
            if (e.target === host) close();
        };
        host.querySelector('[data-cancel]').onclick = close;
        host.querySelectorAll('[data-i]').forEach(btn => {
            btn.onclick = () => {
                close();
                const item = items[Number(btn.dataset.i)];
                if (item && item.onClick) item.onClick();
            };
        });

        document.body.appendChild(host);
    }
}