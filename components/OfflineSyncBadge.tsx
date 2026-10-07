import React, { useState, useEffect } from 'react';
import { OfflineQueueItem, getCairoCurrentTimeString } from '../types';
import { getOfflineQueue, removeOfflineItem } from '../services/offlineSyncService';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

interface OfflineSyncBadgeProps {
  onSyncPendingItems: () => Promise<void>;
  isCloudConnected?: boolean;
}

const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({
  onSyncPendingItems,
  isCloudConnected = true
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cairoTime, setCairoTime] = useState(getCairoCurrentTimeString());

  // Check online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cairo clock tick
    const clockTimer = setInterval(() => {
      setCairoTime(getCairoCurrentTimeString());
      setQueueCount(getOfflineQueue().length);
    }, 5000);

    setQueueCount(getOfflineQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(clockTimer);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncPendingItems();
      setQueueCount(getOfflineQueue().length);
    } catch (e) {
      console.error('Offline sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const isActuallyOnline = isOnline && isCloudConnected;

  return (
    <div className="flex items-center gap-2">
      {/* Cairo Clock */}
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.03] border border-black/[0.06] text-[11px] font-mono text-[#86868B]">
        <Clock size={12} className="text-[#86868B]" />
        <span>توقيت القاهرة: {cairoTime.split(' ')[1] || cairoTime}</span>
      </div>

      {/* Online/Offline Status Indicator */}
      {isActuallyOnline ? (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi size={12} />
          <span className="hidden sm:inline">متصل ومزامن لحظياً</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] font-bold">
          <WifiOff size={13} className="text-amber-600" />
          <span>بدون إنترنت</span>
          {queueCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-mono">
              {queueCount} معلقة
            </span>
          )}
        </div>
      )}

      {/* Sync Now button when queue has items */}
      {queueCount > 0 && isOnline && (
        <button
          type="button"
          onClick={triggerSync}
          disabled={isSyncing}
          className="apple-btn flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0071E3] text-white text-[11px] font-bold shadow-2xs hover:bg-[#0077ED] transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'مزامنة...' : 'مزامنة الآن'}</span>
        </button>
      )}
    </div>
  );
};

export default OfflineSyncBadge;
