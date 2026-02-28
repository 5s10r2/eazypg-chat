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
import 'leaflet/dist/leaflet.css';

// marked.js from npm
import { marked } from 'marked';

// Module imports
import { TRANSLATIONS, currentLocale, setCurrentLocale, setLocale, updateUIStrings } from './i18n.js';
import { autoGrow } from './helpers.js';
import { loadChatHistory, clearChat } from './chat-history.js';
import { sendMessage, sendQuick } from './stream.js';
import { initVoiceInput, toggleVoiceInput } from './voice-input.js';

// ─── Configure marked.js ───
marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

// ─── Expose functions for HTML onclick handlers ───
window.sendMessage = sendMessage;
window.sendQuick   = sendQuick;
window.clearChat   = clearChat;
window.setLocale   = setLocale;
window.autoGrow    = autoGrow;
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

// ─── Init on page load ───
window.addEventListener("load", () => {
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
});
