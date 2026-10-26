/**
 * RouteMind AI — Browser localStorage Persistence Service
 *
 * This service provides a thin abstraction over the browser’s localStorage API
 * for persisting user data across sessions. All data is stored as JSON strings
 * under namespaced keys prefixed with `routemind_`.
 *
 * Persisted data categories:
 *   1. Saved Places — User’s favorite locations (home, work, favorites)
 *   2. Trip History — Last 30 planned trips (FIFO eviction)
 *   3. User Preferences — Default travel mode, preference profile, demo mode
 *   4. Google API Key — Optional Google Maps Platform API key
 *
 * Error Boundary Strategy:
 *   All read operations wrap JSON.parse in try/catch and return safe defaults
 *   on failure. This handles corrupted localStorage entries, quota exceeded errors,
 *   and private browsing mode restrictions gracefully.
 *
 * Schema version: 1.0 (no migration needed; additive-only changes)
 *
 * @module services/storageService
 */
import { SavedPlace, TripHistoryItem, TravelMode, TravelPreference } from '../types/navigation';

// ---------------------------------------------------------------------------
// localStorage Key Constants
// All keys are prefixed with 'routemind_' to avoid collisions with other apps.
// ---------------------------------------------------------------------------

/** Key for user's saved favorite places (JSON array of SavedPlace) */
const SAVED_PLACES_KEY = 'routemind_saved_places';
/** Key for trip planning history (JSON array of TripHistoryItem, max 30) */
const TRIP_HISTORY_KEY = 'routemind_trip_history';
/** Key for user preference settings (JSON object of UserPreferences) */
const USER_PREFS_KEY = 'routemind_user_preferences';
/** Key for Google Maps API key (plain string, not JSON) */
const GOOGLE_API_KEY = 'routemind_google_api_key';

/**
 * User-configurable application preferences.
 * Stored as a JSON blob in localStorage under USER_PREFS_KEY.
 * Missing fields are filled from DEFAULT_PREFERENCES via spread merge.
 */
export interface UserPreferences {
  /** Display name (used in greeting, not authentication) */
  userName: string;
  /** Default travel mode pre-selected in the trip planner */
  defaultTravelMode: TravelMode;
  /** Default AI preference profile pre-selected in the planner */
  defaultPreference: TravelPreference;
  /** Whether to show demo incident overlays on routes */
  demoModeEnabled: boolean;
}

/** Safe defaults applied when no user preferences exist in storage */
const DEFAULT_PREFERENCES: UserPreferences = {
  userName: 'Traveler',
  defaultTravelMode: 'car',
  defaultPreference: 'balanced',
  demoModeEnabled: true,
};

/** Initial seed data for saved places — provides first-run defaults */
const INITIAL_SAVED_PLACES: SavedPlace[] = [
  {
    id: 'sp-1',
    title: 'Home',
    category: 'home',
    address: 'RS Puram, DB Road, Coimbatore',
    lat: 11.0094,
    lng: 76.9463,
  },
  {
    id: 'sp-2',
    title: 'Work / College (PSG Tech)',
    category: 'college',
    address: 'Avinashi Road, Peelamedu, Coimbatore',
    lat: 11.0255,
    lng: 77.0028,
  },
  {
    id: 'sp-3',
    title: 'Airport Terminal',
    category: 'favorite',
    address: 'Civil Aerodrome Post, Coimbatore',
    lat: 11.0300,
    lng: 77.0434,
  }
];

export const storageService = {
  getSavedPlaces(): SavedPlace[] {
    try {
      const data = localStorage.getItem(SAVED_PLACES_KEY);
      if (!data) {
        localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(INITIAL_SAVED_PLACES));
        return INITIAL_SAVED_PLACES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_SAVED_PLACES;
    }
  },

  savePlace(place: Omit<SavedPlace, 'id'>): SavedPlace {
    const list = this.getSavedPlaces();
    const newPlace: SavedPlace = {
      ...place,
      id: 'sp-' + Date.now(),
    };
    list.push(newPlace);
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(list));
    return newPlace;
  },

  deleteSavedPlace(id: string): void {
    const list = this.getSavedPlaces().filter(p => p.id !== id);
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(list));
  },

  getTripHistory(): TripHistoryItem[] {
    try {
      const data = localStorage.getItem(TRIP_HISTORY_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addTripHistory(item: Omit<TripHistoryItem, 'id' | 'timestamp'>): TripHistoryItem {
    const list = this.getTripHistory();
    const record: TripHistoryItem = {
      ...item,
      id: 'trip-' + Date.now(),
      timestamp: Date.now(),
    };
    list.unshift(record);
    // Keep last 30 trips
    localStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(list.slice(0, 30)));
    return record;
  },

  clearTripHistory(): void {
    localStorage.removeItem(TRIP_HISTORY_KEY);
  },

  getUserPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(USER_PREFS_KEY);
      return data ? { ...DEFAULT_PREFERENCES, ...JSON.parse(data) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  saveUserPreferences(prefs: Partial<UserPreferences>): UserPreferences {
    const current = this.getUserPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(updated));
    return updated;
  },

  getGoogleApiKey(): string {
    return localStorage.getItem(GOOGLE_API_KEY) || '';
  },

  saveGoogleApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(GOOGLE_API_KEY, key.trim());
    } else {
      localStorage.removeItem(GOOGLE_API_KEY);
    }
  }
};
