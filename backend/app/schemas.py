from typing import Literal, Optional
from pydantic import BaseModel, Field

Strategy = Literal[
    "No action",
    "Random protection",
    "Most connected users",
    "Spread hotspots",
    "Fact-check key connectors",
]

class Edge(BaseModel):
    source: str = Field(min_length=1, max_length=256)
    target: str = Field(min_length=1, max_length=256)

class SimulationRequest(BaseModel):
    node_count: int = Field(default=150, ge=30, le=1000)
    network_model: Literal["Small-world", "Scale-free", "Random"] = "Small-world"
    graph_seed: int = Field(default=42, ge=0, le=2_147_483_647)
    source: Optional[str] = None
    probability: float = Field(default=0.18, ge=0.0, le=1.0)
    max_rounds: int = Field(default=12, ge=1, le=50)
    budget: int = Field(default=8, ge=0, le=100)
    simulation_seed: int = Field(default=42, ge=0, le=2_147_483_647)
    edges: Optional[list[Edge]] = Field(default=None, max_length=50000)
    strategies: list[Strategy] = Field(default=[
        "No action",
        "Random protection",
        "Most connected users",
        "Spread hotspots",
        "Fact-check key connectors",
    ], min_length=1)

class EdgeListRequest(BaseModel):
    edges: list[Edge] = Field(min_length=1, max_length=50000)
