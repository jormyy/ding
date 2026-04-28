const STORAGE_KEY = "ding-sound-volume";
const DEFAULT_VOLUME = 0.6;

type Listener = (v: number) => void;
const listeners = new Set<Listener>();

function clamp(v: number): number {
  if (Number.isNaN(v)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(1, v));
}

export function getVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_VOLUME;
  const n = Number(raw);
  return clamp(n);
}

export function setVolume(v: number): void {
  if (typeof window === "undefined") return;
  const c = clamp(v);
  window.localStorage.setItem(STORAGE_KEY, String(c));
  listeners.forEach((fn) => fn(c));
}

export function subscribeVolume(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function playDingSound(): void {
  const volume = getVolume();
  if (volume <= 0) return;
  try {
    const ctx = new AudioContext();
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
  } catch {
    // ignore audio errors (e.g. autoplay policy)
  }
}

export function playFuckoffSound(): void {
  const volume = getVolume();
  if (volume <= 0) return;
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance("fuck off");
    utter.rate = 1.1;
    utter.pitch = 0.9;
    utter.volume = volume;
    setTimeout(() => window.speechSynthesis.speak(utter), 0);
  } catch {
    // ignore audio errors (e.g. autoplay policy, unsupported browser)
  }
}

export function speakCustomOutput(text: string, rate: number, pitch: number): void {
  const volume = getVolume();
  if (volume <= 0) return;
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    setTimeout(() => window.speechSynthesis.speak(utter), 0);
  } catch {
    // ignore audio errors
  }
}
