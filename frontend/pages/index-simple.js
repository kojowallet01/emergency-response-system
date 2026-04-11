import { useState } from 'react';
import axios from 'axios';

export default function Home(){
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
  const apiConfigured = Boolean(process.env.NEXT_PUBLIC_API_BASE);
  const [state, setState] = useState('idle');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const send = async (type) => {
    if (!apiConfigured) {
      alert('API not configured. Set NEXT_PUBLIC_API_BASE in frontend/.env.local and restart the frontend.');
      return;
    }

    setState('sending');
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const form = new FormData();
      form.append('type', type);
      form.append('latitude', latitude);
      form.append('longitude', longitude);
      form.append('description', desc);
      if (file) form.append('image', file);

      const res = await axios.post(`${apiBase}/report`, form);
      setResult(res.data);
      setState('success');
    } catch (e) {
      console.error(e);
      alert('Failed to send alert');
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
        {!apiConfigured && (
          <div style={{ background: '#ffebee', color: '#b71c1c', border: '2px solid #ef5350', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: '0.9rem', fontWeight: 600 }}>
            API not configured. Set NEXT_PUBLIC_API_BASE in frontend/.env.local and restart the frontend.
          </div>
        )}

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
