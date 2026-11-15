// Outils partagés pour les formulaires (Login, Register, etc.)

/**
 * Affiche (ou efface) le message d'erreur sous un champ, sans redessiner la page.
 * root    : l'élément qui contient le formulaire (this.el dans une page)
 * id      : l'id du champ (ex: 'email')
 * message : le texte d'erreur, ou '' pour effacer
 */
export function setFieldError(root, id, message = '') {
    const input = root.querySelector('#' + id);
    if (!input) return;

    // Où placer le message : après le conteneur du mot de passe, après la case à cocher, ou après le champ
    const holder = input.closest('.password-field') || input.closest('.checkbox') || input;

    let p = root.querySelector(`[data-error-for="${id}"]`);
    if (!p) {
        if (!message) return; // rien à effacer
        p = document.createElement('p');
        p.className = 'field-error';
        p.dataset.errorFor = id;
        holder.insertAdjacentElement('afterend', p);
    }

    p.textContent = message;
    p.style.display = message ? '' : 'none';
    input.classList.toggle('field-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
}