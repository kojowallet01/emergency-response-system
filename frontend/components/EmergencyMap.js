import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Custom marker icons for different emergency types
const createCustomIcon = (type) => {
  const colors = {
    fire: '#ff5252',
    medical: '#2196f3',
    crime: '#ff9800'
  };
  
  const emoji = {
    fire: '🔥',
    medical: '🏥',
    crime: '🚔'
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${colors[type]};
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 20px;
        ">${emoji[type]}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

// Custom marker icon for responders
const createResponderIcon = (status) => {
  const colors = {
    on_scene: '#10b981',
    en_route: '#f59e0b'
  };

  return L.divIcon({
    className: 'responder-marker',
    html: `
      <div style="
        background: ${colors[status] || '#94a3b8'};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="font-size: 16px;">🚑</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Component to auto-fit map bounds to markers
function MapBounds({ reports }) {
  const map = useMap();

  useEffect(() => {
    if (reports.length > 0) {
      const bounds = reports.map(r => [r.latitude, r.longitude]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [reports, map]);

  return null;
}

export default function EmergencyMap({ reports, onMarkerClick, latitude, longitude, responderLocations = [], darkMode = false }) {
  // If single location mode (for responder tracking)
  if (latitude && longitude) {
    return (
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={darkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        
        {/* Emergency location marker */}
        <Marker
          position={[latitude, longitude]}
          icon={L.divIcon({
            className: 'emergency-marker',
            html: `
              <div style="
                background: #ef4444;
                width: 40px;
                height: 40px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="transform: rotate(45deg); font-size: 20px;">🚨</span>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
          })}
        >
          <Popup>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Emergency Location
            </div>
          </Popup>
        </Marker>

        {/* Responder location markers */}
        {responderLocations.map((location) => (
          <Marker
            key={`${location.report_id}-${location.responder_id}`}
            position={[location.latitude, location.longitude]}
            icon={createResponderIcon(location.status)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 8 }}>
                  {location.responder?.name || 'Responder'}
                </div>
                {location.responder && (
                  <div style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                    <strong>ID:</strong> {location.responder.responder_id}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    background: location.status === 'on_scene' ? '#d1fae5' : '#fed7aa',
                    color: location.status === 'on_scene' ? '#065f46' : '#9a3412'
                  }}>
                    {location.status.replace('_', ' ')}
                  </span>
                </div>
                {location.distance && (
                  <div style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                    <strong>Distance:</strong> {location.distance.toFixed(2)} km
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Updated: {new Date(location.updated_at).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    );
  }

  // Default center (Ghana)
  const defaultCenter = [7.9465, -1.0232];

  if (!reports || reports.length === 0) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f1f5f9',
        borderRadius: 12,
        color: '#64748b'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🗺️</div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>No emergency locations to display</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={7}
      style={{ height: '100%', width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapBounds reports={reports} />

      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={createCustomIcon(report.type)}
          eventHandlers={{
            click: () => onMarkerClick && onMarkerClick(report)
          }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {report.type === 'fire' ? '🔥' : report.type === 'medical' ? '🏥' : '🚔'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                    {report.type} Emergency
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(report.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                <strong>Location:</strong> {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}°
              </div>
              
              <div style={{ fontSize: '0.75rem', marginBottom: 8 }}>
                <strong>Status:</strong>{' '}
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: report.status === 'pending' ? '#fef2f2' : report.status === 'responding' ? '#fff7ed' : '#f0fdf4',
                  color: report.status === 'pending' ? '#dc2626' : report.status === 'responding' ? '#ea580c' : '#16a34a'
                }}>
                  {report.status}
                </span>
              </div>

              {report.description && (
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8 }}>
                  {report.description}
                </div>
              )}

              <button
                onClick={() => onMarkerClick && onMarkerClick(report)}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  background: '#0f172a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
