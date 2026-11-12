import type { ApiSpec, Settings } from '../types'

export async function chatCompletion(
  settings: Settings,
  messages: { role: string; content: string }[],
  json = false
): Promise<string> {
  const url = settings.baseUrl.replace(/\/+$/, '') + '/chat/completions'
  const body: Record<string, unknown> = { model: settings.model, messages, temperature: 0.3 }
  if (json) body.response_format = { type: 'json_object' }

  const direct = () =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify(body),
    })
  const viaProxy = () =>
    fetch('api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body,
      }),
    })

  let res: Response
  try {
    res = await direct()
  } catch {
    res = await viaProxy()
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI 请求失败 (HTTP ${res.status})：${text.slice(0, 200) || res.statusText}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 返回内容为空')
  return content
}

export function extractJson<T>(text: string): T {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1]
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI 返回内容中没有 JSON')
  return JSON.parse(t.slice(start, end + 1)) as T
}

/** 用 AI 为每个接口生成一句话中文用途说明 */
export async function enrichEndpoints(
  settings: Settings,
  spec: ApiSpec
): Promise<Record<string, string>> {
  const list = spec.endpoints.map((e) => ({
    id: e.id,
    path: e.path,
    summary: e.summary,
    tags: e.tags,
    request: e.requestBody ? Object.keys(spec.doc?.components?.schemas ?? {}) : undefined,
  }))

  const content = await chatCompletion(
    settings,
    [
      {
        role: 'system',
        content:
          '你是资深后端/前端协作专家。给定一组 HTTP 接口，为每个接口写一句不超过 40 字的中文用途说明，说明「谁在什么场景下调用它，会产生什么结果」。只输出 JSON：{"items":[{"id":"...","desc":"..."}]}',
      },
      { role: 'user', content: JSON.stringify(list) },
    ],
    true
  )

  const parsed = extractJson<{ items: { id: string; desc: string }[] }>(content)
  const map: Record<string, string> = {}
  for (const item of parsed.items ?? []) {
    if (item.id && item.desc) map[item.id] = item.desc
  }
  return map
}
