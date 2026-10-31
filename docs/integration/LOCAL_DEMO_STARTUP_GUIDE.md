# BRIGHTLOOP — LOCAL DEMO STARTUP & INTEGRATION GUIDE

**Event:** ODDO National-Level Hackathon 2026  
**Repository:** `sanjuskb/odoo-national-hackathon-2026`  
**Target Branch:** `feature/sanju-integration`  
**Generated At:** 2026-10-31 15:35 IST  

---

## 1. Quick Startup Commands

To run the local hackathon demo, open separate terminal windows for each service:

### Service A: Python Grounded AI & Showcase Service
- **Directory:** Repository Root (`d:\odoo-national-hackathon-2026`)
- **Port:** `8000`
- **Command:**
  ```bash
  python -m uvicorn ai.src.integrations.ai_service:app --host 127.0.0.1 --port 8000
  ```
- **Health-Check URL:** `http://127.0.0.1:8000/health`
- **Interactive Evaluator UI:** `http://127.0.0.1:8000/demo`
- **Provider Status:**
  - Google Gemini: **LIVE** (`gemini-3.5-flash-lite`)
  - Murf Text-to-Speech: **LIVE** (`en-US-marcus`)
  - Twilio Telephony: **LIVE** (`dry_run = True` safety mode)

---

### Service B: Express Node.js Backend API
- **Directory:** `d:\odoo-national-hackathon-2026\backend`
- **Port:** `5000`
- **Prerequisite:** Dependencies must be installed (`npm install` inside `backend`).
- **Command (Test/Emulated Mode):**
  ```bash
  cmd /c "set NODE_ENV=test&& set PORT=5000&& node src/server.js"
  ```
- **Command (Live Supabase Mode — requires active keys):**
  ```bash
  node src/server.js
  ```
- **Health-Check URL:** `http://127.0.0.1:5000/api/v1/health`
- **Billing Runner URL:** `POST http://127.0.0.1:5000/api/v1/billing/run` (Requires Bearer token with `admin` role)

---

### Service C: React / Vite Frontend
- **Directory:** `d:\odoo-national-hackathon-2026\frontend`
- **Port:** `5173` (Standard Vite port)
- **Status:** **BLOCKED / ABSENT**
- **Note:** The `frontend/` directory currently contains only `.gitkeep`. Ravi has not committed any React/Vite/TSX source code to either `feature/ravi-frontend` or `develop`.
- **Hackathon Workaround:** Evaluators should use the interactive showcase UI at `http://127.0.0.1:8000/demo` and the automated console showcase script `python -m ai.scripts.demo_ai_showcase`.

---

## 2. Port & Network Configuration Matrix

| Service | Host | Port | Health Check | CORS Allowed |
| :--- | :--- | :--- | :--- | :--- |
| **Express Backend** | `127.0.0.1` | `5000` | `GET /api/v1/health` | `http://localhost:5173`, `http://127.0.0.1:8000` |
| **Python AI Service**| `127.0.0.1` | `8000` | `GET /health` | Unrestricted (Demo UI embedded) |
| **React Frontend** | `127.0.0.1` | `5173` | N/A (Code absent) | Targets `http://localhost:5000/api/v1` |

No port conflicts exist between the services.

---

## 3. Step-by-Step Evaluator Demo Runbook

### Step 1: Automated 5-Step AI Showcase
Run the end-to-end integration scenario verifying intent routing, renewal lookup, grounded invoice explanation, Murf audio synthesis, and cross-customer security:
```bash
python -m ai.scripts.demo_ai_showcase
```

### Step 2: Canonical Billing Engine Acceptance Suite
Run the 18 deterministic billing acceptance tests proving multi-period recurrence, anchor preservation, leap-year handling, and duplicate invoice protection:
```bash
node --test billing/tests/*.test.cjs
```

### Step 3: Backend Route & Auth Suite
Run the 31 vitest integration tests verifying health routes, billing routes, and authentication middleware:
```bash
cd backend && npm test
```

### Step 4: Interactive Browser Demo
Open your browser to:
`http://127.0.0.1:8000/demo`
1. Interact with the **Customer Chatbot** (ask: *"When is my next renewal?"*).
2. Click **Explain Invoice** to view the grounded Gemini breakdown of invoice `INV-2026-0001`.
3. Click **Play Welcome Audio** to stream and listen to the real 988 KB MP3 audio synthesized by Murf TTS.
