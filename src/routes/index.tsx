import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/ChatApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tedbirge Protocol — Kesintisiz Sohbet ve Görüşme" },
      {
        name: "description",
        content:
          "İnternet varken bulut, kesildiğinde yakındaki cihazlar üzerinden çalışan uçtan uca şifreli mesajlaşma, sesli ve görüntülü görüşme.",
      },
      { property: "og:title", content: "Tedbirge Protocol — Kesintisiz Sohbet ve Görüşme" },
      {
        property: "og:description",
        content:
          "Kesintide bile duran mesajlaşma: uçtan uca şifreli sohbet, dosya paylaşımı, sesli ve görüntülü arama.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="fixed inset-0 z-40 bg-background">
      <h1 className="sr-only">Tedbirge Sohbet ve Görüşme</h1>
      <ChatApp />
    </main>
  );
}
