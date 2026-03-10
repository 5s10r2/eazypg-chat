// ─── Feedback helpers ───
import { userId } from './config.js';
import { t } from './i18n.js';

export function buildFeedbackRow(text, agent, isError = false) {
  if (isError) return document.createDocumentFragment(); // no feedback on error messages

  const div = document.createElement("div");
  div.className = "feedback-row";
  const snippet = text.substring(0, 120);
  div.innerHTML = `<button class="feedback-btn" data-rating="up" title="${t("feedback_good")}">👍</button>` +
                  `<button class="feedback-btn" data-rating="down" title="${t("feedback_bad")}">👎</button>`;
  div.querySelectorAll(".feedback-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      // Disable both buttons immediately to prevent double-submission
      div.querySelectorAll(".feedback-btn").forEach(b => { b.disabled = true; });
      div.querySelectorAll(".feedback-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      sendFeedback(snippet, btn.dataset.rating, agent);
    });
  });
  return div;
}

export function sendFeedback(snippet, rating, agent) {
  const payload = { user_id: userId, message_snippet: snippet, rating, agent: agent || "" };
  fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});  // fire-and-forget
}
