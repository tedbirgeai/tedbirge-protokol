/**
 * GELEN PAKET TEKLİFİ (Faz D)
 * ------------------------------------------------------------------
 * Yakındaki bir düğüm size uygulama paketi gönderdiğinde hiçbir şey
 * kendiliğinden kurulmaz. Önce paketin adı, parmak izi ve güven durumu
 * gösterilir; kabul edilirse yetki ekranı açılır.
 */

import { useEffect, useState } from "react";
import { PackageCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CapabilityDialog } from "@/components/shell/CapabilityDialog";
import { onAppOffer, type AppOffer } from "@/apps/distribution";
import { TRUST_LABELS, canInstall } from "@/apps/package";
import { installTbApp, instantiateTbApp } from "@/apps/tbapp";
import { grantCapabilities } from "@/shell/permissions";
import type { Capability } from "@/kernel/capabilities";

export function AppOfferHost() {
  const [offer, setOffer] = useState<AppOffer | null>(null);
  const [asking, setAsking] = useState<AppOffer | null>(null);

  useEffect(() => onAppOffer((o) => setOffer((cur) => cur ?? o)), []);

  const trust = offer?.trust;
  const info = trust ? TRUST_LABELS[trust.level] : null;
  const allowed = trust ? canInstall(trust) : false;

  return (
    <>
      <Dialog open={offer !== null} onOpenChange={(v) => (!v ? setOffer(null) : undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" aria-hidden />
              Uygulama paketi geldi
            </DialogTitle>
            <DialogDescription>
              Yakındaki bir düğüm size bir Tedbirge paketi gönderdi. Kabul etmeden hiçbir şey
              kurulmaz.
            </DialogDescription>
          </DialogHeader>

          {offer && trust && info && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {offer.pkg.name} <span className="text-muted-foreground">v{offer.pkg.version}</span>
              </p>
              <div className="flex items-start gap-2 rounded-lg border p-3">
                {trust.level === "signed" ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4" aria-hidden />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{info.title}</p>
                  <p className="text-xs text-muted-foreground">{info.detail}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Parmak izi: <span className="font-mono">{trust.fingerprint}</span>
              </p>
              {!allowed && (
                <p className="text-xs text-muted-foreground">
                  Bu paket yüklenemez. İmzasız paketleri yüklemek için Uygulamalar ekranından
                  geliştirici modunu açın.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOffer(null)}>
              Reddet
            </Button>
            <Button
              disabled={!allowed}
              onClick={() => {
                setAsking(offer);
                setOffer(null);
              }}
            >
              Devam et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CapabilityDialog
        open={asking !== null}
        appName={asking?.pkg.name ?? ""}
        requested={asking?.pkg.capabilities ?? []}
        onCancel={() => setAsking(null)}
        onApprove={(granted: Capability[]) => {
          const pkg = asking?.pkg;
          setAsking(null);
          if (!pkg) return;
          installTbApp(pkg);
          grantCapabilities(pkg.id, granted);
          void instantiateTbApp(pkg, granted)
            .then((inst) => {
              const start = inst.exports["start"];
              if (typeof start === "function") (start as () => void)();
              toast.success(`${pkg.name} kuruldu.`);
            })
            .catch((e: unknown) =>
              toast.error(e instanceof Error ? e.message : "Uygulama başlatılamadı."),
            );
        }}
      />
    </>
  );
}
