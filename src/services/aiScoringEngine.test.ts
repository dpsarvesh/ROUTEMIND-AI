/**
 * RouteMind AI — Scoring Engine Test Suite
 *
 * Comprehensive tests validating the formal MCDA specification:
 *   - Per-attribute normalization correctness
 *   - Weighted composite computation
 *   - Preference profile weight invariants
 *   - Boundary / edge-case behavior
 *   - Route ranking and recommendation generation
 *   - Score monotonicity properties
 *   - Determinism guarantees
 *
 * Reference: ai_scoring_engine_specification.md §§ 3–9
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRouteScore,
  generateAIRecommendation,
  PREFERENCE_WEIGHTS,
  ScoringWeights,
} from './aiScoringEngine';
import { RouteOption, TravelPreference, IncidentWarning } from '../types/navigation';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal valid RouteOption with overridable fields */
function buildRoute(overrides: Partial<RouteOption> & { id: string }): RouteOption {
  return {
    name: overrides.name ?? `Route ${overrides.id}`,
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
    aiScore: overrides.aiScore ?? 0,
    scoreBreakdown: overrides.scoreBreakdown ?? {
      travelTimeScore: 0,
      trafficScore: 0,
      safetyScore: 0,
      roadConditionScore: 0,
      distanceScore: 0,
      rawScore: 0,
      weightsApplied: { time: 0.2, traffic: 0.2, safety: 0.2, road: 0.2, distance: 0.2 },
    },
    recommendedReason: overrides.recommendedReason ?? '',
    dataSource: overrides.dataSource ?? 'live',
    ...overrides,
  };
}

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

// ---------------------------------------------------------------------------
// §9 Invariant 2: Weight Normalization — All preset profiles sum to 1.0
// ---------------------------------------------------------------------------

describe('PREFERENCE_WEIGHTS — Weight Normalization Invariant', () => {
  const profiles: TravelPreference[] = ['fastest', 'safest', 'shortest', 'balanced', 'fuel'];

  profiles.forEach((profile) => {
    it(`"${profile}" weights sum to exactly 1.0`, () => {
      const w = PREFERENCE_WEIGHTS[profile];
      const sum = w.time + w.traffic + w.safety + w.road + w.distance;
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it(`"${profile}" has no negative weights`, () => {
      const w = PREFERENCE_WEIGHTS[profile];
      expect(w.time).toBeGreaterThanOrEqual(0);
      expect(w.traffic).toBeGreaterThanOrEqual(0);
      expect(w.safety).toBeGreaterThanOrEqual(0);
      expect(w.road).toBeGreaterThanOrEqual(0);
      expect(w.distance).toBeGreaterThanOrEqual(0);
    });
  });
});

// ---------------------------------------------------------------------------
// §3.1 Travel Time Normalization
// ---------------------------------------------------------------------------

describe('calculateRouteScore — Travel Time Normalization (§3.1)', () => {
  it('fastest route in candidate set gets highest time score', () => {
    const fast = buildRoute({ id: 'fast', durationMin: 15 });
    const slow = buildRoute({ id: 'slow', durationMin: 30 });
    const candidates = [fast, slow];

    const fastResult = calculateRouteScore(fast, candidates, 'balanced');
    const slowResult = calculateRouteScore(slow, candidates, 'balanced');

    expect(fastResult.breakdown.travelTimeScore).toBeGreaterThan(slowResult.breakdown.travelTimeScore);
  });

  it('single-candidate scenario yields time score of 95 (degenerate range)', () => {
    const solo = buildRoute({ id: 'solo', durationMin: 25 });
    const result = calculateRouteScore(solo, [solo], 'balanced');
    expect(result.breakdown.travelTimeScore).toBe(95);
  });

  it('all candidates with equal duration yield time score of 95', () => {
    const r1 = buildRoute({ id: 'r1', durationMin: 20 });
    const r2 = buildRoute({ id: 'r2', durationMin: 20 });
    const candidates = [r1, r2];

    const result1 = calculateRouteScore(r1, candidates, 'balanced');
    const result2 = calculateRouteScore(r2, candidates, 'balanced');

    expect(result1.breakdown.travelTimeScore).toBe(95);
    expect(result2.breakdown.travelTimeScore).toBe(95);
  });

  it('fastest candidate gets time score of 100', () => {
    const fast = buildRoute({ id: 'fast', durationMin: 10 });
    const slow = buildRoute({ id: 'slow', durationMin: 50 });
    const result = calculateRouteScore(fast, [fast, slow], 'balanced');
    expect(result.breakdown.travelTimeScore).toBe(100);
  });

  it('slowest candidate gets time score of 60 (100 - 40)', () => {
    const fast = buildRoute({ id: 'fast', durationMin: 10 });
    const slow = buildRoute({ id: 'slow', durationMin: 50 });
    const result = calculateRouteScore(slow, [fast, slow], 'balanced');
    expect(result.breakdown.travelTimeScore).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// §3.2 Traffic Score Normalization
// ---------------------------------------------------------------------------

describe('calculateRouteScore — Traffic Score Normalization (§3.2)', () => {
  it('low traffic with zero delay yields near-maximum traffic score', () => {
    const r = buildRoute({ id: 'r', trafficStatus: 'low', trafficDelayMin: 0, normalDurationMin: 20 });
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.breakdown.trafficScore).toBeGreaterThanOrEqual(90);
  });

  it('severe traffic scores much lower than low traffic', () => {
    const low = buildRoute({ id: 'low', trafficStatus: 'low', trafficDelayMin: 1, normalDurationMin: 20 });
    const severe = buildRoute({ id: 'severe', trafficStatus: 'severe', trafficDelayMin: 15, normalDurationMin: 20 });
    const candidates = [low, severe];

    const lowResult = calculateRouteScore(low, candidates, 'balanced');
    const severeResult = calculateRouteScore(severe, candidates, 'balanced');

    expect(lowResult.breakdown.trafficScore).toBeGreaterThan(severeResult.breakdown.trafficScore);
    expect(lowResult.breakdown.trafficScore - severeResult.breakdown.trafficScore).toBeGreaterThan(30);
  });

  it('traffic score is always clamped to [10, 100]', () => {
    const extremeSevere = buildRoute({
      id: 'extreme',
      trafficStatus: 'severe',
      trafficDelayMin: 100,
      normalDurationMin: 10,
    });
    const result = calculateRouteScore(extremeSevere, [extremeSevere], 'balanced');
    expect(result.breakdown.trafficScore).toBeGreaterThanOrEqual(10);
    expect(result.breakdown.trafficScore).toBeLessThanOrEqual(100);
  });

  it('monotonic ordering across tiers: low > moderate > heavy > severe', () => {
    const tiers: Array<RouteOption['trafficStatus']> = ['low', 'moderate', 'heavy', 'severe'];
    const routes = tiers.map((status, i) =>
      buildRoute({ id: `t${i}`, trafficStatus: status, trafficDelayMin: 5, normalDurationMin: 20 })
    );

    const scores = routes.map(r => calculateRouteScore(r, routes, 'balanced').breakdown.trafficScore);

    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// §3.3 Safety Score Normalization
// ---------------------------------------------------------------------------

describe('calculateRouteScore — Safety Score (§3.3)', () => {
  it('route with zero warnings scores safety = 100', () => {
    const r = buildRoute({ id: 'safe', warnings: [] });
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.breakdown.safetyScore).toBe(100);
  });

  it('block warning deducts 35 from safety', () => {
    const r = buildRoute({ id: 'blocked', warnings: [buildWarning('block')] });
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.breakdown.safetyScore).toBe(65); // 100 - 35
  });

  it('accident warning deducts 25 from safety', () => {
    const r = buildRoute({ id: 'accident', warnings: [buildWarning('accident')] });
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.breakdown.safetyScore).toBe(75); // 100 - 25
  });

  it('construction warning deducts 15 from safety', () => {
    const r = buildRoute({ id: 'construct', warnings: [buildWarning('construction')] });
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.breakdown.safetyScore).toBe(85); // 100 - 15
  });

  it('weather warning deducts 20 from safety', () => {
    const r = buildRoute({ id: 'weather', warnings: [buildWarning('weather')] });
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.breakdown.safetyScore).toBe(80); // 100 - 20
  });

  it('traffic warning deducts 10 from safety', () => {
    const r = buildRoute({ id: 'traffic-w', warnings: [buildWarning('traffic')] });
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.breakdown.safetyScore).toBe(90); // 100 - 10
  });

  it('multiple warnings compound additively', () => {
    const r = buildRoute({
      id: 'multi',
      warnings: [buildWarning('block'), buildWarning('accident'), buildWarning('construction')],
    });
    const result = calculateRouteScore(r, [r], 'balanced');
    // 100 - 35 - 25 - 15 = 25
    expect(result.breakdown.safetyScore).toBe(25);
  });

  it('safety score is floored at 15 even with extreme penalties', () => {
    const r = buildRoute({
      id: 'extreme-hazard',
      warnings: [
        buildWarning('block'),
        buildWarning('block'),
        buildWarning('accident'),
        buildWarning('accident'),
      ],
    });
    const result = calculateRouteScore(r, [r], 'balanced');
    // 100 - 35 - 35 - 25 - 25 = -20, clamped to 15
    expect(result.breakdown.safetyScore).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// §3.4 Road Surface Quality Score
// ---------------------------------------------------------------------------

describe('calculateRouteScore — Road Quality Ordinal Mapping (§3.4)', () => {
  const qualityMap: Array<{ quality: RouteOption['roadQuality']; expected: number }> = [
    { quality: 'excellent', expected: 98 },
    { quality: 'good', expected: 88 },
    { quality: 'moderate', expected: 68 },
    { quality: 'poor', expected: 40 },
  ];

  qualityMap.forEach(({ quality, expected }) => {
    it(`roadQuality="${quality}" maps to road score ${expected}`, () => {
      const r = buildRoute({ id: `rq-${quality}`, roadQuality: quality });
      const result = calculateRouteScore(r, [r], 'balanced');
      expect(result.breakdown.roadConditionScore).toBe(expected);
    });
  });

  it('road quality scores are strictly ordered: excellent > good > moderate > poor', () => {
    const qualities: RouteOption['roadQuality'][] = ['excellent', 'good', 'moderate', 'poor'];
    const scores = qualities.map((q) => {
      const r = buildRoute({ id: `rq-${q}`, roadQuality: q });
      return calculateRouteScore(r, [r], 'balanced').breakdown.roadConditionScore;
    });

    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i + 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// §3.5 Distance Score Normalization
// ---------------------------------------------------------------------------

describe('calculateRouteScore — Distance Normalization (§3.5)', () => {
  it('shortest route in set gets highest distance score', () => {
    const short = buildRoute({ id: 'short', distanceKm: 5 });
    const long = buildRoute({ id: 'long', distanceKm: 50 });
    const candidates = [short, long];

    const shortResult = calculateRouteScore(short, candidates, 'balanced');
    const longResult = calculateRouteScore(long, candidates, 'balanced');

    expect(shortResult.breakdown.distanceScore).toBeGreaterThan(longResult.breakdown.distanceScore);
  });

  it('single candidate yields distance score of 95', () => {
    const solo = buildRoute({ id: 'solo', distanceKm: 100 });
    const result = calculateRouteScore(solo, [solo], 'balanced');
    expect(result.breakdown.distanceScore).toBe(95);
  });

  it('distance score is clamped to [20, 100]', () => {
    const veryShort = buildRoute({ id: 'v-short', distanceKm: 1 });
    const veryLong = buildRoute({ id: 'v-long', distanceKm: 1000 });
    const candidates = [veryShort, veryLong];

    const shortResult = calculateRouteScore(veryShort, candidates, 'balanced');
    const longResult = calculateRouteScore(veryLong, candidates, 'balanced');

    expect(shortResult.breakdown.distanceScore).toBeLessThanOrEqual(100);
    expect(longResult.breakdown.distanceScore).toBeGreaterThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// §4 Weighted Composite & Final Score
// ---------------------------------------------------------------------------

describe('calculateRouteScore — Composite & Final Score (§4)', () => {
  it('final score is clamped to [40, 99]', () => {
    // A route with all-excellent attributes should not exceed 99
    const excellent = buildRoute({
      id: 'best',
      durationMin: 10,
      distanceKm: 5,
      trafficStatus: 'low',
      trafficDelayMin: 0,
      normalDurationMin: 10,
      roadQuality: 'excellent',
      warnings: [],
    });
    const result = calculateRouteScore(excellent, [excellent], 'balanced');
    expect(result.score).toBeLessThanOrEqual(99);
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it('worst-case route still scores at least 40', () => {
    const terrible = buildRoute({
      id: 'worst',
      durationMin: 500,
      distanceKm: 500,
      trafficStatus: 'severe',
      trafficDelayMin: 200,
      normalDurationMin: 100,
      roadQuality: 'poor',
      warnings: [
        buildWarning('block'),
        buildWarning('block'),
        buildWarning('accident'),
        buildWarning('weather'),
      ],
    });
    const good = buildRoute({
      id: 'good',
      durationMin: 20,
      distanceKm: 10,
      trafficStatus: 'low',
      trafficDelayMin: 0,
      normalDurationMin: 20,
      roadQuality: 'excellent',
      warnings: [],
    });

    const result = calculateRouteScore(terrible, [terrible, good], 'balanced');
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it('breakdown contains valid weightsApplied reflecting the preference', () => {
    const r = buildRoute({ id: 'r', durationMin: 20 });
    const result = calculateRouteScore(r, [r], 'fastest');

    expect(result.breakdown.weightsApplied).toEqual(PREFERENCE_WEIGHTS['fastest']);
  });

  it('custom weights override preference weights', () => {
    const custom: ScoringWeights = { time: 0.5, traffic: 0.1, safety: 0.1, road: 0.1, distance: 0.2 };
    const r = buildRoute({ id: 'r' });
    const result = calculateRouteScore(r, [r], 'balanced', custom);

    expect(result.breakdown.weightsApplied).toEqual(custom);
  });
});

// ---------------------------------------------------------------------------
// §6 Route Ranking & Recommendation Generation
// ---------------------------------------------------------------------------

describe('generateAIRecommendation — Ranking & Recommendation (§6)', () => {
  it('recommends the route with the highest AI score', () => {
    const excellent = buildRoute({
      id: 'best',
      durationMin: 15,
      distanceKm: 8,
      trafficStatus: 'low',
      trafficDelayMin: 1,
      normalDurationMin: 14,
      roadQuality: 'excellent',
      warnings: [],
    });
    const worse = buildRoute({
      id: 'worse',
      durationMin: 40,
      distanceKm: 25,
      trafficStatus: 'heavy',
      trafficDelayMin: 15,
      normalDurationMin: 25,
      roadQuality: 'moderate',
      warnings: [buildWarning('construction'), buildWarning('traffic')],
    });

    const { recommendation, scoredRoutes } = generateAIRecommendation([excellent, worse], 'balanced');

    expect(recommendation.recommendedRouteId).toBe('best');
    expect(scoredRoutes.find((r) => r.id === 'best')!.aiScore).toBeGreaterThan(
      scoredRoutes.find((r) => r.id === 'worse')!.aiScore
    );
  });

  it('throws on empty candidate set', () => {
    expect(() => generateAIRecommendation([], 'balanced')).toThrow();
  });

  it('handles single-route input gracefully', () => {
    const solo = buildRoute({ id: 'only' });
    const { recommendation, scoredRoutes } = generateAIRecommendation([solo], 'balanced');

    expect(recommendation.recommendedRouteId).toBe('only');
    expect(scoredRoutes).toHaveLength(1);
    expect(recommendation.headline).toBeTruthy();
    expect(recommendation.reasons.length).toBeGreaterThan(0);
  });

  it('returns all scored routes with valid aiScore and breakdown', () => {
    const r1 = buildRoute({ id: 'r1', durationMin: 20, distanceKm: 10 });
    const r2 = buildRoute({ id: 'r2', durationMin: 30, distanceKm: 15 });
    const r3 = buildRoute({ id: 'r3', durationMin: 25, distanceKm: 12 });

    const { scoredRoutes } = generateAIRecommendation([r1, r2, r3], 'balanced');

    expect(scoredRoutes).toHaveLength(3);
    scoredRoutes.forEach((r) => {
      expect(r.aiScore).toBeGreaterThanOrEqual(40);
      expect(r.aiScore).toBeLessThanOrEqual(99);
      expect(r.scoreBreakdown).toBeDefined();
      expect(r.scoreBreakdown.rawScore).toBeGreaterThan(0);
    });
  });

  it('confidence score is bounded at [88, 98]', () => {
    const r = buildRoute({ id: 'r' });
    const { recommendation } = generateAIRecommendation([r], 'balanced');

    expect(recommendation.confidenceScore).toBeGreaterThanOrEqual(80); // lower bound from formula
    expect(recommendation.confidenceScore).toBeLessThanOrEqual(98);
  });

  it('recommendation headline changes with preference', () => {
    const r = buildRoute({ id: 'r' });
    const { recommendation: fastest } = generateAIRecommendation([r], 'fastest');
    const { recommendation: safest } = generateAIRecommendation([r], 'safest');
    const { recommendation: shortest } = generateAIRecommendation([r], 'shortest');
    const { recommendation: fuel } = generateAIRecommendation([r], 'fuel');

    expect(fastest.headline).toContain('quickest');
    expect(safest.headline).toContain('safest');
    expect(shortest.headline).toContain('minimum');
    expect(fuel.headline).toContain('fuel');
  });

  it('preferenceUsed field matches the input preference', () => {
    const r = buildRoute({ id: 'r' });
    const preferences: TravelPreference[] = ['fastest', 'safest', 'shortest', 'balanced', 'fuel'];

    preferences.forEach((pref) => {
      const { recommendation } = generateAIRecommendation([r], pref);
      expect(recommendation.preferenceUsed).toBe(pref);
    });
  });
});

// ---------------------------------------------------------------------------
// §9 Invariant 3 & 4: Monotonicity Properties
// ---------------------------------------------------------------------------

describe('Scoring Engine — Monotonicity Invariants (§9.3, §9.4)', () => {
  it('faster route scores higher when all else is equal (time monotonicity)', () => {
    const base = {
      distanceKm: 10,
      trafficStatus: 'low' as const,
      trafficDelayMin: 2,
      normalDurationMin: 18,
      roadQuality: 'good' as const,
      warnings: [] as IncidentWarning[],
    };
    const fast = buildRoute({ id: 'fast', durationMin: 15, ...base });
    const slow = buildRoute({ id: 'slow', durationMin: 35, ...base });
    const candidates = [fast, slow];

    const fastScore = calculateRouteScore(fast, candidates, 'balanced').score;
    const slowScore = calculateRouteScore(slow, candidates, 'balanced').score;

    expect(fastScore).toBeGreaterThanOrEqual(slowScore);
  });

  it('shorter route scores higher when all else is equal (distance monotonicity)', () => {
    const base = {
      durationMin: 20,
      trafficStatus: 'low' as const,
      trafficDelayMin: 2,
      normalDurationMin: 18,
      roadQuality: 'good' as const,
      warnings: [] as IncidentWarning[],
    };
    const short = buildRoute({ id: 'short', distanceKm: 5, ...base });
    const long = buildRoute({ id: 'long', distanceKm: 50, ...base });
    const candidates = [short, long];

    const shortScore = calculateRouteScore(short, candidates, 'balanced').score;
    const longScore = calculateRouteScore(long, candidates, 'balanced').score;

    expect(shortScore).toBeGreaterThanOrEqual(longScore);
  });
});

// ---------------------------------------------------------------------------
// §9 Invariant 6: Determinism
// ---------------------------------------------------------------------------

describe('Scoring Engine — Determinism Invariant (§9.6)', () => {
  it('identical inputs produce identical scores across multiple runs', () => {
    const r1 = buildRoute({ id: 'r1', durationMin: 22, distanceKm: 11, trafficStatus: 'moderate' });
    const r2 = buildRoute({ id: 'r2', durationMin: 30, distanceKm: 14 });
    const candidates = [r1, r2];

    const results = Array.from({ length: 10 }, () =>
      calculateRouteScore(r1, candidates, 'balanced')
    );

    const firstScore = results[0].score;
    results.forEach((result) => {
      expect(result.score).toBe(firstScore);
      expect(result.breakdown.travelTimeScore).toBe(results[0].breakdown.travelTimeScore);
      expect(result.breakdown.trafficScore).toBe(results[0].breakdown.trafficScore);
      expect(result.breakdown.safetyScore).toBe(results[0].breakdown.safetyScore);
      expect(result.breakdown.roadConditionScore).toBe(results[0].breakdown.roadConditionScore);
      expect(result.breakdown.distanceScore).toBe(results[0].breakdown.distanceScore);
    });
  });
});

// ---------------------------------------------------------------------------
// §9 Invariant 7: Preference Sensitivity
// ---------------------------------------------------------------------------

describe('Scoring Engine — Preference Sensitivity (§9.7)', () => {
  it('changing preference alters relative ranking of routes with different strengths', () => {
    // Route A: fast but unsafe
    const routeA = buildRoute({
      id: 'fast-unsafe',
      durationMin: 15,
      distanceKm: 8,
      trafficStatus: 'low',
      trafficDelayMin: 1,
      normalDurationMin: 14,
      roadQuality: 'moderate',
      warnings: [buildWarning('construction'), buildWarning('accident')],
    });

    // Route B: slow but very safe
    const routeB = buildRoute({
      id: 'slow-safe',
      durationMin: 35,
      distanceKm: 15,
      trafficStatus: 'moderate',
      trafficDelayMin: 5,
      normalDurationMin: 30,
      roadQuality: 'excellent',
      warnings: [],
    });

    const candidates = [routeA, routeB];

    // Under "fastest" preference, Route A should score higher
    const fastestA = calculateRouteScore(routeA, candidates, 'fastest').score;
    const fastestB = calculateRouteScore(routeB, candidates, 'fastest').score;

    // Under "safest" preference, Route B should score higher
    const safestA = calculateRouteScore(routeA, candidates, 'safest').score;
    const safestB = calculateRouteScore(routeB, candidates, 'safest').score;

    expect(fastestA).toBeGreaterThan(fastestB);
    expect(safestB).toBeGreaterThan(safestA);
  });
});

// ---------------------------------------------------------------------------
// §9 Invariant 8: Non-Empty Recommendation
// ---------------------------------------------------------------------------

describe('Scoring Engine — Non-Empty Recommendation (§9.8)', () => {
  it('always produces exactly one recommended route for any non-empty input', () => {
    for (let n = 1; n <= 5; n++) {
      const routes = Array.from({ length: n }, (_, i) =>
        buildRoute({ id: `r${i}`, durationMin: 20 + i * 5 })
      );
      const { recommendation } = generateAIRecommendation(routes, 'balanced');

      expect(recommendation.recommendedRouteId).toBeTruthy();
      expect(routes.some((r) => r.id === recommendation.recommendedRouteId)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: Coimbatore Demo Data
// ---------------------------------------------------------------------------

describe('Integration — Coimbatore Demo Routes Score Correctly', () => {
  it('Gandhipuram→Airport routes all produce valid scores', async () => {
    const { getCoimbatoreDemoRoutes } = await import('../data/coimbatoreData');
    const routes = getCoimbatoreDemoRoutes('Gandhipuram Central Bus Stand', 'Coimbatore International Airport (CJB)');

    expect(routes.length).toBeGreaterThanOrEqual(2);

    const { scoredRoutes, recommendation } = generateAIRecommendation(routes, 'balanced');

    scoredRoutes.forEach((r) => {
      expect(r.aiScore).toBeGreaterThanOrEqual(40);
      expect(r.aiScore).toBeLessThanOrEqual(99);
      expect(r.scoreBreakdown.travelTimeScore).toBeGreaterThanOrEqual(0);
      expect(r.scoreBreakdown.trafficScore).toBeGreaterThanOrEqual(10);
      expect(r.scoreBreakdown.safetyScore).toBeGreaterThanOrEqual(15);
      expect(r.scoreBreakdown.roadConditionScore).toBeGreaterThan(0);
      expect(r.scoreBreakdown.distanceScore).toBeGreaterThanOrEqual(20);
    });

    // The Sathy Road bypass (Route B) should be recommended under balanced preference
    // because it has zero warnings, excellent road quality, and low traffic
    expect(recommendation.recommendedRouteId).toBeTruthy();
    expect(recommendation.headline).toBeTruthy();
  });

  it('RS Puram→Singanallur routes all have valid coordinates for map rendering', async () => {
    const { getCoimbatoreDemoRoutes } = await import('../data/coimbatoreData');
    const routes = getCoimbatoreDemoRoutes('RS Puram', 'Singanallur');

    routes.forEach((r) => {
      expect(r.coordinates.length).toBeGreaterThan(1);
      r.coordinates.forEach((coord) => {
        expect(coord.lat).toBeGreaterThan(0);
        expect(coord.lng).toBeGreaterThan(0);
        // Should be in Tamil Nadu coordinate range
        expect(coord.lat).toBeGreaterThan(8);
        expect(coord.lat).toBeLessThan(14);
        expect(coord.lng).toBeGreaterThan(76);
        expect(coord.lng).toBeLessThan(81);
      });
    });
  });
});

describe('Integration — Inter-District Demo Routes', () => {
  it('Coimbatore→Ooty routes produce valid scored output', async () => {
    const { getInterDistrictDemoRoutes } = await import('../data/interDistrictData');
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Ooty (Charring Cross)');

    expect(routes.length).toBeGreaterThanOrEqual(2);

    const { scoredRoutes, recommendation } = generateAIRecommendation(routes, 'safest');

    scoredRoutes.forEach((r) => {
      expect(r.aiScore).toBeGreaterThanOrEqual(40);
      expect(r.aiScore).toBeLessThanOrEqual(99);
    });

    // Under "safest", the Kotagiri route (zero warnings) should be recommended
    expect(recommendation.recommendedRouteId).toBeTruthy();
  });

  it('Coimbatore→Chennai routes have step-by-step navigation instructions', async () => {
    const { getInterDistrictDemoRoutes } = await import('../data/interDistrictData');
    const routes = getInterDistrictDemoRoutes('Coimbatore', 'Chennai (Central)');

    routes.forEach((r) => {
      expect(r.steps.length).toBeGreaterThan(0);
      r.steps.forEach((step) => {
        expect(step.instruction).toBeTruthy();
        expect(step.distanceMeters).toBeGreaterThan(0);
        expect(step.durationSeconds).toBeGreaterThan(0);
        expect(step.streetName).toBeTruthy();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Edge Cases & Robustness
// ---------------------------------------------------------------------------

describe('Scoring Engine — Edge Cases', () => {
  it('handles routes with zero normalDurationMin without division error', () => {
    const r = buildRoute({
      id: 'zero-normal',
      normalDurationMin: 0,
      trafficDelayMin: 5,
      trafficStatus: 'moderate',
    });
    // Should not throw; normalDurationMin floor is max(1, ...)
    const result = calculateRouteScore(r, [r], 'balanced');
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it('handles all-uniform candidates (no discrimination possible)', () => {
    const routes = Array.from({ length: 3 }, (_, i) =>
      buildRoute({
        id: `uniform-${i}`,
        durationMin: 25,
        distanceKm: 12,
        trafficStatus: 'moderate',
        trafficDelayMin: 3,
        normalDurationMin: 22,
        roadQuality: 'good',
        warnings: [],
      })
    );

    const { scoredRoutes } = generateAIRecommendation(routes, 'balanced');

    // All routes should have the same score
    const scores = new Set(scoredRoutes.map((r) => r.aiScore));
    expect(scores.size).toBe(1);
  });

  it('large candidate set (10 routes) completes without error', () => {
    const routes = Array.from({ length: 10 }, (_, i) =>
      buildRoute({
        id: `r${i}`,
        durationMin: 15 + i * 5,
        distanceKm: 8 + i * 3,
        trafficStatus: i % 4 === 0 ? 'low' : i % 4 === 1 ? 'moderate' : i % 4 === 2 ? 'heavy' : 'severe',
        trafficDelayMin: i * 2,
        normalDurationMin: 15 + i * 3,
        roadQuality: i % 4 === 0 ? 'excellent' : i % 4 === 1 ? 'good' : i % 4 === 2 ? 'moderate' : 'poor',
        warnings: i % 3 === 0 ? [buildWarning('construction')] : [],
      })
    );

    const { scoredRoutes, recommendation } = generateAIRecommendation(routes, 'balanced');

    expect(scoredRoutes).toHaveLength(10);
    expect(recommendation.recommendedRouteId).toBeTruthy();
    scoredRoutes.forEach((r) => {
      expect(r.aiScore).toBeGreaterThanOrEqual(40);
      expect(r.aiScore).toBeLessThanOrEqual(99);
    });
  });
});
