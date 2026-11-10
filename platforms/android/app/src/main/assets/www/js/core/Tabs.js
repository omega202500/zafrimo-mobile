import settings from '../mocks/settings.js';

const ICON_ATTRS = 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const NEWS_ICON = `<svg ${ICON_ATTRS}>
  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
  <path d="M18 14h-8"></path>
  <path d="M15 18h-5"></path>
  <path d="M10 6h8v4h-8z"></path>
</svg>`;

const HOME_ICON = `<svg ${ICON_ATTRS}>
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  <polyline points="9 22 9 12 15 12 15 22"></polyline>
</svg>`;

const LIVE_ICON = `<svg ${ICON_ATTRS}>
  <polygon points="23 7 16 12 23 17 23 7"></polygon>
  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
</svg>`;

const MESSAGES_ICON = `<svg ${ICON_ATTRS}>
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`;

const PROFILE_ICON = `<svg ${ICON_ATTRS}>
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
  <circle cx="12" cy="7" r="4"></circle>
</svg>`;

// Rubriques principales, dans l'ordre du cahier (section 7.1) : Actualités, Annonces, Messages, Profil.
// matches = débuts d'adresse qui gardent l'onglet allumé (ex. /chat/12 allume Messages).
export const TABS = [
  { id: 'listings', path: '/listings', labelKey: 'nav.listings', icon: HOME_ICON, matches: ['/listings'] },
  { id: 'news', path: '/news', labelKey: 'nav.news', icon: NEWS_ICON, matches: ['/news'] },
  // Emplacement réservé pour la future rubrique Live (cahier 7.1 et 21).
  // Invisible tant que liveEnabled est faux. Il faudra créer la page /live avant de l'activer.
  { id: 'live', path: '/live', labelKey: 'nav.live', icon: LIVE_ICON, matches: ['/live'], enabled: () => !!settings.liveEnabled },
  { id: 'messages', path: '/messages', labelKey: 'nav.messages', icon: MESSAGES_ICON, matches: ['/messages', '/chat', '/consultation'], hasBadge: true },
  { id: 'profile', path: '/profile', labelKey: 'nav.profile', icon: PROFILE_ICON, matches: ['/profile', '/settings', '/my-'] }
];

// Onglets affichés (sans l'emplacement Live tant qu'il n'est pas activé)
export function visibleTabs() {
  return TABS.filter(tab => !tab.enabled || tab.enabled());
}

// Position de l'onglet correspondant à une adresse, ou -1 si ce n'est pas une rubrique
export function tabIndexOf(path) {
  return visibleTabs().findIndex(tab => tab.matches.some(m => path.startsWith(m)));
}