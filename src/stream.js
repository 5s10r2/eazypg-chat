// ─── Send Message (SSE streaming) ───
import { safeParse } from './sanitize.js';
import { ACCOUNT_VALUES, FALLBACK_ACCOUNT_VALUES, userId, isWaiting, firstRequest, setIsWaiting, setFirstRequest } from './config.js';
import { escapeHtml, timeNow, scrollToBottom } from './helpers.js';
import { currentLocale, setCurrentLocale, TRANSLATIONS, agentLabel, updateUIStrings, t } from './i18n.js';
import { addMessage, addBotMessage } from './message-builder.js';
import { createStreamingRow, getSkeletonHtml } from './streaming-ui.js';

function clearQuickReplies() {
  const el = document.getElementById("activeQuickReplies");
  if (el) el.remove();
}

export async function sendMessage() {
  const msgInput = document.getElementById("msgInput");
  const sendBtn  = document.getElementById("sendBtn");
  const chatArea = document.getElementById("chatArea");
  const text = msgInput.value.trim();
  if (!text || isWaiting) return;

  const wc = document.getElementById("welcomeCard");
  if (wc) wc.style.display = "none";

  clearQuickReplies();
  addMessage(text, "user");
  msgInput.value = "";
  msgInput.style.height = "auto";

  setIsWaiting(true);
  sendBtn.disabled = true;
  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.disabled = true;

  if (firstRequest) {
    document.getElementById("coldBanner").classList.add("show");
    setFirstRequest(false);
  }

  // Create streaming row
  const { row, contentEl, statusEl, badgeEl } = createStreamingRow();
  chatArea.appendChild(row);
  scrollToBottom();

  let fullText = "";
  let agentName = "";
  let serverParts = null;

  try {
    const res = await fetch("/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message: text,
        account_values: ACCOUNT_VALUES ?? FALLBACK_ACCOUNT_VALUES
      })
    });

    if (res.status === 429) {
      const errData = await res.json().catch(() => ({}));
      const wait = errData.retry_after || 10;
      row.remove();
      document.getElementById("coldBanner").classList.remove("show");
      addBotMessage(t("rate_limit", { seconds: wait }), "system");
      setIsWaiting(false);
      sendBtn.disabled = false;
      if (micBtn) micBtn.disabled = false;
      return;
    }
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/event-stream")) {
      const data = await res.json();
      row.remove();
      document.getElementById("coldBanner").classList.remove("show");
      addBotMessage(data.response || data.error || "Something went wrong.", data.agent || "system");
      return;
    }

    // Parse SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop();

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const lines = chunk.split("\n");
        let eventType = "", eventData = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7);
          else if (line.startsWith("data: ")) eventData = line.slice(6);
        }
        if (!eventType || !eventData) continue;

        let parsed;
        try { parsed = JSON.parse(eventData); } catch { continue; }

        switch (eventType) {
          case "agent_start": {
            agentName = parsed.agent;
            if (parsed.locale && TRANSLATIONS[parsed.locale]) {
              setCurrentLocale(parsed.locale);
              localStorage.setItem("eazypg_locale", parsed.locale);
              document.getElementById("langSelect").value = parsed.locale;
              updateUIStrings();
            }
            badgeEl.textContent = agentLabel(agentName) + " · " + timeNow();
            document.getElementById("coldBanner").classList.remove("show");
            break;
          }
          case "tool_start": {
            const rawTool = parsed.tool || "working";
            const toolLabel = rawTool
              .replace(/_/g, " ")
              .replace(/\b\w/g, c => c.toUpperCase());
            statusEl.innerHTML = '<span class="dot-pulse"></span> ' + escapeHtml(toolLabel) + '…';
            statusEl.style.display = "flex";
            // Show content-aware skeleton if no text streamed yet
            if (!fullText) {
              contentEl.innerHTML = getSkeletonHtml(rawTool);
              contentEl.classList.remove("streaming");
            }
            scrollToBottom();
            break;
          }
          case "tool_done":
            statusEl.style.display = "none";
            break;
          case "content_delta":
            // Clear skeleton on first text chunk
            if (!fullText && contentEl.querySelector('.skeleton')) {
              contentEl.innerHTML = '';
              contentEl.classList.add("streaming");
            }
            fullText += parsed.text;
            contentEl.innerHTML = safeParse(fullText);
            scrollToBottom();
            break;
          case "done":
            agentName = parsed.agent || agentName;
            fullText = parsed.full_response || fullText;
            serverParts = parsed.parts || null;
            break;
          case "error":
            fullText = fullText || parsed.text || "Something went wrong.";
            break;
        }
      }
    }

    document.getElementById("coldBanner").classList.remove("show");

    if (!fullText) {
      fullText = t("error_generic");
      agentName = agentName || "system";
    }
    row.remove();
    addBotMessage(fullText, agentName || "default", serverParts);

  } catch (err) {
    document.getElementById("coldBanner").classList.remove("show");
    row.remove();
    addBotMessage(t("error_moment"), "system");
    console.error(err);
  } finally {
    setIsWaiting(false);
    sendBtn.disabled = false;
    const micBtnF = document.getElementById('micBtn');
    if (micBtnF) micBtnF.disabled = false;
    msgInput.focus();
  }
}

export function sendQuick(text) {
  const msgInput = document.getElementById("msgInput");
  msgInput.value = text;
  sendMessage();
}
