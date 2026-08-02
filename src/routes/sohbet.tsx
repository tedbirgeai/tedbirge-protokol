import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/ChatApp";
import { SiteChrome } from "@/components/site/SiteChrome";

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

function SohbetPage() {
  return (
    <SiteChrome>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Sohbet ve görüşme</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Günlük kullanımda tanıdık bir mesajlaşma deneyimi; bağlantı koptuğunda mesajlarınız yakındaki
            cihazlar üzerinden iletilmeye devam eder. Tüm içerik yalnızca cihazlarda çözülür.
          </p>
        </header>
        <ChatApp />
      </main>
    </SiteChrome>
  );
}
