import { RouteOption, TravelPreference, AIRecommendation, ScoreBreakdown } from '../types/navigation';

export interface ScoringWeights {
  time: number;
  traffic: number;
  safety: number;
  road: number;
  distance: number;
}

// Default dynamic weights based on user preference profile
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
 * Normalizes metrics across candidates and calculates transparent, weighted AI score
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
 * Evaluates candidate routes and generates a clear, natural language AI recommendation
 * explaining why a route was picked with transparent metric comparisons.
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
