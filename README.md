# ZAFrimo (frontend Cordova)

## Développeur front-end : Ghomsi Franck Loic

## Installation

```sh
npm install
npm install -g cordova
cordova platform add browser android
```

## Lancement navigateur

```sh
cordova run browser
```

## Lancement Android

```sh
cordova run android
```

## Vérification i18n et tests

```sh
npm run check:i18n
npm run check
```

## Fichiers mock à remplacer par l'API Laravel

- `www/js/mocks/listings.js` et `www/js/services/ListingService.js` : annonces.
- `www/js/mocks/messages.js` et `www/js/services/ConversationService.js` : conversations et messages.
- `www/js/mocks/news.js` et `www/js/services/NewsService.js` : actualités.
- `www/js/mocks/settings.js` : paramétres administrateur.
- `www/js/services/AuthService.js` : authentification et compte.
- `www/js/services/ApiService.js` : renseigner l'URL réelle de l'API.
