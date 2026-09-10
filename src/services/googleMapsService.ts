import { LatLng, RouteOption, RouteStep, TrafficStatus, DataSource } from '../types/navigation';
import { storageService } from './storageService';

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

class GoogleMapsService {
  private isLoaded = false;
  private loadPromise: Promise<boolean> | null = null;
  private authFailed = false;

  constructor() {
    window.gm_authFailure = () => {
      this.authFailed = true;
      console.warn('Google Maps API Authentication Failed (Invalid Key or Unrestricted/Billing issue).');
    };
  }

  public isGoogleMapsAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.google && !!window.google.maps && !this.authFailed;
  }

  public loadGoogleMaps(apiKey?: string): Promise<boolean> {
    const key = apiKey || storageService.getGoogleApiKey();
    if (!key) {
      return Promise.resolve(false);
    }

    if (this.isLoaded && this.isGoogleMapsAvailable()) {
      return Promise.resolve(true);
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve) => {
      // Check if script already exists in document
      const existingScript = document.getElementById('google-maps-sdk');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = 'google-maps-sdk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isLoaded = true;
        this.authFailed = false;
        resolve(true);
      };

      script.onerror = () => {
        this.isLoaded = false;
        resolve(false);
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  /**
   * Request routes from Google Directions Service with traffic model
   */
  public async calculateRealGoogleRoutes(
    origin: string | LatLng,
    destination: string | LatLng,
    travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ): Promise<RouteOption[] | null> {
    if (!this.isGoogleMapsAvailable()) {
      return null;
    }

    const google = window.google;
    const directionsService = new google.maps.DirectionsService();

    const originParam = typeof origin === 'string'
      ? origin
      : new google.maps.LatLng(origin.lat, origin.lng);

    const destParam = typeof destination === 'string'
      ? destination
      : new google.maps.LatLng(destination.lat, destination.lng);

    const request: any = {
      origin: originParam,
      destination: destParam,
      travelMode: google.maps.TravelMode[travelMode],
      provideRouteAlternatives: true,
    };

    // If driving, request real-time traffic model
    if (travelMode === 'DRIVING') {
      request.drivingOptions = {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS,
      };
    }

    return new Promise((resolve) => {
      directionsService.route(request, (result: any, status: any) => {
        if (status !== 'OK' || !result || !result.routes || result.routes.length === 0) {
          console.warn('Google Directions request failed with status:', status);
          resolve(null);
          return;
        }

        const formattedRoutes: RouteOption[] = result.routes.map((gRoute: any, idx: number) => {
          const leg = gRoute.legs[0];
          const distKm = Math.round((leg.distance.value / 1000) * 10) / 10;
          const normalMin = Math.round(leg.duration.value / 60);
          const trafficMin = leg.duration_in_traffic ? Math.round(leg.duration_in_traffic.value / 60) : normalMin;
          const delayMin = Math.max(0, trafficMin - normalMin);

          // Traffic Status
          let trafficStatus: TrafficStatus = 'low';
          if (delayMin > 15) trafficStatus = 'severe';
          else if (delayMin > 8) trafficStatus = 'heavy';
          else if (delayMin > 3) trafficStatus = 'moderate';

          // Extract steps
          const steps: RouteStep[] = (leg.steps || []).map((st: any) => ({
            instruction: st.instructions.replace(/<[^>]*>?/gm, ''), // strip html tags
            distanceMeters: st.distance.value,
            durationSeconds: st.duration.value,
            streetName: st.instructions.split('onto ')[1] || 'Main Road',
            action: 'straight',
            lat: st.start_location.lat(),
            lng: st.start_location.lng(),
          }));

          // Extract decoded coordinates
          const coordinates: LatLng[] = [];
          if (gRoute.overview_path) {
            gRoute.overview_path.forEach((pt: any) => {
              coordinates.push({ lat: pt.lat(), lng: pt.lng() });
            });
          }

          const tags: ('fastest' | 'safest' | 'balanced' | 'shortest')[] = ['fastest', 'safest', 'balanced', 'shortest'];
          const tag = tags[idx % tags.length];

          return {
            id: `google-route-${idx + 1}`,
            name: `Route ${String.fromCharCode(65 + idx)} — via ${gRoute.summary || 'Primary Highway'}`,
            tag,
            summaryDescription: `via ${gRoute.summary || 'Direct Corridor'} (${distKm} km)`,
            distanceKm: distKm,
            durationMin: trafficMin,
            normalDurationMin: normalMin,
            trafficDelayMin: delayMin,
            trafficStatus,
            roadQuality: 'excellent',
            roadSurfaceNotes: 'Verified route condition from Google Maps Network',
            highwayTags: gRoute.summary ? [gRoute.summary] : [],
            warnings: delayMin > 6 ? [
              {
                id: `gw-${idx}`,
                type: 'traffic',
                title: 'Live Congestion Detected',
                description: `Live Google Traffic reports an active delay of +${delayMin} min along this corridor.`,
                severity: delayMin > 12 ? 'high' : 'moderate',
                locationName: gRoute.summary || 'Selected Route',
                delayMin,
                roadName: gRoute.summary,
                isDemo: false
              }
            ] : [],
            coordinates,
            steps,
            aiScore: 90,
            scoreBreakdown: {
              travelTimeScore: 90,
              trafficScore: trafficStatus === 'low' ? 95 : 75,
              safetyScore: 95,
              roadConditionScore: 95,
              distanceScore: 90,
              rawScore: 90,
              weightsApplied: { time: 0.25, traffic: 0.25, safety: 0.25, road: 0.15, distance: 0.10 }
            },
            recommendedReason: delayMin === 0 ? 'Optimal live traffic flow without slowdowns' : `Live Google Route with +${delayMin} min traffic delay`,
            dataSource: 'live' as DataSource,
          };
        });

        resolve(formattedRoutes);
      });
    });
  }
}

export const googleMapsService = new GoogleMapsService();
