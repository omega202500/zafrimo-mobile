import Component from '../core/Component.js';

// Écran affiché à la place d'une page quand les étoiles ne suffisent pas.
// props : { title, text, required, stars, progressLabel, buttonLabel }
export default class LockedState extends Component {
    render() {
        const { title, text, required = 0, stars = 0, progressLabel = '', buttonLabel = '' } = this.props;
        const percent = required ? Math.min(100, Math.round((stars / required) * 100)) : 0;

        return `
      <div class="glass card locked-state">
        <div class="lock-icon">🔒</div>
        <h3>${title}</h3>
        <p class="muted" style="margin-top: 8px;">${text}</p>
        <div class="progress"><span style="width: ${percent}%;"></span></div>
        <p class="muted">${progressLabel}</p>
        <button class="btn btn-lime" style="margin-top: 16px;" data-go="/my-stars">${buttonLabel}</button>
      </div>
    `;
    }
}