import { useEffect, useState } from "react";

/**
 * Bağlantı durumu şeridi. Hat koptuğunda bunun telefonun bulut bağlantısı
 * olduğunu net söyler; PWA önbelleği ile gerçek radyo/mesh taşıyıcısını
 * birbirine karıştırmaz.
 */
export function OfflineBanner() {
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

  const message = offline
    ? "Telefonun interneti koptu — uygulama önbellekten açık. Taşıyıcı devreye girmesi için sahada çevrimiçi gateway + röle + saha radyo düğümü gerekir."
    : recovered
      ? "Bağlantı geri geldi — veriler güncelleniyor."
      : updateMessage;

  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[60] px-3 py-2 text-center text-xs font-medium ${
        offline
          ? "bg-destructive text-destructive-foreground"
          : recovered
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
      }`}
    >
      {message}
    </div>
  );
}
