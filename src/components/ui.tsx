"use client";
import { useRef } from "react";
import type { Kind, ParseResult } from "@/lib/csv";

export function Kpi({ label, value, sub, tone = "default" }: {
  label: string; value: string; sub?: string; tone?: "default" | "good" | "bad" | "warn";
}) {
  const color = { default: "text-ink", good: "text-brand", bad: "text-coral", warn: "text-amberx" }[tone];
  return (
    <div className="panel p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function Section({ title, note, children, className = "" }: {
  title: string; note?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`panel p-4 sm:p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-base font-bold">{title}</h2>
        {note && <p className="text-sm text-slate-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export function Needs({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{text}</p>;
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
  const ok = result && !result.error;
  return (
    <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">{META[kind].title} CSV</h3>
        {ok && <span className="rounded-full bg-emerald-300/20 px-2 py-0.5 text-xs font-semibold text-emerald-200">Loaded</span>}
      </div>
      <p className="mt-1 min-h-[2.5rem] text-xs text-teal-100/80">Columns: {META[kind].cols}</p>
      {ok && (
        <p className="mt-1 truncate text-sm text-white" title={result.fileName}>
          {result.fileName}: {result.rows.length.toLocaleString()} rows{result.skipped ? `, ${result.skipped} skipped` : ""}
        </p>
      )}
      {result?.error && <p role="alert" className="mt-1 text-sm text-red-200">{result.error}</p>}
      <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" aria-label={`Upload ${META[kind].title} CSV`}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(kind, f); e.target.value = ""; }} />
      <div className="mt-3 flex gap-2">
        <button className="btn bg-white text-ink hover:bg-teal-50" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? "Reading…" : ok ? "Replace file" : "Choose file"}
        </button>
        {result && <button className="btn text-white/90 hover:bg-white/10" onClick={() => onClear(kind)}>Remove</button>}
      </div>
    </div>
  );
}
