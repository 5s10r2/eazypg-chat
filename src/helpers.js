// ─── Helpers ───

export function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s || "");
  return d.innerHTML;
}

export function escapeAttr(s) {
  return String(s || "").replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function scrollToBottom() {
  const chatArea = document.getElementById("chatArea");
  requestAnimationFrame(() => { chatArea.scrollTop = chatArea.scrollHeight; });
}

export function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}
