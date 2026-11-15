import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Validator from '../../core/Validator.js';
import PasswordField from '../../components/PasswordField.js';
import Storage from '../../services/StorageService.js';
import { setFieldError } from '../../core/FormUtils.js';
import { escapeHtml } from '../../core/Html.js';

const FIELD_IDS = ['code', 'password', 'confirmPassword'];
const RESEND_LOCK_MS = 30000;

// Étape 2 de la récupération : code reçu par e-mail + nouveau mot de passe (cahier 6.1)
export default class ResetPasswordPage extends Page {
  static route = '/reset-password';
  static access = 'public';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.email = '';
    this.done = false;
    this.resendLocked = false;
    this.resendTimer = null;
  }

  async onEnter() {
    this.email = Storage.get('resetEmail') || '';
  }

  onMounted() {
    // Sans e-mail mémorisé, on repart de la première étape
    if (!this.email && !this.done) this.app.router.go('/forgot');
  }

  onLeave() {
    if (this.resendTimer) {
      clearTimeout(this.resendTimer);
      this.resendTimer = null;
    }
  }

  render() {
    if (this.done) {
      return `
        <section class="auth-page">
          <div class="hero"></div>
          <div class="content">
            <div class="glass card" style="text-align: center; padding: 32px 20px;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <h2 style="margin-bottom: 12px;">${this.t('reset.doneTitle')}</h2>
              <p class="muted" style="margin-bottom: 24px;">${this.t('reset.doneText')}</p>
              <button class="btn btn-lime" data-go="/login" style="margin-bottom: 0;">${this.t('reset.toLogin')}</button>
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="auth-page">
        <div class="hero"></div>
        <div class="content">
          ${this.header(this.t('reset.title'), { back: true, notifications: false })}
          <p class="muted" style="margin-bottom: 16px;">${this.t('reset.intro').replace('{email}', '<strong>' + escapeHtml(this.email) + '</strong>')}</p>

          <input class="field" id="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="${this.t('reset.code')}">
          ${new PasswordField({ id: 'password', placeholder: this.t('reset.newPassword') }).render()}
          ${new PasswordField({ id: 'confirmPassword', placeholder: this.t('register.confirmPassword') }).render()}

          <button class="btn btn-lime" id="submit">${this.t('reset.submit')}</button>

          <p class="muted" style="text-align: center; margin-top: 16px;">
            <a id="resend" style="color: var(--lime);">${this.t('reset.resend')}</a>
          </p>
        </div>
      </section>
    `;
  }

  value(id) {
    const el = this.el.querySelector('#' + id);
    return el ? el.value : '';
  }

  // Retourne { idDuChamp: message } ; objet vide = formulaire valide
  validate() {
    const errors = {};
    const code = this.value('code').trim();
    const password = this.value('password');
    const confirm = this.value('confirmPassword');

    if (!/^\d{6}$/.test(code)) errors.code = this.t('reset.errCode');

    if (!Validator.required(password)) errors.password = this.t('register.required');
    else if (!Validator.password(password)) errors.password = this.t('register.shortPassword');

    if (!Validator.required(confirm)) errors.confirmPassword = this.t('register.required');
    else if (!Validator.match(confirm, password)) errors.confirmPassword = this.t('register.passwordMismatch');

    return errors;
  }

  bindEvents() {
    if (this.done) return;

    const root = this.el;
    const submit = root.querySelector('#submit');
    const resend = root.querySelector('#resend');

    root.querySelectorAll('.password-field').forEach(w => new PasswordField().bindEvents(w));

    FIELD_IDS.forEach(id => {
      const el = root.querySelector('#' + id);
      if (el) el.addEventListener('input', () => setFieldError(root, id, ''));
    });

    submit.onclick = async () => {
      if (submit.disabled) return;

      const errors = this.validate();
      FIELD_IDS.forEach(id => setFieldError(root, id, errors[id] || ''));
      const first = FIELD_IDS.find(id => errors[id]);
      if (first) {
        root.querySelector('#' + first).focus();
        return;
      }

      submit.classList.add('loading');
      submit.disabled = true;

      try {
        await Auth.resetPassword({
          email: this.email,
          code: this.value('code').trim(),
          password: this.value('password')
        });
        Storage.remove('resetEmail');
        this.done = true;
        this.reRender();
      } catch (e) {
        if (e.message === 'invalid-code') setFieldError(root, 'code', this.t('reset.errInvalidCode'));
        else if (e.message === 'weak-password') setFieldError(root, 'password', this.t('register.shortPassword'));
        else setFieldError(root, 'confirmPassword', this.t('authError.generic'));
        submit.classList.remove('loading');
        submit.disabled = false;
      }
    };

    // Renvoyer le code : bloqué 30 secondes pour éviter les abus
    resend.onclick = async () => {
      if (this.resendLocked) return;
      this.resendLocked = true;
      resend.textContent = this.t('reset.resent');

      try {
        await Auth.forgotPassword(this.email);
      } catch (e) {
        setFieldError(root, 'code', this.t('forgot.error'));
      }

      this.resendTimer = setTimeout(() => {
        this.resendLocked = false;
        const link = this.el && this.el.querySelector('#resend');
        if (link) link.textContent = this.t('reset.resend');
      }, RESEND_LOCK_MS);
    };
  }
}