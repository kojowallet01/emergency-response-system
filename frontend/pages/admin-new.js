import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

let socket;

export default function Admin(){
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState({ type: 'all', status: 'all' });
  const [stats, setStats] = useState({ total: 0, pending: 0, responding: 0, resolved: 0 });

  useEffect(()=>{
    async function load(){
      try{
        const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE + '/reports');
        setReports(res.data);
      }catch(e){
        console.error('Failed to load reports:', e);
      }
    }
    load();

    try{
      socket = io(process.env.NEXT_PUBLIC_API_BASE, { reconnection: true });
      socket.on('new-report', (r)=> setReports(prev=>[r, ...prev]));
      socket.on('update-report', (r)=> setReports(prev=>prev.map(p=>p.id===r.id? r: p)));
    }catch(e){
      console.error('Socket.IO error:', e);
    }

    return ()=>{ if (socket) socket.disconnect(); }
  }, []);

  useEffect(() => {
    setStats({
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      responding: reports.filter(r => r.status === 'responding').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
    });
  }, [reports]);

  const filtered = reports.filter(r=> (filter.type==='all'||r.type===filter.type) && (filter.status==='all'||r.status===filter.status));

  async function updateStatus(id, status){
    await axios.patch(process.env.NEXT_PUBLIC_API_BASE + '/report/' + id, { status });
  }

  const getTypeIcon = (type) => {
    switch(type) {
      case 'fire': return '🔥';
      case 'medical': return '🏥';
      case 'crime': return '🚔';
      default: return '📍';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#fa8c16';
      case 'responding': return '#1890ff';
      case 'resolved': return '#52c41a';
      default: return '#666';
    }
  };

  return (
    <div style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight:'100vh', padding:20}}>
      <div style={{maxWidth:1400, margin:'0 auto'}}>
        {/* Header */}
        <div className="card" style={{marginBottom:20}}>
          <h1 style={{marginBottom:5, color:'#333'}}>🚨 Emergency Response Dashboard</h1>
          <p style={{color:'#999', fontSize:'0.95rem'}}>Real-time monitoring and management of emergency reports</p>
        </div>

        {/* Stats Cards */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:15, marginBottom:20}}>
          <div className="card" style={{borderLeft:'4px solid #fa8c16'}}>
            <div style={{fontSize:'1.5rem', fontWeight:700, color:'#fa8c16'}}>{stats.pending}</div>
            <div style={{fontSize:'0.9rem', color:'#999'}}>Pending Reports</div>
          </div>
          <div className="card" style={{borderLeft:'4px solid #1890ff'}}>
            <div style={{fontSize:'1.5rem', fontWeight:700, color:'#1890ff'}}>{stats.responding}</div>
            <div style={{fontSize:'0.9rem', color:'#999'}}>In Progress</div>
          </div>
          <div className="card" style={{borderLeft:'4px solid #52c41a'}}>
            <div style={{fontSize:'1.5rem', fontWeight:700, color:'#52c41a'}}>{stats.resolved}</div>
            <div style={{fontSize:'0.9rem', color:'#999'}}>Resolved</div>
          </div>
          <div className="card" style={{borderLeft:'4px solid #667eea'}}>
            <div style={{fontSize:'1.5rem', fontWeight:700, color:'#667eea'}}>{stats.total}</div>
            <div style={{fontSize:'0.9rem', color:'#999'}}>Total Reports</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{marginBottom:20}}>
          <label style={{display:'block', fontWeight:600, marginBottom:12, textTransform:'uppercase', fontSize:'0.85rem', letterSpacing:'0.5px'}}>Filters</label>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
            <div>
              <label style={{fontWeight:600, display:'block', marginBottom:8, fontSize:'0.9rem'}}>Emergency Type</label>
              <select value={filter.type} onChange={e=>setFilter(s=>({...s,type:e.target.value}))} style={{width:'100%'}}>
                <option value="all">All Types</option>
                <option value="fire">🔥 Fire</option>
                <option value="medical">🏥 Medical</option>
                <option value="crime">🚔 Crime</option>
              </select>
            </div>
            <div>
              <label style={{fontWeight:600, display:'block', marginBottom:8, fontSize:'0.9rem'}}>Status</label>
              <select value={filter.status} onChange={e=>setFilter(s=>({...s,status:e.target.value}))} style={{width:'100%'}}>
                <option value="all">All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="responding">🚨 Responding</option>
                <option value="resolved">✅ Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:15}}>
          {filtered.length === 0 ? (
            <div className="card" style={{gridColumn:'1/-1', textAlign:'center', padding:40}}>
              <div style={{fontSize:'2rem', marginBottom:10}}>📭</div>
              <p style={{color:'#999'}}>No reports matching the selected filters</p>
            </div>
          ) : (
            filtered.map(r=> (
              <div key={r._id || r.id} className="card" style={{
                borderLeft:`5px solid ${r.type === 'fire' ? '#ff4d4f' : r.type === 'medical' ? '#1890ff' : '#fa8c16'}`
              }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:12}}>
                  <div style={{fontSize:'2rem'}}>{getTypeIcon(r.type)}</div>
                  <span style={{
                    background: getStatusColor(r.status),
                    color:'white',
                    padding:'4px 12px',
                    borderRadius:'20px',
                    fontSize:'0.75rem',
                    fontWeight:600,
                    textTransform:'uppercase'
                  }}>
                    {r.status}
                  </span>
                </div>

                <h3 style={{marginBottom:8, fontSize:'1.2rem', color:'#333'}}>
                  {r.type.charAt(0).toUpperCase() + r.type.slice(1)} Emergency
                </h3>

                {r.description && (
                  <p style={{fontSize:'0.9rem', color:'#666', marginBottom:10, fontStyle:'italic'}}>
                    "{r.description}"
                  </p>
                )}

                <div style={{background:'#f5f5f5', padding:12, borderRadius:8, marginBottom:12, fontSize:'0.85rem'}}>
                  <p style={{marginBottom:5}}><strong>📍 Location:</strong> {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</p>
                  <p><strong>🕐 Time:</strong> {new Date(r.created_at).toLocaleString()}</p>
                </div>

                <div className="admin-actions">
                  {r.status !== 'responding' && (
                    <button onClick={()=>updateStatus(r._id || r.id,'responding')} style={{flex:1}}>
                      🚨 Respond
                    </button>
                  )}
                  {r.status !== 'resolved' && (
                    <button onClick={()=>updateStatus(r._id || r.id,'resolved')} style={{flex:1}}>
                      ✅ Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
