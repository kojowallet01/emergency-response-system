import { useEffect, useRef } from 'react';

export default function MapView({ center=[5.55,-0.2], markers=[], zoom=11 }){
  const mapRef = useRef(null);

  useEffect(()=>{
    if (typeof window === 'undefined') return;
    
    const L = require('leaflet');
    const mapEl = mapRef.current;
    if (!mapEl) return;

    if (!mapEl._leafletMap){
      const map = L.map(mapEl).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      mapEl._leafletMap = map;
      mapEl._leafletMarkers = [];
    }

    const map = mapEl._leafletMap;
    map.setView(center, zoom);
    mapEl._leafletMarkers.forEach(m=>map.removeLayer(m));
    mapEl._leafletMarkers = markers.map(r=>{
      const m = L.marker([r.latitude, r.longitude]).addTo(map);
      m.bindPopup('<b>' + r.type.toUpperCase() + '</b><br/>' + (r.description||'') + '<br/>' + new Date(r.created_at).toLocaleString());
      return m;
    });
  }, [center, markers, zoom]);

  return <div ref={mapRef} style={{height:'100%'}} />
}
