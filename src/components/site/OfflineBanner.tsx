import { useEffect, useState } from "react";
import { describeTier, useAccessTier } from "@/lib/access-tiers";

/**
 * Bağlantı durumu şeridi. İnternet koptuğunda melez erişim motorunun hangi
 * katmana düştüğünü sade Türkçe ile bildirir (teknik jargon yok).
 */
export function OfflineBanner() {
  const access = useAccessTier();
  const [offline, setOffline] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      setRecovered(false);
    };
    const goOnline = () => {
      setOffline(false);
      setRecovered(true);
      window.setTimeout(() => setRecovered(false), 4000);
    };
    setOffline(!navigator.onLine);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (!detail?.message) return;
      setUpdateMessage(detail.message);
      window.setTimeout(() => setUpdateMessage(null), 6000);
    };
    window.addEventListener("tedbirge:pwa-update", onUpdate);
    return () => window.removeEventListener("tedbirge:pwa-update", onUpdate);
  }, []);

  if (!offline && !recovered && !updateMessage) return null;

  const tierInfo = describeTier(access);
  const message = offline
    ? `${tierInfo.message} Uygulama önbellekten kesintisiz açılmaya devam ediyor.`
    : recovered
      ? "Bağlantı geri geldi — veriler güncelleniyor."
      : updateMessage;

  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[60] px-3 py-2 text-center text-xs font-medium ${
        offline
          ? access.tier === "local"
            ? "bg-amber-400 text-background"
            : "bg-destructive text-destructive-foreground"
          : recovered
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
      }`}
    >
      {message}
    </div>
  );
}
