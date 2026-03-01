// ─── Message Builder ───
import { chatHistory } from './config.js';
import { escapeHtml, timeNow, scrollToBottom } from './helpers.js';
import { agentLabel } from './i18n.js';
import { buildFeedbackRow } from './feedback.js';
import { buildQuickReplies } from './quick-replies.js';
import { renderRichMessage } from './renderers/rich-message.js';
import { renderFromServerParts } from './renderers/server-parts.js';
import { saveChatHistory } from './chat-history.js';
import { initMapPlaceholders } from './components/PropertyMap.js';
import { openLightbox } from './lightbox.js';

// ─── Add user message ───
export function addMessage(text, type) {
  const chatArea = document.getElementById("chatArea");
  const row = document.createElement("div");
  row.className = `msg-row ${type}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const time = timeNow();
  bubble.innerHTML = `<div>${escapeHtml(text)}</div><div class="time">${time}</div>`;
  row.appendChild(bubble);
  chatArea.appendChild(row);
  scrollToBottom();
  chatHistory.push({ role: "user", text, time });
  saveChatHistory();
}

// ─── Add bot message + quick reply chips ───
export function addBotMessage(text, agent, serverParts) {
  const chatArea = document.getElementById("chatArea");
  const row = document.createElement("div");
  row.className = "msg-row bot";

  const label = agentLabel(agent);

  // Prefer server-parsed parts (structured output) over client-side regex
  const parts = (serverParts && serverParts.length)
    ? (renderFromServerParts(serverParts) || renderRichMessage(text, agent))
    : renderRichMessage(text, agent);

  // Check if backend sent chips via quick_replies part type
  const hasBackendChips = parts.some(p => p.isChips);

  // Helper: create one .bubble, wire its [data-action] buttons + map placeholders
  function makeBubble(html, showBadge, isChipsPart) {
    // Chips parts are appended outside the bubble (not inside a bubble)
    if (isChipsPart) {
      const qrDiv = document.createElement("div");
      qrDiv.className = "quick-replies";
      qrDiv.id = "activeQuickReplies";
      qrDiv.innerHTML = html;
      qrDiv.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => {
          if (btn.dataset.action) window.sendQuick(btn.dataset.action);
        });
      });
      return qrDiv;
    }

    const b = document.createElement("div");
    b.className = "bubble";
    b.innerHTML = (showBadge
      ? `<span class="agent-badge">${label} · ${timeNow()}</span>`
      : "") + html;
    b.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.action) window.sendQuick(btn.dataset.action);
      });
    });
    // Initialize any map placeholders inside this bubble
    initMapPlaceholders(b);
    // Wire image gallery lightbox
    b.querySelectorAll(".ig-thumb").forEach(thumb => {
      thumb.addEventListener("click", () => {
        const gallery = thumb.closest(".image-gallery");
        if (!gallery) return;
        const images = JSON.parse(gallery.dataset.images || "[]");
        const index = parseInt(thumb.dataset.index, 10) || 0;
        const propName = gallery.dataset.property || "";
        openLightbox(images, index, propName);
      });
    });
    return b;
  }

  let badgeShown = false;
  let partIdx = 0;
  for (const part of parts) {
    if (!part.html || !part.html.trim()) continue;
    const isChips = !!part.isChips;
    const el = makeBubble(part.html, !badgeShown && !isChips, isChips);
    // Stagger animation delay per part (50ms * index)
    if (partIdx > 0) {
      el.classList.add("part-stagger");
      el.style.animationDelay = `${partIdx * 50}ms`;
    }
    row.appendChild(el);
    if (!isChips) badgeShown = true;
    partIdx++;
  }

  // Fallback: frontend-generated chips ONLY if backend didn't send any
  if (!hasBackendChips) {
    const chipsHtml = buildQuickReplies(text, agent);
    if (chipsHtml) {
      const qrDiv = document.createElement("div");
      qrDiv.className = "quick-replies";
      qrDiv.id = "activeQuickReplies";
      qrDiv.innerHTML = chipsHtml;
      qrDiv.querySelectorAll(".qr-chip").forEach(chip => {
        chip.addEventListener("click", () => window.sendQuick(chip.dataset.action));
      });
      row.appendChild(qrDiv);
    }
  }

  // Feedback thumbs
  row.appendChild(buildFeedbackRow(text, agent));

  chatArea.appendChild(row);
  scrollToBottom();
  chatHistory.push({ role: "bot", text, agent, time: timeNow() });
  saveChatHistory();
}

// ─── Restore user message (no animation, for chat history replay) ───
export function restoreUserMsg(text, time) {
  const chatArea = document.getElementById("chatArea");
  const row = document.createElement("div");
  row.className = "msg-row user";
  row.style.animation = "none";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<div>${escapeHtml(text)}</div><div class="time">${time || ""}</div>`;
  row.appendChild(bubble);
  chatArea.appendChild(row);
}

// ─── Restore bot message (no animation, for chat history replay) ───
export function restoreBotMsg(text, agent, time, isLast) {
  const chatArea = document.getElementById("chatArea");
  const row = document.createElement("div");
  row.className = "msg-row bot";
  row.style.animation = "none";

  const label = agentLabel(agent);

  const parts = renderRichMessage(text, agent);
  let badgeShown = false;
  for (const part of parts) {
    if (!part.html || !part.html.trim()) continue;
    const b = document.createElement("div");
    b.className = "bubble";
    b.style.animation = "none";
    b.innerHTML = (!badgeShown
      ? `<span class="agent-badge">${label} · ${time || ""}</span>`
      : "") + part.html;
    b.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.action) window.sendQuick(btn.dataset.action);
      });
    });
    row.appendChild(b);
    badgeShown = true;
  }

  // Quick reply chips only on the very last restored bot message
  if (isLast) {
    const chipsHtml = buildQuickReplies(text, agent);
    if (chipsHtml) {
      const qrDiv = document.createElement("div");
      qrDiv.className = "quick-replies";
      qrDiv.id = "activeQuickReplies";
      qrDiv.innerHTML = chipsHtml;
      qrDiv.querySelectorAll(".qr-chip").forEach(chip => {
        chip.addEventListener("click", () => window.sendQuick(chip.dataset.action));
      });
      row.appendChild(qrDiv);
    }
  }

  chatArea.appendChild(row);
}
