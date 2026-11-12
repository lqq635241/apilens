import { useState } from 'react'
import { METHOD_COLOR, type ApiResource, type ApiSpec } from '../types'
import { deref, refName, typeLabel } from '../lib/openapi'
import { generateHandler, resourceExample } from '../lib/msw'
import { generateResourceType } from '../lib/tsType'

const TABS = ['接口', '字段', '示例', 'TS 类型', 'MSW'] as const
type Tab = (typeof TABS)[number]

export default function DetailPanel({
  spec, resource, aiDesc,
}: {
  spec: ApiSpec
  resource: ApiResource
  aiDesc: Record<string, string>
}) {
  const [tab, setTab] = useState<Tab>('接口')
  const [copied, setCopied] = useState('')

  const endpoints = spec.endpoints.filter((e) => resource.endpointIds.includes(e.id))
  const props = resource.schema?.properties ?? {}
  const required: string[] = resource.schema?.required ?? []

  const exampleText = resourceExample(spec, resource.key)
  const tsText = resource.schemaName && resource.schema
    ? generateResourceType(spec.doc, resource.schemaName, resource.schema)
    : '// 该资源没有 schema 定义'
  const mswText = endpoints.map((e) => generateHandler(spec, e.id)).filter(Boolean).join('\n\n')

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text.slice(0, 24))
      setTimeout(() => setCopied(''), 1500)
    })
  }

  return (
    <aside className="detail">
      <div className="detail-header">
        <div>
          <h2>{resource.name}</h2>
          <p className="detail-sub">
            {resource.schemaName ? `components.schemas.${resource.schemaName}` : '无 schema 定义'}
            {' · '}
            {endpoints.length} 个接口 · {Object.keys(props).length} 个字段
          </p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab${tab === t ? ' tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="detail-body">
        {tab === '接口' && (
          <div className="endpoint-list">
            {endpoints.length === 0 && <p className="empty-hint">这个资源没有关联接口（可能只被其他资源引用）。</p>}
            {endpoints.map((ep) => (
              <div key={ep.id} className="endpoint-card">
                <div className="endpoint-line">
                  <span className="method-chip" style={{ background: METHOD_COLOR[ep.method] ?? '#64748b' }}>
                    {ep.method}
                  </span>
                  <code className="endpoint-path">{ep.path}</code>
                </div>
                <div className="endpoint-summary">
                  {aiDesc[ep.id] || ep.summary || '（无说明）'}
                </div>
                {ep.params.length > 0 && (
                  <div className="endpoint-params">
                    {ep.params.map((p) => (
                      <span key={`${p.in}-${p.name}`} className="param-chip">
                        {p.name}
                        <em>{p.in}</em>
                        {p.required ? <b>*</b> : null}
                      </span>
                    ))}
                  </div>
                )}
                <div className="endpoint-codes">
                  {ep.responses.map((r) => (
                    <span
                      key={r.code}
                      className={`code-chip${/^2/.test(r.code) ? ' code-ok' : ' code-err'}`}
                      title={r.description}
                    >
                      {r.code}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === '字段' && (
          <table className="field-table">
            <thead>
              <tr>
                <th>字段</th>
                <th>类型</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(props).map(([key, raw]) => {
                const p = deref(spec.doc, raw)
                return (
                  <tr key={key}>
                    <td>
                      <code>{key}</code>
                      {required.includes(key) ? <span className="req-star">*</span> : null}
                    </td>
                    <td className="field-type">{typeLabel(spec.doc, raw)}</td>
                    <td className="field-desc">{p?.description || (raw as any)?.$ref ? refName(raw as any) || p?.description : p?.description || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {tab === '示例' && (
          <div className="code-block-wrap">
            <button className="copy-btn" onClick={() => copy(exampleText)}>
              {copied ? '已复制' : '复制'}
            </button>
            <pre className="code-block">{exampleText}</pre>
          </div>
        )}

        {tab === 'TS 类型' && (
          <div className="code-block-wrap">
            <button className="copy-btn" onClick={() => copy(tsText)}>
              {copied ? '已复制' : '复制'}
            </button>
            <pre className="code-block">{tsText}</pre>
          </div>
        )}

        {tab === 'MSW' && (
          <div className="code-block-wrap">
            <button className="copy-btn" onClick={() => copy(mswText)}>
              {copied ? '已复制' : '复制'}
            </button>
            <pre className="code-block">{mswText || '// 该资源没有可生成的 handler'}</pre>
          </div>
        )}
      </div>
    </aside>
  )
}
