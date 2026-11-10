import Storage from './StorageService.js';

export const API_URL = 'https://api.zafrimo.example/api'; // à remplacer par l'URL réelle de l'API Laravel
const TIMEOUT_MS = 15000;

// Erreur d'API. status = 0 quand il n'y a pas de réponse (réseau coupé, délai dépassé).
export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  async request(method, path, body) {
    const token = Storage.get('token');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res;
    try {
      res = await fetch(API_URL + path, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (err) {
      // Pas de réseau, serveur injoignable ou délai dépassé
      throw new ApiError(err.name === 'AbortError' ? 'timeout' : 'network', 0);
    } finally {
      clearTimeout(timer);
    }

    // Jeton refusé : la session a expiré. (Sans jeton envoyé, par exemple un mauvais mot de passe à la connexion,
    // ce n'est pas une expiration.)
    if (res.status === 401 && token) {
      Storage.remove('token');
      Storage.remove('user');
      window.dispatchEvent(new CustomEvent('zafrimo:session-expired'));
      throw new ApiError('session-expired', 401);
    }

    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError((data && data.message) || String(res.status), res.status, data);
    }
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  delete(path) { return this.request('DELETE', path); }
}

export default new ApiService();