/**
 * RouteMind AI — Data Pipeline & Map Rendering Test Suite
 *
 * Validates:
 *   - Route data integrity (coordinates, steps, warnings structure)
 *   - Interpolation function correctness
 *   - Data pipeline contract compliance
 *   - Map-renderable coordinate output
 */

import { describe, it, expect } from 'vitest';
import {
  COIMBATORE_PRESETS,
  getCoimbatoreDemoRoutes,
  interpolatePoints,
} from './coimbatoreData';
import {
  INTER_DISTRICT_PRESETS,
  getInterDistrictDemoRoutes,
} from './interDistrictData';

// ---------------------------------------------------------------------------
// Preset Location Validation
// ---------------------------------------------------------------------------

describe('COIMBATORE_PRESETS — Location Data Integrity', () => {
  it('contains at least 10 preset locations', () => {
    expect(COIMBATORE_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it('all presets have valid coordinates within Coimbatore region', () => {
    COIMBATORE_PRESETS.forEach((loc) => {
      expect(loc.lat).toBeGreaterThan(10.5);
      expect(loc.lat).toBeLessThan(11.5);
      expect(loc.lng).toBeGreaterThan(76.5);
      expect(loc.lng).toBeLessThan(77.5);
      expect(loc.name).toBeTruthy();
      expect(loc.category).toBeTruthy();
      expect(loc.subtitle).toBeTruthy();
    });
  });
});

describe('INTER_DISTRICT_PRESETS — Location Data Integrity', () => {
  it('contains at least 5 district destinations', () => {
    expect(INTER_DISTRICT_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it('all presets have valid coordinates within South India region', () => {
    INTER_DISTRICT_PRESETS.forEach((loc) => {
      expect(loc.lat).toBeGreaterThan(8);
      expect(loc.lat).toBeLessThan(14);
      expect(loc.lng).toBeGreaterThan(76);
      expect(loc.lng).toBeLessThan(81);
      expect(loc.name).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Coordinate Interpolation
// ---------------------------------------------------------------------------

describe('interpolatePoints — Polyline Generation', () => {
  it('returns start and end point when no waypoints given', () => {
    const start = { lat: 11.0, lng: 77.0 };
    const end = { lat: 11.1, lng: 77.1 };
    const result = interpolatePoints(start, end);

    expect(result[0]).toEqual(start);
    expect(result[result.length - 1]).toEqual(end);
  });

  it('produces more points than input for smooth rendering', () => {
    const start = { lat: 11.0, lng: 77.0 };
    const end = { lat: 11.1, lng: 77.1 };
    const result = interpolatePoints(start, end);

    // With 6 interpolation steps, should have 8 points total (start + 5 + end + end)
    expect(result.length).toBeGreaterThan(2);
  });

  it('includes waypoints in output', () => {
    const start = { lat: 11.0, lng: 77.0 };
    const end = { lat: 11.2, lng: 77.2 };
    const waypoints = [{ lat: 11.1, lng: 77.1 }];
    const result = interpolatePoints(start, end, waypoints);

    // The waypoint should appear in the result
    const hasWaypoint = result.some(
      (p) => Math.abs(p.lat - 11.1) < 0.001 && Math.abs(p.lng - 77.1) < 0.001
    );
    expect(hasWaypoint).toBe(true);
  });

  it('jitter adds variation to intermediate points', () => {
    const start = { lat: 11.0, lng: 77.0 };
    const end = { lat: 11.1, lng: 77.1 };
    const noJitter = interpolatePoints(start, end, [], 0);
    const withJitter = interpolatePoints(start, end, [], 0.005);

    // At least some intermediate points should differ
    let hasDifference = false;
    for (let i = 1; i < Math.min(noJitter.length, withJitter.length) - 1; i++) {
      if (noJitter[i].lat !== withJitter[i].lat || noJitter[i].lng !== withJitter[i].lng) {
        hasDifference = true;
        break;
      }
    }
    expect(hasDifference).toBe(true);
  });

  it('all interpolated points have valid lat/lng numbers', () => {
    const start = { lat: 11.0, lng: 77.0 };
    const end = { lat: 11.5, lng: 77.5 };
    const result = interpolatePoints(start, end, [{ lat: 11.2, lng: 77.2 }], 0.002);

    result.forEach((p) => {
      expect(typeof p.lat).toBe('number');
      expect(typeof p.lng).toBe('number');
      expect(isNaN(p.lat)).toBe(false);
      expect(isNaN(p.lng)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Route Data Contract — Coimbatore Local
// ---------------------------------------------------------------------------

describe('getCoimbatoreDemoRoutes — Route Data Contract', () => {
  it('Gandhipuram→Airport returns at least 2 candidate routes', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram', 'Airport');
    expect(routes.length).toBeGreaterThanOrEqual(2);
  });

  it('all routes have required fields for scoring engine', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram', 'Airport');
    routes.forEach((r) => {
      // Identification
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.tag).toBeTruthy();

      // Scoring input metrics
      expect(typeof r.durationMin).toBe('number');
      expect(r.durationMin).toBeGreaterThan(0);
      expect(typeof r.distanceKm).toBe('number');
      expect(r.distanceKm).toBeGreaterThan(0);
      expect(typeof r.normalDurationMin).toBe('number');
      expect(typeof r.trafficDelayMin).toBe('number');
      expect(['low', 'moderate', 'heavy', 'severe']).toContain(r.trafficStatus);
      expect(['excellent', 'good', 'moderate', 'poor']).toContain(r.roadQuality);
      expect(Array.isArray(r.warnings)).toBe(true);

      // Map rendering data
      expect(r.coordinates.length).toBeGreaterThan(1);
      expect(r.steps.length).toBeGreaterThan(0);
    });
  });

  it('all warnings have valid structure', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram', 'Airport');
    routes.forEach((r) => {
      r.warnings.forEach((w) => {
        expect(w.id).toBeTruthy();
        expect(w.type).toBeTruthy();
        expect(w.title).toBeTruthy();
        expect(w.description).toBeTruthy();
        expect(['low', 'moderate', 'high', 'critical']).toContain(w.severity);
        expect(w.locationName).toBeTruthy();
      });
    });
  });

  it('routes have distinct IDs', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram', 'Airport');
    const ids = routes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('route coordinates form a plottable polyline (at least 5 points per route)', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram', 'Airport');
    routes.forEach((r) => {
      expect(r.coordinates.length).toBeGreaterThanOrEqual(5);
      // First and last coordinates should be roughly start/end
      const first = r.coordinates[0];
      const last = r.coordinates[r.coordinates.length - 1];
      expect(first.lat).not.toBe(last.lat); // Route should cover distance
    });
  });

  it('default fallback routes are returned for unknown origin/destination', () => {
    const routes = getCoimbatoreDemoRoutes('Unknown Place', 'Another Unknown');
    expect(routes.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Route Data Contract — Inter-District
// ---------------------------------------------------------------------------

describe('getInterDistrictDemoRoutes — Route Data Contract', () => {
  it('Coimbatore→Ooty returns at least 2 routes', () => {
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Ooty');
    expect(routes.length).toBeGreaterThanOrEqual(2);
  });

  it('Coimbatore→Chennai returns at least 2 routes', () => {
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Chennai');
    expect(routes.length).toBeGreaterThanOrEqual(2);
  });

  it('inter-district routes have highway tags and realistic distances', () => {
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Chennai');
    routes.forEach((r) => {
      expect(r.highwayTags).toBeDefined();
      expect(r.highwayTags!.length).toBeGreaterThan(0);
      expect(r.distanceKm).toBeGreaterThan(50); // Inter-district should be >50km
    });
  });

  it('Ooty routes include weather or terrain warnings', () => {
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Ooty');
    const hasWeatherOrTrafficWarnings = routes.some(
      (r) => r.warnings.some((w) => w.type === 'weather' || w.type === 'traffic')
    );
    expect(hasWeatherOrTrafficWarnings).toBe(true);
  });

  it('toll count is defined for inter-district routes', () => {
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Chennai');
    routes.forEach((r) => {
      expect(r.tollCount).toBeDefined();
      expect(r.tollCount).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// End-to-End: Data Pipeline → Scoring → Map-Ready Output
// ---------------------------------------------------------------------------

describe('End-to-End — Data Pipeline → Scoring → Map Output', () => {
  it('complete pipeline produces map-renderable scored routes', async () => {
    const { generateAIRecommendation } = await import('../services/aiScoringEngine');
    const routes = getCoimbatoreDemoRoutes('Gandhipuram', 'Airport');

    const { scoredRoutes, recommendation } = generateAIRecommendation(routes, 'balanced');

    // Every scored route should be renderable on a map
    scoredRoutes.forEach((r) => {
      // Has valid score
      expect(r.aiScore).toBeGreaterThanOrEqual(40);
      expect(r.aiScore).toBeLessThanOrEqual(99);

      // Has renderable polyline
      expect(r.coordinates.length).toBeGreaterThan(1);
      r.coordinates.forEach((c) => {
        expect(c.lat).toBeGreaterThan(10);
        expect(c.lat).toBeLessThan(12);
        expect(c.lng).toBeGreaterThan(76);
        expect(c.lng).toBeLessThan(78);
      });

      // Has score breakdown for UI dashboard
      expect(r.scoreBreakdown.travelTimeScore).toBeDefined();
      expect(r.scoreBreakdown.trafficScore).toBeDefined();
      expect(r.scoreBreakdown.safetyScore).toBeDefined();
      expect(r.scoreBreakdown.roadConditionScore).toBeDefined();
      expect(r.scoreBreakdown.distanceScore).toBeDefined();
      expect(r.scoreBreakdown.weightsApplied).toBeDefined();
    });

    // Has valid recommendation
    expect(recommendation.recommendedRouteId).toBeTruthy();
    expect(recommendation.headline).toBeTruthy();
    expect(recommendation.detailedExplanation).toBeTruthy();
    expect(recommendation.reasons.length).toBeGreaterThan(0);
  });
});
