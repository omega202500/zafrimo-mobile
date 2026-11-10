import Moderation, { REPORT_REASONS } from '../services/ModerationService.js';
import I18n from '../services/I18nService.js';
import { escapeHtml } from '../core/Html.js';

export default class ReportModal {
    // type : 'listing' | 'news' | 'user' | 'conversation'
    static open({ type, targetId }) {
        const t = (key) => I18n.t(key);

        // Déjà signalé : on le dit simplement
        if (Moderation.hasReported(type, targetId)) {
            ReportModal.notice(t('report.' + type), t('report.already'));
            return;
        }

        const host = document.createElement('div');
        host.className = 'modal-backdrop';
        host.innerHTML = `
            <div class="glass modal-content card report-box" role="dialog" aria-modal="true">
                <h3>${escapeHtml(t('report.' + type))}</h3>
                <p class="muted report-label">${escapeHtml(t('report.reasonLabel'))}</p>

                <div class="report-reasons">
                    ${REPORT_REASONS.map(r => `
                        <label class="report-reason">
                            <input type="radio" name="reason" value="${r}">
                            <span>${escapeHtml(t('report.reason.' + r))}</span>
                        </label>
                    `).join('')}
                </div>

                <textarea id="reportDetails" class="field textarea report-details" maxlength="500" placeholder="${escapeHtml(t('report.detailsPlaceholder'))}"></textarea>
                <p class="report-error" id="reportError"></p>

                <div class="modal-actions">
                    <button type="button" class="btn btn-glass" id="reportCancel">${escapeHtml(t('common.cancel'))}</button>
                    <button type="button" class="btn btn-lime" id="reportSend" disabled>${escapeHtml(t('report.send'))}</button>
                </div>
            </div>
        `;

        const close = () => host.remove();
        host.onclick = (e) => {
            if (e.target === host) close();
        };
        document.body.appendChild(host);

        const sendBtn = host.querySelector('#reportSend');
        host.querySelectorAll('input[name="reason"]').forEach(radio => {
            radio.onchange = () => { sendBtn.disabled = false; };
        });
        host.querySelector('#reportCancel').onclick = close;

        sendBtn.onclick = () => {
            const reason = host.querySelector('input[name="reason"]:checked')?.value;
            if (!reason) return;
            const details = host.querySelector('#reportDetails').value;

            try {
                Moderation.report({ type, targetId, reason, details });
            } catch (err) {
                host.querySelector('#reportError').textContent = t('report.error');
                return;
            }

            host.querySelector('.report-box').innerHTML = `
                <div class="report-done">
                    <h3>${escapeHtml(t('report.thanksTitle'))}</h3>
                    <p class="muted" style="margin: 10px 0 20px;">${escapeHtml(t('report.thanksText'))}</p>
                    <button type="button" class="btn btn-lime" id="reportClose" style="margin-bottom: 0;">${escapeHtml(t('report.close'))}</button>
                </div>
            `;
            host.querySelector('#reportClose').onclick = close;
        };
    }

    // Petite fenêtre d'information avec un seul bouton
    static notice(title, text) {
        const t = (key) => I18n.t(key);
        const host = document.createElement('div');
        host.className = 'modal-backdrop';
        host.innerHTML = `
            <div class="glass modal-content card">
                <h3>${escapeHtml(title)}</h3>
                <p class="muted" style="margin: 10px 0 20px;">${escapeHtml(text)}</p>
                <button type="button" class="btn btn-lime" id="noticeClose" style="margin-bottom: 0;">${escapeHtml(t('report.close'))}</button>
            </div>
        `;
        const close = () => host.remove();
        host.onclick = (e) => {
            if (e.target === host) close();
        };
        document.body.appendChild(host);
        host.querySelector('#noticeClose').onclick = close;
    }
}