import { useState, useRef } from 'react';
import axios from 'axios';

// Ghana Emergency Numbers
const EMERGENCY_NUMBERS = {
  fire: { number: '192', service: 'Ghana Fire Service', icon: '🔥', color: '#ff5252' },
  medical: { number: '193', service: 'National Ambulance Service', icon: '🏥', color: '#2196f3' },
  crime: { number: '191', service: 'Ghana Police Service', icon: '🚔', color: '#ff9800' }
};

const MAX_LOCATION_ACCURACY_METERS = 500;
const TARGET_LOCATION_ACCURACY_METERS = 100;
const LOCATION_COLLECTION_WINDOW_MS = 18000;
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-script';

export default function Home(){
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const [state, setState] = useState('idle'); // idle, details, sending, success
  const [result, setResult] = useState(null);
  const [responderInfo, setResponderInfo] = useState(null);
  const [emergencyType, setEmergencyType] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationCountdown, setLocationCountdown] = useState(Math.ceil(LOCATION_COLLECTION_WINDOW_MS / 1000));
  const [locationStatus, setLocationStatus] = useState('');
  
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  // Media upload
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  // Camera capture
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const locationWatchRef = useRef(null);
  const locationTimeoutRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const suggestionTimerRef = useRef(null);
  const googleAutocompleteServiceRef = useRef(null);

  const getCurrentPosition = (options) =>
    new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

  const ensureGooglePlacesLoaded = async () => {
    if (!googleMapsApiKey || typeof window === 'undefined') {
      return false;
    }

    if (window.google?.maps?.places?.AutocompleteService) {
      if (!googleAutocompleteServiceRef.current) {
        googleAutocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      }
      return true;
    }

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (!existingScript) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(() => false);
    } else if (!window.google?.maps?.places?.AutocompleteService) {
      await new Promise((resolve, reject) => {
        existingScript.addEventListener('load', resolve, { once: true });
        existingScript.addEventListener('error', reject, { once: true });
      }).catch(() => false);
    }

    if (window.google?.maps?.places?.AutocompleteService) {
      googleAutocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      return true;
    }

    return false;
  };

  const clearLocationTracking = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const getBestLocationFix = async (onProgress) => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported on this device.');
    }

    clearLocationTracking();

    const watchedFix = await new Promise((resolve, reject) => {
      let best = null;
      let settled = false;
      let lastError = null;
      const startedAt = Date.now();

      const finalize = (result) => {
        if (settled) return;
        settled = true;
        clearLocationTracking();

        if (result) {
          resolve(result);
        } else {
          reject(lastError || new Error('Unable to get location'));
        }
      };

      const updateProgress = () => {
        const elapsedMs = Date.now() - startedAt;
        const remainingSeconds = Math.max(0, Math.ceil((LOCATION_COLLECTION_WINDOW_MS - elapsedMs) / 1000));
        if (onProgress) {
          onProgress({
            remainingSeconds,
            bestAccuracy: best?.coords?.accuracy || null
          });
        }
      };

      updateProgress();
      locationIntervalRef.current = setInterval(updateProgress, 400);
      locationTimeoutRef.current = setTimeout(() => finalize(best), LOCATION_COLLECTION_WINDOW_MS);

      locationWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) {
            best = pos;
            updateProgress();
          }
          if ((best.coords.accuracy || Infinity) <= TARGET_LOCATION_ACCURACY_METERS) {
            finalize(best);
          }
        },
        (err) => {
          lastError = err;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }).catch(() => null);

    if (watchedFix) {
      return watchedFix;
    }

    const fallbackAttempts = [
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    ];

    let best = null;
    let lastError = null;
    for (const options of fallbackAttempts) {
      try {
        const pos = await getCurrentPosition(options);
        if (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) {
          best = pos;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!best) {
      throw lastError || new Error('Unable to get location');
    }
    return best;
  };

  // Get location first when emergency button is pressed
  const handleEmergencyClick = async (type) => {
    setState('details');
    setEmergencyType(type);
    setUserLocation(null);
    setLocationCountdown(Math.ceil(LOCATION_COLLECTION_WINDOW_MS / 1000));
    setLocationStatus('Acquiring high-accuracy GPS...');
    setIsLocating(true);
    
    try {
      const pos = await getBestLocationFix(({ remainingSeconds, bestAccuracy }) => {
        setLocationCountdown(remainingSeconds);
        if (bestAccuracy) {
          setLocationStatus(`Best accuracy so far: ±${Math.round(bestAccuracy)}m`);
        }
      });
      setUserLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
      setLocationStatus(`GPS locked at ±${Math.round(pos.coords.accuracy || 0)}m`);
    } catch (e) {
      alert('Unable to get location. Please enable location permission.');
      setState('idle');
    } finally {
      setIsLocating(false);
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

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Set video stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (e) {
      alert('Camera permission required. Please enable camera access.');
    }
  };

  // Capture photo from camera
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

  // Close camera
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const useAddressLocation = async (addressOverride) => {
    const targetAddress = String(addressOverride || manualAddress).trim();

    if (!targetAddress) {
      alert('Enter an address first.');
      return;
    }

    setResolvingAddress(true);
    setAddressMessage('Finding address on map...');

    try {
      const response = await axios.get(`${apiBase.replace(/\/+$/, '')}/geocode/resolve`, {
        params: { address: targetAddress }
      });

      const first = response.data;
      if (!first || !Number.isFinite(Number(first.latitude)) || !Number.isFinite(Number(first.longitude))) {
        setAddressMessage('Address not found. Try adding city/landmark (e.g. Accra).');
        return;
      }

      const lat = Number(first.latitude);
      const lon = Number(first.longitude);

      setUserLocation({
        latitude: lat,
        longitude: lon,
        accuracy: 50
      });
      setManualAddress(first.label);
      setAddressMessage(`Address locked: ${first.label}`);
      setLocationStatus('Using address-based location');
      setIsLocating(false);
      setAddressSuggestions([]);
      clearLocationTracking();
    } catch (e) {
      console.error('Address geocode failed:', e);
      setAddressMessage('Unable to resolve address right now. Try again.');
    } finally {
      setResolvingAddress(false);
    }
  };

  const loadAddressSuggestions = async (query) => {
    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const hasGooglePlaces = await ensureGooglePlacesLoaded();
      if (hasGooglePlaces && googleAutocompleteServiceRef.current) {
        const predictions = await new Promise((resolve) => {
          googleAutocompleteServiceRef.current.getPlacePredictions(
            {
              input: query,
              componentRestrictions: { country: 'gh' },
              types: ['geocode']
            },
            (results) => resolve(Array.isArray(results) ? results : [])
          );
        });

        if (predictions.length) {
          setAddressSuggestions(predictions.slice(0, 5).map((item) => ({
            label: item.description,
            placeId: item.place_id,
            source: 'google-places'
          })));
          setIsLoadingSuggestions(false);
          return;
        }
      }

      const response = await axios.get(`${apiBase.replace(/\/+$/, '')}/geocode/suggest`, {
        params: { q: query }
      });
      setAddressSuggestions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Suggestion lookup failed:', err);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
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

      const normalizedBase = apiBase.replace(/\/+$/, '');
      const candidates = [
        `${normalizedBase}/report`,
        `${normalizedBase}/api/report`,
        ...(normalizedBase.endsWith('/api') ? [`${normalizedBase.slice(0, -4)}/report`] : [])
      ];
      const reportUrls = [...new Set(candidates)];

      let res;
      let lastError;
      for (const reportUrl of reportUrls) {
        try {
          res = await axios.post(reportUrl, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          break;
        } catch (err) {
          lastError = err;
          const status = err?.response?.status;
          if (status && status !== 404) {
            break;
          }
        }
      }

      if (!res) {
        throw lastError || new Error('Unable to reach report endpoint');
      }
      
      setResult(res.data);
      setResponderInfo(emergency);
      setVoiceBlob(null);
      setMediaFiles([]);
      setState('success');
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      const details = status ? `status ${status}` : e.message;
      alert(`Failed to send alert (${details}). Check NEXT_PUBLIC_API_BASE in frontend/.env.local.`);
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
              {userLocation ? `📍 ${userLocation.latitude.toFixed(4)}°, ${userLocation.longitude.toFixed(4)}` : '📡 Locating...'}
            </p>
          </div>

          {/* Location Info */}
          <div style={{ background: '#e3f2fd', padding: 15, borderRadius: 10, marginBottom: 20, border: '2px solid #2196f3' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <i className="material-icons" style={{ fontSize: '22px', color: '#1565c0', marginTop: '2px' }}>location_on</i>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#1565c0', fontWeight: 600 }}>
                  <strong>Accuracy: {userLocation ? `±${Math.round(userLocation?.accuracy || 0)}m` : 'Acquiring...'}</strong>
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#1565c0' }}>
                  {isLocating ? `Collecting GPS fixes... ${locationCountdown}s left.` : locationStatus || 'Tap Refresh GPS to improve signal before sending.'}
                </p>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEmergencyClick(emergencyType)}
                    disabled={isLocating}
                    style={{ background: '#1565c0', color: 'white', border: 'none', borderRadius: 8, padding: '9px 12px', cursor: isLocating ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.82rem', opacity: isLocating ? 0.7 : 1 }}
                  >
                    {isLocating ? 'Refreshing GPS...' : 'Refresh GPS'}
                  </button>
                  {userLocation && (
                    <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: userLocation.accuracy <= MAX_LOCATION_ACCURACY_METERS ? '#1b5e20' : '#b71c1c', fontWeight: 700 }}>
                      {userLocation.accuracy <= MAX_LOCATION_ACCURACY_METERS ? 'Ready to send' : 'Weak signal - sending allowed'}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #bbdefb', padding: 10 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#0d47a1', fontWeight: 700 }}>
                    If GPS is wrong, set location by address
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => {
                        const next = e.target.value;
                        setManualAddress(next);
                        setAddressMessage('');
                        if (suggestionTimerRef.current) {
                          clearTimeout(suggestionTimerRef.current);
                        }
                        suggestionTimerRef.current = setTimeout(() => {
                          loadAddressSuggestions(next);
                        }, 350);
                      }}
                      placeholder="e.g. 72 Aladjo Road, Accra"
                      style={{ margin: 0, borderRadius: 8, border: '1px solid #90caf9', padding: '10px', fontSize: '0.85rem' }}
                    />
                    <button
                      onClick={() => useAddressLocation()}
                      disabled={resolvingAddress}
                      style={{ background: '#0d47a1', color: 'white', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: resolvingAddress ? 'not-allowed' : 'pointer', opacity: resolvingAddress ? 0.7 : 1, fontWeight: 700, fontSize: '0.8rem' }}
                    >
                      {resolvingAddress ? 'Finding...' : 'Use Address'}
                    </button>
                  </div>
                  {isLoadingSuggestions && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#0d47a1' }}>
                      Getting Google Maps street suggestions...
                    </p>
                  )}
                  {addressSuggestions.length > 0 && (
                    <div style={{ marginTop: 8, border: '1px solid #bbdefb', borderRadius: 8, maxHeight: 180, overflowY: 'auto', background: '#fff' }}>
                      {addressSuggestions.map((item, idx) => (
                        <button
                          key={`${item.label}-${idx}`}
                          onClick={() => {
                            setManualAddress(item.label);
                            setAddressSuggestions([]);
                            if (item.placeId) {
                              useAddressLocation(item.label);
                              return;
                            }
                            setUserLocation({
                              latitude: Number(item.latitude),
                              longitude: Number(item.longitude),
                              accuracy: 50
                            });
                            setLocationStatus(`Using ${item.source || 'suggested'} address location`);
                            setAddressMessage(`Address locked: ${item.label}`);
                            setIsLocating(false);
                            clearLocationTracking();
                          }}
                          style={{ width: '100%', textAlign: 'left', background: '#fff', border: 'none', borderBottom: idx < addressSuggestions.length - 1 ? '1px solid #e3f2fd' : 'none', padding: '9px 10px', cursor: 'pointer', fontSize: '0.82rem', color: '#0d47a1' }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {addressMessage && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#0d47a1' }}>
                      {addressMessage}
                    </p>
                  )}
                </div>
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ background: '#0288d1', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="material-icons" style={{ fontSize: '20px' }}>upload_file</i>
                Upload Files
              </button>
              <button 
                onClick={startCamera}
                style={{ background: '#00bcd4', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="material-icons" style={{ fontSize: '20px' }}>camera_alt</i>
                Take Photo
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
                clearLocationTracking();
                setIsLocating(false);
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
              disabled={!userLocation}
              style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#4caf50', color: 'white', cursor: !userLocation ? 'not-allowed' : 'pointer', opacity: !userLocation ? 0.65 : 1, fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>send</i>
              Send Alert Now
            </button>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '10px'
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '600px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px'
            }}>
              <h3 style={{ color: 'white', margin: '10px 0', fontSize: '1.2rem' }}>
                📸 Take a Photo
              </h3>
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxHeight: '500px',
                  borderRadius: '12px',
                  backgroundColor: '#000',
                  border: '3px solid #00bcd4',
                  objectFit: 'cover'
                }}
              />
              
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
              
              <div style={{
                display: 'flex',
                gap: '15px',
                width: '100%',
                justifyContent: 'center'
              }}>
                <button
                  onClick={capturePhoto}
                  style={{
                    padding: '12px 30px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#4caf50',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)'
                  }}
                >
                  <i className="material-icons">camera</i>
                  Capture Photo
                </button>
                <button
                  onClick={closeCamera}
                  style={{
                    padding: '12px 30px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#f44336',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)'
                  }}
                >
                  <i className="material-icons">close</i>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
