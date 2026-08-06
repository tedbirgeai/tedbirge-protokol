/**
 * PLANLANMIŞ ARAMALAR — yalnızca bu cihazda saklanır.
 * WhatsApp "Arama planla" ekranının veri katmanı. Buluta veri gitmez.
 */

const KEY = "tedbirge.calls.scheduled";

export type ScheduledCall = {
  id: string;
  title: string;
  description?: string;
  /** ISO tarih-saat. */
  startsAt: string;
  endsAt?: string;
  video: boolean;
  /** Katılım için onay gereksin. */
  approval: boolean;
  /** Kaç dakika önce hatırlatılsın (0 = kapalı). */
  remindMinutes: number;
  createdAt: number;
};

const listeners = new Set<() => void>();

function read(): ScheduledCall[] {
  if (typeof window === "undefined") return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as ScheduledCall[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function write(rows: ScheduledCall[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 100)));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

export function onScheduledChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Geçmiş kayıtlar ayıklanmış, tarihe göre sıralı liste. */
export function listScheduled(): ScheduledCall[] {
  return read().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function addScheduled(input: Omit<ScheduledCall, "id" | "createdAt">): ScheduledCall {
  const row: ScheduledCall = {
    ...input,
    id: `sc_${Date.now().toString(36)}`,
    createdAt: Date.now(),
  };
  write([row, ...read()]);
  return row;
}

export function removeScheduled(id: string): void {
  write(read().filter((r) => r.id !== id));
}

/** Takvim uygulamalarına aktarım için .ics içeriği üretir. */
export function icsOf(row: ScheduledCall, url: string): string {
  const stamp = (iso: string) => `${iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").slice(0, 15)}00Z`;
  const start = new Date(row.startsAt).toISOString();
  const end = new Date(row.endsAt ?? new Date(new Date(row.startsAt).getTime() + 30 * 60000).toISOString()).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tedbirge//Calls//TR",
    "BEGIN:VEVENT",
    `UID:${row.id}@tedbirge`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${row.title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${(row.description ?? "").replace(/\n/g, "\\n")}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
