import React, { useState, useMemo } from 'react';
import {
  StoreSettings,
  BottleSize,
  Sale,
  Expense,
  buildCommercialReferenceRow,
  run20MandatoryAcceptanceTests,
  calculateDailyAccountingSeparation,
  calculateCashDrawerReconciliation,
  MonthlyArchiveRecord,
  isActualPaidOperationalExpense,
  isLiveProductionSale,
  isTestOrExampleRecord,
  ISOLATED_ACCEPTANCE_TEST_001,
} from '../types';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Clock, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  DollarSign, 
  Users, 
  Sparkles, 
  Package, 
  PieChart, 
  BookOpen, 
  Award, 
  Briefcase, 
  Send,
  HelpCircle,
  Layers,
  ArrowRight,
  ChevronDown
} from 'lucide-react';

interface OperationsSystemProps {
  settings: StoreSettings;
  bottleSizes: BottleSize[];
  sales: Sale[];
  expenses: Expense[];
  onUpdateTarget?: (target: number) => void;
}

export const OperationsSystem: React.FC<OperationsSystemProps> = ({
  settings,
  bottleSizes,
  sales,
  expenses,
  onUpdateTarget
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'target600'
    | 'target1000'
    | 'weekly_plan'
    | 'staff_roles'
    | 'field_work'
    | 'whatsapp'
    | 'accounting_vault'
    | 'red_team'
    | 'acceptance_tests_20'
    | 'monthly_archive'
  >('overview');

  // §92: Live 20 Mandatory Acceptance Tests
  const acceptanceTests = useMemo(() => run20MandatoryAcceptanceTests(), []);
  const passedTestsCount = useMemo(
    () => acceptanceTests.filter((t) => t.passed).length,
    [acceptanceTests]
  );

  // §93: Isolated Acceptance Test Case TEST-001 (Strictly isolated in Acceptance Tests tab: Test Data ≠ Production Data)
  const correctiveExampleDay = useMemo(
    () =>
      calculateDailyAccountingSeparation({
        netSales: ISOLATED_ACCEPTANCE_TEST_001.netSales,
        productCost: ISOLATED_ACCEPTANCE_TEST_001.productCost,
        commissions: ISOLATED_ACCEPTANCE_TEST_001.commissions,
        plannedDailyAllocation: ISOLATED_ACCEPTANCE_TEST_001.plannedDailyAllocation,
      }),
    []
  );
  const correctiveExampleDrawer = useMemo(
    () =>
      calculateCashDrawerReconciliation({
        openingBalance: ISOLATED_ACCEPTANCE_TEST_001.openingCashBalance,
        cashSales: ISOLATED_ACCEPTANCE_TEST_001.netSales,
        actualCashCounted: ISOLATED_ACCEPTANCE_TEST_001.actualCashCounted,
      }),
    []
  );

  // Count any historical test records that are preserved in storage but excluded from live production reports
  const preservedTestRecordsCount = useMemo(() => {
    const testSales = sales.filter((s) => isTestOrExampleRecord(s)).length;
    const testExps = expenses.filter((e) => !isActualPaidOperationalExpense(e)).length;
    return testSales + testExps;
  }, [sales, expenses]);

  // §16, §80–§82: Monthly Archive & Period Closing State
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedArchiveMonth, setSelectedArchiveMonth] = useState<string>(currentMonthKey);
  const [closedMonthsMap, setClosedMonthsMap] = useState<
    Record<
      string,
      {
        status: 'مفتوح' | 'مغلق_ومجمد';
        closedAt?: string;
        closedBy?: string;
        reopenedAt?: string;
        reopenedBy?: string;
        reopenReason?: string;
        whatWillChangeOnReopen?: string;
      }
    >
  >(() => {
    try {
      const saved = localStorage.getItem('lamsa_monthly_archives_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [reopenReasonInput, setReopenReasonInput] = useState('');
  const [reopenChangesInput, setReopenChangesInput] = useState('');
  const [reopenErrorMsg, setReopenErrorMsg] = useState('');

  const monthlyArchiveSummary = useMemo<MonthlyArchiveRecord>(() => {
    const mSales = sales.filter((s) => s.date.startsWith(selectedArchiveMonth) && isLiveProductionSale(s));
    const mExpenses = expenses.filter(
      (e) => e.date.startsWith(selectedArchiveMonth) && isActualPaidOperationalExpense(e)
    );
    const hasActualMonthTransactions = mSales.length > 0 || mExpenses.length > 0;
    const netSales = mSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalDiscounts = mSales.reduce(
      (acc, s) => acc + (s.discount || 0) + (s.loyaltyDiscountAmount || 0),
      0
    );
    const grossSales = netSales + totalDiscounts;
    const costOfGoodsSold = mSales.reduce((acc, s) => acc + s.totalCost, 0);
    const commissionsTotal = mSales.reduce(
      (acc, s) => acc + (s.commissionAmount ?? Math.round((s.totalPrice || 0) * 0.05)),
      0
    );
    const totalContribution = netSales - costOfGoodsSold - commissionsTotal;
    const fixedBudgetPlanned = settings.monthlyFixedBudget || 15000;
    const actualExpensesPaid = mExpenses.reduce((acc, e) => acc + e.amount, 0);
    const accruedExpensesUnpaid = hasActualMonthTransactions
      ? Math.max(0, fixedBudgetPlanned - actualExpensesPaid)
      : 0;
    const cashTotal = mSales
      .filter((s) => !s.paymentMethod || s.paymentMethod === 'نقدي')
      .reduce((acc, s) => acc + s.totalPrice, 0);
    const electronicTotal = mSales
      .filter((s) => s.paymentMethod && s.paymentMethod !== 'نقدي')
      .reduce((acc, s) => acc + s.totalPrice, 0);
    // لا تظهر نتائج مالية إلا من البيانات الفعلية المسجلة (السجل الشهري يبدأ من الرصيد الافتتاحي الحقيقي + المعاملات الفعلية فقط)
    const accountingNetProfitOrLoss = hasActualMonthTransactions ? totalContribution - actualExpensesPaid : 0;
    const budgetSafeOperatingResult = hasActualMonthTransactions ? totalContribution - fixedBudgetPlanned : 0;
    const safeDistributableProfit = hasActualMonthTransactions ? Math.max(0, budgetSafeOperatingResult) : 0;
    const meta = closedMonthsMap[selectedArchiveMonth] || { status: 'مفتوح' };

    return {
      id: `archive-${selectedArchiveMonth}`,
      monthKey: selectedArchiveMonth,
      monthLabelAr: selectedArchiveMonth,
      status: meta.status,
      openingCashBalance: 0,
      grossSales,
      totalDiscounts,
      netSales,
      costOfGoodsSold,
      commissionsTotal,
      totalContribution,
      fixedBudgetPlanned,
      actualExpensesPaid,
      accruedExpensesUnpaid,
      salariesPaid: mExpenses.filter((e) => e.category === 'رواتب').reduce((a, b) => a + b.amount, 0),
      salariesAccrued: hasActualMonthTransactions ? 11500 : 0,
      inventoryPurchases: 0,
      openingInventoryValue: 0,
      closingInventoryValue: 0,
      cashTotal,
      electronicTotal,
      ownerProfitWithdrawals: 0,
      capitalBalance: 0,
      loyaltyLiabilityEgp: 0,
      accountingNetProfitOrLoss,
      budgetSafeOperatingResult,
      safeDistributableProfit,
      targetBalance: hasActualMonthTransactions ? totalContribution - fixedBudgetPlanned : 0,
      accumulatedTargetDeficit: hasActualMonthTransactions ? Math.max(0, fixedBudgetPlanned - totalContribution) : 0,
      compensatoryDaysCount: 0,
      ...meta,
    };
  }, [sales, expenses, selectedArchiveMonth, settings, closedMonthsMap]);

  const handleCloseArchiveMonth = () => {
    const next = {
      ...closedMonthsMap,
      [selectedArchiveMonth]: {
        status: 'مغلق_ومجمد' as const,
        closedAt: new Date().toLocaleString('ar-EG'),
        closedBy: 'د. محمد (المالك)',
      },
    };
    setClosedMonthsMap(next);
    try {
      localStorage.setItem('lamsa_monthly_archives_v1', JSON.stringify(next));
    } catch {}
  };

  const handleReopenArchiveMonth = () => {
    if (!reopenReasonInput.trim() || !reopenChangesInput.trim()) {
      setReopenErrorMsg('يجب توثيق سبب إعادة فتح الشهر وتحديد ما سيتغير في سجل التدقيق (§82).');
      return;
    }
    const next = {
      ...closedMonthsMap,
      [selectedArchiveMonth]: {
        status: 'مفتوح' as const,
        reopenedAt: new Date().toLocaleString('ar-EG'),
        reopenedBy: 'د. محمد (المالك)',
        reopenReason: reopenReasonInput.trim(),
        whatWillChangeOnReopen: reopenChangesInput.trim(),
      },
    };
    setClosedMonthsMap(next);
    setReopenReasonInput('');
    setReopenChangesInput('');
    setReopenErrorMsg('');
    try {
      localStorage.setItem('lamsa_monthly_archives_v1', JSON.stringify(next));
    } catch {}
  };

  // Calculations for unit margins & contributions per Commercial & Financial Reference
  const sizeAnalysis = useMemo(() => {
    return bottleSizes.map(b => {
      const refRow = buildCommercialReferenceRow(b, settings);
      const normalMarginPercent = refRow.normalPrice > 0 ? (refRow.normalContrib5 / refRow.normalPrice) * 100 : 0;

      return {
        ...b,
        ...refRow,
        normalSell: refRow.normalPrice,
        normalGrossMargin: refRow.normalPrice - refRow.normalCost,
        normalNetContrib5: refRow.normalContrib5,
        normalMarginPercent,
        specialSell: refRow.specialPrice,
        specialCost: refRow.nicheCost,
        specialGrossMargin: refRow.specialPrice - refRow.nicheCost,
        specialComm5: refRow.nicheComm5,
        specialNetContrib5: refRow.nicheContrib5,
      };
    });
  }, [bottleSizes, settings]);

  // Today's actual figures from live production sales only (Test Data ≠ Production Data)
  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysSales = sales.filter(s => s.date.startsWith(todayIso) && isLiveProductionSale(s));
  const todaysRevenue = todaysSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const todaysCost = todaysSales.reduce((sum, s) => sum + s.totalCost, 0);
  const todaysComm = todaysSales.reduce((sum, s) => sum + (s.commissionAmount ?? Math.round(s.totalPrice * 0.05)), 0);
  const todaysContribution = todaysRevenue - todaysCost - todaysComm;
  const todaysBottles = todaysSales.reduce(
    (sum, s) => sum + s.items.reduce((acc, it) => acc + (it.quantity || 1), 0),
    0
  );
  const remainingFor600 = todaysSales.length > 0 ? Math.max(0, 600 - todaysContribution) : 0;
  const remainingFor1000 = todaysSales.length > 0 ? Math.max(0, 1000 - todaysContribution) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
              <ShieldAlert size={14} className="text-amber-400" />
              <span>منظومة المبيعات والمساهمة والتارجت وتشجيع إدارة المتجر • 25 يوم عمل</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex flex-wrap items-center gap-3">
              <span>نظام التارجت والمساهمة وتحفيز المبيعات</span>
              <span className="text-sm px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 font-mono">
                15,000 ج.م ثابتة ÷ 25 يوم = 600 ج.م/يوم
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              المركز التنفيذي لإدارة وتشجيع مبيعات متجر «لمسة عطر»: تتبع لحظي للمبيعات وصافي المساهمة، تحفيز عمولة طارق التصاعدية (5% ⬅ 7%)، التارجت اليومي والأسبوعي، والنشاط الميداني المنظم.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-400 block font-medium">المخصص اليومي الثابت</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">600 ج.م</span>
              <span className="text-[10px] text-slate-400 block">نقطة التعادل اليومية</span>
            </div>
            <div className="w-[1px] bg-white/10"></div>
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-400 block font-medium">الهدف التطويري</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">1,000 ج.م</span>
              <span className="text-[10px] text-slate-400 block">+400 ج.م ربح يومي صافي</span>
            </div>
          </div>
        </div>

        {/* Real-time Achievement Mini Strip */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">مساهمة اليوم المحققة حتى الآن:</span>
            {todaysSales.length === 0 ? (
              <span className="font-bold text-amber-300 text-xs">
                لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم
              </span>
            ) : (
              <>
                <span className="font-bold font-mono text-white text-sm">{Math.round(todaysContribution).toLocaleString()} ج.م</span>
                <span className="text-slate-400 text-[11px]">({todaysBottles} عبوة · {todaysSales.length} فاتورة · مبيعات {todaysRevenue.toLocaleString()} ج.م)</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-300 text-[11px]">نسبة تغطية تارجت الـ 600 اليوم:</span>
            <div className="w-32 sm:w-44 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${todaysSales.length > 0 ? Math.min(100, Math.max(0, (todaysContribution / 600) * 100)) : 0}%` }}
              ></div>
            </div>
            <span className="font-mono font-bold text-amber-300">
              {todaysSales.length > 0 ? Math.max(0, Math.round((todaysContribution / 600) * 100)) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Strict Data Separation Governance Strip (Live Production Data vs Test Data vs Documentation Examples) */}
      <div className="apple-card p-4 bg-white border border-indigo-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-900 font-mono font-black shrink-0">
            Test Data ≠ Production Data
          </span>
          <div className="space-y-0.5">
            <div className="font-black text-[#1D1D1F]">
              فصل تقني صارم بين البيانات التشغيلية الفعلية وبيانات الاختبار والأمثلة التوضيحية
            </div>
            <p className="text-[11px] text-[#636366]">
              القواعد التشغيلية المعتمدة فقط: الموازنة الشهرية <strong>15,000 ج</strong> • أساس التخطيط <strong>25 يوماً</strong> • المخصص التخطيطي اليومي <strong>600 ج</strong> (ليس مصروفاً نقدياً) • الهدف الأولي <strong>600 ج</strong> • الهدف التطويري <strong>1,000 ج</strong> • الحد الأدنى للمساهمة <strong>10 ج</strong> • منع البيع عند التكلفة أو أقل.
            </p>
          </div>
        </div>
        {preservedTestRecordsCount > 0 && (
          <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px] font-bold shrink-0">
            محفوظ تاريخياً ومستبعد كـ TEST / بيانات اختبار: {preservedTestRecordsCount} سجل
          </span>
        )}
      </div>

      {/* Live Store Management & Sales Encouragement Accelerator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="apple-card p-4 bg-white border border-black/[0.06] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#636366]">إجمالي المبيعات اليوم</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0071E3] text-[10px] font-black font-mono">
              {todaysSales.length} فاتورة
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-[#1D1D1F]">
            {todaysRevenue.toLocaleString('ar-EG')} <span className="text-xs font-bold text-[#0071E3]">ج.م</span>
          </div>
          <div className="text-[11px] text-[#86868B] flex items-center justify-between pt-1 border-t border-black/[0.04]">
            <span>العبوات المباعة: <strong className="text-[#1D1D1F] font-mono">{todaysBottles}</strong></span>
            <span>المستهدف: 14-17 عبوة</span>
          </div>
        </div>

        <div className="apple-card p-4 bg-white border border-emerald-200/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">صافي المساهمة المحققة</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">
              تارجت 600 ج
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            +{Math.round(todaysContribution).toLocaleString('ar-EG')} <span className="text-xs font-bold">ج.م</span>
          </div>
          <div className="text-[11px] text-[#86868B] flex items-center justify-between pt-1 border-t border-black/[0.04]">
            <span>
              {remainingFor600 > 0 ? `متبقي للتعادل: ${Math.round(remainingFor600)} ج` : '✓ تم تأمين التعادل بالكامل'}
            </span>
            <span className="font-mono text-emerald-700 font-bold">
              للتطويري: {Math.round(remainingFor1000)} ج
            </span>
          </div>
        </div>

        <div className="apple-card p-4 bg-white border border-amber-200/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">حافز وعمولة طارق اليوم</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              todaysBottles > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {todaysBottles > 10 ? 'شريحة 7% نشطة 🔥' : 'شريحة 5%'}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-[#1D1D1F]">
            +{todaysComm.toFixed(1)} <span className="text-xs font-bold text-amber-700">ج.م عمولة</span>
          </div>
          <div className="text-[11px] text-[#86868B] flex items-center justify-between pt-1 border-t border-black/[0.04]">
            <span>العبوات المباعة: <strong className="font-mono text-[#1D1D1F]">{todaysBottles} عبوة</strong></span>
            <span className="text-amber-800 font-bold">
              {todaysBottles < 10 ? `متبقي ${10 - todaysBottles} عبوات لشريحة 7%` : 'عمولة مضاعفة 7%'}
            </span>
          </div>
        </div>

        <div className="apple-card p-4 bg-gradient-to-br from-[#1D1D1F] to-[#2C2C2E] text-white flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-300">روشتة إغلاق التارجت الفوري</span>
            <Award size={15} className="text-amber-400" />
          </div>
          {remainingFor600 > 0 ? (
            <div className="text-[11px] text-zinc-200 leading-snug space-y-1">
              <div>لتغطية المتبقي (<strong className="text-amber-300 font-mono">{Math.round(remainingFor600)} ج</strong>) يلزم بيع:</div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px] pt-0.5">
                <span className="px-2 py-0.5 rounded-lg bg-white/10 text-emerald-300 font-bold">
                  {Math.ceil(remainingFor600 / 46.5)} عبوة 30مل
                </span>
                <span className="text-zinc-400">أو</span>
                <span className="px-2 py-0.5 rounded-lg bg-white/10 text-amber-300 font-bold">
                  {Math.ceil(remainingFor600 / 38.5)} عبوة 50مل
                </span>
                <span className="text-zinc-400">أو</span>
                <span className="px-2 py-0.5 rounded-lg bg-white/10 text-sky-300 font-bold">
                  {Math.ceil(remainingFor600 / 182.5)} عبوة 100مل
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-300 leading-snug font-bold">
              🎉 تم تحقيق تارجت الـ 600 ج! للوصول إلى 1,000 ج بيع {Math.max(1, Math.ceil(remainingFor1000 / 46.5))} عبوة (30مل) أو {Math.max(1, Math.ceil(remainingFor1000 / 182.5))} عبوة (100مل).
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs - Responsive Grid Wrap without forced horizontal scroll */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-bold">
        {[
          { id: 'overview', label: 'المعادلة والتعريف', icon: Layers },
          { id: 'target600', label: 'المرحلة 1: تارجت 600 ج', icon: Target },
          { id: 'target1000', label: 'المرحلة 2: تارجت 1,000 ج', icon: TrendingUp },
          { id: 'weekly_plan', label: 'التوزيع الأسبوعي', icon: Calendar },
          { id: 'staff_roles', label: 'أدوار د. محمد وطارق', icon: Users },
          { id: 'field_work', label: 'النشاط الميداني', icon: MapPin },
          { id: 'whatsapp', label: 'نظام WhatsApp', icon: MessageSquare },
          { id: 'accounting_vault', label: 'فصل الخزائن المحاسبية', icon: DollarSign },
          { id: 'acceptance_tests_20', label: `🧪 اختبارات القبول المعزولة (TEST-001 • ${passedTestsCount}/20)`, icon: CheckCircle2 },
          { id: 'monthly_archive', label: 'الأرشفة وإغلاق الشهر (§80)', icon: BookOpen },
          { id: 'red_team', label: 'النقد والـ Red Teaming', icon: ShieldAlert },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`apple-btn px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 transition-all ${
                isActive 
                  ? 'bg-[#1D1D1F] text-white shadow-md' 
                  : 'bg-white text-[#86868B] hover:text-[#1D1D1F] border border-black/[0.06]'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & CONTRIBUTION DEFINITION */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 apple-card p-6 bg-white space-y-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <BookOpen size={18} />
                <span>التعريف المحاسبي الثابت لمصطلح «المساهمة» (Contribution Margin)</span>
              </div>
              <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
                لكي يتحدث الجميع (د. محمد وطارق والمحاسبة) بنفس اللغة ولا يحدث أي خلط:
                <br />
                <span className="font-bold text-[#1D1D1F]">المساهمة ليست إجمالي المبيعات، وليست صافي الربح النهائي بعد المصاريف الثابتة.</span>
                <br />
                المساهمة هي <strong>الفائض النقدي المتبقي من سعر البيع بعد خصم التكاليف المباشرة المفرزة لكل عبوة (تكلفة المنتج الخام + عمولة طارق 5%)</strong>، وهذا الفائض هو الذي يغطي المصروفات الثابتة اليومية أولاً، وما يتبقى بعد تغطيتها هو <strong>الربح الصافي الحقيقي</strong>.
              </p>

              {/* The Formula Chain */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] space-y-3 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-2 text-[#1D1D1F] font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800">1. إجمالي المبيعات</span>
                  <span>-</span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">2. تكلفة المنتج المباع</span>
                  <span>-</span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800">3. عمولة المبيعات (5%)</span>
                  <span>=</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black">4. المساهمة (Contribution)</span>
                </div>
                <div className="text-[11px] text-[#86868B] font-sans">
                  ثم الخطوة الثانية: <strong>المساهمة - المخصص الثابت اليومي (600 ج.م) = صافي الربح الفعلي اليومي</strong>.
                </div>
              </div>

              {/* Real Mathematical Example */}
              <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/50 space-y-2">
                <span className="text-xs font-bold text-blue-900 block">مثال عملي حي بالأرقام المعتمدة (بيع عبوة 50 مل عادية):</span>
                <ul className="text-xs space-y-1 text-blue-950 font-mono">
                  <li>• سعر البيع للجمهور: <strong>230 ج.م</strong></li>
                  <li>• التكلفة التشغيلية المعتمدة: <strong>180 ج.م</strong> (زيت + كحول + زجاجة + غطاء + بخاخ + استيكر + هالك)</li>
                  <li>• عمولة طارق 5%: 230 × 5% = <strong>11.50 ج.م</strong></li>
                  <li>• <strong className="text-emerald-700">المساهمة الناتجة من العبوة = 230 - 180 - 11.5 = 38.50 ج.م</strong></li>
                </ul>
              </div>
            </div>

            {/* Quick Metrics Card */}
            <div className="apple-card p-6 bg-white space-y-4">
              <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider block">قواعد الحساب المعتمدة</span>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F7]">
                  <span className="text-[#86868B]">الموازنة الثابتة الآمنة:</span>
                  <span className="font-bold font-mono text-[#1D1D1F]">15,000 ج.م/شهر</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F7]">
                  <span className="text-[#86868B]">أيام التخطيط المعتمدة:</span>
                  <span className="font-bold font-mono text-blue-600">25 يوم عمل فقط</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F7]">
                  <span className="text-[#86868B]">المخصص اليومي للتعادل:</span>
                  <span className="font-bold font-mono text-amber-600">600 ج.م/يوم</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F7]">
                  <span className="text-[#86868B]">أيام الشهر الزائدة (26-30):</span>
                  <span className="font-bold text-emerald-700">هامش احتياطي طوارئ</span>
                </div>
              </div>
              <p className="text-[11px] text-[#86868B] leading-relaxed">
                إذا عمل المتجر 26 أو 27 يوماً، تسجل مبيعاتها كاملة بتاريخها الفعلي؛ لكن قسمة الموازنة الشهرية تظل مبنية على 25 يوماً فقط لأمان التدفق النقدي.
              </p>
            </div>
          </div>

          {/* Unit Economics Matrix Table */}
          <div className="apple-card p-6 bg-white space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1D1D1F]">
                  🔻 المرجع التجاري والمالي للمنتجات — جدول التكلفة المشتقة وصافي المساهمة
                </h3>
                <p className="text-xs text-[#86868B]">
                  المساهمة = صافي البيع ← تكلفة المنتج ← العمولة (5% للبخاخ و 0% للرول) · لا تخصم منها المصاريف الثابتة مرة أخرى
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold self-start">
                المرجع الحالي المعتمد (عادي 10ج · نيش 15ج · عود/مسك 20ج)
              </span>
            </div>

            {/* Key Commercial Reference Rules Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="font-black text-[#1D1D1F] block mb-0.5">🧪 تكلفة الجرام المعتمدة</span>
                <span className="text-[#48484A]">عادي: <strong>{settings.priceEssenceNormal || 10}ج</strong> · نيش: <strong>{settings.priceEssenceNiche || 15}ج</strong> · عود/مسك: <strong>{settings.priceEssenceSpecial || 20}ج</strong></span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                <span className="font-black text-amber-950 block mb-0.5">🎁 قاعدة العبوة الملونة</span>
                <span className="text-amber-900">عادية+بخاخ (15ج) ← ملونة (50ج) = <strong>+35ج فرق تكلفة</strong> (100/50/30مل فقط للعادي)</span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/70">
                <span className="font-black text-purple-950 block mb-0.5">🏷️ قاعدة التغليف المستقل</span>
                <span className="text-purple-900">استيكر (1ج) + كيس أساسي إلزامي (1ج) · التغليف الفاخر (علبة 10ج / كيس 10ج / معاً 20ج)</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/70">
                <span className="font-black text-rose-950 block mb-0.5">⚠️ ملاحظة 100 مل عود/مسك</span>
                <span className="text-rose-900">مساهمته <strong>25ج فقط</strong> (تكلفته المشتقة 640ج)، بينما 50/30/25مل تحقق (97ج / 117ج / 129ج)!</span>
              </div>
            </div>

            {/* Mobile Card Grid View for Sizes (No Horizontal Scroll on Mobile) */}
            <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sizeAnalysis.map(b => (
                <div key={b.id} className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1D1D1F]">
                      {b.sizeMl} مل {b.isRollOn ? '(رول بيور)' : `(${b.essenceGrams}جم زيت + 1جم مثبت)`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      عادي: +{b.normalContrib5} ج
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] text-center font-mono">
                    <div className="p-1.5 rounded-lg bg-white">
                      <span className="text-[9px] text-[#86868B] block font-sans">بيع عادي</span>
                      <span className="font-bold text-[#1D1D1F]">{b.normalPrice}ج</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white">
                      <span className="text-[9px] text-[#86868B] block font-sans">تكلفة معيارية</span>
                      <span className="font-bold text-rose-600">{b.normalCost}ج</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white">
                      <span className="text-[9px] text-[#86868B] block font-sans">عمولة 5%</span>
                      <span className="font-bold text-blue-600">{b.normalComm5}ج</span>
                    </div>
                  </div>
                  {b.coloredNormalPrice && (
                    <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50 border border-amber-200/70">
                      <span className="text-amber-900 font-bold">🎁 عبوة ملونة: بيع {b.coloredNormalPrice}ج (تكلفة {b.coloredNormalCost}ج)</span>
                      <span className="font-black font-mono text-amber-950">+{b.coloredNormalContrib5}ج مساهمة</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-black/[0.04]">
                    <div className="p-1.5 rounded-lg bg-emerald-50/70">
                      <span className="text-[10px] text-emerald-900 block font-bold">🌿 نيش ({b.specialPrice}ج)</span>
                      <span className="font-mono text-[10px] text-emerald-800">تكلفة {b.nicheCost}ج ⬅ <strong>+{b.nicheContrib5}ج</strong></span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-50/70">
                      <span className="text-[10px] text-amber-900 block font-bold">🟤 عود/مسك ({b.specialPrice}ج)</span>
                      <span className="font-mono text-[10px] text-amber-800">تكلفة {b.oudMuskCost}ج ⬅ <strong>+{b.oudMuskContrib5}ج</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-black/[0.06]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-black/[0.03] border-b border-black/[0.06] text-[#86868B] font-bold text-[11px]">
                    <th className="py-3 px-2.5">الحجم والوصفة</th>
                    <th className="py-3 px-2.5">عادي (سعر / تكلفة / عمولة)</th>
                    <th className="py-3 px-2.5 text-emerald-700">مساهمة العادي</th>
                    <th className="py-3 px-2.5 text-amber-800">🎁 العبوة الملونة (عادي)</th>
                    <th className="py-3 px-2.5">سعر النيش/العود/المسك</th>
                    <th className="py-3 px-2.5 text-teal-800">🌿 النيش (تكلفة / مساهمة)</th>
                    <th className="py-3 px-2.5 text-amber-900">🟤 العود والمسك (تكلفة / مساهمة)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {sizeAnalysis.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2.5">
                        <div className="font-black text-[#1D1D1F] flex items-center gap-1.5">
                          <span>{b.sizeMl} مل</span>
                          {b.isRollOn ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">رول بيور</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">بخاخ</span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#86868B] font-mono block">
                          {b.isRollOn ? `${b.essenceGrams} جم زيت خام بدون كحول` : `${b.essenceGrams} جم زيت + 1 جم مثبت + كحول`}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 font-mono text-[11px]">
                        <span className="font-bold text-[#1D1D1F]">{b.normalPrice}ج</span>
                        <span className="text-[#86868B]"> ← تكلفة </span>
                        <span className="text-rose-600 font-bold">{b.normalCost}ج</span>
                        <span className="text-[#86868B]"> ← عمولة </span>
                        <span className="text-blue-600 font-bold">{b.normalComm5}ج</span>
                      </td>
                      <td className="py-3 px-2.5 font-mono font-black text-emerald-700 bg-emerald-50/60">
                        +{b.normalContrib5} ج
                      </td>
                      <td className="py-3 px-2.5 font-mono text-[11px]">
                        {b.coloredNormalPrice ? (
                          <div>
                            <span className="font-bold text-amber-900">{b.coloredNormalPrice}ج</span>
                            <span className="text-[#86868B]"> (تكلفة {b.coloredNormalCost}ج · عمولة {b.coloredNormalComm5}ج)</span>
                            <span className="block font-black text-amber-700">⬅ +{b.coloredNormalContrib5} ج مساهمة</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#86868B] font-sans">— غير مطبق</span>
                        )}
                      </td>
                      <td className="py-3 px-2.5 font-mono font-bold text-[#1D1D1F]">
                        {b.specialPrice} ج
                        <span className="block text-[10px] text-[#86868B] font-normal">
                          عمولة: {b.nicheComm5} ج
                        </span>
                      </td>
                      <td className="py-3 px-2.5 font-mono text-[11px] bg-teal-50/40">
                        <span className="text-[#636366]">تكلفة {b.nicheCost}ج</span>
                        <span className="block font-black text-teal-800">+{b.nicheContrib5} ج مساهمة</span>
                      </td>
                      <td className="py-3 px-2.5 font-mono text-[11px] bg-amber-50/40">
                        <span className="text-[#636366]">تكلفة {b.oudMuskCost}ج</span>
                        <span className={`block font-black ${b.sizeMl === 100 && !b.isRollOn ? 'text-rose-600' : 'text-amber-900'}`}>
                          +{b.oudMuskContrib5} ج مساهمة
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TARGET 600 EGP (PHASE 1) */}
      {activeTab === 'target600' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <Target size={18} />
              <span>المرحلة الأولى (هذا الأسبوع): تارجت 600 جنيه مساهمة يومية</span>
            </div>
            <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
              تحقيق 600 جنيه مساهمة يومية يعني <strong>الوصول التام لنقطة التعادل وتغطية الـ 15,000 ج.م شهرياً بالكامل</strong> (شاملة الإيجار 1200، الكهرباء 800، المرافق، مخصصات الإدارة والتشغيل المعتمدة، والهامش الاحترازي للهالك والتالف).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-[11px] text-blue-700 block font-medium">المبيعات الإجمالية المطلوبة</span>
                <span className="text-2xl font-black font-mono text-blue-900 mt-1 block">1,800 - 2,100 ج</span>
                <span className="text-[10px] text-blue-600">بحسب مزيج المنتجات المباعة</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-[11px] text-emerald-700 block font-medium">عدد العبوات البخاخ المستهدفة</span>
                <span className="text-2xl font-black font-mono text-emerald-900 mt-1 block">12 - 14 عبوة</span>
                <span className="text-[10px] text-emerald-600">بخاخات من 20 و 30 و 50 مل</span>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                <span className="text-[11px] text-purple-700 block font-medium">عدد الفواتير (العملاء)</span>
                <span className="text-2xl font-black font-mono text-purple-900 mt-1 block">8 - 10 عملاء</span>
                <span className="text-[10px] text-purple-600">متوسط 1.4 عبوة لكل عميل</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-[11px] text-amber-700 block font-medium">عمولة المبيعات اليومية المتوقعة</span>
                <span className="text-2xl font-black font-mono text-amber-900 mt-1 block">90 - 110 ج</span>
                <span className="text-[10px] text-amber-600">عمولة فورية 5% وترتفع إلى 7% تشجيعية</span>
              </div>
            </div>
          </div>

          {/* Realistic Daily Mix Table */}
          <div className="apple-card p-6 bg-white space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-[#1D1D1F]">
              الـ Mix اليومي النموذجي لتحقيق 600 جنيه مساهمة (سيناريو واقعي قابل للتنفيذ)
            </h3>

            {/* Mobile Cards for Mix */}
            <div className="md:hidden space-y-2.5">
              {[
                { name: 'عبوة 50 مل (عادي)', qty: '4 عبوات', price: '230 ج', total: '920 ج', unitContrib: '38.5 ج', totalContrib: '154.0 ج' },
                { name: 'عبوة 30 مل (عادي)', qty: '4 عبوات', price: '170 ج', total: '680 ج', unitContrib: '46.5 ج', totalContrib: '186.0 ج' },
                { name: 'عبوة 25 مل (عادي)', qty: '2 عبوة', price: '160 ج', total: '320 ج', unitContrib: '57.0 ج', totalContrib: '114.0 ج' },
                { name: 'عبوة 20 مل (عادي)', qty: '3 عبوات', price: '120 ج', total: '360 ج', unitContrib: '29.0 ج', totalContrib: '87.0 ج' },
                { name: 'عبوة 10 مل بخاخ (عادي)', qty: '4 عبوات', price: '70 ج', total: '280 ج', unitContrib: '16.5 ج', totalContrib: '66.0 ج' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1D1D1F]">{item.name}</span>
                    <span className="font-bold text-blue-600 font-mono">{item.qty}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#86868B] font-mono">
                    <span>البيع: {item.price} ({item.total})</span>
                    <span className="text-emerald-700 font-bold">مساهمة: +{item.totalContrib}</span>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-bold font-mono">
                <span className="text-emerald-950 font-black font-sans">الإجمالي المستهدف: 17 عبوة</span>
                <span className="text-emerald-800 font-black">+607.0 ج.م مساهمة (2,560 ج مبيعات)</span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-black/[0.06]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-black/[0.02] border-b border-black/[0.06] text-[#86868B]">
                    <th className="py-2.5 px-3">المنتج والحجم</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3">سعر البيع للواحدة</th>
                    <th className="py-2.5 px-3">إجمالي البيع</th>
                    <th className="py-2.5 px-3">صافي المساهمة للواحدة</th>
                    <th className="py-2.5 px-3 font-bold text-emerald-700">إجمالي المساهمة المحققة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D1D1F]">عبوة 50 مل (عادي)</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">4 عبوات</td>
                    <td className="py-2.5 px-3 font-mono">230 ج</td>
                    <td className="py-2.5 px-3 font-mono">920 ج</td>
                    <td className="py-2.5 px-3 font-mono">38.5 ج</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">154.0 ج</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D1D1F]">عبوة 30 مل (عادي)</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">4 عبوات</td>
                    <td className="py-2.5 px-3 font-mono">170 ج</td>
                    <td className="py-2.5 px-3 font-mono">680 ج</td>
                    <td className="py-2.5 px-3 font-mono">46.5 ج</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">186.0 ج</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D1D1F]">عبوة 25 مل (عادي)</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">2 عبوة</td>
                    <td className="py-2.5 px-3 font-mono">160 ج</td>
                    <td className="py-2.5 px-3 font-mono">320 ج</td>
                    <td className="py-2.5 px-3 font-mono">57.0 ج</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">114.0 ج</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D1D1F]">عبوة 20 مل (عادي)</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">3 عبوات</td>
                    <td className="py-2.5 px-3 font-mono">120 ج</td>
                    <td className="py-2.5 px-3 font-mono">360 ج</td>
                    <td className="py-2.5 px-3 font-mono">29.0 ج</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">87.0 ج</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D1D1F]">عبوة 10 مل بخاخ (عادي)</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">4 عبوات</td>
                    <td className="py-2.5 px-3 font-mono">70 ج</td>
                    <td className="py-2.5 px-3 font-mono">280 ج</td>
                    <td className="py-2.5 px-3 font-mono">16.5 ج</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">66.0 ج</td>
                  </tr>
                  <tr className="bg-emerald-50/70 font-bold border-t-2 border-emerald-200">
                    <td className="py-3 px-3 text-emerald-950 font-black">الإجمالي اليومي المستهدف</td>
                    <td className="py-3 px-3 font-mono text-emerald-950 font-black">17 عبوة</td>
                    <td className="py-3 px-3 text-slate-500">-</td>
                    <td className="py-3 px-3 font-mono text-blue-900 font-black">2,560 ج.م مبيعات</td>
                    <td className="py-3 px-3 text-slate-500">-</td>
                    <td className="py-3 px-3 font-mono text-emerald-800 font-black text-sm">607.0 ج.م مساهمة</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#86868B] pt-2">
              💡 <strong>ملاحظة تسعيرية ذكية:</strong> لاحظ أن حجم <strong>30 مل و 25 مل</strong> يعطيان مساهمة صافية أعلى من الـ 50 مل (46.5 ج و 57 ج مقابل 38.5 ج للـ 50 مل)، لأن تكلفة زجاجة الـ 50 مل وزيتها أكبر بالنسبة لسعرها (230 ج مقابل تكلفة 180 ج). لذلك توجيه البائع لبيع الـ 30 والـ 25 مل يرفع المساهمة بسرعة أكبر.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: TARGET 1000 EGP (PHASE 2) */}
      {activeTab === 'target1000' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <TrendingUp size={18} />
              <span>المرحلة الثانية (الهدف التطويري): تارجت 1,000 جنيه مساهمة يومية</span>
            </div>
            <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
              عند وصول المتجر إلى 1,000 جنيه مساهمة يومية (25 يوم عمل = 25,000 ج.م مساهمة شهرية)، يتم تغطية الـ 15,000 ج.م الثابتة بالكامل، ويتحقق <strong>فائض ربح حقيقي إضافي قدره 10,000 جنيه شهرياً</strong> فوق كافة الرواتب والمصاريف.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-[11px] text-emerald-700 block font-medium">المبيعات الإجمالية المطلوبة</span>
                <span className="text-2xl font-black font-mono text-emerald-900 mt-1 block">3,200 - 3,800 ج</span>
                <span className="text-[10px] text-emerald-600">مبيعات يومية مستهدفة</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-[11px] text-blue-700 block font-medium">عدد العبوات البخاخ</span>
                <span className="text-2xl font-black font-mono text-blue-900 mt-1 block">20 - 24 عبوة</span>
                <span className="text-[10px] text-blue-600">شاملة عبوة نيش أو 100 مل</span>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                <span className="text-[11px] text-purple-700 block font-medium">عدد الفواتير</span>
                <span className="text-2xl font-black font-mono text-purple-900 mt-1 block">14 - 16 عميل</span>
                <span className="text-[10px] text-purple-600">متوسط فاتورة 240 ج</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-[11px] text-amber-700 block font-medium">دخل طارق اليومي الإضافي</span>
                <span className="text-2xl font-black font-mono text-amber-900 mt-1 block">160 - 190 ج</span>
                <span className="text-[10px] text-amber-600">عمولة 5% + شريحة الـ 7%</span>
              </div>
            </div>
          </div>

          {/* Road to 1000 EGP Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="apple-card p-5 bg-white space-y-3">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">1</span>
              <h4 className="text-xs font-bold text-[#1D1D1F]">الرافعة الأولى: تفعيل عبوة واحدة 100 مل يومياً</h4>
              <p className="text-xs text-[#86868B] leading-relaxed">
                بيع عبوة واحدة 100 مل بسعر 550 ج.م وتكلفة 340 ج وعمولة 27.5 ج يضخ <strong>+182.5 ج مساهمة فورية</strong> للهدف (يمثل 18% من تارجت الـ 1000 بمفرده).
              </p>
            </div>
            <div className="apple-card p-5 bg-white space-y-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">2</span>
              <h4 className="text-xs font-bold text-[#1D1D1F]">الرافعة الثانية: دمج عطور النيش والعود</h4>
              <p className="text-xs text-[#86868B] leading-relaxed">
                بيع عبوة واحدة نيش 30 مل (سعر 350 ج، تكلفة 115 ج) تعطي <strong>+217.5 ج مساهمة صافية</strong> تعادل بيع 6 عبوات من حجم 50 مل العادي.
              </p>
            </div>
            <div className="apple-card p-5 bg-white space-y-3">
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">3</span>
              <h4 className="text-xs font-bold text-[#1D1D1F]">الرافعة الثالثة: مبيعات الميدان والواتساب</h4>
              <p className="text-xs text-[#86868B] leading-relaxed">
                تحقيق 3-4 طلبيات خارجية يومياً عبر النشاط الميداني الصباحي ورسائل الواتساب المنظمة يغطي الـ 400 ج الإضافية خارج حركة المتجر تماماً.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WEEKLY PLAN */}
      {activeTab === 'weekly_plan' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <Calendar size={18} />
              <span>خطة التارجت الأسبوعي المتدرج (توزيع واقعي بحسب قوة الأيام)</span>
            </div>
            <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
              من الخطأ الإداري فرض نفس الرقم المتساوي كل يوم دون مراعاة طبيعة السوق والقرية. تم بناء التارجت الأسبوعي على <strong>6 أيام عمل أسبوعياً (الجمعة إجازة)</strong> بمجموع <strong>3,600 جنيه مساهمة أسبوعية</strong> للمرحلة الأولى:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
              {[
                { day: 'السبت', status: 'متوسط', target: 550, bottles: '14-16', focus: 'استقبال الأسبوع وتجهيز النواقص وتنشيط عملاء WhatsApp' },
                { day: 'الأحد', status: 'هادئ نسبياً', target: 500, bottles: '12-14', focus: 'يوم نشاط ميداني صباحي مكثف للمحلات والمصالح' },
                { day: 'الإثنين', status: 'متوسط', target: 550, bottles: '14-16', focus: 'متابعة عينات الأحد وإعادة الاتصال بالعملاء المهتمين' },
                { day: 'الثلاثاء', status: 'قوي', target: 650, bottles: '16-18', focus: 'عروض الباقات والـ Upsell لحجم 30 و 50 مل' },
                { day: 'الأربعاء', status: 'قوي جداً', target: 650, bottles: '16-18', focus: 'تجهيز هدايا وطلبات نهاية الأسبوع والزيارات المسائية' },
                { day: 'الخميس', status: 'ذروة البيع الأسبوعي', target: 700, bottles: '18-22', focus: 'ذروة الخروج والتسوق - تركيز كامل على البيع المسائي' },
              ].map(d => (
                <div key={d.day} className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1D1D1F]">{d.day}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      d.target >= 650 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-[#1D1D1F]">{d.target} ج</div>
                  <span className="text-[11px] text-[#86868B] block font-mono">{d.bottles} عبوة</span>
                  <p className="text-[10px] text-[#424245] leading-relaxed pt-1 border-t border-black/[0.04]">{d.focus}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>إجمالي التارجت الأسبوعي (6 أيام عمل): <strong>3,600 جنيه مساهمة</strong></span>
              </div>
              <span className="text-slate-300">يوم الجمعة مغلق • 4 أسابيع = 24 يوم عمل + يوم تعويضي = 25 يوم شهرياً</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STAFF ROLES & SCHEDULE */}
      {activeTab === 'staff_roles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dr. Mohamed Card */}
            <div className="apple-card p-6 bg-white space-y-4 border-t-4 border-t-blue-600">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  👤
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F]">د. محمد (صاحب ومدير المتجر)</h3>
                  <span className="text-xs text-[#86868B]">إدارة + إشراف + تحليل + تطوير + اتخاذ قرارات</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#424245]">
                <div className="p-2.5 rounded-xl bg-blue-50/50 text-blue-900 font-medium">
                  🚫 <strong>قاعدة أساسية:</strong> د. محمد لا يبيع داخل المتجر ولا يُحتسب كأحد البائعين في التارجت.
                </div>
                <h4 className="font-bold text-[#1D1D1F] pt-2">المسؤوليات اليومية والأسبوعية:</h4>
                <ul className="space-y-1.5 list-disc list-inside text-[#86868B]">
                  <li>مراجعة التقرير اليومي والمبيعات والمساهمة كل مساء.</li>
                  <li>مطابقة الخزنة والمقبوضات النقدية والإلكترونية.</li>
                  <li>مراقبة نقطة التعادل وفصل الخزائن (المخزون / المصاريف / العمولات / الأرباح).</li>
                  <li>توفير الزيوت والخامات قبل نفادها بناءً على تنبيهات النواقص.</li>
                  <li>تقييم جولات الميدان وتوجيه طارق للأماكن الأعلى إنتاجية.</li>
                </ul>
              </div>
            </div>

            {/* Tarek Card */}
            <div className="apple-card p-6 bg-white space-y-4 border-t-4 border-t-emerald-600">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  👤
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F]">طارق (مسؤول التشغيل والمبيعات الميداني والداخلي)</h3>
                  <span className="text-xs text-[#86868B]">الموظف التنفيذي الوحيد للمتجر</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#424245]">
                <div className="p-2.5 rounded-xl bg-emerald-50/50 text-emerald-900 font-medium">
                  💰 <strong>نظام العمولة والحوافز:</strong> 5% عمولة فورية على كل عملية بيع، وترتفع تلقائياً إلى 7% تشجيعية بعد العبوة رقم 10 يومياً (المخصصات الأساسية محفوظة سرياً بالنظام الخلفي).
                </div>
                <h4 className="font-bold text-[#1D1D1F] pt-2">نظام عمل طارق وساعات الدوام:</h4>
                <p className="text-[#86868B] leading-relaxed">
                  حركة البيع في المتجر تبدأ فعلياً قبل المغرب حتى 11:30 مساءً. لذلك أفضل نظام زمني لطارق ليس التقسيم العشوائي، بل:
                </p>
                <div className="p-3 rounded-xl bg-[#F5F5F7] space-y-1 font-mono text-[11px]">
                  <div>• <strong>1:00 ظهراً - 4:00 عصراً:</strong> تجهيز النواقص، واتساب العملاء، وجولة ميدانية ساعتين.</div>
                  <div>• <strong>4:00 عصراً - 11:30 مساءً:</strong> التواجد الكامل بالمتجر (ذروة حركة الشارع والبيع).</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ORGANIZED FIELD WORK */}
      {activeTab === 'field_work' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <MapPin size={18} />
              <span>دليل النشاط الميداني المنظم (معايير محددة وقياس بالأرقام لا لف عشوائي)</span>
            </div>
            <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
              النشاط الميداني ليس خروجاً بلا هدف. هو أداة لاختراق ساعات الهدوء (1:30 ظهراً - 3:30 عصراً). معيار النجاح ليس عدد الساعات، بل <strong>(المساهمة الناتجة من الميدان ÷ ساعات الميدان)</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <span className="text-xs font-bold text-amber-900 block">الأماكن المستهدفة ذات الأولوية A</span>
                <ul className="text-xs text-amber-950 space-y-1.5 list-disc list-inside">
                  <li>صالونات الحلاقة الرجالية ومراكز التجميل (أعلى قبول لتجربة العطور).</li>
                  <li>المصالح الحكومية، المدارس، والمكاتب الإدارية (موظفون برواتب ثابتة).</li>
                  <li>عيادات الأسنان والمراكز الطبية والصيدليات.</li>
                  <li>معارض ومحلات الملابس (فرصة تكامل العطر مع المظهر).</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                <span className="text-xs font-bold text-rose-900 block">محاذير وقواعد صارمة</span>
                <ul className="text-xs text-rose-950 space-y-1.5 list-disc list-inside">
                  <li>ممنوع دخول أي محل يبيع عطوراً أو تركيبات لحسابه منعاً للتعارض.</li>
                  <li>الاستئذان واللباقة التامة قبل عرض أي عطر.</li>
                  <li>ألا تتجاوز الجولة 1.5 إلى 2 ساعة كحد أقصى يومياً.</li>
                  <li>العودة فوراً للمتجر قبل الساعة 4:30 عصراً لاستقبال ذروة المساء.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                <span className="text-xs font-bold text-blue-900 block">أرقام الجولة اليومية المقاسة</span>
                <ul className="text-xs text-blue-950 space-y-1 font-mono">
                  <li>• المدة: <strong>90 - 120 دقيقة</strong></li>
                  <li>• الزيارات: <strong>4 - 6 أماكن</strong></li>
                  <li>• التجارب (Sprays): <strong>10 - 15 شخص</strong></li>
                  <li>• أرقام واتساب بموافقتهم: <strong>4 - 6 أرقام</strong></li>
                  <li>• طلبات فورية مستهدفة: <strong>2 - 3 عبوات</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: WHATSAPP SYSTEM */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <MessageSquare size={18} />
              <span>نظام WhatsApp وإعادة تنشيط العملاء في ساعات الهدوء</span>
            </div>
            <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
              إذا كان المحل هادئاً، فهذا هو وقت تحويل قاعدة بيانات العملاء إلى مبيعات متكررة دون إزعاج أو رسائل مزعجة (Spam):
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#F5F5F7] space-y-2 border border-black/[0.04]">
                <span className="text-xs font-bold text-[#1D1D1F] block">1. بعد 14-21 يوماً من الشراء</span>
                <div className="p-3 rounded-xl bg-white text-[11px] text-[#424245] border border-black/[0.05] leading-relaxed">
                  «مساء الخير يا أستاذ [الاسم]، بنطمن على ثبات وفوحان عطر [اسم العطر] اللي شرفته باختياره من عندنا.. يا رب يكون عجب حضرتك ونال إعجاب اللي حواليك!»
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F5F7] space-y-2 border border-black/[0.04]">
                <span className="text-xs font-bold text-[#1D1D1F] block">2. إشعار وصول عطر مطلوب</span>
                <div className="p-3 rounded-xl bg-white text-[11px] text-[#424245] border border-black/[0.05] leading-relaxed">
                  «أهلاً بحضرتك يا فندم، بخصوص العطر اللي حضرتك كنت سألتنا عليه [اسم العطر]، تم توفير الزيت الخام الأصلي منه في المتجر النهاردة، ومتاح تشرفنا أو نجهزه لحضرتك.»
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F5F7] space-y-2 border border-black/[0.04]">
                <span className="text-xs font-bold text-[#1D1D1F] block">3. ترشيح ذكي حسب ذوق العميل</span>
                <div className="p-3 rounded-xl bg-white text-[11px] text-[#424245] border border-black/[0.05] leading-relaxed">
                  «يا فندم حضرتك بتحب العطور الشرقية الثابتة زي [اسم عطره السابق]، وصلنا عطر جديد بنفس الهرم العطري [اسم العطر الجديد] وفيه ثبات ممتاز، ندعوك تجربه أول ما تنورنا!»
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: ACCOUNTING VAULT SEPARATION */}
      {activeTab === 'accounting_vault' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <DollarSign size={18} />
              <span>نظام فصل الخزائن المحاسبية الداخلية (حماية رأس المال والمخزون)</span>
            </div>
            <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
              الخطأ القاتل الذي يقع فيه أصحاب المتاجر هو وضع كافة المقبوضات في جيب واحد ثم الصرف منها عشوائياً. تم تصميم هذا النظام للفصل الصارم بين 4 خزائن محاسبية يومية:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-sm">1</div>
                <h4 className="text-xs font-bold text-rose-950">خزينة تكلفة المخزون (خط أحمر)</h4>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  تُحجز فيها تكلفة كل عبوة مباعة فوراً (تكلفة الزيت الخام، الكحول، الزجاجة، الغطاء، البخاخ، الاستيكر). <strong>ممنوع سحب مليم واحد منها</strong>؛ لأنها مخصصة فقط لإعادة شراء المواد الخام المستهلكة لضمان عدم توقف المتجر.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm">2</div>
                <h4 className="text-xs font-bold text-amber-950">خزينة المصروفات الثابتة</h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  يُخصص لها 600 جنيه يومياً (من أصل 15,000 ج.م شهرياً) لتغطية الإيجار، الكهرباء، المرافق، الرواتب الأساسية، وهامش الطوارئ.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-sm">3</div>
                <h4 className="text-xs font-bold text-blue-950">خزينة عمولات طارق</h4>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  تُحجز فيها عمولة المبيعات المستحقة لطارق (5% أو 7% على الفائض) وتُصرف له أسبوعياً أو شهرياً وفق الأداء المسجل بالنظام.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm">4</div>
                <h4 className="text-xs font-bold text-emerald-950">خزينة الأرباح القابلة للسحب</h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  لا يدخلها أي قرش إلا بعد اكتمال مخصصات الخزائن الثلاث السابقة تماماً. أي سحب شخصي لد. محمد يتم من هذه الخزينة فقط.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: 20 MANDATORY ACCEPTANCE TESTS & ISOLATED TEST-001 SANDBOX (§92 & §93) */}
      {activeTab === 'acceptance_tests_20' && (
        <div className="space-y-6">
          {/* TEST-001: Isolated Sandbox Verification Box (Never enters Live Production Data) */}
          <div className="apple-card p-6 bg-white border-2 border-amber-300 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <CheckCircle2 size={18} className="text-amber-600" />
                <span>🧪 شاشة الاختبار المعزولة (TEST-001 — Test Data ≠ Production Data)</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-mono font-black border border-amber-300">
                TEST / بيانات اختبار معزولة — لا تدخل في تقارير الإنتاج الحقيقية ✓
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 leading-relaxed">
              <strong>تنبيه الفصل التقني الصارم:</strong> الأرقام الواردة في سيناريو الاختبار أدناه (المبيعات = 320 ج، تكلفة المنتجات = 245 ج، العمولة = 16 ج، الرصيد الافتتاحي = 210 ج، الجرد الفعلي = 200 ج، المساهمة = 59 ج، عجز اليوم = 541 ج، فرق الخزنة = -330 ج) مصنفة حصرياً كـ <strong>TEST-001 (Test Data)</strong> للتحقق من صحة المعادلات في هذه الشاشة المنفصلة فقط، ولا تستخدم كـ Default Values أو أرصدة افتتاحية أو مبيعات فعلية إطلاقاً.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left: Daily Contribution & Budget Result */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <span className="font-black text-indigo-950 block text-sm">
                  أولاً: نتيجة اليوم وفق الموازنة (§37 & §93)
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">المبيعات الصافية</span>
                    <span className="font-black text-[#1D1D1F]">{correctiveExampleDay.netSales} ج.م</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">تكلفة البضاعة + العمولة</span>
                    <span className="font-black text-rose-700">
                      {correctiveExampleDay.productCost} + {correctiveExampleDay.commissions} = 261 ج
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">المساهمة الصافية</span>
                    <span className="font-black text-emerald-700">{correctiveExampleDay.contribution} ج.م</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">المخصص التخطيطي لليوم</span>
                    <span className="font-black text-indigo-700">{correctiveExampleDay.plannedDailyAllocation} ج.م</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">الممول / عجز التمويل</span>
                    <span className="font-black text-[#1D1D1F]">
                      ممول {correctiveExampleDay.fundedAllocationToday} ج | عجز {correctiveExampleDay.unfundedAllocationDeficitToday} ج
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-100/80 border border-emerald-300">
                    <span className="text-[10px] text-emerald-950 block font-sans font-bold">نتيجة اليوم وفق الموازنة</span>
                    <span className="font-black text-emerald-950 text-sm">
                      {correctiveExampleDay.dailyResultVsBudget} ج.م (وليس -14,941)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Independent Cash Drawer Reconciliation */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <span className="font-black text-amber-950 block text-sm">
                  ثانياً: تسوية الخزنة المستقلة تماماً عن المساهمة (§36 & §93)
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 rounded-xl bg-white border border-amber-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">الرصيد الافتتاحي</span>
                    <span className="font-black text-[#1D1D1F]">{correctiveExampleDrawer.openingBalance} ج.م</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-amber-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">المبيعات النقدية</span>
                    <span className="font-black text-emerald-700">+{correctiveExampleDrawer.cashSales} ج.م</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-amber-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">الرصيد النقدي المتوقع</span>
                    <span className="font-black text-blue-700">{correctiveExampleDrawer.expectedCash} ج.م</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-amber-100">
                    <span className="text-[10px] text-[#86868B] block font-sans">الجرد النقدي الفعلي</span>
                    <span className="font-black text-[#1D1D1F]">{correctiveExampleDrawer.actualCash} ج.م</span>
                  </div>
                  <div className="col-span-2 p-2.5 rounded-xl bg-rose-100/80 border border-rose-300 flex items-center justify-between">
                    <span className="text-xs text-rose-950 font-sans font-black">فرق الخزنة المستقل:</span>
                    <span className="font-black text-rose-900 text-sm">
                      {correctiveExampleDrawer.cashDifference} ج.م (وليس 14,670)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* §92: 20 Mandatory Acceptance Tests Table */}
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-[#1D1D1F]">
                  اختبارات القبول الـ 20 الإجبارية (§92 — فحص آلي حي للمحرك المحاسبي والتشغيلي)
                </h3>
                <p className="text-xs text-[#86868B]">
                  يتم تشغيل كافة الاختبارات الـ 20 تلقائياً للتحقق من التسعير، الحد الأدنى 10 ج، العمولة المتدرجة (5% / 7% / 0% للرول)، الخزنة، التارجت، والصلاحيات.
                </p>
              </div>
              <span className="px-4 py-1.5 rounded-2xl bg-emerald-600 text-white font-mono font-black text-xs shrink-0">
                النتيجة: {passedTestsCount} / {acceptanceTests.length} ناجح ✓
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {acceptanceTests.map((test) => (
                <div
                  key={test.testNumber}
                  className={`p-3.5 rounded-2xl border space-y-1.5 ${
                    test.passed
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : 'bg-rose-50 border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[10px] font-black">
                        {test.testCode}
                      </span>
                      <span className="font-black text-[#1D1D1F]">{test.titleAr}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black shrink-0 ${
                        test.passed
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {test.passed ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#636366]">{test.scenarioAr}</p>
                  <div className="pt-1 border-t border-black/[0.05] text-[11px] font-mono space-y-0.5">
                    <div className="text-[#86868B]">المتوقع: {test.expectedOutputAr}</div>
                    <div className="font-bold text-emerald-800">الفعلي: {test.actualOutputAr}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: MONTHLY ARCHIVE & PERIOD CLOSING (§16, §80–§82) */}
      {activeTab === 'monthly_archive' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
              <div>
                <h3 className="text-base font-black text-[#1D1D1F]">
                  نظام الأرشفة الشهرية وإغلاق الفترات المحاسبية (§16 & §80–§82)
                </h3>
                <p className="text-xs text-[#86868B]">
                  عند إغلاق الشهر يُحفظ كسجل تاريخي مجمد لا يتأثر بأي تغيير لاحق في الأسعار أو التكاليف أو الوصفات، ولا يُعاد فتحه إلا بواسطة المالك مع تسجيل السبب.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedArchiveMonth}
                  onChange={(e) => setSelectedArchiveMonth(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono text-xs font-bold outline-none"
                />
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                    monthlyArchiveSummary.status === 'مغلق_ومجمد'
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {monthlyArchiveSummary.status === 'مغلق_ومجمد' ? '🔒 شهر مغلق ومجمد' : '🟢 شهر مفتوح'}
                </span>
              </div>
            </div>

            {/* 15 Required Monthly Archive Metrics (§81) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">1. إجمالي المبيعات</span>
                <span className="font-mono font-black text-sm text-[#1D1D1F]">
                  {monthlyArchiveSummary.grossSales.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">2. الخصومات والولاء</span>
                <span className="font-mono font-black text-sm text-rose-600">
                  -{monthlyArchiveSummary.totalDiscounts.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">3. صافي المبيعات</span>
                <span className="font-mono font-black text-sm text-[#0071E3]">
                  {monthlyArchiveSummary.netSales.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">4. تكلفة البضاعة المباعة</span>
                <span className="font-mono font-black text-sm text-rose-700">
                  {monthlyArchiveSummary.costOfGoodsSold.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">5. إجمالي عمولات طارق</span>
                <span className="font-mono font-black text-sm text-amber-800">
                  {monthlyArchiveSummary.commissionsTotal.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] text-emerald-900 block font-bold">6. المساهمة الصافية للشهر</span>
                <span className="font-mono font-black text-sm text-emerald-800">
                  {monthlyArchiveSummary.totalContribution.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">7. الموازنة الثابتة المخططة</span>
                <span className="font-mono font-black text-sm text-[#1D1D1F]">
                  {monthlyArchiveSummary.fixedBudgetPlanned.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">8. المصروفات المدفوعة فعلياً</span>
                <span className="font-mono font-black text-sm text-amber-700">
                  {monthlyArchiveSummary.actualExpensesPaid.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">9. مصروفات مستحقة غير مدفوعة</span>
                <span className="font-mono font-black text-sm text-[#636366]">
                  {monthlyArchiveSummary.accruedExpensesUnpaid.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">10. النقدي / الإلكتروني</span>
                <span className="font-mono font-black text-xs text-[#1D1D1F]">
                  {monthlyArchiveSummary.cashTotal} / {monthlyArchiveSummary.electronicTotal} ج
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] text-blue-900 block font-bold">11. المساهمة بعد المصروفات المدفوعة</span>
                <span className="font-mono font-black text-sm text-blue-800">
                  {monthlyArchiveSummary.accountingNetProfitOrLoss.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <span className="text-[10px] text-indigo-900 block font-bold">12. نتيجة التشغيل وفق الموازنة</span>
                <span className="font-mono font-black text-sm text-indigo-800">
                  {monthlyArchiveSummary.budgetSafeOperatingResult.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] text-emerald-900 block font-bold">13. الربح الآمن القابل للتوزيع (§15)</span>
                <span className="font-mono font-black text-sm text-emerald-800">
                  {monthlyArchiveSummary.safeDistributableProfit.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">14. عجز التارجت التراكمي</span>
                <span className="font-mono font-black text-sm text-rose-700">
                  {monthlyArchiveSummary.accumulatedTargetDeficit.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">15. رأس المال المسجل</span>
                <span className="font-mono font-black text-sm text-[#1D1D1F]">
                  {monthlyArchiveSummary.capitalBalance.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>

            {/* Close / Freeze or Owner Reopen Controls (§80 & §82) */}
            <div className="pt-3 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {monthlyArchiveSummary.status !== 'مغلق_ومجمد' ? (
                <button
                  type="button"
                  onClick={handleCloseArchiveMonth}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer transition-all"
                >
                  🔒 إغلاق وتجميد شهر {selectedArchiveMonth} رسمياً في الأرشيف
                </button>
              ) : (
                <div className="w-full space-y-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                  <div className="font-black text-amber-950">
                    صلاحية المالك (د. محمد) فقط — إعادة فتح شهر مغلق مع التوثيق الإجباري في Audit Log (§82):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="سبب إعادة فتح الشهر المغلق..."
                      value={reopenReasonInput}
                      onChange={(e) => setReopenReasonInput(e.target.value)}
                      className="h-9 px-3 rounded-xl bg-white border border-amber-300 text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="ما الذي سيتغير بعد إعادة الفتح؟"
                      value={reopenChangesInput}
                      onChange={(e) => setReopenChangesInput(e.target.value)}
                      className="h-9 px-3 rounded-xl bg-white border border-amber-300 text-xs outline-none"
                    />
                  </div>
                  {reopenErrorMsg && <p className="text-rose-600 font-bold text-[11px]">{reopenErrorMsg}</p>}
                  <button
                    type="button"
                    onClick={handleReopenArchiveMonth}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer"
                  >
                    إعادة فتح الشهر وتوثيق العملية في Audit Log
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: RED TEAMING & CRITICAL ANALYSIS */}
      {activeTab === 'red_team' && (
        <div className="space-y-6">
          <div className="apple-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <ShieldAlert size={18} />
              <span>التحليل النقدي واختبار الفرضيات (Red Teaming)</span>
            </div>
            <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
              تحليل إداري صريح وصادق لا يكتفي بالمجاملات، بل يضع أصابعه على المخاطر الحقيقية ونقاط الضعف لاختبار مدى صمود الخطة:
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-2">
                <span className="text-xs font-bold text-[#1D1D1F] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  هل تارجت 600 جنيه مساهمة يومياً واقعي للوضع الحالي؟
                </span>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  <strong>نعم، لكن بشرط حاسم:</strong> بالنظر لبيانات الشهر الماضي (74 عبوة 20 مل، 19 عبوة 30 مل، 9 عبوات 50 مل) = حوالي 5 عبوات يومياً فقط، وهو ما كان يعطي مساهمة تقارب 160-200 ج فقط. الانتقال إلى 600 ج يتطلب مضاعفة عدد العبوات إلى 12-14 عبوة يومياً. هذا لن يحدث بالانتظار داخل المحل أبداً؛ بل يحتاج فورياً لتنفيذ ساعات الميدان والواتساب.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-2">
                <span className="text-xs font-bold text-[#1D1D1F] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  هل حجم 10 مل يستحق الاستمرار؟
                </span>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  <strong>التوصية النقدية:</strong> سعر الـ 10 مل هو 70 ج وتكلفته 50 ج، أي يعطي مساهمة 16.5 ج فقط (هامش ضعيف جداً مقارنة بمجهود التركيب والزجاجة). يجب استخدامه فقط كحجم "دخول" للعميل الجديد المتردد، مع تدريب طارق على محاولة ترقيته مباشرة إلى 20 مل أو 30 مل (Upsell). إذا استمر العميل في طلب 10 مل فقط، فإن استهلاكه للزجاجات والوقت يقلل الإنتاجية.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-2">
                <span className="text-xs font-bold text-[#1D1D1F] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  عطور النيش: لماذا لا تبيع وما الحل الحقيقي؟
                </span>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  العميل في السوق المحلي يرى سعر 350 و 450 ج مرتفعاً كشراء أعمى. الحل ليس خفض السعر وتدمير الهامش؛ بل توفير "عينة رش صغيرة 3 مل أو 5 مل كهدية مع مشتريات الـ 50 مل العادية"، فإذا جرب العميل فوحان وثبات النيش طوال اليوم سيعود للشراء بقناعة تامة.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsSystem;
