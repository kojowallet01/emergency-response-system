import { useEffect, useState } from "react";
import axios from "axios";
import Head from "next/head";

const Admin = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streetName, setStreetName] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  // Get API base - use environment variable or fallback
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
  const apiConfigured = Boolean(process.env.NEXT_PUBLIC_API_BASE);

  useEffect(() => {
    if (!apiConfigured) {
      setLoading(false);
      setReports([]);
      return;
    }

    const load = async () => {
      try {
        const res = await axios.get(apiBase + "/reports");
        const data = res.data || [];
        // Ensure data is an array
        setReports(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching reports:", e);
        setReports([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, status) => {
    if (!apiConfigured) {
      alert("API not configured. Set NEXT_PUBLIC_API_BASE in frontend/.env.local and restart the frontend.");
      return;
    }

    try {
      await axios.patch(`${apiBase}/report/${id}`, { status });
      setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r));
    } catch (e) {
      console.error(e);
    }
  };

  const getStreetName = async (lat, lng) => {
    setLoadingLocation(true);
    setStreetName(null);
    try {
      // Use Google Maps Geocoding API (requires API key)
      const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!GOOGLE_API_KEY) {
        // Fallback to OpenStreetMap if no Google API key
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const address = response.data.address;
        const street = address.road || address.street || address.neighbourhood || address.village || address.town || address.city || "Unknown Location";
        setStreetName(street);
      } else {
        // Use Google Maps Geocoding API
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
        );
        if (response.data.results && response.data.results.length > 0) {
          const address = response.data.results[0];
          // Get formatted address or street
          const street = address.formatted_address || address.address_components[0]?.long_name || "Unknown Location";
          setStreetName(street);
        } else {
          setStreetName("Location not found");
        }
      }
    } catch (e) {
      console.error("Geocoding error:", e);
      setStreetName("Unable to fetch location name");
    } finally {
      setLoadingLocation(false);
    }
  };

  const filtered = Array.isArray(reports) ? reports.filter(r => filter === "all" || r.status === filter) : [];
  const pending = Array.isArray(reports) ? reports.filter(r => r.status === "pending").length : 0;
  const responding = Array.isArray(reports) ? reports.filter(r => r.status === "responding").length : 0;
  const resolved = Array.isArray(reports) ? reports.filter(r => r.status === "resolved").length : 0;
  const responseRate = Array.isArray(reports) && reports.length > 0 ? Math.round(((responding + resolved) / reports.length) * 100) : 0;

  return (
    <div style={{ background: "linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)", minHeight: "100vh", color: "#e2e8f0" }}>
      <div style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 50%, #1e40af 100%)", padding: "40px 20px", textAlign: "center", borderBottom: "3px solid #fbbf24", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 10 }}>
          <a href="/admin" style={{ padding: "10px 20px", background: "rgba(255,255,255,0.1)", color: "white", textDecoration: "none", borderRadius: 6, fontSize: "0.9rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => { e.target.style.background = "rgba(255,255,255,0.2)"; }} onMouseOut={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; }}>
            🔄 Live
          </a>
          <a href="/reports" style={{ padding: "10px 20px", background: "rgba(255,255,255,0.15)", color: "white", textDecoration: "none", borderRadius: 6, fontSize: "0.9rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => { e.target.style.background = "rgba(255,255,255,0.25)"; }} onMouseOut={(e) => { e.target.style.background = "rgba(255,255,255,0.15)"; }}>
            📋 Archive
          </a>
        </div>
        <h1 style={{ margin: "0 0 10px 0", fontSize: "2.8rem", fontWeight: 900, color: "white" }}>🚨 EMERGENCY CONTROL CENTER 🚨</h1>
        <p style={{ margin: 0, fontSize: "1.1rem", opacity: 0.9 }}>Real-time Crisis Management</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 15, marginTop: 30, maxWidth: 1200, margin: "30px auto 0" }}>
          <div style={{ background: "rgba(220,38,38,0.2)", padding: 20, borderRadius: 10, border: "2px solid #fca5a5" }}>
            <div style={{ fontSize: "0.9rem", color: "#fecaca", fontWeight: 700 }}>⏳ PENDING</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fca5a5" }}>{pending}</div>
          </div>
          <div style={{ background: "rgba(59,130,246,0.2)", padding: 20, borderRadius: 10, border: "2px solid #60a5fa" }}>
            <div style={{ fontSize: "0.9rem", color: "#93c5fd", fontWeight: 700 }}>🚗 RESPONDING</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#60a5fa" }}>{responding}</div>
          </div>
          <div style={{ background: "rgba(34,197,94,0.2)", padding: 20, borderRadius: 10, border: "2px solid #4ade80" }}>
            <div style={{ fontSize: "0.9rem", color: "#86efac", fontWeight: 700 }}>✓ RESOLVED</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#4ade80" }}>{resolved}</div>
          </div>
          <div style={{ background: "rgba(251,191,36,0.2)", padding: 20, borderRadius: 10, border: "2px solid #fbbf24" }}>
            <div style={{ fontSize: "0.9rem", color: "#fcd34d", fontWeight: 700 }}>📡 RESPONSE RATE</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fbbf24" }}>{responseRate}%</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "30px 20px" }}>
        {!apiConfigured && (
          <div style={{ background: "#ffebee", color: "#b71c1c", border: "2px solid #ef5350", borderRadius: 10, padding: 12, marginBottom: 20, fontSize: "0.9rem", fontWeight: 700 }}>
            API not configured. Set NEXT_PUBLIC_API_BASE in frontend/.env.local and restart the frontend.
          </div>
        )}

        <div style={{ display: "flex", gap: 15, marginBottom: 20, alignItems: "center" }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: "10px 15px", borderRadius: 8, border: "2px solid #475569", background: "#0f172a", color: "#e2e8f0", fontWeight: 500, cursor: "pointer" }}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="responding">Responding</option>
            <option value="resolved">Resolved</option>
          </select>
          <span style={{ color: "#94a3b8" }}>Showing {filtered.length} alert{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "#94a3b8" }}>Loading alerts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <p>No alerts in this category</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 20 }}>
            {filtered.map(r => (
              <div key={r._id} style={{ background: "#1e293b", borderRadius: 12, border: "2px solid #475569", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15, alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{r.type.toUpperCase()}</div>
                  <span style={{ background: r.status === "pending" ? "#ff6b6b" : r.status === "responding" ? "#4dabf7" : "#51cf66", color: "white", padding: "5px 12px", borderRadius: 20, fontSize: "0.85rem", fontWeight: 600 }}>{r.status}</span>
                </div>
                <p style={{ color: "#cbd5e1", margin: "0 0 12px 0", lineHeight: 1.5 }}>{r.description}</p>
                <div style={{ background: "#0f172a", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: "0.85rem", color: "#94a3b8" }}>📍 {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {r.status !== "resolved" && <button onClick={() => updateStatus(r._id, r.status === "pending" ? "responding" : "resolved")} style={{ padding: "8px", borderRadius: 6, border: "none", background: "#4dabf7", color: "white", cursor: "pointer", fontWeight: 600 }}>Update Status</button>}
                  <button onClick={() => setSelectedReport(r)} style={{ padding: "8px", borderRadius: 6, border: "1px solid #3b82f6", background: "transparent", color: "#3b82f6", cursor: "pointer", fontWeight: 600 }}>Details</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedReport && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => { setSelectedReport(null); setShowMap(false); }}>
            <div style={{ background: "#1e293b", borderRadius: 12, maxWidth: 700, padding: 30, border: "2px solid #3b82f6", position: "relative", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { setSelectedReport(null); setShowMap(false); }} style={{ position: "absolute", top: 15, right: 15, background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#e2e8f0" }}>✕</button>
              <h2 style={{ margin: "0 0 15px 0", color: "#e2e8f0", fontSize: "1.5rem" }}>{selectedReport.type.toUpperCase()}</h2>
              <p style={{ color: "#cbd5e1", marginBottom: 15 }}>{selectedReport.description}</p>
              
              {/* CLICKABLE LOCATION WITH STREET NAME AND MAP */}
              <div style={{ background: "#0f172a", padding: 15, borderRadius: 8, marginBottom: 20 }}>
                <button 
                  onClick={() => { getStreetName(selectedReport.latitude, selectedReport.longitude); setShowMap(true); }}
                  style={{ 
                    background: "#1e40af", 
                    color: "white", 
                    border: "none", 
                    padding: "12px 15px", 
                    borderRadius: 6, 
                    cursor: "pointer", 
                    fontWeight: 600,
                    width: "100%",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  📍 View Location on Map ({selectedReport.latitude?.toFixed(4)}°, {selectedReport.longitude?.toFixed(4)}°)
                </button>
                {loadingLocation && <p style={{ margin: "10px 0 0 0", fontSize: "0.9rem", color: "#fbbf24" }}>Loading location...</p>}
                {streetName && <p style={{ margin: "10px 0 0 0", fontSize: "1rem", color: "#4ade80", fontWeight: 700 }}>📌 <strong>{streetName}</strong></p>}
              </div>

              {/* MAP MODAL */}
              {showMap && (
                <div style={{ background: "#0f172a", padding: 15, borderRadius: 8, marginBottom: 20, border: "2px solid #3b82f6" }}>
                  <h3 style={{ margin: "0 0 12px 0", color: "#fbbf24", fontSize: "1rem" }}>🗺️ Emergency Location</h3>
                  <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#1a1f35", height: 350 }}>
                    <iframe
                      src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3968.${Math.round(Math.random() * 1000)}!2d${selectedReport.longitude}!3d${selectedReport.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s${selectedReport.latitude},${selectedReport.longitude}!5e0!3m2!1sen!2sgh!4v${Date.now()}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <p style={{ margin: "12px 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                    ✓ Click on the map to get directions | Accuracy: ±{Math.round(selectedReport.accuracy || 0)}m
                  </p>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/${selectedReport.latitude},${selectedReport.longitude}`, "_blank")}
                    style={{ 
                      width: "100%", 
                      marginTop: 12, 
                      padding: "10px", 
                      background: "#2196f3", 
                      color: "white", 
                      border: "none", 
                      borderRadius: 6, 
                      cursor: "pointer", 
                      fontWeight: 600,
                      fontSize: "0.9rem"
                    }}
                  >
                    🔗 Open in Google Maps
                  </button>
                </div>
              )}

              {/* VOICE MESSAGE PLAYER */}
              {selectedReport.voice_url && (
                <div style={{ background: "#0f172a", padding: 15, borderRadius: 8, marginBottom: 20, border: "1px solid #475569" }}>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#fbbf24", fontWeight: 600 }}>🎤 VOICE MESSAGE</p>
                  <audio 
                    controls 
                    style={{ width: "100%", outline: "none", backgroundColor: "#1a1f35", borderRadius: 6 }}
                    key={selectedReport.voice_url}
                  >
                    <source src={`${apiBase}${selectedReport.voice_url}`} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* MEDIA GALLERY */}
              {selectedReport.media_urls && selectedReport.media_urls.length > 0 && (
                <div style={{ background: "#0f172a", padding: 15, borderRadius: 8, marginBottom: 20, border: "1px solid #475569" }}>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#fbbf24", fontWeight: 600 }}>🖼️ MEDIA ({selectedReport.media_urls.length} files)</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                    {selectedReport.media_urls.map((url, idx) => {
                      const fullUrl = url.startsWith("http") ? url : `${apiBase}${url}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fullUrl);
                      const isVideo = /\.(mp4|quicktime|mov|webm)$/i.test(fullUrl);
                      return (
                        <div key={idx} style={{ position: "relative", borderRadius: 6, overflow: "hidden", background: "#1a1f35", aspectRatio: "1", border: "1px solid #475569" }}>
                          {isImage ? (
                            <img 
                              src={fullUrl} 
                              alt={`Media ${idx + 1}`} 
                              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
                              onClick={() => window.open(fullUrl, "_blank")}
                              onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50' y='50' fill='white' text-anchor='middle' dy='.3em'%3EError%3C/text%3E%3C/svg%3E"; }}
                            />
                          ) : isVideo ? (
                            <video 
                              src={fullUrl} 
                              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
                              controls
                              onError={() => console.error("Video failed to load:", fullUrl)}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.75rem", textAlign: "center", padding: 5 }}>
                              <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "underline" }}>
                                View File
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {selectedReport.status !== "resolved" && <button onClick={() => { setSelectedReport(null); setShowMap(false); }} style={{ padding: "10px", borderRadius: 6, border: "none", background: "#51cf66", color: "white", cursor: "pointer", fontWeight: 600 }}>✓ Resolve</button>}
                <button onClick={() => { setSelectedReport(null); setShowMap(false); }} style={{ padding: "10px", borderRadius: 6, border: "1px solid #475569", background: "transparent", color: "#94a3b8", cursor: "pointer", fontWeight: 600 }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Admin;
