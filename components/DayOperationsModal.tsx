import React, { useState, useMemo } from 'react';
import {
  DailyClosure,
  AppUser,
  Sale,
  Expense,
  AuditLogRecord,
  Product,
  StoreSettings,
  CustomCustomerRecord,
  isActualPaidOperationalExpense,
  isLiveProductionSale,
  calculateCashDrawerReconciliation,
  calculateDailyAccountingSeparation,
} from '../types';
import {
  buildDailyClosingReport,
  buildWhatsAppDirectUrl,
  executeFreeWhatsAppAutomation,
  upsertAutomatedReport,
  flushOfflineReportQueue,
} from '../services/workspaceReportService';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  X,
  ShieldAlert,
  MessageCircle,
  Smartphone,
  Mail,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

interface DayOperationsModalProps {
  currentClosure: DailyClosure | null;
  currentUser: AppUser | null;
  sales: Sale[];
  expenses: Expense[];
  products?: Product[];
  settings?: StoreSettings;
  auditLogs?: AuditLogRecord[];
  customCustomers?: CustomCustomerRecord[];
  onSaveClosure: (closure: DailyClosure) => void;
  onAddAuditLog: (log: AuditLogRecord) => void;
  onClose: () => void;
  onOpenDailyReportAutomation?: () => void;
  onSendSmartNotification?: (title: string, subtitle?: string, badgeText?: string) => void;
  currency?: string;
}

const DayOperationsModal: React.FC<DayOperationsModalProps> = ({
  currentClosure,
  currentUser,
  sales,
  expenses,
  products = [],
  settings,
  auditLogs = [],
  customCustomers = [],
  onSaveClosure,
  onAddAuditLog,
  onClose,
  onOpenDailyReportAutomation,
  onSendSmartNotification,
  currency = 'ج.م',
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOwner = currentUser?.role === 'OWNER';

  const [openingCashInput, setOpeningCashInput] = useState<number>(
    currentClosure?.openingCashBalance ?? 0
  );
  const [actualCashDrawerInput, setActualCashDrawerInput] = useState<number | ''>('');
  const [closureNotes, setClosureNotes] = useState('');

  // WhatsApp & Email Auto-Dispatch on Closure
  const [autoDispatchWhatsAppOnClose, setAutoDispatchWhatsAppOnClose] = useState<boolean>(
    settings?.whatsappAutoSendOnClosure !== false
  );
  const [selectedWhatsAppTarget, setSelectedWhatsAppTarget] = useState<
    '01123376728' | '01062018755' | 'both'
  >('both');
  const [copiedWaText, setCopiedWaText] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Calculations for today's actual live production sales and expenses (Test Data ≠ Production Data)
  const todaysSales = sales.filter((s) => s.date.startsWith(todayStr) && isLiveProductionSale(s));
  const cashSales = todaysSales
    .filter((s) => !s.paymentMethod || s.paymentMethod === 'نقدي')
    .reduce((sum, s) => sum + s.totalPrice, 0);

  const electronicSales = todaysSales
    .filter((s) => s.paymentMethod && s.paymentMethod !== 'نقدي')
    .reduce((sum, s) => sum + s.totalPrice, 0);

  const totalSalesRevenue = cashSales + electronicSales;

  // §36 & §93: فقط المصروفات النقدية اليومية المدفوعة فعلياً من الدرج (دون خلط موازنة الـ 15,000 الشهرية أبداً)
  const todaysExpenses = expenses.filter(
    (e) => e.date === todayStr && isActualPaidOperationalExpense(e)
  );
  const todaysExpensesTotal = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);

  const openingCash = currentClosure?.openingCashBalance || 0;
  const drawerReconciliation = calculateCashDrawerReconciliation({
    openingBalance: openingCash,
    cashSales,
    cashExpensesPaidFromDrawer: todaysExpensesTotal,
    actualCashCounted:
      actualCashDrawerInput === '' ? undefined : Number(actualCashDrawerInput),
  });
  const expectedCashInDrawer = drawerReconciliation.expectedCash;
  const actualCash = drawerReconciliation.actualCash;
  const cashDifference = drawerReconciliation.cashDifference;

  // §37 & §57: حساب نتيجة اليوم وفق الموازنة بشكل منفصل ومستقل تماماً عن الخزنة
  const todaysProductCost = todaysSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const todaysCommissions = todaysSales.reduce(
    (sum, s) => sum + (s.commissionAmount ?? Math.round((s.totalPrice || 0) * 0.05)),
    0
  );
  const dailyAccounting = calculateDailyAccountingSeparation({
    netSales: totalSalesRevenue,
    productCost: todaysProductCost,
    commissions: todaysCommissions,
    plannedDailyAllocation: 600,
    actualCashExpensesPaidToday: todaysExpensesTotal,
  });

  const isDayOpen = currentClosure?.status === 'مفتوح';
  const isDayClosed = currentClosure?.status === 'مغلق';

  const primaryPhone = settings?.storeWhatsAppPrimary || '01123376728';
  const secondaryPhone = settings?.storeWhatsAppSecondary || '01062018755';

  // Live closure report preview for WhatsApp & Email dispatch
  const liveClosureReport = useMemo(() => {
    const previewClosure: DailyClosure = currentClosure
      ? {
          ...currentClosure,
          status: 'مغلق',
          actualCashInDrawer:
            currentClosure.status === 'مغلق' ? currentClosure.actualCashInDrawer : actualCash,
          cashSalesTotal: cashSales,
          electronicSalesTotal: electronicSales,
          totalSalesRevenue,
          totalExpensesPaidFromDrawer: todaysExpensesTotal,
          expectedCashInDrawer,
          cashDifference:
            currentClosure.status === 'مغلق' ? currentClosure.cashDifference : cashDifference,
          notes: closureNotes || currentClosure.notes,
        }
      : {
          id: `close-${todayStr}`,
          date: todayStr,
          status: 'مغلق',
          openedAt: new Date().toLocaleTimeString('ar-EG'),
          openedBy: currentUser?.displayName || 'طارق',
          openingCashBalance: openingCash,
          actualCashInDrawer: actualCash,
          cashDifference,
        };

    return buildDailyClosingReport({
      targetDate: todayStr,
      triggerType: 'day_closure',
      sales,
      expenses,
      products,
      settings,
      currentClosure: previewClosure,
      auditLogs,
      customCustomers,
      executedBy: currentUser?.displayName || 'طارق',
    });
  }, [
    todayStr,
    currentClosure,
    actualCash,
    cashSales,
    electronicSales,
    totalSalesRevenue,
    todaysExpensesTotal,
    expectedCashInDrawer,
    cashDifference,
    closureNotes,
    openingCash,
    currentUser,
    sales,
    expenses,
    products,
    settings,
    auditLogs,
    customCustomers,
  ]);

  const whatsappMessage =
    liveClosureReport.whatsappFormattedMessage || liveClosureReport.plainTextBody;
  const waUrlPrimary = buildWhatsAppDirectUrl(primaryPhone, whatsappMessage);
  const waUrlSecondary = buildWhatsAppDirectUrl(secondaryPhone, whatsappMessage);

  // Handle Open Day
  const handleOpenDay = () => {
    const newClosure: DailyClosure = {
      id: `close-${todayStr}`,
      date: todayStr,
      status: 'مفتوح',
      openedAt: new Date().toLocaleTimeString('ar-EG'),
      openedBy: currentUser?.displayName || 'مسؤول الوردية',
      openingCashBalance: Number(openingCashInput),
      dataClassification: 'PRODUCTION',
    };

    onSaveClosure(newClosure);

    onAddAuditLog({
      id: `audit-open-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.displayName || 'المستخدم',
      action: 'فتح يوم',
      entityType: 'closure',
      entityId: newClosure.id,
      entityName: `يوم ${todayStr}`,
      oldValue: 'مغلق',
      newValue: `مفتوح برصيد ${openingCashInput} ${currency}`,
      reason: 'افتتاح يوم تشغيل ومبيعات جديد',
      category: 'إغلاق_يومي',
      device: navigator.userAgent,
    });

    onClose();
  };

  // Handle Close Day + Automatic WhatsApp & Email Dispatch
  const handleCloseDay = async () => {
    if (!currentClosure) return;

    const finalClosure: DailyClosure = {
      ...currentClosure,
      status: 'مغلق',
      closedAt: new Date().toLocaleTimeString('ar-EG'),
      closedBy: currentUser?.displayName || 'مسؤول التشغيل',
      actualCashInDrawer: actualCash,
      cashSalesTotal: cashSales,
      electronicSalesTotal: electronicSales,
      totalSalesRevenue,
      totalExpensesPaidFromDrawer: todaysExpensesTotal,
      expectedCashInDrawer,
      cashDifference,
      notes: closureNotes,
    };

    onSaveClosure(finalClosure);

    onAddAuditLog({
      id: `audit-close-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.displayName || 'المستخدم',
      action: 'إغلاق يوم',
      entityType: 'closure',
      entityId: finalClosure.id,
      entityName: `يوم ${todayStr}`,
      oldValue: 'مفتوح',
      newValue: `إغلاق اليوم - مبيعات ${totalSalesRevenue} ج - جرد نقدي ${actualCash} ج (فرق: ${cashDifference} ج)`,
      reason: closureNotes || 'إغلاق اليوم التشغيلي واعتماد النقدية',
      category: 'إغلاق_يومي',
      device: navigator.userAgent,
    });

    const finalReport = buildDailyClosingReport({
      targetDate: todayStr,
      triggerType: 'day_closure',
      sales,
      expenses,
      products,
      settings,
      currentClosure: finalClosure,
      auditLogs,
      customCustomers,
      executedBy: currentUser?.displayName || 'طارق',
    });

    upsertAutomatedReport({
      ...finalReport,
      status: navigator.onLine ? 'pending_auth' : 'queued_offline',
      whatsappStatus: 'opened_direct',
      whatsappSentAt: new Date().toISOString(),
    });

    if (autoDispatchWhatsAppOnClose) {
      await executeFreeWhatsAppAutomation(finalReport, settings);
      setCopiedWaText(true);
      setTimeout(() => setCopiedWaText(false), 3000);
    }

    if (navigator.onLine) {
      flushOfflineReportQueue(
        settings?.googleFormId,
        settings?.googleFormWebhookUrl,
        settings
      ).catch(() => {});
    }

    if (onSendSmartNotification) {
      onSendSmartNotification(
        `تم إغلاق يوم التشغيل (${todayStr}) وتجهيز تقرير واتساب طارق`,
        `إجمالي المبيعات: ${totalSalesRevenue.toLocaleString('ar-EG')} ${currency} · واتساب: ${primaryPhone} / ${secondaryPhone}`,
        'إغلاق اليوم ✓'
      );
    }
  };

  // Handle Re-open Day (Owner only)
  const handleReopenDay = () => {
    if (!isOwner) return;
    if (!reopenReason.trim()) {
      setReopenError('يجب كتابة سبب إداري معتمد لإعادة فتح اليوم المغلق لتوثيقه في سجل التدقيق.');
      return;
    }

    if (!currentClosure) return;

    const reopened: DailyClosure = {
      ...currentClosure,
      status: 'مفتوح',
      reopenedAt: new Date().toISOString(),
      reopenedBy: currentUser?.displayName || 'د. محمد (المالك)',
      reopenReason: reopenReason.trim(),
    };

    onSaveClosure(reopened);

    onAddAuditLog({
      id: `audit-reopen-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.displayName || 'د. محمد',
      action: 'إعادة فتح يوم',
      entityType: 'closure',
      entityId: reopened.id,
      entityName: `يوم ${todayStr}`,
      oldValue: 'مغلق',
      newValue: 'مفتوح باستثناء المالك',
      reason: reopenReason.trim(),
      approvedBy: currentUser?.displayName,
      category: 'إغلاق_يومي',
      device: navigator.userAgent,
    });

    setShowReopenConfirm(false);
    setReopenError(null);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        className={`smart-modal-window apple-glass rounded-[28px] p-4 sm:p-5 w-full ${
          !currentClosure || (!isDayOpen && !isDayClosed) ? 'max-w-md' : 'max-w-3xl'
        } border border-white/60 shadow-2xl space-y-3.5 overflow-hidden bg-white/95`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                isDayOpen
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                إدارة يوم التشغيل وأتمتة الإغلاق ({todayStr})
              </h3>
              <p className="text-[11px] text-[#86868B]">
                الحالة الحالية:{' '}
                <span className="font-bold text-[#1D1D1F]">
                  {currentClosure?.status || 'لم يفتتح بعد'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B] transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* CASE 1: DAY NOT OPEN YET */}
        {(!currentClosure || (!isDayOpen && !isDayClosed)) && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/60 text-xs text-blue-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Clock size={15} className="text-blue-600" />
                <span>افتتاح وردية ويوم عمل جديد</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                يتم تسجيل الرصيد النقدي الافتتاحي في درج الكاشير قبل بدء المبيعات لضمان صحة الجرد عند نهاية اليوم.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1D1D1F] block text-right">
                النقدية الافتتاحية في الدرج (الفكة / الصندوق):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(Number(e.target.value))}
                  placeholder="0"
                  className="w-full h-10 px-4 pl-12 rounded-xl bg-white border border-black/[0.08] focus:border-[#0071E3] font-mono text-sm font-bold outline-none text-right"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#86868B]">
                  {currency}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenDay}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock size={15} />
              <span>تأكيد افتتاح يوم العمل والدرج</span>
            </button>
          </div>
        )}

        {/* CASE 2: DAY IS CURRENTLY OPEN -> 2-COLUMN ZERO-SCROLL BENTO */}
        {isDayOpen && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            {/* Right Column (7 cols): Shift Status + 4 KPIs + Cash Drawer Input */}
            <div className="md:col-span-7 flex flex-col justify-between gap-2.5">
              <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 text-xs text-emerald-950 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>مفتوحة بواسطة: {currentClosure.openedBy}</span>
                </span>
                <span className="font-mono text-[11px] text-emerald-800 font-bold">
                  افتتاحي: {currentClosure.openingCashBalance} {currency} ({currentClosure.openedAt})
                </span>
              </div>

              {/* 4 KPIs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06]">
                  <span className="text-[#86868B] block text-[10px]">مبيعات نقدية</span>
                  <span className="font-black text-emerald-700 font-mono text-xs sm:text-sm">
                    {cashSales} {currency}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06]">
                  <span className="text-[#86868B] block text-[10px]">إلكترونية</span>
                  <span className="font-black text-blue-700 font-mono text-xs sm:text-sm">
                    {electronicSales} {currency}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06]">
                  <span className="text-[#86868B] block text-[10px]">فواتير اليوم</span>
                  <span className="font-black text-[#1D1D1F] font-mono text-xs sm:text-sm">
                    {todaysSales.length} فاتورة
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06]">
                  <span className="text-[#86868B] block text-[10px]">مصاريف الدرج</span>
                  <span className="font-black text-rose-700 font-mono text-xs sm:text-sm">
                    {todaysExpensesTotal} {currency}
                  </span>
                </div>
              </div>

              {/* Cash Drawer Reconciliation */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-amber-950 block">الرصيد المتوقع بالدرج (منفصل عن المساهمة والربح وTarget):</span>
                    <span className="text-[10px] text-amber-800">
                      (الرصيد الافتتاحي {openingCash} + المبيعات النقدية {cashSales} ← المصروفات النقدية المسجلة {todaysExpensesTotal})
                    </span>
                  </div>
                  <span className="font-black font-mono text-base text-amber-900">
                    {expectedCashInDrawer} {currency}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-amber-200/40">
                  <label className="text-[11px] font-bold text-[#1D1D1F] shrink-0">
                    الجرد الفعلي بالدرج:
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={actualCashDrawerInput}
                      onChange={(e) =>
                        setActualCashDrawerInput(
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      placeholder={`${expectedCashInDrawer}`}
                      className="w-full h-9 px-3 pl-10 rounded-xl bg-white border border-amber-300 font-mono text-xs font-black outline-none text-right"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#86868B]">
                      {currency}
                    </span>
                  </div>
                  {actualCashDrawerInput !== '' && (
                    <span
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-black shrink-0 ${
                        cashDifference === 0
                          ? 'bg-emerald-100 text-emerald-900'
                          : cashDifference > 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {drawerReconciliation.statusBadgeAr}
                    </span>
                  )}
                </div>
                {actualCashDrawerInput !== '' && cashDifference !== 0 && (
                  <p className="text-[10px] font-bold text-amber-900 bg-white/70 px-2.5 py-1 rounded-lg border border-amber-200/60">
                    {drawerReconciliation.accountingNoteAr}
                  </p>
                )}
              </div>

              {/* §37 & §57: Daily Accounting Separation & Budget Result (Separate from Cash Drawer) */}
              {isOwner && (
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between font-black text-indigo-950">
                    <span>نتيجة التشغيل وفق الموازنة (مستقلة عن الخزنة):</span>
                    <span className="font-mono">
                      {todaysSales.length === 0
                        ? '⚪ لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم'
                        : dailyAccounting.resultStatusBadgeAr}
                    </span>
                  </div>
                  {todaysSales.length === 0 ? (
                    <div className="p-2 rounded-xl bg-white/90 border border-indigo-100 text-[11px] font-bold text-indigo-900 text-center">
                      لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم — المخصص التخطيطي اليومي (600 {currency}) هو رقم تخطيطي وليس مصروفاً نقدياً أو حركة مالية.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5 text-[10px] pt-1">
                      <div className="p-1.5 rounded-lg bg-white border border-indigo-100">
                        <span className="block text-[#86868B]">تكلفة المنتجات</span>
                        <span className="font-mono font-black text-[#1D1D1F]">{dailyAccounting.productCost} {currency}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-indigo-100">
                        <span className="block text-[#86868B]">العمولة المتغيرة</span>
                        <span className="font-mono font-black text-[#1D1D1F]">{dailyAccounting.commissions} {currency}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-indigo-100">
                        <span className="block text-[#86868B]">المساهمة</span>
                        <span className="font-mono font-black text-emerald-700">{dailyAccounting.contribution} {currency}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-indigo-100">
                        <span className="block text-[#86868B]">المخصص التخطيطي</span>
                        <span className="font-mono font-black text-indigo-700">
                          {dailyAccounting.plannedDailyAllocation} {currency}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Left Column (5 cols): Notes + WhatsApp/Email Automation + Close Button */}
            <div className="md:col-span-5 flex flex-col justify-between gap-2.5">
              <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300/80 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoDispatchWhatsAppOnClose}
                    onChange={(e) => setAutoDispatchWhatsAppOnClose(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded shrink-0 mt-0.5"
                  />
                  <span className="text-[11px] font-black text-emerald-950 leading-snug">
                    أتمتة إرسال تقرير إغلاق اليوم مباشرة لواتساب طارق ({primaryPhone} / {secondaryPhone}) مع التقرير البريدي
                  </span>
                </label>

                {autoDispatchWhatsAppOnClose && (
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedWhatsAppTarget('01123376728')}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer ${
                        selectedWhatsAppTarget === '01123376728'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-emerald-900 border-emerald-200'
                      }`}
                    >
                      {primaryPhone}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWhatsAppTarget('01062018755')}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer ${
                        selectedWhatsAppTarget === '01062018755'
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-teal-900 border-teal-200'
                      }`}
                    >
                      {secondaryPhone}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWhatsAppTarget('both')}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        selectedWhatsAppTarget === 'both'
                          ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                          : 'bg-white text-[#1D1D1F] border-black/10'
                      }`}
                    >
                      كلا الرقمين ✓
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#86868B] block text-right">
                  ملاحظات الإغلاق (اختياري):
                </label>
                <input
                  type="text"
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="أية ملاحظات بخصوص الوردية أو فرق النقدية..."
                  className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.08] text-xs outline-none text-right"
                />
              </div>

              <button
                type="button"
                onClick={handleCloseDay}
                className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock size={15} />
                <span>إغلاق يوم التشغيل واعتماد الجرد وإرسال التقرير</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE 3: DAY IS ALREADY CLOSED -> 2-COLUMN ZERO-SCROLL SUMMARY & WHATSAPP HUB */}
        {isDayClosed && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            {/* Right Column (6 cols): Closed Shift Summary & Owner Re-open */}
            <div className="md:col-span-6 flex flex-col justify-between gap-2.5">
              <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06]">
                  <span className="font-black text-rose-700 flex items-center gap-1.5">
                    <Lock size={14} />
                    <span>اليوم مغلق ومرحل رسمياً</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#86868B]">{currentClosure.closedAt}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#1D1D1F]">
                  <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                    <span className="text-[#86868B] block text-[10px]">أُغلق بواسطة</span>
                    <span className="font-bold">{currentClosure.closedBy}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                    <span className="text-[#86868B] block text-[10px]">مبيعات اليوم</span>
                    <span className="font-black font-mono">
                      {currentClosure.totalSalesRevenue} {currency}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                    <span className="text-[#86868B] block text-[10px]">الجرد الفعلي</span>
                    <span className="font-black font-mono">
                      {currentClosure.actualCashInDrawer} {currency}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                    <span className="text-[#86868B] block text-[10px]">فارق الدرج</span>
                    <span
                      className={`font-black font-mono ${
                        (currentClosure.cashDifference || 0) < 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {currentClosure.cashDifference || 0} {currency}
                    </span>
                  </div>
                </div>
              </div>

              {isOwner ? (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between text-amber-900 font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-amber-600" />
                      <span>صلاحية د. محمد: إعادة فتح يوم مغلق</span>
                    </span>
                    {!showReopenConfirm && (
                      <button
                        type="button"
                        onClick={() => setShowReopenConfirm(true)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[10px] font-black cursor-pointer"
                      >
                        إعادة فتح اليوم
                      </button>
                    )}
                  </div>

                  {showReopenConfirm && (
                    <div className="space-y-1.5 pt-1 border-t border-amber-200">
                      <input
                        type="text"
                        value={reopenReason}
                        onChange={(e) => {
                          setReopenReason(e.target.value);
                          setReopenError(null);
                        }}
                        placeholder="اكتب سبب إعادة الفتح الإلزامي للتوثيق..."
                        className="w-full h-8 px-2.5 rounded-xl bg-white border border-amber-300 text-xs outline-none text-right"
                      />
                      {reopenError && (
                        <p className="text-[10px] text-rose-600 font-bold">{reopenError}</p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowReopenConfirm(false)}
                          className="flex-1 py-1.5 rounded-lg border border-black/[0.08] text-[11px] font-bold text-[#1D1D1F] cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={handleReopenDay}
                          className="flex-2 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          تأكيد إعادة الفتح
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-black/[0.03] text-center text-[11px] text-[#86868B]">
                  🔒 إعادة فتح اليوم المغلق متاحة فقط بصلاحية د. محمد.
                </div>
              )}
            </div>

            {/* Left Column (6 cols): Direct WhatsApp & Email Dispatch Hub */}
            <div className="md:col-span-6 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-300 flex flex-col justify-between gap-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>إرسال تقرير الإغلاق لواتساب طارق والبريد</span>
                  </span>
                  {copiedWaText && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      تم النسخ ✓
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#48484A] leading-relaxed">
                  أرسل تقرير إغلاق اليوم المنسق مباشرة إلى رقم واتساب المتجر الرسمي لطارق (
                  <strong dir="ltr">{primaryPhone}</strong> أو{' '}
                  <strong dir="ltr">{secondaryPhone}</strong>) مع التقرير البريدي:
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={waUrlPrimary}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => executeFreeWhatsAppAutomation(liveClosureReport, settings)}
                    className="apple-btn py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs no-underline"
                  >
                    <MessageCircle size={14} />
                    <span>واتساب 1 ({primaryPhone})</span>
                  </a>

                  <a
                    href={waUrlSecondary}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => executeFreeWhatsAppAutomation(liveClosureReport, settings)}
                    className="apple-btn py-2.5 px-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs no-underline"
                  >
                    <Smartphone size={14} />
                    <span>واتساب 2 ({secondaryPhone})</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappMessage);
                      setCopiedWaText(true);
                      setTimeout(() => setCopiedWaText(false), 2000);
                    }}
                    className="apple-btn py-2 px-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedWaText ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedWaText ? 'تم النسخ!' : 'نسخ واتساب'}</span>
                  </button>

                  {onOpenDailyReportAutomation && (
                    <button
                      type="button"
                      onClick={onOpenDailyReportAutomation}
                      className="apple-btn py-2 px-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Mail size={13} />
                      <span>البريد + Google Forms</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayOperationsModal;
