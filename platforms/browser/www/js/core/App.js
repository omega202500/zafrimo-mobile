import Router from './Router.js';
import routes from '../routes.js';
import I18n from '../services/I18nService.js';
import PushService from '../services/PushService.js';
import NotificationHub from '../services/NotificationHub.js';
import SystemService from '../services/SystemService.js';

export default class App {
  async init() {
    await I18n.load(I18n.getCurrentLang());
    if (/Android [1-7]\./.test(navigator.userAgent)) document.body.classList.add('low-end'); // flou allégé
    this.router = new Router(this, routes);
    SystemService.start(this);    // connexion, session expirée, erreurs non gérées
    this.router.start();
    NotificationHub.start(this);  // compteurs en direct et bannière
    PushService.init(this);       // notifications push Firebase
  }
}