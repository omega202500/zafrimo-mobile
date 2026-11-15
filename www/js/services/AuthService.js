import Storage from './StorageService.js';
import Api, { ApiError } from './ApiService.js';
import I18n from './I18nService.js';
import { ASSET_URL } from '../config.js';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const ACCOUNT_KEYS = ['token', 'user', 'pendingRegistration', 'otpEmail', 'otpVerified', 'resetEmail',
  'starsRequest', 'notif_prefs', 'blocked_users', 'conversations_custom', 'conversations_seeded'];

// Service d'authentification (Laravel Sanctum)
// CONNECTÉ À L'API : POST /register · POST /login · POST /logout · GET /me
// ENCORE SIMULÉ (pas d'endpoint côté serveur) : mot de passe oublié / réinitialisation / changement,
//   code OTP, taux de consultation, suppression du compte.
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
      city: p.city,
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
  toAuthError(err) {
    if (!(err instanceof ApiError)) return err;

    let code = 'generic';
    let fields;

    if (err.status === 0) code = 'network';              // serveur injoignable / délai dépassé
    else if (err.status === 401) code = 'invalid-credentials';
    else if (err.status === 403) code = 'account-suspended';
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
        accept_terms: true,
        accept_privacy: true
      });
    } catch (err) {
      throw this.toAuthError(err);
    }

    // Le serveur renvoie directement un jeton : pas d'étape de vérification par code
    Storage.set('token', res.token);
    Storage.set('user', {
      ...this.mapUser(res.user),
      // Ces champs ne sont pas encore enregistrés par l'API (/register ne les accepte pas) : gardés sur l'appareil
      city,
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

  // Envoie un code de récupération (cahier 6.1). La réponse ne dit jamais si l'e-mail existe.
  async forgotPassword(email) {
    await wait(600);

    if (!email) {
      throw new Error('required-email');
    }
    if (!email.includes('@')) {
      throw new Error('invalid-email');
    }
    // TODO API : POST /auth/forgot-password { email } -> le serveur envoie un code à 6 chiffres (n'existe pas encore côté Laravel)
  }

  // Nouveau mot de passe avec le code reçu par e-mail
  // TODO API : POST /auth/reset-password { email, code, password } (n'existe pas encore côté Laravel)
  async resetPassword({ email, code, password }) {
    await wait(600);

    if (!email || !email.includes('@')) throw new Error('invalid-email');
    if (code !== '123456') throw new Error('invalid-code'); // MOCK : le vrai code viendra du serveur
    if (!password || password.length < 8) throw new Error('weak-password');
  }

  // Changement du mot de passe d'un utilisateur connecté
  // TODO API : POST /auth/change-password { current, next } (n'existe pas encore côté Laravel)
  async changePassword({ current, next }) {
    await wait(600);

    // MOCK : aucun mot de passe n'est stocké, on applique la règle de connexion (6 caractères minimum)
    if (!current || current.length < 6) throw new Error('wrong-password');
    if (!next || next.length < 8) throw new Error('weak-password');
    if (next === current) throw new Error('same-password');
  }

  // Vérification par code OTP : l'API Laravel n'a pas (encore) d'endpoint pour ça, et l'inscription
  // renvoie déjà un jeton. On refuse plutôt que de simuler une session avec un faux jeton.
  async sendOtp() { throw new Error('feature-unavailable'); }
  async verifyOtp() { throw new Error('feature-unavailable'); }

  async updateRate(rate) {
    await wait(300);
    const user = this.user();
    if (user) {
      user.rate = Number(rate);
      Storage.set('user', user);
    }
    return user;
  }

  // Suppression du compte (exigence des stores, cahier 6.1)
  // TODO API : DELETE /me (n'existe pas encore côté Laravel : seules les données locales sont effacées)
  async deleteAccount() {
    await wait(400);
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
