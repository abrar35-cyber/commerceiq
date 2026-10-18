import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are CommerceIQ, a careful e-commerce analyst.
You receive aggregated JSON computed from a merchant's uploaded CSV files (sales, inventory, returns).

Hard rules:
- Use ONLY the numbers and names present in the JSON. Never invent products, figures, benchmarks, causes, dates or industry averages.
- If a dataset is null or missing, say that dataset was not uploaded; do not speculate about it.
- If the data is too thin to support a conclusion, say so plainly.
- Quote figures exactly as given (you may round sensibly). Use the provided currencySymbol.
- Separate observation from suggestion: an insight states what the data shows; an action is a suggested next step.
- Be concise and specific. No filler.

Respond with a single JSON object, and nothing else, in this exact shape:
{
  "summary": "2-3 sentence executive summary",
  "insights": [{ "title": "short title", "detail": "1-2 sentences citing specific numbers", "severity": "positive" | "neutral" | "warning" | "critical" }],
  "actions": ["specific recommended next step", "..."]
}
Provide 4-6 insights and 3-5 actions.`;

type Insight = { title: string; detail: string; severity: "positive" | "neutral" | "warning" | "critical" };

export async function POST(req: Request) {
  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI_API_KEY (or GROQ_API_KEY) is not configured on the server." }, { status: 500 });
  }
  const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  let body: { payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "Missing analytics payload." }, { status: 400 });
  }
  const text = JSON.stringify(body.payload);
  if (text.length > 40_000) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  try {
    const call = (jsonMode: boolean) =>
      fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 1200,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Aggregated business data:\n${text}` },
          ],
        }),
      });

    let res = await call(true);
    if (res.status === 400 || res.status === 422) res = await call(false); // provider may not support JSON mode

    if (!res.ok) {
      console.error("AI provider error", res.status, await res.text());
      return NextResponse.json({ error: `The AI service returned an error (${res.status}). Check your API key, base URL and model name.` }, { status: 502 });
    }

    const json = await res.json();
    const raw: string = json.choices?.[0]?.message?.content ?? "{}";
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : "{}");
    const sev = new Set(["positive", "neutral", "warning", "critical"]);
    const insights: Insight[] = Array.isArray(parsed.insights)
      ? parsed.insights.slice(0, 8).map((i: Partial<Insight>) => ({
          title: String(i.title ?? "Insight"),
          detail: String(i.detail ?? ""),
          severity: sev.has(String(i.severity)) ? (i.severity as Insight["severity"]) : "neutral",
        }))
      : [];
    const actions: string[] = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 6).map(String) : [];
    return NextResponse.json({ summary: String(parsed.summary ?? ""), insights, actions });
  } catch (e) {
    console.error("ai-insights failure", e);
    return NextResponse.json({ error: "Could not generate insights. Please try again." }, { status: 500 });
  }
}
