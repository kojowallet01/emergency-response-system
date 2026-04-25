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

export default function EmergencyMap({ reports, onMarkerClick }) {
  // Default center (Ghana)
  const defaultCenter = [7.9465, -1.0232];

  if (reports.length === 0) {
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
