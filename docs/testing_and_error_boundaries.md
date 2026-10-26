# RouteMind AI — Unit Testing & Error Boundary Technical Documentation

**Document Version:** 1.0  
**Last Updated:** October 2026  
**Test Framework:** Vitest 5 with jsdom environment  
**Total Tests:** 145 across 4 test suites

---

## §1 Testing Architecture Overview

RouteMind AI employs a **layered testing architecture** that validates the application from mathematical invariants at the core, through data pipeline correctness, to map rendering output integrity.

```
┌───────────────────────────────────────────────────────┐
│                    Test Pyramid                        │
├───────────────────────────────────────────────────────┤
│  Layer 4: Integration Tests                           │
│    └── End-to-end data → scoring → map output         │
│  Layer 3: Map Rendering Tests (40 tests)              │
│    └── Coordinate validity, polyline continuity        │
│  Layer 2: Data Pipeline Tests (26 tests)              │
│    └── Road classification, hazard detection           │
│  Layer 1: Scoring Engine Unit Tests (58 tests)        │
│    └── Normalization, weights, invariants              │
│  Layer 0: Data Integrity Tests (21 tests)             │
│    └── Dataset contract, coordinate bounds             │
└───────────────────────────────────────────────────────┘
```

### §1.1 Test Configuration

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,              // Enable global describe/it/expect
    environment: 'jsdom',       // DOM simulation for component tests
    setupFiles: [],             // No global setup (tests are self-contained)
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**', 'src/data/**'],  // Coverage for logic layers
    },
  },
});
```

### §1.2 Running Tests

```bash
npm test              # Run all 145 tests once (CI mode)
npm run test:watch    # Watch mode for development
npx vitest --coverage # Generate coverage report
```

---

## §2 Test Suite Inventory

| File | Tests | Layer | Purpose |
|------|-------|-------|---------|
| `src/services/aiScoringEngine.test.ts` | 58 | Scoring Engine | MCDA normalization, weight invariants, monotonicity, determinism, recommendation generation |
| `src/services/dataPipeline.test.ts` | 26 | Data Pipeline | Road type classification, construction zone detection, hazard feed merging, tier selection |
| `src/services/mapRendering.test.ts` | 40 | Map Rendering | Coordinate validity, polyline continuity, geographic bounds, score output consistency |
| `src/data/dataIntegrity.test.ts` | 21 | Data Integrity | Route dataset contracts, preset validation, interpolation correctness, end-to-end pipeline |

---

## §3 AI Scoring Engine Tests — Detailed Breakdown

**File:** `src/services/aiScoringEngine.test.ts`  
**Subject Under Test:** `calculateRouteScore()`, `generateAIRecommendation()`, `PREFERENCE_WEIGHTS`

### §3.1 Weight Normalization Invariant Tests (10 tests)

These tests verify the foundational mathematical constraint that all preference weight profiles sum to exactly 1.0 with no negative weights.

| Test | Assertion | Reference |
|------|-----------|-----------|
| `"fastest" weights sum to exactly 1.0` | `sum ≈ 1.0` (10 decimal precision) | §9.2 |
| `"safest" weights sum to exactly 1.0` | `sum ≈ 1.0` | §9.2 |
| `"shortest" weights sum to exactly 1.0` | `sum ≈ 1.0` | §9.2 |
| `"balanced" weights sum to exactly 1.0` | `sum ≈ 1.0` | §9.2 |
| `"fuel" weights sum to exactly 1.0` | `sum ≈ 1.0` | §9.2 |
| All profiles have no negative weights | `w_i >= 0` for all i | §9.2 |

**Error boundary:** If a weight profile is misconfigured, the composite score formula becomes meaningless. These tests catch configuration drift early.

### §3.2 Travel Time Normalization Tests (5 tests)

| Test | Input Scenario | Expected Output |
|------|---------------|-----------------|
| Fastest route gets highest time score | 15min vs 30min | `N_T(fast) > N_T(slow)` |
| Single candidate → degenerate score | Solo route | `N_T = 95` |
| Equal durations → equal scores | Both 20min | `N_T = 95` for both |
| Min-range candidate → maximum | 10min vs 50min | `N_T(fastest) = 100` |
| Max-range candidate → minimum | 10min vs 50min | `N_T(slowest) = 60` |

**Error boundary:** When `maxTime === minTime`, the denominator is zero. The engine returns constant 95 (degenerate case handling).

### §3.3 Traffic Score Normalization Tests (4 tests)

| Test | Input Scenario | Expected Output |
|------|---------------|-----------------|
| Low traffic + zero delay | `low, delay=0` | `trafficScore >= 90` |
| Severe vs low comparison | `severe, delay=15` vs `low, delay=1` | Gap `> 30 points` |
| Extreme delay clamping | `severe, delay=100, normal=10` | `trafficScore ∈ [10, 100]` |
| Monotonic tier ordering | All 4 tiers, same delay | `low ≥ moderate ≥ heavy ≥ severe` |

**Error boundary:** `normalDurationMin = 0` could cause division by zero in delay ratio. Mitigated by `Math.max(1, normalDurationMin)`.

### §3.4 Safety Score Tests (7 tests)

| Test | Warning Types | Expected Safety Score |
|------|-------------|----------------------|
| Zero warnings | `[]` | `100` |
| Single block | `[block]` | `65` (100 - 35) |
| Single accident | `[accident]` | `75` (100 - 25) |
| Single construction | `[construction]` | `85` (100 - 15) |
| Single weather | `[weather]` | `80` (100 - 20) |
| Single traffic | `[traffic]` | `90` (100 - 10) |
| Multiple compounding | `[block, accident, construction]` | `25` (100-35-25-15) |
| Floor clamp | 4 severe warnings | `15` (floored, not negative) |

**Error boundary:** Without the floor clamp at 15, routes with many incidents would receive 0 or negative safety scores, causing the weighted composite to collapse. The floor maintains numeric stability.

### §3.5 Road Quality Ordinal Mapping Tests (5 tests)

| Road Quality | Expected Score | Verified |
|-------------|---------------|----------|
| `excellent` | 98 | ✓ Exact match |
| `good` | 88 | ✓ Exact match |
| `moderate` | 68 | ✓ Exact match |
| `poor` | 40 | ✓ Exact match |
| Strict ordering | `98 > 88 > 68 > 40` | ✓ Monotonicity |

### §3.6 Distance Normalization Tests (3 tests)

| Test | Input Scenario | Expected Output |
|------|---------------|-----------------|
| Shortest gets highest score | 5km vs 50km | `N_D(short) > N_D(long)` |
| Single candidate degenerate | Solo route | `N_D = 95` |
| Extreme range clamping | 1km vs 1000km | `N_D ∈ [20, 100]` |

### §3.7 Composite Score Tests (4 tests)

| Test | Assertion | Reference |
|------|-----------|-----------|
| Excellent route ≤ 99 | Upper clamp verified | §4.3 |
| Terrible route ≥ 40 | Lower clamp verified | §4.3 |
| Weights match preference | `weightsApplied === PREFERENCE_WEIGHTS[pref]` | §4.1 |
| Custom weights override | `weightsApplied === customWeights` | §4.1 |

### §3.8 Recommendation Generation Tests (7 tests)

| Test | Assertion |
|------|-----------|
| Recommends highest scorer | `recommendedRouteId === best.id` |
| Throws on empty input | `expect(...).toThrow()` |
| Handles single route | Valid recommendation with 1 candidate |
| All routes get valid scores | `aiScore ∈ [40, 99]` for all |
| Confidence bounded | `confidenceScore ∈ [80, 98]` |
| Headline changes with preference | Different text for each profile |
| preferenceUsed matches input | Field validation |

### §3.9 Invariant Property Tests (8 tests)

| Invariant | Test |
|-----------|------|
| Time monotonicity (§9.3) | Faster route scores ≥ slower (ceteris paribus) |
| Distance monotonicity (§9.4) | Shorter route scores ≥ longer (ceteris paribus) |
| Determinism (§9.6) | 10 identical runs produce identical output |
| Preference sensitivity (§9.7) | Fast-unsafe vs slow-safe ranking flips between fastest/safest |
| Non-empty recommendation (§9.8) | 1–5 routes always produce exactly one recommendation |

### §3.10 Edge Case Tests (3 tests)

| Edge Case | Handling |
|-----------|----------|
| `normalDurationMin = 0` | `Math.max(1, ...)` prevents division by zero |
| All-uniform candidates | All get identical score (no discrimination) |
| Large candidate set (10) | Completes without error; all scores valid |

### §3.11 Integration Tests (4 tests)

| Test | Data Source |
|------|------------|
| Gandhipuram→Airport scoring | `coimbatoreData.ts` demo routes |
| RS Puram→Singanallur coordinates | Coordinate validation for map rendering |
| Coimbatore→Ooty scoring | `interDistrictData.ts` demo routes |
| Coimbatore→Chennai step validation | Step-by-step navigation integrity |

---

## §4 Data Pipeline Tests — Detailed Breakdown

**File:** `src/services/dataPipeline.test.ts`  
**Subject Under Test:** `dataPipeline.fetchRouteConditions()`, `dataPipeline.getPipelineStatus()`

### §4.1 Pipeline Status Tests (3 tests)

| Test | Assertion |
|------|-----------|
| Google Maps available | `tier === 'google_maps_api'`, label contains "Google" |
| Google Maps unavailable | `tier === 'synthetic_heuristics'`, label contains "RouteMind" |
| All required fields present | Validates 6 required fields in status object |

### §4.2 Road Condition Report Tests (6 tests)

| Test | Route Name Pattern | Expected Quality |
|------|-------------------|-----------------|
| National Highway route | `via NH 44` | `excellent` |
| Bypass/Ring road | `Airport Bypass Ring Road` | `excellent` |
| NH + ghat combination | `Coonoor Ghat Road NH 181` | `excellent/good/moderate` (NH priority) |
| Pure hill road (SH) | `Kotagiri Mountain Pass` | `good/moderate` |
| Confidence percent | Any route | `0 < confidence ≤ 100` |
| Timestamp freshness | Any route | `before ≤ fetchedAt ≤ after` |

### §4.3 Construction Zone Detection Tests (4 tests)

| Test | Route | Expected |
|------|-------|----------|
| Avinashi Road detection | `via Avinashi Road Main Corridor` | Construction warning found |
| No false positives | `via Race Course Pleasant Avenue` | Zero synthetic construction warnings |
| Warning merging | Avinashi Road + existing warning | Both warnings present, no duplicates |
| Quality degradation | SH road + construction | Quality downgraded one tier |

**Error boundary:** Construction zone detection uses string matching (`routeText.includes(corridor)`). False positive prevention is validated by testing unrelated routes don't trigger construction warnings.

### §4.4 Hazard Feed Tests (3 tests)

| Test | Assertion |
|------|-----------|
| Required fields | `incidents` is array, `dataSource` truthy, `coverage` valid enum |
| Original warnings preserved | Existing route warnings survive merging |
| No duplicate IDs | `Set(ids).size === ids.length` |

**Error boundary:** The deduplication logic (`existingIds.has(w.id)`) prevents duplicate warnings when synthetic hazards match pre-existing route warnings.

### §4.5 Google Maps Tier Tests (4 tests)

| Test | Assertion |
|------|-----------|
| Tier selection | `activeTier === 'google_maps_api'` when available |
| Higher confidence | Google Maps confidence > synthetic confidence |
| NH classification | `roadQuality === 'excellent'` even through Google tier |
| High delay inference | Delay ratio > 0.5 → `moderate` quality inferred |

### §4.6 Pipeline Integration Tests (2 tests)

| Test | Data Source |
|------|------------|
| Gandhipuram→Airport all routes | All routes get valid pipeline result |
| Sathy Road no false construction | Route B bypass is clean |

---

## §5 Map Rendering Tests — Detailed Breakdown

**File:** `src/services/mapRendering.test.ts`  
**Subject Under Test:** Route coordinate data, polyline rendering validity, score outputs

### §5.1 Geographic Bounds Validation

Two bounding boxes are defined for coordinate validation:

```
Tamil Nadu Bounds:        lat ∈ [8.0, 14.0],  lng ∈ [76.0, 81.0]
South India Bounds:       lat ∈ [7.0, 14.5],  lng ∈ [74.0, 81.0]   (includes Bengaluru)
```

| Test Category | Count | Assertion |
|---------------|-------|-----------|
| Local route coordinates in TN bounds | 9 | All coords pass `isValidCoord()` |
| Inter-district coordinates in SI bounds | 12 | All coords pass extended bounds |
| Warning marker coordinates | 2 | Optional lat/lng within bounds |

### §5.2 Polyline Continuity Tests (3 tests)

| Test | Assertion |
|------|-----------|
| Local route continuity | Consecutive points < 2° apart (no teleportation) |
| Inter-district continuity | Consecutive points < 3° apart |
| Minimum point density | ≥ 5 coordinates per route for smooth polyline |

**Error boundary:** These tests catch "teleportation bugs" where a polyline jumps discontinuously (e.g., from coordinates in a different region due to data errors).

### §5.3 Score Output Validation (14 tests)

| Test | Dataset | Assertion |
|------|---------|-----------|
| Valid AI scores | Gandhipuram→Airport | `aiScore ∈ [40, 99]` for all |
| Valid route ID recommendation | Gandhipuram→Airport | `recommendedRouteId ∈ routes.map(r.id)` |
| Sathy Road recommended (balanced) | Gandhipuram→Airport | `recommended.name.includes('Sathy')` |
| Avinashi scores lower | Gandhipuram→Airport | `routeB.aiScore > routeA.aiScore` |
| Preference changes valid | Gandhipuram→Airport | All 5 preferences produce valid IDs |
| Non-negative breakdowns | Gandhipuram→Airport | All breakdown fields ≥ 0 |
| Ooty routes valid | Coimbatore→Ooty | `aiScore ∈ [40, 99]` |
| Kotagiri preferred (safest) | Coimbatore→Ooty | Fewer warnings → selected |
| Meaningful headline | Coimbatore→Ooty | `headline.length > 20` |
| Non-empty reasons | Coimbatore→Ooty | `reasons.length > 0` |
| Chennai step validation | Coimbatore→Chennai | Valid step instructions and coordinates |
| All 5 profiles valid | Coimbatore→Chennai | Scores valid for all preferences |

---

## §6 Data Integrity Tests — Detailed Breakdown

**File:** `src/data/dataIntegrity.test.ts`  
**Subject Under Test:** Coimbatore and Inter-District datasets, `interpolatePoints()`

### §6.1 Preset Location Validation (4 tests)

| Test | Dataset | Assertion |
|------|---------|-----------|
| ≥ 10 Coimbatore presets | `COIMBATORE_PRESETS` | `length ≥ 10` |
| Coimbatore coordinate bounds | All presets | `lat ∈ (10.5, 11.5), lng ∈ (76.5, 77.5)` |
| ≥ 5 inter-district presets | `INTER_DISTRICT_PRESETS` | `length ≥ 5` |
| South India coordinate bounds | All presets | `lat ∈ (8, 14), lng ∈ (76, 81)` |

### §6.2 Interpolation Function Tests (5 tests)

| Test | Assertion |
|------|-----------|
| Start and end preserved | `result[0] === start, result[-1] === end` |
| More points than input | `result.length > 2` |
| Waypoints included | Waypoint appears in output (within 0.001° tolerance) |
| Jitter adds variation | Different output with `jitter > 0` |
| All points valid numbers | `typeof === 'number' && !isNaN()` |

### §6.3 Route Data Contract Tests (7 tests)

| Test | Assertion |
|------|-----------|
| ≥ 2 candidate routes | `length ≥ 2` |
| Required scoring fields | All routes have `id, name, tag, durationMin, distanceKm, ...` |
| Valid warning structure | `id, type, title, description, severity, locationName` present |
| Unique route IDs | `Set(ids).size === ids.length` |
| Plottable polyline | `coordinates.length ≥ 5`, first ≠ last |
| Fallback for unknown OD | `getCoimbatoreDemoRoutes('Unknown', 'Unknown').length ≥ 1` |

### §6.4 End-to-End Pipeline Test (1 test)

Validates the complete data flow: `Dataset → AI Scoring → Map-Ready Output`

```
Input:  getCoimbatoreDemoRoutes('Gandhipuram', 'Airport')
Step 1: generateAIRecommendation(routes, 'balanced')
Step 2: Verify each scored route has:
        ✓ aiScore ∈ [40, 99]
        ✓ coordinates within (10, 12) lat, (76, 78) lng
        ✓ Complete scoreBreakdown with all 5 attributes + weightsApplied
        ✓ Valid recommendation with headline, explanation, reasons
```

---

## §7 Error Boundary Patterns

RouteMind AI uses multiple error boundary strategies across different application layers:

### §7.1 Scoring Engine Error Boundaries

| Boundary | Location | Strategy |
|----------|----------|----------|
| Division by zero (time range) | `calculateRouteScore()` L63-68 | `if (maxTime > minTime)` guard; else constant 95 |
| Division by zero (distance range) | `calculateRouteScore()` L122-127 | `if (maxDist > minDist)` guard; else constant 95 |
| Division by zero (delay ratio) | `calculateRouteScore()` L74 | `Math.max(1, normalDurationMin)` floor |
| Negative safety score | `calculateRouteScore()` L101 | `Math.max(15, ...)` floor clamp |
| Negative traffic score | `calculateRouteScore()` L90 | `Math.max(10, ...)` floor clamp |
| Score overflow | `calculateRouteScore()` L140 | `Math.min(99, Math.max(40, ...))` double clamp |
| Empty candidate array | `generateAIRecommendation()` L166 | `throw new Error(...)` with descriptive message |
| Single candidate (no runner-up) | `generateAIRecommendation()` L182 | `runnerUp = sorted[1] \|\| sorted[0]` self-reference |

### §7.2 Data Pipeline Error Boundaries

| Boundary | Location | Strategy |
|----------|----------|----------|
| Cache miss | `fetchRouteConditions()` | Generate fresh result, cache for 5 min TTL |
| Unknown road type | `_classifyRoadType()` | Default to `'MDR'` (Major District Road) |
| Duplicate incidents | `_fetchFromSyntheticPipeline()` | `existingIds.has(w.id)` deduplication filter |
| No construction match | `_checkConstructionZones()` | Returns empty array (safe no-op) |
| Non-peak hour | `_applyTimeOfDayPatterns()` | Returns empty array (no injection) |

### §7.3 Browser API Error Boundaries

| Boundary | Location | Strategy |
|----------|----------|----------|
| localStorage unavailable | `storageService` all methods | `try/catch` → return defaults |
| localStorage quota exceeded | `storageService.addTripHistory()` | `list.slice(0, 30)` FIFO cap |
| Corrupted JSON in storage | `storageService` read methods | `catch` → return `DEFAULT_PREFERENCES` / `[]` |
| Geolocation unsupported | `GeolocationService` constructor | Check `'geolocation' in navigator` |
| Geolocation permission denied | `getCurrentPosition()` error handler | Set `status = 'denied'`, notify listeners |
| Geolocation timeout | `getCurrentPosition()` error handler | Set `status = 'unavailable'`, notify listeners |
| Google Maps auth failure | `GoogleMapsService` constructor | `window.gm_authFailure` callback sets `authFailed = true` |
| Google Maps script load failure | `loadGoogleMaps()` | `script.onerror → resolve(false)` (graceful fallback) |
| Google Directions API failure | `calculateRealGoogleRoutes()` | `if (status !== 'OK') → resolve(null)` (fallback to dataset) |

### §7.4 Application-Level Error Boundaries

| Boundary | Location | Strategy |
|----------|----------|----------|
| Route planning failure | `App.tsx planRoute()` | `try/catch/finally` wrapping entire pipeline |
| Google Maps SDK not loaded | `App.tsx planRoute()` | `if (!rawRoutes)` → fallback to demo dataset |
| No routes returned | `App.tsx planRoute()` | Dataset fallback always returns ≥ 1 route |
| Component rendering | React 18 | StrictMode enabled for development error detection |

---

## §8 Test Helper Utilities

### §8.1 Route Builder Factory

All test suites use a `buildRoute()` / `buildTestRoute()` factory function that creates a minimal valid `RouteOption` with sensible defaults:

```typescript
function buildRoute(overrides: Partial<RouteOption> & { id: string }): RouteOption {
  return {
    name: overrides.name ?? `Route ${overrides.id}`,
    tag: overrides.tag ?? 'balanced',
    distanceKm: overrides.distanceKm ?? 10,
    durationMin: overrides.durationMin ?? 20,
    normalDurationMin: overrides.normalDurationMin ?? 18,
    trafficDelayMin: overrides.trafficDelayMin ?? 2,
    trafficStatus: overrides.trafficStatus ?? 'low',
    roadQuality: overrides.roadQuality ?? 'good',
    warnings: overrides.warnings ?? [],
    coordinates: overrides.coordinates ?? [{ lat: 11.0, lng: 77.0 }],
    steps: overrides.steps ?? [],
    // ... remaining defaults
    ...overrides,
  };
}
```

This pattern ensures:
- Tests only specify the fields relevant to the assertion
- Default values are realistic (Coimbatore coordinates, low traffic, good road)
- New required fields can be added to the type without breaking all tests

### §8.2 Warning Factory

```typescript
function buildWarning(type: IncidentWarning['type']): IncidentWarning {
  return {
    id: `w-${type}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: `${type} warning`,
    description: 'Test warning',
    severity: 'moderate',
    locationName: 'Test Location',
    isDemo: true,
  };
}
```

Random IDs prevent deduplication interference between test cases.

### §8.3 Coordinate Validation Helpers

```typescript
const TN_BOUNDS = { minLat: 8.0, maxLat: 14.0, minLng: 76.0, maxLng: 81.0 };

function isValidCoord(coord: LatLng, bounds = TN_BOUNDS): boolean {
  return (
    typeof coord.lat === 'number' && typeof coord.lng === 'number' &&
    !isNaN(coord.lat) && !isNaN(coord.lng) &&
    coord.lat >= bounds.minLat && coord.lat <= bounds.maxLat &&
    coord.lng >= bounds.minLng && coord.lng <= bounds.maxLng
  );
}
```

---

## §9 Coverage Targets

| Module | Statement Coverage | Branch Coverage | Notes |
|--------|-------------------|-----------------|-------|
| `aiScoringEngine.ts` | ~95% | ~90% | All normalization branches tested |
| `dataPipeline.ts` | ~85% | ~80% | Time-of-day patterns partially covered (time-dependent) |
| `coimbatoreData.ts` | ~90% | ~85% | Main scenarios + fallback tested |
| `interDistrictData.ts` | ~80% | ~75% | Primary routes tested; some destinations untested |

### §9.1 Known Test Limitations

1. **Time-dependent tests**: `_applyTimeOfDayPatterns()` produces different results based on IST time. Tests cannot control system clock without mocking.
2. **Google Maps integration**: `calculateRealGoogleRoutes()` requires a live Google Maps SDK and cannot be unit-tested in jsdom. Tested via manual integration.
3. **Component rendering**: React components are not currently unit-tested; UI validation is performed via manual browser testing and the Netlify preview deployment.
4. **localStorage**: Vitest's jsdom provides a mock `localStorage`, so storage tests run correctly but don't test browser-specific quota limits.

---

*End of testing documentation. See individual test files for inline comments and assertions.*
