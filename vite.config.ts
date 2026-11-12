import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** 本地 LLM 代理（仅 AI 补充说明功能用，智谱等服务商需要） */
function llmProxy(): Plugin {
  return {
    name: 'apilens-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
            url?: string
            headers?: Record<string, string>
            body?: unknown
          }
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
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), llmProxy()],
  server: { port: 5174, host: true },
})
