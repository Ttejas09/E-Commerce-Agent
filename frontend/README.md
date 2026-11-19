# Anticipatory Commerce — Storefront Frontend

A calm, warm editorial web interface for the Anticipatory Commerce Agent (Person B). As a shopper speaks or types a shopping request, the agent understands it word-by-word, surfaces extracted filters, displays live confidence progression, and decisively locks in a commit the moment confidence crosses the 94% calibrated threshold.

---

## 🛠️ Stack

- **React 19** + **Vite 6/8** + **TypeScript**
- **Tailwind CSS v4** with design tokens mapped to CSS custom properties
- **Motion (`framer-motion`)** for spring physics, pop-in filters, and flourish animations
- **Lucide React** for clean, understated interface icons
- **Web Speech API** (`lang: en-IN`) with interim speech recognition and fallback

---

## 🚀 Running the Frontend

### 1. Production Preview Server (Recommended for instant viewing)

```bash
cd frontend
npm run build
npm run preview
```

Open `http://localhost:5173` (or the port Vite outputs) in your browser.

### 2. Live Development Server (Hot Module Reloading)

If your folder path has a `#` symbol (e.g. `D:\#BOMBAY`), Windows path resolution can intercept Vite's dev server URLs. You can create a clean virtual drive alias using Windows `subst`:

```powershell
subst X: "D:\#BOMBAY\E-Commerce-Agent"
cd X:\frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🎭 Offline Mock Mode

The app includes a fully functional, self-contained offline simulator (`src/lib/mock.ts`) that matches the catalogue products and exact test cases from `dev.jsonl`:
- **Correction case**: `"show me black no wait white sneakers size 8 under 3000"` (reversal from black to white with ghost chips)
- **Hinglish case**: `"mujhe Loomsy green casual shoes size eight chahiye please"` (Hindi articles, number words, boundary cues)
- **Late constraint case**: `"show me Sonquil headphones under 7500, also, in blue for my brother"`
- **Plain accumulation case**: Spelled-out numbers (`"forty five hundred"`) and multiple filters

Toggle Mock mode anytime using the **Mock mode** checkbox in the top-right utility header.

---

## ⚙️ Environment Variables

Create a `.env` file in `frontend/`:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of Person A's FastAPI server (no `/api` prefix) | `http://localhost:8000` |
| `VITE_USE_MOCK` | Start with Mock mode enabled by default (`true` or `false`) | `true` |

---

## 📐 Layout Architecture

- **Left Zone ("The Request")**: Large editorial typographic transcript (Fraunces serif 28–32px), hand-drawn SVG squiggle under active word, strikethrough + "changed" badge on superseded words, voice mic, pace slider (150–700ms), and sample request pills.
- **Middle Zone ("What I understood")**: Filter chips with spring pop-in, provenance tooltips, ghost chips for replaced attributes, dotted empty placeholders, confidence meter with a 94% commit line, and search budget pips.
- **Right Zone ("The Pick")**: Real product color tiles with custom handcrafted SVG category silhouettes for all 16 catalogue categories, green "COMMITTED" stamp on lock-in, and side-by-side "Revised after your last words" comparison if the final selection differs.
