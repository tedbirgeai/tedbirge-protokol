import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelEnergy } from "@/components/site/PanelEnergy";

export const Route = createFileRoute("/enerji")({
  head: () => ({
    meta: [
      { title: "Saha Enerji Katmanı — Tedbirge Protocol" },
      {
        name: "description",
        content:
          "Güneş şarj kontrolcüsü, hibrit invertör ve GNSS alıcısını tarayıcıdan salt-okunur bağlayın; enerji bütçesi ve güneşsiz gün otonomisini hesaplayın.",
      },
      { property: "og:title", content: "Saha Enerji Katmanı — Tedbirge Protocol" },
      {
        property: "og:description",
        content:
          "Victron VE.Direct, Modbus RTU (EG4/Growatt/BMS) ve NMEA GNSS köprüsü ile saha düğümlerinin enerji otonomisini ölçün ve planlayın.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/enerji" }],
  }),
  component: EnergyPage,
});

function EnergyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Katman 12 · Enerji ve saha donanımı
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">Saha enerji katmanı</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Bir mesh düğümünün ömrünü radyo değil <strong className="text-foreground">enerji</strong>{" "}
        belirler. Bu katman, sahadaki güneş şarj kontrolcüsünü, hibrit invertörü/akü paketini ve
        konum alıcısını tarayıcıya bağlar; ölçümü panele taşır ve kurulum öncesi enerji bütçesini
        hesaplar. Köprü yalnızca okur — hiçbir cihaza komut gönderilmez.
      </p>

      <section className="mt-10">
        <PanelEnergy />
      </section>

      <section className="mt-12 rounded-sm border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Desteklenen donanım</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Victron VE.Direct:</strong> MPPT şarj kontrolcüleri,
            BMV akü izleyicileri — VE.Direct–USB kablosu, 19200 8N1.
          </li>
          <li>
            <strong className="text-foreground">Modbus RTU:</strong> EG4/Luxpower, Growatt/Deye
            hibrit invertörler ve PACE/JBD BMS paketleri — RS485–USB dönüştürücü.
          </li>
          <li>
            <strong className="text-foreground">GNSS / RTK:</strong> NMEA 0183 çıkışlı alıcılar;
            sabitleme kalitesi ve uydu sayısı saha raporuna işlenir.
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Kablosuz şarj ve hibrit enerji zinciri seçenekleri için{" "}
          <Link to="/kablosuz-sarj" className="text-primary underline">
            kablosuz şarj rehberi
          </Link>
          , canlı saha izleme için{" "}
          <Link to="/pilot-panosu" className="text-primary underline">
            pilot panosu
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
