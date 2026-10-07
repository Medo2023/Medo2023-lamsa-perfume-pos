import React, { useEffect, useState, useMemo } from 'react';
import { 
  Sale, 
  Product, 
  View, 
  StoreSettings, 
  DEFAULT_SETTINGS, 
  Expense,
  FinancialVault,
  WithdrawalTransaction,
  DailyClosure,
  AppUser,
  CalculationBreakdown,
  CustomCustomerRecord,
  calculateCustomerLoyaltyPoints,
  DashboardKpiCardId,
  DashboardSectionId,
  resolveDashboardLayoutConfig,
  isActualPaidOperationalExpense,
  isLiveProductionSale,
  isLiveProductionWithdrawal,
  getApprovedOilGramCost
} from '../types';
import { canViewProfits, canViewCosts, canViewVaults, canAccessView } from '../services/authService';
import CalculationBreakdownModal from './CalculationBreakdownModal';
import { getStoreSmartInsight, StoreAIInsight } from '../services/geminiService';
import { 
  TrendingUp, 
  Target, 
  Coins, 
  AlertOctagon, 
  ArrowUpRight, 
  Clock, 
  Calendar, 
  ShoppingBag, 
  Plus, 
  Sparkles, 
  Package, 
  Layers,
  FileText, 
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  Scale,
  Zap,
  Building,
  Users,
  Compass,
  ArrowRight,
  ShieldAlert,
  Flame,
  Lightbulb,
  RefreshCw,
  BellRing,
  HelpCircle,
  TrendingDown,
  Wallet,
  Calculator,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  ArrowLeft,
  Award,
  Crown,
  Sliders,
  ShieldCheck,
  Power,
  Layout,
  ArrowUp,
  ArrowDown,
  EyeOff
} from 'lucide-react';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  expenses?: Expense[];
  settings?: StoreSettings;
  vaults?: FinancialVault[];
  withdrawals?: WithdrawalTransaction[];
  currentClosure?: DailyClosure | null;
  currentUser?: AppUser | null;
  customCustomers?: CustomCustomerRecord[];
  onNavigate?: (view: View) => void;
  onOpenDayOperations?: () => void;
  onOpenLoyaltySettings?: () => void;
  onUpdateSettings?: (newSettings: StoreSettings) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  sales, 
  products, 
  expenses = [],
  settings = DEFAULT_SETTINGS, 
  vaults = [],
  withdrawals = [],
  currentClosure,
  currentUser,
  customCustomers = [],
  onNavigate,
  onOpenDayOperations,
  onOpenLoyaltySettings,
  onUpdateSettings
}) => {
  const [time, setTime] = useState(new Date());
  const [aiInsight, setAiInsight] = useState<StoreAIInsight | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [calculationModal, setCalculationModal] = useState<CalculationBreakdown | null>(null);
  const [isQuickReorderOpen, setIsQuickReorderOpen] = useState<boolean>(false);

  const isOwner = !currentUser || currentUser.role === 'OWNER';
  const dashboardLayout = useMemo(() => resolveDashboardLayoutConfig(settings), [settings]);

  const getSectionOrderClass = (sectionId: DashboardSectionId): string => {
    const order = dashboardLayout.sections.find((s) => s.id === sectionId)?.order || 1;
    const orderClasses: Record<number, string> = {
      1: 'order-1',
      2: 'order-2',
      3: 'order-3',
      4: 'order-4',
      5: 'order-5',
    };
    return orderClasses[order] || 'order-1';
  };

  const isSectionVisible = (sectionId: DashboardSectionId): boolean => {
    if (!isOwner) return true;
    return dashboardLayout.sections.find((s) => s.id === sectionId)?.visible !== false;
  };

  const handleOpenDashboardCustomizationInSettings = () => {
    try {
      sessionStorage.setItem('lamsa_open_settings_section', 'dashboard_layout');
    } catch {
      // ignore storage error
    }
    if (onNavigate) {
      onNavigate(View.SETTINGS);
    }
  };

  const handleQuickMoveKpiCard = (cardId: DashboardKpiCardId, direction: 'prev' | 'next') => {
    if (!onUpdateSettings || !isOwner) return;
    const visibleCards = dashboardLayout.kpiCards.filter((c) => c.visible);
    const visIdx = visibleCards.findIndex((c) => c.id === cardId);
    if (visIdx === -1) return;
    const swapVisIdx = direction === 'prev' ? visIdx - 1 : visIdx + 1;
    if (swapVisIdx < 0 || swapVisIdx >= visibleCards.length) return;

    const targetSwapId = visibleCards[swapVisIdx].id;
    const fullList = [...dashboardLayout.kpiCards];
    const idxA = fullList.findIndex((c) => c.id === cardId);
    const idxB = fullList.findIndex((c) => c.id === targetSwapId);
    if (idxA === -1 || idxB === -1) return;

    const temp = fullList[idxA];
    fullList[idxA] = fullList[idxB];
    fullList[idxB] = temp;

    const updatedCards = fullList.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    onUpdateSettings({
      ...settings,
      dashboardLayout: {
        ...dashboardLayout,
        presetName: 'custom',
        kpiCards: updatedCards,
      },
    });
  };

  const handleQuickHideKpiCard = (cardId: DashboardKpiCardId) => {
    if (!onUpdateSettings || !isOwner) return;
    const visibleCount = dashboardLayout.kpiCards.filter((c) => c.visible).length;
    if (visibleCount <= 1) return;

    const updatedCards = dashboardLayout.kpiCards.map((item, idx) => ({
      ...item,
      visible: item.id === cardId ? false : item.visible,
      order: idx + 1,
    }));

    onUpdateSettings({
      ...settings,
      dashboardLayout: {
        ...dashboardLayout,
        presetName: 'custom',
        kpiCards: updatedCards,
      },
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter today's live production sales only (Test Data ≠ Production Data)
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const todaysSales = useMemo(
    () => sales.filter((s) => s.date.startsWith(todayStr) && isLiveProductionSale(s)),
    [sales, todayStr]
  );
  const totalRevenue = useMemo(() => todaysSales.reduce((acc, sale) => acc + sale.totalPrice, 0), [todaysSales]);
  const totalCost = useMemo(() => todaysSales.reduce((acc, sale) => acc + sale.totalCost, 0), [todaysSales]);

  // Approved Operational Rules:
  // الموازنة الثابتة الشهرية = 15,000 جنيه | أساس التخطيط = 25 يوماً | المخصص التخطيطي اليومي = 600 جنيه
  const fixedMonthlyBudget = isOwner ? (settings.monthlyFixedBudget || 15000) : 0;
  const workDays = settings.monthlyWorkDays || 25;
  const dailyOperatingCost = fixedMonthlyBudget / workDays; // 600 EGP per day (المخصص التخطيطي اليومي - ليس مصروفاً نقدياً يومياً)

  // المساهمة = صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة (المساهمة لا تعني الربح)
  const todaysCommission = useMemo(() => {
    return todaysSales.reduce(
      (acc, sale) => acc + (sale.commissionAmount ?? Math.round((sale.totalPrice || 0) * 0.05)),
      0
    );
  }, [todaysSales]);

  const netContributionToday = totalRevenue - totalCost - todaysCommission;
  const grossProfit = netContributionToday;
  // نتيجة التشغيل وفق الموازنة = المساهمة ← المخصص الثابت للفترة (تظهر فقط عند وجود بيانات مبيعات فعلية مسجلة)
  const netProfitAfterDailyExpenses = todaysSales.length > 0 ? netContributionToday - dailyOperatingCost : 0;

  // Operational Targets:
  // الهدف الأولي للمساهمة اليومية = 600 جنيه
  // الهدف التطويري = 1,000 جنيه
  const targetPhase1 = 600;
  const targetPhase2 = 1000;

  const isBreakEvenCovered = todaysSales.length > 0 && netContributionToday >= targetPhase1;
  const isTargetAchieved = todaysSales.length > 0 && netContributionToday >= targetPhase2;
  const progressPhase1 = todaysSales.length > 0 ? Math.min(Math.max(0, (netContributionToday / targetPhase1) * 100), 100) : 0;
  const progressPhase2 = todaysSales.length > 0 ? Math.min(Math.max(0, (netContributionToday / targetPhase2) * 100), 100) : 0;

  // Remaining money to initial contribution target (only when actual sales exist)
  const remainingToBreakEven = todaysSales.length > 0 ? Math.max(0, targetPhase1 - netContributionToday) : 0;
  const hasRealProfit = todaysSales.length > 0 && netContributionToday >= targetPhase1;

  // Essence consumed today
  const todaysEssenceGrams = useMemo(() => {
    return todaysSales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + item.essenceGrams, 0);
    }, 0);
  }, [todaysSales]);

  // Today's total bottles count & average bill
  const todaysBottlesCount = useMemo(() => {
    return todaysSales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, it) => itemSum + (it.quantity || 1), 0);
    }, 0);
  }, [todaysSales]);

  const averageBill = useMemo(() => {
    if (todaysSales.length === 0) return 0;
    return Math.round(totalRevenue / todaysSales.length);
  }, [totalRevenue, todaysSales.length]);

  // Monthly aggregated metrics (§6: المساهمة الشهرية = صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة)
  const monthSales = useMemo(
    () => sales.filter((s) => s.date.startsWith(currentMonthStr) && isLiveProductionSale(s)),
    [sales, currentMonthStr]
  );
  const monthRevenue = useMemo(() => monthSales.reduce((acc, s) => acc + s.totalPrice, 0), [monthSales]);
  const monthCost = useMemo(() => monthSales.reduce((acc, s) => acc + s.totalCost, 0), [monthSales]);
  const monthCommissions = useMemo(() => {
    return monthSales.reduce(
      (acc, s) => acc + (s.commissionAmount ?? Math.round((s.totalPrice || 0) * 0.05)),
      0
    );
  }, [monthSales]);
  const monthNetContribution = useMemo(() => {
    return monthRevenue - monthCost - monthCommissions;
  }, [monthRevenue, monthCost, monthCommissions]);

  const monthTargetContribution = workDays * targetPhase2; // 25 * 1000 = 25,000 EGP
  const monthTargetBreakEven = fixedMonthlyBudget; // 15,000 EGP

  // Monthly Budget 15,000 metrics (only actual paid expenses, excluding planned monthly budget allocations and test data)
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(currentMonthStr) && isActualPaidOperationalExpense(e)),
    [expenses, currentMonthStr]
  );
  const budgetActuallyPaid = useMemo(() => monthExpenses.reduce((acc, e) => acc + e.amount, 0), [monthExpenses]);
  const budgetAllocatedSoFar = monthSales.length > 0 ? Math.min(fixedMonthlyBudget, Math.max(0, monthNetContribution)) : 0;
  const budgetRemaining = Math.max(0, fixedMonthlyBudget - budgetActuallyPaid);

  // Accumulated Deficit to date — computed strictly from actual recorded operational days in the month (no default/example figures)
  const activeOperationalDaysCount = useMemo(() => {
    return new Set(monthSales.map((s) => s.date.slice(0, 10))).size;
  }, [monthSales]);
  const elapsedWorkDays = Math.min(workDays, activeOperationalDaysCount);
  const requiredTargetToDate = elapsedWorkDays * targetPhase1;
  const accumulatedDeficit = monthSales.length > 0 ? Math.max(0, requiredTargetToDate - monthNetContribution) : 0;

  // Reserved Stock Cost (Restock Vault + Raw Inventory value)
  const restockVaultBalance = vaults.find(v => v.id === 'restock')?.currentBalance || 0;
  const rawStockValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const rate = getApprovedOilGramCost(p.type, settings);
      return sum + (p.stock_grams * rate);
    }, 0);
  }, [products, settings]);
  const totalReservedStockCost = restockVaultBalance + rawStockValue;

  // Accrued Commissions & Expenses
  const accruedCommissions = vaults.find(v => v.id === 'commissions')?.currentBalance || 0;
  const accruedExpenses = budgetRemaining;

  // Cash in Drawer vs Electronic
  const todaysCashSales = useMemo(() => {
    return todaysSales
      .filter(s => !s.paymentMethod || s.paymentMethod === 'نقدي')
      .reduce((sum, s) => sum + s.totalPrice, 0);
  }, [todaysSales]);

  const todaysElectronicSales = useMemo(() => {
    return todaysSales
      .filter(s => s.paymentMethod && s.paymentMethod !== 'نقدي')
      .reduce((sum, s) => sum + s.totalPrice, 0);
  }, [todaysSales]);

  // Strictly actual opening cash balance + actual cash sales - actual cash expenses (NO default 200 EGP from examples!)
  const todaysCashExpensesPaid = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayStr && isActualPaidOperationalExpense(e))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, todayStr]);

  const actualCashInDrawer =
    currentClosure?.actualCashInDrawer ??
    Math.max(0, (currentClosure?.openingCashBalance ?? 0) + todaysCashSales - todaysCashExpensesPaid);

  // Distributable Profit (الحد الآمن القابل للتوزيع للمالك — يظهر فقط من البيانات الفعلية المسجلة)
  const ownerProfitVault = vaults.find((v) => v.id === 'owner_profit');
  const distributableProfit =
    ownerProfitVault?.currentBalance !== undefined && ownerProfitVault.currentBalance > 0
      ? ownerProfitVault.currentBalance
      : monthSales.length > 0
      ? Math.max(0, monthNetContribution - fixedMonthlyBudget)
      : 0;

  // Total Withdrawals (actual live production withdrawals only)
  const totalWithdrawals = useMemo(() => {
    return withdrawals
      .filter((w) => isLiveProductionWithdrawal(w) && w.type !== 'capital_deposit')
      .reduce((sum, w) => sum + w.amount, 0);
  }, [withdrawals]);

  const lowStock = useMemo(() => products.filter((p) => p.stock_grams < 100), [products]);

  // Active Warnings & Alerts List
  const activeAlerts = useMemo(() => {
    const list: { title: string; type: 'danger' | 'warning' | 'info'; actionView?: View }[] = [];
    if (lowStock.length > 0) {
      list.push({ title: `${lowStock.length} عطور أوشكت على النفاد وتحتاج طلب شراء`, type: 'danger', actionView: View.INVENTORY });
    }
    if (accumulatedDeficit > 0) {
      list.push({ title: `يوجد عجز تراكمي بقيمة ${accumulatedDeficit.toFixed(0)} ج.م عن تارجت الشهر`, type: 'warning', actionView: View.OPERATIONS_SYSTEM });
    }
    if (!currentClosure || currentClosure.status === 'مغلق') {
      list.push({ title: 'يوم التشغيل مغلق حالياً - يجب فتح الوردية لبدء المبيعات', type: 'info' });
    }
    return list;
  }, [lowStock.length, accumulatedDeficit, currentClosure]);

  // Transparent calculation breakdown modal openers
  const openDistributableProfitBreakdown = () => {
    setCalculationModal({
      title: 'الربح القابل للتوزيع للمالك',
      description: 'صافي الفائض المالي الحر بعد تغطية تكلفة المنتجات، العمولات، وموازنة الـ 15,000 ج.م.',
      finalValue: Math.max(0, distributableProfit),
      unit: settings.currency,
      steps: [
        { label: 'إجمالي مبيعات الشهر', formula: 'المبيعات المعتمدة', value: monthRevenue, sign: '+' },
        { label: 'تكلفة خامات البضاعة المباعة', formula: 'استرداد رأس مال الزيوت والزجاجات', value: -monthCost, sign: '-' },
        { label: 'عمولات المبيعات (5%)', formula: 'العمولات المستحقة لطاقم العمل', value: -monthCommissions, sign: '-' },
        { label: 'الموازنة التشغيلية الثابتة', formula: 'الإيجار والرواتب والفواتير والهالك (15,000 ج)', value: -fixedMonthlyBudget, sign: '-' },
        { label: 'الربح الصافي القابل للتوزيع', formula: 'المتاح للمالك للسحب أو الاستثمار', value: Math.max(0, distributableProfit), sign: '=' }
      ]
    });
  };

  const openNetContributionBreakdown = () => {
    setCalculationModal({
      title: 'المساهمة الصافية لليوم',
      description: 'إيراد المبيعات بعد استبعاد تكلفة الزيوت والزجاجات وعمولة البائع.',
      finalValue: netContributionToday,
      unit: settings.currency,
      steps: [
        { label: 'مبيعات اليوم', formula: `${todaysSales.length} فاتورة مسجلة`, value: totalRevenue, sign: '+' },
        { label: 'تكلفة خامات العبوات المباعة', formula: `${todaysEssenceGrams} جم زيت + زجاجات`, value: -totalCost, sign: '-' },
        { label: 'عمولة البائع المستحقة (5%)', formula: '5% على العطور البخاخ (الرول 0%)', value: -todaysCommission, sign: '-' },
        { label: 'المساهمة الصافية الحالية', formula: 'المبلغ الموجه لتغطية الـ 600ج ثم الأرباح', value: netContributionToday, sign: '=' }
      ]
    });
  };

  const openBudgetBreakdown = () => {
    setCalculationModal({
      title: 'موازنة الـ 15,000 ج.م المعتمدة',
      description: 'توزيع المصاريف الثابتة على 25 يوم عمل = 600 ج.م/يوم لنقطة التعادل.',
      finalValue: fixedMonthlyBudget,
      unit: settings.currency,
      steps: [
        { label: 'مخصص الإيجار الشهري', formula: 'إيجار المحل المعتمد', value: 1200, sign: '+' },
        { label: 'مخصص الإدارة والتشغيل المعتمد', formula: 'مخصصات الإدارة والتشغيل الشهرية المحمية بالنظام', value: 11500, sign: '+' },
        { label: 'فواتير ومرافق ونظافة ونقل', formula: 'كهرباء 800 + نت 300 + تشغيل 600 + مرافق 300', value: 2000, sign: '+' },
        { label: 'احتياطي الهالك والتالف والفاقد', formula: 'مخصص أمان شهري', value: 300, sign: '+' },
        { label: 'إجمالي الموازنة الشهرية', formula: 'نقطة التعادل (25 يوم × 600 ج)', value: 15000, sign: '=' }
      ]
    });
  };

  const openDeficitBreakdown = () => {
    setCalculationModal({
      title: 'العجز المتراكم حتى اليوم',
      description: 'الفارق بين المستهدف التراكمي المطلوب حتى تاريخ اليوم وبين المساهمة المحققة فعلياً.',
      finalValue: accumulatedDeficit,
      unit: settings.currency,
      steps: [
        { label: 'المستهدف التراكمي المطلوب', formula: `${elapsedWorkDays} أيام عمل × 600 ج.م`, value: requiredTargetToDate, sign: '+' },
        { label: 'المساهمة الصافية المحققة فعلياً', formula: 'مجموع المساهمة لجميع مبيعات الشهر', value: -monthNetContribution, sign: '-' },
        { label: 'العجز المتراكم المطلوب تعويضه', formula: 'فارق المساهمة الواجب تغطيته بالأيام القادمة', value: accumulatedDeficit, sign: '=' }
      ]
    });
  };

  const openReservedStockBreakdown = () => {
    setCalculationModal({
      title: 'تكلفة المخزون ورأس المال المحجوز',
      description: 'رصيد قسم استرداد المخزون مضافاً إليه القيمة الدفترية للزيوت الخام بالمحل.',
      finalValue: totalReservedStockCost,
      unit: settings.currency,
      steps: [
        { label: 'رصيد محفظة إعادة شراء المخزون', formula: 'أموال بضاعة تم بيعها ومحجوزة للشراء', value: restockVaultBalance, sign: '+' },
        { label: 'قيمة الزيوت الخام المتوفرة بالرفوف', formula: 'جرامات المخزون الفعلي بسعر التكلفة', value: rawStockValue, sign: '+' },
        { label: 'إجمالي رأس مال المخزون المحفوظ', formula: 'أموال مخصصة للمخزون ليست أرباحاً', value: totalReservedStockCost, sign: '=' }
      ]
    });
  };

  const openCashBreakdown = () => {
    setCalculationModal({
      title: 'توزيع النقدية والمدفوعات الإلكترونية',
      description: 'مطابقة السيولة النقدية في الدرج ومبيعات المحافظ الإلكترونية والبطاقات البنكية.',
      finalValue: totalRevenue,
      unit: settings.currency,
      steps: [
        { label: 'النقدية المحصلة بالدرج (كاش)', formula: 'المبيعات النقدية المقبوضة فعلياً', value: todaysCashSales, sign: '+' },
        { label: 'مدفوعات إلكترونية / بطاقات', formula: 'محافظ إلكترونية وتحويلات بنكية', value: todaysElectronicSales, sign: '+' },
        { label: 'إجمالي مبيعات اليوم', formula: 'مجموع كافة طرق الدفع', value: totalRevenue, sign: '=' }
      ]
    });
  };

  // Average bottles needed to cover remaining daily expense based on approved bottle mix (avg ~42 EGP net contribution)
  const averageNetContributionPerBottle = 42;
  const bottlesRemainingToBreakEven = Math.max(0, Math.ceil((targetPhase1 - netContributionToday) / averageNetContributionPerBottle));
  const bottlesRemainingToFullTarget = Math.max(0, Math.ceil((targetPhase2 - netContributionToday) / averageNetContributionPerBottle));

  // Date and Time details in Arabic
  const arabicDayName = useMemo(() => {
    return time.toLocaleDateString('ar-EG', { weekday: 'long' });
  }, [time]);

  const arabicDateStr = useMemo(() => {
    return time.toLocaleDateString('ar-EG', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }, [time]);

  const arabicTimeFormatted = useMemo(() => {
    return time.toLocaleTimeString('ar-EG', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  }, [time]);

  // Dynamic greeting based on time of day
  const dynamicGreeting = useMemo(() => {
    const hours = time.getHours();
    if (hours >= 5 && hours < 12) {
      return {
        salute: 'صباح الخير والبركة ☀️',
        periodText: 'فترة الصباح والافتتاح',
        subtext: 'بداية نشاط يوم جديد؛ وقت التجهيز والتعطير وإطلاق مبيعات الصباح.'
      };
    } else if (hours >= 12 && hours < 17) {
      return {
        salute: 'طاب يومك بكل خير ⛅',
        periodText: 'فترة الظهيرة وما بعد الظهر',
        subtext: 'ذروة حركة النهار؛ وقت التركيز على العطور العملية والرشوش الهادئة.'
      };
    } else if (hours >= 17 && hours < 22) {
      return {
        salute: 'مساء العطور الفاخرة والأنوار 🌙',
        periodText: 'فترة المساء والذروة البيعية',
        subtext: 'أفضل أوقات البيع وتحقيق التارجت؛ قدم العطور الشرقية والنيش ذات الهامش الأعلى.'
      };
    } else {
      return {
        salute: 'أهلاً بك في لمسة عطر ✨',
        periodText: 'الفترة الليلية الهادئة',
        subtext: 'مراجعة ختام اليوم وتأكيد إغلاق الصناديق وتسليم الوردية.'
      };
    }
  }, [time]);

  // Trigger AI Smart Insight
  const refreshAiAdvisor = async () => {
    setLoadingAi(true);
    try {
      const insight = await getStoreSmartInsight({
        todaySalesCount: todaysSales.length,
        todayRevenue: totalRevenue,
        netContribution: netContributionToday,
        targetBreakEven: targetPhase1,
        targetFull: targetPhase2,
        lowStockCount: lowStock.length,
        dayName: arabicDayName,
        timeOfDay: dynamicGreeting.periodText
      });
      setAiInsight(insight);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    refreshAiAdvisor();
  }, [todaysSales.length, totalRevenue]);

  // Live Loyalty & Profit-Guard Summary for Main Dashboard
  const loyaltyDashboardSummary = useMemo(() => {
    const customerMap = new Map<string, { orders: number; spent: number; bonus: number; redeemed: number }>();
    customCustomers.forEach(c => {
      const k = (c.phone || '').replace(/\s+/g, '') || c.name.trim().toLowerCase();
      if (k) {
        customerMap.set(k, {
          orders: 0,
          spent: 0,
          bonus: Number(c.bonusPoints) || 0,
          redeemed: Number(c.redeemedPoints) || 0,
        });
      }
    });

    sales.filter(s => !s.isReversed).forEach(s => {
      const phone = (s.customerPhone || '').replace(/\s+/g, '');
      const name = (s.customerName || '').trim();
      if (!phone && (!name || name === 'عميل نقدي')) return;
      const k = phone || name.toLowerCase();
      const existing = customerMap.get(k) || { orders: 0, spent: 0, bonus: 0, redeemed: 0 };
      existing.orders += 1;
      existing.spent += Number(s.totalPrice) || 0;
      customerMap.set(k, existing);
    });

    let totalActivePoints = 0;
    let totalPointsCashValue = 0;
    customerMap.forEach(val => {
      const calc = calculateCustomerLoyaltyPoints({
        ordersCount: val.orders,
        totalSpent: val.spent,
        bonusPoints: val.bonus,
        redeemedPoints: val.redeemed,
        settings,
      });
      totalActivePoints += calc.netAvailablePoints || 0;
      totalPointsCashValue += calc.pointsCashValue || 0;
    });

    const loyaltyEnabled = settings.loyaltyEnabled !== false;
    const loyaltyAutoAI = settings.loyaltyAutoAI !== false;
    const loyaltyProtectBreakEven = settings.loyaltyProtectBreakEven !== false;
    const baseMaxDiscountPct = settings.loyaltyMaxBillDiscountPercent || 15;
    const effectiveMaxDiscountPct =
      loyaltyProtectBreakEven && !hasRealProfit
        ? Math.min(8, baseMaxDiscountPct)
        : loyaltyAutoAI && isTargetAchieved
        ? Math.min(20, baseMaxDiscountPct + 3)
        : baseMaxDiscountPct;

    return {
      registeredCustomersCount: customerMap.size,
      totalActivePoints,
      totalPointsCashValue,
      loyaltyEnabled,
      loyaltyAutoAI,
      loyaltyProtectBreakEven,
      effectiveMaxDiscountPct,
      earnStepEgp: settings.loyaltyEarnStepEgp || 10,
      cashPerPointEgp: settings.loyaltyCashPerPointEgp || 0.6,
      minSafeMarginEgp: settings.loyaltyMinSafeMarginEgp ?? 25,
    };
  }, [customCustomers, sales, settings, hasRealProfit, isTargetAchieved]);

  const handleQuickToggleLoyalty = () => {
    if (!onUpdateSettings) return;
    onUpdateSettings({
      ...settings,
      loyaltyEnabled: settings.loyaltyEnabled === false ? true : false,
    });
  };

  const handleQuickToggleAutoAI = () => {
    if (!onUpdateSettings) return;
    onUpdateSettings({
      ...settings,
      loyaltyAutoAI: settings.loyaltyAutoAI === false ? true : false,
    });
  };

  return (
    <div className="px-3 sm:px-5 lg:px-6 pt-1 max-w-[1480px] mx-auto flex flex-col gap-4 pb-14 animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* 1. WAREDPOS × APPLE × WINDOWS 13 EXECUTIVE WELCOME BAR   */}
      {/* (Clean single-deck identity + quick actions, zero duplication) */}
      {/* ======================================================== */}
      <div className="order-none relative overflow-hidden rounded-[22px] apple-bento-card p-3.5 sm:p-4 bg-white/95 border border-slate-200/90 shadow-2xs">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12">
              <img 
                src={settings.logoUrl || "https://l.top4top.io/p_31142jfec0.png"} 
                alt={settings.storeName || "لمسة عطر"} 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 max-w-[48px] max-h-[48px] object-contain bg-white rounded-2xl p-1 shadow-2xs border border-slate-200/80 block" 
              />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-[#0F172A] text-amber-400 flex items-center justify-center border border-white">
                <Sparkles size={9} />
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black text-[#0067C0] bg-[#0067C0]/[0.08] px-2 py-0.5 rounded-md border border-[#0067C0]/20">
                  {dynamicGreeting.periodText}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">{dynamicGreeting.salute}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                  hasRealProfit
                    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25'
                    : 'bg-amber-500/10 text-amber-900 border-amber-500/25'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasRealProfit ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{hasRealProfit ? 'منطقة الربح الصافي' : `متبقي ${remainingToBreakEven.toFixed(0)} ج للتعادل`}</span>
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A] leading-tight">
                متجر <span className="text-[#0067C0]">{settings.storeName || 'لمسة عطر'}</span>
                <span className="text-xs font-bold text-[#9A6E23] mr-2 inline-block">
                  — {settings.storeSlogan || 'أثر يبقى وذكرى تدوم'}
                </span>
              </h1>
            </div>
          </div>

          {/* Sleek WaredPOS × Windows 13 Segmented Action Dock */}
          {onNavigate && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => onNavigate(View.POS)}
                className="apple-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0067C0] hover:bg-[#005A9E] text-white font-black text-xs shadow-2xs cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>نقطة البيع (الكاشير)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate(View.OPERATIONS_SYSTEM)}
                className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-amber-300 font-black text-xs shadow-2xs cursor-pointer"
              >
                <Target size={13} className="text-amber-300" />
                <span>التارجت والحوافز</span>
              </button>

              {canAccessView(currentUser ?? null, View.REPORTS) && (
                <button
                  type="button"
                  onClick={() => onNavigate(View.REPORTS)}
                  className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-xs border border-slate-200/90 shadow-2xs cursor-pointer"
                >
                  <FileText size={13} className="text-[#0067C0]" />
                  <span>الفواتير</span>
                </button>
              )}

              {canAccessView(currentUser ?? null, View.INVENTORY) && (
                <button
                  type="button"
                  onClick={() => onNavigate(View.INVENTORY)}
                  className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-xs border border-slate-200/90 shadow-2xs cursor-pointer"
                >
                  <Package size={13} className="text-emerald-600" />
                  <span>المخزون</span>
                </button>
              )}

              {canAccessView(currentUser ?? null, View.FINANCIAL_VAULTS) && (
                <button
                  type="button"
                  onClick={() => onNavigate(View.FINANCIAL_VAULTS)}
                  className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-xs border border-slate-200/90 shadow-2xs cursor-pointer"
                >
                  <Wallet size={13} className="text-[#9A6E23]" />
                  <span>الخزائن</span>
                </button>
              )}

              {isOwner && (
                <button
                  type="button"
                  onClick={handleOpenDashboardCustomizationInSettings}
                  className="apple-btn flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-black text-xs border border-slate-200/90 shadow-2xs cursor-pointer"
                  title="تخصيص وترتيب البطاقات"
                >
                  <Sliders size={13} className="text-[#0067C0]" />
                  <span className="hidden sm:inline">تخصيص</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. APPLE INTELLIGENCE BENTO ROW: ADVISOR + TARGET ENGINE */}
      {/* ======================================================== */}
      {isSectionVisible('ai_advisor_and_target') && (
      <div className={`${getSectionOrderClass('ai_advisor_and_target')} grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch`}>
        {/* Right 7 Cols: Smart Operational AI Advisor */}
        <div className="lg:col-span-7 apple-bento-card rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-slate-200/90 bg-white/95 shadow-2xs">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
                  !hasRealProfit ? 'bg-rose-600 text-white' : 'bg-[#0071E3] text-white'
                }`}>
                  {!hasRealProfit ? <ShieldAlert size={19} /> : <Sparkles size={19} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                      مستشار الإدارة الذكي لتحفيز المبيعات والتارجت
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3]">
                      مباشر
                    </span>
                  </div>
                  <span className="text-[11px] text-[#86868B] block font-medium">
                    قراءة تحليلية تربط المبيعات والمساهمة والتارجت اليومي (600 / 1,000 ج) وتحفيز إدارة المتجر
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-3 py-1 rounded-xl ${
                  aiInsight?.alertType === 'danger'
                    ? 'bg-rose-100 text-rose-800'
                    : aiInsight?.alertType === 'warning'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {aiInsight?.statusBadge || (!hasRealProfit ? 'تحت نقطة التعادل' : 'ربحية آمنة')}
                </span>

                <button
                  type="button"
                  onClick={refreshAiAdvisor}
                  disabled={loadingAi}
                  className="apple-btn p-2 rounded-xl bg-white border border-black/[0.08] text-[#1D1D1F] hover:bg-black/[0.03] cursor-pointer"
                  title="تحديث التحليل الذكي"
                >
                  <RefreshCw size={14} className={loadingAi ? 'animate-spin text-[#0071E3]' : ''} />
                </button>
              </div>
            </div>

            <div className="pt-4 space-y-3.5">
              <div className="space-y-1">
                <h3 className={`text-sm sm:text-base font-black ${
                  !hasRealProfit ? 'text-rose-700' : 'text-emerald-800'
                }`}>
                  {aiInsight?.statusTitle || (!hasRealProfit 
                    ? '⚠️ تركيز الأولوية: تغطية تارجت المساهمة اليومي الثابت (600 ج.م)'
                    : '🎉 أداء متوازن: تم تغطية التعادل والانتقال لتارجت النمو (1,000 ج.م)')}
                </h3>
                <p className="text-xs text-[#3A3A3C] leading-relaxed font-medium">
                  {aiInsight?.mainMessage || (
                    !hasRealProfit 
                      ? `المتجر يحتاج إلى ${remainingToBreakEven.toFixed(0)} ج.م مساهمة صافية إضافية لتغطية تكلفة تشغيل يوم ${arabicDayName} (حوالي ${Math.max(1, Math.ceil(remainingToBreakEven / 42))} عبوة من حجم 30 أو 50 مل). ركز على ترقية الأحجام والبيع التكميلي لتحقيق التارجت سريعاً.`
                      : `تم تأمين مصاريف اليوم بالكامل! الفائض المتحقق الآن (+${netProfitAfterDailyExpenses.toFixed(0)} ج.م) يمثل ربحاً حقيقياً خالصاً، والتركيز الآن على بلوغ تارجت الـ 1,000 ج.م ومضاعفة عمولة المبيعات لـ 7%.`
                  )}
                </p>
              </div>

              {aiInsight?.actionAdvice && aiInsight.actionAdvice.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {aiInsight.actionAdvice.map((advice, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-white/90 border border-black/[0.06] space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-[#0071E3]">
                        <Lightbulb size={13} className="text-amber-500 shrink-0" />
                        <span>خطة مبيعات {idx + 1}</span>
                      </div>
                      <p className="text-[11px] text-[#3A3A3C] leading-relaxed">{advice}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tactical Strip */}
          <div className="mt-4 pt-3 border-t border-black/[0.05] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <Flame size={15} className="text-amber-600 shrink-0" />
              <span className="text-[11px]">
                {aiInsight?.tacticalPrompt || 'اقترح عبوة 30 مل (+46.5 ج مساهمة) أو 50 مل (+38.5 ج) أو 100 مل (+182.5 ج) لتسريع تحقيق التارجت.'}
              </span>
            </div>
            {activeAlerts.length > 0 && activeAlerts[0].actionView && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(activeAlerts[0].actionView!)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-900 text-[11px] font-bold hover:bg-amber-500/25 cursor-pointer"
              >
                تنبيه: {activeAlerts[0].title}
              </button>
            )}
          </div>
        </div>

        {/* Left 5 Cols: Sales Contribution, Target & Store Management Motivation Hub */}
        <div 
          className="lg:col-span-5 light-surface rounded-[26px] p-5 sm:p-6 bg-[#e6e5ef] text-[#0F172A] flex flex-col justify-between border border-[#c5b5d8] shadow-sm transition-all duration-300"
          data-surface="light"
        >
          <div className="space-y-4">
            {/* Header & Commission Tier Indicator */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#d8cce8]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs">
                  <Target size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-[#0F172A]">
                      مركز المساهمة والتارجت وتشجيع المبيعات
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#4A3E56] mt-0.5 font-bold">
                    متابعة لحظية للمبيعات والمساهمة وحافز إدارة المتجر (طارق)
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border shrink-0 ${
                todaysBottlesCount > 10
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-950 border-amber-300'
              }`}>
                {todaysBottlesCount > 10 ? '🔥 شريحة عمولة 7% مفعلة' : `شريحة 5% (${todaysBottlesCount}/10 عبوات)`}
              </span>
            </div>

            {/* 3 Mini Bento Pills inside Target & Contribution Card */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-white/95 border border-[#d8cce8] shadow-2xs">
                <span className="text-[10px] text-[#2D2438] font-black block">مساهمة اليوم الصافية</span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-800 mt-0.5 block">
                  {Math.round(netContributionToday).toLocaleString('ar-EG')}
                </span>
                <span className="text-[10px] text-[#5C4D6E] font-mono font-bold">
                  من تارجت {targetPhase1} {settings.currency}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/95 border border-[#d8cce8] shadow-2xs">
                <span className="text-[10px] text-[#2D2438] font-black block">مبيعات وعبوات اليوم</span>
                <span className="text-base sm:text-lg font-black font-mono text-amber-900 mt-0.5 block">
                  {totalRevenue.toLocaleString('ar-EG')}
                </span>
                <span className="text-[10px] text-[#5C4D6E] font-mono font-bold">
                  {todaysBottlesCount} عبوة · {todaysSales.length} فاتورة
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/95 border border-[#d8cce8] shadow-2xs">
                <span className="text-[10px] text-[#2D2438] font-black block">عمولة وحافز المبيعات</span>
                <span className="text-base sm:text-lg font-black font-mono text-blue-800 mt-0.5 block">
                  +{Math.round(todaysCommission)} {settings.currency}
                </span>
                <span className="text-[10px] text-[#5C4D6E] font-bold">
                  {todaysBottlesCount >= 10 ? 'شريحة 7% التشجيعية 🔥' : `شريحة 5% (${Math.max(0, 10 - todaysBottlesCount)} عبوات للـ 7%)`}
                </span>
              </div>
            </div>

            {/* Live Target Progress & Motivation Strip */}
            <div className="p-3 rounded-2xl bg-white/95 border border-[#d8cce8] space-y-2 text-[11px] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[#0F172A] font-black">
                  {!hasRealProfit
                    ? `متبقي لتغطية تارجت الـ 600 ج: ${Math.round(remainingToBreakEven)} ${settings.currency}`
                    : `تم تغطية الـ 600 ج! متبقي لتارجت الـ 1,000 ج: ${Math.max(0, Math.round(targetPhase2 - netContributionToday))} ${settings.currency}`}
                </span>
                <span className="font-mono font-black text-emerald-800">
                  {Math.min(100, Math.round((netContributionToday / targetPhase1) * 100))}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-purple-100/80 overflow-hidden border border-purple-200">
                <div
                  className="h-full bg-gradient-to-r from-[#0067C0] via-emerald-600 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((netContributionToday / targetPhase1) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#4A3E56] pt-0.5">
                <span className="font-bold text-[#2D2438]">
                  {todaysBottlesCount < 10
                    ? `💡 بيع ${10 - todaysBottlesCount} عبوات إضافية اليوم يرفع العمولة إلى 7% فوراً`
                    : '🏆 ممتاز! كل عبوة إضافية اليوم تُحتسب بعمولة تشجيعية 7%'}
                </span>
                <span className="font-mono text-[#4A3E56] font-bold">
                  الشهر: {Math.round(monthNetContribution).toLocaleString('ar-EG')} / {monthTargetBreakEven.toLocaleString('ar-EG')} ج
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-3.5 mt-3 border-t border-[#d8cce8] grid grid-cols-2 gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(View.OPERATIONS_SYSTEM)}
                className="apple-btn py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C49746] to-[#B38332] hover:opacity-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Target size={14} />
                <span>خطة التارجت والمساهمة</span>
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(View.POS)}
                className="apple-btn py-2.5 px-3 rounded-xl bg-white hover:bg-amber-50/50 text-[#0F172A] text-xs font-black flex items-center justify-center gap-1.5 border border-[#c5b5d8] shadow-2xs cursor-pointer"
              >
                <ShoppingBag size={14} className="text-emerald-700" />
                <span>تنشيط المبيعات بالكاشير</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ======================================================== */}
      {/* 👑 لوحة د. محمد: المؤشرات التنفيذية الرئيسية والشفافية    */}
      {/* (تعرض للمالك فقط، أما الموظفون فيرون مؤشرات التشغيل المخصصة) */}
      {/* ======================================================== */}
      {canViewProfits(currentUser ?? null) ? (
        <>
          {isSectionVisible('kpi_executive_cards') && (
            <div className={`${getSectionOrderClass('kpi_executive_cards')} space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-[#0071E3]" />
                  <h2 className="text-sm font-black text-[#1D1D1F]">
                    لوحة المؤشرات والتقارير المالية والتشغيلية (اضغط على أي بطاقة لعرض الاحتساب)
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[#86868B] font-medium hidden xl:inline">
                    سلسلة التتبع: المبيعات ← التكلفة ← العمولات ← الموازنة = الربح المتاح
                  </span>

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsQuickReorderOpen((prev) => !prev)}
                        className={`apple-btn px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isQuickReorderOpen
                            ? 'bg-[#1D1D1F] text-amber-300 border-[#1D1D1F]'
                            : 'bg-white text-[#1D1D1F] border-black/[0.08] hover:bg-black/[0.03]'
                        }`}
                      >
                        <Layout size={13} />
                        <span>{isQuickReorderOpen ? 'إنهاء الترتيب السريع' : 'ترتيب سريع للبطاقات'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenDashboardCustomizationInSettings}
                        className="apple-btn px-3 py-1.5 rounded-xl bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] text-[11px] font-black border border-[#0071E3]/25 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Sliders size={13} />
                        <span>تخصيص البطاقات في إعدادات المتجر</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Customizable 12 Metric Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {dashboardLayout.kpiCards
                  .filter((c) => c.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((cardItem, visIndex, visArr) => {
                    const renderReorderStrip = () => {
                      if (!isQuickReorderOpen || !isOwner) return null;
                      return (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mb-2.5 pb-2 border-b border-black/[0.06] flex items-center justify-between gap-1 bg-black/[0.03] -mx-2 px-2.5 py-1.5 rounded-xl"
                        >
                          <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-[#1D1D1F] text-amber-300">
                            #{visIndex + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={visIndex === 0}
                              onClick={() => handleQuickMoveKpiCard(cardItem.id, 'prev')}
                              className="p-1 rounded-lg bg-white border border-black/[0.08] text-[#1D1D1F] disabled:opacity-30 hover:bg-black/[0.05] cursor-pointer"
                              title="تقديم البطاقة"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={visIndex === visArr.length - 1}
                              onClick={() => handleQuickMoveKpiCard(cardItem.id, 'next')}
                              className="p-1 rounded-lg bg-white border border-black/[0.08] text-[#1D1D1F] disabled:opacity-30 hover:bg-black/[0.05] cursor-pointer"
                              title="تأخير البطاقة"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickHideKpiCard(cardItem.id)}
                              className="p-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
                              title="إخفاء هذه البطاقة"
                            >
                              <EyeOff size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    };

                    switch (cardItem.id) {
                      case 'today_revenue':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openCashBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#0067C0]/45 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-[#0067C0] transition-colors">
                                  مبيعات اليوم
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-[#0067C0]/10 text-[#0067C0] flex items-center justify-center">
                                  <DollarSign size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {totalRevenue.toLocaleString('ar-EG')}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                {todaysSales.length} فواتير · {todaysBottlesCount} عبوة · متوسط {averageBill} ج
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0067C0] font-bold">
                              <span>عرض تفصيل النقدية والإلكتروني</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'today_cogs':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openReservedStockBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#0067C0]/45 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                                  تكلفة المبيعات (خام)
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                  <Scale size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {totalCost.toLocaleString('ar-EG')}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                {todaysEssenceGrams} جم زيت مستهلك · تؤول لمحفظة المخزون
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-bold">
                              <span>عرض رأس مال المخزون</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'today_net_contribution':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openNetContributionBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#0067C0]/45 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-[#0067C0] transition-colors">
                                  المساهمة الصافية اليوم
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-[#0067C0]/10 text-[#0067C0] flex items-center justify-center">
                                  <TrendingUp size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0067C0] font-mono">
                                +{netContributionToday.toFixed(0)}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                بعد خصم الخام وعمولة طارق ({todaysCommission.toFixed(0)} ج)
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0067C0] font-bold">
                              <span>عرض معادلة المساهمة</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'real_net_profit':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openDistributableProfitBreakdown}
                            className={`apple-glass-card rounded-2xl p-4 sm:p-5 border bg-white/95 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group ${
                              todaysSales.length === 0
                                ? 'border-slate-200/90 hover:border-[#0067C0]/45'
                                : hasRealProfit
                                ? 'border-emerald-300/80 hover:border-emerald-500'
                                : 'border-rose-300/80 hover:border-rose-400'
                            }`}
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`text-xs font-bold ${
                                    todaysSales.length === 0
                                      ? 'text-slate-600'
                                      : hasRealProfit
                                      ? 'text-emerald-800'
                                      : 'text-rose-800'
                                  }`}
                                >
                                  نتيجة التشغيل وفق الموازنة
                                </span>
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    todaysSales.length === 0
                                      ? 'bg-slate-100 text-slate-700'
                                      : hasRealProfit
                                      ? 'bg-emerald-500/12 text-emerald-700'
                                      : 'bg-rose-500/12 text-rose-700'
                                  }`}
                                >
                                  {hasRealProfit ? <Zap size={16} /> : <Scale size={16} />}
                                </div>
                              </div>
                              {todaysSales.length === 0 ? (
                                <>
                                  <div className="text-sm sm:text-base font-black text-[#0F172A]">
                                    لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-1 font-bold">
                                    المخصص التخطيطي اليومي (600 ج) ليس مصروفاً نقدياً ولا يسجل عجزاً قبل بدء المبيعات الفعلية
                                  </p>
                                </>
                              ) : hasRealProfit ? (
                                <>
                                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                                    +{netProfitAfterDailyExpenses.toFixed(0)}{' '}
                                    <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                                  </div>
                                  <p className="text-[10px] text-emerald-800 mt-1 font-bold">
                                    المساهمة ({netContributionToday.toFixed(0)} ج) ← المخصص التخطيطي (600 ج)
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
                                    -{remainingToBreakEven.toFixed(0)} {settings.currency}
                                  </div>
                                  <p className="text-[10px] text-rose-900 mt-1 font-bold">
                                    المساهمة ({netContributionToday.toFixed(0)} ج) ← المخصص التخطيطي (600 ج)
                                  </p>
                                </>
                              )}
                            </div>
                            <div
                              className={`mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold ${
                                todaysSales.length === 0
                                  ? 'text-slate-600'
                                  : hasRealProfit
                                  ? 'text-emerald-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              <span>المساهمة ← المخصص الثابت للفترة</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'today_target':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={() => onNavigate && onNavigate(View.OPERATIONS_SYSTEM)}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#C49746]/50 hover:shadow-md transition-all"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600">Target اليوم والتحقيق</span>
                                <div className="w-8 h-8 rounded-xl bg-[#C49746]/15 text-[#9A6E23] flex items-center justify-center">
                                  <Target size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {progressPhase1.toFixed(0)}%{' '}
                                <span className="text-xs font-normal text-slate-400">(تعادل 600ج)</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                المستهدف الربحي الكامل: {targetPhase2} ج ({progressPhase2.toFixed(0)}%)
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#9A6E23] font-bold">
                              <span>فتح نظام التشغيل والتارجت</span>
                              <ArrowLeft size={12} />
                            </div>
                          </div>
                        );

                      case 'accumulated_deficit':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openDeficitBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-rose-400 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-rose-700 transition-colors">
                                  العجز المتراكم للشهر
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center">
                                  <ShieldAlert size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {accumulatedDeficit > 0 ? `${accumulatedDeficit.toFixed(0)}` : '0'}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                {accumulatedDeficit > 0
                                  ? 'مطلوب تعويضه من مبيعات الأيام القادمة'
                                  : 'لا يوجد عجز متراكم بحمد الله'}
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-bold">
                              <span>عرض تفصيل العجز التراكمي</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'monthly_budget_15k':
                        if (!isOwner) return null;
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openBudgetBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#0067C0]/45 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-[#0067C0] transition-colors">
                                  موازنة الـ 15,000 ج
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                  <Building size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {budgetAllocatedSoFar.toLocaleString('ar-EG')}{' '}
                                <span className="text-xs font-normal text-slate-400">/ {fixedMonthlyBudget}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                صُرف فعلياً: {budgetActuallyPaid} ج · متبقي للتغطية: {budgetRemaining} ج
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0067C0] font-bold">
                              <span>عرض بنود الموازنة الـ 11</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'distributable_profit':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openDistributableProfitBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600">الربح المتاح للتوزيع</span>
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-700 flex items-center justify-center">
                                  <Coins size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                                {Math.max(0, distributableProfit).toLocaleString('ar-EG')}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-bold">
                                صافي الفائض القابل للسحب للمالك
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-emerald-700 font-bold">
                              <span>عرض سلسلة احتساب الربح المتاح</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'cash_in_drawer':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openCashBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#0067C0]/45 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-[#0067C0] transition-colors">
                                  السيولة النقدية بالدرج
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-700 flex items-center justify-center">
                                  <Wallet size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {actualCashInDrawer.toLocaleString('ar-EG')}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                كاش اليوم: {todaysCashSales} ج · إلكتروني: {todaysElectronicSales} ج
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0067C0] font-bold">
                              <span>مطابقة الكاش والمحافظ</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'bottles_and_essence':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={() => onNavigate && onNavigate(View.INVENTORY)}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#C49746]/50 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-[#9A6E23] transition-colors">
                                  العبوات واستهلاك الزيوت
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-[#C49746]/15 text-[#9A6E23] flex items-center justify-center">
                                  <Package size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {todaysBottlesCount}{' '}
                                <span className="text-xs font-normal text-slate-400">عبوة ({todaysEssenceGrams} جم)</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                نقص المخزون الحرج (&lt;100جم): {lowStock.length} عطور
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#9A6E23] font-bold">
                              <span>فتح جرد واستهلاك المخزون</span>
                              <ArrowLeft size={12} />
                            </div>
                          </div>
                        );

                      case 'reserved_inventory_capital':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={openReservedStockBreakdown}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#0067C0]/45 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-[#0067C0] transition-colors">
                                  رأس مال المخزون المحجوز
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-[#0067C0]/10 text-[#0067C0] flex items-center justify-center">
                                  <Layers size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {Math.round(totalReservedStockCost).toLocaleString('ar-EG')}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                محفظة الاسترداد: {Math.round(restockVaultBalance)} ج · خام بالرف: {Math.round(rawStockValue).toLocaleString('ar-EG')} ج
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0067C0] font-bold">
                              <span>تفصيل رأس مال البضاعة</span>
                              <Info size={12} />
                            </div>
                          </div>
                        );

                      case 'commissions_and_incentives':
                        return (
                          <div
                            key={cardItem.id}
                            onClick={() => onNavigate && onNavigate(View.OPERATIONS_SYSTEM)}
                            className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-white/95 flex flex-col justify-between cursor-pointer hover:border-[#0067C0]/45 hover:shadow-md transition-all group"
                          >
                            <div>
                              {renderReorderStrip()}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-[#0067C0] transition-colors">
                                  عمولات وحوافز المبيعات
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-[#C49746]/15 text-[#9A6E23] flex items-center justify-center">
                                  <Award size={16} />
                                </div>
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono">
                                {Math.round(todaysCommission).toLocaleString('ar-EG')}{' '}
                                <span className="text-xs font-normal text-slate-400">{settings.currency} اليوم</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                إجمالي عمولات الشهر: {Math.round(monthCommissions).toLocaleString('ar-EG')} ج ({todaysBottlesCount >= 10 ? 'شريحة 7%' : 'شريحة 5%'})
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0067C0] font-bold">
                              <span>فتح نظام العمولات والحوافز</span>
                              <ArrowLeft size={12} />
                            </div>
                          </div>
                        );

                      default:
                        return null;
                    }
                  })}
              </div>
            </div>
          )}


      {/* ======================================================== */}
      {/* LOSS WARNING & MOTIVATIONAL STORE ACTIVATION BANNER     */}
      {/* Displayed strictly when actual sales exist and daily break-even is not reached */}
      {/* ======================================================== */}
      {todaysSales.length > 0 && !hasRealProfit && isSectionVisible('loss_warning_banner') && (
        <div className={`${getSectionOrderClass('loss_warning_banner')} rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-rose-900 via-[#1D1D1F] to-slate-900 text-white shadow-apple-lg border border-rose-500/30 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <Flame size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px]">
                    خطر العجز التشغيلي
                  </span>
                  <span className="text-xs text-rose-300 font-bold">
                    حصة مصاريف اليوم: 600 جنيه مصري (إيجار ورواتب)
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  تحريك المتجر وجلب عمليات بيع فورية هو طوق النجاة لتحقيق الأرباح!
                </h3>
                <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                  طالما لم نكسر حاجز الـ 600 ج.م مساهمة، فالمتجر في حالة نزيف مالي للمصاريف الثابتة. كل ساعة تمر دون بيع تخصم من الميزانية العامة للمتجر. المطلوب من البائع طارق وإدارة المحل التحرك الذكي السريع!
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
              <div className="text-center sm:text-left bg-white/10 p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] text-gray-400 block font-sans">المتبقي لكسر الخسارة:</span>
                <span className="font-mono font-black text-2xl text-rose-400">{remainingToBreakEven.toFixed(0)} {settings.currency}</span>
                <span className="text-[10px] text-amber-300 block font-semibold">≈ {bottlesRemainingToBreakEven} زجاجات عطر فقط</span>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate(View.POS)}
                  className="apple-btn w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus size={15} />
                  <span>تسجيل أول بيعة لكسر العجز</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Winning Mix to Cover the 600 EGP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 block text-[10px]">خيار سريع 1:</span>
              <span className="font-bold text-white block">4 عبوات 50 مل</span>
              <span className="text-emerald-400 text-[10px] font-mono">+154 ج مساهمة</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 block text-[10px]">خيار سريع 2:</span>
              <span className="font-bold text-white block">4 عبوات 30 مل</span>
              <span className="text-emerald-400 text-[10px] font-mono">+186 ج مساهمة</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 block text-[10px]">خيار سريع 3:</span>
              <span className="font-bold text-white block">2 عبوة 25 مل</span>
              <span className="text-emerald-400 text-[10px] font-mono">+114 ج مساهمة</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 block text-[10px]">خيار سريع 4:</span>
              <span className="font-bold text-white block">1 عبوة 100 مل نيش</span>
              <span className="text-emerald-400 text-[10px] font-mono">+182.5 ج مساهمة</span>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        /* Staff Operational Metrics (Zero Confidential Data) */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#0071E3]" />
              <h2 className="text-sm font-black text-[#1D1D1F]">
                مؤشرات التشغيل والمبيعات اليومية للوردية
              </h2>
            </div>
            <span className="text-[11px] text-[#86868B] font-medium hidden sm:inline">
              متابعة الفواتير المحصلة وحصيلة الخامات المعبأة
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Daily Sales */}
            <div className="apple-glass-card rounded-3xl p-5 border border-[#0071E3]/25 bg-gradient-to-br from-white via-[#0071E3]/[0.06] to-sky-500/[0.12] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#86868B]">مبيعات اليوم المسجلة</span>
                <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#1D1D1F] font-mono">
                  {totalRevenue.toLocaleString('ar-EG')}{' '}
                  <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
                </div>
                <p className="text-[10px] text-[#86868B] mt-1 font-medium">
                  من {todaysSales.length} عملية بيع ناجحة
                </p>
              </div>
            </div>

            {/* 2. Bottles Count */}
            <div className="apple-glass-card rounded-3xl p-5 border border-purple-300/60 bg-gradient-to-br from-white via-purple-500/[0.06] to-indigo-500/[0.12] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#86868B]">العبوات المجهزة</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Package size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-purple-700 font-mono">
                  {todaysBottlesCount}{' '}
                  <span className="text-xs font-normal text-[#86868B]">عبوة</span>
                </div>
                <p className="text-[10px] text-[#86868B] mt-1 font-medium">
                  متوسط الفاتورة: {averageBill} {settings.currency}
                </p>
              </div>
            </div>

            {/* 3. Essence Consumed */}
            <div className="apple-glass-card rounded-3xl p-5 border border-amber-300/60 bg-gradient-to-br from-white via-amber-500/[0.06] to-[#C49746]/[0.14] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#86868B]">استهلاك الزيت الخام</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C49746] flex items-center justify-center">
                  <Layers size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
                  {todaysEssenceGrams}{' '}
                  <span className="text-xs font-normal text-[#86868B]">جرام</span>
                </div>
                <p className="text-[10px] text-[#86868B] mt-1 font-medium">
                  جرامات الزيت العطري المصروفة
                </p>
              </div>
            </div>

            {/* 4. Cash In Drawer */}
            <div className="apple-glass-card rounded-3xl p-5 border border-emerald-300/60 bg-gradient-to-br from-white via-emerald-500/[0.07] to-teal-500/[0.13] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#86868B]">النقدية بالدرج (كاش)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Coins size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                  {todaysCashSales.toLocaleString('ar-EG')}{' '}
                  <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
                </div>
                <p className="text-[10px] text-[#86868B] mt-1 font-medium">
                  إلكتروني: {todaysElectronicSales} {settings.currency}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GOAL DISTRIBUTION & BREAK-EVEN PROGRESS                  */}
      {/* ======================================================== */}
      {isSectionVisible('goal_and_low_stock') && (
      <div className={`${getSectionOrderClass('goal_and_low_stock')} grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6`}>
        {/* Goal Card (Executive) OR Sales Guidance Card (Staff) */}
        {canViewProfits(currentUser ?? null) ? (
          <div className="lg:col-span-7 apple-glass-dark text-white rounded-3xl p-6 sm:p-7 space-y-5 shadow-apple-lg border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-[#C49746]" />
                  <h3 className="font-bold text-sm text-white">توزيع مبيعات اليوم على الهدف المطلوب</h3>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  isTargetAchieved 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : isBreakEvenCovered 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                }`}>
                  {isTargetAchieved ? 'تم تحقيق الهدف والتعادل وزيادة 🎉' : isBreakEvenCovered ? 'تمت تغطية مصاريف اليوم' : 'تحت نقطة التعادل (خسارة)'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-gray-400 text-[11px] block">المرحلة 1: التعادل اليومي (25 يوم)</span>
                  <span className="font-mono font-bold text-base text-amber-400">600 ج.م</span>
                  <span className="text-[10px] text-gray-500 block">يغطي ميزانية 15,000 ج كاملة</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-gray-400 text-[11px] block">المرحلة 2: المستهدف الربحي</span>
                  <span className="font-mono font-bold text-base text-[#34C759]">1,000 ج.م</span>
                  <span className="text-[10px] text-gray-500 block">ربح صافٍ وفائض للتوسع</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-gray-400 text-[11px] block">المساهمة الصافية اليوم (بعد 5%)</span>
                  <span className="font-mono font-bold text-base text-white">+{netContributionToday.toFixed(0)} ج.م</span>
                  <span className="text-[10px] text-gray-500 block">صافي ربح الخامات - عمولة طارق</span>
                </div>
              </div>

              {/* Progress Bars for Both Phases */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-300">مرحلة 1: تغطية المصاريف ونقطة التعادل (600 ج):</span>
                    <span className="font-mono text-amber-400 font-bold">{progressPhase1.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${progressPhase1}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-300">مرحلة 2: المستهدف الكامل للربح (1,000 ج):</span>
                    <span className="font-mono text-[#34C759] font-bold">{progressPhase2.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-[#34C759] rounded-full transition-all duration-700"
                      style={{ width: `${progressPhase2}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400 gap-2">
              <span>
                {isBreakEvenCovered 
                  ? `🎉 ممتاز! تم تخطي نقطة التعادل وتغطية مصاريف اليوم بالكامل. يتبقى ${Math.max(0, targetPhase2 - netContributionToday).toFixed(0)} ج.م للوصول للمستهدف الكامل (1000 ج) (~${bottlesRemainingToFullTarget} زجاجات).` 
                  : `يلزم بيع حوالي ${bottlesRemainingToBreakEven} زجاجات إضافية لتغطية مصاريف اليوم (الـ 600 ج.م).`}
              </span>
              {onNavigate && canAccessView(currentUser ?? null, View.OPERATIONS_SYSTEM) && (
                <button
                  onClick={() => onNavigate(View.OPERATIONS_SYSTEM)}
                  className="text-amber-400 hover:text-white font-semibold text-left inline-flex items-center gap-1 shrink-0"
                >
                  <span>شاشة نظام التشغيل المعتمد</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 apple-glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-black/[0.06] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#0071E3]" />
                  <h3 className="font-bold text-sm text-[#1D1D1F]">دليل تسريع البيع وخدمة العملاء</h3>
                </div>
                <span className="text-[11px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-0.5 rounded-full">
                  إرشادات الوردية
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-1">
                  <span className="font-bold text-amber-950 block">✨ قاعدة إقناع الزبون الذهبية:</span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    عرّف الزبون بالنوتات العليا للعطر ثم اتركه يهدأ دقيقة لشم قلب العطر، واعرض دائماً عبوة 50 مل كأفضل حجم اقتصادي وفاخر.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 space-y-1">
                  <span className="font-bold text-blue-950 block">🧴 دقة المعايير والجودة:</span>
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    التزم بالجرامات المعتمدة (15 جم للـ 50 مل، 30 جم للـ 100 مل) مع إضافة 1 جم مثبت فقط للعبوات البخاخ لضمان ثبات عالي دون تغبيش.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-2">
                <span className="text-xs font-black text-[#1D1D1F] block">أكثر العطور طلباً اليوم:</span>
                <div className="flex flex-wrap gap-2">
                  {products.slice(0, 5).map(p => (
                    <span key={p.id} className="px-2.5 py-1 rounded-xl bg-white border border-black/[0.06] text-xs font-semibold text-[#1D1D1F]">
                      {p.name} ({p.gender})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-xs">
              <span className="text-[#86868B]">نسعد بخدمة كل زبون وتقديم العطر الأنسب لذوقه ✨</span>
              {onNavigate && (
                <button
                  onClick={() => onNavigate(View.POS)}
                  className="apple-btn px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-sm"
                >
                  فتح الكاشير
                </button>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Alerts Widget (lg:col-span-5) */}
        <div className="lg:col-span-5 apple-glass-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between border border-rose-300/50 bg-gradient-to-br from-white via-rose-500/[0.05] to-amber-500/[0.10] space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon size={18} className="text-red-500" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">نواقص المخزون (أقل من 100 جم)</h3>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                lowStock.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {lowStock.length} عطور
              </span>
            </div>

            {lowStock.length === 0 ? (
              <div className="py-8 text-center text-[#86868B] space-y-1">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                <p className="font-bold text-xs text-[#1D1D1F]">مخزون الزيوت في حالة ممتازة</p>
                <p className="text-[11px]">جميع العطور يتوفر منها أكثر من 100 جرام خام</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {lowStock.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.04] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1D1D1F] block">{p.name}</span>
                      <span className="text-[10px] text-[#86868B]">{p.brand} · {p.type}</span>
                    </div>
                    <span className="font-mono font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-xl">
                      {p.stock_grams} جم
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate(View.INVENTORY)}
              className="apple-btn w-full py-2.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-xs font-semibold text-[#1D1D1F] flex items-center justify-center gap-1.5"
            >
              <span>فتح إدارة المخزون والتزويد السريع</span>
              <ChevronLeft size={14} />
            </button>
          )}
        </div>
      </div>
      )}

      {/* ======================================================== */}
      {/* TODAY'S RECENT SALES LIST                                */}
      {/* ======================================================== */}
      {isSectionVisible('today_sales_register') && (
      <div className={`${getSectionOrderClass('today_sales_register')} apple-glass-card rounded-3xl p-6 sm:p-7 border border-[#0071E3]/25 bg-gradient-to-br from-white via-[#0071E3]/[0.05] to-emerald-500/[0.08] space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#0071E3]" />
            <h3 className="font-bold text-sm text-[#1D1D1F]">مبيعات اليوم المسجلة</h3>
          </div>
          <span className="text-xs font-medium text-[#86868B]">
            {todaysSales.length} عملية بيع
          </span>
        </div>

        {todaysSales.length === 0 ? (
          <div className="py-12 text-center text-[#86868B] space-y-2">
            <Coins size={36} className="mx-auto text-gray-300" />
            <p className="font-black text-sm text-[#1D1D1F]">لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم</p>
            <p className="text-[11px]">النظام يعرض البيانات الفعلية المسجلة فقط ولا يستخدم أي أرقام أمثلة أو قيم افتراضية</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Clean Card List (Zero Horizontal Scroll) */}
            <div className="md:hidden space-y-2.5">
              {todaysSales.map((sale) => {
                const item = sale.items[0];
                return (
                  <div key={sale.id} className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#86868B] text-[11px]">
                          {new Date(sale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-bold text-[#1D1D1F]">{item?.productName || 'خلطة خاصة'}</span>
                      </div>
                      <span className="font-mono font-black text-sm text-[#1D1D1F]">
                        {sale.totalPrice} {settings.currency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#86868B]">
                      <span>{item?.bottleSize} مل ({item?.essenceGrams} جم زيت)</span>
                      <div className="flex items-center gap-2">
                        {canViewProfits(currentUser ?? null) && (
                          <span className="text-emerald-700 font-bold">مساهمة +{sale.totalProfit} ج</span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-white text-[10px] text-[#1D1D1F] border border-black/[0.04]">
                          {sale.paymentMethod || 'نقدي'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-black/[0.06]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-black/[0.02] border-b border-black/[0.06] text-[#86868B]">
                    <th className="py-2.5 px-3 font-medium">الوقت</th>
                    <th className="py-2.5 px-3 font-medium">الصنف</th>
                    <th className="py-2.5 px-3 font-medium">الحجم</th>
                    <th className="py-2.5 px-3 font-medium">الزيت</th>
                    <th className="py-2.5 px-3 font-medium">السعر</th>
                    {canViewCosts(currentUser ?? null) && (
                      <th className="py-2.5 px-3 font-medium">التكلفة</th>
                    )}
                    {canViewProfits(currentUser ?? null) && (
                      <th className="py-2.5 px-3 font-medium">المساهمة</th>
                    )}
                    <th className="py-2.5 px-3 font-medium">طريقة السداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {todaysSales.map((sale) => {
                    const item = sale.items[0];
                    return (
                      <tr key={sale.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="py-3 px-3 text-[#86868B] font-mono">
                          {new Date(sale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#1D1D1F]">{item?.productName || 'خلطة خاصة'}</td>
                        <td className="py-3 px-3 font-mono">{item?.bottleSize} مل</td>
                        <td className="py-3 px-3 font-mono">{item?.essenceGrams} جم</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1D1D1F]">{sale.totalPrice} {settings.currency}</td>
                        {canViewCosts(currentUser ?? null) && (
                          <td className="py-3 px-3 font-mono text-red-600">{sale.totalCost} {settings.currency}</td>
                        )}
                        {canViewProfits(currentUser ?? null) && (
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">+{sale.totalProfit} {settings.currency}</td>
                        )}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-black/[0.04] text-[10px] font-medium text-[#1D1D1F]">
                            {sale.paymentMethod || 'نقدي'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      )}

      {/* Transparent Calculation Breakdown Modal */}
      {calculationModal && (
        <CalculationBreakdownModal
          breakdown={calculationModal}
          onClose={() => setCalculationModal(null)}
          currency={settings.currency}
        />
      )}
    </div>
  );
};

export default Dashboard;
