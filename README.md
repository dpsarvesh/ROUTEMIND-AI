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

## 🧪 Test Suite & Error Boundaries

**145 tests across 4 test files** — all passing.

```
✓ src/services/aiScoringEngine.test.ts   (58 tests)  — MCDA engine validation
✓ src/data/dataIntegrity.test.ts         (21 tests)  — Route data integrity
✓ src/services/mapRendering.test.ts      (40 tests)  — Map coordinate/rendering
✓ src/services/dataPipeline.test.ts      (26 tests)  — Data acquisition pipeline
```

### Test Categories

| Category | Tests | Validates |
|----------|-------|-----------|
| Weight normalization invariants | 10 | All 5 preference profiles sum to 1.0, no negative weights |
| Attribute normalization | 24 | Per-function boundary tests for N_T, N_C, N_I, N_Q, N_D |
| Score monotonicity | 2 | Faster/shorter routes score ≥ slower/longer (ceteris paribus) |
| Determinism | 1 | 10 identical runs produce identical outputs |
| Preference sensitivity | 1 | Rankings change when preference profile changes |
| Route recommendation | 7 | Always selects highest-scoring candidate |
| Map rendering validity | 40 | Coordinate bounds, polyline continuity, marker extraction |
| Data pipeline | 26 | Road classification, construction detection, hazard merging |
| Data integrity | 21 | Dataset contracts, interpolation, end-to-end pipeline |
| Edge cases | 3 | Zero duration, uniform candidates, large candidate sets |

### Error Boundary Strategy

| Layer | Strategy |
|-------|----------|
| **Scoring Engine** | Division-by-zero guards (`Math.max(1, ...)`), floor clamps (safety ≥ 15, traffic ≥ 10), score clamping [40, 99], empty-input validation |
| **Data Pipeline** | 5-min TTL cache, unknown road type defaults to MDR, deduplication on incident merge |
| **Browser APIs** | `try/catch` on all `localStorage` reads with safe defaults, geolocation permission/timeout handling, Google Maps auth failure callback |
| **Application** | `try/catch/finally` wrapping entire route planning pipeline, dataset fallback when Google Maps fails |

Run tests:
```bash
npm test              # Run once
npm run test:watch    # Watch mode
npx vitest --coverage # Generate coverage report
```

> Full technical testing documentation: [`docs/testing_and_error_boundaries.md`](./docs/testing_and_error_boundaries.md)

---

## 📡 API Endpoints & External Services

RouteMind AI is a **client-side SPA** — no custom backend server. All API calls are made directly from the browser.

### External APIs

| API | Endpoint | Purpose | Required? |
|-----|----------|---------|-----------|
| **Google Maps JS SDK** | `maps.googleapis.com/maps/api/js` | Map rendering, traffic layer | Optional |
| **Google Directions API** | Via JS SDK `DirectionsService` | Live route alternatives with `duration_in_traffic` | Optional |
| **OpenStreetMap Tiles** | `tile.openstreetmap.org/{z}/{x}/{y}.png` | Free map tile rendering (Leaflet fallback) | Default |
| **ArcGIS Satellite** | `server.arcgisonline.com/.../tile/{z}/{y}/{x}` | Satellite imagery toggle | Optional |
| **Browser Geolocation** | `navigator.geolocation` | GPS position for "Use My Location" and active navigation | Optional |

### Internal Service APIs

| Service | Key Methods | Purpose |
|---------|-------------|---------|
| `aiScoringEngine.ts` | `calculateRouteScore()`, `generateAIRecommendation()` | MCDA scoring + NL recommendation |
| `dataPipeline.ts` | `fetchRouteConditions()`, `getPipelineStatus()` | Road condition & hazard analysis |
| `googleMapsService.ts` | `loadGoogleMaps()`, `calculateRealGoogleRoutes()` | Google Maps SDK management |
| `geolocationService.ts` | `getCurrentPosition()`, `startLiveTracking()` | Browser GPS with observer pattern |
| `storageService.ts` | `getSavedPlaces()`, `addTripHistory()`, `getUserPreferences()` | localStorage persistence |

> Full API reference with signatures and response schemas: [`docs/api_endpoints_and_data_schema.md`](./docs/api_endpoints_and_data_schema.md)

---

## 💾 Data Storage Schema (localStorage)

All user data persists in browser `localStorage` under namespaced keys:

| Key | Schema | Max Size | Description |
|-----|--------|----------|-------------|
| `routemind_saved_places` | `SavedPlace[]` | ~50 entries | Favorite locations (home, work, favorites) |
| `routemind_trip_history` | `TripHistoryItem[]` | 30 entries (FIFO) | Recent trip planning history |
| `routemind_user_preferences` | `UserPreferences` | 1 object | App config (travel mode, preference, demo mode) |
| `routemind_google_api_key` | `string` | 1 value | Google Maps API key (plain text) |

> Full schema definitions with JSON examples: [`docs/api_endpoints_and_data_schema.md §4`](./docs/api_endpoints_and_data_schema.md#4-localstorage-database-schema)

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
│   ├── components/                      # React UI components (13 files)
│   │   ├── MapContainer.tsx                 # Leaflet + Google Maps dual renderer
│   │   ├── TripPlannerCard.tsx              # Origin/destination/mode selector
│   │   ├── AIRecommendationCard.tsx         # AI recommendation display
│   │   ├── AIDecisionMatrixModal.tsx        # Interactive MCDA weight tuning
│   │   ├── AIDashboardSummary.tsx           # Dashboard snapshot card
│   │   ├── ActiveNavigationHUD.tsx          # Turn-by-turn navigation overlay
│   │   ├── RouteOptionsList.tsx             # Route candidate cards
│   │   ├── RoadConditionsPanel.tsx          # Road quality + hazard panel
│   │   ├── TrafficAnalysisCard.tsx          # Live traffic analysis display
│   │   ├── Header.tsx                       # Global app header + nav mode toggle
│   │   ├── ApiKeyModal.tsx                  # Google Maps API key input modal
│   │   ├── SavedPlacesModal.tsx             # Saved places management modal
│   │   └── TripHistoryModal.tsx             # Trip history display modal
│   ├── services/                        # Business logic & API services
│   │   ├── aiScoringEngine.ts               # MCDA scoring engine (§§3–4 of spec)
│   │   ├── aiScoringEngine.test.ts          # 58 unit tests
│   │   ├── dataPipeline.ts                  # Three-tier data acquisition (§10)
│   │   ├── dataPipeline.test.ts             # 26 pipeline tests
│   │   ├── mapRendering.test.ts             # 40 map rendering tests
│   │   ├── googleMapsService.ts             # Google Maps JS SDK integration
│   │   ├── geolocationService.ts            # Browser GPS with observer pattern
│   │   └── storageService.ts                # localStorage persistence layer
│   ├── data/                            # Route datasets (Tier 3 data)
│   │   ├── coimbatoreData.ts                # Local routes — 15 locations, 5 scenarios
│   │   ├── interDistrictData.ts             # Regional routes — 8 destinations
│   │   └── dataIntegrity.test.ts            # 21 data validation tests
│   ├── types/
│   │   └── navigation.ts                    # TypeScript type definitions (13 interfaces)
│   ├── App.tsx                              # Main application component
│   ├── main.tsx                             # React DOM entry point
│   └── index.css                            # Global styles
├── docs/                                # Technical documentation
│   ├── ai_scoring_engine_specification.md   # Formal MCDA specification (§§1–10)
│   ├── testing_and_error_boundaries.md      # Unit testing & error boundary guide
│   └── api_endpoints_and_data_schema.md     # API endpoints & localStorage schema
├── .github/workflows/
│   └── deploy.yml                           # CI/CD (test + deploy)
├── vitest.config.ts                         # Test runner configuration
├── vite.config.ts                           # Build tool configuration
├── tsconfig.json                            # TypeScript configuration
├── tailwind.config.js                       # Tailwind CSS configuration
├── package.json                             # Dependencies & scripts
└── README.md                                # This file
```

---

## 📚 Documentation Index

| Document | Location | Contents |
|----------|----------|----------|
| **README** (this file) | `./README.md` | Project overview, getting started, feature summary |
| **AI Scoring Engine Spec** | [`docs/ai_scoring_engine_specification.md`](./docs/ai_scoring_engine_specification.md) | Formal MCDA mathematical specification (§§1–10) |
| **Testing & Error Boundaries** | [`docs/testing_and_error_boundaries.md`](./docs/testing_and_error_boundaries.md) | 145-test breakdown, error boundary patterns, test helpers |
| **API & Data Schema** | [`docs/api_endpoints_and_data_schema.md`](./docs/api_endpoints_and_data_schema.md) | External APIs, service APIs, localStorage schema, data flow diagrams |
| **Inline Code Docs** | All `src/**/*.ts` files | JSDoc comments on all modules, classes, interfaces, and functions |

---

## 🏆 Academic Context

This project demonstrates a practical implementation of:
- **Multi-Criteria Decision Analysis (MCDA)** — Weighted Linear Additive Model with formal mathematical specification
- **Heterogeneous unit normalization** — converting minutes, km, ordinal labels, and event arrays into a common `[0, 100]` scalar space
- **Transparent AI recommendations** — human-readable explanations with full attribute breakdown and confidence scoring
- **Three-tier data acquisition pipeline** — graceful degradation from live APIs to synthetic heuristics with quality decay models
- **Comprehensive test-driven development** — 145 tests validating all mathematical invariants, boundary conditions, and monotonicity properties
- **Error boundary engineering** — defensive programming patterns at every application layer with safe fallbacks
- **Technical documentation** — formal specification, API reference, data schema, and inline code documentation

---

*Built with React 18, TypeScript, Vite, Leaflet, and Google Maps JS Platform.*

