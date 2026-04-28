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

function doSpeak(utter: SpeechSynthesisUtterance): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.speak(utter);
  } catch {
    // ignore
  }
}

export function playFuckoffSound(): void {
  const volume = getVolume();
  if (volume <= 0) return;
  try {
    // Use AudioContext buzzer — same approach as the ding, so it always works.
    const ctx = new AudioContext();
    const playBurst = (freq: number, startDelay: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + startDelay);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startDelay + dur);
      osc.start(ctx.currentTime + startDelay);
      osc.stop(ctx.currentTime + startDelay + dur);
    };
    // Two descending buzzes: "BUZZZZ... buzz"
    playBurst(180, 0, 0.3, 0.3 * volume);
    playBurst(120, 0.35, 0.25, 0.2 * volume);
  } catch {
    // ignore
  }
}

export function speakCustomOutput(text: string, rate: number, pitch: number): void {
  const volume = getVolume();
  if (volume <= 0) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    doSpeak(utter);
  } catch {
    // ignore
  }
}
