import NewsPublishPage from './NewsPublishPage.js';

// Même page que la publication, mais avec une autre adresse : /news/:id/edit
export default class NewsEditPage extends NewsPublishPage {
    static route = '/news/:id/edit';
}