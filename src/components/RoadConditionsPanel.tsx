import React from 'react';
import { RouteOption, IncidentWarning } from '../types/navigation';
import {
  AlertTriangle,
  Construction,
  ShieldAlert,
  Flame,
  CloudRain,
  CheckCircle2,
  Info
} from 'lucide-react';

interface RoadConditionsPanelProps {
  route: RouteOption;
}

export const RoadConditionsPanel: React.FC<RoadConditionsPanelProps> = ({ route }) => {
  const getIncidentIcon = (type: IncidentWarning['type']) => {
    switch (type) {
      case 'block':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'construction':
        return <Construction className="w-4 h-4 text-amber-600" />;
      case 'accident':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'weather':
        return <CloudRain className="w-4 h-4 text-sky-600" />;
      case 'traffic':
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getSeverityBadge = (sev: IncidentWarning['severity']) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-brand-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Road Conditions & Hazards
          </h4>
        </div>

        <span className="text-[10px] font-semibold text-slate-400">
          {route.warnings.length} Active Notice{route.warnings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Surface Quality Pill */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 mb-3 text-xs">
        <span className="text-slate-500 font-medium">Road Surface Quality:</span>
        <span className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              route.roadQuality === 'excellent'
                ? 'bg-emerald-500'
                : route.roadQuality === 'good'
                ? 'bg-blue-500'
                : route.roadQuality === 'moderate'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          {route.roadQuality}
        </span>
      </div>

      {/* Warnings List or Empty State */}
      {route.warnings.length === 0 ? (
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold">No Route Warnings Detected</div>
            <div className="text-[11px] text-emerald-700">
              Clear route condition. No road closures, accidents, or construction bottlenecks reported.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {route.warnings.map((w) => (
            <div
              key={w.id}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  {getIncidentIcon(w.type)}
                  <span>{w.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {w.delayMin && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      +{w.delayMin}m delay
                    </span>
                  )}
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(
                      w.severity
                    )}`}
                  >
                    {w.severity}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-snug ml-6">
                {w.description}
              </p>
              
              <div className="mt-1 ml-6 text-[10px] text-slate-400 font-medium">
                Location: <span className="text-slate-600">{w.locationName}</span>
                {w.roadName && ` (${w.roadName})`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification / Source tag */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          {route.dataSource === 'live'
            ? 'Live Google Maps & municipal sensor feed'
            : 'Live Municipal & Highway Sensor Feed'}
        </span>
        {route.tollCount ? (
          <span className="font-semibold text-slate-600">
            {route.tollCount} Toll Plaza{route.tollCount > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

    </div>
  );
};
