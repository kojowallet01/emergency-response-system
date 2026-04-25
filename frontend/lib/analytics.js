// Analytics and metrics helper functions

export const calculateResponseTime = (report) => {
  if (!report.created_at) return null;
  
  const created = new Date(report.created_at);
  const updated = report.updated_at ? new Date(report.updated_at) : new Date();
  
  const diffMs = updated - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
  return `${diffMins}m`;
};

export const getAverageResponseTime = (reports) => {
  const respondedReports = reports.filter(r => r.status !== 'pending' && r.updated_at);
  
  if (respondedReports.length === 0) return 'N/A';
  
  const totalMinutes = respondedReports.reduce((sum, report) => {
    const created = new Date(report.created_at);
    const updated = new Date(report.updated_at);
    return sum + Math.floor((updated - created) / 60000);
  }, 0);
  
  const avgMinutes = Math.floor(totalMinutes / respondedReports.length);
  const hours = Math.floor(avgMinutes / 60);
  const mins = avgMinutes % 60;
  
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

export const getReportsToday = (reports) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return reports.filter(r => {
    const reportDate = new Date(r.created_at);
    return reportDate >= today;
  }).length;
};

export const getReportsThisWeek = (reports) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  return reports.filter(r => {
    const reportDate = new Date(r.created_at);
    return reportDate >= weekAgo;
  }).length;
};

export const getReportsThisMonth = (reports) => {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  
  return reports.filter(r => {
    const reportDate = new Date(r.created_at);
    return reportDate >= monthAgo;
  }).length;
};

export const getTrendData = (reports, days = 7) => {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const count = reports.filter(r => {
      const reportDate = new Date(r.created_at);
      return reportDate >= date && reportDate < nextDate;
    }).length;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count
    });
  }
  
  return data;
};

export const exportToCSV = (reports) => {
  const headers = ['ID', 'Type', 'Status', 'Latitude', 'Longitude', 'Created At', 'Updated At', 'Description'];
  
  const rows = reports.map(r => [
    r.id,
    r.type,
    r.status,
    r.latitude,
    r.longitude,
    new Date(r.created_at).toLocaleString(),
    r.updated_at ? new Date(r.updated_at).toLocaleString() : '',
    r.description || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `emergency-reports-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
