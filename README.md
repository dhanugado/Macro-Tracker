# Macro Terminal — Vercel Deployment

A full institutional macro dashboard covering India and global markets.

## Project Structure

```
macro-vercel/
├── index.html        ← Main dashboard (all HTML/CSS/JS in one file)
├── api/
│   └── proxy.js      ← Serverless function: proxies Yahoo Finance API
├── vercel.json       ← Vercel routing config
└── README.md
```

## Deploy to Vercel

### Option A — GitHub (recommended)

1. Create a new GitHub repository
2. Upload all files in this folder maintaining the structure above
3. Go to vercel.com → Add New Project → Import your repo
4. Click Deploy — no configuration needed, vercel.json handles everything

### Option B — Vercel CLI

```bash
npm i -g vercel
cd macro-vercel
vercel
```

## How the proxy works

`/api/proxy.js` is a Vercel serverless function that:
- Receives requests like `/api/proxy?ticker=^GSPC`
- Fetches from Yahoo Finance server-side (no CORS issues)
- Returns the JSON data to the browser
- Caches responses for 5 minutes to stay within free tier limits

## Vercel Free Tier Limits

- 100GB bandwidth/month
- 100,000 serverless function invocations/month
- Each page load triggers ~50 API calls (all tickers)
- Free tier supports ~2,000 page loads/month comfortably

## Refreshing Data

The dashboard fetches on load and on manual Refresh click.
Do not set auto-refresh intervals — it will exhaust your free tier quickly.

## Adding More Tickers

Edit the ticker arrays in `index.html`:
- `EQUITY_TICKERS` — global indices
- `INDIA_EQ` — Indian equity indices  
- `COMMODITY_TICKERS` — commodities
- `FX_TICKERS` — currency pairs

Use Yahoo Finance ticker format (e.g. `^NSEI`, `RELIANCE.NS`, `GC=F`)
