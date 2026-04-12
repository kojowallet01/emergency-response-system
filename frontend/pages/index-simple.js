import { useState } from 'react';
import axios from 'axios';

const MAX_LOCATION_ACCURACY_METERS = 500;
const TARGET_LOCATION_ACCURACY_METERS = 100;
const LOCATION_COLLECTION_WINDOW_MS = 18000;

export default function Home(){
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
  const [state, setState] = useState('idle');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const getCurrentPosition = (options) =>
    new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

  const getBestLocationFix = async () => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported on this device.');
    }

    const watchedFix = await new Promise((resolve, reject) => {
      let best = null;
      let settled = false;
      let watchId = null;
      let lastError = null;

      const finalize = (result) => {
        if (settled) return;
        settled = true;
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
        clearTimeout(timer);

        if (result) {
          resolve(result);
        } else {
          reject(lastError || new Error('Unable to get location'));
        }
      };

      const timer = setTimeout(() => finalize(best), LOCATION_COLLECTION_WINDOW_MS);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) {
            best = pos;
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

  const send = async (type) => {
    setState('sending');
    try {
      const pos = await getBestLocationFix();
      const { latitude, longitude } = pos.coords;
      const accuracy = pos.coords.accuracy || Infinity;

      if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
        const proceed = window.confirm(
          `Location signal is weak (±${Math.round(accuracy)}m). This may place responders far away. Press OK to send anyway or Cancel to retry GPS.`
        );
        if (!proceed) {
          setState('idle');
          return;
        }
      }

      const form = new FormData();
      form.append('type', type);
      form.append('latitude', latitude);
      form.append('longitude', longitude);
      form.append('description', desc);
      if (file) form.append('image', file);

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
          res = await axios.post(reportUrl, form);
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
      setState('success');
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      const details = status ? `status ${status}` : e.message;
      alert(`Failed to send alert (${details}). Check NEXT_PUBLIC_API_BASE in frontend/.env.local.`);
      setState('idle');
    }
  };

  if (state === 'success') {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>✅</div>
            <h3>Alert Sent!</h3>
          </div>
          <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
            <p><strong>Type:</strong> {result.type}</p>
            <p><strong>Time:</strong> {new Date(result.created_at).toLocaleString()}</p>
            <p><strong>Status:</strong> <span style={{ color: '#1890ff', fontWeight: 600 }}>Sent ✓</span></p>
          </div>
          <button onClick={() => setState('idle')} style={{ marginTop: 15, width: '100%' }}>Send Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🚨 Emergency Alert</h1>
      <p className="subtitle">Ghana Emergency Response System</p>
      
      <div className="card">
        <p className="small" style={{ marginBottom: 15 }}>Tap an emergency button to alert responders</p>
        
        <div className="row">
          <button className="big-btn fire" onClick={() => send('fire')}>
            <span>🔥<br/>Fire</span>
          </button>
          <button className="big-btn medical" onClick={() => send('medical')}>
            <span>🏥<br/>Medical</span>
          </button>
          <button className="big-btn crime" onClick={() => send('crime')}>
            <span>🚔<br/>Crime</span>
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Details (Optional)</label>
          <textarea 
            placeholder="Describe the situation" 
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Photo (Optional)</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <div className="sos" onClick={() => send('fire')}>SOS</div>
      </div>
    </div>
  );
}
