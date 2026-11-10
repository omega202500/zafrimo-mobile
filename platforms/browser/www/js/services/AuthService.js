import Storage from './StorageService.js';
import settings from '../mocks/settings.js';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Service d'authentification (MOCK Sanctum)
// TODO API (Laravel) : POST /auth/login · /auth/register · /auth/verify-otp · /auth/forgot-password ·
//   /auth/reset-password · /auth/change-password · PUT /me/consultant-rate · DELETE /me
// Les nouvelles méthodes (resetPassword, changePassword) lèvent des erreurs avec un CODE
// ('invalid-code', 'wrong-password'...) que les pages traduisent.
class AuthService {
  isLogged() { return !!Storage.get('token'); }

  // Le rôle consultant est accordé par l'administrateur (cahier 5 et 11) : il vient du serveur.
  // TEST uniquement : sans API, un mot dans l'e-mail simule les rôles.
  mockRoles(email) {
    if (!settings.devRolesByEmail) return { isConsultant: false, isOwner: false };
    const lower = (email || '').toLowerCase();
    const isConsultant = lower.includes('consult');
    return { isConsultant, isOwner: isConsultant || lower.includes('owner') };
  }

  buildUser({ email, name, stars, isOwner, isConsultant, extra = {} }) {
    return {
      email,
      name,
      stars,
      role: isConsultant ? 'consultant' : (isOwner ? 'owner' : 'visitor'),
      isOwner,
      isConsultant,
      rate: isConsultant ? settings.defaultConsultationPrice : undefined,
      available: true,
      status: 'active', // 'active' ou 'suspended' (décidé par l'administrateur)
      ...extra
    };
  }

  async login(email, password) {
    await wait(600);

    if (!email || !password) {
      throw new Error('Compila tutti i campi');
    }
    if (!email.includes('@')) {
      throw new Error('E-mail non valida');
    }
    if (password.length < 6) {
      throw new Error('Identificativi errati');
    }

    const { isConsultant, isOwner } = this.mockRoles(email);

    Storage.set('token', 'mock-token');
    Storage.set('user', this.buildUser({
      email,
      name: isConsultant ? 'Giulia' : (isOwner ? 'Luca' : 'Marco'),
      stars: isConsultant ? 5 : (isOwner ? 4 : 2),
      isOwner,
      isConsultant
    }));
  }

  async register(data) {
    await wait(600);

    const { username, email, city, phone, profession, description, password, profileType } = data;

    if (!username || !email || !city || !password) {
      throw new Error('Compila tutti i campi');
    }
    if (!email.includes('@')) {
      throw new Error('E-mail non valida');
    }
    if (password.length < 8) {
      throw new Error('La password deve contenere almeno 8 caratteri');
    }
    // Seuls "visiteur" et "propriétaire / professionnel" existent à l'inscription (cahier 6.1)
    if (profileType !== 'visitor' && profileType !== 'owner') {
      throw new Error('Compila tutti i campi');
    }

    // Sécurité : NE JAMAIS stocker le mot de passe dans pendingRegistration
    Storage.set('pendingRegistration', {
      username,
      email,
      city,
      phone,
      profession,
      description,
      profileType
    });

    await this.sendOtp(email);
    return { requiresOtp: true, email };
  }

  // Envoie un code de récupération (cahier 6.1). La réponse ne dit jamais si l'e-mail existe.
  async forgotPassword(email) {
    await wait(600);

    if (!email) {
      throw new Error('E-mail obbligatoria');
    }
    if (!email.includes('@')) {
      throw new Error('E-mail non valida');
    }
    // TODO API : POST /auth/forgot-password { email } -> le serveur envoie un code à 6 chiffres
  }

  // Nouveau mot de passe avec le code reçu par e-mail
  // TODO API : POST /auth/reset-password { email, code, password }
  async resetPassword({ email, code, password }) {
    await wait(600);

    if (!email || !email.includes('@')) throw new Error('invalid-email');
    if (code !== '123456') throw new Error('invalid-code'); // MOCK : le vrai code vient du serveur
    if (!password || password.length < 8) throw new Error('weak-password');
  }

  // Changement du mot de passe d'un utilisateur connecté
  // TODO API : POST /auth/change-password { current, next }
  async changePassword({ current, next }) {
    await wait(600);

    // MOCK : aucun mot de passe n'est stocké, on applique la règle de connexion (6 caractères minimum)
    if (!current || current.length < 6) throw new Error('wrong-password');
    if (!next || next.length < 8) throw new Error('weak-password');
    if (next === current) throw new Error('same-password');
  }

  async sendOtp(email) {
    await wait(600);

    if (!email) {
      throw new Error('E-mail obbligatoria');
    }
    if (!email.includes('@')) {
      throw new Error('E-mail non valida');
    }
  }

  async verifyOtp(email, otp) {
    await wait(600);

    if (!otp || otp.length !== 6) {
      throw new Error('Codice non valido');
    }
    if (otp !== '123456') { // MOCK : le vrai code vient du serveur
      throw new Error('Codice non valido');
    }

    Storage.set('otpVerified', true);

    const pending = Storage.get('pendingRegistration');
    if (pending) {
      // Nouveau compte : 0 étoile, jamais consultant (c'est l'administrateur qui autorise)
      const roles = this.mockRoles(pending.email);
      const isOwner = pending.profileType === 'owner' || roles.isOwner;

      Storage.set('token', 'mock-token');
      Storage.set('user', this.buildUser({
        email: pending.email,
        name: pending.username,
        stars: 0,
        isOwner,
        isConsultant: roles.isConsultant,
        extra: {
          username: pending.username,
          city: pending.city,
          phone: pending.phone, // jamais affiché (cahier 6.2)
          profession: pending.profession,
          description: pending.description,
          createdAt: Date.now()
        }
      }));
      Storage.remove('pendingRegistration');
    } else {
      // Connexion par code : même logique que la connexion classique
      const { isConsultant, isOwner } = this.mockRoles(email);

      Storage.set('token', 'mock-token');
      Storage.set('user', this.buildUser({
        email,
        name: isConsultant ? 'Giulia' : (isOwner ? 'Luca' : 'Marco'),
        stars: isConsultant ? 5 : (isOwner ? 4 : 2),
        isOwner,
        isConsultant
      }));
    }
  }

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
  // TODO API : DELETE /me
  async deleteAccount() {
    await wait(400);
       ['token', 'user', 'pendingRegistration', 'otpEmail', 'otpVerified', 'resetEmail',
      'starsRequest', 'notif_prefs', 'blocked_users',
      'conversations_custom', 'conversations_seeded'].forEach(key => Storage.remove(key));
  }

  logout() {
    Storage.remove('token');
    Storage.remove('user');
  }

  user() { return Storage.get('user'); }
}

export default new AuthService();