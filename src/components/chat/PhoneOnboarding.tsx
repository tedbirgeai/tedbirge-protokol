/**
 * Telefon numarası ile katılım — Tedbirge Yerel Ağ Doğrulaması.
 * ------------------------------------------------------------------
 * 1) Numara + görünen ad
 * 2) Doğrulama kodu cihazda üretilir (RFC 6238 / TOTP, Web Crypto)
 * 3) Kod cihazda doğrulanır; oturum yerelde saklanır
 * 4) İnternet varsa bulut hesabı arka planda eşleşir (rehber için)
 *
 * Dış SMS/GSM servisi kullanılmaz; internet kesintisinde de çalışır.
 */
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setAlias, setEmail, setPhone } from "@/lib/chat/profile";
import { normalizePhone } from "@/lib/chat/directory";
import { ensureNotificationPermission } from "@/lib/chat/push";
import { refreshContacts, shortIdOf } from "@/lib/chat/contacts";
import { qrPayload } from "@/lib/peer-trust";
import { restoreContacts } from "@/lib/chat/vault";
import {
  isOnline,
  localCode,
  saveLocalSession,
  secondsLeft,
  verifyLocalCode,
} from "@/lib/chat/local-auth";

type Step = "phone" | "code" | "done";



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
  const [email, setEmailInput] = useState("");
  const [dial, setDial] = useState("90");
  const [phone, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cihazda üretilen geçerli kod ve kalan süresi.
  const [shownCode, setShownCode] = useState("");
  const [ttl, setTtl] = useState(30);
  const [online, setOnline] = useState(true);
  // Katılım sonrası gösterilen kalıcı kimlik kartı.
  const [myShortId, setMyShortId] = useState("");
  const [myQr, setMyQr] = useState<string | null>(null);
  const [restored, setRestored] = useState(0);


  const e164 = normalizePhone(phone, dial);

  useEffect(() => {
    const update = () => setOnline(isOnline());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Kod ekranı açıkken geçerli kodu ve geri sayımı tazele.
  useEffect(() => {
    if (step !== "code" || !e164) return;
    let alive = true;
    const tick = async () => {
      const value = await localCode(e164);
      if (!alive) return;
      setShownCode(value);
      setTtl(secondsLeft());
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [step, e164]);

  function startVerification() {
    if (!e164) {
      setError("Telefon numarasını kontrol edin.");
      return;
    }
    setError(null);
    setCode("");
    setStep("code");
  }

  /** Yerel doğrulamayı tamamlar; internet varsa bulut hesabını da eşler. */
  const complete = useCallback(
    async (verifiedPhone: string) => {
      saveLocalSession({
        phone: verifiedPhone,
        alias: name.trim() || verifiedPhone,
        verifiedAt: Date.now(),
        cloudLinked: false,
      });

      if (isOnline()) {
        try {
          const { linkPhoneAccount } = await import("@/lib/local-auth.functions");
          const res = await linkPhoneAccount({ data: { phone: verifiedPhone } });
          if (res.ok) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: res.email,
              password: res.password,
            });
            if (!signInError) {
              saveLocalSession({
                phone: verifiedPhone,
                alias: name.trim() || verifiedPhone,
                verifiedAt: Date.now(),
                cloudLinked: true,
              });
            }
          }
        } catch (cloudError) {
          console.error("[onboarding] bulut hesabı bağlanamadı", cloudError);
        }
      }

      await finish(verifiedPhone);
      // Eski cihazdan şifreli rehber yedeği varsa geri yüklenir.
      try {
        const count = await restoreContacts(verifiedPhone);
        setRestored(count);
      } catch (restoreError) {
        console.error("[onboarding] rehber kasası geri yüklenemedi", restoreError);
      }
      try {
        // Tek adımda: cihaz rehberi + yerel defter + bulut yedeği taranır,
        // eşleşen kişiler otomatik eklenir. Kullanıcı düğmeye basmaz.
        const { autoSyncContacts } = await import("@/lib/chat/directory");
        const auto = await autoSyncContacts();
        if (auto.matched > 0) setRestored((prev) => Math.max(prev, auto.matched));
      } catch (directoryError) {
        console.error("[onboarding] rehber eşleştirilemedi", directoryError);
      }
      try {
        // Bu cihazdaki rehber hemen şifreli olarak hesaba yedeklenir; aynı
        // numarayla açılan diğer ortamlar (bilgisayar/PWA) anında görür.
        const { backupContacts } = await import("@/lib/chat/vault");
        await backupContacts(verifiedPhone);
      } catch (backupError) {
        console.error("[onboarding] rehber kasası güncellenemedi", backupError);
      }

      // Kalıcı kimlik kartı (TBG kodu + karekod) gösterilir.
      try {
        const state = await refreshContacts().then(() => undefined);
        void state;
      } catch {
        /* yoksay */
      }
      try {
        const { getIdentity } = await import("@/lib/crypto/identity");
        const { getBrowserNodeId } = await import("@/lib/browser-node");
        const nodeId = getBrowserNodeId();
        const identity = await getIdentity(nodeId).catch(() => null);
        const short = shortIdOf(identity?.signPublic ?? nodeId);
        setMyShortId(short);
        if (identity?.signPublic) {
          const url = await QRCode.toDataURL(qrPayload(nodeId, identity.signPublic), {
            margin: 1,
            width: 220,
          }).catch(() => null);
          setMyQr(url);
        }
      } catch {
        /* kimlik kartı gösterilemezse akış engellenmez */
      }
      toast.success("Yerel doğrulama tamamlandı", { description: verifiedPhone });
      setStep("done");
    },
    // finish sabit bir fonksiyon; name/onDone bağımlılık olarak yeterli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, onDone],
  );


  async function verify() {
    if (!e164) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyLocalCode(e164, code.trim());
      if (!ok) {
        setError("Kod doğrulanamadı. Ekrandaki güncel kodu girin.");
        return;
      }
      await complete(e164);
    } catch {
      setError("Doğrulama tamamlanamadı. Yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  /** Tek tıkla yerel düğüm girişi: kod girmeye gerek kalmadan katılım. */
  async function quickJoin() {
    if (!e164) {
      setError("Telefon numarasını kontrol edin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await complete(e164);
    } catch {
      setError("Giriş tamamlanamadı. Yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }




  async function finish(verifiedPhone: string | null) {
    setAlias(name.trim() || verifiedPhone || "Ben");
    if (verifiedPhone) setPhone(verifiedPhone);
    setEmail(email);
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

            <label className="mt-4 block text-xs font-medium" style={{ color: "var(--wa-muted)" }}>
              E-posta (isteğe bağlı)
            </label>
            <input
              value={email}
              inputMode="email"
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="ornek@eposta.com"
              className="mt-1 w-full rounded-lg border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
            />
            <p className="mt-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
              E-posta yalnızca bu cihazda saklanır; katılım için zorunlu değildir.
            </p>


            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={busy || !e164 || !name.trim()}
              onClick={() => startVerification()}
              className="wa-press mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--wa-accent)" }}
            >
              Yerel doğrulamayı başlat
            </button>
            <button
              type="button"
              disabled={busy || !e164 || !name.trim()}
              onClick={() => void quickJoin()}
              className="mt-3 w-full rounded-full border px-4 py-2.5 text-xs font-medium disabled:opacity-60"
              style={{ borderColor: "var(--wa-border)", color: "var(--wa-muted)" }}
            >
              {busy ? "Bağlanıyor…" : "Tek tıkla yerel düğüm girişi"}
            </button>
            <p className="mt-3 text-[11px]" style={{ color: "var(--wa-muted)" }}>
              {online
                ? "Çevrimiçi: yerel doğrulama sonrası rehber eşleştirmesi de açılır."
                : "Çevrimdışı: doğrulama tamamen cihazınızda yapılır, internet gerekmez."}
            </p>
          </>
        )}

        {step === "code" && (
          <>
            <h2 className="text-xl font-semibold" style={{ color: "var(--wa-text)" }}>
              Tedbirge Yerel Ağ Doğrulaması
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--wa-muted)" }}>
              {e164} için kod cihazınızda üretildi. Dış SMS beklemeden aşağıdaki kodu girin.
            </p>

            <div
              className="mt-4 rounded-lg border px-4 py-3 text-center"
              style={{ borderColor: "var(--wa-border)" }}
            >
              <div
                className="text-2xl font-semibold tracking-[0.4em]"
                style={{ color: "var(--wa-text)" }}
              >
                {shownCode || "––––––"}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                Kod {ttl} saniye sonra yenilenir · Offline-Ready
              </div>
            </div>

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
              disabled={busy}
              onClick={() => setCode(shownCode)}
              className="mt-3 w-full rounded-full px-4 py-2.5 text-xs font-medium disabled:opacity-60"
              style={{ color: "var(--wa-muted)" }}
            >
              Kodu otomatik doldur
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

        {step === "done" && (
          <>
            <h2 className="text-xl font-semibold" style={{ color: "var(--wa-text)" }}>
              Kimliğiniz hazır
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--wa-muted)" }}>
              {name.trim() || "Ben"} · {e164}
              {email.trim() ? ` · ${email.trim()}` : ""}
            </p>

            <div
              className="mt-4 flex flex-col items-center gap-3 rounded-xl border p-4"
              style={{ borderColor: "var(--wa-border)" }}
            >
              {myQr ? (
                <img
                  src={myQr}
                  alt="Kimlik karekodunuz"
                  width={180}
                  height={180}
                  className="rounded border"
                />
              ) : (
                <div
                  className="flex h-[180px] w-[180px] items-center justify-center rounded border text-xs"
                  style={{ borderColor: "var(--wa-border)", color: "var(--wa-muted)" }}
                >
                  Karekod hazırlanıyor…
                </div>
              )}
              <p
                className="font-mono text-lg tracking-[0.18em]"
                style={{ color: "var(--wa-text)" }}
              >
                {myShortId || "TBG-••••-••••"}
              </p>
              <p className="text-center text-[11px]" style={{ color: "var(--wa-muted)" }}>
                Bu kod cihaz değiştirseniz de aynı kalır. Karşı taraf karekodu okutarak sizi
                doğrulayabilir.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(myShortId);
                    toast("Kimliğiniz kopyalandı");
                  }}
                  className="wa-press rounded-full border px-4 py-2 text-xs font-medium"
                  style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
                >
                  Kimliği kopyala
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/chat`;
                    const text = `Tedbirge kimliğim: ${myShortId} — ${url}`;
                    if (navigator.share) void navigator.share({ title: "Tedbirge", text, url }).catch(() => {});
                    else void navigator.clipboard?.writeText(text).then(() => toast("Davet kopyalandı"));
                  }}
                  className="wa-press rounded-full border px-4 py-2 text-xs font-medium"
                  style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
                >
                  Paylaş
                </button>
              </div>
            </div>

            {restored > 0 && (
              <p className="mt-3 text-center text-xs" style={{ color: "var(--wa-accent)" }}>
                Önceki yedeğinizden {restored} kişi geri yüklendi.
              </p>
            )}

            <button
              type="button"
              onClick={() => onDone()}
              className="wa-press mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--wa-accent)" }}
            >
              Sohbete başla
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
