// ─────────────────────────────────────────────────────────────────────────────
// Adresse de l'API Laravel : c'est le SEUL endroit à modifier.
// ─────────────────────────────────────────────────────────────────────────────

// 1) Production : l'URL de ton backend sur Render (toujours en https), terminée par /api
const PROD_API_URL = 'https://REMPLACE-MOI.onrender.com/api';

// 2) Mets true pour construire l'APK de production
const USE_PROD = false;

// 3) Développement (backend lancé sur ton PC avec `php artisan serve`)
const DEV_PORT = 8000;
// Pour tester sur un VRAI téléphone : mets l'IP de ton PC (ex. '192.168.1.20'),
// et lance le backend avec `php artisan serve --host=0.0.0.0`.
const DEV_HOST_OVERRIDE = '';

function devApiUrl() {
  const platform = typeof window !== 'undefined' && window.cordova && window.cordova.platformId;
  // 10.0.2.2 = « le PC » vu depuis l'émulateur Android
  const host = DEV_HOST_OVERRIDE || (platform === 'android' ? '10.0.2.2' : '127.0.0.1');
  return `http://${host}:${DEV_PORT}/api`;
}

export const API_URL = USE_PROD ? PROD_API_URL : devApiUrl();
// Racine du serveur (sans /api) : sert à construire les URLs des images (/storage/...)
export const ASSET_URL = API_URL.replace(/\/api\/?$/, '');
