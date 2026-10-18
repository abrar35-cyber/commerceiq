"use client";

import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  parseInventory, parseReturns, parseSales,
  type InventoryRow, type Kind, type ParseResult, type ReturnRow, type SalesRow,
} from "@/lib/csv";
import { analyze, buildAiPayload, fmtCompact, fmtMoney, fmtNum, fmtPct } from "@/lib/analytics";
import { Kpi, Needs, Section, UploadCard } from "@/components/ui";

type Insights = {
  summary: string; actions: string[];
  insights: { title: string; detail: string; severity: "positive" | "neutral" | "warning" | "critical" }[];
};

const SEV: Record<string, string> = {
  positive: "bg-good/10 text-good", neutral: "bg-ink/5 text-ink/70",
  warning: "bg-warn/15 text-warn", critical: "bg-bad/10 text-bad",
};
const PIE = ["#EC5E27", "#1F1A17", "#F5A583", "#8C8478", "#946100", "#2F7D4F", "#C4302B", "#CFC9B4"];
const CURRENCIES = ["$", "£", "€", "Rs ", "₹", "AED ", ""];
const GRID = "#E7E5CF";
const NAV = [["Overview", "#overview"], ["Insights", "#insights"], ["Products", "#products"], ["Stock", "#stock"], ["Returns", "#returns"]];

export default function Home() {
  const [sales, setSales] = useState<ParseResult<SalesRow> | null>(null);
  const [inv, setInv] = useState<ParseResult<InventoryRow> | null>(null);
  const [ret, setRet] = useState<ParseResult<ReturnRow> | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [threshold, setThreshold] = useState(10);
  const [cur, setCur] = useState("$");
  const [ai, setAi] = useState<Insights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const a = useMemo(
    () => analyze(sales?.rows ?? [], inv?.rows ?? [], ret?.rows ?? [], threshold),
    [sales, inv, ret, threshold],
  );
  const anyData = a.hasSales || a.hasInventory || a.hasReturns;

  async function onFile(kind: Kind, file: File) {
    setBusy(kind); setAi(null); setAiError(null);
    try {
      if (kind === "sales") setSales(await parseSales(file));
      if (kind === "inventory") setInv(await parseInventory(file));
      if (kind === "returns") setRet(await parseReturns(file));
    } catch {
      const err = { fileName: file.name, rows: [], skipped: 0, error: "Could not read this file as CSV." };
      if (kind === "sales") setSales(err); else if (kind === "inventory") setInv(err); else setRet(err);
    } finally { setBusy(null); }
  }
  function onClear(kind: Kind) {
    setAi(null); setAiError(null);
    if (kind === "sales") setSales(null); else if (kind === "inventory") setInv(null); else setRet(null);
  }

  async function generate() {
    setAiLoading(true); setAiError(null);
    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: buildAiPayload(a, cur.trim(), threshold) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed.");
      setAi(json);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setAiLoading(false); }
  }

  const top = a.products.slice(0, 8).map((p) => ({ name: p.name.length > 22 ? p.name.slice(0, 21) + "…" : p.name, revenue: p.revenue }));
  const growthTone = a.growth === null ? "default" : a.growth >= 0 ? "good" : "bad";
  const tip = { borderRadius: 12, border: `1px solid ${GRID}`, background: "#FDFDF1" };

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#overview" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-display text-sm font-extrabold text-ink">IQ</span>
            <span className="font-display text-lg font-extrabold tracking-tight">CommerceIQ</span>
          </a>
          {anyData && (
            <div className="hidden gap-1 md:flex">
              {NAV.map(([label, href]) => (
                <a key={href} href={href} className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink/70 hover:bg-brand-soft hover:text-ink">{label}</a>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-semibold text-ink/70">
            Currency
            <select value={cur} onChange={(e) => setCur(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1 text-ink">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c.trim() || "None"}</option>)}
            </select>
          </label>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <section id="overview">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Your store&apos;s numbers, explained.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-ink/70">
            Upload your sales, inventory and returns files. Every chart and insight comes only from the data you upload.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <UploadCard kind="sales" result={sales} busy={busy === "sales"} onFile={onFile} onClear={onClear} />
            <UploadCard kind="inventory" result={inv} busy={busy === "inventory"} onFile={onFile} onClear={onClear} />
            <UploadCard kind="returns" result={ret} busy={busy === "returns"} onFile={onFile} onClear={onClear} />
          </div>
        </section>

        {!anyData ? (
          <div className="panel p-10 text-center">
            <h2 className="text-xl font-bold">Upload a CSV to get started</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
              Start with sales for revenue and growth. Add inventory for low-stock alerts and returns for return analysis.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2 lg:col-span-1">
                <Kpi featured label="Total revenue" value={a.hasSales ? fmtCompact(a.revenue, cur) : "-"} sub={a.hasSales ? `${a.rangeStart} to ${a.rangeEnd}` : "Upload sales"} />
              </div>
              <Kpi label="Units sold" value={a.hasSales ? fmtNum(a.units) : "-"} sub={a.hasSales ? `${fmtNum(a.records)} sales records` : "Upload sales"} />
              <Kpi label={`Growth vs prior ${a.granularity}`} value={a.growth === null ? "-" : fmtPct(a.growth)} tone={growthTone}
                sub={a.growth === null ? "Needs 2+ periods of sales" : "Latest period, may be partial"} />
              <Kpi label="Return rate" value={a.returnRate === null ? "-" : fmtPct(a.returnRate)} tone={a.returnRate !== null && a.returnRate > 10 ? "bad" : "default"}
                sub={a.hasReturns ? `${fmtNum(a.returnUnits)} units returned` : "Upload returns"} />
              <Kpi label="Stock alerts" value={a.hasInventory ? String(a.alerts.length) : "-"} tone={a.alerts.length ? "warn" : "default"}
                sub={a.hasInventory ? `of ${fmtNum(a.inventoryItems)} products` : "Upload inventory"} />
            </div>

            <Section id="insights" title="AI business insights" note="Generated from your aggregated numbers only. Raw rows stay in your browser." className="border-l-4 border-l-brand">
              <button className="btn btn-primary" onClick={generate} disabled={aiLoading}>
                {aiLoading ? "Analysing your data…" : ai ? "Regenerate insights" : "Generate insights"}
              </button>
              {aiError && <p role="alert" className="mt-4 rounded-xl bg-bad/10 p-3 text-sm font-medium text-bad">{aiError}</p>}
              {ai && (
                <div className="mt-5 space-y-5">
                  <p className="max-w-3xl text-base leading-relaxed">{ai.summary}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {ai.insights.map((i, n) => (
                      <div key={n} className="rounded-xl border border-line bg-cream p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold">{i.title}</h3>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${SEV[i.severity]}`}>{i.severity}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-ink/70">{i.detail}</p>
                      </div>
                    ))}
                  </div>
                  {ai.actions.length > 0 && (
                    <div className="rounded-xl bg-brand-soft p-5">
                      <h3 className="text-base font-bold">Suggested next steps</h3>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">{ai.actions.map((x, n) => <li key={n}>{x}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <div className="grid gap-6 lg:grid-cols-5">
              <Section title="Revenue over time" note={a.granularity === "month" ? "Monthly revenue" : "Daily revenue"} className="lg:col-span-3">
                {a.hasSales ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={a.series} margin={{ left: 0, right: 8, top: 8 }}>
                        <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EC5E27" stopOpacity={0.35} /><stop offset="100%" stopColor="#EC5E27" stopOpacity={0} />
                        </linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                        <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#1F1A17" }} minTickGap={24} />
                        <YAxis tick={{ fontSize: 12, fill: "#1F1A17" }} tickFormatter={(v) => fmtCompact(v, cur)} width={56} />
                        <Tooltip contentStyle={tip} formatter={(v: number) => fmtMoney(v, cur)} />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#EC5E27" strokeWidth={3} fill="url(#rev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <Needs text="Upload a sales CSV to see revenue trends." />}
              </Section>
              <Section title="Top products by revenue" className="lg:col-span-2">
                {a.hasSales ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top} layout="vertical" margin={{ left: 0, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: "#1F1A17" }} tickFormatter={(v) => fmtCompact(v, cur)} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#1F1A17" }} />
                        <Tooltip contentStyle={tip} cursor={{ fill: "#FCE6DB" }} formatter={(v: number) => fmtMoney(v, cur)} />
                        <Bar dataKey="revenue" name="Revenue" fill="#EC5E27" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <Needs text="Upload sales to rank products." />}
              </Section>
            </div>

            <Section id="products" title="Product performance" note="Return rate appears when a returns file is also uploaded.">
              {a.hasSales ? (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full min-w-[560px]">
                    <thead className="sticky top-0 bg-white"><tr className="border-b border-line">
                      <th className="th">Product</th><th className="th">Category</th><th className="th text-right">Units</th>
                      <th className="th text-right">Revenue</th><th className="th text-right">Share</th><th className="th text-right">Return rate</th>
                    </tr></thead>
                    <tbody>{a.products.map((p) => (
                      <tr key={p.name} className="border-b border-line/70">
                        <td className="td font-semibold">{p.name}</td><td className="td text-ink/60">{p.category}</td>
                        <td className="td text-right">{fmtNum(p.units)}</td><td className="td text-right">{fmtMoney(p.revenue, cur)}</td>
                        <td className="td text-right">{fmtPct(p.share)}</td>
                        <td className={`td text-right ${p.returnRate !== null && p.returnRate > 10 ? "font-bold text-bad" : ""}`}>{fmtPct(p.returnRate)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <Needs text="Upload a sales CSV to analyse products." />}
            </Section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Section id="stock" title="Low-stock alerts" note="Uses each product's reorder level when provided, otherwise the default below.">
                {a.hasInventory ? (
                  <>
                    <label className="mb-4 flex items-center gap-2 text-sm font-medium text-ink/70">
                      Default threshold
                      <input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
                        className="w-20 rounded-lg border border-line bg-white px-2 py-1 text-ink" />
                      units
                    </label>
                    {a.alerts.length ? (
                      <div className="max-h-80 overflow-auto">
                        <table className="w-full min-w-[420px]">
                          <thead className="sticky top-0 bg-white"><tr className="border-b border-line">
                            <th className="th">Product</th><th className="th text-right">Stock</th><th className="th text-right">Limit</th>
                            <th className="th text-right">Days of cover</th><th className="th">Status</th>
                          </tr></thead>
                          <tbody>{a.alerts.map((x) => (
                            <tr key={x.product} className="border-b border-line/70">
                              <td className="td font-semibold">{x.product}</td><td className="td text-right">{fmtNum(x.stock)}</td>
                              <td className="td text-right">{fmtNum(x.limit)}</td>
                              <td className="td text-right">{x.daysCover === null ? "n/a" : x.daysCover.toFixed(1)}</td>
                              <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${x.status === "Out of stock" ? SEV.critical : SEV.warning}`}>{x.status}</span></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ) : <p className="rounded-xl bg-good/10 p-4 text-sm font-medium text-good">No products are at or below their stock limit.</p>}
                  </>
                ) : <Needs text="Upload an inventory CSV to see stock alerts." />}
              </Section>

              <Section id="returns" title="Return analysis" note={a.refundTotal !== null ? `Total refunds: ${fmtMoney(a.refundTotal, cur)}` : undefined}>
                {a.hasReturns ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={a.reasons} dataKey="units" nameKey="reason" innerRadius={45} outerRadius={80} paddingAngle={2} stroke="#FFFFFF">
                            {a.reasons.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tip} formatter={(v: number) => `${fmtNum(v)} units`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5 self-center text-sm">
                      {a.reasons.slice(0, 6).map((r, i) => (
                        <li key={r.reason} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 truncate"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PIE[i % PIE.length] }} />{r.reason}</span>
                          <span className="font-bold">{fmtNum(r.units)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="sm:col-span-2">
                      <h3 className="mb-1 text-sm font-bold">Most returned products</h3>
                      <table className="w-full">
                        <tbody>{a.returnedProducts.slice(0, 6).map((p) => (
                          <tr key={p.name} className="border-b border-line/70">
                            <td className="td font-semibold">{p.name}</td><td className="td text-right">{fmtNum(p.units)} units</td>
                            <td className="td text-right text-ink/60">{p.rate === null ? "" : `${fmtPct(p.rate)} of sold`}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                ) : <Needs text="Upload a returns CSV to analyse returns." />}
              </Section>
            </div>
          </>
        )}
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-2 text-center text-xs text-ink/60 sm:px-6">
        CommerceIQ processes CSVs in your browser. Only aggregated figures are sent to the AI service.
      </footer>
    </div>
  );
}
