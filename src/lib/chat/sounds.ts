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
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** İlk kullanıcı etkileşiminde çağrılır; sonraki sesler engellenmez. */
export function unlockAudio() {
  try {
    if (window.localStorage.getItem(MUTE_KEY) === "1") muted = true;
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
  // Klasik telefon zili: 440 + 480 Hz çift ton, 20 Hz tremolo ile
  // "zil çarpması" hissi. 2 sn çalar, 4 sn susar (geleneksel desen).
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.02;
  const dur = 2.0;
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, t0);
  bus.gain.exponentialRampToValueAtTime(0.22, t0 + 0.05);
  bus.gain.setValueAtTime(0.22, t0 + dur - 0.1);
  bus.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  bus.connect(ac.destination);

  // Tremolo (zil tokmağı titreşimi)
  const trem = ac.createOscillator();
  const tremGain = ac.createGain();
  trem.type = "sine";
  trem.frequency.setValueAtTime(20, t0);
  tremGain.gain.setValueAtTime(0.45, t0);
  trem.connect(tremGain).connect(bus.gain);
  trem.start(t0);
  trem.stop(t0 + dur + 0.05);

  for (const f of [440, 480]) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, t0);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.5, t0);
    osc.connect(g).connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}

function ringbackBurst() {
  // Arayan tarafta duyulan santral "çalıyor" tonu: 400 + 450 Hz, 1 sn.
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.02;
  const dur = 1.0;
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, t0);
  bus.gain.exponentialRampToValueAtTime(0.12, t0 + 0.04);
  bus.gain.setValueAtTime(0.12, t0 + dur - 0.08);
  bus.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  bus.connect(ac.destination);
  for (const f of [400, 450]) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, t0);
    osc.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}

/** Karşı taraf henüz ulaşılamadıysa duyulan sessiz "arama" bilgisi tonu. */
function searchingBurst() {
  tone({ freq: 300, duration: 0.16, gain: 0.05, type: "sine" });
}

/** Gelen arama zili — kabul/red edilene kadar döner, ayrıca titreşim. */
export function startRingtone() {
  stopRing();
  if (muted) return;
  ringtoneBurst();
  vibrate([600, 400, 600, 1400]);
  ringTimer = setInterval(() => {
    ringtoneBurst();
    vibrate([600, 400, 600, 1400]);
  }, 6000);
}

/** Giden arama tonu — karşı tarafın telefonu çalarken duyulur. */
export function startRingback() {
  stopRing();
  if (muted) return;
  ringbackBurst();
  ringTimer = setInterval(ringbackBurst, 4000);
}

/** Karşı cihaza henüz ulaşılamadı: "aranıyor" bilgi tonu. */
export function startSearching() {
  stopRing();
  if (muted) return;
  searchingBurst();
  ringTimer = setInterval(searchingBurst, 2000);
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
