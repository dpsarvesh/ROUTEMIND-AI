# RouteMind AI — API Endpoints & Data Schema Reference

**Document Version:** 1.0  
**Last Updated:** October 2026  
**Application Type:** Client-side SPA (no backend server)

---

## §1 Architecture Overview

RouteMind AI is a **client-side single-page application** — there is no custom backend server. All data flows occur within the browser or via external third-party APIs.

```
┌───────────────────────────────────────────────────────────────┐
│                     Browser Client (SPA)                      │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐    │
│  │ React 18 UI │  │ AI Scoring  │  │ Data Pipeline      │    │
│  │ Components  │  │ Engine      │  │ Service            │    │
│  └──────┬──────┘  └──────┬──────┘  └─────────┬──────────┘    │
│         │                │                    │               │
│  ┌──────┴───────────────┴────────────────────┴──────────┐    │
│  │              Internal Data Layer                      │    │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │    │
│  │  │localStorage│ │ Demo Dataset │  │ Geolocation   │  │    │
│  │  │ (Storage) │  │ (In-Memory)  │  │ (Browser API) │  │    │
│  │  └──────────┘  └──────────────┘  └────────────────┘  │    │
│  └───────────────────────────────────────────────────────┘    │
│                           │                                   │
├───────────────────────────┼───────────────────────────────────┤
│               External API Layer (Optional)                   │
│  ┌──────────────────────┐  ┌────────────────────────────┐    │
│  │ Google Maps Platform │  │ OpenStreetMap / CartoDB    │    │
│  │ (Directions API)     │  │ (Tile Server)             │    │
│  └──────────────────────┘  └────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## §2 External API Endpoints

### §2.1 Google Maps JavaScript SDK

**Service:** `src/services/googleMapsService.ts`  
**Activation:** User provides API key via Settings modal → stored in localStorage  
**Required APIs:** Maps JavaScript API, Directions API, Places API

#### §2.1.1 SDK Script Loading

```
GET https://maps.googleapis.com/maps/api/js
    ?key={API_KEY}
    &libraries=places,geometry

Response: JavaScript SDK bundle (loaded as <script> tag)
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `key` | User-provided | Google Maps API key with Directions + Maps enabled |
| `libraries` | `places,geometry` | Additional SDK modules loaded |

**Error Handling:**
- `script.onerror` → `resolve(false)` (fallback to OpenStreetMap)
- `window.gm_authFailure` → Sets `authFailed = true` (invalid/expired key)

#### §2.1.2 Directions API (via SDK)

```typescript
// Called via Google Maps JavaScript SDK DirectionsService
const request = {
  origin: string | google.maps.LatLng,
  destination: string | google.maps.LatLng,
  travelMode: google.maps.TravelMode.DRIVING,
  provideRouteAlternatives: true,
  drivingOptions: {
    departureTime: new Date(),                        // Current time
    trafficModel: google.maps.TrafficModel.BEST_GUESS // Live traffic estimate
  }
};
```

**Response Processing** (`calculateRealGoogleRoutes()`):

| Google API Field | RouteMind Field | Transformation |
|-----------------|----------------|----------------|
| `leg.distance.value` | `distanceKm` | `value / 1000`, rounded to 1 decimal |
| `leg.duration.value` | `normalDurationMin` | `value / 60`, rounded |
| `leg.duration_in_traffic.value` | `durationMin` | `value / 60`, rounded |
| `durationMin - normalDurationMin` | `trafficDelayMin` | `Math.max(0, diff)` |
| `trafficDelayMin` thresholds | `trafficStatus` | `>15` severe, `>8` heavy, `>3` moderate, else low |
| `route.overview_path` | `coordinates[]` | Array of `{ lat, lng }` from decoded polyline |
| `leg.steps[]` | `steps[]` | HTML stripped, action inferred |
| `route.summary` | `name` | `"Route A — via {summary}"` |

**Error Handling:**
- `status !== 'OK'` → `resolve(null)` → falls back to demo dataset
- No `duration_in_traffic` → uses `duration` as fallback

#### §2.1.3 Traffic Layer

```typescript
// Visual traffic overlay on Google Maps
const trafficLayer = new google.maps.TrafficLayer();
trafficLayer.setMap(map);  // Enable
trafficLayer.setMap(null); // Disable (toggleable via UI button)
```

### §2.2 OpenStreetMap Tile Server (Leaflet Fallback)

**Service:** `src/components/MapContainer.tsx`  
**Activation:** Default when no Google Maps API key is configured (free, no key needed)

#### §2.2.1 Roadmap Tiles

```
GET https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

Subdomains: a, b, c (load balancing)
Max Zoom: 19
Attribution: © OpenStreetMap contributors
```

#### §2.2.2 Satellite Tiles (ArcGIS)

```
GET https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}

Provider: Esri ArcGIS World Imagery
Max Zoom: 19
```

### §2.3 Browser Geolocation API

**Service:** `src/services/geolocationService.ts`  
**Activation:** User clicks "Use My Location" or starts navigation

```typescript
// One-shot position request
navigator.geolocation.getCurrentPosition(successCb, errorCb, {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 15000,
});

// Continuous position watching (during active navigation)
navigator.geolocation.watchPosition(successCb, errorCb, {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
});
```

**Response Mapping:**

| Geolocation API Field | RouteMind Field | Transformation |
|----------------------|----------------|----------------|
| `coords.latitude` | `coords.lat` | Direct |
| `coords.longitude` | `coords.lng` | Direct |
| `coords.accuracy` | `accuracyMeters` | `Math.round(accuracy \|\| 10)` |
| `coords.heading` | `heading` | Direct or `null` |
| `coords.speed` | `speedKmh` | `Math.round(speed * 3.6)` (m/s → km/h) |

**Error Codes:**

| Error Code | RouteMind Status | User Message |
|-----------|-----------------|--------------|
| `PERMISSION_DENIED` | `'denied'` | "Please allow location access in your browser settings." |
| `POSITION_UNAVAILABLE` | `'unavailable'` | "Location information is currently unavailable from your device GPS." |
| `TIMEOUT` | `'unavailable'` | "The request to obtain your location timed out." |

---

## §3 Internal Data APIs (Service Layer)

### §3.1 AI Scoring Engine API

**Module:** `src/services/aiScoringEngine.ts`

#### `calculateRouteScore(route, allCandidates, preference, customWeights?)`

```typescript
function calculateRouteScore(
  route: RouteOption,
  allCandidates: RouteOption[],
  preference: TravelPreference,
  customWeights?: ScoringWeights
): { score: number; breakdown: ScoreBreakdown }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `route` | `RouteOption` | Yes | The route to score |
| `allCandidates` | `RouteOption[]` | Yes | Full candidate set for min-max normalization |
| `preference` | `TravelPreference` | Yes | Active preference profile |
| `customWeights` | `ScoringWeights` | No | Override weights from AI Decision Matrix |

**Returns:** `{ score: number ∈ [40, 99], breakdown: ScoreBreakdown }`

#### `generateAIRecommendation(routes, preference, customWeights?)`

```typescript
function generateAIRecommendation(
  routes: RouteOption[],
  preference: TravelPreference,
  customWeights?: ScoringWeights
): { scoredRoutes: RouteOption[]; recommendation: AIRecommendation }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `routes` | `RouteOption[]` | Yes | Non-empty array of candidates |
| `preference` | `TravelPreference` | Yes | Active preference profile |
| `customWeights` | `ScoringWeights` | No | Override weights from AI Decision Matrix |

**Returns:** `{ scoredRoutes: RouteOption[], recommendation: AIRecommendation }`  
**Throws:** `Error` if `routes` is empty or null

### §3.2 Data Pipeline API

**Module:** `src/services/dataPipeline.ts`

#### `dataPipeline.fetchRouteConditions(route, googleMapsAvailable)`

```typescript
async function fetchRouteConditions(
  route: RouteOption,
  googleMapsAvailable: boolean
): Promise<DataPipelineResult>
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `route` | `RouteOption` | Yes | Route to analyze |
| `googleMapsAvailable` | `boolean` | Yes | Whether Google Maps SDK is loaded |

**Returns:** `DataPipelineResult` containing:
- `roadCondition`: `RoadConditionReport` — quality, surface notes, confidence, timestamp
- `hazards`: `HazardFeed` — merged incident array, coverage level
- `activeTier`: `DataTier` — which data tier provided the result

**Caching:** Results cached for 5 minutes (TTL-based, keyed by `routeId + timeSlot`)

#### `dataPipeline.getPipelineStatus(googleMapsAvailable)`

```typescript
function getPipelineStatus(googleMapsAvailable: boolean): {
  tier: DataTier;
  label: string;
  description: string;
  trafficSource: string;
  roadConditionSource: string;
  hazardSource: string;
}
```

### §3.3 Storage Service API

**Module:** `src/services/storageService.ts`

| Method | Signature | Description |
|--------|-----------|-------------|
| `getSavedPlaces()` | `() → SavedPlace[]` | Returns saved places; seeds defaults on first call |
| `savePlace(place)` | `(Omit<SavedPlace, 'id'>) → SavedPlace` | Adds place with auto-generated ID |
| `deleteSavedPlace(id)` | `(string) → void` | Removes place by ID |
| `getTripHistory()` | `() → TripHistoryItem[]` | Returns trip history (max 30) |
| `addTripHistory(item)` | `(Omit<TripHistoryItem, 'id'\|'timestamp'>) → TripHistoryItem` | Prepends trip, FIFO evicts beyond 30 |
| `clearTripHistory()` | `() → void` | Removes all trip history |
| `getUserPreferences()` | `() → UserPreferences` | Returns prefs with defaults merged |
| `saveUserPreferences(prefs)` | `(Partial<UserPreferences>) → UserPreferences` | Merges partial update |
| `getGoogleApiKey()` | `() → string` | Returns stored API key or `''` |
| `saveGoogleApiKey(key)` | `(string) → void` | Stores key; empty string removes it |

### §3.4 Geolocation Service API

**Module:** `src/services/geolocationService.ts`

| Method | Signature | Description |
|--------|-----------|-------------|
| `getState()` | `() → GeolocationState` | Returns current snapshot (immutable copy) |
| `subscribe(cb)` | `(GeolocationCallback) → () => void` | Registers listener; returns unsubscribe function |
| `getCurrentPosition()` | `() → Promise<LatLng>` | One-shot GPS position request |
| `startLiveTracking()` | `() → void` | Begins continuous GPS watching |
| `stopLiveTracking()` | `() → void` | Stops GPS watch and clears watcher |

### §3.5 Route Data APIs

**Module:** `src/data/coimbatoreData.ts`

```typescript
function getCoimbatoreDemoRoutes(originName: string, destName: string): RouteOption[]
```

**Route Matching:** Case-insensitive substring matching on origin/destination names.  
**Fallback:** Returns generic RS Puram → Singanallur routes if no scenario matches.  
**Scenarios:** Gandhipuram→Airport (3 routes), RS Puram→Singanallur (2 routes)

**Module:** `src/data/interDistrictData.ts`

```typescript
function getInterDistrictDemoRoutes(originName: string, destName: string): RouteOption[]
```

**Destinations:** Chennai, Ooty, Bengaluru, Madurai, Salem, Tiruppur, Erode  
**Fallback:** Returns Coimbatore→Salem routes for unknown destinations.

---

## §4 localStorage Database Schema

RouteMind AI uses browser `localStorage` as its persistence layer. All data is stored as JSON strings under namespaced keys.

### §4.1 Schema Overview

| Key | Type | Max Size | Description |
|-----|------|----------|-------------|
| `routemind_saved_places` | `SavedPlace[]` | ~50 entries | User's favorite locations |
| `routemind_trip_history` | `TripHistoryItem[]` | 30 entries (FIFO) | Recent trip planning history |
| `routemind_user_preferences` | `UserPreferences` | 1 object | App configuration |
| `routemind_google_api_key` | `string` | 1 value | Google Maps API key (plain text) |

### §4.2 Saved Places Schema

```json
// Key: routemind_saved_places
// Type: SavedPlace[]
[
  {
    "id": "sp-1",                           // Unique ID (sp-{timestamp})
    "title": "Home",                        // Display name
    "category": "home",                     // home | work | college | favorite
    "address": "RS Puram, DB Road, Coimbatore",  // Full address
    "lat": 11.0094,                         // WGS-84 latitude
    "lng": 76.9463                          // WGS-84 longitude
  }
]
```

**Default seed data (3 entries):**

| ID | Title | Category | Address |
|----|-------|----------|---------|
| `sp-1` | Home | `home` | RS Puram, DB Road, Coimbatore |
| `sp-2` | Work / College (PSG Tech) | `college` | Avinashi Road, Peelamedu, Coimbatore |
| `sp-3` | Airport Terminal | `favorite` | Civil Aerodrome Post, Coimbatore |

### §4.3 Trip History Schema

```json
// Key: routemind_trip_history
// Type: TripHistoryItem[]
// Max entries: 30 (FIFO eviction on overflow)
// Sort order: Most recent first (unshift)
[
  {
    "id": "trip-1698300000000",             // Unique ID (trip-{timestamp})
    "timestamp": 1698300000000,             // Unix timestamp (ms)
    "fromName": "Gandhipuram Central Bus Stand",
    "toName": "Coimbatore International Airport (CJB)",
    "mode": "local",                        // local | inter-district
    "travelMode": "car",                    // car | bike | walking | transit
    "distanceKm": 12.4,                     // Route distance
    "durationMin": 24,                      // Estimated travel time
    "selectedRouteName": "Route B — via Sathy Road",
    "aiScore": 94                           // AI composite score
  }
]
```

### §4.4 User Preferences Schema

```json
// Key: routemind_user_preferences
// Type: UserPreferences
// Partial updates supported (spread merge with defaults)
{
  "userName": "Traveler",                   // Display name
  "defaultTravelMode": "car",              // car | bike | walking | transit
  "defaultPreference": "balanced",          // fastest | safest | shortest | balanced | fuel
  "demoModeEnabled": true                   // Show demo incident overlays
}
```

**Default values (applied when key is absent or fields are missing):**

| Field | Default | Description |
|-------|---------|-------------|
| `userName` | `"Traveler"` | Greeting display name |
| `defaultTravelMode` | `"car"` | Pre-selected travel mode |
| `defaultPreference` | `"balanced"` | Pre-selected AI preference |
| `demoModeEnabled` | `true` | Demo mode active by default |

### §4.5 Google API Key Schema

```
// Key: routemind_google_api_key
// Type: Plain string (not JSON)
// Value: Google Maps Platform API key or empty string
"AIzaSy..."
```

**Security note:** The API key is stored in plain text in localStorage. Users should configure API key restrictions (HTTP referrer restriction) in the Google Cloud Console to prevent unauthorized use.

---

## §5 Data Flow Diagrams

### §5.1 Route Planning Flow

```
User clicks "Plan Route"
        │
        ▼
    planRoute()  [App.tsx]
        │
        ├─── Google Maps available?
        │         │
        │    YES  ▼
        │    googleMapsService.calculateRealGoogleRoutes()
        │         │
        │    routes returned?
        │    YES → use Google routes
        │    NO  ↓
        │         │
        │    NO   ▼
        ├──── navMode === 'local'?
        │         │
        │    YES  ▼
        │    getCoimbatoreDemoRoutes(origin, dest)
        │         │
        │    NO   ▼
        │    getInterDistrictDemoRoutes(origin, dest)
        │         │
        ▼         ▼
    generateAIRecommendation(routes, preference, weights)
        │
        ├─── setCandidateRoutes(scoredRoutes)
        ├─── setSelectedRouteId(recommendation.recommendedRouteId)
        ├─── setAiRecommendation(recommendation)
        └─── storageService.addTripHistory(...)
```

### §5.2 AI Scoring Flow

```
generateAIRecommendation(routes, preference)
        │
        ▼
    for each route in routes:
        calculateRouteScore(route, routes, preference)
            │
            ├── N_T(r)  ← durationMin (min-max normalized)
            ├── N_C(r)  ← trafficStatus + delayRatio
            ├── N_I(r)  ← warnings[] (additive penalties)
            ├── N_Q(r)  ← roadQuality (ordinal map)
            ├── N_D(r)  ← distanceKm (min-max normalized)
            │
            ▼
        composite = Σ(w_i × N_i)
        score = clamp(round(composite), 40, 99)
        │
        ▼
    sort by score descending
    r* = routes[0]  (best)
    r' = routes[1]  (runner-up)
        │
        ▼
    generate headline, reasons, tradeoffs, confidence
        │
        ▼
    return { scoredRoutes, recommendation }
```

---

*End of API and schema documentation. See individual service files for implementation details.*
