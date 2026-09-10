import React from 'react';
import { RouteOption, TravelPreference } from '../types/navigation';
import { ScoringWeights, PREFERENCE_WEIGHTS } from '../services/aiScoringEngine';
import { Sliders, X, Sparkles, HelpCircle, CheckCircle } from 'lucide-react';

interface AIDecisionMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteOption[];
  currentWeights: ScoringWeights;
  onUpdateWeights: (newWeights: ScoringWeights) => void;
  preference: TravelPreference;
  onResetWeights: () => void;
}

export const AIDecisionMatrixModal: React.FC<AIDecisionMatrixModalProps> = ({
  isOpen,
  onClose,
  routes,
  currentWeights,
  onUpdateWeights,
  preference,
  onResetWeights,
}) => {
  if (!isOpen) return null;

  const handleSliderChange = (key: keyof ScoringWeights, val: number) => {
    onUpdateWeights({
      ...currentWeights,
      [key]: val,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
              <Sliders className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  AI Decision Intelligence & Scoring Matrix
                </h3>
                <span className="text-[10px] uppercase font-extrabold bg-brand-500/30 text-brand-300 px-2 py-0.5 rounded-full border border-brand-400/30">
                  College Defense Ready
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Multi-Criteria Decision Analysis (MCDA) weighting formula
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Mathematical Formula Box */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-1.5 font-bold text-slate-800">
              <span className="flex items-center gap-1.5 text-brand-700 font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                Score Formula = ∑ (w_i × Score_i)
              </span>
              <span className="text-[10px] text-slate-400">0 – 100 Normalized Scale</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              The AI evaluates candidate paths using normalized scoring criteria across:
              <strong className="text-slate-800"> Travel Time, Traffic Delay Factor, Incident & Hazard Risk, Pavement Quality,</strong> and <strong className="text-slate-800">Distance</strong>.
            </p>
          </div>

          {/* Interactive Weight Sliders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Live Dynamic Weight Tuning (Test in Real-Time)
              </h4>
              <button
                type="button"
                onClick={onResetWeights}
                className="text-xs font-semibold text-brand-600 hover:text-brand-800 underline"
              >
                Reset to {preference.toUpperCase()} profile
              </button>
            </div>

            <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              
              {/* Time Weight */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Travel Time Weight (w_time)</span>
                  <span className="font-mono font-bold text-brand-600">
                    {Math.round(currentWeights.time * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={currentWeights.time}
                  onChange={(e) => handleSliderChange('time', parseFloat(e.target.value))}
                  className="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Traffic Weight */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Live Traffic Congestion Weight (w_traffic)</span>
                  <span className="font-mono font-bold text-brand-600">
                    {Math.round(currentWeights.traffic * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={currentWeights.traffic}
                  onChange={(e) => handleSliderChange('traffic', parseFloat(e.target.value))}
                  className="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Safety Weight */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Safety & Road Block Avoidance (w_safety)</span>
                  <span className="font-mono font-bold text-brand-600">
                    {Math.round(currentWeights.safety * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={currentWeights.safety}
                  onChange={(e) => handleSliderChange('safety', parseFloat(e.target.value))}
                  className="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Road Quality Weight */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Pavement / Surface Quality (w_road)</span>
                  <span className="font-mono font-bold text-brand-600">
                    {Math.round(currentWeights.road * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={currentWeights.road}
                  onChange={(e) => handleSliderChange('road', parseFloat(e.target.value))}
                  className="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance Weight */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Direct Distance Penalty (w_distance)</span>
                  <span className="font-mono font-bold text-brand-600">
                    {Math.round(currentWeights.distance * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={currentWeights.distance}
                  onChange={(e) => handleSliderChange('distance', parseFloat(e.target.value))}
                  className="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

            </div>
          </div>

          {/* Decision Comparison Matrix Table */}
          {routes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                Candidate Comparison Matrix
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Candidate Route</th>
                      <th className="p-2.5 text-center">Time Sub-Score</th>
                      <th className="p-2.5 text-center">Traffic Sub-Score</th>
                      <th className="p-2.5 text-center">Safety Sub-Score</th>
                      <th className="p-2.5 text-center">Road Sub-Score</th>
                      <th className="p-2.5 text-center bg-brand-50 text-brand-900">Total AI Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-2.5 font-semibold text-slate-900">
                          {r.name.split('—')[0]}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600">
                          {r.scoreBreakdown?.travelTimeScore ?? '-'}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600">
                          {r.scoreBreakdown?.trafficScore ?? '-'}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600">
                          {r.scoreBreakdown?.safetyScore ?? '-'}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600">
                          {r.scoreBreakdown?.roadConditionScore ?? '-'}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-brand-700 bg-brand-50/40">
                          {r.aiScore}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Apply & Close Matrix
          </button>
        </div>

      </div>
    </div>
  );
};
