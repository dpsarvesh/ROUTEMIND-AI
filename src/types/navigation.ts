export type NavigationMode = 'inter-district' | 'local';

export type TravelMode = 'car' | 'bike' | 'walking' | 'transit';

export type TravelPreference = 'fastest' | 'safest' | 'shortest' | 'balanced' | 'fuel';

export type TimeOption = 'now' | 'later' | 'tomorrow' | 'custom';

export type DataSource = 'live' | 'network';

export type TrafficStatus = 'low' | 'moderate' | 'heavy' | 'severe';

export type IncidentType = 'block' | 'traffic' | 'construction' | 'accident' | 'weather' | 'speed_trap';

export interface IncidentWarning {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  locationName: string;
  lat?: number;
  lng?: number;
  delayMin?: number;
  roadName?: string;
  isDemo?: boolean;
}

export interface ScoreBreakdown {
  travelTimeScore: number; // 0 - 100 (higher is better / faster)
  trafficScore: number;    // 0 - 100 (higher means less congestion)
  safetyScore: number;     // 0 - 100 (higher means fewer hazards/closures)
  roadConditionScore: number; // 0 - 100 (higher means smoother pavement)
  distanceScore: number;   // 0 - 100 (higher means more direct)
  rawScore: number;        // composite 0 - 100
  weightsApplied: {
    time: number;
    traffic: number;
    safety: number;
    road: number;
    distance: number;
  };
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  streetName: string;
  action: 'straight' | 'turn-left' | 'turn-right' | 'u-turn' | 'merge' | 'roundabout' | 'destination';
  lat: number;
  lng: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteOption {
  id: string;
  name: string;
  tag: 'fastest' | 'safest' | 'balanced' | 'shortest' | 'alternative';
  summaryDescription: string;
  distanceKm: number;
  durationMin: number;
  normalDurationMin: number;
  trafficDelayMin: number;
  trafficStatus: TrafficStatus;
  roadQuality: 'excellent' | 'good' | 'moderate' | 'poor';
  roadSurfaceNotes: string;
  warnings: IncidentWarning[];
  coordinates: LatLng[];
  steps: RouteStep[];
  aiScore: number; // 0 - 100
  scoreBreakdown: ScoreBreakdown;
  recommendedReason: string;
  dataSource: DataSource;
  highwayTags?: string[];
  tollCount?: number;
  fuelEstimateLiters?: number;
}

export interface AIRecommendation {
  recommendedRouteId: string;
  headline: string;
  detailedExplanation: string;
  reasons: string[];
  tradeoffs: string[];
  preferenceUsed: TravelPreference;
  dataSource: DataSource;
  confidenceScore: number; // e.g. 96%
}

export interface SavedPlace {
  id: string;
  title: string;
  category: 'home' | 'work' | 'college' | 'favorite';
  address: string;
  lat: number;
  lng: number;
  icon?: string;
}

export interface TripHistoryItem {
  id: string;
  timestamp: number;
  fromName: string;
  toName: string;
  mode: NavigationMode;
  travelMode: TravelMode;
  distanceKm: number;
  durationMin: number;
  selectedRouteName: string;
  aiScore: number;
}

export interface PresetLocation {
  name: string;
  category: 'landmark' | 'transit' | 'tech' | 'hospital' | 'shopping' | 'district';
  lat: number;
  lng: number;
  subtitle: string;
}
