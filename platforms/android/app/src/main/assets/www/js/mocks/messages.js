// Conversations d'exemple (TEST uniquement). ownerId = identifiant du propriétaire dans mocks/listings.js
export default [
  {
    id: 1,
    ownerId: 'u-giulia@example.com',
    name: 'Giulia R.',
    role: 'Consulente immobiliare',
    online: true,
    avatar: 'assets/img/owner-avatar.webp',
    listingTitle: 'Elysian Prime House (Milano)',
    unreadCount: 1,
    messages: [
      { id: 1, sender: 'other', text: 'Buongiorno! Ho visto il tuo interesse per Elysian Prime House.', sentAt: Date.now() - 3 * 60 * 60 * 1000 },
      { id: 2, sender: 'me', text: 'Salve Giulia, è possibile organizzare una visita giovedì prossimo?', sentAt: Date.now() - 2.5 * 60 * 60 * 1000 },
      { id: 3, sender: 'other', text: 'Certamente! Alle 15:30 andrebbe bene per te?', sentAt: Date.now() - 2 * 60 * 60 * 1000 }
    ]
  },
  {
    id: 2,
    ownerId: 'u-marco@example.com',
    name: 'Marco B.',
    role: 'Proprietario privato',
    online: false,
    avatar: 'assets/img/owner-avatar.webp',
    listingTitle: 'Villa Aurora (Roma)',
    unreadCount: 0,
    messages: [
      { id: 1, sender: 'me', text: 'Buonasera Marco, la villa include anche il box doppio?', sentAt: Date.now() - 26 * 60 * 60 * 1000 },
      { id: 2, sender: 'other', text: 'Sì, esattamente: ci sono 2 posti auto coperti e cantina.', sentAt: Date.now() - 25.5 * 60 * 60 * 1000 }
    ]
  },
  {
    id: 3,
    ownerId: 'u-elena@example.com',
    name: 'Elena D.',
    role: 'Consulente',
    online: true,
    avatar: 'assets/img/owner-avatar.webp',
    listingTitle: '',
    unreadCount: 0,
    type: 'consultation',
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    messages: [
      { id: 1, sender: 'other', text: 'Benvenuto nella consulenza! Come posso aiutarti?', sentAt: Date.now() - 30 * 60 * 1000 }
    ]
  },
  {
    id: 4,
    ownerId: 'u-paolo@example.com',
    name: 'Paolo F.',
    role: 'Consulente',
    online: false,
    avatar: 'assets/img/owner-avatar.webp',
    listingTitle: '',
    unreadCount: 0,
    type: 'consultation',
    expiresAt: Date.now() - 3 * 60 * 60 * 1000,
    messages: [
      { id: 1, sender: 'me', text: 'Grazie per la consulenza di ieri.', sentAt: Date.now() - 25 * 60 * 60 * 1000 },
      { id: 2, sender: 'other', text: 'Prego! Se hai altre domande, contattami pure.', sentAt: Date.now() - 24.5 * 60 * 60 * 1000 }
    ]
  }
];