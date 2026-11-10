import Component from '../core/Component.js';

export default class Modal extends Component {
  render() {
    const { title, message, confirmText = 'Conferma', cancelText = 'Annulla', danger = false } = this.props;
    return `
      <div class="modal-backdrop">
        <div class="glass modal-content card">
          ${title ? `<h3 style="margin-bottom: 12px;">${title}</h3>` : ''}
          ${message ? `<p class="muted" style="margin-bottom: 20px;">${message}</p>` : ''}
          <div class="modal-actions">
            <button type="button" class="btn btn-glass" id="modalCancel" style="margin: 0; flex: 1;">${cancelText}</button>
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-lime'}" id="modalConfirm" style="margin: 0; flex: 1;">${confirmText}</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(container) {
    const cancelBtn = container.querySelector('#modalCancel');
    const confirmBtn = container.querySelector('#modalConfirm');
    const backdrop = container.querySelector('.modal-backdrop');

    if (cancelBtn) {
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        if (this.props.onCancel) this.props.onCancel();
      };
    }
    if (confirmBtn) {
      confirmBtn.onclick = (e) => {
        e.stopPropagation();
        if (this.props.onConfirm) this.props.onConfirm();
      };
    }
    if (backdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop && this.props.onCancel) {
          this.props.onCancel();
        }
      };
    }
  }
}
