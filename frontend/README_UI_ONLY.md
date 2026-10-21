# Misinformation Spread Simulator — UI Only

This is a frontend-only React/Vite demo. It does not require the FastAPI backend.

## Run locally

1. Install Node.js (LTS).
2. Open a terminal in this `frontend` folder.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite (usually http://localhost:5173).

## Included UI features

- Responsive dashboard and mobile navigation
- Interactive 3D social-network explorer
- Local demonstration simulation with configurable probability, rounds, budget, and strategies
- Algorithm explanation page
- Exposure-over-time and strategy comparison charts
- CSV export of displayed simulation results
- Local CSV network upload (`source,target`) and metadata inspection

**Note:** The local simulation uses illustrative demo calculations, not a validated epidemiological or misinformation-spread model. CSV metadata inspection is performed in the browser only.
