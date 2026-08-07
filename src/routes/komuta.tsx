import { createFileRoute } from "@tanstack/react-router";
import { CommandConsole } from "@/components/console/CommandConsole";

export const Route = createFileRoute("/komuta")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Komuta Konsolu — Tedbirge Protocol" },
      {
        name: "description",
        content:
          "3 sütunlu ultra-modern protokol ve messenger komuta paneli: ağ durumu, şifreli iletişim kanalları ve AI destekli anlık analiz.",
      },
      { property: "og:title", content: "Komuta Konsolu — Tedbirge Protocol" },
      {
        property: "og:description",
        content: "Protokol düğümleri, aktif tüneller, şifreli kanallar ve AI analiz tek ekranda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/komuta" }],
  }),
  component: KomutaRoute,
});

function KomutaRoute() {
  return (
    <main className="fixed inset-0 z-40 bg-background">
      <h1 className="sr-only">Tedbirge Komuta Konsolu</h1>
      <CommandConsole />
    </main>
  );
}
