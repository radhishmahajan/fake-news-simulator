import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { GraphData } from '../types'

function buildPositions(ids: string[]) {
  const result = new Map<string, THREE.Vector3>()
  const golden = Math.PI * (3 - Math.sqrt(5))
  ids.forEach((id, i) => {
    const y = 1 - (i / Math.max(1, ids.length - 1)) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    result.set(id, new THREE.Vector3(Math.cos(theta) * radius * 4.5, y * 4.5, Math.sin(theta) * radius * 4.5))
  })
  return result
}

function Node({ id, degree, position, isSource, isBlocked, isExposed }: {
  id: string; degree: number; position: THREE.Vector3; isSource: boolean; isBlocked: boolean; isExposed: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useFrame(({ clock }) => {
    if (ref.current && isSource) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.13
      ref.current.scale.setScalar(pulse)
    }
  })
  const color = isSource ? '#ef4444' : isBlocked ? '#8b5cf6' : isExposed ? '#f59e0b' : '#3b82f6'
  return <mesh
    ref={ref} position={position} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
  >
    <sphereGeometry args={[isSource ? 0.18 : 0.075 + Math.min(degree, 12) * 0.008, 14, 14]} />
    <meshStandardMaterial color={color} roughness={0.35} metalness={0.12} emissive={color} emissiveIntensity={hovered ? 0.75 : 0.12} />
    {hovered && <Html distanceFactor={10} position={[0, 0.35, 0]} center style={{ pointerEvents: 'none' }}>
      <div style={{ background: '#ffffff', border: '1px solid #dce5f3', borderRadius: 8, padding: '7px 10px', minWidth: 105, boxShadow: '0 8px 22px #14284a1a', color: '#25334b', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ fontSize: 11, fontWeight: 700 }}>User {id}</div>
        <div style={{ fontSize: 10, color: '#728098', marginTop: 3 }}>{degree} connections</div>
        <div style={{ fontSize: 9, color: isSource ? '#dc4545' : isBlocked ? '#8155dd' : isExposed ? '#c48613' : '#356df3', marginTop: 3 }}>{isSource ? 'Initial source' : isBlocked ? 'Intervention target' : isExposed ? 'Exposed in run' : 'Not exposed'}</div>
      </div>
    </Html>}
  </mesh>
}

function Scene({ graph, source, exposed, blocked }: {
  graph: GraphData; source: string; exposed: Set<string>; blocked: Set<string>
}) {
  const positions = useMemo(() => buildPositions(graph.nodes.map(n => n.id)), [graph.nodes])
  const lines = useMemo(() => {
    const points: number[] = []
    graph.edges.forEach(edge => {
      const a = positions.get(String(edge.source)), b = positions.get(String(edge.target))
      if (a && b) points.push(a.x, a.y, a.z, b.x, b.y, b.z)
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [graph.edges, positions])
  return <>
    <ambientLight intensity={1.5} />
    <pointLight position={[5, 6, 6]} intensity={18} color="#c5d9ff" />
    <lineSegments geometry={lines}>
      <lineBasicMaterial color="#aab8d0" transparent opacity={0.34} />
    </lineSegments>
    {graph.nodes.map(node => {
      const pos = positions.get(node.id)
      if (!pos) return null
      return <Node key={node.id} id={node.id} degree={node.degree} position={pos}
        isSource={node.id === source} isBlocked={blocked.has(node.id)} isExposed={exposed.has(node.id)} />
    })}
    <OrbitControls enableDamping dampingFactor={0.08} minDistance={5} maxDistance={24} />
  </>
}

export default function Network3D({ graph, source, exposedNodes = [], blockedNodes = [] }: {
  graph: GraphData; source: string; exposedNodes?: string[]; blockedNodes?: string[]
}) {
  const exposed = useMemo(() => new Set(exposedNodes), [exposedNodes])
  const blocked = useMemo(() => new Set(blockedNodes), [blockedNodes])
  return <div className="network-canvas" aria-label="Interactive 3D social network. Drag to rotate and scroll to zoom.">
    <Canvas camera={{ position: [0, 0, 15], fov: 50 }} dpr={[1, 1.6]}>
      <color attach="background" args={['#f8faff']} />
      <Scene graph={graph} source={source} exposed={exposed} blocked={blocked} />
    </Canvas>
    <div className="canvas-hint"><span>Drag to rotate</span><span>Scroll to zoom</span></div>
  </div>
}
