// ─── Render from Server Parts (Component Registry pattern) ───
import { safeParse, safeParseInline } from '../sanitize.js';
import { nextCarouselSeq } from '../config.js';
import { escapeHtml, escapeAttr } from '../helpers.js';
import { t } from '../i18n.js';
import { buildPropertyCardHtml } from './property-card.js';

// ── Individual Part Renderers ──────────────────────────────────────────

function renderTextPart(part) {
  const priceRe = /(₹[\d,]+(?:\s*(?:\/\s*(?:month|mo|day)))?)/g;
  let h = safeParse(part.markdown || "");
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
    score: p.score || "",
    amenities: p.amenities || "",
  }));
  if (!props.length) return null;

  const isSingle = props.length === 1;
  const context = part.context || 'search'; // 'search' | 'shortlist' | 'detail'
  const cardsHtml = props.map(p => buildPropertyCardHtml(p, isSingle, context)).join('');
  const cid = nextCarouselSeq();

  let carouselHtml;
  if (isSingle) {
    carouselHtml = `<div class="single-card-wrap">${cardsHtml}</div>`;
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

  const renderCell = text => safeParseInline(text);

  // Find which column is the winner for highlighting
  const winnerName = (part.winner || '').toLowerCase();
  const winnerColIdx = winnerName
    ? headers.findIndex(h => (h || '').toLowerCase().includes(winnerName))
    : -1;

  const colHeaders = headers.map((h, i) => {
    const cls = i === winnerColIdx ? ' class="cmp-winner-col"' : '';
    return `<th${cls}>${renderCell(h)}</th>`;
  }).join('');

  // Pad rows to consistent column count to prevent layout breaks
  const maxCols = Math.max(headers.length, ...rows.map(r => (r || []).length));

  const bodyHtml = rows.map(row => {
    const padded = [...(row || [])];
    while (padded.length < maxCols) padded.push('');
    const cells = padded.map((c, ci) => {
      const lc = (c || '').toLowerCase();
      let cls = ci === winnerColIdx ? 'cmp-winner-col' : '';
      if (['✓', 'yes', '✅', '✔'].includes(lc))  { cls += (cls ? ' ' : '') + 'cmp-yes'; c = '✓'; }
      if (['—', '-', 'no', '❌', '✗'].includes(lc)) { cls += (cls ? ' ' : '') + 'cmp-no'; c = '—'; }
      const isBool = cls.includes('cmp-yes') || cls.includes('cmp-no');
      return `<td class="${cls.trim()}">${isBool ? escapeHtml(c) : renderCell(c)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const winnerHtml = part.winner
    ? `<div class="compare-winner">🏆 ${escapeHtml(part.winner)}</div>`
    : '';

  return { html: `<div class="compare-card">
    <div class="compare-card-header">${t('comparison_header')}</div>
    <div class="compare-tbl-wrap">
      <table class="compare-tbl">
        <thead><tr>${colHeaders}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
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

// ── Icon SVGs (inline, no dependencies) ────────────────────────────────

const STATUS_ICONS = {
  'calendar-check': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>',
  'star': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  'wallet': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1"/></svg>',
  'calendar': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  'clock': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  'location': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  'home': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
};

function _icon(name) {
  return STATUS_ICONS[name] || STATUS_ICONS['calendar'];
}

// ── Status Card ────────────────────────────────────────────────────────

function renderStatusCard(part) {
  const status = part.status || 'success';
  const icon = part.icon || 'calendar-check';
  const title = escapeHtml(part.title || '');
  const subtitle = escapeHtml(part.subtitle || '');
  const celebration = part.celebration || '';

  const detailsHtml = (part.details || [])
    .filter(d => d.text)
    .map(d => {
      const detailIcon = _icon(d.icon || 'calendar');
      const text = escapeHtml(d.text);
      if (d.url) {
        return `<div class="sc-detail"><span class="sc-detail-icon">${detailIcon}</span><a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${text}</a></div>`;
      }
      return `<div class="sc-detail"><span class="sc-detail-icon">${detailIcon}</span><span>${text}</span></div>`;
    })
    .join('');

  const actionsHtml = (part.actions || []).map(a => {
    const label = escapeHtml(a.label || '');
    const action = escapeHtml(a.action || '');
    const style = a.style === 'primary' ? 'sc-action-primary' : 'sc-action-secondary';
    if (a.url) {
      return `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener" class="sc-action ${style}">${label}</a>`;
    }
    return `<button class="sc-action ${style}" data-action="${action}">${label}</button>`;
  }).join('');

  let cardHtml = `<div class="status-card sc-${status}">
    <div class="sc-header">
      <div class="sc-icon">${_icon(icon)}</div>
      <div class="sc-header-text">
        <div class="sc-title">${title}</div>
        ${subtitle ? `<div class="sc-subtitle">${subtitle}</div>` : ''}
      </div>
    </div>
    ${detailsHtml ? `<div class="sc-details">${detailsHtml}</div>` : ''}
    ${actionsHtml ? `<div class="sc-actions">${actionsHtml}</div>` : ''}
  </div>`;

  // Celebration overlay
  if (celebration === 'confetti') {
    let particles = '';
    for (let i = 0; i < 12; i++) particles += `<span class="confetti-particle"></span>`;
    cardHtml = `<div class="celebration-wrap">${cardHtml}<div class="confetti-burst">${particles}</div></div>`;
  } else if (celebration === 'heart') {
    cardHtml = `<div class="celebration-wrap">${cardHtml}<div class="heart-celebration">❤️</div></div>`;
  } else if (celebration === 'checkmark') {
    // Use CSS classes so animations.css stroke-dasharray animations apply
    cardHtml = `<div class="celebration-wrap">${cardHtml}<div class="checkmark-celebration"><svg viewBox="0 0 52 52"><circle class="checkmark-circle" cx="26" cy="26" r="25"/><path class="checkmark-check" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg></div></div>`;
  }

  return { html: cardHtml };
}

// ── Image Gallery ──────────────────────────────────────────────────────

function renderImageGallery(part) {
  const images = (part.images || []).filter(img => img && img.url);
  if (!images.length) return null;
  const propName = escapeHtml(part.property_name || 'Property');

  const thumbsHtml = images.map((img, i) => {
    const url = escapeHtml(img.url || '');
    const caption = escapeHtml(img.caption || '');
    const onerror = `onerror="this.closest('.ig-thumb').classList.add('ig-thumb-broken')"`;
    const isMore = i === 3 && images.length > 4;
    if (isMore) {
      return `<div class="ig-thumb ig-thumb-more" data-index="${i}" data-gallery="${propName}">
        <img src="${url}" alt="${caption || propName}" loading="lazy" ${onerror} />
        <span class="ig-more-count">+${images.length - 4}</span>
      </div>`;
    }
    if (i > 3) return '';  // Hidden, accessible via lightbox
    return `<div class="ig-thumb" data-index="${i}" data-gallery="${propName}">
      <img src="${url}" alt="${caption || propName}" loading="lazy" ${onerror} />
    </div>`;
  }).join('');

  // Hidden data for lightbox (all images)
  const galleryData = JSON.stringify(images).replace(/'/g, '&#39;');

  return { html: `<div class="image-gallery" data-images='${galleryData}' data-property="${propName}">
    <div class="ig-header">
      <span class="ig-title">${propName}</span>
      <span class="ig-count">${images.length} photos</span>
    </div>
    <div class="ig-grid ig-grid-${Math.min(images.length, 4)}">${thumbsHtml}</div>
  </div>` };
}

// ── Confirmation Card ─────────────────────────────────────────────────

function renderConfirmationCard(part) {
  const title = escapeHtml(part.title || '');
  const subtitle = escapeHtml(part.subtitle || '');
  const style = part.style || 'visit'; // visit | payment

  // Separate action (sent to AI) from label (shown on button)
  const confirmAction = escapeHtml(part.confirm_action || 'Confirm');
  const confirmLabel  = escapeHtml(part.confirm_label  || 'Yes, confirm');
  const cancelAction  = escapeHtml(part.cancel_action  || 'Cancel');
  const cancelLabel   = escapeHtml(part.cancel_label   || 'Cancel');

  // Badge clearly indicates context — never falls back to t() string parsing
  const badgeLabel = style === 'payment' ? '💳 Payment' : '📅 Visit Details';

  const detailsHtml = (part.details || [])
    .filter(d => d.text)
    .map(d => {
      const detailIcon = _icon(d.icon || 'calendar');
      const text = escapeHtml(d.text);
      return `<div class="cc-detail"><span class="cc-detail-icon">${detailIcon}</span><span>${text}</span></div>`;
    })
    .join('');

  return { html: `<div class="confirmation-card cc-${style}">
    <div class="cc-badge">${badgeLabel}</div>
    <div class="cc-header">
      <div class="cc-title">${title}</div>
      ${subtitle ? `<div class="cc-subtitle">${subtitle}</div>` : ''}
    </div>
    ${detailsHtml ? `<div class="cc-details">${detailsHtml}</div>` : ''}
    <div class="cc-actions">
      <button class="cc-action cc-confirm" data-action="${confirmAction}">✓ ${confirmLabel}</button>
      <button class="cc-action cc-cancel"  data-action="${cancelAction}">${cancelLabel}</button>
    </div>
  </div>` };
}

// ── Error Card Renderer ───────────────────────────────────────────────

function renderErrorCard(part) {
  const title = escapeHtml(part.title || 'Something went wrong');
  const message = escapeHtml(part.message || 'Please try again in a moment.');

  let retryHtml = '';
  if (part.retry_action && part.retry_message) {
    const retryLabel = escapeHtml(part.retry_action);
    const retryMsg = escapeAttr(part.retry_message);
    retryHtml = `<button class="ec-retry" data-action="${retryMsg}"><span class="ec-retry-icon">↻</span> ${retryLabel}</button>`;
  }

  return { html: `<div class="error-card">
    <div class="ec-header">
      <div class="ec-icon">⚠</div>
      <div class="ec-title">${title}</div>
    </div>
    <div class="ec-message">${message}</div>
    ${retryHtml}
  </div>` };
}

// ── Expandable Sections ───────────────────────────────────────────────

function renderExpandableSections(part) {
  const sections = part.sections || [];
  if (!sections.length) return null;

  const sectionsHtml = sections.map(sec => {
    const id = escapeAttr(sec.id || '');
    const icon = sec.icon || '';
    const title = escapeHtml(sec.title || '');
    const contentType = sec.content_type || 'text';
    const items = sec.items || [];

    let bodyHtml = '';

    if (contentType === 'pills') {
      const pills = items.map(item => {
        const label = escapeHtml(typeof item === 'string' ? item : String(item));
        return `<span class="exp-pill">${label}</span>`;
      }).join('');
      bodyHtml = `<div class="exp-pills">${pills}</div>`;
    } else if (contentType === 'key_value') {
      const rows = items.map(item => {
        const label = escapeHtml(item.label || '');
        const value = escapeHtml(item.value || '');
        return `<div class="exp-kv-row"><span class="exp-kv-label">${label}</span><span class="exp-kv-value">${value}</span></div>`;
      }).join('');
      bodyHtml = `<div class="exp-kv-list">${rows}</div>`;
    } else if (contentType === 'qa') {
      const qas = items.map(item => {
        const q = escapeHtml(item.question || '');
        const a = escapeHtml(item.answer || '');
        return `<div class="exp-qa"><div class="exp-q">${q}</div><div class="exp-a">${a}</div></div>`;
      }).join('');
      bodyHtml = `<div class="exp-qa-list">${qas}</div>`;
    } else {
      // text
      const text = items.map(i => escapeHtml(typeof i === 'string' ? i : String(i))).join('<br/>');
      bodyHtml = `<div class="exp-text">${text}</div>`;
    }

    return `<details class="exp-section" id="exp-${id}">
      <summary class="exp-header">
        <span class="exp-icon">${icon}</span>
        <span class="exp-title">${title}</span>
        <span class="exp-count">${items.length > 0 ? items.length : ''}</span>
        <span class="exp-chevron">&#9658;</span>
      </summary>
      <div class="exp-body">${bodyHtml}</div>
    </details>`;
  }).join('');

  return { html: `<div class="expandable-sections">${sectionsHtml}</div>` };
}

// ── Component Registry ─────────────────────────────────────────────────

const PART_RENDERERS = {
  text: renderTextPart,
  property_carousel: renderPropertyCarousel,
  comparison_table: renderComparisonTable,
  quick_replies: renderQuickReplies,
  action_buttons: renderActionButtons,
  status_card: renderStatusCard,
  image_gallery: renderImageGallery,
  confirmation_card: renderConfirmationCard,
  error_card: renderErrorCard,
  expandable_sections: renderExpandableSections,
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
