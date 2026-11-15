import Modal from './Modal.js';

export default class Dialog {
    // Affiche une confirmation. Renvoie une promesse : true (confirmé) ou false (annulé).
    // title et message sont insérés tels quels : échappe les données avec escapeHtml avant.
    static confirm({ title, message, confirmText, cancelText, danger = false }) {
        return new Promise(resolve => {
            const host = document.createElement('div');
            document.body.appendChild(host);

            const close = (value) => {
                host.remove();
                resolve(value);
            };

            new Modal({
                title,
                message,
                confirmText,
                cancelText,
                danger,
                onConfirm: () => close(true),
                onCancel: () => close(false)
            }).mount(host);
        });
    }
}