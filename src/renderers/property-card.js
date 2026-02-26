// ─── Build a single property card ───
import { escapeHtml, escapeAttr } from '../helpers.js';
import { t } from '../i18n.js';

export function buildPropertyCardHtml(p, isSingle) {
  const imgContent = p.image
    ? `<img class="property-card-image" src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
       <div class="property-card-image-placeholder" style="display:none">🏠</div>`
    : `<div class="property-card-image-placeholder">🏠</div>`;

  const metaParts = [p.gender, p.distance].filter(Boolean).join(' · ');

  // Strip /mo if we're already appending it in the template
  const rentDisplay = p.price.replace(/\/mo(nth)?/, '').trim();

  const detailsBtn = `<button class="pc-btn ghost" data-action="Tell me more about ${escapeAttr(p.name)}">${t("btn_details")}</button>`;
  const visitBtn   = `<button class="pc-btn dark"  data-action="Schedule a visit to ${escapeAttr(p.name)}">${t("btn_book_visit")}</button>`;
  const linkBtn    = p.link
    ? `<a href="${escapeAttr(p.link)}" target="_blank" rel="noopener" class="pc-btn ghost" style="text-decoration:none">${t("btn_microsite")}</a>`
    : "";

  return `<div class="property-card${isSingle ? ' single' : ''}">
    ${imgContent}
    <div class="property-card-body">
      <div class="property-card-name">${escapeHtml(p.name)}</div>
      ${p.location ? `<div class="property-card-location">📍 ${escapeHtml(p.location)}</div>` : ""}
      ${rentDisplay ? `<div class="property-card-rent">${escapeHtml(rentDisplay)}<span>/mo</span></div>` : ""}
      ${metaParts  ? `<div class="property-card-meta">${escapeHtml(metaParts)}</div>` : ""}
      <div class="property-card-actions">
        ${detailsBtn}
        ${visitBtn}
        ${linkBtn}
      </div>
    </div>
  </div>`;
}
