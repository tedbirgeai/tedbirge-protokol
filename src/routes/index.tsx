import { createFileRoute } from "@tanstack/react-router";
import { MarketingHome } from "@/components/site/MarketingHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tedbirge Protocol — Kesintisiz Bağlantı Platformu" },
      {
        name: "description",
        content:
          "İnternet kesildiğinde de çalışan kurumsal ağ altyapısı. Uçtan uca şifreli, kurulum gerektirmeyen, 7 katmanlı Tedbirge Protocol ve Resilience-as-a-Service modeli.",
      },
      { property: "og:title", content: "Tedbirge Protocol — Kesintisiz Bağlantı Platformu" },
      {
        property: "og:description",
        content:
          "Kesintisiz bağlantı, otomatik yedekleme ve çevrimdışı veri güvenliği. 2 tıkla kurulan kurumsal ağ platformu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return <MarketingHome />;
}
