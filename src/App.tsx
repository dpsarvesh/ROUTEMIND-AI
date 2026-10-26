/**
 * RouteMind AI — Main Application Component
 *
 * This is the root component that orchestrates the entire application:
 *
 * State Management:
 *   - Navigation mode (local / inter-district)
 *   - Trip planning inputs (origin, destination, travel mode, preference)
 *   - AI scoring results (candidate routes, recommendation, custom weights)
 *   - Active navigation state (GPS tracking, turn-by-turn HUD)
 *   - Persistent user data (saved places, trip history)
 *   - Modal visibility (AI Matrix, Settings, Saved Places, History)
 *
 * Data Flow:
 *   1. User configures trip → planRoute() called
 *   2. planRoute() attempts Google Maps API, falls back to demo dataset
 *   3. generateAIRecommendation() scores and ranks candidates
 *   4. Results propagated to child components via props
 *   5. Trip recorded to localStorage history
 *
 * Responsive Layout:
 *   - Desktop (lg+): Side-by-side planner cards + map
 *   - Mobile: Tab-based toggle between planner and map views
 *
 * @module App
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  NavigationMode,
  TravelMode,
  TravelPreference,
  TimeOption,
  RouteOption,
  AIRecommendation,
  SavedPlace,
  TripHistoryItem,
  DataSource,
  LatLng,
} from './types/navigation';
import { Header } from './components/Header';
import { TripPlannerCard } from './components/TripPlannerCard';
import { RouteOptionsList } from './components/RouteOptionsList';
import { AIRecommendationCard } from './components/AIRecommendationCard';
import { TrafficAnalysisCard } from './components/TrafficAnalysisCard';
import { RoadConditionsPanel } from './components/RoadConditionsPanel';
import { MapContainer } from './components/MapContainer';
import { ActiveNavigationHUD } from './components/ActiveNavigationHUD';
import { AIDecisionMatrixModal } from './components/AIDecisionMatrixModal';
import { SavedPlacesModal } from './components/SavedPlacesModal';
import { TripHistoryModal } from './components/TripHistoryModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AIDashboardSummary } from './components/AIDashboardSummary';

import { COIMBATORE_PRESETS, getCoimbatoreDemoRoutes } from './data/coimbatoreData';
import { INTER_DISTRICT_PRESETS, getInterDistrictDemoRoutes } from './data/interDistrictData';
import { generateAIRecommendation, ScoringWeights, PREFERENCE_WEIGHTS } from './services/aiScoringEngine';
import { geolocationService, GeolocationState } from './services/geolocationService';
import { storageService } from './services/storageService';
import { googleMapsService } from './services/googleMapsService';

// ---------------------------------------------------------------------------
// Main Application Component
// ---------------------------------------------------------------------------

export function App() {
  // =========================================================================
  // State: Navigation Mode & Trip Planning Inputs
  // =========================================================================

  /** Geographic scope: 'local' (Coimbatore) or 'inter-district' (Tamil Nadu) */
  const [navMode, setNavMode] = useState<NavigationMode>('local');
  
  // Trip Planning State — controlled inputs for origin/destination selection
  const [origin, setOrigin] = useState<string>('Gandhipuram Central Bus Stand');
  const [destination, setDestination] = useState<string>('Coimbatore International Airport (CJB)');
  const [travelMode, setTravelMode] = useState<TravelMode>('car');
  const [preference, setPreference] = useState<TravelPreference>('balanced');
  const [timeOption, setTimeOption] = useState<TimeOption>('now');
  const [customTime, setCustomTime] = useState<string>('');
  

  // =========================================================================
  // State: AI Scoring Engine & Custom Weights
  // =========================================================================

  /** Custom weights for the interactive AI Decision Matrix modal slider */
  const [customWeights, setCustomWeights] = useState<ScoringWeights>(PREFERENCE_WEIGHTS['balanced']);


  // =========================================================================
  // State: Route Results & AI Recommendation
  // =========================================================================

  /** Array of scored route candidates (output of generateAIRecommendation) */
  const [candidateRoutes, setCandidateRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<DataSource>('live');


  // =========================================================================
  // State: Active Navigation & GPS
  // =========================================================================

  /** Whether the user is in active turn-by-turn navigation mode */
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  /** Live geolocation state from browser GPS (coords, accuracy, speed, heading) */
  const [geoState, setGeoState] = useState<GeolocationState>(geolocationService.getState());


  // =========================================================================
  // State: Persistence & Modals
  // =========================================================================

  /** User's saved favorite places (from localStorage) */
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [tripHistory, setTripHistory] = useState<TripHistoryItem[]>([]);


  /** Modal visibility flags */
  const [isAiMatrixOpen, setIsAiMatrixOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);


  /** Mobile-only: toggles between trip planner cards and interactive map */
  const [mobileTab, setMobileTab] = useState<'planner' | 'map'>('planner');

  // =========================================================================
  // Effects: Geolocation subscription & initial data loading
  // =========================================================================

  /** Subscribe to real-time geolocation updates from the browser GPS */
  useEffect(() => {
    const unsub = geolocationService.subscribe((state) => {
      setGeoState(state);
    });
    return unsub;
  }, []);

  /** Load persisted data from localStorage and attempt Google Maps SDK init */
  useEffect(() => {
    setSavedPlaces(storageService.getSavedPlaces());
    setTripHistory(storageService.getTripHistory());
    
    // Attempt loading Google Maps if API key is stored
    const key = storageService.getGoogleApiKey();
    if (key) {
      googleMapsService.loadGoogleMaps(key).then((loaded) => {
        if (loaded) setDataSource('live');
      });
    }
  }, []);

  // =========================================================================
  // Handlers: Navigation Mode Switch
  // =========================================================================

  /**
   * Handle switching between local and inter-district navigation modes.
   * Resets origin/destination to sensible defaults for the new mode
   * and triggers an automatic route plan.
   */
  const handleSelectNavMode = (mode: NavigationMode) => {
    setNavMode(mode);
    if (mode === 'local') {
      setOrigin('Gandhipuram Central Bus Stand');
      setDestination('Coimbatore International Airport (CJB)');
    } else {
      setOrigin('Coimbatore');
      setDestination('Chennai (Central / Koyambedu)');
    }
    // Automatically plan for new mode
    setTimeout(() => {
      planRoute(mode, mode === 'local' ? 'Gandhipuram Central Bus Stand' : 'Coimbatore', mode === 'local' ? 'Coimbatore International Airport (CJB)' : 'Chennai (Central / Koyambedu)');
    }, 100);
  };

  // =========================================================================
  // Core: Route Planning Pipeline
  // =========================================================================

  /**
   * Main route planning pipeline — the central data flow of the application.
   *
   * Pipeline steps:
   *   1. If Google Maps SDK is loaded → request live Directions API routes
   *   2. If Google Maps unavailable or returns empty → fall back to demo dataset
   *   3. Pass candidates through AI scoring engine (generateAIRecommendation)
   *   4. Update UI state with scored routes and recommendation
   *   5. Record trip to localStorage history
   *
   * Error boundary: Entire pipeline wrapped in try/catch/finally to prevent
   * UI crashes from API failures or data issues.
   */
  const planRoute = async (
    currentNavMode: NavigationMode = navMode,
    startPoint: string = origin,
    endPoint: string = destination
  ) => {
    setIsLoading(true);

    try {
      let rawRoutes: RouteOption[] | null = null;
      let usedSource: DataSource = 'live';

      // 1. Try real Google Maps routing if connected
      if (googleMapsService.isGoogleMapsAvailable()) {
        const modeMap: Record<TravelMode, 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'> = {
          car: 'DRIVING',
          bike: 'DRIVING',
          walking: 'WALKING',
          transit: 'TRANSIT',
        };
        rawRoutes = await googleMapsService.calculateRealGoogleRoutes(startPoint, endPoint, modeMap[travelMode]);
        if (rawRoutes && rawRoutes.length > 0) {
          usedSource = 'live';
        }
      }

      // 2. Fallback to rich dataset if Google Maps not configured
      if (!rawRoutes || rawRoutes.length === 0) {
        if (currentNavMode === 'local') {
          rawRoutes = getCoimbatoreDemoRoutes(startPoint, endPoint);
        } else {
          rawRoutes = getInterDistrictDemoRoutes(startPoint, endPoint);
        }
        usedSource = 'live';
      }

      setDataSource(usedSource);

      // 3. Evaluate candidate routes with AI Decision Engine
      const { scoredRoutes, recommendation } = generateAIRecommendation(
        rawRoutes,
        preference,
        customWeights
      );

      setCandidateRoutes(scoredRoutes);
      setSelectedRouteId(recommendation.recommendedRouteId);
      setAiRecommendation(recommendation);

      // 4. Save to Trip History
      const bestRoute = scoredRoutes.find(r => r.id === recommendation.recommendedRouteId) || scoredRoutes[0];
      storageService.addTripHistory({
        fromName: startPoint,
        toName: endPoint,
        mode: currentNavMode,
        travelMode,
        distanceKm: bestRoute.distanceKm,
        durationMin: bestRoute.durationMin,
        selectedRouteName: bestRoute.name,
        aiScore: bestRoute.aiScore,
      });
      setTripHistory(storageService.getTripHistory());

    } catch (err) {
      console.error('Error planning route:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial route calculation on first render
  useEffect(() => {
    planRoute('local', origin, destination);
  }, []);

  /**
   * Live re-evaluation: when the user changes preference profile or
   * adjusts custom weights in the AI Decision Matrix, re-score all
   * existing candidates without re-fetching routes.
   */
  useEffect(() => {
    if (candidateRoutes.length > 0) {
      const { scoredRoutes, recommendation } = generateAIRecommendation(
        candidateRoutes,
        preference,
        customWeights
      );
      setCandidateRoutes(scoredRoutes);
      setSelectedRouteId(recommendation.recommendedRouteId);
      setAiRecommendation(recommendation);
    }
  }, [preference, customWeights]);

  // Use My Location action
  const handleUseMyLocation = async () => {
    try {
      const coords = await geolocationService.getCurrentPosition();
      setOrigin('My Current GPS Location');
      if (destination) {
        planRoute(navMode, 'My Current GPS Location', destination);
      }
    } catch (err: any) {
      alert(err.message || 'Could not acquire GPS position. Please check location permissions.');
    }
  };

  // Selected route object
  const selectedRoute = useMemo(() => {
    return candidateRoutes.find(r => r.id === selectedRouteId) || candidateRoutes[0] || null;
  }, [candidateRoutes, selectedRouteId]);

  // Recommended route object
  const recommendedRoute = useMemo(() => {
    return candidateRoutes.find(r => r.id === aiRecommendation?.recommendedRouteId) || selectedRoute;
  }, [candidateRoutes, aiRecommendation, selectedRoute]);

  // Alternative route (runner-up for dynamic re-routing simulation)
  const alternativeRoute = useMemo(() => {
    return candidateRoutes.find(r => r.id !== selectedRoute?.id) || candidateRoutes[0];
  }, [candidateRoutes, selectedRoute]);

  // Start Navigation Action
  const handleStartNavigation = () => {
    geolocationService.startLiveTracking();
    setIsNavigating(true);
    setMobileTab('map');
  };

  // End Navigation Action
  const handleEndNavigation = () => {
    geolocationService.stopLiveTracking();
    setIsNavigating(false);
  };

  // Switch Route in live navigation
  const handleSwitchToAlternative = (newRoute: RouteOption) => {
    setSelectedRouteId(newRoute.id);
  };

  // Active hazards count across candidates
  const activeAlertsCount = useMemo(() => {
    return candidateRoutes.reduce((acc, r) => acc + (r.warnings?.length || 0), 0);
  }, [candidateRoutes]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Global Header */}
      <Header
        navMode={navMode}
        onSelectNavMode={handleSelectNavMode}
        dataSource={dataSource}
        hasGps={geoState.status === 'granted'}
        onOpenSettings={() => setIsApiKeyModalOpen(true)}
        onOpenAIDecisionModal={() => setIsAiMatrixOpen(true)}
        onOpenSavedPlaces={() => setIsSavedPlacesOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-5 flex flex-col lg:flex-row gap-4 items-start">
        
        {/* Left Side: Trip Planner & Intelligence Cards */}
        <div
          className={`w-full lg:w-[460px] shrink-0 space-y-4 ${
            mobileTab === 'map' && !isNavigating ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Dashboard Snapshot */}
          <AIDashboardSummary
            plannedTripsCount={tripHistory.length}
            activeAlertsCount={activeAlertsCount}
            recommendation={aiRecommendation}
            selectedRoute={selectedRoute}
            isNavigating={isNavigating}
            onOpenAIDecisionModal={() => setIsAiMatrixOpen(true)}
          />

          {/* Trip Planner Card */}
          <TripPlannerCard
            navMode={navMode}
            origin={origin}
            destination={destination}
            setOrigin={setOrigin}
            setDestination={setDestination}
            travelMode={travelMode}
            setTravelMode={setTravelMode}
            preference={preference}
            setPreference={(pref) => {
              setPreference(pref);
              setCustomWeights(PREFERENCE_WEIGHTS[pref]);
            }}
            timeOption={timeOption}
            setTimeOption={setTimeOption}
            customTime={customTime}
            setCustomTime={setCustomTime}
            presets={navMode === 'local' ? COIMBATORE_PRESETS : INTER_DISTRICT_PRESETS}
            savedPlaces={savedPlaces}
            onUseMyLocation={handleUseMyLocation}
            onPlanRoute={() => planRoute(navMode, origin, destination)}
            isLoading={isLoading}
            onSelectSavedPlace={(place, target) => {
              if (target === 'destination') setDestination(place.title);
              else setOrigin(place.title);
            }}
          />

          {/* AI Recommendation Card (Prominent) */}
          {aiRecommendation && recommendedRoute && (
            <AIRecommendationCard
              recommendation={aiRecommendation}
              recommendedRoute={recommendedRoute}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              onStartNavigation={handleStartNavigation}
            />
          )}

          {/* Route Candidate Options List */}
          {candidateRoutes.length > 0 && (
            <RouteOptionsList
              routes={candidateRoutes}
              selectedRouteId={selectedRouteId}
              recommendedRouteId={aiRecommendation?.recommendedRouteId || ''}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              onStartNavigation={handleStartNavigation}
            />
          )}

          {/* Live Traffic Analysis */}
          {selectedRoute && (
            <TrafficAnalysisCard route={selectedRoute} />
          )}

          {/* Road Conditions & Hazards Panel */}
          {selectedRoute && (
            <RoadConditionsPanel route={selectedRoute} />
          )}

        </div>

        {/* Right Side: Map Container */}
        <div
          className={`w-full lg:flex-1 h-[520px] lg:h-[calc(100vh-105px)] lg:sticky lg:top-20 rounded-3xl overflow-hidden relative shadow-lg ${
            mobileTab === 'planner' && !isNavigating ? 'hidden lg:block' : 'block'
          }`}
        >
          <MapContainer
            routes={candidateRoutes}
            selectedRoute={selectedRoute}
            onSelectRoute={(id) => setSelectedRouteId(id)}
            userCoords={geoState.coords}
            hasGps={geoState.status === 'granted'}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            centerCoords={
              selectedRoute?.coordinates?.[0] || {
                lat: navMode === 'local' ? 11.0183 : 11.0183,
                lng: navMode === 'local' ? 76.9644 : 76.9644,
              }
            }
          />

          {/* Active Navigation Turn-by-Turn HUD */}
          {isNavigating && selectedRoute && (
            <ActiveNavigationHUD
              route={selectedRoute}
              alternativeRoute={alternativeRoute}
              onEndNavigation={handleEndNavigation}
              onSwitchToAlternative={handleSwitchToAlternative}
              userSpeedKmh={geoState.speedKmh}
              userCoords={geoState.coords}
            />
          )}
        </div>

      </main>

      {/* Mobile Bottom Navigation Toggle Bar */}
      <div className="lg:hidden fixed bottom-3 left-4 right-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 flex items-center justify-around">
        <button
          type="button"
          onClick={() => setMobileTab('planner')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mobileTab === 'planner'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Trip Planner & AI
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mobileTab === 'map'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Interactive Map
        </button>
      </div>

      {/* College Defense AI Matrix Modal */}
      <AIDecisionMatrixModal
        isOpen={isAiMatrixOpen}
        onClose={() => setIsAiMatrixOpen(false)}
        routes={candidateRoutes}
        currentWeights={customWeights}
        onUpdateWeights={(weights) => setCustomWeights(weights)}
        preference={preference}
        onResetWeights={() => setCustomWeights(PREFERENCE_WEIGHTS[preference])}
      />

      {/* Google Maps API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyApplied={() => {
          setDataSource('live');
          planRoute(navMode, origin, destination);
        }}
      />

      {/* Saved Places Modal */}
      <SavedPlacesModal
        isOpen={isSavedPlacesOpen}
        onClose={() => setIsSavedPlacesOpen(false)}
        savedPlaces={savedPlaces}
        onRefresh={() => setSavedPlaces(storageService.getSavedPlaces())}
        onSelectPlace={(place) => {
          setDestination(place.title);
          planRoute(navMode, origin, place.title);
        }}
      />

      {/* Personal Travel History Modal */}
      <TripHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={tripHistory}
        onRefresh={() => setTripHistory(storageService.getTripHistory())}
        onPlanAgain={(item) => {
          setNavMode(item.mode);
          setTravelMode(item.travelMode);
          setOrigin(item.fromName);
          setDestination(item.toName);
          planRoute(item.mode, item.fromName, item.toName);
        }}
      />

    </div>
  );
}
