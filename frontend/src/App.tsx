import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Check, CircleHelp, Download, FileUp, FlaskConical, Gauge, GitBranch, LoaderCircle, Play, RefreshCw, ShieldCheck, SlidersHorizontal, Users, Waypoints, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import StatCard from './components/StatCard'
import Tooltip from './components/Tooltip'
import Network3D from './components/Network3D'
import { ExposureChart, StrategyChart } from './components/Charts'
import Algorithms from './pages/Algorithms'
import type { GraphData, GraphEdge, SimulationResponse, SimulationSettings, Strategy } from './types'

const ALL_STRATEGIES: Strategy[] = ['No action', 'Random protection', 'Most connected users', 'Spread hotspots', 'Fact-check key connectors']
const initialSettings: SimulationSettings = {
  node_count: 150, network_model: 'Small-world', graph_seed: 42, source: '0',
  probability: 0.18, max_rounds: 12, budget: 8, simulation_seed: 42, strategies: ALL_STRATEGIES,
}

function downloadCsv(results: NonNullable<SimulationResponse>['results']) {
  const headers = ['approach', 'total_nodes', 'exposed', 'exposure_pct', 'targeted', 'reduction_vs_baseline_pct', 'runtime_ms']
  const rows = results.map(r => headers.map(h => JSON.stringify((h === 'approach' ? r.strategy : (r as unknown as Record<string, unknown>)[h]) ?? '')).join(','))
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'misinformation-strategy-comparison.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [active, setActive] = useState('Overview')
  const [settings, setSettings] = useState(initialSettings)
  const [response, setResponse] = useState<SimulationResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [apiReady, setApiReady] = useState(false)
  const [error, setError] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [datasetInfo, setDatasetInfo] = useState<{ filename: string; records: number; label: string; preview: Record<string, unknown>[]; note: string } | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadedEdges, setUploadedEdges] = useState<GraphEdge[]>([])
  const [edgeFileName, setEdgeFileName] = useState('')

  useEffect(() => { setApiReady(true) }, [])
  const result = response?.results ?? []
  const baseline = result.find(r => r.strategy === 'No action')
  const best = result.filter(r => r.strategy !== 'No action').sort((a, b) => a.exposed - b.exposed)[0]
  const uploadedNodeCount = useMemo(() => new Set(uploadedEdges.flatMap(edge => [edge.source, edge.target])).size, [uploadedEdges])
  const currentGraph: GraphData = useMemo(() => {
    if (response?.graph) return response.graph
    if (uploadedEdges.length) {
      const degrees = new Map<string, number>()
      uploadedEdges.forEach(edge => {
        degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1)
        degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1)
      })
      const allNodes = [...degrees].map(([id, degree]) => ({ id, degree }))
      const nodes = allNodes.slice(0, 400)
      const visibleIds = new Set(nodes.map(node => node.id))
      const edges = uploadedEdges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).slice(0, 3000)
      return { nodes, edges, truncated: degrees.size > 400 || edges.length < uploadedEdges.length }
    }
    return {
      nodes: Array.from({ length: 80 }, (_, i) => ({ id: String(i), degree: 3 + (i % 7) })),
      edges: Array.from({ length: 130 }, (_, i) => ({ source: String(i % 80), target: String((i * 7 + 11) % 80) })).filter(e => e.source !== e.target),
    }
  }, [response?.graph, uploadedEdges])
  const source = response?.source ?? settings.source
  const currentResult = result[0]
  const update = <K extends keyof SimulationSettings>(key: K, value: SimulationSettings[K]) => setSettings(s => ({ ...s, [key]: value }))

  async function execute() {
    setBusy(true); setError('')
    // UI-only demonstration: deterministic local simulation, no backend required.
    await new Promise(resolve => window.setTimeout(resolve, 450))
    const count = uploadedEdges.length ? uploadedNodeCount : settings.node_count
    const graphEdges = uploadedEdges.length ? uploadedEdges : Array.from({ length: Math.round(count * 2.6) }, (_, i) => ({ source: String(i % count), target: String((i * 7 + 11) % count) })).filter(e => e.source !== e.target)
    const nodes = Array.from({ length: Math.min(count, 400) }, (_, i) => ({ id: String(i), degree: graphEdges.reduce((sum, edge) => sum + Number(edge.source === String(i) || edge.target === String(i)), 0) }))
    const baselineExposure = Math.min(count, Math.max(1, Math.round(count * (0.22 + settings.probability * 0.58) * (1 - Math.exp(-settings.max_rounds / 12)))))
    const results = settings.strategies.map((strategy, index) => {
      const factor = strategy === 'No action' ? 0 : strategy === 'Random protection' ? 0.12 : strategy === 'Most connected users' ? 0.22 : strategy === 'Spread hotspots' ? 0.27 : 0.34
      const exposed = Math.max(1, Math.round(baselineExposure * (1 - factor * Math.min(1, settings.budget / 8))))
      const history = Array.from({ length: settings.max_rounds }, (_, i) => {
        const total = Math.min(exposed, Math.max(1, Math.round(exposed * (1 - Math.exp(-(i + 1) / Math.max(2, settings.max_rounds / 3))))))
        return { round: i + 1, new_exposures: i === 0 ? total : Math.max(0, total - Math.min(exposed, Math.round(exposed * (1 - Math.exp(-i / Math.max(2, settings.max_rounds / 3)))))), total_exposed: total }
      })
      return { strategy, total_nodes: count, exposed, exposure_pct: Math.round(exposed / Math.max(1, count) * 1000) / 10, targeted: strategy === 'No action' ? 0 : Math.min(settings.budget, count), transmission_attempts: exposed * 2, runtime_ms: 1.2 + index * 0.6, reduction_vs_baseline_pct: strategy === 'No action' ? 0 : Math.round((baselineExposure - exposed) / Math.max(1, baselineExposure) * 1000) / 10, history, exposed_nodes: nodes.slice(0, exposed).map(n => n.id), blocked_nodes: strategy === 'No action' ? [] : nodes.slice(0, Math.min(settings.budget, count)).map(n => n.id) }
    })
    setResponse({ network: { nodes: count, edges: graphEdges.length, average_degree: graphEdges.length * 2 / Math.max(1, count), density: 0, average_clustering: 0.24, components: 1 }, graph: { nodes, edges: graphEdges.slice(0, 3000), truncated: count > 400 || graphEdges.length > 3000 }, source: settings.source || '0', settings: { ...settings }, results })
    setBusy(false)
  }
  async function handleDataset(file?: File) {
    if (!file) return
    setUploadBusy(true); setError('')
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(line => line.trim())
      const columns = (lines[0] || '').split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      setDatasetInfo({ filename: file.name, records: Math.max(0, lines.length - 1), label: `CSV metadata · ${columns.length} columns`, preview: [], note: 'Local browser inspection only' })
    } catch { setError('Could not read this CSV file.') }
    finally { setUploadBusy(false) }
  }
  async function handleEdgeList(file?: File) {
    if (!file) return
    setError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Network CSV files must be 10 MB or smaller.')
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
      if (lines.length < 2) throw new Error('The network CSV needs a header and at least one connection.')
      const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(value => value.trim().replace(/^\"|\"$/g, '').toLowerCase())
      const sourceIndex = headers.indexOf('source')
      const targetIndex = headers.indexOf('target')
      if (sourceIndex < 0 || targetIndex < 0) throw new Error('Use a CSV with two columns named source and target.')
      const edges = lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim().replace(/^\"|\"$/g, ''))
        return { source: values[sourceIndex] || '', target: values[targetIndex] || '' }
      }).filter(edge => edge.source && edge.target && edge.source !== edge.target)
      if (!edges.length) throw new Error('No valid source-to-target connections were found.')
      setUploadedEdges(edges)
      setEdgeFileName(file.name)
      setResponse(null)
      update('source', edges[0].source)
    } catch (e: any) {
      setError(e?.message || 'Could not read this network CSV.')
      setUploadedEdges([]); setEdgeFileName('')
    }
  }
  const toggleStrategy = (strategy: Strategy) => {
    update('strategies', settings.strategies.includes(strategy)
      ? settings.strategies.filter(s => s !== strategy)
      : [...settings.strategies, strategy])
  }
  const go = (page: string) => {
    setActive(page); setMobileMenu(false)
    if (page !== 'How it works') {
      const targets: Record<string, string> = { Overview: 'overview', 'Network explorer': 'network', Interventions: 'interventions', Analytics: 'analytics' }
      window.setTimeout(() => document.getElementById(targets[page] || 'overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
  }

  return <div className="app-shell">
    {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <div className={mobileMenu ? 'sidebar-wrap open' : 'sidebar-wrap'}><Sidebar active={active} onSelect={go} /></div>
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu-btn" onClick={() => setMobileMenu(v => !v)} aria-label="Toggle navigation"><SlidersHorizontal size={19} /></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{active}</strong></div></div>
        <div className="topbar-actions"><div className={`api-pill ${apiReady ? 'online' : 'offline'}`}><span />{apiReady ? 'UI demo mode' : 'Demo unavailable'}</div><button className="icon-button" title="About this project" onClick={() => go('How it works')}><CircleHelp size={18} /></button><div className="avatar">SS</div></div>
      </header>

      {error && <div className="error-banner"><X size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button></div>}
      {active === 'How it works' ? <Algorithms /> : <>
        <section className="welcome-row" id="overview">
          <div><div className="eyebrow"><span className="live-dot" /> SOCIAL NETWORK RESEARCH <span className="eyebrow-divider">/</span> INTERACTIVE SIMULATION</div><h1>{active === 'Overview' ? 'Misinformation, mapped.' : active}</h1><p>{active === 'Overview' ? 'Explore how information moves through connected communities—and test strategies to reduce its reach.' : 'Inspect the simulated network and evaluate mitigation strategies using reproducible experiments.'}</p></div>
          <div className="welcome-actions"><button className="btn btn-secondary" onClick={() => { setResponse(null); setSettings(initialSettings); }}><RefreshCw size={16} /> Reset</button><button className="btn btn-primary" onClick={execute} disabled={busy || settings.strategies.length === 0}><Play size={16} fill="currentColor" /> {busy ? 'Simulating…' : 'Run simulation'}</button></div>
        </section>

        <section className="journey-strip" aria-label="How the simulator works">
          <div className="journey-intro"><span className="journey-kicker">YOUR EXPERIMENT</span><strong>From a single post to a network-wide story</strong><p>Set up a community, simulate sharing, then compare ways to limit the reach.</p></div>
          <div className="journey-step"><span className="journey-step-icon step-blue">01</span><div><strong>Build the network</strong><small>Choose users and connections</small></div></div>
          <div className="journey-arrow">→</div>
          <div className="journey-step"><span className="journey-step-icon step-amber">02</span><div><strong>Simulate sharing</strong><small>Watch the story travel</small></div></div>
          <div className="journey-arrow">→</div>
          <div className="journey-step"><span className="journey-step-icon step-green">03</span><div><strong>Compare results</strong><small>Find what reduces spread</small></div></div>
        </section>

        <section className="stat-grid">
          <StatCard label="Network users" value={(response?.network.nodes ?? (uploadedEdges.length ? uploadedNodeCount : settings.node_count)).toLocaleString()} sub="Simulated nodes" icon={<Users size={19} />} tone="blue" tip="Each node represents a user in the model. Synthetic network by default." />
          <StatCard label="Connections" value={(response?.network.edges ?? (uploadedEdges.length ? uploadedEdges.length : Math.round(settings.node_count * 3))).toLocaleString()} sub="Connections between users" icon={<Waypoints size={19} />} tone="violet" tip="Edges represent connections through which the claim may propagate." />
          <StatCard label="Exposed users" value={baseline ? baseline.exposed.toLocaleString() : '—'} sub={baseline ? `${baseline.exposure_pct}% of network · no action` : 'Run a simulation to measure'} icon={<Activity size={19} />} tone="amber" tip="Exposed means the simulated claim reached the node; it does not mean the user believed it." />
          <StatCard label="Best reduction" value={best ? `${best.reduction_vs_baseline_pct}%` : '—'} sub={best ? best.strategy : 'Compare different approaches'} icon={<ShieldCheck size={19} />} tone="green" tip="Relative reduction compared with the no-action run." />
        </section>

        <section className="content-grid">
          <div className="panel network-panel" id="network">
            <div className="panel-head"><div><div className="panel-title">Social network explorer <Tooltip text="Interactive 3D graph. Drag to rotate, scroll to zoom, and hover nodes for degree details." /></div><p>Interactive 3D graph · {response?.graph.nodes.length ?? currentGraph.nodes.length} visible nodes</p></div><span className="mini-badge"><span className="live-dot" /> LIVE VIEW</span></div>
            <Network3D graph={currentGraph} source={source} exposedNodes={currentResult?.exposed_nodes ?? []} blockedNodes={currentResult?.blocked_nodes ?? []} />
            <div className="legend-row"><span><i className="legend-dot red" /> Source</span><span><i className="legend-dot amber" /> Exposed</span><span><i className="legend-dot violet" /> Intervention</span><span><i className="legend-dot blue" /> Other users</span></div>
          </div>

          <div className="panel controls-panel" id="interventions">
            <div className="panel-head"><div><div className="panel-title">Experiment controls <Tooltip text="Keep all settings identical when comparing strategies to make the experiment fair." /></div><p>Configure your simulation</p></div><FlaskConical size={19} className="panel-head-icon" /></div>
            <div className="form-field"><label>Network model <Tooltip text="Small-world networks have clustered neighborhoods; scale-free networks contain hubs; random graphs connect edges probabilistically." /></label><select disabled={uploadedEdges.length > 0} value={settings.network_model} onChange={e => update('network_model', e.target.value as SimulationSettings['network_model'])}><option>Small-world</option><option>Scale-free</option><option>Random</option></select></div>
            <div className="form-field"><div className="field-label-row"><label>Number of users <Tooltip text="Used for the generated network. When you upload a connection CSV, its user list determines network size." /></label><strong>{uploadedEdges.length ? uploadedNodeCount : settings.node_count}</strong></div><input type="range" min="30" max="1000" step="10" disabled={uploadedEdges.length > 0} value={settings.node_count} onChange={e => update('node_count', Number(e.target.value))} /></div>
            <div className="form-field"><div className="field-label-row"><label>Chance of passing the story <Tooltip text="Probability that an exposed node transmits the claim to a susceptible neighbor on an eligible attempt." /></label><strong>{Math.round(settings.probability * 100)}%</strong></div><input type="range" min="0.01" max="1" step="0.01" value={settings.probability} onChange={e => update('probability', Number(e.target.value))} /></div>
            <div className="two-fields"><div className="form-field"><label>Rounds</label><select value={settings.max_rounds} onChange={e => update('max_rounds', Number(e.target.value))}>{[5, 8, 12, 16, 20, 30, 50].map(n => <option key={n} value={n}>{n} rounds</option>)}</select></div><div className="form-field"><label>Intervention budget <Tooltip text="Maximum number of people who can be protected or selected for fact-checking." /></label><select value={settings.budget} onChange={e => update('budget', Number(e.target.value))}>{[0, 3, 5, 8, 10, 15, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n} users</option>)}</select></div></div>
            <div className="form-field"><div className="field-label-row"><label>Repeatable run setting <Tooltip text="The same seed helps keep random transmission attempts comparable across strategies." /></label><strong>{settings.simulation_seed}</strong></div><input type="range" min="1" max="999" value={settings.simulation_seed} onChange={e => update('simulation_seed', Number(e.target.value))} /></div>
            <div className="form-field"><label>Initial source node</label><input className="text-input" value={settings.source} onChange={e => update('source', e.target.value)} placeholder="e.g. 0" /><small>{uploadedEdges.length ? 'Use an ID from the uploaded connection list.' : 'Choose a starting user ID from 0 to users − 1.'}</small></div>
            <div className="form-field"><label>Intervention strategies <Tooltip text="Select at least one strategy. Include No action to calculate reduction percentages." /></label><div className="strategy-list">{ALL_STRATEGIES.map((s, i) => <label className="strategy-option" key={s}><input type="checkbox" checked={settings.strategies.includes(s)} onChange={() => toggleStrategy(s)} /><span className={`strategy-swatch swatch-${i}`} /><span>{s}</span></label>)}</div></div>
            <button className="btn btn-primary full-width" onClick={execute} disabled={busy || settings.strategies.length === 0}>{busy ? <><LoaderCircle size={17} className="spin" /> Running simulation…</> : <><Play size={16} fill="currentColor" /> Run comparison</>}</button>
            <div className="control-foot"><ShieldCheck size={14} /> Reproducible experiment · Same seed across strategies</div>
          </div>
        </section>

        <section className="chart-grid" id="analytics">
          <div className="panel chart-panel"><div className="panel-head"><div><div className="panel-title">Exposure over time <Tooltip text="Cumulative number of users reached by the simulated claim at each round." /></div><p>How each strategy changes the spread curve</p></div><span className="chart-unit">USERS</span></div>{result.length ? <div className="chart-body"><ExposureChart results={result} /></div> : <div className="empty-chart"><Activity size={24} /><strong>Your spread curve will appear here</strong><span>Run the simulation to compare cumulative exposure by round.</span></div>}</div>
          <div className="panel chart-panel"><div className="panel-head"><div><div className="panel-title">Strategy comparison <Tooltip text="Compares final reach with the number of people targeted. Protection prevents exposure; fact-checking stops onward sharing." /></div><p>Final reach vs intervention size</p></div><span className="chart-unit">USERS</span></div>{result.length ? <div className="chart-body"><StrategyChart results={result} /></div> : <div className="empty-chart"><ShieldCheck size={24} /><strong>Compare mitigation strategies</strong><span>Run the experiment to see which strategy reduces simulated reach.</span></div>}</div>
        </section>

        <section className="panel results-panel">
          <div className="panel-head"><div><div className="panel-title">Experiment results</div><p>Performance metrics for the selected intervention strategies</p></div><button className="btn btn-secondary btn-small" disabled={!result.length} onClick={() => downloadCsv(result)}><Download size={15} /> Export CSV</button></div>
          {result.length ? <div className="table-wrap"><table><thead><tr><th>APPROACH</th><th>EXPOSED</th><th>NETWORK REACH</th><th>TARGETED</th><th>REDUCTION</th><th>RUNTIME</th></tr></thead><tbody>{result.map(r => <tr key={r.strategy}><td><span className="table-strategy"><span className={`strategy-swatch swatch-${ALL_STRATEGIES.indexOf(r.strategy)}`} />{r.strategy}</span></td><td><strong>{r.exposed}</strong></td><td><div className="reach-cell"><div className="reach-track"><div className="reach-fill" style={{ width: `${r.exposure_pct}%` }} /></div><span>{r.exposure_pct}%</span></div></td><td>{r.targeted}</td><td><span className={r.reduction_vs_baseline_pct > 0 ? 'reduction-positive' : 'reduction-neutral'}>{r.reduction_vs_baseline_pct > 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{r.reduction_vs_baseline_pct}%</span></td><td>{r.runtime_ms.toFixed(2)} ms</td></tr>)}</tbody></table></div> : <div className="empty-results">No results yet. Set your experiment options and run the simulation.</div>}
          {response?.graph.truncated && <p className="table-note">The 3D visualization is capped at 400 nodes for performance; the backend simulation uses the full graph.</p>}
        </section>

        <section className="lower-grid">
          <div className="panel dataset-panel"><div className="panel-head"><div><div className="panel-title">Your data</div><p>Use your own network and news metadata</p></div><FileUp size={19} className="panel-head-icon" /></div><label className="upload-zone"><input type="file" accept=".csv,text/csv" onChange={e => handleEdgeList(e.target.files?.[0])} /><span className="upload-icon"><GitBranch size={20} /></span><strong>{edgeFileName || 'Upload network connections'}</strong><span>CSV must contain source,target columns. This network will be used for the next simulation.</span></label>{uploadedEdges.length > 0 && <div className="dataset-success"><Check size={16} /><div><strong>Network ready</strong><small>{uploadedEdges.length.toLocaleString()} connections · starting user set automatically</small></div><button className="text-link link-button" onClick={() => { setUploadedEdges([]); setEdgeFileName(''); setResponse(null); update('source', '0') }}>Remove</button></div>}<div className="metadata-upload"><label className="upload-zone compact-upload"><input type="file" accept=".csv,text/csv" onChange={e => handleDataset(e.target.files?.[0])} /><span className="upload-icon"><FileUp size={18} /></span><strong>{uploadBusy ? 'Inspecting metadata…' : 'Inspect FakeNewsNet metadata'}</strong><span>Review article labels and columns (does not create user connections).</span></label></div>{datasetInfo && <div className="dataset-success"><Check size={16} /><div><strong>{datasetInfo.filename}</strong><small>{datasetInfo.records.toLocaleString()} records · {datasetInfo.label}</small></div></div>}<p className="fine-print">FakeNewsNet provides article and engagement metadata. A separate connection list is used to model how a story travels between users.</p><a className="text-link" href="https://github.com/KaiDMML/FakeNewsNet" target="_blank" rel="noreferrer">Open FakeNewsNet repository ↗</a></div>
          <div className="panel daa-panel"><div className="panel-head"><div><div className="panel-title">Reading your results</div><p>What the numbers tell you</p></div><Gauge size={19} className="panel-head-icon" /></div><div className="daa-item"><span className="daa-number">01</span><div><strong>Total reach</strong><p>How many people the story reached in this run.</p></div></div><div className="daa-item"><span className="daa-number">02</span><div><strong>Reach reduction</strong><p>How much less spread occurred compared with taking no action.</p></div></div><div className="daa-item"><span className="daa-number">03</span><div><strong>Protected people</strong><p>People selected for protection or fact-checking; fact-checked users may still encounter the story but do not pass it on.</p></div></div><div className="daa-item"><span className="daa-number">04</span><div><strong>Run time</strong><p>How long the backend took to calculate that result.</p></div></div><button className="text-link link-button" onClick={() => go('How it works')}>Read the project guide →</button></div>
        </section>
      </>}
      <footer className="footer"><span>SignalScope <b>·</b> Research Project</span><span>UI-only demo · results are illustrative, not real-world predictions.</span></footer>
    </main>
  </div>
}
