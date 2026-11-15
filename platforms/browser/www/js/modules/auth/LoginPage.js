import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Validator from '../../core/Validator.js';
import FormField from '../../components/FormField.js';
import PasswordField from '../../components/PasswordField.js';
import Storage from '../../services/StorageService.js';
import { setFieldError } from '../../core/FormUtils.js';

export default class LoginPage extends Page {
  static route = '/login';
  static access = 'public';
  static tabs = false;

  // La page est dessinée UNE seule fois : plus aucun reRender()
  render() {
    const hasOtpVerified = Storage.get('otpVerified') === true;

    return `
      <section class="auth-page">
        <div class="hero"></div>
        <div class="content">
          ${this.header(this.t('login.title'), { back: true, notifications: false })}
          <p class="muted" style="margin-bottom: 16px;">${this.t('login.sub')}</p>

          ${new FormField({ id: 'email', type: 'email', placeholder: this.t('login.email') }).render()}
          ${new PasswordField({ id: 'password', placeholder: this.t('login.password') }).render()}

          <p class="muted" style="text-align: right; margin-bottom: 16px;">
            <a data-go="/forgot" style="color: var(--lime);">${this.t('login.forgot')}</a>
          </p>

          <button class="btn btn-lime" id="submit">${this.t('welcome.login') || 'Accedi'}</button>

          ${hasOtpVerified ? `
          <p class="muted" style="text-align: center; margin-top: 12px;">
            <a id="loginOtp" style="color: var(--lime);">${this.t('login.withOtp')}</a>
          </p>` : ''}

          <p class="muted" style="text-align: center; margin-top: 18px;">
            ${this.t('login.noaccount')}
            <a data-go="/register" style="color: var(--lime);">${this.t('login.registerLink') || 'Registrati'}</a>
          </p>
        </div>
      </section>
    `;
  }

  // Retourne un message d'erreur, ou '' si la valeur est correcte
  validateEmail(value) {
    if (!Validator.required(value)) return this.t('login.requiredEmail');
    if (!Validator.email(value)) return this.t('login.invalidEmail');
    return '';
  }

  validatePassword(value) {
    return Validator.required(value) ? '' : this.t('login.requiredPassword');
  }

  bindEvents() {
    const root = this.el;
    const email = root.querySelector('#email');
    const password = root.querySelector('#password');
    const submit = root.querySelector('#submit');
    const otpBtn = root.querySelector('#loginOtp');

    // L'œil : on lui donne SEULEMENT le conteneur du mot de passe
    new PasswordField().bindEvents(root.querySelector('.password-field'));

    // Quand on tape, l'erreur du champ disparaît (sans redessiner)
    email.oninput = () => setFieldError(root, 'email', '');
    password.oninput = () => setFieldError(root, 'password', '');

    // Touche Entrée = clic sur « Accedi »
    const onEnter = (e) => { if (e.key === 'Enter') submit.click(); };
    email.onkeydown = onEnter;
    password.onkeydown = onEnter;

    submit.onclick = async () => {
      if (submit.disabled) return; // protection contre le double clic

      const emailError = this.validateEmail(email.value.trim());
      const passwordError = this.validatePassword(password.value);
      setFieldError(root, 'email', emailError);
      setFieldError(root, 'password', passwordError);

      if (emailError || passwordError) {
        (emailError ? email : password).focus();
        return;
      }

      submit.classList.add('loading');
      submit.disabled = true;

      try {
        await Auth.login(email.value.trim(), password.value);
        this.app.router.go('/listings');
      } catch (e) {
        setFieldError(root, 'password', e.message);
        submit.classList.remove('loading');
        submit.disabled = false;
      }
    };

    // Connexion par code OTP (visible seulement si déjà vérifié)
    if (otpBtn) {
      otpBtn.onclick = async () => {
        const emailError = this.validateEmail(email.value.trim());
        setFieldError(root, 'email', emailError);
        if (emailError) return;

        try {
          await Auth.sendOtp(email.value.trim());
          Storage.set('otpEmail', email.value.trim());
          this.app.router.go('/otp');
        } catch (e) {
          setFieldError(root, 'email', e.message);
        }
      };
    }
  }
}