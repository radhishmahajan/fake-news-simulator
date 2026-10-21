from __future__ import annotations
from collections import deque
import heapq
import random
import time
import networkx as nx
import pandas as pd

STRATEGIES = [
    "No action",
    "Random protection",
    "Most connected users",
    "Spread hotspots",
    "Fact-check key connectors",
]

def make_graph(n=150, model="Small-world", seed=42):
    n = max(30, min(1000, int(n)))
    if model == "Scale-free":
        g = nx.barabasi_albert_graph(n, min(3, n - 1), seed=seed)
    elif model == "Random":
        g = nx.gnp_random_graph(n, min(0.12, 8 / n), seed=seed)
        if g.number_of_edges() == 0:
            g.add_edges_from((i, i + 1) for i in range(n - 1))
    else:
        k = min(6, n - 1)
        if k % 2:
            k -= 1
        g = nx.watts_strogatz_graph(n, max(2, k), 0.18, seed=seed)
    return nx.convert_node_labels_to_integers(g)

def graph_summary(g):
    n, e = g.number_of_nodes(), g.number_of_edges()
    deg = dict(g.degree())
    return {
        "nodes": n, "edges": e,
        "average_degree": round(sum(deg.values()) / max(1, n), 2),
        "density": round(nx.density(g), 5),
        "average_clustering": round(nx.average_clustering(g), 4) if n > 2 else 0,
        "components": nx.number_connected_components(g),
    }

def graph_payload(g, max_nodes=400):
    # Keep payload manageable; simulator itself always uses the full graph.
    nodes = list(g.nodes())[:max_nodes]
    allowed = set(nodes)
    degrees = dict(g.degree())
    return {
        "nodes": [{"id": str(n), "degree": int(degrees[n])} for n in nodes],
        "edges": [{"source": str(u), "target": str(v)} for u, v in g.edges() if u in allowed and v in allowed][:3000],
        "truncated": g.number_of_nodes() > max_nodes,
    }

def bfs_distances(g, source, max_depth=3, blocked=None):
    blocked = set(blocked or [])
    if source not in g or source in blocked:
        return {}
    distances = {source: 0}
    q = deque([source])
    while q:
        u = q.popleft()
        if distances[u] >= max_depth:
            continue
        for v in g.neighbors(u):
            if v not in blocked and v not in distances:
                distances[v] = distances[u] + 1
                q.append(v)
    return distances

def choose_nodes(g, strategy, budget, seed, source):
    excluded = {source}
    candidates = [n for n in g.nodes if n not in excluded]
    budget = min(max(0, budget), len(candidates))
    if strategy == "No action" or budget == 0:
        return []
    if strategy == "Random protection":
        rng = random.Random(seed)
        rng.shuffle(candidates)
        return candidates[:budget]
    if strategy == "Most connected users":
        heap = [(-g.degree(n), str(n), n) for n in candidates]
        heapq.heapify(heap)
        selected = []
        while heap and len(selected) < budget:
            selected.append(heapq.heappop(heap)[2])
        return selected
    if strategy == "Fact-check key connectors":
        # Betweenness highlights people who connect otherwise separate parts of a network.
        # Approximate it for larger graphs to keep API response times predictable.
        sample_size = min(120, g.number_of_nodes()) if g.number_of_nodes() > 300 else None
        centrality = nx.betweenness_centrality(g, k=sample_size, seed=seed, normalized=True) if sample_size else nx.betweenness_centrality(g, normalized=True)
        ranked = sorted(candidates, key=lambda n: (centrality.get(n, 0.0), g.degree(n)), reverse=True)
        return ranked[:budget]
    # Precompute each candidate's discounted local reach once, then repeatedly
    # choose the candidate that adds the most newly covered reach. This keeps the
    # heuristic responsive for larger interactive networks.
    reach_weights = {}
    for node in candidates:
        distances = bfs_distances(g, node, 3, excluded)
        reach_weights[node] = {target: 1.0 / (distance + 1) for target, distance in distances.items()}
    selected = []
    remaining = set(candidates)
    covered = set(excluded)
    for _ in range(budget):
        best = max(
            remaining,
            key=lambda candidate: sum(weight for target, weight in reach_weights[candidate].items() if target not in covered),
            default=None,
        )
        if best is None:
            break
        selected.append(best)
        remaining.remove(best)
        covered.update(reach_weights[best])
    return selected

def simulate(g, source, probability, max_rounds, strategy, budget, seed):
    if source not in g:
        source = next(iter(g.nodes))
    started = time.perf_counter()
    targets = set(choose_nodes(g, strategy, budget, seed, source))
    targets.discard(source)
    # Protection prevents a person from being reached; fact-checking lets a person
    # encounter the story but prevents that person from passing it further.
    fact_checked = targets if strategy == "Fact-check key connectors" else set()
    blocked = targets if strategy != "Fact-check key connectors" else set()
    rng = random.Random(seed)
    exposed = {source}
    frontier = {source}
    history = [{"round": 0, "new_exposures": 1, "total_exposed": 1}]
    attempts = 0
    for round_no in range(1, max_rounds + 1):
        new = set()
        for node in frontier:
            if node in fact_checked:
                continue
            for neighbor in g.neighbors(node):
                if neighbor in exposed or neighbor in blocked:
                    continue
                attempts += 1
                if rng.random() < probability:
                    new.add(neighbor)
        new -= exposed
        new -= blocked
        exposed.update(new)
        frontier = new
        history.append({"round": round_no, "new_exposures": len(new), "total_exposed": len(exposed)})
        if not frontier:
            break
    elapsed = (time.perf_counter() - started) * 1000
    total = g.number_of_nodes()
    return {
        "strategy": strategy, "total_nodes": total, "exposed": len(exposed),
        "exposure_pct": round(100 * len(exposed) / max(1, total), 2),
        "targeted": len(targets), "transmission_attempts": attempts,
        "runtime_ms": round(elapsed, 3), "history": history,
        "exposed_nodes": [str(n) for n in exposed],
        "blocked_nodes": [str(n) for n in targets],
    }

def compare(g, source, probability, max_rounds, budget, seed, strategies):
    results = [
        simulate(g, source, probability, max_rounds, s, budget, seed)
        for s in strategies
    ]
    baseline = next((r["exposed"] for r in results if r["strategy"] == "No action"), None)
    for r in results:
        r["reduction_vs_baseline_pct"] = round(
            0.0 if baseline in (None, 0) else 100 * (baseline - r["exposed"]) / baseline, 2
        )
    return results
