import { Users } from "lucide-react";

import { pressFeedback } from "@/lib/chat/sounds";
import { Avatar } from "@/components/chat/Avatar";

export type CommunityRow = { id: string; title: string; members: number };

/**
 * MOBİL "TOPLULUKLAR" SEKMESİ
 * ------------------------------------------------------------------
 * Mevcut grup sohbetlerini topluluk kartları olarak gösterir.
 * Grup yoksa boş durum ekranı ve "Yeni topluluk" düğmesi çıkar.
 */
export function CommunitiesPanel({
  groups,
  onOpen,
  onCreate,
}: {
  groups: CommunityRow[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <span
          className="flex h-28 w-28 items-center justify-center rounded-3xl"
          style={{ background: "var(--wa-accent-soft)" }}
        >
          <Users className="h-12 w-12" style={{ color: "var(--wa-accent)" }} />
        </span>
        <h2 className="text-[22px] font-bold leading-tight" style={{ color: "var(--wa-text)" }}>
          Topluluklar sayesinde bağlantıda kalın
        </h2>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--wa-muted)" }}>
          Topluluklar, ekiplerin konulara göre ayrılmış gruplarda bir araya gelmesini sağlar.
          Katıldığınız tüm topluluklar burada görünür.
        </p>
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            onCreate();
          }}
          className="wa-press mt-2 w-full rounded-full py-4 text-[17px] font-semibold text-white"
          style={{ background: "var(--wa-accent)" }}
        >
          + Yeni topluluk
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ul>
        {groups.map((g) => (
          <li key={g.id} style={{ borderBottom: "1px solid var(--wa-border)" }}>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                onOpen(g.id);
              }}
              className="wa-press wa-list-row flex w-full items-center gap-3 px-4 text-left"
            >
              <Avatar name={g.title} />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[17px] font-medium"
                  style={{ color: "var(--wa-text)" }}
                >
                  {g.title}
                </span>
                <span className="block truncate text-[15px]" style={{ color: "var(--wa-muted)" }}>
                  {g.members} katılımcı
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            onCreate();
          }}
          className="wa-press w-full rounded-full py-4 text-[17px] font-semibold text-white"
          style={{ background: "var(--wa-accent)" }}
        >
          + Yeni topluluk
        </button>
      </div>
    </div>
  );
}
