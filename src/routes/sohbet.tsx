import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/ChatApp";

export const Route = createFileRoute("/sohbet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sohbet ve Görüşme — Tedbirge Protocol" },
      {
        name: "description",
        content:
          "İnternet varken bulut, kesildiğinde yakındaki cihazlar üzerinden çalışan uçtan uca şifreli mesajlaşma, sesli ve görüntülü görüşme.",
      },
      { property: "og:title", content: "Sohbet ve Görüşme — Tedbirge Protocol" },
      {
        property: "og:description",
        content:
          "Kesintide bile duran mesajlaşma: uçtan uca şifreli sohbet, dosya paylaşımı, sesli ve görüntülü arama.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SohbetPage,
});

/** Gömülü uygulama kabuğu: kurumsal site başlık/menüleri olmadan tam ekran. */
function SohbetPage() {
  return (
    <main className="fixed inset-0 z-40 bg-background">
      <h1 className="sr-only">Tedbirge Sohbet ve Görüşme</h1>
      <ChatApp />
    </main>
  );
}
