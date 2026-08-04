/**
 * Telefon numarası ile katılım (WhatsApp mantığı).
 * ------------------------------------------------------------------
 * 1) Numara + görünen ad  → SMS ile tek kullanımlık kod
 * 2) Kod doğrulaması      → hesap oturumu açılır
 * 3) Kişi kimliği hesaba sabitlenir (Chrome/Edge/telefon aynı kimlik)
 * 4) İsteğe bağlı rehber eşleştirme
 *
 * Doğrulama %100 gerçek SMS ile yapılır; test/mock kod yoktur.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setAlias, setPhone } from "@/lib/chat/profile";
import { normalizePhone, syncDeviceContacts } from "@/lib/chat/directory";
import { ensureNotificationPermission } from "@/lib/chat/push";

type Step = "phone" | "code";

/** Ülke kodu seçici (bayrak + arama kodu). Varsayılan Türkiye. */
const COUNTRIES: { code: string; flag: string; name: string }[] = [
  { code: "90", flag: "🇹🇷", name: "Türkiye" },
  { code: "49", flag: "🇩🇪", name: "Almanya" },
  { code: "1", flag: "🇺🇸", name: "ABD / Kanada" },
  { code: "44", flag: "🇬🇧", name: "Birleşik Krallık" },
  { code: "31", flag: "🇳🇱", name: "Hollanda" },
  { code: "33", flag: "🇫🇷", name: "Fransa" },
  { code: "39", flag: "🇮🇹", name: "İtalya" },
  { code: "34", flag: "🇪🇸", name: "İspanya" },
  { code: "32", flag: "🇧🇪", name: "Belçika" },
  { code: "43", flag: "🇦🇹", name: "Avusturya" },
  { code: "41", flag: "🇨🇭", name: "İsviçre" },
  { code: "46", flag: "🇸🇪", name: "İsveç" },
  { code: "45", flag: "🇩🇰", name: "Danimarka" },
  { code: "47", flag: "🇳🇴", name: "Norveç" },
  { code: "994", flag: "🇦🇿", name: "Azerbaycan" },
  { code: "995", flag: "🇬🇪", name: "Gürcistan" },
  { code: "7", flag: "🇷🇺", name: "Rusya / Kazakistan" },
  { code: "380", flag: "🇺🇦", name: "Ukrayna" },
  { code: "971", flag: "🇦🇪", name: "BAE" },
  { code: "966", flag: "🇸🇦", name: "Suudi Arabistan" },
  { code: "974", flag: "🇶🇦", name: "Katar" },
  { code: "964", flag: "🇮🇶", name: "Irak" },
  { code: "98", flag: "🇮🇷", name: "İran" },
  { code: "20", flag: "🇪🇬", name: "Mısır" },
  { code: "212", flag: "🇲🇦", name: "Fas" },
  { code: "213", flag: "🇩🇿", name: "Cezayir" },
  { code: "216", flag: "🇹🇳", name: "Tunus" },
  { code: "218", flag: "🇱🇾", name: "Libya" },
  { code: "234", flag: "🇳🇬", name: "Nijerya" },
  { code: "27", flag: "🇿🇦", name: "Güney Afrika" },
  { code: "91", flag: "🇮🇳", name: "Hindistan" },
  { code: "92", flag: "🇵🇰", name: "Pakistan" },
  { code: "62", flag: "🇮🇩", name: "Endonezya" },
  { code: "60", flag: "🇲🇾", name: "Malezya" },
  { code: "81", flag: "🇯🇵", name: "Japonya" },
  { code: "82", flag: "🇰🇷", name: "Güney Kore" },
  { code: "86", flag: "🇨🇳", name: "Çin" },
  { code: "61", flag: "🇦🇺", name: "Avustralya" },
  { code: "55", flag: "🇧🇷", name: "Brezilya" },
  { code: "54", flag: "🇦🇷", name: "Arjantin" },
  { code: "52", flag: "🇲🇽", name: "Meksika" },
];

export function PhoneOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [dial, setDial] = useState("90");
  const [phone, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Art arda SMS isteğini engelleyen geri sayım (saniye).
  const [cooldown, setCooldown] = useState(0);

  const e164 = normalizePhone(phone, dial);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    if (!e164) {
      setError("Telefon numarasını kontrol edin.");
      return;
    }
    if (cooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setStep("code");
      setCooldown(60);
      toast.success("Doğrulama kodu gönderildi", { description: e164 });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        /provider|not enabled|unsupported/i.test(raw)
          ? "SMS doğrulama servisi şu anda etkin değil. Lütfen kısa süre sonra tekrar deneyin."
          : "Kod gönderilemedi. Numaranızı kontrol edip yeniden deneyin.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!e164) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: code.trim(),
        type: "sms",
      });
      if (error) throw error;
      await finish(e164);
      // Rehber otomatik eşitlenir: elle numara girişi yoktur.
      await syncDeviceContacts();
      onDone();
    } catch {
      setError("Kod doğrulanamadı. Kodu kontrol edip yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }


  async function finish(verifiedPhone: string | null) {
    setAlias(name.trim() || verifiedPhone || "Ben");
    if (verifiedPhone) setPhone(verifiedPhone);
    void ensureNotificationPermission();
    if (!verifiedPhone) return;
    try {
      const [{ syncPersonIdentity, getBrowserNodeId }, { syncMyDirectoryEntry }] =
        await Promise.all([import("@/lib/browser-node"), import("@/lib/directory.functions")]);
      const personId = await syncPersonIdentity();
      await syncMyDirectoryEntry({
        data: { personId, nodeId: getBrowserNodeId(), displayName: name.trim() || undefined },
      });
    } catch {
      /* çevrimdışı: bir sonraki açılışta eşitlenir */
    }
  }

  return (
    <div
      className="wa flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden overflow-y-auto p-4"
      style={{ background: "var(--wa-panel-soft)" }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm sm:p-8">
        {step === "phone" && (
          <>
            <h2 className="text-xl font-semibold" style={{ color: "var(--wa-text)" }}>
              Numaranızla katılın
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--wa-muted)" }}>
              Numaranız yalnızca kimliğinizi tek cihazdan bağımsız hale getirmek için kullanılır.
              Telefonunuzda, bilgisayarınızda ve tabletinizde aynı hesabı görürsünüz.
            </p>

            <label className="mt-5 block text-xs font-medium" style={{ color: "var(--wa-muted)" }}>
              Görünen ad
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız"
              className="mt-1 w-full rounded-lg border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
            />

            <label className="mt-4 block text-xs font-medium" style={{ color: "var(--wa-muted)" }}>
              Telefon numarası
            </label>
            <div className="mt-1 grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] gap-2">
              <div
                className="relative flex items-center rounded-lg border px-3"
                style={{ borderColor: "var(--wa-border)" }}
              >
                <span className="pointer-events-none truncate text-sm" style={{ color: "var(--wa-text)" }}>
                  {COUNTRIES.find((c) => c.code === dial)?.flag ?? "🌐"} +{dial}
                </span>
                <select
                  aria-label="Ülke kodu"
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                >
                  {COUNTRIES.map((c) => (
                    <option key={`${c.code}-${c.name}`} value={c.code}>
                      {c.flag} {c.name} (+{c.code})
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={phone}
                inputMode="tel"
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="5xx xxx xx xx"
                className="w-full rounded-lg border px-4 py-3 text-sm outline-none"
                style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
              />
            </div>
            {e164 && (
              <p className="mt-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                Kimliğiniz: {e164}
              </p>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={busy || !e164 || !name.trim()}
              onClick={() => void sendCode()}
              className="wa-press mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--wa-accent)" }}
            >
              {busy ? "Gönderiliyor…" : "Kodu gönder"}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <h2 className="text-xl font-semibold" style={{ color: "var(--wa-text)" }}>
              Doğrulama kodu
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--wa-muted)" }}>
              {e164} numarasına gönderilen 6 haneli kodu girin.
            </p>
            <input
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="––––––"
              className="mt-5 w-full rounded-lg border px-4 py-3 text-center text-lg tracking-[0.4em] outline-none"
              style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
            />

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={busy || code.length < 6}
              onClick={() => void verify()}
              className="wa-press mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--wa-accent)" }}
            >
              {busy ? "Doğrulanıyor…" : "Doğrula ve başla"}
            </button>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={() => void sendCode()}
              className="mt-3 w-full rounded-full px-4 py-2.5 text-xs font-medium disabled:opacity-60"
              style={{ color: "var(--wa-muted)" }}
            >
              {cooldown > 0 ? `Tekrar kod gönder: ${cooldown}s` : "Tekrar kod gönder"}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="mt-1 w-full rounded-full px-4 py-2.5 text-xs font-medium"
              style={{ color: "var(--wa-muted)" }}
            >
              Numarayı değiştir
            </button>
          </>
        )}

        <p className="mt-5 text-[11px] leading-relaxed" style={{ color: "var(--wa-muted)" }}>
          Numaranız yalnızca uçtan uca şifreli ağ kimliğinizi doğrulamak için kullanılır. 6698
          sayılı KVKK kapsamında numaranız 3. taraflarla asla paylaşılmaz.
        </p>


      </div>
    </div>
  );
}
