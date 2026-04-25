import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return null;
      }
      
      setUser(session.user);
      
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
      fetchReports(profile.role);
      
      // Remove any existing channel first
      supabase.removeChannel(supabase.channel('reports-archive'));

      const subscription = supabase
        .channel('reports-archive')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
          fetchReports(profile.role);
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

  const fetchReports = async (role) => {
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
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getFilteredReports = () => {
    let filtered = [...reports];

    if (filter !== "all") {
      filtered = filtered.filter((r) => r.status === filter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const exportToCSV = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      alert("No reports to export");
      return;
    }

    const headers = ["ID", "Type", "Status", "Latitude", "Longitude", "Created At"];
    const rows = filtered.map((report) => [
      report.id,
      report.type,
      report.status || "pending",
      report.latitude,
      report.longitude,
      new Date(report.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredReports = getFilteredReports();

  return (
    <div style={{ minHeight: "100vh", background: "#eff6ff" }}>
      {/* Clean Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
              Reports Archive
              {userRole && userRole !== 'super_admin' && (
                <span style={{ marginLeft: 12, fontSize: "0.875rem", fontWeight: 500, color: "#64748b", textTransform: "capitalize" }}>
                  ({userRole} Reports)
                </span>
              )}
              {userRole === 'super_admin' && (
                <span style={{ marginLeft: 12, fontSize: "0.875rem", fontWeight: 500, color: "#10b981" }}>
                  (All Reports)
                </span>
              )}
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>Complete history of emergency reports</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {user && (
              <span style={{ fontSize: "0.875rem", color: "#64748b", marginRight: 8 }}>
                {user.email}
              </span>
            )}
            <a href="/" style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500 }}>
              User View
            </a>
            <a href="/admin" style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500 }}>
              Dashboard
            </a>
            <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }}>
        
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.1)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Total</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#0f172a" }}>{reports.length}</p>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(239,68,68,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Pending</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{reports.filter((r) => r.status === "pending").length}</p>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(245,158,11,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Responding</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>{reports.filter((r) => r.status === "responding").length}</p>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(16,185,129,0.15)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Resolved</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{reports.filter((r) => r.status === "resolved").length}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div style={{ background: "white", padding: "20px 24px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            {/* Status Filter */}
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

            {/* Search */}
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                fontSize: "0.875rem",
                outline: "none"
              }}
            />

            {/* Export */}
            <button
              onClick={exportToCSV}
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
              Export CSV
            </button>

            <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
              {filteredReports.length} reports
            </span>
          </div>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, color: "#64748b" }}>Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, color: "#64748b" }}>No reports found</p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Location</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Media</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report, idx) => (
                  <tr 
                    key={report.id} 
                    style={{ 
                      borderBottom: idx < filteredReports.length - 1 ? "1px solid #f1f5f9" : "none",
                      transition: "all 0.2s",
                      cursor: "pointer"
                    }}
                    onMouseOver={(e) => { 
                      e.currentTarget.style.background = "#f8fafc"; 
                      e.currentTarget.style.transform = "scale(1.01)";
                    }} 
                    onMouseOut={(e) => { 
                      e.currentTarget.style.background = "transparent"; 
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: 6, 
                          background: report.type === "fire" ? "#fef2f2" : report.type === "medical" ? "#eff6ff" : "#fff7ed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem"
                        }}>
                          {report.type === "fire" ? "🔥" : report.type === "medical" ? "🏥" : "🚔"}
                        </div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0f172a", textTransform: "capitalize" }}>
                          {report.type}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        background: report.status === "pending" ? "#fef2f2" : report.status === "responding" ? "#fff7ed" : "#f0fdf4",
                        color: report.status === "pending" ? "#dc2626" : report.status === "responding" ? "#ea580c" : "#16a34a"
                      }}>
                        {report.status || "pending"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "0.875rem", color: "#64748b" }}>
                      {report.latitude?.toFixed(4)}°, {report.longitude?.toFixed(4)}°
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "0.875rem", color: "#64748b" }}>
                      {report.voice_url && <span style={{ marginRight: 8 }}>🎤</span>}
                      {report.media_count > 0 && <span>📸 {report.media_count}</span>}
                      {!report.voice_url && !report.media_count && <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "0.875rem", color: "#64748b" }}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
