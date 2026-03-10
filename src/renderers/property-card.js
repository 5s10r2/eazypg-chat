// ─── Build a single property card (v3: context-aware, match scores + amenity pills) ───
import { escapeHtml, escapeAttr } from '../helpers.js';
import { t } from '../i18n.js';

// ── Score badge ──
function _scoreBadge(score) {
  const n = parseInt(score, 10);
  if (!n || n <= 0) return '';
  let cls, label;
  if (n >= 80)      { cls = 'pc-score-excellent'; label = 'Excellent'; }
  else if (n >= 60) { cls = 'pc-score-good';      label = 'Good'; }
  else if (n >= 40) { cls = 'pc-score-fair';      label = 'Fair'; }
  else              { cls = 'pc-score-low';        label = 'Low match'; }
  return `<span class="pc-score ${cls}">${n}% ${label}</span>`;
}

// ── Amenity pills ──
const _AMENITY_ICONS = {
  'wifi': '📶', 'internet': '📶', 'wi-fi': '📶',
  'ac': '❄️', 'air conditioning': '❄️', 'air conditioner': '❄️',
  'meals': '🍽️', 'food': '🍽️', 'tiffin': '🍽️', 'mess': '🍽️',
  'laundry': '👕', 'washing machine': '👕',
  'parking': '🅿️', 'bike parking': '🅿️', 'two wheeler parking': '🅿️',
  'gym': '💪', 'gymnasium': '💪',
  'tv': '📺', 'television': '📺',
  'security': '🔒', 'cctv': '🔒',
  'hot water': '🚿', 'geyser': '🚿',
  'fridge': '🧊', 'refrigerator': '🧊',
  'power backup': '🔋',
  'housekeeping': '🧹', 'cleaning': '🧹',
};

// showAll: true for detail/single views, false caps at 4
function _amenityPills(amenitiesStr, showAll = false) {
  if (!amenitiesStr) return '';
  const list = (typeof amenitiesStr === 'string' ? amenitiesStr.split(',') : amenitiesStr)
    .map(a => a.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return '';

  const seen = new Set();
  const pills = [];
  for (const a of list) {
    const key = a.replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    const icon = _AMENITY_ICONS[key] || '';
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    pills.push(`<span class="pc-amenity">${icon ? icon + ' ' : ''}${escapeHtml(label)}</span>`);
    if (!showAll && pills.length >= 4) break;
  }

  // Show overflow indicator when capped
  if (!showAll && list.length > 4 && pills.length === 4) {
    pills.push(`<span class="pc-amenity pc-amenity-more">+${list.length - 4}</span>`);
  }

  return pills.length
    ? `<div class="pc-amenities">${pills.join('')}</div>`
    : '';
}

// ── Main card builder ──
// context: 'search' (default) | 'shortlist' | 'detail'
export function buildPropertyCardHtml(p, isSingle, context = 'search') {
  const displayName = (p.name || 'Unnamed Property').trim();

  const imgTag = p.image
    ? `<img class="property-card-image" src="${escapeAttr(p.image)}" alt="${escapeAttr(displayName)}" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
       <div class="property-card-image-placeholder" style="display:none">🏠</div>`
    : `<div class="property-card-image-placeholder">🏠</div>`;

  // Gender badge (top-left) — always shown; "Any" when unspecified
  const genderLabel = (p.gender || '').trim() || 'Any';
  const genderBadge = `<span class="property-card-badge">${escapeHtml(genderLabel)}</span>`;

  // Saved badge (bottom-left, shortlist context only)
  const savedBadge = context === 'shortlist'
    ? `<span class="pc-saved-badge">💾 Saved${p.saved_at ? ' · ' + escapeHtml(p.saved_at) : ''}</span>`
    : '';

  // Score badge (top-right) — hidden for shortlist (user already chose this property)
  const scoreBadge = context !== 'shortlist' ? _scoreBadge(p.score) : '';

  // Amenities — show all for detail/single, cap at 4 otherwise
  const amenitiesHtml = _amenityPills(p.amenities, context === 'detail' || isSingle);

  // Distance meta row
  const metaItems = [p.distance].filter(Boolean);
  const metaHtml = metaItems.length
    ? `<div class="property-card-meta">${metaItems.map(escapeHtml).join(' <span class="property-card-meta-dot"></span> ')}</div>`
    : '';

  // Normalize price: strip time-unit suffixes, always re-append /mo
  const rentDisplay = p.price
    ? p.price
        .replace(/\s*\/\s*(month|mo|week|day)/gi, '')
        .replace(/\s*per\s*(month|day|week)/gi, '')
        .trim()
    : '';

  // Taller image for detail/single views
  const imgWrapClass = (context === 'detail' || isSingle)
    ? 'property-card-img-wrap img-tall'
    : 'property-card-img-wrap';

  // Context-specific action buttons — always exactly 2, no crowding
  let actionsHtml;
  if (context === 'shortlist') {
    actionsHtml =
      `<button class="pc-btn dark" data-action="Schedule a visit to ${escapeAttr(displayName)}">${t('btn_book_visit')}</button>` +
      `<button class="pc-btn danger-ghost" data-action="Remove ${escapeAttr(displayName)} from my shortlist">Remove</button>`;
  } else if (context === 'detail') {
    const linkBtn = p.link
      ? `<a href="${escapeAttr(p.link)}" target="_blank" rel="noopener" class="pc-btn ghost" style="text-decoration:none">${t('btn_microsite')}</a>`
      : `<button class="pc-btn ghost" data-action="Tell me more about ${escapeAttr(displayName)}">${t('btn_details')}</button>`;
    actionsHtml =
      `<button class="pc-btn dark" data-action="Schedule a visit to ${escapeAttr(displayName)}">${t('btn_book_visit')}</button>` +
      linkBtn;
  } else {
    // search (default) — 2 clean buttons, no microsite clutter
    actionsHtml =
      `<button class="pc-btn ghost" data-action="Tell me more about ${escapeAttr(displayName)}">${t('btn_details')}</button>` +
      `<button class="pc-btn dark"  data-action="Schedule a visit to ${escapeAttr(displayName)}">${t('btn_book_visit')}</button>`;
  }

  return `<div class="property-card${isSingle ? ' single' : ''}">
    <div class="${imgWrapClass}">
      ${imgTag}
      ${genderBadge}
      ${savedBadge}
      ${scoreBadge}
    </div>
    <div class="property-card-body">
      <div class="property-card-name" title="${escapeAttr(displayName)}">${escapeHtml(displayName)}</div>
      ${p.location ? `<div class="property-card-location">📍 ${escapeHtml(p.location)}</div>` : ''}
      ${amenitiesHtml}
      ${rentDisplay ? `<div class="property-card-rent">${escapeHtml(rentDisplay)}<span>/mo</span></div>` : ''}
      ${metaHtml}
      <div class="property-card-actions">
        ${actionsHtml}
      </div>
    </div>
  </div>`;
}
