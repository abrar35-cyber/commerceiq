import Papa from "papaparse";

export type SalesRow = { date: Date; product: string; category: string; quantity: number; revenue: number };
export type InventoryRow = { product: string; category: string; stock: number; reorder: number | null };
export type ReturnRow = { product: string; quantity: number; reason: string; refund: number | null };
export type Kind = "sales" | "inventory" | "returns";
export type ParseResult<T> = { fileName: string; rows: T[]; skipped: number; error?: string };

type HeaderMap = Record<string, string>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const A = {
  date: ["date", "orderdate", "saledate", "solddate", "day", "createdat", "timestamp", "datetime"],
  product: ["product", "productname", "item", "itemname", "name", "title", "sku", "productid"],
  category: ["category", "productcategory", "department", "type"],
  qty: ["quantity", "qty", "units", "unitssold", "quantitysold", "returnedunits", "returnqty", "quantityreturned"],
  revenue: ["revenue", "sales", "amount", "total", "totalamount", "totalprice", "linetotal", "netsales", "grosssales"],
  price: ["price", "unitprice", "sellingprice", "priceperunit"],
  stock: ["stock", "onhand", "quantityonhand", "stockonhand", "inventory", "available", "stocklevel", "currentstock", "instock", "quantity", "qty"],
  reorder: ["reorderlevel", "reorderpoint", "minstock", "minimumstock", "threshold", "safetystock", "lowstockthreshold"],
  reason: ["reason", "returnreason", "cause", "returncause"],
  refund: ["refund", "refundamount", "refundvalue", "returnvalue", "creditamount"],
};

const find = (map: HeaderMap, keys: string[]) => {
  for (const k of keys) if (map[k]) return map[k];
  return undefined;
};

export function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).replace(/[^0-9.\-]/g, "");
  return s === "" ? NaN : parseFloat(s);
}

export function toDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); // dd/mm/yyyy fallback
  if (m) {
    const alt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(alt.getTime())) return alt;
  }
  return null;
}

function load(file: File) {
  return new Promise<{ map: HeaderMap; data: Record<string, string>[] }>((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (r) => {
        const map: HeaderMap = {};
        (r.meta.fields ?? []).forEach((f) => {
          const k = norm(f);
          if (!map[k]) map[k] = f;
        });
        resolve({ map, data: r.data });
      },
      error: (e) => reject(e),
    });
  });
}

const fail = <T,>(file: File, missing: string[]): ParseResult<T> => ({
  fileName: file.name,
  rows: [],
  skipped: 0,
  error: `Missing required column(s): ${missing.join(", ")}. Check the column names in your file.`,
});

const clean = (v: unknown, fallback: string) => {
  const s = String(v ?? "").trim();
  return s || fallback;
};

export async function parseSales(file: File): Promise<ParseResult<SalesRow>> {
  const { map, data } = await load(file);
  const c = {
    date: find(map, A.date), product: find(map, A.product), qty: find(map, A.qty),
    rev: find(map, A.revenue), price: find(map, A.price), cat: find(map, A.category),
  };
  const missing: string[] = [];
  if (!c.date) missing.push("date");
  if (!c.product) missing.push("product");
  if (!c.qty) missing.push("quantity");
  if (!c.rev && !c.price) missing.push("revenue (or price)");
  if (missing.length) return fail(file, missing);

  const rows: SalesRow[] = [];
  let skipped = 0;
  for (const r of data) {
    const date = toDate(r[c.date!]);
    const quantity = toNumber(r[c.qty!]);
    const revenue = c.rev ? toNumber(r[c.rev]) : toNumber(r[c.price!]) * quantity;
    const product = String(r[c.product!] ?? "").trim();
    if (!date || !product || isNaN(quantity) || isNaN(revenue)) { skipped++; continue; }
    rows.push({ date, product, quantity, revenue, category: clean(c.cat ? r[c.cat] : "", "Uncategorized") });
  }
  return { fileName: file.name, rows, skipped };
}

export async function parseInventory(file: File): Promise<ParseResult<InventoryRow>> {
  const { map, data } = await load(file);
  const c = {
    product: find(map, A.product), stock: find(map, A.stock),
    reorder: find(map, A.reorder), cat: find(map, A.category),
  };
  const missing: string[] = [];
  if (!c.product) missing.push("product");
  if (!c.stock) missing.push("stock (on-hand quantity)");
  if (missing.length) return fail(file, missing);

  const rows: InventoryRow[] = [];
  let skipped = 0;
  for (const r of data) {
    const product = String(r[c.product!] ?? "").trim();
    const stock = toNumber(r[c.stock!]);
    if (!product || isNaN(stock)) { skipped++; continue; }
    const reorderRaw = c.reorder ? toNumber(r[c.reorder]) : NaN;
    rows.push({ product, stock, reorder: isNaN(reorderRaw) ? null : reorderRaw, category: clean(c.cat ? r[c.cat] : "", "Uncategorized") });
  }
  return { fileName: file.name, rows, skipped };
}

export async function parseReturns(file: File): Promise<ParseResult<ReturnRow>> {
  const { map, data } = await load(file);
  const c = {
    product: find(map, A.product), qty: find(map, A.qty),
    reason: find(map, A.reason), refund: find(map, A.refund),
  };
  const missing: string[] = [];
  if (!c.product) missing.push("product");
  if (!c.qty) missing.push("quantity");
  if (missing.length) return fail(file, missing);

  const rows: ReturnRow[] = [];
  let skipped = 0;
  for (const r of data) {
    const product = String(r[c.product!] ?? "").trim();
    const quantity = toNumber(r[c.qty!]);
    if (!product || isNaN(quantity)) { skipped++; continue; }
    const refund = c.refund ? toNumber(r[c.refund]) : NaN;
    rows.push({ product, quantity, reason: clean(c.reason ? r[c.reason] : "", "Not specified"), refund: isNaN(refund) ? null : refund });
  }
  return { fileName: file.name, rows, skipped };
}
