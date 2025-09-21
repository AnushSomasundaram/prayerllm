export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
    const base = process.env.BACKEND_BASE;
    const key  = process.env.BACKEND_API_KEY;
  
    try {
      const upstream = await fetch(`${base}/pray_text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify(req.body ?? {}),
      });
  
      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
      res.send(text);
    } catch (e) {
      res.status(502).json({ error: 'Upstream error', detail: e?.message || String(e) });
    }
  }