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

// ─── Skeleton loaders ───

const _TOOL_SKELETON_MAP = {
  search_properties:       'cards',
  compare_properties:      'table',
  fetch_property_details:  'text',
  fetch_property_images:   'gallery',
  fetch_room_details:      'text',
  schedule_visit:          'status',
  save_visit_time:         'status',
  schedule_call:           'status',
  save_call_time:          'status',
  create_payment_link:     'status',
  verify_payment:          'status',
  shortlist_property:      'status',
  fetch_landmarks:         'text',
  fetch_nearby_places:     'text',
  brand_info:              'text',
  web_search:              'text',
  query_knowledge_base:    'text',
};

const _SKELETON_HTML = {
  text: `<div class="skeleton skeleton-text">
    <div class="sk-line w90"></div>
    <div class="sk-line w70"></div>
    <div class="sk-line w50"></div>
  </div>`,

  cards: `<div class="skeleton skeleton-cards">
    <div class="sk-card"><div class="sk-img"></div><div class="sk-line w60"></div><div class="sk-line w40"></div></div>
    <div class="sk-card"><div class="sk-img"></div><div class="sk-line w60"></div><div class="sk-line w40"></div></div>
  </div>`,

  status: `<div class="skeleton skeleton-status">
    <div class="sk-icon"></div>
    <div class="sk-lines"><div class="sk-line w60"></div><div class="sk-line w40"></div></div>
  </div>`,

  table: `<div class="skeleton skeleton-table">
    <div class="sk-table-row"><div class="sk-line w40"></div><div class="sk-line w40"></div></div>
    <div class="sk-table-row"><div class="sk-line w60"></div><div class="sk-line w50"></div></div>
    <div class="sk-table-row"><div class="sk-line w50"></div><div class="sk-line w60"></div></div>
  </div>`,

  gallery: `<div class="skeleton skeleton-gallery">
    <div class="sk-img"></div><div class="sk-img"></div>
    <div class="sk-img"></div><div class="sk-img"></div>
  </div>`,
};

/**
 * Returns skeleton HTML for a given tool name.
 * Falls back to text skeleton for unknown tools.
 */
export function getSkeletonHtml(toolName) {
  const variant = _TOOL_SKELETON_MAP[toolName] || 'text';
  return _SKELETON_HTML[variant] || _SKELETON_HTML.text;
}
