// Paramètres fixés par l'administrateur (cahier des charges, sections 9, 10 et 11).
// TODO API : remplacer par GET /settings
export default {
    publishStars: 1,              // étoiles minimales pour publier annonces et actualités
    consultantStars: 3,           // étoiles minimales pour pouvoir être consultant payant
    starsMax: 5,                  // maximum d'étoiles affichées
    accountMinDays: 7,            // ancienneté minimale du compte pour demander une étoile
    consultationDurationHours: 24, // provisoire, à fixer par l'administrateur, voir cahier section 20
    preModeration: false,         // true => les nouvelles annonces attendent la validation de l'administrateur (cahier section 11)
    supportEmail: 'support@zafrimo.example', // à remplacer par le contact officiel (cahier section 20)

    // --- Application et mentions légales (cahier sections 11, 14 et 20) ---
    appVersion: '0.1.0',          // à garder identique à la version de config.xml
    legal: {                      // coordonnées officielles du titulaire : à fournir par le propriétaire de l'app
        companyName: '[Ragione sociale da completare]',
        address: '[Indirizzo da completare]',
        vatNumber: '[P. IVA da completare]',
        email: 'support@zafrimo.example'
    },

    // --- Consulting payant (cahier section 10) ---
    commissionRate: 0.15,         // taux de commission de la plateforme, provisoire (cahier 10.4)
    minConsultationPrice: 10,     // fourchette de tarifs en euros, provisoire (cahier section 20)
    maxConsultationPrice: 500,
    defaultConsultationPrice: 60, // tarif affiché si un consultant n'en a pas encore fixé
    mobileMoneyEnabled: false,    // Mobile Money (Fapshi) : option, selon l'origine des payeurs (cahier 10.2)

    // --- TEST uniquement (à supprimer au branchement de l'API) ---
    mockPaymentOutcome: 'paid',   // résultat simulé du paiement : 'paid' | 'failed' | 'cancelled' | 'pending'
    mockWebhookDelayMs: 3000,     // délai simulé avant la confirmation du serveur
    devConsultantSeesAll: true,   // un consultant connecté voit tous les paiements (les données de test n'ont pas d'identifiants cohérents)
    devRolesByEmail: true,        // un e-mail contenant "consult" ou "owner" donne ce rôle (le vrai rôle consultant vient de l'administrateur)
    mockNotifications: true       // crée quelques notifications d'exemple à la première connexion
};