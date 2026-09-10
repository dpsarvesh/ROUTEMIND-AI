import React, { useEffect, useRef, useState } from 'react';
import { RouteOption, LatLng, IncidentWarning } from '../types/navigation';
import { googleMapsService } from '../services/googleMapsService';
import { Layers, Crosshair, ZoomIn, ZoomOut, AlertTriangle, Sparkles, Key } from 'lucide-react';
import L from 'leaflet';

interface MapContainerProps {
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  onSelectRoute: (routeId: string) => void;
  userCoords: LatLng | null;
  hasGps: boolean;
  onOpenApiKeyModal: () => void;
  centerCoords?: LatLng;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  routes,
  selectedRoute,
  onSelectRoute,
  userCoords,
  hasGps,
  onOpenApiKeyModal,
  centerCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [useGoogleMaps, setUseGoogleMaps] = useState<boolean>(false);
  const [trafficLayerEnabled, setTrafficLayerEnabled] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // References for Leaflet
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletPolylinesRef = useRef<L.Polyline[]>([]);
  const leafletMarkersRef = useRef<L.Marker[]>([]);

  // References for Google Maps
  const gMapRef = useRef<any>(null);
  const gTrafficLayerRef = useRef<any>(null);
  const gPolylinesRef = useRef<any[]>([]);
  const gMarkersRef = useRef<any[]>([]);

  // Check if Google Maps is available
  useEffect(() => {
    const isAvail = googleMapsService.isGoogleMapsAvailable();
    setUseGoogleMaps(isAvail);
  }, []);

  // Initialize Map Engine (Google Maps or Leaflet Fallback)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = centerCoords || { lat: 11.0183, lng: 76.9644 }; // Default Coimbatore center

    if (useGoogleMaps && window.google?.maps) {
      // Clean up Leaflet if existed
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      if (!gMapRef.current) {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 12,
          mapTypeId: mapType === 'satellite' ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: false,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] }
          ]
        });

        gMapRef.current = map;
        const trafficLayer = new window.google.maps.TrafficLayer();
        gTrafficLayerRef.current = trafficLayer;
        if (trafficLayerEnabled) {
          trafficLayer.setMap(map);
        }
      }
    } else {
      // Leaflet Map Initialization
      if (!leafletMapRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          center: [initialCenter.lat, initialCenter.lng],
          zoom: 12,
        });

        L.tileLayer(
          mapType === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          {
            attribution: '&copy; OpenStreetMap &copy; CartoDB',
            maxZoom: 19,
          }
        ).addTo(map);

        leafletMapRef.current = map;
      }
    }

    return () => {
      // cleanup on unmount
    };
  }, [useGoogleMaps]);

  // Handle Map Type Change
  useEffect(() => {
    if (useGoogleMaps && gMapRef.current && window.google?.maps) {
      gMapRef.current.setMapTypeId(
        mapType === 'satellite' ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.ROADMAP
      );
    } else if (leafletMapRef.current) {
      // Re-add tile layer with chosen style
      leafletMapRef.current.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          leafletMapRef.current?.removeLayer(layer);
        }
      });

      L.tileLayer(
        mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CartoDB',
          maxZoom: 19,
        }
      ).addTo(leafletMapRef.current);
    }
  }, [mapType, useGoogleMaps]);

  // Handle Traffic Layer Toggle
  useEffect(() => {
    if (useGoogleMaps && gTrafficLayerRef.current && gMapRef.current) {
      if (trafficLayerEnabled) {
        gTrafficLayerRef.current.setMap(gMapRef.current);
      } else {
        gTrafficLayerRef.current.setMap(null);
      }
    }
  }, [trafficLayerEnabled, useGoogleMaps]);

  // Render Routes and Markers
  useEffect(() => {
    if (useGoogleMaps && gMapRef.current && window.google?.maps) {
      // Clear previous Google polylines and markers
      gPolylinesRef.current.forEach(p => p.setMap(null));
      gPolylinesRef.current = [];
      gMarkersRef.current.forEach(m => m.setMap(null));
      gMarkersRef.current = [];

      if (!routes || routes.length === 0) return;

      const bounds = new window.google.maps.LatLngBounds();

      // Render routes
      routes.forEach(route => {
        const isSelected = selectedRoute?.id === route.id;
        const path = route.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));

        const polyline = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: isSelected ? '#146ef5' : '#94a3b8',
          strokeOpacity: isSelected ? 0.95 : 0.65,
          strokeWeight: isSelected ? 6 : 4,
          zIndex: isSelected ? 10 : 2,
          map: gMapRef.current,
        });

        polyline.addListener('click', () => onSelectRoute(route.id));
        gPolylinesRef.current.push(polyline);

        if (isSelected) {
          path.forEach(pt => bounds.extend(pt));
        }
      });

      // Markers for Origin and Destination
      if (selectedRoute && selectedRoute.coordinates.length > 0) {
        const originCoord = selectedRoute.coordinates[0];
        const destCoord = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];

        // Origin Marker (Green)
        const originMarker = new window.google.maps.Marker({
          position: originCoord,
          map: gMapRef.current,
          title: 'Start Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });
        gMarkersRef.current.push(originMarker);

        // Destination Marker (Red Flag/Pin)
        const destMarker = new window.google.maps.Marker({
          position: destCoord,
          map: gMapRef.current,
          title: 'Destination',
          icon: {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });
        gMarkersRef.current.push(destMarker);

        // Incident Markers
        selectedRoute.warnings.forEach(w => {
          if (w.lat && w.lng) {
            const incMarker = new window.google.maps.Marker({
              position: { lat: w.lat, lng: w.lng },
              map: gMapRef.current,
              title: w.title,
            });
            const info = new window.google.maps.InfoWindow({
              content: `<div style="padding:4px;"><strong>⚠ ${w.title}</strong><p style="margin:2px 0 0;font-size:12px;">${w.description}</p></div>`
            });
            incMarker.addListener('click', () => info.open(gMapRef.current, incMarker));
            gMarkersRef.current.push(incMarker);
          }
        });

        // Fit Bounds
        gMapRef.current.fitBounds(bounds, 50);
      }

    } else if (leafletMapRef.current) {
      // Leaflet rendering
      const map = leafletMapRef.current;

      // Clear previous polylines & markers
      leafletPolylinesRef.current.forEach(p => map.removeLayer(p));
      leafletPolylinesRef.current = [];
      leafletMarkersRef.current.forEach(m => map.removeLayer(m));
      leafletMarkersRef.current = [];

      if (!routes || routes.length === 0) return;

      const latLngBounds: [number, number][] = [];

      routes.forEach(route => {
        const isSelected = selectedRoute?.id === route.id;
        const latLngs: [number, number][] = route.coordinates.map(c => [c.lat, c.lng]);

        const poly = L.polyline(latLngs, {
          color: isSelected ? '#146ef5' : '#94a3b8',
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.95 : 0.65,
          dashArray: isSelected ? undefined : '6, 6',
        }).addTo(map);

        poly.on('click', () => onSelectRoute(route.id));
        leafletPolylinesRef.current.push(poly);

        if (isSelected) {
          latLngs.forEach(pt => latLngBounds.push(pt));
        }
      });

      // Markers for Origin and Destination
      if (selectedRoute && selectedRoute.coordinates.length > 0) {
        const originCoord = selectedRoute.coordinates[0];
        const destCoord = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];

        // Origin Green Pin
        const startIcon = L.divIcon({
          className: 'custom-pin-start',
          html: `<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const startMarker = L.marker([originCoord.lat, originCoord.lng], { icon: startIcon })
          .bindPopup(`<strong>Origin:</strong> Starting Location`)
          .addTo(map);
        leafletMarkersRef.current.push(startMarker);

        // Destination Red Pin
        const destIcon = L.divIcon({
          className: 'custom-pin-dest',
          html: `<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">★</div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const destMarker = L.marker([destCoord.lat, destCoord.lng], { icon: destIcon })
          .bindPopup(`<strong>Destination:</strong> Arrival Point`)
          .addTo(map);
        leafletMarkersRef.current.push(destMarker);

        // Incident warning markers
        selectedRoute.warnings.forEach(w => {
          if (w.lat && w.lng) {
            const incIcon = L.divIcon({
              className: 'custom-pin-incident',
              html: `<div style="background:#f59e0b;color:white;width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">⚠</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            const incMarker = L.marker([w.lat, w.lng], { icon: incIcon })
              .bindPopup(`<strong>⚠ ${w.title}</strong><p style="font-size:11px;margin:2px 0 0;">${w.description}</p>`)
              .addTo(map);
            leafletMarkersRef.current.push(incMarker);
          }
        });

        // User Live Location Marker
        if (userCoords) {
          const userIcon = L.divIcon({
            className: 'live-user-pulse',
            html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px #2563eb;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const uMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
            .bindPopup('<strong>Your Current GPS Location</strong>')
            .addTo(map);
          leafletMarkersRef.current.push(uMarker);
        }

        if (latLngBounds.length > 0) {
          map.fitBounds(latLngBounds, { padding: [40, 40] });
        }
      }
    }
  }, [routes, selectedRoute, userCoords, useGoogleMaps]);

  // Center on Current Location
  const handleCenterOnLocation = () => {
    if (!userCoords) return;
    if (useGoogleMaps && gMapRef.current) {
      gMapRef.current.panTo(userCoords);
      gMapRef.current.setZoom(15);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.setView([userCoords.lat, userCoords.lng], 15);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => {
    if (useGoogleMaps && gMapRef.current) {
      gMapRef.current.setZoom(gMapRef.current.getZoom() + 1);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (useGoogleMaps && gMapRef.current) {
      gMapRef.current.setZoom(gMapRef.current.getZoom() - 1);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/80 shadow-md">
      
      {/* Map DOM target */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* Top Banner indicating Google Maps vs Fallback Mode */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        {useGoogleMaps ? (
          <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Google Maps Platform Active</span>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>RouteMind Vector Map Active</span>
            <button
              onClick={onOpenApiKeyModal}
              className="text-[10px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded border border-brand-200 transition-colors flex items-center gap-1"
            >
              <Key className="w-2.5 h-2.5" />
              Google Key
            </button>
          </div>
        )}
      </div>

      {/* Map Controls Floating Overlay */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        
        {/* Satellite / Roadmap Toggle */}
        <button
          type="button"
          onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
          title="Toggle Satellite / Default View"
          className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-md flex items-center justify-center transition-colors"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* Traffic Layer Toggle */}
        <button
          type="button"
          onClick={() => setTrafficLayerEnabled(!trafficLayerEnabled)}
          title="Toggle Traffic Layer"
          className={`w-10 h-10 rounded-xl border shadow-md flex items-center justify-center transition-colors ${
            trafficLayerEnabled
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <span className="text-xs font-black">🚦</span>
        </button>

        {/* Current Location Button */}
        <button
          type="button"
          onClick={handleCenterOnLocation}
          title="Center on My Location"
          disabled={!hasGps}
          className="w-10 h-10 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-xl border border-slate-200 shadow-md flex items-center justify-center transition-colors"
        >
          <Crosshair className="w-5 h-5 text-brand-600" />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl border border-slate-200 shadow-md bg-white overflow-hidden mt-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-9 hover:bg-slate-50 text-slate-700 flex items-center justify-center border-b border-slate-100 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-9 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-xs p-2 rounded-xl border border-slate-200 shadow-sm text-[11px] text-slate-600 hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 bg-[#146ef5] rounded-full inline-block" />
          <span className="font-semibold text-slate-800">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 bg-[#94a3b8] rounded-full inline-block" />
          <span>Alternatives</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Origin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          <span>Dest</span>
        </div>
      </div>

    </div>
  );
};
