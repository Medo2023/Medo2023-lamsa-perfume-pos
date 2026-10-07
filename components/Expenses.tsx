import React, { useState, useMemo } from 'react';
import {
  Expense,
  ExpenseCategory,
  StoreSettings,
  Sale,
  DEFAULT_FIXED_MONTHLY_BUDGET_ITEMS,
  isActualPaidOperationalExpense,
  isLiveProductionSale,
} from '../types';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Download, 
  X,
  CreditCard,
  Building,
  Users,
  Zap,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ExpensesProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  settings: StoreSettings;
  sales: Sale[];
}

const CATEGORIES: ExpenseCategory[] = [
  'رواتب',
  'إيجار',
  'فواتير ومرافق',
  'مستلزمات وتغليف',
  'تسويق وإعلان',
  'صيانة ونثريات',
  'مصاريف تشغيل',
  'أخرى'
];

const Expenses: React.FC<ExpensesProps> = ({ expenses, setExpenses, settings, sales }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenseReversalReason, setExpenseReversalReason] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<Partial<Expense>>({
    title: '',
    amount: 0,
    category: 'رواتب',
    date: new Date().toISOString().slice(0, 10),
    isRecurringMonthly: false,
    notes: '',
  });

  // §1, §2, §5, §6: Filtered actual paid operational expenses (excluding planned monthly budget allocations)
  const actualPaidExpenses = useMemo(
    () => expenses.filter(isActualPaidOperationalExpense),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    return actualPaidExpenses.filter((exp) => {
      const matchMonth = exp.date.startsWith(selectedMonth);
      const matchCat = selectedCategory === 'all' || exp.category === selectedCategory;
      return matchMonth && matchCat;
    });
  }, [actualPaidExpenses, selectedMonth, selectedCategory]);

  // Financial aggregates for the selected month (actual paid expenses)
  const totalMonthlyExpenses = useMemo(() => {
    return actualPaidExpenses
      .filter((e) => e.date.startsWith(selectedMonth))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [actualPaidExpenses, selectedMonth]);

  // Expenses grouped by category
  const expensesByCategory = useMemo(() => {
    const map: Record<ExpenseCategory, number> = {
      'رواتب': 0,
      'إيجار': 0,
      'فواتير ومرافق': 0,
      'مستلزمات وتغليف': 0,
      'تسويق وإعلان': 0,
      'صيانة ونثريات': 0,
      'مصاريف تشغيل': 0,
      'أخرى': 0
    };
    actualPaidExpenses
      .filter(e => e.date.startsWith(selectedMonth))
      .forEach(e => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    return map;
  }, [actualPaidExpenses, selectedMonth]);

  // Sales in the selected month (Live Production Data only)
  const monthlySales = useMemo(() => {
    return sales.filter(s => s.date.startsWith(selectedMonth) && isLiveProductionSale(s));
  }, [sales, selectedMonth]);

  const hasMonthTransactions = monthlySales.length > 0 || totalMonthlyExpenses > 0;

  const monthlyGrossRevenue = useMemo(() => {
    return monthlySales.reduce((sum, s) => sum + s.totalPrice, 0);
  }, [monthlySales]);

  const monthlyCOGS = useMemo(() => {
    return monthlySales.reduce((sum, s) => sum + s.totalCost, 0);
  }, [monthlySales]);

  const monthlyCommissions = useMemo(() => {
    return monthlySales.reduce(
      (sum, s) => sum + (s.totalCommission ?? s.commissionAmount ?? Math.round((s.totalPrice || 0) * 0.05)),
      0
    );
  }, [monthlySales]);

  // المساهمة = صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة = المساهمة (المساهمة لا تعني الربح)
  const monthlyGrossProfit = monthlyGrossRevenue - monthlyCOGS - monthlyCommissions;

  // Approved Operational parameters (15,000 EGP = 14,700 known + 300 reserve / 25 work days = 600 EGP/day)
  const workDays = settings.monthlyWorkDays || 25;
  const fixedBudget = settings.monthlyFixedBudget || 15000;
  const dailyFixedExpense = fixedBudget / workDays; // Exactly 600 EGP/day (المخصص التخطيطي اليومي)

  // المؤشر الأول (النتيجة بعد المصروفات النقدية المدفوعة فعلياً)
  const accountingNetProfit = hasMonthTransactions ? (monthlyGrossProfit - totalMonthlyExpenses) : 0;
  // المؤشر الثاني: المساهمة ← المخصص الثابت للفترة = نتيجة التشغيل وفق الموازنة (لا يظهر إلا بوجود معاملات فعلية)
  const budgetSafeOperatingResult = monthlySales.length > 0 ? (monthlyGrossProfit - fixedBudget) : 0;
  const monthlyNetProfit = budgetSafeOperatingResult;

  // Daily net contribution needed (600 EGP for Phase 1 Break-even, 1,000 EGP for Phase 2)
  const dailyRequiredGrossProfit = settings.dailyTargetProfit || 1000;

  // Today's actual sales & Contribution (صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysSales = sales.filter(s => s.date.startsWith(todayStr) && isLiveProductionSale(s));
  const hasTodayActualSales = todaysSales.length > 0;
  const todaysRevenue = todaysSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const todaysCost = todaysSales.reduce((sum, s) => sum + s.totalCost, 0);
  const todaysCommission = todaysSales.reduce(
    (sum, s) => sum + (s.totalCommission ?? s.commissionAmount ?? Math.round((s.totalPrice || 0) * 0.05)),
    0
  );
  const todaysNetContribution = todaysRevenue - todaysCost - todaysCommission;
  const todaysGrossProfit = todaysNetContribution;
  const todaysRemainingToBreakEven = hasTodayActualSales ? Math.max(0, dailyFixedExpense - todaysNetContribution) : 0;
  const todaysNetProfitAfterExpenses = hasTodayActualSales ? (todaysNetContribution - dailyFixedExpense) : 0;
  const isDailyBreakEvenAchieved = hasTodayActualSales && todaysNetContribution >= dailyFixedExpense;

  const handleSaveExpense = () => {
    if (!formData.title?.trim() || !formData.amount || formData.amount <= 0) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      title: formData.title.trim(),
      amount: Number(formData.amount),
      category: formData.category || 'أخرى',
      date: formData.date || new Date().toISOString().slice(0, 10),
      isRecurringMonthly: !!formData.isRecurringMonthly,
      notes: formData.notes?.trim() || '',
    };

    setExpenses([newExpense, ...expenses]);
    setIsAddModalOpen(false);
    setFormData({
      title: '',
      amount: 0,
      category: 'رواتب',
      date: new Date().toISOString().slice(0, 10),
      isRecurringMonthly: false,
      notes: '',
    });
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;
    const reason = expenseReversalReason.trim() || 'إلغاء مصروف بقيد عكسي مع الاحتفاظ بالسجل الأصلي للتدقيق (§41)';
    setExpenses(
      expenses.map(e =>
        e.id === expenseToDelete.id
          ? {
              ...e,
              isReversed: true,
              reversalReason: reason,
              reversedBy: 'د. محمد (المالك)',
              reversedAt: new Date().toISOString(),
            }
          : e
      )
    );
    setExpenseToDelete(null);
    setExpenseReversalReason('');
  };

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'رواتب': return <Users size={16} className="text-purple-600" />;
      case 'إيجار': return <Building size={16} className="text-blue-600" />;
      case 'فواتير ومرافق': return <Zap size={16} className="text-amber-600" />;
      case 'مستلزمات وتغليف': return <ShoppingBag size={16} className="text-emerald-600" />;
      case 'تسويق وإعلان': return <Sparkles size={16} className="text-pink-600" />;
      case 'صيانة ونثريات': return <Layers size={16} className="text-gray-600" />;
      default: return <Tag size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="gemini-text-gradient">إدارة المصاريف والرواتب ونقطة التعادل</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B] mt-0.5">
            تسجيل كافة التكاليف التشغيلية، احتساب نقطة التعادل، وحساب صافي الربح الحقيقي
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] shadow-apple-sm focus:outline-none"
          />

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="apple-btn flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-apple-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>تسجيل مصروف / راتب</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BREAK-EVEN & FINANCIAL DISTRIBUTION METRICS               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Today's Break-Even Status */}
        <div className={`apple-glass-card rounded-3xl p-5 sm:p-6 border flex flex-col justify-between ${
          isDailyBreakEvenAchieved ? 'border-emerald-200 bg-emerald-50/20' : 'border-black/[0.06]'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#86868B]">مساهمة اليوم مقابل المخصص التخطيطي</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                !hasTodayActualSales
                  ? 'bg-gray-100 text-gray-600'
                  : isDailyBreakEvenAchieved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
              }`}>
                {!hasTodayActualSales
                  ? 'لا توجد مبيعات فعلية اليوم'
                  : isDailyBreakEvenAchieved
                    ? 'تمت تغطية المخصص التخطيطي'
                    : 'جاري تغطية المخصص التخطيطي'}
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-[#1D1D1F]">
              {todaysGrossProfit.toFixed(0)} <span className="text-sm font-normal text-[#86868B]">/ {dailyFixedExpense.toFixed(0)} ج.م (مخصص تخطيطي)</span>
            </div>

            <p className="text-xs text-[#86868B] mt-2 leading-relaxed">
              {!hasTodayActualSales
                ? 'لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم. (600 ج هو المخصص التخطيطي اليومي وليس مصروفاً نقدياً يومياً).'
                : isDailyBreakEvenAchieved 
                  ? `مساهمة اليوم غطت المخصص التخطيطي اليومي (600 ج) وحققت نتيجة تشغيل وفق الموازنة قدرها +${todaysNetProfitAfterExpenses.toFixed(0)} ج.م.`
                  : `متبقي تحقيق ${todaysRemainingToBreakEven.toFixed(0)} ج.م مساهمة لتغطية المخصص التخطيطي اليومي (600 ج).`}
            </p>
          </div>

          <div className="pt-3 border-t border-black/[0.06] mt-4 flex justify-between text-xs text-[#86868B]">
            <span>مبيعات اليوم الفعلية: {todaysRevenue.toLocaleString('ar-EG')} ج.م</span>
            <span>{todaysSales.length} فواتير</span>
          </div>
        </div>

        {/* Card 2: Total Monthly Expenses */}
        <div className="apple-glass-card rounded-3xl p-5 sm:p-6 border border-black/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#86868B]">المصروفات النقدية المدفوعة فعلياً</span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <TrendingDown size={16} />
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-red-600">
              {totalMonthlyExpenses.toLocaleString('ar-EG')} <span className="text-sm font-normal text-[#86868B]">ج.م</span>
            </div>

            <p className="text-xs text-[#86868B] mt-2">
              المخصص التخطيطي اليومي المعتمد: <span className="font-bold text-[#1D1D1F]">{dailyFixedExpense.toFixed(0)} ج.م/يوم (ليس مصروفاً نقدياً يومياً)</span>
            </p>
          </div>

          <div className="pt-3 border-t border-black/[0.06] mt-4 flex justify-between text-xs text-[#86868B]">
            <span>الرواتب المدفوعة: {expensesByCategory['رواتب'].toLocaleString('ar-EG')} ج.م</span>
            <span>الإيجار المدفوع: {expensesByCategory['إيجار'].toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        {/* Card 3: Operating Result vs Budget */}
        <div className="apple-glass-card rounded-3xl p-5 sm:p-6 border border-black/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#86868B]">نتيجة التشغيل وفق الموازنة (المساهمة ← المخصص)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>

            <div className={`text-2xl sm:text-3xl font-black ${
              !hasMonthTransactions ? 'text-[#86868B]' : monthlyNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {!hasMonthTransactions
                ? '0'
                : monthlyNetProfit >= 0
                  ? `+${monthlyNetProfit.toLocaleString('ar-EG')}`
                  : monthlyNetProfit.toLocaleString('ar-EG')}{' '}
              <span className="text-sm font-normal text-[#86868B]">ج.م</span>
            </div>

            <p className="text-xs text-[#86868B] mt-2">
              {!hasMonthTransactions
                ? 'لا توجد معاملات فعلية مسجلة في هذا الشهر (السجل يبدأ من المعاملات الفعلية فقط)'
                : `المساهمة (${monthlyGrossProfit.toLocaleString('ar-EG')} ج) ← المخصص الثابت (${fixedBudget.toLocaleString('ar-EG')} ج)`}
            </p>
          </div>

          <div className="pt-3 border-t border-black/[0.06] mt-4 flex justify-between text-xs text-[#86868B]">
            <span>المساهمة الفعلية: {monthlyGrossProfit.toLocaleString('ar-EG')} ج.م</span>
            <span>المبيعات الفعلية: {monthlyGrossRevenue.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* §1–§6: P&L STATEMENT & DUAL FINANCIAL INDICATORS         */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-3xl p-5 sm:p-6 space-y-4 border border-black/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#1D1D1F]">
            قائمة الدخل والفصل المحاسبي المعتمد (§6) لشهر {selectedMonth}
          </h2>
          <span className="text-[11px] font-bold text-[#0071E3] bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
            الموازنة الثابتة الشهرية: 15,000 ج.م (14,700 معلومة + 300 احتياطي | 600 ج/يوم × 25 يوم)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white border border-black/[0.06] space-y-1">
            <span className="text-[#86868B] block">1. صافي المبيعات</span>
            <span className="font-bold text-base text-[#1D1D1F] font-mono">{monthlyGrossRevenue.toLocaleString('ar-EG')} ج.م</span>
            <span className="text-[10px] text-[#86868B] block">{monthlySales.length} فاتورة معتمدة</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-black/[0.06] space-y-1">
            <span className="text-[#86868B] block">2. تكلفة المنتجات + العمولة</span>
            <span className="font-bold text-base text-red-600 font-mono">-{(monthlyCOGS + monthlyCommissions).toLocaleString('ar-EG')} ج.م</span>
            <span className="text-[10px] text-[#86868B] block">تكلفة: {monthlyCOGS} ج | عمولة: {monthlyCommissions} ج</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-black/[0.06] space-y-1">
            <span className="text-[#86868B] block">3. المساهمة الصافية (§6)</span>
            <span className="font-bold text-base text-[#0071E3] font-mono">{monthlyGrossProfit.toLocaleString('ar-EG')} ج.م</span>
            <span className="text-[10px] text-[#86868B] block">صافي البيع - التكلفة - العمولة</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-black/[0.06] space-y-1">
            <span className="text-[#86868B] block">4. المصروفات المدفوعة فعلياً</span>
            <span className="font-bold text-base text-amber-700 font-mono">-{totalMonthlyExpenses.toLocaleString('ar-EG')} ج.م</span>
            <span className="text-[10px] text-[#86868B] block">مدفوع نقداً من الخزنة هذا الشهر</span>
          </div>

          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            accountingNetProfit >= 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200'
          }`}>
            <span className="text-[#86868B] block">5. الربح المحاسبي الفعلي (§6)</span>
            <span className={`font-bold text-base font-mono ${accountingNetProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {accountingNetProfit.toLocaleString('ar-EG')} ج.م
            </span>
            <span className="text-[10px] text-[#86868B] block">المساهمة - المصروفات المدفوعة فعلياً</span>
          </div>

          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            budgetSafeOperatingResult >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
          }`}>
            <span className="text-[#86868B] block">6. نتيجة التشغيل وفق الموازنة (§6)</span>
            <span className={`font-bold text-base font-mono ${budgetSafeOperatingResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {budgetSafeOperatingResult.toLocaleString('ar-EG')} ج.م
            </span>
            <span className="text-[10px] text-[#86868B] block">المساهمة ← المخصص الثابت للفترة</span>
          </div>
        </div>

        {/* §1 & §2: Official 15,000 EGP Fixed Monthly Budget Reference Table */}
        <div className="pt-3 border-t border-black/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-[#1D1D1F]">
              بنود الموازنة الثابتة الشهرية المعتمدة (§1 & §2 — التزام تخطيطي شهري لا يُخصم من خزنة اليوم الواحد):
            </span>
            <span className="font-mono font-bold text-[#636366]">
              الممول من مساهمة الشهر حتى الآن: {Math.min(fixedBudget, Math.max(0, monthlyGrossProfit)).toLocaleString('ar-EG')} / {fixedBudget.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
            {DEFAULT_FIXED_MONTHLY_BUDGET_ITEMS.map((item) => (
              <div key={item.id} className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.05] flex flex-col justify-between">
                <span className="font-bold text-[#1D1D1F] truncate" title={item.title}>{item.title}</span>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/[0.05] font-mono">
                  <span className="font-black text-[#0071E3]">{item.monthlyAmount.toLocaleString('ar-EG')} ج/شهر</span>
                  <span className="text-[10px] text-[#86868B]">{item.dailyShare25Days} ج/يوم</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXPENSE BREAKDOWN BY CATEGORY                            */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-3xl p-5 sm:p-6 space-y-4 border border-black/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#1D1D1F]">توزيع المصروفات حسب الأقسام</h2>
          
          {/* Category Filter */}
          <div className="apple-segmented-bg flex items-center flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              الكل ({filteredExpenses.length})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-[#86868B] space-y-2">
            <FileText size={32} className="mx-auto text-[#AEAEB2]" />
            <p className="text-sm font-medium">لم يتم تسجيل مصروفات في هذا الشهر</p>
            <p className="text-xs">اضغط على زر "تسجيل مصروف / راتب" لإضافة أول بند تكلفة</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards Grid (Zero Horizontal Scroll) */}
            <div className="md:hidden space-y-2.5">
              {filteredExpenses.map((exp) => (
                <div key={exp.id} className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#1D1D1F] block">{exp.title}</span>
                      <span className="text-[10px] text-[#86868B] font-mono">{exp.date}</span>
                    </div>
                    <span className="font-mono font-black text-sm text-red-600">
                      {exp.amount.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-black/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white text-[10px] font-medium text-[#1D1D1F] border border-black/[0.04]">
                        {getCategoryIcon(exp.category)}
                        <span>{exp.category}</span>
                      </div>
                      {exp.isRecurringMonthly && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[9px] font-bold">
                          شهري ثابت
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setExpenseToDelete(exp)}
                      className="apple-btn p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                      title="حذف البند"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-black/[0.06]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-black/[0.02] border-b border-black/[0.06] text-[#86868B]">
                    <th className="py-3 px-3 font-medium">البند / الوصف</th>
                    <th className="py-3 px-3 font-medium">القسم</th>
                    <th className="py-3 px-3 font-medium">التاريخ</th>
                    <th className="py-3 px-3 font-medium">المبلغ</th>
                    <th className="py-3 px-3 font-medium">النوع</th>
                    <th className="py-3 px-3 font-medium">ملاحظات</th>
                    <th className="py-3 px-3 font-medium text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="py-3 px-3 font-bold text-[#1D1D1F]">{exp.title}</td>
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.04] text-[11px] font-medium text-[#1D1D1F]">
                          {getCategoryIcon(exp.category)}
                          <span>{exp.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#86868B] font-mono">{exp.date}</td>
                      <td className="py-3 px-3 font-mono font-bold text-red-600 text-sm">
                        {exp.amount.toLocaleString('ar-EG')} ج.م
                      </td>
                      <td className="py-3 px-3">
                        {exp.isRecurringMonthly ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-semibold">
                            شهري ثابت
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-black/[0.04] text-[#86868B] text-[10px]">
                            متغير
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#86868B] max-w-xs truncate">{exp.notes || '-'}</td>
                      <td className="py-3 px-3 text-left">
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="حذف البند"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* ADD EXPENSE MODAL                                        */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-glass-card rounded-3xl w-full max-w-md overflow-hidden shadow-apple-lg border border-black/[0.08] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-black/[0.06] flex items-center justify-between bg-black/[0.02]">
              <h3 className="font-bold text-base text-[#1D1D1F]">تسجيل مصروف أو راتب جديد</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1D1D1F] mb-1.5 block">اسم البند / المصروف *</label>
                <input
                  type="text"
                  placeholder="مثال: راتب بائع المحل، إيجار المعرض، فواتير الكهرباء..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="gemini-field field-border-blue w-full h-11 px-3.5 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">المبلغ بالجنيه *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="gemini-field field-border-rose w-full h-11 px-3.5 rounded-xl bg-white text-sm font-bold font-mono text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">القسم</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="gemini-field field-border-purple w-full h-11 px-3 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">التاريخ</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="gemini-field field-border-emerald w-full h-11 px-3.5 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.isRecurringMonthly}
                    onChange={(e) => setFormData({ ...formData, isRecurringMonthly: e.target.checked })}
                    className="w-4 h-4 text-[#0071E3] rounded border-black/[0.2]"
                  />
                  <label htmlFor="recurring" className="text-xs font-medium text-[#1D1D1F] cursor-pointer">
                    مصروف شهري ثابت يتكرر
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] mb-1.5 block">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="ملاحظات توضيحية اختيارية..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="gemini-field field-border-amber w-full h-11 px-3.5 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
                />
              </div>
            </div>

            <div className="p-4 bg-black/[0.02] border-t border-black/[0.06] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="apple-btn px-4 py-2.5 rounded-xl bg-black/[0.05] text-[#1D1D1F] text-xs font-semibold hover:bg-black/[0.08]"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveExpense}
                disabled={!formData.title?.trim() || !formData.amount || formData.amount <= 0}
                className="apple-btn px-6 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                حفظ المصروف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REVERSAL CONFIRMATION MODAL (§41)                        */}
      {/* ======================================================== */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-glass-card rounded-3xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4 shadow-apple-lg border border-black/[0.08]">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1D1D1F]">إلغاء بند المصروف بقيد عكسي</h3>
              <p className="text-xs text-[#86868B] mt-1">
                هل تريد إلغاء "{expenseToDelete.title}" بقيمة {expenseToDelete.amount} ج.م بقيد عكسي مع الاحتفاظ بالسجل الأصلي (§41)؟
              </p>
            </div>
            <div className="text-right">
              <label className="text-[11px] font-bold text-[#1D1D1F] block mb-1">سبب الإلغاء / القيد العكسي *</label>
              <input
                type="text"
                value={expenseReversalReason}
                onChange={(e) => setExpenseReversalReason(e.target.value)}
                placeholder="مثال: قيد مسجل بالخطأ أو تعديل الفاتورة..."
                className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-medium text-[#1D1D1F] outline-none focus:bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  setExpenseToDelete(null);
                  setExpenseReversalReason('');
                }}
                className="apple-btn py-2.5 rounded-xl bg-black/[0.05] text-[#1D1D1F] text-xs font-semibold"
              >
                تراجع
              </button>
              <button
                onClick={handleDeleteExpense}
                className="apple-btn py-2.5 rounded-xl bg-[#FF3B30] text-white text-xs font-semibold hover:bg-red-600 shadow-sm"
              >
                تأكيد القيد العكسي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
