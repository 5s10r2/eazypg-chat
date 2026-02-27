// ─── Voice Input (Deepgram Nova-3 WebSocket) ───
import { currentLocale } from './i18n.js';
import { isWaiting } from './config.js';
import { autoGrow } from './helpers.js';

// ─── State ───
let mediaRecorder = null;
let socket = null;
let stream = null;
let shouldBeRecording = false;
let finalTranscript = '';
let savedPlaceholder = '';

// ─── Locale → Deepgram language code ───
const LOCALE_MAP = { en: 'en', hi: 'hi', mr: 'mr' };

// ─── UI Helpers ───
function getMic() { return document.getElementById('micBtn'); }
function getInput() { return document.getElementById('msgInput'); }

function setRecordingUI(on) {
  const micBtn = getMic();
  if (!micBtn) return;
  if (on) micBtn.classList.add('recording');
  else micBtn.classList.remove('recording');
}

function setPlaceholder(text) {
  const el = getInput();
  if (el) el.placeholder = text;
}

function restorePlaceholder() {
  const el = getInput();
  if (el) el.placeholder = savedPlaceholder || 'Message OxOtel…';
}

// ─── Clean up everything ───
function fullStop(reason) {
  console.log('[Voice] fullStop:', reason);
  shouldBeRecording = false;
  setRecordingUI(false);

  // Stop MediaRecorder
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch (e) { /* ignore */ }
  }
  mediaRecorder = null;

  // Close WebSocket
  if (socket && socket.readyState <= WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify({ type: 'CloseStream' }));
      socket.close();
    } catch (e) { /* ignore */ }
  }
  socket = null;

  // Release mic stream
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  // Put final transcript in textarea
  const msgInput = getInput();
  if (msgInput) {
    if (finalTranscript.trim()) {
      msgInput.value = finalTranscript.trim();
    }
    autoGrow(msgInput);
    msgInput.focus();
  }

  restorePlaceholder();
}

// ─── Initialize ───
export function initVoiceInput() {
  const micBtn = getMic();
  if (!micBtn) return;

  // Check if browser supports MediaRecorder + getUserMedia
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    micBtn.style.display = 'none';
    console.warn('[Voice] MediaRecorder not supported in this browser');
    return;
  }

  // Save original placeholder
  const msgInput = getInput();
  if (msgInput) savedPlaceholder = msgInput.placeholder;
}

// ─── Toggle recording on / off ───
export async function toggleVoiceInput() {
  if (!navigator.mediaDevices) return;
  if (isWaiting) return;

  if (shouldBeRecording) {
    // User wants to stop
    shouldBeRecording = false;
    fullStop('user-stopped');
    return;
  }

  // User wants to start
  const msgInput = getInput();
  const lang = LOCALE_MAP[currentLocale] || 'en';

  // Preserve existing text
  const existing = msgInput ? msgInput.value.trim() : '';
  finalTranscript = existing ? existing + ' ' : '';

  shouldBeRecording = true;
  setRecordingUI(true);
  setPlaceholder('🎙️ Starting mic…');
  console.log('[Voice] starting — lang:', lang);

  try {
    // Step 1: Get temporary token from our serverless function
    const tokenRes = await fetch('/api/deepgram-token');
    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      console.error('[Voice] token fetch failed:', tokenRes.status, errData);
      setPlaceholder('⚠️ Could not start mic — try again');
      setTimeout(restorePlaceholder, 3000);
      fullStop('token-fetch-failed');
      return;
    }
    const { token } = await tokenRes.json();
    if (!token) {
      setPlaceholder('⚠️ Could not start mic — try again');
      setTimeout(restorePlaceholder, 3000);
      fullStop('no-token');
      return;
    }

    // Step 2: Open WebSocket to Deepgram
    const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-3&language=${lang}&interim_results=true&smart_format=true&punctuate=true&encoding=opus&sample_rate=48000`;
    socket = new WebSocket(wsUrl, ['token', token]);

    socket.onopen = async () => {
      console.log('[Voice] WebSocket connected');
      setPlaceholder('🎙️ Listening… speak now');

      try {
        // Step 3: Get mic access
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Step 4: Create MediaRecorder
        // Try opus first (Chrome/Firefox), fall back to whatever is available
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // let browser decide
          }
        }

        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          console.log('[Voice] MediaRecorder stopped');
        };

        // Start sending 250ms audio chunks
        mediaRecorder.start(250);
        console.log('[Voice] MediaRecorder started, mimeType:', mediaRecorder.mimeType);

      } catch (micErr) {
        console.error('[Voice] getUserMedia failed:', micErr);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setPlaceholder('⚠️ Mic permission denied — allow in browser settings');
          const micBtn = getMic();
          if (micBtn) micBtn.style.display = 'none';
        } else {
          setPlaceholder('⚠️ Mic not found — check mic is connected');
          setTimeout(restorePlaceholder, 3000);
        }
        fullStop('mic-error: ' + micErr.name);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'Results') {
          const transcript = data.channel?.alternatives?.[0]?.transcript || '';
          if (transcript) {
            if (data.is_final) {
              finalTranscript += transcript + ' ';
              setPlaceholder('🎙️ Hearing you…');
            }
            // Show live text (final + current interim)
            const el = getInput();
            if (el) {
              el.value = data.is_final
                ? finalTranscript
                : finalTranscript + transcript;
              autoGrow(el);
            }
            console.log('[Voice] transcript:', transcript.slice(-60), data.is_final ? '(final)' : '(interim)');
          }
        }
      } catch (e) {
        console.warn('[Voice] message parse error:', e);
      }
    };

    socket.onerror = (event) => {
      console.error('[Voice] WebSocket error:', event);
      setPlaceholder('⚠️ Network error — try again');
      setTimeout(restorePlaceholder, 3000);
      fullStop('ws-error');
    };

    socket.onclose = (event) => {
      console.log('[Voice] WebSocket closed:', event.code, event.reason);
      if (shouldBeRecording) {
        // Unexpected close
        fullStop('ws-closed-unexpectedly');
      }
    };

  } catch (err) {
    console.error('[Voice] start failed:', err);
    setPlaceholder('⚠️ Could not start mic — try again');
    setTimeout(restorePlaceholder, 3000);
    fullStop('start-exception');
  }
}
