// Choix d'une photo : caméra (Cordova) ou galerie / sélecteur de fichier.
// Retourne toujours une image sous forme de texte "data:image/jpeg;base64,..."
const cancelledError = () => Object.assign(new Error('cancelled'), { cancelled: true });

class CameraService {
    // source : 'gallery' ou 'camera'
    async pick(source = 'gallery', options = {}) {
        // Caméra : plugin Cordova si disponible. Galerie : toujours le sélecteur du système
        // (aucune permission à demander, fonctionne sur tous les Android).
        if (source === 'camera' && window.cordova && navigator.camera && window.Camera) {
            return this.fromCordovaCamera();
        }
        return this.fromFileInput(source === 'camera', options);
    }

    fromCordovaCamera() {
        return new Promise((resolve, reject) => {
            navigator.camera.getPicture(
                (data) => resolve('data:image/jpeg;base64,' + data),
                (err) => {
                    const cancelled = /cancel|no image|no camera|selection/i.test(String(err));
                    reject(Object.assign(new Error(String(err)), { cancelled }));
                },
                {
                    quality: 70,
                    destinationType: Camera.DestinationType.DATA_URL,
                    sourceType: Camera.PictureSourceType.CAMERA,
                    encodingType: Camera.EncodingType.JPEG,
                    targetWidth: 1280,
                    targetHeight: 1280,
                    correctOrientation: true
                }
            );
        });
    }

    fromFileInput(useCamera, options = {}) {
        return new Promise((resolve, reject) => {
            // On nettoie d'éventuels anciens sélecteurs restés dans la page
            document.querySelectorAll('input[data-picker]').forEach(i => i.remove());

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = options.listing ? 'image/jpeg,image/png,image/webp' : 'image/*';
            input.dataset.picker = '1';
            if (useCamera) input.capture = 'environment';
            // IMPORTANT : l'élément doit être DANS la page. Sinon Android peut le supprimer
            // pendant que la galerie est ouverte, et l'événement "change" n'arrive jamais.
            input.style.cssText = 'position: fixed; left: -9999px; top: 0; opacity: 0;';
            document.body.appendChild(input);

            input.addEventListener('change', () => {
                const file = input.files && input.files[0];
                input.remove();
                if (!file) return reject(cancelledError());
                // Certaines galeries donnent un type vide : on ne refuse que les types clairement non image
                if (options.listing && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('photo-type'));
                if (!options.listing && file.type && !file.type.startsWith('image/')) return reject(new Error('not-an-image'));
                if (options.maxSizeBytes && file.size > options.maxSizeBytes) return reject(new Error('photo-size'));
                this.resize(file).then(resolve, reject);
            });
            input.addEventListener('cancel', () => { input.remove(); reject(cancelledError()); });

            input.click();
        });
    }

    // Réduit l'image (max 1280 px). Pas d'adresse "blob:" (bloquée par la politique de sécurité).
    async resize(file, max = 1280) {
        let source = null;

        // Méthode 1 : décodage direct du fichier (rapide, économe en mémoire)
        if (window.createImageBitmap) {
            try { source = await createImageBitmap(file); } catch (e) { source = null; }
        }

        // Méthode 2 : lecture en "data:" puis décodage avec une balise image
        if (!source) {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('read-failed'));
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            source = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('unsupported-format'));
                img.src = dataUrl;
            });
        }

        const ratio = Math.min(1, max / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(source.width * ratio);
        canvas.height = Math.round(source.height * ratio);
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
        if (source.close) source.close();
        return canvas.toDataURL('image/jpeg', 0.75);
    }
}

export default new CameraService();