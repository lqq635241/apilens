import { useEffect, useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { METHOD_COLOR, type ApiSpec } from '../types'

interface NodeData {
  name: string
  schemaName?: string
  endpointCount: number
  methods: string[]
}

function ResourceNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData
  return (
    <div className={`resource-node${selected ? ' resource-node-selected' : ''}`}>
      <div className="resource-node-name">{d.name}</div>
      <div className="resource-node-meta">
        {d.endpointCount > 0 ? `${d.endpointCount} 个接口` : '无接口'}
      </div>
      <div className="resource-node-methods">
        {d.methods.map((m) => (
          <span key={m} className="method-dot" style={{ background: METHOD_COLOR[m] ?? '#64748b' }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = { resource: ResourceNode }

function buildElements(spec: ApiSpec) {
  const list = spec.resources.filter((r) => !r.isInput)
  const visible = new Set(list.map((r) => r.key))
  const n = Math.max(list.length, 1)
  const radius = list.length <= 3 ? 200 : Math.max(260, n * 46)

  const nodes: Node[] = list.map((res, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const methods = Array.from(
      new Set(
        spec.endpoints
          .filter((e) => res.endpointIds.includes(e.id))
          .map((e) => e.method)
      )
    )
    return {
      id: res.key,
      type: 'resource',
      position: {
        x: Math.cos(angle) * radius + radius,
        y: Math.sin(angle) * radius + radius,
      },
      data: {
        name: res.name,
        schemaName: res.schemaName,
        endpointCount: res.endpointIds.length,
        methods,
      },
    }
  })

  const edges: Edge[] = spec.relations
    .filter((r) => visible.has(r.from) && visible.has(r.to))
    .map((r, i) => ({
    id: `r${i}-${r.from}-${r.to}`,
    source: r.from,
    target: r.to,
    label: r.label,
    type: 'default',
    style: { strokeWidth: 1.5, stroke: '#94a3b8' },
    labelStyle: { fontSize: 11, fill: '#0f766e', fontFamily: 'monospace' },
    labelBgStyle: { fill: '#f0fdfa' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  }))

  return { nodes, edges }
}

function CanvasInner({
  spec, selectedKey, onSelect,
}: {
  spec: ApiSpec
  selectedKey: string | null
  onSelect: (key: string) => void
}) {
  const { fitView } = useReactFlow()
  const { nodes, edges } = useMemo(() => buildElements(spec), [spec])

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.18, duration: 300 }), 60)
    return () => clearTimeout(t)
  }, [spec, fitView])

  return (
    <ReactFlow
      nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedKey }))}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect('')}
      nodesConnectable={false}
      fitView
      minZoom={0.2}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

export default function GraphCanvas(props: {
  spec: ApiSpec
  selectedKey: string | null
  onSelect: (key: string) => void
}) {
  if (props.spec.resources.length === 0) {
    return (
      <div className="canvas-empty">
        <div className="canvas-empty-icon">🕸️</div>
        <h2>文档里没有可识别的资源</h2>
        <p>请确认 OpenAPI 文档的 components.schemas 中包含带 properties 的对象定义。</p>
      </div>
    )
  }
  return (
    <div className="canvas-wrap">
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
      <div className="canvas-tip">点击资源查看接口与字段 · 箭头表示外键引用关系</div>
    </div>
  )
}
