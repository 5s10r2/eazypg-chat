// ─── Smart Quick Reply Chips (context-aware) ───
import { t } from './i18n.js';
import { escapeAttr } from './helpers.js';

// ---------------------------------------------------------------------------
// Property name extraction from bot responses
// ---------------------------------------------------------------------------

/**
 * Extract numbered properties from search-result listings.
 * Handles: **1. Name** / **1. Name —** / ### 1. Name / ### 🏠 1. Name
 */
function _extractListedProperties(text) {
  const props = [];
  const seen = new Set();

  // Bold format: **1. Name** or **1. Name — …**
  const boldRe = /\*\*(\d+)\.\s+([^*\n]+?)\*\*/g;
  let m;
  while ((m = boldRe.exec(text)) !== null) {
    const num = parseInt(m[1]);
    if (!seen.has(num)) {
      seen.add(num);
      props.push({ num, name: m[2].replace(/\s*[—–\-|]\s*$/, '').trim() });
    }
  }
  if (props.length) return props;

  // H3 format: ### 1. Name or ### 🏠 1. Name
  const h3Re = /^#{1,3}\s+(?:[^\d\n]*?)(\d+)\.\s+(.+?)$/gm;
  while ((m = h3Re.exec(text)) !== null) {
    const num = parseInt(m[1]);
    if (!seen.has(num)) {
      seen.add(num);
      props.push({ num, name: m[2].replace(/\s*[—–\-|]\s*$/, '').trim() });
    }
  }
  return props;
}

/**
 * Extract a single property name from a detail/commute/shortlist response.
 * Looks for first bold text or 'property_name' in quotes.
 */
function _extractSingleName(text) {
  // 'Property Name' in single quotes (from commute/landmark responses)
  let m = text.match(/'([^'\n]{3,50})'/);
  if (m) return m[1].trim();
  // **Property Name** — first bold match (skip numbered ones)
  m = text.match(/\*\*([^*\d][^*\n]{2,40})\*\*/);
  if (m) return m[1].replace(/\s*[—–\-|:]\s*$/, '').trim();
  return null;
}


// ---------------------------------------------------------------------------
// Main chip builder
// ---------------------------------------------------------------------------

export function buildQuickReplies(text, agent) {
  const lower = text.toLowerCase();
  const chips = [];

  if (agent === "broker") {
    // ── Detection patterns ──
    const hasMultiH3 = /^#{1,3}\s+[^\d\n]*[23456789]\.\s/m.test(text) ||
                       /^#{1,3}\s+[2-9]\ufe0f\u20e3/m.test(text);
    const hasOneH3   = /^#{1,3}\s+[^\d\n]*1\.\s/m.test(text) ||
                       /^#{1,3}\s+1\ufe0f\u20e3/m.test(text);
    const hasMultiBold = /\*\*[23456789]\.\s/.test(text);
    const hasOneBold   = /\*\*1\.\s/.test(text);

    const hasMulti = hasMultiBold || hasMultiH3;
    const hasOne   = (hasOneBold || hasOneH3) && !hasMulti;

    const isQual = lower.includes('quick —') || lower.includes('quick—') ||
                   lower.includes('must-haves from') ||
                   lower.includes('has some great options') ||
                   lower.includes('just share what matters') ||
                   (lower.includes('boys') && lower.includes('girls') && lower.includes('monthly budget'));

    // ── Context flags ──
    const isComparison   = lower.includes('comparison') || lower.includes('⚖') ||
                           (lower.includes('compare') && !hasMulti);
    const isCommute      = lower.includes('commute') || lower.includes('🚗') ||
                           lower.includes('🚇') || lower.includes('by car') ||
                           lower.includes('by metro');
    const isVisitFeedback = lower.includes('how was your visit') ||
                            lower.includes('how did the visit go') ||
                            lower.includes('how did it go');

    const props = _extractListedProperties(text);

    // ── Chip generation by context ──

    if (isQual) {
      // Qualifying question — no chips, let user type freely

    } else if (isVisitFeedback) {
      // Post-visit follow-up — reaction chips
      chips.push({ label: t("chip_loved_it"),   action: "I loved it! I want to book this property" });
      chips.push({ label: t("chip_was_okay"),   action: "It was okay, but I'm not sure yet" });
      chips.push({ label: t("chip_not_for_me"), action: "Not for me. The property didn't match my expectations" });

    } else if (isComparison && props.length >= 2) {
      // After comparison — offer visit/shortlist for specific properties
      chips.push({ label: `📅 Visit #${props[0].num}`,  action: `Schedule a visit for ${props[0].name}` });
      chips.push({ label: `📅 Visit #${props[1].num}`,  action: `Schedule a visit for ${props[1].name}` });
      chips.push({ label: t("chip_more_options"),        action: "Show me more options" });

    } else if (hasMulti && props.length >= 2) {
      // Multiple search results — smart chips with property names
      chips.push({ label: `📋 #${props[0].num} Details`, action: `Tell me more about ${props[0].name}` });
      chips.push({ label: `📅 Visit #${props[0].num}`,   action: `Schedule a visit for ${props[0].name}` });
      chips.push({
        label: `⚖️ #${props[0].num} vs #${props[1].num}`,
        action: `Compare ${props[0].name} and ${props[1].name}`,
      });
      if (props.length >= 3) {
        chips.push({ label: `📋 #${props[2].num} Details`, action: `Tell me more about ${props[2].name}` });
      } else {
        chips.push({ label: t("chip_shortlist"), action: `Shortlist ${props[0].name}` });
      }

    } else if (hasMulti) {
      // Fallback generic multi-property (name extraction failed)
      chips.push({ label: t("chip_details"),      action: "Tell me more about the first property" });
      chips.push({ label: t("chip_book_visit"),   action: "Schedule a visit" });
      chips.push({ label: t("chip_shortlist"),    action: "Shortlist the first property" });
      chips.push({ label: t("chip_compare_top2"), action: "Compare the top 2 properties" });

    } else if (isCommute) {
      // After commute estimation — offer visit/shortlist
      const name = _extractSingleName(text);
      chips.push({ label: t("chip_book_visit"), action: name ? `Schedule a visit for ${name}` : "Schedule a visit" });
      chips.push({ label: t("chip_shortlist"),  action: name ? `Shortlist ${name}` : "Shortlist this property" });
      chips.push({ label: t("chip_more_options"), action: "Show me more options" });

    } else if (hasOne) {
      // Single property result
      const name = props.length === 1 ? props[0].name : null;
      chips.push({ label: t("chip_book_visit"), action: name ? `Schedule a visit for ${name}` : "Schedule a visit" });
      chips.push({ label: t("chip_shortlist"),  action: name ? `Shortlist ${name}` : "Shortlist this property" });
      chips.push({ label: t("chip_see_rooms"),  action: name ? `Show me room options for ${name}` : "Show me room options and pricing" });
      chips.push({ label: t("chip_images"),     action: name ? `Show me photos of ${name}` : "Show me photos" });

    } else if (lower.includes('shortlist') || lower.includes('saved')) {
      const name = _extractSingleName(text);
      chips.push({ label: t("chip_book_visit"), action: name ? `Schedule a visit for ${name}` : "Schedule a visit" });
      chips.push({ label: t("chip_search"),     action: "Show me more properties" });

    } else if (lower.includes('neighborhood') || lower.includes('from what i know') ||
               (lower.includes('area') && lower.includes('search'))) {
      chips.push({ label: t("chip_search_here"), action: "Search for PGs here" });
      chips.push({ label: t("chip_tell_more"),   action: "Tell me more about the area" });

    } else if (lower.includes('rent starts from') || lower.includes("here's what we have") ||
               lower.includes('type: flat') || lower.includes('type: pg') ||
               lower.includes('type: hostel') || lower.includes('type: co-living') ||
               (lower.includes('₹') && lower.includes('/month') && lower.includes('📍'))) {
      // Single property detail view
      const name = _extractSingleName(text);
      chips.push({ label: t("chip_book_visit"), action: name ? `Schedule a visit for ${name}` : "Schedule a visit" });
      chips.push({ label: t("chip_shortlist"),  action: name ? `Shortlist ${name}` : "Shortlist this property" });
      chips.push({ label: t("chip_see_rooms"),  action: name ? `Show me room options for ${name}` : "Show me room options and pricing" });
      chips.push({ label: t("chip_commute"),    action: name ? `How far is ${name} from my office?` : "How far is this from my office?" });

    } else {
      chips.push({ label: t("chip_search_pgs"), action: "Show me properties in Mumbai" });
      chips.push({ label: t("chip_diff_area"),  action: "Search in a different area" });
    }

  } else if (agent === "booking") {
    if (lower.includes('confirmed') || lower.includes('scheduled') || lower.includes('booked')) {
      chips.push({ label: t("chip_my_bookings"), action: "Show my upcoming visits" });
      chips.push({ label: t("chip_browse_more"), action: "Show me more properties" });
    }
    if (lower.includes('payment') || lower.includes('token') || lower.includes('link')) {
      chips.push({ label: t("chip_ive_paid"), action: "I have completed the payment" });
    }

  } else if (agent === "profile") {
    chips.push({ label: t("chip_search_pgs"), action: "Show me properties in Mumbai" });
  }

  if (!chips.length) return null;
  return chips.map(c =>
    `<button class="qr-chip" data-action="${escapeAttr(c.action)}">${c.label}</button>`
  ).join('');
}
