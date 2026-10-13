/**
 * RouteMind AI — Data Acquisition Pipeline Service
 *
 * Three-tier data pipeline for road conditions and hazard warnings:
 *   Tier 1: Google Maps Directions API (live traffic)
 *   Tier 2: Municipal / Open Data APIs (simulated)
 *   Tier 3: Synthetic heuristics + crowd-sourced feed simulation
 *
 * Reference: docs/ai_scoring_engine_specification.md §10
 */

import { IncidentWarning, RouteOption } from '../types/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataTier = 'google_maps_api' | 'municipal_api' | 'synthetic_heuristics';

export interface RoadConditionReport {
  roadQuality: 'excellent' | 'good' | 'moderate' | 'poor';
  surfaceNotes: string;
  dataSource: DataTier;
  confidencePercent: number; // 0-100, how confident we are in this report
  fetchedAt: number; // Unix timestamp ms
}

export interface HazardFeed {
  incidents: IncidentWarning[];
  dataSource: DataTier;
  coverage: 'full' | 'partial' | 'simulated';
  fetchedAt: number;
}

export interface DataPipelineResult {
  roadCondition: RoadConditionReport;
  hazards: HazardFeed;
  activeTier: DataTier;
}

// ---------------------------------------------------------------------------
// §10.2 Tier Classification — Road Type to Quality Mapping
// ---------------------------------------------------------------------------

export type RoadTypeTag = 'NH' | 'SH' | 'MDR' | 'ODR' | 'urban_arterial' | 'city_street' | 'hill_road' | 'bypass';

const ROAD_TYPE_QUALITY_MAP: Record<RoadTypeTag, RoadConditionReport['roadQuality']> = {
  NH:             'excellent', // National Highways — maintained by NHAI
  bypass:         'excellent', // Ring roads / expressway bypasses
  SH:             'good',      // State Highways — state PWD maintained
  MDR:            'good',      // Major District Roads
  ODR:            'moderate',  // Other District Roads — variable quality
  urban_arterial: 'good',      // City arterials — periodic resurfacing
  city_street:    'moderate',  // Inner city streets — patchy
  hill_road:      'moderate',  // Ghat / mountain roads — wear from weather
};

const ROAD_TYPE_SURFACE_NOTES: Record<RoadTypeTag, string> = {
  NH:             'NHAI-maintained 4-lane expressway with lane markings and crash barriers',
  bypass:         'Newly constructed bypass with smooth asphalt and adequate lighting',
  SH:             'State highway with periodic resurfacing; occasional minor patches',
  MDR:            'District road with adequate surface quality; some minor cracking at junctions',
  ODR:            'Variable surface quality; expect occasional potholes and unpaved shoulders',
  urban_arterial: 'City arterial with good surface quality; lane markings may be faded',
  city_street:    'Urban street; expect potholes, narrow lanes, and high pedestrian activity',
  hill_road:      'Ghat road with curves; surface wear from weather; guard rails present',
};

// ---------------------------------------------------------------------------
// §10.3 Synthetic Hazard Heuristics
// ---------------------------------------------------------------------------

interface TimeOfDayPattern {
  peakHoursIST: [number, number][]; // [startHour, endHour] ranges (24h format)
  routes: string[]; // route name fragments to match
  incidentType: IncidentWarning['type'];
  title: string;
  description: string;
  severity: IncidentWarning['severity'];
  delayMin: number;
}

/**
 * Known time-of-day traffic patterns for Coimbatore corridors.
 * These simulate what would come from crowd-sourced feeds (Waze, Google Maps Live)
 * or municipal traffic management centre (TMC) APIs.
 */
const TIME_OF_DAY_PATTERNS: TimeOfDayPattern[] = [
  {
    peakHoursIST: [[8, 10], [17, 20]],
    routes: ['avinashi', 'peelamedu', 'gandhipuram'],
    incidentType: 'traffic',
    title: 'Peak Hour Congestion — Avinashi Corridor',
    description: 'Morning and evening rush hour traffic on Avinashi Road. High commuter density near PSG Tech and TIDEL IT Park.',
    severity: 'high',
    delayMin: 12,
  },
  {
    peakHoursIST: [[8, 10]],
    routes: ['trichy', 'singanallur', 'sungam'],
    incidentType: 'traffic',
    title: 'School-Hour Slowdown — Trichy Road',
    description: 'School vehicle and parent drop-off traffic causing temporary bottleneck.',
    severity: 'moderate',
    delayMin: 7,
  },
  {
    peakHoursIST: [[17, 21]],
    routes: ['race course', 'db road', 'rs puram'],
    incidentType: 'traffic',
    title: 'Evening Market Traffic — RS Puram',
    description: 'High commercial and pedestrian activity near DB Road market area in the evening.',
    severity: 'moderate',
    delayMin: 5,
  },
  {
    peakHoursIST: [[6, 9], [14, 18]],
    routes: ['coonoor', 'mettupalayam', 'kallar', 'nilgiri'],
    incidentType: 'traffic',
    title: 'Ghat Road Tourist Traffic',
    description: 'Heavy tourist vehicle movement on ghat road sections. Trucks restricted above Mettupalayam from 07:00-22:00.',
    severity: 'high',
    delayMin: 20,
  },
];

/**
 * Known construction zones — simulates data from Tamil Nadu NHAI / TNRDC project feeds
 */
const KNOWN_CONSTRUCTION_ZONES = [
  {
    corridors: ['avinashi rd', 'avinashi road', 'nava india'],
    incident: {
      id: 'synth-const-001',
      type: 'construction' as const,
      title: 'Avinashi Road Elevated Corridor Project',
      description: 'TNRDC elevated road project near Lakshmi Mills — Nava India section. Single lane traffic. Expected completion: Q2 2027.',
      severity: 'high' as const,
      locationName: 'Nava India Junction, Avinashi Rd',
      delayMin: 8,
      roadName: 'Avinashi Road',
      isDemo: false,
    },
  },
  {
    corridors: ['nh 44', 'salem bypass', 'salem road'],
    incident: {
      id: 'synth-const-002',
      type: 'construction' as const,
      title: 'NH 44 Four-Laning — Bhavani Section',
      description: 'NHAI four-laning work between Bhavani and Erode. Road narrowing to 2 lanes at work zones.',
      severity: 'moderate' as const,
      locationName: 'Bhavani–Erode NH 44 Stretch',
      delayMin: 12,
      roadName: 'NH 44',
      isDemo: false,
    },
  },
];

// ---------------------------------------------------------------------------
// §10.4 Main Data Pipeline Service
// ---------------------------------------------------------------------------

class DataAcquisitionPipeline {
  private cache = new Map<string, { result: DataPipelineResult; expiresAt: number }>();
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Main entry point: fetch road conditions and hazards for a route.
   * Automatically selects the best available data tier.
   */
  public async fetchRouteConditions(
    route: RouteOption,
    googleMapsAvailable: boolean
  ): Promise<DataPipelineResult> {
    const cacheKey = `${route.id}-${Math.floor(Date.now() / this.CACHE_TTL_MS)}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    let result: DataPipelineResult;

    if (googleMapsAvailable) {
      // Tier 1: Google Maps live data — road quality inferred from delay metrics
      result = this._fetchFromGoogleMapsHeuristics(route);
    } else {
      // Tier 2/3: Synthetic heuristics (municipal simulation + crowd-source sim)
      result = this._fetchFromSyntheticPipeline(route);
    }

    this.cache.set(cacheKey, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  /**
   * Tier 1: Infer road conditions from live Google Maps traffic data.
   * When Google Maps is available, we use delay ratios to augment road quality.
   */
  private _fetchFromGoogleMapsHeuristics(route: RouteOption): DataPipelineResult {
    // Infer road quality from traffic delay ratio
    const delayRatio = route.trafficDelayMin / Math.max(1, route.normalDurationMin);
    let quality: RoadConditionReport['roadQuality'] = 'good';
    let notes = 'Road condition inferred from Google Maps live traffic patterns.';

    // Cross-reference with highway tags for road type classification
    if (route.highwayTags?.some(t => t.match(/NH|National/i))) {
      quality = 'excellent';
      notes = 'National Highway — NHAI maintained, excellent surface condition.';
    } else if (route.highwayTags?.some(t => t.match(/SH|State/i))) {
      quality = delayRatio > 0.3 ? 'moderate' : 'good';
      notes = 'State Highway — standard maintenance cycle.';
    } else if (delayRatio > 0.5) {
      quality = 'moderate';
      notes = 'High traffic delay suggests congestion-related surface impact or urban corridor with stop-and-go conditions.';
    }

    const roadCondition: RoadConditionReport = {
      roadQuality: quality,
      surfaceNotes: notes,
      dataSource: 'google_maps_api',
      confidencePercent: 82,
      fetchedAt: Date.now(),
    };

    const hazards: HazardFeed = {
      incidents: [...route.warnings], // Google Maps warnings already populated via Directions API
      dataSource: 'google_maps_api',
      coverage: 'full',
      fetchedAt: Date.now(),
    };

    return {
      roadCondition,
      hazards,
      activeTier: 'google_maps_api',
    };
  }

  /**
   * Tier 2/3: Synthetic heuristics pipeline.
   * Simulates municipal API + crowd-sourced feed data.
   *
   * Pipeline Steps:
   *   1. Road type classification from route name/highway tags
   *   2. Construction zone cross-reference (simulates NHAI/TNRDC feeds)
   *   3. Time-of-day traffic pattern injection (simulates TMC/Waze feeds)
   *   4. Merge with existing route warnings
   *   5. Apply quality decay model
   */
  private _fetchFromSyntheticPipeline(route: RouteOption): DataPipelineResult {
    // Step 1: Road type classification
    const roadType = this._classifyRoadType(route);
    const baseQuality = ROAD_TYPE_QUALITY_MAP[roadType];
    const baseSurfaceNotes = ROAD_TYPE_SURFACE_NOTES[roadType];

    // Step 2: Check construction zones (simulates municipal API feed)
    const constructionWarnings = this._checkConstructionZones(route);

    // Step 3: Time-of-day pattern injection (simulates crowd-sourced/TMC feed)
    const toiWarnings = this._applyTimeOfDayPatterns(route);

    // Step 4: Merge incidents (route's built-in + dynamically generated)
    const existingIds = new Set(route.warnings.map(w => w.id));
    const newWarnings: IncidentWarning[] = [
      ...constructionWarnings.filter(w => !existingIds.has(w.id)),
      ...toiWarnings.filter(w => !existingIds.has(w.id)),
    ];

    // Step 5: Quality decay from construction impact
    let finalQuality = baseQuality;
    const hasActiveConstruction = [...route.warnings, ...constructionWarnings].some(
      w => w.type === 'construction' && w.severity === 'high'
    );
    if (hasActiveConstruction && finalQuality === 'excellent') {
      finalQuality = 'good'; // Downgrade one tier for active construction impact
    } else if (hasActiveConstruction && finalQuality === 'good') {
      finalQuality = 'moderate';
    }

    const roadCondition: RoadConditionReport = {
      roadQuality: finalQuality,
      surfaceNotes: hasActiveConstruction
        ? `${baseSurfaceNotes}. Note: Active construction work causing temporary quality degradation.`
        : baseSurfaceNotes,
      dataSource: 'synthetic_heuristics',
      confidencePercent: 70, // Lower confidence than live API
      fetchedAt: Date.now(),
    };

    const hazards: HazardFeed = {
      incidents: [...route.warnings, ...newWarnings],
      dataSource: newWarnings.length > 0 ? 'municipal_api' : 'synthetic_heuristics',
      coverage: newWarnings.length > 0 ? 'partial' : 'simulated',
      fetchedAt: Date.now(),
    };

    return {
      roadCondition,
      hazards,
      activeTier: newWarnings.length > 0 ? 'municipal_api' : 'synthetic_heuristics',
    };
  }

  /**
   * Classify route road type based on name and highway tags.
   * In production: cross-reference with OpenStreetMap highway= tags via Overpass API.
   */
  private _classifyRoadType(route: RouteOption): RoadTypeTag {
    const name = (route.name + ' ' + (route.highwayTags || []).join(' ')).toLowerCase();

    if (name.match(/nh\s*\d+|national highway/)) return 'NH';
    if (name.match(/bypass|ring road|expressway/)) return 'bypass';
    if (name.match(/sh\s*\d+|state highway/)) return 'SH';
    if (name.match(/ghat|hill|mountain|nilgiri|coonoor|ooty/)) return 'hill_road';
    if (name.match(/arterial|main road|flyover|trichy rd|avinashi/)) return 'urban_arterial';
    if (name.match(/city|street|colony|layout|nagar/)) return 'city_street';

    return 'MDR'; // Default to Major District Road
  }

  /**
   * Cross-reference route against known construction zones.
   * Simulates data feed from NHAI/TNRDC construction project API.
   */
  private _checkConstructionZones(route: RouteOption): IncidentWarning[] {
    const routeText = (route.name + ' ' + route.summaryDescription + ' ' + (route.highwayTags || []).join(' ')).toLowerCase();
    const matched: IncidentWarning[] = [];

    for (const zone of KNOWN_CONSTRUCTION_ZONES) {
      const matches = zone.corridors.some(corridor => routeText.includes(corridor));
      if (matches) {
        matched.push({
          ...zone.incident,
          id: `${zone.incident.id}-${route.id}`,
        });
      }
    }

    return matched;
  }

  /**
   * Apply time-of-day traffic patterns based on current IST time.
   * Simulates data from traffic management centres or crowd-sourced feeds (Waze/Google).
   */
  private _applyTimeOfDayPatterns(route: RouteOption): IncidentWarning[] {
    const routeText = route.name.toLowerCase();
    const nowIST = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(nowIST.getTime() + istOffset);
    const currentHour = istTime.getUTCHours();
    const matched: IncidentWarning[] = [];

    for (const pattern of TIME_OF_DAY_PATTERNS) {
      const routeMatches = pattern.routes.some(r => routeText.includes(r));
      if (!routeMatches) continue;

      const inPeakHour = pattern.peakHoursIST.some(
        ([start, end]) => currentHour >= start && currentHour < end
      );

      if (inPeakHour) {
        matched.push({
          id: `toi-${pattern.incidentType}-${Date.now()}`,
          type: pattern.incidentType,
          title: pattern.title,
          description: pattern.description,
          severity: pattern.severity,
          locationName: 'Current corridor section',
          delayMin: pattern.delayMin,
          isDemo: false,
        });
      }
    }

    return matched;
  }

  /**
   * Get current data pipeline status for UI display
   */
  public getPipelineStatus(googleMapsAvailable: boolean): {
    tier: DataTier;
    label: string;
    description: string;
    trafficSource: string;
    roadConditionSource: string;
    hazardSource: string;
  } {
    if (googleMapsAvailable) {
      return {
        tier: 'google_maps_api',
        label: 'Google Maps Platform',
        description: 'Live traffic data from Google Directions API with BEST_GUESS traffic model',
        trafficSource: 'Google Maps Directions API (duration_in_traffic)',
        roadConditionSource: 'Road type classification + live delay inference',
        hazardSource: 'Google Maps traffic layer + crowd-reported incidents',
      };
    }

    return {
      tier: 'synthetic_heuristics',
      label: 'RouteMind Synthetic Pipeline',
      description: 'Curated heuristics from OpenStreetMap road types, known construction feeds, and time-of-day patterns',
      trafficSource: 'IST time-of-day traffic pattern models',
      roadConditionSource: 'Road type classification (OSM highway tags heuristic) + construction zone DB',
      hazardSource: 'NHAI/TNRDC construction feeds (simulated) + TMC incident patterns',
    };
  }
}

export const dataPipeline = new DataAcquisitionPipeline();
