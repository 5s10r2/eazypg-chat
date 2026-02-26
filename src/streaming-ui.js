// ─── Streaming UI ───
import { t } from './i18n.js';
import { scrollToBottom } from './helpers.js';

export function showTyping() {
  const chatArea = document.getElementById("chatArea");
  const row = document.createElement("div");
  row.className = "typing-row";
  row.innerHTML = `<div class="typing-bubble">
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  </div>`;
  chatArea.appendChild(row);
  scrollToBottom();
  return row;
}

export function createStreamingRow() {
  const row = document.createElement("div");
  row.className = "msg-row bot";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const badge = document.createElement("span");
  badge.className = "agent-badge";
  badge.textContent = t("agent_thinking");

  const status = document.createElement("div");
  status.className = "stream-status";
  status.style.display = "none";

  const content = document.createElement("div");
  content.className = "msg-content streaming";

  bubble.appendChild(badge);
  bubble.appendChild(status);
  bubble.appendChild(content);
  row.appendChild(bubble);

  return { row, contentEl: content, statusEl: status, badgeEl: badge };
}
