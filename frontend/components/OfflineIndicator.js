import { useState, useEffect } from 'react';

export default function OfflineIndicator({ queuedCount = 0 }) {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnecting(true);
      setTimeout(() => setShowReconnecting(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnecting(false);
    };

    // Check initial status
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnecting) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      padding: '12px 20px',
      background: showReconnecting ? '#10b981' : '#f59e0b',
      color: 'white',
      textAlign: 'center',
      fontSize: '0.875rem',
      fontWeight: 600,
      zIndex: 99999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      animation: 'slideDown 0.3s ease-out'
    }}>
      {showReconnecting ? (
        <>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <span>Back online! Syncing changes...</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span>You're offline. Changes will be saved and synced when reconnected.</span>
          {queuedCount > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.3)',
              padding: '4px 8px',
              borderRadius: 12,
              fontSize: '0.75rem',
              marginLeft: 8
            }}>
              {queuedCount} queued
            </span>
          )}
        </>
      )}
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
