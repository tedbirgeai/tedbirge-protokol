import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full border-b border-primary/30 bg-primary/10 px-4 py-2 text-center font-mono text-xs text-primary">
      Önizlemedeki tüm ödemeler test modundadır — gerçek tahsilat yapılmaz.
    </div>
  );
}
