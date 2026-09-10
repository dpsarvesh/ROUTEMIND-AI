import { SavedPlace, TripHistoryItem, TravelMode, TravelPreference } from '../types/navigation';

const SAVED_PLACES_KEY = 'routemind_saved_places';
const TRIP_HISTORY_KEY = 'routemind_trip_history';
const USER_PREFS_KEY = 'routemind_user_preferences';
const GOOGLE_API_KEY = 'routemind_google_api_key';

export interface UserPreferences {
  userName: string;
  defaultTravelMode: TravelMode;
  defaultPreference: TravelPreference;
  demoModeEnabled: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  userName: 'Traveler',
  defaultTravelMode: 'car',
  defaultPreference: 'balanced',
  demoModeEnabled: true,
};

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
