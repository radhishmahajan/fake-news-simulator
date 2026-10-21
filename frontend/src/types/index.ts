export type Strategy =
  | 'No action'
  | 'Random protection'
  | 'Most connected users'
  | 'Spread hotspots'
  | 'Fact-check key connectors'

export type GraphNode = { id: string; degree: number }
export type GraphEdge = { source: string; target: string }
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[]; truncated?: boolean }
export type NetworkSummary = {
  nodes: number; edges: number; average_degree: number; density: number;
  average_clustering: number; components: number
}
export type HistoryPoint = { round: number; new_exposures: number; total_exposed: number }
export type SimulationResult = {
  strategy: Strategy; total_nodes: number; exposed: number; exposure_pct: number;
  targeted: number; transmission_attempts: number; runtime_ms: number;
  reduction_vs_baseline_pct: number; history: HistoryPoint[];
  exposed_nodes: string[]; blocked_nodes: string[]
}
export type SimulationResponse = {
  network: NetworkSummary; graph: GraphData; source: string;
  settings: Record<string, unknown>; results: SimulationResult[]
}
export type SimulationSettings = {
  node_count: number; network_model: 'Small-world' | 'Scale-free' | 'Random';
  graph_seed: number; source: string; probability: number; max_rounds: number;
  budget: number; simulation_seed: number; strategies: Strategy[]; edges?: GraphEdge[]
}
