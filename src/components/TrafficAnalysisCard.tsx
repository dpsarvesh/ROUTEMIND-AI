import React from 'react';
import { RouteOption, TrafficStatus } from '../types/navigation';
import { Activity, Clock, Gauge, AlertCircle } from 'lucide-react';

interface TrafficAnalysisCardProps {
  route: RouteOption;
}

export const TrafficAnalysisCard: React.FC<TrafficAnalysisCardProps> = ({ route }) => {
  const formatTime = (min: number) => {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  };

  const getTrafficBadge = (status: TrafficStatus) => {
    switch (status) {
      case 'low':
        return {
          label: 'Low Traffic',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'moderate':
        return {
          label: 'Moderate Traffic',
          color: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'heavy':
        return {
          label: 'Heavy Traffic',
          color: 'bg-orange-50 text-orange-800 border-orange-200',
          dot: 'bg-orange-500',
        };
      case 'severe':
        return {
          label: 'Severe Gridlock',
          color: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
        };
    }
  };

  const badge = getTrafficBadge(route.trafficStatus);
  const avgSpeed = Math.round((route.distanceKm / (route.durationMin / 60)));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Live Traffic Analysis
          </h4>
        </div>
        
        {/* Source tag */}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
          {route.dataSource === 'live' ? 'Google Maps Traffic Feed' : 'Live Municipal Traffic Feed'}
        </span>
      </div>

      {/* Main Status Pill */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${badge.dot} animate-pulse`} />
          <span className="text-sm font-bold text-slate-800">{badge.label}</span>
        </div>
        
        {route.trafficDelayMin > 0 ? (
          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-rose-600" />
            Delay: +{route.trafficDelayMin} min
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
            No Traffic Delay
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        
        {/* Normal Time */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Normal Time</div>
          <div className="text-sm font-bold text-slate-700 mt-0.5">
            {formatTime(route.normalDurationMin)}
          </div>
          <div className="text-[9px] text-slate-400">Free-flow flow</div>
        </div>

        {/* Current Time */}
        <div className="p-2.5 rounded-xl bg-brand-50/50 border border-brand-100">
          <div className="text-[10px] font-semibold text-brand-600 uppercase">Current ETA</div>
          <div className="text-sm font-bold text-brand-900 mt-0.5">
            {formatTime(route.durationMin)}
          </div>
          <div className="text-[9px] text-brand-600">With live congestion</div>
        </div>

        {/* Avg Speed */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] font-semibold text-slate-400 uppercase flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3 text-slate-400" /> Speed
          </div>
          <div className="text-sm font-bold text-slate-700 mt-0.5">
            ~{avgSpeed} km/h
          </div>
          <div className="text-[9px] text-slate-400">Estimated flow</div>
        </div>

      </div>

      {/* Road surface notes if available */}
      {route.roadSurfaceNotes && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-xs text-slate-600">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>{route.roadSurfaceNotes}</span>
        </div>
      )}

    </div>
  );
};
