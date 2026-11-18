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

const TICK = '<path d="M1.5 8.5l3.5 3.5L12 4.5" />';
const TICK2 = '<path d="M6.5 11.8l.9.9L14.5 5" />';

// Flèches d'état : ✓ envoyé · ✓✓ reçu · ✓✓ colorées = lu
function ticks(status) {
    const double = status === 'delivered' || status === 'read';
    return `<span class="chat-ticks ${status}" data-status="${status}" aria-label="${status}">
        <svg width="16" height="12" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TICK}${double ? TICK2 : ''}</svg>
    </span>`;
}

export default class ChatView {
    constructor(props) {
        this.props = props;
        this.conv = props.conv;
        this.isExpired = props.isExpired || false;
        this.isBlocked = props.isBlocked || false;
        this.t = props.t || ((key) => key);
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.voiceChunks = [];
        this.voiceStartedAt = 0;
        this.voicePausedAt = 0;
        this.voicePausedMs = 0;
        this.cancelVoice = false;
        this.voiceTimer = null;
    }

    // En-tête commun aux deux types de chat (nom, statut en ligne, menu)
    static header(conv, t) {
        const o = conv.other || {};
        const online = !!o.online;
        return `
            <div class="topbar">
                <button class="round" type="button" data-back aria-label="${escapeHtml(t('common.back'))}">‹</button>
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

    // Anciens messages sans état : lus si l'autre a répondu depuis, sinon reçus
    statusOf(msg) {
        if (msg.status) return msg.status;
        const msgs = (this.conv && this.conv.messages) || [];
        return msgs.some(m => m.sender === 'other' && m.sentAt > msg.sentAt) ? 'read' : 'delivered';
    }

    // Met à jour les flèches d'un message sans redessiner le chat
    static updateStatus(root, msgId, status) {
        const el = root.querySelector(`[data-msg-id="${CSS.escape(String(msgId))}"] .chat-ticks`);
        if (el) el.outerHTML = ticks(status);
    }

    // Anciens messages sans état : lus si l'autre a répondu depuis, sinon reçus
    renderMessage(msg) {
        const isMe = msg.sender === 'me';
        const time = ConversationService.formatTime(msg.sentAt);
        return `
            <div class="chat-message ${isMe ? 'me' : 'other'}" data-msg-id="${escapeHtml(String(msg.id))}">
                <div class="chat-bubble">
                    ${msg.type === 'audio' ? `<audio class="chat-audio" controls preload="none" src="${escapeHtml(msg.audio || '')}" aria-label="${escapeHtml(this.t('chat.voiceMessage'))}"></audio>` : `<div class="chat-text">${escapeHtml(msg.text)}</div>`}
                    <div class="chat-time">${time}${isMe ? ticks(this.statusOf(msg)) : ''}</div>
                </div>
            </div>
        `;
    }

    renderInput() {
        if (this.isExpired) {
            return `
                <div class="chat-input glass">
                    <p class="muted chat-ended">${this.t('consultation.ended')}</p>
                </div>
            `;
        }
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
                <div class="chat-input-row" id="chatInputRow">
                    <input type="text" id="chatInput" class="field" placeholder="${this.t('chat.placeholder')}" maxlength="1000" autocomplete="off">
                    <button id="voiceBtn" class="round chat-voice" type="button" aria-label="${escapeHtml(this.t('chat.voiceStart'))}">&#127908;</button>
                    <button id="sendBtn" class="btn btn-lime" type="button">${this.t('chat.send')}</button>
                </div>
                <div id="voicePreview" class="voice-preview" hidden>
                    <button id="voiceCancel" class="round voice-cancel" type="button" aria-label="${escapeHtml(this.t('chat.voiceCancel'))}">&#10005;</button>
                    <span class="voice-record-dot" aria-hidden="true"></span>
                    <span id="voiceTime" class="voice-time">00:00</span>
                    <div class="voice-wave" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => '<span style="--bar-index:' + i + '"></span>').join('')}</div>
                    <button id="voicePause" class="round voice-pause" type="button" aria-label="${escapeHtml(this.t('chat.voicePause'))}">&#10074;&#10074;</button>
                    <button id="voiceSend" class="round voice-send" type="button" aria-label="${escapeHtml(this.t('chat.voiceSend'))}">&#10148;</button>
                </div>
                <p id="voiceStatus" class="muted chat-voice-status" aria-live="polite" hidden></p>
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
        this.props.root = root;
        const input = root.querySelector('#chatInput');
        const sendBtn = root.querySelector('#sendBtn');
        const voiceBtn = root.querySelector('#voiceBtn');
        const status = root.querySelector('#voiceStatus');
        if (!input || !sendBtn) return;

        sendBtn.onclick = () => {
            const text = input.value.trim();
            if (text && onSend(text)) { input.value = ''; input.focus(); }
        };
        input.onkeydown = event => {
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendBtn.click(); }
        };
        input.onfocus = () => setTimeout(() => this.scrollToBottom(root), 300);
        voiceBtn.onclick = () => this.startVoiceRecording(root, onSend);
        root.querySelector('#voiceCancel').onclick = () => this.cancelRecording();
        root.querySelector('#voicePause').onclick = event => this.toggleVoicePause(root, event.currentTarget);
        root.querySelector('#voiceSend').onclick = () => {
            if (this.mediaRecorder?.state === 'recording' || this.mediaRecorder?.state === 'paused') {
                this.stopVoiceRecording();
            }
        };
    }

    async startVoiceRecording(root, onSend) {
        const status = root.querySelector('#voiceStatus');
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            status.hidden = false;
            status.textContent = this.t('chat.voiceUnsupported');
            return;
        }
        try {
            this.cancelVoice = false;
            this.voiceSendCallback = onSend;
            this.voicePausedAt = 0;
            this.voicePausedMs = 0;
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (this.cancelVoice) { this.releaseVoiceStream(); return; }
            const formats = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
            const mimeType = formats.find(type => MediaRecorder.isTypeSupported?.(type));
            this.mediaRecorder = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);
            this.voiceChunks = [];
            this.voiceStartedAt = Date.now();
            this.mediaRecorder.ondataavailable = event => { if (event.data?.size) this.voiceChunks.push(event.data); };
            this.mediaRecorder.onstop = () => this.finishVoiceRecording(root);
            this.mediaRecorder.start();
            root.querySelector('#chatInputRow').hidden = true;
            root.querySelector('#voicePreview').hidden = false;
            root.querySelector('#voicePreview').classList.add('is-recording');
            root.querySelector('#voicePause').innerHTML = '&#10074;&#10074;';
            root.querySelector('#voicePause').setAttribute('aria-label', this.t('chat.voicePause'));
            status.hidden = false;
            status.textContent = this.t('chat.voiceRecording');
            this.startVoiceMeter(root);
            this.voiceTimer = setInterval(() => {
                this.updateVoiceTime(root);
                if (this.voiceElapsedMs() >= 60000) this.stopVoiceRecording();
            }, 250);
        } catch (error) {
            this.releaseVoiceStream();
            status.hidden = false;
            status.textContent = error.name === 'NotAllowedError' ? this.t('chat.voicePermission') : this.t('chat.voiceError');
        }
    }

    toggleVoicePause(root, button) {
        const status = root.querySelector('#voiceStatus');
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.pause();
            this.voicePausedAt = Date.now();
            clearInterval(this.voiceTimer);
            this.voiceTimer = null;
            this.stopVoiceMeter();
            root.querySelector('#voicePreview').classList.remove('is-recording');
            button.innerHTML = '&#9654;';
            button.setAttribute('aria-label', this.t('chat.voiceResume'));
            status.textContent = this.t('chat.voicePaused');
        } else if (this.mediaRecorder?.state === 'paused') {
            this.voicePausedMs += Date.now() - this.voicePausedAt;
            this.voicePausedAt = 0;
            this.mediaRecorder.resume();
            root.querySelector('#voicePreview').classList.add('is-recording');
            button.innerHTML = '&#10074;&#10074;';
            button.setAttribute('aria-label', this.t('chat.voicePause'));
            status.textContent = this.t('chat.voiceRecording');
            this.startVoiceMeter(root);
            this.voiceTimer = setInterval(() => {
                this.updateVoiceTime(root);
                if (this.voiceElapsedMs() >= 60000) this.stopVoiceRecording();
            }, 250);
        }
    }

    voiceElapsedMs() {
        const end = this.voicePausedAt || Date.now();
        return Math.max(0, end - this.voiceStartedAt - this.voicePausedMs);
    }

    startVoiceMeter(root) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        try {
            this.audioContext = new AudioContextClass();
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 64;
            this.audioContext.createMediaStreamSource(this.mediaStream).connect(this.audioAnalyser);
            this.audioLevels = new Uint8Array(this.audioAnalyser.fftSize);
            const bars = root.querySelectorAll('.voice-wave span');
            const draw = () => {
                if (!this.audioAnalyser) return;
                this.audioAnalyser.getByteTimeDomainData(this.audioLevels);
                let sum = 0;
                for (const value of this.audioLevels) sum += (value - 128) ** 2;
                const level = Math.sqrt(sum / this.audioLevels.length) / 32;
                bars.forEach((bar, index) => {
                    const variation = ((index * 17 + Date.now() / 80) % 11) / 22;
                    bar.style.setProperty('--level', String(Math.min(1, 0.15 + level + variation)));
                });
                this.voiceFrame = requestAnimationFrame(draw);
            };
            draw();
        } catch { this.audioAnalyser = null; }
    }

    updateVoiceTime(root) {
        const seconds = Math.floor(this.voiceElapsedMs() / 1000);
        const time = root.querySelector('#voiceTime');
        if (time) time.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    }

    stopVoiceRecording() {
        if (this.mediaRecorder?.state === 'recording' || this.mediaRecorder?.state === 'paused') this.mediaRecorder.stop();
    }

    async finishVoiceRecording(root) {
        const chunks = this.voiceChunks;
        const durationMs = Math.min(60000, this.voiceElapsedMs());
        const mimeType = this.mediaRecorder?.mimeType || chunks[0]?.type || 'audio/webm';
        this.voiceChunks = [];
        this.mediaRecorder = null;
        this.stopVoiceMeter();
        root.querySelector('#voicePreview').classList.remove('is-recording');
        this.releaseVoiceStream();
        clearInterval(this.voiceTimer);
        this.voiceTimer = null;
        if (this.cancelVoice) return;
        const status = root.querySelector('#voiceStatus');
        try {
            if (!chunks.length) throw new Error('empty-recording');
            const blob = new Blob(chunks, { type: mimeType });
            const src = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            });
            const send = this.voiceSendCallback;
            this.voiceSendCallback = null;
            if (!send || !send('', { src, durationMs })) throw new Error('send-failed');
            this.clearVoicePreview(root);
            status.hidden = true;
            status.textContent = '';
        } catch {
            this.cancelRecording();
            root.querySelector('#chatInputRow').hidden = false;
            status.hidden = false;
            status.textContent = this.t('chat.voiceError');
        }
    }

    stopVoiceMeter() {
        if (this.voiceFrame) cancelAnimationFrame(this.voiceFrame);
        this.voiceFrame = null;
        this.audioAnalyser = null;
        if (this.audioContext && this.audioContext.state !== 'closed') this.audioContext.close();
        this.audioContext = null;
    }

    releaseVoiceStream() {
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
    }

    clearVoicePreview(root) {
        root.querySelector('#voicePreview').hidden = true;
        root.querySelector('#voicePreview').classList.remove('is-recording');
        root.querySelector('#chatInputRow').hidden = false;
        root.querySelector('#voiceTime').textContent = '00:00';
        root.querySelectorAll('.voice-wave span').forEach(bar => bar.style.removeProperty('--level'));
        const status = root.querySelector('#voiceStatus');
        status.hidden = true;
        status.textContent = '';
        root.querySelector('#voicePause').innerHTML = '&#10074;&#10074;';
    }

    cancelRecording() {
        this.cancelVoice = true;
        if (this.mediaRecorder?.state === 'recording' || this.mediaRecorder?.state === 'paused') this.mediaRecorder.stop();
        this.stopVoiceMeter();
        this.releaseVoiceStream();
        clearInterval(this.voiceTimer);
        this.voiceTimer = null;
        this.voiceSendCallback = null;
        const root = this.props.root;
        if (root?.querySelector('#voicePreview')) this.clearVoicePreview(root);
    }
    scrollToBottom(root) {
        const box = root.querySelector('.chat-messages');
        if (box) box.scrollTop = box.scrollHeight;
    }
}
