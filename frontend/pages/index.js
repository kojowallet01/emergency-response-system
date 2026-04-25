import { useState, useRef } from 'react';
import { supabase, uploadFile } from '../lib/supabase';

// Ghana Emergency Numbers
const EMERGENCY_NUMBERS = {
  fire: { number: '192', service: 'Ghana Fire Service', icon: '🔥', color: '#ff5252' },
  medical: { number: '193', service: 'National Ambulance Service', icon: '🏥', color: '#2196f3' },
  crime: { number: '191', service: 'Ghana Police Service', icon: '🚔', color: '#ff9800' }
};

export default function Home() {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [responderInfo, setResponderInfo] = useState(null);
  const [emergencyType, setEmergencyType] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  // Media upload
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  // Camera
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Get location
  const handleEmergencyClick = async (type) => {
    setState('details');
    setEmergencyType(type);
    setUserLocation(null);
    setIsLocating(true);
    
    // Request location
    getLocation();
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsLocating(false);
      },
      (error) => {
        console.error('Location error:', error);
        let message = 'Unable to get location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message += 'Please enable location permission in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message += 'Location request timed out.';
            break;
          default:
            message += 'An unknown error occurred.';
        }
        
        alert(message);
        setIsLocating(false);
        // Don't go back to idle - let user try again or send without precise location
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  // Voice recording
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

  const stopVoiceRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Media handling
  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(prev => [...prev, ...files]);
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (e) {
      alert('Camera permission required');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setMediaFiles(prev => [...prev, file]);
      }, 'image/jpeg', 0.95);
      
      closeCamera();
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Send report to Supabase
  const send = async () => {
    if (!emergencyType) {
      alert('Missing emergency type');
      return;
    }

    // If no location, ask for confirmation
    if (!userLocation) {
      const confirm = window.confirm(
        '⚠️ WARNING: No location data available.\n\n' +
        'Sending without location will make it harder for responders to find you.\n\n' +
        'Do you want to continue anyway?'
      );
      if (!confirm) return;
    }

    setState('sending');
    const emergency = EMERGENCY_NUMBERS[emergencyType];
    
    console.log('🔵 Starting report submission...');
    console.log('🔵 Voice blob:', voiceBlob ? 'YES' : 'NO');
    console.log('🔵 Media files:', mediaFiles.length);
    
    try {
      // Upload voice file if exists (optional - don't block if fails)
      let voiceUrl = null;
      if (voiceBlob) {
        try {
          console.log('🔵 Uploading voice...');
          const voiceFile = new File([voiceBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
          voiceUrl = await uploadFile(voiceFile);
          console.log('✅ Voice URL:', voiceUrl);
        } catch (err) {
          console.warn('⚠️ Voice upload failed, continuing without it:', err);
        }
      }

      // Upload media files (optional - don't block if fails)
      const mediaUrls = [];
      for (const file of mediaFiles) {
        try {
          console.log('🔵 Uploading media file:', file.name);
          const url = await uploadFile(file);
          if (url) {
            mediaUrls.push(url);
            console.log('✅ Media URL:', url);
          }
        } catch (err) {
          console.warn('⚠️ Media upload failed, continuing without it:', err);
        }
      }

      console.log('🔵 Final voice URL:', voiceUrl);
      console.log('🔵 Final media URLs:', mediaUrls);

      // Create report in Supabase (this is the critical part)
      const { data, error } = await supabase
        .from('reports')
        .insert([{
          type: emergencyType,
          latitude: userLocation?.latitude || 0,
          longitude: userLocation?.longitude || 0,
          accuracy: userLocation?.accuracy || 0,
          description: userLocation 
            ? `Emergency Alert - ${emergency.service}` 
            : `Emergency Alert - ${emergency.service} (NO LOCATION DATA)`,
          responder_number: emergency.number,
          voice_url: voiceUrl,
          media_urls: mediaUrls.filter(Boolean),
          media_count: mediaUrls.filter(Boolean).length,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setResult(data);
      setResponderInfo(emergency);
      setVoiceBlob(null);
      setMediaFiles([]);
      setState('success');
    } catch (e) {
      console.error(e);
      alert(`Failed to send alert: ${e.message}`);
      setState('details');
    }
  };

  if (state === 'details') {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 30, background: `linear-gradient(135deg, ${EMERGENCY_NUMBERS[emergencyType].color} 0%, ${EMERGENCY_NUMBERS[emergencyType].color}dd 100%)`, padding: 30, borderRadius: 15, color: 'white' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 15 }}>
              {EMERGENCY_NUMBERS[emergencyType].icon}
            </div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem', fontWeight: 700 }}>{EMERGENCY_NUMBERS[emergencyType].service}</h2>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.95 }}>Emergency Alert System Active</p>
            {userLocation && (
              <p style={{ marginTop: 12, fontSize: '0.9rem', opacity: 0.85 }}>
                📍 {userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°
              </p>
            )}
          </div>

          {/* Location Info */}
          <div style={{ background: isLocating ? '#fff3cd' : userLocation ? '#d4edda' : '#f8d7da', padding: 15, borderRadius: 10, marginBottom: 20, border: `2px solid ${isLocating ? '#ffc107' : userLocation ? '#28a745' : '#dc3545'}` }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: isLocating ? '#856404' : userLocation ? '#155724' : '#721c24', fontWeight: 600 }}>
              {isLocating && '📍 Location: Acquiring...'}
              {!isLocating && userLocation && `📍 Location: ±${Math.round(userLocation.accuracy)}m accuracy`}
              {!isLocating && !userLocation && '📍 Location: Not Available'}
            </p>
            {isLocating && <p style={{ margin: 0, fontSize: '0.85rem', color: '#856404' }}>Getting GPS location... Please wait.</p>}
            {!isLocating && !userLocation && (
              <>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#721c24' }}>
                  Location permission denied or unavailable.
                </p>
                <button 
                  onClick={getLocation}
                  style={{ width: '100%', background: '#ffc107', color: '#000', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  🔄 Try Again
                </button>
              </>
            )}
          </div>

          {/* Voice Message */}
          <div style={{ background: '#f3e5f5', padding: 15, borderRadius: 10, marginBottom: 15, border: '2px solid #9c27b0' }}>
            <p style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.95rem', color: '#6a1b9a' }}>
              🎤 Voice Message (Optional)
            </p>
            
            {isRecording ? (
              <button 
                onClick={stopVoiceRecording}
                style={{ width: '100%', background: '#f44336', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                ⏹ Stop Recording
              </button>
            ) : (
              <button 
                onClick={startVoiceRecording}
                style={{ width: '100%', background: '#4caf50', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                🎤 Start Recording
              </button>
            )}
            
            {voiceBlob && (
              <div style={{ background: 'white', padding: 12, borderRadius: 8, marginTop: 10, border: '2px solid #4caf50' }}>
                <p style={{ fontSize: '0.85rem', color: '#4caf50', margin: '0 0 8px 0', fontWeight: 600 }}>
                  ✓ Voice message recorded
                </p>
                <audio controls style={{ width: '100%' }} src={URL.createObjectURL(voiceBlob)} />
              </div>
            )}
          </div>

          {/* Media Upload */}
          <div style={{ background: '#e1f5fe', padding: 15, borderRadius: 10, marginBottom: 15, border: '2px solid #0288d1' }}>
            <p style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.95rem', color: '#01579b' }}>
              📸 Photos/Videos (Optional)
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ background: '#0288d1', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                📁 Upload Files
              </button>
              <button 
                onClick={startCamera}
                style={{ background: '#00bcd4', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                📷 Take Photo
              </button>
            </div>
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
                  <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#ddd', aspectRatio: '1', border: '2px solid #0288d1' }}>
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'white' }}>
                        ▶️
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(idx)}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: '#f44336', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
              style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', background: 'white', cursor: 'pointer', fontWeight: 600 }}
            >
              ← Cancel
            </button>
            <button 
              onClick={send}
              style={{ padding: '12px', borderRadius: '8px', border: 'none', background: userLocation ? '#4caf50' : '#ff9800', color: 'white', cursor: 'pointer', fontWeight: 600 }}
            >
              📤 {userLocation ? 'Send Alert' : 'Send Without Location'}
            </button>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '10px' }}>
            <h3 style={{ color: 'white', margin: '10px 0' }}>📸 Take a Photo</h3>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '600px', maxHeight: '500px', borderRadius: '12px', border: '3px solid #00bcd4' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
              <button onClick={capturePhoto} style={{ padding: '12px 30px', borderRadius: '8px', border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                📷 Capture
              </button>
              <button onClick={closeCamera} style={{ padding: '12px 30px', borderRadius: '8px', border: 'none', background: '#f44336', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                ✕ Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 30, background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)', padding: 30, borderRadius: 15, color: 'white' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 15 }}>✅</div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem', fontWeight: 700 }}>Alert Sent Successfully!</h2>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.95 }}>Responders have been notified</p>
          </div>

          <div style={{ background: `linear-gradient(135deg, ${EMERGENCY_NUMBERS[emergencyType].color} 0%, ${EMERGENCY_NUMBERS[emergencyType].color}cc 100%)`, color: 'white', padding: 20, borderRadius: 15, marginBottom: 20 }}>
            <h2 style={{ margin: '8px 0', fontSize: '2.2rem', fontWeight: 700 }}>{responderInfo.number}</h2>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{responderInfo.service}</p>
          </div>

          <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#333' }}>📋 Alert Details</h3>
            <p style={{ margin: '8px 0', color: '#666' }}>📍 Location: {result.latitude.toFixed(6)}°, {result.longitude.toFixed(6)}°</p>
            <p style={{ margin: '8px 0', color: '#666' }}>⏰ Time: {new Date(result.created_at).toLocaleString()}</p>
            <p style={{ margin: '8px 0', color: '#666' }}>🚨 Type: {result.type.toUpperCase()}</p>
            {result.voice_url && <p style={{ margin: '8px 0', color: '#4caf50' }}>✓ Voice message included</p>}
            {result.media_count > 0 && <p style={{ margin: '8px 0', color: '#4caf50' }}>✓ {result.media_count} media file(s) attached</p>}
          </div>

          <button 
            onClick={() => {
              setState('idle');
              setEmergencyType(null);
              setResult(null);
              setResponderInfo(null);
            }} 
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: '#2196f3', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}
          >
            ← Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ textAlign: 'center', fontSize: '2rem', color: '#fff', marginBottom: 10 }}>🚨 Emergency Alert System</h1>
      <p style={{ textAlign: 'center', fontSize: '1rem', color: '#e0e0e0', marginBottom: 30 }}>Ghana Emergency Response Network</p>
      
      <div className="card">
        <p style={{ marginBottom: 25, color: '#333', textAlign: 'center', fontSize: '1rem', lineHeight: 1.6 }}>
          🔴 Press the button for your emergency type<br/>
          ⚡ Add voice message & photos for faster response<br/>
          📍 Live location tracking
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 30 }}>
          <button 
            onClick={() => handleEmergencyClick('fire')} 
            style={{ background: 'linear-gradient(135deg, #ff5252 0%, #ff1744 100%)', color: 'white', border: 'none', borderRadius: 15, padding: '30px 20px', fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(255, 82, 82, 0.4)' }}
          >
            🔥<br/>FIRE
          </button>
          <button 
            onClick={() => handleEmergencyClick('medical')} 
            style={{ background: 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)', color: 'white', border: 'none', borderRadius: 15, padding: '30px 20px', fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(33, 150, 243, 0.4)' }}
          >
            🏥<br/>MEDICAL
          </button>
          <button 
            onClick={() => handleEmergencyClick('crime')} 
            style={{ background: 'linear-gradient(135deg, #ff9800 0%, #e65100 100%)', color: 'white', border: 'none', borderRadius: 15, padding: '30px 20px', fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(255, 152, 0, 0.4)' }}
          >
            🚔<br/>CRIME
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee', textAlign: 'center', background: '#f9f9f9', padding: 15, borderRadius: 10 }}>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>✓ Location permission required</p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>✓ Fastest way to get help</p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 0 }}>✓ Live GPS tracking for responders</p>
        </div>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .card {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
