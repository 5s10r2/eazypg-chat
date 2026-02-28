// ─── Build a single property card (v2: match scores + amenity pills) ───
import { escapeHtml, escapeAttr } from '../helpers.js';
import { t } from '../i18n.js';

// ── Score badge config ──
function _scoreBadge(score) {
  const n = parseInt(score, 10);
  if (!n || n <= 0) return '';
  let cls, label;
  if (n >= 80)      { cls = 'pc-score-excellent'; label = 'Excellent'; }
  else if (n >= 60) { cls = 'pc-score-good';      label = 'Good'; }
  else if (n >= 40) { cls = 'pc-score-fair';       label = 'Fair'; }
  else              { return ''; } // Don't show low scores
  return `<span class="pc-score ${cls}">${n}% ${label}</span>`;
}

// ── Amenity pills (top 4, cleaned) ──
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

function _amenityPills(amenitiesStr) {
  if (!amenitiesStr) return '';
  const list = (typeof amenitiesStr === 'string' ? amenitiesStr.split(',') : amenitiesStr)
    .map(a => a.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return '';

  // Deduplicate and pick top 4
  const seen = new Set();
  const pills = [];
  for (const a of list) {
    const key = a.replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    const icon = _AMENITY_ICONS[key] || '';
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    pills.push(`<span class="pc-amenity">${icon ? icon + ' ' : ''}${escapeHtml(label)}</span>`);
    if (pills.length >= 4) break;
  }
  return pills.length
    ? `<div class="pc-amenities">${pills.join('')}</div>`
    : '';
}

export function buildPropertyCardHtml(p, isSingle) {
  const imgTag = p.image
    ? `<img class="property-card-image" src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
       <div class="property-card-image-placeholder" style="display:none">🏠</div>`
    : `<div class="property-card-image-placeholder">🏠</div>`;

  // Gender badge overlay (top-left)
  const badge = p.gender
    ? `<span class="property-card-badge">${escapeHtml(p.gender)}</span>`
    : '';

  // Match score badge (top-right of image)
  const scoreBadge = _scoreBadge(p.score);

  // Amenity pills
  const amenitiesHtml = _amenityPills(p.amenities);

  // Meta parts with dot separator
  const metaItems = [p.distance].filter(Boolean);
  const metaHtml = metaItems.length
    ? `<div class="property-card-meta">${metaItems.map(escapeHtml).join(' <span class="property-card-meta-dot"></span> ')}</div>`
    : '';

  // Strip /mo if we're already appending it in the template
  const rentDisplay = p.price.replace(/\/mo(nth)?/, '').trim();

  const detailsBtn = `<button class="pc-btn ghost" data-action="Tell me more about ${escapeAttr(p.name)}">${t("btn_details")}</button>`;
  const visitBtn   = `<button class="pc-btn dark"  data-action="Schedule a visit to ${escapeAttr(p.name)}">${t("btn_book_visit")}</button>`;
  const linkBtn    = p.link
    ? `<a href="${escapeAttr(p.link)}" target="_blank" rel="noopener" class="pc-btn ghost" style="text-decoration:none">${t("btn_microsite")}</a>`
    : "";

  return `<div class="property-card${isSingle ? ' single' : ''}">
    <div class="property-card-img-wrap">
      ${imgTag}
      ${badge}
      ${scoreBadge}
    </div>
    <div class="property-card-body">
      <div class="property-card-name">${escapeHtml(p.name)}</div>
      ${p.location ? `<div class="property-card-location">📍 ${escapeHtml(p.location)}</div>` : ""}
      ${amenitiesHtml}
      ${rentDisplay ? `<div class="property-card-rent">${escapeHtml(rentDisplay)}<span>/mo</span></div>` : ""}
      ${metaHtml}
      <div class="property-card-actions">
        ${detailsBtn}
        ${visitBtn}
        ${linkBtn}
      </div>
    </div>
  </div>`;
}
