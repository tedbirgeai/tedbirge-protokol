import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/components/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tedbirge Protocol — İnternet Kesilse de Çalışan Ağ" },
      {
        name: "description",
        content:
          "İnternet kesildiğinde de çalışmaya devam eden kurumsal ağ altyapısı: uçtan uca şifreli mesh haberleşme, 10 taşıyıcı ve Resilience-as-a-Service abonelik modeli.",
      },
      { property: "og:title", content: "Tedbirge Protocol — İnternet Kesilse de Çalışan Ağ" },
      {
        property: "og:description",
        content:
          "Kesintisiz bağlantı, otomatik yedekleme ve çevrimdışı veri güvenliği. Tarayıcıdan 2 tıkla kurulan kurumsal ağ platformu.",
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
