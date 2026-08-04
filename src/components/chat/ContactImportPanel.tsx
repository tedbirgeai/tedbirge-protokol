/**
 * Rehber eşleştirme paneli.
 * Cihaz rehberinden kişi seçtirir ya da yapıştırılan numara listesini
 * eşleştirir. Numaralar cihazdan çıkmaz; yalnızca özetleri sorgulanır.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  deviceContactsSupported,
  importContacts,
  parsePastedContacts,
  pickDeviceContacts,
} from "@/lib/chat/directory";

export function ContactImportPanel({
  onDone,
  title = "Rehber eşleştirme",
}: {
  onDone: () => void;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function run(list: { name: string; phone: string }[]) {
    if (list.length === 0) {
      toast.error("Geçerli numara bulunamadı.");
      return;
    }
    setBusy(true);
    try {
      const r = await importContacts(list);
      setResult(`${r.checked} numara denetlendi · ${r.matched} Tedbirge kullanıcısı eklendi.`);
      if (r.matched > 0) toast.success(`${r.matched} kişi rehbere eklendi`);
    } catch {
      toast.error("Eşleştirme yapılamadı. Oturumunuzu kontrol edin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold" style={{ color: "var(--wa-text)" }}>
        {title}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--wa-muted)" }}>
        Numaralar cihazınızdan çıkmaz. Sunucuya yalnızca geri döndürülemez özetleri gönderilir,
        eşleşmeyen numaralar hiçbir yerde saklanmaz.
      </p>

      {deviceContactsSupported() && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void pickDeviceContacts().then(run)}
          className="wa-press mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--wa-accent)" }}
        >
          Cihaz rehberinden seç
        </button>
      )}

      <label className="mt-4 block text-xs font-medium" style={{ color: "var(--wa-muted)" }}>
        Ya da numaraları yapıştırın (her satıra bir numara)
      </label>
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        rows={4}
        placeholder={"Ayşe 0532 000 00 00\n+49 170 0000000"}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
      />
      <button
        type="button"
        disabled={busy || !pasted.trim()}
        onClick={() => void run(parsePastedContacts(pasted))}
        className="wa-press mt-3 w-full rounded-full border px-4 py-3 text-sm font-semibold disabled:opacity-50"
        style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
      >
        {busy ? "Eşleştiriliyor…" : "Listeyi eşleştir"}
      </button>

      {result && (
        <p className="mt-3 text-sm" style={{ color: "var(--wa-muted)" }}>
          {result}
        </p>
      )}

      <button
        type="button"
        onClick={onDone}
        className="wa-press mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold text-white"
        style={{ background: "var(--wa-accent)" }}
      >
        Sohbete geç
      </button>
    </div>
  );
}
