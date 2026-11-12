import { useState } from 'react'
import type { ApiSpec, Settings } from '../types'

const PRESETS: { name: string; baseUrl: string; model: string }[] = [
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
]

interface Props {
  text: string
  onTextChange: (t: string) => void
  spec: ApiSpec | null
  error: string | null
  onParse: () => void
  onLoadSample: () => void
  onClear: () => void
  onExportTypes: () => void
  onExportMsw: () => void
  onExportMock: () => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  aiLoading: boolean
  aiCount: number
  onAiEnrich: () => void
}

export default function Sidebar(props: Props) {
  const {
    text, onTextChange, spec, error, onParse, onLoadSample, onClear,
    onExportTypes, onExportMsw, onExportMock,
    settings, onSettingsChange, aiLoading, aiCount, onAiEnrich,
  } = props
  const [showAi, setShowAi] = useState(false)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="brand">ApiLens</h1>
      </div>
      <p className="tagline">贴一份 OpenAPI，得到资源关系图、字段表、示例 JSON、TS 类型和 Mock。</p>

      <div className="sidebar-section">
        <div className="sidebar-title">
          OpenAPI / Swagger 文档（JSON 或 YAML）
          <button className="link-btn" onClick={onLoadSample}>载入示例</button>
        </div>
        <textarea
          className="input-area code-input"
          rows={12}
          value={text}
          spellCheck={false}
          placeholder={'粘贴 OpenAPI 3.x 文档内容，例如：\n{\n  "openapi": "3.0.3",\n  "info": { "title": "My API", "version": "1.0.0" },\n  "paths": { ... },\n  "components": { "schemas": { ... } }\n}'}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <div className="btn-row">
          <button className="btn btn-primary" onClick={onParse}>解析文档</button>
          <button className="btn" onClick={onClear}>清空</button>
        </div>
        {error && <div className="error-box">{error}</div>}
      </div>

      {spec && (
        <div className="sidebar-section">
          <div className="spec-card">
            <div className="spec-title">{spec.title}</div>
            <div className="spec-meta">
              {spec.version && <span>v{spec.version}</span>}
              <span>{spec.endpoints.length} 个接口</span>
              <span>{spec.resources.length} 个资源</span>
              <span>{spec.relations.length} 条关系</span>
            </div>
            {spec.servers[0] && <div className="spec-server">{spec.servers[0]}</div>}
          </div>

          <div className="sidebar-title" style={{ marginTop: 14 }}>导出</div>
          <div className="btn-row">
            <button className="btn btn-sm" onClick={onExportTypes}>TS 类型</button>
            <button className="btn btn-sm" onClick={onExportMsw}>MSW Mock</button>
            <button className="btn btn-sm" onClick={onExportMock}>示例 JSON</button>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <button className="collapse-btn" onClick={() => setShowAi((v) => !v)}>
          {showAi ? '▾' : '▸'} AI 补充接口说明（可选）
        </button>
        {showAi && (
          <div className="settings">
            <p className="hint" style={{ marginTop: 0 }}>
              核心功能（解析、Mock、类型）不依赖 AI。这里仅让 AI 为每个接口写一句业务用途说明。
            </p>
            <div className="preset-row">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className={`btn btn-sm${settings.baseUrl === p.baseUrl ? ' preset-active' : ''}`}
                  onClick={() => onSettingsChange({ ...settings, baseUrl: p.baseUrl, model: p.model })}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Base URL</span>
              <input value={settings.baseUrl} onChange={(e) => onSettingsChange({ ...settings, baseUrl: e.target.value })} />
            </label>
            <label className="field">
              <span>API Key</span>
              <input type="password" value={settings.apiKey} placeholder="sk-..." onChange={(e) => onSettingsChange({ ...settings, apiKey: e.target.value })} />
            </label>
            <label className="field">
              <span>模型</span>
              <input value={settings.model} onChange={(e) => onSettingsChange({ ...settings, model: e.target.value })} />
            </label>
            <button className="btn" disabled={!spec || aiLoading || !settings.apiKey} onClick={onAiEnrich}>
              {aiLoading ? 'AI 生成中…' : `生成接口说明${aiCount ? `（已有 ${aiCount} 条）` : ''}`}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
