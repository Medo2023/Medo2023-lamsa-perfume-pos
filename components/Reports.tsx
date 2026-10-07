import React, { useState, useMemo } from 'react';
import {
  Sale,
  SaleItem,
  Product,
  StoreSettings,
  DEFAULT_SETTINGS,
  BottleSize,
  DEFAULT_BOTTLE_SIZES,
  AppUser,
  isLiveProductionSale,
  isTestOrExampleRecord
} from '../types';
import { canViewProfits, canViewCosts } from '../services/authService';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  Printer,
  Share2,
  FileText,
  Trash2,
  X,
  Check,
  Layers,
  Download,
  Award,
  Wallet,
  CreditCard,
  Receipt,
  Scale,
  ShoppingBag,
  Edit3,
  RotateCcw,
  Copy,
  Plus,
  Minus,
  Sparkles,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  User,
  Phone,
  Eye,
  EyeOff
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  bottleSizes?: BottleSize[];
  onDeleteSale?: (saleId: string, restoreStock?: boolean, reversalReason?: string, mode?: 'permanent' | 'reverse') => void;
  onUpdateSale?: (updatedSale: Sale, previousSale: Sale, restoreOrAdjustStock: boolean) => void;
  onDuplicateSale?: (newSale: Sale) => void;
  onNavigateToPOS?: () => void;
  settings?: StoreSettings;
  onUpdateSettings?: (settings: StoreSettings) => void;
  currentUser?: AppUser | null;
}

type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';
type PaymentFilter = 'all' | 'نقدي' | 'بطاقة' | 'محفظة إلكترونية';
type SortBy = 'newest' | 'highest_price' | 'highest_profit' | 'highest_grams';

const Reports: React.FC<ReportsProps> = ({
  sales,
  products,
  bottleSizes = DEFAULT_BOTTLE_SIZES,
  onDeleteSale,
  onUpdateSale,
  onDuplicateSale,
  onNavigateToPOS,
  settings = DEFAULT_SETTINGS,
  onUpdateSettings,
  currentUser
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [hideProfits, setHideProfits] = useState(false);

  // Modals state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  // Full Invoice Edit Modal State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'نقدي' | 'بطاقة' | 'محفظة إلكترونية'>('نقدي');
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [adjustStockOnEdit, setAdjustStockOnEdit] = useState<boolean>(true);
  const [addingProductId, setAddingProductId] = useState<number | ''>('');

  const showProfitMetrics = (canViewProfits(currentUser ?? null) || currentUser?.role === 'OWNER') && !hideProfits;
  const showCostMetrics = (canViewCosts(currentUser ?? null) || currentUser?.role === 'OWNER') && !hideProfits;

  // Filter & Sort sales in real-time
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const list = sales.filter((sale) => {
      // Exclude test/example records from production reports
      if (isTestOrExampleRecord(sale)) return false;

      // Time filter
      if (timeRange === 'today') {
        if (!sale.date.startsWith(todayStr)) return false;
      } else if (timeRange === 'yesterday') {
        if (!sale.date.startsWith(yesterdayStr)) return false;
      } else if (timeRange === 'week') {
        const saleDate = new Date(sale.date);
        const diffTime = Math.abs(now.getTime() - saleDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (timeRange === 'month') {
        const currentMonth = now.toISOString().slice(0, 7);
        if (!sale.date.startsWith(currentMonth)) return false;
      } else if (timeRange === 'custom' && customDate) {
        if (!sale.date.startsWith(customDate)) return false;
      }

      // Payment method filter
      if (paymentFilter !== 'all') {
        const method = sale.paymentMethod || 'نقدي';
        if (method !== paymentFilter) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const customerMatch = sale.customerName?.toLowerCase().includes(term) || false;
        const phoneMatch = sale.customerPhone?.includes(term) || false;
        const idMatch = sale.id.toLowerCase().includes(term);
        const empMatch = sale.employeeName?.toLowerCase().includes(term) || false;
        const itemMatch = (sale.items || []).some(
          (item) =>
            item.productName.toLowerCase().includes(term) ||
            item.productType.toLowerCase().includes(term)
        );
        return customerMatch || phoneMatch || idMatch || empMatch || itemMatch;
      }

      return true;
    });

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'highest_price') return (b.totalPrice || 0) - (a.totalPrice || 0);
      if (sortBy === 'highest_profit') return (b.totalProfit || 0) - (a.totalProfit || 0);
      if (sortBy === 'highest_grams') {
        const gA = (a.items || []).reduce((s, i) => s + (i.essenceGrams || 0), 0);
        const gB = (b.items || []).reduce((s, i) => s + (i.essenceGrams || 0), 0);
        return gB - gA;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [sales, timeRange, customDate, paymentFilter, sortBy, searchTerm]);

  // Financial aggregates (active non-reversed live production sales)
  const activeFilteredSales = useMemo(
    () => filteredSales.filter(s => isLiveProductionSale(s)),
    [filteredSales]
  );

  const totalRevenue = useMemo(
    () => activeFilteredSales.reduce((sum, s) => sum + (s.totalPrice || 0), 0),
    [activeFilteredSales]
  );
  const totalCost = useMemo(
    () => activeFilteredSales.reduce((sum, s) => sum + (s.totalCost || 0), 0),
    [activeFilteredSales]
  );
  const totalProfit = useMemo(
    () => activeFilteredSales.reduce((sum, s) => sum + (s.totalProfit || 0), 0),
    [activeFilteredSales]
  );
  const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const averageTicket = activeFilteredSales.length > 0 ? totalRevenue / activeFilteredSales.length : 0;

  const totalBottlesSold = useMemo(() => {
    return activeFilteredSales.reduce((acc, s) => {
      return acc + (s.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
    }, 0);
  }, [activeFilteredSales]);

  const totalGramsConsumed = useMemo(() => {
    return activeFilteredSales.reduce((sum, s) => {
      const saleGrams = (s.items || []).reduce((itemSum, item) => itemSum + (item.essenceGrams || 0), 0);
      return sum + saleGrams;
    }, 0);
  }, [activeFilteredSales]);

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    const map = { 'نقدي': 0, 'بطاقة': 0, 'محفظة إلكترونية': 0 };
    activeFilteredSales.forEach(s => {
      const method = s.paymentMethod || 'نقدي';
      map[method] = (map[method] || 0) + s.totalPrice;
    });
    return map;
  }, [activeFilteredSales]);

  // Top selling perfumes ranking
  const topSellingPerfumes = useMemo(() => {
    const map: Record<string, { name: string; type: string; count: number; revenue: number; profit: number; grams: number }> = {};
    activeFilteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!map[item.productName]) {
          map[item.productName] = {
            name: item.productName,
            type: item.productType,
            count: 0,
            revenue: 0,
            profit: 0,
            grams: 0,
          };
        }
        map[item.productName].count += item.quantity || 1;
        map[item.productName].revenue += item.sellingPrice || 0;
        map[item.productName].profit += item.profit || 0;
        map[item.productName].grams += item.essenceGrams || 0;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [activeFilteredSales]);

  // Open Edit Modal for a Sale
  const handleOpenEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditCustomerName(sale.customerName || '');
    setEditCustomerPhone(sale.customerPhone || '');
    setEditPaymentMethod(sale.paymentMethod || 'نقدي');
    setEditDiscount(sale.discount || 0);
    setEditNotes(sale.notes || '');
    setEditItems(sale.items.map(item => ({ ...item })));
    setAdjustStockOnEdit(true);
    setAddingProductId('');
  };

  // Edit Item inside Invoice Editor
  const handleUpdateEditItem = (index: number, field: keyof SaleItem, value: number) => {
    setEditItems(prev => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      const comm = item.sellingPrice * (settings.commissionRate || 0.05);
      item.profit = item.sellingPrice - item.cost - comm;
      next[index] = item;
      return next;
    });
  };

  const handleRemoveEditItem = (index: number) => {
    if (editItems.length <= 1) return;
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProductToEditInvoice = () => {
    if (addingProductId === '') return;
    const prod = products.find(p => p.id === Number(addingProductId));
    if (!prod) return;
    const defaultBottle = bottleSizes.find(b => b.sizeMl === 50) || bottleSizes[0] || DEFAULT_BOTTLE_SIZES[0];
    const isSpec = ['عود', 'مسك'].includes(prod.type);
    const price = isSpec ? (defaultBottle.specialPrice || 450) : (defaultBottle.normalPrice || 230);
    const cost = defaultBottle.officialCost || 180;
    const comm = price * (settings.commissionRate || 0.05);

    const newItem: SaleItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      productId: prod.id,
      productName: prod.name,
      productType: prod.type,
      bottleSize: defaultBottle.sizeMl,
      essenceGrams: defaultBottle.essenceGrams,
      cost,
      sellingPrice: price,
      profit: price - cost - comm,
      quantity: 1,
    };

    setEditItems(prev => [...prev, newItem]);
    setAddingProductId('');
  };

  const handleSaveEditedSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !onUpdateSale) return;

    const subtotal = editItems.reduce((s, i) => s + (Number(i.sellingPrice) || 0), 0);
    const finalTotal = Math.max(0, subtotal - (Number(editDiscount) || 0));
    const finalCost = editItems.reduce((s, i) => s + (Number(i.cost) || 0), 0);
    const finalComm = finalTotal * (settings.commissionRate || 0.05);
    const finalProfit = finalTotal - finalCost - finalComm;

    const updatedSale: Sale = {
      ...editingSale,
      items: editItems,
      totalPrice: finalTotal,
      totalCost: finalCost,
      totalProfit: finalProfit,
      commissionAmount: finalComm,
      paymentMethod: editPaymentMethod,
      ...(editCustomerName.trim() ? { customerName: editCustomerName.trim() } : { customerName: undefined }),
      ...(editCustomerPhone.trim() ? { customerPhone: editCustomerPhone.trim() } : { customerPhone: undefined }),
      ...(editDiscount > 0 ? { discount: editDiscount } : { discount: undefined }),
      ...(editNotes.trim() ? { notes: editNotes.trim() } : { notes: undefined }),
    };

    onUpdateSale(updatedSale, editingSale, adjustStockOnEdit);
    setEditingSale(null);
  };

  // Quick 1-click payment method switch directly from row
  const handleQuickSwitchPayment = (sale: Sale) => {
    if (!onUpdateSale) return;
    const methods: Array<'نقدي' | 'بطاقة' | 'محفظة إلكترونية' | 'تحويل بنكي'> = ['نقدي', 'بطاقة', 'محفظة إلكترونية', 'تحويل بنكي'];
    const currentIdx = methods.indexOf(sale.paymentMethod || 'نقدي');
    const nextMethod = methods[(currentIdx + 1) % methods.length];
    const updated: Sale = { ...sale, paymentMethod: nextMethod };
    onUpdateSale(updated, sale, false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['رقم الفاتورة,التاريخ,الأصناف,عدد العبوات,الزيت(جم),التكلفة,سعر البيع,الربح,العميل,الهاتف,طريقة الدفع,البائع'];
    const rows = filteredSales.map((s) => {
      const itemsSummary = (s.items || []).map(i => `${i.productName} (${i.bottleSize}مل×${i.quantity || 1})`).join(' + ');
      const bottlesCount = (s.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
      const gramsCount = (s.items || []).reduce((acc, i) => acc + (i.essenceGrams || 0), 0);
      return [
        s.id,
        new Date(s.date).toLocaleString('ar-EG'),
        `"${itemsSummary}"`,
        bottlesCount,
        gramsCount,
        s.totalCost,
        s.totalPrice,
        s.totalProfit,
        `"${s.customerName || 'عميل نقدي'}"`,
        `"${s.customerPhone || ''}"`,
        `"${s.paymentMethod || 'نقدي'}"`,
        `"${s.employeeName || 'طارق'}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lamsa-invoices-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyInvoice = (sale: Sale) => {
    const itemsLines = (sale.items || [])
      .map(i => `• ${i.productName} (${i.bottleSize} مل × ${i.quantity || 1}) - ${i.sellingPrice} ${settings.currency}`)
      .join('\n');
    const text = `🧾 فاتورة متجر ${settings.storeName}
رقم الفاتورة: #${sale.id.slice(-6)}
التاريخ: ${new Date(sale.date).toLocaleString('ar-EG')}
العميل: ${sale.customerName || 'عميلنا العزيز'}
-----------------------------
${itemsLines}
-----------------------------
الإجمالي النهائي: ${sale.totalPrice} ${settings.currency}
طريقة السداد: ${sale.paymentMethod || 'نقدي'}
شكراً لزيارتكم نسعد بخدمتكم دائماً ✨`;

    navigator.clipboard.writeText(text);
    setCopiedInvoiceId(sale.id);
    setTimeout(() => setCopiedInvoiceId(null), 2500);
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 pb-14 animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* TOP HEADER & QUICK CONTROL ACTIONS                       */}
      {/* ======================================================== */}
      <header className="apple-glass rounded-[26px] p-4 sm:p-5 border border-black/[0.07] shadow-apple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] text-[#C49746] flex items-center justify-center shadow-sm shrink-0">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-[#1D1D1F] tracking-tight">
                سجل المبيعات والفواتير والتحكم الشامل
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#248A3D] bg-[#34C759]/12 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse"></span>
                تحديث فوري ذكي
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              إدارة كاملة للفواتير: تعديل الأصناف والأسعار · تبديل طريقة الدفع · استرجاع الزيوت للمخزون · طباعة ومشاركة واتساب
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onDeleteSale && sales.some((s) => s.isReversed) && (
            <button
              type="button"
              onClick={() => {
                const reversedList = sales.filter((s) => s.isReversed);
                reversedList.forEach((s) => {
                  onDeleteSale(s.id, false, 'تنظيف الفواتير الملغاة نهائياً من السجل', 'permanent');
                });
              }}
              className="apple-btn px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-apple-xs cursor-pointer"
              title="حذف جميع الفواتير الملغاة سابقاً بقيد عكسي وإزالتها نهائياً من الجدول"
            >
              <Trash2 size={14} />
              <span>حذف الفواتير الملغاة نهائياً ({sales.filter((s) => s.isReversed).length})</span>
            </button>
          )}

          {onNavigateToPOS && (
            <button
              type="button"
              onClick={onNavigateToPOS}
              className="apple-btn px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 shadow-apple-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>إصدار فاتورة جديدة (الكاشير)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="apple-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-black/[0.08] text-xs font-bold text-[#1D1D1F] shadow-apple-xs hover:bg-black/[0.02] cursor-pointer"
            title="تصدير سجل الفواتير لملف إكسل CSV"
          >
            <Download size={14} className="text-[#0071E3]" />
            <span>تصدير إكسل (CSV)</span>
          </button>

          {(canViewProfits(currentUser ?? null) || currentUser?.role === 'OWNER') && (
            <button
              type="button"
              onClick={() => setHideProfits(!hideProfits)}
              className="apple-btn px-3 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5 cursor-pointer"
              title="إخفاء أو إظهار أرقام الأرباح والتكاليف"
            >
              {hideProfits ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline">{hideProfits ? 'إظهار الأرباح' : 'إخفاء الأرباح'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* SMART FILTERING & TIME RANGE BAR                         */}
      {/* ======================================================== */}
      <div className="apple-glass rounded-2xl p-3.5 sm:p-4 border border-black/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Time Range Segmented Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] overflow-x-auto">
            {([
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'all', label: `الكل (${sales.length})` },
              { id: 'custom', label: 'تاريخ محدد' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  timeRange === t.id
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#636366] hover:text-[#1D1D1F]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {timeRange === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs font-mono font-bold text-[#1D1D1F] outline-none focus:border-[#0071E3]"
            />
          )}
        </div>

        {/* Payment Method Filter + Sort By */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04]">
            {(['all', 'نقدي', 'بطاقة', 'محفظة إلكترونية'] as const).map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => setPaymentFilter(pm)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  paymentFilter === pm
                    ? 'bg-[#1D1D1F] text-white shadow-2xs'
                    : 'text-[#636366] hover:text-[#1D1D1F]'
                }`}
              >
                {pm === 'all' ? 'كل طرق الدفع' : pm === 'محفظة إلكترونية' ? 'محفظة' : pm}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-black/[0.08] rounded-xl px-2.5 h-9">
            <ArrowUpDown size={13} className="text-[#86868B]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="text-xs font-bold text-[#1D1D1F] bg-transparent outline-none cursor-pointer"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="highest_price">الأعلى قيمة (المبلغ)</option>
              <option value="highest_profit">الأعلى ربحاً</option>
              <option value="highest_grams">الأكثر استهلاكاً للزيت</option>
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FINANCIAL KPI STATS CARDS                                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="apple-glass-card rounded-3xl p-4 sm:p-5 border border-black/[0.06] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#86868B]">إجمالي المبيعات والفواتير</span>
            <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1D1D1F]">
              {totalRevenue.toLocaleString('ar-EG')}{' '}
              <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
            </div>
            <p className="text-[11px] text-[#86868B] mt-1">
              عدد الفواتير: <strong className="text-[#1D1D1F] font-mono">{activeFilteredSales.length}</strong> فاتورة ({totalBottlesSold} عبوة)
            </p>
          </div>
        </div>

        {/* Total Contribution */}
        {showProfitMetrics ? (
          <div className="apple-glass-card rounded-3xl p-4 sm:p-5 border border-black/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#86868B]">المساهمة المحققة (المبيعات ← التكلفة ← العمولة)</span>
              <div className="w-8 h-8 rounded-xl bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#248A3D]">
                +{totalProfit.toLocaleString('ar-EG')}{' '}
                <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
              </div>
              <p className="text-[11px] text-[#86868B] mt-1">
                نسبة المساهمة: <strong className="text-[#248A3D] font-mono">{profitMarginPercent.toFixed(1)}%</strong> (تغطي أولاً المخصص الثابت)
              </p>
            </div>
          </div>
        ) : (
          <div className="apple-glass-card rounded-3xl p-4 sm:p-5 border border-black/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#86868B]">متوسط قيمة الفاتورة</span>
              <div className="w-8 h-8 rounded-xl bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center">
                <Receipt size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#1D1D1F]">
                {averageTicket.toFixed(0)}{' '}
                <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
              </div>
              <p className="text-[11px] text-[#86868B] mt-1">معدل سلة الشراء للعميل الواحد</p>
            </div>
          </div>
        )}

        {/* Cost of Goods Sold (COGS) */}
        {showCostMetrics ? (
          <div className="apple-glass-card rounded-3xl p-4 sm:p-5 border border-black/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#86868B]">تكلفة الخامات المستردة</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/12 text-[#9A6E23] flex items-center justify-center">
                <Scale size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#1D1D1F]">
                {totalCost.toLocaleString('ar-EG')}{' '}
                <span className="text-xs font-normal text-[#86868B]">{settings.currency}</span>
              </div>
              <p className="text-[11px] text-[#86868B] mt-1">مخصص تعويض الزيوت والزجاجات</p>
            </div>
          </div>
        ) : (
          <div className="apple-glass-card rounded-3xl p-4 sm:p-5 border border-black/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#86868B]">إجمالي العبوات المركبة</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0071E3] flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#1D1D1F]">
                {totalBottlesSold}{' '}
                <span className="text-xs font-normal text-[#86868B]">عبوة عطرية</span>
              </div>
              <p className="text-[11px] text-[#86868B] mt-1">منفذة ومعتمدة في السجل</p>
            </div>
          </div>
        )}

        {/* Total Raw Essence Consumed */}
        <div className="apple-glass-card rounded-3xl p-4 sm:p-5 border border-black/[0.06] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#86868B]">استهلاك الزيوت الخام</span>
            <div className="w-8 h-8 rounded-xl bg-[#C49746]/15 text-[#9A6E23] flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1D1D1F]">
              {totalGramsConsumed.toLocaleString('ar-EG')}{' '}
              <span className="text-xs font-normal text-[#86868B]">جرام</span>
            </div>
            <p className="text-[11px] text-[#86868B] mt-1">
              نقدي: {paymentBreakdown['نقدي']} ج · إلكتروني/بطاقة: {paymentBreakdown['بطاقة'] + paymentBreakdown['محفظة إلكترونية']} ج
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* INVOICES LOG TABLE WITH FULL INTERACTIVE CONTROL         */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-[28px] p-4 sm:p-6 space-y-4 border border-black/[0.07] shadow-apple-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-black/[0.06]">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#1D1D1F] flex items-center gap-2">
              <span>سجل الفواتير التفصيلي والتحكم الفوري</span>
              <span className="text-xs font-mono font-bold text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-0.5 rounded-full">
                {filteredSales.length} فاتورة
              </span>
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              انقر على «تعديل» لتغيير الأصناف أو الأسعار أو العميل، أو انقر على طريقة الدفع لتبديلها فوراً
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة، اسم العطر، العميل، أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pr-9 pl-8 rounded-xl bg-white border border-black/[0.1] focus:border-[#0071E3] text-xs font-medium text-[#1D1D1F] outline-none transition-all"
            />
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-14 text-center text-[#86868B] space-y-2.5">
            <FileText size={36} className="mx-auto text-[#AEAEB2] stroke-1" />
            <p className="text-sm font-bold text-[#1D1D1F]">
              {timeRange === 'today'
                ? 'لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم'
                : 'لا توجد بيانات مبيعات فعلية مسجلة في هذه الفترة'}
            </p>
            <p className="text-xs text-[#86868B]">
              لا تظهر نتائج مالية إلا من البيانات الفعلية المسجلة (Test Data ≠ Production Data)
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: Interactive Invoice Cards */}
            <div className="md:hidden space-y-3">
              {filteredSales.map((sale) => {
                const totalSaleGrams = (sale.items || []).reduce((s, i) => s + (i.essenceGrams || 0), 0);
                const totalSaleBottles = (sale.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
                return (
                  <div
                    key={sale.id}
                    className={`p-4 rounded-2xl border space-y-3 transition-all ${
                      sale.isReversed
                        ? 'bg-rose-50/40 border-rose-200 opacity-75'
                        : 'bg-white border-black/[0.07] shadow-apple-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-lg">
                          #{sale.id.slice(-6)}
                        </span>
                        <span className="text-[11px] text-[#86868B] font-mono">
                          {new Date(sale.date).toLocaleDateString('ar-EG')} ·{' '}
                          {new Date(sale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-mono font-black text-base text-[#1D1D1F]">
                        {sale.totalPrice.toLocaleString('ar-EG')} {settings.currency}
                      </span>
                    </div>

                    {/* All Items in Invoice */}
                    <div className="space-y-1 bg-[#F5F5F7] p-2.5 rounded-xl">
                      {(sale.items || []).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#1D1D1F]">
                            {it.productName}{' '}
                            <span className="text-[10px] font-normal text-[#636366]">
                              ({it.bottleSize} مل × {it.quantity || 1} · {it.essenceGrams} جم)
                            </span>
                          </span>
                          <span className="font-mono font-bold text-[#1D1D1F]">
                            {it.sellingPrice} {settings.currency}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#636366]">
                      <span>
                        العميل: <strong className="text-[#1D1D1F]">{sale.customerName || 'عميل نقدي'}</strong>
                        {sale.customerPhone ? ` (${sale.customerPhone})` : ''}
                      </span>
                      {showProfitMetrics && (
                        <span className="text-[#248A3D] font-mono font-bold">
                          مساهمة: +{sale.totalProfit.toFixed(0)} ج
                        </span>
                      )}
                    </div>
                    {sale.isReversed && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-rose-100/80 border border-rose-200 text-[11px] font-bold text-rose-800 flex items-center justify-between">
                        <span>⚠️ ملغاة بقيد عكسي: {sale.reversalReason || 'إلغاء فاتورة'}</span>
                        <span className="text-[10px] font-normal">بواسطة: {sale.reversedBy || 'الإدارة'}</span>
                      </div>
                    )}

                    {/* Control Buttons Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.05]">
                      <button
                        type="button"
                        onClick={() => handleQuickSwitchPayment(sale)}
                        title="انقر لتغيير طريقة الدفع فوراً"
                        className="px-2.5 py-1 rounded-lg bg-black/[0.05] hover:bg-black/[0.1] text-[#1D1D1F] text-[11px] font-bold cursor-pointer"
                      >
                        {sale.paymentMethod || 'نقدي'} ↻
                      </button>

                      <div className="flex items-center gap-1.5">
                        {onUpdateSale && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(sale)}
                            className="px-2.5 py-1 rounded-lg bg-[#0071E3]/10 text-[#0071E3] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>تعديل</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          className="px-2.5 py-1 rounded-lg bg-[#1D1D1F] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer size={12} />
                          <span>طباعة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyInvoice(sale)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 cursor-pointer"
                          title="نسخ واتساب"
                        >
                          {copiedInvoiceId === sale.id ? <Check size={13} /> : <Share2 size={13} />}
                        </button>
                        {onDeleteSale && (
                          <button
                            type="button"
                            onClick={() => {
                              setRestoreStockOnDelete(true);
                              setSaleToDelete(sale);
                            }}
                            className="p-1.5 rounded-lg text-[#FF3B30] hover:bg-red-50 cursor-pointer"
                            title="استرجاع أو حذف الفاتورة"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-black/[0.06] bg-white">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#636366] font-bold">
                    <th className="py-3.5 px-3">رقم الفاتورة</th>
                    <th className="py-3.5 px-3">التاريخ والوقت</th>
                    <th className="py-3.5 px-3">الأصناف والتركيبات العطرية</th>
                    <th className="py-3.5 px-3">العبوات / الزيت</th>
                    <th className="py-3.5 px-3">العميل</th>
                    <th className="py-3.5 px-3">طريقة السداد</th>
                    <th className="py-3.5 px-3">الإجمالي</th>
                    {showProfitMetrics && (
                      <th className="py-3.5 px-3">المساهمة المحققة</th>
                    )}
                    <th className="py-3.5 px-3 text-left">أدوات التحكم الكامل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {filteredSales.map((sale) => {
                    const totalSaleGrams = (sale.items || []).reduce((s, i) => s + (i.essenceGrams || 0), 0);
                    const totalSaleBottles = (sale.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
                    return (
                      <tr
                        key={sale.id}
                        className={`transition-colors group ${
                          sale.isReversed ? 'bg-rose-50/40 opacity-75' : 'hover:bg-[#F5F5F7]/60'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono font-black text-[#0071E3] block">
                            #{sale.id.slice(-6)}
                          </span>
                          {sale.isReversed && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-black">
                              ملغاة بقيد عكسي
                            </span>
                          )}
                          <span className="text-[10px] text-[#86868B] block">
                            بواسطة: {sale.employeeName?.replace(/\(.*?\)/g, '').trim() || 'طارق'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-[#636366]">
                          <span className="block font-bold text-[#1D1D1F]">
                            {new Date(sale.date).toLocaleDateString('ar-EG')}
                          </span>
                          <span>
                            {new Date(sale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <div className="space-y-1">
                            {(sale.items || []).map((it, idx) => (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                  <span className="font-bold text-[#1D1D1F]">{it.productName}</span>
                                  <span className="text-[10px] text-[#86868B] font-mono">
                                    ({it.bottleSize}مل × {it.quantity || 1})
                                  </span>
                                  {it.isMix && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-200">
                                      ميكس
                                    </span>
                                  )}
                                </div>
                                {it.isMix && it.mixComponents && it.mixComponents.length > 0 && (
                                  <div className="text-[10px] text-[#636366] pr-1">
                                    ↳ {it.mixComponents.map(c => `${c.productName} (${c.grams}جم · ${c.percentage}%)`).join(' + ')}
                                  </div>
                                )}
                              </div>
                            ))}
                            {sale.discount && sale.discount > 0 ? (
                              <span className="text-[10px] text-amber-700 font-bold block">
                                خصم مطبق: -{sale.discount} {settings.currency}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <span className="font-bold text-[#1D1D1F] block">{totalSaleBottles} عبوة</span>
                          <span className="text-[10px] text-[#86868B]">{totalSaleGrams} جم زيت</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-[#1D1D1F] block">
                            {sale.customerName || 'عميل نقدي'}
                          </span>
                          {sale.customerPhone && (
                            <span className="text-[10px] font-mono text-[#86868B] block">
                              {sale.customerPhone}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleQuickSwitchPayment(sale)}
                            title="انقر لتبديل طريقة الدفع مباشرة"
                            className="px-2.5 py-1 rounded-xl bg-[#F5F5F7] hover:bg-[#0071E3] hover:text-white text-[11px] font-bold text-[#1D1D1F] transition-all cursor-pointer"
                          >
                            {sale.paymentMethod || 'نقدي'} ↻
                          </button>
                        </td>

                        <td className="py-3 px-3 font-mono font-black text-sm text-[#1D1D1F]">
                          {sale.totalPrice.toLocaleString('ar-EG')} {settings.currency}
                        </td>

                        {showProfitMetrics && (
                          <td className="py-3 px-3 font-mono font-black text-[#248A3D]">
                            +{sale.totalProfit.toFixed(0)} {settings.currency}
                          </td>
                        )}

                        <td className="py-3 px-3 text-left">
                          <div className="flex items-center justify-end gap-1">
                            {onUpdateSale && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(sale)}
                                className="px-2.5 py-1.5 rounded-xl bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="تعديل الفاتورة والأصناف والأسعار"
                              >
                                <Edit3 size={13} />
                                <span>تعديل</span>
                              </button>
                            )}

                            {onDuplicateSale && (
                              <button
                                type="button"
                                onClick={() => {
                                  const dup: Sale = {
                                    ...sale,
                                    id: Date.now().toString(),
                                    date: new Date().toISOString(),
                                  };
                                  onDuplicateSale(dup);
                                }}
                                className="p-1.5 rounded-xl text-[#636366] hover:bg-black/[0.06] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                                title="تكرار الفاتورة بنفس الأصناف"
                              >
                                <Copy size={14} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopyInvoice(sale)}
                              className="p-1.5 rounded-xl text-[#248A3D] hover:bg-[#34C759]/12 transition-colors cursor-pointer"
                              title="نسخ تفاصيل الفاتورة للواتساب"
                            >
                              {copiedInvoiceId === sale.id ? <Check size={14} /> : <Share2 size={14} />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedSale(sale)}
                              className="p-1.5 rounded-xl text-[#1D1D1F] hover:bg-black/[0.06] transition-colors cursor-pointer"
                              title="عرض وطباعة الفاتورة الحرارية"
                            >
                              <Printer size={14} />
                            </button>

                            {onDeleteSale && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRestoreStockOnDelete(true);
                                  setSaleToDelete(sale);
                                }}
                                className="p-1.5 rounded-xl text-[#FF3B30] hover:bg-red-50 transition-colors cursor-pointer"
                                title="استرجاع أو حذف الفاتورة"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
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

      {/* ======================================================== */}
      {/* TOP SELLING PERFUMES RANKING TABLE                       */}
      {/* ======================================================== */}
      {topSellingPerfumes.length > 0 && (
        <div className="apple-glass-card rounded-[28px] p-5 sm:p-6 space-y-4 border border-black/[0.06]">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-[#C49746]" />
              <h2 className="text-base font-black text-[#1D1D1F]">ترتيب العطور الأكثر مبيعاً وإيراداً</h2>
            </div>
            <span className="text-xs text-[#86868B]">تحليل تلقائي من واقع الفواتير</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] text-[#86868B]">
                  <th className="py-2.5 px-3">الترتيب</th>
                  <th className="py-2.5 px-3">اسم العطر</th>
                  <th className="py-2.5 px-3">التصنيف</th>
                  <th className="py-2.5 px-3">العبوات المباعة</th>
                  <th className="py-2.5 px-3">الزيت المستهلك</th>
                  <th className="py-2.5 px-3">إجمالي الإيراد</th>
                  {showProfitMetrics && <th className="py-2.5 px-3">المساهمة المحققة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {topSellingPerfumes.map((perfume, index) => (
                  <tr key={perfume.name} className="hover:bg-black/[0.02]">
                    <td className="py-2.5 px-3 font-mono font-black text-[#1D1D1F]">#{index + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-[#1D1D1F]">{perfume.name}</td>
                    <td className="py-2.5 px-3 text-[#636366]">{perfume.type}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1D1D1F]">{perfume.count} عبوة</td>
                    <td className="py-2.5 px-3 font-mono text-[#636366]">{perfume.grams} جم</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1D1D1F]">
                      {perfume.revenue.toLocaleString('ar-EG')} {settings.currency}
                    </td>
                    {showProfitMetrics && (
                      <td className="py-2.5 px-3 font-mono font-bold text-[#248A3D]">
                        +{perfume.profit.toFixed(0)} {settings.currency}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FULL INVOICE EDITOR MODAL (التحكم الكامل وتعديل الفاتورة) */}
      {/* ======================================================== */}
      {editingSale && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-md smart-modal-overlay animate-in fade-in duration-150">
          <div className="apple-glass smart-modal-window rounded-[28px] p-5 w-full max-w-2xl border border-black/[0.1] shadow-2xl bg-white/95 space-y-3.5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center shadow-xs">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1D1D1F]">
                    تعديل الفاتورة والتحكم الكامل #{editingSale.id.slice(-6)}
                  </h3>
                  <span className="text-[11px] text-[#86868B] font-mono">
                    تاريخ الإصدار: {new Date(editingSale.date).toLocaleString('ar-EG')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedSale} className="space-y-4 text-xs">
              {/* Customer & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">اسم العميل:</label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    placeholder="عميل نقدي..."
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-medium outline-none focus:bg-white focus:border-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">رقم الهاتف (واتساب):</label>
                  <input
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    placeholder="010..."
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono outline-none focus:bg-white focus:border-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">طريقة السداد:</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-bold outline-none focus:bg-white focus:border-[#0071E3]"
                  >
                    <option value="نقدي">نقدي (كاش)</option>
                    <option value="بطاقة">بطاقة بنكية (فيزا)</option>
                    <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                  </select>
                </div>
              </div>

              {/* Invoice Items Editor */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#1D1D1F]">الأصناف والعبوات داخل الفاتورة:</span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={addingProductId}
                      onChange={(e) => setAddingProductId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="h-8 px-2.5 rounded-lg bg-[#F5F5F7] border border-black/[0.08] text-[11px] font-bold outline-none"
                    >
                      <option value="">+ إضافة عطر آخر للفاتورة...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.stock_grams} جم)
                        </option>
                      ))}
                    </select>
                    {addingProductId !== '' && (
                      <button
                        type="button"
                        onClick={handleAddProductToEditInvoice}
                        className="px-2.5 h-8 rounded-lg bg-[#0071E3] text-white font-bold text-[11px] cursor-pointer"
                      >
                        إضافة
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 overflow-hidden">
                  {editItems.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-4">
                        <span className="font-black text-[#1D1D1F] block">{item.productName}</span>
                        <span className="text-[10px] text-[#86868B]">{item.productType}</span>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-[#86868B] block">الكمية (عبوات)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => handleUpdateEditItem(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-black/[0.08] font-mono font-bold text-center"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-[#86868B] block">الزيت (جرام)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.essenceGrams}
                          onChange={(e) => handleUpdateEditItem(idx, 'essenceGrams', Math.max(1, Number(e.target.value) || 1))}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-black/[0.08] font-mono font-bold text-center"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-[#86868B] block">إجمالي السعر ({settings.currency})</label>
                        <input
                          type="number"
                          min="0"
                          value={item.sellingPrice}
                          onChange={(e) => handleUpdateEditItem(idx, 'sellingPrice', Math.max(0, Number(e.target.value) || 0))}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-black/[0.08] font-mono font-bold text-center text-[#0071E3]"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        {editItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditItem(idx)}
                            className="w-7 h-7 rounded-lg text-[#FF3B30] hover:bg-red-100 flex items-center justify-center cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">خصم على الفاتورة ({settings.currency}):</label>
                  <input
                    type="number"
                    min="0"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono font-bold outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">ملاحظات الفاتورة:</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="أي ملاحظات..."
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Automatic Stock Adjustment Toggle */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#34C759]/10 border border-[#34C759]/25 cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={adjustStockOnEdit}
                    onChange={(e) => setAdjustStockOnEdit(e.target.checked)}
                    className="w-4 h-4 accent-[#0071E3] rounded"
                  />
                  <span className="font-bold text-[#1D1D1F]">
                    تحديث رصيد المخزون بالجرام تلقائياً بناءً على فروقات التعديل
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#248A3D]">تحديث ذكي</span>
              </label>

              {/* Live Updated Total Bar */}
              <div className="p-3.5 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 block">الإجمالي الجديد بعد التعديل:</span>
                  <span className="text-lg font-black font-mono text-amber-400">
                    {Math.max(
                      0,
                      editItems.reduce((s, i) => s + (Number(i.sellingPrice) || 0), 0) - (Number(editDiscount) || 0)
                    ).toLocaleString('ar-EG')}{' '}
                    {settings.currency}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSale(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 size={15} />
                    <span>حفظ التعديلات فوراً</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PROFESSIONAL THERMAL RECEIPT & WHATSAPP MODAL            */}
      {/* ======================================================== */}
      {selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          settings={settings}
          onClose={() => setSelectedSale(null)}
          onUpdateSettings={onUpdateSettings}
          previousCustomers={sales.filter(s => s.customerPhone).map(s => ({
            name: s.customerName || 'عميل',
            phone: s.customerPhone!
          }))}
        />
      )}

      {/* ======================================================== */}
      {/* DELETE / REVERSE SALE CONFIRMATION MODAL                 */}
      {/* ======================================================== */}
      {saleToDelete && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm smart-modal-overlay animate-in fade-in duration-150">
          <div className="apple-glass-card smart-modal-window rounded-[28px] w-full max-w-md overflow-hidden p-5 text-center space-y-3.5 shadow-apple-lg border border-black/[0.08] bg-white/95">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-[#FF3B30] flex items-center justify-center mx-auto">
              <Trash2 size={26} />
            </div>
            <div>
              <h3 className="font-black text-base text-[#1D1D1F]">
                حذف الفاتورة #{saleToDelete.id.slice(-6)}
              </h3>
              <p className="text-xs text-[#86868B] mt-1">
                قيمة الفاتورة: <strong className="text-[#1D1D1F] font-mono">{saleToDelete.totalPrice} {settings.currency}</strong> · إجمالي الزيوت:{' '}
                <strong className="text-[#1D1D1F] font-mono">
                  {(saleToDelete.items || []).reduce((s, i) => s + (i.essenceGrams || 0), 0)} جرام
                </strong>
              </p>
              {saleToDelete.isReversed ? (
                <p className="text-[11px] text-rose-700 font-bold mt-1">
                  هذه الفاتورة ملغاة مسبقاً بقيد عكسي — يمكنك الآن حذفها نهائياً لإزالتها من الجدول تماماً.
                </p>
              ) : (
                <p className="text-[11px] text-[#636366] font-medium mt-1">
                  اختر الحذف النهائي لإزالة الفاتورة تماماً من السجل واسترجاع الزيوت للمخزون، أو القيد العكسي للاحتفاظ بأثرها كملغاة.
                </p>
              )}
            </div>

            <div className="text-right">
              <label className="text-[11px] font-bold text-[#1D1D1F] block mb-1">سبب الحذف / الإلغاء (اختياري)</label>
              <input
                type="text"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="مثال: فاتورة تجريبية أو مرتجع من العميل..."
                className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-medium text-[#1D1D1F] outline-none focus:bg-white"
              />
            </div>

            {!saleToDelete.isReversed && (
              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] text-right cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={restoreStockOnDelete}
                    onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                    className="w-4 h-4 accent-[#0071E3] rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#1D1D1F] block">إعادة جرامات الزيت العطري إلى المخزون تلقائياً</span>
                    <span className="text-[10px] text-[#86868B]">يسترد الجرامات المخصومة (فردي أو ميكس) ويعيدها لأرصدة العطور</span>
                  </div>
                </div>
              </label>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSale) {
                    onDeleteSale(
                      saleToDelete.id,
                      !saleToDelete.isReversed && restoreStockOnDelete,
                      reversalReason.trim() || 'حذف نهائي للفاتورة من السجل',
                      'permanent'
                    );
                  }
                  setSaleToDelete(null);
                  setReversalReason('');
                }}
                className="apple-btn w-full py-3 rounded-xl bg-[#FF3B30] text-white text-xs font-black hover:bg-red-600 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>
                  {saleToDelete.isReversed
                    ? 'حذف الفاتورة نهائياً من السجل الآن'
                    : restoreStockOnDelete
                    ? 'حذف الفاتورة نهائياً + استرجاع الزيوت للمخزون'
                    : 'حذف الفاتورة نهائياً (بدون إرجاع المخزون)'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {!saleToDelete.isReversed && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteSale) {
                        onDeleteSale(
                          saleToDelete.id,
                          restoreStockOnDelete,
                          reversalReason.trim() || 'إلغاء فاتورة بقيد عكسي مع الاحتفاظ بالسجل الأصلي',
                          'reverse'
                        );
                      }
                      setSaleToDelete(null);
                      setReversalReason('');
                    }}
                    className="apple-btn py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCcw size={13} />
                    <span>قيد عكسي (إبقاء بالسجل)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSaleToDelete(null);
                    setReversalReason('');
                  }}
                  className={`apple-btn py-2.5 rounded-xl bg-black/[0.05] text-[#1D1D1F] text-xs font-bold cursor-pointer ${
                    saleToDelete.isReversed ? 'col-span-2' : ''
                  }`}
                >
                  تراجع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
