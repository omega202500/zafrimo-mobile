import { escapeHtml } from '../core/Html.js';

const ICONS = { success: '✓', error: '!', info: 'i' };
let timer = null;

// Petit message en bas de l'écran. Un seul à la fois : un nouveau remplace l'ancien.
// Utilisation : Toast.show('Message', { type: 'success' })   // type : 'info' | 'success' | 'error'
export default class Toast {
    static show(message, { type = 'info', duration = 3500 } = {}) {
        Toast.hide();

        const el = document.createElement('div');
        el.className = 'toast toast-' + type;
        el.setAttribute('role', 'status');
        el.innerHTML = `
            <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
            <span class="toast-text">${escapeHtml(message)}</span>
        `;
        document.body.appendChild(el);

        timer = setTimeout(() => Toast.hide(), duration);
    }

    static hide() {
        clearTimeout(timer);
        const el = document.querySelector('.toast');
        if (el) el.remove();
    }
}