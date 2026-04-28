const VOLUME_KEY = "ding-sound-volume";
const VOICE_KEY = "ding-voice-uri";
const DEFAULT_VOLUME = 0.6;

type Listener = (v: number) => void;
const listeners = new Set<Listener>();

function clamp(v: number): number {
  if (Number.isNaN(v)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(1, v));
}

export function getVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  const raw = window.localStorage.getItem(VOLUME_KEY);
  if (raw === null) return DEFAULT_VOLUME;
  const n = Number(raw);
  return clamp(n);
}

export function setVolume(v: number): void {
  if (typeof window === "undefined") return;
  const c = clamp(v);
  window.localStorage.setItem(VOLUME_KEY, String(c));
  listeners.forEach((fn) => fn(c));
}

export function subscribeVolume(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ── Voices ──────────────────────────────────────────────────────────────────

type VoicesListener = () => void;
const voicesListeners = new Set<VoicesListener>();
let _voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  _voices = window.speechSynthesis.getVoices();
  if (_voices.length > 0) {
    voicesListeners.forEach((fn) => fn());
  }
}

export function getVoices(): SpeechSynthesisVoice[] {
  return _voices;
}

export function subscribeVoices(fn: VoicesListener): () => void {
  voicesListeners.add(fn);
  loadVoices();
  if (_voices.length > 0) fn();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  }
  return () => {
    voicesListeners.delete(fn);
  };
}

export function getSelectedVoiceURI(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(VOICE_KEY);
}

export function setSelectedVoiceURI(uri: string | null): void {
  if (typeof window === "undefined") return;
  if (uri) {
    window.localStorage.setItem(VOICE_KEY, uri);
  } else {
    window.localStorage.removeItem(VOICE_KEY);
  }
}

function findVoice(uri?: string | null): SpeechSynthesisVoice | undefined {
  if (!uri) return _voices.find((v) => v.default) ?? _voices[0];
  return _voices.find((v) => v.voiceURI === uri);
}

// ── Sound effects ───────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

export function primeAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // ignore
  }
}

export function playDingSound(): void {
  const volume = getVolume();
  if (volume <= 0) return;
  try {
    const ctx = getAudioCtx();
    const play = () => {
      const freqs = [1318.5, 1760, 2637]; // E6, A6, E7
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime((0.25 * volume) / (i + 1), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
        osc.start();
        osc.stop(ctx.currentTime + 1.8);
      });
    };
    if (ctx.state === "suspended") {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch {
    // ignore
  }
}

function speak(text: string, rate: number, pitch: number, voiceURI?: string | null): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const volume = getVolume();
  if (volume <= 0) return;

  const voice = voiceURI ? findVoice(voiceURI) : undefined;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate;
  utter.pitch = pitch;
  utter.volume = volume;
  if (voice) utter.voice = voice;

  try {
    const synth = window.speechSynthesis;
    console.error("[speak] state:", synth.speaking, synth.pending, synth.paused, "voices:", _voices.length, "voice:", voice?.name ?? "default", "text:", text);
    synth.cancel();
    synth.speak(utter);
    console.error("[speak] after speak(), speaking:", synth.speaking, "pending:", synth.pending);
  } catch (e) {
    console.error("[speak] threw:", e);
  }
}

export function playFuckoffSound(): void {
  speak("fuck off", 1.1, 0.9, getSelectedVoiceURI());
}

export function speakCustomOutput(text: string, rate: number, pitch: number, voiceURI?: string): void {
  speak(text, rate, pitch, voiceURI ?? getSelectedVoiceURI());
}
