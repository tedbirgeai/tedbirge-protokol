/**
 * Eş Parmak İzi Doğrulama Penceresi (Faz 2).
 * ------------------------------------------------------------------
 * Üç yöntem aynı Ed25519 anahtarından türer; hangisi kullanılırsa
 * kullanılsın sonuç aynıdır:
 *   QR     — iki cihaz yan yanayken kamerasız, ekran karşılaştırması
 *   Emoji  — telefonla/sözlü okuma için 5 sembol
 *   Manuel — 4 blok × 4 karakter onaltılık kod
 * Onay verildiğinde IndexedDB peers deposuna verifiedAt + knownSignPublic
 * yazılır. Anahtar sonradan değişirse rozet "değişti" durumuna düşer.
 */

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  confirmPeerVerified,
  emojiFingerprint,
  manualBlocks,
  qrPayload,
  revokePeerVerification,
  TRUST_LABEL,
  type TrustStatus,
} from "@/lib/peer-trust";

export type PeerVerifyTarget = {
  peerId: string;
  signPublic?: string;
  fingerprint?: string;
  trust?: TrustStatus;
};

export function TrustBadge({ trust }: { trust?: TrustStatus }) {
  const status = trust ?? "unknown";
  const variant =
    status === "manual" ? "default" : status === "changed" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} className="font-mono text-[10px] uppercase tracking-wide">
      {TRUST_LABEL[status]}
    </Badge>
  );
}

export function PeerVerifyDialog({
  target,
  open,
  onOpenChange,
  onChanged,
}: {
  target: PeerVerifyTarget | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: (peerId: string, status: TrustStatus) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const spk = target?.signPublic ?? "";
  const emojis = useMemo(() => (spk ? emojiFingerprint(spk) : []), [spk]);
  const blocks = useMemo(() => (spk ? manualBlocks(spk) : []), [spk]);

  useEffect(() => {
    if (!open || !target?.peerId || !spk) {
      setQr(null);
      return;
    }
    let alive = true;
    void QRCode.toDataURL(qrPayload(target.peerId, spk), { margin: 1, width: 240 })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => setQr(null));
    return () => {
      alive = false;
    };
  }, [open, target?.peerId, spk]);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    try {
      const status = await confirmPeerVerified(target.peerId, spk || undefined);
      onChanged?.(target.peerId, status);
      toast.success("Eş doğrulandı", { description: `${target.peerId} artık manuel onaylı.` });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!target) return;
    setBusy(true);
    try {
      const status = await revokePeerVerification(target.peerId);
      onChanged?.(target.peerId, status);
      toast("Doğrulama geri alındı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="wa wa-scope max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Parmak izi doğrulama
            <TrustBadge trust={target?.trust} />
          </DialogTitle>
          <DialogDescription>
            Karşı cihazdaki değerlerle birebir aynı olmalıdır. Farklıysa <strong>onaylamayın</strong> —
            araya giren bir düğüm olabilir.
          </DialogDescription>
        </DialogHeader>

        {!spk ? (
          <p className="text-sm text-muted-foreground">
            Bu eşin genel anahtarı henüz alınmadı. Eş el sıkışması tamamlanınca tekrar deneyin.
          </p>
        ) : (
          <>
            {target?.trust === "changed" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                Bu eşin daha önce kaydedilen anahtarı değişti. Yalnızca kişiyi tanıyor ve değerler
                eşleşiyorsa onaylayın.
              </div>
            )}

            <Tabs defaultValue="qr">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="qr">QR</TabsTrigger>
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="manual">Manuel</TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="flex flex-col items-center gap-3 py-4">
                {qr ? (
                  <img src={qr} alt="Eş parmak izi QR kodu" className="rounded-md border" width={240} height={240} />
                ) : (
                  <p className="text-sm text-muted-foreground">QR üretiliyor…</p>
                )}
                <p className="text-center text-xs text-muted-foreground">
                  Karşı cihazda aynı eş için üretilen QR ile görsel olarak karşılaştırın.
                </p>
              </TabsContent>

              <TabsContent value="emoji" className="py-4">
                <div className="flex justify-center gap-3 text-4xl">
                  {emojis.map((e, i) => (
                    <span key={`${e}-${i}`} aria-hidden>
                      {e}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Telefonla okuyup karşılaştırmak için 5 sembol. Sıra da aynı olmalıdır.
                </p>
              </TabsContent>

              <TabsContent value="manual" className="py-4">
                <div className="flex flex-wrap justify-center gap-2 font-mono text-lg">
                  {blocks.map((b) => (
                    <span key={b} className="rounded bg-muted px-2 py-1">
                      {b}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Ed25519 anahtarının SHA-256 özetinden türeyen 16 karakterlik kod.
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap justify-end gap-2">
              {target?.trust === "manual" && (
                <Button variant="outline" onClick={revoke} disabled={busy}>
                  Doğrulamayı geri al
                </Button>
              )}
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Vazgeç
              </Button>
              <Button onClick={confirm} disabled={busy}>
                Değerler eşleşiyor, onayla
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PeerVerifyDialog;
