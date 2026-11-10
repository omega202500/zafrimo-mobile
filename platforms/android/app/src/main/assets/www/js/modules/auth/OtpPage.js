import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Validator from '../../core/Validator.js';
import Storage from '../../services/StorageService.js';
import { escapeHtml } from '../../core/Html.js';

const RESEND_SECONDS = 60;

// Vérification de l'e-mail par code à 6 chiffres (à l'inscription ou à la connexion par code)
export default class OtpPage extends Page {
  static route = '/otp';
  static access = 'public';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.email = '';
    this.otp = '';
    this.timer = RESEND_SECONDS;
    this.timerInterval = null;
  }

  async onEnter() {
    this.email = Storage.get('otpEmail') || '';
    if (!this.email) {
      this.app.router.go('/login');
    }
  }

  // Le DOM existe : on peut lancer le compte à rebours
  onMounted() {
    if (this.email) this.startTimer();
  }

  onLeave() {
    this.stopTimer();
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  startTimer() {
    this.stopTimer();
    this.timer = RESEND_SECONDS;
    this.updateResendZone();

    this.timerInterval = setInterval(() => {
      this.timer -= 1;
      if (this.timer <= 0) this.stopTimer();
      this.updateResendZone();
    }, 1000);
  }

  // Met à jour seulement la zone "renvoyer le code", sans redessiner la page
  updateResendZone() {
    const zone = this.el && this.el.querySelector('#resendZone');
    if (!zone) return;

    if (this.timer > 0) {
      zone.innerHTML = `${this.t('otp.resendIn')} <span class="timer">${this.timer}</span>s`;
    } else {
      zone.innerHTML = `<a id="resend">${this.t('otp.resend')}</a>`;
      zone.querySelector('#resend').onclick = () => this.resend();
    }
  }

  showError(message) {
    const el = this.el && this.el.querySelector('#otpError');
    if (el) el.textContent = message;
  }

  async resend() {
    this.showError('');
    try {
      await Auth.sendOtp(this.email);
      this.startTimer();
    } catch (e) {
      this.showError(this.t('forgot.error'));
    }
  }

  render() {
    return `
      <section class="auth-page">
        <div class="hero"></div>
        <div class="content">
          ${this.header(this.t('otp.title'), { back: true, notifications: false })}
          <p class="muted" style="margin-bottom: 16px;">${this.t('otp.subtitle')}</p>
          <p class="muted" style="margin-bottom: 24px;">${escapeHtml(this.email)}</p>
          <div class="otp-inputs">
            ${[0, 1, 2, 3, 4, 5].map(i => `
              <input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-index="${i}" ${i === 0 ? 'autocomplete="one-time-code"' : ''}>
            `).join('')}
          </div>
          <p class="field-error" id="otpError" style="text-align: center;"></p>
          <div class="resend-timer" id="resendZone"></div>
          <button class="btn btn-lime" id="submit">${this.t('otp.verify')}</button>
        </div>
      </section>
    `;
  }

  bindEvents() {
    const otpInputs = this.el.querySelectorAll('.otp-input');
    const submitBtn = this.el.querySelector('#submit');

    otpInputs.forEach((input, index) => {
      input.oninput = (e) => {
        const value = e.target.value;
        e.target.value = value.slice(-1); // on garde le dernier caractère
        this.showError('');

        if (value && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
        this.otp = Array.from(otpInputs).map(i => i.value).join('');
      };

      input.onkeydown = (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      };

      input.onpaste = (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/\D/g, '').slice(0, 6);

        digits.split('').forEach((digit, i) => {
          if (otpInputs[i]) otpInputs[i].value = digit;
        });

        this.otp = digits;
        otpInputs[Math.min(digits.length, 5)].focus();
      };
    });

    submitBtn.onclick = async () => {
      if (submitBtn.disabled) return;

      if (!Validator.required(this.otp) || this.otp.length !== 6) {
        this.showError(this.t('otp.required'));
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        await Auth.verifyOtp(this.email, this.otp);
        Storage.remove('otpEmail');
        this.app.router.go('/listings');
      } catch (e) {
        this.showError(this.t('otp.invalid'));
        // Code faux : on vide les cases pour en saisir un nouveau
        otpInputs.forEach(i => { i.value = ''; });
        this.otp = '';
        otpInputs[0].focus();
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    };
  }
}