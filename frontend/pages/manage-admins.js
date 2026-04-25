import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', role: 'fire' });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    setUser(session.user);
    
    // Check if user is super admin
    const { data: profile, error } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();
    
    if (error || profile.role !== 'super_admin') {
      alert('Access denied: Super admin only');
      router.push('/admin');
      return;
    }
    
    setUserRole(profile.role);
    loadAdmins();
  };

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (e) {
      console.error("Error fetching admins:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call Supabase Edge Function to create admin user
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-service`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newAdmin.email,
            password: newAdmin.password,
            role: newAdmin.role
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin');
      }

      alert('✅ Admin user created successfully!');
      setShowAddModal(false);
      setNewAdmin({ email: '', password: '', role: 'fire' });
      loadAdmins(); // Refresh the list
    } catch (e) {
      console.error('Error creating admin:', e);
      alert('❌ Error: ' + e.message + '\n\nMake sure you have set up the Supabase Edge Function. See SUPABASE_ADMIN_FUNCTION_SETUP.md for instructions.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (adminId, newRole) => {
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({ role: newRole })
        .eq('id', adminId);

      if (error) throw error;
      
      setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, role: newRole } : a));
      setEditingAdmin(null);
      alert('Role updated successfully!');
    } catch (e) {
      alert('Error updating role: ' + e.message);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!confirm(`Are you sure you want to remove ${admin.email}?`)) return;

    try {
      const { error } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;
      
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
      alert('Admin removed successfully!');
    } catch (e) {
      alert('Error removing admin: ' + e.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return { bg: '#f0fdf4', color: '#16a34a', border: '#16a34a' };
      case 'fire': return { bg: '#fef2f2', color: '#dc2626', border: '#dc2626' };
      case 'medical': return { bg: '#eff6ff', color: '#2563eb', border: '#2563eb' };
      case 'crime': return { bg: '#fff7ed', color: '#ea580c', border: '#ea580c' };
      default: return { bg: '#f1f5f9', color: '#64748b', border: '#64748b' };
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
              👥 Admin User Management
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>Manage admin users and roles</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {user && (
              <span style={{ fontSize: "0.875rem", color: "#64748b", marginRight: 8 }}>
                {user.email}
              </span>
            )}
            <a href="/admin" style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", textDecoration: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500 }}>
              Dashboard
            </a>
            <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
        
        {/* Add Admin Button */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}>Admin Users</h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>{admins.length} total admins</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "10px 20px",
              background: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>+</span> Add Admin
          </button>
        </div>

        {/* Admins Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, color: "#64748b" }}>Loading...</p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Email</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Role</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Created</th>
                  <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const roleColors = getRoleBadgeColor(admin.role);
                  
                  return (
                    <tr key={admin.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0f172a" }}>{admin.email}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>ID: {admin.user_id.substring(0, 8)}...</div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        {editingAdmin === admin.id ? (
                          <select
                            value={admin.role}
                            onChange={(e) => handleUpdateRole(admin.id, e.target.value)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              border: "1px solid #e2e8f0",
                              fontSize: "0.875rem",
                              textTransform: "capitalize"
                            }}
                          >
                            <option value="fire">Fire</option>
                            <option value="medical">Medical</option>
                            <option value="crime">Crime</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: 6,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "capitalize",
                            background: roleColors.bg,
                            color: roleColors.color,
                            border: `1px solid ${roleColors.border}`
                          }}>
                            {admin.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "0.875rem", color: "#64748b" }}>
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          {editingAdmin === admin.id ? (
                            <button
                              onClick={() => setEditingAdmin(null)}
                              style={{
                                padding: "6px 12px",
                                background: "#f1f5f9",
                                color: "#64748b",
                                border: "none",
                                borderRadius: 6,
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                cursor: "pointer"
                              }}
                            >
                              Cancel
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingAdmin(admin.id)}
                                style={{
                                  padding: "6px 12px",
                                  background: "#eff6ff",
                                  color: "#2563eb",
                                  border: "1px solid #2563eb",
                                  borderRadius: 6,
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  cursor: "pointer"
                                }}
                              >
                                Edit Role
                              </button>
                              {admin.role !== 'super_admin' && (
                                <button
                                  onClick={() => handleDeleteAdmin(admin)}
                                  style={{
                                    padding: "6px 12px",
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    border: "1px solid #dc2626",
                                    borderRadius: 6,
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    cursor: "pointer"
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Info Box */}
        <div style={{ marginTop: 24, padding: 20, background: "#f0fdf4", border: "1px solid #16a34a", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "0.875rem", fontWeight: 600, color: "#15803d" }}>
            ✅ Direct Admin Creation Enabled
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#15803d", lineHeight: 1.6 }}>
            You can now add admin users directly from this page! Click the "+ Add Admin" button, fill in the details, and the user will be created instantly with the selected role.
          </p>
          <p style={{ margin: "12px 0 0 0", fontSize: "0.75rem", color: "#15803d", fontStyle: "italic" }}>
            Note: Make sure the Supabase Edge Function is deployed. See SUPABASE_ADMIN_FUNCTION_SETUP.md if you encounter errors.
          </p>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
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
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              maxWidth: 500,
              width: "100%",
              padding: 32
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>
              Add New Admin
            </h2>

            <form onSubmit={handleAddAdmin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                  placeholder="admin@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: "0.875rem"
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: "0.875rem"
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                  Role
                </label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    textTransform: "capitalize"
                  }}
                >
                  <option value="fire">Fire</option>
                  <option value="medical">Medical</option>
                  <option value="crime">Crime</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#f1f5f9",
                    color: "#64748b",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#0f172a",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  Add Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
