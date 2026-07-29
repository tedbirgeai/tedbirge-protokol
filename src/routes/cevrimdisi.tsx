import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/cevrimdisi")({
  head: () => ({
    meta: [
      { title: "Çevrimdışı mod — Tedbirge Gateway" },
      {
        name: "description",
        content:
          "Bağlantı yokken Tedbirge Gateway önbellekten açılır. Saha modunda ne çalışır, ne çalışmaz burada.",
      },
      { property: "og:title", content: "Çevrimdışı mod — Tedbirge Gateway" },
      {
        property: "og:description",
        content: "İnternet kesildiğinde uygulama açık kalır; veriler bağlantı dönünce eşitlenir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-5 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Tedbirge Gateway
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {online ? "Bağlantı geri geldi" : "Çevrimdışı moddasınız"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {online
            ? "İnternet erişimi tespit edildi. Panele dönüp canlı verileri yenileyebilirsiniz."
            : "Uygulama kabuğu cihazınızda önbelleğe alındığı için açıldı. Canlı telemetri, panel verisi ve kuyruk işlemleri bağlantı döndüğünde otomatik eşitlenir."}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <h2 className="font-medium text-foreground">Çevrimdışıyken ne çalışır?</h2>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>• Uygulama arayüzü, rehberler ve daha önce açtığınız sayfalar açılır.</li>
          <li>• Kurulum sihirbazı adımları ve kapsama hesapları cihaz üzerinde çalışır.</li>
          <li>• Düğümler arası mesh trafiği, sunucudan bağımsız olarak röle zinciri üzerinden sürer.</li>
          <li>• Sunucu tarafı canlı veriler (telemetri, kuyruk, kesinti kayıtları) duraklar.</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Yeniden dene
        </button>
        <Link
          to="/saha"
          className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground"
        >
          Saha portalı
        </Link>
        <Link
          to="/"
          className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground"
        >
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
