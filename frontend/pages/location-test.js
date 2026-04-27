import { useState } from 'react';

export default function LocationTest() {
  const [status, setStatus] = useState('Ready to test');
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);

  const testLocation = () => {
    setStatus('Requesting location...');
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setStatus('Failed');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setStatus('✅ Success!');
        setError(null);
      },
      (err) => {
        setError({
          code: err.code,
          message: err.message,
          PERMISSION_DENIED: err.code === 1,
          POSITION_UNAVAILABLE: err.code === 2,
          TIMEOUT: err.code === 3
        });
        setStatus('❌ Failed');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div style={{
      padding: 20,
      fontFamily: 'system-ui',
      maxWidth: 600,
      margin: '0 auto'
    }}>
      <h1>📍 Location Test</h1>
      
      <div style={{
        padding: 20,
        background: '#f0f0f0',
        borderRadius: 8,
        marginBottom: 20
      }}>
        <h2>Status: {status}</h2>
      </div>

      <button
        onClick={testLocation}
        style={{
          width: '100%',
          padding: 20,
          fontSize: 18,
          background: '#007AFF',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          cursor: 'pointer',
          marginBottom: 20
        }}
      >
        Test Location Access
      </button>

      {position && (
        <div style={{
          padding: 20,
          background: '#d4edda',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <h3>✅ Location Retrieved:</h3>
          <p><strong>Latitude:</strong> {position.lat}</p>
          <p><strong>Longitude:</strong> {position.lng}</p>
          <p><strong>Accuracy:</strong> {position.accuracy}m</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: 20,
          background: '#f8d7da',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <h3>❌ Error Details:</h3>
          <p><strong>Code:</strong> {error.code}</p>
          <p><strong>Message:</strong> {error.message}</p>
          
          {error.PERMISSION_DENIED && (
            <div style={{
              marginTop: 15,
              padding: 15,
              background: '#fff3cd',
              borderRadius: 8
            }}>
              <h4>🔒 Permission Denied</h4>
              <p>This means Safari is blocking location access.</p>
              
              <h5>Try these steps:</h5>
              <ol>
                <li>Tap the "aA" icon in the address bar</li>
                <li>Tap "Website Settings"</li>
                <li>Find "Location" and set to "Allow"</li>
                <li>Refresh and try again</li>
              </ol>
              
              <h5>Or reset all permissions:</h5>
              <ol>
                <li>Settings → Safari</li>
                <li>Scroll down to "Privacy & Security"</li>
                <li>Tap "Clear History and Website Data"</li>
                <li>Confirm and reopen this page</li>
              </ol>
            </div>
          )}
          
          {error.POSITION_UNAVAILABLE && (
            <div style={{
              marginTop: 15,
              padding: 15,
              background: '#fff3cd',
              borderRadius: 8
            }}>
              <h4>📡 Position Unavailable</h4>
              <p>GPS signal not available. Try:</p>
              <ul>
                <li>Move to an open area or near a window</li>
                <li>Check if Location Services is ON in Settings</li>
                <li>Disable Airplane Mode</li>
              </ul>
            </div>
          )}
          
          {error.TIMEOUT && (
            <div style={{
              marginTop: 15,
              padding: 15,
              background: '#fff3cd',
              borderRadius: 8
            }}>
              <h4>⏱️ Timeout</h4>
              <p>Location request took too long. Try again.</p>
            </div>
          )}
        </div>
      )}

      <div style={{
        padding: 20,
        background: '#e7f3ff',
        borderRadius: 8,
        fontSize: 14
      }}>
        <h4>📋 Checklist:</h4>
        <ul>
          <li>✅ Settings → Safari → Location → "Allow"</li>
          <li>✅ Settings → Privacy → Location Services → ON</li>
          <li>❓ Safari → "aA" → Website Settings → Location → "Allow"</li>
        </ul>
      </div>
    </div>
  );
}
