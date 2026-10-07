import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Crown,
  ShoppingBag,
  Receipt,
  RefreshCw,
  X,
  Bell,
  ShieldCheck
} from 'lucide-react';

export type AppleNotificationType = 'sale' | 'auth' | 'stock' | 'invoice' | 'system' | 'warning' | 'goal' | 'info';

export interface AppleNotificationItem {
  id: string;
  type: AppleNotificationType;
  title: string;
  subtitle?: string;
  badgeText?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
  createdAt: string;
}

interface AppleTopNotificationBannerProps {
  notifications: AppleNotificationItem[];
  onDismiss: (id: string) => void;
  onClearAll?: () => void;
}

export const AppleTopNotificationBanner: React.FC<AppleTopNotificationBannerProps> = ({
  notifications,
  onDismiss,
}) => {
  if (!notifications || notifications.length === 0) return null;

  // Show up to 2 stacked top notifications in Dynamic Island style
  const visibleNotifications = notifications.slice(0, 2);

  const getIconAndAccent = (type: AppleNotificationType) => {
    switch (type) {
      case 'sale':
        return {
          icon: <ShoppingBag size={17} className="text-white" />,
          bgBadge: 'bg-gradient-to-tr from-[#34C759] to-emerald-400 shadow-lg shadow-emerald-500/30',
          borderAccent: 'border-emerald-400/35',
          pillColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30',
          barColor: 'from-emerald-400 via-[#34C759] to-teal-400'
        };
      case 'auth':
        return {
          icon: <Crown size={17} className="text-[#1D1D1F] fill-[#1D1D1F]" />,
          bgBadge: 'bg-gradient-to-tr from-[#C49746] via-amber-400 to-yellow-300 shadow-lg shadow-amber-500/30',
          borderAccent: 'border-amber-400/40',
          pillColor: 'text-amber-300 bg-amber-500/20 border-amber-400/30',
          barColor: 'from-amber-400 via-[#C49746] to-yellow-300'
        };
      case 'invoice':
        return {
          icon: <Receipt size={17} className="text-white" />,
          bgBadge: 'bg-gradient-to-tr from-[#0071E3] to-sky-400 shadow-lg shadow-blue-500/30',
          borderAccent: 'border-sky-400/35',
          pillColor: 'text-sky-300 bg-sky-500/20 border-sky-400/30',
          barColor: 'from-[#0071E3] via-sky-400 to-blue-500'
        };
      case 'stock':
      case 'warning':
        return {
          icon: <AlertTriangle size={17} className="text-slate-950" />,
          bgBadge: 'bg-gradient-to-tr from-[#FF9500] to-amber-300 shadow-lg shadow-amber-500/30',
          borderAccent: 'border-amber-400/40',
          pillColor: 'text-amber-300 bg-amber-500/20 border-amber-400/30',
          barColor: 'from-[#FF9500] via-amber-400 to-yellow-400'
        };
      default:
        return {
          icon: <Sparkles size={17} className="text-white" />,
          bgBadge: 'bg-gradient-to-tr from-[#0071E3] to-indigo-500 shadow-lg shadow-blue-500/30',
          borderAccent: 'border-white/20',
          pillColor: 'text-sky-300 bg-white/10 border-white/15',
          barColor: 'from-[#0071E3] to-sky-400'
        };
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[160] w-[94vw] max-w-lg flex flex-col items-center gap-2 pointer-events-none"
    >
      {visibleNotifications.map((item, idx) => {
        const style = getIconAndAccent(item.type);
        return (
          <div
            key={item.id}
            style={{
              transform: idx > 0 ? 'scale(0.96)' : 'scale(1)',
              opacity: idx > 0 ? 0.9 : 1,
            }}
            className={`pointer-events-auto w-full rounded-[24px] bg-[#161618]/95 backdrop-blur-2xl border ${style.borderAccent} text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] px-4 py-3 transition-all duration-300 animate-in fade-in slide-in-from-top-5 zoom-in-95 overflow-hidden relative`}
          >
            {/* Top Glowing Accent Line */}
            <div className={`absolute top-0 right-0 left-0 h-[2.5px] bg-gradient-to-l ${style.barColor}`} />

            <div className="flex items-center justify-between gap-3">
              {/* Icon Badge + Text Content */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-2xl ${style.bgBadge} flex items-center justify-center shrink-0 relative`}>
                  <span className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-25 duration-1000" />
                  {style.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-white truncate">
                      {item.title}
                    </h4>
                    {item.badgeText && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${style.pillColor}`}>
                        {item.badgeText}
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-[11px] text-zinc-300 mt-0.5 line-clamp-1 font-medium">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Action Button + Dismiss Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {item.actionLabel && item.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      item.onAction?.();
                      onDismiss(item.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {item.actionLabel}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق الإشعار"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AppleTopNotificationBanner;
