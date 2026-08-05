/**
 * REHBER PENCERESİ — üç katmanlı kimlik (kalıcı kısa kimlik + doğrulama
 * rozeti + kendi takma adınız). Telefon numarası istenmez, cihaz rehberi
 * okunmaz; tüm veri yalnızca bu cihazda kalır (KVKK / GDPR uyumlu).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  BadgeCheck,
  Copy,
  Download,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PeerVerifyDialog,
  TrustBadge,
  type PeerVerifyTarget,
} from "@/components/site/PeerVerifyDialog";
import {
  autoSyncContacts,
  deviceContactsSupported,
  importContactsFile,
} from "@/lib/chat/directory";

import {
  eraseAllContacts,
  eraseContact,
  exportContactsData,
  refreshContacts,
  setNickname,
  shortIdOf,
  useContacts,
  type Contact,
} from "@/lib/chat/contacts";
import { qrPayload } from "@/lib/peer-trust";
import { getPhone } from "@/lib/chat/profile";
import { backupContacts, restoreContacts } from "@/lib/chat/vault";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ContactRow({
  c,
  onOpen,
  onVerify,
}: {
  c: Contact;
  onOpen?: (peerId: string) => void;
  onVerify: (t: PeerVerifyTarget) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.nickname ?? "");

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
          <UserRound className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">
              {c.displayName}
            </p>
            <TrustBadge trust={c.trust} />
            {c.ambiguous && (
              <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                <ShieldAlert className="h-3 w-3" aria-hidden /> aynı adlı başka kişi var
              </span>
            )}
          </div>
          {c.claimedName && !c.nickname && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Beyan edilen ad: {c.claimedName}
            </p>
          )}
          {c.trust === "changed" && (
            <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              Bu kişinin güvenlik parmak izi değişti. Görüşmeden önce yeniden doğrulayın.
              <Button
                size="sm"
                variant="destructive"
                className="ml-2 h-6 px-2 text-[11px]"
                onClick={() =>
                  onVerify({
                    peerId: c.peerId,
                    signPublic: c.signPublic,
                    fingerprint: c.fingerprint,
                    trust: c.trust,
                  })
                }
              >
                Yeniden doğrula
              </Button>
            </div>
          )}
          {c.nickname && c.claimedName && c.nickname !== c.claimedName && (
            <p className="text-[11px] text-muted-foreground">Kendi beyanı: {c.claimedName}</p>
          )}

          {editing ? (
            <div className="mt-2 flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bu kişiye vereceğiniz ad"
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                size="sm"
                className="h-8"
                onClick={() => {
                  setNickname(c.peerId, name);
                  setEditing(false);
                  toast.success("Ad bu cihaza kaydedildi");
                }}
              >
                Kaydet
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-3 w-3" /> Ad ver
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() =>
                  onVerify({
                    peerId: c.peerId,
                    signPublic: c.signPublic,
                    fingerprint: c.fingerprint,
                    trust: c.trust,
                  })
                }
              >
                <BadgeCheck className="mr-1 h-3 w-3" /> Doğrula
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  void navigator.clipboard?.writeText(c.shortId);
                  toast("Kimlik kopyalandı");
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Kimliği kopyala
              </Button>
              {onOpen && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => onOpen(c.peerId)}
                >
                  Sohbeti aç
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-destructive"
                onClick={() => {
                  void eraseContact(c.peerId).then(() => toast("Kişi cihazdan silindi"));
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" /> Sil
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Cihaz rehberini eşitler. Tarayıcı rehbere doğrudan erişemiyorsa
 * (iPhone/Safari, masaüstü) rehber dosyası (.vcf) ile aynı eşleştirme
 * yapılır. Numaralar cihazdan çıkmaz.
 */
function SyncContactsRow() {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [people, setPeople] = useState<{ peerId: string; name: string; shortId: string }[]>([]);

  // Açılışta otomatik eşitleme: kullanıcı hiçbir butona basmadan
  // rehberi yeniden eşleştirilir.
  useEffect(() => {
    void autoSyncContacts()
      .then((r) => {
        setPeople(r.people);
        if (r.checked > 0)
          setInfo(`${r.checked} kişi denetlendi · ${r.matched} Tedbirge kullanıcısı eşleşti.`);
      })
      .catch(() => null);
  }, []);

  const runAuto = () => {
    setBusy(true);
    void autoSyncContacts()
      .then((r) => {
        if (r.source === "none") {
          setInfo(
            deviceContactsSupported()
              ? "Rehber izni verilmedi. Telefon ayarlarından Tedbirge rehber iznini açın."
              : "Bu cihazın tarayıcısı otomatik rehber erişimini desteklemiyor; dosya penceresi açılmadı.",
          );
          return;
        }
        setPeople(r.people);
        setInfo(`${r.checked} kişi denetlendi · ${r.matched} Tedbirge kullanıcısı eşleşti.`);
        toast.success("Rehber eşitlendi");
      })
      .catch(() => setInfo("Eşitleme başarısız oldu, tekrar deneyin."))
      .finally(() => setBusy(false));
  };

  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    void importContactsFile(file)
      .then((r) => {
        if (r.checked === 0) {
          setInfo(
            "Dosya okunamadı. iPhone'da Kişiler > Tümünü paylaş > .vcf, Google'da contacts.google.com > Dışa aktar > CSV seçin.",
          );
          toast.error("Rehber dosyası tanınmadı");
          return;
        }
        setPeople(r.people);
        setInfo(`${r.checked} kişi okundu · ${r.matched} kişi Tedbirge'de bulundu.`);
        toast.success("Rehber yüklendi");
      })
      .catch(() => setInfo("Rehber dosyası okunamadı, tekrar deneyin."))
      .finally(() => {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/50 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">Rehberim otomatik eşitlenir</p>
        <p className="text-xs text-muted-foreground">
          {info ??
            "Her açılışta ve yarım saatte bir arka planda çalışır; tanıdıklarınız katıldıkça kendiliğinden eklenir. Numaralar cihazdan çıkmaz."}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" /> Rehber dosyası yükle
        </Button>
        <Button size="sm" disabled={busy} onClick={runAuto}>
          {busy ? "Eşitleniyor…" : "Şimdi eşitle"}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="w-full space-y-1 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          Tüm rehberin kendiliğinden gelmesi yalnızca Tedbirge mobil uygulamasında mümkündür
          (sistem rehber izni). Android tarayıcıda seçtiğiniz kişiler; iPhone ve masaüstünde bir kez
          yüklediğiniz rehber dosyası kullanılır — sonrası otomatik tazelenir.
        </p>
        <p>
          <strong>iPhone:</strong> Kişiler &gt; Listeler &gt; Tümünü seç &gt; Paylaş &gt; dosyayı
          kaydet (.vcf). <strong>Google:</strong> contacts.google.com &gt; Dışa aktar &gt; CSV.
          <strong> Outlook:</strong> Kişiler &gt; Yönet &gt; Kişileri dışa aktar (CSV).
        </p>
      </div>


      {people.length > 0 && (
        <ul className="w-full space-y-1 border-t border-border pt-3">
          {people.map((p) => (
            <li key={p.peerId} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{p.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{p.shortId}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export function ContactsDialog({

  open,
  onOpenChange,
  onOpenChat,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenChat?: (peerId: string) => void;
}) {
  const { contacts, me } = useContacts();
  const [q, setQ] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [verify, setVerify] = useState<PeerVerifyTarget | null>(null);

  useEffect(() => {
    if (open) void refreshContacts();
  }, [open]);

  useEffect(() => {
    if (!open || !me?.signPublic) {
      setQr(null);
      return;
    }
    let alive = true;
    void QRCode.toDataURL(qrPayload(me.peerId, me.signPublic), { margin: 1, width: 190 })
      .then((url) => alive && setQr(url))
      .catch(() => setQr(null));
    return () => {
      alive = false;
    };
  }, [open, me?.peerId, me?.signPublic]);

  // Adı bilinmeyen (yalnızca teknik kimlikten ibaret) kayıtlar listelenmez.
  const named = useMemo(
    () => contacts.filter((c) => c.displayName !== c.shortId),
    [contacts],
  );
  const unnamed = useMemo(
    () => contacts.filter((c) => c.displayName === c.shortId),
    [contacts],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    if (!needle) return named;
    return named.filter((c) =>
      [c.displayName, c.claimedName ?? "", c.shortId]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(needle),
    );
  }, [named, q]);


  const myShort = me?.shortId ?? shortIdOf("local");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border p-6 pb-4">
            <DialogTitle>Rehber</DialogTitle>
            <DialogDescription>
              Herkesin değişmeyen bir kısa kimliği vardır; adları siz verirsiniz. Numarasıyla
              katılanları telefon rehberinizden eşleştirebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-6 pt-4">
          <SyncContactsRow />


          {/* Kendi kimlik kartım */}
          <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-card/50 p-4">
            {qr && (
              <img
                src={qr}
                alt="Kendi kimlik karekodunuz"
                width={120}
                height={120}
                className="rounded border"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Sizin kimliğiniz
              </p>
              <p className="mt-1 font-mono text-lg tracking-wider">{myShort}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bu kod cihaz değiştirseniz bile aynı kalır ve kimseyle karışmaz.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(myShort);
                    toast("Kimliğiniz kopyalandı");
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Kopyala
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/chat`;
                    const text = `Tedbirge kimliğim: ${myShort} — ${url}`;
                    if (navigator.share)
                      void navigator.share({ title: "Tedbirge", text, url }).catch(() => {});
                    else
                      void navigator.clipboard
                        ?.writeText(text)
                        .then(() => toast("Davet kopyalandı"));
                  }}
                >
                  Paylaş
                </Button>
              </div>
            </div>
          </div>

          {/* Arama */}
          <div className="flex items-center gap-2 rounded-md border border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ad veya soyada göre ara"
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <ul className="space-y-2">
            {rows.map((c) => (
              <ContactRow key={c.peerId} c={c} onOpen={onOpenChat} onVerify={setVerify} />
            ))}
            {rows.length === 0 && (
              <li className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Rehberinizde adıyla eşleşen kişi yok. Telefon rehberinizi yükleyin ya da kimliğinizi
                paylaşın.
              </li>
            )}
          </ul>

          {unnamed.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              <span>
                {unnamed.length} adsız kayıt gizlendi (adı bilinmeyen cihazlar listelenmez).
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] text-destructive"
                onClick={() => {
                  void Promise.all(unnamed.map((c) => eraseContact(c.peerId))).then(() =>
                    toast(`${unnamed.length} adsız kayıt silindi`),
                  );
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" /> Temizle
              </Button>
            </div>
          )}


          {/* KVKK / GDPR */}
          <div className="rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Verileriniz sizde kalır.</strong> Rehber yalnızca
              bu cihazda saklanır; sunucuya, buluta veya üçüncü kişilere aktarılmaz. Telefon
              rehberiniz okunmaz, numara istenmez. Mesaj içerikleri uçtan uca şifrelidir (KVKK m.4
              veri minimizasyonu · GDPR m.5/25).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void exportContactsData().then((json) => {
                    download(`tedbirge-rehber-${new Date().toISOString().slice(0, 10)}.json`, json);
                    toast.success("Rehber dışa aktarıldı");
                  });
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Verilerimi indir
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const phone = getPhone();
                  if (!phone) {
                    toast("Yedekleme için numaranızla katılmanız gerekir");
                    return;
                  }
                  void backupContacts(phone).then((ok) =>
                    ok
                      ? toast.success("Rehber şifreli olarak yedeklendi")
                      : toast("Yedekleme şu anda yapılamadı"),
                  );
                }}
              >
                Rehberi yedekle
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const phone = getPhone();
                  if (!phone) {
                    toast("Geri yükleme için numaranızla katılmanız gerekir");
                    return;
                  }
                  void restoreContacts(phone).then((n) =>
                    n > 0 ? toast.success(`${n} kişi geri yüklendi`) : toast("Yedek bulunamadı"),
                  );
                }}
              >
                Yedeği geri yükle
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  if (!window.confirm("Tüm rehber bu cihazdan silinsin mi? Mesajlarınız korunur."))
                    return;
                  void eraseAllContacts().then((n) => toast(`${n} kişi silindi`));
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Rehberi sil
              </Button>
            </div>
            <p className="mt-3">
              Taşınabilirlik (KVKK m.11 / GDPR m.20) ve silme (KVKK m.7 / GDPR m.17) haklarınızı
              buradan tek dokunuşla kullanabilirsiniz.
            </p>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      <PeerVerifyDialog
        target={verify}
        open={Boolean(verify)}
        onOpenChange={(v) => !v && setVerify(null)}
        onChanged={() => void refreshContacts()}
      />
    </>
  );
}

export default ContactsDialog;
