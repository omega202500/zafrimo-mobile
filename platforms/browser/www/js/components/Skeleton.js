// Squelette affiché quand le chargement d'une page prend plus de 250 ms
export default class Skeleton {
    static render(count = 3) {
        return `
            <section class="skeleton-page" aria-busy="true">
                <div class="skeleton skeleton-title"></div>
                ${Array.from({ length: count }, () => '<div class="skeleton skeleton-card"></div>').join('')}
            </section>
        `;
    }
}