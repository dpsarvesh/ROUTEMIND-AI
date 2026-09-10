import { PresetLocation, RouteOption, LatLng } from '../types/navigation';

export const COIMBATORE_PRESETS: PresetLocation[] = [
  { name: 'Gandhipuram Central Bus Stand', category: 'transit', lat: 11.0183, lng: 76.9644, subtitle: 'Central City Transit Hub' },
  { name: 'Coimbatore International Airport (CJB)', category: 'transit', lat: 11.0300, lng: 77.0434, subtitle: 'Civil Aerodrome, Avinashi Rd' },
  { name: 'Coimbatore Junction Railway Station', category: 'transit', lat: 10.9979, lng: 76.9634, subtitle: 'State Bank Rd, Gopalapuram' },
  { name: 'RS Puram (DB Road)', category: 'shopping', lat: 11.0094, lng: 76.9463, subtitle: 'Commercial & Dining Hub' },
  { name: 'Peelamedu (PSG Tech / TIDEL)', category: 'tech', lat: 11.0255, lng: 77.0028, subtitle: 'IT Corridor & Education Hub' },
  { name: 'Saravanampatti (CHIL SEZ)', category: 'tech', lat: 11.0797, lng: 76.9997, subtitle: 'IT Park & Tech Campus' },
  { name: 'Ukkadam Bus Stand & Lake', category: 'transit', lat: 10.9881, lng: 76.9622, subtitle: 'South Hub, Pollachi Road' },
  { name: 'Singanallur Bus Stand', category: 'transit', lat: 10.9996, lng: 77.0254, subtitle: 'Trichy Road Terminal' },
  { name: 'Saibaba Colony', category: 'landmark', lat: 11.0264, lng: 76.9458, subtitle: 'NSR Road, Mettupalayam Rd' },
  { name: 'Brookefields Mall', category: 'shopping', lat: 11.0116, lng: 76.9587, subtitle: 'Dr Krishnasamy Rd' },
  { name: 'Prozone Mall (Saravanampatti)', category: 'shopping', lat: 11.0543, lng: 76.9934, subtitle: 'Sathy Road' },
  { name: 'KMCH Hospital (Avinashi Rd)', category: 'hospital', lat: 11.0421, lng: 77.0371, subtitle: 'Multi-specialty Medical Hub' },
  { name: 'Kalapatti IT Hub', category: 'tech', lat: 11.0745, lng: 77.0430, subtitle: 'Airport Bypass / IT Corridor' },
  { name: 'Vadavalli', category: 'landmark', lat: 11.0298, lng: 76.9048, subtitle: 'Marudhamalai Road' },
  { name: 'Eachanari Temple', category: 'landmark', lat: 10.9234, lng: 76.9743, subtitle: 'Pollachi Main Road' },
];

// Helper to interpolate realistic waypoints
export function interpolatePoints(start: LatLng, end: LatLng, waypoints: LatLng[] = [], jitter = 0): LatLng[] {
  const points: LatLng[] = [start, ...waypoints, end];
  const detailed: LatLng[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    detailed.push(p1);

    const steps = 6;
    for (let s = 1; s < steps; s++) {
      const frac = s / steps;
      const lat = p1.lat + (p2.lat - p1.lat) * frac + (jitter ? (Math.sin(s * 1.5) * jitter) : 0);
      const lng = p1.lng + (p2.lng - p1.lng) * frac + (jitter ? (Math.cos(s * 1.5) * jitter) : 0);
      detailed.push({ lat, lng });
    }
  }
  detailed.push(end);
  return detailed;
}

export function getCoimbatoreDemoRoutes(originName: string, destName: string): RouteOption[] {
  const normOrigin = originName.toLowerCase();
  const normDest = destName.toLowerCase();

  // Scenario 1: Gandhipuram to Airport (Very popular real-world corridor with Avinashi Rd Metro Construction)
  if (normOrigin.includes('gandhipuram') || normDest.includes('airport')) {
    const startCoord = { lat: 11.0183, lng: 76.9644 };
    const endCoord = { lat: 11.0300, lng: 77.0434 };

    return [
      {
        id: 'cbe-gandhi-air-1',
        name: 'Route A — via Avinashi Road Main Corridor',
        tag: 'fastest',
        summaryDescription: 'Direct through Lakshmi Mills & Peelamedu',
        distanceKm: 10.8,
        durationMin: 34,
        normalDurationMin: 22,
        trafficDelayMin: 12,
        trafficStatus: 'heavy',
        roadQuality: 'moderate',
        roadSurfaceNotes: 'Flyover construction near Lakshmi Mills causing bottleneck',
        highwayTags: ['Avinashi Rd', 'SH 52'],
        dataSource: 'live',
        warnings: [
          {
            id: 'cbe-w1',
            type: 'construction',
            title: 'Flyover & Utility Work',
            description: 'Avinashi Road Elevated Corridor construction; lane narrowed to single lane near Nava India.',
            severity: 'high',
            locationName: 'Nava India Junction, Avinashi Rd',
            delayMin: 8,
            roadName: 'Avinashi Road',
            isDemo: true
          },
          {
            id: 'cbe-w2',
            type: 'traffic',
            title: 'Peelamedu Signal Congestion',
            description: 'Heavy evening commuter backup approaching PSG Tech junction.',
            severity: 'moderate',
            locationName: 'Peelamedu Signal',
            delayMin: 4,
            roadName: 'Avinashi Road',
            isDemo: true
          }
        ],
        coordinates: interpolatePoints(startCoord, endCoord, [
          { lat: 11.0185, lng: 76.9780 },
          { lat: 11.0220, lng: 76.9940 },
          { lat: 11.0260, lng: 77.0150 },
          { lat: 11.0285, lng: 77.0350 }
        ], 0.0008),
        steps: [
          { instruction: 'Head east on Dr Nanjappa Rd toward Avinashi Rd', distanceMeters: 450, durationSeconds: 60, streetName: 'Dr Nanjappa Rd', action: 'straight', lat: 11.0183, lng: 76.9644 },
          { instruction: 'Turn left onto Avinashi Rd (Caution: Road work ahead)', distanceMeters: 4200, durationSeconds: 900, streetName: 'Avinashi Rd', action: 'turn-left', lat: 11.0185, lng: 76.9780 },
          { instruction: 'Continue straight past Nava India Signal', distanceMeters: 2800, durationSeconds: 620, streetName: 'Avinashi Rd', action: 'straight', lat: 11.0220, lng: 76.9940 },
          { instruction: 'Pass Peelamedu PSG Tech on right', distanceMeters: 2200, durationSeconds: 380, streetName: 'Avinashi Rd', action: 'straight', lat: 11.0260, lng: 77.0150 },
          { instruction: 'Turn right into Airport Approach Road', distanceMeters: 1150, durationSeconds: 80, streetName: 'Airport Rd', action: 'turn-right', lat: 11.0300, lng: 77.0434 }
        ],
        aiScore: 78,
        scoreBreakdown: {
          travelTimeScore: 68,
          trafficScore: 50,
          safetyScore: 70,
          roadConditionScore: 70,
          distanceScore: 98,
          rawScore: 71,
          weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
        },
        recommendedReason: 'Shortest distance, but heavy delays due to flyover construction.',
      },
      {
        id: 'cbe-gandhi-air-2',
        name: 'Route B — via Sathy Road & Airport Bypass (Recommended)',
        tag: 'safest',
        summaryDescription: 'Smooth bypass through Ganapathy & Kalapatti Rd',
        distanceKm: 12.4,
        durationMin: 24,
        normalDurationMin: 21,
        trafficDelayMin: 3,
        trafficStatus: 'low',
        roadQuality: 'excellent',
        roadSurfaceNotes: 'Freshly resurfaced 4-lane bypass with active street lighting',
        highwayTags: ['Kalapatti Rd', 'Airport Link'],
        dataSource: 'live',
        warnings: [],
        coordinates: interpolatePoints(startCoord, endCoord, [
          { lat: 11.0280, lng: 76.9720 },
          { lat: 11.0450, lng: 76.9890 },
          { lat: 11.0580, lng: 77.0200 },
          { lat: 11.0450, lng: 77.0380 }
        ], 0.0012),
        steps: [
          { instruction: 'Head north on Sathy Road toward Ganapathy', distanceMeters: 1800, durationSeconds: 240, streetName: 'Sathy Rd', action: 'turn-left', lat: 11.0183, lng: 76.9644 },
          { instruction: 'Turn right onto Athipalayam / Kalapatti Main Road', distanceMeters: 4500, durationSeconds: 480, streetName: 'Kalapatti Rd', action: 'turn-right', lat: 11.0450, lng: 76.9890 },
          { instruction: 'Proceed along Kalapatti 4-lane bypass', distanceMeters: 4200, durationSeconds: 520, streetName: 'Airport Bypass Rd', action: 'straight', lat: 11.0580, lng: 77.0200 },
          { instruction: 'Slight right into Coimbatore International Airport terminal', distanceMeters: 1900, durationSeconds: 200, streetName: 'Civil Aerodrome Post', action: 'destination', lat: 11.0300, lng: 77.0434 }
        ],
        aiScore: 94,
        scoreBreakdown: {
          travelTimeScore: 94,
          trafficScore: 95,
          safetyScore: 100,
          roadConditionScore: 98,
          distanceScore: 82,
          rawScore: 94,
          weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
        },
        recommendedReason: '10 min faster than Avinashi Rd, avoids elevated corridor construction, zero reported warnings.',
      },
      {
        id: 'cbe-gandhi-air-3',
        name: 'Route C — via Ramanathapuram & Trichy Road Bypass',
        tag: 'balanced',
        summaryDescription: 'Southern loop via Sungam & Singanallur',
        distanceKm: 13.6,
        durationMin: 29,
        normalDurationMin: 25,
        trafficDelayMin: 4,
        trafficStatus: 'moderate',
        roadQuality: 'good',
        roadSurfaceNotes: 'Trichy Road flyover is open and smooth',
        highwayTags: ['Trichy Rd Flyover', 'Singanallur Link'],
        dataSource: 'live',
        warnings: [
          {
            id: 'cbe-w3',
            type: 'traffic',
            title: 'Singanallur Signal Delay',
            description: 'Moderate signal queue on approach to Trichy road junction.',
            severity: 'low',
            locationName: 'Singanallur Junction',
            delayMin: 3,
            roadName: 'Trichy Road',
            isDemo: true
          }
        ],
        coordinates: interpolatePoints(startCoord, endCoord, [
          { lat: 11.0080, lng: 76.9730 },
          { lat: 10.9990, lng: 76.9920 },
          { lat: 11.0010, lng: 77.0250 },
          { lat: 11.0180, lng: 77.0390 }
        ], 0.001),
        steps: [
          { instruction: 'Head south along Brooke Bond Rd toward Sungam', distanceMeters: 2100, durationSeconds: 300, streetName: 'Sungam Bypass', action: 'straight', lat: 11.0183, lng: 76.9644 },
          { instruction: 'Take the Trichy Road Elevated Flyover ramp', distanceMeters: 3800, durationSeconds: 400, streetName: 'Trichy Rd Flyover', action: 'straight', lat: 10.9990, lng: 76.9920 },
          { instruction: 'Descend near Singanallur and take Kamarajar Rd northbound', distanceMeters: 4200, durationSeconds: 580, streetName: 'Kamarajar Rd', action: 'turn-left', lat: 11.0010, lng: 77.0250 },
          { instruction: 'Arrive at Airport Departure Terminal', distanceMeters: 3500, durationSeconds: 460, streetName: 'Airport Approach', action: 'destination', lat: 11.0300, lng: 77.0434 }
        ],
        aiScore: 88,
        scoreBreakdown: {
          travelTimeScore: 84,
          trafficScore: 85,
          safetyScore: 92,
          roadConditionScore: 90,
          distanceScore: 78,
          rawScore: 86,
          weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
        },
        recommendedReason: 'Reliable elevated flyover option, slightly longer travel path.',
      }
    ];
  }

  // Scenario 2: RS Puram to Singanallur / Saravanampatti or General Local Route
  const startCoord = { lat: 11.0094, lng: 76.9463 }; // RS Puram
  const endCoord = { lat: 10.9996, lng: 77.0254 };   // Singanallur

  return [
    {
      id: 'cbe-gen-1',
      name: 'Route A — via Dr Nanjappa Rd & Trichy Road',
      tag: 'fastest',
      summaryDescription: 'Through Town Hall & Trichy Rd Flyover',
      distanceKm: 8.5,
      durationMin: 22,
      normalDurationMin: 18,
      trafficDelayMin: 4,
      trafficStatus: 'moderate',
      roadQuality: 'good',
      roadSurfaceNotes: 'Clear on Trichy road flyover; moderate queues near Town Hall',
      highwayTags: ['Trichy Rd', 'SH 174'],
      dataSource: 'live',
      warnings: [
        {
          id: 'cbe-w10',
          type: 'traffic',
          title: 'Town Hall Market Slowdown',
          description: 'High pedestrian and 2-wheeler movement near Clock Tower.',
          severity: 'moderate',
          locationName: 'Town Hall',
          delayMin: 4,
          roadName: 'Dr Nanjappa Rd',
          isDemo: true
        }
      ],
      coordinates: interpolatePoints(startCoord, endCoord, [
        { lat: 11.0050, lng: 76.9580 },
        { lat: 10.9970, lng: 76.9800 },
        { lat: 10.9980, lng: 77.0050 }
      ], 0.0008),
      steps: [
        { instruction: 'Head east on DB Road toward Cowley Brown Rd', distanceMeters: 800, durationSeconds: 120, streetName: 'DB Rd', action: 'straight', lat: startCoord.lat, lng: startCoord.lng },
        { instruction: 'Turn right onto Brooke Bond Rd / Goods Shed Rd', distanceMeters: 2200, durationSeconds: 340, streetName: 'Goods Shed Rd', action: 'turn-right', lat: 11.0050, lng: 76.9580 },
        { instruction: 'Ascend Trichy Road Flyover', distanceMeters: 3500, durationSeconds: 380, streetName: 'Trichy Rd Flyover', action: 'straight', lat: 10.9970, lng: 76.9800 },
        { instruction: 'Exit flyover into Singanallur Junction', distanceMeters: 2000, durationSeconds: 480, streetName: 'Trichy Rd', action: 'destination', lat: endCoord.lat, lng: endCoord.lng }
      ],
      aiScore: 89,
      scoreBreakdown: {
        travelTimeScore: 88,
        trafficScore: 80,
        safetyScore: 90,
        roadConditionScore: 92,
        distanceScore: 95,
        rawScore: 89,
        weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
      },
      recommendedReason: 'Fastest direct corridor utilizing Trichy Rd flyover with minimal detours.',
    },
    {
      id: 'cbe-gen-2',
      name: 'Route B — via Race Course & Sungam Bypass (Safest)',
      tag: 'safest',
      summaryDescription: 'Pleasant avenue route avoiding busy commercial market streets',
      distanceKm: 9.3,
      durationMin: 23,
      normalDurationMin: 21,
      trafficDelayMin: 2,
      trafficStatus: 'low',
      roadQuality: 'excellent',
      roadSurfaceNotes: 'Wide tree-lined boulevards and smooth residential bypass',
      highwayTags: ['Race Course Circular', 'Sungam Ring Rd'],
      dataSource: 'live',
      warnings: [],
      coordinates: interpolatePoints(startCoord, endCoord, [
        { lat: 11.0110, lng: 76.9600 },
        { lat: 11.0040, lng: 76.9740 },
        { lat: 10.9980, lng: 76.9950 }
      ], 0.001),
      steps: [
        { instruction: 'Head through Forest Campus toward Race Course', distanceMeters: 1600, durationSeconds: 220, streetName: 'Race Course Rd', action: 'straight', lat: startCoord.lat, lng: startCoord.lng },
        { instruction: 'Take Race Course circular road toward Thomas Park', distanceMeters: 2400, durationSeconds: 320, streetName: 'Race Course Rd', action: 'turn-left', lat: 11.0040, lng: 76.9740 },
        { instruction: 'Continue on Sungam Bypass into Ramanathapuram', distanceMeters: 3100, durationSeconds: 420, streetName: 'Sungam Bypass', action: 'straight', lat: 10.9980, lng: 76.9950 },
        { instruction: 'Arrive at destination', distanceMeters: 2200, durationSeconds: 420, streetName: 'Singanallur', action: 'destination', lat: endCoord.lat, lng: endCoord.lng }
      ],
      aiScore: 93,
      scoreBreakdown: {
        travelTimeScore: 86,
        trafficScore: 94,
        safetyScore: 100,
        roadConditionScore: 98,
        distanceScore: 88,
        rawScore: 93,
        weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
      },
      recommendedReason: 'Zero incident warnings, excellent pavement quality, and calm traffic flow through Race Course.',
    }
  ];
}
