import ListingPublishPage from './ListingPublishPage.js';


// Même page que la publication, mais avec une autre adresse : /listings/:id/edit
export default class ListingEditPage extends ListingPublishPage {
    static route = '/listings/:id/edit';
}
