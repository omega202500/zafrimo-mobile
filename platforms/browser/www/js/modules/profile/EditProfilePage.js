import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import ProfileService, { LIMITS } from '../../services/ProfileService.js';
import CameraService from '../../services/CameraService.js';
import { CITIES } from '../../services/ListingService.js';
import { escapeHtml } from '../../core/Html.js';

const DEFAULT_AVATAR = 'assets/img/owner-avatar.webp';

export default class EditProfilePage extends Page {
  static route = '/profile/edit';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.user = null;
    this.photo = '';
  }

  async onEnter() {
    this.user = Auth.user();
    this.photo = (this.user && this.user.photo) || '';
  }

  render() {
    const header = this.header(this.t('editProfile.title'), { back: true });

    if (!this.user) {
      return `<section>${header}<div class="glass card"><p class="muted">${this.t('common.loading')}</p></div></section>`;
    }

    const u = this.user;
    const isOwner = ProfileService.isOwnerProfile(u);

    return `
      <section>
        ${header}

        <div class="glass card">
          <div class="edit-avatar-wrap">
            <img id="avatarPreview" class="edit-avatar" src="${escapeHtml(this.photo || DEFAULT_AVATAR)}" alt="">
          </div>
          <div class="edit-photo-actions">
            <button type="button" class="chip" id="pickGallery">${this.t('editProfile.gallery')}</button>
            <button type="button" class="chip" id="pickCamera">${this.t('editProfile.camera')}</button>
            <button type="button" class="chip" id="removePhoto" ${this.photo ? '' : 'hidden'}>${this.t('editProfile.removePhoto')}</button>
          </div>
          <p class="form-error" id="photoError" style="margin: 10px 0 0; text-align: center;"></p>
        </div>

        <div class="glass card">
          <label class="form-label" for="username">${this.t('register.username')}</label>
          <input id="username" class="field" maxlength="${LIMITS.usernameMax}" value="${escapeHtml(u.username || u.name || '')}" autocomplete="nickname">
          <p class="form-error" id="usernameError"></p>

          <label class="form-label" for="city">${this.t('owner.city')}</label>
          <input id="city" class="field" list="cityList" maxlength="60" value="${escapeHtml(u.city || '')}" autocomplete="address-level2">
          <datalist id="cityList">
            ${CITIES.map(c => `<option value="${escapeHtml(c)}"></option>`).join('')}
          </datalist>
          <p class="form-error" id="cityError"></p>

          ${isOwner ? `
          <label class="form-label" for="specialty">${this.t('editProfile.specialty')}</label>
          <input id="specialty" class="field" maxlength="${LIMITS.specialtyMax}" placeholder="${this.t('editProfile.specialtyPlaceholder')}" value="${escapeHtml(u.specialty || '')}">

          <label class="form-label">${this.t('owner.hours')}</label>
          <div class="hours-row">
            <input id="hoursFrom" class="field" type="time" aria-label="${this.t('editProfile.hoursFrom')}" value="${escapeHtml(u.hoursFrom || '')}">
            <input id="hoursTo" class="field" type="time" aria-label="${this.t('editProfile.hoursTo')}" value="${escapeHtml(u.hoursTo || '')}">
          </div>
          <p class="form-error" id="hoursError"></p>

          <label class="form-label" for="description">${this.t('register.description')}</label>
          <textarea id="description" class="field textarea" maxlength="${LIMITS.descriptionMax}" placeholder="${this.t('register.descriptionPlaceholder')}">${escapeHtml(u.description || '')}</textarea>
          ` : ''}
        </div>

        <p class="form-error" id="formError" style="text-align: center; margin: 0 0 12px;"></p>
        <button class="btn btn-lime" id="saveBtn">${this.t('editProfile.save')}</button>
      </section>
    `;
  }

  bindEvents() {
    if (!this.user) return;

    const preview = this.el.querySelector('#avatarPreview');
    const removeBtn = this.el.querySelector('#removePhoto');
    const photoError = this.el.querySelector('#photoError');

    // Choix de la photo : galerie ou appareil photo, puis réduction à 400 px
    const pick = async (source) => {
      photoError.textContent = '';
      try {
        const raw = await CameraService.pick(source);
        this.photo = await ProfileService.shrinkImage(raw, 400);
        preview.src = this.photo;
        removeBtn.hidden = false;
      } catch (err) {
        if (!err.cancelled) photoError.textContent = this.t('editProfile.errPhoto');
      }
    };

    this.el.querySelector('#pickGallery').onclick = () => pick('gallery');
    this.el.querySelector('#pickCamera').onclick = () => pick('camera');
    removeBtn.onclick = () => {
      this.photo = '';
      preview.src = DEFAULT_AVATAR;
      removeBtn.hidden = true;
    };

    const saveBtn = this.el.querySelector('#saveBtn');
    const value = (id) => (this.el.querySelector('#' + id)?.value || '');

    saveBtn.onclick = async () => {
      // On efface les anciennes erreurs
      this.el.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; });

      const isOwner = ProfileService.isOwnerProfile(this.user);
      const data = {
        username: value('username'),
        city: value('city'),
        photo: this.photo,
        specialty: value('specialty'),
        hoursFrom: value('hoursFrom'),
        hoursTo: value('hoursTo'),
        description: value('description')
      };

      const errors = ProfileService.validate(data, { isOwner });
      const keys = Object.keys(errors);
      if (keys.length > 0) {
        keys.forEach(key => {
          const el = this.el.querySelector('#' + key + 'Error');
          if (el) el.textContent = this.t(errors[key]);
        });
        this.el.querySelector('#' + keys[0] + 'Error')?.scrollIntoView({ block: 'center' });
        return;
      }

      saveBtn.disabled = true;
      saveBtn.classList.add('loading');
      try {
        await ProfileService.update(data);
        this.app.router.go('/profile');
      } catch (err) {
        this.el.querySelector('#formError').textContent = this.t('editProfile.errSave');
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
      }
    };
  }
}