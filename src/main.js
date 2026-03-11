// ─── Main Entry Point ───
// CSS imports (Vite handles these)
import '../styles/base.css';
import '../styles/header.css';
import '../styles/chat.css';
import '../styles/carousel.css';
import '../styles/compare.css';
import '../styles/input.css';
import '../styles/components.css';
import '../styles/map.css';
import '../styles/status-card.css';
import '../styles/gallery.css';
import '../styles/animations.css';
import 'leaflet/dist/leaflet.css';

// marked.js from npm
import { marked } from 'marked';

// Module imports
import { TRANSLATIONS, currentLocale, setCurrentLocale, setLocale, updateUIStrings } from './i18n.js';
import { autoGrow } from './helpers.js';
import { loadChatHistory, clearChat } from './chat-history.js';
import { sendMessage, sendQuick, stopStream } from './stream.js';
import { initVoiceInput, toggleVoiceInput } from './voice-input.js';
import { setAccountValues } from './config.js';

// ─── Configure marked.js ───
marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

// ─── Expose functions for HTML onclick handlers ───
window.sendMessage  = sendMessage;
window.sendQuick    = sendQuick;
window.stopStream   = stopStream;
window.clearChat    = clearChat;
window.setLocale    = setLocale;
window.autoGrow     = autoGrow;
window.toggleVoiceInput = toggleVoiceInput;

// ─── Carousel scroll counter sync ───
document.addEventListener("scroll", function(e) {
  const el = e.target;
  if (!el || !el.classList.contains("property-carousel")) return;
  const counter = el.parentElement && el.parentElement.querySelector(".carousel-counter");
  if (!counter) return;
  const total = parseInt(el.dataset.total) || 0;
  const cards = el.querySelectorAll(".property-card");
  if (!cards.length) return;
  const cardW = cards[0].offsetWidth + 10;
  const idx   = Math.min(Math.round(el.scrollLeft / cardW) + 1, total);
  counter.textContent = `${idx} / ${total}`;
}, true);

// ─── Brand config fetch (called on page load when ?brand= param present) ───
async function fetchBrandConfig() {
  const brandToken = new URLSearchParams(window.location.search).get('brand');
  if (!brandToken) return; // no ?brand= → use FALLBACK_ACCOUNT_VALUES immediately
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(
      `/api/brand-config?brand=${encodeURIComponent(brandToken)}`,
      { signal: controller.signal }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.is_configured && data.pg_ids?.length) {
        setAccountValues(data);
      }
    }
  } catch {
    // 3s timeout or network error → silently fall through to FALLBACK_ACCOUNT_VALUES
  } finally {
    clearTimeout(timer);
  }
}

// ─── Init on page load ───
window.addEventListener("load", async () => {
  // Restore saved locale
  const savedLocale = localStorage.getItem("eazypg_locale");
  if (savedLocale && TRANSLATIONS[savedLocale]) {
    setCurrentLocale(savedLocale);
    document.getElementById("langSelect").value = savedLocale;
    updateUIStrings();
  }
  loadChatHistory();
  initVoiceInput();
  document.getElementById("msgInput").focus();
  await fetchBrandConfig();
});
