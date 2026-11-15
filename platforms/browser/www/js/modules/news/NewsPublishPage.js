import Page from '../../core/Page.js';
import Auth from '../../services/AuthService.js';
import Permission from '../../services/PermissionService.js';
import NewsService, { NEWS_CATEGORIES } from '../../services/NewsService.js';
import CameraService from '../../services/CameraService.js';
import Validator from '../../core/Validator.js';
import LockedState from '../../components/LockedState.js';
import { escapeHtml } from '../../core/Html.js';
import { setFieldError } from '../../core/FormUtils.js';

export default class NewsPublishPage extends Page {
  static route = '/news/new';
  static access = 'auth';
  static tabs = false;

  constructor(app, params = {}) {
    super(app, params);
    this.article = null;
    this.photo = '';
    this.locked = false;
    this.redirected = false;
  }

  // Mode modification si l'adresse contient un identifiant
  get isEdit() {
    return !!this.params.id;
  }

  async onEnter() {
    const user = Auth.user();

    if (this.isEdit) {
      this.article = NewsService.getById(this.params.id);
      // Seul l'auteur peut modifier : sinon retour à la liste
      if (!this.article || !NewsService.isAuthor(this.article, user)) {
        this.redirected = true;
        this.app.router.go('/news');
        return;
      }
      this.photo = this.article.photo || '';
    }

    // Le contrôle d'étoiles ne s'applique qu'à une nouvelle publication
    this.locked = !this.isEdit && !Permission.check(user, 'publish').allowed;
  }

  render() {
    if (this.redirected) return '';

    const title = this.t(this.isEdit ? 'news.editTitle' : 'news.publishTitle');

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

    const a = this.article || {};

    return `
      <section>
        ${this.header(title, { back: true })}

        <div class="glass card">
          <input class="field" id="title" maxlength="120" placeholder="${this.t('news.fieldTitle')}" value="${escapeHtml(a.title || '')}">

          <select class="field" id="category">
            <option value="">${this.t('news.fieldCategory')}</option>
            ${NEWS_CATEGORIES.map(c => `<option value="${c}" ${a.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>

          <textarea class="field textarea" id="text" rows="8" placeholder="${this.t('news.fieldText')}">${escapeHtml(a.text || '')}</textarea>
        </div>

        <div class="glass card">
          <h3 style="margin-bottom: 12px;">${this.t('news.photo')}</h3>
          <div class="photo-preview" id="photoPreview"><span>📷</span><img id="photoImg" alt="" style="display: none;"></div>
          <p class="field-error" id="photoError" style="display: none;"></p>
          <div class="row">
            <button type="button" class="chip" id="pickGallery">${this.t('news.gallery')}</button>
            <button type="button" class="chip" id="pickCamera">${this.t('news.camera')}</button>
            <button type="button" class="chip" id="removePhoto">${this.t('news.removePhoto')}</button>
          </div>
        </div>

        <button class="btn btn-lime" id="submit">
          ${this.t(this.isEdit ? 'news.submitSave' : 'news.submitPublish')}
        </button>
      </section>
    `;
  }

  bindEvents() {
    if (this.redirected || this.locked) return;

    const root = this.el;
    const preview = root.querySelector('#photoPreview');
    const removeBtn = root.querySelector('#removePhoto');
    const submit = root.querySelector('#submit');
    const img = root.querySelector('#photoImg');
    const photoError = root.querySelector('#photoError');

    // Met à jour l'aperçu de la photo sans redessiner la page (vraie balise <img>)
    const showPhoto = () => {
      preview.classList.toggle('has-photo', !!this.photo);
      img.style.display = this.photo ? 'block' : 'none';
      if (this.photo) img.src = this.photo; else img.removeAttribute('src');
      removeBtn.style.display = this.photo ? '' : 'none';
    };
    showPhoto();

    // Si l'image ne peut pas être lue (format non pris en charge), on le dit clairement
    img.onerror = () => {
      this.photo = '';
      showPhoto();
      photoError.textContent = this.t('news.errImage');
      photoError.style.display = '';
    };

    const pick = async (source) => {
      photoError.style.display = 'none';
      try {
        this.photo = await CameraService.pick(source);
        showPhoto();
      } catch (e) {
        console.error('Photo :', e);
        if (!e.cancelled) {
          // Le code technique entre crochets aide à comprendre un problème (à retirer plus tard)
          photoError.textContent = this.t('news.errImage') + ' [' + (e.message || e) + ']';
          photoError.style.display = '';
        }
      }
    };

    root.querySelector('#pickGallery').onclick = () => pick('gallery');
    root.querySelector('#pickCamera').onclick = () => pick('camera');
    removeBtn.onclick = () => { this.photo = ''; showPhoto(); };

    // Les erreurs disparaissent quand on corrige le champ
    ['title', 'text'].forEach(id => {
      root.querySelector('#' + id).addEventListener('input', () => setFieldError(root, id, ''));
    });
    root.querySelector('#category').addEventListener('change', () => setFieldError(root, 'category', ''));

    submit.onclick = async () => {
      if (submit.disabled) return;

      const value = (id) => root.querySelector('#' + id).value.trim();
      const errors = {};
      if (!Validator.required(value('title'))) errors.title = this.t('news.errTitle');
      if (!Validator.required(value('category'))) errors.category = this.t('news.errCategory');
      if (value('text').length < 40) errors.text = this.t('news.errText');

      ['title', 'category', 'text'].forEach(id => setFieldError(root, id, errors[id] || ''));

      if (Object.keys(errors).length > 0) {
        const first = root.querySelector('[aria-invalid="true"]');
        if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus(); }
        return;
      }

      submit.classList.add('loading');
      submit.disabled = true;

      const data = { title: value('title'), category: value('category'), text: value('text'), photo: this.photo };

      try {
        const item = this.isEdit
          ? NewsService.update(this.article.id, data)
          : NewsService.create(Auth.user(), data);
        this.app.router.go('/news/' + item.id);
      } catch (e) {
        setFieldError(root, 'text', this.t('news.errSave'));
        submit.classList.remove('loading');
        submit.disabled = false;
      }
    };
  }
}