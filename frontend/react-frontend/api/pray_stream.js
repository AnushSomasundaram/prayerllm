// api/pray_stream.js
import { Readable } from 'node:stream';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const base = process.env.BACKEND_BASE;    // e.g. https://...a.run.app
  const key  = process.env.BACKEND_API_KEY; // must match Cloud Run PRAYER_API_KEYS

  try {
    const upstream = await fetch(`${base}/pray`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(req.body ?? {}),
    });

    // Pass through status + content-type
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8');

    // If no body, just send text
    if (!upstream.body) {
      const txt = await upstream.text();
      res.send(txt);
      return;
    }

    // Convert Web ReadableStream -> Node Readable and pipe
    if (typeof Readable.fromWeb === 'function') {
      return Readable.fromWeb(upstream.body).pipe(res);
    }

    // Fallback: manual pump
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    res.status(502).json({ error: 'Upstream error', detail: e?.message || String(e) });
  }
}