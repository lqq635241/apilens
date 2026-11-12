export interface ApiParam {
  name: string
  in: string
  required: boolean
  description?: string
  type?: string
}

export interface ApiResponse {
  code: string
  description: string
  schema?: any
}

export interface ApiEndpoint {
  id: string
  method: string
  path: string
  summary: string
  description?: string
  tags: string[]
  resource?: string
  params: ApiParam[]
  requestBody?: any
  responses: ApiResponse[]
}

export interface ApiResource {
  /** 资源唯一键（单数小写，如 order） */
  key: string
  /** 展示名（如 Order / 订单） */
  name: string
  schemaName?: string
  schema?: any
  endpointIds: string[]
  /** 是否为请求/响应体等辅助 schema（不在关系图中展示） */
  isInput?: boolean
}

export interface ApiRelation {
  from: string
  to: string
  /** 字段名，如 userId */
  label: string
}

export interface ApiSpec {
  title: string
  version: string
  servers: string[]
  endpoints: ApiEndpoint[]
  resources: ApiResource[]
  relations: ApiRelation[]
  doc: any
}

export interface Settings {
  baseUrl: string
  apiKey: string
  model: string
}

export const METHOD_COLOR: Record<string, string> = {
  GET: '#2563eb',
  POST: '#16a34a',
  PUT: '#d97706',
  PATCH: '#7c3aed',
  DELETE: '#dc2626',
  HEAD: '#64748b',
  OPTIONS: '#64748b',
}
