/**
 * RouteMind AI — Browser Geolocation Service
 *
 * Provides a reactive wrapper around the browser’s Geolocation API with:
 *   - Observer pattern (subscribe/notify) for real-time position updates
 *   - One-shot position requests (getCurrentPosition)
 *   - Continuous GPS tracking (watchPosition) for active navigation
 *   - Comprehensive error handling for all permission states
 *
 * State Machine:
 *   prompt → granted (on success) | denied (permission refused) | unavailable (GPS error)
 *   unsupported (if browser lacks Geolocation API)
 *
 * Speed conversion: Browser API provides m/s; this service converts to km/h.
 *
 * @module services/geolocationService
 */
import { LatLng } from '../types/navigation';

/**
 * Immutable snapshot of the current geolocation state.
 * Returned by getState() and passed to all subscribed listeners.
 */
export interface GeolocationState {
  /** Current GPS coordinates, or null if not yet acquired */
  coords: LatLng | null;
  /** GPS accuracy radius in meters (lower = more precise) */
  accuracyMeters: number | null;
  /** Compass heading in degrees (0-360), null if unavailable */
  heading: number | null;
  /** Current speed in km/h (converted from m/s), null if stationary */
  speedKmh: number | null;
  /** Permission/availability state of the geolocation system */
  status: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'unsupported';
  /** Human-readable error message when status is not 'granted' */
  errorMessage?: string;
  /** Whether continuous GPS tracking (watchPosition) is active */
  isWatching: boolean;
}

/** Callback type for geolocation state change listeners */
type GeolocationCallback = (state: GeolocationState) => void;

/**
 * Singleton service managing browser geolocation with observer pattern.
 *
 * Usage:
 *   - Subscribe to position updates: `geolocationService.subscribe(callback)`
 *   - Request one-shot position: `await geolocationService.getCurrentPosition()`
 *   - Start live tracking: `geolocationService.startLiveTracking()`
 *   - Stop live tracking: `geolocationService.stopLiveTracking()`
 *
 * Error boundaries:
 *   - Browser without Geolocation API → status = 'unsupported'
 *   - Permission denied → status = 'denied' with user message
 *   - GPS unavailable → status = 'unavailable' with diagnostic message
 *   - Timeout → status = 'unavailable'
 */
class GeolocationService {
  private watchId: number | null = null;
  private listeners: Set<GeolocationCallback> = new Set();
  private currentState: GeolocationState = {
    coords: null,
    accuracyMeters: null,
    heading: null,
    speedKmh: null,
    status: 'prompt',
    isWatching: false,
  };

  constructor() {
    if (!('geolocation' in navigator)) {
      this.currentState.status = 'unsupported';
      this.currentState.errorMessage = 'Geolocation API is not supported by your browser or device.';
    }
  }

  public getState(): GeolocationState {
    return { ...this.currentState };
  }

  public subscribe(cb: GeolocationCallback): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach(cb => cb(copy));
  }

  public getCurrentPosition(): Promise<LatLng> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        this.currentState.status = 'unsupported';
        this.currentState.errorMessage = 'Browser does not support geolocation.';
        this.notify();
        return reject(new Error('Geolocation unsupported'));
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          const coords: LatLng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.currentState = {
            coords,
            accuracyMeters: Math.round(position.coords.accuracy || 10),
            heading: position.coords.heading || null,
            speedKmh: position.coords.speed ? Math.round(position.coords.speed * 3.6) : null,
            status: 'granted',
            errorMessage: undefined,
            isWatching: this.watchId !== null,
          };
          this.notify();
          resolve(coords);
        },
        error => {
          let status: GeolocationState['status'] = 'unavailable';
          let msg = 'Unable to determine your location.';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              status = 'denied';
              msg = 'Location permission was denied. Please allow location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              status = 'unavailable';
              msg = 'Location information is currently unavailable from your device GPS.';
              break;
            case error.TIMEOUT:
              status = 'unavailable';
              msg = 'The request to obtain your location timed out.';
              break;
          }

          this.currentState.status = status;
          this.currentState.errorMessage = msg;
          this.notify();
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000,
        }
      );
    });
  }

  public startLiveTracking(): void {
    if (!('geolocation' in navigator) || this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      position => {
        this.currentState = {
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracyMeters: Math.round(position.coords.accuracy || 10),
          heading: position.coords.heading || null,
          speedKmh: position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0,
          status: 'granted',
          errorMessage: undefined,
          isWatching: true,
        };
        this.notify();
      },
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          this.currentState.status = 'denied';
          this.currentState.errorMessage = 'Location permission denied.';
        } else {
          this.currentState.status = 'unavailable';
          this.currentState.errorMessage = error.message || 'GPS signal lost.';
        }
        this.currentState.isWatching = false;
        this.stopLiveTracking();
        this.notify();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    this.currentState.isWatching = true;
    this.notify();
  }

  public stopLiveTracking(): void {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.currentState.isWatching = false;
    this.notify();
  }
}

export const geolocationService = new GeolocationService();
