import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Head from 'next/head';

// Import map dynamically to avoid SSR issues
const ResponderMap = dynamic(() => import('../components/ResponderMap'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: 250, 
      background: 'rgba(255,255,255,0.1)', 
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      Loading map...
    </div>
  )
});

export default function ResponderPage() {
  const [responderId, setResponderId] = useState('');
  const [responder, setResponder] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [distance, setDistance] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [useMockLocation, setUseMockLocation] = useState(false);
  const watchIdRef = useRef(null);
  const mockIntervalRef = useRef(null);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/responder-sw.js')
        .then((registration) => console.log('Service Worker registered'))
        .catch((error) => console.log('Service Worker registration failed:', error));
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  // Install PWA function
  const installPWA = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Get battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  // Calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load assignment
  const loadAssignment = async (reportId) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      setAssignment(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Update status
  const updateStatus = async (newStatus) => {
    try {
      await supabase
        .from('responders')
        .update({ status: newStatus })
        .eq('id', responder.id);
      
      setResponder(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error(error);
    }
  };

  // Start tracking
  const startTracking = () => {
    if (useMockLocation) {
      startMockTracking();
      return;
    }

    if (!navigator.geolocation) {
      alert('❌ Geolocation not supported\n\nTry enabling "Use Mock Location" instead.');
      return;
    }

    // First, request permission with a single position check
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Permission granted, start continuous tracking
        setTracking(true);
        let lastPosition = null;
        let lastTime = null;

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude, speed: gpsSpeed } = position.coords;
            const currentTime = Date.now();
            
            setCurrentPosition({ latitude, longitude });

            // Calculate speed if GPS doesn't provide it
            if (lastPosition && lastTime) {
              const dist = calculateDistance(lastPosition.latitude, lastPosition.longitude, latitude, longitude);
              const timeDiff = (currentTime - lastTime) / 1000 / 3600; // hours
              const calculatedSpeed = dist / timeDiff; // km/h
              setSpeed(gpsSpeed || calculatedSpeed);
            }

            lastPosition = { latitude, longitude };
            lastTime = currentTime;

            if (assignment) {
              const dist = calculateDistance(
                latitude,
                longitude,
                assignment.latitude,
                assignment.longitude
              );
              setDistance(dist);

              // Calculate ETA
              if (speed > 0) {
                const etaMinutes = (dist / speed) * 60;
                setEta(Math.round(etaMinutes));
              }

              try {
                await supabase
                  .from('responder_locations')
                  .upsert([{
                    report_id: assignment.id,
                    responder_id: responder.id,
                    latitude,
                    longitude,
                    status: dist <= 0.5 ? 'on_scene' : 'en_route',
                    updated_at: new Date().toISOString()
                  }], {
                    onConflict: 'report_id,responder_id'
                  });

                if (dist <= 0.5 && responder.status !== 'on_scene') {
                  updateStatus('on_scene');
                }
              } catch (error) {
                console.error('Error updating location:', error);
              }
            }
          },
          (error) => {
            console.error('Tracking error:', error);
            setTracking(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
          }
        );
      },
      (error) => {
        // Permission denied or error
        console.error('Location permission error:', error);
        let errorMessage = '❌ Unable to access location\n\n';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += '📍 Safari blocks location on HTTP sites\n\n💡 Solution: Enable "Use Mock Location" below the tracking button to simulate GPS for testing.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += '📡 Location unavailable\n\nPlease check:\n• GPS is enabled\n• You\'re not in airplane mode\n• Try moving to an open area';
            break;
          case error.TIMEOUT:
            errorMessage += '⏱️ Location request timed out\n\nPlease try again';
            break;
          default:
            errorMessage += 'Try enabling "Use Mock Location" for testing.';
        }
        
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Mock location tracking for HTTP testing
  const startMockTracking = () => {
    if (!assignment) {
      alert('No assignment found');
      return;
    }

    setTracking(true);
    
    // Start near the emergency location and move towards it
    let mockLat = assignment.latitude + 0.02; // ~2km away
    let mockLng = assignment.longitude + 0.02;
    
    setCurrentPosition({ latitude: mockLat, longitude: mockLng });
    
    mockIntervalRef.current = setInterval(async () => {
      // Move closer to emergency location
      const latDiff = assignment.latitude - mockLat;
      const lngDiff = assignment.longitude - mockLng;
      
      mockLat += latDiff * 0.1; // Move 10% closer each update
      mockLng += lngDiff * 0.1;
      
      setCurrentPosition({ latitude: mockLat, longitude: mockLng });
      
      const dist = calculateDistance(
        mockLat,
        mockLng,
        assignment.latitude,
        assignment.longitude
      );
      
      setDistance(dist);
      setSpeed(45); // Mock speed: 45 km/h
      
      if (dist > 0) {
        const etaMinutes = (dist / 45) * 60;
        setEta(Math.round(etaMinutes));
      }
      
      try {
        await supabase
          .from('responder_locations')
          .upsert([{
            report_id: assignment.id,
            responder_id: responder.id,
            latitude: mockLat,
            longitude: mockLng,
            status: dist <= 0.5 ? 'on_scene' : 'en_route',
            updated_at: new Date().toISOString()
          }], {
            onConflict: 'report_id,responder_id'
          });

        if (dist <= 0.5 && responder.status !== 'on_scene') {
          updateStatus('on_scene');
          stopTracking(); // Stop when arrived
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }, 3000); // Update every 3 seconds
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    setTracking(false);
  };

  // Logout
  const handleLogout = () => {
    stopTracking();
    localStorage.removeItem('responder');
    setResponder(null);
    setAssignment(null);
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('responders')
        .select('*')
        .eq('responder_id', responderId.toUpperCase())
        .single();

      if (error) throw error;
      
      setResponder(data);
      localStorage.setItem('responder', JSON.stringify(data));
      
      if (data.current_report_id) {
        loadAssignment(data.current_report_id);
      }
    } catch (error) {
      alert('Invalid Responder ID');
    }
  };

  // Load saved responder on mount
  useEffect(() => {
    const saved = localStorage.getItem('responder');
    if (saved) {
      const data = JSON.parse(saved);
      setResponder(data);
      if (data.current_report_id) {
        loadAssignment(data.current_report_id);
      }
    }
  }, []);

  return (
    <>
      <Head>
        <title>Emergency Responder v2.0</title>
        <meta name="description" content="Ghana Emergency Response System - Responder App" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#667eea" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Responder" />
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />
        <link rel="manifest" href="/responder-manifest.json" />
        <link rel="apple-touch-icon" href="/responder-icon-192.png" />
      </Head>
      
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', 
        padding: 20,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Install PWA Button */}
        {installPrompt && !responder && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            right: 20,
            zIndex: 1000
          }}>
            <button
              onClick={installPWA}
              style={{
                width: '100%',
                padding: 16,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📱</span>
              Install Responder App
            </button>
          </div>
        )}
      {!responder ? (
        <div style={{ maxWidth: 420, margin: '0 auto', paddingTop: 80 }}>
          {/* Logo/Header */}
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: 16,
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              🚑
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '2rem', 
              fontWeight: 700,
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              Emergency Responder
            </h1>
            <p style={{ 
              margin: '8px 0 0 0', 
              opacity: 0.9,
              fontSize: '0.95rem'
            }}>
              Ghana Emergency Response System
            </p>
          </div>

          {/* Login Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            padding: 32,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <form onSubmit={handleLogin}>
              <label style={{ 
                display: 'block',
                marginBottom: 8,
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                Responder ID
              </label>
              <input
                type="text"
                placeholder="e.g., FIRE001, MED001"
                value={responderId}
                onChange={(e) => setResponderId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1rem',
                  borderRadius: 12,
                  border: '2px solid #e5e7eb',
                  marginBottom: 20,
                  outline: 'none',
                  transition: 'all 0.2s',
                  color: '#111827',
                  fontWeight: 500
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: 16,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }}
              >
                🔐 Login
              </button>
            </form>

            {/* Sample IDs */}
            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              background: '#f3f4f6', 
              borderRadius: 12,
              color: '#6b7280',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Sample IDs:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['FIRE001', 'FIRE002', 'MED001', 'MED002', 'POLICE001', 'POLICE002'].map(id => (
                  <span key={id} style={{
                    padding: '4px 10px',
                    background: 'white',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#667eea',
                    cursor: 'pointer'
                  }}
                  onClick={() => setResponderId(id)}
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            padding: 20, 
            borderRadius: 16, 
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div>
              <div style={{ 
                fontSize: '0.75rem', 
                opacity: 0.8, 
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {responder.type} Unit
              </div>
              <h2 style={{ margin: 0, marginBottom: 8, fontSize: '1.5rem' }}>{responder.name}</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: responder.status === 'on_scene' ? '#10b981' : responder.status === 'en_route' ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <span style={{ fontSize: '1rem' }}>
                    {responder.status === 'on_scene' ? '✅' : responder.status === 'en_route' ? '🚗' : '⏸️'}
                  </span>
                  {responder.status.replace('_', ' ')}
                </div>
                {batteryLevel !== null && (
                  <div style={{
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    🔋 {batteryLevel}%
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 18px',
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.875rem',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#ef4444'}
              onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.9)'}
            >
              Logout
            </button>
          </div>

          {/* Assignment */}
          {assignment ? (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              padding: 24, 
              borderRadius: 16, 
              marginBottom: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ 
                  fontSize: '2.5rem',
                  background: 'rgba(255,255,255,0.2)',
                  width: 60,
                  height: 60,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  🚨
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>ACTIVE EMERGENCY</div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', textTransform: 'capitalize' }}>
                    {assignment.type} Emergency
                  </h3>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: distance !== null ? '1fr 1fr 1fr' : '1fr 1fr', 
                gap: 12, 
                marginBottom: 16 
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: 12,
                  borderRadius: 10,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📍</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Distance</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {distance !== null ? `${distance.toFixed(1)} km` : '---'}
                  </div>
                </div>
                {eta !== null && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: 12,
                    borderRadius: 10,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>⏱️</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>ETA</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {eta} min
                    </div>
                  </div>
                )}
                {speed > 0 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: 12,
                    borderRadius: 10,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🚗</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Speed</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {Math.round(speed)} km/h
                    </div>
                  </div>
                )}
              </div>

              {assignment.description && (
                <div style={{ 
                  marginBottom: 16,
                  padding: 12,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  lineHeight: 1.5
                }}>
                  <strong>Details:</strong> {assignment.description}
                </div>
              )}

              <div style={{ 
                fontSize: '0.8rem', 
                opacity: 0.7,
                marginBottom: 16
              }}>
                📌 {assignment.latitude.toFixed(4)}°, {assignment.longitude.toFixed(4)}°
              </div>

              {distance !== null && (
                <div style={{ 
                  marginTop: 16,
                  padding: 16,
                  background: distance <= 0.5 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: 12,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  animation: distance <= 0.5 ? 'pulse 2s ease-in-out infinite' : 'none'
                }}>
                  {distance <= 0.5 ? '✅ ARRIVED AT SCENE' : `📍 ${distance.toFixed(2)} km TO DESTINATION`}
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              padding: 50, 
              borderRadius: 16, 
              textAlign: 'center', 
              marginBottom: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: 16, opacity: 0.5 }}>✅</div>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>No Active Assignment</p>
              <p style={{ margin: '8px 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>Standby for dispatch</p>
            </div>
          )}

          {/* Live Map */}
          {assignment && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              padding: 20, 
              borderRadius: 16, 
              marginBottom: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🗺️</span> Live Navigation
              </h3>
              <ResponderMap 
                responderPosition={currentPosition}
                emergencyPosition={assignment}
                distance={distance}
              />
              {!currentPosition && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  color: '#fbbf24'
                }}>
                  ⚠️ Start tracking to see your location on the map
                </div>
              )}
            </div>
          )}

          {/* Tracking Controls */}
          {assignment && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              padding: 24, 
              borderRadius: 16,
              marginBottom: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📍</span> Location Tracking
              </h3>
              
              {!tracking ? (
                <button
                  onClick={startTracking}
                  style={{
                    width: '100%',
                    padding: 18,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>🚀</span>
                  START TRACKING
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 12,
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    TRACKING ACTIVE
                  </div>
                  <button
                    onClick={stopTracking}
                    style={{
                      width: '100%',
                      padding: 18,
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>⏹</span>
                    STOP TRACKING
                  </button>
                </div>
              )}

              {currentPosition && (
                <div style={{ 
                  marginTop: 16, 
                  padding: 12,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  fontFamily: 'monospace'
                }}>
                  📌 {currentPosition.latitude.toFixed(6)}°, {currentPosition.longitude.toFixed(6)}°
                </div>
              )}
            </div>
          )}

          {/* Status Controls */}
          {assignment && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              padding: 24, 
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔄</span> Update Status
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => updateStatus('en_route')}
                  disabled={responder.status === 'en_route'}
                  style={{
                    padding: 16,
                    background: responder.status === 'en_route' 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                      : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: responder.status === 'en_route' ? 'none' : '2px solid rgba(255,255,255,0.3)',
                    borderRadius: 12,
                    fontWeight: 700,
                    cursor: responder.status === 'en_route' ? 'default' : 'pointer',
                    opacity: responder.status === 'en_route' ? 1 : 0.8,
                    transition: 'all 0.2s',
                    fontSize: '0.9rem',
                    boxShadow: responder.status === 'en_route' ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (responder.status !== 'en_route') {
                      e.target.style.background = 'rgba(255,255,255,0.2)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (responder.status !== 'en_route') {
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🚗</div>
                  EN ROUTE
                </button>
                <button
                  onClick={() => updateStatus('on_scene')}
                  disabled={responder.status === 'on_scene'}
                  style={{
                    padding: 16,
                    background: responder.status === 'on_scene' 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                      : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: responder.status === 'on_scene' ? 'none' : '2px solid rgba(255,255,255,0.3)',
                    borderRadius: 12,
                    fontWeight: 700,
                    cursor: responder.status === 'on_scene' ? 'default' : 'pointer',
                    opacity: responder.status === 'on_scene' ? 1 : 0.8,
                    transition: 'all 0.2s',
                    fontSize: '0.9rem',
                    boxShadow: responder.status === 'on_scene' ? '0 4px 15px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (responder.status !== 'on_scene') {
                      e.target.style.background = 'rgba(255,255,255,0.2)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (responder.status !== 'on_scene') {
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>✅</div>
                  ON SCENE
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
    </>
  );
}
