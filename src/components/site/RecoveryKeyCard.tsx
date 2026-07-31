import { useEffect, useState } from "react";
import {
  challengeIndexes,
  getRecoveryPhrase,
  isValidPhrase,
  normalizePhrase,
  restoreFromPhrase,
} from "@/lib/recovery";
import { requestPersistentStorage, storageInfo } from "@/lib/store/idb";

/**
 * Kurtarma anahtarı sihirbazı: 12 kelimelik ifade cihaz değişiminde
 * aynı düğüm kimliğini (Ed25519/X25519) geri getirir. Özel anahtarlar
 * cihazdan hiç çıkmaz; yalnızca bu ifade yedeklenir.
 */
export function RecoveryKeyCard({ nodeId }: { nodeId: string }) {
  const [phrase, setPhrase] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [challenge, setChallenge] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [verified, setVerified] = useState(false);
  const [restoreMode, setRestoreMode] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [quota, setQuota] = useState<{ usagePct: number; persisted: boolean } | null>(null);

  useEffect(() => {
    if (!nodeId) return;
    void getRecoveryPhrase(nodeId).then(setPhrase);
    void storageInfo().then((s) => setQuota({ usagePct: Math.round(s.ratio * 100), persisted: s.persisted }));
  }, [nodeId]);

  function startVerify() {
    setChallenge(challengeIndexes());
    setAnswers({});
    setVerified(false);
  }

  function checkAnswers() {
    const words = (phrase ?? "").split(" ");
    const ok = challenge.every((i) => (answers[i] ?? "").trim().toLowerCase() === words[i]);
    setVerified(ok);
    setMsg(
      ok
        ? { ok: true, text: "Yedek doğrulandı. Bu ifadeyi çevrimdışı ve güvenli saklayın." }
        : { ok: false, text: "Kelimeler eşleşmedi. Yedeğinizi kontrol edip tekrar deneyin." },
    );
  }

  async function restore() {
    const p = normalizePhrase(restoreInput);
    if (!isValidPhrase(p)) {
      setMsg({ ok: false, text: "Geçersiz kurtarma ifadesi (12 kelime, BIP-39 sözlüğü)." });
      return;
    }
    try {
      await restoreFromPhrase(nodeId, p);
      setMsg({ ok: true, text: "Kimlik geri yüklendi. Düğümü yeniden başlatın." });
      setRestoreMode(false);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Geri yükleme başarısız." });
    }
  }

  async function persist() {
    const ok = await requestPersistentStorage();
    const s = await storageInfo();
    setQuota({ usagePct: Math.round(s.ratio * 100), persisted: s.persisted });
    setMsg({
      ok,
      text: ok
        ? "Kalıcı depolama verildi: çevrimdışı kuyruk tarayıcı tarafından temizlenmez."
        : "Tarayıcı kalıcı depolama izni vermedi; kuyruk yine çalışır ancak temizlenebilir.",
    });
  }

  const words = (phrase ?? "").split(" ");

  return (
    <div className="rounded-sm border border-border bg-background/60 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
        Kurtarma anahtarı · 12 kelime
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Özel anahtarlarınız bu cihazda şifreli saklanır ve dışa aktarılamaz. Cihaz değişimi veya
        tarayıcı verisi silinmesi durumunda aynı düğüm kimliğini yalnızca bu 12 kelimelik ifade geri
        getirir. Ekran görüntüsü almayın; kâğıda yazın.
      </p>

      {phrase ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setRevealed((v) => !v)}
              className="rounded-sm border border-primary/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary hover:bg-primary/10"
            >
              {revealed ? "Gizle" : "İfadeyi göster"}
            </button>
            <button
              onClick={startVerify}
              disabled={!revealed}
              className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
            >
              Yedeği doğrula
            </button>
            <button
              onClick={() => setRestoreMode((v) => !v)}
              className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Başka cihazdan geri yükle
            </button>
          </div>

          {revealed && (
            <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {words.map((w, i) => (
                <li
                  key={`${w}-${i}`}
                  className="rounded-sm border border-border bg-card/60 px-3 py-2 font-mono text-xs"
                >
                  <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                  <span className="text-foreground">{w}</span>
                </li>
              ))}
            </ol>
          )}

          {challenge.length > 0 && (
            <div className="mt-4 rounded-sm border border-border bg-card/60 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Doğrulama · istenen kelimeleri yazın
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {challenge.map((i) => (
                  <label key={i} className="font-mono text-[11px] text-muted-foreground">
                    {i + 1}. kelime
                    <input
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                      className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={checkAnswers}
                className="mt-3 rounded-sm bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
              >
                Kontrol et
              </button>
              {verified && (
                <p className="mt-2 font-mono text-[11px] text-primary">✓ Yedek doğrulandı</p>
              )}
            </div>
          )}

          {restoreMode && (
            <div className="mt-4 rounded-sm border border-border bg-card/60 p-4">
              <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                12 kelimelik ifadeyi yapıştırın
              </label>
              <textarea
                value={restoreInput}
                onChange={(e) => setRestoreInput(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
              />
              <button
                onClick={() => void restore()}
                className="mt-3 rounded-sm border border-primary/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary hover:bg-primary/10"
              >
                Kimliği geri yükle
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          Kimlik hazırlanıyor… Düğümü bir kez başlattığınızda kurtarma ifadesi üretilir.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Depolama: {quota ? `%${quota.usagePct} dolu` : "…"} ·{" "}
          {quota?.persisted ? "kalıcı" : "geçici"}
        </span>
        {!quota?.persisted && (
          <button
            onClick={() => void persist()}
            className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Kalıcı depolama iste
          </button>
        )}
      </div>

      {msg && (
        <p className={`mt-3 text-xs ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>
      )}
    </div>
  );
}
