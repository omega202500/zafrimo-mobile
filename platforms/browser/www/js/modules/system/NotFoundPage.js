import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';

// Affichée par le Router quand l'adresse ne correspond à aucune page
export default class NotFoundPage extends Page {
  static route = '/404';
  static access = 'public';
  static tabs = false;

  render() {
    const home = Auth.isLogged() ? '/listings' : '/welcome';

    return `
      <section class="system-state">
        <div class="system-icon">🧭</div>
        <h1>${this.t('system.notFoundTitle')}</h1>
        <p class="muted">${this.t('system.notFoundText')}</p>
        <button class="btn btn-lime" data-go="${home}">${this.t('system.home')}</button>
      </section>
    `;
  }
}