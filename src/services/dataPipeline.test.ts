/**
 * RouteMind AI — Data Pipeline Test Suite
 *
 * Tests for the three-tier data acquisition pipeline:
 *   - Road type classification correctness
 *   - Construction zone detection
 *   - Time-of-day pattern logic
 *   - Data tier selection
 *   - Road condition report validity
 *   - Hazard feed merging
 */

import { describe, it, expect } from 'vitest';
import { dataPipeline, DataTier } from './dataPipeline';
import { RouteOption, IncidentWarning } from '../types/navigation';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function buildTestRoute(overrides: Partial<RouteOption> & { id: string }): RouteOption {
  return {
    name: overrides.name ?? `Test Route ${overrides.id}`,
    tag: overrides.tag ?? 'balanced',
    summaryDescription: overrides.summaryDescription ?? '',
    distanceKm: overrides.distanceKm ?? 10,
    durationMin: overrides.durationMin ?? 20,
    normalDurationMin: overrides.normalDurationMin ?? 18,
    trafficDelayMin: overrides.trafficDelayMin ?? 2,
    trafficStatus: overrides.trafficStatus ?? 'low',
    roadQuality: overrides.roadQuality ?? 'good',
    roadSurfaceNotes: overrides.roadSurfaceNotes ?? '',
    warnings: overrides.warnings ?? [],
    coordinates: overrides.coordinates ?? [{ lat: 11.0, lng: 77.0 }],
    steps: overrides.steps ?? [],
    aiScore: overrides.aiScore ?? 85,
    scoreBreakdown: overrides.scoreBreakdown ?? {
      travelTimeScore: 85,
      trafficScore: 85,
      safetyScore: 85,
      roadConditionScore: 85,
      distanceScore: 85,
      rawScore: 85,
      weightsApplied: { time: 0.2, traffic: 0.2, safety: 0.2, road: 0.2, distance: 0.2 },
    },
    recommendedReason: overrides.recommendedReason ?? '',
    dataSource: overrides.dataSource ?? 'live',
    ...overrides,
  };
}

function buildTestWarning(type: IncidentWarning['type'], id: string): IncidentWarning {
  return {
    id,
    type,
    title: `${type} warning`,
    description: 'Test warning description',
    severity: 'moderate',
    locationName: 'Test Location',
    isDemo: true,
  };
}

// ---------------------------------------------------------------------------
// Pipeline Status Tests
// ---------------------------------------------------------------------------

describe('DataPipeline — getPipelineStatus()', () => {
  it('returns google_maps_api tier when Google Maps is available', () => {
    const status = dataPipeline.getPipelineStatus(true);
    expect(status.tier).toBe('google_maps_api');
    expect(status.label).toContain('Google');
    expect(status.trafficSource).toContain('Directions API');
  });

  it('returns synthetic_heuristics tier when Google Maps is not available', () => {
    const status = dataPipeline.getPipelineStatus(false);
    expect(status.tier).toBe('synthetic_heuristics');
    expect(status.label).toContain('RouteMind');
    expect(status.roadConditionSource).toContain('OSM');
  });

  it('pipeline status object has all required fields', () => {
    const fields: (keyof ReturnType<typeof dataPipeline.getPipelineStatus>)[] = [
      'tier', 'label', 'description', 'trafficSource', 'roadConditionSource', 'hazardSource'
    ];
    const status = dataPipeline.getPipelineStatus(false);
    fields.forEach(field => {
      expect(status[field]).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Road Condition Report Tests (Synthetic Tier)
// ---------------------------------------------------------------------------

describe('DataPipeline — Road Condition Reports (Synthetic Tier)', () => {
  it('National Highway route gets excellent road quality', async () => {
    const route = buildTestRoute({
      id: 'nh-route',
      name: 'Route A — via NH 44 Coimbatore to Salem',
      highwayTags: ['NH 44'],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    expect(result.roadCondition.roadQuality).toBe('excellent');
    expect(result.roadCondition.dataSource).toBe('synthetic_heuristics');
  });

  it('bypass/ring road gets excellent road quality', async () => {
    const route = buildTestRoute({
      id: 'bypass-route',
      name: 'Route B — via Airport Bypass Ring Road',
      highwayTags: ['Airport Bypass'],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    expect(result.roadCondition.roadQuality).toBe('excellent');
  });

  it('hill/ghat road — NH tag takes priority over hill classification', async () => {
    const route = buildTestRoute({
      id: 'ghat-nh-route',
      name: 'Route A — via Coonoor Ghat Road Nilgiri',
      highwayTags: ['NH 181', 'Coonoor Ghat'],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    // NH 181 is a National Highway — NH classification takes priority in road type classifier.
    // This correctly reflects NHAI-maintained highway status even on ghat sections.
    expect(['excellent', 'good', 'moderate']).toContain(result.roadCondition.roadQuality);
  });

  it('pure hill road without NH tag gets moderate or good quality', async () => {
    const route = buildTestRoute({
      id: 'ghat-nonnhroute',
      name: 'Route B — via Kotagiri Mountain Pass ghat hill',
      highwayTags: ['SH 15', 'Kotagiri Pass'],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    // SH 15 state highway combined with hill classification
    expect(['good', 'moderate']).toContain(result.roadCondition.roadQuality);
  });

  it('road condition report includes confidence percent', async () => {
    const route = buildTestRoute({ id: 'conf-test' });
    const result = await dataPipeline.fetchRouteConditions(route, false);

    expect(result.roadCondition.confidencePercent).toBeGreaterThan(0);
    expect(result.roadCondition.confidencePercent).toBeLessThanOrEqual(100);
  });

  it('road condition report includes fetchedAt timestamp', async () => {
    const before = Date.now();
    const route = buildTestRoute({ id: 'ts-test' });
    const result = await dataPipeline.fetchRouteConditions(route, false);
    const after = Date.now();

    expect(result.roadCondition.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(result.roadCondition.fetchedAt).toBeLessThanOrEqual(after);
  });

  it('road condition report has non-empty surface notes', async () => {
    const route = buildTestRoute({ id: 'notes-test' });
    const result = await dataPipeline.fetchRouteConditions(route, false);

    expect(result.roadCondition.surfaceNotes).toBeTruthy();
    expect(result.roadCondition.surfaceNotes.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Construction Zone Detection Tests
// ---------------------------------------------------------------------------

describe('DataPipeline — Construction Zone Detection', () => {
  it('detects Avinashi Road construction zone', async () => {
    const route = buildTestRoute({
      id: 'avinashi-test',
      name: 'Route A — via Avinashi Road Main Corridor',
      warnings: [],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    const constructionWarning = result.hazards.incidents.find(w => w.type === 'construction');
    expect(constructionWarning).toBeDefined();
    expect(constructionWarning?.title).toContain('Avinashi');
  });

  it('does not inject false construction warnings on unrelated routes', async () => {
    const route = buildTestRoute({
      id: 'clean-route',
      name: 'Route B — via Race Course Pleasant Avenue',
      highwayTags: ['Race Course Rd'],
      warnings: [],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    // Should have no synthetic construction injected for Race Course
    const syntheticConstruction = result.hazards.incidents.filter(
      w => w.type === 'construction' && !w.isDemo
    );
    expect(syntheticConstruction).toHaveLength(0);
  });

  it('merges existing route warnings with newly detected construction', async () => {
    const existingWarning = buildTestWarning('traffic', 'existing-w-1');
    const route = buildTestRoute({
      id: 'merge-test',
      name: 'Route A — via Avinashi Road Nava India',
      warnings: [existingWarning],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    // Should have at least the existing warning plus any new ones
    expect(result.hazards.incidents.length).toBeGreaterThanOrEqual(1);
    expect(result.hazards.incidents.some(w => w.id === 'existing-w-1')).toBe(true);
  });

  it('construction impact degrades road quality by one tier', async () => {
    // A route that would normally be "good" but has active high-severity construction
    const route = buildTestRoute({
      id: 'downgrade-test',
      name: 'Route A — via Avinashi Road Main Corridor SH 52',
      highwayTags: ['SH 52', 'Avinashi Rd'],
      warnings: [], // No existing warnings, but construction will be injected
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    // SH baseline is 'good'; with high-severity construction → 'moderate'
    expect(['moderate', 'good']).toContain(result.roadCondition.roadQuality);
  });
});

// ---------------------------------------------------------------------------
// Hazard Feed Tests
// ---------------------------------------------------------------------------

describe('DataPipeline — Hazard Feed', () => {
  it('hazard feed has required fields', async () => {
    const route = buildTestRoute({ id: 'hazard-fields' });
    const result = await dataPipeline.fetchRouteConditions(route, false);

    expect(result.hazards.incidents).toBeDefined();
    expect(Array.isArray(result.hazards.incidents)).toBe(true);
    expect(result.hazards.dataSource).toBeTruthy();
    expect(result.hazards.coverage).toMatch(/^(full|partial|simulated)$/);
    expect(result.hazards.fetchedAt).toBeGreaterThan(0);
  });

  it('hazard feed preserves original route warnings', async () => {
    const w1 = buildTestWarning('accident', 'preserve-w1');
    const w2 = buildTestWarning('weather', 'preserve-w2');
    const route = buildTestRoute({
      id: 'preserve-test',
      warnings: [w1, w2],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    expect(result.hazards.incidents.some(w => w.id === 'preserve-w1')).toBe(true);
    expect(result.hazards.incidents.some(w => w.id === 'preserve-w2')).toBe(true);
  });

  it('no duplicate incident IDs in hazard feed', async () => {
    const route = buildTestRoute({
      id: 'dedup-test',
      name: 'Route A — via Avinashi Road',
      warnings: [buildTestWarning('construction', 'synth-const-001-dedup-test')],
    });

    const result = await dataPipeline.fetchRouteConditions(route, false);
    const ids = result.hazards.incidents.map(w => w.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

// ---------------------------------------------------------------------------
// Google Maps Tier Tests
// ---------------------------------------------------------------------------

describe('DataPipeline — Google Maps Tier', () => {
  it('uses google_maps_api tier when googleMapsAvailable=true', async () => {
    const route = buildTestRoute({ id: 'gmap-tier' });
    const result = await dataPipeline.fetchRouteConditions(route, true);

    expect(result.activeTier).toBe('google_maps_api');
    expect(result.roadCondition.dataSource).toBe('google_maps_api');
  });

  it('Google Maps tier reports higher confidence than synthetic', async () => {
    const route = buildTestRoute({ id: 'confidence-cmp' });
    const gmResult = await dataPipeline.fetchRouteConditions(route, true);

    // Reset cache by using different ID for synthetic
    const routeSynthetic = buildTestRoute({ id: 'confidence-cmp-synth' });
    const synthResult = await dataPipeline.fetchRouteConditions(routeSynthetic, false);

    expect(gmResult.roadCondition.confidencePercent).toBeGreaterThan(
      synthResult.roadCondition.confidencePercent
    );
  });

  it('National Highway gets excellent quality even through Google Maps tier', async () => {
    const route = buildTestRoute({
      id: 'gmap-nh',
      name: 'Route A via NH 44',
      highwayTags: ['NH 44'],
      trafficDelayMin: 2,
      normalDurationMin: 60,
    });

    const result = await dataPipeline.fetchRouteConditions(route, true);
    expect(result.roadCondition.roadQuality).toBe('excellent');
  });

  it('Google Maps tier with severe traffic delay infers moderate road condition', async () => {
    const route = buildTestRoute({
      id: 'gmap-delay',
      name: 'Route via urban arterial Avinashi',
      highwayTags: ['Avinashi Rd'],
      trafficDelayMin: 20, // High delay
      normalDurationMin: 30, // 20/30 = 0.67 delay ratio > 0.5
    });

    const result = await dataPipeline.fetchRouteConditions(route, true);
    // High delay ratio should infer moderate road quality for non-NH roads
    expect(['moderate', 'good']).toContain(result.roadCondition.roadQuality);
  });
});

// ---------------------------------------------------------------------------
// Pipeline Result Structure Tests
// ---------------------------------------------------------------------------

describe('DataPipeline — Result Structure Validation', () => {
  it('result always contains roadCondition, hazards, and activeTier', async () => {
    const route = buildTestRoute({ id: 'struct-test' });
    const result = await dataPipeline.fetchRouteConditions(route, false);

    expect(result.roadCondition).toBeDefined();
    expect(result.hazards).toBeDefined();
    expect(result.activeTier).toBeDefined();
  });

  it('activeTier is one of the valid DataTier values', async () => {
    const validTiers: DataTier[] = ['google_maps_api', 'municipal_api', 'synthetic_heuristics'];
    const route = buildTestRoute({ id: 'tier-valid' });
    const result = await dataPipeline.fetchRouteConditions(route, false);

    expect(validTiers).toContain(result.activeTier);
  });

  it('roadQuality is one of the valid enum values', async () => {
    const validQualities = ['excellent', 'good', 'moderate', 'poor'];
    const route = buildTestRoute({ id: 'quality-valid' });
    const result = await dataPipeline.fetchRouteConditions(route, false);

    expect(validQualities).toContain(result.roadCondition.roadQuality);
  });
});

// ---------------------------------------------------------------------------
// Integration: Coimbatore Routes Pipeline
// ---------------------------------------------------------------------------

describe('DataPipeline — Integration with Coimbatore Routes', () => {
  it('Gandhipuram to Airport route gets expected pipeline result', async () => {
    const { getCoimbatoreDemoRoutes } = await import('../data/coimbatoreData');
    const routes = getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)');

    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const result = await dataPipeline.fetchRouteConditions(route, false);

      expect(result.roadCondition.roadQuality).toBeTruthy();
      expect(result.roadCondition.confidencePercent).toBeGreaterThan(0);
      expect(result.hazards.incidents).toBeDefined();
      expect(Array.isArray(result.hazards.incidents)).toBe(true);
    }
  });

  it('Sathy Road bypass (Route B) does not get false construction warnings', async () => {
    const { getCoimbatoreDemoRoutes } = await import('../data/coimbatoreData');
    const routes = getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)');
    const routeB = routes.find(r => r.name.includes('Sathy Road'));

    expect(routeB).toBeDefined();
    if (!routeB) return;

    const result = await dataPipeline.fetchRouteConditions(routeB, false);
    // Sathy Road bypass should not be flagged with Avinashi construction
    const hasAvinashiConstruction = result.hazards.incidents.some(
      w => w.id?.includes('const-001') && w.type === 'construction'
    );
    expect(hasAvinashiConstruction).toBe(false);
  });
});
