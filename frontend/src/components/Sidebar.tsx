import { Activity, BarChart3, CircleHelp, GitBranch, LayoutDashboard, Settings2, ShieldCheck } from 'lucide-react'
const items = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Network explorer', icon: GitBranch },
  { label: 'Interventions', icon: ShieldCheck },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'How it works', icon: CircleHelp },
]
export default function Sidebar({ active, onSelect }: { active: string; onSelect: (s: string) => void }) {
  return <aside className="sidebar">
    <div className="brand-lockup"><div className="brand-mark"><Activity size={21} /></div><div><strong>SignalScope</strong><small>Spread intelligence</small></div></div>
    <div className="nav-label">WORKSPACE</div>
    <nav>{items.map(item => {
      const Icon = item.icon
      return <button key={item.label} className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => onSelect(item.label)}>
        <Icon size={18} /><span>{item.label}</span>
      </button>
    })}</nav>
    <div className="sidebar-bottom"><div className="status-dot" /><div><strong>Simulation engine</strong><small>Ready to run</small></div><Settings2 size={16} className="sidebar-gear" /></div>
  </aside>
}
