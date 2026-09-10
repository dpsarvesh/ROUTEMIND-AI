import React from 'react';
import { RouteOption, AIRecommendation } from '../types/navigation';
import { Car, AlertTriangle, Sparkles, Navigation, CheckCircle2 } from 'lucide-react';

interface AIDashboardSummaryProps {
  plannedTripsCount: number;
  activeAlertsCount: number;
  recommendation: AIRecommendation | null;
  selectedRoute: RouteOption | null;
  isNavigating: boolean;
  onOpenAIDecisionModal: () => void;
}

export const AIDashboardSummary: React.FC<AIDashboardSummaryProps> = ({
  plannedTripsCount,
  activeAlertsCount,
  recommendation,
  selectedRoute,
  isNavigating,
  onOpenAIDecisionModal,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Today's Assistant Snapshot
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        
        {/* Planned Trips */}
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Car className="w-3 h-3 text-brand-600" /> Trips
          </div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">
            {plannedTripsCount > 0 ? `${plannedTripsCount} Planned` : '0 Planned'}
          </div>
        </div>

        {/* Traffic Alerts */}
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> Alerts
          </div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">
            {activeAlertsCount > 0 ? (
              <span className="text-amber-600">{activeAlertsCount} Active</span>
            ) : (
              <span className="text-emerald-600">0 Hazards</span>
            )}
          </div>
        </div>

        {/* AI Recommendation Status */}
        <div
          onClick={onOpenAIDecisionModal}
          className="p-2 rounded-xl bg-brand-50/60 border border-brand-100 cursor-pointer hover:bg-brand-100/50 transition-colors"
        >
          <div className="text-[10px] uppercase font-bold text-brand-600 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-600" /> AI Engine
          </div>
          <div className="text-sm font-extrabold text-brand-800 mt-0.5 truncate">
            {recommendation ? `${selectedRoute?.aiScore || 92}% Score` : 'Ready'}
          </div>
        </div>

      </div>
    </div>
  );
};
