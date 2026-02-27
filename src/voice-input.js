// ─── Voice Input (Web Speech API) ───
import { currentLocale } from './i18n.js';
import { isWaiting } from './config.js';
import { autoGrow } from './helpers.js';

// ─── State ───
let recognition = null;
let shouldBeRecording = false;
let finalTranscript = '';
let interimTranscript = '';
let restartCount = 0;
let lastError = null;
let errorCount = 0;
let savedPlaceholder = '';
let gotAnyResult = false;

const MAX_RESTARTS = 10;
const MAX_ERROR_RESTARTS = 3;

// ─── Locale → BCP-47 mapping ───
const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

// ─── Fatal errors (stop completely, no restart) ───
const FATAL_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'language-not-supported',
]);

// ─── UI Helpers ───
function getMic() { return document.getElementById('micBtn'); }
function getInput() { return document.getElementById('msgInput'); }

function setRecordingUI(on) {
  const micBtn = getMic();
  if (!micBtn) return;
  if (on) {
    micBtn.classList.add('recording');
  } else {
    micBtn.classList.remove('recording');
  }
}

function setPlaceholder(text) {
  const el = getInput();
  if (el) el.placeholder = text;
}

function restorePlaceholder() {
  const el = getInput();
  if (el) el.placeholder = savedPlaceholder || 'Message OxOtel…';
}

// ─── Stop everything cleanly ───
function fullStop(reason) {
  console.log('[Voice] fullStop:', reason);
  shouldBeRecording = false;
  restartCount = 0;
  errorCount = 0;
  lastError = null;
  gotAnyResult = false;
  setRecordingUI(false);
  restorePlaceholder();

  const msgInput = getInput();
  if (msgInput) {
    if (finalTranscript.trim()) {
      msgInput.value = finalTranscript.trim();
    }
    autoGrow(msgInput);
    msgInput.focus();
  }
}

// ─── Initialize ───
export function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = getMic();
  if (!micBtn) return;

  if (!SpeechRecognition) {
    micBtn.style.display = 'none';
    console.warn('[Voice] Web Speech API not supported in this browser');
    return;
  }

  // Save original placeholder
  const msgInput = getInput();
  if (msgInput) savedPlaceholder = msgInput.placeholder;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = LOCALE_MAP[currentLocale] || 'en-IN';
  recognition.maxAlternatives = 1;

  // ── Result handler: live transcription into textarea ──
  recognition.onresult = (event) => {
    restartCount = 0;
    errorCount = 0;
    lastError = null;
    gotAnyResult = true;

    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript = transcript;
      }
    }
    const el = getInput();
    if (el) {
      el.value = finalTranscript + interimTranscript;
      autoGrow(el);
    }
    console.log('[Voice] result:', (finalTranscript + interimTranscript).slice(-60));
  };

  // ── Error handler ──
  recognition.onerror = (event) => {
    lastError = event.error;
    console.warn('[Voice] onerror:', event.error, event.message || '');

    if (FATAL_ERRORS.has(event.error)) {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPlaceholder('⚠️ Mic permission denied — allow in browser settings');
        micBtn.style.display = 'none';
      }
      fullStop('fatal: ' + event.error);
      return;
    }

    // Non-fatal — onerror always fires before onend.
    // We let onend decide whether to restart based on errorCount.
    errorCount++;
  };

  // ── End handler ──
  recognition.onend = () => {
    console.log('[Voice] onend — shouldBe:', shouldBeRecording,
      'lastErr:', lastError, 'errCount:', errorCount, 'restarts:', restartCount);

    if (!shouldBeRecording) {
      // User explicitly stopped — finalize cleanly
      fullStop('user-stopped');
      return;
    }

    // Should still be recording — decide whether to restart
    if (lastError && errorCount > MAX_ERROR_RESTARTS) {
      // Too many consecutive errors — stop and tell the user
      const tip = lastError === 'no-speech'
        ? '🎙️ No speech detected — tap mic & try again'
        : lastError === 'network'
          ? '⚠️ Network error — check internet & try again'
          : lastError === 'audio-capture'
            ? '⚠️ Mic not found — check mic is connected'
            : '⚠️ Voice error: ' + lastError;
      setPlaceholder(tip);
      fullStop('too-many-errors: ' + lastError);
      return;
    }

    if (restartCount >= MAX_RESTARTS) {
      fullStop('max-restarts');
      return;
    }

    // Auto-restart (Chrome premature onend workaround)
    restartCount++;
    lastError = null;
    try {
      recognition.start();
      console.log('[Voice] auto-restarted (' + restartCount + ')');
    } catch (e) {
      console.warn('[Voice] restart failed:', e.message);
      fullStop('restart-exception');
    }
  };

  // ── Audio confirmed flowing from mic ──
  recognition.onaudiostart = () => {
    console.log('[Voice] ✓ audio stream active');
    restartCount = 0;
    errorCount = 0;
    lastError = null;
    setPlaceholder('🎙️ Listening… speak now');
  };

  // ── Speech detected in audio ──
  recognition.onspeechstart = () => {
    console.log('[Voice] ✓ speech detected');
    setPlaceholder('🎙️ Hearing you…');
  };

  // ── Speech stopped ──
  recognition.onspeechend = () => {
    console.log('[Voice] speech ended');
  };
}

// ─── Toggle recording on / off ───
export function toggleVoiceInput() {
  if (!recognition) return;
  if (isWaiting) return;

  if (shouldBeRecording) {
    // User wants to stop
    shouldBeRecording = false;
    recognition.stop();    // fires onend → fullStop
    return;
  }

  // User wants to start
  const msgInput = getInput();
  recognition.lang = LOCALE_MAP[currentLocale] || 'en-IN';

  // Preserve existing text
  const existing = msgInput ? msgInput.value.trim() : '';
  finalTranscript = existing ? existing + ' ' : '';
  interimTranscript = '';
  restartCount = 0;
  errorCount = 0;
  lastError = null;
  gotAnyResult = false;

  try {
    recognition.start();
    shouldBeRecording = true;
    setRecordingUI(true);
    setPlaceholder('🎙️ Starting mic…');
    console.log('[Voice] started — lang:', recognition.lang);
  } catch (e) {
    console.warn('[Voice] start failed:', e.message);
    shouldBeRecording = false;
    setRecordingUI(false);
    setPlaceholder('⚠️ Could not start mic — try again');
    setTimeout(restorePlaceholder, 3000);
  }
}
