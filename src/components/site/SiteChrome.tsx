import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Genel Bakış" },
  { to: "/urun", label: "Ürün" },
  { to: "/fiyatlandirma", label: "Fiyatlandırma" },
  { to: "/dokumanlar", label: "Dokümanlar" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-sm border border-primary/40 bg-primary/10">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_2px_var(--color-primary)]" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground">
            AETHERIS
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-sm text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/tedbirgeai/aetheris"
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            GitHub
          </a>
          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Demo Talep Et
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-mono text-sm font-semibold tracking-[0.2em]">AETHERIS PROTOCOL</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Taşıyıcı-bağımsız, sıfır-bilgi tünel geçidi ve mesh SDK'sı. Tek statik binary,
            dış bağımlılık yok, off-grid çalışır.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Ürün</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/urun" className="text-muted-foreground hover:text-foreground">Yetenekler</Link></li>
            <li><Link to="/fiyatlandirma" className="text-muted-foreground hover:text-foreground">Fiyatlandırma</Link></li>
            <li><Link to="/dokumanlar" className="text-muted-foreground hover:text-foreground">Dokümanlar</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Şirket</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/iletisim" className="text-muted-foreground hover:text-foreground">İletişim</Link></li>
            <li>
              <a href="https://github.com/tedbirgeai/aetheris" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                Kaynak kod
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Aetheris Protocol</span>
          <span>v0.6a-turnkey · Ed25519 · AES-256-GCM</span>
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{children}</p>
  );
}
