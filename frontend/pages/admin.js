import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Admin(){
  const [reports, setReports] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE + '/reports');
        setReports(res.data || []);
      } catch (e) {
        console.error('Failed to load:', e);
      }
    };
    load();
    
    // Refresh every 5 seconds
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = reports.filter(r => 
    (typeFilter === 'all' || r.type === typeFilter) && 
    (statusFilter === 'all' || r.status === statusFilter)
  );

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_BASE}/report/${id}`, { status });
      setReports(prev => prev.map(r => r._id === id ? {...r, status} : r));
    } catch (e) {
      console.error('Failed to update:', e);
    }
  };

  const getEmojis = (type) => {
    const map = { fire: '🔥', medical: '🏥', crime: '🚔' };
    return map[type] || '🚨';
  };

  const getStatusColor = (status) => {
    const colors = { pending: '#ff9800', responding: '#2196f3', resolved: '#4caf50' };
    return colors[status] || '#999';
  };

  const getGoogleMapsUrl = (lat, lng) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: 20 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ marginBottom: 5 }}>🚨 Emergency Dashboard</h1>
          <p style={{ color: '#999', marginBottom: 15 }}>Real-time Emergency Response Management with Live Tracking</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            📡 Total Alerts: <strong>{reports.length}</strong> | 
            ⏳ Pending: <strong>{reports.filter(r => r.status === 'pending').length}</strong> | 
            🚗 Responding: <strong>{reports.filter(r => r.status === 'responding').length}</strong> | 
            ✓ Resolved: <strong>{reports.filter(r => r.status === 'resolved').length}</strong>
          </p>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Emergency Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <option value="all">📋 All Types</option>
                <option value="fire">🔥 Fire</option>
                <option value="medical">🏥 Medical</option>
                <option value="crime">🚔 Crime</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Response Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <option value="all">📊 All Statuses</option>
                <option value="pending">⏳ Pending</option>
                <option value="responding">🚗 Responding</option>
                <option value="resolved">✓ Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Report Detail Modal */}
        {selectedReport && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20
          }}>
            <div className="card" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button 
                onClick={() => setSelectedReport(null)}
                style={{ position: 'absolute', top: 15, right: 15, background: '#f44336', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
              
              <h2 style={{ marginBottom: 20 }}>{getEmojis(selectedReport.type)} {selectedReport.type.toUpperCase()}</h2>
              
              {/* Status Badge */}
              <div style={{ background: getStatusColor(selectedReport.status), color: 'white', padding: '10px 15px', borderRadius: '8px', marginBottom: 15, fontWeight: 600 }}>
                {selectedReport.status.toUpperCase()}
              </div>

              {/* Location Info with Material Icons */}
              <div style={{ background: '#e3f2fd', padding: 15, borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #2196f3' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1565c0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="material-icons" style={{ fontSize: '20px' }}>location_on</i>
                  Location Coordinates (Live Tracking)
                </p>
                <p style={{ margin: '0 0 8px 0', color: '#1565c0' }}>
                  Latitude: <strong>{selectedReport.latitude?.toFixed(6)}</strong><br/>
                  Longitude: <strong>{selectedReport.longitude?.toFixed(6)}</strong><br/>
                  Accuracy: <strong>±{Math.round(selectedReport.accuracy || 0)}m</strong>
                </p>
                <a 
                  href={getGoogleMapsUrl(selectedReport.latitude, selectedReport.longitude)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#2196f3', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="material-icons" style={{ fontSize: '18px' }}>map</i>
                  Open in Google Maps →
                </a>
              </div>

              {/* Time & Details with Material Icons */}
              <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                  <i className="material-icons" style={{ fontSize: '18px', color: '#666' }}>schedule</i>
                  <strong>Reported:</strong> {new Date(selectedReport.created_at).toLocaleString()}
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                  <i className="material-icons" style={{ fontSize: '18px', color: '#666' }}>warning</i>
                  <strong>Type:</strong> {selectedReport.type.toUpperCase()}
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                  <i className="material-icons" style={{ fontSize: '18px', color: '#666' }}>call</i>
                  <strong>Responder:</strong> {selectedReport.responderNumber}
                </p>
                <p style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: 0 }}>
                  <i className="material-icons" style={{ fontSize: '18px', color: '#666', marginTop: '4px' }}>description</i>
                  <span><strong>Description:</strong> {selectedReport.description}</span>
                </p>
              </div>

              {/* Voice Message with Material Icons */}
              {selectedReport.voice_url && (
                <div style={{ background: '#f3e5f5', padding: 15, borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #9c27b0' }}>
                  <p style={{ fontWeight: 600, marginBottom: 10, color: '#6a1b9a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="material-icons" style={{ fontSize: '20px' }}>mic</i>
                    Voice Message from Victim
                  </p>
                  <audio controls style={{ width: '100%', minHeight: '40px' }} src={selectedReport.voice_url} />
                  <p style={{ fontSize: '0.8rem', color: '#6a1b9a', marginTop: '8px', margin: '8px 0 0 0' }}>
                    🔊 Click play to hear victim's description of the situation
                  </p>
                </div>
              )}

              {/* Media Files with Material Icons */}
              {selectedReport.media_urls && selectedReport.media_urls.length > 0 && (
                <div style={{ background: '#f3e5f5', padding: 15, borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #9c27b0' }}>
                  <p style={{ fontWeight: 600, marginBottom: 10, color: '#6a1b9a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="material-icons" style={{ fontSize: '20px' }}>image</i>
                    Attached Media ({selectedReport.media_count})
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                    {selectedReport.media_urls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ cursor: 'pointer', textDecoration: 'none', position: 'relative' }}>
                        <div style={{ background: '#ddd', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'transform 0.2s' }}>
                          {url.includes('video') || url.endsWith('.mp4') || url.endsWith('.mov') ? (
                            <>
                              <div style={{ background: '#000', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="material-icons" style={{ fontSize: '40px', color: '#fff' }}>play_circle_outline</i>
                              </div>
                            </>
                          ) : (
                            <i className="material-icons" style={{ fontSize: '40px', color: '#666' }}>image_not_supported</i>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
                {selectedReport.status !== 'responding' && (
                  <button 
                    onClick={() => {
                      updateStatus(selectedReport._id, 'responding');
                      setSelectedReport(null);
                    }}
                    style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#2196f3', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                  >
                    🚗 Mark Responding
                  </button>
                )}
                {selectedReport.status !== 'resolved' && (
                  <button 
                    onClick={() => {
                      updateStatus(selectedReport._id, 'resolved');
                      setSelectedReport(null);
                    }}
                    style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ✓ Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 15 }}>
          {filtered.map(r => (
            <div key={r._id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', borderLeft: `5px solid ${getStatusColor(r.status)}` }}>
              <div onClick={() => setSelectedReport(r)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ margin: 0 }}>{getEmojis(r.type)} {r.type.toUpperCase()}</h3>
                  <span style={{ background: getStatusColor(r.status), color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {r.status.toUpperCase()}
                  </span>
                </div>

                <p style={{ color: '#666', marginBottom: 10 }}>{r.description}</p>

                <div style={{ background: '#f0f0f0', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}>
                    <strong>📍 Location:</strong> {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                  </p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}>
                    <strong>🎯 Accuracy:</strong> ±{Math.round(r.accuracy || 0)}m
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    <strong>🕐 Time:</strong> {new Date(r.created_at).toLocaleTimeString()}
                  </p>
                </div>

                {/* Media Indicators with Material Icons */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {r.voice_url && (
                    <span style={{ background: '#e1bee7', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', color: '#6a1b9a', fontWeight: 500 }}>
                      <i className="material-icons" style={{ fontSize: '16px', display: 'inline' }}>mic</i>
                      Voice
                    </span>
                  )}
                  {r.media_count > 0 && (
                    <span style={{ background: '#c5e1a5', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', color: '#558b2f', fontWeight: 500 }}>
                      <i className="material-icons" style={{ fontSize: '16px', display: 'inline' }}>image_multiple</i>
                      {r.media_count} File{r.media_count > 1 ? 's' : ''}
                    </span>
                  )}
                  {r.responderNumber && (
                    <span style={{ background: '#c8e6c9', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', color: '#2e7d32', fontWeight: 500 }}>
                      <i className="material-icons" style={{ fontSize: '16px', display: 'inline' }}>phone</i>
                      {r.responderNumber}
                    </span>
                  )}
                  <span style={{ background: '#b3e5fc', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', color: '#01579b', fontWeight: 500 }}>
                    <i className="material-icons" style={{ fontSize: '16px', display: 'inline' }}>location_on</i>
                    Live
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {r.status !== 'responding' && (
                  <button 
                    onClick={() => updateStatus(r._id, 'responding')}
                    style={{ padding: '10px', borderRadius: '6px', border: 'none', background: '#2196f3', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                  >
                    Respond
                  </button>
                )}
                {r.status !== 'resolved' && (
                  <button 
                    onClick={() => updateStatus(r._id, 'resolved')}
                    style={{ padding: '10px', borderRadius: '6px', border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                  >
                    Resolve
                  </button>
                )}
              </div>

              {/* View Details */}
              <button 
                onClick={() => setSelectedReport(r)}
                style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: '6px', border: '2px solid #667eea', background: 'white', color: '#667eea', cursor: 'pointer', fontWeight: 600 }}
              >
                View Full Details
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: '2rem', marginBottom: 10 }}>📭</p>
            <p style={{ color: '#999' }}>No emergency alerts in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
