from __future__ import annotations
import io
import pandas as pd
import networkx as nx
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from .schemas import SimulationRequest, EdgeListRequest
from .engine import make_graph, graph_summary, graph_payload, compare, STRATEGIES


def graph_from_edges(edges):
    graph = nx.Graph()
    graph.add_edges_from((edge.source.strip(), edge.target.strip()) for edge in edges
                         if edge.source.strip() and edge.target.strip()
                         and edge.source.strip() != edge.target.strip())
    if graph.number_of_nodes() == 0:
        raise HTTPException(status_code=400, detail="No valid connections were found in the edge list.")
    if graph.number_of_nodes() > 1000:
        raise HTTPException(status_code=413, detail="Uploaded networks are limited to 1,000 unique users for responsive simulation.")
    return graph

app = FastAPI(
    title="Misinformation Spread Simulator",
    description="API for modelling story spread through connected communities and comparing ways to reduce its reach.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"name": "Misinformation Spread Simulator API", "docs": "/docs", "status": "ok"}

@app.get("/api/health")
def health():
    return {"status": "healthy"}

@app.get("/api/strategies")
def strategies():
    return {"strategies": STRATEGIES}

@app.post("/api/graph")
def create_graph(request: SimulationRequest):
    g = graph_from_edges(request.edges) if request.edges else make_graph(request.node_count, request.network_model, request.graph_seed)
    return {"summary": graph_summary(g), "graph": graph_payload(g)}

@app.post("/api/simulate")
def run_simulation(request: SimulationRequest):
    g = graph_from_edges(request.edges) if request.edges else make_graph(request.node_count, request.network_model, request.graph_seed)
    # Accept both generated integer IDs and imported string IDs without coercion errors.
    node_lookup = {str(node): node for node in g.nodes}
    source_node = node_lookup.get(str(request.source), next(iter(g.nodes)))
    results = compare(
        g, source_node, request.probability, request.max_rounds,
        request.budget, request.simulation_seed, request.strategies
    )
    return {
        "network": graph_summary(g),
        "graph": graph_payload(g),
        "source": str(source_node),
        "settings": request.model_dump(exclude={"edges"}),
        "data_source": "uploaded network" if request.edges else "generated network",
        "results": results,
    }

@app.post("/api/graph/edges")
def create_graph_from_edges(request: EdgeListRequest):
    g = graph_from_edges(request.edges)
    return {"summary": graph_summary(g), "graph": graph_payload(g)}

@app.post("/api/dataset/inspect")
async def inspect_dataset(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")
    try:
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="CSV files must be 10 MB or smaller.")
        if not content.strip():
            raise HTTPException(status_code=400, detail="The uploaded CSV is empty.")
        df = pd.read_csv(io.BytesIO(content))
        if df.empty:
            raise HTTPException(status_code=400, detail="The uploaded CSV contains no data rows.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {exc}")
    label_column = next((column for column in df.columns if str(column).strip().lower() in {
        "label", "class", "target", "is_fake", "fake_label", "news_type"
    }), None)
    if label_column is None:
        label = "Article metadata · no explicit label column detected"
    else:
        counts = df[label_column].fillna("Unknown").astype(str).value_counts().head(8)
        label = f"Labels in {label_column}: " + ", ".join(f"{name} ({count})" for name, count in counts.items())
    preview = df.head(100).fillna("").to_dict(orient="records")
    return {
        "filename": file.filename, "records": len(df), "label": label,
        "columns": list(df.columns), "preview": preview,
        "note": "Article metadata is not a complete social graph. Upload a separate source,target edge list to simulate spread through a supplied network."
    }
