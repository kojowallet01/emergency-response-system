// Offline Mode Helper Functions

// Check if user is online
export const isOnline = () => {
  return navigator.onLine;
};

// Queue data for offline sync
export const queueForSync = async (key, data) => {
  try {
    const queue = getOfflineQueue();
    queue.push({
      id: Date.now(),
      key,
      data,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    
    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in self.registration) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-reports');
    }
    
    return true;
  } catch (error) {
    console.error('Error queuing for sync:', error);
    return false;
  }
};

// Get offline queue
export const getOfflineQueue = () => {
  try {
    const queue = localStorage.getItem('offline_queue');
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
};

// Clear offline queue
export const clearOfflineQueue = () => {
  try {
    localStorage.removeItem('offline_queue');
    return true;
  } catch (error) {
    console.error('Error clearing offline queue:', error);
    return false;
  }
};

// Remove item from queue
export const removeFromQueue = (id) => {
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem('offline_queue', JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing from queue:', error);
    return false;
  }
};

// Sync queued items
export const syncQueuedItems = async (syncFunction) => {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await syncFunction(item.data);
      removeFromQueue(item.id);
      synced++;
    } catch (error) {
      console.error('Error syncing item:', error);
      failed++;
    }
  }

  return { success: failed === 0, synced, failed };
};

// Listen for online/offline events
export const setupOfflineListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

// Get offline status message
export const getOfflineStatusMessage = () => {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return 'No pending items';
  }
  return `${queue.length} item${queue.length > 1 ? 's' : ''} waiting to sync`;
};

// Register service worker
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_SUCCESS') {
          console.log('Sync successful:', event.data.data);
          // Trigger a custom event that components can listen to
          window.dispatchEvent(new CustomEvent('sync-success', { detail: event.data.data }));
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Trigger manual sync
export const triggerManualSync = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: 'SYNC_NOW' });
    }
  }
};

// Cache important data for offline use
export const cacheOfflineData = (key, data) => {
  try {
    localStorage.setItem(`offline_cache_${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error caching offline data:', error);
    return false;
  }
};

// Get cached offline data
export const getCachedOfflineData = (key) => {
  try {
    const data = localStorage.getItem(`offline_cache_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached offline data:', error);
    return null;
  }
};
