import { useCallback, useState } from "react";
import { ShieldCheck, CircleCheck, CircleX, Loader2, FileDown, Play } from "lucide-react";
import {
  AUDIT_CHECK_COUNT,
  reportDigest,
  runZeroKnowledgeAudit,
  type AuditCheck,
  type AuditReport,
} from "@/lib/audit/zero-knowledge";

const SITE = "Tedbirge Protokol — Mehmet DİNÇ";

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

function buildReportHtml(report: AuditReport, digest: string) {
  const rows = report.checks
    .map(
      (c, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(c.title)}</strong><br><span class="basis">${escapeHtml(c.basis)}</span></td>
        <td class="${c.status}">${c.status === "pass" ? "BAŞARILI" : "BAŞARISIZ"}</td>
        <td>${escapeHtml(c.detail)}</td>
        <td>${c.durationMs} ms</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
  <title>KVKK & Sıfır-Bilgi Denetim Raporu</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;line-height:1.5}
    h1{font-size:20px;margin:0 0 4px}
    .meta{font-size:12px;color:#555;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ccc;padding:8px;vertical-align:top;text-align:left}
    th{background:#f2f2f2;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
    .pass{color:#0a7a3d;font-weight:700}
    .fail{color:#b00020;font-weight:700}
    .basis{color:#666;font-size:11px}
    footer{margin-top:24px;font-size:11px;color:#555}
    @media print{body{margin:12mm}}
  </style></head><body>
  <h1>KVKK &amp; Sıfır-Bilgi Denetim Raporu</h1>
  <div class="meta">
    ${SITE}<br>
    Tarih: ${new Date(report.ts).toLocaleString("tr-TR")}<br>
    Düğüm parmak izi: ${escapeHtml(report.fingerprint)}<br>
    Sonuç: ${report.passed}/${report.total} test başarılı<br>
    Rapor bütünlük damgası (SHA-256): ${escapeHtml(digest)}
  </div>
  <table><thead><tr><th>#</th><th>Test / Hukuki dayanak</th><th>Sonuç</th><th>Bulgu</th><th>Süre</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <footer>
    Bu rapor kullanıcının kendi cihazında, tarayıcı içinde canlı olarak çalıştırılan testlerin çıktısıdır.
    Test sonuçları sunucuya gönderilmez; kişisel veri işlenmez. Şifreleme: Ed25519 imza, X25519 anahtar
    anlaşması, AES-256-GCM gövde şifrelemesi.
  </footer>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\u002Fscript>
  </body></html>`;
}

export function ZeroKnowledgeAudit() {
  const [checks, setChecks] = useState<AuditCheck[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [digest, setDigest] = useState<string>("");
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setChecks([]);
    setReport(null);
    setDigest("");
    const result = await runZeroKnowledgeAudit((c) => setChecks((prev) => [...prev, c]));
    setReport(result);
    setDigest(await reportDigest(result));
    setRunning(false);
  }, []);

  const download = useCallback(() => {
    if (!report) return;
    const html = buildReportHtml(report, digest);
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }, [report, digest]);

  return (
    <div className="rounded-sm border border-border bg-background/60 p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold">Canlı denetim — {AUDIT_CHECK_COUNT} test</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Testler bu cihazda çalışır; hiçbir sonuç sunucuya gönderilmez.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            {running ? "Çalışıyor" : "Denetimi başlat"}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-40"
          >
            <FileDown className="size-4" aria-hidden />
            PDF raporu
          </button>
        </div>
      </div>

      {checks.length > 0 && (
        <ul className="mt-7 space-y-px overflow-hidden rounded-sm border border-border bg-border">
          {checks.map((c, i) => (
            <li key={c.id} className="bg-background/70 p-5">
              <div className="flex items-start gap-3">
                {c.status === "pass" ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="font-mono text-[11px] text-muted-foreground">{i + 1}. </span>
                    {c.title}
                  </p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {c.basis}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{c.detail}</p>
                </div>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  {c.durationMs} ms
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {report && (
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Sonuç {report.passed}/{report.total} · Parmak izi {report.fingerprint} · Damga {digest}
        </p>
      )}
    </div>
  );
}
