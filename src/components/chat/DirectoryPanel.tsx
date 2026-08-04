/**
 * REHBER PANELİ — giriş yapıldığı an sohbet listesinin altında açılan,
 * kişileri ve yerel ağdaki düğümleri hazır gösteren bölüm.
 *
 * Üç kaynak birleştirilir:
 *  1) Kayıtlı kişiler (yerel rehber — cihazdan çıkmaz)
 *  2) Yerel ağdaki aktif Tedbirge düğümleri (P2P keşif)
 *  3) "Kendinize mesaj gönderin" not defteri
 *
 * Cihaz rehberi erişimi yalnızca kullanıcı dokunuşuyla istenir; tarayıcı
 * desteklemiyorsa rehber dosyası (.vcf) ile içe aktarma sunulur.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookUser, Radio, Share2, StickyNote, Upload, UserPlus } from "lucide-react";

import { useContacts, type Contact } from "@/lib/chat/contacts";
import {
  deviceContactsSupported,
  importContacts,
  parseVcards,
  syncDeviceContacts,
} from "@/lib/chat/directory";
import type { PeerInfo } from "@/lib/browser-node";

type Props = {
  query: string;
  peers: PeerInfo[];
  labelOf: (nodeId: string) => string;
  onOpenPeer: (nodeId: string, name?: string) => void;
  onOpenSelfNote: () => void;
  onShareInvite: () => void;
};

function Row({
  title,
  subtitle,
  tone,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  tone?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-press wa-row flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.03]"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--wa-panel-soft)", color: "var(--wa-accent)" }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[15px] font-medium"
          style={{ color: "var(--wa-text)" }}
        >
          {title}
        </span>
        <span className="block truncate text-[12px]" style={{ color: tone ?? "var(--wa-muted)" }}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}

export function DirectoryPanel({
  query,
  peers,
  labelOf,
  onOpenPeer,
  onOpenSelfNote,
  onShareInvite,
}: Props) {
  const book = useContacts();
  const [busy, setBusy] = useState(false);
  const q = query.trim().toLocaleLowerCase("tr");

  const contacts = useMemo(() => {
    const rows: Contact[] = book.contacts;
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.displayName.toLocaleLowerCase("tr").includes(q) ||
        c.shortId.toLocaleLowerCase("tr").includes(q) ||
        (c.claimedName ?? "").toLocaleLowerCase("tr").includes(q),
    );
  }, [book.contacts, q]);

  const nodes = useMemo(
    () =>
      peers.filter((p) => !q || labelOf(p.nodeId).toLocaleLowerCase("tr").includes(q)),
    [peers, q, labelOf],
  );

  async function syncBook() {
    setBusy(true);
    try {
      const res = await syncDeviceContacts();
      if (!res) {
        toast.info("Bu tarayıcı cihaz rehberini okuyamıyor", {
          description: "Rehber dosyası (.vcf) yükleyerek kişilerinizi getirebilirsiniz.",
        });
        return;
      }
      toast.success(`${res.matched} kişi eşleşti`, {
        description: `${res.checked} numara kontrol edildi. Numaralar cihazdan çıkmadı.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file: File) {
    setBusy(true);
    try {
      const rows = parseVcards(await file.text());
      if (rows.length === 0) {
        toast.error("Dosyada telefon numarası bulunamadı");
        return;
      }
      const res = await importContacts(rows);
      toast.success(`${res.matched} kişi eşleşti`, {
        description: `${res.checked} numara kontrol edildi.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--wa-border)" }}>
      <p
        className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--wa-muted)" }}
      >
        Rehberiniz
      </p>

      {!q && (
        <Row
          title="Kendinize mesaj gönderin"
          subtitle="Notlar, bağlantılar — yalnızca bu cihazda"
          icon={<StickyNote className="h-4 w-4" />}
          onClick={onOpenSelfNote}
        />
      )}

      {nodes.length > 0 && (
        <>
          <p className="px-4 pb-1 pt-2 text-[11px]" style={{ color: "var(--wa-muted)" }}>
            Yerel ağdaki cihazlar
          </p>
          {nodes.map((p) => (
            <Row
              key={`node_${p.nodeId}`}
              title={labelOf(p.nodeId)}
              subtitle="Çevrimiçi · yakındaki düğüm"
              tone="var(--wa-accent)"
              icon={<Radio className="h-4 w-4" />}
              onClick={() => onOpenPeer(p.nodeId)}
            />
          ))}
        </>
      )}

      {contacts.length > 0 && (
        <>
          <p className="px-4 pb-1 pt-2 text-[11px]" style={{ color: "var(--wa-muted)" }}>
            Kayıtlı kişiler
          </p>
          {contacts.map((c) => (
            <Row
              key={`c_${c.peerId}`}
              title={c.displayName}
              subtitle={c.shortId}
              icon={<BookUser className="h-4 w-4" />}
              onClick={() => onOpenPeer(c.peerId, c.nickname ?? c.claimedName)}
            />
          ))}
        </>
      )}

      {!q && (
        <div className="flex flex-wrap gap-2 px-4 pb-4 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncBook()}
            className="wa-press flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--wa-accent)" }}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            {deviceContactsSupported() ? "Rehberi eşitle" : "Rehber izni iste"}
          </button>

          <label
            className="wa-press flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[13px]"
            style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Rehber dosyası
            <input
              type="file"
              accept=".vcf,text/vcard,text/x-vcard"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importFile(f);
              }}
            />
          </label>

          <button
            type="button"
            onClick={onShareInvite}
            className="wa-press flex items-center gap-2 rounded-full px-4 py-2 text-[13px]"
            style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Davet linki
          </button>
        </div>
      )}

      <p className="px-4 pb-4 text-[11px]" style={{ color: "var(--wa-muted)" }}>
        Numaralarınız cihazdan çıkmaz; eşleştirme yalnızca geri döndürülemez özetlerle yapılır.
      </p>
    </div>
  );
}
