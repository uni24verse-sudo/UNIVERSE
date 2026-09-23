// Audio Helper for Elegant, Non-Intrusive App Sounds
// Uses Web Audio API for 0-latency, high-fidelity soft tones, with local WAV fallbacks.

let audioCtx = null;
let lastPlayedAt = {
  completed: 0,
  ready: 0,
  confirmed: 0
};

// Lazy initialize AudioContext on user interaction/call
const getAudioContext = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.debug('[soundHelper] AudioContext initialization skipped:', err);
    return null;
  }
};

/**
 * Synthesizes a soft, warm chime using pure sine waves, smooth envelopes, and a warm lowpass filter.
 * Notes: array of { freq, start, duration, gain }
 */
const synthesizeChime = (notes = [], masterVol = 0.32, totalDuration = 1.4) => {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') {
    return false;
  }

  try {
    const now = ctx.currentTime;
    
    // Lowpass filter to ensure tone is mellow, warm and never harsh
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(1.0, now);

    // Master gain for the whole chime
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    notes.forEach(({ freq, start = 0, duration = 1.0, gain = 1.0 }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      // Smooth attack (15ms) to eliminate popping
      noteGain.gain.setValueAtTime(0.0001, now + start);
      noteGain.gain.linearRampToValueAtTime(gain, now + start + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(noteGain);
      noteGain.connect(filter);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    return true;
  } catch (err) {
    console.debug('[soundHelper] Synthesizer fallback triggered:', err);
    return false;
  }
};

/**
 * Fallback to standard HTML5 Audio with volume control
 */
const playAudioFile = (src, volume = 0.35) => {
  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {
        // Handled silently if browser autoplay policy blocks
      });
    }
  } catch (err) {
    // Ignore autoplay errors
  }
};

/**
 * Play a soothing, professional 3-tone arpeggio (C5 -> E5 -> G5) on Order Completion.
 * Replacing jarring alarm buzzer sounds.
 */
export const playOrderCompletedSound = () => {
  const now = Date.now();
  // Debounce 1.2s to prevent dual socket/dock events from overlapping
  if (now - lastPlayedAt.completed < 1200) return;
  lastPlayedAt.completed = now;

  // 1. Try modern Web Audio API chime (warm, smooth, non-intrusive)
  const played = synthesizeChime([
    { freq: 523.25, start: 0.00, duration: 1.1, gain: 0.55 }, // C5
    { freq: 659.25, start: 0.09, duration: 1.1, gain: 0.65 }, // E5
    { freq: 783.99, start: 0.18, duration: 1.2, gain: 0.80 }  // G5
  ], 0.32, 1.4);

  // 2. Fallback to local audio asset if Web Audio API wasn't able to synthesize
  if (!played) {
    playAudioFile('/sounds/order-completed.wav', 0.35);
  }
};

/**
 * Play a gentle 2-tone pickup chime (A5 -> D6) when an order is Ready for pickup.
 */
export const playOrderReadySound = () => {
  const now = Date.now();
  if (now - lastPlayedAt.ready < 1200) return;
  lastPlayedAt.ready = now;

  const played = synthesizeChime([
    { freq: 880.00, start: 0.00, duration: 0.65, gain: 0.60 },
    { freq: 1174.66, start: 0.11, duration: 0.75, gain: 0.75 }
  ], 0.28, 0.9);

  if (!played) {
    playAudioFile('/sounds/order-ready.wav', 0.30);
  }
};

/**
 * Play a subtle soft affirmative blip when an order is Confirmed.
 */
export const playOrderConfirmedSound = () => {
  const now = Date.now();
  if (now - lastPlayedAt.confirmed < 1200) return;
  lastPlayedAt.confirmed = now;

  const played = synthesizeChime([
    { freq: 659.25, start: 0.00, duration: 0.45, gain: 0.5 }
  ], 0.25, 0.5);

  if (!played) {
    playAudioFile('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', 0.25);
  }
};

export default {
  playOrderCompletedSound,
  playOrderReadySound,
  playOrderConfirmedSound
};
