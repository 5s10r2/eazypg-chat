// ─── Quick Reply Chips ───
import { t } from './i18n.js';
import { escapeAttr } from './helpers.js';

export function buildQuickReplies(text, agent) {
  const lower = text.toLowerCase();
  const chips = [];

  if (agent === "broker") {
    // Detect H3-style headers (old agent format: ### 🏠 1. Name or ### 1. Name)
    const hasMultiH3 = /^#{1,3}\s+[^\d\n]*[23456789]\.\s/m.test(text) ||
                       /^#{1,3}\s+[2-9]\ufe0f\u20e3/m.test(text);
    const hasOneH3   = /^#{1,3}\s+[^\d\n]*1\.\s/m.test(text) ||
                       /^#{1,3}\s+1\ufe0f\u20e3/m.test(text);
    // Detect new compact format: **1. Name** / **2. Name**
    const hasMultiBold = /\*\*[23456789]\.\s/.test(text);
    const hasOneBold   = /\*\*1\.\s/.test(text);

    const hasMulti = hasMultiBold || hasMultiH3;
    const hasOne   = (hasOneBold || hasOneH3) && !hasMulti;

    // isQual: ONLY true when the actual qualifying question is shown
    const isQual = lower.includes('quick —') || lower.includes('quick—') ||
                   lower.includes('must-haves from') ||
                   lower.includes('has some great options') ||
                   lower.includes('just share what matters') ||
                   (lower.includes('boys') && lower.includes('girls') && lower.includes('monthly budget'));

    if (isQual) {
      // Qualifying question shown — no chips, let user type freely
    } else if (hasMulti) {
      chips.push({ label: t("chip_details"),      action: "Tell me more about the first property" });
      chips.push({ label: t("chip_book_visit"),   action: "Schedule a visit" });
      chips.push({ label: t("chip_shortlist"),    action: "Shortlist the first property" });
      chips.push({ label: t("chip_compare_top2"), action: "Compare the top 2 properties" });
    } else if (hasOne) {
      chips.push({ label: t("chip_book_visit"),   action: "Schedule a visit" });
      chips.push({ label: t("chip_shortlist"),    action: "Shortlist this property" });
      chips.push({ label: t("chip_see_rooms"),    action: "Show me room options and pricing" });
      chips.push({ label: t("chip_images"),       action: "Show me photos" });
    } else if (lower.includes('shortlist') || lower.includes('saved')) {
      chips.push({ label: t("chip_search"),       action: "Show me properties in Mumbai" });
      chips.push({ label: t("chip_book_visit"),   action: "Schedule a visit" });
    } else if (!hasMulti && !hasOne && (lower.includes('neighborhood') || lower.includes('from what i know') ||
               (lower.includes('area') && lower.includes('search')))) {
      chips.push({ label: t("chip_search_here"),  action: "Search for PGs here" });
      chips.push({ label: t("chip_tell_more"),    action: "Tell me more about the area" });
    } else if (!hasMulti && !hasOne && (
      lower.includes('rent starts from') || lower.includes("here's what we have") ||
      lower.includes('type: flat') || lower.includes('type: pg') ||
      lower.includes('type: hostel') || lower.includes('type: co-living') ||
      (lower.includes('₹') && lower.includes('/month') && lower.includes('📍')))) {
      chips.push({ label: t("chip_book_visit"),   action: "Schedule a visit" });
      chips.push({ label: t("chip_shortlist"),    action: "Shortlist this property" });
      chips.push({ label: t("chip_see_rooms"),    action: "Show me room options and pricing" });
      chips.push({ label: t("chip_compare"),      action: "Compare the top 2 properties" });
    } else if (!hasMulti && !hasOne) {
      chips.push({ label: t("chip_search_pgs"),   action: "Show me properties in Mumbai" });
      chips.push({ label: t("chip_diff_area"),    action: "Search in a different area" });
    }
  } else if (agent === "booking") {
    if (lower.includes('confirmed') || lower.includes('scheduled') || lower.includes('booked')) {
      chips.push({ label: t("chip_my_bookings"),  action: "Show my upcoming visits" });
      chips.push({ label: t("chip_browse_more"),  action: "Show me more properties" });
    }
    if (lower.includes('payment') || lower.includes('token') || lower.includes('link')) {
      chips.push({ label: t("chip_ive_paid"),     action: "I have completed the payment" });
    }
  } else if (agent === "profile") {
    chips.push({ label: t("chip_search_pgs"),    action: "Show me properties in Mumbai" });
  }

  if (!chips.length) return null;
  return chips.map(c =>
    `<button class="qr-chip" data-action="${escapeAttr(c.action)}">${c.label}</button>`
  ).join('');
}
