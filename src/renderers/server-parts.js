// ─── Render from Server Parts (structured output contract) ───
import { marked } from 'marked';
import { nextCarouselSeq } from '../config.js';
import { escapeHtml } from '../helpers.js';
import { t } from '../i18n.js';
import { buildPropertyCardHtml } from './property-card.js';

export function renderFromServerParts(serverParts) {
  const priceRe = /(₹[\d,]+(?:\s*(?:\/\s*(?:month|mo|day)))?)/g;
  const htmlParts = [];

  for (const part of serverParts) {
    if (part.type === "text") {
      let h = marked.parse(part.markdown || "");
      h = h.replace(priceRe, '<span class="price-inline">$1</span>');
      if (h.trim()) htmlParts.push({ html: `<div class="msg-content">${h}</div>` });

    } else if (part.type === "property_carousel") {
      const props = (part.properties || []).map((p, i) => ({
        num: i + 1,
        name: p.name || "",
        price: p.rent || "",
        location: p.location || "",
        gender: p.gender || "",
        distance: p.distance || "",
        image: p.image || "",
        link: p.link || "",
      }));
      if (!props.length) continue;

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
      htmlParts.push({ html: carouselHtml });

    } else if (part.type === "comparison_table") {
      const headers = part.headers || [];
      const rows = part.rows || [];
      if (headers.length < 2 || rows.length < 1) continue;

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

      htmlParts.push({ html: `<div class="compare-card">
        <div class="compare-card-header">${t("comparison_header")}</div>
        <table class="compare-tbl">
          <thead><tr>${colHeaders}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
        ${winnerHtml}
      </div>` });
    }
  }

  return htmlParts.length ? htmlParts : null;
}
