import type { ReactNode } from 'react'
import Tooltip from './Tooltip'
export default function StatCard({ label, value, sub, icon, tip, tone = 'blue' }: {
  label: string; value: string; sub: string; icon: ReactNode; tip: string; tone?: string
}) {
  return <div className="stat-card">
    <div className={`stat-icon ${tone}`}>{icon}</div>
    <div className="stat-label">{label}<Tooltip text={tip} /></div>
    <div className="stat-value">{value}</div>
    <div className="stat-sub">{sub}</div>
  </div>
}
