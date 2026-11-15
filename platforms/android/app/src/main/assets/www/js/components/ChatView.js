import ConversationService from '../services/ConversationService.js';
import Moderation from '../services/ModerationService.js';
import ActionSheet from './ActionSheet.js';
import Dialog from './Dialog.js';
import ReportModal from './ReportModal.js';
import { escapeHtml } from '../core/Html.js';

const MORE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="5" cy="12" r="2"></circle>
  <circle cx="12" cy="12" r="2"></circle>
  <circle cx="19" cy="12" r="2"></circle>
</svg>`;

export default class ChatView {
    constructor(props) {
        this.props = props;
        this.conv = props.conv;
        this.isExpired = props.isExpired || false;
        this.isBlocked = props.isBlocked || false;
        this.t = props.t || ((key) => key);
    }

    // En-tête commun aux deux types de chat (nom, statut en ligne, menu)
    static header(conv, t) {
        const o = conv.other || {};
        const online = !!o.online;
        return `
            <div class="topbar">
                <button class="round" type="button" data-back>‹</button>
                <div class="chat-title">
                    <strong>${escapeHtml(o.name || '')}</strong>
                    <div class="chat-status ${online ? 'on' : ''}">
                        ${online ? '● ' + t('owner.online') : '○ ' + t('owner.offline')}
                    </div>
                </div>
                <button class="round" type="button" data-menu aria-label="${escapeHtml(t('chat.menu'))}">${MORE_ICON}</button>
            </div>
        `;
    }

    // Branche le menu "⋯" et le bouton "Débloquer".
    // onChanged : appelé après un blocage/déblocage (la page se redessine).
    static bindModeration(root, conv, { t, goTo, onChanged }) {
        const other = conv.other || {};

        const menuBtn = root.querySelector('[data-menu]');
        if (menuBtn) {
            menuBtn.onclick = () => {
                const blocked = Moderation.isBlocked(other.id);

                const blockItem = blocked
                    ? {
                        label: t('block.unblock'),
                        onClick: () => {
                            Moderation.unblock(other.id);
                            onChanged();
                        }
                    }
                    : {
                        label: t('block.action'),
                        danger: true,
                        onClick: async () => {
                            const ok = await Dialog.confirm({
                                title: t('block.confirmTitle').replace('{name}', escapeHtml(other.name || '')),
                                message: t('block.confirmText'),
                                confirmText: t('block.confirm'),
                                cancelText: t('common.cancel'),
                                danger: true
                            });
                            if (ok) {
                                Moderation.block(other);
                                onChanged();
                            }
                        }
                    };

                ActionSheet.open({
                    cancelText: t('common.cancel'),
                    items: [
                        {
                            label: t('chat.viewProfile'),
                            onClick: () => goTo('/owner/' + encodeURIComponent(String(other.id || '')))
                        },
                        blockItem,
                        {
                            label: t('report.conversation'),
                            danger: true,
                            onClick: () => ReportModal.open({ type: 'conversation', targetId: conv.id })
                        }
                    ]
                });
            };
        }

        const unblockBtn = root.querySelector('#unblockBtn');
        if (unblockBtn) {
            unblockBtn.onclick = () => {
                Moderation.unblock(other.id);
                onChanged();
            };
        }
    }

    render() {
        return `
            <div class="chat-container">
                ${this.renderMessages()}
                ${this.renderInput()}
            </div>
        `;
    }

    renderMessages() {
        const { conv } = this;
        const body = (!conv || !conv.messages || conv.messages.length === 0)
            ? `<p class="muted chat-empty">${this.t('chat.noMessages')}</p>`
            : conv.messages.map(m => this.renderMessage(m)).join('');
        return `<div class="chat-messages">${body}</div>`;
    }

    renderMessage(msg) {
        const isMe = msg.sender === 'me';
        const time = ConversationService.formatTime(msg.sentAt);
        return `
            <div class="chat-message ${isMe ? 'me' : 'other'}">
                <div class="chat-bubble">
                    <div class="chat-text">${escapeHtml(msg.text)}</div>
                    <div class="chat-time">${time}</div>
                </div>
            </div>
        `;
    }

    renderInput() {
        // Consultation terminée : lecture seule
        if (this.isExpired) {
            return `
                <div class="chat-input glass">
                    <p class="muted chat-ended">${this.t('consultation.ended')}</p>
                </div>
            `;
        }

        // Utilisateur bloqué : plus de saisie, mais on peut débloquer
        if (this.isBlocked) {
            return `
                <div class="chat-input glass">
                    <p class="muted chat-ended">${this.t('block.chatBlocked')}</p>
                    <button type="button" id="unblockBtn" class="btn btn-glass chat-unblock">${this.t('block.unblock')}</button>
                </div>
            `;
        }

        return `
            <div class="chat-input glass">
                <div class="chat-input-row">
                    <input type="text" id="chatInput" class="field" placeholder="${this.t('chat.placeholder')}" maxlength="1000" autocomplete="off">
                    <button id="sendBtn" class="btn btn-lime" type="button">${this.t('chat.send')}</button>
                </div>
            </div>
        `;
    }

    // Ajoute UN message au DOM sans tout redessiner
    appendMessage(root, msg) {
        const box = root.querySelector('.chat-messages');
        if (!box) return;
        box.querySelector('.chat-empty')?.remove();
        const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
        box.insertAdjacentHTML('beforeend', this.renderMessage(msg));
        if (nearBottom || msg.sender === 'me') box.scrollTop = box.scrollHeight;
    }

    bindEvents(root, onSend) {
        const input = root.querySelector('#chatInput');
        const sendBtn = root.querySelector('#sendBtn');
        if (!input || !sendBtn) return;

        const sendMessage = () => {
            const text = input.value.trim();
            if (!text) return;
            if (onSend(text)) {
                input.value = '';
                input.focus();
            }
        };

        sendBtn.onclick = sendMessage;
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
        // Quand le clavier s'ouvre, on garde le dernier message visible
        input.onfocus = () => setTimeout(() => this.scrollToBottom(root), 300);
    }

    scrollToBottom(root) {
        const box = root.querySelector('.chat-messages');
        if (box) box.scrollTop = box.scrollHeight;
    }
}