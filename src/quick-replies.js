// ─── Smart Quick Reply Chips (parts-first, context-aware) ───
import { t } from './i18n.js';
import { escapeAttr } from './helpers.js';
import { ACCOUNT_VALUES, FALLBACK_ACCOUNT_VALUES } from './config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _city() {
  const av = ACCOUNT_VALUES || FALLBACK_ACCOUNT_VALUES;
  return (av?.city || av?.cities || av?.preferred_city || '').split(',')[0].trim();
}

function _searchAction() {
  const city = _city();
  return city ? `Show me PGs in ${city}` : 'Show me PGs near me';
}

function _chip(label, action) {
  return `<button class="qr-chip" data-action="${escapeAttr(action)}">${label}</button>`;
}

function _render(chips) {
  if (!chips || !chips.length) return null;
  return chips.map(c => _chip(c.label, c.action)).join('');
}

// ---------------------------------------------------------------------------
// Text-based fallback helpers (kept for restores / no-parts path)
// ---------------------------------------------------------------------------

function _extractListedProperties(text) {
  const props = [];
  const seen = new Set();
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

function _extractSingleName(text) {
  let m = text.match(/'([^'\n]{3,50})'/);
  if (m) return m[1].trim();
  m = text.match(/\*\*([^*\d][^*\n]{2,40})\*\*/);
  if (m) return m[1].replace(/\s*[—–\-|:]\s*$/, '').trim();
  return null;
}


// ---------------------------------------------------------------------------
// Parts-first chip generation
// ---------------------------------------------------------------------------

function _chipsFromParts(serverParts, agent) {
  if (!serverParts || !serverParts.length) return null;

  const types = new Set(serverParts.map(p => p.type));

  // Error card — no chips, user needs to retry, not pick an action
  if (types.has('error_card')) return [];

  // Confirmation card — has its own action buttons, chips would be redundant
  if (types.has('confirmation_card')) return [];

  // Property carousel — most common, most context-dependent
  if (types.has('property_carousel')) {
    const part = serverParts.find(p => p.type === 'property_carousel');
    const props = part.properties || [];
    const context = part.context || 'search';

    if (!props.length) {
      // No results
      return [
        { label: '🔍 Try Different Area',    action: 'Search in a different area' },
        { label: '⚙️ Adjust Filters',        action: 'Let me adjust my preferences' },
        { label: `🔍 ${t('chip_search_pgs')}`, action: _searchAction() },
      ];
    }

    if (context === 'shortlist') {
      if (props.length === 1) {
        const name = props[0].name || 'this property';
        return [
          { label: '📅 Book a Visit',          action: `Schedule a visit for ${name}` },
          { label: '❌ Remove from Shortlist', action: `Remove ${name} from my shortlist` },
          { label: '🔍 Find More PGs',         action: _searchAction() },
        ];
      }
      // Multiple shortlisted properties — offer visits for first 2
      const chips = [];
      const shown = props.slice(0, 2);
      shown.forEach(p => {
        chips.push({ label: `📅 Visit ${p.name || '#' + (props.indexOf(p) + 1)}`, action: `Schedule a visit for ${p.name}` });
      });
      chips.push({ label: '🔍 Find More PGs', action: _searchAction() });
      return chips;
    }

    if (context === 'detail' || props.length === 1) {
      const name = props[0].name || 'this property';
      return [
        { label: t('chip_book_visit'),   action: `Schedule a visit for ${name}` },
        { label: t('chip_shortlist'),    action: `Shortlist ${name}` },
        { label: t('chip_see_rooms'),    action: `Show me room options for ${name}` },
        { label: t('chip_images'),       action: `Show me photos of ${name}` },
      ];
    }

    // Multi-property search results (context === 'search', 2+ props)
    const p0 = props[0], p1 = props[1];
    const chips = [
      { label: `📋 #1 Details`,          action: `Tell me more about ${p0.name}` },
      { label: `📅 Visit #1`,            action: `Schedule a visit for ${p0.name}` },
      { label: `⚖️ #1 vs #2`,           action: `Compare ${p0.name} and ${p1.name}` },
    ];
    if (props.length >= 3) {
      chips.push({ label: `📋 #3 Details`, action: `Tell me more about ${props[2].name}` });
    } else {
      chips.push({ label: t('chip_shortlist'), action: `Shortlist ${p0.name}` });
    }
    return chips;
  }

  // Status card — depends on what action it's celebrating
  if (types.has('status_card')) {
    const part = serverParts.find(p => p.type === 'status_card');
    const icon = part.icon || '';
    const hasCelebration = !!(part.celebration);

    if (hasCelebration) {
      if (icon === 'star') {
        // Shortlisted
        return [
          { label: '📋 View My Shortlist', action: 'Show my shortlisted properties' },
          { label: '🔍 Find More PGs',     action: _searchAction() },
        ];
      }
      // Visit confirmed / booking confirmed
      return [
        { label: '📅 My Upcoming Visits', action: 'Show my upcoming visits' },
        { label: '🔍 Find More PGs',      action: _searchAction() },
      ];
    }
    // Status card without celebration (e.g. "profile updated")
    return [
      { label: '💾 My Shortlist',   action: 'Show my shortlisted properties' },
      { label: '📅 My Visits',      action: 'Show my upcoming visits' },
      { label: '🔍 Find More PGs',  action: _searchAction() },
    ];
  }

  // Comparison table
  if (types.has('comparison_table')) {
    const part = serverParts.find(p => p.type === 'comparison_table');
    const winner = part.winner;
    const chips = [];
    if (winner) {
      chips.push({ label: `📅 Visit ${winner}`, action: `Schedule a visit for ${winner}` });
      chips.push({ label: `💾 Shortlist ${winner}`, action: `Shortlist ${winner}` });
    } else {
      chips.push({ label: t('chip_book_visit'),   action: 'Schedule a visit' });
    }
    chips.push({ label: '⚖️ Compare Others',    action: 'Compare different properties' });
    chips.push({ label: '🔍 Show More Options', action: _searchAction() });
    return chips;
  }

  // Image gallery
  if (types.has('image_gallery')) {
    const part = serverParts.find(p => p.type === 'image_gallery');
    const name = part.property_name || 'this property';
    return [
      { label: t('chip_book_visit'), action: `Schedule a visit for ${name}` },
      { label: t('chip_shortlist'),  action: `Shortlist ${name}` },
      { label: '💬 Ask a Question',  action: `What can you tell me about ${name}?` },
    ];
  }

  // Quick replies from backend (already structured chips)
  if (types.has('quick_replies')) {
    // These are rendered directly from parts in message-builder — skip chips
    return [];
  }

  // Parts present but no recognized type for chip generation
  return null;
}


// ---------------------------------------------------------------------------
// Text-based chip generation (fallback when no parts available)
// ---------------------------------------------------------------------------

function _chipsFromText(text, agent) {
  const lower = text.toLowerCase();
  const chips = [];

  if (agent === 'broker') {
    const hasMultiBold = /\*\*[23456789]\.\s/.test(text);
    const hasOneBold   = /\*\*1\.\s/.test(text);
    const hasMultiH3   = /^#{1,3}\s+[^\d\n]*[23456789]\.\s/m.test(text);
    const hasOneH3     = /^#{1,3}\s+[^\d\n]*1\.\s/m.test(text);

    const hasMulti = hasMultiBold || hasMultiH3;
    const hasOne   = (hasOneBold || hasOneH3) && !hasMulti;

    const isQual = lower.includes('quick —') || lower.includes('quick—') ||
                   lower.includes('must-haves from') ||
                   lower.includes('has some great options') ||
                   lower.includes('just share what matters') ||
                   (lower.includes('boys') && lower.includes('girls') && lower.includes('monthly budget'));

    const isComparison  = lower.includes('comparison') || lower.includes('⚖') ||
                          (lower.includes('compare') && !hasMulti);
    const isCommute     = lower.includes('commute') || lower.includes('🚗') ||
                          lower.includes('🚇') || lower.includes('by car') ||
                          lower.includes('by metro');
    const isVisitFeedback = lower.includes('how was your visit') ||
                            lower.includes('how did the visit go') ||
                            lower.includes('how did it go');

    const props = _extractListedProperties(text);

    if (isQual) {
      // Qualifying question — guide the user with common answers
      chips.push({ label: '👔 Working Professional', action: "I'm a working professional" });
      chips.push({ label: '🎓 Student',               action: "I'm a student" });
      chips.push({ label: '⚡ Need ASAP',             action: 'I need to move in within 2 weeks' });
      chips.push({ label: '🔍 Just Exploring',        action: "I'm just exploring options for now" });

    } else if (isVisitFeedback) {
      chips.push({ label: t('chip_loved_it'),   action: "I loved it! I want to book this property" });
      chips.push({ label: t('chip_was_okay'),   action: "It was okay, but I'm not sure yet" });
      chips.push({ label: t('chip_not_for_me'), action: "Not for me. The property didn't match my expectations" });

    } else if (isComparison && props.length >= 2) {
      chips.push({ label: `📅 Visit #${props[0].num}`, action: `Schedule a visit for ${props[0].name}` });
      chips.push({ label: `📅 Visit #${props[1].num}`, action: `Schedule a visit for ${props[1].name}` });
      chips.push({ label: t('chip_more_options'),       action: 'Show me more options' });

    } else if (hasMulti && props.length >= 2) {
      chips.push({ label: `📋 #${props[0].num} Details`, action: `Tell me more about ${props[0].name}` });
      chips.push({ label: `📅 Visit #${props[0].num}`,   action: `Schedule a visit for ${props[0].name}` });
      chips.push({ label: `⚖️ #${props[0].num} vs #${props[1].num}`, action: `Compare ${props[0].name} and ${props[1].name}` });
      if (props.length >= 3) {
        chips.push({ label: `📋 #${props[2].num} Details`, action: `Tell me more about ${props[2].name}` });
      } else {
        chips.push({ label: t('chip_shortlist'), action: `Shortlist ${props[0].name}` });
      }

    } else if (hasMulti) {
      chips.push({ label: t('chip_details'),      action: 'Tell me more about the first property' });
      chips.push({ label: t('chip_book_visit'),   action: 'Schedule a visit' });
      chips.push({ label: t('chip_shortlist'),    action: 'Shortlist the first property' });
      chips.push({ label: t('chip_compare_top2'), action: 'Compare the top 2 properties' });

    } else if (isCommute) {
      const name = _extractSingleName(text);
      chips.push({ label: t('chip_book_visit'),   action: name ? `Schedule a visit for ${name}` : 'Schedule a visit' });
      chips.push({ label: t('chip_shortlist'),    action: name ? `Shortlist ${name}` : 'Shortlist this property' });
      chips.push({ label: t('chip_more_options'), action: 'Show me more options' });

    } else if (hasOne) {
      const name = props.length === 1 ? props[0].name : _extractSingleName(text);
      chips.push({ label: t('chip_book_visit'), action: name ? `Schedule a visit for ${name}` : 'Schedule a visit' });
      chips.push({ label: t('chip_shortlist'),  action: name ? `Shortlist ${name}` : 'Shortlist this property' });
      chips.push({ label: t('chip_see_rooms'),  action: name ? `Show me room options for ${name}` : 'Show me room options and pricing' });
      chips.push({ label: t('chip_images'),     action: name ? `Show me photos of ${name}` : 'Show me photos' });

    } else if (lower.includes('shortlist') || lower.includes('saved')) {
      chips.push({ label: t('chip_book_visit'), action: 'Schedule a visit' });
      chips.push({ label: '🔍 Find More PGs',   action: _searchAction() });

    } else if (lower.includes('neighborhood') || lower.includes('from what i know') ||
               (lower.includes('area') && lower.includes('search'))) {
      chips.push({ label: t('chip_search_here'), action: 'Search for PGs here' });
      chips.push({ label: t('chip_tell_more'),   action: 'Tell me more about the area' });

    } else if (lower.includes('rent starts from') || lower.includes("here's what we have") ||
               lower.includes('type: flat') || lower.includes('type: pg') ||
               lower.includes('type: hostel') || lower.includes('type: co-living') ||
               (lower.includes('₹') && lower.includes('/month') && lower.includes('📍'))) {
      const name = _extractSingleName(text);
      chips.push({ label: t('chip_book_visit'), action: name ? `Schedule a visit for ${name}` : 'Schedule a visit' });
      chips.push({ label: t('chip_shortlist'),  action: name ? `Shortlist ${name}` : 'Shortlist this property' });
      chips.push({ label: t('chip_see_rooms'),  action: name ? `Show me room options for ${name}` : 'Show me room options and pricing' });
      chips.push({ label: t('chip_commute'),    action: name ? `How far is ${name} from my office?` : 'How far is this from my office?' });

    } else {
      chips.push({ label: t('chip_search_pgs'), action: _searchAction() });
      chips.push({ label: t('chip_diff_area'),  action: 'Search in a different area' });
    }

  } else if (agent === 'booking') {
    if (lower.includes('confirmed') || lower.includes('scheduled') || lower.includes('booked')) {
      chips.push({ label: t('chip_my_bookings'), action: 'Show my upcoming visits' });
      chips.push({ label: t('chip_browse_more'), action: _searchAction() });
    }
    if (lower.includes('payment') || lower.includes('token') || lower.includes('link')) {
      chips.push({ label: t('chip_ive_paid'), action: 'I have completed the payment' });
    }

  } else if (agent === 'profile') {
    if (lower.includes('shortlist') || lower.includes('saved')) {
      chips.push({ label: '📅 Schedule a Visit', action: 'Book a visit' });
      chips.push({ label: '🔍 Find More PGs',    action: _searchAction() });
    } else if (lower.includes('visit') || lower.includes('booked') || lower.includes('upcoming')) {
      chips.push({ label: '📋 My Shortlist',  action: 'Show my shortlisted properties' });
      chips.push({ label: '🔍 Search PGs',    action: _searchAction() });
    } else {
      chips.push({ label: '💾 My Shortlist',  action: 'Show my shortlisted properties' });
      chips.push({ label: '📅 My Visits',     action: 'Show my upcoming visits' });
    }
  }

  return chips;
}


// ---------------------------------------------------------------------------
// Main export — parts-first, text fallback
// ---------------------------------------------------------------------------

export function buildQuickReplies(text, agent, serverParts = []) {
  // 1. Try structured parts first
  const partsChips = _chipsFromParts(serverParts, agent);

  if (partsChips !== null) {
    // Parts gave us a definitive answer (even if empty array = no chips)
    return _render(partsChips);
  }

  // 2. Fall back to text-parsing for restored messages and text-only responses
  const textChips = _chipsFromText(text, agent);
  return _render(textChips);
}
