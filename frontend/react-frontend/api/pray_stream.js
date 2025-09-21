export const config = { runtime: 'nodejs18.x' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const base = process.env.BACKEND_BASE;
  const key  = process.env.BACKEND_API_KEY;

  try {
    const upstream = await fetch(`${base}/pray`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(req.body ?? {}),
    });

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/plain');
    // Node 18: Response.body is a readable stream
    upstream.body?.pipe(res);
  } catch (e) {
    res.status(502).json({ error: 'Upstream error', detail: e?.message || String(e) });
  }
}