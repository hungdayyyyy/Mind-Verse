'use client'
import { useMemo, useState } from 'react'
import { useMindMap } from '@/hooks/learning'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Map, RefreshCw, Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

export function MindMapView({ contentItemId }: { contentItemId: string }) {
  const { mindMap, isLoading, regenerate, isRegenerating } = useMindMap(contentItemId)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const bounds = useMemo(() => {
    if (!mindMap?.nodes.length) return { minX: 0, minY: 0, maxX: 800, maxY: 500 }
    const xs = mindMap.nodes.map(n => n.x); const ys = mindMap.nodes.map(n => n.y)
    return { minX: Math.min(...xs) - 100, minY: Math.min(...ys) - 100, maxX: Math.max(...xs) + 100, maxY: Math.max(...ys) + 100 }
  }, [mindMap])

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 rounded-xl" /></div>

  if (!mindMap || mindMap.nodes.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
      <Map className="h-8 w-8 text-muted-foreground opacity-40" />
      <p className="text-sm text-muted-foreground">Mind map not yet generated</p>
      <Button size="sm" onClick={() => regenerate()}>Generate Mind Map</Button>
    </div>
  )

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  const handleMouseDown = (e: React.MouseEvent) => { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }) }
  const handleMouseMove = (e: React.MouseEvent) => { if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }
  const handleMouseUp = () => setDragging(false)

  return (
    <div className="relative h-full min-h-[500px] bg-slate-50/50 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background border border-border rounded-lg p-1 shadow-sm">
        <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-1.5 hover:bg-accent rounded-md transition-colors"><ZoomIn className="h-3.5 w-3.5" /></button>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} className="p-1.5 hover:bg-accent rounded-md transition-colors"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="p-1.5 hover:bg-accent rounded-md transition-colors"><Maximize2 className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button onClick={() => regenerate()} disabled={isRegenerating} className="p-1.5 hover:bg-accent rounded-md transition-colors">
          {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {mindMap.edges.map((edge) => {
            const source = mindMap.nodes.find(n => n.id === edge.source)
            const target = mindMap.nodes.find(n => n.id === edge.target)
            if (!source || !target) return null
            return (
              <g key={edge.id}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#cbd5e1" strokeWidth="1.5" />
                {edge.label && (
                  <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2} fontSize="9" fill="#94a3b8" textAnchor="middle">{edge.label}</text>
                )}
              </g>
            )
          })}
          {mindMap.nodes.map((node) => {
            const isRoot = node.type === 'root'
            const r = isRoot ? 50 : node.type === 'branch' ? 38 : 30
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={r}
                  fill={node.color || (isRoot ? '#6366f1' : node.type === 'branch' ? '#a78bfa' : '#ffffff')}
                  stroke={isRoot ? '#4f46e5' : '#c4b5fd'} strokeWidth="2" />
                <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={isRoot ? 12 : 10} fontWeight={isRoot ? 600 : 500}
                  fill={isRoot || node.type === 'branch' ? '#ffffff' : '#1e293b'}>
                  {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
