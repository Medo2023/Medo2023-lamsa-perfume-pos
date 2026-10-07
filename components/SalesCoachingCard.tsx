import React, { useState, useMemo } from 'react';
import { AppUser, StaffAttendanceRecord } from '../types';
import { getTickerNotificationTheme, TickerNotificationKind } from './ExecutiveHeaderBar';
import { 
  Sparkles, 
  Package, 
  Pause,
  Play
} from 'lucide-react';

interface SalesCoachingCardProps {
  currentUser?: AppUser | null;
  attendanceRecords?: StaffAttendanceRecord[];
  onCheckInAttendance?: (record: StaffAttendanceRecord) => void;
  todaysSalesCount: number;
  todaysSalesRevenue: number;
  cartItemsCount?: number;
  cartFinalTotal?: number;
  isShiftReady?: boolean;
  onStartWork?: () => void;
  onOpenSmartSearch?: () => void;
  onOpenReplenishmentModal?: () => void;
  strategicShortagesCount?: number;
  currency?: string;
}

interface SmartTickerItem {
  id: string;
  type: TickerNotificationKind;
  tag: string;
  text: string;
}

const SalesCoachingCard: React.FC<SalesCoachingCardProps> = ({
  todaysSalesCount,
  todaysSalesRevenue,
  cartItemsCount = 0,
  cartFinalTotal = 0,
  isShiftReady = false,
  onOpenSmartSearch,
  onOpenReplenishmentModal,
  strategicShortagesCount = 0,
  currency = 'ج.م',
}) => {
  const [isPaused, setIsPaused] = useState(false);

  // Build real-time event-driven instructions & curated sales tips classified by notification type
  const tickerItems = useMemo<SmartTickerItem[]>(() => {
    const items: SmartTickerItem[] = [];

    // 1. Real-time Shift Status (error = red if closed, success = green if active)
    if (!isShiftReady) {
      items.push({
        id: 'shift-alert',
        type: 'error',
        tag: 'تنبيه الوردية',
        text: 'ابدأ يومك بالضغط على زر «بدء العمل» لتسجيل الحضور الآلي وتفعيل عداد الراتب وفحص النواقص.',
      });
    } else {
      items.push({
        id: 'shift-ready',
        type: 'success',
        tag: 'حالة النظام',
        text: 'الوردية نشطة ومفتوحة — جميع الفواتير والعمولات وحركة المخزون بالجرام تُحفظ وتُزامن فورياً مع السحابة.',
      });
    }

    // 2. Real-time Cart / Cashier Step Guidance
    if (cartItemsCount === 0) {
      items.push({
        id: 'cashier-step-1',
        type: 'info',
        tag: 'دليل الكاشير',
        text: 'لإصدار فاتورة سريعة: ابحث عن العطر واضغط زر «+ 50 مل سريع» للإضافة الفورية، أو انقر على البطاقة لتخصيص الحجم.',
      });
    } else {
      items.push({
        id: 'cashier-step-2',
        type: 'success',
        tag: 'الفاتورة الحالية',
        text: `يوجد الآن (${cartItemsCount}) أصناف في السلة بقيمة ${cartFinalTotal.toLocaleString('ar-EG')} ${currency} — حدد طريقة السداد ثم اضغط «إصدار وطباعة الفاتورة».`,
      });
    }

    // 3. Real-time Sales Performance Event
    if (todaysSalesCount > 0) {
      items.push({
        id: 'live-sales',
        type: 'success',
        tag: 'إنجاز المبيعات',
        text: `تم إصدار ${todaysSalesCount} فاتورة اليوم بإجمالي مبيعات ${todaysSalesRevenue.toLocaleString('ar-EG')} ${currency} — استمر في اقتراح الأحجام الأكبر (50 و 100 مل).`,
      });
    } else {
      items.push({
        id: 'first-sale-tip',
        type: 'info',
        tag: 'انطلاقة اليوم',
        text: 'استخدم «مستشار العطور الذكي» لترشيح أفضل 3 عطور حسب المناسبة والطقس في ثوانٍ.',
      });
    }

    // 4. Real-time Inventory & Shortage Alert
    if (strategicShortagesCount > 0) {
      items.push({
        id: 'shortage-alert',
        type: 'error',
        tag: 'تنبيه مخزون',
        text: `يوجد (${strategicShortagesCount}) صنف عطري وصل للحد الأدنى — اضغط على «النواقص» لمراجعتها وتجهيز طلبية التوريد.`,
      });
    }

    // 5. Curated Golden Perfume Sales Info
    items.push(
      {
        id: 'tip-layering',
        type: 'info',
        tag: 'معلومة بيعية',
        text: 'ارفع قيمة الفاتورة عبر الـ Layering: عند اختيار عطر فرنسي، اقترح ربع تولة مسك أبيض كقاعدة تثبيت تضاعف الفوحان.',
      },
      {
        id: 'tip-target-booster',
        type: 'info',
        tag: 'تحقيق التارجت',
        text: 'التركيز على عبوات 30 مل (+46.5ج مساهمة) و50 مل (+38.5ج) و100 مل (+182.5ج) يسرع تغطية تارجت الـ 600 ج وتفعيل عمولة 7% بعد 10 عبوات.',
      }
    );

    return items;
  }, [isShiftReady, cartItemsCount, cartFinalTotal, todaysSalesCount, todaysSalesRevenue, strategicShortagesCount, currency]);

  // Duplicate list once for seamless infinite right-scrolling loop
  const marqueeLoopItems = useMemo(() => [...tickerItems, ...tickerItems], [tickerItems]);

  return (
    <div
      aria-label="شريط الإرشادات والأحداث الذكي المتحرك"
      className="apple-glass rounded-2xl px-2.5 py-1.5 border border-black/[0.07] shadow-apple-sm flex items-center justify-between gap-2 overflow-hidden"
    >
      {/* Right Anchor Badge */}
      <div className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-xl bg-[#1D1D1F] text-white shrink-0 z-10 shadow-2xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]"></span>
        </span>
        <span className="text-[11px] font-black tracking-tight text-amber-300 whitespace-nowrap">
          الإشعارات الذكية
        </span>
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer mr-0.5"
          title={isPaused ? 'تشغيل حركة الشريط' : 'إيقاف مؤقت للقراءة'}
        >
          {isPaused ? <Play size={10} className="fill-white" /> : <Pause size={10} />}
        </button>
      </div>

      {/* Center: Smooth Right-Scrolling Real-Time Ticker Track */}
      <div
        dir="ltr"
        className="flex-1 overflow-hidden relative apple-ticker-mask py-0.5 select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={`apple-ticker-track-right items-center ${isPaused ? 'apple-ticker-paused' : ''}`}>
          {marqueeLoopItems.map((item, idx) => {
            const theme = getTickerNotificationTheme(item.type);
            return (
              <div
                key={`${item.id}-${idx}`}
                dir="rtl"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 mx-1.5 rounded-xl border transition-colors shrink-0 ${theme.containerBg}`}
              >
                {theme.icon}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${theme.badgeBg}`}>
                  {item.tag}
                </span>
                <span className={`text-[11px] whitespace-nowrap tracking-tight ${theme.textColor}`}>
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Left Compact Quick Actions */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0 z-10 pr-1">
        {onOpenSmartSearch && (
          <button
            type="button"
            onClick={onOpenSmartSearch}
            className="apple-btn px-2.5 py-1 rounded-xl bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            title="فتح مستشار العطور الذكي بالمناسبة"
          >
            <Sparkles size={12} />
            <span>مستشار العطور</span>
          </button>
        )}

        {onOpenReplenishmentModal && (
          <button
            type="button"
            onClick={onOpenReplenishmentModal}
            className="apple-btn px-2.5 py-1 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            title="فاتورة النواقص الاستراتيجية"
          >
            <Package size={12} className="text-[#9A6E23]" />
            <span>النواقص</span>
            {strategicShortagesCount > 0 && (
              <span className="font-mono text-[10px] font-black text-[#FF3B30]">
                ({strategicShortagesCount})
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default SalesCoachingCard;
