import { useEffect, useState } from "react";
import axios from "axios";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [sortBy, setSortBy] = useState("date-desc");

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reports`);
      setReports(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setLoading(false);
    }
  };

  const getFilteredReports = () => {
    let filtered = [...reports];

    // Filter by status
    if (filter !== "all") {
      filtered = filtered.filter((r) => r.status === filter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.created_at);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        
        if (fromDate && reportDate < fromDate) return false;
        if (toDate && reportDate > toDate) return false;
        return true;
      });
    }

    // Sort
    if (sortBy === "date-desc") {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "date-asc") {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === "type") {
      filtered.sort((a, b) => a.type.localeCompare(b.type));
    }

    return filtered;
  };

  const exportToCSV = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      alert("No reports to export");
      return;
    }

    // CSV Headers
    const headers = [
      "Report ID",
      "Type",
      "Status",
      "Description",
      "Latitude",
      "Longitude",
      "Accuracy (m)",
      "Has Voice",
      "Media Count",
      "Responder",
      "Created At",
      "Location"
    ];

    // CSV Data
    const rows = filtered.map((report) => [
      report._id,
      report.type,
      report.status || "pending",
      report.description || "",
      report.latitude,
      report.longitude,
      report.accuracy || 0,
      report.voice_url ? "Yes" : "No",
      report.media_count || 0,
      report.responderNumber || "N/A",
      new Date(report.created_at).toLocaleString(),
      `${report.latitude}, ${report.longitude}`
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      alert("No reports to export");
      return;
    }

    const jsonContent = JSON.stringify(filtered, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-reports-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      alert("No reports to export");
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>Emergency Response Reports</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e40af; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #1e40af; color: white; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            .report-section { page-break-inside: avoid; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Emergency Response System - Reports Archive</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Reports:</strong> ${filtered.length}</p>
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Description</th>
                <th>Location</th>
                <th>Date/Time</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map(
                  (report) => `
                <tr>
                  <td>${report._id}</td>
                  <td><strong>${report.type}</strong></td>
                  <td>${report.status || "pending"}</td>
                  <td>${report.description || "N/A"}</td>
                  <td>${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</td>
                  <td>${new Date(report.created_at).toLocaleString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const newWindow = window.open();
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    setTimeout(() => newWindow.print(), 100);
  };

  const filteredReports = getFilteredReports();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)", color: "#e2e8f0", padding: "20px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: "2.5rem", margin: "0 0 10px 0", color: "#60a5fa" }}>
            📋 Reports Archive
          </h1>
          <p style={{ fontSize: "1rem", color: "#cbd5e1", margin: 0 }}>
            Complete accountability record of all emergency reports
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, marginBottom: 30 }}>
          <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "2px solid #3b82f6", textAlign: "center" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#94a3b8" }}>Total Reports</p>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#60a5fa" }}>{reports.length}</p>
          </div>
          <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "2px solid #ef4444", textAlign: "center" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#94a3b8" }}>Pending</p>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{reports.filter((r) => r.status === "pending").length}</p>
          </div>
          <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "2px solid #f59e0b", textAlign: "center" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#94a3b8" }}>Responding</p>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>{reports.filter((r) => r.status === "responding").length}</p>
          </div>
          <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "2px solid #10b981", textAlign: "center" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#94a3b8" }}>Resolved</p>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{reports.filter((r) => r.status === "resolved").length}</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ background: "#1e293b", padding: 25, borderRadius: 12, marginBottom: 30, border: "1px solid #475569" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, marginBottom: 20 }}>
            {/* Status Filter */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: 8, color: "#cbd5e1" }}>
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: "0.95rem",
                }}
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="responding">Responding</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: 8, color: "#cbd5e1" }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: "0.95rem",
                }}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="type">By Type</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: 8, color: "#cbd5e1" }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: "0.95rem",
                }}
              />
            </div>
          </div>

          {/* Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: 8, color: "#cbd5e1" }}>
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: "0.95rem",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: 8, color: "#cbd5e1" }}>
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: "0.95rem",
                }}
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <button
              onClick={exportToCSV}
              style={{
                padding: "12px",
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.background = "#047857")}
              onMouseOut={(e) => (e.target.style.background = "#059669")}
            >
              📊 Export CSV
            </button>
            <button
              onClick={exportToJSON}
              style={{
                padding: "12px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.background = "#2563eb")}
              onMouseOut={(e) => (e.target.style.background = "#3b82f6")}
            >
              📄 Export JSON
            </button>
            <button
              onClick={exportToPDF}
              style={{
                padding: "12px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.background = "#b91c1c")}
              onMouseOut={(e) => (e.target.style.background = "#dc2626")}
            >
              🖨️ Print PDF
            </button>
          </div>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#cbd5e1" }}>
            <p>Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, background: "#1e293b", borderRadius: 12, border: "1px solid #475569", color: "#cbd5e1" }}>
            <p style={{ margin: 0 }}>No reports found</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: "#1e293b", borderRadius: 12, border: "1px solid #475569" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a", borderBottom: "2px solid #475569" }}>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>ID</th>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>Type</th>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>Status</th>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>Description</th>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>Location</th>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>Media</th>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>Responder</th>
                  <th style={{ padding: 15, textAlign: "left", color: "#60a5fa", fontWeight: 700 }}>Date/Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report, idx) => (
                  <tr
                    key={report._id}
                    style={{
                      borderBottom: "1px solid #475569",
                      background: idx % 2 === 0 ? "transparent" : "rgba(51, 65, 85, 0.3)",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)")}
                    onMouseOut={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(51, 65, 85, 0.3)")}
                  >
                    <td style={{ padding: 15, color: "#cbd5e1", fontSize: "0.9rem" }}>{report._id}</td>
                    <td style={{ padding: 15, color: "#e2e8f0", fontWeight: 600 }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: 20,
                        background:
                          report.type === "fire"
                            ? "rgba(239, 68, 68, 0.2)"
                            : report.type === "medical"
                            ? "rgba(59, 130, 246, 0.2)"
                            : "rgba(251, 146, 60, 0.2)",
                        color:
                          report.type === "fire"
                            ? "#ef4444"
                            : report.type === "medical"
                            ? "#3b82f6"
                            : "#fb923c",
                      }}>
                        {report.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 15, color: "#cbd5e1" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: 20,
                        background:
                          report.status === "pending"
                            ? "rgba(239, 68, 68, 0.2)"
                            : report.status === "responding"
                            ? "rgba(251, 146, 60, 0.2)"
                            : "rgba(16, 185, 129, 0.2)",
                        color:
                          report.status === "pending"
                            ? "#ef4444"
                            : report.status === "responding"
                            ? "#fb923c"
                            : "#10b981",
                      }}>
                        {(report.status || "pending").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 15, color: "#cbd5e1", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {report.description || "N/A"}
                    </td>
                    <td style={{ padding: 15, color: "#60a5fa", fontSize: "0.85rem", cursor: "pointer" }}>
                      {report.latitude?.toFixed(4)}°, {report.longitude?.toFixed(4)}°
                    </td>
                    <td style={{ padding: 15, color: "#cbd5e1", textAlign: "center" }}>
                      {report.voice_url && <span style={{ marginRight: 8 }}>🎤</span>}
                      {report.media_count > 0 && <span>📸 {report.media_count}</span>}
                      {!report.voice_url && report.media_count === 0 && <span style={{ color: "#64748b" }}>—</span>}
                    </td>
                    <td style={{ padding: 15, color: "#cbd5e1" }}>
                      {report.responderNumber || "—"}
                    </td>
                    <td style={{ padding: 15, color: "#94a3b8", fontSize: "0.85rem" }}>
                      {new Date(report.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Footer */}
        <div style={{ marginTop: 30, padding: 20, background: "#1e293b", borderRadius: 12, border: "1px solid #475569", textAlign: "center", color: "#cbd5e1" }}>
          <p style={{ margin: 0 }}>
            📌 Showing <strong>{filteredReports.length}</strong> of <strong>{reports.length}</strong> reports
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
