import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for emergency location
const emergencyIcon = L.divIcon({
  className: 'emergency-marker',
  html: `
    <div style="
      background: #ef4444;
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s ease-in-out infinite;
    ">
      <span style="transform: rotate(45deg); font-size: 20px;">🚨</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Custom icon for responder location
const responderIcon = L.divIcon({
  className: 'responder-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: bounce 1s ease-in-out infinite;
    ">
      <span style="font-size: 18px;">🚑</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

// Component to auto-fit map bounds
function MapBounds({ responderPos, emergencyPos, map }) {
  useEffect(() => {
    if (map && responderPos && emergencyPos) {
      const bounds = [
        [responderPos.latitude, responderPos.longitude],
        [emergencyPos.latitude, emergencyPos.longitude]
      ];
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [responderPos, emergencyPos, map]);

  return null;
}

export default function ResponderMap({ responderPosition, emergencyPosition, distance }) {
  if (!emergencyPosition) {
    return (
      <div style={{ 
        height: 250, 
        background: 'rgba(255,255,255,0.1)', 
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '0.9rem'
      }}>
        📍 No emergency location available
      </div>
    );
  }

  const center = responderPosition 
    ? [
        (responderPosition.latitude + emergencyPosition.latitude) / 2,
        (responderPosition.longitude + emergencyPosition.longitude) / 2
      ]
    : [emergencyPosition.latitude, emergencyPosition.longitude];

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ 
          height: 250, 
          width: '100%', 
          borderRadius: 12,
          border: '2px solid rgba(255,255,255,0.2)'
        }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Emergency location marker */}
        <Marker
          position={[emergencyPosition.latitude, emergencyPosition.longitude]}
          icon={emergencyIcon}
        >
          <Popup>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              🚨 Emergency Location
            </div>
          </Popup>
        </Marker>

        {/* Geofence circle (500m radius) */}
        <Circle
          center={[emergencyPosition.latitude, emergencyPosition.longitude]}
          radius={500}
          pathOptions={{
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 10'
          }}
        />

        {/* Responder location marker */}
        {responderPosition && (
          <>
            <Marker
              position={[responderPosition.latitude, responderPosition.longitude]}
              icon={responderIcon}
            >
              <Popup>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  🚑 Your Location
                  {distance && (
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                      {distance.toFixed(2)} km away
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Route line between responder and emergency */}
            <Polyline
              positions={[
                [responderPosition.latitude, responderPosition.longitude],
                [emergencyPosition.latitude, emergencyPosition.longitude]
              ]}
              pathOptions={{
                color: '#667eea',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Distance badge overlay */}
      {distance !== null && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          padding: '8px 14px',
          borderRadius: 8,
          color: 'white',
          fontSize: '0.85rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}>
          📍 {distance.toFixed(2)} km
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: rotate(-45deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: rotate(-45deg) scale(1.1);
            opacity: 0.8;
          }
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
}
