import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Validator from '../../core/Validator.js';
import PasswordField from '../../components/PasswordField.js';
import { setFieldError } from '../../core/FormUtils.js';

const FIELD_IDS = ['currentPassword', 'newPassword', 'confirmNewPassword'];

// Changement du mot de passe d'un membre connecté (cahier 6.1)
export default class ChangePasswordPage extends Page {
  static route = '/change-password';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.done = false;
  }

  render() {
    if (this.done) {
      return `
        <section>
          ${this.header(this.t('settings.changePassword'), { back: true })}
          <div class="glass card" style="text-align: center; padding: 32px 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h2 style="margin-bottom: 12px;">${this.t('changePwd.doneTitle')}</h2>
            <p class="muted" style="margin-bottom: 24px;">${this.t('changePwd.doneText')}</p>
            <button class="btn btn-lime" data-go="/settings" style="margin-bottom: 0;">${this.t('changePwd.back')}</button>
          </div>
        </section>
      `;
    }

    return `
      <section>
        ${this.header(this.t('settings.changePassword'), { back: true })}
        <div class="glass card">
          ${new PasswordField({ id: 'currentPassword', placeholder: this.t('changePwd.current') }).render()}
          ${new PasswordField({ id: 'newPassword', placeholder: this.t('reset.newPassword') }).render()}
          ${new PasswordField({ id: 'confirmNewPassword', placeholder: this.t('register.confirmPassword') }).render()}
          <button class="btn btn-lime" id="submit" style="margin-bottom: 0;">${this.t('changePwd.save')}</button>
        </div>
      </section>
    `;
  }

  value(id) {
    const el = this.el.querySelector('#' + id);
    return el ? el.value : '';
  }

  validate() {
    const errors = {};
    const current = this.value('currentPassword');
    const next = this.value('newPassword');
    const confirm = this.value('confirmNewPassword');
    const required = this.t('register.required');

    if (!Validator.required(current)) errors.currentPassword = required;

    if (!Validator.required(next)) errors.newPassword = required;
    else if (!Validator.password(next)) errors.newPassword = this.t('register.shortPassword');
    else if (next === current) errors.newPassword = this.t('changePwd.errSame');

    if (!Validator.required(confirm)) errors.confirmNewPassword = required;
    else if (!Validator.match(confirm, next)) errors.confirmNewPassword = this.t('register.passwordMismatch');

    return errors;
  }

  bindEvents() {
    if (this.done) return;

    const root = this.el;
    const submit = root.querySelector('#submit');

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
        await Auth.changePassword({
          current: this.value('currentPassword'),
          next: this.value('newPassword')
        });
        this.done = true;
        this.reRender();
      } catch (e) {
        if (e.message === 'wrong-password') setFieldError(root, 'currentPassword', this.t('changePwd.errWrong'));
        else if (e.message === 'same-password') setFieldError(root, 'newPassword', this.t('changePwd.errSame'));
        else if (e.message === 'weak-password') setFieldError(root, 'newPassword', this.t('register.shortPassword'));
        else setFieldError(root, 'confirmNewPassword', this.t('authError.generic'));
        submit.classList.remove('loading');
        submit.disabled = false;
      }
    };
  }
}