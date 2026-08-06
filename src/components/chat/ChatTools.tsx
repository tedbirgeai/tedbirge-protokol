import { useEffect, useRef, useState } from "react";
import {
  Lock,
  Search,
  ShieldCheck,
  Timer,
  X,
  Download,
  Upload,
  Bell,
  Smartphone,
} from "lucide-react";
import { BUILD_LABEL } from "@/lib/build-id";
import { getPrivacy, setPrivacy } from "@/lib/chat/privacy";
import {
  listSessions,
  onSessionsChange,
  revokeSession,
  type DeviceSession,
} from "@/lib/chat/sessions";
import { createBackup, downloadBackup, restoreBackup } from "@/lib/chat/backup";
import {
  autoLockMinutes,
  disableLock,
  enableLock,
  lockEnabled,
  setAutoLockMinutes,
  verifyPin,
} from "@/lib/chat/lock";
import {
  ensureNotificationPermission,
  notificationsAllowed,
  notificationsBlocked,
} from "@/lib/chat/push";
import { disableWebPush, enableWebPush } from "@/lib/chat/webpush";
import { getBrowserNodeId } from "@/lib/browser-node";

import { TTL_OPTIONS, setTtl, ttlOf } from "@/lib/chat/ephemeral";
import { searchMessages, type SearchHit } from "@/lib/chat/search";
import { pressFeedback } from "@/lib/chat/sounds";
import { InstallAppButton } from "@/components/chat/InstallAppButton";
import { NotificationHealth } from "@/components/chat/NotificationHealth";
import { SyncStatusSection } from "@/components/chat/SyncStatusPanel";
import { getAlias, getEmail, getPhone, setAlias, setEmail } from "@/lib/chat/profile";
import { autoSyncContacts, deviceContactsSupported } from "@/lib/chat/directory";


const panel = { background: "var(--wa-panel)", color: "var(--wa-text)" } as const;

/** Ayarlar tek ekranda toplanır: altı sekme, tek pencere. */
export type SettingsTab =
  | "profil"
  | "bildirim"
  | "gizlilik"
  | "esitleme"
  | "depolama"
  | "rehber"
  | "hakkinda";
const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "profil", label: "Profil" },
  { id: "bildirim", label: "Bildirim" },
  { id: "gizlilik", label: "Gizlilik" },
  { id: "esitleme", label: "Eşitleme" },
  { id: "depolama", label: "Depolama" },
  { id: "rehber", label: "Rehber" },
  { id: "hakkinda", label: "Hakkında" },
];

/** Kilit ekranı — PIN doğrulanana kadar sohbet içeriği gösterilmez. */
export function AppLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "var(--wa-panel-soft)" }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await verifyPin(pin)) {
            setPin("");
            onUnlocked();
          } else {
            setError(true);
            setPin("");
          }
        }}
        className="w-full max-w-sm rounded-xl p-8 shadow-sm"
        style={panel}
      >
        <Lock className="h-6 w-6" style={{ color: "var(--wa-accent)" }} aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">Uygulama kilitli</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--wa-muted)" }}>
          Sohbetlerinizi görmek için PIN kodunuzu girin. Kod yalnızca bu cihazda saklanır.
        </p>
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            setError(false);
          }}
          inputMode="numeric"
          autoFocus
          placeholder="PIN"
          className="mt-5 w-full rounded-lg border px-4 py-3 text-center text-lg tracking-[0.5em] outline-none"
          style={{ borderColor: error ? "#e03131" : "var(--wa-border)" }}
        />
        {error && (
          <p className="mt-2 text-xs" style={{ color: "#e03131" }}>
            PIN hatalı.
          </p>
        )}
        <button
          type="submit"
          className="wa-press mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold text-white"
          style={{ background: "var(--wa-accent)" }}
        >
          Kilidi aç
        </button>
      </form>
    </div>
  );
}

/** Tüm sohbetlerde tam metin arama. */
export function SearchPanel({
  open,
  onClose,
  onOpenMessage,
}: {
  open: boolean;
  onClose: () => void;
  onOpenMessage: (convId: string, messageId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(() => {
      void searchMessages(q, { starredOnly }).then((r) => alive && setHits(r));
    }, 140);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, starredOnly, open]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={panel}>
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--wa-border)" }}
      >
        <Search className="h-4 w-4" style={{ color: "var(--wa-muted)" }} aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Mesajlarda ara"
          className="flex-1 bg-transparent py-1.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => setStarredOnly((v) => !v)}
          className="rounded-full px-2.5 py-1 text-[11px]"
          style={{
            border: "1px solid var(--wa-border)",
            color: starredOnly ? "#fff" : "var(--wa-muted)",
            background: starredOnly ? "var(--wa-accent)" : "transparent",
          }}
        >
          Yıldızlı
        </button>
        <button
          type="button"
          onClick={onClose}
          className="wa-press rounded-full p-2"
          aria-label="Aramayı kapat"
        >
          <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {hits.length === 0 && (
          <li className="px-4 py-8 text-center text-sm" style={{ color: "var(--wa-muted)" }}>
            {q || starredOnly ? "Sonuç yok." : "Aramak için yazmaya başlayın."}
          </li>
        )}
        {hits.map((h) => (
          <li key={h.message.id} style={{ borderBottom: "1px solid var(--wa-border)" }}>
            <button
              type="button"
              onClick={() => onOpenMessage(h.convId, h.message.id)}
              className="wa-row w-full px-4 py-3 text-left hover:bg-black/[0.03]"
            >
              <p className="text-[13px] font-medium">{h.convTitle}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px]" style={{ color: "var(--wa-muted)" }}>
                {h.snippet}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                {new Date(h.message.ts).toLocaleString("tr-TR")}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * SÜRÜM VE ONARIM
 * Ekrandaki uygulamanın hangi paket olduğunu gösterir ve tek dokunuşla
 * hayalet kayıt temizliği çalıştırır. Sonuç sayıyla ekranda görünür.
 */
function AppVersionSection() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold">Sürüm ve onarım</h3>
      <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
        Sürüm: <span className="font-medium">{BUILD_LABEL}</span>
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
        Listede adı görünmeyen boş kayıtlar oluştuysa buradan tek dokunuşla temizleyebilirsiniz.
        Mesajlarınız, rehberiniz ve kimliğiniz silinmez.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult(null);
          try {
            const { repairNow } = await import("@/lib/chat/version-lock");
            const { cleaned } = await repairNow();
            setResult(
              cleaned > 0
                ? `${cleaned} boş kayıt temizlendi.`
                : "Temizlenecek kayıt bulunamadı — listeniz zaten temiz.",
            );
          } catch {
            setResult("Onarım tamamlanamadı, tekrar deneyin.");
          } finally {
            setBusy(false);
          }
        }}
        className="wa-press mt-3 min-h-11 rounded-full px-4 text-[13px] font-semibold disabled:opacity-50"
        style={{ background: "var(--wa-accent)", color: "#fff" }}
      >
        {busy ? "Onarılıyor…" : "Onar ve temizle"}
      </button>
      {result && (
        <p className="mt-2 text-xs" style={{ color: "var(--wa-muted)" }}>
          {result}
        </p>
      )}
    </section>
  );
}

/** Gizlilik ve yedekleme ayarları. */
export function ChatSettingsDialog({
  open,
  onClose,
  convId,
  initialTab,
}: {
  open: boolean;
  onClose: () => void;
  convId: string | null;
  initialTab?: SettingsTab;
}) {
  const [pin, setPin] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [ttl, setTtlValue] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [notify, setNotify] = useState(false);
  const [tab, setTab] = useState<SettingsTab>(initialTab ?? "profil");
  const [alias, setAliasValue] = useState("");
  const [email, setEmailValue] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (!open) return;
    if (initialTab) setTab(initialTab);
    setLocked(lockEnabled());
    setMinutes(autoLockMinutes());
    setNotify(notificationsAllowed());
    setTtlValue(convId ? ttlOf(convId) : 0);
    setAliasValue(getAlias());
    setEmailValue(getEmail());
    setMsg(null);
    setErr(null);
  }, [open, convId, initialTab]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl p-6 shadow-xl"
        style={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ayarlar</h2>
          <button
            type="button"
            onClick={onClose}
            className="wa-press rounded-full p-2"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
          </button>
        </div>

        {/* Tek ekranda toplanmış ayar sekmeleri */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                pressFeedback();
                setTab(t.id);
              }}
              className="wa-press min-h-9 rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={{
                border: "1px solid var(--wa-border)",
                background: tab === t.id ? "var(--wa-accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--wa-muted)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profil" && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold">Profil</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            Adınız ve e-postanız yalnızca bu cihazda saklanır; kimliğiniz numaranıza bağlıdır.
          </p>
          <input
            value={alias}
            onChange={(e) => setAliasValue(e.target.value)}
            placeholder="Ad Soyad"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--wa-border)" }}
          />
          <input
            value={email}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="E-posta (isteğe bağlı)"
            inputMode="email"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--wa-border)" }}
          />
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setAlias(alias);
              setEmail(email);
              setMsg("Profil kaydedildi.");
            }}
            className="wa-press mt-2 min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
            style={{ background: "var(--wa-accent)" }}
          >
            Kaydet
          </button>
          <dl className="mt-3 space-y-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            <div className="flex justify-between gap-2">
              <dt>Telefon</dt>
              <dd className="font-mono">{getPhone() || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Kimlik</dt>
              <dd className="font-mono">{getBrowserNodeId()}</dd>
            </div>
          </dl>
        </section>
        )}

        {tab === "rehber" && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold">Rehber</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            Rehberiniz uygulama ön plana geldiğinde ve altı saatte bir kendiliğinden eşitlenir.
          </p>
          <button
            type="button"
            disabled={syncing}
            onClick={() => {
              pressFeedback();
              setSyncing(true);
              void autoSyncContacts()
                .then((r) => {
                  if (r.source === "none") {
                    setSyncInfo(
                      deviceContactsSupported()
                        ? "Rehber izni verilmedi. Cihaz ayarlarından Tedbirge rehber iznini açın."
                        : "Tarayıcılar rehbere erişemez. Tam otomatik rehber için Tedbirge'yi iOS/Android uygulaması olarak kurun.",
                    );
                    return;
                  }
                  setSyncInfo(
                    r.matched > 0
                      ? `${r.checked} kişi denetlendi · ${r.matched} kişi eşleşti.`
                      : `${r.checked} kişi denetlendi · rehberinizden henüz katılan yok.`,
                  );
                })
                .catch(() => setSyncInfo("Rehber eşitlenemedi."))
                .finally(() => setSyncing(false));
            }}
            className="wa-press mt-2 min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--wa-accent)" }}
          >
            {syncing ? "Eşitleniyor…" : "Rehberimi şimdi eşitle"}
          </button>
          {syncInfo && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--wa-muted)" }}>
              {syncInfo}
            </p>
          )}
          <p className="mt-3 text-[11px]" style={{ color: "var(--wa-muted)" }}>
            KVKK: numaralarınız cihazdan çıkmaz; eşleştirme yalnızca geri döndürülemez
            özetlerle yapılır.
          </p>
        </section>
        )}

        
        {tab === "bildirim" && (
        <>
        {/* Bildirimler */}
        <section className="mt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4" aria-hidden /> Bildirimler
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            Uygulama kapalıyken bile mesaj ve arama bildirimi alırsınız. Sunucu yalnızca
            &quot;uyandırma&quot; sinyali yollar; mesaj içeriği ve rehberiniz cihazınızdan çıkmaz.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={notify || notificationsBlocked()}
              onClick={() =>
                void ensureNotificationPermission().then(async (ok) => {
                  setNotify(ok);
                  if (ok) await enableWebPush(getBrowserNodeId());
                })
              }
              className="wa-press rounded-full px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--wa-accent)" }}
            >
              {notify
                ? "Bildirimler açık"
                : notificationsBlocked()
                  ? "Tarayıcı engelledi"
                  : "Bildirimlere izin ver"}
            </button>
            {notify && (
              <button
                type="button"
                onClick={() =>
                  void disableWebPush().then(() => setNotify(notificationsAllowed()))
                }
                className="wa-press rounded-full border px-4 py-2 text-[13px] font-semibold"
                style={{ borderColor: "var(--wa-border)", color: "var(--wa-muted)" }}
              >
                Bu cihazda kapat
              </button>
            )}
          </div>
          <NotificationHealth />
        </section>
        </>
        )}

        {tab === "hakkinda" && (
        <>
        {/* Uygulamayı yükle */}
        <section className="mt-6">
          <h3 className="text-sm font-semibold">Uygulamayı yükle</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            Telefon, tablet ve bilgisayarınıza ücretsiz kurun; çevrimdışıyken de açılır ve
            güncellemeler otomatik iner.
          </p>
          <div className="mt-2">
            <InstallAppButton />
          </div>
        </section>
        <AppVersionSection />
        </>
        )}




        {tab === "gizlilik" && (
        <>
        {/* Kaybolan mesajlar */}
        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Timer className="h-4 w-4" aria-hidden /> Kaybolan mesajlar
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            {convId
              ? "Bu sohbette gönderilen mesajlar seçtiğiniz sürenin sonunda iki cihazdan da silinir."
              : "Bir sohbet açtığınızda süre seçebilirsiniz."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TTL_OPTIONS.map((o) => (
              <button
                key={o.ms}
                type="button"
                disabled={!convId}
                onClick={() => {
                  if (!convId) return;
                  setTtl(convId, o.ms);
                  setTtlValue(o.ms);
                }}
                className="rounded-full px-3 py-1.5 text-[12px] disabled:opacity-40"
                style={{
                  border: "1px solid var(--wa-border)",
                  background: ttl === o.ms ? "var(--wa-accent)" : "transparent",
                  color: ttl === o.ms ? "#fff" : "var(--wa-muted)",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
        <PrivacyPresenceSection />
        <DeviceSessionsSection />
        </>
        )}

        {tab === "gizlilik" && (
        <>
        {/* Ekran kilidi */}
        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Ekran kilidi
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            En az 4 haneli PIN. Cihazda yalnızca PBKDF2 türevi saklanır, PIN'in kendisi saklanmaz.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              placeholder={locked ? "Mevcut PIN" : "Yeni PIN"}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--wa-border)" }}
            />
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                const task = locked ? disableLock(pin) : enableLock(pin);
                void task.then((ok) => {
                  if (!ok) return setErr(locked ? "PIN hatalı." : "PIN en az 4 hane olmalı.");
                  setErr(null);
                  setPin("");
                  setLocked(!locked);
                  setMsg(
                    locked ? "Kilit kapatıldı." : "Kilit açıldı — uygulama beklemede kilitlenir.",
                  );
                });
              }}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
              style={{ background: locked ? "#e03131" : "var(--wa-accent)" }}
            >
              {locked ? "Kaldır" : "Etkinleştir"}
            </button>
          </div>
          {locked && (
            <label
              className="mt-2 flex items-center gap-2 text-xs"
              style={{ color: "var(--wa-muted)" }}
            >
              Hareketsizlik süresi
              <select
                value={minutes}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMinutes(v);
                  setAutoLockMinutes(v);
                }}
                className="rounded-md border px-2 py-1"
                style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
              >
                {[1, 5, 15, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} dakika
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>
        </>
        )}

        {tab === "esitleme" && <SyncStatusSection />}

        {tab === "depolama" && (
        <>
        {/* Yedekleme */}
        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Download className="h-4 w-4" aria-hidden /> Yedekleme ve cihaz taşıma
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            Tüm geçmiş, parolanızla şifrelenmiş tek bir .tbg dosyasına yazılır. Dosya buluta
            yüklenmez.
          </p>
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type="password"
            placeholder="Yedek parolası (en az 8 karakter)"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--wa-border)" }}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setErr(null);
                void createBackup(pass)
                  .then((b) => {
                    downloadBackup(b);
                    setMsg("Yedek indirildi.");
                  })
                  .catch((e: Error) => setErr(e.message));
              }}
              className="flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold text-white"
              style={{ background: "var(--wa-accent)" }}
            >
              Yedek al
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold"
              style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
            >
              <Upload className="mr-1 inline h-3.5 w-3.5" /> Geri yükle
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".tbg,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setErr(null);
              void f
                .text()
                .then((t) => restoreBackup(t, pass))
                .then((r) => setMsg(`${r.messages} mesaj geri yüklendi. Sayfayı yenileyin.`))
                .catch((x: Error) => setErr(x.message));
            }}
          />
        </section>
        </>
        )}

        {msg && (
          <p className="mt-4 text-xs" style={{ color: "var(--wa-accent)" }}>
            {msg}
          </p>
        )}
        {err && (
          <p className="mt-4 text-xs" style={{ color: "#e03131" }}>
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

/** Son görülme paylaşımı anahtarı. */
function PrivacyPresenceSection() {
  const [hidden, setHidden] = useState(() => getPrivacy().hideLastSeen);
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold">Son görülme</h3>
      <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
        Kapatırsanız kendi son görülme bilginiz paylaşılmaz; karşı tarafınki de size gösterilmez.
      </p>
      <label className="mt-2 flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={!hidden}
          onChange={(e) => {
            const show = e.target.checked;
            setHidden(!show);
            setPrivacy({ hideLastSeen: !show });
          }}
        />
        Son görülme bilgimi paylaş
      </label>
    </section>
  );
}

/** Aynı kimliğe bağlı cihazlar ve uzaktan çıkış. */
function DeviceSessionsSection() {
  const [rows, setRows] = useState<DeviceSession[]>([]);
  useEffect(() => {
    const sync = () => setRows(listSessions());
    sync();
    return onSessionsChange(sync);
  }, []);

  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="h-4 w-4" aria-hidden /> Bağlı cihazlar
      </h3>
      <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
        Aynı kimlikle açtığınız telefon ve bilgisayar oturumları. Mesajlar cihazlar arasında uçtan
        uca şifreli eşitlenir.
      </p>
      {rows.length === 0 && (
        <p className="mt-2 text-xs" style={{ color: "var(--wa-muted)" }}>
          Şu anda yalnızca bu cihaz bağlı.
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {rows.map((sx) => (
          <li
            key={sx.nodeId}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
            style={{ border: "1px solid var(--wa-border)" }}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{sx.label}</span>
              <span className="block text-[11px]" style={{ color: "var(--wa-muted)" }}>
                {sx.self ? "Bu cihaz" : `Son etkin: ${new Date(sx.lastSeen).toLocaleString("tr-TR")}`}
              </span>
            </span>
            {!sx.self && (
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  void revokeSession(sx.nodeId);
                }}
                className="wa-press shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
                style={{ background: "#e03131" }}
              >
                Çıkış yaptır
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
