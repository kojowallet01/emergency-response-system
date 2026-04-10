import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// Ghana Emergency Numbers
const EMERGENCY_NUMBERS = {
  fire: { number: '192', service: 'Ghana Fire Service', icon: '🔥', color: '#ff5252' },
  medical: { number: '193', service: 'National Ambulance Service', icon: '🏥', color: '#2196f3' },
  crime: { number: '191', service: 'Ghana Police Service', icon: '🚔', color: '#ff9800' }
};

export default function Home(){
  const [state, setState] = useState('idle'); // idle, details, sending, success
  const [result, setResult] = useState(null);
  const [responderInfo, setResponderInfo] = useState(null);
  const [emergencyType, setEmergencyType] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  // Media upload
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Get location first when emergency button is pressed
  const handleEmergencyClick = async (type) => {
    setState('details');
    setEmergencyType(type);
    
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      setUserLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
    } catch (e) {
      alert('Unable to get location. Please enable location permission.');
      setState('idle');
    }
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      
      recorder.ondataavailable = (e) => audioChunks.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setVoiceBlob(blob);
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      alert('Microphone permission required');
    }
  };

  // Stop voice recording
  const stopVoiceRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Handle media file selection (images/videos)
  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(prev => [...prev, ...files]);
  };

  // Remove media file
  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const send = async () => {
    if (!emergencyType || !userLocation) {
      alert('Missing location data');
      return;
    }

    setState('sending');
    const emergency = EMERGENCY_NUMBERS[emergencyType];
    
    try {
      const form = new FormData();
      form.append('type', emergencyType);
      form.append('latitude', userLocation.latitude);
      form.append('longitude', userLocation.longitude);
      form.append('accuracy', userLocation.accuracy);
      form.append('description', `Emergency Alert - ${emergency.service}`);
      form.append('responderNumber', emergency.number);

      // Append voice message if recorded
      if (voiceBlob) {
        form.append('voice', voiceBlob, 'emergency_voice.wav');
      }

      // Append media files
      mediaFiles.forEach((file, index) => {
        form.append('media', file);
      });

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE}/report`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResult(res.data);
      setResponderInfo(emergency);
      setVoiceBlob(null);
      setMediaFiles([]);
      setState('success');
    } catch (e) {
      console.error(e);
      alert('Failed to send alert: ' + e.message);
      setState('details');
    }
  };

  if (state === 'details') {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 30, background: `linear-gradient(135deg, ${EMERGENCY_NUMBERS[emergencyType].color} 0%, ${EMERGENCY_NUMBERS[emergencyType].color}dd 100%)`, padding: 30, borderRadius: 15, color: 'white' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 15, animation: 'pulse 2s infinite' }}>
              {EMERGENCY_NUMBERS[emergencyType].icon}
            </div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem', fontWeight: 700 }}>{EMERGENCY_NUMBERS[emergencyType].service}</h2>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.95 }}>Emergency Alert System Active</p>
            <p style={{ marginTop: 12, fontSize: '0.9rem', opacity: 0.85 }}>
              📍 {userLocation?.latitude.toFixed(4)}°, {userLocation?.longitude.toFixed(4)}°
            </p>
          </div>

          {/* Location Info */}
          <div style={{ background: '#e3f2fd', padding: 15, borderRadius: 10, marginBottom: 20, border: '2px solid #2196f3' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <i className="material-icons" style={{ fontSize: '22px', color: '#1565c0', marginTop: '2px' }}>location_on</i>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#1565c0', fontWeight: 600 }}>
                  <strong>Accuracy: ±{Math.round(userLocation?.accuracy || 0)}m</strong>
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#1565c0' }}>
                  ✓ High precision location shared with responders
                </p>
              </div>
            </div>
          </div>

          {/* Voice Message Section */}
          <div style={{ background: '#f3e5f5', padding: 15, borderRadius: 10, marginBottom: 15, border: '2px solid #9c27b0' }}>
            <p style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#6a1b9a' }}>
              <i className="material-icons" style={{ fontSize: '20px' }}>mic</i>
              Voice Message (Optional)
            </p>
            
            {isRecording ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button 
                  onClick={stopVoiceRecording}
                  style={{ background: '#f44336', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <i className="material-icons" style={{ fontSize: '18px' }}>stop</i>
                  Stop Recording
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff3e0', borderRadius: '6px', justifyContent: 'center' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f44336', borderRadius: '50%', animation: 'blink 1s infinite' }}></span>
                  <span style={{ fontSize: '0.85rem', color: '#f44336', fontWeight: 600 }}>Recording...</span>
                </div>
              </div>
            ) : (
              <button 
                onClick={startVoiceRecording}
                style={{ width: '100%', background: '#4caf50', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="material-icons" style={{ fontSize: '20px' }}>mic</i>
                Start Recording
              </button>
            )}
            
            {voiceBlob && (
              <div style={{ background: 'white', padding: 12, borderRadius: 8, marginBottom: 10, border: '2px solid #4caf50' }}>
                <p style={{ fontSize: '0.85rem', color: '#4caf50', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <i className="material-icons" style={{ fontSize: '16px' }}>check_circle</i>
                  ✓ Voice message recorded
                </p>
                <audio controls style={{ width: '100%', minHeight: '36px' }} src={URL.createObjectURL(voiceBlob)} />
              </div>
            )}
          </div>

          {/* Media Upload Section */}
          <div style={{ background: '#e1f5fe', padding: 15, borderRadius: 10, marginBottom: 15, border: '2px solid #0288d1' }}>
            <p style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#01579b' }}>
              <i className="material-icons" style={{ fontSize: '20px' }}>image</i>
              Photos/Videos (Optional)
            </p>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', background: '#0288d1', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <i className="material-icons" style={{ fontSize: '20px' }}>upload_file</i>
              Add Photos/Videos
            </button>
            <input 
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              style={{ display: 'none' }}
            />

            {mediaFiles.length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10, marginBottom: 10 }}>
                  {mediaFiles.map((file, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#ddd', aspectRatio: '1', border: '2px solid #0288d1' }}>
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                          <i className="material-icons" style={{ fontSize: '40px', color: 'white' }}>play_circle_outline</i>
                        </div>
                      )}
                      <button
                        onClick={() => removeMedia(idx)}
                        style={{ position: 'absolute', top: '2px', right: '2px', background: '#f44336', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <i className="material-icons" style={{ fontSize: '14px' }}>close</i>
                      </button>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#01579b', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="material-icons" style={{ fontSize: '16px' }}>attach_file</i>
                  {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''} attached
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button 
              onClick={() => {
                setState('idle');
                setEmergencyType(null);
                setVoiceBlob(null);
                setMediaFiles([]);
              }}
              style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
            >
              ← Cancel
            </button>
            <button 
              onClick={send}
              style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>send</i>
              Send Alert Now
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes blink {
            0%, 49%, 100% { opacity: 1; }
            50%, 99% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 30, background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)', padding: 30, borderRadius: 15, color: 'white' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 15, animation: 'bounce 2s infinite' }}>✅</div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem', fontWeight: 700 }}>Alert Sent Successfully!</h2>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.95 }}>Responders have been notified and are responding</p>
          </div>

          {/* Responder Info */}
          <div style={{ background: `linear-gradient(135deg, ${EMERGENCY_NUMBERS[emergencyType].color} 0%, ${EMERGENCY_NUMBERS[emergencyType].color}cc 100%)`, color: 'white', padding: 20, borderRadius: 15, marginBottom: 20 }}>
            <p style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="material-icons" style={{ fontSize: '18px' }}>phone_in_talk</i>
              RESPONDER CONTACTED
            </p>
            <h2 style={{ margin: '8px 0', fontSize: '2.2rem', fontWeight: 700 }}>{responderInfo.number}</h2>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{responderInfo.service}</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: 10, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="material-icons" style={{ fontSize: '16px' }}>check</i>
              Call initiated automatically
            </p>
          </div>

          {/* Alert Details */}
          <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#333' }}>📋 Alert Details</h3>
            
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <i className="material-icons" style={{ fontSize: '20px', color: '#1976d2', marginTop: '2px' }}>location_on</i>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#666' }}>Location</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {result.latitude.toFixed(6)}°, {result.longitude.toFixed(6)}°
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#999' }}>Accuracy: ±{Math.round(result.accuracy || 0)}m</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <i className="material-icons" style={{ fontSize: '20px', color: '#ff9800', marginTop: '2px' }}>schedule</i>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#666' }}>Time</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {new Date(result.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <i className="material-icons" style={{ fontSize: '20px', color: '#f44336', marginTop: '2px' }}>warning</i>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#666' }}>Emergency Type</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {EMERGENCY_NUMBERS[emergencyType].icon} {result.type.toUpperCase()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <i className="material-icons" style={{ fontSize: '20px', color: '#4caf50', marginTop: '2px' }}>check_circle</i>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#666' }}>Status</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ● ACTIVE - Responders En Route
                  </p>
                </div>
              </div>

              {result.voice_url && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <i className="material-icons" style={{ fontSize: '20px', color: '#9c27b0', marginTop: '2px' }}>mic</i>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#666' }}>Voice Message</p>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#4caf50' }}>✓ Included</p>
                  </div>
                </div>
              )}

              {result.media_count > 0 && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <i className="material-icons" style={{ fontSize: '20px', color: '#1976d2', marginTop: '2px' }}>image</i>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#666' }}>Media Files</p>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#4caf50' }}>✓ {result.media_count} file(s) attached</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Tracking Info */}
          <div style={{ background: '#d4edda', padding: 15, borderRadius: 10, marginBottom: 15, border: '2px solid #28a745' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <i className="material-icons" style={{ fontSize: '20px', color: '#155724', marginTop: '2px' }}>gps_fixed</i>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#155724', fontWeight: 600 }}>
                  🔴 Live GPS Tracking Active
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#155724' }}>
                  Responders are tracking your location in real-time
                </p>
              </div>
            </div>
          </div>

          {/* Important Warning */}
          <div style={{ background: '#fff3cd', padding: 15, borderRadius: 10, marginBottom: 20, border: '2px solid #ffc107' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <i className="material-icons" style={{ fontSize: '20px', color: '#856404', marginTop: '2px' }}>warning</i>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#856404', fontWeight: 600 }}>
                  ⚠️ Important Instructions
                </p>
                <ul style={{ margin: '0', padding: '0 0 0 20px', fontSize: '0.85rem', color: '#856404' }}>
                  <li>Stay on the phone with responders</li>
                  <li>Keep location services enabled</li>
                  <li>Provide updates if situation changes</li>
                  <li>Follow responder instructions</li>
                </ul>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              setState('idle');
              setEmergencyType(null);
              setVoiceBlob(null);
              setMediaFiles([]);
              setResult(null);
              setResponderInfo(null);
            }} 
            style={{ 
              width: '100%', 
              padding: '14px', 
              borderRadius: '8px', 
              border: 'none', 
              background: '#2196f3', 
              color: 'white', 
              cursor: 'pointer', 
              fontWeight: 600,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <i className="material-icons" style={{ fontSize: '20px' }}>arrow_back</i>
            Return to Home
          </button>
        </div>

        <style jsx>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ textAlign: 'center', fontSize: '2rem', color: '#fff', marginBottom: 10 }}>🚨 Emergency Alert System</h1>
      <p className="subtitle" style={{ textAlign: 'center', fontSize: '1rem', color: '#e0e0e0', marginBottom: 30 }}>Ghana Emergency Response Network - Live Tracking Enabled</p>
      
      <div className="card">
        <p style={{ marginBottom: 25, color: '#333', textAlign: 'center', fontSize: '1rem', lineHeight: 1.6 }}>
          🔴 Press the button for your emergency type<br/>
          ⚡ Add voice message & photos for faster response<br/>
          📍 Live location tracking - Responders will find you fast
        </p>
        
        <div className="row" style={{ gap: 15, marginBottom: 30 }}>
          <button 
            className="big-btn fire" 
            onClick={() => handleEmergencyClick('fire')} 
            title="Call Ghana Fire Service - 192"
            style={{ 
              background: 'linear-gradient(135deg, #ff5252 0%, #ff1744 100%)',
              boxShadow: '0 8px 20px rgba(255, 82, 82, 0.4)'
            }}
          >
            🔥<br/>FIRE
          </button>
          <button 
            className="big-btn medical" 
            onClick={() => handleEmergencyClick('medical')} 
            title="Call Ambulance Service - 193"
            style={{ 
              background: 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)',
              boxShadow: '0 8px 20px rgba(33, 150, 243, 0.4)'
            }}
          >
            🏥<br/>MEDICAL
          </button>
          <button 
            className="big-btn crime" 
            onClick={() => handleEmergencyClick('crime')} 
            title="Call Police - 191"
            style={{ 
              background: 'linear-gradient(135deg, #ff9800 0%, #e65100 100%)',
              boxShadow: '0 8px 20px rgba(255, 152, 0, 0.4)'
            }}
          >
            🚔<br/>CRIME
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee', textAlign: 'center', background: '#f9f9f9', padding: 15, borderRadius: 10 }}>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <i className="material-icons" style={{ fontSize: '16px' }}>check</i>
            Location permission required
          </p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <i className="material-icons" style={{ fontSize: '16px' }}>check</i>
            Fastest way to get help
          </p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <i className="material-icons" style={{ fontSize: '16px' }}>check</i>
            Live GPS tracking for responders
          </p>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 20 }}>
        <div 
          className="sos" 
          onClick={() => handleEmergencyClick('fire')} 
          title="Emergency SOS - Press to call Fire Service"
          style={{
            width: 120,
            height: 120,
            margin: '0 auto',
            background: 'linear-gradient(135deg, #ff5252 0%, #ff1744 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 900,
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(255, 23, 68, 0.5), 0 8px 20px rgba(255, 23, 68, 0.4)',
            animation: 'pulse-sos 2s infinite'
          }}
        >
          SOS
        </div>
        <p style={{ color: 'white', marginTop: 15, fontSize: '1rem', fontWeight: 600 }}>Emergency Hotline</p>
        <p style={{ color: '#ccc', fontSize: '0.9rem', marginTop: 5 }}>One-tap rapid response</p>
      </div>

      <style jsx>{`
        @keyframes pulse-sos {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(255, 23, 68, 0.5), 0 8px 20px rgba(255, 23, 68, 0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 50px rgba(255, 23, 68, 0.8), 0 8px 20px rgba(255, 23, 68, 0.4);
            transform: scale(1.05);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes blink {
          0%, 49%, 100% { opacity: 1; }
          50%, 99% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
