import React, { useState } from 'react';
import {
  TravelMode,
  TravelPreference,
  TimeOption,
  NavigationMode,
  PresetLocation,
  SavedPlace
} from '../types/navigation';
import {
  Navigation,
  MapPin,
  Car,
  Bike,
  Footprints,
  Bus,
  Clock,
  Zap,
  Shield,
  Ruler,
  Scale,
  Fuel,
  ArrowRightLeft,
  Sparkles,
  Search,
  Bookmark
} from 'lucide-react';

interface TripPlannerCardProps {
  navMode: NavigationMode;
  origin: string;
  destination: string;
  setOrigin: (val: string) => void;
  setDestination: (val: string) => void;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  preference: TravelPreference;
  setPreference: (pref: TravelPreference) => void;
  timeOption: TimeOption;
  setTimeOption: (opt: TimeOption) => void;
  customTime: string;
  setCustomTime: (val: string) => void;
  presets: PresetLocation[];
  savedPlaces: SavedPlace[];
  onUseMyLocation: () => void;
  onPlanRoute: () => void;
  isLoading: boolean;
  onSelectSavedPlace: (place: SavedPlace, target: 'origin' | 'destination') => void;
}

export const TripPlannerCard: React.FC<TripPlannerCardProps> = ({
  navMode,
  origin,
  destination,
  setOrigin,
  setDestination,
  travelMode,
  setTravelMode,
  preference,
  setPreference,
  timeOption,
  setTimeOption,
  customTime,
  setCustomTime,
  presets,
  savedPlaces,
  onUseMyLocation,
  onPlanRoute,
  isLoading,
  onSelectSavedPlace,
}) => {
  const [showPresetsDropdown, setShowPresetsDropdown] = useState<'origin' | 'destination' | null>(null);

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSelectPreset = (name: string, target: 'origin' | 'destination') => {
    if (target === 'origin') {
      setOrigin(name);
    } else {
      setDestination(name);
    }
    setShowPresetsDropdown(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-4 sm:p-5 transition-all">
      
      {/* Title & Mode Banner */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
            {navMode === 'local' ? 'Coimbatore Local Navigation' : 'Inter-District Route Planner'}
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            {navMode === 'local'
              ? 'Real-time city navigation across Coimbatore corridors'
              : 'Expressway & state highway routing across Tamil Nadu'}
          </p>
        </div>

        {/* Travel Mode Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setTravelMode('car')}
            title="Car"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              travelMode === 'car' ? 'bg-white text-brand-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTravelMode('bike')}
            title="Two-Wheeler / Bike"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              travelMode === 'bike' ? 'bg-white text-brand-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bike className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTravelMode('walking')}
            title="Walking"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              travelMode === 'walking' ? 'bg-white text-brand-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Footprints className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTravelMode('transit')}
            title="Public Transit"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              travelMode === 'transit' ? 'bg-white text-brand-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Origin & Destination Inputs */}
      <div className="relative space-y-2.5">
        
        {/* Origin Input */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Starting Location
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onFocus={() => setShowPresetsDropdown('origin')}
                placeholder={navMode === 'local' ? "e.g., My Location or Gandhipuram" : "e.g., Coimbatore"}
                className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={onUseMyLocation}
              className="shrink-0 text-[11px] font-semibold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 transition-colors flex items-center gap-1"
            >
              <Navigation className="w-3 h-3 text-brand-600" />
              Use My Location
            </button>
          </div>

          {/* Presets Dropdown for Origin */}
          {showPresetsDropdown === 'origin' && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 divide-y divide-slate-100">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">Quick Suggestions</div>
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onMouseDown={() => handleSelectPreset(p.name, 'origin')}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{p.subtitle}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button in center */}
        <div className="absolute right-4 top-[38px] z-10">
          <button
            type="button"
            onClick={swapLocations}
            title="Swap Origin & Destination"
            className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all hover:rotate-180"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
          </button>
        </div>

        {/* Destination Input */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onFocus={() => setShowPresetsDropdown('destination')}
                placeholder={navMode === 'local' ? "e.g., Coimbatore Airport or RS Puram" : "e.g., Chennai or Ooty"}
                className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Presets Dropdown for Destination */}
          {showPresetsDropdown === 'destination' && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 divide-y divide-slate-100">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">Popular Destinations</div>
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onMouseDown={() => handleSelectPreset(p.name, 'destination')}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{p.subtitle}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Quick Saved Place Chips */}
      {savedPlaces.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-slate-400" /> Saved:
          </span>
          {savedPlaces.map((sp) => (
            <button
              key={sp.id}
              type="button"
              onClick={() => onSelectSavedPlace(sp, 'destination')}
              className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 text-[11px] font-medium border border-slate-200 transition-colors shrink-0"
            >
              {sp.title}
            </button>
          ))}
        </div>
      )}

      {/* Travel Timing Analysis (Now, Later Today, Tomorrow, Custom) */}
      <div className="mt-3.5 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Travel Timing
          </span>
          {timeOption !== 'now' && (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Historical Traffic Model
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setTimeOption('now')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
              timeOption === 'now'
                ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Now
          </button>
          <button
            type="button"
            onClick={() => setTimeOption('later')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
              timeOption === 'later'
                ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Later Today
          </button>
          <button
            type="button"
            onClick={() => setTimeOption('tomorrow')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
              timeOption === 'tomorrow'
                ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setTimeOption('custom')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
              timeOption === 'custom'
                ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Notice for Future Travel per Prompt Rule */}
        {timeOption !== 'now' && (
          <div className="mt-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-1.5">
            <span className="font-bold">ℹ</span>
            <span>
              Traffic prediction is based on available historical/estimated routing data.
            </span>
          </div>
        )}

        {timeOption === 'custom' && (
          <div className="mt-2">
            <input
              type="datetime-local"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}
      </div>

      {/* User Priority / Preference Section */}
      <div className="mt-3.5 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            What matters most to you?
          </span>
          <span className="text-[10px] text-slate-400 font-medium">AI weighting profile</span>
        </div>

        <div className="grid grid-cols-5 gap-1 text-center">
          <button
            type="button"
            onClick={() => setPreference('fastest')}
            className={`py-1.5 px-1 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              preference === 'fastest'
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs font-bold ring-1 ring-amber-400'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Fastest</span>
          </button>

          <button
            type="button"
            onClick={() => setPreference('safest')}
            className={`py-1.5 px-1 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              preference === 'safest'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs font-bold ring-1 ring-emerald-400'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Safest</span>
          </button>

          <button
            type="button"
            onClick={() => setPreference('balanced')}
            className={`py-1.5 px-1 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              preference === 'balanced'
                ? 'bg-brand-50 border-brand-300 text-brand-900 shadow-xs font-bold ring-1 ring-brand-400'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-brand-600" />
            <span>Balanced</span>
          </button>

          <button
            type="button"
            onClick={() => setPreference('shortest')}
            className={`py-1.5 px-1 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              preference === 'shortest'
                ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-xs font-bold ring-1 ring-purple-400'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-purple-600" />
            <span>Shortest</span>
          </button>

          <button
            type="button"
            onClick={() => setPreference('fuel')}
            className={`py-1.5 px-1 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              preference === 'fuel'
                ? 'bg-cyan-50 border-cyan-300 text-cyan-900 shadow-xs font-bold ring-1 ring-cyan-400'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Fuel className="w-3.5 h-3.5 text-cyan-600" />
            <span>Fuel Save</span>
          </button>
        </div>
      </div>

      {/* Plan Route Primary Action */}
      <div className="mt-4">
        <button
          type="button"
          onClick={onPlanRoute}
          disabled={isLoading || !destination.trim()}
          className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/25 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Analyzing Traffic & AI Scoring...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Plan Route & Analyze Traffic</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
