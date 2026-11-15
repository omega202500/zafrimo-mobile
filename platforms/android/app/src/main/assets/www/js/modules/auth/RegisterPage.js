import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Validator from '../../core/Validator.js';
import FormField from '../../components/FormField.js';
import PasswordField from '../../components/PasswordField.js';
import Storage from '../../services/StorageService.js';
import { setFieldError } from '../../core/FormUtils.js';

// Tous les champs qui peuvent afficher une erreur
const FIELD_IDS = ['username', 'email', 'city', 'phone', 'profession', 'description', 'password', 'confirmPassword', 'terms'];
// Champs réservés aux propriétaires / professionnels
const OWNER_IDS = ['phone', 'profession', 'description'];

export default class RegisterPage extends Page {
  static route = '/register';
  static access = 'public';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.profileType = 'visitor'; // 'visitor' ou 'owner'
  }

  // La page est dessinée UNE seule fois : plus aucun re-rendu
  render() {
    return `
      <section class="auth-page">
        <div class="hero"></div>
        <div class="content">
          ${this.header(this.t('register.title'), { back: true })}

          <div class="profile-cards">
            <div class="profile-card selected" data-profile="visitor">
              <h3>${this.t('register.visitor')}</h3>
              <p>${this.t('register.visitorDesc')}</p>
            </div>
            <div class="profile-card" data-profile="owner">
              <h3>${this.t('register.owner')}</h3>
              <p>${this.t('register.ownerDesc')}</p>
            </div>
          </div>

          ${new FormField({ id: 'username', placeholder: this.t('register.username') }).render()}
          ${new FormField({ id: 'email', type: 'email', placeholder: this.t('register.email') }).render()}
          ${new FormField({ id: 'city', placeholder: this.t('register.city') }).render()}

          <!-- Champs réservés aux propriétaires : cachés tant que "Proprietario" n'est pas choisi -->
          <div id="ownerFields" style="display: none;">
            ${new FormField({ id: 'phone', type: 'tel', placeholder: this.t('register.phone') }).render()}

            <div class="form-group" style="margin-bottom: 12px;">
              <label style="display: block; margin-bottom: 8px; color: var(--text-2); font-size: 14px;">${this.t('register.profession')}</label>
              <select class="field" id="profession" style="width: 100%; padding: 15px 18px; border-radius: var(--r-pill); background: var(--glass); border: 1px solid var(--glass-line); color: var(--text);">
                <option value="">${this.t('register.selectProfession')}</option>
                <option value="agent">${this.t('register.professions.agent')}</option>
                <option value="broker">${this.t('register.professions.broker')}</option>
                <option value="private">${this.t('register.professions.private')}</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label style="display: block; margin-bottom: 8px; color: var(--text-2); font-size: 14px;">${this.t('register.description')}</label>
              <textarea class="field" id="description" placeholder="${this.t('register.descriptionPlaceholder')}" rows="3" style="width: 100%; padding: 15px 18px; border-radius: var(--r-pill); background: var(--glass); border: 1px solid var(--glass-line); color: var(--text); resize: vertical;"></textarea>
            </div>
          </div>

          ${new PasswordField({ id: 'password', placeholder: this.t('register.password') }).render()}
          <div class="password-strength">
            <div class="bar weak"></div>
            <div class="bar medium"></div>
            <div class="bar strong"></div>
          </div>
          ${new PasswordField({ id: 'confirmPassword', placeholder: this.t('register.confirmPassword') }).render()}

          <label class="checkbox">
            <input type="checkbox" id="terms">
            <span>${this.t('register.terms')}</span>
          </label>
          <p class="muted" style="text-align: center; margin-bottom: 16px;">
            <a data-go="/privacy" style="color: var(--lime);">${this.t('privacy.title')}</a> ·
            <a data-go="/terms" style="color: var(--lime);">${this.t('terms.title')}</a>
          </p>

          <button class="btn btn-lime" id="submit">${this.t('register.create')}</button>
        </div>
      </section>
    `;
  }

  // Lit la valeur d'un champ (texte nettoyé). Les mots de passe ne sont jamais "trimés".
  value(id) {
    const el = this.el.querySelector('#' + id);
    if (!el) return '';
    return id.toLowerCase().includes('password') ? el.value : el.value.trim();
  }

  // Retourne un objet { idDuChamp: messageErreur }. Objet vide = formulaire valide.
  validate() {
    const required = this.t('register.required');
    const errors = {};

    if (!Validator.required(this.value('username'))) errors.username = required;

    if (!Validator.required(this.value('email'))) errors.email = required;
    else if (!Validator.email(this.value('email'))) errors.email = this.t('register.invalidEmail');

    if (!Validator.required(this.value('city'))) errors.city = required;

    if (this.profileType === 'owner') {
      OWNER_IDS.forEach(id => {
        if (!Validator.required(this.value(id))) errors[id] = required;
      });
    }

    if (!Validator.required(this.value('password'))) errors.password = required;
    else if (!Validator.password(this.value('password'))) errors.password = this.t('register.shortPassword');

    if (!Validator.required(this.value('confirmPassword'))) errors.confirmPassword = required;
    else if (!Validator.match(this.value('confirmPassword'), this.value('password'))) {
      errors.confirmPassword = this.t('register.passwordMismatch');
    }

    if (!this.el.querySelector('#terms').checked) errors.terms = this.t('register.termsRequired');

    return errors;
  }

  bindEvents() {
    const root = this.el;
    const submit = root.querySelector('#submit');
    const cards = root.querySelectorAll('.profile-card');
    const ownerFields = root.querySelector('#ownerFields');
    const bars = root.querySelectorAll('.password-strength .bar');

    // Les boutons "œil" : un par champ mot de passe
    root.querySelectorAll('.password-field').forEach(w => new PasswordField().bindEvents(w));

    // Choix du type de profil : on change les classes et on montre/cache, sans redessiner
    cards.forEach(card => {
      card.onclick = () => {
        this.profileType = card.dataset.profile;
        cards.forEach(c => c.classList.toggle('selected', c === card));
        ownerFields.style.display = this.profileType === 'owner' ? 'block' : 'none';
      };
    });

    // Quand on tape ou change un champ, son erreur disparaît
    FIELD_IDS.forEach(id => {
      const el = root.querySelector('#' + id);
      if (!el) return;
      const clear = () => setFieldError(root, id, '');
      el.addEventListener('input', clear);
      el.addEventListener('change', clear);
    });

    // Indicateur de robustesse du mot de passe
    root.querySelector('#password').addEventListener('input', (e) => {
      const len = e.target.value.length;
      bars.forEach(bar => bar.classList.remove('weak', 'medium', 'strong'));
      if (len >= 8) bars[0].classList.add('weak');
      if (len >= 10) bars[1].classList.add('medium');
      if (len >= 12) bars[2].classList.add('strong');
    });

    submit.onclick = async () => {
      if (submit.disabled) return; // protection contre le double clic

      const errors = this.validate();
      FIELD_IDS.forEach(id => setFieldError(root, id, errors[id] || ''));

      if (Object.keys(errors).length > 0) {
        // On amène l'utilisateur sur la première erreur
        const first = root.querySelector('[aria-invalid="true"]');
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }

      submit.classList.add('loading');
      submit.disabled = true;

      try {
        const isOwner = this.profileType === 'owner';
        const result = await Auth.register({
          username: this.value('username'),
          email: this.value('email'),
          city: this.value('city'),
          phone: isOwner ? this.value('phone') : '',
          profession: isOwner ? this.value('profession') : '',
          description: isOwner ? this.value('description') : '',
          password: this.value('password'),
          profileType: this.profileType
        });

        if (result.requiresOtp) {
          Storage.set('otpEmail', result.email);
          this.app.router.go('/otp');
        } else {
          this.app.router.go('/listings');
        }
      } catch (e) {
        setFieldError(root, 'email', e.message); // ex: e-mail déjà utilisé
        submit.classList.remove('loading');
        submit.disabled = false;
      }
    };
  }
}