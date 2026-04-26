import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";
import { requestNotificationPermission, notifyNewEmergency } from "../lib/notifications";
import { getAverageResponseTime, getReportsToday, getReportsThisWeek, getTrendData, exportToCSV } from "../lib/analytics";
import dynamic from 'next/dynamic';
import '../styles/admin-mobile.css';

// Import map dynamically to avoid SSR issues
const EmergencyMap = dynamic(() => import('../components/EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 12 }}>
      <p style={{ color: '#64748b' }}>Loading map...</p>
    </div>
  )
});

const Admin = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const notificationsEnabledRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return null;
      }
      
      setUser(session.user);
      
      // Request notification permission
      const hasPermission = await requestNotificationPermission();
      setNotificationsEnabled(hasPermission);
      notificationsEnabledRef.current = hasPermission;
      
      // Fetch user role from admin_profiles
      const { data: profile, error } = await supabase
        .from('admin_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        alert('Access denied: No admin profile found');
        await supabase.auth.signOut();
        router.push('/login');
        return null;
      }
      
      setUserRole(profile.role);
      loadReports(profile.role);

      // Remove any existing channel first
      supabase.removeChannel(supabase.channel('reports-channel'));

      const subscription = supabase
        .channel('reports-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReport = payload.new;
            
            // Check if report matches user's role (or if super_admin)
            if (profile.role === 'super_admin' || newReport.type === profile.role) {
              setReports(prev => [newReport, ...prev]);
              
              // Show notification for new emergency (check ref for current state)
              if (notificationsEnabledRef.current) {
                notifyNewEmergency(newReport);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          }
        })
        .subscribe();

      return subscription;
    };

    let subscription;
    initAuth().then(sub => {
      subscription = sub;
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadReports = async (role) => {
    try {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by role unless super_admin
      if (role && role !== 'super_admin') {
        query = query.eq('type', role);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (e) {
      console.error("Error fetching reports:", e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      // Turn off notifications
      setNotificationsEnabled(false);
      notificationsEnabledRef.current = false;
    } else {
      // Request permission and turn on
      const hasPermission = await requestNotificationPermission();
      setNotificationsEnabled(hasPermission);
      notificationsEnabledRef.current = hasPermission;
      
      if (!hasPermission) {
        alert('Please allow notifications in your browser settings to enable alerts.');
      }
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  // Filter reports by status and date range
  const filtered = reports.filter(r => {
    // Status filter
    const statusMatch = filter === "all" || r.status === filter;
    
    // Date range filter
    let dateMatch = true;
    if (dateRange.start || dateRange.end) {
      const reportDate = new Date(r.created_at);
      reportDate.setHours(0, 0, 0, 0);
      
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        dateMatch = dateMatch && reportDate >= startDate;
      }
      
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && reportDate <= endDate;
      }
    }
    
    return statusMatch && dateMatch;
  });
  
  const pending = reports.filter(r => r.status === "pending").length;
  const responding = reports.filter(r => r.status === "responding").length;
  const resolved = reports.filter(r => r.status === "resolved").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Clean Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "24px 32px" }}>
        <div className="admin-header" style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
              Emergency Dashboard
              {userRole && userRole !== 'super_admin' && (
                <span style={{ marginLeft: 12, fontSize: "0.875rem", fontWeight: 500, color: "#64748b", textTransform: "capitalize" }}>
                  ({userRole} Admin)
                </span>
              )}
              {userRole === 'super_admin' && (
                <span style={{ marginLeft: 12, fontSize: "0.875rem", fontWeight: 500, color: "#10b981" }}>
                  (Super Admin)
                </span>
              )}
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>Real-time monitoring</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Notification Toggle Button */}
            <button
              onClick={toggleNotifications}
              style={{ 
                padding: "8px 12px", 
                background: notificationsEnabled ? "#f0fdf4" : "#fef2f2", 
                border: `1px solid ${notificationsEnabled ? "#10b981" : "#ef4444"}`,
                borderRadius: 6, 
                fontSize: "0.75rem", 
                fontWeight: 500,
                color: notificationsEnabled ? "#10b981" : "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <span>{notificationsEnabled ? "🔔" : "🔕"}</span>
              {notificationsEnabled ? "Notifications ON" : "Notifications OFF"}
            </button>
            {user && (
              <span style={{ fontSize: "0.875rem", color: "#64748b", marginRight: 8 }}>
                {user.email}
              </span>
            )}
            <a href="/" style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500 }}>
              User View
            </a>
            <a href="/reports" style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500 }}>
              Reports
            </a>
            {userRole === 'super_admin' && (
              <a href="/manage-admins" style={{ padding: "8px 16px", background: "#eff6ff", color: "#2563eb", textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, border: "1px solid #2563eb" }}>
                👥 Manage Admins
              </a>
            )}
            <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }}>
        
        {/* Clean Stats - 4 Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 40 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.1)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Total Reports</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#0f172a" }}>{reports.length}</p>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(239,68,68,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Pending</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{pending}</p>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(245,158,11,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Responding</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>{responding}</p>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(16,185,129,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Resolved</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{resolved}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
          
          {/* Status Distribution Pie Chart - For ALL admins */}
          <div style={{ background: "white", padding: 32, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
              {userRole === 'super_admin' ? 'Status Distribution (All Types)' : `${userRole?.charAt(0).toUpperCase() + userRole?.slice(1)} Status Distribution`}
            </h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
              {/* Simple Pie Chart using CSS */}
              <div style={{ position: "relative", width: 180, height: 180 }}>
                <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  {/* Pending slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="20"
                    strokeDasharray={`${(pending / reports.length * 100) || 0} ${100 - (pending / reports.length * 100) || 100}`}
                  />
                  {/* Responding slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="20"
                    strokeDasharray={`${(responding / reports.length * 100) || 0} ${100 - (responding / reports.length * 100) || 100}`}
                    strokeDashoffset={`-${(pending / reports.length * 100) || 0}`}
                  />
                  {/* Resolved slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="20"
                    strokeDasharray={`${(resolved / reports.length * 100) || 0} ${100 - (resolved / reports.length * 100) || 100}`}
                    strokeDashoffset={`-${((pending + responding) / reports.length * 100) || 0}`}
                  />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{reports.length}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Total</div>
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef4444" }}></div>
                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Pending ({pending})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#f59e0b" }}></div>
                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Responding ({responding})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#10b981" }}></div>
                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Resolved ({resolved})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Types Chart - Super Admin sees all, others see only their type */}
          <div style={{ background: "white", padding: 32, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
              {userRole === 'super_admin' ? 'All Emergency Types' : `${userRole?.charAt(0).toUpperCase() + userRole?.slice(1)} Emergency Breakdown`}
            </h3>
            
            {userRole === 'super_admin' ? (
              // Super Admin: Show all emergency types
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Fire */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🔥</span> Fire
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                      {reports.filter(r => r.type === 'fire').length}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ 
                      width: `${reports.length > 0 ? (reports.filter(r => r.type === 'fire').length / reports.length * 100) : 0}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #ff5252 0%, #ff1744 100%)",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>
                {/* Medical */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🏥</span> Medical
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                      {reports.filter(r => r.type === 'medical').length}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ 
                      width: `${reports.length > 0 ? (reports.filter(r => r.type === 'medical').length / reports.length * 100) : 0}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #2196f3 0%, #1565c0 100%)",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>
                {/* Crime */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🚔</span> Crime
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                      {reports.filter(r => r.type === 'crime').length}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ 
                      width: `${reports.length > 0 ? (reports.filter(r => r.type === 'crime').length / reports.length * 100) : 0}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #ff9800 0%, #e65100 100%)",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>
              </div>
            ) : (
              // Role-specific Admin: Show status breakdown for their type only
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Pending */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>⏳</span> Pending
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                      {pending}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ 
                      width: `${reports.length > 0 ? (pending / reports.length * 100) : 0}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>
                {/* Responding */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🚨</span> Responding
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                      {responding}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ 
                      width: `${reports.length > 0 ? (responding / reports.length * 100) : 0}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>
                {/* Resolved */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>✅</span> Resolved
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                      {resolved}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ 
                      width: `${reports.length > 0 ? (resolved / reports.length * 100) : 0}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #10b981 0%, #16a34a 100%)",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Filter Bar with Analytics Toggle and Export */}
        <div style={{ background: "white", padding: "16px 24px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["all", "pending", "responding", "resolved"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "none",
                    background: filter === f ? "#0f172a" : "transparent",
                    color: filter === f ? "white" : "#64748b",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    textTransform: "capitalize"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: showAnalytics ? "#eff6ff" : "white",
                  color: showAnalytics ? "#2196f3" : "#64748b",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem"
                }}
              >
                📊 {showAnalytics ? 'Hide' : 'Show'} Analytics
              </button>
              <button
                onClick={() => exportToCSV(filtered)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem"
                }}
              >
                📥 Export CSV
              </button>
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>{filtered.length} reports</span>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Date Range:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                fontSize: "0.875rem",
                color: "#475569"
              }}
            />
            <span style={{ color: "#64748b" }}>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                fontSize: "0.875rem",
                color: "#475569"
              }}
            />
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "#f1f5f9",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: "0.875rem"
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        {showAnalytics && (
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
              📊 Performance Analytics
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {/* Today */}
              <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Today</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{getReportsToday(reports)}</div>
              </div>
              
              {/* This Week */}
              <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>This Week</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{getReportsThisWeek(reports)}</div>
              </div>
              
              {/* Avg Response Time */}
              <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Avg Response</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{getAverageResponseTime(reports)}</div>
              </div>
              
              {/* Resolution Rate */}
              <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Resolution Rate</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
                  {reports.length > 0 ? Math.round((resolved / reports.length) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* 7-Day Trend */}
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>
                7-Day Trend
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {getTrendData(reports, 7).map((day, idx) => {
                  const maxCount = Math.max(...getTrendData(reports, 7).map(d => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0f172a" }}>{day.count}</div>
                      <div
                        style={{
                          width: "100%",
                          height: `${height}%`,
                          background: "linear-gradient(180deg, #2196f3 0%, #1565c0 100%)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: day.count > 0 ? 20 : 4,
                          transition: "height 0.3s"
                        }}
                      ></div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", textAlign: "center" }}>{day.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reports List - Clean Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, color: "#64748b" }}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, color: "#64748b" }}>No reports found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filtered.map(r => (
              <div 
                key={r.id} 
                style={{ 
                  background: "white", 
                  padding: 24, 
                  borderRadius: 12, 
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 24,
                  alignItems: "center",
                  transition: "all 0.2s",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = "translateY(-2px)"; 
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.08)"; 
                }} 
                onMouseOut={(e) => { 
                  e.currentTarget.style.transform = "translateY(0)"; 
                  e.currentTarget.style.boxShadow = "none"; 
                }}
              >
                {/* Type Icon */}
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 8, 
                  background: r.type === "fire" ? "#fef2f2" : r.type === "medical" ? "#eff6ff" : "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem"
                }}>
                  {r.type === "fire" ? "🔥" : r.type === "medical" ? "🏥" : "🚔"}
                </div>

                {/* Info */}
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>
                    {r.type} Emergency
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
                    {r.latitude?.toFixed(4)}°, {r.longitude?.toFixed(4)}° • {new Date(r.created_at).toLocaleString()}
                  </p>
                  {/* Media indicators */}
                  {(r.voice_url || (r.media_urls && r.media_urls.length > 0)) && (
                    <div style={{ marginTop: 6, display: "flex", gap: 8, fontSize: "0.75rem", color: "#64748b" }}>
                      {r.voice_url && <span style={{ background: "#f3e5f5", padding: "2px 8px", borderRadius: 4, color: "#9c27b0" }}>🎤 Voice</span>}
                      {r.media_urls && r.media_urls.length > 0 && <span style={{ background: "#e1f5fe", padding: "2px 8px", borderRadius: 4, color: "#0288d1" }}>📸 {r.media_urls.length} photo{r.media_urls.length > 1 ? 's' : ''}</span>}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <span style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  background: r.status === "pending" ? "#fef2f2" : r.status === "responding" ? "#fff7ed" : "#f0fdf4",
                  color: r.status === "pending" ? "#dc2626" : r.status === "responding" ? "#ea580c" : "#16a34a"
                }}>
                  {r.status}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  {r.status !== "resolved" && (
                    <button
                      onClick={() => updateStatus(r.id, r.status === "pending" ? "responding" : "resolved")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 6,
                        border: "none",
                        background: "#0f172a",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: "0.875rem"
                      }}
                    >
                      {r.status === "pending" ? "Respond" : "Resolve"}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedReport(r)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "white",
                      color: "#475569",
                      cursor: "pointer",
                      fontWeight: 500,
                      fontSize: "0.875rem"
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Emergency Map - Compact at Bottom */}
        <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginTop: 24, height: 350 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
            📍 Emergency Locations Map
          </h3>
          <div style={{ height: 'calc(100% - 32px)' }}>
            <EmergencyMap 
              reports={reports} 
              onMarkerClick={(report) => setSelectedReport(report)}
            />
          </div>
        </div>

        {/* Modal - Clean Design */}
        {selectedReport && (
          <div 
            style={{ 
              position: "fixed", 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: "rgba(0,0,0,0.5)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              zIndex: 999,
              padding: 20
            }} 
            onClick={() => setSelectedReport(null)}
          >
            <div 
              style={{ 
                background: "white", 
                borderRadius: 12, 
                maxWidth: 600, 
                width: "100%", 
                maxHeight: "90vh", 
                overflowY: "auto",
                padding: 32
              }} 
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>
                    {selectedReport.type} Emergency
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  style={{ 
                    background: "none", 
                    border: "none", 
                    fontSize: "1.5rem", 
                    cursor: "pointer", 
                    color: "#94a3b8",
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>

              {/* Location */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>Location</p>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                  {selectedReport.latitude?.toFixed(6)}°, {selectedReport.longitude?.toFixed(6)}°
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                  Accuracy: ±{Math.round(selectedReport.accuracy || 0)}m
                </p>
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`, "_blank")}
                  style={{ 
                    marginTop: 12, 
                    width: "100%", 
                    padding: "10px", 
                    background: "#0f172a", 
                    color: "white", 
                    border: "none", 
                    borderRadius: 6, 
                    cursor: "pointer", 
                    fontWeight: 500,
                    fontSize: "0.875rem"
                  }}
                >
                  Open in Google Maps
                </button>
              </div>

              {/* Description */}
              {selectedReport.description && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>Description</p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                    {selectedReport.description}
                  </p>
                </div>
              )}

              {/* Responder */}
              {selectedReport.responder_number && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>Responder Number</p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                    {selectedReport.responder_number}
                  </p>
                </div>
              )}

              {/* Voice */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>Voice Message</p>
                {selectedReport.voice_url ? (
                  <audio controls style={{ width: "100%" }} src={selectedReport.voice_url} />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8", fontStyle: "italic" }}>No voice message</p>
                )}
              </div>

              {/* Media */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                  Photos/Videos
                </p>
                {selectedReport.media_urls && selectedReport.media_urls.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {selectedReport.media_urls.map((url, idx) => (
                      <img 
                        key={idx}
                        src={url} 
                        alt={`Media ${idx + 1}`} 
                        style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid #e2e8f0" }} 
                        onClick={() => window.open(url, "_blank")}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8", fontStyle: "italic" }}>No photos or videos</p>
                )}
              </div>

              {/* Actions */}
              {selectedReport.status !== "resolved" && (
                <button 
                  onClick={() => { 
                    updateStatus(selectedReport.id, selectedReport.status === "pending" ? "responding" : "resolved"); 
                    setSelectedReport(null); 
                  }} 
                  style={{ 
                    width: "100%", 
                    padding: "12px", 
                    borderRadius: 6, 
                    border: "none", 
                    background: "#10b981", 
                    color: "white", 
                    cursor: "pointer", 
                    fontWeight: 500,
                    fontSize: "0.875rem"
                  }}
                >
                  {selectedReport.status === "pending" ? "Start Responding" : "Mark as Resolved"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
