# RouteMind AI — Formal Scoring Engine Specification

**Document Version:** 2.0  
**Last Updated:** October 2026  
**Reference Implementation:** `src/services/aiScoringEngine.ts`

---

## §1 Overview

RouteMind AI uses a **Multi-Criteria Decision Analysis (MCDA)** engine based on a Weighted Linear Additive Model (WLAM). The engine normalises heterogeneous raw metrics (travel time in minutes, road distance in kilometres, qualitative road surface ratings, traffic status categories, and incident penalty counts) into a uniform dimensionless scalar score space `[0, 100]` per attribute. A user-configurable preference weight vector is then applied to yield a single composite route score `S in [40, 99]`.

---

## §2 Attribute Universe

| Attribute | Symbol | Raw Unit | Normalisation Family |
|-----------|--------|----------|----------------------|
| Travel Time | T | minutes (min) | Min-Max Range Normalisation |
| Traffic Congestion | C | enum + delay ratio | Tier-Anchored Linear Penalty |
| Safety / Incident Risk | I | incident penalty sum | Deductive Anchor with Floor |
| Road Surface Quality | Q | ordinal 4-tier enum | Monotonic Ordinal Mapping |
| Route Distance | D | kilometres (km) | Min-Max Range Normalisation |

---

## §3 Attribute Normalisation Functions

### §3.1 Travel Time Score — N_T(r)

Let `T_min` and `T_max` denote the minimum and maximum `durationMin` across all candidate routes in set R.

**When `T_max > T_min` (discriminating range):**

```
N_T(r) = 100 - ((t_r - T_min) / (T_max - T_min)) * 40
```

This yields:
- Fastest route `r*`: `N_T(r*) = 100`
- Slowest route `r_w`: `N_T(r_w) = 60`
- Interior candidates: linearly interpolated within `[60, 100]`

**When `T_max = T_min` (degenerate / single candidate):**

```
N_T(r) = 95
```

A constant of 95 (rather than 100) reflects inherent measurement uncertainty when no comparison baseline is available.

**Formal specification:**

```
N_T(r) = { 100 - ((t_r - T_min) / (T_max - T_min)) * 40    if T_max > T_min
          { 95                                                otherwise
```

---

### §3.2 Traffic Congestion Score — N_C(r)

Traffic status is encoded as a 4-tier qualitative category `{low, moderate, heavy, severe}`. Each tier carries a distinct base score anchor. A secondary penalty proportional to the traffic delay ratio `delta_r = trafficDelayMin_r / max(1, normalDurationMin_r)` further differentiates routes within the same tier.

```
delta_r = trafficDelayMin_r / max(1, normalDurationMin_r)
```

| Traffic Status | Base Score | Penalty Formula | Domain |
|---|---|---|---|
| `low` | 98 | `-min(10, delta_r * 20)` | `[88, 98]` |
| `moderate` | 82 | `-min(20, delta_r * 40)` | `[62, 82]` |
| `heavy` | 55 | `-min(25, delta_r * 50)` | `[30, 55]` |
| `severe` | 25 | `-min(20, delta_r * 60)` | `[5, 25]` |

```
N_C(r) = clamp(BaseScore(status_r) - Penalty(delta_r, status_r), 10, 100)
```

The global clamp `[10, 100]` guarantees no route receives a zero traffic score even under extreme delay conditions.

---

### §3.3 Safety / Incident Score — N_I(r)

Safety starts from a perfect score of 100 and applies additive deductions for each incident warning `w in warnings(r)`:

| Incident Type | Penalty (pts) | Rationale |
|---|---|---|
| `block` | -35 | Complete lane closure; highest disruption |
| `accident` | -25 | Active accident; unpredictable delay + hazard |
| `weather` | -20 | Adverse conditions reducing safety margins |
| `construction` | -15 | Partial lane/shoulder closure |
| `traffic` | -10 | Congestion event without physical obstruction |
| `speed_trap` | -0 | Informational only, no safety deduction |

```
N_I(r) = clamp(100 - SUM_{w in W_r}(penalty(w.type)), 15, 100)
```

The floor of 15 prevents a fully penalised route from receiving a zero, maintaining numeric stability in the weighted composite.

---

### §3.4 Road Surface Quality Score — N_Q(r)

Road quality is provided as a qualitative ordinal category mapped deterministically to a fixed scalar:

| `roadQuality` | Score | Basis |
|---|---|---|
| `excellent` | 98 | New/resurfaced road, no potholes, full lane markings |
| `good` | 88 | Well-maintained, minor wear, no significant defects |
| `moderate` | 68 | Visible surface wear, occasional patches, reduced comfort |
| `poor` | 40 | Significant potholes, gravel/mud sections, structural damage |

```
N_Q(r) = OrdinalMap(roadQuality_r)
```

The mapping is monotonically strictly decreasing: `N_Q(excellent) > N_Q(good) > N_Q(moderate) > N_Q(poor)`.

**Unit normalisation note:** The raw `roadQuality` field is a dimensionless qualitative label derived from the data acquisition pipeline (see §5). The ordinal mapping converts it to a numeric score consistent with the `[0, 100]` normalised space.

---

### §3.5 Distance Score — N_D(r)

Let `D_min` and `D_max` be the minimum and maximum `distanceKm` across all candidates.

```
N_D(r) = { 100 - ((d_r - D_min) / (D_max - D_min)) * 35    if D_max > D_min
          { 95                                                otherwise

N_D(r) = clamp(N_D(r), 20, 100)
```

The penalty range `[0, 35]` is intentionally narrower than the time range `[0, 40]` because distance is a secondary optimisation criterion — a longer route can still be preferable if it significantly reduces travel time or hazards.

---

## §4 Weighted Composite Score

### §4.1 Weight Vector

Each user preference profile `P` defines a preference weight vector `W_P in R^5` satisfying the normalisation constraint:

```
W_P = (w_T, w_C, w_I, w_Q, w_D)
such that: w_T + w_C + w_I + w_Q + w_D = 1.0,  w_i >= 0 for all i
```

### §4.2 Composite Score Formula

The raw composite score for route `r` under preference `P` is:

```
Composite(r, P) = w_T * N_T(r) + w_C * N_C(r) + w_I * N_I(r) + w_Q * N_Q(r) + w_D * N_D(r)
```

### §4.3 Final Score with Boundary Clamp

```
S(r, P) = clamp(round(Composite(r, P)), 40, 99)
```

The bounds `[40, 99]` serve two purposes:
- **Lower bound 40**: Any route, regardless of hazards, has a minimum viability score to ensure it remains a candidate for navigation.
- **Upper bound 99**: Reserves "100" as a semantically impossible perfect score, avoiding overconfidence in the displayed metric.

---

## §5 Preference Weight Profiles

| Profile | `w_T` | `w_C` | `w_I` | `w_Q` | `w_D` | Design Intent |
|---|---|---|---|---|---|---|
| `fastest` | 0.45 | 0.30 | 0.10 | 0.05 | 0.10 | Time dominates; safety/road quality secondary |
| `safest` | 0.15 | 0.15 | 0.45 | 0.20 | 0.05 | Incident-free + smooth surface priority |
| `shortest` | 0.15 | 0.10 | 0.10 | 0.05 | 0.60 | Kilometres minimised; fuel/quick errand trips |
| `balanced` | 0.25 | 0.25 | 0.25 | 0.15 | 0.10 | Equal priority composite |
| `fuel` | 0.15 | 0.35 | 0.10 | 0.15 | 0.25 | Steady-flow, no stop-and-go; minimise fuel burn |

All profiles satisfy: `Sum(w_i) = 1.0` (verified by unit tests in §9).

---

## §6 Route Ranking and Recommendation

After computing `S(r, P)` for all candidate routes:

1. **Sort** candidates in descending order by `S(r, P)`.
2. **Select** `r* = argmax_r S(r, P)` as the recommended route.
3. **Runner-up** `r'` = second-ranked candidate (for comparison generation).
4. **Generate** natural language explanation comparing `r*` vs `r'` on time, traffic, warnings, road quality, and distance differentials.

### §6.1 Confidence Score

```
Confidence(r*) = clamp(88 + round((S(r*, P) - 70) * 0.3), 80, 98)
```

This yields a confidence range of ~80-98%, reflecting that higher-scoring recommendations are made with higher statistical confidence.

---

## §7 Invariant Properties

The following mathematical invariants are **guaranteed by construction** and verified by the test suite:

| # | Property | Formal Statement |
|---|---|---|
| 1 | **Score boundedness** | For all r, P: 40 <= S(r,P) <= 99 |
| 2 | **Weight normalisation** | For all P: Sum(w_i) = 1.0, w_i >= 0 |
| 3 | **Time monotonicity** | t_a < t_b => N_T(a) >= N_T(b) (ceteris paribus) |
| 4 | **Distance monotonicity** | d_a < d_b => N_D(a) >= N_D(b) (ceteris paribus) |
| 5 | **Road quality ordering** | N_Q(excellent) > N_Q(good) > N_Q(moderate) > N_Q(poor) |
| 6 | **Determinism** | Same inputs always produce identical outputs |
| 7 | **Preference sensitivity** | Different profiles yield different rankings when routes trade off attributes |
| 8 | **Non-empty recommendation** | Non-empty candidate set always yields exactly one recommended route |

---

## §8 Heterogeneous Unit Normalisation Summary

A critical design challenge is normalising metrics measured in incompatible physical units:

| Raw Metric | Unit | Normalisation Mechanism | Dimensionless Output |
|---|---|---|---|
| `durationMin` | minutes | Min-Max linear rescaling [60, 100] | N_T in [60, 100] |
| `distanceKm` | kilometres | Min-Max linear rescaling [65, 100] | N_D in [65, 100] |
| `trafficStatus + delayMin` | enum + minutes | Tier-anchored penalty function | N_C in [10, 100] |
| `roadQuality` | qualitative ordinal | Monotonic ordinal-to-scalar mapping | N_Q in {40,68,88,98} |
| `warnings[]` | incident event array | Additive deductive scoring | N_I in [15, 100] |

After normalisation, all attributes exist in the **same scalar space `[0, 100]`**, enabling meaningful weighted aggregation via the WLAM formula in §4.2.

---

## §9 Test Coverage Reference

The test suite in `src/services/aiScoringEngine.test.ts` validates all normalisations and invariants:

- **§3.1 tests**: Travel time normalization edge cases (single route, tied durations, range extremes)
- **§3.2 tests**: Traffic tier ordering, clamp verification, delay ratio monotonicity
- **§3.3 tests**: Individual warning penalty amounts, additive compounding, floor clamp
- **§3.4 tests**: All four ordinal quality mappings, strict monotone ordering
- **§3.5 tests**: Distance min-max normalization, single-candidate degenerate case
- **§4 tests**: Final score clamping, weight override, composite correctness
- **§6 tests**: Best-route recommendation, multi-route ranking, confidence bounds
- **§7 Invariants**: Monotonicity, determinism, preference sensitivity, non-empty output

---

## §10 Data Acquisition Pipeline for Road Conditions and Hazard Warnings

### §10.1 Architecture Overview

RouteMind AI uses a **three-tier synthetic heuristics pipeline** that simulates real-world data sources:

```
Tier 1 (Primary):   Google Maps Directions API (live traffic)
Tier 2 (Secondary): Municipal / Open APIs (road quality, construction)
Tier 3 (Fallback):  Synthetic heuristics + crowd-sourced simulation
```

### §10.2 Traffic Data Sources

**Tier 1 — Google Maps Traffic API:**
- Source: `maps.googleapis.com/maps/api/directions` with `drivingOptions.trafficModel = BEST_GUESS`
- Provides: `duration_in_traffic` (seconds), `duration` (base), route alternatives
- Used to compute: `trafficDelayMin`, `trafficStatus`
- Status: Active when user provides a valid Google Maps API key

**Tier 2 — Municipal Open Data APIs (Simulated):**
- Reference: Tamil Nadu Urban Local Body Open Data Portal
- Provides: Construction zone alerts, road closure notifications
- In production: REST calls to `udp.tn.gov.in/opendata/road-conditions`
- Current implementation: Embedded in `coimbatoreData.ts` and `interDistrictData.ts` as curated heuristics

**Tier 3 — Synthetic Heuristics (Active Fallback):**
- Road quality is assigned based on road type classification:
  - NH/SH highways: `excellent` or `good`
  - Urban arterials: `good` or `moderate`
  - City streets, hills: `moderate` or `poor`
- Traffic status is estimated using time-of-day patterns:
  - 08:00-10:00, 17:30-20:00 IST: `heavy` on arterials
  - 22:00-06:00 IST: `low` universally
  - Weekend tourist corridors (Nilgiris): `heavy` on NH 181

### §10.3 Crowd-Sourced Feed Simulation

The current implementation simulates crowd-sourced hazard data via:

1. **Incident seeding**: Each route in the dataset carries pre-seeded `warnings[]` based on known real-world conditions (Avinashi Rd construction, Coonoor ghat mist, NH 44 toll slowdowns).
2. **Stochastic jitter**: Route coordinates include `jitter` parameters to simulate GPS trace variability (`interpolatePoints` with `jitter` argument).
3. **Data freshness tags**: All synthetic incidents include `isDemo: true` to distinguish from live API-sourced data.

### §10.4 Road Surface Quality Data Pipeline

| Step | Mechanism | Output |
|---|---|---|
| 1. OpenStreetMap tags | `highway=primary/secondary/residential` | Road type classification |
| 2. Municipal construction API | Active closure/widening projects | Temporary `poor` downgrade |
| 3. Crowd reports (simulated) | Pothole count / avg rating | `moderate` or `poor` flag |
| 4. Historical decay model | Time since last resurfacing | Gradual quality degradation |
| 5. Override | Manual expert review | Final `roadQuality` enum |

In the current academic/demo implementation, Steps 1-5 are collapsed into curated heuristics embedded in the dataset files.

---

*End of specification. See `src/services/aiScoringEngine.ts` for the TypeScript reference implementation and `src/services/aiScoringEngine.test.ts` for the complete test suite.*
