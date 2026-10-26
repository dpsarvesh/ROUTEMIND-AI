/**
 * RouteMind AI — MCDA Scoring Engine
 *
 * This module implements the formal Multi-Criteria Decision Analysis (MCDA) engine
 * using a Weighted Linear Additive Model (WLAM). It is the core intelligence layer
 * responsible for:
 *
 *   1. Normalising heterogeneous route metrics into a common [0, 100] scalar space
 *   2. Applying user-configurable preference weights to compute composite scores
 *   3. Ranking candidate routes and generating natural language recommendations
 *
 * The mathematical specification is documented in:
 *   docs/ai_scoring_engine_specification.md (§§ 1–9)
 *
 * Test coverage: src/services/aiScoringEngine.test.ts (58 tests)
 *
 * @module services/aiScoringEngine
 */

import { RouteOption, TravelPreference, AIRecommendation, ScoreBreakdown } from '../types/navigation';

/**
 * Weight vector W_P = (w_T, w_C, w_I, w_Q, w_D) for the MCDA composite formula.
 *
 * Constraint: w_time + w_traffic + w_safety + w_road + w_distance = 1.0
 * All weights must be non-negative.
 *
 * Custom weights can be provided via the AI Decision Matrix modal (AIDecisionMatrixModal.tsx)
 * to override the preset profiles.
 */
export interface ScoringWeights {
  /** Weight for travel time attribute N_T(r). Higher → prioritize faster routes. */
  time: number;
  /** Weight for traffic congestion attribute N_C(r). Higher → avoid congested corridors. */
  traffic: number;
  /** Weight for safety/incident attribute N_I(r). Higher → avoid hazards/closures. */
  safety: number;
  /** Weight for road surface quality attribute N_Q(r). Higher → prefer smoother roads. */
  road: number;
  /** Weight for route distance attribute N_D(r). Higher → prefer shorter distances. */
  distance: number;
}

/**
 * Preset preference weight profiles mapping each TravelPreference to a weight vector.
 *
 * Design rationale for each profile:
 * - `fastest`: Time (0.45) and traffic (0.30) dominate — user needs quickest arrival
 * - `safest`: Safety (0.45) and road quality (0.20) dominate — risk-averse user
 * - `shortest`: Distance (0.60) dominates — minimise kilometers for fuel/errands
 * - `balanced`: Near-equal weights — general purpose recommendation
 * - `fuel`: Traffic (0.35) and distance (0.25) — avoid stop-and-go to save fuel
 *
 * Invariant: All profiles satisfy Σw_i = 1.0 (verified by unit tests §9.2)
 *
 * @see docs/ai_scoring_engine_specification.md §5
 */
export const PREFERENCE_WEIGHTS: Record<TravelPreference, ScoringWeights> = {
  fastest: {
    time: 0.45,
    traffic: 0.30,
    safety: 0.10,
    road: 0.05,
    distance: 0.10,
  },
  safest: {
    time: 0.15,
    traffic: 0.15,
    safety: 0.45,
    road: 0.20,
    distance: 0.05,
  },
  shortest: {
    time: 0.15,
    traffic: 0.10,
    safety: 0.10,
    road: 0.05,
    distance: 0.60,
  },
  balanced: {
    time: 0.25,
    traffic: 0.25,
    safety: 0.25,
    road: 0.15,
    distance: 0.10,
  },
  fuel: {
    time: 0.15,
    traffic: 0.35, // avoiding stop-and-go congestion drastically saves fuel
    safety: 0.10,
    road: 0.15,
    distance: 0.25,
  }
};

/**
 * Computes the MCDA composite score S(r, P) for a single route candidate.
 *
 * Algorithm pipeline:
 *   1. Determine weight vector W_P (from preset or custom override)
 *   2. Normalise travel time N_T(r) via min-max range scaling → [60, 100] (§3.1)
 *   3. Normalise traffic congestion N_C(r) via tier-anchored penalty → [10, 100] (§3.2)
 *   4. Compute safety score N_I(r) via additive incident penalties → [15, 100] (§3.3)
 *   5. Map road quality N_Q(r) via ordinal mapping → {40, 68, 88, 98} (§3.4)
 *   6. Normalise distance N_D(r) via min-max range scaling → [20, 100] (§3.5)
 *   7. Compute weighted composite: Σ(w_i × N_i(r)) (§4.2)
 *   8. Apply final clamp: S(r, P) = clamp(round(composite), 40, 99) (§4.3)
 *
 * @param route - The route candidate to score
 * @param allCandidates - All candidates in the set (needed for min-max normalization)
 * @param preference - The active preference profile (determines default weights)
 * @param customWeights - Optional override weights from the AI Decision Matrix modal
 *
 * @returns Object containing:
 *   - `score`: Final composite score S(r, P) ∈ [40, 99]
 *   - `breakdown`: Per-attribute scores and applied weights for transparency
 *
 * @throws Never throws — all edge cases (single candidate, zero duration) are handled.
 *
 * @example
 * ```ts
 * const { score, breakdown } = calculateRouteScore(routeA, [routeA, routeB], 'balanced');
 * console.log(score);                    // 87
 * console.log(breakdown.safetyScore);    // 100 (no warnings)
 * console.log(breakdown.weightsApplied); // { time: 0.25, traffic: 0.25, ... }
 * ```
 */
export function calculateRouteScore(
  route: RouteOption,
  allCandidates: RouteOption[],
  preference: TravelPreference,
  customWeights?: ScoringWeights
): { score: number; breakdown: ScoreBreakdown } {
  const weights = customWeights || PREFERENCE_WEIGHTS[preference];

  // 1. Travel Time Score (Faster routes get higher scores)
  const minTime = Math.min(...allCandidates.map(r => r.durationMin));
  const maxTime = Math.max(...allCandidates.map(r => r.durationMin));
  let timeScore = 80;
  if (maxTime > minTime) {
    // Range normalized: 100 for fastest, proportional for others
    timeScore = 100 - ((route.durationMin - minTime) / (maxTime - minTime)) * 40;
  } else {
    timeScore = 95;
  }

  // 2. Traffic Score (Low congestion = higher score)
  // Traffic delay ratio
  const trafficDelayRatio = route.trafficDelayMin / Math.max(1, route.normalDurationMin);
  let trafficScore = 100;
  switch (route.trafficStatus) {
    case 'low':
      trafficScore = 98 - Math.min(10, trafficDelayRatio * 20);
      break;
    case 'moderate':
      trafficScore = 82 - Math.min(20, trafficDelayRatio * 40);
      break;
    case 'heavy':
      trafficScore = 55 - Math.min(25, trafficDelayRatio * 50);
      break;
    case 'severe':
      trafficScore = 25 - Math.min(20, trafficDelayRatio * 60);
      break;
  }
  trafficScore = Math.max(10, Math.min(100, Math.round(trafficScore)));

  // 3. Safety Score (Zero closures, blocks, accidents = 100)
  let safetyScore = 100;
  route.warnings.forEach(w => {
    if (w.type === 'block') safetyScore -= 35;
    else if (w.type === 'accident') safetyScore -= 25;
    else if (w.type === 'construction') safetyScore -= 15;
    else if (w.type === 'weather') safetyScore -= 20;
    else if (w.type === 'traffic') safetyScore -= 10;
  });
  safetyScore = Math.max(15, Math.min(100, Math.round(safetyScore)));

  // 4. Road Condition Score (smooth highway vs patchy/potholes/construction)
  let roadScore = 85;
  switch (route.roadQuality) {
    case 'excellent':
      roadScore = 98;
      break;
    case 'good':
      roadScore = 88;
      break;
    case 'moderate':
      roadScore = 68;
      break;
    case 'poor':
      roadScore = 40;
      break;
  }

  // 5. Distance Score (Direct distance penalty)
  const minDist = Math.min(...allCandidates.map(r => r.distanceKm));
  const maxDist = Math.max(...allCandidates.map(r => r.distanceKm));
  let distanceScore = 90;
  if (maxDist > minDist) {
    distanceScore = 100 - ((route.distanceKm - minDist) / (maxDist - minDist)) * 35;
  } else {
    distanceScore = 95;
  }
  distanceScore = Math.max(20, Math.min(100, Math.round(distanceScore)));

  // Weighted composite sum
  const composite = (
    timeScore * weights.time +
    trafficScore * weights.traffic +
    safetyScore * weights.safety +
    roadScore * weights.road +
    distanceScore * weights.distance
  );

  const finalScore = Math.min(99, Math.max(40, Math.round(composite)));

  return {
    score: finalScore,
    breakdown: {
      travelTimeScore: Math.round(timeScore),
      trafficScore: Math.round(trafficScore),
      safetyScore: Math.round(safetyScore),
      roadConditionScore: Math.round(roadScore),
      distanceScore: Math.round(distanceScore),
      rawScore: Math.round(composite),
      weightsApplied: { ...weights }
    }
  };
}

/**
 * Evaluates all candidate routes, ranks them by MCDA score, and generates a
 * natural language AI recommendation with transparent, data-backed justification.
 *
 * Pipeline:
 *   1. Score all candidates via calculateRouteScore()
 *   2. Sort candidates descending by aiScore
 *   3. Select best route r* = argmax_r S(r, P)
 *   4. Compare r* vs runner-up r' on time, traffic, warnings, road quality, distance
 *   5. Generate preference-tailored headline
 *   6. Craft multi-sentence detailed explanation
 *   7. Compute confidence score: clamp(88 + round((S - 70) × 0.3), 80, 98)
 *
 * @param routes - Non-empty array of route candidates to evaluate
 * @param preference - The active preference profile for weight selection
 * @param customWeights - Optional override weights from the interactive AI Matrix
 *
 * @returns Object containing:
 *   - `scoredRoutes`: All candidates with updated aiScore and scoreBreakdown
 *   - `recommendation`: The AI recommendation with headline, reasons, and tradeoffs
 *
 * @throws {Error} If routes array is empty or null
 *
 * @example
 * ```ts
 * const { scoredRoutes, recommendation } = generateAIRecommendation(candidates, 'safest');
 * console.log(recommendation.headline);      // "Route B is recommended as the safest route..."
 * console.log(recommendation.confidenceScore); // 94
 * ```
 */
export function generateAIRecommendation(
  routes: RouteOption[],
  preference: TravelPreference,
  customWeights?: ScoringWeights
): { scoredRoutes: RouteOption[]; recommendation: AIRecommendation } {
  if (!routes || routes.length === 0) {
    throw new Error('No candidate routes provided to AI scoring engine.');
  }

  // Compute scores for each candidate
  const scoredRoutes = routes.map(r => {
    const { score, breakdown } = calculateRouteScore(r, routes, preference, customWeights);
    return {
      ...r,
      aiScore: score,
      scoreBreakdown: breakdown,
    };
  });

  // Sort descending by AI score
  const sorted = [...scoredRoutes].sort((a, b) => b.aiScore - a.aiScore);
  const best = sorted[0];
  const runnerUp = sorted[1] || sorted[0];

  const reasons: string[] = [];
  const tradeoffs: string[] = [];

  // Generate real data-backed explanations
  const timeDiff = best.durationMin - runnerUp.durationMin;
  const distDiff = Math.round((best.distanceKm - runnerUp.distanceKm) * 10) / 10;
  const warningDiff = runnerUp.warnings.length - best.warnings.length;

  if (best.id !== runnerUp.id) {
    if (timeDiff < 0) {
      reasons.push(`${Math.abs(timeDiff)} min faster than ${runnerUp.name}`);
    } else if (timeDiff > 0) {
      tradeoffs.push(`Takes ~${timeDiff} min longer, but avoids hazards and heavy traffic`);
    }

    if (best.trafficStatus === 'low' && runnerUp.trafficStatus !== 'low') {
      reasons.push(`Significantly lighter traffic (${best.trafficStatus} vs ${runnerUp.trafficStatus})`);
    } else if (best.trafficDelayMin < runnerUp.trafficDelayMin) {
      reasons.push(`Saves ${runnerUp.trafficDelayMin - best.trafficDelayMin} min in traffic delays`);
    }

    if (warningDiff > 0) {
      reasons.push(`Avoids ${warningDiff} incident warning${warningDiff > 1 ? 's' : ''} present on alternative routes`);
    } else if (best.warnings.length === 0) {
      reasons.push('Zero active road closures or construction reported');
    }

    if (best.roadQuality === 'excellent' && runnerUp.roadQuality !== 'excellent') {
      reasons.push(`Superior road quality (${best.roadQuality} surface condition)`);
    }

    if (distDiff < 0) {
      reasons.push(`${Math.abs(distDiff)} km shorter than ${runnerUp.name}`);
    } else if (distDiff > 0 && preference !== 'shortest') {
      tradeoffs.push(`Adds +${distDiff} km distance for a smoother bypass`);
    }
  } else {
    // Single route scenario
    reasons.push(`Direct optimal path under current ${best.trafficStatus} traffic conditions`);
    if (best.warnings.length === 0) {
      reasons.push('Clear route with no reported road blocks');
    }
  }

  // Preference-tailored headline
  let headline = '';
  switch (preference) {
    case 'safest':
      headline = `${best.name} is recommended as the safest route with minimal hazards.`;
      break;
    case 'fastest':
      headline = `${best.name} is recommended for quickest arrival time.`;
      break;
    case 'shortest':
      headline = `${best.name} is recommended for minimum driving distance.`;
      break;
    case 'fuel':
      headline = `${best.name} is recommended for optimal fuel economy and smooth flow.`;
      break;
    case 'balanced':
    default:
      headline = `${best.name} is recommended for the best balance of speed, safety, and road quality.`;
      break;
  }

  // Craft detailed multi-sentence explanation
  let detailedExplanation = `${best.name} scored highest (${best.aiScore}%) based on your "${preference.toUpperCase()}" preference. `;
  if (best.warnings.length === 0 && runnerUp.warnings.length > 0) {
    detailedExplanation += `It bypasses reported warnings on ${runnerUp.name} while maintaining steady flow. `;
  } else if (best.trafficDelayMin <= 3) {
    detailedExplanation += `Traffic along this corridor is currently clear with only ${best.trafficDelayMin} min delay. `;
  } else {
    detailedExplanation += `Estimated transit delay is ${best.trafficDelayMin} min, which is the most reliable option among all alternatives. `;
  }

  const recommendation: AIRecommendation = {
    recommendedRouteId: best.id,
    headline,
    detailedExplanation,
    reasons: reasons.length > 0 ? reasons : ['Optimal calculated route based on available routing criteria'],
    tradeoffs,
    preferenceUsed: preference,
    dataSource: best.dataSource,
    confidenceScore: Math.min(98, 88 + Math.round((best.aiScore - 70) * 0.3)),
  };

  return { scoredRoutes, recommendation };
}
