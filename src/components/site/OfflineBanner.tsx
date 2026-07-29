import { useEffect, useState } from "react";

/**
 * Bağlantı durumu şeridi. Hat koptuğunda bunun telefonun bulut bağlantısı
 * olduğunu net söyler; PWA önbelleği ile gerçek radyo/mesh taşıyıcısını
 * birbirine karıştırmaz.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [recovered, setRecovered] = useState(false);

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

  if (!offline && !recovered) return null;

  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[60] px-3 py-2 text-center text-xs font-medium ${
        offline
          ? "bg-destructive text-destructive-foreground"
          : "bg-primary text-primary-foreground"
      }`}
    >
      {offline
        ? "Telefonun interneti koptu — uygulama önbellekten açık. Taşıyıcı devreye girmesi için sahada çevrimiçi gateway + röle + saha radyo düğümü gerekir."
        : "Bağlantı geri geldi — veriler güncelleniyor."}
    </div>
  );
}
