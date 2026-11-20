import Storage from './StorageService.js';
import Api, { ApiError } from './ApiService.js';
import I18n from './I18nService.js';
import { ASSET_URL } from '../config.js';

const ACCOUNT_KEYS = ['token', 'user', 'pendingRegistration', 'otpEmail', 'otpVerified', 'resetEmail',
  'starsRequest', 'notif_prefs', 'blocked_users', 'conversations_custom', 'conversations_seeded'];

// Service d'authentification (Laravel Sanctum)
// CONNECTÉ À L'API : POST /register · /login · /logout · GET /me · POST /forgot-password · /reset-password
//   · /change-password · PUT /me/consultant-rate · DELETE /me
// ENCORE ABSENT côté serveur : vérification par code OTP (sendOtp / verifyOtp).
// Les erreurs sont des Error avec un CODE ('invalid-credentials', 'email-taken'...) que les pages traduisent.
class AuthService {
  isLogged() { return !!Storage.get('token'); }

  // Transforme l'utilisateur renvoyé par l'API Laravel (user + profile) en objet utilisé par l'application
  mapUser(u = {}) {
    const p = u.profile || {};
    const isConsultant = !!p.is_consultant;
    const isOwner = u.role === 'owner' || isConsultant;
    const price = p.consultation_price_cents;

    const user = {
      id: u.id,
      email: u.email,
      name: p.display_name || u.email,
      username: p.display_name,
      stars: Number(u.stars_count ?? p.stars ?? 0),
      role: isConsultant ? 'consultant' : (u.role || 'visitor'),
      isOwner,
      isConsultant,
      rate: isConsultant && price != null ? price / 100 : undefined,
      available: p.availability_status ? p.availability_status !== 'unavailable' : true,
      status: u.status === 'suspended' ? 'suspended' : 'active', // décidé par l'administrateur
      city: p.city && typeof p.city === 'object' ? p.city.name : p.city,
      bio: p.bio,
      photoUrl: p.photo_path ? `${ASSET_URL}/storage/${p.photo_path}` : undefined,
      locale: u.locale,
      createdAt: u.created_at ? Date.parse(u.created_at) : undefined
    };
    // On retire les champs absents pour ne pas écraser ce qui est déjà stocké
    Object.keys(user).forEach(k => user[k] === undefined && delete user[k]);
    return user;
  }

  // Convertit une erreur de l'API en code d'erreur que les pages savent traduire
  // forbiddenCode : sens d'un 403 (par défaut : compte suspendu, à la connexion)
  toAuthError(err, { forbiddenCode = 'account-suspended' } = {}) {
    if (!(err instanceof ApiError)) return err;

    // Codes explicites envoyés par l'API : 'invalid-code', 'wrong-password', 'same-password', 'delete-blocked'
    const SERVER_CODES = ['invalid-code', 'wrong-password', 'same-password', 'delete-blocked'];
    let code = 'generic';
    let fields;

    if (err.data && SERVER_CODES.includes(err.data.code)) code = err.data.code;
    else if (err.status === 0) code = 'network';          // serveur injoignable / délai dépassé
    else if (err.status === 401) code = 'invalid-credentials';
    else if (err.status === 403) code = forbiddenCode;
    else if (err.status === 422) {
      // Erreurs de validation Laravel : { errors: { email: [...], password: [...] } }
      const errors = (err.data && err.data.errors) || {};
      fields = {};
      // La forme de l'e-mail est vérifiée avant l'envoi : si le serveur la refuse, c'est qu'elle est déjà utilisée
      if (errors.email) fields.email = 'email-taken';
      if (errors.password) fields.password = 'weak-password';
      code = errors.email ? 'email-taken' : (errors.password ? 'weak-password' : 'required-fields');
    }

    const error = new Error(code);
    error.status = err.status;
    if (fields && Object.keys(fields).length) error.fields = fields;
    return error;
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('required-fields');
    }
    if (!email.includes('@')) {
      throw new Error('invalid-email');
    }

    let data;
    try {
      data = await Api.post('/login', { email, password });
    } catch (err) {
      throw this.toAuthError(err);
    }

    Storage.set('token', data.token);
    Storage.set('user', this.mapUser(data.user));
  }

  async register(data) {
    const { username, email, city, phone, profession, description, password, profileType } = data;

    if (!username || !email || !city || !password) {
      throw new Error('required-fields');
    }
    if (!email.includes('@')) {
      throw new Error('invalid-email');
    }
    if (password.length < 8) {
      throw new Error('weak-password');
    }
    // Seuls "visiteur" et "propriétaire / professionnel" existent à l'inscription (cahier 6.1)
    if (profileType !== 'visitor' && profileType !== 'owner') {
      throw new Error('required-fields');
    }

    let res;
    try {
      res = await Api.post('/register', {
        display_name: username,
        email,
        password,
        password_confirmation: password, // la confirmation a déjà été vérifiée dans le formulaire
        role: profileType,
        locale: I18n.getCurrentLang(),
        city,
        phone: phone || undefined,
        profession: profession || undefined,
        description: description || undefined,
        accept_terms: true,
        accept_privacy: true
      });
    } catch (err) {
      throw this.toAuthError(err);
    }

    // Le serveur renvoie directement un jeton : pas d'étape de vérification par code
    Storage.set('token', res.token);
    const mapped = this.mapUser(res.user);
    Storage.set('user', {
      ...mapped,
      city: mapped.city || city,
      phone, // jamais affiché (cahier 6.2)
      profession,
      description
    });
    Storage.remove('pendingRegistration');

    return { requiresOtp: false, email };
  }

  // Met à jour l'utilisateur stocké avec les données du serveur (rôle, statut suspendu, étoiles...)
  async refresh() {
    if (!this.isLogged()) return null;
    const data = await Api.get('/me');
    const user = { ...(this.user() || {}), ...this.mapUser(data.user) };
    Storage.set('user', user);
    return user;
  }

  // Envoie un code de récupération par e-mail (cahier 6.1). La réponse ne dit jamais si l'e-mail existe.
  async forgotPassword(email) {
    if (!email) {
      throw new Error('required-email');
    }
    if (!email.includes('@')) {
      throw new Error('invalid-email');
    }
    try {
      await Api.post('/forgot-password', { email, locale: I18n.getCurrentLang() });
    } catch (err) {
      throw this.toAuthError(err);
    }
  }

  // Nouveau mot de passe avec le code reçu par e-mail
  async resetPassword({ email, code, password }) {
    if (!email || !email.includes('@')) throw new Error('invalid-email');
    if (!code || !/^\d{6}$/.test(code)) throw new Error('invalid-code');
    if (!password || password.length < 8) throw new Error('weak-password');

    try {
      await Api.post('/reset-password', { email, code, password });
    } catch (err) {
      throw this.toAuthError(err);
    }
  }

  // Changement du mot de passe d'un utilisateur connecté
  async changePassword({ current, next }) {
    if (!current) throw new Error('wrong-password');
    if (!next || next.length < 8) throw new Error('weak-password');
    if (next === current) throw new Error('same-password');

    try {
      await Api.post('/change-password', { current_password: current, password: next });
    } catch (err) {
      throw this.toAuthError(err);
    }
  }

  // Vérification par code OTP : l'API Laravel n'a pas (encore) d'endpoint pour ça, et l'inscription
  // renvoie déjà un jeton. On refuse plutôt que de simuler une session avec un faux jeton.
  async sendOtp() { throw new Error('feature-unavailable'); }
  async verifyOtp() { throw new Error('feature-unavailable'); }

  // Tarif de consultation (réservé aux consultants validés par l'administration)
  async updateRate(rate) {
    let res;
    try {
      res = await Api.put('/me/consultant-rate', { rate: Number(rate) });
    } catch (err) {
      throw this.toAuthError(err, { forbiddenCode: 'generic' });
    }
    const user = this.user();
    if (user) {
      user.rate = Number(res.rate);
      Storage.set('user', user);
    }
    return user;
  }

  // Suppression du compte (exigence des stores, cahier 6.1). Refusée tant qu'une consultation est en cours.
  async deleteAccount() {
    try {
      await Api.delete('/me');
    } catch (err) {
      throw this.toAuthError(err, { forbiddenCode: 'generic' });
    }
    ACCOUNT_KEYS.forEach(key => Storage.remove(key));
  }

  logout() {
    // On prévient le serveur (le jeton est lu avant d'être effacé) sans attendre sa réponse
    if (Storage.get('token')) Api.post('/logout').catch(() => {});
    ACCOUNT_KEYS.forEach(key => Storage.remove(key));
  }

  user() { return Storage.get('user'); }
}

export default new AuthService();
