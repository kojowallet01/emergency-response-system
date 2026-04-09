import { useState } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export default function User(){
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState(null);

  async function send(type){
    setSending(true);
    try{
      const pos = await new Promise((res, rej)=>navigator.geolocation.getCurrentPosition(res, rej, {enableHighAccuracy:true, timeout:10000}));
      const { latitude, longitude } = pos.coords;
      const form = new FormData();
      form.append('type', type);
      form.append('latitude', latitude);
      form.append('longitude', longitude);
      form.append('description', desc);
      if (file) form.append('image', file);

      const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE + '/report', form, { headers: {'Content-Type':'multipart/form-data'} });
      setSent(res.data);
    }catch(e){
      console.error(e);
      alert('Failed to send alert. Check location permissions and network.');
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
