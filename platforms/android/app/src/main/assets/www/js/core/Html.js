// Protège le texte saisi par les utilisateurs avant de l'afficher dans la page.
export function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Transforme un texte brut (avec lignes vides) en paragraphes <p> sûrs.
export function textToHtml(text = '') {
    return text
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
}