"use client";
import { useRef, useState } from "react";
import type { Kind, ParseResult } from "@/lib/csv";

export function Kpi({ label, value, sub, tone = "default", featured = false }: {
  label: string; value: string; sub?: string; tone?: "default" | "good" | "bad" | "warn"; featured?: boolean;
}) {
  if (featured) {
    return (
      <div className="rounded-2xl bg-brand p-5 text-ink">
        <p className="text-sm font-semibold text-ink/80">{label}</p>
        <p className="mt-2 font-display text-5xl font-extrabold tracking-tight text-cream">{value}</p>
        {sub && <p className="mt-2 text-xs font-medium text-ink/80">{sub}</p>}
      </div>
    );
  }
  const color = { default: "text-ink", good: "text-good", bad: "text-bad", warn: "text-warn" }[tone];
  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold text-ink/60">{label}</p>
      <p className={`mt-2 font-display text-3xl font-extrabold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink/60">{sub}</p>}
    </div>
  );
}

export function Section({ id, title, note, children, className = "" }: {
  id?: string; title: string; note?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`panel p-5 sm:p-6 ${className}`}>
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {note && <p className="mt-0.5 text-sm text-ink/60">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export function Needs({ text }: { text: string }) {
  return <p className="rounded-xl border-2 border-dashed border-line p-8 text-center text-sm text-ink/60">{text}</p>;
}

const META: Record<Kind, { title: string; cols: string }> = {
  sales: { title: "Sales", cols: "date, product, quantity, revenue (or price)" },
  inventory: { title: "Inventory", cols: "product, stock (optional: reorder level)" },
  returns: { title: "Returns", cols: "product, quantity (optional: reason, refund)" },
};

export function UploadCard({ kind, result, busy, onFile, onClear }: {
  kind: Kind; result: ParseResult<unknown> | null; busy: boolean;
  onFile: (k: Kind, f: File) => void; onClear: (k: Kind) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const ok = result && !result.error;
  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{META[kind].title} CSV</h3>
        {ok && <span className="rounded-full bg-good/10 px-2.5 py-0.5 text-xs font-bold text-good">Loaded</span>}
      </div>
      <p className="mt-1 text-xs text-ink/60">Columns: {META[kind].cols}</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(kind, f); }}
        className={`mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors ${over ? "border-brand bg-brand-soft" : "border-line"}`}
      >
        {ok ? (
          <p className="max-w-full truncate text-sm font-semibold" title={result.fileName}>
            {result.fileName}
            <span className="block text-xs font-normal text-ink/60">
              {result.rows.length.toLocaleString()} rows{result.skipped ? `, ${result.skipped} skipped` : ""}
            </span>
          </p>
        ) : (
          <p className="text-sm text-ink/60">Drop your CSV here or choose a file</p>
        )}
        {result?.error && <p role="alert" className="mt-2 text-sm font-medium text-bad">{result.error}</p>}
        <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" aria-label={`Upload ${META[kind].title} CSV`}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(kind, f); e.target.value = ""; }} />
        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? "Reading…" : ok ? "Replace file" : "Choose file"}
          </button>
          {result && <button className="btn btn-ghost" onClick={() => onClear(kind)}>Remove</button>}
        </div>
      </div>
    </div>
  );
}
