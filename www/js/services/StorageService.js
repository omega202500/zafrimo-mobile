// TODO: remplacer par un plugin de stockage sécurisé (Keychain / Keystore) pour le jeton
class StorageService {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  remove(k) { localStorage.removeItem(k); }
  clear() { localStorage.clear(); }
}
export default new StorageService();
