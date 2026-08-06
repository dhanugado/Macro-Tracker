export default async function handler(req, res) {
  // Allow CORS from your own domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { ticker } = req.query;

  if (!ticker) {
    return res.status(400).json({ error: 'Missing ticker parameter' });
  }

  // Sanitize ticker — only allow alphanumeric, ^, =, ., -
  const safe = ticker.replace(/[^a-zA-Z0-9\^\=\.\-]/g, '');
  if (!safe) {
    return res.status(400).json({ error: 'Invalid ticker' });
  }

  // Yahoo blocks Vercel's shared serverless IPs once request volume from
  // that IP range gets flagged. Two mitigations: (1) alternate between
  // query1/query2 hosts with fuller browser-like headers so each attempt
  // looks less like a bare bot request, (2) cache longer at the edge so
  // fewer requests actually reach Yahoo per unit time in the first place.
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com/',
  };

  let lastStatus = null;
  let lastErr = null;

  for (let attempt = 0; attempt < hosts.length; attempt++) {
    const url = `https://${hosts[attempt]}/v8/finance/chart/${encodeURIComponent(safe)}?interval=1d&range=5d`;
    try {
      const response = await fetch(url, {
        headers: baseHeaders,
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json();
        // Cache 10 minutes at the edge (was 5) — halves request volume
        // hitting Yahoo from this IP range without making the dashboard
        // meaningfully less current for macro/EOD use.
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
        return res.status(200).json(data);
      }

      lastStatus = response.status;
      // 429/999 = rate-limited/blocked — worth trying the other host.
      // Anything else (404, etc.) won't be fixed by switching host, so stop.
      if (response.status !== 429 && response.status !== 999) break;
    } catch (err) {
      lastErr = err.message;
    }
  }

  return res.status(lastStatus || 500).json({
    error: lastStatus
      ? `Yahoo Finance returned ${lastStatus} (rate-limited/blocked after ${hosts.length} host attempts)`
      : 'Proxy fetch failed',
    detail: lastErr,
  });
}
