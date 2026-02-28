// ─── i18n ───
import { userId } from './config.js';

export let currentLocale = localStorage.getItem("eazypg_locale") || "en";

export function setCurrentLocale(lang) {
  currentLocale = lang;
}

export const TRANSLATIONS = {
  en: {
    header_status: "Online · Your PG broker",
    cold_banner: "Waking up the server — first response may take ~30s",
    welcome_title: "Find your perfect PG",
    welcome_subtitle: "Your AI broker in Mumbai. Search, compare, and book — all in chat.",
    input_placeholder: "Message OxOtel…",
    qa_search: "🔍 PGs in Andheri", qa_search_label: "Search by area",
    qa_budget: "💰 Budget PGs", qa_budget_label: "Under ₹12k",
    qa_area: "📍 Area Guide", qa_area_label: "Neighborhoods",
    qa_office: "🏢 Near Office", qa_office_label: "Commute-first",
    agent_broker: "BROKER", agent_booking: "BOOKING", agent_profile: "PROFILE",
    agent_room: "ROOMS", agent_default: "ASSISTANT", agent_thinking: "THINKING…",
    rate_limit: "⏳ You're sending messages too quickly. Please wait **{seconds} seconds** before trying again.",
    error_generic: "Sorry, something went wrong. Please try again. 🙏",
    error_moment: "Sorry, something went wrong. Please try again in a moment. 🙏",
    feedback_good: "Good response", feedback_bad: "Bad response",
    btn_details: "Details", btn_book_visit: "Book Visit →", btn_microsite: "Microsite ↗",
    comparison_header: "⚖ Comparison",
    view_all: "View all {count} →",
    map_view: "Map View", map_hide: "Hide Map", mic_tooltip: "Voice input",
    chip_details: "📋 Details", chip_book_visit: "📅 Book a Visit",
    chip_shortlist: "❤️ Shortlist", chip_compare_top2: "⚖️ Compare top 2",
    chip_see_rooms: "🛏️ See Rooms", chip_images: "📸 Images",
    chip_search: "🔍 Search", chip_search_here: "🔍 Search Here",
    chip_tell_more: "💬 Tell me more", chip_search_pgs: "🔍 Search PGs",
    chip_diff_area: "💬 Different Area", chip_my_bookings: "📋 My Bookings",
    chip_browse_more: "🏠 Browse More", chip_ive_paid: "✅ I've paid",
    chip_compare: "⚖️ Compare",
    chip_commute: "🚗 Commute", chip_loved_it: "😍 Loved it",
    chip_was_okay: "😐 It was okay", chip_not_for_me: "👎 Not for me",
    chip_more_options: "🔍 More Options",
  },
  hi: {
    header_status: "ऑनलाइन · आपका PG ब्रोकर",
    cold_banner: "सर्वर शुरू हो रहा है — पहला जवाब ~30s ले सकता है",
    welcome_title: "अपना परफेक्ट PG खोजें",
    welcome_subtitle: "मुंबई में आपका AI ब्रोकर। खोजें, तुलना करें और बुक करें — सब चैट में।",
    input_placeholder: "OxOtel को मैसेज करें…",
    qa_search: "🔍 अंधेरी में PG", qa_search_label: "एरिया से खोजें",
    qa_budget: "💰 बजट PG", qa_budget_label: "₹12k से कम",
    qa_area: "📍 एरिया गाइड", qa_area_label: "इलाके",
    qa_office: "🏢 ऑफिस के पास", qa_office_label: "कम्यूट-फर्स्ट",
    agent_broker: "ब्रोकर", agent_booking: "बुकिंग", agent_profile: "प्रोफ़ाइल",
    agent_room: "कमरे", agent_default: "सहायक", agent_thinking: "सोच रहा है…",
    rate_limit: "⏳ आप बहुत तेज़ी से मैसेज भेज रहे हैं। कृपया **{seconds} सेकंड** इंतज़ार करें।",
    error_generic: "माफ़ कीजिए, कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें। 🙏",
    error_moment: "माफ़ कीजिए, कुछ गड़बड़ हो गई। कृपया कुछ देर बाद कोशिश करें। 🙏",
    feedback_good: "अच्छा जवाब", feedback_bad: "खराब जवाब",
    btn_details: "विवरण", btn_book_visit: "विज़िट बुक करें →", btn_microsite: "माइक्रोसाइट ↗",
    comparison_header: "⚖ तुलना",
    view_all: "सभी {count} देखें →",
    map_view: "मैप व्यू", map_hide: "मैप छुपाएं", mic_tooltip: "वॉइस इनपुट",
    chip_details: "📋 विवरण", chip_book_visit: "📅 विज़िट बुक करें",
    chip_shortlist: "❤️ शॉर्टलिस्ट", chip_compare_top2: "⚖️ टॉप 2 की तुलना",
    chip_see_rooms: "🛏️ कमरे देखें", chip_images: "📸 फ़ोटो",
    chip_search: "🔍 खोजें", chip_search_here: "🔍 यहाँ खोजें",
    chip_tell_more: "💬 और बताओ", chip_search_pgs: "🔍 PG खोजें",
    chip_diff_area: "💬 दूसरा एरिया", chip_my_bookings: "📋 मेरी बुकिंग",
    chip_browse_more: "🏠 और देखें", chip_ive_paid: "✅ पेमेंट हो गया",
    chip_compare: "⚖️ तुलना",
    chip_commute: "🚗 कम्यूट", chip_loved_it: "😍 बहुत पसंद",
    chip_was_okay: "😐 ठीक था", chip_not_for_me: "👎 नहीं चाहिए",
    chip_more_options: "🔍 और विकल्प",
  },
  mr: {
    header_status: "ऑनलाइन · तुमचा PG ब्रोकर",
    cold_banner: "सर्व्हर सुरू होत आहे — पहिला प्रतिसाद ~30s लागू शकतो",
    welcome_title: "तुमचा परफेक्ट PG शोधा",
    welcome_subtitle: "मुंबईत तुमचा AI ब्रोकर। शोधा, तुलना करा आणि बुक करा — सगळं चॅटमध्ये.",
    input_placeholder: "OxOtel ला मेसेज करा…",
    qa_search: "🔍 अंधेरीत PG", qa_search_label: "एरियाने शोधा",
    qa_budget: "💰 बजेट PG", qa_budget_label: "₹12k पेक्षा कमी",
    qa_area: "📍 एरिया गाइड", qa_area_label: "परिसर",
    qa_office: "🏢 ऑफिसजवळ", qa_office_label: "कम्यूट-फर्स्ट",
    agent_broker: "ब्रोकर", agent_booking: "बुकिंग", agent_profile: "प्रोफाइल",
    agent_room: "रूम्स", agent_default: "सहाय्यक", agent_thinking: "विचार करत आहे…",
    rate_limit: "⏳ तुम्ही खूप लवकर मेसेज पाठवत आहात. कृपया **{seconds} सेकंद** थांबा.",
    error_generic: "माफ करा, काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा. 🙏",
    error_moment: "माफ करा, काहीतरी चूक झाली. कृपया थोड्या वेळाने प्रयत्न करा. 🙏",
    feedback_good: "चांगला प्रतिसाद", feedback_bad: "वाईट प्रतिसाद",
    btn_details: "तपशील", btn_book_visit: "भेट बुक करा →", btn_microsite: "मायक्रोसाइट ↗",
    comparison_header: "⚖ तुलना",
    view_all: "सर्व {count} पहा →",
    map_view: "नकाशा पहा", map_hide: "नकाशा लपवा", mic_tooltip: "व्हॉइस इनपुट",
    chip_details: "📋 तपशील", chip_book_visit: "📅 भेट बुक करा",
    chip_shortlist: "❤️ शॉर्टलिस्ट", chip_compare_top2: "⚖️ टॉप 2 ची तुलना",
    chip_see_rooms: "🛏️ रूम्स पहा", chip_images: "📸 फोटो",
    chip_search: "🔍 शोधा", chip_search_here: "🔍 इथे शोधा",
    chip_tell_more: "💬 अजून सांगा", chip_search_pgs: "🔍 PG शोधा",
    chip_diff_area: "💬 वेगळा एरिया", chip_my_bookings: "📋 माझ्या बुकिंग",
    chip_browse_more: "🏠 अजून पहा", chip_ive_paid: "✅ पेमेंट केलं",
    chip_compare: "⚖️ तुलना",
    chip_commute: "🚗 कम्यूट", chip_loved_it: "😍 आवडलं",
    chip_was_okay: "😐 ठीक होतं", chip_not_for_me: "👎 नको",
    chip_more_options: "🔍 अजून पर्याय",
  }
};

export function t(key, params) {
  const val = (TRANSLATIONS[currentLocale] && TRANSLATIONS[currentLocale][key])
            || TRANSLATIONS.en[key] || key;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
}

export function agentLabel(agent) {
  return agent === "broker"  ? t("agent_broker")  :
         agent === "booking" ? t("agent_booking") :
         agent === "profile" ? t("agent_profile") :
         agent === "room"    ? t("agent_room")    : t("agent_default");
}

export function buildWelcomeInnerHtml() {
  return `<div class="welcome-title">${t("welcome_title")}</div>
    <div class="welcome-subtitle">${t("welcome_subtitle")}</div>
    <div class="quick-actions">
      <button class="quick-action" onclick="sendQuick('Show me PGs in Andheri')">
        ${t("qa_search")}<span class="qa-label">${t("qa_search_label")}</span>
      </button>
      <button class="quick-action" onclick="sendQuick('I need a PG under ₹12,000 near Powai')">
        ${t("qa_budget")}<span class="qa-label">${t("qa_budget_label")}</span>
      </button>
      <button class="quick-action" onclick="sendQuick('What areas in Mumbai are good for working professionals?')">
        ${t("qa_area")}<span class="qa-label">${t("qa_area_label")}</span>
      </button>
      <button class="quick-action" onclick="sendQuick('I work at BKC, find me a PG nearby')">
        ${t("qa_office")}<span class="qa-label">${t("qa_office_label")}</span>
      </button>
    </div>`;
}

export function setLocale(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLocale = lang;
  localStorage.setItem("eazypg_locale", lang);
  document.getElementById("langSelect").value = lang;
  updateUIStrings();
  // Notify backend of explicit language override
  fetch("/api/language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, language: lang })
  }).catch(() => {});
}

export function updateUIStrings() {
  document.querySelector(".header-status").textContent = t("header_status");
  const coldSpan = document.getElementById("coldBannerText");
  if (coldSpan) coldSpan.textContent = t("cold_banner");
  const msgInput = document.getElementById("msgInput");
  if (msgInput) msgInput.placeholder = t("input_placeholder");
  const micBtn = document.getElementById("micBtn");
  if (micBtn) micBtn.title = t("mic_tooltip");
  const wc = document.getElementById("welcomeCard");
  if (wc) wc.innerHTML = buildWelcomeInnerHtml();
}
