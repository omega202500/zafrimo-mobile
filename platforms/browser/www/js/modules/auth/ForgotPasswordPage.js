import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Validator from '../../core/Validator.js';
import FormField from '../../components/FormField.js';
import Storage from '../../services/StorageService.js';
import { setFieldError } from '../../core/FormUtils.js';

// Étape 1 de la récupération : on demande l'e-mail, le serveur envoie un code à 6 chiffres
export default class ForgotPasswordPage extends Page {
  static route = '/forgot';
  static access = 'public';
  static tabs = false;

  render() {
    return `
      <section class="auth-page">
        <div class="hero"></div>
        <div class="content">
          ${this.header(this.t('forgot.title'), { back: true, notifications: false })}
          <p class="muted" style="margin-bottom: 16px;">${this.t('forgot.intro')}</p>
          ${new FormField({ id: 'email', type: 'email', placeholder: this.t('forgot.email') }).render()}
          <button class="btn btn-lime" id="submit">${this.t('forgot.send')}</button>
        </div>
      </section>
    `;
  }

  // Retourne un message d'erreur, ou '' si la valeur est correcte
  validateEmail(value) {
    if (!Validator.required(value)) return this.t('forgot.required');
    if (!Validator.email(value)) return this.t('forgot.invalidEmail');
    return '';
  }

  bindEvents() {
    const root = this.el;
    const email = root.querySelector('#email');
    const submit = root.querySelector('#submit');

    email.oninput = () => setFieldError(root, 'email', '');
    email.onkeydown = (e) => { if (e.key === 'Enter') submit.click(); };

    submit.onclick = async () => {
      if (submit.disabled) return; // protection contre le double clic

      const value = email.value.trim();
      const error = this.validateEmail(value);
      setFieldError(root, 'email', error);
      if (error) {
        email.focus();
        return;
      }

      submit.classList.add('loading');
      submit.disabled = true;

      try {
        await Auth.forgotPassword(value);
        Storage.set('resetEmail', value);
        this.app.router.go('/reset-password');
      } catch (e) {
        setFieldError(root, 'email', this.t('forgot.error'));
        submit.classList.remove('loading');
        submit.disabled = false;
      }
    };
  }
}