import { createFileRoute } from "@tanstack/react-router";
import { MeshDemo } from "@/components/site/MeshDemo";

const TITLE = "Canlı Mesh Demosu — Tedbirge Protokol Simülasyonu";
const DESC =
  "Tarayıcıda çalışan üç düğümlü Tedbirge mesh simülasyonu: röle düğümü kapatın, yolun yeniden kurulmasını ve şifreli paket akışını canlı izleyin.";
const URL = "https://tedbirge-gateway.lovable.app/demo";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: MeshDemo,
});
