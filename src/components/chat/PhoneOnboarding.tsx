/**
 * Telefon numarası ile katılım (WhatsApp mantığı).
 * ------------------------------------------------------------------
 * 1) Numara + görünen ad  → SMS ile tek kullanımlık kod
 * 2) Kod doğrulaması      → hesap oturumu açılır
 * 3) Kişi kimliği hesaba sabitlenir (Chrome/Edge/telefon aynı kimlik)
 * 4) İsteğe bağlı rehber eşleştirme
 *
 * SMS servisi kapalıysa akış kilitlenmez: kullanıcı yalnızca adıyla
 * yerel modda devam edebilir.
 */
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setAlias, setPhone } from "@/lib/chat/profile";
import { normalizePhone } from "@/lib/chat/directory";
import { ensureNotificationPermission } from "@/lib/chat/push";
import { ContactImportPanel } from "@/components/chat/ContactImportPanel";

type Step = "phone" | "code" | "contacts";

export function PhoneOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [dial, setDial] = useState("90");
  const [phone, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const e164 = normalizePhone(phone, dial);

  async function sendCode() {
    if (!e164) {
      setError("Telefon numarasını kontrol edin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setStep("code");
      toast.success("Doğrulama kodu gönderildi", { description: e164 });
    } catch (err) {
      setError(err instanceof Error ? `Kod gönderilemedi: ${err.message}` : "Kod gönderilemedi.");
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
      setStep("contacts");
    } catch (err) {
      setError(err instanceof Error ? `Kod doğrulanamadı: ${err.message}` : "Kod doğrulanamadı.");
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
      className="wa flex min-h-[100dvh] items-center justify-center p-4"
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
            <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] gap-2">
              <div
                className="flex items-center gap-1 rounded-lg border px-3"
                style={{ borderColor: "var(--wa-border)" }}
              >
                <span className="text-sm" style={{ color: "var(--wa-muted)" }}>
                  +
                </span>
                <input
                  value={dial}
                  inputMode="numeric"
                  onChange={(e) => setDial(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-transparent py-3 text-sm outline-none"
                  style={{ color: "var(--wa-text)" }}
                />
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

            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => {
                void finish(null);
                onDone();
              }}
              className="mt-3 w-full rounded-full px-4 py-2.5 text-xs font-medium disabled:opacity-50"
              style={{ color: "var(--wa-muted)" }}
            >
              Numarasız, yalnızca bu cihazda devam et
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
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="123456"
              className="mt-5 w-full rounded-lg border px-4 py-3 text-center text-lg tracking-[0.4em] outline-none"
              style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
            />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={busy || code.length < 4}
              onClick={() => void verify()}
              className="wa-press mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--wa-accent)" }}
            >
              {busy ? "Doğrulanıyor…" : "Doğrula ve başla"}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="mt-3 w-full rounded-full px-4 py-2.5 text-xs font-medium"
              style={{ color: "var(--wa-muted)" }}
            >
              Numarayı değiştir
            </button>
          </>
        )}

        {step === "contacts" && (
          <ContactImportPanel onDone={onDone} title="Rehberinizdeki Tedbirge kullanıcıları" />
        )}
      </div>
    </div>
  );
}
