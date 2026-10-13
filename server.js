// Zero-dependency static server for the demo.
// Optional live mode: `npm install` and set ANTHROPIC_API_KEY, and the agent's explanations
// are written by Claude instead of the scripted stand-in. Without it the demo runs offline.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const MODEL = process.env.DEMO_MODEL || 'claude-opus-5-5';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };

let clientPromise;
function getClient() {
  if (!clientPromise) {
    clientPromise = (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
      ? import('@anthropic-ai/sdk').then((m) => ({ Anthropic: m.default, client: new m.default() })).catch(() => null)
      : Promise.resolve(null);
  }
  return clientPromise;
}

const SYSTEM = `You review timesheet reconciliation findings for a field services company.
For each item you receive the record from three systems, facts already computed by code, the employee's note, and the policy sections retrieved for it.
Decide whether the item is a real exception or can be cleared, and explain why in two or three plain sentences for a payroll reviewer.
Use only the supplied record, facts, note and policy sections. Every number you write must appear in the input, and cite the policy sections you rely on by id, for example (§4.1). Cite only sections that were supplied for that item. If the input is not enough to decide, say so and treat it as an exception.
Reply with a JSON array and nothing else: [{"id": "...", "verdict": "exception" | "cleared", "explanation": "..."}]`;

async function reviewWithModel(items) {
  const c = await getClient();
  if (!c) throw new Error('Live mode is not configured');
  const response = await c.client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(items, null, 1) }],
  });
  if (response.stop_reason === 'refusal') throw new Error('The model declined this request');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error('The model did not return JSON');
  return { items: JSON.parse(text.slice(start, end + 1)), model: response.model, usage: response.usage };
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/status') return send(res, 200, { live: !!(await getClient()), model: MODEL });
  if (url.pathname === '/api/review' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        send(res, 200, await reviewWithModel(JSON.parse(body).items));
      } catch (err) {
        const c = await getClient();
        const status = c && err instanceof c.Anthropic.APIError && err.status ? err.status : 500;
        send(res, status, { error: err.message });
      }
    });
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = path.join(__dirname, rel);
  if (!file.startsWith(__dirname + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
}).listen(PORT, () => console.log(`Demo running at http://localhost:${PORT}`));
