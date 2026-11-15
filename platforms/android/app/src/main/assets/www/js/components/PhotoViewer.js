import I18n from '../services/I18nService.js';
import { escapeHtml } from '../core/Html.js';

const ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;
const MOVE_TOLERANCE = 10; // en dessous de 10 px de mouvement, c'est un toucher et pas un glissement

// Visionneuse de photos plein écran (cahier 7.2) :
// balayage horizontal, double-toucher pour zoomer, déplacement de l'image zoomée.
// Utilisation : PhotoViewer.open(['url1', 'url2'], 0)
export default class PhotoViewer {
    static cleanup = null;

    static close() {
        if (PhotoViewer.cleanup) PhotoViewer.cleanup();
    }

    static open(photos, startIndex = 0) {
        const list = (photos || []).filter(Boolean);
        if (list.length === 0) return;
        PhotoViewer.close(); // une seule visionneuse à la fois

        const t = (key) => escapeHtml(I18n.t(key));
        const many = list.length > 1;

        const host = document.createElement('div');
        host.className = 'viewer';
        host.setAttribute('role', 'dialog');
        host.setAttribute('aria-modal', 'true');
        host.innerHTML = `
            <div class="viewer-top">
                ${many ? '<span class="viewer-counter"></span>' : ''}
                <button type="button" class="viewer-close" aria-label="${t('viewer.close')}">✕</button>
            </div>
            <div class="viewer-track">
                ${list.map(src => `
                    <div class="viewer-slide">
                        <img class="viewer-img" src="${escapeHtml(src)}" alt="" draggable="false">
                    </div>
                `).join('')}
            </div>
            ${many ? `
                <button type="button" class="viewer-nav prev" aria-label="${t('viewer.prev')}">‹</button>
                <button type="button" class="viewer-nav next" aria-label="${t('viewer.next')}">›</button>
            ` : ''}
        `;
        document.body.appendChild(host);
        document.body.classList.add('viewer-open');

        const track = host.querySelector('.viewer-track');
        const slides = Array.from(host.querySelectorAll('.viewer-slide'));
        const counter = host.querySelector('.viewer-counter');

        let index = Math.min(Math.max(startIndex, 0), list.length - 1);
        let zoomed = false;
        let tx = 0;
        let ty = 0;
        let drag = null;
        let down = null;
        let lastTap = { time: 0, x: 0, y: 0 };
        let ticking = false;

        const currentImg = () => slides[index].querySelector('img');

        // ----- Zoom -----
        const applyZoom = () => {
            currentImg().style.transform = zoomed ? `translate(${tx}px, ${ty}px) scale(${ZOOM})` : '';
            track.classList.toggle('zoomed', zoomed);
        };

        const resetZoom = () => {
            if (!zoomed) return;
            zoomed = false;
            tx = 0;
            ty = 0;
            applyZoom();
        };

        // Limite de déplacement de l'image zoomée
        const limit = () => {
            const r = slides[index].getBoundingClientRect();
            return { x: r.width * (ZOOM - 1) / 2, y: r.height * (ZOOM - 1) / 2 };
        };
        const clamp = (value, max) => Math.max(-max, Math.min(max, value));

        const toggleZoom = (e) => {
            if (zoomed) {
                resetZoom();
                return;
            }
            // L'endroit touché reste sous le doigt
            const r = slides[index].getBoundingClientRect();
            const px = e.clientX - (r.left + r.width / 2);
            const py = e.clientY - (r.top + r.height / 2);
            const max = limit();
            tx = clamp(-px * (ZOOM - 1), max.x);
            ty = clamp(-py * (ZOOM - 1), max.y);
            zoomed = true;
            applyZoom();
        };

        // ----- Navigation -----
        const updateIndex = () => {
            index = Math.round(track.scrollLeft / track.clientWidth) || 0;
            if (counter) counter.textContent = `${index + 1} / ${list.length}`;
        };

        const goTo = (target) => {
            resetZoom();
            const next = Math.min(Math.max(target, 0), list.length - 1);
            track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
        };

        track.scrollLeft = index * track.clientWidth;
        updateIndex();

        track.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                updateIndex();
            });
        });

        // ----- Gestes : double-toucher et déplacement -----
        track.addEventListener('pointerdown', (e) => {
            down = { x: e.clientX, y: e.clientY };
            if (zoomed) {
                drag = { x: e.clientX, y: e.clientY, baseX: tx, baseY: ty };
                track.setPointerCapture(e.pointerId);
                currentImg().classList.add('dragging');
            }
        });

        track.addEventListener('pointermove', (e) => {
            if (!zoomed || !drag) return;
            const max = limit();
            tx = clamp(drag.baseX + e.clientX - drag.x, max.x);
            ty = clamp(drag.baseY + e.clientY - drag.y, max.y);
            applyZoom();
        });

        track.addEventListener('pointerup', (e) => {
            currentImg().classList.remove('dragging');
            drag = null;
            if (!down) return;

            const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > MOVE_TOLERANCE;
            down = null;
            if (moved) return;

            const now = Date.now();
            const near = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40;
            if (now - lastTap.time < DOUBLE_TAP_MS && near) {
                toggleZoom(e);
                lastTap = { time: 0, x: 0, y: 0 };
            } else {
                lastTap = { time: now, x: e.clientX, y: e.clientY };
            }
        });

        track.addEventListener('pointercancel', () => {
            drag = null;
            down = null;
        });

        // ----- Fermeture -----
        const onKey = (e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') goTo(index - 1);
            if (e.key === 'ArrowRight') goTo(index + 1);
        };

        const close = () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('backbutton', close);   // bouton retour d'Android
            window.removeEventListener('hashchange', close);     // changement de page
            host.remove();
            document.body.classList.remove('viewer-open');
            PhotoViewer.cleanup = null;
        };
        PhotoViewer.cleanup = close;

        document.addEventListener('keydown', onKey);
        document.addEventListener('backbutton', close, false);
        window.addEventListener('hashchange', close);

        host.querySelector('.viewer-close').onclick = close;
        const prev = host.querySelector('.viewer-nav.prev');
        const next = host.querySelector('.viewer-nav.next');
        if (prev) prev.onclick = () => goTo(index - 1);
        if (next) next.onclick = () => goTo(index + 1);
    }
}