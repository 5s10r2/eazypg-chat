// ─── Voice Input (Web Speech API) ───
import { currentLocale } from './i18n.js';
import { isWaiting } from './config.js';
import { autoGrow } from './helpers.js';

// ─── State ───
let recognition = null;
let shouldBeRecording = false;   // true while user wants mic on
let finalTranscript = '';
let interimTranscript = '';
let restartCount = 0;
const MAX_RESTARTS = 8;          // prevent infinite restart loops

// ─── Locale → BCP-47 mapping ───
const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

// ─── Fatal errors (stop completely) ───
const FATAL_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'language-not-supported',
]);

// ─── Helpers ───
function setRecordingUI(on) {
  const micBtn = document.getElementById('micBtn');
  if (!micBtn) return;
  if (on) {
    micBtn.classList.add('recording');
  } else {
    micBtn.classList.remove('recording');
  }
}

// ─── Initialize ───
export function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('micBtn');
  if (!micBtn) return;

  if (!SpeechRecognition) {
    micBtn.style.display = 'none';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = LOCALE_MAP[currentLocale] || 'en-IN';
  recognition.maxAlternatives = 1;

  // ── Result handler: live transcription into textarea ──
  recognition.onresult = (event) => {
    restartCount = 0;                // healthy — reset restart counter
    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript = transcript;
      }
    }
    const msgInput = document.getElementById('msgInput');
    if (msgInput) {
      msgInput.value = finalTranscript + interimTranscript;
      autoGrow(msgInput);
    }
  };

  // ── Error handler ──
  recognition.onerror = (event) => {
    console.warn('[Voice] error:', event.error, event.message || '');

    if (FATAL_ERRORS.has(event.error)) {
      // Permission denied or service blocked — stop completely
      shouldBeRecording = false;
      setRecordingUI(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        micBtn.style.display = 'none';
      }
      return;
    }

    // Non-fatal errors (no-speech, network, aborted, audio-capture):
    // Let onend handle restart logic — don't kill shouldBeRecording
  };

  // ── End handler: auto-restart if user hasn't stopped ──
  recognition.onend = () => {
    console.log('[Voice] onend — shouldBeRecording:', shouldBeRecording, 'restarts:', restartCount);

    if (shouldBeRecording && restartCount < MAX_RESTARTS) {
      // Chrome fires onend prematurely even with continuous=true
      // Auto-restart so the user can keep speaking
      restartCount++;
      try {
        recognition.start();
        console.log('[Voice] auto-restarted (' + restartCount + ')');
        return;               // keep recording UI red
      } catch (e) {
        console.warn('[Voice] restart failed:', e.message);
      }
    }

    // Truly done — finalize
    shouldBeRecording = false;
    restartCount = 0;
    setRecordingUI(false);

    const msgInput = document.getElementById('msgInput');
    if (msgInput) {
      msgInput.value = finalTranscript;
      autoGrow(msgInput);
      msgInput.focus();
    }
  };

  // ── Audio-start handler: confirm mic is active ──
  recognition.onaudiostart = () => {
    console.log('[Voice] audio stream started — mic is live');
    restartCount = 0;
  };
}

// ─── Toggle recording on / off ───
export function toggleVoiceInput() {
  if (!recognition) return;
  if (isWaiting) return;

  if (shouldBeRecording) {
    // User wants to stop
    shouldBeRecording = false;
    recognition.stop();            // fires onend → finalizes
    return;
  }

  // User wants to start
  const msgInput = document.getElementById('msgInput');
  recognition.lang = LOCALE_MAP[currentLocale] || 'en-IN';

  // Preserve existing text in textarea
  const existing = msgInput ? msgInput.value.trim() : '';
  finalTranscript = existing ? existing + ' ' : '';
  interimTranscript = '';
  restartCount = 0;

  try {
    recognition.start();
    shouldBeRecording = true;
    setRecordingUI(true);
    console.log('[Voice] started — lang:', recognition.lang);
  } catch (e) {
    console.warn('[Voice] start failed:', e.message);
    shouldBeRecording = false;
    setRecordingUI(false);
  }
}
