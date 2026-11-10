import Component from '../core/Component.js';

// Composant champ de mot de passe avec bouton œil pour afficher/masquer
export default class PasswordField extends Component {
  render() {
    const { id, placeholder, error = '' } = this.props;
    const errorHtml = error ? `<p class="field-error">${error}</p>` : '';
    return `
      <div class="password-field">
        <input
          class="field ${error ? 'field-error' : ''}"
          id="${id}"
          type="password"
          placeholder="${placeholder}"
          ${error ? 'aria-invalid="true"' : ''}
        >
        <button class="password-toggle" type="button" aria-label="Mostra password">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
      ${errorHtml}
    `;
  }

  bindEvents(container) {
    const input = container.querySelector('input');
    const toggle = container.querySelector('.password-toggle');

    toggle.onclick = () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.setAttribute('aria-label', isPassword ? 'Nascondi password' : 'Mostra password');
    };
  }
}
