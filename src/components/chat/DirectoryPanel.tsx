/**
 * REHBER PANELİ — giriş yapıldığı an sohbet listesinin altında açılan,
 * kişileri gerçek Ad Soyad ile gösteren bölüm.
 *
 * Kurallar:
 *  - Başlıkta asla teknik kimlik (mob-…, TBG-…) gösterilmez.
 *  - Kullanıcı hiçbir butona basmaz; rehber izni girişte otomatik istenir.
 *  - Eşleşme yoksa sahte kişi üretilmez; temiz bir boş durum gösterilir.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, StickyNote, User } from "lucide-react";

import { useContacts, type Contact } from "@/lib/chat/contacts";
import { autoSyncContacts } from "@/lib/chat/directory";

import { isTechnicalLabel } from "@/lib/chat/display-name";
import { getAvatar, useAvatars } from "@/lib/chat/avatars";
import { normalizedPersonName } from "@/lib/chat/name-resolver";

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
  avatar,
  onClick,
}: {
  title: string;
  subtitle: string;
  tone?: string;
  icon: React.ReactNode;
  avatar?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-press wa-row flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.03]"
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--wa-panel-soft)", color: "var(--wa-accent)" }}
          aria-hidden
        >
          {icon}
        </span>
      )}
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

export function DirectoryPanel({ query, peers, onOpenPeer, onOpenSelfNote }: Props) {
  const book = useContacts();
  useAvatars();
  const tried = useRef(false);
  const [matchedPeople, setMatchedPeople] = useState<
    { peerId: string; name: string; shortId: string }[]
  >([]);

  const q = query.trim().toLocaleLowerCase("tr");

  // Her açılışta rehber sessizce yeniden eşleştirilir: yeni katılan
  // tanıdıklar kullanıcı hiçbir şey yapmadan listede belirir.
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void autoSyncContacts()
      .then((r) => {
        if (r.people.length > 0) setMatchedPeople(r.people);
      })
      .catch(() => null);
  }, []);

  // KVKK: yalnızca gerçek adı bilinen (rehberde eşleşmiş) kişiler listelenir.
  // Anonim / kayıtsız düğümler arayüzde hiçbir şekilde gösterilmez.
  const contacts = useMemo(() => {
    const rows: Contact[] = book.contacts.filter(
      (c) => !isTechnicalLabel(c.nickname || c.claimedName || ""),
    );
    if (!q) return rows;
    return rows.filter((c) => c.displayName.toLocaleLowerCase("tr").includes(q));
  }, [book.contacts, q]);

  const onlineIds = useMemo(() => new Set(peers.map((p) => p.nodeId)), [peers]);
  // Eşleşen kişi zaten rehberde varsa tek kayıt gösterilir (çift satır yok).
  const extraMatches = useMemo(() => {
    const known = new Set(book.contacts.map((c) => c.peerId));
    const knownNames = new Set(book.contacts.map((c) => normalizedPersonName(c.displayName)));
    const rows: typeof matchedPeople = [];
    for (const person of matchedPeople) {
      const nameKey = normalizedPersonName(person.name);
      if (
        known.has(person.peerId) ||
        knownNames.has(nameKey) ||
        (q && !person.name.toLocaleLowerCase("tr").includes(q)) ||
        isTechnicalLabel(person.name)
      ) {
        continue;
      }
      knownNames.add(nameKey);
      rows.push(person);
    }
    return rows;
  }, [book.contacts, matchedPeople, q]);
  const empty = contacts.length === 0 && extraMatches.length === 0;

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
          title="Kendinize not"
          subtitle="Notlar ve bağlantılar"
          icon={<StickyNote className="h-4 w-4" />}
          onClick={onOpenSelfNote}
        />
      )}

      {contacts.map((c) => {
        const online = onlineIds.has(c.peerId);
        return (
          <Row
            key={`c_${c.peerId}`}
            title={c.displayName}
            subtitle={online ? "Çevrimiçi" : "Rehberinizden eşleşti"}
            tone={online ? "var(--wa-accent)" : undefined}
            avatar={getAvatar(c.peerId)}
            icon={online ? <Radio className="h-4 w-4" /> : <User className="h-4 w-4" />}
            onClick={() => onOpenPeer(c.peerId, c.nickname ?? c.claimedName)}
          />
        );
      })}

      {empty && (
        <div className="px-4 py-3">
          <p className="text-[13px]" style={{ color: "var(--wa-muted)" }}>
            Rehberiniz eşitleniyor. Tanıdıklarınız Tedbirge'ye katıldıkça kendiliğinden görünür.
          </p>
        </div>
      )}

      {/* Eşitleme butonu, rapor ve KVKK notu Ayarlar > Rehber bölümüne
          taşındı; sohbet listesi WhatsApp gibi sade kalır. */}
      {extraMatches.length > 0 && (
        <ul className="pb-2">
          {extraMatches.map((p) => (
            <li key={p.peerId}>
              <Row
                title={p.name}
                subtitle="Rehberinizden eşleşti"
                icon={<User className="h-4 w-4" />}
                avatar={getAvatar(p.peerId)}
                onClick={() => onOpenPeer(p.peerId, p.name)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
