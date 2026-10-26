/**
 * RouteMind AI — Core Type Definitions
 *
 * This module defines the complete TypeScript type system for the RouteMind AI
 * navigation assistant. All types are shared across the application layers:
 *   - UI components (src/components/)
 *   - AI scoring engine (src/services/aiScoringEngine.ts)
 *   - Data pipeline (src/services/dataPipeline.ts)
 *   - Persistence layer (src/services/storageService.ts)
 *   - Route datasets (src/data/)
 *
 * @module types/navigation
 */

// ---------------------------------------------------------------------------
// Enumerations — Navigation Modes & User Preferences
// ---------------------------------------------------------------------------

/**
 * Determines the geographic scope of route planning.
 * - `'local'`: Intra-city routing within Coimbatore (15+ locations)
 * - `'inter-district'`: Regional routing across Tamil Nadu / South India
 */
export type NavigationMode = 'inter-district' | 'local';

/**
 * Travel mode selector — maps to Google Maps DirectionsService travel modes.
 * - `'car'` → DRIVING | `'bike'` → DRIVING (motorcycle) | `'walking'` → WALKING | `'transit'` → TRANSIT
 */
export type TravelMode = 'car' | 'bike' | 'walking' | 'transit';

/**
 * AI preference profile that controls the MCDA weight vector (W_P).
 * Each profile redistributes weights across the 5 scoring attributes.
 * See: {@link ../services/aiScoringEngine.ts PREFERENCE_WEIGHTS}
 * Spec: docs/ai_scoring_engine_specification.md §5
 */
export type TravelPreference = 'fastest' | 'safest' | 'shortest' | 'balanced' | 'fuel';

/**
 * Departure time selector for route planning.
 * - `'now'`: Real-time traffic conditions
 * - `'later'`/`'tomorrow'`: Predictive traffic modeling
 * - `'custom'`: User-specified ISO datetime
 */
export type TimeOption = 'now' | 'later' | 'tomorrow' | 'custom';

/**
 * Indicates the source tier of route data.
 * - `'live'`: Data sourced from Google Maps Directions API (Tier 1)
 * - `'network'`: Data sourced from synthetic heuristics pipeline (Tier 2/3)
 */
export type DataSource = 'live' | 'network';

/**
 * Qualitative traffic congestion level used by the MCDA traffic scoring function.
 * Ordered severity: low < moderate < heavy < severe
 * Each tier maps to a distinct base score anchor in the scoring engine.
 * See: docs/ai_scoring_engine_specification.md §3.2
 */
export type TrafficStatus = 'low' | 'moderate' | 'heavy' | 'severe';

/**
 * Categorization of road incidents/hazards. Each type carries a specific
 * penalty deduction in the safety scoring function N_I(r).
 *
 * Penalty values (from §3.3):
 * - `'block'`: -35 pts (complete lane closure)
 * - `'accident'`: -25 pts (active accident scene)
 * - `'weather'`: -20 pts (adverse weather conditions)
 * - `'construction'`: -15 pts (partial lane/shoulder closure)
 * - `'traffic'`: -10 pts (congestion event, no physical obstruction)
 * - `'speed_trap'`: 0 pts (informational only)
 */
export type IncidentType = 'block' | 'traffic' | 'construction' | 'accident' | 'weather' | 'speed_trap';

// ---------------------------------------------------------------------------
// Incident Warning — Road Hazard Events
// ---------------------------------------------------------------------------

/**
 * Represents a single road hazard, incident, or advisory warning along a route.
 * Warnings are sourced from:
 *   1. Google Maps traffic layer (live)
 *   2. NHAI/TNRDC construction feeds (simulated via dataPipeline.ts)
 *   3. Time-of-day crowd-sourced patterns (synthetic)
 *
 * Each warning contributes to the route's safety score N_I(r) via
 * additive penalty deductions. See: §3.3 of the scoring specification.
 */
export interface IncidentWarning {
  /** Unique identifier for deduplication during hazard feed merging */
  id: string;
  /** Incident category — determines the penalty magnitude in safety scoring */
  type: IncidentType;
  /** Human-readable incident headline (displayed in UI cards) */
  title: string;
  /** Detailed description of the incident and its impact on travel */
  description: string;
  /** Qualitative severity level for UI color-coding and prioritization */
  severity: 'low' | 'moderate' | 'high' | 'critical';
  /** Human-readable location name (e.g., "Nava India Junction, Avinashi Rd") */
  locationName: string;
  /** Optional latitude for incident marker placement on map */
  lat?: number;
  /** Optional longitude for incident marker placement on map */
  lng?: number;
  /** Estimated additional delay in minutes caused by this incident */
  delayMin?: number;
  /** Name of the affected road segment */
  roadName?: string;
  /** Flag indicating this is synthetic/demo data vs. live API data */
  isDemo?: boolean;
}

// ---------------------------------------------------------------------------
// Score Breakdown — MCDA Attribute Scores & Applied Weights
// ---------------------------------------------------------------------------

/**
 * Complete MCDA score decomposition for a single route candidate.
 * Each attribute score is normalized to the [0, 100] scalar space.
 *
 * The composite score is computed as:
 *   rawScore = Σ (attributeScore_i × weight_i)
 *
 * See: docs/ai_scoring_engine_specification.md §4.2
 */
export interface ScoreBreakdown {
  /** Travel time score N_T(r): range [60, 100]. Higher = faster route. (§3.1) */
  travelTimeScore: number;
  /** Traffic congestion score N_C(r): range [10, 100]. Higher = less congestion. (§3.2) */
  trafficScore: number;
  /** Safety/incident score N_I(r): range [15, 100]. Higher = fewer hazards. (§3.3) */
  safetyScore: number;
  /** Road surface quality score N_Q(r): one of {40, 68, 88, 98}. (§3.4) */
  roadConditionScore: number;
  /** Route distance score N_D(r): range [20, 100]. Higher = shorter distance. (§3.5) */
  distanceScore: number;
  /** Raw weighted composite score before final clamping */
  rawScore: number;
  /** The preference weight vector W_P that was applied to compute this score */
  weightsApplied: {
    time: number;
    traffic: number;
    safety: number;
    road: number;
    distance: number;
  };
}

// ---------------------------------------------------------------------------
// Route Step — Turn-by-Turn Navigation Instruction
// ---------------------------------------------------------------------------

/**
 * A single navigation maneuver in the route's step-by-step directions.
 * Used by ActiveNavigationHUD for turn-by-turn guidance rendering.
 * Each step includes a geocoded start point for progress tracking.
 */
export interface RouteStep {
  /** Human-readable turn/maneuver instruction (e.g., "Turn left onto Avinashi Rd") */
  instruction: string;
  /** Distance of this step segment in meters */
  distanceMeters: number;
  /** Estimated time for this step in seconds */
  durationSeconds: number;
  /** Name of the street/road for this step segment */
  streetName: string;
  /** Maneuver type for rendering navigation arrow icons */
  action: 'straight' | 'turn-left' | 'turn-right' | 'u-turn' | 'merge' | 'roundabout' | 'destination';
  /** Latitude of the step's start point (for progress tracking against GPS) */
  lat: number;
  /** Longitude of the step's start point */
  lng: number;
}

// ---------------------------------------------------------------------------
// Geographic Coordinate
// ---------------------------------------------------------------------------

/**
 * WGS-84 geographic coordinate pair.
 * All coordinates in this application are within the South India region:
 *   lat ∈ [7.0, 14.5], lng ∈ [74.0, 81.0]
 */
export interface LatLng {
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Route Option — Complete Route Candidate for MCDA Evaluation
// ---------------------------------------------------------------------------

/**
 * A single route candidate representing a drivable path between origin and destination.
 * This is the core data structure consumed by:
 *   1. AI Scoring Engine — for MCDA evaluation (§3–§4)
 *   2. MapContainer — for polyline and marker rendering
 *   3. RouteOptionsList — for candidate card display
 *   4. ActiveNavigationHUD — for turn-by-turn guidance
 *
 * Routes are sourced from either Google Maps Directions API (Tier 1) or
 * the curated demo dataset (coimbatoreData.ts / interDistrictData.ts).
 */
export interface RouteOption {
  /** Unique route identifier (e.g., "cbe-gandhi-air-1", "google-route-1") */
  id: string;
  /** Human-readable route name (e.g., "Route A — via Avinashi Road Main Corridor") */
  name: string;
  /** Route classification tag for UI badge rendering */
  tag: 'fastest' | 'safest' | 'balanced' | 'shortest' | 'alternative';
  /** Brief description of the route path (e.g., "via Lakshmi Mills & Peelamedu") */
  summaryDescription: string;
  /** Total route distance in kilometres. Input to N_D(r) normalization. */
  distanceKm: number;
  /** Estimated travel time in minutes including traffic delay. Input to N_T(r). */
  durationMin: number;
  /** Baseline travel time in minutes without traffic. Used for delay ratio calculation. */
  normalDurationMin: number;
  /** Additional delay in minutes due to traffic. δ_r = trafficDelayMin / max(1, normalDurationMin) */
  trafficDelayMin: number;
  /** Qualitative traffic congestion level. Determines base anchor in N_C(r). */
  trafficStatus: TrafficStatus;
  /** Qualitative road surface quality. Maps to fixed score via N_Q(r). */
  roadQuality: 'excellent' | 'good' | 'moderate' | 'poor';
  /** Descriptive notes about road surface conditions */
  roadSurfaceNotes: string;
  /** Array of incident warnings — each contributes to N_I(r) safety penalty */
  warnings: IncidentWarning[];
  /** Ordered array of LatLng points forming the route polyline for map rendering */
  coordinates: LatLng[];
  /** Step-by-step navigation instructions for turn-by-turn guidance */
  steps: RouteStep[];
  /** Final MCDA composite score S(r, P) ∈ [40, 99]. Set by generateAIRecommendation(). */
  aiScore: number;
  /** Detailed per-attribute score decomposition. Set by calculateRouteScore(). */
  scoreBreakdown: ScoreBreakdown;
  /** Natural language explanation of why this route scored as it did */
  recommendedReason: string;
  /** Data source tier that provided this route's data */
  dataSource: DataSource;
  /** Optional highway classification tags (e.g., ["NH 44", "SH 52"]) for road type classification */
  highwayTags?: string[];
  /** Number of toll plazas on this route (inter-district only) */
  tollCount?: number;
  /** Estimated fuel consumption in liters for this route */
  fuelEstimateLiters?: number;
}

// ---------------------------------------------------------------------------
// AI Recommendation — Engine Output
// ---------------------------------------------------------------------------

/**
 * The AI scoring engine's recommendation output — identifies the best route
 * and provides natural language justification with transparent reasoning.
 *
 * Generated by: {@link ../services/aiScoringEngine.ts generateAIRecommendation()}
 * See: docs/ai_scoring_engine_specification.md §6
 */
export interface AIRecommendation {
  /** ID of the highest-scoring route: argmax_r S(r, P) */
  recommendedRouteId: string;
  /** Preference-tailored headline (e.g., "Route B is recommended for quickest arrival time.") */
  headline: string;
  /** Multi-sentence detailed explanation with metric comparisons */
  detailedExplanation: string;
  /** List of data-backed reasons supporting the recommendation */
  reasons: string[];
  /** List of acknowledged tradeoffs (e.g., "Takes ~5 min longer, but avoids hazards") */
  tradeoffs: string[];
  /** The preference profile that was used for scoring */
  preferenceUsed: TravelPreference;
  /** Data source tier used for this recommendation */
  dataSource: DataSource;
  /** Confidence score ∈ [80, 98]. Formula: clamp(88 + round((S - 70) × 0.3), 80, 98) */
  confidenceScore: number;
}

// ---------------------------------------------------------------------------
// User Data — Saved Places & Trip History
// ---------------------------------------------------------------------------

/**
 * A user-saved favorite location stored in browser localStorage.
 * Persisted via storageService under key 'routemind_saved_places'.
 */
export interface SavedPlace {
  /** Unique identifier (e.g., "sp-1694000000000") */
  id: string;
  /** User-facing place name (e.g., "Home", "Work / College") */
  title: string;
  /** Place category for icon and grouping */
  category: 'home' | 'work' | 'college' | 'favorite';
  /** Full address string */
  address: string;
  /** Latitude coordinate of the saved place */
  lat: number;
  /** Longitude coordinate of the saved place */
  lng: number;
  /** Optional custom icon identifier */
  icon?: string;
}

/**
 * A recorded trip in the user's navigation history.
 * Persisted via storageService under key 'routemind_trip_history'.
 * Maximum 30 entries retained (FIFO eviction).
 */
export interface TripHistoryItem {
  /** Unique identifier (e.g., "trip-1694000000000") */
  id: string;
  /** Unix timestamp (ms) when the trip was recorded */
  timestamp: number;
  /** Origin location name */
  fromName: string;
  /** Destination location name */
  toName: string;
  /** Navigation mode used (local / inter-district) */
  mode: NavigationMode;
  /** Travel mode used */
  travelMode: TravelMode;
  /** Total route distance in kilometres */
  distanceKm: number;
  /** Total estimated travel time in minutes */
  durationMin: number;
  /** Name of the AI-recommended route that was selected */
  selectedRouteName: string;
  /** AI composite score of the selected route */
  aiScore: number;
}

// ---------------------------------------------------------------------------
// Preset Location — Predefined Origin/Destination Choices
// ---------------------------------------------------------------------------

/**
 * A predefined location available in the trip planner dropdown.
 * Preset collections are defined per navigation mode:
 *   - Local: COIMBATORE_PRESETS (src/data/coimbatoreData.ts)
 *   - Inter-District: INTER_DISTRICT_PRESETS (src/data/interDistrictData.ts)
 */
export interface PresetLocation {
  /** Location name as displayed in the dropdown selector */
  name: string;
  /** Category for icon rendering and semantic grouping */
  category: 'landmark' | 'transit' | 'tech' | 'hospital' | 'shopping' | 'district';
  /** Latitude coordinate (Coimbatore: ~11.0, South India: 8–14) */
  lat: number;
  /** Longitude coordinate (Coimbatore: ~77.0, South India: 74–81) */
  lng: number;
  /** Secondary descriptive text shown below the location name */
  subtitle: string;
}
