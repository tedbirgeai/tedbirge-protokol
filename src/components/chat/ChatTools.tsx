import { useEffect, useRef, useState } from "react";
import { Lock, Search, ShieldCheck, Timer, X, Download, Upload, Bell } from "lucide-react";
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
import { useChatSkin } from "@/lib/chat/skin";


const panel = { background: "var(--wa-panel)", color: "var(--wa-text)" } as const;

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

/** Gizlilik ve yedekleme ayarları. */
export function ChatSettingsDialog({
  open,
  onClose,
  convId,
}: {
  open: boolean;
  onClose: () => void;
  convId: string | null;
}) {
  const [pin, setPin] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [ttl, setTtlValue] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [notify, setNotify] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLocked(lockEnabled());
    setMinutes(autoLockMinutes());
    setNotify(notificationsAllowed());
    setTtlValue(convId ? ttlOf(convId) : 0);
    setMsg(null);
    setErr(null);
  }, [open, convId]);

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
          <h2 className="text-lg font-semibold">Gizlilik ve yedekleme</h2>
          <button
            type="button"
            onClick={onClose}
            className="wa-press rounded-full p-2"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
          </button>
        </div>

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

        {/* Arayüz görünümü */}
        <section className="mt-6">
          <h3 className="text-sm font-semibold">Arayüz görünümü</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
            Yeni arayüzü beğenmezseniz tek dokunuşla eski görünüme dönebilirsiniz.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                { id: "pro", label: "Yeni arayüz" },
                { id: "klasik", label: "Klasik arayüz" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  pressFeedback();
                  setSkinChoice(o.id);
                }}
                className="wa-press rounded-full border px-4 py-2 text-[13px] font-semibold"
                style={
                  skin === o.id
                    ? { background: "var(--wa-accent)", color: "#fff", borderColor: "transparent" }
                    : { borderColor: "var(--wa-border)", color: "var(--wa-muted)" }
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>



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
