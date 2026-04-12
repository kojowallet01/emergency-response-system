import { useState } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });
const MAX_LOCATION_ACCURACY_METERS = 500;
const TARGET_LOCATION_ACCURACY_METERS = 100;
const LOCATION_COLLECTION_WINDOW_MS = 18000;

export default function User(){
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState(null);

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

  async function send(type){
    setSending(true);
    try{
      const pos = await getBestLocationFix();
      const { latitude, longitude } = pos.coords;
      const accuracy = pos.coords.accuracy || Infinity;

      if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
        const proceed = window.confirm(
          `Location signal is weak (±${Math.round(accuracy)}m). This may place responders far away. Press OK to send anyway or Cancel to retry GPS.`
        );
        if (!proceed) {
          setSending(false);
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
          res = await axios.post(reportUrl, form, { headers: {'Content-Type':'multipart/form-data'} });
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

      setSent(res.data);
    }catch(e){
      console.error(e);
      const status = e?.response?.status;
      const details = status ? `status ${status}` : e.message;
      alert(`Failed to send alert (${details}). Check location permission and NEXT_PUBLIC_API_BASE.`);
    }finally{setSending(false)}
  }

  if (sent) return (
    <div className="container">
      <div className="card" style={{marginTop:40}}>
        <div style={{textAlign:'center', marginBottom:20}}>
          <div style={{fontSize:'3rem', marginBottom:10}}>✅</div>
          <h3>Alert Sent!</h3>
          <p className="small" style={{marginTop:10}}>Your emergency alert has been received</p>
        </div>
        <div style={{background:'#f5f5f5', padding:15, borderRadius:10, marginBottom:15}}>
          <p><strong>Type:</strong> {sent.type.charAt(0).toUpperCase() + sent.type.slice(1)}</p>
          <p><strong>Time:</strong> {new Date(sent.created_at).toLocaleString()}</p>
          <p><strong>Status:</strong> <span style={{color:'#1890ff', fontWeight:600}}>Responders Alerted</span></p>
        </div>
        <button onClick={()=>setSent(null)} style={{marginTop:15, width:'100%'}}>Send Another Alert</button>
      </div>
    </div>
  );

  return (
    <div className="container">
      <h1>🚨 Emergency Alert</h1>
      <p className="subtitle">Ghana Emergency Response System - Tap to alert emergency services</p>
      
      <div className="card">
        <p className="small" style={{marginBottom:15, color:'#666'}}>Select the type of emergency and we'll alert the nearest responders with your location</p>
        
        <div className="row">
          <button className="big-btn fire" onClick={()=>send('fire')} disabled={sending}>
            <span style={{lineHeight:1}}>🔥<br/>Fire</span>
          </button>
          <button className="big-btn medical" onClick={()=>send('medical')} disabled={sending}>
            <span style={{lineHeight:1}}>🏥<br/>Medical</span>
          </button>
          <button className="big-btn crime" onClick={()=>send('crime')} disabled={sending}>
            <span style={{lineHeight:1}}>🚔<br/>Crime</span>
          </button>
        </div>

        <div style={{marginTop:20, paddingTop:20, borderTop:'1px solid #eee'}}>
          <label style={{fontWeight:600, display:'block', marginBottom:8}}>Add Details (Optional)</label>
          <textarea 
            placeholder="Describe the situation (e.g., 'Small fire in kitchen', 'Person unconscious')" 
            value={desc} 
            onChange={e=>setDesc(e.target.value)}
            disabled={sending}
          />
          
          <label style={{fontWeight:600, display:'block', marginBottom:8}}>Attach Photo (Optional)</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={e=>setFile(e.target.files[0])}
            disabled={sending}
          />
        </div>

        <p style={{fontSize:'0.85rem', color:'#999', marginTop:12, textAlign:'center'}}>
          ✓ Your location will be automatically sent<br/>
          ✓ All information is encrypted<br/>
          ✓ Response teams are always ready
        </p>
      </div>

      <div style={{textAlign:'center', marginTop:30}}>
        <div className="sos" onClick={()=>send('fire')} title="Emergency SOS">SOS</div>
      </div>
    </div>
  )
}
