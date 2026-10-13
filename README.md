# RouteMind AI — Intelligent Navigation Assistant

[![Tests](https://img.shields.io/badge/tests-145%20passing-brightgreen)](./src/services)
[![Netlify](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7)](https://routemind-ai-nav.netlify.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Test%20Runner-Vitest-6E9F18)](https://vitest.dev/)

An intelligent personal navigation assistant that analyzes live traffic congestion, road conditions, construction bottlenecks, and multi-factor safety criteria to recommend the optimal route using a formal Multi-Criteria Decision Analysis (MCDA) engine.

---

## 🚀 Live Demo

**[https://routemind-ai-nav.netlify.app/](https://routemind-ai-nav.netlify.app/)**

---

## ✨ Feature Set

### Navigation Intelligence
- **Coimbatore Local Navigation** — Real-time corridor routing across 15+ locations (Gandhipuram, RS Puram, Peelamedu, Singanallur, Saravanampatti, Airport, Railway Station, etc.)
- **Inter-District Travel** — Regional routing across Tamil Nadu expressways (Coimbatore → Chennai, Salem, Erode, Tiruppur, Ooty, Madurai, Bengaluru)
- **5 AI Preference Profiles** — ⚡ Fastest, 🛡 Safest, 📏 Shortest, ⚖ Balanced, ⛽ Fuel Efficient

### AI Scoring Engine
- **Formal MCDA Scoring** — Weighted Linear Additive Model (WLAM) across 5 heterogeneous attributes
- **Transparent Scoring** — Full breakdown: Travel Time, Traffic Congestion, Safety Risk, Road Quality, Distance
- **Interactive AI Matrix** — Tunable weight sliders with live score recomputation
- **Natural Language Explanations** — Human-readable recommendation rationale

### Live Features
- **GPS Location Tracking** — Real browser geolocation with accuracy circle, heading, speed
- **Active Navigation HUD** — Turn-by-turn maneuvers, dynamic arrival ETA, live re-routing alerts
- **Google Maps Integration** — Live traffic via Directions API when API key is provided
- **OpenStreetMap Fallback** — Full-featured CartoDB vector map rendering at zero cost

### Data & Architecture
- **Three-Tier Data Pipeline** — Google Maps API → Municipal APIs → Synthetic Heuristics
- **Hazard Feed Simulation** — Construction zones (NHAI/TNRDC), time-of-day patterns, crowd-sourced incident injection
- **Trip History & Saved Places** — Persistent local storage

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5.7, Vite 6 |
| Styling | Tailwind CSS 3, Lucide Icons |
| Mapping | Google Maps JS Platform SDK + Leaflet + CartoDB tiles |
| Decision Engine | Custom MCDA (Weighted Linear Additive Model) in TypeScript |
| Testing | Vitest 5 — 145 tests across 4 test files |
| Storage | Browser `localStorage` for preferences, history, saved places |
| CI/CD | GitHub Actions → GitHub Pages / Netlify |

---

## 🧮 AI Scoring Engine — Mathematical Specification

The scoring engine normalizes heterogeneous units into a common `[0, 100]` scalar space, then applies weighted aggregation.

### Attribute Normalization

**Travel Time** (minutes → score):
```
N_T(r) = 100 - ((t_r - T_min) / (T_max - T_min)) × 40     [range: 60–100]
N_T(r) = 95   if all routes have equal duration (degenerate)
```

**Traffic Congestion** (enum + delay ratio → score):
```
δ_r = trafficDelayMin / max(1, normalDurationMin)

low    → 98 - min(10, δ×20)    [88–98]
moderate → 82 - min(20, δ×40)  [62–82]
heavy  → 55 - min(25, δ×50)    [30–55]
severe → 25 - min(20, δ×60)    [5–25]
N_C(r) = clamp(result, 10, 100)
```

**Safety / Incidents** (incident array → score):
```
N_I(r) = clamp(100 - Σ penalty(warning.type), 15, 100)

block: -35  |  accident: -25  |  weather: -20  |  construction: -15  |  traffic: -10
```

**Road Surface Quality** (ordinal enum → score):
```
excellent→98  |  good→88  |  moderate→68  |  poor→40
```

**Distance** (km → score):
```
N_D(r) = 100 - ((d_r - D_min) / (D_max - D_min)) × 35     [clamped to 20–100]
```

### Weighted Composite Formula

```
S(r, P) = clamp(round(
    w_T · N_T(r) + w_C · N_C(r) + w_I · N_I(r) + w_Q · N_Q(r) + w_D · N_D(r)
), 40, 99)
```

### Preference Weight Profiles

| Profile | w_T | w_C | w_I | w_Q | w_D |
|---|---|---|---|---|---|
| fastest | 0.45 | 0.30 | 0.10 | 0.05 | 0.10 |
| safest | 0.15 | 0.15 | 0.45 | 0.20 | 0.05 |
| shortest | 0.15 | 0.10 | 0.10 | 0.05 | 0.60 |
| balanced | 0.25 | 0.25 | 0.25 | 0.15 | 0.10 |
| fuel | 0.15 | 0.35 | 0.10 | 0.15 | 0.25 |

> Full formal specification: [`docs/ai_scoring_engine_specification.md`](./docs/ai_scoring_engine_specification.md)

---

## 📡 Data Acquisition Pipeline

RouteMind AI uses a **three-tier data pipeline** for road conditions and hazard warnings:

### Tier 1 — Google Maps Platform (Primary)
- **Source**: `maps.googleapis.com/maps/api/directions` with `trafficModel=BEST_GUESS`
- **Data**: `duration_in_traffic`, route alternatives, congestion status
- **Activation**: Requires user-provided Google Maps API key

### Tier 2 — Municipal Open APIs (Simulated)
- **Reference Sources**: Tamil Nadu Urban Local Body Open Data Portal, NHAI project feeds, TNRDC construction database
- **Data**: Construction zone alerts, road closure notifications
- **Current**: Curated heuristics from real project data embedded in route datasets

### Tier 3 — Synthetic Heuristics (Fallback)
- **Road quality classification**: Based on road type (NH, SH, bypass, arterial, ghat) derived from OpenStreetMap highway tags
- **Traffic patterns**: IST time-of-day models (08:00-10:00, 17:30-20:00 peak hours)
- **Hazard injection**: Known construction zones (Avinashi Elevated Corridor, NH 44 four-laning) + weather advisories (Coonoor mist)

> Full pipeline specification: [`docs/ai_scoring_engine_specification.md §10`](./docs/ai_scoring_engine_specification.md#10-data-acquisition-pipeline)

---

## 🧪 Test Suite

**145 tests across 4 test files** — all passing.

```
✓ src/services/aiScoringEngine.test.ts   (58 tests)  — MCDA engine validation
✓ src/data/dataIntegrity.test.ts         (21 tests)  — Route data integrity
✓ src/services/mapRendering.test.ts      (40 tests)  — Map coordinate/rendering
✓ src/services/dataPipeline.test.ts      (26 tests)  — Data acquisition pipeline
```

Test categories:
- **Weight normalization invariants** — all preference profiles sum to 1.0
- **Attribute normalization correctness** — per-function boundary tests
- **Score monotonicity** — faster/shorter routes score higher ceteris paribus
- **Determinism** — identical inputs produce identical outputs
- **Route recommendation** — always selects highest-scoring candidate
- **Map rendering validity** — coordinate bounds, polyline continuity, marker extraction
- **Data pipeline** — road type classification, construction zone detection, hazard feed merging

Run tests:
```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ and npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Optional — Google Maps API Key
For live traffic data, click **Settings (⚙)** in the header and enter your Google Maps JavaScript API key (with Directions + Maps enabled). The app works fully without it using the built-in fallback.

### 4. Run Tests
```bash
npm test
```

### 5. Production Build
```bash
npm run build
```
Output in `./dist/` — deploy to GitHub Pages, Netlify, or Vercel.

---

## 🌐 Deployment

### GitHub Pages

1. Fork / clone this repository
2. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: RouteMind AI"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/routemind-ai.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → GitHub Actions** to enable Pages
4. The CI/CD workflow will automatically test and deploy on every push to `main`

### Netlify (Current)
- Connect your GitHub repository to Netlify
- Build command: `npm run build`
- Publish directory: `dist`

---

## 📁 Project Structure

```
routemind-ai/
├── src/
│   ├── components/          # React UI components
│   │   ├── MapContainer.tsx         # Leaflet + Google Maps dual renderer
│   │   ├── TripPlannerCard.tsx      # Origin/destination/mode selector
│   │   ├── AIRecommendationCard.tsx # AI recommendation display
│   │   ├── AIDecisionMatrixModal.tsx # Interactive weight tuning
│   │   ├── ActiveNavigationHUD.tsx  # Turn-by-turn overlay
│   │   ├── RouteOptionsList.tsx     # Route candidate cards
│   │   ├── RoadConditionsPanel.tsx  # Road quality + hazard panel
│   │   └── ...
│   ├── services/
│   │   ├── aiScoringEngine.ts       # MCDA scoring + recommendation
│   │   ├── aiScoringEngine.test.ts  # 58 unit tests
│   │   ├── dataPipeline.ts          # Three-tier data acquisition
│   │   ├── dataPipeline.test.ts     # 26 pipeline tests
│   │   ├── mapRendering.test.ts     # 40 map rendering tests
│   │   ├── googleMapsService.ts     # Google Maps JS SDK integration
│   │   ├── geolocationService.ts    # Browser GPS service
│   │   └── storageService.ts        # localStorage persistence
│   ├── data/
│   │   ├── coimbatoreData.ts        # Local route dataset (Coimbatore)
│   │   ├── interDistrictData.ts     # Inter-district route dataset
│   │   └── dataIntegrity.test.ts    # 21 data validation tests
│   ├── types/
│   │   └── navigation.ts            # TypeScript type definitions
│   └── App.tsx                      # Main application component
├── docs/
│   └── ai_scoring_engine_specification.md  # Formal MCDA specification
├── .github/workflows/
│   └── deploy.yml                   # CI/CD (test + deploy)
└── README.md
```

---

## 🏆 Academic Context

This project demonstrates a practical implementation of:
- **Multi-Criteria Decision Analysis (MCDA)** — Weighted Linear Additive Model
- **Heterogeneous unit normalization** — converting minutes, km, ordinal labels, and event arrays into a common `[0, 100]` scalar space
- **Transparent AI recommendations** — human-readable explanations with full attribute breakdown
- **Three-tier data acquisition pipeline** — graceful degradation from live APIs to synthetic heuristics
- **Comprehensive test-driven development** — 145 tests validating all mathematical invariants

---

*Built with React 18, TypeScript, Vite, Leaflet, and Google Maps JS Platform.*
