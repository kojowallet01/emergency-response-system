// Activity Logger Helper Functions
import { supabase } from './supabase';

/**
 * Log an admin action to the activity_logs table
 * @param {string} actionType - Type of action (login, status_change, note_add, etc.)
 * @param {string} actionDescription - Human-readable description
 * @param {string} reportId - Optional report ID if action is related to a report
 * @param {object} metadata - Optional additional data
 */
export const logActivity = async (actionType, actionDescription, reportId = null, metadata = null) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No user logged in');
      return;
    }

    // Insert log entry
    const { error } = await supabase
      .from('activity_logs')
      .insert([
        {
          admin_id: user.id,
          admin_email: user.email,
          action_type: actionType,
          action_description: actionDescription,
          report_id: reportId,
          metadata: metadata
        }
      ]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (e) {
    console.error('Error in logActivity:', e);
  }
};

/**
 * Get activity logs with optional filters
 * @param {object} filters - Optional filters (actionType, adminId, reportId, startDate, endDate)
 * @param {number} limit - Number of logs to fetch (default: 50)
 * @param {number} offset - Offset for pagination (default: 0)
 */
export const getActivityLogs = async (filters = {}, limit = 50, offset = 0) => {
  try {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }

    if (filters.reportId) {
      query = query.eq('report_id', filters.reportId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching activity logs:', e);
    return [];
  }
};

/**
 * Get activity logs for a specific report
 * @param {string} reportId - Report ID
 */
export const getReportActivityLogs = async (reportId) => {
  return getActivityLogs({ reportId });
};

/**
 * Format relative time (e.g., "2 minutes ago")
 * @param {string} timestamp - ISO timestamp
 */
export const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return then.toLocaleDateString();
  }
};

/**
 * Get icon for action type
 * @param {string} actionType - Action type
 */
export const getActionIcon = (actionType) => {
  const icons = {
    login: '🔐',
    logout: '🚪',
    status_change: '🔄',
    view_report: '👁️',
    note_add: '💬',
    note_edit: '✏️',
    note_delete: '🗑️',
    admin_add: '➕',
    admin_edit: '✏️',
    admin_delete: '❌'
  };

  return icons[actionType] || '📝';
};

/**
 * Get color for action type
 * @param {string} actionType - Action type
 */
export const getActionColor = (actionType) => {
  const colors = {
    login: '#10b981',      // green
    logout: '#6b7280',     // gray
    status_change: '#3b82f6', // blue
    view_report: '#8b5cf6',   // purple
    note_add: '#10b981',      // green
    note_edit: '#f59e0b',     // yellow
    note_delete: '#ef4444',   // red
    admin_add: '#10b981',     // green
    admin_edit: '#f59e0b',    // yellow
    admin_delete: '#ef4444'   // red
  };

  return colors[actionType] || '#64748b';
};

// Convenience functions for common actions

export const logLogin = () => {
  return logActivity('login', 'Logged in to admin dashboard');
};

export const logLogout = () => {
  return logActivity('logout', 'Logged out from admin dashboard');
};

export const logStatusChange = (reportId, oldStatus, newStatus, reportType) => {
  return logActivity(
    'status_change',
    `Changed status from ${oldStatus} to ${newStatus}`,
    reportId,
    { old_value: oldStatus, new_value: newStatus, report_type: reportType }
  );
};

export const logViewReport = (reportId, reportType) => {
  return logActivity(
    'view_report',
    `Viewed ${reportType} emergency report`,
    reportId,
    { report_type: reportType }
  );
};

export const logNoteAdd = (reportId, noteText) => {
  return logActivity(
    'note_add',
    'Added note to report',
    reportId,
    { note_preview: noteText.substring(0, 50) }
  );
};

export const logNoteEdit = (reportId, noteId) => {
  return logActivity(
    'note_edit',
    'Edited note on report',
    reportId,
    { note_id: noteId }
  );
};

export const logNoteDelete = (reportId, noteId) => {
  return logActivity(
    'note_delete',
    'Deleted note from report',
    reportId,
    { note_id: noteId }
  );
};
