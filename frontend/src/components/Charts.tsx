import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import type { SimulationResult } from '../types'

const palette = ['#356df3', '#12a57a', '#f59e0b', '#8b5cf6', '#ef5d69']
export function ExposureChart({ results }: { results: SimulationResult[] }) {
  const rounds = new Map<number, Record<string, number>>()
  results.forEach(r => r.history.forEach(p => {
    const row = rounds.get(p.round) || { round: p.round }
    row[r.strategy] = p.total_exposed
    rounds.set(p.round, row)
  }))
  const data = [...rounds.values()].sort((a, b) => Number(a.round) - Number(b.round))
  return <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
      <CartesianGrid stroke="#edf0f6" strokeDasharray="4 4" vertical={false} />
      <XAxis dataKey="round" tickLine={false} axisLine={false} tick={{ fill: '#7a8598', fontSize: 11 }} />
      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#7a8598', fontSize: 11 }} />
      <ChartTooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5eaf2', boxShadow: '0 8px 30px #15264a12' }} />
      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
      {results.map((r, i) => <Line key={r.strategy} type="monotone" dataKey={r.strategy} stroke={palette[i % palette.length]} strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />)}
    </LineChart>
  </ResponsiveContainer>
}
export function StrategyChart({ results }: { results: SimulationResult[] }) {
  const data = results.map(r => ({ strategy: r.strategy, exposed: r.exposed, targeted: r.targeted }))
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 14, bottom: 4, left: 6 }} barGap={4}>
      <CartesianGrid stroke="#edf0f6" strokeDasharray="4 4" horizontal={false} />
      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#7a8598', fontSize: 11 }} />
      <YAxis dataKey="strategy" type="category" width={138} tickLine={false} axisLine={false} tick={{ fill: '#5b6679', fontSize: 10 }} />
      <ChartTooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5eaf2' }} />
      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
      <Bar dataKey="exposed" name="Exposed" fill="#356df3" radius={[0, 4, 4, 0]} />
      <Bar dataKey="targeted" name="Targeted" fill="#a8bdf8" radius={[0, 4, 4, 0]} />
    </BarChart>
  </ResponsiveContainer>
}
