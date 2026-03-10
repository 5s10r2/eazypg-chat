// ─── Rich Message Renderer ───
import { safeParse } from '../sanitize.js';
import { nextCarouselSeq } from '../config.js';
import { t } from '../i18n.js';
import { buildPropertyCardHtml } from './property-card.js';
import { renderWithCompareTable } from './compare-card.js';

export function renderRichMessage(text, agent) {
  // 1. Detect pipe-table → comparison scorecard
  const pipeLineCount = text.split('\n').filter(l => /\|.*\|/.test(l)).length;
  if (pipeLineCount >= 3) {
    return renderWithCompareTable(text);
  }

  // 2. Detect compact property format: **N. Name**\n📍 ...
  const compactPattern = /\*\*(\d+)\.\s+(.+?)\*\*\s*\n(📍.+)/gm;
  const compactMatches = [...text.matchAll(compactPattern)];
  if (compactMatches.length >= 1) {
    return renderPropertyCarousel(text, compactMatches, false);
  }

  // 3. Detect legacy bold property format: **N. Name** — ₹X
  const legacyPattern = /\*\*(\d+)\.\s*(.+?)\*\*\s*[—–-]\s*(₹[\d,]+(?:\/\s*(?:month|mo))?)/g;
  const legacyMatches = [...text.matchAll(legacyPattern)];
  if (legacyMatches.length >= 1) {
    return renderPropertyCarousel(text, legacyMatches, true);
  }

  // 3b. Detect old H3-header property format: ### 🏠 N. Name or ### N. Name
  const h3Pattern = /^#{1,3}\s+[^\d\n]*(\d+)\.\s+(.+)$/gm;
  const h3Matches = [...text.matchAll(h3Pattern)];
  if (h3Matches.length >= 1) {
    const enriched = h3Matches.map((m, i) => {
      const blockStart = m.index;
      const nextMatch  = h3Matches[i + 1];
      const blockEnd   = nextMatch ? nextMatch.index : text.length;
      const block      = text.slice(blockStart, blockEnd);
      const priceLine = block.match(/💰[^\n]*(₹[\d,]+)/) ||
                        block.match(/[Rr]ent[^\n]*(₹[\d,]+)/);
      const rentFall  = block.match(/₹[\d,]{4,}(?:\/month|\/mo)?/);
      const rentVal   = priceLine ? priceLine[1] : (rentFall ? rentFall[0] : "");
      const locM      = block.match(/📍\s*([^\n]+)/);
      return Object.assign(m, { 3: rentVal, _location: locM ? locM[1] : "" });
    });
    return renderPropertyCarousel(text, enriched, true);
  }

  // 3c. Detect keycap-number H3 format: ### 1️⃣ Name
  const h3KeycapPattern = /^#{1,3}\s+(\d)\ufe0f\u20e3\s+(.+)$/gm;
  const h3KeycapMatches = [...text.matchAll(h3KeycapPattern)];
  if (h3KeycapMatches.length >= 1) {
    const enriched = h3KeycapMatches.map((m, i) => {
      const blockStart = m.index;
      const nextMatch  = h3KeycapMatches[i + 1];
      const blockEnd   = nextMatch ? nextMatch.index : text.length;
      const block      = text.slice(blockStart, blockEnd);
      const priceLine = block.match(/💰[^\n]*(₹[\d,]+)/) ||
                        block.match(/[Rr]ent[^\n]*(₹[\d,]+)/);
      const rentFall  = block.match(/₹[\d,]{4,}(?:\/month|\/mo)?/);
      const rentVal   = priceLine ? priceLine[1] : (rentFall ? rentFall[0] : "");
      const locM      = block.match(/📍\s*([^\n]+)/);
      return Object.assign(m, { 3: rentVal, _location: locM ? locM[1] : "" });
    });
    return renderPropertyCarousel(text, enriched, true);
  }

  // 4. Default markdown — single Part, single bubble
  let html = safeParse(text);
  html = html.replace(/(₹[\d,]+(?:\s*(?:\/\s*(?:month|mo|day))|(?:\s*per\s*(?:month|day)))?)/g,
    '<span class="price-inline">$1</span>');
  return [{ html: `<div class="msg-content">${html}</div>` }];
}

// ─── Extract amenities from a property text block ───
function _extractAmenities(block) {
  const knownKeywords = [
    'wifi', 'wi-fi', 'ac', 'air conditioning', 'meals', 'food', 'laundry',
    'parking', 'gym', 'tv', 'security', 'cctv', 'hot water', 'geyser',
    'fridge', 'power backup', 'housekeeping', 'attached bathroom', 'attached bath',
  ];
  const found = [];
  const blockLower = block.toLowerCase();

  // Scan for known keywords
  for (const kw of knownKeywords) {
    if (blockLower.includes(kw) && !found.includes(kw)) found.push(kw);
  }

  // Explicit "Amenities: ..." line
  const amenLine = block.match(/[Aa]menitie?s?[:\s]+([^\n]+)/);
  if (amenLine) {
    amenLine[1].split(/[,|;]+/).forEach(a => {
      const clean = a.trim().toLowerCase();
      if (clean && !found.includes(clean)) found.push(clean);
    });
  }

  return found.join(', ');
}

// ─── Render Property Carousel (from matched listings) ───
function renderPropertyCarousel(text, matches, isLegacy) {
  const properties = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const num  = parseInt(match[1]);
    const name = match[2].trim();

    const blockStart = match.index;
    const blockEnd   = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const block      = text.slice(blockStart, blockEnd);

    let price = "", location = "", gender = "", distance = "";

    if (isLegacy) {
      price    = match[3] ? match[3].trim() : "";
      if (!price) {
        const pl = block.match(/💰[^\n]*(₹[\d,]+)/) || block.match(/[Rr]ent[^\n]*(₹[\d,]+)/);
        if (pl) price = pl[1];
      }
      const firstLine = block.replace(match[0], '').split('\n').find(l => l.trim());
      location = firstLine ? firstLine.replace(/^📍\s*/, '').split('·')[0].trim() : "";
    } else {
      const metaLine = match[3].trim();
      const parts    = metaLine.replace(/^📍\s*/, '').split('·').map(p => p.trim());
      location = parts[0] || "";
      const pm = metaLine.match(/₹[\d,]+(?:\/mo|\/month)?/);
      price    = pm ? pm[0].replace(/\/month/, '/mo') : "";
      gender   = parts.find(p => /^(Any|Boys|Girls|All Boys|All Girls|Mixed)/i.test(p)) || "";
      distance = parts.find(p => /~?[\d.]+\s*km/i.test(p)) || "";
    }

    const imgM  = block.match(/(?:Image:\s*|!\[[^\]]*\]\()(https?:\/\/[^\s)]+)/i);
    const linkM = block.match(/Link:\s*(https?:\/\/\S+)/i);
    const image = imgM  ? imgM[1]  : "";
    const link  = linkM ? linkM[1] : "";

    properties.push({ num, name, price, location, gender, distance, image, link, amenities: _extractAmenities(block) });
  }

  const preText = text.slice(0, matches[0].index).trim();

  const lastMatchStart = matches[matches.length - 1].index;
  const fromLast       = text.slice(lastMatchStart);
  const closeSepM      = fromLast.match(/\n[-*]{3,}\s*(?:\n|$)/);
  let postText = "";
  if (closeSepM) {
    const postStart = lastMatchStart + closeSepM.index + closeSepM[0].length;
    postText = text.slice(postStart).trim();
  } else {
    const doubleNl = fromLast.match(/\n\n(?!\s*(?:📍|💰|👥|🏷|#{1,3}))/);
    postText = doubleNl ? fromLast.slice(doubleNl.index).trim() : "";
  }
  postText = postText.replace(/^(?:Image|Link|Match|Distance|For|Type):.*$/gim, '').replace(/\n{3,}/g, '\n\n').trim();

  const isSingle = properties.length === 1;
  const cardsHtml = properties.map(p => buildPropertyCardHtml(p, isSingle)).join('');
  const cid = nextCarouselSeq();

  let carouselHtml;
  if (isSingle) {
    carouselHtml = `<div class="single-card-wrap">${cardsHtml}</div>`;
  } else {
    carouselHtml = `
      <div class="carousel-wrapper">
        <span class="carousel-counter" id="cc${cid}">1 / ${properties.length}</span>
        <div class="property-carousel" id="pc${cid}" data-total="${properties.length}">${cardsHtml}</div>
      </div>
      <span class="carousel-view-all" data-action="Show me all ${properties.length} properties">${t("view_all", { count: properties.length })}</span>
    `;
  }

  let preHtml  = preText  ? safeParse(preText)  : "";
  let postHtml = postText ? safeParse(postText) : "";
  [preHtml, postHtml] = [preHtml, postHtml].map(h =>
    h.replace(/(₹[\d,]+(?:\s*(?:\/\s*(?:month|mo|day)))?)/g, '<span class="price-inline">$1</span>')
  );

  const parts = [];
  if (preHtml)  parts.push({ html: `<div class="msg-content">${preHtml}</div>` });
  parts.push({ html: carouselHtml });
  if (postHtml) parts.push({ html: `<div class="msg-content">${postHtml}</div>` });
  return parts;
}
