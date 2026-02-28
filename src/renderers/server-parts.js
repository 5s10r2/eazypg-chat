// ─── Render from Server Parts (Component Registry pattern) ───
import { marked } from 'marked';
import { nextCarouselSeq } from '../config.js';
import { escapeHtml } from '../helpers.js';
import { t } from '../i18n.js';
import { buildPropertyCardHtml } from './property-card.js';

// ── Individual Part Renderers ──────────────────────────────────────────

function renderTextPart(part) {
  const priceRe = /(₹[\d,]+(?:\s*(?:\/\s*(?:month|mo|day)))?)/g;
  let h = marked.parse(part.markdown || "");
  h = h.replace(priceRe, '<span class="price-inline">$1</span>');
  if (!h.trim()) return null;
  return { html: `<div class="msg-content">${h}</div>` };
}

function renderPropertyCarousel(part) {
  const props = (part.properties || []).map((p, i) => ({
    num: i + 1,
    name: p.name || "",
    price: p.rent || "",
    location: p.location || "",
    gender: p.gender || "",
    distance: p.distance || "",
    image: p.image || "",
    link: p.link || "",
    lat: p.lat || "",
    lng: p.lng || "",
  }));
  if (!props.length) return null;

  const isSingle = props.length === 1;
  const cardsHtml = props.map(p => buildPropertyCardHtml(p, isSingle)).join('');
  const cid = nextCarouselSeq();

  let carouselHtml;
  if (isSingle) {
    carouselHtml = `<div style="margin:8px 0 4px">${cardsHtml}</div>`;
  } else {
    carouselHtml = `
      <div class="carousel-wrapper">
        <span class="carousel-counter" id="cc${cid}">1 / ${props.length}</span>
        <div class="property-carousel" id="pc${cid}" data-total="${props.length}">${cardsHtml}</div>
      </div>
      <span class="carousel-view-all" data-action="Show me all ${props.length} properties">${t("view_all", { count: props.length })}</span>
    `;
  }

  // Add map placeholder if any properties have lat/lng
  const mappable = props.filter(p => p.lat && p.lng);
  if (mappable.length > 0) {
    const mapData = mappable.map(p => ({ name: p.name, rent: p.price, lat: p.lat, lng: p.lng }));
    const mapCenter = part.map_center || {};
    const safeProps  = JSON.stringify(mapData).replace(/'/g, '&#39;');
    const safeCenter = JSON.stringify(mapCenter).replace(/'/g, '&#39;');
    carouselHtml += `<div class="map-placeholder" data-properties='${safeProps}' data-map-center='${safeCenter}'></div>`;
  }

  return { html: carouselHtml };
}

function renderComparisonTable(part) {
  const headers = part.headers || [];
  const rows = part.rows || [];
  if (headers.length < 2 || rows.length < 1) return null;

  const renderCell = text => marked.parseInline ? marked.parseInline(text) : escapeHtml(text);
  const colHeaders = headers.map(h => `<th>${renderCell(h)}</th>`).join('');
  const bodyHtml = rows.map(row => {
    const cells = row.map(c => {
      const lc = (c || "").toLowerCase();
      let cls = '';
      if (['✓','yes','✅','✔'].includes(lc)) { cls = 'cmp-yes'; c = '✓'; }
      if (['—','-','no','❌','✗'].includes(lc)) { cls = 'cmp-no'; c = '—'; }
      return `<td class="${cls}">${cls ? escapeHtml(c) : renderCell(c)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const winnerHtml = part.winner
    ? `<div class="compare-winner">🏆 ${escapeHtml(part.winner)}</div>`
    : '';

  return { html: `<div class="compare-card">
    <div class="compare-card-header">${t("comparison_header")}</div>
    <table class="compare-tbl">
      <thead><tr>${colHeaders}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
    ${winnerHtml}
  </div>` };
}

function renderQuickReplies(part) {
  const chips = part.chips || [];
  if (!chips.length) return null;

  const chipsHtml = chips.map(c => {
    const action = escapeHtml(c.action || '');
    const label = escapeHtml(c.label || '');
    return `<button class="qr-chip" data-action="${action}">${label}</button>`;
  }).join('');

  // isChips flag tells message-builder to render outside bubble as quick-replies
  return { html: chipsHtml, isChips: true };
}

function renderActionButtons(part) {
  const buttons = part.buttons || [];
  if (!buttons.length) return null;

  const buttonsHtml = buttons.map(b => {
    const action = escapeHtml(b.action || '');
    const label = escapeHtml(b.label || '');
    const style = b.style === 'primary' ? 'action-btn-primary' : 'action-btn-secondary';
    return `<button class="action-btn ${style}" data-action="${action}">${label}</button>`;
  }).join('');

  return { html: `<div class="action-buttons">${buttonsHtml}</div>` };
}

// ── Component Registry ─────────────────────────────────────────────────

const PART_RENDERERS = {
  text: renderTextPart,
  property_carousel: renderPropertyCarousel,
  comparison_table: renderComparisonTable,
  quick_replies: renderQuickReplies,
  action_buttons: renderActionButtons,
};

// ── Main entry point ───────────────────────────────────────────────────

export function renderFromServerParts(serverParts) {
  const htmlParts = [];

  for (const part of serverParts) {
    const renderer = PART_RENDERERS[part.type];
    if (!renderer) {
      // Unknown part type — skip gracefully
      continue;
    }

    const result = renderer(part);
    if (result) {
      htmlParts.push(result);
    }
  }

  return htmlParts.length ? htmlParts : null;
}
