// ─── Send Message (SSE streaming) ───
import { safeParse } from './sanitize.js';
import { ACCOUNT_VALUES, FALLBACK_ACCOUNT_VALUES, userId, isWaiting, firstRequest, chatHistory, setIsWaiting, setFirstRequest } from './config.js';
import { escapeHtml, timeNow, scrollToBottom } from './helpers.js';
import { currentLocale, setCurrentLocale, TRANSLATIONS, agentLabel, updateUIStrings, t } from './i18n.js';
import { addMessage, addBotMessage } from './message-builder.js';
import { saveChatHistory } from './chat-history.js';
import { createStreamingRow, getSkeletonHtml } from './streaming-ui.js';

// ─── Interrupt state ───
// activeController: AbortController for the in-flight SSE fetch (null when idle)
// requestCounter: monotonically incrementing ID — used to prevent the finally block
//   of an aborted request from resetting UI state that a new request has already claimed
let activeController = null;
let requestCounter = 0;

function clearQuickReplies() {
  const el = document.getElementById("activeQuickReplies");
  if (el) el.remove();
}

// ─── Visual indicator for interrupted (mid-stream) bot messages ───
// Called after addBotMessage() to mark the last bot bubble as "redirected"
function markLastBotInterrupted() {
  const chatArea = document.getElementById("chatArea");
  const allRows = chatArea.querySelectorAll(".msg-row.bot");
  if (!allRows.length) return;
  const lastRow = allRows[allRows.length - 1];
  lastRow.classList.add("msg-interrupted");
  const bubbles = lastRow.querySelectorAll(".bubble");
  if (bubbles.length) {
    const badge = document.createElement("span");
    badge.className = "redirected-badge";
    badge.textContent = "↩ redirected";
    bubbles[bubbles.length - 1].appendChild(badge);
  }
  // Also mark the chatHistory entry so it persists across page reloads
  if (chatHistory.length) {
    chatHistory[chatHistory.length - 1].interrupted = true;
    saveChatHistory();
  }
}

// ─── Update the Stop button visibility ───
function setStopVisible(visible) {
  const stopBtn = document.getElementById("stopBtn");
  if (stopBtn) stopBtn.style.display = visible ? "flex" : "none";
}

export async function sendMessage() {
  const msgInput = document.getElementById("msgInput");
  const sendBtn  = document.getElementById("sendBtn");
  const chatArea = document.getElementById("chatArea");
  const text = msgInput.value.trim();
  if (!text) return;

  // ── INTERRUPT: if a stream is in-flight, abort it and fall through ──
  // The old sendMessage()'s catch block handles partial-response cleanup.
  // We do NOT return here — the new message is processed immediately after abort.
  if (isWaiting && activeController) {
    activeController.abort();
    activeController = null;
    // (cleanup of streaming row + partial text happens in the aborted call's catch block)
  }

  const wc = document.getElementById("welcomeCard");
  if (wc) wc.style.display = "none";

  clearQuickReplies();
  addMessage(text, "user");
  msgInput.value = "";
  msgInput.style.height = "auto";

  // Claim ownership of this request
  const myRequestId = ++requestCounter;
  activeController = new AbortController();

  setIsWaiting(true);
  sendBtn.disabled = true;
  setStopVisible(true);
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
      signal: activeController.signal,
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
      setStopVisible(false);
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

    if (err.name === "AbortError") {
      // ── Intentional interrupt by user sending a new message (or clicking Stop) ──
      // Preserve whatever partial text streamed so far, then mark it as redirected.
      row.remove();
      if (fullText) {
        addBotMessage(fullText, agentName || "default");
        markLastBotInterrupted();
      }
      // No error toast — the user chose to redirect; the new message is already queued
    } else {
      row.remove();
      addBotMessage(t("error_moment"), "system");
      console.error(err);
    }
  } finally {
    // Only reset shared UI state when WE are still the active (latest) request.
    // If a newer sendMessage() call has already started (requestCounter > myRequestId),
    // that call owns the waiting state — do NOT reset it here.
    if (myRequestId === requestCounter) {
      setIsWaiting(false);
      sendBtn.disabled = false;
      activeController = null;
      setStopVisible(false);
      const micBtnF = document.getElementById('micBtn');
      if (micBtnF) micBtnF.disabled = false;
      msgInput.focus();
    }
  }
}

// ─── Stop (cancel) the current stream without sending a new message ───
// User clicks the ✕ Stop button: abort current stream, reset UI to idle.
export function stopStream() {
  if (activeController) {
    activeController.abort();
    // requestCounter is NOT incremented here, so the aborted call's finally block
    // will see myRequestId === requestCounter and correctly reset UI to idle.
  }
}

export function sendQuick(text) {
  const msgInput = document.getElementById("msgInput");
  msgInput.value = text;
  sendMessage();
}
