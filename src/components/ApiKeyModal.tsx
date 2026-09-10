import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { googleMapsService } from '../services/googleMapsService';
import { Key, X, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyApplied: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeyApplied }) => {
  const [apiKey, setApiKey] = useState(storageService.getGoogleApiKey());
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsTesting(true);
    setStatusMsg(null);

    const trimmed = apiKey.trim();
    if (!trimmed) {
      storageService.saveGoogleApiKey('');
      setStatusMsg({ type: 'info', text: 'API key cleared. System is running in Interactive Demo Mode.' });
      setIsTesting(false);
      onKeyApplied();
      return;
    }

    storageService.saveGoogleApiKey(trimmed);
    const success = await googleMapsService.loadGoogleMaps(trimmed);

    setIsTesting(false);
    if (success) {
      setStatusMsg({ type: 'success', text: 'Google Maps API successfully initialized!' });
      setTimeout(() => {
        onKeyApplied();
        onClose();
      }, 1200);
    } else {
      setStatusMsg({
        type: 'error',
        text: 'Could not initialize Google Maps with this key. Please check billing or API restrictions, or keep using Demo Mode.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-5 sm:p-6 my-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Google Maps Platform Key</h3>
              <p className="text-[11px] text-slate-500">Optional: Connect live Google Maps services</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Google Maps API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-brand-600" />
              API Key Requirements:
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
              <li>Maps JavaScript API</li>
              <li>Directions API (with trafficModel support)</li>
              <li>Places API (Autocomplete)</li>
            </ul>
            <p className="pt-1 text-[10px] text-slate-400">
              If left blank, the application automatically runs in <strong>Interactive Demo Mode</strong> with realistic Coimbatore local and inter-district datasets.
            </p>
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isTesting}
              className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isTesting ? 'Validating Key...' : 'Save & Connect Google Maps'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
