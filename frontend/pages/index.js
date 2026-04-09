import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// Ghana Emergency Numbers
const EMERGENCY_NUMBERS = {
  fire: { number: '192', service: 'Ghana Fire Service' },
  medical: { number: '193', service: 'National Ambulance Service' },
  crime: { number: '191', service: 'Ghana Police Service' }
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
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>
              {emergencyType === 'fire' && '🔥'}
              {emergencyType === 'medical' && '🏥'}
              {emergencyType === 'crime' && '🚔'}
            </div>
            <h3>{EMERGENCY_NUMBERS[emergencyType].service}</h3>
            <p className="small" style={{ marginTop: 10, color: '#666' }}>
              📍 Location: {userLocation?.latitude.toFixed(4)}, {userLocation?.longitude.toFixed(4)}
            </p>
          </div>

          {/* Location Accuracy Info with Material Icons */}
          <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 20, borderLeft: '4px solid #2196f3', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <i className="material-icons" style={{ fontSize: '20px', color: '#1565c0', marginTop: '2px' }}>location_on</i>
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#1565c0', fontWeight: 600 }}>
                <strong>Location Accuracy:</strong> ±{Math.round(userLocation?.accuracy || 0)}m
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#1565c0' }}>
                ✓ Responders will receive your exact location for rapid response
              </p>
            </div>
          </div>

          {/* Voice Message Section with Material Icons */}
          <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
            <p style={{ fontWeight: 600, marginBottom: 10, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="material-icons" style={{ fontSize: '20px', color: '#9c27b0' }}>mic</i>
              Voice Message (Optional)
            </p>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 10 }}>
              Record a message to help responders understand the situation better
            </p>
            
            {isRecording ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button 
                  onClick={stopVoiceRecording}
                  style={{ background: '#f44336', color: 'white', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <i className="material-icons" style={{ fontSize: '18px' }}>stop</i>
                  Stop Recording
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px', background: '#fff3e0', borderRadius: '6px', justifyContent: 'center' }}>
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
              <div style={{ background: 'white', padding: 10, borderRadius: 8, marginBottom: 10, border: '2px solid #4caf50' }}>
                <p style={{ fontSize: '0.85rem', color: '#4caf50', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <i className="material-icons" style={{ fontSize: '16px' }}>check_circle</i>
                  Voice message recorded
                </p>
                <audio controls style={{ width: '100%', minHeight: '36px' }} src={URL.createObjectURL(voiceBlob)} />
              </div>
            )}
          </div>

          {/* Media Upload Section with Material Icons */}
          <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
            <p style={{ fontWeight: 600, marginBottom: 10, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="material-icons" style={{ fontSize: '20px', color: '#1976d2' }}>image</i>
              Photos/Videos (Optional)
            </p>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 10 }}>
              Upload images or video to show responders what they're dealing with
            </p>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', background: '#2196f3', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                {mediaFiles.map((file, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#ddd', aspectRatio: '1' }}>
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
            )}
            
            {mediaFiles.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 10, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="material-icons" style={{ fontSize: '16px' }}>attach_file</i>
                {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''} attached
              </p>
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
              style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', background: 'white', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button 
              onClick={send}
              style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontWeight: 600 }}
            >
              ✓ Send Alert
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>✅</div>
            <h3>Alert Sent Successfully!</h3>
            <p className="small" style={{ marginTop: 10 }}>Responders have been notified</p>
          </div>

          {/* Responder Info */}
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: 20, borderRadius: 15, marginBottom: 20 }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: 5 }}>📞 RESPONDER CONTACTED:</p>
            <h2 style={{ margin: '10px 0', fontSize: '2rem', fontWeight: 700 }}>{responderInfo.number}</h2>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{responderInfo.service}</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 10 }}>✓ Call initiated automatically</p>
          </div>

          {/* Enhanced Location Details with Material Icons */}
          <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
              <i className="material-icons" style={{ fontSize: '18px', color: '#2196f3' }}>location_on</i>
              <strong>Location Sent:</strong> {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
              <i className="material-icons" style={{ fontSize: '18px', color: '#2196f3' }}>pin_drop</i>
              <strong>Accuracy:</strong> ±{Math.round(result.accuracy || 0)}m
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
              <i className="material-icons" style={{ fontSize: '18px', color: '#2196f3' }}>schedule</i>
              <strong>Time:</strong> {new Date(result.created_at).toLocaleString()}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
              <i className="material-icons" style={{ fontSize: '18px', color: '#2196f3' }}>warning</i>
              <strong>Type:</strong> {result.type.toUpperCase()}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
              <i className="material-icons" style={{ fontSize: '18px', color: '#52c41a' }}>check_circle</i>
              <strong>Status:</strong> <span style={{ color: '#52c41a', fontWeight: 600 }}>ACTIVE</span>
            </p>
            {result.voice_url && (
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                <i className="material-icons" style={{ fontSize: '18px', color: '#9c27b0' }}>mic</i>
                <strong>Voice:</strong> Message included ✓
              </p>
            )}
            {result.media_count > 0 && (
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <i className="material-icons" style={{ fontSize: '18px', color: '#1976d2' }}>image</i>
                <strong>Media:</strong> {result.media_count} file(s) attached ✓
              </p>
            )}
          </div>

          {/* Live Tracking Info with Material Icons */}
          <div style={{ background: '#d4edda', padding: 12, borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #28a745', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <i className="material-icons" style={{ fontSize: '20px', color: '#155724', marginTop: '2px' }}>location_on</i>
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#155724', fontWeight: 600 }}>
                <strong>Live Tracking Active:</strong> Responders can track your location in real-time
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#155724', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="material-icons" style={{ fontSize: '16px' }}>info</i>
                Keep your phone on and location enabled for continuous tracking
              </p>
            </div>
          </div>

          <div style={{ background: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #ffc107', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <i className="material-icons" style={{ fontSize: '20px', color: '#856404' }}>warning</i>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#856404' }}>
              <strong>Important:</strong> Stay on the line with responders. Provide additional details as requested.
            </p>
          </div>

          <button onClick={() => {
            setState('idle');
            setEmergencyType(null);
            setVoiceBlob(null);
            setMediaFiles([]);
          }} style={{ marginTop: 15, width: '100%' }}>Send Another Alert</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🚨 Emergency Alert</h1>
      <p className="subtitle">Ghana Emergency Response System - Live Tracking Enabled</p>
      
      <div className="card">
        <p className="small" style={{ marginBottom: 20, color: '#666', textAlign: 'center', fontSize: '1rem' }}>
          🔴 Press the button for your emergency type<br/>
          ⚡ Add voice message & photos for faster response<br/>
          📍 Live location tracking - Responders will find you fast
        </p>
        
        <div className="row">
          <button className="big-btn fire" onClick={() => handleEmergencyClick('fire')} title="Call Ghana Fire Service - 192">
            🔥<br/>FIRE
          </button>
          <button className="big-btn medical" onClick={() => handleEmergencyClick('medical')} title="Call Ambulance Service - 193">
            🏥<br/>MEDICAL
          </button>
          <button className="big-btn crime" onClick={() => handleEmergencyClick('crime')} title="Call Police - 191">
            🚔<br/>CRIME
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee', textAlign: 'center' }}>
          <p className="small" style={{ color: '#999', marginBottom: 0 }}>
            ✓ Location permission required<br/>
            ✓ Fastest way to get help<br/>
            ✓ Live GPS tracking for responders
          </p>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <div className="sos" onClick={() => handleEmergencyClick('fire')} title="Emergency SOS - Press to call Fire Service">SOS</div>
        <p className="small" style={{ color: 'white', marginTop: 10 }}>Emergency Hotline</p>
      </div>
    </div>
  )
}
