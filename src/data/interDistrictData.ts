import { PresetLocation, RouteOption, LatLng } from '../types/navigation';
import { interpolatePoints } from './coimbatoreData';

export const INTER_DISTRICT_PRESETS: PresetLocation[] = [
  { name: 'Chennai (Central / Koyambedu)', category: 'district', lat: 13.0827, lng: 80.2707, subtitle: 'State Capital (~505 km)' },
  { name: 'Salem (New Bus Stand)', category: 'district', lat: 11.6643, lng: 78.1460, subtitle: 'NH 544 Corridor (~165 km)' },
  { name: 'Erode (Central Bus Stand)', category: 'district', lat: 11.3410, lng: 77.7172, subtitle: 'Textile Hub (~100 km)' },
  { name: 'Tiruppur (Old Bus Stand)', category: 'district', lat: 11.1085, lng: 77.3411, subtitle: 'Knitwear Capital (~55 km)' },
  { name: 'Ooty (Charring Cross / Botanical Garden)', category: 'district', lat: 11.4102, lng: 76.6950, subtitle: 'Nilgiris Hill Station (~86 km)' },
  { name: 'Madurai (Mattuthavani)', category: 'district', lat: 9.9252, lng: 78.1198, subtitle: 'Cultural Capital (~215 km)' },
  { name: 'Tiruchirappalli (Trichy Junction)', category: 'district', lat: 10.7905, lng: 78.7047, subtitle: 'Central Hub (~215 km)' },
  { name: 'Bengaluru (Electronic City / Silk Board)', category: 'district', lat: 12.9716, lng: 77.5946, subtitle: 'IT Capital (~365 km)' },
];

export function getInterDistrictDemoRoutes(originName: string, destName: string): RouteOption[] {
  const normDest = destName.toLowerCase();

  // Scenario: Coimbatore to Ooty (Hill road with hairpin curves)
  if (normDest.includes('ooty') || normDest.includes('nilgiri')) {
    const startCoord = { lat: 11.0183, lng: 76.9644 }; // Coimbatore
    const endCoord = { lat: 11.4102, lng: 76.6950 };   // Ooty

    return [
      {
        id: 'cbe-ooty-1',
        name: 'Route A — via Mettupalayam & Coonoor Ghat Road (NH 181)',
        tag: 'fastest',
        summaryDescription: 'Standard scenic mountain pass with 14 hairpin bends',
        distanceKm: 86.4,
        durationMin: 165, // 2h 45m
        normalDurationMin: 140,
        trafficDelayMin: 25,
        trafficStatus: 'heavy',
        roadQuality: 'good',
        roadSurfaceNotes: 'Smooth asphalt; slow-moving tourist buses and trucks on Coonoor ghat',
        highwayTags: ['NH 181', 'Coonoor Ghat'],
        tollCount: 1,
        fuelEstimateLiters: 9.2,
        dataSource: 'live',
        warnings: [
          {
            id: 'ooty-w1',
            type: 'traffic',
            title: 'Kallar Ghat Incline Congestion',
            description: 'Heavy weekend tourist traffic climbing past Kallar toll plaza.',
            severity: 'high',
            locationName: 'Kallar Checkpost',
            delayMin: 18,
            roadName: 'NH 181',
            isDemo: true
          },
          {
            id: 'ooty-w2',
            type: 'weather',
            title: 'Dense Mountain Mist Advisory',
            description: 'Reduced visibility below 50m between Coonoor and Wellington.',
            severity: 'moderate',
            locationName: 'Coonoor Upper Ridge',
            delayMin: 7,
            roadName: 'NH 181',
            isDemo: true
          }
        ],
        coordinates: interpolatePoints(startCoord, endCoord, [
          { lat: 11.1500, lng: 76.9400 },
          { lat: 11.3000, lng: 76.9420 }, // Mettupalayam
          { lat: 11.3500, lng: 76.8000 }, // Coonoor Ghat
          { lat: 11.3900, lng: 76.7500 }
        ], 0.003),
        steps: [
          { instruction: 'Take Mettupalayam Rd (NH 181) northbound from Coimbatore', distanceMeters: 33000, durationSeconds: 2700, streetName: 'NH 181', action: 'straight', lat: 11.0183, lng: 76.9644 },
          { instruction: 'Cross Bhavani Bridge into Mettupalayam town', distanceMeters: 4000, durationSeconds: 480, streetName: 'Mettupalayam Main Rd', action: 'straight', lat: 11.3000, lng: 76.9420 },
          { instruction: 'Enter Nilgiris Ghat Road section (Watch for sharp hairpin curves)', distanceMeters: 28000, durationSeconds: 4200, streetName: 'Coonoor Ghat Rd', action: 'straight', lat: 11.3500, lng: 76.8000 },
          { instruction: 'Proceed past Wellington Cantonment into Ooty Charring Cross', distanceMeters: 21400, durationSeconds: 2520, streetName: 'Ooty Road', action: 'destination', lat: 11.4102, lng: 76.6950 }
        ],
        aiScore: 82,
        scoreBreakdown: {
          travelTimeScore: 80,
          trafficScore: 60,
          safetyScore: 75,
          roadConditionScore: 88,
          distanceScore: 98,
          rawScore: 80,
          weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
        },
        recommendedReason: 'Direct and most familiar route, but experiences heavy ghat congestion during tourist hours.',
      },
      {
        id: 'cbe-ooty-2',
        name: 'Route B — via Kotagiri Mountain Pass (Recommended)',
        tag: 'safest',
        summaryDescription: 'Gentler elevation climb, significantly lighter traffic & tea estate views',
        distanceKm: 98.2,
        durationMin: 170, // 2h 50m
        normalDurationMin: 160,
        trafficDelayMin: 10,
        trafficStatus: 'low',
        roadQuality: 'excellent',
        roadSurfaceNotes: 'Very scenic, well-paved, less commercial truck traffic',
        highwayTags: ['SH 15', 'Kotagiri Pass'],
        tollCount: 1,
        fuelEstimateLiters: 9.8,
        dataSource: 'live',
        warnings: [],
        coordinates: interpolatePoints(startCoord, endCoord, [
          { lat: 11.1500, lng: 76.9400 },
          { lat: 11.3050, lng: 76.9450 },
          { lat: 11.4200, lng: 76.8600 }, // Kotagiri
          { lat: 11.4250, lng: 76.7500 }
        ], 0.0035),
        steps: [
          { instruction: 'Drive north on NH 181 to Mettupalayam bypass', distanceMeters: 34000, durationSeconds: 2700, streetName: 'NH 181', action: 'straight', lat: 11.0183, lng: 76.9644 },
          { instruction: 'Fork right onto SH 15 toward Kotagiri', distanceMeters: 32000, durationSeconds: 4200, streetName: 'Kotagiri Ghat Rd', action: 'turn-right', lat: 11.3050, lng: 76.9450 },
          { instruction: 'Pass Kotagiri town square and take Ooty linking highway', distanceMeters: 32200, durationSeconds: 3300, streetName: 'Kotagiri-Ooty Rd', action: 'straight', lat: 11.4200, lng: 76.8600 },
          { instruction: 'Arrive in central Ooty near Botanical Garden', distanceMeters: 1000, durationSeconds: 120, streetName: 'Garden Rd', action: 'destination', lat: 11.4102, lng: 76.6950 }
        ],
        aiScore: 93,
        scoreBreakdown: {
          travelTimeScore: 82,
          trafficScore: 95,
          safetyScore: 98,
          roadConditionScore: 96,
          distanceScore: 88,
          rawScore: 92,
          weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
        },
        recommendedReason: 'Saves 15 min in stop-and-go ghat traffic, zero incident warnings, and superior scenic road condition.',
      }
    ];
  }

  // Default Inter-District Scenario: Coimbatore to Chennai (Major Highway Corridor)
  const startCoord = { lat: 11.0183, lng: 76.9644 }; // Coimbatore
  const endCoord = { lat: 13.0827, lng: 80.2707 };   // Chennai

  return [
    {
      id: 'cbe-che-1',
      name: 'Route A — via NH 544 & NH 48 (Salem → Krishnagiri → Vellore)',
      tag: 'fastest',
      summaryDescription: 'High-speed 6-lane National Expressway corridor',
      distanceKm: 508.0,
      durationMin: 495, // 8h 15m
      normalDurationMin: 460,
      trafficDelayMin: 35,
      trafficStatus: 'moderate',
      roadQuality: 'excellent',
      roadSurfaceNotes: 'High-speed expressway throughout; bridge work near Sriperumbudur',
      highwayTags: ['NH 544', 'NH 48', 'Golden Quadrilateral'],
      tollCount: 7,
      fuelEstimateLiters: 38.5,
      dataSource: 'live',
      warnings: [
        {
          id: 'che-w1',
          type: 'construction',
          title: 'Sriperumbudur Expressway Expansion',
          description: 'Lane narrowing near Chennai outer ring road junction.',
          severity: 'moderate',
          locationName: 'Sriperumbudur Toll approach',
          delayMin: 22,
          roadName: 'NH 48',
          isDemo: true
        },
        {
          id: 'che-w2',
          type: 'traffic',
          title: 'Ranipet Toll Plaza Queue',
          description: 'Peak evening FASTag lane backup.',
          severity: 'low',
          locationName: 'Ranipet Toll',
          delayMin: 13,
          roadName: 'NH 48',
          isDemo: true
        }
      ],
      coordinates: interpolatePoints(startCoord, endCoord, [
        { lat: 11.3410, lng: 77.7172 }, // Erode
        { lat: 11.6643, lng: 78.1460 }, // Salem
        { lat: 12.5200, lng: 78.2100 }, // Krishnagiri
        { lat: 12.9200, lng: 79.1300 }, // Vellore
        { lat: 12.9800, lng: 79.9500 }  // Sriperumbudur
      ], 0.005),
      steps: [
        { instruction: 'Take Avinashi Rd to NH 544 Bypass toward Salem', distanceMeters: 45000, durationSeconds: 2700, streetName: 'NH 544', action: 'straight', lat: 11.0183, lng: 76.9644 },
        { instruction: 'Continue on 6-lane NH 544 past Erode and Sankari', distanceMeters: 120000, durationSeconds: 7200, streetName: 'NH 544', action: 'straight', lat: 11.3410, lng: 77.7172 },
        { instruction: 'Merge onto NH 48 toward Krishnagiri & Vellore', distanceMeters: 180000, durationSeconds: 10800, streetName: 'NH 48', action: 'merge', lat: 12.5200, lng: 78.2100 },
        { instruction: 'Proceed through Sriperumbudur into Chennai Koyambedu', distanceMeters: 163000, durationSeconds: 9000, streetName: 'Poonamallee High Rd', action: 'destination', lat: 13.0827, lng: 80.2707 }
      ],
      aiScore: 91,
      scoreBreakdown: {
        travelTimeScore: 92,
        trafficScore: 84,
        safetyScore: 90,
        roadConditionScore: 98,
        distanceScore: 92,
        rawScore: 91,
        weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
      },
      recommendedReason: 'High-speed divided expressway with ample service amenities and fastest overall travel time.',
    },
    {
      id: 'cbe-che-2',
      name: 'Route B — via Salem & Ulundurpet / Tindivanam (GST Road NH 38)',
      tag: 'safest',
      summaryDescription: 'Alternative via Attur, Kallakurichi & Chengalpattu',
      distanceKm: 494.0,
      durationMin: 520, // 8h 40m
      normalDurationMin: 490,
      trafficDelayMin: 30,
      trafficStatus: 'moderate',
      roadQuality: 'good',
      roadSurfaceNotes: '4-lane divided highway; moderate traffic near Tindivanam',
      highwayTags: ['NH 79', 'NH 38', 'GST Road'],
      tollCount: 6,
      fuelEstimateLiters: 37.0,
      dataSource: 'live',
      warnings: [
        {
          id: 'che-w3',
          type: 'traffic',
          title: 'Perungalathur Entry Bottleneck',
          description: 'Heavy commuter convergence at south Chennai gateway.',
          severity: 'high',
          locationName: 'Perungalathur / Tambaram',
          delayMin: 25,
          roadName: 'GST Road',
          isDemo: true
        }
      ],
      coordinates: interpolatePoints(startCoord, endCoord, [
        { lat: 11.3410, lng: 77.7172 },
        { lat: 11.6643, lng: 78.1460 },
        { lat: 11.6000, lng: 78.6000 }, // Attur
        { lat: 11.6900, lng: 79.2900 }, // Ulundurpet
        { lat: 12.2300, lng: 79.6500 }, // Tindivanam
        { lat: 12.8700, lng: 80.0800 }  // Tambaram
      ], 0.005),
      steps: [
        { instruction: 'Follow NH 544 from Coimbatore to Salem', distanceMeters: 165000, durationSeconds: 9900, streetName: 'NH 544', action: 'straight', lat: 11.0183, lng: 76.9644 },
        { instruction: 'Take NH 79 east toward Attur and Ulundurpet', distanceMeters: 135000, durationSeconds: 8400, streetName: 'NH 79', action: 'turn-right', lat: 11.6643, lng: 78.1460 },
        { instruction: 'Merge northbound onto NH 38 (GST Road) past Tindivanam', distanceMeters: 140000, durationSeconds: 8600, streetName: 'GST Rd', action: 'merge', lat: 11.6900, lng: 79.2900 },
        { instruction: 'Enter South Chennai via Tambaram and Guindy', distanceMeters: 54000, durationSeconds: 4300, streetName: 'Grand Southern Trunk Rd', action: 'destination', lat: 13.0827, lng: 80.2707 }
      ],
      aiScore: 86,
      scoreBreakdown: {
        travelTimeScore: 82,
        trafficScore: 80,
        safetyScore: 88,
        roadConditionScore: 90,
        distanceScore: 96,
        rawScore: 86,
        weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
      },
      recommendedReason: '14 km shorter distance, optimal if destination is South Chennai or OMR/Airport.',
    }
  ];
}
