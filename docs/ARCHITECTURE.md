# Architecture notes

## Frontend
React + TypeScript, Vite, custom responsive CSS, React Three Fiber (Three.js), Drei OrbitControls, Recharts, Lucide icons, and Axios. The interface uses plain-language project terminology and keeps implementation details out of the main workflow.

## Backend
FastAPI exposes:
- `GET /` API information
- `GET /api/health` readiness check
- `GET /api/strategies` available comparison approaches
- `POST /api/graph` graph summary and visualization payload (generated or uploaded graph)
- `POST /api/simulate` simulation and comparison results
- `POST /api/graph/edges` graph summary from a supplied edge list
- `POST /api/dataset/inspect` CSV article-metadata inspection

## Graph and spread behaviour
Edges are undirected in the current implementation. The simulation follows an independent-cascade-style process in discrete rounds. Protection targets are prevented from being exposed; fact-check targets can be exposed but do not pass the simulated story further. These are simplified model assumptions, not claims about the complete real-world effects of moderation or fact-checking.

The graph visualization is capped at 400 nodes and 3,000 edges to keep the browser responsive; simulations run against the full supplied graph, capped at 1,000 unique users. The backend returns timing and reach metrics for comparison.

## Known limitations and future improvements
- Results use a fixed seed for repeatability but are a single stochastic run; multi-seed averages and confidence intervals would improve research conclusions.
- FakeNewsNet article metadata is inspected separately; the user-to-user graph must be supplied as an edge list or generated synthetically.
- A persistent experiment history, report builder, and automated unit-test suite could be added later.
