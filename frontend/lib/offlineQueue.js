// Enhanced Offline Queue System with IndexedDB

const DB_NAME = 'emergencyOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineQueue';

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
};

// Add operation to queue
export const queueOperation = async (operation) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const queuedOperation = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending'
    };

    await store.add(queuedOperation);
    console.log('✅ Operation queued:', operation.type);
    
    return queuedOperation;
  } catch (error) {
    console.error('❌ Error queuing operation:', error);
    // Fallback to localStorage
    const queue = getQueueFromLocalStorage();
    queue.push({ ...operation, timestamp: Date.now(), status: 'pending' });
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  }
};

// Get all queued operations
export const getQueuedOperations = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error getting queue:', error);
    return getQueueFromLocalStorage();
  }
};

// Process queued operations
export const processQueue = async (syncFunction) => {
  const operations = await getQueuedOperations();
  
  if (operations.length === 0) {
    console.log('✅ No operations to sync');
    return { synced: 0, failed: 0 };
  }

  console.log(`📤 Processing ${operations.length} queued operations...`);
  
  let synced = 0;
  let failed = 0;

  for (const operation of operations) {
    try {
      await syncFunction(operation);
      await removeFromQueue(operation.id);
      synced++;
      console.log(`✅ Synced: ${operation.type}`);
    } catch (error) {
      console.error(`❌ Failed to sync ${operation.type}:`, error);
      await updateOperationStatus(operation.id, 'failed', error.message);
      failed++;
    }
  }

  console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
};

// Remove operation from queue
export const removeFromQueue = async (id) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(id);
  } catch (error) {
    console.error('❌ Error removing from queue:', error);
    const queue = getQueueFromLocalStorage();
    const filtered = queue.filter(op => op.id !== id);
    localStorage.setItem('offlineQueue', JSON.stringify(filtered));
  }
};

// Update operation status
export const updateOperationStatus = async (id, status, error = null) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const operation = await store.get(id);
    if (operation) {
      operation.status = status;
      operation.error = error;
      operation.updatedAt = Date.now();
      await store.put(operation);
    }
  } catch (error) {
    console.error('❌ Error updating status:', error);
  }
};

// Clear all operations
export const clearQueue = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
    console.log('✅ Queue cleared');
  } catch (error) {
    console.error('❌ Error clearing queue:', error);
    localStorage.removeItem('offlineQueue');
  }
};

// Cache reports for offline viewing
export const cacheReports = async (reports) => {
  try {
    localStorage.setItem('cachedReports', JSON.stringify({
      reports,
      timestamp: Date.now()
    }));
    console.log(`✅ Cached ${reports.length} reports`);
  } catch (error) {
    console.error('❌ Error caching reports:', error);
  }
};

// Get cached reports
export const getCachedReports = () => {
  try {
    const cached = localStorage.getItem('cachedReports');
    if (!cached) return null;

    const { reports, timestamp } = JSON.parse(cached);
    
    // Cache expires after 1 hour
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - timestamp > oneHour) {
      localStorage.removeItem('cachedReports');
      return null;
    }

    return reports;
  } catch (error) {
    console.error('❌ Error getting cached reports:', error);
    return null;
  }
};

// Fallback to localStorage
const getQueueFromLocalStorage = () => {
  try {
    const queue = localStorage.getItem('offlineQueue');
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
};

// Check if online
export const isOnline = () => {
  return navigator.onLine;
};

// Setup listeners for online/offline events
export const setupOfflineListeners = (onOnline, onOffline) => {
  const handleOnline = () => {
    console.log('🌐 Back online');
    onOnline && onOnline();
  };

  const handleOffline = () => {
    console.log('📡 Gone offline');
    onOffline && onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Retry with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
