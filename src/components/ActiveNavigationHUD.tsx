import React, { useState, useEffect } from 'react';
import { RouteOption, RouteStep } from '../types/navigation';
import {
  Navigation,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  RotateCcw,
  AlertTriangle,
  Clock,
  Gauge,
  XCircle,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2
} from 'lucide-react';

interface ActiveNavigationHUDProps {
  route: RouteOption;
  alternativeRoute?: RouteOption;
  onEndNavigation: () => void;
  onSwitchToAlternative: (newRoute: RouteOption) => void;
  userSpeedKmh: number | null;
  userCoords: { lat: number; lng: number } | null;
}

export const ActiveNavigationHUD: React.FC<ActiveNavigationHUDProps> = ({
  route,
  alternativeRoute,
  onEndNavigation,
  onSwitchToAlternative,
  userSpeedKmh,
  userCoords,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showRerouteAlert, setShowRerouteAlert] = useState(false);
  const [remainingMin, setRemainingMin] = useState(route.durationMin);
  const [remainingDistKm, setRemainingDistKm] = useState(route.distanceKm);

  const steps = route.steps || [];
  const currentStep: RouteStep | undefined = steps[currentStepIndex] || {
    instruction: `Proceed along ${route.name.split('—')[0]}`,
    distanceMeters: 1200,
    durationSeconds: 180,
    streetName: route.name,
    action: 'straight',
    lat: route.coordinates[0]?.lat || 11.0,
    lng: route.coordinates[0]?.lng || 77.0,
  };

  // Compute calculated arrival time (e.g., 5:42 PM)
  const etaDate = new Date(Date.now() + remainingMin * 60 * 1000);
  const formattedEta = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Simulate progress step advance every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      setRemainingMin((prev) => Math.max(1, prev - 1));
      setRemainingDistKm((prev) => Math.max(0.2, Math.round((prev - 0.4) * 10) / 10));
    }, 12000);

    return () => clearInterval(timer);
  }, [steps.length]);

  // Demo trigger for Route Condition Change
  const triggerSimulatedReroute = () => {
    setShowRerouteAlert(true);
  };

  const getManeuverIcon = (action: RouteStep['action']) => {
    switch (action) {
      case 'turn-left':
        return <CornerUpLeft className="w-8 h-8 text-white" />;
      case 'turn-right':
        return <CornerUpRight className="w-8 h-8 text-white" />;
      case 'u-turn':
        return <RotateCcw className="w-8 h-8 text-white" />;
      default:
        return <ArrowUp className="w-8 h-8 text-white" />;
    }
  };

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-4 max-w-lg mx-auto">
      
      {/* Top Turn-by-Turn Instruction Banner */}
      <div className="pointer-events-auto bg-slate-900/95 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 backdrop-blur transition-all">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 shadow-md shadow-brand-600/30">
            {getManeuverIcon(currentStep.action)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase font-bold text-brand-400 tracking-wider flex items-center gap-1.5">
              <span>Next Maneuver in {currentStep.distanceMeters} m</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight truncate">
              {currentStep.instruction}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Onto {currentStep.streetName}
            </p>
          </div>

          <button
            onClick={() => setMuted(!muted)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-brand-400" />}
          </button>
        </div>

        {/* Live Location Pulsing Status */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Location: ON
          </div>
          <div className="flex items-center gap-2">
            <span>GPS Tracking Active</span>
            {userSpeedKmh !== null && (
              <span className="text-white font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                {userSpeedKmh} km/h
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Live Re-routing Alert (Requirement 13) */}
      {showRerouteAlert && alternativeRoute && (
        <div className="pointer-events-auto my-auto bg-amber-950/95 text-white rounded-3xl p-4 sm:p-5 border-2 border-amber-500 shadow-2xl backdrop-blur animate-bounce-short">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  Route Condition Changed
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-900 text-[10px] font-black">
                  LIVE AI ALERT
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                Traffic has increased on your current route.
              </p>
              <p className="text-xs text-slate-300 mt-1">
                AI detected a sudden backup (+11 min). An optimal alternative bypass is now faster and hazard-free.
              </p>

              {/* Time Comparison */}
              <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-black/40 border border-white/10 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Current Route</div>
                  <div className="text-sm font-bold text-rose-400">
                    {remainingMin + 11} min
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">AI Alternative</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {alternativeRoute.durationMin} min (-11 min)
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToAlternative(alternativeRoute);
                    setShowRerouteAlert(false);
                  }}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Switch Route
                </button>
                <button
                  type="button"
                  onClick={() => setShowRerouteAlert(false)}
                  className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs rounded-xl transition-all"
                >
                  Keep Current
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation HUD */}
      <div className="pointer-events-auto bg-white/95 rounded-2xl p-4 shadow-2xl border border-slate-200/90 backdrop-blur transition-all">
        
        {/* Top Info Bar */}
        <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-100 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Remaining Dist</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {remainingDistKm} km
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-brand-600">Estimated Arrival</div>
            <div className="text-base font-extrabold text-brand-700 mt-0.5">
              {formattedEta}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Time Left</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {remainingMin} min
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Demo Trigger for Review */}
          <button
            type="button"
            onClick={triggerSimulatedReroute}
            className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
            title="Demonstrate dynamic AI re-routing alert for project presentation"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            Test AI Re-route
          </button>

          <button
            type="button"
            onClick={onEndNavigation}
            className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            End Navigation
          </button>
        </div>

      </div>

    </div>
  );
};
