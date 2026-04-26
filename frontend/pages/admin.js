import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";
import { requestNotificationPermission, notifyNewEmergency } from "../lib/notifications";
import { getAverageResponseTime, getReportsToday, getReportsThisWeek, getTrendData, exportToCSV } from "../lib/analytics";
import dynamic from 'next/dynamic';

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
  const [darkMode, setDarkMode] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const notificationsEnabledRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  // Load notes for selected report
  const loadNotes = async (reportId) => {
    try {
      const { data, error } = await supabase
        .from('report_notes')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setNotes(data || []);
    } catch (e) {
      console.error('Error loading notes:', e);
      setNotes([]);
    }
  };

  // Add new note
  const addNote = async (reportId) => {
    if (!newNote.trim()) return;

    try {
      const { data, error } = await supabase
        .from('report_notes')
        .insert([
          {
            report_id: reportId,
            admin_id: user.id,
            admin_email: user.email,
            note: newNote.trim()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      setNotes([...notes, data]);
      setNewNote('');
    } catch (e) {
      console.error('Error adding note:', e);
      alert('Failed to add note');
    }
  };

  // Update note
  const updateNote = async (noteId) => {
    if (!editingNoteText.trim()) return;

    try {
      const { error } = await supabase
        .from('report_notes')
        .update({ note: editingNoteText.trim() })
        .eq('id', noteId);

      if (error) throw error;
      
      setNotes(notes.map(n => 
        n.id === noteId ? { ...n, note: editingNoteText.trim(), updated_at: new Date().toISOString() } : n
      ));
      setEditingNoteId(null);
      setEditingNoteText('');
    } catch (e) {
      console.error('Error updating note:', e);
      alert('Failed to update note');
    }
  };

  // Delete note
  const deleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;

    try {
      const { error } = await supabase
        .from('report_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (e) {
      console.error('Error deleting note:', e);
      alert('Failed to delete note');
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

  // Dark mode colors
  const colors = {
    bg: darkMode ? "#0f172a" : "#f8fafc",
    cardBg: darkMode ? "#1e293b" : "white",
    headerBg: darkMode ? "#1e293b" : "white",
    text: darkMode ? "#f1f5f9" : "#0f172a",
    textSecondary: darkMode ? "#94a3b8" : "#64748b",
    border: darkMode ? "#334155" : "#e2e8f0",
    statBg: darkMode ? "#0f172a" : "white",
    filterBg: darkMode ? "#0f172a" : "transparent",
    filterActive: darkMode ? "#3b82f6" : "#0f172a",
    buttonBg: darkMode ? "#334155" : "#f1f5f9",
    buttonText: darkMode ? "#f1f5f9" : "#475569"
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, transition: "background 0.3s" }}>
      {/* Clean Header */}
      <div style={{ background: colors.headerBg, borderBottom: `1px solid ${colors.border}`, padding: "24px 32px", transition: "all 0.3s" }}>
        <div className="admin-header" style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
              Emergency Dashboard
              {userRole && userRole !== 'super_admin' && (
                <span style={{ marginLeft: 12, fontSize: "0.875rem", fontWeight: 500, color: colors.textSecondary, textTransform: "capitalize", transition: "color 0.3s" }}>
                  ({userRole} Admin)
                </span>
              )}
              {userRole === 'super_admin' && (
                <span style={{ marginLeft: 12, fontSize: "0.875rem", fontWeight: 500, color: "#10b981" }}>
                  (Super Admin)
                </span>
              )}
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>Real-time monitoring</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              style={{ 
                padding: "8px 12px", 
                background: darkMode ? "#1e293b" : "#f8fafc", 
                border: `1px solid ${colors.border}`,
                borderRadius: 6, 
                fontSize: "0.75rem", 
                fontWeight: 500,
                color: colors.text,
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
              <span>{darkMode ? "🌙" : "☀️"}</span>
              {darkMode ? "Dark" : "Light"}
            </button>
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
              <span style={{ fontSize: "0.875rem", color: colors.textSecondary, marginRight: 8, transition: "color 0.3s" }}>
                {user.email}
              </span>
            )}
            <a href="/" style={{ padding: "8px 16px", background: colors.buttonBg, color: colors.buttonText, textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, transition: "all 0.3s" }}>
              User View
            </a>
            <a href="/reports" style={{ padding: "8px 16px", background: colors.buttonBg, color: colors.buttonText, textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, transition: "all 0.3s" }}>
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
          <div style={{ background: colors.statBg, padding: 24, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = darkMode ? "0 12px 24px rgba(0,0,0,0.3)" : "0 12px 24px rgba(0,0,0,0.1)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, fontWeight: 500, transition: "color 0.3s" }}>Total Reports</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>{reports.length}</p>
          </div>
          <div style={{ background: colors.statBg, padding: 24, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(239,68,68,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, fontWeight: 500, transition: "color 0.3s" }}>Pending</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{pending}</p>
          </div>
          <div style={{ background: colors.statBg, padding: 24, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(245,158,11,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, fontWeight: 500, transition: "color 0.3s" }}>Responding</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>{responding}</p>
          </div>
          <div style={{ background: colors.statBg, padding: 24, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(16,185,129,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, fontWeight: 500, transition: "color 0.3s" }}>Resolved</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{resolved}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
          
          {/* Status Distribution Pie Chart - For ALL admins */}
          <div style={{ background: colors.cardBg, padding: 32, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
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
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>{reports.length}</div>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary, transition: "color 0.3s" }}>Total</div>
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef4444" }}></div>
                  <span style={{ fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>Pending ({pending})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#f59e0b" }}></div>
                  <span style={{ fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>Responding ({responding})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#10b981" }}></div>
                  <span style={{ fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>Resolved ({resolved})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Types Chart - Super Admin sees all, others see only their type */}
          <div style={{ background: colors.cardBg, padding: 32, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
              {userRole === 'super_admin' ? 'All Emergency Types' : `${userRole?.charAt(0).toUpperCase() + userRole?.slice(1)} Emergency Breakdown`}
            </h3>
            
            {userRole === 'super_admin' ? (
              // Super Admin: Show all emergency types
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Fire */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", color: colors.textSecondary, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                      <span>🔥</span> Fire
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                      {reports.filter(r => r.type === 'fire').length}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: 4, overflow: "hidden", transition: "background 0.3s" }}>
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
                    <span style={{ fontSize: "0.875rem", color: colors.textSecondary, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                      <span>🏥</span> Medical
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                      {reports.filter(r => r.type === 'medical').length}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: 4, overflow: "hidden", transition: "background 0.3s" }}>
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
                    <span style={{ fontSize: "0.875rem", color: colors.textSecondary, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                      <span>🚔</span> Crime
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                      {reports.filter(r => r.type === 'crime').length}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: 4, overflow: "hidden", transition: "background 0.3s" }}>
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
                    <span style={{ fontSize: "0.875rem", color: colors.textSecondary, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                      <span>⏳</span> Pending
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                      {pending}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: 4, overflow: "hidden", transition: "background 0.3s" }}>
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
                    <span style={{ fontSize: "0.875rem", color: colors.textSecondary, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                      <span>🚨</span> Responding
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                      {responding}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: 4, overflow: "hidden", transition: "background 0.3s" }}>
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
                    <span style={{ fontSize: "0.875rem", color: colors.textSecondary, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                      <span>✅</span> Resolved
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                      {resolved}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: 4, overflow: "hidden", transition: "background 0.3s" }}>
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
        <div style={{ background: colors.cardBg, padding: "16px 24px", borderRadius: 12, border: `1px solid ${colors.border}`, marginBottom: 24, transition: "all 0.3s" }}>
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
                    background: filter === f ? colors.filterActive : colors.filterBg,
                    color: filter === f ? "white" : colors.textSecondary,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    textTransform: "capitalize",
                    transition: "all 0.3s"
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
                  border: `1px solid ${colors.border}`,
                  background: showAnalytics ? "#eff6ff" : colors.cardBg,
                  color: showAnalytics ? "#2196f3" : colors.textSecondary,
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  transition: "all 0.3s"
                }}
              >
                📊 {showAnalytics ? 'Hide' : 'Show'} Analytics
              </button>
              <button
                onClick={() => exportToCSV(filtered)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                  background: colors.cardBg,
                  color: colors.textSecondary,
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  transition: "all 0.3s"
                }}
              >
                📥 Export CSV
              </button>
              <span style={{ fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>{filtered.length} reports</span>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: colors.textSecondary, fontWeight: 500, transition: "color 0.3s" }}>Date Range:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: `1px solid ${colors.border}`,
                fontSize: "0.875rem",
                color: colors.text,
                background: colors.cardBg,
                transition: "all 0.3s"
              }}
            />
            <span style={{ color: colors.textSecondary, transition: "color 0.3s" }}>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: `1px solid ${colors.border}`,
                fontSize: "0.875rem",
                color: colors.text,
                background: colors.cardBg,
                transition: "all 0.3s"
              }}
            />
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: colors.buttonBg,
                  color: colors.textSecondary,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  transition: "all 0.3s"
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        {showAnalytics && (
          <div style={{ background: colors.cardBg, padding: 24, borderRadius: 12, border: `1px solid ${colors.border}`, marginBottom: 24, transition: "all 0.3s" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "1rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
              📊 Performance Analytics
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {/* Today */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>Today</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>{getReportsToday(reports)}</div>
              </div>
              
              {/* This Week */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>This Week</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>{getReportsThisWeek(reports)}</div>
              </div>
              
              {/* Avg Response Time */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>Avg Response</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>{getAverageResponseTime(reports)}</div>
              </div>
              
              {/* Resolution Rate */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>Resolution Rate</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>
                  {reports.length > 0 ? Math.round((resolved / reports.length) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* 7-Day Trend */}
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                7-Day Trend
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {getTrendData(reports, 7).map((day, idx) => {
                  const maxCount = Math.max(...getTrendData(reports, 7).map(d => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>{day.count}</div>
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
                      <div style={{ fontSize: "0.7rem", color: colors.textSecondary, textAlign: "center", transition: "color 0.3s" }}>{day.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reports List - Clean Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, background: colors.cardBg, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
            <p style={{ margin: 0, color: colors.textSecondary, transition: "color 0.3s" }}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: colors.cardBg, borderRadius: 12, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
            <p style={{ margin: 0, color: colors.textSecondary, transition: "color 0.3s" }}>No reports found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filtered.map(r => (
              <div 
                key={r.id} 
                style={{ 
                  background: colors.cardBg, 
                  padding: 24, 
                  borderRadius: 12, 
                  border: `1px solid ${colors.border}`,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 24,
                  alignItems: "center",
                  transition: "all 0.2s",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = "translateY(-2px)"; 
                  e.currentTarget.style.boxShadow = darkMode ? "0 8px 16px rgba(0,0,0,0.4)" : "0 8px 16px rgba(0,0,0,0.08)"; 
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
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: colors.text, textTransform: "capitalize", transition: "color 0.3s" }}>
                    {r.type} Emergency
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>
                    {r.latitude?.toFixed(4)}°, {r.longitude?.toFixed(4)}° • {new Date(r.created_at).toLocaleString()}
                  </p>
                  {/* Media indicators */}
                  {(r.voice_url || (r.media_urls && r.media_urls.length > 0)) && (
                    <div style={{ marginTop: 6, display: "flex", gap: 8, fontSize: "0.75rem", color: colors.textSecondary }}>
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
                        background: darkMode ? "#3b82f6" : "#0f172a",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        transition: "all 0.3s"
                      }}
                    >
                      {r.status === "pending" ? "Respond" : "Resolve"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedReport(r);
                      loadNotes(r.id);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      color: colors.buttonText,
                      cursor: "pointer",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      transition: "all 0.3s"
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
        <div style={{ background: colors.cardBg, padding: 20, borderRadius: 12, border: `1px solid ${colors.border}`, marginTop: 24, height: 350, transition: "all 0.3s" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
            📍 Emergency Locations Map
          </h3>
          <div style={{ height: 'calc(100% - 32px)' }}>
            <EmergencyMap 
              reports={reports} 
              onMarkerClick={(report) => {
                setSelectedReport(report);
                loadNotes(report.id);
              }}
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
            onClick={() => {
              setSelectedReport(null);
              setNotes([]);
              setNewNote('');
              setEditingNoteId(null);
              setEditingNoteText('');
            }}
          >
            <div 
              style={{ 
                background: colors.cardBg, 
                borderRadius: 12, 
                maxWidth: 600, 
                width: "100%", 
                maxHeight: "90vh", 
                overflowY: "auto",
                padding: 32,
                transition: "all 0.3s"
              }} 
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: colors.text, textTransform: "capitalize", transition: "color 0.3s" }}>
                    {selectedReport.type} Emergency
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedReport(null);
                    setNotes([]);
                    setNewNote('');
                    setEditingNoteId(null);
                    setEditingNoteText('');
                  }} 
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
                <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>Location</p>
                <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>
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
                    background: darkMode ? "#3b82f6" : "#0f172a", 
                    color: "white", 
                    border: "none", 
                    borderRadius: 6, 
                    cursor: "pointer", 
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    transition: "all 0.3s"
                  }}
                >
                  Open in Google Maps
                </button>
              </div>

              {/* Description */}
              {selectedReport.description && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>Description</p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>
                    {selectedReport.description}
                  </p>
                </div>
              )}

              {/* Responder */}
              {selectedReport.responder_number && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>Responder Number</p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, transition: "color 0.3s" }}>
                    {selectedReport.responder_number}
                  </p>
                </div>
              )}

              {/* Voice */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>Voice Message</p>
                {selectedReport.voice_url ? (
                  <audio controls style={{ width: "100%" }} src={selectedReport.voice_url} />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8", fontStyle: "italic" }}>No voice message</p>
                )}
              </div>

              {/* Media */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
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

              {/* Admin Notes Section */}
              <div style={{ marginBottom: 24, borderTop: `2px solid ${colors.border}`, paddingTop: 24, transition: "border-color 0.3s" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", fontWeight: 600, color: colors.text, display: "flex", alignItems: "center", gap: 8, transition: "color 0.3s" }}>
                  💬 Admin Notes
                  <span style={{ fontSize: "0.75rem", fontWeight: 400, color: colors.textSecondary, transition: "color 0.3s" }}>
                    ({notes.length})
                  </span>
                </h3>

                {/* Notes List */}
                <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
                  {notes.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.875rem", color: colors.textSecondary, fontStyle: "italic", textAlign: "center", padding: "20px 0", transition: "color 0.3s" }}>
                      No notes yet. Add the first note below.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {notes.map(note => (
                        <div 
                          key={note.id} 
                          style={{ 
                            background: darkMode ? "#0f172a" : "#f8fafc", 
                            padding: 12, 
                            borderRadius: 8, 
                            border: `1px solid ${colors.border}`,
                            transition: "all 0.3s"
                          }}
                        >
                          {editingNoteId === note.id ? (
                            // Edit mode
                            <div>
                              <textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                style={{
                                  width: "100%",
                                  minHeight: 60,
                                  padding: 8,
                                  borderRadius: 6,
                                  border: `1px solid ${colors.border}`,
                                  fontSize: "0.875rem",
                                  fontFamily: "inherit",
                                  resize: "vertical",
                                  background: colors.cardBg,
                                  color: colors.text,
                                  transition: "all 0.3s"
                                }}
                              />
                              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button
                                  onClick={() => updateNote(note.id)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "#10b981",
                                    color: "white",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    cursor: "pointer"
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditingNoteText('');
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: `1px solid ${colors.border}`,
                                    background: colors.cardBg,
                                    color: colors.textSecondary,
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.3s"
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <div>
                              <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem", color: colors.text, whiteSpace: "pre-wrap", transition: "color 0.3s" }}>
                                {note.note}
                              </p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, transition: "color 0.3s" }}>
                                  <span style={{ fontWeight: 600 }}>{note.admin_email}</span>
                                  {' • '}
                                  {new Date(note.created_at).toLocaleString()}
                                  {note.updated_at !== note.created_at && ' (edited)'}
                                </div>
                                {note.admin_id === user?.id && (
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        setEditingNoteText(note.note);
                                      }}
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 4,
                                        border: "none",
                                        background: "transparent",
                                        color: "#3b82f6",
                                        fontSize: "0.75rem",
                                        cursor: "pointer",
                                        fontWeight: 500
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteNote(note.id)}
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 4,
                                        border: "none",
                                        background: "transparent",
                                        color: "#ef4444",
                                        fontSize: "0.75rem",
                                        cursor: "pointer",
                                        fontWeight: 500
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Note Form */}
                <div>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note... (e.g., 'Ambulance dispatched at 3:15 PM')"
                    style={{
                      width: "100%",
                      minHeight: 80,
                      padding: 12,
                      borderRadius: 6,
                      border: `1px solid ${colors.border}`,
                      fontSize: "0.875rem",
                      fontFamily: "inherit",
                      resize: "vertical",
                      background: colors.cardBg,
                      color: colors.text,
                      transition: "all 0.3s"
                    }}
                  />
                  <button
                    onClick={() => addNote(selectedReport.id)}
                    disabled={!newNote.trim()}
                    style={{
                      marginTop: 8,
                      padding: "10px 16px",
                      borderRadius: 6,
                      border: "none",
                      background: newNote.trim() ? "#3b82f6" : colors.border,
                      color: "white",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      cursor: newNote.trim() ? "pointer" : "not-allowed",
                      width: "100%",
                      transition: "all 0.3s"
                    }}
                  >
                    💬 Add Note
                  </button>
                </div>
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
