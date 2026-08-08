/**
 * UYGULAMALAR EKRANI (.tbapp)
 * ------------------------------------------------------------------
 * Paket seçilir → yetkiler sorulur → onaylanırsa Wasm modülü kabuk
 * içinde, yalnız onaylanan yeteneklerle çalıştırılır.
 */

import { useEffect, useRef, useState } from "react";
import { Boxes, Play, Share2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CapabilityDialog } from "@/components/shell/CapabilityDialog";
import type { Capability } from "@/kernel/capabilities";
import {
  installTbApp,
  installedTbApps,
  instantiateTbApp,
  readTbAppFile,
  restoreInstalledTbApps,
  uninstallTbApp,
  type TbAppManifest,
} from "@/apps/tbapp";
import {
  TRUST_LABELS,
  canInstall,
  isDeveloperMode,
  packageTrust,
  setDeveloperMode,
} from "@/apps/package";
import { shareTbApp } from "@/apps/distribution";
import {
  CAPABILITY_LABELS,
  grantCapabilities,
  grantedCapabilities,
  revokeCapabilities,
} from "@/shell/permissions";

export function AppsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [apps, setApps] = useState<TbAppManifest[]>([]);
  const [pending, setPending] = useState<TbAppManifest | null>(null);
  const [dev, setDev] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreInstalledTbApps();
    setApps(installedTbApps());
    setDev(isDeveloperMode());
  }, [open]);

  async function pick(file: File) {
    try {
      const m = await readTbAppFile(file);
      const trust = packageTrust(m);
      if (!canInstall(trust, dev)) {
        toast.error(TRUST_LABELS[trust.level].detail);
        return;
      }
      setPending(m);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Paket yüklenemedi.");
    }
  }

  async function share(m: TbAppManifest) {
    try {
      await shareTbApp(m);
      toast.success(`${m.name} yakındaki düğümlere gönderildi.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Paket paylaşılamadı.");
    }
  }


  async function run(m: TbAppManifest, granted: Capability[]) {
    try {
      const inst = await instantiateTbApp(m, granted);
      const start = inst.exports["start"];
      if (typeof start === "function") (start as () => void)();
      toast.success(`${m.name} çalışıyor.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uygulama başlatılamadı.");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" aria-hidden />
              Uygulamalar
            </DialogTitle>
            <DialogDescription>
              Tedbirge paketlerini (.tbapp) cihazınıza ekleyin. Her paket yalnız onayladığınız
              yetkilerle, kabuk içinde ayrı bir kutuda çalışır.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={fileRef}
            type="file"
            accept=".tbapp,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pick(f);
            }}
          />

          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" aria-hidden />
            Paket ekle (.tbapp)
          </Button>

          <label className="flex items-start gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Geliştirici modu</p>
              <p className="text-xs text-muted-foreground">
                Açıkken imzasız paketler de kurulabilir. Bozuk paketler her durumda reddedilir.
              </p>
            </div>
            <Switch
              checked={dev}
              onCheckedChange={(v) => {
                setDeveloperMode(v);
                setDev(v);
              }}
              aria-label="Geliştirici modu"
            />
          </label>

          <ul className="space-y-2">
            {apps.length === 0 && (
              <li className="text-sm text-muted-foreground">Henüz uygulama eklenmedi.</li>
            )}
            {apps.map((m) => {
              const granted = grantedCapabilities(m.id);
              const trust = packageTrust(m);
              return (
                <li key={m.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.name} <span className="text-muted-foreground">v{m.version}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {granted.length
                        ? granted.map((c) => CAPABILITY_LABELS[c].title).join(" · ")
                        : "Yetki verilmedi"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {TRUST_LABELS[trust.level].title} · {trust.fingerprint}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Paylaş"
                    onClick={() => void share(m)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Çalıştır" onClick={() => void run(m, granted)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Kaldır"
                    onClick={() => {
                      uninstallTbApp(m.id);
                      revokeCapabilities(m.id);
                      setApps(installedTbApps());
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>

        </DialogContent>
      </Dialog>

      <CapabilityDialog
        open={pending !== null}
        appName={pending?.name ?? ""}
        requested={pending?.capabilities ?? []}
        onCancel={() => setPending(null)}
        onApprove={(granted) => {
          if (!pending) return;
          installTbApp(pending);
          grantCapabilities(pending.id, granted);
          setApps(installedTbApps());
          const m = pending;
          setPending(null);
          void run(m, granted);
        }}
      />
    </>
  );
}
