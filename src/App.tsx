import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import GraphCanvas from './components/GraphCanvas'
import DetailPanel from './components/DetailPanel'
import { parseSpec } from './lib/openapi'
import { SAMPLE_SPEC } from './lib/sample'
import { generateTypes } from './lib/tsType'
import { generateMsw } from './lib/msw'
import { mockFromSchema } from './lib/mock'
import { enrichEndpoints } from './lib/llm'
import { download } from './lib/file'
import type { ApiSpec, Settings } from './types'

const TEXT_KEY = 'apilens.spec'
const SETTINGS_KEY = 'apilens.settings'

const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
}

export default function App() {
  const [text, setText] = useState<string>(() => localStorage.getItem(TEXT_KEY) ?? '')
  const [spec, setSpec] = useState<ApiSpec | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [aiDesc, setAiDesc] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const doParse = useCallback((content: string) => {
    try {
      const parsed = parseSpec(content)
      setSpec(parsed)
      setError(null)
      setAiDesc({})
      const first =
        parsed.resources.find((r) => !r.isInput && r.endpointIds.length > 0) ??
        parsed.resources.find((r) => !r.isInput) ??
        parsed.resources[0]
      setSelectedKey(first?.key ?? null)
      localStorage.setItem(TEXT_KEY, content)
    } catch (e) {
      setSpec(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const handleParse = useCallback(() => doParse(text), [doParse, text])

  const handleLoadSample = useCallback(() => {
    setText(SAMPLE_SPEC)
    doParse(SAMPLE_SPEC)
  }, [doParse])

  const handleClear = useCallback(() => {
    setText('')
    setSpec(null)
    setError(null)
    setSelectedKey(null)
    setAiDesc({})
    localStorage.removeItem(TEXT_KEY)
  }, [])

  const selectedResource = useMemo(
    () => spec?.resources.find((r) => r.key === selectedKey) ?? null,
    [spec, selectedKey]
  )

  /* ---------- 导出 ---------- */

  const handleExportTypes = useCallback(() => {
    if (!spec) return
    download('api-types.ts', generateTypes(spec))
  }, [spec])

  const handleExportMsw = useCallback(() => {
    if (!spec) return
    download('mocks.ts', generateMsw(spec))
  }, [spec])

  const handleExportMock = useCallback(() => {
    if (!spec) return
    const out: Record<string, unknown> = {}
    for (const ep of spec.endpoints) {
      const ok = ep.responses.find((r) => /^2\d\d$/.test(r.code) && r.schema)
      if (!ok?.schema) continue
      const isList = ep.method === 'GET' && !/\{[^}]+\}$/.test(ep.path)
      let value = mockFromSchema(spec.doc, ok.schema)
      if (isList && !Array.isArray(value)) value = [value, value]
      out[`${ep.method} ${ep.path}`] = { status: ok.code, body: value }
    }
    download('api-mocks.json', JSON.stringify(out, null, 2))
  }, [spec])

  /* ---------- AI 增强 ---------- */

  const handleAiEnrich = useCallback(async () => {
    if (!spec) return
    setAiLoading(true)
    setError(null)
    try {
      const map = await enrichEndpoints(settings, spec)
      setAiDesc(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiLoading(false)
    }
  }, [spec, settings])

  return (
    <div className="app">
      <Sidebar
        text={text}
        onTextChange={setText}
        spec={spec}
        error={error}
        onParse={handleParse}
        onLoadSample={handleLoadSample}
        onClear={handleClear}
        onExportTypes={handleExportTypes}
        onExportMsw={handleExportMsw}
        onExportMock={handleExportMock}
        settings={settings}
        onSettingsChange={setSettings}
        aiLoading={aiLoading}
        aiCount={Object.keys(aiDesc).length}
        onAiEnrich={handleAiEnrich}
      />

      <main className="main">
        {spec ? (
          <GraphCanvas
            spec={spec}
            selectedKey={selectedKey}
            onSelect={(k) => setSelectedKey(k || null)}
          />
        ) : (
          <div className="canvas-empty">
            <div className="canvas-empty-icon">🕸️</div>
            <h2>把接口文档变成一张看得懂的地图</h2>
            <p>
              在左侧粘贴 OpenAPI / Swagger 文档（JSON 或 YAML），点击「解析文档」。
              <br />
              你会得到资源关系图、接口清单、字段表、示例 JSON、TS 类型和 MSW mock —— 全部确定性生成。
            </p>
            <button className="btn btn-primary" style={{ width: 'auto', marginTop: 18 }} onClick={handleLoadSample}>
              先看看示例（电商 API）
            </button>
          </div>
        )}
      </main>

      {spec && selectedResource && (
        <DetailPanel spec={spec} resource={selectedResource} aiDesc={aiDesc} />
      )}
    </div>
  )
}
