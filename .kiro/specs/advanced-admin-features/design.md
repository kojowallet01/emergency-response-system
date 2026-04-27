# Design Document: Advanced Admin Features

## Overview

This design document specifies the technical implementation for 8 advanced features to be added to the Ghana Emergency Response System admin dashboard. The features are organized into 3 implementation phases based on complexity and development time:

- **Phase 1 (Quick Wins - 2 hours)**: Auto-Refresh Toggle, Keyboard Shortcuts
- **Phase 2 (Medium - 8 hours)**: Route Optimization, Video/Photo Evidence Management, Real-Time Chat
- **Phase 3 (Advanced - 15+ hours)**: Responder Location Tracking, AI-Powered Emergency Classification

The system currently uses Next.js for the frontend, Supabase for database and real-time functionality, and Google Maps API for location services. The admin dashboard is a 2340-line React component with inline styles, useState hooks for state management, and Supabase realtime subscriptions for live updates.

### Design Goals

1. **Seamless Integration**: All features must integrate cleanly with the existing admin.js component without major refactoring
2. **Performance**: Maintain current dashboard performance with all features enabled
3. **Dark Mode Consistency**: All features must support the existing dark mode implementation
4. **Mobile Responsiveness**: All features must work on mobile devices
5. **Minimal Dependencies**: Leverage existing libraries (Supabase, Google Maps) where possible
6. **Progressive Enhancement**: Features can be enabled/disabled independently

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD (admin.js)                    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Phase 1    │  │   Phase 2    │  │   Phase 3    │          │
│  │              │  │              │  │              │          │
│  │ Auto-Refresh │  │ Route Optim. │  │ Responder    │          │
│  │ Keyboard     │  │ Evidence Mgr │  │ Tracking     │          │
│  │ Shortcuts    │  │ Real-Time    │  │ AI Classify  │          │
│  │              │  │ Chat         │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                      │  │
│  │  ├─ reports (existing)                                    │  │
│  │  ├─ admin_profiles (existing)                             │  │
│  │  ├─ report_notes (existing)                               │  │
│  │  ├─ activity_logs (existing)                              │  │
│  │  ├─ chat_messages (new)                                   │  │
│  │  ├─ responder_locations (new)                             │  │
│  │  ├─ evidence_files (new)                                  │  │
│  │  └─ ai_predictions (new)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Realtime Subscriptions                                   │  │
│  │  ├─ reports-channel (existing)                            │  │
│  │  ├─ chat-channel (new)                                    │  │
│  │  └─ responder-locations-channel (new)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Storage Buckets                                          │  │
│  │  ├─ emergency media (existing)                            │  │
│  │  └─ evidence-files (new)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Google Maps API │  │  OpenAI API      │                    │
│  │  - Directions    │  │  - Classification│                    │
│  │  - Traffic       │  │  - Risk Analysis │                    │
│  │  - Distance      │  │  - Predictions   │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### State Management Strategy

The existing admin.js uses useState hooks for state management. We'll continue this pattern with additional state variables for new features:

```javascript
// Phase 1 State
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
const [autoRefreshInterval, setAutoRefreshInterval] = useState(30000); // 30 seconds
const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);
const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

// Phase 2 State
const [routeData, setRouteData] = useState(null);
const [evidenceFiles, setEvidenceFiles] = useState([]);
const [showEvidenceModal, setShowEvidenceModal] = useState(false);
const [chatMessages, setChatMessages] = useState([]);
const [onlineAdmins, setOnlineAdmins] = useState([]);
const [showChat, setShowChat] = useState(false);

// Phase 3 State
const [responderLocations, setResponderLocations] = useState([]);
const [aiPredictions, setAiPredictions] = useState(null);
const [showResponderMap, setShowResponderMap] = useState(false);
```

### Component Structure

Rather than creating separate components, we'll add feature sections within admin.js to maintain consistency with the existing codebase:

```
admin.js (2340 lines → ~3500 lines)
├─ Existing sections (unchanged)
│  ├─ Authentication & initialization
│  ├─ Report loading & filtering
│  ├─ Notes management
│  ├─ Status updates
│  └─ Analytics
│
└─ New feature sections
   ├─ Auto-refresh logic (useEffect)
   ├─ Keyboard shortcuts (useEffect)
   ├─ Route optimization functions
   ├─ Evidence management functions
   ├─ Chat system functions
   ├─ Responder tracking functions
   └─ AI prediction functions
```

## Components and Interfaces

### Phase 1: Auto-Refresh Toggle

#### Component Integration

Add auto-refresh controls to the existing header section:

```javascript
// Location: Inside the header div, after notifications toggle
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 16px',
  background: darkMode ? colors.dark.card : colors.light.card,
  borderRadius: 8,
  border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`
}}>
  <span style={{
    fontSize: '0.875rem',
    color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary
  }}>
    Auto-refresh
  </span>
  
  <button
    onClick={() => {
      const newEnabled = !autoRefreshEnabled;
      setAutoRefreshEnabled(newEnabled);
      localStorage.setItem('autoRefreshEnabled', newEnabled.toString());
    }}
    style={{
      padding: '4px 8px',
      background: autoRefreshEnabled 
        ? (darkMode ? '#10b981' : '#059669')
        : (darkMode ? '#374151' : '#e5e7eb'),
      color: autoRefreshEnabled ? 'white' : (darkMode ? '#9ca3af' : '#6b7280'),
      border: 'none',
      borderRadius: 6,
      fontSize: '0.75rem',
      fontWeight: 500,
      cursor: 'pointer'
    }}
  >
    {autoRefreshEnabled ? 'ON' : 'OFF'}
  </button>
  
  <select
    value={autoRefreshInterval}
    onChange={(e) => {
      const interval = parseInt(e.target.value);
      setAutoRefreshInterval(interval);
      localStorage.setItem('autoRefreshInterval', interval.toString());
    }}
    disabled={!autoRefreshEnabled}
    style={{
      padding: '4px 8px',
      background: darkMode ? colors.dark.input : colors.light.input,
      color: darkMode ? colors.dark.text : colors.light.text,
      border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`,
      borderRadius: 6,
      fontSize: '0.75rem',
      cursor: autoRefreshEnabled ? 'pointer' : 'not-allowed',
      opacity: autoRefreshEnabled ? 1 : 0.5
    }}
  >
    <option value="10000">10s</option>
    <option value="30000">30s</option>
    <option value="60000">1m</option>
  </select>
  
  {autoRefreshPaused && (
    <span style={{
      fontSize: '0.75rem',
      color: '#f59e0b',
      fontWeight: 500
    }}>
      ⏸ Paused
    </span>
  )}
</div>
```

#### Auto-Refresh Logic

```javascript
// Add after existing useEffect hooks
useEffect(() => {
  // Load preferences from localStorage
  const savedEnabled = localStorage.getItem('autoRefreshEnabled');
  const savedInterval = localStorage.getItem('autoRefreshInterval');
  
  if (savedEnabled !== null) {
    setAutoRefreshEnabled(savedEnabled === 'true');
  }
  if (savedInterval !== null) {
    setAutoRefreshInterval(parseInt(savedInterval));
  }
}, []);

useEffect(() => {
  if (!autoRefreshEnabled || autoRefreshPaused || !userRole) {
    return;
  }

  const intervalId = setInterval(() => {
    loadReports(userRole);
  }, autoRefreshInterval);

  return () => clearInterval(intervalId);
}, [autoRefreshEnabled, autoRefreshInterval, autoRefreshPaused, userRole]);

// Pause auto-refresh when viewing report details
useEffect(() => {
  if (selectedReport) {
    setAutoRefreshPaused(true);
  } else {
    setAutoRefreshPaused(false);
  }
}, [selectedReport]);
```

### Phase 1: Keyboard Shortcuts

#### Keyboard Event Handler

```javascript
// Add after existing useEffect hooks
useEffect(() => {
  const handleKeyPress = (e) => {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable) {
      return;
    }

    switch(e.key.toLowerCase()) {
      case 'd':
        toggleDarkMode();
        break;
      case 'a':
        setShowAnalytics(prev => !prev);
        break;
      case 'r':
        loadReports(userRole);
        break;
      case 'escape':
        setSelectedReport(null);
        setShowAnalytics(false);
        setShowKeyboardHelp(false);
        setShowEvidenceModal(false);
        setShowChat(false);
        break;
      case '?':
        setShowKeyboardHelp(prev => !prev);
        break;
      default:
        break;
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [userRole, darkMode]);
```

#### Keyboard Shortcuts Help Modal

```javascript
// Add modal component after existing modals
{showKeyboardHelp && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <div style={{
      background: darkMode ? colors.dark.card : colors.light.card,
      borderRadius: 16,
      padding: 32,
      maxWidth: 500,
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          color: darkMode ? colors.dark.text : colors.light.text
        }}>
          ⌨️ Keyboard Shortcuts
        </h2>
        <button
          onClick={() => setShowKeyboardHelp(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { key: 'D', action: 'Toggle dark mode' },
          { key: 'A', action: 'Show/hide analytics' },
          { key: 'R', action: 'Refresh reports' },
          { key: 'Esc', action: 'Close modals' },
          { key: '?', action: 'Show this help' }
        ].map(({ key, action }) => (
          <div key={key} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            background: darkMode ? colors.dark.background : colors.light.background,
            borderRadius: 8
          }}>
            <span style={{
              color: darkMode ? colors.dark.text : colors.light.text,
              fontSize: '0.875rem'
            }}>
              {action}
            </span>
            <kbd style={{
              padding: '4px 8px',
              background: darkMode ? colors.dark.card : colors.light.card,
              border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`,
              borderRadius: 4,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: darkMode ? colors.dark.text : colors.light.text
            }}>
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```


### Phase 2: Route Optimization

#### Route Calculation Function

```javascript
// Add to admin.js functions section
const calculateOptimalRoute = async (report) => {
  if (!report || typeof google === 'undefined') {
    return null;
  }

  try {
    const directionsService = new google.maps.DirectionsService();
    
    // Get responder's current location (for now, use a default location)
    // In production, this would come from responder_locations table
    const responderLocation = {
      lat: 5.6037, // Accra default
      lng: -0.1870
    };

    const request = {
      origin: responderLocation,
      destination: { lat: report.latitude, lng: report.longitude },
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      }
    };

    const result = await new Promise((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });

    const route = result.routes[0];
    const leg = route.legs[0];

    return {
      distance: leg.distance.text,
      duration: leg.duration.text,
      durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
      steps: leg.steps.map(step => ({
        instruction: step.instructions,
        distance: step.distance.text,
        duration: step.duration.text
      })),
      polyline: route.overview_polyline
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    return null;
  }
};

// Load route when report is selected
const handleReportSelect = async (report) => {
  setSelectedReport(report);
  loadNotes(report.id);
  loadStatusHistory(report.id);
  
  // Calculate route
  const route = await calculateOptimalRoute(report);
  setRouteData(route);
};
```

#### Route Display UI

```javascript
// Add to report detail modal, after map section
{routeData && (
  <div style={{
    marginTop: 16,
    padding: 16,
    background: darkMode ? colors.dark.background : colors.light.background,
    borderRadius: 12,
    border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`
  }}>
    <h3 style={{
      margin: '0 0 16px 0',
      fontSize: '1rem',
      color: darkMode ? colors.dark.text : colors.light.text,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      🗺️ Optimal Route
    </h3>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 12,
      marginBottom: 16
    }}>
      <div style={{
        padding: 12,
        background: darkMode ? colors.dark.card : colors.light.card,
        borderRadius: 8
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
          marginBottom: 4
        }}>
          Distance
        </div>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: darkMode ? colors.dark.text : colors.light.text
        }}>
          {routeData.distance}
        </div>
      </div>

      <div style={{
        padding: 12,
        background: darkMode ? colors.dark.card : colors.light.card,
        borderRadius: 8
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
          marginBottom: 4
        }}>
          ETA (with traffic)
        </div>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#f59e0b'
        }}>
          {routeData.durationInTraffic}
        </div>
      </div>
    </div>

    <button
      onClick={() => {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${5.6037},${-0.1870}&destination=${selectedReport.latitude},${selectedReport.longitude}&travelmode=driving`;
        window.open(url, '_blank');
      }}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      }}
    >
      🧭 Open in Google Maps
    </button>
  </div>
)}
```

### Phase 2: Video and Photo Evidence Management

#### Evidence Upload Function

```javascript
// Add to admin.js functions section
const uploadEvidence = async (file, reportId, type) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${reportId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('evidence-files')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('evidence-files')
      .getPublicUrl(fileName);

    // Save to database
    const { data: evidenceRecord, error: dbError } = await supabase
      .from('evidence_files')
      .insert([{
        report_id: reportId,
        file_url: publicUrl,
        file_type: type,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: user.id
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    return evidenceRecord;
  } catch (error) {
    console.error('Error uploading evidence:', error);
    throw error;
  }
};

const loadEvidence = async (reportId) => {
  try {
    const { data, error } = await supabase
      .from('evidence_files')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setEvidenceFiles(data || []);
  } catch (error) {
    console.error('Error loading evidence:', error);
    setEvidenceFiles([]);
  }
};
```

#### Evidence Gallery UI

```javascript
// Add button to report detail modal
<button
  onClick={() => {
    loadEvidence(selectedReport.id);
    setShowEvidenceModal(true);
  }}
  style={{
    padding: '8px 16px',
    background: darkMode ? colors.dark.card : colors.light.card,
    color: darkMode ? colors.dark.text : colors.light.text,
    border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`,
    borderRadius: 8,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }}
>
  📸 Evidence ({evidenceFiles.length})
</button>

// Evidence modal
{showEvidenceModal && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001
  }}>
    <div style={{
      background: darkMode ? colors.dark.card : colors.light.card,
      borderRadius: 16,
      padding: 24,
      maxWidth: 900,
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          color: darkMode ? colors.dark.text : colors.light.text
        }}>
          📸 Evidence Files
        </h2>
        <button
          onClick={() => setShowEvidenceModal(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary
          }}
        >
          ×
        </button>
      </div>

      {/* Upload section */}
      <div style={{
        marginBottom: 24,
        padding: 16,
        background: darkMode ? colors.dark.background : colors.light.background,
        borderRadius: 12,
        border: `2px dashed ${darkMode ? colors.dark.border : colors.light.border}`
      }}>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
              const type = file.type.startsWith('image/') ? 'photo' : 'video';
              await uploadEvidence(file, selectedReport.id, type);
            }
            loadEvidence(selectedReport.id);
          }}
          style={{
            width: '100%',
            padding: 12,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Evidence gallery */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16
      }}>
        {evidenceFiles.map((evidence) => (
          <div key={evidence.id} style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            background: darkMode ? colors.dark.background : colors.light.background,
            border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`
          }}>
            {evidence.file_type === 'photo' ? (
              <img
                src={evidence.file_url}
                alt={evidence.file_name}
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover'
                }}
              />
            ) : (
              <video
                src={evidence.file_url}
                controls
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover'
                }}
              />
            )}
            <div style={{
              padding: 8,
              fontSize: '0.75rem',
              color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary
            }}>
              {new Date(evidence.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

### Phase 2: Real-Time Chat System

#### Chat Functions

```javascript
// Add to admin.js functions section
const loadChatMessages = async () => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, admin_profiles!inner(email)')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;
    setChatMessages(data || []);
  } catch (error) {
    console.error('Error loading chat messages:', error);
    setChatMessages([]);
  }
};

const sendChatMessage = async (message) => {
  if (!message.trim()) return;

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        admin_id: user.id,
        message: message.trim()
      }])
      .select()
      .single();

    if (error) throw error;
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message');
  }
};

const loadOnlineAdmins = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('user_id, email, role, last_seen')
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Online in last 5 minutes

    if (error) throw error;
    setOnlineAdmins(data || []);
  } catch (error) {
    console.error('Error loading online admins:', error);
    setOnlineAdmins([]);
  }
};

// Update last_seen timestamp
const updateLastSeen = async () => {
  if (!user) return;
  
  try {
    await supabase
      .from('admin_profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('user_id', user.id);
  } catch (error) {
    console.error('Error updating last seen:', error);
  }
};
```

#### Chat Realtime Subscription

```javascript
// Add to useEffect hooks
useEffect(() => {
  if (!user) return;

  // Subscribe to chat messages
  const chatSubscription = supabase
    .channel('chat-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chat_messages'
    }, (payload) => {
      if (payload.eventType === 'INSERT') {
        setChatMessages(prev => [...prev, payload.new]);
      }
    })
    .subscribe();

  // Update last_seen every minute
  const lastSeenInterval = setInterval(updateLastSeen, 60000);
  updateLastSeen(); // Initial update

  // Load online admins every 30 seconds
  const onlineInterval = setInterval(loadOnlineAdmins, 30000);
  loadOnlineAdmins(); // Initial load

  return () => {
    chatSubscription.unsubscribe();
    clearInterval(lastSeenInterval);
    clearInterval(onlineInterval);
  };
}, [user]);
```

#### Chat UI

```javascript
// Add floating chat button
<button
  onClick={() => {
    setShowChat(prev => !prev);
    if (!showChat) {
      loadChatMessages();
    }
  }}
  style={{
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 999
  }}
>
  💬
</button>

// Chat panel
{showChat && (
  <div style={{
    position: 'fixed',
    bottom: 90,
    right: 24,
    width: 350,
    height: 500,
    background: darkMode ? colors.dark.card : colors.light.card,
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 999
  }}>
    {/* Header */}
    <div style={{
      padding: 16,
      borderBottom: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h3 style={{
          margin: 0,
          fontSize: '1rem',
          color: darkMode ? colors.dark.text : colors.light.text
        }}>
          Team Chat
        </h3>
        <div style={{
          fontSize: '0.75rem',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
          marginTop: 4
        }}>
          {onlineAdmins.length} online
        </div>
      </div>
      <button
        onClick={() => setShowChat(false)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.25rem',
          cursor: 'pointer',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary
        }}
      >
        ×
      </button>
    </div>

    {/* Messages */}
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {chatMessages.map((msg) => (
        <div key={msg.id} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: msg.admin_id === user.id ? 'flex-end' : 'flex-start'
        }}>
          <div style={{
            maxWidth: '80%',
            padding: '8px 12px',
            background: msg.admin_id === user.id 
              ? '#2563eb' 
              : (darkMode ? colors.dark.background : colors.light.background),
            color: msg.admin_id === user.id 
              ? 'white' 
              : (darkMode ? colors.dark.text : colors.light.text),
            borderRadius: 12,
            fontSize: '0.875rem'
          }}>
            {msg.message}
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
            marginTop: 4
          }}>
            {msg.admin_profiles?.email} • {new Date(msg.created_at).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>

    {/* Input */}
    <div style={{
      padding: 16,
      borderTop: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`
    }}>
      <form onSubmit={(e) => {
        e.preventDefault();
        const input = e.target.elements.message;
        sendChatMessage(input.value);
        input.value = '';
      }}>
        <input
          name="message"
          type="text"
          placeholder="Type a message..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: darkMode ? colors.dark.input : colors.light.input,
            color: darkMode ? colors.dark.text : colors.light.text,
            border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`,
            borderRadius: 8,
            fontSize: '0.875rem'
          }}
        />
      </form>
    </div>
  </div>
)}
```


### Phase 3: Responder Location Tracking

#### Responder Location Functions

```javascript
// Add to admin.js functions section
const loadResponderLocations = async (reportId) => {
  try {
    const { data, error } = await supabase
      .from('responder_locations')
      .select('*, admin_profiles!inner(email, role)')
      .eq('report_id', reportId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    setResponderLocations(data || []);
  } catch (error) {
    console.error('Error loading responder locations:', error);
    setResponderLocations([]);
  }
};

const updateResponderLocation = async (reportId, latitude, longitude, status) => {
  if (!user) return;

  try {
    // Check if responder already has a location record for this report
    const { data: existing } = await supabase
      .from('responder_locations')
      .select('id')
      .eq('report_id', reportId)
      .eq('responder_id', user.id)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('responder_locations')
        .update({
          latitude,
          longitude,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert new record
      await supabase
        .from('responder_locations')
        .insert([{
          report_id: reportId,
          responder_id: user.id,
          latitude,
          longitude,
          status
        }]);
    }
  } catch (error) {
    console.error('Error updating responder location:', error);
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance.toFixed(2);
};

const checkGeofence = (responderLat, responderLon, reportLat, reportLon, radiusKm = 0.5) => {
  const distance = calculateDistance(responderLat, responderLon, reportLat, reportLon);
  return parseFloat(distance) <= radiusKm;
};
```

#### Responder Tracking Realtime Subscription

```javascript
// Add to useEffect hooks
useEffect(() => {
  if (!selectedReport) return;

  // Subscribe to responder location updates
  const locationSubscription = supabase
    .channel('responder-locations-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'responder_locations',
      filter: `report_id=eq.${selectedReport.id}`
    }, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setResponderLocations(prev => {
          const index = prev.findIndex(loc => loc.id === payload.new.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = payload.new;
            return updated;
          } else {
            return [...prev, payload.new];
          }
        });

        // Check geofence
        if (checkGeofence(
          payload.new.latitude,
          payload.new.longitude,
          selectedReport.latitude,
          selectedReport.longitude
        )) {
          if (notificationsEnabled) {
            new Notification('Responder Arrived', {
              body: `A responder has arrived at the emergency location`,
              icon: '/icon-192.png'
            });
          }
        }
      }
    })
    .subscribe();

  // Load initial locations
  loadResponderLocations(selectedReport.id);

  return () => {
    locationSubscription.unsubscribe();
  };
}, [selectedReport]);

// Track current user's location when responding
useEffect(() => {
  if (!selectedReport || selectedReport.status !== 'responding') return;

  let watchId;

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateResponderLocation(
          selectedReport.id,
          position.coords.latitude,
          position.coords.longitude,
          'en_route'
        );
      },
      (error) => {
        console.error('Error watching position:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  return () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}, [selectedReport]);
```

#### Responder Map UI

```javascript
// Add to report detail modal
<button
  onClick={() => {
    loadResponderLocations(selectedReport.id);
    setShowResponderMap(true);
  }}
  style={{
    padding: '8px 16px',
    background: darkMode ? colors.dark.card : colors.light.card,
    color: darkMode ? colors.dark.text : colors.light.text,
    border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`,
    borderRadius: 8,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }}
>
  📍 Track Responders ({responderLocations.length})
</button>

// Responder map modal
{showResponderMap && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001
  }}>
    <div style={{
      background: darkMode ? colors.dark.card : colors.light.card,
      borderRadius: 16,
      padding: 24,
      maxWidth: 1000,
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          color: darkMode ? colors.dark.text : colors.light.text
        }}>
          📍 Responder Tracking
        </h2>
        <button
          onClick={() => setShowResponderMap(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary
          }}
        >
          ×
        </button>
      </div>

      {/* Responder list */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {responderLocations.map((location) => {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            selectedReport.latitude,
            selectedReport.longitude
          );

          return (
            <div key={location.id} style={{
              padding: 16,
              background: darkMode ? colors.dark.background : colors.light.background,
              borderRadius: 12,
              border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12
              }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: location.status === 'on_scene' ? '#10b981' : '#f59e0b'
                }} />
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: darkMode ? colors.dark.text : colors.light.text
                }}>
                  {location.admin_profiles?.email}
                </div>
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
                marginBottom: 8
              }}>
                Status: <span style={{
                  textTransform: 'capitalize',
                  fontWeight: 500,
                  color: location.status === 'on_scene' ? '#10b981' : '#f59e0b'
                }}>
                  {location.status.replace('_', ' ')}
                </span>
              </div>

              <div style={{
                fontSize: '0.875rem',
                color: darkMode ? colors.dark.text : colors.light.text,
                fontWeight: 600
              }}>
                {distance} km away
              </div>

              <div style={{
                fontSize: '0.7rem',
                color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
                marginTop: 8
              }}>
                Updated {new Date(location.updated_at).toLocaleTimeString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map showing all responders */}
      <div style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
        <EmergencyMap
          reports={[selectedReport]}
          onMarkerClick={() => {}}
        />
      </div>
    </div>
  </div>
)}
```

### Phase 3: AI-Powered Emergency Classification

#### AI Classification Functions

```javascript
// Add to admin.js functions section
const classifyEmergency = async (report) => {
  try {
    // Call OpenAI API for classification
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency classification AI. Analyze emergency reports and provide: 1) Emergency type (fire/medical/crime), 2) Severity (low/medium/high/critical), 3) Expected response time in minutes, 4) Risk assessment score (0-100), 5) Recommended actions. Respond in JSON format.'
          },
          {
            role: 'user',
            content: `Analyze this emergency report:
Type: ${report.type}
Description: ${report.description || 'No description'}
Location: ${report.latitude}, ${report.longitude}
Time: ${report.created_at}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);

    // Save prediction to database
    const { data: prediction, error } = await supabase
      .from('ai_predictions')
      .insert([{
        report_id: report.id,
        predicted_type: aiResponse.emergency_type,
        severity: aiResponse.severity,
        expected_response_time: aiResponse.expected_response_time,
        risk_score: aiResponse.risk_score,
        recommended_actions: aiResponse.recommended_actions,
        confidence_score: aiResponse.confidence || 0.85
      }])
      .select()
      .single();

    if (error) throw error;

    return prediction;
  } catch (error) {
    console.error('Error classifying emergency:', error);
    return null;
  }
};

const findSimilarReports = async (report) => {
  try {
    // Find reports with similar location (within 1km) and type
    const { data, error } = await supabase
      .rpc('find_nearby_reports', {
        lat: report.latitude,
        lon: report.longitude,
        radius_km: 1,
        report_type: report.type,
        exclude_id: report.id
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error finding similar reports:', error);
    return [];
  }
};

const suggestNearestResponder = async (report) => {
  try {
    // Get all responders of the appropriate type
    const { data: responders, error } = await supabase
      .from('admin_profiles')
      .select('user_id, email, role, last_known_lat, last_known_lon')
      .eq('role', report.type)
      .not('last_known_lat', 'is', null);

    if (error) throw error;

    // Calculate distances and find nearest
    const respondersWithDistance = responders.map(responder => ({
      ...responder,
      distance: calculateDistance(
        responder.last_known_lat,
        responder.last_known_lon,
        report.latitude,
        report.longitude
      )
    }));

    respondersWithDistance.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    return respondersWithDistance[0] || null;
  } catch (error) {
    console.error('Error suggesting responder:', error);
    return null;
  }
};
```

#### AI Predictions UI

```javascript
// Add to report detail modal, after route section
{aiPredictions && (
  <div style={{
    marginTop: 16,
    padding: 16,
    background: darkMode ? colors.dark.background : colors.light.background,
    borderRadius: 12,
    border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`
  }}>
    <h3 style={{
      margin: '0 0 16px 0',
      fontSize: '1rem',
      color: darkMode ? colors.dark.text : colors.light.text,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      🤖 AI Analysis
      <span style={{
        fontSize: '0.7rem',
        padding: '2px 6px',
        background: darkMode ? colors.dark.card : colors.light.card,
        borderRadius: 4,
        fontWeight: 400
      }}>
        {Math.round(aiPredictions.confidence_score * 100)}% confidence
      </span>
    </h3>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 12,
      marginBottom: 16
    }}>
      <div style={{
        padding: 12,
        background: darkMode ? colors.dark.card : colors.light.card,
        borderRadius: 8
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
          marginBottom: 4
        }}>
          Severity
        </div>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: aiPredictions.severity === 'critical' ? '#dc2626' :
                 aiPredictions.severity === 'high' ? '#f59e0b' :
                 aiPredictions.severity === 'medium' ? '#3b82f6' : '#10b981',
          textTransform: 'capitalize'
        }}>
          {aiPredictions.severity}
        </div>
      </div>

      <div style={{
        padding: 12,
        background: darkMode ? colors.dark.card : colors.light.card,
        borderRadius: 8
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
          marginBottom: 4
        }}>
          Risk Score
        </div>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: aiPredictions.risk_score >= 75 ? '#dc2626' :
                 aiPredictions.risk_score >= 50 ? '#f59e0b' : '#10b981'
        }}>
          {aiPredictions.risk_score}/100
        </div>
      </div>

      <div style={{
        padding: 12,
        background: darkMode ? colors.dark.card : colors.light.card,
        borderRadius: 8
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
          marginBottom: 4
        }}>
          Expected Response
        </div>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: darkMode ? colors.dark.text : colors.light.text
        }}>
          {aiPredictions.expected_response_time} min
        </div>
      </div>
    </div>

    {aiPredictions.recommended_actions && (
      <div style={{
        padding: 12,
        background: darkMode ? colors.dark.card : colors.light.card,
        borderRadius: 8
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkMode ? colors.dark.textSecondary : colors.light.textSecondary,
          marginBottom: 8,
          fontWeight: 600
        }}>
          Recommended Actions:
        </div>
        <ul style={{
          margin: 0,
          paddingLeft: 20,
          fontSize: '0.875rem',
          color: darkMode ? colors.dark.text : colors.light.text
        }}>
          {aiPredictions.recommended_actions.split('\n').map((action, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{action}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}

// Button to trigger AI analysis
<button
  onClick={async () => {
    const prediction = await classifyEmergency(selectedReport);
    setAiPredictions(prediction);
  }}
  style={{
    padding: '8px 16px',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }}
>
  🤖 AI Analysis
</button>
```

## Data Models

### New Database Tables

#### chat_messages Table

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Admins can insert messages
CREATE POLICY "Admins can insert messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND admin_id = auth.uid()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

#### responder_locations Table

```sql
CREATE TABLE IF NOT EXISTS responder_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('en_route', 'on_scene', 'returning')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_responder_locations_report_id ON responder_locations(report_id);
CREATE INDEX idx_responder_locations_responder_id ON responder_locations(responder_id);
CREATE INDEX idx_responder_locations_updated_at ON responder_locations(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE responder_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all locations
CREATE POLICY "Admins can view all locations"
  ON responder_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Responders can update their own location
CREATE POLICY "Responders can update own location"
  ON responder_locations
  FOR ALL
  TO authenticated
  USING (responder_id = auth.uid())
  WITH CHECK (responder_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE responder_locations;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_responder_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_responder_locations_updated_at_trigger
  BEFORE UPDATE ON responder_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_responder_locations_updated_at();
```

#### evidence_files Table

```sql
CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_files_report_id ON evidence_files(report_id);
CREATE INDEX idx_evidence_files_created_at ON evidence_files(created_at DESC);

-- Enable Row Level Security
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all evidence
CREATE POLICY "Admins can view all evidence"
  ON evidence_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Admins can upload evidence
CREATE POLICY "Admins can upload evidence"
  ON evidence_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );
```

#### ai_predictions Table

```sql
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  predicted_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  expected_response_time INTEGER NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  recommended_actions TEXT,
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_predictions_report_id ON ai_predictions(report_id);
CREATE INDEX idx_ai_predictions_created_at ON ai_predictions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all predictions
CREATE POLICY "Admins can view all predictions"
  ON ai_predictions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: System can insert predictions
CREATE POLICY "System can insert predictions"
  ON ai_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );
```

### Schema Updates to Existing Tables

#### admin_profiles Table Updates

```sql
-- Add columns for responder tracking
ALTER TABLE admin_profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS last_known_lon DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_last_seen ON admin_profiles(last_seen DESC);
```

### Supabase Storage Buckets

#### evidence-files Bucket

```sql
-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-files', 'evidence-files', true);

-- Policy: Admins can upload to evidence-files
CREATE POLICY "Admins can upload evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'evidence-files' AND
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Admins can view evidence files
CREATE POLICY "Admins can view evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidence-files' AND
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );
```


## Error Handling

### Network Error Handling

All API calls and database operations must include proper error handling:

```javascript
// Example error handling pattern
const performDatabaseOperation = async () => {
  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*');

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Database operation failed:', error);
    
    // Show user-friendly error message
    if (darkMode) {
      // Use dark mode colors for error toast
    }
    
    // Log error for debugging
    logError('database_operation', error.message);
    
    // Return fallback value
    return [];
  }
};
```

### Offline Mode Handling

All features must gracefully handle offline scenarios:

```javascript
// Check online status before operations
if (!online) {
  alert('⚠️ You are offline. This feature requires an internet connection.');
  return;
}

// Queue operations when offline
if (!online) {
  queueOperation({
    type: 'chat_message',
    data: messageData,
    timestamp: Date.now()
  });
  return;
}
```

### Geolocation Error Handling

```javascript
// Handle geolocation errors gracefully
navigator.geolocation.getCurrentPosition(
  (position) => {
    // Success handler
  },
  (error) => {
    let errorMessage = 'Unable to get location';
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
    }
    
    console.error('Geolocation error:', errorMessage);
    alert(errorMessage);
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
);
```

### API Rate Limiting

```javascript
// Implement rate limiting for external APIs
const rateLimiter = {
  openai: {
    lastCall: 0,
    minInterval: 1000 // 1 second between calls
  }
};

const callOpenAI = async (data) => {
  const now = Date.now();
  const timeSinceLastCall = now - rateLimiter.openai.lastCall;
  
  if (timeSinceLastCall < rateLimiter.openai.minInterval) {
    const waitTime = rateLimiter.openai.minInterval - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  rateLimiter.openai.lastCall = Date.now();
  
  // Make API call
  return await fetch('https://api.openai.com/v1/chat/completions', {
    // ... request config
  });
};
```

### File Upload Error Handling

```javascript
const uploadFileWithRetry = async (file, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadEvidence(file, reportId, type);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
};
```

## Testing Strategy

### Unit Testing

**Test Coverage Areas:**
- State management functions
- Data transformation functions
- Distance calculation functions
- Geofence checking logic
- Error handling paths

**Example Unit Tests:**

```javascript
// tests/admin-features.test.js
import { calculateDistance, checkGeofence } from '../pages/admin';

describe('Distance Calculation', () => {
  test('calculates distance between two points correctly', () => {
    const distance = calculateDistance(5.6037, -0.1870, 5.6137, -0.1970);
    expect(parseFloat(distance)).toBeCloseTo(1.35, 1);
  });
});

describe('Geofence Checking', () => {
  test('returns true when within geofence', () => {
    const result = checkGeofence(5.6037, -0.1870, 5.6040, -0.1872, 0.5);
    expect(result).toBe(true);
  });

  test('returns false when outside geofence', () => {
    const result = checkGeofence(5.6037, -0.1870, 5.7037, -0.2870, 0.5);
    expect(result).toBe(false);
  });
});
```

### Integration Testing

**Test Scenarios:**

1. **Auto-Refresh Integration**
   - Enable auto-refresh
   - Verify reports reload at configured interval
   - Pause when viewing report details
   - Resume when closing details

2. **Keyboard Shortcuts Integration**
   - Press 'D' and verify dark mode toggles
   - Press 'A' and verify analytics panel toggles
   - Press 'R' and verify reports refresh
   - Verify shortcuts don't trigger in input fields

3. **Route Optimization Integration**
   - Select report
   - Verify route calculation completes
   - Verify ETA displays correctly
   - Verify Google Maps link opens correctly

4. **Evidence Management Integration**
   - Upload photo evidence
   - Verify file appears in Supabase storage
   - Verify database record created
   - Verify evidence displays in gallery

5. **Chat System Integration**
   - Send message
   - Verify message appears in database
   - Verify real-time delivery to other admins
   - Verify online status updates

6. **Responder Tracking Integration**
   - Update responder location
   - Verify location appears on map
   - Verify distance calculation
   - Verify geofence alert triggers

7. **AI Classification Integration**
   - Trigger AI analysis
   - Verify OpenAI API call
   - Verify prediction saved to database
   - Verify prediction displays correctly

### End-to-End Testing

**Test Flows:**

1. **Complete Emergency Response Flow**
   - New emergency report created
   - Admin receives notification
   - Admin views report details
   - AI analysis triggered
   - Route calculated
   - Responder location tracked
   - Evidence uploaded
   - Status updated to resolved

2. **Multi-Admin Coordination Flow**
   - Multiple admins log in
   - Chat messages exchanged
   - Report assignments coordinated
   - Real-time updates synchronized

### Performance Testing

**Metrics to Monitor:**

- Auto-refresh impact on page load time (target: <100ms overhead)
- Chat message delivery latency (target: <500ms)
- Location update frequency (target: every 10 seconds)
- AI classification response time (target: <5 seconds)
- Evidence upload time (target: <30 seconds for 10MB file)

**Load Testing:**

- Test with 100+ reports in dashboard
- Test with 10+ simultaneous chat users
- Test with 5+ responders being tracked
- Test with 50+ evidence files in gallery

### Browser Compatibility Testing

**Target Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

**Features to Test:**
- Geolocation API support
- Notification API support
- File upload support
- WebSocket connections
- LocalStorage persistence

### Mobile Responsiveness Testing

**Breakpoints to Test:**
- 320px (small mobile)
- 375px (medium mobile)
- 640px (large mobile)
- 768px (tablet)
- 1024px (desktop)

**Features to Test:**
- Touch gestures on maps
- Mobile keyboard shortcuts (alternative UI)
- File upload from camera
- Chat interface on small screens
- Evidence gallery on mobile

## Implementation Approach

### Phase 1 Implementation (2 hours)

**Step 1: Auto-Refresh Toggle (1 hour)**

1. Add state variables for auto-refresh
2. Add UI controls to header
3. Implement useEffect for interval-based refresh
4. Add localStorage persistence
5. Implement pause on report view
6. Test across different intervals

**Step 2: Keyboard Shortcuts (1 hour)**

1. Add keyboard event listener
2. Implement shortcut handlers
3. Add input field detection
4. Create help modal UI
5. Add visual indicators
6. Test all shortcuts

### Phase 2 Implementation (8 hours)

**Step 1: Route Optimization (2.5 hours)**

1. Integrate Google Maps Directions API
2. Implement route calculation function
3. Add route display UI to report modal
4. Add traffic data display
5. Implement Google Maps link
6. Test with various locations

**Step 2: Evidence Management (3 hours)**

1. Create evidence_files table in Supabase
2. Create evidence-files storage bucket
3. Implement upload function
4. Create evidence gallery UI
5. Add photo/video preview
6. Implement file deletion
7. Test upload and display

**Step 3: Real-Time Chat (2.5 hours)**

1. Create chat_messages table
2. Implement chat functions
3. Set up realtime subscription
4. Create chat UI (floating panel)
5. Implement online status tracking
6. Add last_seen updates
7. Test multi-user chat

### Phase 3 Implementation (15+ hours)

**Step 1: Responder Tracking (6 hours)**

1. Create responder_locations table
2. Implement location tracking functions
3. Set up geolocation watching
4. Create responder map UI
5. Implement distance calculations
6. Add geofence alerts
7. Set up realtime subscriptions
8. Test location updates and alerts

**Step 2: AI Classification (9 hours)**

1. Create ai_predictions table
2. Set up OpenAI API integration
3. Implement classification function
4. Create prediction display UI
5. Implement similar reports detection
6. Add nearest responder suggestion
7. Implement confidence scoring
8. Add learning from corrections
9. Test AI predictions and accuracy

### Development Best Practices

**Code Organization:**
- Keep all feature code in admin.js for consistency
- Use clear function names (e.g., `loadChatMessages`, `calculateOptimalRoute`)
- Add comments for complex logic
- Group related functions together

**State Management:**
- Use descriptive state variable names
- Initialize with appropriate default values
- Update state immutably
- Clean up subscriptions in useEffect cleanup

**Performance Optimization:**
- Debounce frequent operations (location updates, chat typing)
- Lazy load heavy components (maps, evidence gallery)
- Implement pagination for large datasets
- Cache API responses where appropriate

**Security Considerations:**
- Validate all user inputs
- Use RLS policies for database access
- Store API keys in environment variables
- Sanitize file uploads
- Implement rate limiting for expensive operations

### Deployment Checklist

**Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
```

**Database Setup:**
1. Run all SQL scripts for new tables
2. Create storage buckets
3. Enable realtime for new tables
4. Verify RLS policies
5. Create indexes for performance

**Testing:**
1. Test all features in development
2. Test on multiple devices
3. Test with multiple users
4. Verify performance metrics
5. Check error handling

**Documentation:**
1. Update user guide with new features
2. Document keyboard shortcuts
3. Create admin training materials
4. Update API documentation

## Mobile Responsiveness

### Responsive Breakpoints

```javascript
const breakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024
};

// Media query helper
const isMobile = () => window.innerWidth < breakpoints.mobile;
const isTablet = () => window.innerWidth >= breakpoints.mobile && window.innerWidth < breakpoints.desktop;
const isDesktop = () => window.innerWidth >= breakpoints.desktop;
```

### Mobile-Specific Adaptations

**Auto-Refresh Controls:**
- Stack vertically on mobile
- Larger touch targets (min 44px)
- Simplified interval selector

**Keyboard Shortcuts:**
- Replace with mobile-friendly button bar
- Show shortcuts help as bottom sheet
- Use touch gestures where applicable

**Route Optimization:**
- Full-width map on mobile
- Collapsible route details
- Prominent "Open in Maps" button

**Evidence Gallery:**
- Single column on mobile
- Swipeable gallery
- Full-screen preview on tap

**Chat System:**
- Full-screen on mobile
- Slide-up animation
- Larger input area

**Responder Tracking:**
- Full-screen map on mobile
- Bottom sheet for responder list
- Simplified distance display

### Touch Gesture Support

```javascript
// Swipe to close modals
let touchStartX = 0;
let touchEndX = 0;

const handleTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX;
};

const handleTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
};

const handleSwipe = () => {
  if (touchEndX < touchStartX - 50) {
    // Swipe left
  }
  if (touchEndX > touchStartX + 50) {
    // Swipe right - close modal
    setSelectedReport(null);
  }
};
```

## Dark Mode Support

All new features use the existing dark mode color scheme:

```javascript
const colors = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    input: '#ffffff'
  },
  dark: {
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    input: '#1e293b'
  }
};

// Usage in components
style={{
  background: darkMode ? colors.dark.card : colors.light.card,
  color: darkMode ? colors.dark.text : colors.light.text,
  border: `1px solid ${darkMode ? colors.dark.border : colors.light.border}`
}}
```

### Dark Mode for External Components

**Google Maps:**
```javascript
const mapStyles = darkMode ? [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  // ... more dark mode styles
] : [];
```

**Evidence Gallery:**
- Dark background for image containers
- Dark overlay for video controls
- Light text on dark backgrounds

**Chat System:**
- Dark message bubbles
- Dark input fields
- Subtle borders in dark mode

## Integration with Existing Features

### Compatibility Matrix

| New Feature | Existing Feature | Integration Point | Notes |
|------------|------------------|-------------------|-------|
| Auto-Refresh | Realtime Subscriptions | Complementary | Auto-refresh provides fallback when realtime fails |
| Keyboard Shortcuts | All UI Actions | Direct integration | Shortcuts trigger existing functions |
| Route Optimization | Google Maps | Uses existing API | Extends current map functionality |
| Evidence Management | Supabase Storage | Uses existing config | New bucket alongside emergency media |
| Chat System | Admin Profiles | Uses existing auth | Leverages current user system |
| Responder Tracking | Google Maps | Uses existing API | Adds markers to existing map |
| AI Classification | Reports System | Enhances reports | Adds metadata to existing reports |

### Non-Breaking Changes

All features are designed to be additive:
- No modifications to existing database tables (only additions)
- No changes to existing API endpoints
- No modifications to existing components
- All new features can be disabled independently

### Feature Flags

```javascript
const featureFlags = {
  autoRefresh: true,
  keyboardShortcuts: true,
  routeOptimization: true,
  evidenceManagement: true,
  chatSystem: true,
  responderTracking: true,
  aiClassification: false // Requires OpenAI API key
};

// Usage
{featureFlags.chatSystem && (
  <ChatButton />
)}
```

## Performance Considerations

### Optimization Strategies

**1. Lazy Loading:**
```javascript
// Load heavy components only when needed
const EvidenceGallery = dynamic(() => import('../components/EvidenceGallery'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});
```

**2. Debouncing:**
```javascript
// Debounce location updates
const debouncedLocationUpdate = debounce((lat, lon) => {
  updateResponderLocation(reportId, lat, lon, status);
}, 5000); // Update every 5 seconds max
```

**3. Memoization:**
```javascript
// Memoize expensive calculations
const memoizedDistance = useMemo(() => {
  return calculateDistance(lat1, lon1, lat2, lon2);
}, [lat1, lon1, lat2, lon2]);
```

**4. Pagination:**
```javascript
// Paginate chat messages
const MESSAGES_PER_PAGE = 50;
const loadMoreMessages = async (offset) => {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + MESSAGES_PER_PAGE - 1);
  
  return data;
};
```

### Bundle Size Impact

Estimated bundle size increases:
- Phase 1: +5KB (minimal JavaScript)
- Phase 2: +25KB (chat UI, evidence gallery)
- Phase 3: +40KB (AI integration, tracking logic)
- Total: ~70KB additional JavaScript

### Database Query Optimization

**Indexes:**
- All foreign keys indexed
- Timestamp columns indexed for sorting
- Composite indexes for common queries

**Query Patterns:**
```javascript
// Efficient: Use select with specific columns
const { data } = await supabase
  .from('chat_messages')
  .select('id, message, created_at, admin_profiles(email)')
  .limit(50);

// Inefficient: Select all columns when not needed
const { data } = await supabase
  .from('chat_messages')
  .select('*');
```

## Security Considerations

### Authentication & Authorization

All features require authentication:
```javascript
// Check authentication before any operation
if (!user) {
  router.push('/login');
  return;
}

// Check admin role
const { data: profile } = await supabase
  .from('admin_profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (!profile) {
  alert('Access denied');
  return;
}
```

### Row Level Security (RLS)

All new tables have RLS enabled:
- Users can only access data they're authorized for
- Admin role checked in all policies
- User ID verified against auth.uid()

### Input Validation

```javascript
// Validate chat messages
const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return false;
  }
  if (message.trim().length === 0) {
    return false;
  }
  if (message.length > 1000) {
    return false;
  }
  return true;
};

// Validate file uploads
const validateFile = (file) => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  return true;
};
```

### API Key Security

```javascript
// Never expose API keys in client code
// Use environment variables
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

// For sensitive operations, use server-side API routes
// pages/api/classify.js
export default async function handler(req, res) {
  // API key only accessible server-side
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Make API call
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  return res.json(await response.json());
}
```

### XSS Prevention

```javascript
// Sanitize user input before display
import DOMPurify from 'dompurify';

const sanitizedMessage = DOMPurify.sanitize(userMessage);
```

## Conclusion

This design document provides a comprehensive technical specification for implementing 8 advanced features across 3 phases for the Ghana Emergency Response System admin dashboard. The design maintains consistency with the existing codebase while adding powerful new capabilities for emergency response coordination.

### Key Design Principles

1. **Seamless Integration**: All features integrate cleanly with existing admin.js component
2. **Progressive Enhancement**: Features can be enabled independently
3. **Performance First**: Optimizations built in from the start
4. **Mobile Ready**: Responsive design for all screen sizes
5. **Dark Mode Native**: Full dark mode support for all features
6. **Security Focused**: RLS policies and input validation throughout

### Implementation Timeline

- **Phase 1**: 2 hours (Auto-Refresh, Keyboard Shortcuts)
- **Phase 2**: 8 hours (Route Optimization, Evidence Management, Chat)
- **Phase 3**: 15+ hours (Responder Tracking, AI Classification)
- **Total**: ~25 hours of development time

### Success Metrics

- All features functional on desktop and mobile
- Performance impact <100ms on page load
- 100% dark mode compatibility
- Zero breaking changes to existing features
- Full test coverage for critical paths

