import I18n from './I18nService.js';
import settings from '../mocks/settings.js';

// Structure de la FAQ : groupes et numéros de questions (textes dans les fichiers de traduction)
const FAQ_STRUCTURE = [
    { group: 'account', items: [1, 2] },
    { group: 'listings', items: [3, 4] },
    { group: 'messages', items: [5, 6] },
    { group: 'consulting', items: [7, 8] }
];

// Contenus d'information modifiables par l'administrateur (cahier section 11 : pages d'information, FAQ...)
// TODO API : GET /content/faq · GET /content/legal-notice · GET /content/about (dans la langue demandée)
class ContentService {
    // Remplace {stars}, {consultantStars} et {hours} par les valeurs fixées par l'administrateur
    fill(text) {
        const values = {
            stars: settings.publishStars,
            consultantStars: settings.consultantStars,
            hours: settings.consultationDurationHours
        };
        return text.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
    }

    // [{ title, items: [{ q, a }] }]
    faq() {
        return FAQ_STRUCTURE.map(g => ({
            title: I18n.t('faq.group.' + g.group),
            items: g.items.map(n => ({
                q: I18n.t('faq.q' + n),
                a: this.fill(I18n.t('faq.a' + n))
            }))
        }));
    }

    legalInfo() {
        return settings.legal;
    }

    appInfo() {
        return { name: 'ZAFrimo', version: settings.appVersion };
    }
}

export default new ContentService();