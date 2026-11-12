/**
 * 生产模式服务器：静态文件 + 本地 LLM 代理
 * 用法：npm run build && npm start（默认 8081 端口，可用 PORT 覆盖）
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT || 8081)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

async function handleProxy(req, res) {
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    const url = payload.url ?? ''
    if (!/^https?:\/\//.test(url)) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'invalid url' }))
      return
    }
    const upstream = await fetch(url, {
      method: 'POST',
      headers: payload.headers ?? {},
      body: JSON.stringify(payload.body ?? {}),
    })
    res.statusCode = upstream.status
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    res.end(await upstream.text())
  } catch (e) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: String(e) }))
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith('/api/proxy')) {
    await handleProxy(req, res)
    return
  }
  const urlPath = (req.url ?? '/').split('?')[0]
  let filePath = path.join(dist, urlPath === '/' ? 'index.html' : urlPath)
  if (!filePath.startsWith(dist) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(dist, 'index.html')
  }
  res.setHeader('Content-Type', MIME[path.extname(filePath)] ?? 'application/octet-stream')
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`ApiLens 已启动: http://localhost:${PORT}`)
})
