import {
  BookUser,
  ChevronRight,
  Laptop,
  Lock,
  MessageSquare,
  QrCode,
  Star,
  UserCog,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { pressFeedback } from "@/lib/chat/sounds";

type Item = {
  id: string;
  label: string;
  icon: typeof Lock;
  onClick: () => void;
  right?: string;
};

/**
 * MOBİL "SİZ" SEKMESİ
 * ------------------------------------------------------------------
 * Büyük profil kartı ve gruplanmış ayar satırları. Her satır zaten var
 * olan diyalogları açar; yeni iş mantığı eklemez.
 */
export function MePanel({
  name,
  avatar,
  personId,
  soundOff,
  onAvatarPick,
  onContacts,
  onSettings,
  onPairing,
  onToggleSound,
  onSelfNote,
  version,
}: {
  name: string;
  avatar?: string | undefined;
  personId: string;
  soundOff: boolean;
  onAvatarPick: () => void;
  onContacts: () => void;
  onSettings: () => void;
  onPairing: () => void;
  onToggleSound: () => void;
  onSelfNote: () => void;
  version: string;
}) {
  const groupOne: Item[] = [
    { id: "contacts", label: "Rehber", icon: BookUser, onClick: onContacts },
    { id: "starred", label: "Kendine not", icon: Star, onClick: onSelfNote },
    { id: "devices", label: "Bağlı cihazlar", icon: Laptop, onClick: onPairing },
  ];
  const groupTwo: Item[] = [
    { id: "account", label: "Hesap", icon: UserCog, onClick: onSettings },
    { id: "privacy", label: "Gizlilik", icon: Lock, onClick: onSettings },
    { id: "chats", label: "Sohbetler", icon: MessageSquare, onClick: onSettings },
    {
      id: "sound",
      label: soundOff ? "Sesler kapalı" : "Sesler açık",
      icon: soundOff ? VolumeX : Volume2,
      onClick: onToggleSound,
    },
  ];

  function renderGroup(items: Item[]) {
    return (
      <ul className="overflow-hidden rounded-2xl" style={{ background: "var(--wa-panel)" }}>
        {items.map((it, i) => (
          <li
            key={it.id}
            style={i === 0 ? undefined : { borderTop: "1px solid var(--wa-border)" }}
          >
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                it.onClick();
              }}
              className="wa-press flex min-h-14 w-full items-center gap-4 px-4 text-left"
              style={{ color: "var(--wa-text)" }}
            >
              <it.icon className="h-6 w-6 shrink-0" style={{ color: "var(--wa-text)" }} />
              <span className="min-w-0 flex-1 truncate text-[17px]">{it.label}</span>
              <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--wa-muted)" }} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2"
      // Alt sekme çubuğu ve ev çubuğu için ek boşluk: son kart kesilmez.
      // eslint-disable-next-line react/jsx-props-no-multi-spaces
      style={{ background: "var(--wa-panel-soft)" }}
    >
      <div className="flex flex-col items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            onAvatarPick();
          }}
          className="wa-press rounded-full"
          aria-label="Profil fotoğrafını değiştir"
        >
          <Avatar name={name} src={avatar} size={112} />
        </button>
        <p className="text-[26px] font-bold leading-tight" style={{ color: "var(--wa-text)" }}>
          {name}
        </p>
        <p className="flex items-center gap-2 text-[13px]" style={{ color: "var(--wa-muted)" }}>
          <QrCode className="h-4 w-4" aria-hidden />
          {personId}
        </p>
      </div>

      {renderGroup(groupOne)}
      {renderGroup(groupTwo)}

      <p className="pt-1 text-center text-[12px]" style={{ color: "var(--wa-muted)" }}>
        Tedbirge · v{version}
      </p>
    </div>
  );
}
