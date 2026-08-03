/**
 * Arayüz sesleri ve titreşim (WhatsApp benzeri geri bildirim).
 * ------------------------------------------------------------------
 * Tüm sesler WebAudio ile cihazda üretilir — dosya indirmesi yoktur,
 * çevrimdışı ve tam kesinti modunda da çalışır. Tarayıcı politikası
 * gereği ses bağlamı ilk kullanıcı dokunuşunda açılır (unlockAudio).
 */

let ctx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let muted = false;

const MUTE_KEY = "tedbirge.chat.sound.muted";

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* gizli mod */
  }
  if (next) stopRing();
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** İlk kullanıcı etkileşiminde çağrılır; sonraki sesler engellenmez. */
export function unlockAudio() {
  try {
    window.localStorage.getItem(MUTE_KEY) === "1" && (muted = true);
  } catch {
    /* yoksay */
  }
  audio();
}

type ToneOptions = {
  freq: number;
  duration: number;
  delay?: number;
  gain?: number;
  type?: OscillatorType;
  sweepTo?: number;
};

function tone({ freq, duration, delay = 0, gain = 0.14, type = "sine", sweepTo }: ToneOptions) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Kısa dokunma tıkırtısı — düğmelere canlılık hissi verir. */
export function tapSound() {
  tone({ freq: 660, duration: 0.05, gain: 0.05, type: "triangle" });
}

export function sentSound() {
  tone({ freq: 880, duration: 0.09, gain: 0.08, type: "sine", sweepTo: 1320 });
}

export function receivedSound() {
  tone({ freq: 1180, duration: 0.1, gain: 0.1 });
  tone({ freq: 1560, duration: 0.12, delay: 0.09, gain: 0.09 });
}

export function errorSound() {
  tone({ freq: 320, duration: 0.18, gain: 0.09, type: "square" });
}

export function callEndSound() {
  tone({ freq: 520, duration: 0.14, gain: 0.1 });
  tone({ freq: 380, duration: 0.22, delay: 0.14, gain: 0.1 });
}

/* --------------------------- arama zilleri --------------------------- */

function ringtoneBurst() {
  // Klasik iki notalı zil deseni.
  tone({ freq: 880, duration: 0.35, gain: 0.16, type: "sine" });
  tone({ freq: 1100, duration: 0.35, delay: 0.4, gain: 0.16, type: "sine" });
}

function ringbackBurst() {
  // Arayan tarafta duyulan "çalıyor" tonu.
  tone({ freq: 440, duration: 0.9, gain: 0.09, type: "sine" });
}

/** Gelen arama zili — kabul/red edilene kadar döner, ayrıca titreşim. */
export function startRingtone() {
  stopRing();
  if (muted) return;
  ringtoneBurst();
  vibrate([400, 300, 400, 900]);
  ringTimer = setInterval(() => {
    ringtoneBurst();
    vibrate([400, 300, 400, 900]);
  }, 2600);
}

/** Giden arama tonu — karşı taraf açana kadar döner. */
export function startRingback() {
  stopRing();
  if (muted) return;
  ringbackBurst();
  ringTimer = setInterval(ringbackBurst, 3000);
}

export function stopRing() {
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
  try {
    navigator.vibrate?.(0);
  } catch {
    /* desteklenmiyor */
  }
}

/* ------------------------------ titreşim ------------------------------ */

export function vibrate(pattern: number | number[] = 12) {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* desteklenmiyor */
  }
}

/** Düğme dokunuşu: kısa titreşim + tıkırtı. */
export function pressFeedback() {
  vibrate(10);
  tapSound();
}
