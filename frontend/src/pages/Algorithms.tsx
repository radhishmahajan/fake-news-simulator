import { Activity, GitBranch, ShieldCheck, TrendingDown } from 'lucide-react'

const steps = [
  { icon: GitBranch, number: '01', title: 'Create a connected community', text: 'Each circle represents a person and each line represents a connection. You can change the network size and structure to explore different sharing patterns.' },
  { icon: Activity, number: '02', title: 'Start a story and watch it travel', text: 'Choose the starting person and set the chance that an exposed person passes the story to a connected person. The simulation advances in rounds until the limit is reached or spread stops.' },
  { icon: ShieldCheck, number: '03', title: 'Apply limited resources', text: 'Compare no action with different ways of selecting people for protection or fact-checking. Every option uses the same network and experiment settings for a fair comparison.' },
  { icon: TrendingDown, number: '04', title: 'Compare the outcomes', text: 'Review total reach, percentage reduction, the round-by-round spread curve, and runtime. Export the results to CSV for further analysis and your project report.' },
]

export default function Algorithms() {
  return <div className="page-stack">
    <div className="section-heading"><div><span className="eyebrow">PROJECT GUIDE</span><h2>How the project works</h2><p>A practical way to explore how online stories spread and how that spread can be reduced.</p></div></div>
    <div className="algorithm-grid">{steps.map(step => { const Icon = step.icon; return <article className="algorithm-card" key={step.number}><div className="algorithm-icon"><Icon size={20} /></div><span className="algorithm-tag">STEP {step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article> })}</div>
    <div className="note-card"><strong>Important interpretation</strong><p>“Exposed” means the simulated story reached a person; it does not mean that person believed or shared it. The built-in network is synthetic, so results illustrate model behaviour rather than predict real-world events. FakeNewsNet article metadata adds context, but a separate user-connection edge list is needed to simulate an actual social graph.</p></div>
  </div>
}
