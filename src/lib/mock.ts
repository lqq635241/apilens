import { deref } from './openapi'

/** 根据 schema 生成示例数据（确定性，不依赖 AI） */
export function mockFromSchema(
  doc: any,
  schema: any,
  depth = 0,
  seen = new Set<string>()
): any {
  if (!schema || depth > 4) return null
  const ref = schema.$ref as string | undefined
  if (ref) {
    if (seen.has(ref)) return null
    seen.add(ref)
  }
  const s = deref(doc, schema)
  if (!s) return null

  // allOf 合并
  if (Array.isArray(s.allOf)) {
    return Object.assign(
      {},
      ...s.allOf.map((sub: any) => mockFromSchema(doc, sub, depth + 1, new Set(seen)))
    )
  }
  if (Array.isArray(s.oneOf) && s.oneOf[0]) return mockFromSchema(doc, s.oneOf[0], depth + 1, new Set(seen))
  if (Array.isArray(s.anyOf) && s.anyOf[0]) return mockFromSchema(doc, s.anyOf[0], depth + 1, new Set(seen))

  if (s.example !== undefined) return s.example
  if (s.default !== undefined) return s.default
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0]

  const type = s.type ?? (s.properties ? 'object' : s.items ? 'array' : 'string')

  switch (type) {
    case 'object': {
      const out: Record<string, any> = {}
      for (const [key, prop] of Object.entries(s.properties ?? {})) {
        out[key] = mockFromSchema(doc, prop, depth + 1, new Set(seen))
      }
      if (!s.properties && s.additionalProperties) {
        out.key = mockFromSchema(doc, s.additionalProperties, depth + 1, new Set(seen))
      }
      return out
    }
    case 'array': {
      const item = mockFromSchema(doc, s.items ?? {}, depth + 1, new Set(seen))
      return [item, item].slice(0, s.maxItems && s.maxItems < 2 ? s.maxItems : 2)
    }
    case 'integer':
      return s.minimum ?? 1
    case 'number':
      return s.minimum ?? 99.9
    case 'boolean':
      return true
    case 'string':
    default:
      return mockString(s)
  }
}

function mockString(s: any): string {
  switch (s.format) {
    case 'date-time':
      return '2026-11-12T10:00:00Z'
    case 'date':
      return '2026-11-12'
    case 'email':
      return 'user@example.com'
    case 'uuid':
      return '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    case 'uri':
    case 'url':
      return 'https://example.com/image.png'
    case 'password':
      return '********'
    case 'int64':
      return '1001'
    default: {
      const pattern = String(s.pattern ?? '')
      if (/phone|mobile/i.test(pattern)) return '13800138000'
      if (s.maxLength && s.maxLength <= 4) return 'abc'
      return '示例文本'
    }
  }
}

/** 列表接口返回数组，详情接口返回对象 */
export function mockForEndpoint(doc: any, method: string, schema: any, isList = false): any {
  const value = mockFromSchema(doc, schema)
  if (isList && !Array.isArray(value)) return [value, value]
  return value
}
