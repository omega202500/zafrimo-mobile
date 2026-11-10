import Component from '../core/Component.js';

// Composant champ de formulaire avec affichage d'erreur
export default class FormField extends Component {
  render() {
    const { id, type = 'text', placeholder, error = '' } = this.props;
    const errorHtml = error ? `<p class="field-error">${error}</p>` : '';
    return `
      <input
        class="field ${error ? 'field-error' : ''}"
        id="${id}"
        type="${type}"
        placeholder="${placeholder}"
        ${error ? 'aria-invalid="true"' : ''}
      >
      ${errorHtml}
    `;
  }
}
