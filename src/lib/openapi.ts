import { parse as parseYaml } from 'yaml'
import type { ApiEndpoint, ApiParam, ApiRelation, ApiResource, ApiResponse, ApiSpec } from '../types'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

/** 解析 #/components/schemas/Xxx 这类引用 */
export function resolveRef(doc: any, ref: string): any {
  if (!ref.startsWith('#/')) return undefined
  return ref
    .slice(2)
    .split('/')
    .reduce((acc: any, part) => (acc == null ? acc : acc[part]), doc)
}

/** 解引用到实际 schema（只解顶层 $ref 链，防环） */
export function deref(doc: any, schema: any, seen = new Set<string>()): any {
  let cur = schema
  let guard = 0
  while (cur && cur.$ref && guard++ < 10) {
    if (seen.has(cur.$ref)) return {}
    seen.add(cur.$ref)
    const next = resolveRef(doc, cur.$ref)
    if (!next) return {}
    cur = next
  }
  return cur ?? {}
}

/** 取 schema 的引用名（用于展示） */
export function refName(schema: any): string | undefined {
  const ref = schema?.$ref
  if (typeof ref !== 'string') return undefined
  return ref.split('/').pop()
}

function singularize(word: string): string {
  const w = word.toLowerCase()
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.endsWith('ses')) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

function pascal(name: string): string {
  return name
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase())
}

/** 从路径里推断资源：/api/v1/orders/{id}/items -> orders */
function resourceFromPath(path: string): string {
  const segs = path
    .split('/')
    .filter(Boolean)
    .filter((s) => !s.startsWith('{') && !/^v\d+$/i.test(s) && s !== 'api')
  return segs[0] ? singularize(segs[0]) : ''
}

function collectParams(doc: any, pathItem: any, op: any): ApiParam[] {
  const merged = [...(pathItem.parameters ?? []), ...(op.parameters ?? [])]
  return merged.map((p: any) => {
    const d = deref(doc, p)
    return {
      name: d.name ?? '',
      in: d.in ?? 'query',
      required: !!d.required || d.in === 'path',
      description: d.description ?? '',
      type: d.schema?.type ?? d.type ?? 'string',
    }
  })
}

function collectBody(doc: any, op: any): any | undefined {
  const content = op.requestBody?.content
  if (!content) return undefined
  const json = content['application/json'] ?? content['*/*'] ?? Object.values(content)[0]
  return (json as any)?.schema
}

function collectResponses(doc: any, op: any): ApiResponse[] {
  const out: ApiResponse[] = []
  for (const [code, raw] of Object.entries(op.responses ?? {})) {
    const r = deref(doc, raw)
    const content = (r as any)?.content
    const json = content?.['application/json'] ?? (content ? Object.values(content)[0] : undefined)
    out.push({
      code,
      description: (r as any)?.description ?? '',
      schema: (json as any)?.schema,
    })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code))
}

/** 主解析入口：支持 JSON / YAML 的 OpenAPI 3.x */
export function parseSpec(text: string): ApiSpec {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('请先粘贴 OpenAPI / Swagger 文档内容。')

  let doc: any
  try {
    doc = trimmed.startsWith('{') ? JSON.parse(trimmed) : parseYaml(trimmed)
  } catch (e) {
    throw new Error('文档解析失败：既不是合法的 JSON，也不是合法的 YAML。' + (e instanceof Error ? `（${e.message}）` : ''))
  }

  if (!doc || typeof doc !== 'object') throw new Error('文档内容为空或格式不正确。')
  if (!doc.paths && !doc.components?.schemas) {
    throw new Error('没有找到 paths 或 components.schemas，请确认这是 OpenAPI 3.x 文档（Swagger 2.0 建议先转换为 3.x）。')
  }

  const endpoints: ApiEndpoint[] = []
  for (const [path, rawPathItem] of Object.entries(doc.paths ?? {})) {
    const pathItem: any = deref(doc, rawPathItem)
    for (const method of HTTP_METHODS) {
      const op = pathItem?.[method]
      if (!op) continue
      endpoints.push({
        id: `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        summary: op.summary ?? op.operationId ?? '',
        description: op.description ?? '',
        tags: op.tags ?? [],
        resource: resourceFromPath(path),
        params: collectParams(doc, pathItem, op),
        requestBody: collectBody(doc, op),
        responses: collectResponses(doc, op),
      })
    }
  }

  // 资源：components.schemas 里的对象 + 路径推断出的资源（兜底）
  const resources = new Map<string, ApiResource>()
  const schemas = doc.components?.schemas ?? {}

  for (const [schemaName, rawSchema] of Object.entries(schemas)) {
    const schema: any = deref(doc, rawSchema)
    if (!schema?.properties) continue
    const key = singularize(schemaName)
    resources.set(key, {
      key,
      name: pascal(schemaName),
      schemaName,
      schema,
      endpointIds: [],
      // 请求体/响应体类 schema 默认不进关系图
      isInput: /(Request|Response|Payload|Params|Dto|Input)$/i.test(schemaName),
    })
  }

  for (const ep of endpoints) {
    const key = ep.resource
    if (!key) continue
    if (!resources.has(key)) {
      resources.set(key, { key, name: pascal(key), endpointIds: [] })
    }
    const res = resources.get(key)!
    res.endpointIds.push(ep.id)
    // 有接口的资源一定是业务资源
    res.isInput = false
  }

  // 关系推断：xxxId 字段 → 对应资源
  const relations: ApiRelation[] = []
  const seen = new Set<string>()
  for (const res of resources.values()) {
    if (res.isInput) continue
    const props = res.schema?.properties ?? {}
    for (const [prop, rawProp] of Object.entries(props)) {
      const raw: any = rawProp
      let targetKey: string | undefined

      if (raw?.$ref) {
        targetKey = singularize(refName(raw) ?? '')
      } else if (raw?.items?.$ref) {
        targetKey = singularize(refName(raw.items) ?? '')
      } else if (/Id$|_id$/.test(prop)) {
        targetKey = singularize(prop.replace(/Id$|_id$/, ''))
      }

      if (!targetKey || targetKey === res.key) continue
      const target = resources.get(targetKey)
      if (!target || target.isInput) continue
      const sig = `${res.key}->${targetKey}:${prop}`
      if (seen.has(sig)) continue
      seen.add(sig)
      relations.push({ from: res.key, to: targetKey, label: prop })
    }
  }

  return {
    title: doc.info?.title ?? '未命名接口文档',
    version: doc.info?.version ?? '',
    servers: (doc.servers ?? []).map((s: any) => s.url).filter(Boolean),
    endpoints,
    resources: Array.from(resources.values()).filter(
      (r) => (r.schema && Object.keys(r.schema.properties ?? {}).length > 0) || r.endpointIds.length > 0
    ),
    relations,
    doc,
  }
}

/** 简化的类型展示，如 array<string> */
export function typeLabel(doc: any, schema: any): string {
  const s = deref(doc, schema)
  if (!s) return 'any'
  if (s.$ref) return refName(s) ?? 'object'
  if (s.type === 'array') {
    const item = s.items
    return `array<${item?.$ref ? refName(item) : item?.type ?? 'any'}>`
  }
  if (s.enum) return 'enum'
  return s.type ?? (s.properties ? 'object' : 'any')
}
