# How to Run — Anticipatory Commerce Agent (Version 2)

This guide walks you through running the Anticipatory E-Commerce Agent, including the **FastAPI Backend Server**, the **React 19 / Vite Frontend**, and the **Benchmark Evaluation Suite**.

---

## 1. Quick Start (Both Servers Running)

The application consists of two communicating services:
- **Backend API (FastAPI + Uvicorn):** `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
- **Frontend App (React + Vite):** `http://localhost:5173`

---

## 2. Prerequisites

- **Python**: Version 3.10+ (tested with Python 3.14 on Windows)
  - Required packages: `fastapi`, `uvicorn`, `pydantic`
  - *(Optional for ML model benchmarks: `numpy`, `scipy`, `scikit-learn`)*
- **Node.js**: Version 18+ and `npm`

---

## 3. Starting the Backend Server

Open a terminal (PowerShell or Bash) and run:

### Windows (PowerShell):
```powershell
cd "D:\#BOMBAY\V-2\E-Commerce-Agent"
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Linux / macOS:
```bash
cd V-2/E-Commerce-Agent
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

The terminal will confirm:
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 4. Starting the Frontend UI

Open a second terminal window and run:

### Windows (PowerShell):
```powershell
cd "D:\#BOMBAY\V-2\E-Commerce-Agent\frontend"
npm run build
npm run start
```

### Linux / macOS:
```bash
cd V-2/E-Commerce-Agent/frontend
npm run build
npm run start
```

> **Note on `#` in folder paths:** Because the directory path contains the `#` character (`D:\#BOMBAY`), running `npm run build && npm run start` (which serves the compiled bundle via `vite preview --port 5173 --host`) avoids Vite dev server URI fragment errors.

Once started, open your browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 5. How to Test the Frontend Features

1. **Word-by-Word Live Streaming:**
   - Type in the input box at the bottom.
   - As soon as you hit **Space**, the completed word disappears from the input box, pops up into the typographic transcript above, and streams instantly to the agent.
2. **Live Voice Input:**
   - Click the **Microphone** button (`🎙️`) next to the input box.
   - Speak your query (e.g. *"denim jacket extra small black"*). Words stream in real-time as you speak.
3. **Descriptor Vibes & Style Badges:**
   - Notice how material and style keywords like `denim` receive a distinctive purple **Style / Vibe** badge in the transcript and show up under `Descriptor Vibes`.
   - Category (`jackets`), Size (`XS`), and Colour (`black`) receive dedicated editorial colored pills in "WHAT I UNDERSTOOD".
4. **Anticipatory Early Commit:**
   - As you provide constraints, watch the **Confidence Meter** and **Commit Timeline**.
   - As soon as the constraints uniquely identify the winning product (e.g. at word 4 `small`), the agent triggers an **Early Commit** (`⚡ Locked at word 4 of 5`) with 100% confidence, saving search budget!
5. **Sample Queries & Replay:**
   - Click any sample chip at the top left (`Hinglish`, `correction`, `late constraint`, `plain accumulation`) to watch the agent stream.
   - Click **Replay** (`RotateCcw` icon) to watch the last query re-stream word by word at your chosen speed slider.

---

## 6. Running the Benchmark Evaluation (`evaluate.py`)

To evaluate the agent on the official 300-query benchmark dataset (`data/dev.jsonl`):

```powershell
cd "D:\#BOMBAY\V-2\E-Commerce-Agent"
python evaluate.py --agent agent/agent.py
```

### Expected Output:
```
agent               agent/agent.py
requests            300   (dev.jsonl)
accuracy            1.000   (baseline 0.527)
wrong commits       0 in 0 requests
earliness           0.51 words before the end (3.7% of the request)
searches/request    1.00   (wasted 0.00)
latency             0.22 ms/word, p95 0.57 ms
SCORE               42.2   (baseline 20.0)

by tag              n    accuracy  wrong  earliness  score
  code_mixed          25    1.000      0      3.3%    41.9
  correction          55    1.000      0      2.9%    41.7
  late_constraint     50    1.000      0      2.8%    41.7
  plain              177    1.000      0      4.2%    42.5

filters you reported at the last word, vs the gold ones (300 requests):
  category 1.00  colour 1.00  size 1.00  brand 1.00  max_price 1.00
```

---

## 7. Troubleshooting & Stopping Servers

### If Port 8000 or 5173 is already in use:
In Windows PowerShell:
```powershell
# Check what process is using port 8000 or 5173
Get-NetTCPConnection -LocalPort 8000, 5173 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess

# Stop process by PID (e.g. replace 12345 with the OwningProcess ID)
Stop-Process -Id 12345 -Force
```

### Stopping the Servers:
- In the terminal where the server is running, press `Ctrl + C`.
