import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Laptop, 
  Wifi, 
  Sparkles, 
  CheckCircle2, 
  ShoppingBag, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Play,
  RotateCcw
} from 'lucide-react';
import { soundAlertService } from '../services/soundAlertService';
import { browserNotificationService } from '../services/browserNotificationService';
import { Sale, StoreSettings } from '../types';

interface OwnerLiveAlertsRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentSales: Sale[];
  currency?: string;
  isCloudConnected?: boolean;
  onTriggerTestAlert?: () => void;
}

export const OwnerLiveAlertsRadarModal: React.FC<OwnerLiveAlertsRadarModalProps> = ({
  isOpen,
  onClose,
  recentSales,
  currency = 'ج.م',
  isCloudConnected = true,
  onTriggerTestAlert,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundAlertService.isEnabled());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    browserNotificationService.getPermission()
  );
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setSoundEnabled(soundAlertService.isEnabled());
    setNotificationPermission(browserNotificationService.getPermission());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    soundAlertService.setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      soundAlertService.playActionChime();
    }
  };

  const handleRequestPushPermission = async () => {
    const granted = await browserNotificationService.requestPermission();
    setNotificationPermission(browserNotificationService.getPermission());
    if (granted) {
      browserNotificationService.sendNotification('✨ تم تفعيل إشعارات لمسة عطر بنجاح', {
        body: 'ستصلك الآن تنبيهات حية فورية عند أي عملية بيع أو إجراء تشغيلي من أي جهاز.',
        tag: 'test-perm',
      });
      soundAlertService.playSaleChime();
    }
  };

  const handleTestAlert = () => {
    setIsTesting(true);
    soundAlertService.playSaleChime();
    browserNotificationService.sendNotification(`🛒 تجربة بيع ناجحة: 450 ${currency}`, {
      body: 'الكاشير: طارق · العميل: عميل مميز · 2 عبوة (مزامنة حية من هاتف ذكي)',
      tag: `test-sale-${Date.now()}`,
    });
    if (onTriggerTestAlert) {
      onTriggerTestAlert();
    }
    setTimeout(() => setIsTesting(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        dir="rtl"
        className="relative w-full max-w-lg rounded-3xl bg-white border border-[#C49746]/40 shadow-2xl p-5 sm:p-6 space-y-5 apple-glass overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/25">
              <Bell size={20} className="fill-current animate-bounce" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>رادار تنبيهات المالك المباشرة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                  LIVE 24/7
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                تزامن فوري على اللاب توب والموبايل وإشعارات لحظية لجميع العمليات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Real-Time Sync Status Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 apple-glass">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Wifi size={14} className={isCloudConnected ? 'text-emerald-600' : 'text-amber-600'} />
              <span>حالة التزامن السحابي الحي (Multi-Device Engine)</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isCloudConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800'
            }`}>
              {isCloudConnected ? 'متزامن لحظياً ✓' : 'جاري التحقق...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
              <Laptop size={16} className="text-[#0071E3] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-bold">اللاب توب والكمبيوتر</span>
                <strong className="text-[11px] text-slate-900 truncate block">شاشة كاشير وإدارة كاملة</strong>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
              <Smartphone size={16} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-bold">الموبايل والآيباد</span>
                <strong className="text-[11px] text-slate-900 truncate block">كاشير متجول + تنبيهات المالك</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-600" />
            <span>خيارات التنبيه الفوري للمالك عند أي عملية</span>
          </h3>

          {/* Sound Toggle */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                soundEnabled ? 'bg-amber-500/10 text-amber-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </div>
              <div>
                <strong className="text-xs text-slate-900 block">صوت الرنين الفاخر عند البيع (Audio Chime)</strong>
                <span className="text-[10px] text-slate-500">نغمة كريستالية ملكية تصدر فوراً عند إتمام أي بيع على أي جهاز</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0 ${
                soundEnabled 
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {soundEnabled ? 'مفعّل ✓' : 'معطل'}
            </button>
          </div>

          {/* Push Notification Toggle */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                notificationPermission === 'granted' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}>
                <Bell size={16} />
              </div>
              <div>
                <strong className="text-xs text-slate-900 block">إشعارات المتصفح والموبايل (Push Notifications)</strong>
                <span className="text-[10px] text-slate-500">
                  {notificationPermission === 'granted'
                    ? 'مفعلة وتعمل حتى لو كان التطبيق في الخلفية'
                    : 'انقر لمنح الإذن لاستلام إشعارات النظام على هاتفك أو حاسوبك'}
                </span>
              </div>
            </div>

            {notificationPermission === 'granted' ? (
              <span className="text-[11px] font-black text-emerald-700 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 shrink-0">
                مفعلة ✓
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPushPermission}
                className="px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black transition-colors cursor-pointer shrink-0"
              >
                تفعيل الإذن
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Explanation Callout */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs space-y-1.5 apple-glass">
          <div className="flex items-center gap-2 font-black text-amber-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>تنبيه المبيعات الحية فقط (Real-Time Live Events Only):</span>
          </div>
          <p className="text-[11px] text-amber-900/90 leading-relaxed">
            • <strong>لا يصدر النظام أي تنبيهات للمبيعات الماضية</strong> المسجلة مسبقاً عند فتح التطبيق.
            <br />
            • التنبيه والرنين الكريستالي والإشعار يعملون <strong>فورياً وحصرياً عند إتمام عملية بيع فعلية الآن</strong> من أي جهاز كاشير أو هاتف في المتجر لتنبيه المالك لحظة وقوع الحدث.
          </p>
        </div>

        {/* Device Sound & Push Test Button */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-blue-500/15 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-xs text-slate-900">
            <strong>فحص واختبار استقبال الرنين والإشعار على هذا الجهاز:</strong>
            <span className="text-[11px] text-slate-700 block">تأكد أن حاسوبك أو هاتفك الحالي يُطلق الصوت والإشعار بنجاح للمبيعات الفعلية</span>
          </div>

          <button
            type="button"
            onClick={handleTestAlert}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-[#1D1D1F] hover:bg-black text-amber-300 font-black text-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0"
          >
            <Play size={13} className="fill-current text-amber-300" />
            <span>{isTesting ? 'جاري الرنين...' : 'اختبار الرنين والإشعار 🔔'}</span>
          </button>
        </div>

        {/* Recent Live Sales Stream */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-slate-400" />
              <span>آخر المبيعات المستلمة لحظياً من الأجهزة:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">اليوم ({recentSales.length})</span>
          </div>

          {recentSales.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              بانتظار تسجيل أول عملية بيع اليوم عبر أي جهاز...
            </div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
              {recentSales.slice(0, 4).map((s) => (
                <div 
                  key={s.id}
                  className="p-2 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <strong className="text-slate-900 truncate">
                      {s.totalPrice ?? (s as any).total ?? 0} {currency}
                    </strong>
                    <span className="text-[10px] text-slate-500 truncate">
                      · {s.employeeName || (s as any).cashierName || 'المتجر'} ({s.customerName || 'نقدي'})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {(s as any).time || s.date?.slice(11, 16) || 'الآن'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>نظام لمسة عطر السحابي الآمن</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerLiveAlertsRadarModal;
