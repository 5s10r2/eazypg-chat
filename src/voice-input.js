// ─── Voice Input (Web Speech API) ───
import { currentLocale } from './i18n.js';
import { isWaiting } from './config.js';
import { autoGrow } from './helpers.js';

// ─── State ───
let recognition = null;
let isRecording = false;
let finalTranscript = '';
let interimTranscript = '';

// ─── Locale → BCP-47 mapping ───
const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

// ─── Helpers ───
function stopRecordingUI() {
  isRecording = false;
  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.classList.remove('recording');
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

  // ── Result handler: update textarea with live transcription ──
  recognition.onresult = (event) => {
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
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      // Microphone permission denied — hide button permanently
      micBtn.style.display = 'none';
    }
    // For 'no-speech', 'network', 'aborted' — just stop cleanly
    stopRecordingUI();
  };

  // ── End handler: finalize text, focus input ──
  recognition.onend = () => {
    stopRecordingUI();
    const msgInput = document.getElementById('msgInput');
    if (msgInput) {
      msgInput.value = finalTranscript;
      autoGrow(msgInput);
      msgInput.focus();
    }
  };
}

// ─── Toggle recording on/off ───
export function toggleVoiceInput() {
  if (!recognition) return;
  if (isWaiting) return;

  if (isRecording) {
    // Stop recording
    recognition.stop();
    return;
  }

  // Start recording
  const msgInput = document.getElementById('msgInput');
  const micBtn = document.getElementById('micBtn');

  // Sync language with current locale
  recognition.lang = LOCALE_MAP[currentLocale] || 'en-IN';

  // Preserve any existing text in textarea
  const existing = msgInput ? msgInput.value.trim() : '';
  finalTranscript = existing ? existing + ' ' : '';
  interimTranscript = '';

  try {
    recognition.start();
    isRecording = true;
    if (micBtn) micBtn.classList.add('recording');
  } catch (e) {
    // DOMException if already started — ignore
    stopRecordingUI();
  }
}
