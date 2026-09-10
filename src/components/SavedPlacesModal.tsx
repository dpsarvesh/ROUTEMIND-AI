import React, { useState } from 'react';
import { SavedPlace } from '../types/navigation';
import { storageService } from '../services/storageService';
import { Bookmark, Home, Briefcase, GraduationCap, Heart, Plus, Trash2, X, MapPin } from 'lucide-react';

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPlaces: SavedPlace[];
  onRefresh: () => void;
  onSelectPlace: (place: SavedPlace) => void;
}

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  savedPlaces,
  onRefresh,
  onSelectPlace,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<SavedPlace['category']>('favorite');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !address.trim()) return;

    // Approximate lat/lng around Coimbatore center for new custom saved places
    storageService.savePlace({
      title: title.trim(),
      address: address.trim(),
      category,
      lat: 11.0183 + (Math.random() - 0.5) * 0.05,
      lng: 76.9644 + (Math.random() - 0.5) * 0.05,
    });

    setTitle('');
    setAddress('');
    setShowAddForm(false);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    storageService.deleteSavedPlace(id);
    onRefresh();
  };

  const getCategoryIcon = (cat: SavedPlace['category']) => {
    switch (cat) {
      case 'home':
        return <Home className="w-4 h-4 text-brand-600" />;
      case 'work':
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'college':
        return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      case 'favorite':
      default:
        return <Heart className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-5 sm:p-6 my-6 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Saved Places</h3>
              <p className="text-[11px] text-slate-500">Fast one-tap routing for your routine destinations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {savedPlaces.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No saved places yet. Add your Home, Work, or College!
            </div>
          ) : (
            savedPlaces.map((place) => (
              <div
                key={place.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-brand-50/40 hover:border-brand-200 transition-all flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectPlace(place);
                    onClose();
                  }}
                  className="flex items-start gap-2.5 text-left flex-1 min-w-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    {getCategoryIcon(place.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {place.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate">{place.address}</span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(place.id)}
                  title="Remove"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}

          {/* Add Place Form */}
          {showAddForm ? (
            <form onSubmit={handleAdd} className="p-3.5 bg-slate-50 rounded-2xl border border-brand-200 space-y-3 mt-3">
              <div className="text-xs font-bold text-slate-800">Add New Saved Location</div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Place Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. My Gym or PSG Tech"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Avinashi Road, Peelamedu"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SavedPlace['category'])}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="college">College / University</option>
                  <option value="favorite">Favorite Place</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  Save Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-brand-300 rounded-2xl text-xs font-bold text-slate-600 hover:text-brand-700 flex items-center justify-center gap-1.5 transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Add New Place
            </button>
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
