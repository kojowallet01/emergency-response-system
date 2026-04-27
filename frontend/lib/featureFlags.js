// Feature flags for advanced admin features
export const featureFlags = {
  // Phase 1 Features
  autoRefresh: true,
  keyboardShortcuts: true,
  
  // Phase 2 Features
  routeOptimization: true,
  evidenceManagement: true,
  realTimeChat: true,
  
  // Phase 3 Features
  responderTracking: true,
  aiClassification: false, // Requires OpenAI API key
  
  // Additional Features
  darkMode: true,
  offlineMode: true,
  analytics: true,
  smsAlerts: true,
  nearbyFacilities: true,
  adminNotes: true,
  activityLogs: true
};

// Check if a feature is enabled
export const isFeatureEnabled = (featureName) => {
  return featureFlags[featureName] === true;
};

// Check if AI features can be enabled (requires API key)
export const canEnableAI = () => {
  return !!process.env.NEXT_PUBLIC_OPENAI_API_KEY;
};

// Get list of enabled features
export const getEnabledFeatures = () => {
  return Object.keys(featureFlags).filter(key => featureFlags[key]);
};

// Get list of disabled features
export const getDisabledFeatures = () => {
  return Object.keys(featureFlags).filter(key => !featureFlags[key]);
};

// Feature descriptions for admin panel
export const featureDescriptions = {
  autoRefresh: 'Automatic dashboard refresh with configurable intervals',
  keyboardShortcuts: 'Keyboard shortcuts for quick navigation and actions',
  routeOptimization: 'Calculate optimal routes with real-time traffic data',
  evidenceManagement: 'Upload and manage photos/videos for reports',
  realTimeChat: 'Real-time chat between online administrators',
  responderTracking: 'Track responder locations in real-time on map',
  aiClassification: 'AI-powered emergency classification and predictions',
  darkMode: 'Dark mode theme for reduced eye strain',
  offlineMode: 'Offline support with automatic sync when online',
  analytics: 'Advanced analytics and reporting dashboard',
  smsAlerts: 'SMS notifications for emergency alerts',
  nearbyFacilities: 'Find nearby hospitals, fire stations, and police',
  adminNotes: 'Add and manage notes on emergency reports',
  activityLogs: 'Track all admin actions and status changes'
};

// Get feature status summary
export const getFeatureSummary = () => {
  const enabled = getEnabledFeatures();
  const disabled = getDisabledFeatures();
  
  return {
    total: Object.keys(featureFlags).length,
    enabled: enabled.length,
    disabled: disabled.length,
    enabledList: enabled,
    disabledList: disabled,
    aiAvailable: canEnableAI()
  };
};
