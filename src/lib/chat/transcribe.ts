/**
 * Sesli not transkripti — cihaz üstü, çevrimdışı çalışabilen tanıma.
 * ------------------------------------------------------------------
 * Tarayıcının yerleşik konuşma tanıma motoru (Web Speech API) kayıt
 * SIRASINDA paralel olarak çalıştırılır. Android/Chrome ve iOS/Safari
 * cihazlarda dil paketi yüklüyse tanıma tamamen cihazda yapılır ve
 * hiçbir ses verisi ağa çıkmaz. Motor yoksa transkript sessizce
 * atlanır — sesli notun kendisi her koşulda gönderilir.
 */

type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechAlternative; length: number };
type SpeechEvent = { resultIndex: number; results: { length: number } & Record<number, SpeechResult> };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function transcriptionSupported(): boolean {
  return ctor() !== null;
}

export type TranscriptSession = {
  /** Kaydı bitirirken çağrılır; toplanan metni döner. */
  stop: () => Promise<string>;
  /** Anlık (kısmi) metin — arayüzde canlı gösterilebilir. */
  partial: () => string;
};

/** Kayıtla eş zamanlı transkript oturumu başlatır. */
export function startTranscript(lang = "tr-TR"): TranscriptSession | null {
  const C = ctor();
  if (!C) return null;
  let final = "";
  let interim = "";
  let ended = false;
  let rec: Recognition;
  try {
    rec = new C();
  } catch {
    return null;
  }
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    interim = "";
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      const r = e.results[i];
      const t = r[0]?.transcript ?? "";
      if (r.isFinal) final += `${t} `;
      else interim += t;
    }
  };
  rec.onerror = () => {
    /* mikrofon paylaşımı veya dil paketi yok — transkript atlanır */
  };
  rec.onend = () => {
    ended = true;
  };
  try {
    rec.start();
  } catch {
    return null;
  }

  return {
    partial: () => (final + interim).trim(),
    stop: () =>
      new Promise<string>((resolve) => {
        const finish = () => resolve((final + interim).trim().slice(0, 1200));
        if (ended) return finish();
        rec.onend = finish;
        try {
          rec.stop();
        } catch {
          finish();
        }
        setTimeout(finish, 1500);
      }),
  };
}
