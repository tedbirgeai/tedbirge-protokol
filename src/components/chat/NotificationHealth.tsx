/**
 * Bildirim sağlık kontrolü.
 * ------------------------------------------------------------------
 * "Uygulama kapalıyken bildirim gelmiyor" sorununun bilinen tüm
 * nedenlerini tek ekranda gösterir ve her biri için net çözüm verir.
 * iOS/Safari'de bildirim yalnızca uygulama ana ekrana eklendiğinde
 * çalışır — bu kural burada açıkça denetlenir.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Check, RefreshCw, X } from "lucide-react";
import { webPushSupported } from "@/lib/chat/webpush";

type Check = { id: string; label: string; ok: boolean; hint: string; blocking: boolean };

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

async function collect(): Promise<Check[]> {
  const list: Check[] = [];
  const secure = typeof window !== "undefined" && window.isSecureContext;
  list.push({
    id: "secure",
    label: "Güvenli bağlantı (HTTPS)",
    ok: secure,
    hint: "Bildirimler yalnızca https adresinde çalışır. Yayınlanmış adresi kullanın.",
    blocking: true,
  });

  const supported = webPushSupported();
  list.push({
    id: "support",
    label: "Tarayıcı bildirim desteği",
    ok: supported,
    hint: "Bu tarayıcı arka plan bildirimini desteklemiyor. Chrome, Edge veya Safari 16.4+ kullanın.",
    blocking: true,
  });

  const perm = typeof Notification !== "undefined" ? Notification.permission : "default";
  list.push({
    id: "permission",
    label: "Bildirim izni verildi",
    ok: perm === "granted",
    hint:
      perm === "denied"
        ? "İzin engellenmiş. Tarayıcı adres çubuğundaki kilit simgesinden bildirimlere izin verin."
        : "Yukarıdaki 'Bildirimlere izin ver' düğmesine dokunun.",
    blocking: true,
  });

  const installed = isStandalone();
  list.push({
    id: "installed",
    label: isIos() ? "Uygulama ana ekrana eklendi (iPhone/iPad için zorunlu)" : "Uygulama kurulu",
    ok: installed,
    hint: isIos()
      ? "iPhone/iPad'de Safari ile açın → Paylaş → 'Ana Ekrana Ekle'. Bildirim yalnızca bu şekilde çalışır."
      : "Kurmadan da bildirim gelir; kurarsanız uygulama daha hızlı açılır ve çevrimdışı çalışır.",
    blocking: isIos(),
  });

  let swOk = false;
  let subOk = false;
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      swOk = Boolean(reg);
      const sub = await reg?.pushManager?.getSubscription();
      subOk = Boolean(sub);
    } catch {
      swOk = false;
    }
  }
  list.push({
    id: "sw",
    label: "Arka plan servisi çalışıyor",
    ok: swOk,
    hint: "Sayfayı bir kez yenileyin; servis otomatik kurulur.",
    blocking: true,
  });
  list.push({
    id: "sub",
    label: "Cihaz bildirim aboneliği kayıtlı",
    ok: subOk,
    hint: "Bildirim iznini verdikten sonra abonelik otomatik oluşur. Gelmezse izni kapatıp açın.",
    blocking: true,
  });

  return list;
}

export function NotificationHealth() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    void collect().then((c) => {
      setChecks(c);
      setBusy(false);
    });
  };

  useEffect(run, []);

  const failing = (checks ?? []).filter((c) => !c.ok && c.blocking);

  return (
    <div
      className="mt-3 rounded-xl border p-3"
      style={{ borderColor: "var(--wa-border)", background: "var(--wa-panel-soft)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Bildirim sağlık kontrolü</p>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="wa-press inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px]"
          style={{ color: "var(--wa-muted)" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
          Yenile
        </button>
      </div>

      <ul className="mt-2 space-y-1.5">
        {(checks ?? []).map((c) => (
          <li key={c.id} className="text-[12.5px]">
            <span className="flex items-start gap-2">
              {c.ok ? (
                <Check className="mt-[2px] h-3.5 w-3.5 shrink-0" style={{ color: "#0b7d6c" }} />
              ) : c.blocking ? (
                <X className="mt-[2px] h-3.5 w-3.5 shrink-0" style={{ color: "#e03131" }} />
              ) : (
                <AlertTriangle
                  className="mt-[2px] h-3.5 w-3.5 shrink-0"
                  style={{ color: "#c98a00" }}
                />
              )}
              <span>
                <span style={{ color: "var(--wa-text)" }}>{c.label}</span>
                {!c.ok && (
                  <span className="block" style={{ color: "var(--wa-muted)" }}>
                    {c.hint}
                  </span>
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {checks && failing.length === 0 && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--wa-muted)" }}>
          Her şey hazır: uygulama kapalıyken de mesaj ve arama bildirimi alırsınız.
        </p>
      )}
    </div>
  );
}
