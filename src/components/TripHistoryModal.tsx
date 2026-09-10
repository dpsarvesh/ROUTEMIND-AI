import React from 'react';
import { TripHistoryItem } from '../types/navigation';
import { storageService } from '../services/storageService';
import { History, X, Trash2, ArrowRight, Play, Clock, Navigation } from 'lucide-react';

interface TripHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TripHistoryItem[];
  onRefresh: () => void;
  onPlanAgain: (item: TripHistoryItem) => void;
}

export const TripHistoryModal: React.FC<TripHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onRefresh,
  onPlanAgain,
}) => {
  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm('Clear all trip history?')) {
      storageService.clearTripHistory();
      onRefresh();
    }
  };

  const formatDate = (timestamp: number) => {
    const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (diffHours < 2) return 'Just now';
    if (diffHours < 24) return 'Earlier today';
    if (diffHours < 48) return 'Yesterday';
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 sm:p-6 my-6 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Travel History</h3>
              <p className="text-[11px] text-slate-500">Your recent navigation trips and routes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={handleClear}
                title="Clear History"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No recent trips logged yet. Planned routes will be saved here automatically.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400 font-medium">
                  <span className="capitalize">{item.mode} Travel • {formatDate(item.timestamp)}</span>
                  <span className="text-brand-700 font-bold bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                    AI Score {item.aiScore}%
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                  <span className="truncate">{item.fromName}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{item.toName}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-slate-400" /> {item.distanceKm} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {item.durationMin} min
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onPlanAgain(item);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 hover:underline"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Plan Again
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
