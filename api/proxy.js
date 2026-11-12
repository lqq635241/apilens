/**
 * Vercel Serverless Function：POST /api/proxy
 * 仅用于「AI 补充说明」功能中转请求（智谱等不允许浏览器跨域直连的服务商）。
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }

  const { url, headers, body } = req.body ?? {}
  if (!/^https?:\/\//.test(url ?? '')) {
    res.status(400).json({ error: 'invalid url' })
    return
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: headers ?? {},
      body: JSON.stringify(body ?? {}),
    })
    res.statusCode = upstream.status
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    res.end(await upstream.text())
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
}
