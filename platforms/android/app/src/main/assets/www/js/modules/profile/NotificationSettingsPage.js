import Page from '../../core/Page.js';
import Prefs, { NOTIF_TYPES } from '../../services/NotificationPrefsService.js';

// Réglages de notifications par type (cahier 8.3)
export default class NotificationSettingsPage extends Page {
  static route = '/settings/notifications';
  static access = 'auth';
  static tabs = false;

  row(key, prefs) {
    return `
      <div class="notif-row">
        <div>
          <strong>${this.t('notifSettings.' + key)}</strong>
          <p class="muted">${this.t('notifSettings.' + key + 'Desc')}</p>
        </div>
        <label class="toggle">
          <input type="checkbox" data-pref="${key}" ${prefs[key] ? 'checked' : ''}>
          <span></span>
        </label>
      </div>
    `;
  }

  render() {
    const prefs = Prefs.get();

    return `
      <section>
        ${this.header(this.t('notifSettings.title'), { back: true })}
        <p class="muted" style="margin: 0 4px 14px;">${this.t('notifSettings.intro')}</p>

        <div class="glass card">
          ${this.row('push', prefs)}
        </div>

        <div class="glass card notif-list ${prefs.push ? '' : 'is-disabled'}" id="notifList">
          ${NOTIF_TYPES.map(type => this.row(type, prefs)).join('')}
        </div>
      </section>
    `;
  }

  bindEvents() {
    const list = this.el.querySelector('#notifList');

    this.el.querySelectorAll('[data-pref]').forEach(input => {
      input.onchange = () => {
        const next = Prefs.set(input.dataset.pref, input.checked);
        // Interrupteur général éteint : les autres sont grisés (leurs choix sont conservés)
        list.classList.toggle('is-disabled', !next.push);
      };
    });
  }
}