import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Modal from '../../components/Modal.js';

export default class DeleteAccountPage extends Page {
  static route = '/settings/delete';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.showModal = false;
  }

  render() {
    return `
      <section>
        ${this.header(this.t('deleteAccount.title'), { back: true })}
        <div class="glass card" style="text-align: center; padding: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
          <h2 style="margin-bottom: 8px;">${this.t('deleteAccount.warningTitle')}</h2>
          <p class="muted" style="margin-bottom: 16px;">${this.t('deleteAccount.warningText')}</p>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 12px;">${this.t('deleteAccount.consequencesTitle')}</h3>
          <ul style="padding-left: 20px; line-height: 1.8; color: var(--text-2); font-size: 14px;">
            <li>${this.t('deleteAccount.consequence1')}</li>
            <li>${this.t('deleteAccount.consequence2')}</li>
            <li>${this.t('deleteAccount.consequence3')}</li>
          </ul>
        </div>

        <button class="btn btn-danger" id="openDeleteModal">
          ${this.t('deleteAccount.button')}
        </button>

        <div id="modalContainer"></div>
      </section>
    `;
  }

  bindEvents() {
    const openBtn = this.el.querySelector('#openDeleteModal');
    const modalContainer = this.el.querySelector('#modalContainer');

    if (openBtn && modalContainer) {
      openBtn.onclick = () => {
        const modal = new Modal({
          title: this.t('deleteAccount.modalTitle'),
          message: this.t('deleteAccount.modalMessage'),
          confirmText: this.t('deleteAccount.modalConfirm'),
          cancelText: this.t('deleteAccount.modalCancel'),
          danger: true,
          onCancel: () => {
            modalContainer.innerHTML = '';
          },
          onConfirm: async () => {
            modalContainer.innerHTML = '';
            await Auth.deleteAccount();
            this.app.router.go('/welcome');
          }
        });

        modal.mount(modalContainer);
      };
    }
  }
}
