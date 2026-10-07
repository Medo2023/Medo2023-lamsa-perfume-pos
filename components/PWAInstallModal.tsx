import React from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  Laptop, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  Sparkles, 
  Wifi, 
  Zap, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        dir="rtl"
        className="relative w-full max-w-lg rounded-3xl bg-white border border-[#C49746]/40 shadow-2xl p-5 sm:p-6 space-y-5 apple-glass overflow-hidden text-slate-900"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] border border-amber-400/30 flex items-center justify-center shadow-lg p-1.5 shrink-0">
              <img 
                src="/pwa-192x192.png" 
                alt="شعار لمسة عطر" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>تثبيت لمسة عطر كتطبيق مستقل</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold">
                  PWA APP
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                يعمل على الموبايل (iPhone & Android) واللاب توب والكمبيوتر والتابلت
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

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/70 space-y-1">
            <Zap size={16} className="text-amber-600 mx-auto" />
            <strong className="block text-[11px] text-amber-950 font-bold">سرعة خارقة</strong>
            <span className="text-[10px] text-amber-700 block">بدون أشرطة متصفح</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 space-y-1">
            <Wifi size={16} className="text-emerald-600 mx-auto" />
            <strong className="block text-[11px] text-emerald-950 font-bold">تزامن فوري</strong>
            <span className="text-[10px] text-emerald-700 block">سحابي حي 24/7</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200/70 space-y-1">
            <Layers size={16} className="text-blue-600 mx-auto" />
            <strong className="block text-[11px] text-blue-950 font-bold">كل الأجهزة</strong>
            <span className="text-[10px] text-blue-700 block">لاب توب وموبايل</span>
          </div>
        </div>

        {/* Status: Already Installed */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center space-y-2">
            <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
            <strong className="text-sm text-emerald-950 block font-black">
              التطبيق مثبت ويعمل حالياً كبرنامج أصيل على جهازك! ✓
            </strong>
            <p className="text-xs text-emerald-800">
              أنت الآن في وضع التطبيق المستقل (Standalone App). يتم حفظ البيانات وتحديثها تلقائياً.
            </p>
          </div>
        ) : (
          <>
            {/* 1-Click Install Button (When browser supports beforeinstallprompt: Chrome, Edge, Android, Desktop) */}
            {isInstallable && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-emerald-500/15 border border-amber-400/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-sm text-slate-900 block font-black">
                      جاهز للتثبيت بنقرة واحدة
                    </strong>
                    <span className="text-xs text-slate-600">
                      سيتم تثبيت أيقونة التطبيق على شاشتك الرئيسية أو سطح المكتب فوراً
                    </span>
                  </div>
                  <Sparkles size={20} className="text-amber-600" />
                </div>

                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-2xl bg-[#1D1D1F] hover:bg-black text-amber-300 font-black text-sm transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                >
                  <Download size={18} className="text-amber-300" />
                  <span>تثبيت التطبيق على هذا الجهاز الآن</span>
                </button>
              </div>
            )}

            {/* iOS Safari Guided Steps */}
            {isIOS && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-black text-slate-900">
                  <Smartphone size={16} className="text-blue-600" />
                  <span>طريقة التثبيت على الآيفون والآيباد (iOS Safari):</span>
                </div>

                <ol className="space-y-2 text-slate-700 pr-4 list-decimal text-[11px] leading-relaxed">
                  <li>
                    اضغط على زر <strong>المشاركة (Share)</strong>{' '}
                    <Share2 size={13} className="inline text-blue-600 mx-1" /> أسفل متصفح Safari.
                  </li>
                  <li>
                    مرر لأسفل واختر{' '}
                    <strong>«إضافة إلى الصفحة الرئيسية» (Add to Home Screen)</strong>{' '}
                    <PlusSquare size={13} className="inline text-slate-800 mx-1" />.
                  </li>
                  <li>
                    اضغط على <strong>«إضافة» (Add)</strong> في أعلى الزاوية.
                  </li>
                </ol>

                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[10.5px]">
                  ✨ ستظهر أيقونة <strong>«لمسة عطر»</strong> على شاشة هاتفك وتفتح كتطبيق كامل بدون أشرطة متصفح.
                </div>
              </div>
            )}

            {/* Desktop / Laptop Guide */}
            {!isIOS && !isInstallable && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 font-black text-slate-900">
                  <Laptop size={16} className="text-[#0071E3]" />
                  <span>للتثبيت على الكمبيوتر واللاب توب (Chrome أو Edge):</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  اضغط على أيقونة التثبيت الصغيرة <Download size={12} className="inline text-[#0071E3] mx-1" /> الموجودة في شريط العنوان أعلى المتصفح (Address Bar)، ثم اضغط <strong>«تثبيت» (Install)</strong> لتشغيله كنافذة برنامج مستقل.
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>نظام لمسة عطر المتوافق مع جميع الشاشات</span>
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

export default PWAInstallModal;
