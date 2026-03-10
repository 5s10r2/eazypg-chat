// ─── Chat Persistence (localStorage) ───
import { chatHistory, setChatHistory, setFirstRequest, resetCarouselSeq } from './config.js';
import { scrollToBottom } from './helpers.js';
import { buildWelcomeInnerHtml } from './i18n.js';
import { restoreUserMsg, restoreBotMsg } from './message-builder.js';

const HISTORY_KEY = "eazypg_chat_history";
const MAX_HISTORY = 100;

export function saveChatHistory() {
  try {
    const slice = chatHistory.slice(-MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slice));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Trim aggressively and retry
      try {
        const trimmed = chatHistory.slice(-20);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      } catch (_) { /* give up gracefully */ }
    } else {
      console.warn("Failed to save chat history:", e);
    }
  }
}

export function loadChatHistory() {
  try {
    const chatArea = document.getElementById("chatArea");
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const loaded = JSON.parse(raw);
    // Replace chatHistory contents (preserve reference)
    chatHistory.length = 0;
    loaded.forEach(m => chatHistory.push(m));
    if (!chatHistory.length) return;

    const wc = document.getElementById("welcomeCard");
    if (wc) wc.style.display = "none";

    // Replay without animation
    chatArea.style.scrollBehavior = "auto";
    for (let i = 0; i < chatHistory.length; i++) {
      const msg = chatHistory[i];
      const isLast = i === chatHistory.length - 1;
      if (msg.role === "user") {
        restoreUserMsg(msg.text, msg.time);
      } else {
        restoreBotMsg(msg.text, msg.agent, msg.time, isLast, msg.serverParts || null);
      }
    }
    scrollToBottom();
    chatArea.style.scrollBehavior = "smooth";
    setFirstRequest(false);
  } catch (e) {
    console.warn("Failed to load chat history:", e);
    chatHistory.length = 0;
  }
}

export function clearChat() {
  chatHistory.length = 0;
  localStorage.removeItem(HISTORY_KEY);
  resetCarouselSeq();
  setFirstRequest(true);

  const chatArea = document.getElementById("chatArea");
  chatArea.innerHTML = `<div class="welcome-card" id="welcomeCard">${buildWelcomeInnerHtml()}</div>`;
  document.getElementById("msgInput").focus();
}
