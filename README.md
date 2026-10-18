<div align="center">

# 📊 CommerceIQ

### AI-powered e-commerce intelligence dashboard

Turn your sales, inventory and returns CSVs into clear analytics and AI-written business insights, grounded strictly in your own data.

![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2-22B5BF)
![Groq](https://img.shields.io/badge/Groq-LLM_API-F55036)
![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)

</div>

---

## 📑 Table of contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [Getting started](#-getting-started)
- [CSV formats](#-csv-formats)
- [How the metrics work](#-how-the-metrics-work)
- [AI insights and data privacy](#-ai-insights-and-data-privacy)
- [Project structure](#-project-structure)
- [Deploy to Netlify](#-deploy-to-netlify)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

Small and mid-size online sellers often have their data scattered across spreadsheets. **CommerceIQ** lets them upload three simple CSV exports and instantly see what is selling, what is running out and what is being sent back, followed by plain-language recommendations from an LLM.

- **No demo data.** Every number on screen comes from files you upload.
- **No database.** CSVs are parsed in your browser and nothing is stored.
- **Grounded AI.** The model only sees aggregated figures and is instructed never to invent numbers.

---

## ✨ Features

| | Feature | What you get |
|---|---|---|
| 📤 | **CSV uploads** | Sales, inventory and returns files with flexible column matching and clear error messages |
| 💰 | **Revenue and growth** | Total revenue, units sold, revenue trend chart and period-over-period growth |
| 🏆 | **Product performance** | Ranked products by revenue, units, revenue share and return rate |
| 📦 | **Low-stock alerts** | Out-of-stock and low-stock products, adjustable threshold, estimated days of cover |
| ↩️ | **Return analysis** | Return rate, refunds, reason breakdown and most-returned products |
| 🤖 | **AI business insights** | Executive summary, severity-tagged insights and suggested next steps |
| 📱 | **Responsive UI** | Works on desktop, tablet and phone, with keyboard focus states and reduced-motion support |

---

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| CSV parsing | PapaParse |
| AI | Any OpenAI-compatible LLM API (Gemini, Groq, Cerebras, OpenRouter) |
| Hosting | Netlify with `@netlify/plugin-nextjs` |

---

## 🚀 Getting started

**Prerequisites:** Node.js 18.18 or newer and a free LLM API key (e.g. [Google AI Studio](https://aistudio.google.com)).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# open .env.local and set AI_API_KEY

# 3. Start the dev server
npm run dev
```

Open http://localhost:3000, upload your CSVs and click **Generate insights**.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `AI_API_KEY` | ✅ | API key for your LLM provider. Server-side only. (`GROQ_API_KEY` also works.) |
| `AI_BASE_URL` | ➖ | Any OpenAI-compatible endpoint. Defaults to Groq. Cerebras, OpenRouter and Gemini examples are in `.env.example`. |
| `AI_MODEL` | ➖ | Model name. Defaults to `llama-3.3-70b-versatile`. |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run typecheck` | Type-check without emitting files |

---

## 🗂️ CSV formats

Column names are matched flexibly: case, spaces and punctuation are ignored. Rows with invalid values are skipped and the skipped count is shown after upload.

### 🧾 Sales

| Column | Required | Accepted names (examples) |
|---|---|---|
| Date | ✅ | `date`, `order_date`, `created_at` |
| Product | ✅ | `product`, `product_name`, `item`, `sku` |
| Quantity | ✅ | `quantity`, `qty`, `units` |
| Revenue | ✅ or price | `revenue`, `amount`, `total`, `line_total` |
| Price | ✅ if no revenue | `price`, `unit_price` (revenue = price × quantity) |
| Category | ➖ | `category`, `department` |

### 📦 Inventory

| Column | Required | Accepted names (examples) |
|---|---|---|
| Product | ✅ | `product`, `product_name`, `sku` |
| Stock | ✅ | `stock`, `on_hand`, `available`, `quantity` |
| Reorder level | ➖ | `reorder_level`, `reorder_point`, `min_stock` |
| Category | ➖ | `category` |

### ↩️ Returns

| Column | Required | Accepted names (examples) |
|---|---|---|
| Product | ✅ | `product`, `product_name`, `sku` |
| Quantity | ✅ | `quantity`, `qty`, `returned_units` |
| Reason | ➖ | `reason`, `return_reason` |
| Refund | ➖ | `refund`, `refund_amount` |

> 💡 **Tip:** Products are matched across the three files by name (case-insensitive). Use the same product names or SKUs everywhere so return rates and days of cover can be calculated.

---

## 📐 How the metrics work

| Metric | Definition |
|---|---|
| **Growth** | Latest period revenue vs the previous period. Monthly if the data covers 2+ months, otherwise daily. The latest period may be partial. |
| **Return rate** | Returned units ÷ units sold. Needs both sales and returns files. |
| **Low stock** | Stock at or below the product's reorder level, or the default threshold if none is provided. Zero stock is flagged as out of stock. |
| **Days of cover** | Current stock ÷ average daily units sold over the sales date range. |
| **Revenue share** | Product revenue ÷ total revenue. |

---

## 🔒 AI insights and data privacy

```
 Browser                          Next.js server                 Groq
 ───────                          ──────────────                 ────
 Parse CSVs (PapaParse)
 Compute aggregates
        │  aggregated JSON only
        └──────────────────────►  /api/ai-insights  ───────────►  LLM
                                  (holds GROQ_API_KEY)               │
        ◄──────────────────────   validated JSON  ◄─────────────────┘
```

- 🔑 **API key stays on the server.** It is read only in `src/app/api/ai-insights/route.ts` and never exposed to the browser. Do not prefix it with `NEXT_PUBLIC_`.
- 🧮 **Raw rows never leave your browser.** Only compact aggregates (totals, top products, alerts, return reasons) are sent.
- 🧷 **Grounded prompt.** The model is told to use only the supplied numbers, to say when a dataset is missing and to avoid invented benchmarks or causes.
- 🛡️ **Defensive route.** Request size is capped, the response is parsed and sanitised, and upstream errors are not leaked to the client.

---

## 🏗️ Project structure

```
commerceiq/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── ai-insights/
│   │   │       └── route.ts      # Server-side Groq call
│   │   ├── globals.css           # Tailwind layers and component classes
│   │   ├── layout.tsx            # Root layout, font and metadata
│   │   └── page.tsx              # Dashboard UI
│   ├── components/
│   │   └── ui.tsx                # KPI cards, sections, upload cards
│   └── lib/
│       ├── csv.ts                # PapaParse parsing and column mapping
│       └── analytics.ts          # Metrics and AI payload builder
├── .env.example                  # Environment variable template
├── netlify.toml                  # Netlify build configuration
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## ☁️ Deploy to Netlify

### 1️⃣ Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: CommerceIQ"
git branch -M main
git remote add origin https://github.com/<your-username>/commerceiq.git
git push -u origin main
```

No Git? Create a repo on github.com, click **uploading an existing file** and drag in the contents of the project folder (not the folder itself) so `package.json` sits at the top level.

### 2️⃣ Import into Netlify

1. In Netlify choose **Add new site → Import an existing project** and select your GitHub repo.
2. Build settings are read from `netlify.toml`: `npm run build`, the Next.js runtime plugin and Node 20.

### 3️⃣ Add the API key

Go to **Site configuration → Environment variables** and add:

| Key | Value |
|---|---|
| `AI_API_KEY` | your provider key |
| `AI_BASE_URL` | optional (see `.env.example`) |
| `AI_MODEL` | optional |

### 4️⃣ Deploy

Trigger a deploy. After changing environment variables, redeploy so they take effect.

---

## 🩺 Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| "Missing required column(s)" after upload | Rename the header to one of the accepted names in the [CSV formats](#-csv-formats) tables. |
| Some rows are skipped | Those rows had an empty product, an invalid date or a non-numeric quantity or amount. |
| Return rate or days of cover show `n/a` | Upload the matching sales file and make sure product names match across files. |
| "AI_API_KEY is not configured" | Add the key to `.env.local` locally or to Netlify environment variables, then restart or redeploy. |
| AI service error (401 or 403) | The key is invalid or revoked. Create a new key in the Groq console. |
| Netlify build fails right after setup | Confirm `package.json` is at the repo root and not inside an extra folder. |

---

<div align="center">

Built for a hackathon with ❤️ using Next.js, Recharts and Groq.

</div>
