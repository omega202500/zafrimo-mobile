import App from './core/App.js';
const start = () => new App().init();
if (window.cordova) document.addEventListener('deviceready', start, false);
else document.addEventListener('DOMContentLoaded', start); // test navigateur
