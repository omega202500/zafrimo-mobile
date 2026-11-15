import mockNews from '../mocks/news.js';
import Storage from './StorageService.js';
import { textToHtml } from '../core/Html.js';
import Moderation from './ModerationService.js';

const KEY = 'news_custom';
export const NEWS_CATEGORIES = ['Mercato', 'Fisco & Agevolazioni', 'Mutui', 'Investimenti'];

// TODO API : chaque méthode correspondra à une route Laravel (GET/POST/PUT/DELETE /news)
class NewsService {
    custom() {
        return Storage.get(KEY) || [];
    }

    // Les actualités des membres d'abord (les plus récentes en premier), puis les exemples
       // Les actualités des membres d'abord, puis les exemples (sans les auteurs bloqués)
    getAll() {
        return [...this.custom(), ...mockNews].filter(n =>
            !n.authorEmail || !Moderation.isBlocked('u-' + n.authorEmail)
        );
    }

    getById(id) {
        return this.getAll().find(n => String(n.id) === String(id)) || null;
    }

    // Seul l'auteur peut modifier ou supprimer sa publication
    isAuthor(item, user) {
        return !!(item && user && item.authorEmail && item.authorEmail === user.email);
    }

    build(data) {
        const words = data.text.split(/\s+/).length;
        return {
            title: data.title,
            category: data.category,
            text: data.text,                       // texte brut (pour la modification)
            content: textToHtml(data.text),        // version protégée pour l'affichage
            excerpt: data.text.length > 140 ? data.text.slice(0, 140).trim() + '…' : data.text,
            photo: data.photo || '',
            readTime: Math.max(1, Math.round(words / 200)) + ' min'
        };
    }

    create(user, data) {
        const item = {
            id: 'u' + Date.now(),
            ...this.build(data),
            date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
            author: user.name || user.username || 'Utente',
            authorEmail: user.email,
            authorStars: user.stars || 0
        };
        Storage.set(KEY, [item, ...this.custom()]); // peut échouer si le stockage est plein
        return item;
    }

    update(id, data) {
        const list = this.custom();
        const index = list.findIndex(n => String(n.id) === String(id));
        if (index === -1) throw new Error('not-found');
        list[index] = { ...list[index], ...this.build(data) };
        Storage.set(KEY, list);
        return list[index];
    }

    remove(id) {
        Storage.set(KEY, this.custom().filter(n => String(n.id) !== String(id)));
    }
}

export default new NewsService();