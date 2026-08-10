/**
 * YEREL (NATIVE) REHBER KÖPRÜSÜ
 * ------------------------------------------------------------------
 * Uygulama iOS/Android yerel kabuğunda (Capacitor) çalışıyorsa
 * işletim sisteminin rehber iznini kullanır: WhatsApp ile birebir
 * aynı davranış — kullanıcı dosya seçmez, kişi seçmez.
 *
 * Tarayıcıda çalışırken bu modül sessizce devre dışı kalır.
 * Numaralar yine cihazdan çıkmaz; yalnızca geri döndürülemez
 * özetlerle eşleştirme yapılır.
 */
import type { DeviceContact } from "@/lib/chat/directory";
import { normalizePhone } from "@/lib/chat/directory";

/** Uygulama yerel kabukta mı çalışıyor? */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === "function" ? cap.isNativePlatform() : false;
}

type ContactsApi = {
  requestPermissions: () => Promise<{ contacts: string }>;
  getContacts: (opts: { projection: { name?: boolean; phones?: boolean } }) => Promise<{
    contacts: {
      name?: { display?: string | null } | null;
      phones?: { number?: string | null }[] | null;
    }[];
  }>;
};

/**
 * Sistem rehberinin tamamını okur (izin verilmişse).
 * İzin yoksa ya da yerel kabuk değilse null döner.
 */
export async function readNativeContacts(): Promise<DeviceContact[] | null> {
  if (!isNativeApp()) return null;
  try {
    const mod = (await import("@capacitor-community/contacts")) as unknown as {
      Contacts: ContactsApi;
    };
    const perm = await mod.Contacts.requestPermissions();
    if (perm.contacts !== "granted") return null;

    const res = await mod.Contacts.getContacts({ projection: { name: true, phones: true } });
    const out: DeviceContact[] = [];
    for (const c of res.contacts) {
      const name = c.name?.display?.trim() ?? "";
      for (const p of c.phones ?? []) {
        const phone = normalizePhone(p.number ?? "");
        if (phone) out.push({ name: name || phone, phone });
      }
    }
    return out;
  } catch {
    return null;
  }
}
