import React from 'react';
import { NavigationMode, DataSource } from '../types/navigation';
import { Compass, Sparkles, Sliders, Bookmark, History, Key, MapPin } from 'lucide-react';

interface HeaderProps {
  navMode: NavigationMode;
  onSelectNavMode: (mode: NavigationMode) => void;
  dataSource: DataSource;
  hasGps: boolean;
  onOpenSettings: () => void;
  onOpenAIDecisionModal: () => void;
  onOpenSavedPlaces: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  navMode,
  onSelectNavMode,
  dataSource,
  hasGps,
  onOpenSettings,
  onOpenAIDecisionModal,
  onOpenSavedPlaces,
  onOpenHistory,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Branding & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                  RouteMind<span className="text-brand-600"> AI</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  <Sparkles className="w-2.5 h-2.5 text-brand-600" />
                  AI v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">
                Your personal intelligent route assistant
              </p>
            </div>
          </div>

          {/* Mobile Quick Action Icons */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={onOpenAIDecisionModal}
              title="AI Scoring Matrix"
              className="p-1.5 text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-100"
            >
              <Sliders className="w-4 h-4 text-brand-600" />
            </button>
            <button
              onClick={onOpenSettings}
              title="API Key Settings"
              className="p-1.5 text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-100"
            >
              <Key className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Navigation Mode Switcher */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto">
            <button
              onClick={() => onSelectNavMode('local')}
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                navMode === 'local'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              Local Travel (Coimbatore)
            </button>
            <button
              onClick={() => onSelectNavMode('inter-district')}
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                navMode === 'inter-district'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              Inter-District Travel
            </button>
          </div>
        </div>

        {/* Right: Status Badges & Action Buttons */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Data Source Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-800 text-[11px] font-semibold">
              {dataSource === 'live' ? 'GOOGLE MAPS LIVE' : 'LIVE TRAFFIC NETWORK'}
            </span>
          </div>

          {/* GPS Status */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium ${
              hasGps ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {hasGps ? 'GPS Active' : 'GPS Off'}
          </div>

          {/* AI Decision Inspector (College Project Special) */}
          <button
            onClick={onOpenAIDecisionModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors border border-brand-200 shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-600" />
            AI Matrix
          </button>

          {/* Saved Places */}
          <button
            onClick={onOpenSavedPlaces}
            className="p-1.5 text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Saved Places"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* History */}
          <button
            onClick={onOpenHistory}
            className="p-1.5 text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Travel History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Google Maps API Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Google Maps API Key & Preferences"
          >
            <Key className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
