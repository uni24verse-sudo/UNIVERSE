import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';

/**
 * Intelligent Session Guard (Approach: Soft Rehydration)
 * instead of a hard browser reload, this component triggers a 'Soft Sync'.
 * 1. Shows a premium, non-disruptive 'Syncing' overlay (Mini-Splash).
 * 2. Triggers a global re-validation event.
 * 3. Maintains user scroll and volatile state.
 */
const SessionGuard = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const lastActiveTime = useRef(parseInt(localStorage.getItem('universe_last_active')) || Date.now());
  const location = useLocation();
  const REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes (Soft Sync)
  const HARD_REFRESH_THRESHOLD = 60 * 60 * 1000; // 1 hour (Hard Reload)

  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      lastActiveTime.current = now;
      localStorage.setItem('universe_last_active', now.toString());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeAway = Date.now() - lastActiveTime.current;
        
        if (timeAway > HARD_REFRESH_THRESHOLD) {
          // Hard reload for very long periods of inactivity (after hours)
          console.log('[SessionGuard] Hard refresh triggered due to extended inactivity.');
          window.location.reload();
        } else if (timeAway > REFRESH_THRESHOLD) {
          // Soft sync for medium periods of inactivity
          performSoftSync();
        } else {
          updateActivity();
        }
      } else {
        updateActivity();
      }
    };

    const performSoftSync = async () => {
      setIsSyncing(true);
      
      // Dispatch a global event that components can listen to for re-fetching data
      window.dispatchEvent(new CustomEvent('universe_sync_data'));
      
      // Simulate/Wait for critical path recovery
      // In a real scenario, this would wait for the most critical API calls to finish
      setTimeout(() => {
        setIsSyncing(false);
        updateActivity();
        console.log('[SessionGuard] Soft sync completed.');
      }, 1200);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Initial check on mount in case they opened the tab after a long time
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // Soft update on route change
  useEffect(() => {
    const now = Date.now();
    lastActiveTime.current = now;
    localStorage.setItem('universe_last_active', now.toString());
  }, [location.pathname]);

  if (!isSyncing) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem 3rem',
        borderRadius: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 10px 20px var(--primary-shadow)'
        }}>
          <Sparkles className="animate-pulse" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Refreshing Menu</h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Synchronizing with store...</p>
        </div>
        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SessionGuard;
