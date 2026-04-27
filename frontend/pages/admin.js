import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";
import { requestNotificationPermission, notifyNewEmergency } from "../lib/notifications";
import { getAverageResponseTime, getReportsToday, getReportsThisWeek, getTrendData, exportToCSV, getBusiestHours, getReportsByType, getReportsByStatus, getResponseTimeByType, getBusiestDayOfWeek, formatMinutes } from "../lib/analytics";
import { logLogin, logStatusChange, logViewReport, logNoteAdd, logNoteEdit, logNoteDelete } from "../lib/activityLogger";
import { findNearbyFacilities, formatDistance, getDirectionsUrl, getFacilityConfig } from "../lib/nearbyFacilities";
import { isOnline, getOfflineQueue, setupOfflineListeners, registerServiceWorker, syncQueuedItems, getOfflineStatusMessage, cacheOfflineData, getCachedOfflineData } from "../lib/offline";
import { sendTestSMS, sendEmergencyAlert, sendStatusChangeAlert, getSMSSettings, saveSMSSettings, formatPhoneDisplay } from "../lib/sms";
import dynamic from 'next/dynamic';
import GroupChat from '../components/GroupChat';

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
  const [statusHistory, setStatusHistory] = useState([]);
  const [nearbyFacilities, setNearbyFacilities] = useState({ hospitals: [], fireStations: [], policeStations: [] });
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [showFacilities, setShowFacilities] = useState(false);
  const [online, setOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [showSMSSettings, setShowSMSSettings] = useState(false);
  const [smsSettings, setSmsSettings] = useState({ enabled: false, phoneNumbers: [], notifyOnNew: true, notifyOnStatusChange: true });
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  
  // Auto-Refresh state variables
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30000); // 30 seconds default
  const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);
  
  // Keyboard Shortcuts state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Route Optimization state
  const [routeData, setRouteData] = useState(null);
  
  // Evidence Management state
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  
  // Real-Time Chat state (online admins tracking)
  const [onlineAdmins, setOnlineAdmins] = useState([]);
  
  // Responder Location Tracking state
  const [responderLocations, setResponderLocations] = useState([]);
  const [showResponderTracking, setShowResponderTracking] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  
  const notificationsEnabledRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Load SMS settings
    const savedSMSSettings = getSMSSettings();
    setSmsSettings(savedSMSSettings);
    
    // Load auto-refresh preferences from localStorage
    const savedAutoRefreshEnabled = localStorage.getItem('autoRefreshEnabled');
    const savedAutoRefreshInterval = localStorage.getItem('autoRefreshInterval');
    
    if (savedAutoRefreshEnabled !== null) {
      setAutoRefreshEnabled(savedAutoRefreshEnabled === 'true');
    }
    if (savedAutoRefreshInterval !== null) {
      setAutoRefreshInterval(parseInt(savedAutoRefreshInterval));
    }
  }, []);

  useEffect(() => {
    // Initialize offline mode
    setOnline(isOnline());
    setOfflineQueue(getOfflineQueue());

    // Register service worker
    registerServiceWorker();

    // Setup online/offline listeners
    const cleanup = setupOfflineListeners(
      () => {
        setOnline(true);
        // Attempt to sync queued items when coming back online
        syncQueuedItems(async (data) => {
          // Sync logic here - could be status changes, notes, etc.
          console.log('Syncing queued item:', data);
        }).then(result => {
          if (result.synced > 0) {
            alert(`✅ Synced ${result.synced} queued item(s)`);
            setOfflineQueue(getOfflineQueue());
            loadReports(userRole);
          }
        });
      },
      () => {
        setOnline(false);
        alert('⚠️ You are now offline. Changes will be queued for sync.');
      }
    );

    // Listen for sync success events from service worker
    const handleSyncSuccess = () => {
      setOfflineQueue(getOfflineQueue());
      loadReports(userRole);
    };
    window.addEventListener('sync-success', handleSyncSuccess);

    return () => {
      cleanup();
      window.removeEventListener('sync-success', handleSyncSuccess);
    };
  }, [userRole]);

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

      // Log successful login
      logLogin();

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

  // Auto-refresh logic
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

  // Keyboard shortcuts handler
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
          if (userRole) {
            loadReports(userRole);
          }
          break;
        case 'escape':
          setSelectedReport(null);
          setShowAnalytics(false);
          setShowKeyboardHelp(false);
          setShowSMSSettings(false);
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

  // Online status tracking
  useEffect(() => {
    if (!user) return;

    // Update last_seen every 10 seconds (for real-time status)
    const lastSeenInterval = setInterval(updateLastSeen, 10000);
    updateLastSeen(); // Initial update

    // Load online admins every 30 seconds
    const onlineInterval = setInterval(loadOnlineAdmins, 30000);
    loadOnlineAdmins(); // Initial load

    return () => {
      clearInterval(lastSeenInterval);
      clearInterval(onlineInterval);
    };
  }, [user]);

  // Responder location tracking subscription
  useEffect(() => {
    if (!selectedReport || !showResponderTracking) return;

    // Load initial responder locations
    loadResponderLocations(selectedReport.id);

    // Subscribe to realtime updates
    const locationSubscription = supabase
      .channel(`responder-locations-${selectedReport.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'responder_locations',
        filter: `report_id=eq.${selectedReport.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newLocation = payload.new;
          
          // Calculate distance
          const distance = calculateDistance(
            newLocation.latitude,
            newLocation.longitude,
            selectedReport.latitude,
            selectedReport.longitude
          );

          const locationWithDistance = { ...newLocation, distance };

          // Update state
          setResponderLocations(prev => {
            const existing = prev.find(loc => 
              loc.report_id === newLocation.report_id && 
              loc.admin_id === newLocation.admin_id
            );

            if (existing) {
              return prev.map(loc => 
                loc.report_id === newLocation.report_id && loc.admin_id === newLocation.admin_id
                  ? locationWithDistance
                  : loc
              );
            } else {
              return [...prev, locationWithDistance];
            }
          });

          // Check if responder arrived (geofence alert)
          if (newLocation.status === 'on_scene' && notificationsEnabledRef.current) {
            new Notification('Responder Arrived', {
              body: `A responder has arrived at the emergency location`,
              icon: '/icon-192x192.png'
            });
          }
        }
      })
      .subscribe();

    return () => {
      locationSubscription.unsubscribe();
    };
  }, [selectedReport, showResponderTracking]);

  // Geolocation tracking for current user
  useEffect(() => {
    let watchId = null;

    // Start tracking when user is responding to a report
    if (selectedReport && selectedReport.status === 'responding') {
      watchId = startLocationTracking(selectedReport.id);
    }

    // Stop tracking when report is closed or status changes
    return () => {
      if (watchId) {
        stopLocationTracking(watchId);
      }
    };
  }, [selectedReport?.id, selectedReport?.status]);

  // Load online admins function
  const loadOnlineAdmins = async () => {
    try {
      const { data, error} = await supabase
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
      
      // Log report view
      const report = reports.find(r => r.id === reportId);
      if (report) {
        logViewReport(reportId, report.type);
      }
    } catch (e) {
      console.error('Error loading notes:', e);
      setNotes([]);
    }
  };

  // Load status history for selected report
  const loadStatusHistory = async (reportId) => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('report_id', reportId)
        .eq('action_type', 'status_change')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (e) {
      console.error('Error loading status history:', e);
      setStatusHistory([]);
    }
  };

  // Load nearby facilities
  const loadNearbyFacilities = async (latitude, longitude) => {
    if (typeof google === 'undefined' || !google.maps) {
      console.error('Google Maps not loaded');
      return;
    }

    setLoadingFacilities(true);
    setShowFacilities(true);

    try {
      const [hospitals, fireStations, policeStations] = await Promise.all([
        findNearbyFacilities(latitude, longitude, 'hospital'),
        findNearbyFacilities(latitude, longitude, 'fire_station'),
        findNearbyFacilities(latitude, longitude, 'police')
      ]);

      setNearbyFacilities({
        hospitals: hospitals || [],
        fireStations: fireStations || [],
        policeStations: policeStations || []
      });
    } catch (error) {
      console.error('Error loading nearby facilities:', error);
      setNearbyFacilities({ hospitals: [], fireStations: [], policeStations: [] });
    } finally {
      setLoadingFacilities(false);
    }
  };

  // Calculate optimal route using Google Maps Directions API
  const calculateOptimalRoute = async (report) => {
    if (!report || typeof google === 'undefined') {
      return null;
    }

    try {
      const directionsService = new google.maps.DirectionsService();
      
      // Get responder's current location (default to Accra for now)
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

  // Upload evidence file to Supabase storage
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

  // Load evidence files for a report
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

  // Update last_seen timestamp
  const updateLastSeen = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error updating last seen:', error);
      } else {
        console.log('Last seen updated:', new Date().toISOString());
      }
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  };

  // Responder Location Tracking Functions
  
  // Calculate distance between two coordinates using Haversine formula (in km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Check if responder is within geofence radius (0.5km)
  const checkGeofence = (responderLat, responderLon, emergencyLat, emergencyLon) => {
    const distance = calculateDistance(responderLat, responderLon, emergencyLat, emergencyLon);
    return distance <= 0.5; // 0.5km radius
  };

  // Load responder locations for a report
  const loadResponderLocations = async (reportId) => {
    try {
      const { data, error } = await supabase
        .from('responder_locations')
        .select(`
          *,
          responder:responders(responder_id, name, type, phone_number, status)
        `)
        .eq('report_id', reportId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Calculate distances for each responder
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const locationsWithDistance = (data || []).map(loc => ({
          ...loc,
          distance: calculateDistance(
            loc.latitude,
            loc.longitude,
            report.latitude,
            report.longitude
          )
        }));
        setResponderLocations(locationsWithDistance);
      } else {
        setResponderLocations(data || []);
      }
    } catch (error) {
      console.error('Error loading responder locations:', error);
      setResponderLocations([]);
    }
  };

  // Update responder location
  const updateResponderLocation = async (reportId, latitude, longitude, status = 'en_route') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('responder_locations')
        .upsert([{
          report_id: reportId,
          admin_id: user.id,
          latitude,
          longitude,
          status,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'report_id,admin_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Check if responder has arrived (within geofence)
      const report = reports.find(r => r.id === reportId);
      if (report && checkGeofence(latitude, longitude, report.latitude, report.longitude)) {
        // Update status to on_scene
        await supabase
          .from('responder_locations')
          .update({ status: 'on_scene' })
          .eq('report_id', reportId)
          .eq('admin_id', user.id);

        // Show notification
        if (notificationsEnabledRef.current) {
          new Notification('Arrived at Emergency', {
            body: 'You have arrived at the emergency location',
            icon: '/icon-192x192.png'
          });
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating responder location:', error);
      throw error;
    }
  };

  // Start tracking current user's location
  const startLocationTracking = (reportId) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setTrackingEnabled(true);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition({ latitude, longitude });

        // Update location in database
        try {
          await updateResponderLocation(reportId, latitude, longitude);
        } catch (error) {
          console.error('Failed to update location:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to get your location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        alert(errorMessage);
        setTrackingEnabled(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased to 30 seconds
        maximumAge: 0
      }
    );

    // Store watchId to stop tracking later
    return watchId;
  };

  // Stop tracking location
  const stopLocationTracking = (watchId) => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    setTrackingEnabled(false);
    setCurrentPosition(null);
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
      
      // Log note addition
      logNoteAdd(reportId, newNote.trim());
      
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
      
      // Log note edit
      if (selectedReport) {
        logNoteEdit(selectedReport.id, noteId);
      }
      
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
      
      // Log note deletion
      if (selectedReport) {
        logNoteDelete(selectedReport.id, noteId);
      }
    } catch (e) {
      console.error('Error deleting note:', e);
      alert('Failed to delete note');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      // Get current report to log old status
      const currentReport = reports.find(r => r.id === id);
      const oldStatus = currentReport?.status;

      const { error } = await supabase
        .from('reports')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));

      // Log status change
      if (currentReport) {
        logStatusChange(id, oldStatus, status, currentReport.type);
      }
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
            
            {/* SMS Settings Button */}
            <button
              onClick={() => setShowSMSSettings(true)}
              style={{
                padding: "8px 16px",
                background: smsSettings.enabled ? "#dcfce7" : colors.buttonBg,
                color: smsSettings.enabled ? "#16a34a" : colors.buttonText,
                border: smsSettings.enabled ? "1px solid #16a34a" : `1px solid ${colors.border}`,
                borderRadius: 6,
                fontSize: "0.875rem",
                fontWeight: 500,
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
              <span>📱</span>
              SMS {smsSettings.enabled ? 'ON' : 'OFF'}
              {smsSettings.enabled && smsSettings.phoneNumbers.length > 0 && (
                <span style={{ 
                  background: "#16a34a", 
                  color: "white", 
                  padding: "2px 6px", 
                  borderRadius: 10, 
                  fontSize: "0.7rem",
                  fontWeight: 600
                }}>
                  {smsSettings.phoneNumbers.length}
                </span>
              )}
            </button>
            
            {/* Auto-Refresh Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: darkMode ? colors.cardBg : colors.statBg,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              transition: "all 0.3s"
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: colors.textSecondary,
                fontWeight: 500,
                transition: "color 0.3s"
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
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: "all 0.2s"
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
                  background: darkMode ? colors.cardBg : colors.statBg,
                  color: darkMode ? colors.text : colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  cursor: autoRefreshEnabled ? 'pointer' : 'not-allowed',
                  opacity: autoRefreshEnabled ? 1 : 0.5,
                  transition: "all 0.3s"
                }}
              >
                <option value="10000">10s</option>
                <option value="30000">30s</option>
                <option value="60000">1m</option>
              </select>
              
              {autoRefreshPaused && (
                <span style={{
                  fontSize: '0.7rem',
                  color: '#f59e0b',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <span>⏸</span> Paused
                </span>
              )}
            </div>
            
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
            
            {/* Offline Indicator */}
            {!online && (
              <div style={{ 
                padding: "8px 16px", 
                background: "#fef2f2", 
                color: "#dc2626", 
                borderRadius: 6, 
                fontSize: "0.875rem", 
                fontWeight: 500,
                border: "1px solid #dc2626",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <span style={{ fontSize: "1rem" }}>📴</span>
                Offline
                {offlineQueue.length > 0 && (
                  <span style={{ 
                    background: "#dc2626", 
                    color: "white", 
                    padding: "2px 6px", 
                    borderRadius: 10, 
                    fontSize: "0.7rem",
                    fontWeight: 600
                  }}>
                    {offlineQueue.length}
                  </span>
                )}
              </div>
            )}
            
            {online && offlineQueue.length > 0 && (
              <div style={{ 
                padding: "8px 16px", 
                background: "#fef3c7", 
                color: "#d97706", 
                borderRadius: 6, 
                fontSize: "0.875rem", 
                fontWeight: 500,
                border: "1px solid #d97706",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <span style={{ fontSize: "1rem" }}>⏳</span>
                Syncing {offlineQueue.length}...
              </div>
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
            <h3 style={{ margin: "0 0 20px 0", fontSize: "1.25rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
              📊 Statistics Dashboard
            </h3>
            
            {/* Quick Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              {/* Today */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>Today</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>{getReportsToday(reports)}</div>
                <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>reports</div>
              </div>
              
              {/* This Week */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>This Week</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: colors.text, transition: "color 0.3s" }}>{getReportsThisWeek(reports)}</div>
                <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>reports</div>
              </div>
              
              {/* Avg Response Time */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>Avg Response</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#3b82f6", transition: "color 0.3s" }}>{getAverageResponseTime(reports)}</div>
                <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>time to respond</div>
              </div>
              
              {/* Resolution Rate */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>Resolution Rate</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", transition: "color 0.3s" }}>
                  {reports.length > 0 ? Math.round((resolved / reports.length) * 100) : 0}%
                </div>
                <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>{resolved} of {reports.length}</div>
              </div>
            </div>

            {/* Reports by Type and Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* By Type */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                  Reports by Type
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {getReportsByType(reports).map(item => (
                    <div key={item.type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                        <span style={{ fontSize: "0.875rem", color: colors.text, transition: "color 0.3s" }}>{item.type}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ 
                          width: 100, 
                          height: 8, 
                          background: darkMode ? "#1e293b" : "#e2e8f0", 
                          borderRadius: 4, 
                          overflow: "hidden",
                          transition: "background 0.3s"
                        }}>
                          <div style={{ 
                            width: `${reports.length > 0 ? (item.count / reports.length) * 100 : 0}%`, 
                            height: "100%", 
                            background: item.color,
                            transition: "width 0.3s"
                          }} />
                        </div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, minWidth: 30, textAlign: "right", transition: "color 0.3s" }}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Status */}
              <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                  Reports by Status
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {getReportsByStatus(reports).map(item => (
                    <div key={item.status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                        <span style={{ fontSize: "0.875rem", color: colors.text, transition: "color 0.3s" }}>{item.status}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ 
                          width: 100, 
                          height: 8, 
                          background: darkMode ? "#1e293b" : "#e2e8f0", 
                          borderRadius: 4, 
                          overflow: "hidden",
                          transition: "background 0.3s"
                        }}>
                          <div style={{ 
                            width: `${reports.length > 0 ? (item.count / reports.length) * 100 : 0}%`, 
                            height: "100%", 
                            background: item.color,
                            transition: "width 0.3s"
                          }} />
                        </div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, minWidth: 30, textAlign: "right", transition: "color 0.3s" }}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Response Time by Type */}
            <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, marginBottom: 24, transition: "all 0.3s" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                Average Response Time by Type
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {getResponseTimeByType(reports).map(item => (
                  <div key={item.type} style={{ 
                    padding: 12, 
                    background: darkMode ? "#1e293b" : "white", 
                    borderRadius: 6, 
                    border: `2px solid ${item.color}`,
                    textAlign: "center",
                    transition: "all 0.3s"
                  }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{item.icon}</div>
                    <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>{item.type}</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: item.color }}>
                      {formatMinutes(item.avgMinutes)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-Day Trend */}
            <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, marginBottom: 24, transition: "all 0.3s" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                7-Day Trend
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                {getTrendData(reports, 7).map((day, idx) => {
                  const maxCount = Math.max(...getTrendData(reports, 7).map(d => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>{day.count}</div>
                      <div
                        style={{
                          width: "100%",
                          height: `${height}%`,
                          background: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                          borderRadius: "6px 6px 0 0",
                          minHeight: day.count > 0 ? 24 : 4,
                          transition: "height 0.3s"
                        }}
                      ></div>
                      <div style={{ fontSize: "0.7rem", color: colors.textSecondary, textAlign: "center", transition: "color 0.3s" }}>{day.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Busiest Hours */}
            <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, marginBottom: 24, transition: "all 0.3s" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                Busiest Hours of the Day
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100, overflowX: "auto" }}>
                {getBusiestHours(reports).map((hour, idx) => {
                  const maxCount = Math.max(...getBusiestHours(reports).map(h => h.count), 1);
                  const height = (hour.count / maxCount) * 100;
                  
                  return (
                    <div key={idx} style={{ flex: "0 0 auto", width: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      {hour.count > 0 && (
                        <div style={{ fontSize: "0.65rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>{hour.count}</div>
                      )}
                      <div
                        style={{
                          width: "100%",
                          height: `${height}%`,
                          background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
                          borderRadius: "3px 3px 0 0",
                          minHeight: hour.count > 0 ? 16 : 2,
                          transition: "height 0.3s"
                        }}
                      ></div>
                      <div style={{ fontSize: "0.6rem", color: colors.textSecondary, textAlign: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", transition: "color 0.3s" }}>
                        {hour.hour}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Busiest Day of Week */}
            <div style={{ padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                Busiest Days of the Week
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {getBusiestDayOfWeek(reports).map((day, idx) => {
                  const maxCount = Math.max(...getBusiestDayOfWeek(reports).map(d => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>{day.count}</div>
                      <div
                        style={{
                          width: "100%",
                          height: `${height}%`,
                          background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
                          borderRadius: "6px 6px 0 0",
                          minHeight: day.count > 0 ? 24 : 4,
                          transition: "height 0.3s"
                        }}
                      ></div>
                      <div style={{ fontSize: "0.65rem", color: colors.textSecondary, textAlign: "center", transition: "color 0.3s" }}>
                        {day.day.substring(0, 3)}
                      </div>
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
                    onClick={async () => {
                      setSelectedReport(r);
                      loadNotes(r.id);
                      loadStatusHistory(r.id);
                      
                      // Calculate route
                      const route = await calculateOptimalRoute(r);
                      setRouteData(route);
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
                loadStatusHistory(report.id);
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
              setStatusHistory([]);
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
                    setStatusHistory([]);
                    setNearbyFacilities({ hospitals: [], fireStations: [], policeStations: [] });
                    setShowFacilities(false);
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`, "_blank")}
                    style={{ 
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
                    🗺️ Open Map
                  </button>
                  <button 
                    onClick={() => loadNearbyFacilities(selectedReport.latitude, selectedReport.longitude)}
                    style={{ 
                      padding: "10px", 
                      background: showFacilities ? (darkMode ? "#10b981" : "#059669") : (darkMode ? "#1e293b" : "#f1f5f9"),
                      color: showFacilities ? "white" : colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6, 
                      cursor: "pointer", 
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      transition: "all 0.3s"
                    }}
                  >
                    🏥 {showFacilities ? 'Hide' : 'Find'} Nearby
                  </button>
                  <button 
                    onClick={() => {
                      loadEvidence(selectedReport.id);
                      setShowEvidenceModal(true);
                    }}
                    style={{ 
                      padding: "10px", 
                      background: darkMode ? "#8b5cf6" : "#7c3aed",
                      color: "white",
                      border: "none",
                      borderRadius: 6, 
                      cursor: "pointer", 
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      transition: "all 0.3s"
                    }}
                  >
                    📸 Evidence ({evidenceFiles.length})
                  </button>
                  
                  <button 
                    onClick={() => {
                      loadResponderLocations(selectedReport.id);
                      setShowResponderTracking(true);
                    }}
                    style={{ 
                      padding: "10px", 
                      background: darkMode ? "#10b981" : "#059669",
                      color: "white",
                      border: "none",
                      borderRadius: 6, 
                      cursor: "pointer", 
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      transition: "all 0.3s"
                    }}
                  >
                    📍 Track Responders ({responderLocations.length})
                  </button>
                </div>
              </div>

              {/* Nearby Facilities */}
              {showFacilities && (
                <div style={{ marginBottom: 24, padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                    📍 Nearby Emergency Facilities
                  </h4>
                  
                  {loadingFacilities ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: colors.textSecondary, fontSize: "0.875rem" }}>
                      Loading facilities...
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Hospitals */}
                      {nearbyFacilities.hospitals.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                            🏥 Hospitals ({nearbyFacilities.hospitals.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {nearbyFacilities.hospitals.map((facility, idx) => (
                              <div key={idx} style={{ 
                                padding: 8, 
                                background: darkMode ? "#1e293b" : "white", 
                                borderRadius: 6, 
                                border: `1px solid ${colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "all 0.3s"
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                                    {facility.name}
                                  </div>
                                  <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>
                                    {formatDistance(facility.distance)} away
                                  </div>
                                </div>
                                <button
                                  onClick={() => window.open(getDirectionsUrl(selectedReport.latitude, selectedReport.longitude, facility.location.lat, facility.location.lng), "_blank")}
                                  style={{
                                    padding: "4px 8px",
                                    background: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 4,
                                    fontSize: "0.7rem",
                                    cursor: "pointer",
                                    fontWeight: 500
                                  }}
                                >
                                  Directions
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fire Stations */}
                      {nearbyFacilities.fireStations.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                            🚒 Fire Stations ({nearbyFacilities.fireStations.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {nearbyFacilities.fireStations.map((facility, idx) => (
                              <div key={idx} style={{ 
                                padding: 8, 
                                background: darkMode ? "#1e293b" : "white", 
                                borderRadius: 6, 
                                border: `1px solid ${colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "all 0.3s"
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                                    {facility.name}
                                  </div>
                                  <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>
                                    {formatDistance(facility.distance)} away
                                  </div>
                                </div>
                                <button
                                  onClick={() => window.open(getDirectionsUrl(selectedReport.latitude, selectedReport.longitude, facility.location.lat, facility.location.lng), "_blank")}
                                  style={{
                                    padding: "4px 8px",
                                    background: "#ef4444",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 4,
                                    fontSize: "0.7rem",
                                    cursor: "pointer",
                                    fontWeight: 500
                                  }}
                                >
                                  Directions
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Police Stations */}
                      {nearbyFacilities.policeStations.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                            🚔 Police Stations ({nearbyFacilities.policeStations.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {nearbyFacilities.policeStations.map((facility, idx) => (
                              <div key={idx} style={{ 
                                padding: 8, 
                                background: darkMode ? "#1e293b" : "white", 
                                borderRadius: 6, 
                                border: `1px solid ${colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "all 0.3s"
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                                    {facility.name}
                                  </div>
                                  <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>
                                    {formatDistance(facility.distance)} away
                                  </div>
                                </div>
                                <button
                                  onClick={() => window.open(getDirectionsUrl(selectedReport.latitude, selectedReport.longitude, facility.location.lat, facility.location.lng), "_blank")}
                                  style={{
                                    padding: "4px 8px",
                                    background: "#8b5cf6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 4,
                                    fontSize: "0.7rem",
                                    cursor: "pointer",
                                    fontWeight: 500
                                  }}
                                >
                                  Directions
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {nearbyFacilities.hospitals.length === 0 && 
                       nearbyFacilities.fireStations.length === 0 && 
                       nearbyFacilities.policeStations.length === 0 && (
                        <div style={{ textAlign: "center", padding: "20px 0", color: colors.textSecondary, fontSize: "0.875rem", fontStyle: "italic" }}>
                          No facilities found nearby
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {/* Route Optimization Display */}
              {routeData && (
                <div style={{
                  marginBottom: 24,
                  padding: 16,
                  background: darkMode ? "#0f172a" : "#f8fafc",
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  transition: "all 0.3s"
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '1rem',
                    color: darkMode ? colors.text : colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: "color 0.3s"
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
                      background: darkMode ? colors.cardBg : 'white',
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      transition: "all 0.3s"
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: darkMode ? colors.textSecondary : colors.textSecondary,
                        marginBottom: 4,
                        transition: "color 0.3s"
                      }}>
                        Distance
                      </div>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: darkMode ? colors.text : colors.text,
                        transition: "color 0.3s"
                      }}>
                        {routeData.distance}
                      </div>
                    </div>

                    <div style={{
                      padding: 12,
                      background: darkMode ? colors.cardBg : 'white',
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      transition: "all 0.3s"
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: darkMode ? colors.textSecondary : colors.textSecondary,
                        marginBottom: 4,
                        transition: "color 0.3s"
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
                      const url = `https://www.google.com/maps/dir/?api=1&origin=5.6037,-0.1870&destination=${selectedReport.latitude},${selectedReport.longitude}&travelmode=driving`;
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
                      gap: 8,
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#1d4ed8';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#2563eb';
                    }}
                  >
                    🧭 Open in Google Maps
                  </button>
                </div>
              )}

              {/* Status History Timeline */}
              {statusHistory.length > 0 && (
                <div style={{ marginBottom: 24, borderTop: `2px solid ${colors.border}`, paddingTop: 24, transition: "border-color 0.3s" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", fontWeight: 600, color: colors.text, display: "flex", alignItems: "center", gap: 8, transition: "color 0.3s" }}>
                    ⏱️ Status History
                    <span style={{ fontSize: "0.75rem", fontWeight: 400, color: colors.textSecondary, transition: "color 0.3s" }}>
                      ({statusHistory.length})
                    </span>
                  </h3>

                  <div style={{ position: "relative", paddingLeft: 32 }}>
                    {/* Timeline vertical line */}
                    <div style={{ 
                      position: "absolute", 
                      left: 11, 
                      top: 8, 
                      bottom: 8, 
                      width: 2, 
                      background: darkMode ? "#334155" : "#e2e8f0",
                      transition: "background 0.3s"
                    }} />

                    {statusHistory.map((entry, idx) => {
                      // Parse status from action_description (e.g., "Changed status to responding")
                      const statusMatch = entry.action_description?.match(/to (\w+)/);
                      const status = statusMatch ? statusMatch[1] : 'unknown';
                      
                      // Status colors and icons
                      const statusConfig = {
                        pending: { color: '#ef4444', icon: '🔴', label: 'Pending' },
                        responding: { color: '#f59e0b', icon: '🟡', label: 'Responding' },
                        resolved: { color: '#10b981', icon: '🟢', label: 'Resolved' }
                      };
                      const config = statusConfig[status] || { color: '#94a3b8', icon: '⚪', label: status };

                      // Calculate time elapsed since this status change
                      const timeElapsed = (() => {
                        const now = new Date();
                        const then = new Date(entry.created_at);
                        const diffMs = now - then;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        if (diffDays > 0) return `${diffDays}d ago`;
                        if (diffHours > 0) return `${diffHours}h ago`;
                        if (diffMins > 0) return `${diffMins}m ago`;
                        return 'just now';
                      })();

                      // Calculate time between status changes
                      const timeBetween = idx > 0 ? (() => {
                        const prev = new Date(statusHistory[idx - 1].created_at);
                        const curr = new Date(entry.created_at);
                        const diffMs = curr - prev;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);

                        if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
                        return `${diffMins}m`;
                      })() : null;

                      return (
                        <div 
                          key={entry.id} 
                          style={{ 
                            position: "relative",
                            marginBottom: idx < statusHistory.length - 1 ? 20 : 0,
                            paddingBottom: idx < statusHistory.length - 1 ? 20 : 0
                          }}
                        >
                          {/* Timeline dot */}
                          <div style={{ 
                            position: "absolute", 
                            left: -32, 
                            top: 2,
                            width: 24, 
                            height: 24, 
                            borderRadius: "50%", 
                            background: darkMode ? "#1e293b" : "white",
                            border: `3px solid ${config.color}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.625rem",
                            zIndex: 1,
                            transition: "all 0.3s"
                          }}>
                            {config.icon}
                          </div>

                          {/* Status change info */}
                          <div style={{ 
                            background: darkMode ? "#0f172a" : "#f8fafc",
                            padding: 12,
                            borderRadius: 8,
                            border: `1px solid ${colors.border}`,
                            transition: "all 0.3s"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 4 }}>
                              <span style={{ 
                                fontSize: "0.875rem", 
                                fontWeight: 600, 
                                color: config.color,
                                textTransform: "capitalize"
                              }}>
                                {config.label}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: colors.textSecondary, transition: "color 0.3s" }}>
                                {timeElapsed}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: colors.textSecondary, transition: "color 0.3s" }}>
                              by {entry.admin_email || 'Unknown'}
                            </div>
                            {timeBetween && (
                              <div style={{ 
                                fontSize: "0.75rem", 
                                color: darkMode ? "#64748b" : "#94a3b8",
                                marginTop: 4,
                                fontStyle: "italic"
                              }}>
                                ⏱ {timeBetween} from previous status
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Response time metrics */}
                  {statusHistory.length >= 2 && (
                    <div style={{ 
                      marginTop: 16, 
                      padding: 12, 
                      background: darkMode ? "#0f172a" : "#f1f5f9",
                      borderRadius: 8,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      transition: "background 0.3s"
                    }}>
                      {(() => {
                        const firstStatus = new Date(statusHistory[0].created_at);
                        const lastStatus = new Date(statusHistory[statusHistory.length - 1].created_at);
                        const totalTime = lastStatus - firstStatus;
                        const totalMins = Math.floor(totalTime / 60000);
                        const totalHours = Math.floor(totalMins / 60);

                        return (
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 4, transition: "color 0.3s" }}>
                              Total Response Time
                            </div>
                            <div style={{ fontSize: "1rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                              {totalHours > 0 ? `${totalHours}h ${totalMins % 60}m` : `${totalMins}m`}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

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

      {/* SMS Settings Modal */}
      {showSMSSettings && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: colors.cardBg, borderRadius: 12, maxWidth: 600, width: "100%", maxHeight: "90vh", overflow: "auto", transition: "all 0.3s" }}>
            {/* Header */}
            <div style={{ padding: 24, borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.3s" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                📱 SMS Notifications
              </h2>
              <button 
                onClick={() => setShowSMSSettings(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: 24 }}>
              {/* Enable/Disable Toggle */}
              <div style={{ marginBottom: 24, padding: 16, background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 8, border: `1px solid ${colors.border}`, transition: "all 0.3s" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={smsSettings.enabled}
                    onChange={(e) => {
                      const newSettings = { ...smsSettings, enabled: e.target.checked };
                      setSmsSettings(newSettings);
                      saveSMSSettings(newSettings);
                    }}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, transition: "color 0.3s" }}>
                      Enable SMS Notifications
                    </div>
                    <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginTop: 2, transition: "color 0.3s" }}>
                      Send SMS alerts to configured phone numbers
                    </div>
                  </div>
                </label>
              </div>

              {/* Notification Options */}
              {smsSettings.enabled && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                    Notification Triggers
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={smsSettings.notifyOnNew}
                        onChange={(e) => {
                          const newSettings = { ...smsSettings, notifyOnNew: e.target.checked };
                          setSmsSettings(newSettings);
                          saveSMSSettings(newSettings);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "0.875rem", color: colors.text, transition: "color 0.3s" }}>
                        New emergency reported
                      </span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={smsSettings.notifyOnStatusChange}
                        onChange={(e) => {
                          const newSettings = { ...smsSettings, notifyOnStatusChange: e.target.checked };
                          setSmsSettings(newSettings);
                          saveSMSSettings(newSettings);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "0.875rem", color: colors.text, transition: "color 0.3s" }}>
                        Status changes
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Phone Numbers */}
              {smsSettings.enabled && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.text, marginBottom: 12, transition: "color 0.3s" }}>
                    Phone Numbers ({smsSettings.phoneNumbers.length})
                  </div>
                  
                  {/* Add Phone Number */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      placeholder="0XXXXXXXXX or +233XXXXXXXXX"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: `1px solid ${colors.border}`,
                        background: darkMode ? "#1e293b" : "white",
                        color: colors.text,
                        fontSize: "0.875rem",
                        transition: "all 0.3s"
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newPhoneNumber.trim()) {
                          const newSettings = {
                            ...smsSettings,
                            phoneNumbers: [...smsSettings.phoneNumbers, newPhoneNumber.trim()]
                          };
                          setSmsSettings(newSettings);
                          saveSMSSettings(newSettings);
                          setNewPhoneNumber('');
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 500
                      }}
                    >
                      Add
                    </button>
                  </div>

                  {/* Phone Numbers List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {smsSettings.phoneNumbers.length === 0 ? (
                      <div style={{ padding: 16, textAlign: "center", color: colors.textSecondary, fontSize: "0.875rem", fontStyle: "italic", transition: "color 0.3s" }}>
                        No phone numbers added yet
                      </div>
                    ) : (
                      smsSettings.phoneNumbers.map((phone, idx) => (
                        <div key={idx} style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          padding: 12,
                          background: darkMode ? "#0f172a" : "#f8fafc",
                          borderRadius: 6,
                          border: `1px solid ${colors.border}`,
                          transition: "all 0.3s"
                        }}>
                          <span style={{ fontSize: "0.875rem", color: colors.text, transition: "color 0.3s" }}>
                            {formatPhoneDisplay(phone)}
                          </span>
                          <button
                            onClick={() => {
                              const newSettings = {
                                ...smsSettings,
                                phoneNumbers: smsSettings.phoneNumbers.filter((_, i) => i !== idx)
                              };
                              setSmsSettings(newSettings);
                              saveSMSSettings(newSettings);
                            }}
                            style={{
                              padding: "4px 8px",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 500
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Test SMS */}
              {smsSettings.enabled && smsSettings.phoneNumbers.length > 0 && (
                <div style={{ padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #3b82f6" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e40af", marginBottom: 8 }}>
                    💡 Test SMS
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#1e40af", marginBottom: 12 }}>
                    Send a test message to verify your configuration
                  </div>
                  <button
                    onClick={async () => {
                      const result = await sendTestSMS(smsSettings.phoneNumbers[0], 'Test message from Emergency Response System. SMS notifications are working!');
                      if (result.success) {
                        alert('✅ Test SMS sent successfully!');
                      } else {
                        alert(`❌ Failed to send test SMS: ${result.error}`);
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500
                    }}
                  >
                    Send Test SMS
                  </button>
                </div>
              )}

              {/* Setup Instructions */}
              {!smsSettings.enabled && (
                <div style={{ padding: 16, background: "#fef3c7", borderRadius: 8, border: "1px solid #f59e0b" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#92400e", marginBottom: 8 }}>
                    ⚙️ Setup Required
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#92400e", lineHeight: 1.6 }}>
                    To use SMS notifications, you need to configure Twilio credentials in your backend .env file:
                    <br />• TWILIO_ACCOUNT_SID
                    <br />• TWILIO_AUTH_TOKEN
                    <br />• TWILIO_PHONE_NUMBER
                    <br /><br />
                    Get these from <a href="https://www.twilio.com/console" target="_blank" style={{ color: "#92400e", fontWeight: 600 }}>twilio.com/console</a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: 24, borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "flex-end", transition: "border-color 0.3s" }}>
              <button
                onClick={() => setShowSMSSettings(false)}
                style={{
                  padding: "8px 24px",
                  background: colors.buttonBg,
                  color: colors.buttonText,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "all 0.3s"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{
            background: darkMode ? colors.cardBg : colors.statBg,
            borderRadius: 16,
            padding: 32,
            maxWidth: 500,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            transition: "all 0.3s"
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
                color: darkMode ? colors.text : colors.text,
                transition: "color 0.3s"
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
                  color: darkMode ? colors.textSecondary : colors.textSecondary,
                  transition: "color 0.3s"
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
                  background: darkMode ? colors.bg : colors.statBg,
                  borderRadius: 8,
                  transition: "all 0.3s"
                }}>
                  <span style={{
                    color: darkMode ? colors.text : colors.text,
                    fontSize: '0.875rem',
                    transition: "color 0.3s"
                  }}>
                    {action}
                  </span>
                  <kbd style={{
                    padding: '4px 8px',
                    background: darkMode ? colors.cardBg : 'white',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: darkMode ? colors.text : colors.text,
                    transition: "all 0.3s"
                  }}>
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evidence Gallery Modal */}
      {showEvidenceModal && selectedReport && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 20 }}>
          <div style={{
            background: darkMode ? colors.cardBg : colors.statBg,
            borderRadius: 16,
            padding: 24,
            maxWidth: 900,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            transition: "all 0.3s"
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
                color: darkMode ? colors.text : colors.text,
                transition: "color 0.3s"
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
                  color: darkMode ? colors.textSecondary : colors.textSecondary,
                  transition: "color 0.3s"
                }}
              >
                ×
              </button>
            </div>

            {/* Upload section */}
            <div style={{
              marginBottom: 24,
              padding: 16,
              background: darkMode ? colors.bg : '#f8fafc',
              borderRadius: 12,
              border: `2px dashed ${colors.border}`,
              textAlign: 'center',
              transition: "all 0.3s"
            }}>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  for (const file of files) {
                    const type = file.type.startsWith('image/') ? 'photo' : 'video';
                    try {
                      await uploadEvidence(file, selectedReport.id, type);
                    } catch (error) {
                      alert(`Failed to upload ${file.name}: ${error.message}`);
                    }
                  }
                  loadEvidence(selectedReport.id);
                  e.target.value = ''; // Reset input
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              />
              <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: colors.textSecondary, transition: "color 0.3s" }}>
                Upload photos or videos (multiple files supported)
              </p>
            </div>

            {/* Evidence gallery */}
            {evidenceFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textSecondary, fontSize: '0.875rem' }}>
                No evidence files uploaded yet
              </div>
            ) : (
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
                    background: darkMode ? colors.bg : '#f8fafc',
                    border: `1px solid ${colors.border}`,
                    transition: "all 0.3s"
                  }}>
                    {evidence.file_type === 'photo' ? (
                      <img
                        src={evidence.file_url}
                        alt={evidence.file_name}
                        style={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(evidence.file_url, '_blank')}
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
                      color: darkMode ? colors.textSecondary : colors.textSecondary,
                      transition: "color 0.3s"
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, color: darkMode ? colors.text : colors.text }}>
                        {evidence.file_name}
                      </div>
                      <div>
                        {new Date(evidence.created_at).toLocaleString()}
                      </div>
                      <div style={{ marginTop: 4, fontSize: '0.7rem' }}>
                        {(evidence.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responder Tracking Modal */}
      {showResponderTracking && selectedReport && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 20 }}>
          <div style={{
            background: darkMode ? colors.cardBg : colors.statBg,
            borderRadius: 16,
            padding: 24,
            maxWidth: 1200,
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
            transition: "all 0.3s"
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
                color: darkMode ? colors.text : colors.text,
                transition: "color 0.3s"
              }}>
                📍 Responder Tracking
              </h2>
              <button
                onClick={() => setShowResponderTracking(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: darkMode ? colors.textSecondary : colors.textSecondary,
                  transition: "color 0.3s"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
              {/* Responder List */}
              <div>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '1rem',
                  color: darkMode ? colors.text : colors.text,
                  transition: "color 0.3s"
                }}>
                  Active Responders
                </h3>
                
                {responderLocations.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    color: colors.textSecondary, 
                    fontSize: '0.875rem',
                    background: darkMode ? colors.bg : '#f8fafc',
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    transition: "all 0.3s"
                  }}>
                    No responders tracking yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {responderLocations.map((location) => {
                      const responder = location.responder;
                      const isOnScene = location.status === 'on_scene';
                      const isEnRoute = location.status === 'en_route';
                      
                      return (
                        <div key={`${location.report_id}-${location.responder_id}`} style={{
                          padding: 16,
                          background: darkMode ? colors.bg : '#f8fafc',
                          borderRadius: 12,
                          border: `2px solid ${isOnScene ? '#10b981' : isEnRoute ? '#f59e0b' : colors.border}`,
                          transition: "all 0.3s"
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 8
                          }}>
                            <div style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: isOnScene ? '#10b981' : isEnRoute ? '#f59e0b' : '#94a3b8',
                              flexShrink: 0
                            }} />
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: darkMode ? colors.text : colors.text,
                              transition: "color 0.3s"
                            }}>
                              {responder?.name || 'Unknown Responder'}
                            </div>
                          </div>
                          
                          {responder && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: darkMode ? colors.textSecondary : colors.textSecondary,
                              marginBottom: 4,
                              transition: "color 0.3s"
                            }}>
                              ID: <span style={{ fontWeight: 600 }}>{responder.responder_id}</span>
                            </div>
                          )}
                          
                          <div style={{
                            fontSize: '0.75rem',
                            color: darkMode ? colors.textSecondary : colors.textSecondary,
                            marginBottom: 4,
                            transition: "color 0.3s"
                          }}>
                            Status: <span style={{ 
                              fontWeight: 600, 
                              color: isOnScene ? '#10b981' : isEnRoute ? '#f59e0b' : colors.textSecondary,
                              textTransform: 'capitalize'
                            }}>
                              {location.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div style={{
                            fontSize: '0.75rem',
                            color: darkMode ? colors.textSecondary : colors.textSecondary,
                            marginBottom: 4,
                            transition: "color 0.3s"
                          }}>
                            Distance: <span style={{ fontWeight: 600 }}>
                              {location.distance ? `${location.distance.toFixed(2)} km` : 'Calculating...'}
                            </span>
                          </div>
                          
                          <div style={{
                            fontSize: '0.7rem',
                            color: darkMode ? colors.textSecondary : colors.textSecondary,
                            transition: "color 0.3s"
                          }}>
                            Last updated: {new Date(location.updated_at).toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Manual tracking controls */}
                <div style={{ marginTop: 16 }}>
                  {!trackingEnabled ? (
                    <button
                      onClick={() => {
                        const watchId = startLocationTracking(selectedReport.id);
                        // Store watchId for cleanup
                        window.currentWatchId = watchId;
                      }}
                      style={{
                        width: '100%',
                        padding: 12,
                        background: darkMode ? '#10b981' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = darkMode ? '#059669' : '#047857';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = darkMode ? '#10b981' : '#059669';
                      }}
                    >
                      📍 Start Tracking My Location
                    </button>
                  ) : (
                    <>
                      <div style={{
                        padding: 12,
                        background: darkMode ? '#10b981' : '#d1fae5',
                        color: darkMode ? 'white' : '#065f46',
                        borderRadius: 8,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        marginBottom: 8,
                        transition: "all 0.3s"
                      }}>
                        📍 Your location is being tracked
                      </div>
                      <button
                        onClick={() => {
                          if (window.currentWatchId) {
                            stopLocationTracking(window.currentWatchId);
                            window.currentWatchId = null;
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: 12,
                          background: darkMode ? '#ef4444' : '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = darkMode ? '#dc2626' : '#b91c1c';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = darkMode ? '#ef4444' : '#dc2626';
                        }}
                      >
                        ⏹ Stop Tracking
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Map */}
              <div style={{
                height: 500,
                borderRadius: 12,
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
                transition: "all 0.3s"
              }}>
                <EmergencyMap
                  latitude={selectedReport.latitude}
                  longitude={selectedReport.longitude}
                  responderLocations={responderLocations}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Chat Component */}
      <GroupChat 
        user={user}
        darkMode={darkMode}
        colors={colors}
        onlineAdmins={onlineAdmins}
      />
    </div>
  );
};

export default Admin;
