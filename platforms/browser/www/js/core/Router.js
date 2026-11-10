import BottomNav from '../components/BottomNav.js';
import Skeleton from '../components/Skeleton.js';
import ErrorState from '../components/ErrorState.js';
import Auth from '../services/AuthService.js';
import Moderation from '../services/ModerationService.js';

const SKELETON_DELAY_MS = 250;

export default class Router {
  constructor(app, routes) {
    this.app = app;
    this.routes = routes;
    this.current = null;
    this.navId = 0; // identifie la navigation en cours (pour ignorer les chargements dépassés)
  }

  start() {
    addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  go(path) {
    location.hash = '#' + path;
  }

  back() {
    history.back();
  }

  getSortedRoutes() {
    return Object.entries(this.routes).sort(([patternA], [patternB]) => {
      const isParamA = patternA.includes(':');
      const isParamB = patternB.includes(':');
      if (isParamA !== isParamB) {
        return isParamA ? 1 : -1; // Les routes fixes (ex: /news/new, /listings/new) avant les routes à paramètre (:id)
      }
      const segsA = patternA.split('/').length;
      const segsB = patternB.split('/').length;
      if (segsA !== segsB) return segsB - segsA;
      return patternB.length - patternA.length;
    });
  }

  match(path) {
    const decode = (v) => { try { return decodeURIComponent(v); } catch { return v; } };

    for (const [pattern, PageClass] of this.getSortedRoutes()) {
      const keys = [];
      const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
      const m = path.match(re);
      if (m) {
        return { PageClass, pattern, params: Object.fromEntries(keys.map((k, i) => [k, decode(m[i + 1])])) };
      }
    }
    return null;
  }

  // Écran d'erreur : la page n'a pas pu se charger
  showError(view) {
    view.innerHTML = ErrorState.render({ offline: !navigator.onLine });
    ErrorState.bind(view, {
      onRetry: () => this.resolve(),
      onHome: () => this.go(Auth.isLogged() ? '/listings' : '/welcome')
    });
  }

  async resolve() {
    const navId = ++this.navId;
    const isStale = () => navId !== this.navId;

    const rawPath = (location.hash.slice(1) || '/welcome').split('?')[0];
    const path = rawPath.startsWith('/') ? rawPath : '/' + rawPath;

    // Route inconnue : page "introuvable"
    const found = this.match(path) || this.match('/404');
    if (!found) return;
    document.body.classList.toggle('is-chat', !!found.PageClass.fullscreen);

    // Garde d'authentification et de permissions
    const access = found.PageClass.access || 'public';
    const isLogged = Auth.isLogged();
    const user = isLogged ? Auth.user() : null;

    // Compte suspendu : seule la page /suspended reste accessible
    if (user && Moderation.isSuspended(user) && path !== '/suspended') {
      this.go('/suspended');
      return;
    }

    if (access !== 'public') {
      if (!isLogged) {
        if (location.hash !== '#/login') {
          this.go('/login');
          return;
        }
      } else if (access === 'owner' && !(user?.role === 'owner' || user?.isOwner || user?.isConsultant)) {
        if (location.hash !== '#/profile') {
          this.go('/profile');
          return;
        }
      } else if (access === 'consultant' && !user?.isConsultant) {
        if (location.hash !== '#/profile') {
          this.go('/profile');
          return;
        }
      }
    }

    this.current?.onLeave();
    this.current = new found.PageClass(this.app, found.params);
    const view = document.getElementById('view');

    // Chargement lent (API) : après 250 ms on affiche un squelette au lieu d'un écran figé
    const slow = setTimeout(() => {
      if (!isStale()) view.innerHTML = Skeleton.render();
    }, SKELETON_DELAY_MS);

    try {
      const rendered = await this.current.mount(view, isStale);
      if (rendered === false) return; // une autre navigation a pris le relais
    } catch (err) {
      if (isStale()) return;
      console.error(err);
      this.showError(view);
    } finally {
      clearTimeout(slow);
    }

    new BottomNav({ active: path, router: this, show: found.PageClass.tabs }).mount(document.getElementById('nav'));
  }
}