# SignalScope — Misinformation Spread Simulator

A responsive full-stack research project that models how a story can travel through a connected social network and compares practical ways to reduce its reach. The interface uses plain-language labels; technical algorithm details are kept out of the main dashboard.

## What it does
- Builds a sample social network or accepts a user-connection CSV.
- Animates the network in an interactive 3D view with hover details.
- Simulates spread in rounds using a configurable chance of passing the story.
- Compares no action, random protection, protection of highly connected users, local spread-hotspot protection, and fact-checking key connectors.
- Shows reach over time, final exposure, targeted users, reduction against the no-action run, and calculation time.
- Exports experiment results to CSV.
- Inspects FakeNewsNet article metadata separately from the network used for simulation.
- Provides API validation, health checks, responsive light-theme UI, and explanatory tooltips.

## Important data note
FakeNewsNet includes article and engagement metadata; it does not by itself provide a complete user-to-user social graph. To simulate spread on your own network, upload a CSV with `source,target` columns. For example:

```csv
source,target
user_1,user_2
user_2,user_3
user_1,user_4
```

Network uploads are limited to 1,000 unique users to keep interactive simulation responsive. Article metadata upload is for inspection and does not automatically become a network. The built-in graph is synthetic; results are illustrative and not predictions about real-world users. “Exposed” means the simulated story reached a user, not that they believed it.

## Technology
- Frontend: React, TypeScript, Vite, Recharts, Three.js via React Three Fiber, Drei, Lucide icons
- Backend: Python, FastAPI, Pydantic, NetworkX, Pandas

## Run locally on Windows
Install Python 3.10+ and Node.js LTS. Run the backend and frontend in separate VS Code terminals.

### 1. Backend
From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal, then activate again. API docs: http://127.0.0.1:8000/docs

### 2. Frontend
Open a second terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

If PowerShell blocks `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev`. Open the URL printed by Vite, usually http://localhost:5173.

The frontend uses `http://localhost:8000` by default. To change it, create `frontend/.env` from `.env.example` and set `VITE_API_URL`.

## Backend smoke tests
From the `backend` directory, run:

```powershell
python -m unittest discover -s tests
```

## Main API endpoints
- `GET /api/health` — service health
- `GET /api/strategies` — available comparison approaches
- `POST /api/graph` — generate or summarize a network
- `POST /api/graph/edges` — inspect an edge-list network
- `POST /api/simulate` — run spread simulations and compare approaches
- `POST /api/dataset/inspect` — inspect an article metadata CSV (up to 10 MB)

## Interpretation
All approaches share the same graph and configured simulation seed for reproducible experiments. Random transmission means one run is an illustrative outcome; for research conclusions, repeat with several seeds and report average results.
