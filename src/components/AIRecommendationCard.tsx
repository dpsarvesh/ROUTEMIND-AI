import React from 'react';
import { AIRecommendation, RouteOption } from '../types/navigation';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface AIRecommendationCardProps {
  recommendation: AIRecommendation | null;
  recommendedRoute: RouteOption | null;
  onSelectRoute: (routeId: string) => void;
  onStartNavigation: () => void;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  recommendation,
  recommendedRoute,
  onSelectRoute,
  onStartNavigation,
}) => {
  if (!recommendation || !recommendedRoute) return null;

  return (
    <div className="bg-gradient-to-br from-brand-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-brand-500/30 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Card Header with AI badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-300">
              AI Decision Intelligence
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Recommended Choice: {recommendedRoute.name}
            </h3>
          </div>
        </div>

        {/* AI Score Pill */}
        <div className="text-right shrink-0">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold text-xs">
            <Zap className="w-3 h-3 text-emerald-400" />
            AI Score: {recommendedRoute.aiScore}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {recommendation.confidenceScore}% Model Confidence
          </p>
        </div>
      </div>

      {/* Main explanation paragraph */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/10 mb-3.5 backdrop-blur-xs">
        <p className="text-xs text-slate-200 leading-relaxed">
          {recommendation.detailedExplanation}
        </p>
      </div>

      {/* "Why?" Breakdown bullets */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-brand-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Why take {recommendedRoute.name.split('—')[0]}?
        </div>
        <ul className="space-y-1.5">
          {recommendation.reasons.map((r, i) => (
            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{r}</span>
            </li>
          ))}
          {recommendation.tradeoffs.map((t, i) => (
            <li key={`t-${i}`} className="text-xs text-amber-200/90 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400">
          Optimized for: <span className="font-bold text-white capitalize">{recommendation.preferenceUsed}</span>
        </div>
        <button
          type="button"
          onClick={onStartNavigation}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/30 transition-all flex items-center gap-1.5"
        >
          <span>Start Navigation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
