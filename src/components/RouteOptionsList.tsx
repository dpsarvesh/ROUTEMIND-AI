import React from 'react';
import { RouteOption } from '../types/navigation';
import { Sparkles, Clock, Navigation, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface RouteOptionsListProps {
  routes: RouteOption[];
  selectedRouteId: string;
  recommendedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  onStartNavigation: () => void;
}

export const RouteOptionsList: React.FC<RouteOptionsListProps> = ({
  routes,
  selectedRouteId,
  recommendedRouteId,
  onSelectRoute,
  onStartNavigation,
}) => {
  const formatTime = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Generated Route Candidates ({routes.length})
        </h3>
        <span className="text-[11px] text-slate-400">Click to compare & inspect</span>
      </div>

      <div className="space-y-2.5">
        {routes.map((r) => {
          const isSelected = r.id === selectedRouteId;
          const isRecommended = r.id === recommendedRouteId;

          return (
            <div
              key={r.id}
              onClick={() => onSelectRoute(r.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-brand-50/40 border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Top Row: Tag & AI Score */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {r.name.split('—')[0].trim()}
                  </span>
                  {isRecommended && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI CHOICE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">AI Score:</span>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border ${
                      r.aiScore >= 90
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : r.aiScore >= 80
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {r.aiScore}%
                  </span>
                </div>
              </div>

              {/* Subtitle / Corridor Description */}
              <p className="text-xs text-slate-600 font-medium line-clamp-1 mb-2">
                {r.summaryDescription}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                
                {/* Duration */}
                <div>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> ETA
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {formatTime(r.durationMin)}
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                    <Navigation className="w-3 h-3" /> Distance
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {r.distanceKm} km
                  </div>
                </div>

                {/* Traffic */}
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Traffic</div>
                  <div className="text-xs font-bold capitalize mt-0.5 flex items-center justify-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        r.trafficStatus === 'low'
                          ? 'bg-emerald-500'
                          : r.trafficStatus === 'moderate'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-slate-800">{r.trafficStatus}</span>
                  </div>
                </div>

                {/* Warnings */}
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Warnings</div>
                  <div className="text-xs font-bold mt-0.5 flex items-center justify-center gap-1">
                    {r.warnings.length === 0 ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> 0
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {r.warnings.length}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Start Navigation button if selected */}
              {isSelected && (
                <div className="mt-3 pt-2 border-t border-brand-100 flex items-center justify-between">
                  <span className="text-[11px] text-brand-700 font-medium">
                    {r.trafficDelayMin > 0 ? `+${r.trafficDelayMin} min delay included` : 'Zero traffic delay'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartNavigation();
                    }}
                    className="py-1.5 px-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Navigation className="w-3 h-3" />
                    Start Navigation
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
