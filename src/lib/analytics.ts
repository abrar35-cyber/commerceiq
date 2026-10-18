import type { InventoryRow, ReturnRow, SalesRow } from "./csv";

export type Period = { period: string; revenue: number; units: number; growth: number | null };
export type ProductStat = {
  name: string; category: string; revenue: number; units: number; share: number;
  returned: number; returnRate: number | null;
};
export type StockAlert = {
  product: string; stock: number; limit: number; daysCover: number | null; status: "Out of stock" | "Low stock";
};
export type Analysis = {
  hasSales: boolean; hasInventory: boolean; hasReturns: boolean;
  revenue: number; units: number; records: number; avgRecord: number;
  granularity: "month" | "day"; series: Period[]; growth: number | null;
  rangeStart: string | null; rangeEnd: string | null;
  products: ProductStat[]; alerts: StockAlert[]; inventoryItems: number;
  returnUnits: number; returnRate: number | null; refundTotal: number | null;
  reasons: { reason: string; units: number }[];
  returnedProducts: { name: string; units: number; rate: number | null }[];
};

const key = (s: string) => s.trim().toLowerCase();
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function analyze(sales: SalesRow[], inv: InventoryRow[], ret: ReturnRow[], threshold: number): Analysis {
  const hasSales = sales.length > 0, hasInventory = inv.length > 0, hasReturns = ret.length > 0;
  const revenue = sales.reduce((a, r) => a + r.revenue, 0);
  const units = sales.reduce((a, r) => a + r.quantity, 0);

  // Revenue over time
  const months = new Set(sales.map((r) => monthKey(r.date)));
  const granularity: "month" | "day" = months.size >= 2 ? "month" : "day";
  const bucket = new Map<string, { revenue: number; units: number }>();
  for (const r of sales) {
    const k = granularity === "month" ? monthKey(r.date) : dayKey(r.date);
    const b = bucket.get(k) ?? { revenue: 0, units: 0 };
    b.revenue += r.revenue; b.units += r.quantity;
    bucket.set(k, b);
  }
  const series: Period[] = [...bucket.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, v], i, arr) => {
    const prev = i > 0 ? arr[i - 1][1].revenue : null;
    return { period, ...v, growth: prev && prev !== 0 ? ((v.revenue - prev) / Math.abs(prev)) * 100 : null };
  });
  const growth = series.length >= 2 ? series[series.length - 1].growth : null;
  const times = sales.map((r) => r.date.getTime());
  const minT = times.length ? Math.min(...times) : 0, maxT = times.length ? Math.max(...times) : 0;
  const spanDays = Math.max(1, Math.round((maxT - minT) / 86400000) + 1);

  // Returns by product
  const retByProduct = new Map<string, number>();
  const reasonMap = new Map<string, number>();
  for (const r of ret) {
    retByProduct.set(key(r.product), (retByProduct.get(key(r.product)) ?? 0) + r.quantity);
    reasonMap.set(r.reason, (reasonMap.get(r.reason) ?? 0) + r.quantity);
  }

  // Product performance
  const pm = new Map<string, ProductStat>();
  for (const r of sales) {
    const k = key(r.product);
    const p = pm.get(k) ?? { name: r.product, category: r.category, revenue: 0, units: 0, share: 0, returned: 0, returnRate: null };
    p.revenue += r.revenue; p.units += r.quantity;
    pm.set(k, p);
  }
  const products = [...pm.entries()].map(([k, p]) => {
    const returned = retByProduct.get(k) ?? 0;
    return { ...p, share: revenue ? (p.revenue / revenue) * 100 : 0, returned, returnRate: hasReturns && p.units > 0 ? (returned / p.units) * 100 : null };
  }).sort((a, b) => b.revenue - a.revenue);

  // Low stock
  const dailyUnits = new Map<string, number>();
  for (const p of products) dailyUnits.set(key(p.name), p.units / spanDays);
  const alerts: StockAlert[] = inv
    .map((i) => {
      const limit = i.reorder ?? threshold;
      const d = dailyUnits.get(key(i.product));
      return {
        product: i.product, stock: i.stock, limit,
        daysCover: hasSales && d && d > 0 ? i.stock / d : null,
        status: (i.stock <= 0 ? "Out of stock" : "Low stock") as StockAlert["status"],
      };
    })
    .filter((a) => a.stock <= a.limit)
    .sort((a, b) => a.stock - b.stock);

  // Returns
  const returnUnits = ret.reduce((a, r) => a + r.quantity, 0);
  const refunds = ret.filter((r) => r.refund !== null);
  const reasons = [...reasonMap.entries()].map(([reason, u]) => ({ reason, units: u })).sort((a, b) => b.units - a.units);
  const nameByKey = new Map(ret.map((r) => [key(r.product), r.product]));
  const returnedProducts = [...retByProduct.entries()].map(([k, u]) => {
    const sold = pm.get(k)?.units;
    return { name: pm.get(k)?.name ?? nameByKey.get(k) ?? k, units: u, rate: sold ? (u / sold) * 100 : null };
  }).sort((a, b) => b.units - a.units);

  return {
    hasSales, hasInventory, hasReturns, revenue, units, records: sales.length,
    avgRecord: sales.length ? revenue / sales.length : 0, granularity, series, growth,
    rangeStart: hasSales ? dayKey(new Date(minT)) : null, rangeEnd: hasSales ? dayKey(new Date(maxT)) : null,
    products, alerts, inventoryItems: inv.length, returnUnits,
    returnRate: hasSales && hasReturns && units > 0 ? (returnUnits / units) * 100 : null,
    refundTotal: refunds.length ? refunds.reduce((a, r) => a + (r.refund ?? 0), 0) : null,
    reasons, returnedProducts,
  };
}

const r2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

/** Compact aggregate sent to the AI route. Raw rows never leave the browser. */
export function buildAiPayload(a: Analysis, currency: string, threshold: number) {
  return {
    datasetsUploaded: { sales: a.hasSales, inventory: a.hasInventory, returns: a.hasReturns },
    currencySymbol: currency || "(none)",
    lowStockDefaultThreshold: threshold,
    sales: a.hasSales ? {
      dateRange: [a.rangeStart, a.rangeEnd], totalRevenue: r2(a.revenue), totalUnits: a.units, salesRecords: a.records,
      periodGranularity: a.granularity,
      latestPeriodGrowthPct: r2(a.growth),
      periods: a.series.slice(-12).map((s) => ({ period: s.period, revenue: r2(s.revenue), units: s.units, growthPct: r2(s.growth) })),
      uniqueProducts: a.products.length,
      topProducts: a.products.slice(0, 10).map((p) => ({ name: p.name, revenue: r2(p.revenue), units: p.units, sharePct: r2(p.share), returnRatePct: r2(p.returnRate) })),
      bottomProducts: a.products.slice(-5).map((p) => ({ name: p.name, revenue: r2(p.revenue), units: p.units })),
    } : null,
    inventory: a.hasInventory ? {
      trackedProducts: a.inventoryItems, atRiskCount: a.alerts.length,
      atRisk: a.alerts.slice(0, 15).map((x) => ({ product: x.product, stock: x.stock, reorderLevel: x.limit, daysOfCover: r2(x.daysCover) })),
    } : null,
    returns: a.hasReturns ? {
      totalReturnedUnits: a.returnUnits, returnRatePctOfUnitsSold: r2(a.returnRate), totalRefunds: r2(a.refundTotal),
      reasons: a.reasons.slice(0, 8),
      mostReturned: a.returnedProducts.slice(0, 8).map((p) => ({ name: p.name, units: p.units, returnRatePct: r2(p.rate) })),
    } : null,
  };
}

export const fmtNum = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
export const fmtMoney = (n: number, cur: string) =>
  `${cur}${new Intl.NumberFormat("en-US", { maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 }).format(n)}`;
export const fmtCompact = (n: number, cur: string) =>
  `${cur}${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
export const fmtPct = (n: number | null) => (n === null ? "n/a" : `${n >= 0 ? "" : ""}${n.toFixed(1)}%`);
