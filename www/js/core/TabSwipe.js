import { visibleTabs, tabIndexOf } from './Tabs.js';

const MIN_DISTANCE = 70;       // distance minimale du balayage, en pixels
const MAX_DURATION_MS = 700;   // au-delà, ce n'est plus un balayage mais un geste lent
const MAX_VERTICAL_RATIO = 0.6; // le mouvement doit être surtout horizontal

// Éléments sur lesquels un balayage ne doit jamais changer de rubrique
const BLOCKED = 'input, textarea, select, [data-no-swipe], .photo-gallery, .viewer, .modal-backdrop, .sheet-backdrop, .filter-panel';

// Balayage horizontal entre les rubriques principales (cahier 7.1)
export default class TabSwipe {
    constructor(router) {
        this.router = router;
        this.origin = null;
    }

    start() {
        const view = document.getElementById('view');
        if (!view) return;

        view.addEventListener('touchstart', (e) => this.onStart(e, view), { passive: true });
        view.addEventListener('touchend', (e) => this.onEnd(e), { passive: true });
        view.addEventListener('touchcancel', () => { this.origin = null; }, { passive: true });
    }

    // Un geste ne doit pas partir d'un champ de saisie, d'une fenêtre ouverte
    // ou d'une zone qui défile déjà horizontalement (filtres, galerie...)
    canStartFrom(target, view) {
        if (document.body.classList.contains('viewer-open')) return false;
        if (target.closest(BLOCKED)) return false;

        for (let el = target; el && el !== view; el = el.parentElement) {
            if (el.scrollWidth > el.clientWidth + 1) {
                const overflowX = getComputedStyle(el).overflowX;
                if (overflowX === 'auto' || overflowX === 'scroll') return false;
            }
        }
        return true;
    }

    onStart(e, view) {
        this.origin = null;
        if (e.touches.length !== 1) return; // pas de balayage à deux doigts

        // Seulement sur les pages principales (celles qui affichent la barre d'onglets)
        const page = this.router.current;
        if (!page || !page.constructor.tabs) return;
        if (!this.canStartFrom(e.target, view)) return;

        const touch = e.touches[0];
        this.origin = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }

    onEnd(e) {
        const origin = this.origin;
        this.origin = null;
        if (!origin || e.changedTouches.length === 0) return;

        const touch = e.changedTouches[0];
        const dx = touch.clientX - origin.x;
        const dy = touch.clientY - origin.y;

        if (Date.now() - origin.time > MAX_DURATION_MS) return;
        if (Math.abs(dx) < MIN_DISTANCE) return;
        if (Math.abs(dy) > Math.abs(dx) * MAX_VERTICAL_RATIO) return;

        const path = (location.hash.slice(1) || '').split('?')[0];
        const index = tabIndexOf(path);
        if (index === -1) return;

        // Balayage vers la gauche : rubrique suivante. Vers la droite : rubrique précédente. Pas de boucle.
        const target = visibleTabs()[dx < 0 ? index + 1 : index - 1];
        if (target) this.router.go(target.path);
    }
}