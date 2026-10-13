/**
 * RouteMind AI — Map Rendering & Route Score Output Tests
 *
 * Validates that:
 *   1. Route coordinate data is valid for map rendering (lat/lng bounds, point density)
 *   2. All routes have renderable polyline coordinates
 *   3. Origin/destination markers are extractable
 *   4. Incident warning markers have valid coordinates when specified
 *   5. Route score outputs are valid and consistent across all data sets
 *   6. Step-by-step navigation instructions are valid
 *
 * Reference: MapContainer.tsx (Leaflet + Google Maps dual rendering)
 */

import { describe, it, expect } from 'vitest';
import { getCoimbatoreDemoRoutes } from '../data/coimbatoreData';
import { getInterDistrictDemoRoutes } from '../data/interDistrictData';
import { generateAIRecommendation } from '../services/aiScoringEngine';
import { RouteOption, LatLng } from '../types/navigation';

// ---------------------------------------------------------------------------
// Coordinate Validity Helpers
// ---------------------------------------------------------------------------

/** Tamil Nadu geographic bounding box */
const TN_BOUNDS = {
  minLat: 8.0,
  maxLat: 14.0,
  minLng: 76.0,
  maxLng: 81.0,
};

/** Karnataka + Tamil Nadu extended box (for Bengaluru routes) */
const SOUTH_INDIA_BOUNDS = {
  minLat: 7.0,
  maxLat: 14.5,
  minLng: 74.0,
  maxLng: 81.0,
};

function isValidCoord(coord: LatLng, bounds = TN_BOUNDS): boolean {
  return (
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng) &&
    coord.lat >= bounds.minLat &&
    coord.lat <= bounds.maxLat &&
    coord.lng >= bounds.minLng &&
    coord.lng <= bounds.maxLng
  );
}

function isRenderablePolyline(coords: LatLng[]): boolean {
  return coords.length >= 2; // Need at least 2 points to draw a line
}

// ---------------------------------------------------------------------------
// Map Rendering — Coimbatore Local Routes
// ---------------------------------------------------------------------------

describe('Map Rendering — Coimbatore Local Routes', () => {
  const scenarios = [
    ['Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)'],
    ['RS Puram', 'Singanallur'],
    ['Ukkadam Bus Stand', 'Peelamedu'],
  ];

  scenarios.forEach(([origin, dest]) => {
    it(`"${origin} → ${dest}" — all routes have renderable coordinate polylines`, () => {
      const routes = getCoimbatoreDemoRoutes(origin, dest);
      expect(routes.length).toBeGreaterThan(0);

      routes.forEach(route => {
        expect(isRenderablePolyline(route.coordinates)).toBe(true);
      });
    });

    it(`"${origin} → ${dest}" — all coordinates are within Tamil Nadu geographic bounds`, () => {
      const routes = getCoimbatoreDemoRoutes(origin, dest);
      routes.forEach(route => {
        route.coordinates.forEach((coord, i) => {
          expect(isValidCoord(coord), `Route ${route.id} coordinate[${i}] ${JSON.stringify(coord)} is out of TN bounds`).toBe(true);
        });
      });
    });

    it(`"${origin} → ${dest}" — origin and destination markers can be extracted`, () => {
      const routes = getCoimbatoreDemoRoutes(origin, dest);
      routes.forEach(route => {
        const originCoord = route.coordinates[0];
        const destCoord = route.coordinates[route.coordinates.length - 1];

        expect(originCoord).toBeDefined();
        expect(destCoord).toBeDefined();
        expect(isValidCoord(originCoord)).toBe(true);
        expect(isValidCoord(destCoord)).toBe(true);
        // Origin and destination should be different points
        expect(originCoord.lat === destCoord.lat && originCoord.lng === destCoord.lng).toBe(false);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Map Rendering — Incident Warning Marker Coordinates
// ---------------------------------------------------------------------------

describe('Map Rendering — Incident Warning Markers', () => {
  it('warning markers with lat/lng are within Tamil Nadu bounds', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)');
    routes.forEach(route => {
      route.warnings.forEach(w => {
        if (w.lat !== undefined && w.lng !== undefined) {
          expect(isValidCoord({ lat: w.lat, lng: w.lng })).toBe(true);
        }
      });
    });
  });

  it('inter-district warning markers with coordinates are within South India bounds', () => {
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Chennai (Central)');
    routes.forEach(route => {
      route.warnings.forEach(w => {
        if (w.lat !== undefined && w.lng !== undefined) {
          expect(isValidCoord({ lat: w.lat, lng: w.lng }, SOUTH_INDIA_BOUNDS)).toBe(true);
        }
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Map Rendering — Inter-District Routes
// ---------------------------------------------------------------------------

describe('Map Rendering — Inter-District Routes', () => {
  const interDistrictScenarios = [
    'Chennai (Central)',
    'Ooty (Charring Cross)',
    'Bengaluru (Electronic City)',
    'Madurai (Mattuthavani)',
    'Salem (New Bus Stand)',
    'Tiruppur (Old Bus Stand)',
  ] as const;

  interDistrictScenarios.forEach(dest => {
    it(`Coimbatore → "${dest}" — routes have renderable coordinates`, () => {
      const routes = getInterDistrictDemoRoutes('Coimbatore', dest);
      expect(routes.length).toBeGreaterThan(0);

      routes.forEach(route => {
        expect(isRenderablePolyline(route.coordinates)).toBe(true);
      });
    });

    it(`Coimbatore → "${dest}" — coordinates within South India geographic bounds`, () => {
      const routes = getInterDistrictDemoRoutes('Coimbatore', dest);
      routes.forEach(route => {
        route.coordinates.forEach((coord, i) => {
          expect(
            isValidCoord(coord, SOUTH_INDIA_BOUNDS),
            `Route ${route.id} coord[${i}] = ${JSON.stringify(coord)} is out of South India bounds`
          ).toBe(true);
        });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Route Score Outputs — All Data Sets
// ---------------------------------------------------------------------------

describe('Route Score Outputs — Gandhipuram → Airport', () => {
  const routes = getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)');

  it('all routes produce valid AI scores after generateAIRecommendation', () => {
    const { scoredRoutes } = generateAIRecommendation(routes, 'balanced');
    scoredRoutes.forEach(r => {
      expect(r.aiScore).toBeGreaterThanOrEqual(40);
      expect(r.aiScore).toBeLessThanOrEqual(99);
    });
  });

  it('recommendation identifies a valid route ID', () => {
    const { recommendation } = generateAIRecommendation(routes, 'balanced');
    const validIds = routes.map(r => r.id);
    expect(validIds).toContain(recommendation.recommendedRouteId);
  });

  it('Route B (Sathy Road bypass) is recommended under balanced preference', () => {
    const { recommendation } = generateAIRecommendation(routes, 'balanced');
    const recommended = routes.find(r => r.id === recommendation.recommendedRouteId);
    // Route B has better AI score due to zero warnings and excellent road quality
    expect(recommended?.name).toContain('Sathy');
  });

  it('Route A (Avinashi Road) scores lower due to construction warnings', () => {
    const { scoredRoutes } = generateAIRecommendation(routes, 'balanced');
    const routeA = scoredRoutes.find(r => r.name.includes('Avinashi'));
    const routeB = scoredRoutes.find(r => r.name.includes('Sathy'));
    expect(routeA).toBeDefined();
    expect(routeB).toBeDefined();
    if (routeA && routeB) {
      expect(routeB.aiScore).toBeGreaterThan(routeA.aiScore);
    }
  });

  it('under fastest preference, time-dominant scoring may change ranking', () => {
    const { recommendation: fastestRec } = generateAIRecommendation(routes, 'fastest');
    const { recommendation: safestRec } = generateAIRecommendation(routes, 'safest');
    // Both should still be valid route IDs
    expect(routes.map(r => r.id)).toContain(fastestRec.recommendedRouteId);
    expect(routes.map(r => r.id)).toContain(safestRec.recommendedRouteId);
  });

  it('score breakdown fields are all non-negative', () => {
    const { scoredRoutes } = generateAIRecommendation(routes, 'balanced');
    scoredRoutes.forEach(r => {
      const b = r.scoreBreakdown;
      expect(b.travelTimeScore).toBeGreaterThanOrEqual(0);
      expect(b.trafficScore).toBeGreaterThanOrEqual(0);
      expect(b.safetyScore).toBeGreaterThanOrEqual(0);
      expect(b.roadConditionScore).toBeGreaterThanOrEqual(0);
      expect(b.distanceScore).toBeGreaterThanOrEqual(0);
      expect(b.rawScore).toBeGreaterThan(0);
    });
  });
});

describe('Route Score Outputs — Coimbatore → Ooty (Inter-District)', () => {
  const routes = getInterDistrictDemoRoutes('Coimbatore', 'Ooty (Charring Cross)');

  it('all Ooty routes produce valid AI scores', () => {
    const { scoredRoutes } = generateAIRecommendation(routes, 'safest');
    scoredRoutes.forEach(r => {
      expect(r.aiScore).toBeGreaterThanOrEqual(40);
      expect(r.aiScore).toBeLessThanOrEqual(99);
    });
  });

  it('under safest preference, Kotagiri route is preferred (fewer warnings)', () => {
    const { recommendation } = generateAIRecommendation(routes, 'safest');
    const recommended = routes.find(r => r.id === recommendation.recommendedRouteId);
    // Kotagiri has zero warnings; Coonoor ghat has 2
    expect(recommended?.name).toContain('Kotagiri');
  });

  it('recommendation has meaningful headline text', () => {
    const { recommendation } = generateAIRecommendation(routes, 'balanced');
    expect(recommendation.headline).toBeTruthy();
    expect(recommendation.headline.length).toBeGreaterThan(20);
  });

  it('recommendation reasons array is non-empty', () => {
    const { recommendation } = generateAIRecommendation(routes, 'balanced');
    expect(recommendation.reasons.length).toBeGreaterThan(0);
  });
});

describe('Route Score Outputs — Coimbatore → Chennai', () => {
  const routes = getInterDistrictDemoRoutes('Coimbatore', 'Chennai (Central)');

  it('Chennai routes have step-by-step navigation instructions for map rendering', () => {
    routes.forEach(route => {
      expect(route.steps.length).toBeGreaterThan(0);
      route.steps.forEach(step => {
        expect(step.instruction).toBeTruthy();
        expect(step.distanceMeters).toBeGreaterThan(0);
        expect(step.durationSeconds).toBeGreaterThan(0);
        expect(step.streetName).toBeTruthy();
        // Step start coordinates should be valid
        expect(isValidCoord({ lat: step.lat, lng: step.lng }, SOUTH_INDIA_BOUNDS)).toBe(true);
      });
    });
  });

  it('all Chennai routes produce valid score outputs for all 5 preference profiles', () => {
    const preferences = ['fastest', 'safest', 'balanced', 'shortest', 'fuel'] as const;
    preferences.forEach(pref => {
      const { scoredRoutes, recommendation } = generateAIRecommendation(routes, pref);
      expect(scoredRoutes.length).toBe(routes.length);
      expect(recommendation.preferenceUsed).toBe(pref);
      scoredRoutes.forEach(r => {
        expect(r.aiScore).toBeGreaterThanOrEqual(40);
        expect(r.aiScore).toBeLessThanOrEqual(99);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Map Rendering — Polyline Continuity
// ---------------------------------------------------------------------------

describe('Map Rendering — Polyline Continuity', () => {
  it('consecutive coordinate points have reasonable geographic distance (< 2 degrees)', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)');
    routes.forEach(route => {
      for (let i = 0; i < route.coordinates.length - 1; i++) {
        const p1 = route.coordinates[i];
        const p2 = route.coordinates[i + 1];
        const latDiff = Math.abs(p1.lat - p2.lat);
        const lngDiff = Math.abs(p1.lng - p2.lng);
        // No single step should jump more than 2 degrees (~222 km) — catches teleportation bugs
        expect(latDiff).toBeLessThan(2);
        expect(lngDiff).toBeLessThan(2);
      }
    });
  });

  it('inter-district routes maintain geographic continuity', () => {
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Salem (New Bus Stand)');
    routes.forEach(route => {
      for (let i = 0; i < route.coordinates.length - 1; i++) {
        const p1 = route.coordinates[i];
        const p2 = route.coordinates[i + 1];
        const latDiff = Math.abs(p1.lat - p2.lat);
        const lngDiff = Math.abs(p1.lng - p2.lng);
        expect(latDiff).toBeLessThan(3); // Inter-district can have larger jumps
        expect(lngDiff).toBeLessThan(3);
      }
    });
  });

  it('minimum point density: at least 5 coordinates per route for smooth polyline', () => {
    const routes = getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)');
    routes.forEach(route => {
      expect(route.coordinates.length).toBeGreaterThanOrEqual(5);
    });
  });
});

// ---------------------------------------------------------------------------
// Map Rendering — Route Metadata Completeness
// ---------------------------------------------------------------------------

describe('Map Rendering — Route Metadata for UI Rendering', () => {
  it('all routes have required UI rendering fields', () => {
    const allRoutes: RouteOption[] = [
      ...getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)'),
      ...getInterDistrictDemoRoutes('Coimbatore', 'Chennai (Central)'),
    ];

    allRoutes.forEach(route => {
      expect(route.id).toBeTruthy();
      expect(route.name).toBeTruthy();
      expect(route.tag).toBeTruthy();
      expect(route.distanceKm).toBeGreaterThan(0);
      expect(route.durationMin).toBeGreaterThan(0);
      expect(route.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(route.trafficStatus).toMatch(/^(low|moderate|heavy|severe)$/);
      expect(route.roadQuality).toMatch(/^(excellent|good|moderate|poor)$/);
    });
  });

  it('route IDs are unique across all scenarios', () => {
    const allRoutes: RouteOption[] = [
      ...getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)'),
      ...getCoimbatoreDemoRoutes('RS Puram', 'Singanallur'),
      ...getInterDistrictDemoRoutes('Coimbatore', 'Chennai (Central)'),
      ...getInterDistrictDemoRoutes('Coimbatore', 'Ooty (Charring Cross)'),
    ];

    const ids = allRoutes.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});
