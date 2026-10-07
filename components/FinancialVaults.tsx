import React, { useState, useMemo } from 'react';
import { 
  FinancialVault, 
  WithdrawalTransaction, 
  VaultType, 
  StoreSettings, 
  Sale, 
  Expense,
  DEFAULT_SETTINGS,
  APPROVED_FIXED_BUDGET_ITEMS,
  FixedBudgetItem,
  isLiveProductionSale,
  isLiveProductionWithdrawal
} from '../types';
import { 
  Wallet, 
  ArrowDownRight, 
  Plus, 
  Printer, 
  Building, 
  Users, 
  Coins, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Receipt, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  ChevronRight, 
  Filter, 
  Search,
  RotateCcw,
  Zap,
  DollarSign,
  Lock,
  Unlock,
  AlertOctagon,
  ShieldAlert,
  ArrowUpRight,
  Info,
  Droplets,
  Globe,
  Smartphone,
  Truck,
  Box,
  UserCheck,
  User,
  X
} from 'lucide-react';

interface FinancialVaultsProps {
  vaults: FinancialVault[];
  withdrawals: WithdrawalTransaction[];
  sales: Sale[];
  expenses: Expense[];
  settings?: StoreSettings;
  onAddWithdrawal: (tx: WithdrawalTransaction, updatedVault: FinancialVault) => void;
  onUpdateVaults?: (vaults: FinancialVault[]) => void;
}

export const FinancialVaults: React.FC<FinancialVaultsProps> = ({
  vaults,
  withdrawals,
  sales,
  expenses,
  settings = DEFAULT_SETTINGS,
  onAddWithdrawal,
  onUpdateVaults
}) => {
  // Tab / Filter State
  const [selectedVaultFilter, setSelectedVaultFilter] = useState<VaultType | 'all'>('all');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'vaults' | 'fixed_breakdown' | 'ledger' | 'rules'>('vaults');

  // Withdrawal / Deposit Modal State
  const [modalMode, setModalMode] = useState<'withdrawal' | 'capital_deposit'>('withdrawal');
  const [activeVaultId, setActiveVaultId] = useState<VaultType>('restock');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [transAmount, setTransAmount] = useState<number | ''>('');
  const [transReason, setTransReason] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [invoiceRef, setInvoiceRef] = useState<string>('');
  const [executedBy, setExecutedBy] = useState<string>('د. محمد (المالك)');
  const [transNotes, setTransNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Printed Voucher State
  const [printedTransaction, setPrintedTransaction] = useState<WithdrawalTransaction | null>(null);

  // -------------------------------------------------------------
  // ACCUMULATED FINANCIAL ARCHITECTURE & PIPELINE CALCULATIONS
  // -------------------------------------------------------------
  const financials = useMemo(() => {
    const activeSales = sales.filter(s => isLiveProductionSale(s));
    const activeWithdrawals = withdrawals.filter(w => isLiveProductionWithdrawal(w));

    // Total gross sales revenue (Live Production Data only)
    const totalRevenue = activeSales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    
    // ① قسم تكلفة المخزون: تكلفة الخامات (الزيوت والزجاجات) من كل عملية بيع فعلية
    const totalAccumulatedCost = activeSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    
    // ② قسم العمولات: 5% من المبيعات تكلفة متغيرة مرتبطة بالبيع الفعلي
    const totalCommissions = activeSales.reduce((sum, s) => {
      return sum + (s.commissionAmount !== undefined ? s.commissionAmount : (s.totalPrice * 0.05));
    }, 0);

    // المساهمة = صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة = المساهمة
    // (لا ينشئ النظام تلقائياً حركة تحويل نقدية إلى محفظة المصروفات؛ الحركة النقدية لا تسجل إلا إذا حدثت فعلياً)
    const totalNetContribution = Math.max(0, totalRevenue - totalAccumulatedCost - totalCommissions);

    // ③ الموازنة الثابتة المعتمدة: 15,000 جنيه شهرياً (أساس التخطيط 25 يوماً = 600 ج مخصص تخطيطي يومي)
    const fixedBudgetMonthly = 15000;
    const fixedDailyRate = 600; // 15,000 / 25 days

    // مؤشر التغطية التخطيطية للموازنة الثابتة (تتبع محاسبي وليس حركة تحويل نقدية تلقائية)
    const fixedBudgetCovered = Math.min(totalNetContribution, fixedBudgetMonthly);
    const fixedBudgetRemaining = Math.max(0, fixedBudgetMonthly - totalNetContribution);
    const isFixedBudgetFullyCovered = totalNetContribution >= fixedBudgetMonthly;

    // ④ فائض المساهمة بعد تغطية الموازنة الثابتة (15,000ج)
    const totalOwnerProfitInflow = Math.max(0, totalNetContribution - fixedBudgetMonthly);

    // إجمالي رأس المال المضاف فعلياً
    const capitalDeposits = activeWithdrawals
      .filter(w => w.vaultId === 'capital' && w.type === 'capital_deposit')
      .reduce((sum, w) => sum + w.amount, 0);

    // عدد أيام العمل الفعلية المسجلة في المبيعات الحقيقية
    const uniqueSaleDays = new Set(activeSales.map(s => s.date.slice(0, 10))).size;
    const isCompensationDayActive = uniqueSaleDays > 25;

    return {
      totalRevenue,
      totalAccumulatedCost,
      totalCommissions,
      totalNetContribution,
      fixedBudgetMonthly,
      fixedDailyRate,
      fixedBudgetCovered,
      fixedBudgetRemaining,
      isFixedBudgetFullyCovered,
      totalOwnerProfitInflow,
      capitalDeposits,
      uniqueSaleDays,
      isCompensationDayActive
    };
  }, [sales, withdrawals]);

  // -------------------------------------------------------------
  // DYNAMIC COMPUTATION OF THE 8 SEGREGATED VAULTS
  // -------------------------------------------------------------
  const liveVaults = useMemo(() => {
    const activeWithdrawals = withdrawals.filter(w => isLiveProductionWithdrawal(w));
    return vaults.map((vault) => {
      // Historical actual withdrawals for this specific vault
      const vaultWithdrawals = activeWithdrawals
        .filter((w) => w.vaultId === vault.id && w.type !== 'capital_deposit')
        .reduce((sum, w) => sum + w.amount, 0);

      let totalInflow = vault.totalInflow || 0;

      switch (vault.id) {
        case 'restock':
          // ① قسم تكلفة المخزون وإعادة الشراء (يحفظ تكلفة الزيوت والزجاجات المباعة بالكامل)
          totalInflow = financials.totalAccumulatedCost;
          break;

        case 'commissions':
          // ② قسم مخصص العمولات (5% على المبيعات)
          totalInflow = financials.totalCommissions;
          break;

        case 'rent':
          // ③.1 مخصص الإيجار (1,200 ج.م شهرياً كنسبة من المساهمة المغطاة: 1,200 / 15,000 = 8%)
          totalInflow = (financials.fixedBudgetCovered / 15000) * 1200;
          break;

        case 'salaries':
          // ③.2 مخصص الرواتب: د. محمد (10,000) + طارق (1,500) = 11,500 ج.م (11,500 / 15,000 = 76.67%)
          totalInflow = (financials.fixedBudgetCovered / 15000) * 11500;
          break;

        case 'utilities':
          // ③.3 فواتير وتشغيل: 2,000 ج.م (كهرباء 800 + نت 300 + نقل 300 + تشغيل 300 + مياه 100 + خط 100 + نظافة 100)
          totalInflow = (financials.fixedBudgetCovered / 15000) * 2000;
          break;

        case 'contingency':
          // ③.4 احتياطي الهالك والتالف والفاقد: 300 ج.م (300 / 15,000 = 2%)
          totalInflow = (financials.fixedBudgetCovered / 15000) * 300;
          break;

        case 'owner_profit':
          // ④ قسم الأرباح الصافية الحرة للمالك:
          // لا يوضع فيه أي مليم إلا بعد اكتمال الـ 15,000 ج.م كاملة!
          totalInflow = financials.totalOwnerProfitInflow;
          break;

        case 'capital':
          // ⑤ قسم رأس المال: تمويل جديد مضاف
          totalInflow = financials.capitalDeposits;
          break;
      }

      // Safe Balance: Total Inflow minus Withdrawals, rounded cleanly
      const currentBalance = Math.max(0, Math.round((totalInflow - vaultWithdrawals) * 100) / 100);

      return {
        ...vault,
        totalInflow: Math.round(totalInflow * 100) / 100,
        totalWithdrawn: Math.round(vaultWithdrawals * 100) / 100,
        currentBalance,
      };
    });
  }, [vaults, withdrawals, financials]);

  // Current Active Selected Vault for Modal
  const currentActiveVault = useMemo(() => {
    return liveVaults.find(v => v.id === activeVaultId) || liveVaults[0];
  }, [liveVaults, activeVaultId]);

  // Filtered transactions for the ledger
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const matchVault = selectedVaultFilter === 'all' || w.vaultId === selectedVaultFilter;
      const matchSearch = !logSearchTerm || 
        w.reason.toLowerCase().includes(logSearchTerm.toLowerCase()) || 
        (w.invoiceRef && w.invoiceRef.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
        (w.executedBy && w.executedBy.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
        (w.recipientName && w.recipientName.toLowerCase().includes(logSearchTerm.toLowerCase()));
      return matchVault && matchSearch;
    });
  }, [withdrawals, selectedVaultFilter, logSearchTerm]);

  // -------------------------------------------------------------
  // OPEN DIALOG HANDLERS
  // -------------------------------------------------------------
  const handleOpenWithdrawDialog = (vault: FinancialVault) => {
    setModalMode('withdrawal');
    setActiveVaultId(vault.id);
    setTransAmount('');
    setRecipientName('');
    setInvoiceRef('');
    setTransNotes('');

    // Pre-populate realistic defaults based on the strict department
    switch (vault.id) {
      case 'restock':
        setTransReason('شراء زيوت عطرية وزجاجات لتعويض فاقد المخزون');
        setRecipientName('مورد الزيوت الخام');
        break;
      case 'commissions':
        setTransReason('صرف عمولة مبيعات مستحقة (5%)');
        setRecipientName('مسؤول المبيعات (طارق)');
        break;
      case 'rent':
        setTransReason(`سداد إيجار المحل الشهري (${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })})`);
        setRecipientName('مالك العقار');
        break;
      case 'salaries':
        setTransReason('صرف مسير الرواتب المعتمد (راتب د. محمد 10,000 / طارق 1,500)');
        setRecipientName('د. محمد / طارق');
        break;
      case 'utilities':
        setTransReason('سداد فواتير تشغيلية (كهرباء / إنترنت / خدمات)');
        setRecipientName('شركة الخدمات');
        break;
      case 'contingency':
        setTransReason('صرف لتغطية هالك أو تالف أو عبوة معيبة');
        setRecipientName('مخزن المتجر');
        break;
      case 'owner_profit':
        setTransReason('سحب أرباح شخصية حرة للمالك (بعد اكتمال الموازنة الثابتة)');
        setRecipientName('د. محمد (المالك)');
        break;
      case 'capital':
        setTransReason('سحب استردادي رسمي من رأس المال بقرار الإدارة');
        setRecipientName('صاحب المشروع');
        break;
    }

    setIsModalOpen(true);
  };

  const handleOpenCapitalDepositDialog = () => {
    setModalMode('capital_deposit');
    setActiveVaultId('capital');
    setTransAmount('');
    setTransReason('ضخ تمويل رأس مال جديد من صاحب المشروع (لا يسجل كإيراد أو ربح)');
    setRecipientName('خزينة متجر لمسة عطر');
    setInvoiceRef(`CAP-${Date.now().toString().slice(-4)}`);
    setExecutedBy('د. محمد (صاحب المشروع)');
    setTransNotes('تمويل إضافي معتمد لتوسيع النشاط التجاري');
    setIsModalOpen(true);
  };

  // -------------------------------------------------------------
  // VALIDATE AND SUBMIT WITHDRAWAL OR CAPITAL DEPOSIT
  // -------------------------------------------------------------
  const handleConfirmTransaction = () => {
    if (!currentActiveVault || !transAmount || Number(transAmount) <= 0) return;

    const amount = Number(transAmount);

    // STRICT VALIDATION 1: Cannot withdraw more than available in the specific vault
    if (modalMode === 'withdrawal') {
      if (amount > currentActiveVault.currentBalance) {
        alert(`❌ ممنوع تجاوز الرصيد المتاح!\n\nالمبلغ المطلوب (${amount} ${settings.currency}) يتجاوز الرصيد المتوفر في هذا البند (${currentActiveVault.currentBalance} ${settings.currency}) بمقدار ${(amount - currentActiveVault.currentBalance).toFixed(1)} ${settings.currency}.\n\nالنظام المالي يمنع السحب بالسالب نهائياً لحماية الموازنة.`);
        return;
      }

      // STRICT VALIDATION 2: Cannot withdraw profit if fixed budget is not covered
      if (currentActiveVault.id === 'owner_profit' && !financials.isFixedBudgetFullyCovered) {
        alert(`❌ ممنوع سحب الأرباح قبل اكتمال الموازنة الثابتة!\n\nوفقاً للنظام المالي: لا يوضع ولا يسحب أي ربح إلا بعد توفير تكلفة المخزون والعمولات والموازنة الثابتة (15,000 جنيه).\nالمتبقي لتغطية الموازنة: ${financials.fixedBudgetRemaining.toFixed(1)} جنيه.`);
        return;
      }
    }

    setIsSubmitting(true);

    const isDeposit = modalMode === 'capital_deposit';
    const balanceBefore = currentActiveVault.currentBalance;
    const balanceAfter = isDeposit 
      ? balanceBefore + amount 
      : Math.max(0, balanceBefore - amount);

    const newTx: WithdrawalTransaction = {
      id: `${isDeposit ? 'cap' : 'wth'}-${Date.now()}`,
      vaultId: currentActiveVault.id,
      vaultName: currentActiveVault.name,
      type: isDeposit ? 'capital_deposit' : 'withdrawal',
      amount,
      date: new Date().toISOString(),
      executedBy: executedBy.trim() || 'د. محمد (المالك)',
      recipientName: recipientName.trim() || undefined,
      reason: transReason.trim() || (isDeposit ? 'إضافة رأس مال' : 'سحب مالي معتمد'),
      invoiceRef: invoiceRef.trim() || undefined,
      status: isDeposit ? 'مؤكد ومودع' : 'مؤكد ومصروف',
      balanceBefore,
      balanceAfter,
      notes: transNotes.trim() || undefined,
    };

    const updatedVault: FinancialVault = {
      ...currentActiveVault,
      currentBalance: balanceAfter,
      totalInflow: isDeposit ? (currentActiveVault.totalInflow + amount) : currentActiveVault.totalInflow,
      totalWithdrawn: !isDeposit ? (currentActiveVault.totalWithdrawn + amount) : currentActiveVault.totalWithdrawn,
    };

    onAddWithdrawal(newTx, updatedVault);
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  // Trigger print voucher
  const handlePrintVoucher = (tx: WithdrawalTransaction) => {
    setPrintedTransaction(tx);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* ======================================================== */}
      {/* 1. EXECUTIVE GOLDEN RULE HEADER & ACTIONS                */}
      {/* ======================================================== */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-black text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                النظام المالي الداخلي المعتمد — لَمْسَةُ عِطْر
              </span>
              <span className="text-[11px] font-bold text-[#86868B]">
                الموازنة الآمنة: 15,000 ج.م على 25 يوماً = 600 ج.م/يوم
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-[#1D1D1F] tracking-tight">
              نظام المحافظ وفصل التكاليف والمسحوبات المقيدة
            </h1>
            
            <p className="text-xs text-[#86868B] max-w-3xl leading-relaxed">
              <strong className="text-[#1D1D1F]">القاعدة الأساسية:</strong> المساهمة = صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة. 
              <span className="text-amber-800 font-bold"> (600 جنيه هو المخصص التخطيطي اليومي وليس مصروفاً نقدياً يومياً ولا حركة مالية؛ لا ينشئ النظام تلقائياً حركة تحويل نقدية إلى محفظة المصروفات، والحركة النقدية لا تسجل إلا إذا حدثت فعلياً)</span>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            <button
              onClick={() => handleOpenWithdrawDialog(liveVaults[0])}
              className="apple-btn px-4 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs flex items-center gap-2 shadow-apple-sm transition-all"
            >
              <ArrowDownRight size={16} strokeWidth={2.5} />
              <span>إجراء سحب معتمد</span>
            </button>

            <button
              onClick={handleOpenCapitalDepositDialog}
              className="apple-btn px-4 py-3 rounded-2xl bg-[#1D1D1F] hover:bg-black active:scale-98 text-white font-bold text-xs flex items-center gap-2 shadow-apple-sm transition-all border border-white/10"
            >
              <Plus size={16} className="text-emerald-400" />
              <span>ضخ رأس مال جديد</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PIPELINE BAR: HOW EVERY POUND FLOWS THROUGH THE STORE    */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-600" />
              <span>مسار تدفق السيولة المعتمد (بالجنيه الفعلي من المبيعات)</span>
            </span>
            <span className="text-[11px] font-mono text-[#86868B]">
              إجمالي مبيعات المتجر: <strong className="text-[#1D1D1F]">{financials.totalRevenue.toLocaleString('ar-EG')} {settings.currency}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Step 1: Restock Cost */}
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold">
                <span>① تكلفة المخزون</span>
                <span>سحب بأي وقت</span>
              </div>
              <div className="text-base font-black font-mono text-amber-950">
                {financials.totalAccumulatedCost.toLocaleString('ar-EG')} <span className="text-[10px] font-normal">{settings.currency}</span>
              </div>
              <p className="text-[9px] text-amber-800 leading-tight">
                قيمة الزيوت والزجاجات التي خرجت ويجب الاحتفاظ بها لإعادة الشراء. ليست ربحاً.
              </p>
            </div>

            {/* Step 2: Commissions */}
            <div className="p-3 rounded-xl bg-purple-50/90 border border-purple-200/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-purple-900 font-bold">
                <span>② مخصص العمولات (5%)</span>
                <span>تكلفة متغيرة</span>
              </div>
              <div className="text-base font-black font-mono text-purple-950">
                {financials.totalCommissions.toLocaleString('ar-EG')} <span className="text-[10px] font-normal">{settings.currency}</span>
              </div>
              <p className="text-[9px] text-purple-800 leading-tight">
                مخصص عمولة البيع (ليست جزءاً من الـ 15,000 ج.م، بل مرتبطة بالبيع).
              </p>
            </div>

            {/* Step 3: Fixed Budget Covered */}
            <div className="p-3 rounded-xl bg-blue-50/90 border border-blue-200/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-blue-900 font-bold">
                <span>③ الموازنة الثابتة</span>
                <span>{financials.isFixedBudgetFullyCovered ? 'مغطاة 100%' : `${Math.round((financials.fixedBudgetCovered / 15000) * 100)}%`}</span>
              </div>
              <div className="text-base font-black font-mono text-blue-950">
                {financials.fixedBudgetCovered.toLocaleString('ar-EG')} <span className="text-[10px] font-normal text-blue-800">/ 15,000</span>
              </div>
              <p className="text-[9px] text-blue-800 leading-tight">
                {financials.isFixedBudgetFullyCovered 
                  ? 'تمت تغطية كامل موازنة الـ 15,000 ج.م بأمان.' 
                  : `متبقي عجز ${financials.fixedBudgetRemaining.toLocaleString('ar-EG')} ج.م لتغطية الموازنة.`}
              </p>
            </div>

            {/* Step 4: Free Net Profit */}
            <div className={`p-3 rounded-xl border space-y-1 ${
              financials.isFixedBudgetFullyCovered 
                ? 'bg-emerald-50/90 border-emerald-300' 
                : 'bg-gray-50/90 border-gray-200 opacity-90'
            }`}>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className={financials.isFixedBudgetFullyCovered ? 'text-emerald-900' : 'text-gray-500'}>
                  ④ الربح الصافي المتاح
                </span>
                <span className={`flex items-center gap-0.5 ${financials.isFixedBudgetFullyCovered ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {financials.isFixedBudgetFullyCovered ? <Unlock size={10} /> : <Lock size={10} />}
                  {financials.isFixedBudgetFullyCovered ? 'متاح للسحب' : 'مقفل'}
                </span>
              </div>
              <div className={`text-base font-black font-mono ${financials.isFixedBudgetFullyCovered ? 'text-emerald-700' : 'text-gray-400'}`}>
                {financials.totalOwnerProfitInflow.toLocaleString('ar-EG')} <span className="text-[10px] font-normal">{settings.currency}</span>
              </div>
              <p className="text-[9px] text-gray-500 leading-tight">
                {financials.isFixedBudgetFullyCovered
                  ? 'فائض أرباح المالك الصافية بعد تغطية المصاريف كاملة.'
                  : 'ممنوع وضع أو سحب مليم قبل توفير الـ 15,000 ج.م.'}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-black/[0.04] scrollbar-none">
          <button
            onClick={() => setActiveTab('vaults')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'vaults'
                ? 'bg-[#1D1D1F] text-white shadow-xs'
                : 'bg-black/[0.03] text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Wallet size={14} />
            <span>المحافظ والأرصدة المستقلة ({liveVaults.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fixed_breakdown')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'fixed_breakdown'
                ? 'bg-[#1D1D1F] text-white shadow-xs'
                : 'bg-black/[0.03] text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Building size={14} />
            <span>مكونات الـ 15,000 ج.م (البنود الـ 11 وتوزيع الـ 600ج)</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-[#1D1D1F] text-white shadow-xs'
                : 'bg-black/[0.03] text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <FileText size={14} />
            <span>سجل المسحوبات والعمليات المعتمد ({withdrawals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'bg-[#1D1D1F] text-white shadow-xs'
                : 'bg-black/[0.03] text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <AlertOctagon size={14} className="text-rose-600" />
            <span>القواعد المحاسبية الممنوعة وقاعدة الـ 25 يوماً</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TAB CONTENT: VAULTS & BALANCES                        */}
      {/* ======================================================== */}
      {activeTab === 'vaults' && (
        <div className="space-y-6">

          {/* SECTION ①: PROMINENT RESTOCK VAULT (سحب فوري للمخزون) */}
          {(() => {
            const restock = liveVaults.find(v => v.id === 'restock');
            if (!restock) return null;
            return (
              <div className="apple-glass rounded-3xl p-5 sm:p-6 border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 shadow-apple-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-amber-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                      <ShieldCheck size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-amber-950">{restock.name}</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                          سحب فوري متاح بأي وقت
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/80 mt-0.5">
                        {restock.description}
                      </p>
                    </div>
                  </div>

                  {/* Restock Withdraw Button */}
                  <button
                    onClick={() => handleOpenWithdrawDialog(restock)}
                    className="apple-btn px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-apple-sm transition-all shrink-0"
                  >
                    <ArrowDownRight size={18} strokeWidth={2.5} />
                    <span>سحب لشراء خامات وزيوت وزجاجات</span>
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-200/60 space-y-1">
                    <span className="text-[11px] text-[#86868B] block font-medium">رأس المال المسترد من المبيعات:</span>
                    <span className="text-xl font-black font-mono text-[#1D1D1F]">
                      {restock.totalInflow.toLocaleString('ar-EG')} <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
                    </span>
                    <span className="text-[10px] text-amber-800 block">تكلفة الخامات المعتمدة (زيوت + زجاجات)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-200/60 space-y-1">
                    <span className="text-[11px] text-[#86868B] block font-medium">إجمالي المسحوب فعلياً لشراء خامات:</span>
                    <span className="text-xl font-black font-mono text-rose-600">
                      {restock.totalWithdrawn.toLocaleString('ar-EG')} <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
                    </span>
                    <span className="text-[10px] text-[#86868B] block">مسجلة بفواتير الموردين وسندات الصرف</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/95 border border-amber-400 shadow-apple-xs space-y-1">
                    <span className="text-[11px] text-amber-900 block font-bold">الرصيد المتاح للسحب الآن:</span>
                    <span className="text-2xl font-black font-mono text-emerald-700">
                      {restock.currentBalance.toLocaleString('ar-EG')} <span className="text-xs font-normal text-[#1D1D1F]">{settings.currency}</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 block font-medium">جاهز للصرف فوراً لتعويض فاقد المخزون</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
                  <Info size={16} className="text-amber-700 shrink-0" />
                  <span>
                    <strong>تنبيه محاسبي صارم:</strong> الـ 85 جنيه تكلفة الـ 20 مل ليست ربحاً، بل هي قيمة البضاعة التي خرجت من المخزون، ويجب سحبها فقط لإعادة شراء ما تم استهلاكه.
                  </span>
                </div>
              </div>
            );
          })()}

          {/* GRID OF THE REMAINING 7 SEGREGATED DEPARTMENTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                  الأقسام والمحافظ المالية المستقلة
                </h2>
                <p className="text-xs text-[#86868B]">
                  لكل بند رصيد محدد لا يمكن تجاوزه بأي حال، مع حظر السحب بالسالب
                </p>
              </div>
              <span className="text-xs font-mono text-[#86868B]">
                {liveVaults.filter(v => v.id !== 'restock').length} محافظ إضافية
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveVaults
                .filter(v => v.id !== 'restock')
                .map((vault) => {
                  const isOwnerProfit = vault.id === 'owner_profit';
                  const isCapital = vault.id === 'capital';
                  const isLocked = isOwnerProfit && !financials.isFixedBudgetFullyCovered;

                  return (
                    <div 
                      key={vault.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-apple-xs ${
                        isLocked 
                          ? 'bg-gray-50/80 border-gray-200'
                          : isOwnerProfit
                          ? 'bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 border-emerald-300'
                          : isCapital
                          ? 'bg-gradient-to-br from-slate-50 via-white to-gray-50 border-gray-300'
                          : 'bg-white border-black/[0.08]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                            vault.id === 'commissions' ? 'bg-purple-100 text-purple-700' :
                            vault.id === 'rent' ? 'bg-blue-100 text-blue-700' :
                            vault.id === 'salaries' ? 'bg-indigo-100 text-indigo-700' :
                            vault.id === 'utilities' ? 'bg-amber-100 text-amber-700' :
                            vault.id === 'contingency' ? 'bg-rose-100 text-rose-700' :
                            vault.id === 'owner_profit' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {vault.id === 'commissions' && <Coins size={20} />}
                            {vault.id === 'rent' && <Building size={20} />}
                            {vault.id === 'salaries' && <Users size={20} />}
                            {vault.id === 'utilities' && <Zap size={20} />}
                            {vault.id === 'contingency' && <ShieldAlert size={20} />}
                            {vault.id === 'owner_profit' && <TrendingUp size={20} />}
                            {vault.id === 'capital' && <Wallet size={20} />}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isLocked ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                                <Lock size={10} />
                                <span>مقفل (عجز موازنة)</span>
                              </span>
                            ) : (
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                vault.withdrawalFrequency === 'monthly' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'
                              }`}>
                                {vault.withdrawalFrequency === 'monthly' ? 'مخصص شهري' : 'حسب الحاجة'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-black text-sm text-[#1D1D1F]">{vault.name}</h3>
                          <p className="text-[11px] text-[#86868B] mt-0.5 leading-relaxed line-clamp-2">
                            {vault.description}
                          </p>
                        </div>
                      </div>

                      {/* Financial Balances */}
                      <div className="pt-3 border-t border-black/[0.05] space-y-2.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-[#86868B]">الرصيد المتاح للسحب:</span>
                          <span className={`text-xl font-black font-mono ${
                            isLocked ? 'text-gray-400' : vault.currentBalance > 0 ? 'text-emerald-700' : 'text-[#1D1D1F]'
                          }`}>
                            {vault.currentBalance.toLocaleString('ar-EG')} <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
                          </span>
                        </div>

                        <div className="flex justify-between text-[10px] text-[#86868B] font-mono">
                          <span>المخصص المجمع: {vault.totalInflow.toLocaleString('ar-EG')}</span>
                          <span>المسحوب: {vault.totalWithdrawn.toLocaleString('ar-EG')}</span>
                        </div>

                        {/* Lock Warning for Owner Profit */}
                        {isLocked && (
                          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-900 space-y-0.5 font-medium">
                            <div className="font-bold flex items-center gap-1">
                              <AlertTriangle size={12} className="text-rose-600" />
                              <span>شرط سحب الأرباح لم يتحقق بعد</span>
                            </div>
                            <p>
                              المتبقي لتغطية الموازنة الثابتة (15,000ج): <strong className="font-mono text-rose-950">{financials.fixedBudgetRemaining.toLocaleString('ar-EG')} {settings.currency}</strong>
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {isCapital ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleOpenCapitalDepositDialog}
                              className="apple-btn py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <Plus size={13} />
                              <span>ضخ تمويل</span>
                            </button>
                            <button
                              onClick={() => handleOpenWithdrawDialog(vault)}
                              disabled={vault.currentBalance <= 0}
                              className="apple-btn py-2.5 rounded-xl bg-black/[0.04] hover:bg-[#1D1D1F] hover:text-white text-xs font-bold text-[#1D1D1F] transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ArrowDownRight size={13} />
                              <span>سحب رسمي</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenWithdrawDialog(vault)}
                            disabled={isLocked || vault.currentBalance <= 0}
                            className={`apple-btn w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                              isLocked || vault.currentBalance <= 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#1D1D1F] hover:bg-black text-white'
                            }`}
                          >
                            <ArrowDownRight size={14} />
                            <span>
                              {isLocked ? 'مقفل لحين اكتمال الموازنة' : vault.currentBalance <= 0 ? 'الرصيد 0 (لا يمكن السحب)' : 'إجراء سحب معتمد'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TAB CONTENT: 15,000 EGP BUDGET BREAKDOWN (11 ITEMS)   */}
      {/* ======================================================== */}
      {activeTab === 'fixed_breakdown' && (
        <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#1D1D1F]">
                  التكوين التفصيلي للموازنة الثابتة المعتمدة (15,000 ج.م شهرياً)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-mono">
                  15,000 ÷ 25 يوماً = 600 ج.م/يوم
                </span>
              </div>
              <p className="text-xs text-[#86868B] mt-0.5">
                هذه أرقام توزيع إداري ومحاسبي لتكوين المخصصات وليست مصروفات نقدية تدفع يومياً.
              </p>
            </div>

            <div className="text-left font-mono">
              <span className="text-[11px] text-[#86868B] block">المخصص الإداري اليومي:</span>
              <span className="text-xl font-black text-[#0071E3]">600 جنيه / يومياً</span>
            </div>
          </div>

          {/* 11 Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] text-[#86868B] font-bold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">بند المصروف الإداري</th>
                  <th className="py-2.5 px-3">المخصص الشهري الكامل</th>
                  <th className="py-2.5 px-3">المخصص اليومي (على 25 يوماً)</th>
                  <th className="py-2.5 px-3">النسبة من الـ 15,000</th>
                  <th className="py-2.5 px-3">طبيعة الصرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {APPROVED_FIXED_BUDGET_ITEMS.map((item, idx) => {
                  const percentage = ((item.monthlyAmount / 15000) * 100).toFixed(1);
                  return (
                    <tr key={item.id} className="hover:bg-black/[0.015] transition-colors">
                      <td className="py-3 px-3 font-mono text-[#86868B]">{idx + 1}</td>
                      <td className="py-3 px-3 font-black text-[#1D1D1F] text-sm">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-sm text-[#1D1D1F]">
                        {item.monthlyAmount.toLocaleString('ar-EG')} {settings.currency}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#0071E3]">
                        {item.id === 'salary_tarek' ? (
                          <span className="text-[11px] font-sans font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/60">
                            🔒 مخصص خلفي سري + عمولة 5%-7%
                          </span>
                        ) : (
                          `${item.dailyRate.toLocaleString('ar-EG')} ${settings.currency} / يوم`
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#86868B]">
                        %{percentage}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          item.category === 'salaries' ? 'bg-purple-100 text-purple-900' :
                          item.category === 'rent' ? 'bg-blue-100 text-blue-900' :
                          item.category === 'contingency' ? 'bg-amber-100 text-amber-900' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.category === 'salaries' ? 'رواتب شهرية' :
                           item.category === 'rent' ? 'إيجار شهري' :
                           item.category === 'contingency' ? 'احتياطي هالك/تالف' : 'خدمات وتشغيل'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                
                {/* Total Summary Row */}
                <tr className="bg-black/[0.03] font-black border-t-2 border-black/20">
                  <td className="py-3.5 px-3 font-bold text-center" colSpan={2}>
                    الإجمالي المعتمد للموازنة الثابتة
                  </td>
                  <td className="py-3.5 px-3 font-mono text-base text-emerald-800">
                    15,000 {settings.currency}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-base text-[#0071E3]">
                    600 {settings.currency} / يوم
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    %100
                  </td>
                  <td className="py-3.5 px-3 text-[11px] text-[#86868B]">
                    14,700 ج.م معروف + 300 ج.م احتياطي
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reserve / Spoilage Explanatory Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldAlert size={15} />
              <span>وظيفة مخصص الاحتياطي (300 جنيه شهرياً / 12 جنيه يومياً):</span>
            </span>
            <p className="leading-relaxed">
              داخل موازنة الـ 15,000 ج.م يوجد احتياطي معتمد بقيمة 300 جنيه لتغطية: <strong>الهالك ← التالف ← الفاقد ← المصروفات الطارئة التي يصعب قياسها</strong>، لضمان ثبات الموازنة عند 15,000 جنيه دون زيادة أو نقصان.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TAB CONTENT: AUDITED LEDGER & WITHDRAWAL LOG          */}
      {/* ======================================================== */}
      {activeTab === 'ledger' && (
        <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#1D1D1F] flex items-center gap-1.5">
                <FileText size={17} className="text-[#0071E3]" />
                <span>سجل المسحوبات والعمليات المالية المعتمد</span>
              </h2>
              <p className="text-xs text-[#86868B]">
                أرشيف محاسبي موثق لكافة السحوبات وتوريدات رأس المال مع طباعة سندات رسمية
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedVaultFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedVaultFilter === 'all'
                    ? 'bg-[#1D1D1F] text-white shadow-xs'
                    : 'bg-black/[0.04] text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                كافة الأقسام
              </button>
              {liveVaults.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVaultFilter(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedVaultFilter === v.id
                      ? 'bg-[#1D1D1F] text-white shadow-xs'
                      : 'bg-black/[0.04] text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {v.name.split(' ')[0]} {v.name.split(' ')[1] || ''}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Table */}
          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center text-[#86868B] space-y-2 border border-dashed border-black/[0.08] rounded-2xl">
              <Coins size={36} className="mx-auto text-gray-300 stroke-1" />
              <p className="text-xs font-bold text-[#1D1D1F]">لا توجد عمليات مسجلة في هذا البند حتى الآن</p>
              <p className="text-[11px] max-w-md mx-auto">
                عند إجراء سحب لشراء خامات، سداد إيجار، صرف رواتب، أو إضافة رأس مال جديد، سيتم قيدها فوراً وتحديث الرصيد وطباعة سند معتمد.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[#86868B] font-bold">
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">القسم / البند</th>
                    <th className="py-2.5 px-3">نوع الحركة</th>
                    <th className="py-2.5 px-3">المبلغ</th>
                    <th className="py-2.5 px-3">المستلم والبيان</th>
                    <th className="py-2.5 px-3">المرجع / الفاتورة</th>
                    <th className="py-2.5 px-3">المنفذ</th>
                    <th className="py-2.5 px-3">الرصيد بعد الحركة</th>
                    <th className="py-2.5 px-3 text-center">سند رسمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {filteredWithdrawals.map((tx) => {
                    const dt = new Date(tx.date);
                    const formattedDate = dt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
                    const formattedTime = dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                    const isDeposit = tx.type === 'capital_deposit';

                    return (
                      <tr key={tx.id} className="hover:bg-black/[0.015] transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-[#86868B]">
                          <div>{formattedDate}</div>
                          <div className="text-[10px]">{formattedTime}</div>
                        </td>

                        <td className="py-3 px-3 font-bold text-[#1D1D1F]">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            tx.vaultId === 'restock' ? 'bg-amber-100 text-amber-900' :
                            tx.vaultId === 'rent' ? 'bg-blue-100 text-blue-900' :
                            tx.vaultId === 'salaries' ? 'bg-purple-100 text-purple-900' :
                            tx.vaultId === 'commissions' ? 'bg-fuchsia-100 text-fuchsia-900' :
                            tx.vaultId === 'capital' ? 'bg-gray-200 text-gray-900' :
                            'bg-emerald-100 text-emerald-900'
                          }`}>
                            {tx.vaultName}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isDeposit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isDeposit ? '+ إضافة رأس مال' : '- سحب مصروف'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono font-black text-sm">
                          <span className={isDeposit ? 'text-emerald-700' : 'text-rose-600'}>
                            {isDeposit ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')} {settings.currency}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-[#1D1D1F] max-w-xs">
                          {tx.recipientName && (
                            <div className="font-bold text-[11px] text-[#1D1D1F]">{tx.recipientName}</div>
                          )}
                          <div className="text-[11px] text-[#86868B]">{tx.reason}</div>
                          {tx.notes && <div className="text-[10px] text-gray-400">{tx.notes}</div>}
                        </td>

                        <td className="py-3 px-3 text-[11px] text-[#86868B] font-mono">
                          {tx.invoiceRef || '—'}
                        </td>

                        <td className="py-3 px-3 text-[#1D1D1F] font-semibold text-[11px]">
                          {tx.executedBy}
                        </td>

                        <td className="py-3 px-3 font-mono text-emerald-700 font-bold">
                          {tx.balanceAfter.toLocaleString('ar-EG')} {settings.currency}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handlePrintVoucher(tx)}
                            className="px-2.5 py-1 rounded-lg bg-black/[0.04] hover:bg-[#0071E3] hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 mx-auto shadow-2xs"
                            title="طباعة سند معتمد"
                          >
                            <Printer size={12} />
                            <span>سند</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB CONTENT: RULES & THE 25-DAYS PLANNING PRINCIPLE   */}
      {/* ======================================================== */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          
          {/* Strict Forbidden Rules Banner */}
          <div className="apple-glass rounded-3xl p-5 sm:p-6 border-2 border-rose-300 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 shadow-apple-card space-y-4">
            <div className="flex items-center gap-2.5 text-rose-900">
              <AlertOctagon size={24} className="text-rose-600 shrink-0" />
              <div>
                <h2 className="text-base font-black text-rose-950">
                  القواعد المحاسبية الممنوعة قطيعاً في «لَمْسَةُ عِطْر»
                </h2>
                <p className="text-xs text-rose-800">
                  هذه القواعد مبرمجة في النظام لمنع أي عجز أو تآكل لرأس المال
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-white/95 border border-rose-200 flex items-start gap-2.5">
                <span className="text-rose-600 font-black text-base shrink-0">❌</span>
                <div>
                  <h3 className="font-bold text-xs text-rose-950">شراء المخزون من قسم المصاريف</h3>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    ممنوع شراء أي زيت أو زجاجات من موازنة الإيجار أو الرواتب؛ المخزون يمول حصرياً من محفظة تكلفة المخزون.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/95 border border-rose-200 flex items-start gap-2.5">
                <span className="text-rose-600 font-black text-base shrink-0">❌</span>
                <div>
                  <h3 className="font-bold text-xs text-rose-950">دفع الإيجار من قسم تكلفة المخزون</h3>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    تكلفة المخزون مقدسة لإعادة شراء الخامات فقط، ولا يجوز المساس بها لسداد إيجار أو فواتير.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/95 border border-rose-200 flex items-start gap-2.5">
                <span className="text-rose-600 font-black text-base shrink-0">❌</span>
                <div>
                  <h3 className="font-bold text-xs text-rose-950">دفع عمولة من رأس المال</h3>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    العمولة هي تكلفة متغيرة مرتبطة بالبيع، تصرف من مخصص العمولات المتجمع من البيع الفعلي فقط.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/95 border border-rose-200 flex items-start gap-2.5">
                <span className="text-rose-600 font-black text-base shrink-0">❌</span>
                <div>
                  <h3 className="font-bold text-xs text-rose-950">سحب أرباح قبل تكوين الموازنة الثابتة</h3>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    لا يعتبر أي مليم ربحاً قابلاً للسحب إلا بعد تغطية تكلفة المخزون + العمولات + الـ 15,000 جنيه كاملة.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* The 25-Days Planning Principle & Compensation Days */}
          <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-4">
            <div className="flex items-center gap-2.5">
              <Calendar size={20} className="text-[#0071E3]" />
              <h2 className="text-base font-black text-[#1D1D1F]">
                قاعدة الـ 25 يوماً والأيام التعويضية لسد العجز
              </h2>
            </div>

            <div className="space-y-3 text-xs text-[#1D1D1F] leading-relaxed">
              <p>
                الـ <strong>25 يوماً</strong> هي <strong>قاعدة التخطيط والمحاسبة والتارجت المالي</strong>، وليست عدد أيام الشهر التقويمية. تسجل المبيعات الفعلية في كل يوم يعمل فيه المتجر بالتاريخ الحقيقي.
              </p>

              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-blue-950">
                  <span>أيام العمل الفعلية المسجلة هذا الشهر:</span>
                  <span className="text-base font-mono font-black">{financials.uniqueSaleDays} يوم عمل</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  إذا كان الشهر يحتوي على يوم عمل إضافي بعد إكمال 25 يوماً مخططة: <strong>لا نحذف هذا اليوم من السجل، ولا نقسم الـ 15,000 عليه</strong>، بل يصبح <strong>يوماً احتياطياً يستخدم لتعويض العجز المتراكم</strong> وفق المعادلة:
                </p>
                <div className="p-2.5 rounded-xl bg-white border border-blue-300 font-mono text-center font-bold text-blue-900 text-xs">
                  الهدف المتبقي = 15,000 ج.م − المساهمة المتراكمة ({financials.totalNetContribution.toLocaleString('ar-EG')} ج.م) = {financials.fixedBudgetRemaining.toLocaleString('ar-EG')} ج.م
                </div>
                <p className="text-[11px] text-blue-800">
                  وإذا أصبح المتجر متقدماً عن الهدف: <strong>لا نعتبر اليوم الاحتياطي مبرراً لرفع المصروفات</strong>.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: STRICT WITHDRAWAL & CAPITAL DEPOSIT DIALOG     */}
      {/* ======================================================== */}
      {isModalOpen && currentActiveVault && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="apple-glass rounded-3xl p-5 sm:p-6 w-full max-w-lg border border-black/[0.08] shadow-apple-lg space-y-4 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  {modalMode === 'capital_deposit' ? 'ضخ تمويل رسمي' : 'إجراء سحب معتمد وتحديث الحسابات'}
                </span>
                <h3 className="text-lg font-black text-[#1D1D1F]">
                  {modalMode === 'capital_deposit' ? '➕ إضافة رأس مال جديد' : `سحب من: ${currentActiveVault.name}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Balance Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-900 block font-medium">الرصيد المتاح حالياً في هذا البند:</span>
                <span className="text-2xl font-black font-mono text-amber-950">
                  {currentActiveVault.currentBalance.toLocaleString('ar-EG')} {settings.currency}
                </span>
              </div>
              {modalMode === 'withdrawal' && currentActiveVault.currentBalance > 0 && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTransAmount(Math.round(currentActiveVault.currentBalance * 0.5))}
                    className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-[10px] font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransAmount(currentActiveVault.currentBalance)}
                    className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 text-[10px] font-bold text-amber-950 hover:bg-amber-100 transition-colors shadow-2xs"
                  >
                    كامل الرصيد
                  </button>
                </div>
              )}
            </div>

            {/* Overdraft Alert */}
            {modalMode === 'withdrawal' && transAmount !== '' && Number(transAmount) > currentActiveVault.currentBalance && (
              <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs space-y-1 animate-in shake duration-200">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertOctagon size={16} />
                  <span>تجاوز مرفوض! المبلغ يتجاوز الرصيد المتاح</span>
                </div>
                <p>
                  المبلغ المطلوب ({Number(transAmount).toLocaleString('ar-EG')} ج.م) يتجاوز الرصيد المتوفر ({currentActiveVault.currentBalance.toLocaleString('ar-EG')} ج.م) بمقدار {(Number(transAmount) - currentActiveVault.currentBalance).toFixed(1)} ج.م. النظام يمنع السحب بالسالب نهائياً.
                </p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1D1D1F] mb-1 block">
                  {modalMode === 'capital_deposit' ? 'المبلغ المودع كرأس مال' : 'المبلغ المطلوب سحبه'} ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={modalMode === 'withdrawal' ? currentActiveVault.currentBalance : undefined}
                  placeholder="0.00"
                  value={transAmount}
                  onChange={(e) => setTransAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.1] font-mono font-bold text-lg text-[#1D1D1F] outline-none focus:border-[#0071E3]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] mb-1 block">البيان وسبب العملية *</label>
                <input
                  type="text"
                  placeholder="السبب المفصل للعملية..."
                  value={transReason}
                  onChange={(e) => setTransReason(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-white border border-black/[0.1] font-medium outline-none focus:border-[#0071E3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-[#86868B] mb-1 block">اسم المستلم / الجهة *</label>
                  <input
                    type="text"
                    placeholder="اسم المورد أو المستلم..."
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] font-medium outline-none focus:border-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#86868B] mb-1 block">رقم الفاتورة أو المستند</label>
                  <input
                    type="text"
                    placeholder="رقم الفاتورة إن وجد..."
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] font-mono outline-none focus:border-[#0071E3]"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#86868B] mb-1 block">الشخص المنفذ للعملية</label>
                <input
                  type="text"
                  value={executedBy}
                  onChange={(e) => setExecutedBy(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] font-medium outline-none"
                />
              </div>
            </div>

            {/* Calculations Preview */}
            {transAmount !== '' && Number(transAmount) > 0 && (
              <div className="p-3 rounded-2xl bg-black/[0.03] space-y-1 text-xs">
                <div className="flex justify-between text-[#86868B]">
                  <span>المبلغ المراد {modalMode === 'capital_deposit' ? 'إيداعه' : 'صرفه'}:</span>
                  <span className={`font-mono font-bold ${modalMode === 'capital_deposit' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {modalMode === 'capital_deposit' ? '+' : '-'}{Number(transAmount).toLocaleString('ar-EG')} {settings.currency}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[#1D1D1F] pt-1 border-t border-black/[0.06]">
                  <span>الرصيد بعد الحركة:</span>
                  <span className="font-mono text-emerald-800 font-black">
                    {(modalMode === 'capital_deposit' 
                      ? currentActiveVault.currentBalance + Number(transAmount)
                      : Math.max(0, currentActiveVault.currentBalance - Number(transAmount))
                    ).toLocaleString('ar-EG')} {settings.currency}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="apple-btn flex-1 py-2.5 rounded-xl border border-black/[0.1] text-xs font-bold text-[#1D1D1F] hover:bg-black/[0.04]"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmTransaction}
                disabled={
                  isSubmitting || 
                  !transAmount || 
                  Number(transAmount) <= 0 || 
                  (modalMode === 'withdrawal' && Number(transAmount) > currentActiveVault.currentBalance)
                }
                className="apple-btn flex-2 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={15} />
                <span>
                  {modalMode === 'capital_deposit' ? 'تأكيد توريد رأس المال' : 'تأكيد السحب وتحديث الحسابات'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. PRINT VOUCHER MODAL (سند صرف نقدي معتمد أو توريد)      */}
      {/* ======================================================== */}
      {printedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-black/[0.08] space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <span className="text-xs font-bold text-[#86868B]">
                {printedTransaction.type === 'capital_deposit' ? 'سند توريد رأس مال رسمي' : 'سند صرف نقدي معتمد'}
              </span>
              <button onClick={() => setPrintedTransaction(null)} className="text-sm font-bold text-[#86868B]">✕</button>
            </div>

            <div className="space-y-3 font-mono text-xs border border-black/10 rounded-2xl p-4 bg-gray-50/50">
              <div className="text-center pb-2 border-b border-dashed border-black/20">
                <h3 className="font-bold text-sm text-[#1D1D1F]">{settings.storeName}</h3>
                <p className="text-[10px] text-gray-500">{settings.storeSlogan}</p>
                <span className="text-[11px] font-bold text-[#0071E3] block mt-1">
                  {printedTransaction.type === 'capital_deposit' ? 'سند توريد رأس مال' : 'سند صرف نقدي'} #{printedTransaction.id.slice(-6)}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span>{new Date(printedTransaction.date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex justify-between">
                  <span>القسم المالي:</span>
                  <span className="font-bold text-[#1D1D1F]">{printedTransaction.vaultName}</span>
                </div>
                {printedTransaction.recipientName && (
                  <div className="flex justify-between">
                    <span>{printedTransaction.type === 'capital_deposit' ? 'المودع:' : 'المستلم:'}</span>
                    <span className="font-bold text-[#1D1D1F]">{printedTransaction.recipientName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>المبلغ:</span>
                  <span className="font-bold text-sm text-black">
                    {printedTransaction.amount.toLocaleString('ar-EG')} {settings.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>البيان والغرض:</span>
                  <span className="text-right max-w-48 font-sans">{printedTransaction.reason}</span>
                </div>
                {printedTransaction.invoiceRef && (
                  <div className="flex justify-between">
                    <span>رقم المرجع:</span>
                    <span>{printedTransaction.invoiceRef}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>المعتمد والمنفذ:</span>
                  <span>{printedTransaction.executedBy}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dashed border-black/20">
                  <span>الرصيد بعد الحركة:</span>
                  <span className="font-bold text-emerald-800">{printedTransaction.balanceAfter.toLocaleString('ar-EG')} {settings.currency}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between text-[10px] border-t border-black/20 font-sans">
                <div>توقيع المستلم: ____________</div>
                <div>توقيع المدير المالي: ____________</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPrintedTransaction(null)}
                className="apple-btn flex-1 py-2 rounded-xl border border-black/[0.08] text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="apple-btn flex-2 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>طباعة السند</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialVaults;
