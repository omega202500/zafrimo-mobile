import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Permission from '../../services/PermissionService.js';
import ListingService, { KINDS, PROPERTY_TYPES, PERIODS, CITIES, MAX_PHOTOS } from '../../services/ListingService.js';
import CameraService from '../../services/CameraService.js';
import Validator from '../../core/Validator.js';
import LockedState from '../../components/LockedState.js';
import { escapeHtml } from '../../core/Html.js';
import { setFieldError } from '../../core/FormUtils.js';

export default class ListingPublishPage extends Page {
  static route = '/listings/new';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.listing = null;
    this.photos = [];
    this.kind = '';
    this.locked = false;
    this.redirected = false;
  }

  get isEdit() {
    return !!this.params.id;
  }

  async onEnter() {
    const user = Auth.user();

    if (this.isEdit) {
      this.listing = ListingService.getById(this.params.id);
      if (!this.listing || !ListingService.isAuthor(this.listing, user)) {
        this.redirected = true;
        this.app.router.go('/listings');
        return;
      }
      this.photos = this.listing.photos || [];
      this.kind = this.listing.kind || '';
    }

    this.locked = !this.isEdit && !Permission.check(user, 'publish').allowed;
  }

  render() {
    if (this.redirected) return '';

    const title = this.t(this.isEdit ? 'listings.editTitle' : 'listings.publishTitle');

    if (this.locked) {
      const check = Permission.check(Auth.user(), 'publish');
      return `
        <section>
          ${this.header(title, { back: true })}
          ${new LockedState({
        title: this.t('stars.lockedTitle'),
        text: this.t('stars.lockedText').replace('{n}', check.required).replace('{have}', check.stars),
        required: check.required,
        stars: check.stars,
        progressLabel: this.t('stars.progress').replace('{have}', check.stars).replace('{n}', check.required),
        buttonLabel: this.t('stars.seeMine')
      }).render()}
        </section>`;
    }

    const l = this.listing || {};

    return `
      <section>
        ${this.header(title, { back: true })}

        <form id="publishForm">
          <div class="glass card">
            <h3 style="margin-bottom: 14px;">${this.t('listings.photos')}</h3>
            <div class="photo-preview" id="photoPreview" style="height: 160px; border-radius: 16px; background: var(--glass); display: grid; place-items: center; margin-bottom: 12px; border: 2px dashed var(--text-2);">
              <span style="font-size: 32px;">📷</span>
            </div>
            <p class="field-error" id="photoError" style="display: none;"></p>
            <div class="row">
              <button type="button" class="chip" id="pickGallery">${this.t('listings.gallery')}</button>
              <button type="button" class="chip" id="pickCamera">${this.t('listings.camera')}</button>
            </div>
            <div class="photo-thumbnails" id="photoThumbnails"></div>
            <p class="muted" style="font-size: 12px; margin-top: 8px;">${this.photos.length} / ${MAX_PHOTOS}</p>
          </div>

          <div class="glass card">
            <h3 style="margin-bottom: 14px;">${this.t('listings.details')}</h3>

            <label class="field-label">${this.t('listings.kind')}</label>
            <div class="chips" style="margin-bottom: 12px;">
              ${KINDS.map(k => `
                <button type="button" class="chip ${this.kind === k ? 'on' : ''}" data-kind="${k}">${this.t('kind.' + k)}</button>
              `).join('')}
            </div>

            <label class="field-label">${this.t('listings.title')} *</label>
            <input id="title" class="field" maxlength="120" placeholder="${this.t('listings.titlePlaceholder')}" value="${escapeHtml(l.title || '')}">

            <label class="field-label">${this.t('listings.propertyType')} *</label>
            <select id="propertyType" class="field">
              <option value="">${this.t('listings.selectPropertyType')}</option>
              ${PROPERTY_TYPES.map(pt => `
                <option value="${pt}" ${l.propertyType === pt ? 'selected' : ''}>${this.t('ptype.' + pt)}</option>
              `).join('')}
            </select>

            <label class="field-label">${this.t('listings.description')} *</label>
            <textarea id="description" class="field textarea" rows="5" placeholder="${this.t('listings.descriptionPlaceholder')}">${escapeHtml(l.description || '')}</textarea>

            <div id="periodBlock" class="period-block ${this.kind === 'seasonal' ? 'visible' : ''}">
              <label class="field-label">${this.t('listings.period')} *</label>
              <div class="chips">
                ${PERIODS.map(p => `
                  <button type="button" class="chip ${l.period === p ? 'on' : ''}" data-period="${p}">${this.t('period.' + p)}</button>
                `).join('')}
              </div>
            </div>

            <label class="field-label">${this.t('listings.price')} (€) *</label>
            <input id="price" class="field" type="number" placeholder="0" value="${l.price || ''}">

            <label class="field-label">${this.t('listings.city')} *</label>
            <input id="city" class="field" list="cityList" placeholder="${this.t('listings.cityPlaceholder')}" value="${escapeHtml(l.city || '')}">
            <datalist id="cityList">
              ${CITIES.map(c => `<option value="${c}">`).join('')}
            </datalist>

            <label class="field-label">${this.t('listings.address')}</label>
            <input id="address" class="field" placeholder="${this.t('listings.addressPlaceholder')}" value="${escapeHtml(l.address || '')}">

            <div class="row" style="gap: 8px;">
              <div style="flex: 1;">
                <label class="field-label">${this.t('listings.beds')}</label>
                <input id="beds" class="field" type="number" placeholder="0" value="${l.beds || 0}">
              </div>
              <div style="flex: 1;">
                <label class="field-label">${this.t('listings.baths')}</label>
                <input id="baths" class="field" type="number" placeholder="0" value="${l.baths || 0}">
              </div>
              <div style="flex: 1;">
                <label class="field-label">${this.t('listings.parking')}</label>
                <input id="parking" class="field" type="number" placeholder="0" value="${l.parking || 0}">
              </div>
            </div>

            <label class="field-label">${this.t('listings.area')} (m²) *</label>
            <input id="area" class="field" type="number" placeholder="0" value="${l.area || ''}">
          </div>

          <button type="submit" class="btn btn-lime" id="submitBtn">
            ${this.t(this.isEdit ? 'listings.saveBtn' : 'listings.publishBtn')}
          </button>
        </form>
      </section>
    `;
  }

  bindEvents() {
    if (this.locked || this.redirected) return;

    this.updatePhotoPreview();
    this.updateThumbnails();

    // Kind chips
    this.el.querySelectorAll('.chip[data-kind]').forEach(btn => {
      btn.onclick = () => {
        this.kind = btn.dataset.kind;
        this.el.querySelectorAll('.chip[data-kind]').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');

        const periodBlock = this.el.querySelector('#periodBlock');
        if (this.kind === 'seasonal') {
          periodBlock.classList.add('visible');
        } else {
          periodBlock.classList.remove('visible');
        }
      };
    });

    // Period chips
    this.el.querySelectorAll('.chip[data-period]').forEach(btn => {
      btn.onclick = () => {
        this.el.querySelectorAll('.chip[data-period]').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
      };
    });

    // Photo gallery
    this.el.querySelector('#pickGallery').onclick = () => this.addPhoto('gallery');
    this.el.querySelector('#pickCamera').onclick = () => this.addPhoto('camera');

    // Form submit
    this.el.querySelector('#publishForm').onsubmit = async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    };
  }

  async addPhoto(source) {
    if (this.photos.length >= MAX_PHOTOS) {
      setFieldError(this.el, 'photo', this.t('listings.maxPhotos').replace('{n}', MAX_PHOTOS));
      return;
    }

    try {
      const photo = await CameraService.pick(source);
      this.photos.push(photo);
      this.updatePhotoPreview();
      this.updateThumbnails();
      setFieldError(this.el, 'photo', '');
    } catch (err) {
      if (!err.cancelled) {
        setFieldError(this.el, 'photo', this.t('listings.photoError'));
      }
    }
  }

  removePhoto(index) {
    this.photos.splice(index, 1);
    this.updatePhotoPreview();
    this.updateThumbnails();
  }

  setCoverPhoto(index) {
    const photo = this.photos.splice(index, 1)[0];
    this.photos.unshift(photo);
    this.updateThumbnails();
  }

  updatePhotoPreview() {
    const preview = this.el.querySelector('#photoPreview');
    if (this.photos.length > 0) {
      preview.style.backgroundImage = `url('${this.photos[0]}')`;
      preview.style.borderStyle = 'solid';
      preview.style.borderColor = 'var(--lime)';
      preview.innerHTML = '';
    } else {
      preview.style.backgroundImage = '';
      preview.style.borderStyle = 'dashed';
      preview.style.borderColor = 'var(--text-2)';
      preview.innerHTML = '<span style="font-size: 32px;">📷</span>';
    }
  }

  updateThumbnails() {
    const container = this.el.querySelector('#photoThumbnails');
    container.innerHTML = this.photos.map((p, i) => `
      <div class="photo-thumbnail ${i === 0 ? 'cover' : ''}" data-index="${i}" style="background-image: url('${p}');">
        <span class="photo-thumbnail-remove" data-remove="${i}">✕</span>
      </div>
    `).join('');

    const firstThumbnail = container.querySelector('.photo-thumbnail');
    if (firstThumbnail) {
      firstThumbnail.onclick = () => {
        if (this.photos.length > 1) {
          this.setCoverPhoto(0);
        }
      };
    }

    container.querySelectorAll('.photo-thumbnail-remove').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.removePhoto(parseInt(btn.dataset.remove));
      };
    });

    const countEl = this.el.querySelector('.photo-thumbnails').nextElementSibling;
    if (countEl) {
      countEl.textContent = `${this.photos.length} / ${MAX_PHOTOS}`;
    }
  }

  async handleSubmit() {
    const title = this.el.querySelector('#title').value.trim();
    const propertyType = this.el.querySelector('#propertyType').value;
    const description = this.el.querySelector('#description').value.trim();
    const period = this.el.querySelector('.chip[data-period].on')?.dataset.period || '';
    const price = parseFloat(this.el.querySelector('#price').value) || 0;
    const city = this.el.querySelector('#city').value.trim();
    const address = this.el.querySelector('#address').value.trim();
    const beds = parseInt(this.el.querySelector('#beds').value) || 0;
    const baths = parseInt(this.el.querySelector('#baths').value) || 0;
    const parking = parseInt(this.el.querySelector('#parking').value) || 0;
    const area = parseInt(this.el.querySelector('#area').value) || 0;

    let hasError = false;

    if (!Validator.minLength(title, 5)) {
      setFieldError(this.el, 'title', this.t('listings.errTitle'));
      hasError = true;
    } else {
      setFieldError(this.el, 'title', '');
    }

    if (!propertyType) {
      setFieldError(this.el, 'propertyType', this.t('listings.errPropertyType'));
      hasError = true;
    } else {
      setFieldError(this.el, 'propertyType', '');
    }

    if (!Validator.minLength(description, 30)) {
      setFieldError(this.el, 'description', this.t('listings.errDescription'));
      hasError = true;
    } else {
      setFieldError(this.el, 'description', '');
    }

    if (this.kind === 'seasonal' && !period) {
      setFieldError(this.el, 'period', this.t('listings.errPeriod'));
      hasError = true;
    } else {
      setFieldError(this.el, 'period', '');
    }

    if (price <= 0) {
      setFieldError(this.el, 'price', this.t('listings.errPrice'));
      hasError = true;
    } else {
      setFieldError(this.el, 'price', '');
    }

    if (!city) {
      setFieldError(this.el, 'city', this.t('listings.errCity'));
      hasError = true;
    } else {
      setFieldError(this.el, 'city', '');
    }

    if (area <= 0) {
      setFieldError(this.el, 'area', this.t('listings.errArea'));
      hasError = true;
    } else {
      setFieldError(this.el, 'area', '');
    }

    if (this.photos.length === 0) {
      setFieldError(this.el, 'photo', this.t('listings.errPhoto'));
      hasError = true;
    } else {
      setFieldError(this.el, 'photo', '');
    }

    if (hasError) return;

    const data = {
      kind: this.kind,
      propertyType,
      title,
      description,
      period: this.kind === 'seasonal' ? period : '',
      price,
      city,
      address,
      beds,
      baths,
      parking,
      area,
      photos: this.photos
    };

    try {
      const user = Auth.user();
      let listing;
      if (this.isEdit) {
        listing = ListingService.update(this.listing.id, data);
      } else {
        listing = ListingService.create(user, data);
      }
      this.app.router.go('/listings/' + listing.id);
    } catch (err) {
      const submitBtn = this.el.querySelector('#submitBtn');
      if (submitBtn) {
        submitBtn.textContent = this.t('listings.errSave');
        submitBtn.disabled = true;
        setTimeout(() => {
          submitBtn.textContent = this.t(this.isEdit ? 'listings.saveBtn' : 'listings.publishBtn');
          submitBtn.disabled = false;
        }, 3000);
      }
    }
  }
}
