import React, { useState, useMemo } from 'react';
import { 
  Product, 
  Sale, 
  PurchaseRequest, 
  CustomerRequest, 
  StockCheckRecord, 
  AppUser, 
  AuditLogRecord,
  StoreSettings,
  StrategicReplenishmentOrder,
  getApprovedOilGramCost,
  isLiveProductionSale
} from '../types';
import StrategicReplenishmentModal from './StrategicReplenishmentModal';
import { generateStrategicReplenishmentOrder, DEFAULT_STRATEGIC_THRESHOLD_GRAMS } from '../services/strategicOrderService';
import { 
  Box, 
  AlertTriangle, 
  TrendingDown, 
  ShoppingCart, 
  ClipboardList, 
  UserPlus, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Package,
  Layers,
  ChevronRight,
  Filter,
  Check,
  X
} from 'lucide-react';

interface InventoryIntelligenceProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sales: Sale[];
  purchaseRequests: PurchaseRequest[];
  onSavePurchaseRequest: (req: PurchaseRequest) => void;
  customerRequests: CustomerRequest[];
  onSaveCustomerRequest: (req: CustomerRequest) => void;
  stockChecks: StockCheckRecord[];
  onSaveStockCheck: (check: StockCheckRecord) => void;
  currentUser: AppUser | null;
  settings: StoreSettings;
  onAddAuditLog: (log: AuditLogRecord) => void;
  strategicOrders?: StrategicReplenishmentOrder[];
  onSaveStrategicOrder?: (order: StrategicReplenishmentOrder) => void;
}

type TabType = 'overview' | 'shortages' | 'purchase_requests' | 'customer_requests' | 'stock_check';

const InventoryIntelligence: React.FC<InventoryIntelligenceProps> = ({
  products,
  setProducts,
  sales,
  purchaseRequests,
  onSavePurchaseRequest,
  customerRequests,
  onSaveCustomerRequest,
  stockChecks,
  onSaveStockCheck,
  currentUser,
  settings,
  onAddAuditLog,
  strategicOrders = [],
  onSaveStrategicOrder
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showNewCustomerReqModal, setShowNewCustomerReqModal] = useState(false);
  const [showNewStockCheckModal, setShowNewStockCheckModal] = useState(false);
  const [showStrategicReplenishmentModal, setShowStrategicReplenishmentModal] = useState(false);
  const [activeReplenishmentOrder, setActiveReplenishmentOrder] = useState<StrategicReplenishmentOrder | null>(null);

  // New Purchase Request Form State
  const [selectedProductForPurchase, setSelectedProductForPurchase] = useState<Product | null>(null);
  const [purchaseGramsInput, setPurchaseGramsInput] = useState<number>(500);
  const [purchasePriority, setPurchasePriority] = useState<PurchaseRequest['priority']>('عاجل (نفد)');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // New Customer Request Form State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPerfume, setCustPerfume] = useState('');
  const [custSize, setCustSize] = useState<number>(50);
  const [custNotes, setCustNotes] = useState('');

  // Stock Check Form State
  const [stockCheckProduct, setStockCheckProduct] = useState<Product | null>(null);
  const [actualGramsInput, setActualGramsInput] = useState<number | ''>('');
  const [stockCheckReason, setStockCheckReason] = useState('');

  // Reorder threshold
  const REORDER_THRESHOLD_GRAMS = 150;

  // Inventory Calculations
  const totalStockGrams = useMemo(() => {
    return products.reduce((sum, p) => sum + p.stock_grams, 0);
  }, [products]);

  // Inventory Cost Value (Normal @ 10 EGP/g, Niche @ 15 EGP/g, Oud/Musk @ 20 EGP/g)
  const totalInventoryCostValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const rate = getApprovedOilGramCost(p.type, settings);
      return sum + (p.stock_grams * rate);
    }, 0);
  }, [products, settings]);

  // Shortages (stock < 150g)
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock_grams < REORDER_THRESHOLD_GRAMS);
  }, [products]);

  // Stagnant Products (no sales in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const stagnantProducts = useMemo(() => {
    const soldProductIds = new Set<string | number>();
    sales.forEach(sale => {
      if (sale.date >= thirtyDaysAgoStr && isLiveProductionSale(sale)) {
        sale.items.forEach(it => soldProductIds.add(it.productId));
      }
    });
    return products.filter(p => !soldProductIds.has(p.id) && p.stock_grams > 0);
  }, [products, sales, thirtyDaysAgoStr]);

  // Total Grams Consumed (Sales)
  const totalGramsConsumed = useMemo(() => {
    let grams = 0;
    sales.forEach(s => {
      if (isLiveProductionSale(s)) {
        s.items.forEach(it => {
          grams += it.essenceGrams || 0;
        });
      }
    });
    return grams;
  }, [sales]);

  // Handle Save Purchase Request
  const handleCreatePurchaseRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForPurchase) return;

    const costPerGram = getApprovedOilGramCost(selectedProductForPurchase.type, settings);
    const estimatedCost = purchaseGramsInput * costPerGram;

    const newReq: PurchaseRequest = {
      id: `purch-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      requestedBy: currentUser?.displayName || 'مسؤول التشغيل',
      productName: selectedProductForPurchase.name,
      brand: selectedProductForPurchase.brand,
      requestedGrams: purchaseGramsInput,
      estimatedCost,
      priority: purchasePriority,
      status: 'قيد الانتظار',
      notes: purchaseNotes,
    };

    onSavePurchaseRequest(newReq);

    onAddAuditLog({
      id: `audit-purch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.displayName || 'المستخدم',
      action: 'تعديل مخزون',
      entityType: 'product',
      entityId: selectedProductForPurchase.id,
      entityName: selectedProductForPurchase.name,
      oldValue: null,
      newValue: `طلب شراء ${purchaseGramsInput} جم بتكلفة تقديرية ${estimatedCost} ج`,
      reason: purchaseNotes || 'طلب توريد خامات وشراء مخزون',
      category: 'مخزون'
    });

    setShowNewPurchaseModal(false);
    setSelectedProductForPurchase(null);
  };

  // Handle Save Customer Missing Fragrance Request
  const handleCreateCustomerRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPerfume.trim()) return;

    const newReq: CustomerRequest = {
      id: `cust-req-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      recordedBy: currentUser?.displayName || 'المسؤول',
      customerName: custName.trim(),
      customerPhone: custPhone.trim(),
      requestedPerfume: custPerfume.trim(),
      preferredSizeMl: custSize,
      status: 'جديد',
      notes: custNotes,
    };

    onSaveCustomerRequest(newReq);

    setShowNewCustomerReqModal(false);
    setCustName('');
    setCustPhone('');
    setCustPerfume('');
  };

  // Handle Stocktaking Check Record
  const handleCreateStockCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockCheckProduct || actualGramsInput === '') return;

    const actual = Number(actualGramsInput);
    const diff = actual - stockCheckProduct.stock_grams;
    const rate = getApprovedOilGramCost(stockCheckProduct.type, settings);
    const varianceCost = Math.round(diff * rate);

    const checkRecord: StockCheckRecord = {
      id: `check-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      performedBy: currentUser?.displayName || 'مسؤول الجرد',
      productId: stockCheckProduct.id,
      productName: stockCheckProduct.name,
      systemGrams: stockCheckProduct.stock_grams,
      actualGrams: actual,
      differenceGrams: diff,
      varianceCost,
      justification: stockCheckReason,
      status: 'مسجل',
    };

    onSaveStockCheck(checkRecord);

    // If difference exists, optionally update product stock and log audit
    if (diff !== 0) {
      setProducts(prev => prev.map(p => {
        if (p.id === stockCheckProduct.id) {
          return { ...p, stock_grams: actual };
        }
        return p;
      }));

      onAddAuditLog({
        id: `audit-stockcheck-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentUser?.displayName || 'مسؤول الجرد',
        action: 'تعديل مخزون',
        entityType: 'product',
        entityId: stockCheckProduct.id,
        entityName: stockCheckProduct.name,
        oldValue: `${stockCheckProduct.stock_grams} جم`,
        newValue: `${actual} جم (فرق: ${diff} جم / ${varianceCost} ج)`,
        reason: stockCheckReason || 'تسجيل نتيجة جرد وتحديث الرصيد الفعلي',
        category: 'مخزون'
      });
    }

    setShowNewStockCheckModal(false);
    setStockCheckProduct(null);
    setActualGramsInput('');
    setStockCheckReason('');
  };

  const isOwner = currentUser?.role === 'OWNER';

  return (
    <div className="space-y-6 pb-20 p-4 sm:p-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Box size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1D1D1F]">لوحة المخزون والاحتياجات والخامات</h1>
            <p className="text-xs text-[#86868B]">
              إدارة الأرصدة، حدود إعادة الطلب، النواقص، طلبات الشراء، وحركة الجرد
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Strategic Replenishment Button */}
          <button
            type="button"
            onClick={() => {
              const ord = generateStrategicReplenishmentOrder(products, sales, settings, strategicOrders[0] || null);
              setActiveReplenishmentOrder(ord);
              setShowStrategicReplenishmentModal(true);
            }}
            className="apple-btn flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-black shadow-sm transition-all"
          >
            <Package size={15} />
            <span>فاتورة النواقص الاستراتيجية</span>
            {lowStockProducts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-rose-700 font-mono text-[10px]">
                {lowStockProducts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowNewCustomerReqModal(true)}
            className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all border border-purple-200"
          >
            <UserPlus size={14} />
            <span>طلب عطر غير متوفر</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewPurchaseModal(true)}
            className="apple-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-sm transition-all"
          >
            <ShoppingCart size={14} />
            <span>إنشاء طلب شراء</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white border border-black/[0.06] shadow-apple space-y-1">
          <span className="text-[11px] font-bold text-[#86868B] block">إجمالي الرصيد الفعلي:</span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-[#1D1D1F]">{totalStockGrams.toLocaleString('ar-EG')}</span>
            <span className="text-xs text-[#86868B]">جم زيت</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold block pt-0.5">
            يعادل ~ {Math.round(totalStockGrams / 15)} عبوة 50 مل
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-black/[0.06] shadow-apple space-y-1">
          <span className="text-[11px] font-bold text-[#86868B] block">قيمة المخزون بسعر التكلفة:</span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-[#0071E3]">{totalInventoryCostValue.toLocaleString('ar-EG')}</span>
            <span className="text-xs text-[#86868B]">{settings.currency}</span>
          </div>
          <span className="text-[10px] text-[#86868B] block pt-0.5">
            رأس مال الزيوت المحجوز في المتجر
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-black/[0.06] shadow-apple space-y-1">
          <span className="text-[11px] font-bold text-[#86868B] block">عطور شارفت على النفاد:</span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-2xl font-black ${lowStockProducts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {lowStockProducts.length}
            </span>
            <span className="text-xs text-[#86868B]">عطر</span>
          </div>
          <span className="text-[10px] text-rose-700 font-bold block pt-0.5">
            أقل من حد إعادة الطلب ({REORDER_THRESHOLD_GRAMS} جم)
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-black/[0.06] shadow-apple space-y-1">
          <span className="text-[11px] font-bold text-[#86868B] block">العناصر الراكدة (+30 يوم):</span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-amber-600">{stagnantProducts.length}</span>
            <span className="text-xs text-[#86868B]">عطر</span>
          </div>
          <span className="text-[10px] text-amber-800 font-bold block pt-0.5">
            تحتاج لتنشيط أو عروض تسويقية
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-black/[0.06] pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-[#1D1D1F] text-white shadow-sm'
              : 'text-[#86868B] hover:bg-black/[0.04]'
          }`}
        >
          نظرة عامة والكتالوج ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('shortages')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'shortages'
              ? 'bg-[#1D1D1F] text-white shadow-sm'
              : 'text-[#86868B] hover:bg-black/[0.04]'
          }`}
        >
          <span>النواقص والتنبيهات</span>
          {lowStockProducts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {lowStockProducts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('purchase_requests')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'purchase_requests'
              ? 'bg-[#1D1D1F] text-white shadow-sm'
              : 'text-[#86868B] hover:bg-black/[0.04]'
          }`}
        >
          <span>أوامر وطلبات الشراء</span>
          {purchaseRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px]">
              {purchaseRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('customer_requests')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'customer_requests'
              ? 'bg-[#1D1D1F] text-white shadow-sm'
              : 'text-[#86868B] hover:bg-black/[0.04]'
          }`}
        >
          <span>طلبات العملاء غير المتوفرة</span>
          {customerRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px]">
              {customerRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stock_check')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'stock_check'
              ? 'bg-[#1D1D1F] text-white shadow-sm'
              : 'text-[#86868B] hover:bg-black/[0.04]'
          }`}
        >
          <ClipboardList size={13} />
          <span>سجل الجرد الفعلي</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & SEARCH */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عطر، ماركة، أو نوع..."
              className="w-full h-11 px-4 pr-10 rounded-2xl bg-white border border-black/[0.08] text-xs outline-none text-right"
            />
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {products
              .filter(p => p.name.includes(searchQuery) || p.brand.includes(searchQuery))
              .map(prod => {
                const isSpec = ['عود', 'مسك'].includes(prod.type);
                const rate = isSpec ? settings.priceEssenceSpecial : settings.priceEssenceNormal;
                const costVal = prod.stock_grams * rate;
                const isLow = prod.stock_grams < REORDER_THRESHOLD_GRAMS;

                return (
                  <div 
                    key={prod.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isLow 
                        ? 'bg-rose-50/50 border-rose-200 shadow-2xs' 
                        : 'bg-white border-black/[0.06] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between pb-2 border-b border-black/[0.04]">
                      <div>
                        <h4 className="text-sm font-black text-[#1D1D1F]">{prod.name}</h4>
                        <span className="text-[11px] text-[#86868B]">{prod.brand} · {prod.type}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                        isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {prod.stock_grams} جم
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-[#86868B]">
                      <span>قيمة المخزون: <strong className="text-[#1D1D1F] font-mono">{costVal} {settings.currency}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setStockCheckProduct(prod);
                          setActualGramsInput(prod.stock_grams);
                          setShowNewStockCheckModal(true);
                        }}
                        className="text-[#0071E3] font-bold hover:underline"
                      >
                        جرد
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: SHORTAGES & ALERTS */}
      {activeTab === 'shortages' && (
        <div className="space-y-4">
          {lowStockProducts.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white text-center space-y-2 border border-black/[0.06]">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
              <h3 className="text-sm font-black text-[#1D1D1F]">المخزون في وضع آمن ومكتمل</h3>
              <p className="text-xs text-[#86868B]">لا توجد عطور تجاوزت حد إعادة الطلب ({REORDER_THRESHOLD_GRAMS} جم).</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                      <h4 className="text-sm font-black text-[#1D1D1F]">{p.name}</h4>
                    </div>
                    <span className="text-[11px] text-[#86868B] block">الماركة: {p.brand} · الرصيد الحالي: <strong className="text-rose-600 font-mono">{p.stock_grams} جم</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductForPurchase(p);
                      setShowNewPurchaseModal(true);
                    }}
                    className="apple-btn px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-2xs hover:bg-rose-700"
                  >
                    طلب شراء
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PURCHASE REQUESTS */}
      {activeTab === 'purchase_requests' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowNewPurchaseModal(true)}
              className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-bold shadow-2xs"
            >
              <Plus size={14} />
              <span>إضافة أمر شراء</span>
            </button>
          </div>

          {purchaseRequests.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white text-center space-y-2 border border-black/[0.06]">
              <Package size={32} className="text-[#86868B] mx-auto" />
              <h3 className="text-sm font-black text-[#1D1D1F]">لا توجد طلبات شراء مسجلة</h3>
              <p className="text-xs text-[#86868B]">يمكن إنشاء طلبات الشراء لاعتمادها من الإدارة قبل التوريد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchaseRequests.map(req => (
                <div key={req.id} className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-apple flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[#1D1D1F]">{req.productName}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        {req.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#86868B]">
                      طلب {req.requestedGrams} جم · تكلفة تقديرية: <strong className="font-mono text-[#1D1D1F]">{req.estimatedCost} {settings.currency}</strong> · بواسطة: {req.requestedBy} ({req.date})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                      {req.status}
                    </span>
                    {isOwner && req.status === 'قيد الانتظار' && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated: PurchaseRequest = {
                            ...req,
                            status: 'معتمد من د. محمد',
                            approvedBy: currentUser?.displayName,
                            approvedAt: new Date().toISOString()
                          };
                          onSavePurchaseRequest(updated);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-2xs"
                      >
                        اعتماد
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CUSTOMER REQUESTS */}
      {activeTab === 'customer_requests' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowNewCustomerReqModal(true)}
              className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-2xs"
            >
              <Plus size={14} />
              <span>تسجيل طلب عميل</span>
            </button>
          </div>

          {customerRequests.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white text-center space-y-2 border border-black/[0.06]">
              <UserPlus size={32} className="text-purple-400 mx-auto" />
              <h3 className="text-sm font-black text-[#1D1D1F]">لا توجد طلبات عملاء معلقة</h3>
              <p className="text-xs text-[#86868B]">سجل أي عطر يطلبه عميل وغير متوفر بالمحل لمتابعته فور توفره.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customerRequests.map(req => (
                <div key={req.id} className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-apple flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[#1D1D1F]">{req.requestedPerfume}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                        {req.preferredSizeMl} مل
                      </span>
                    </div>
                    <span className="text-[11px] text-[#86868B] block">
                      العميل: <strong className="text-[#1D1D1F]">{req.customerName}</strong> · هاتف: <span className="font-mono">{req.customerPhone}</span>
                    </span>
                  </div>

                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STOCK CHECK RECORDS */}
      {activeTab === 'stock_check' && (
        <div className="space-y-4">
          {stockChecks.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white text-center space-y-2 border border-black/[0.06]">
              <ClipboardList size={32} className="text-[#86868B] mx-auto" />
              <h3 className="text-sm font-black text-[#1D1D1F]">لا توجد عمليات جرد مسجلة</h3>
              <p className="text-xs text-[#86868B]">يمكن تسجيل جرد فعلي لأي عطر ومقارنته بالرصيد الدفتري.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stockChecks.map(check => (
                <div key={check.id} className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-apple flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-[#1D1D1F]">{check.productName}</h4>
                    <span className="text-[11px] text-[#86868B] block">
                      دفتري: {check.systemGrams} جم · فعلي: <strong className="text-[#1D1D1F] font-mono">{check.actualGrams} جم</strong> · الفارق: <strong className={check.differenceGrams < 0 ? 'text-rose-600' : 'text-emerald-600'}>{check.differenceGrams} جم ({check.varianceCost} ج)</strong>
                    </span>
                    <span className="text-[10px] text-[#86868B] block">الجرد بواسطة: {check.performedBy} ({check.date})</span>
                  </div>

                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE PURCHASE REQUEST */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="apple-glass rounded-3xl p-6 w-full max-w-md border border-white/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-base font-black text-[#1D1D1F]">إنشاء طلب شراء وتوريد خامات</h3>
              <button onClick={() => setShowNewPurchaseModal(false)} className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#86868B]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseRequest} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">اختر العطر المطلوب شراؤه:</label>
                <select
                  value={selectedProductForPurchase?.id || ''}
                  onChange={(e) => {
                    const prod = products.find(p => p.id.toString() === e.target.value);
                    setSelectedProductForPurchase(prod || null);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right font-bold outline-none"
                  required
                >
                  <option value="">-- اختر من الكتالوج --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.brand}) - الرصيد: {p.stock_grams} جم</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">الكمية المطلوبة (بالجرام):</label>
                <input
                  type="number"
                  value={purchaseGramsInput}
                  onChange={(e) => setPurchaseGramsInput(Number(e.target.value))}
                  placeholder="500"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-right font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">درجة الأهمية:</label>
                <select
                  value={purchasePriority}
                  onChange={(e) => setPurchasePriority(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right font-bold outline-none"
                >
                  <option value="عاجل (نفد)">عاجل (نفد المخزون تماماً)</option>
                  <option value="متوسط (قارب النفاذ)">متوسط (قارب على النفاذ)</option>
                  <option value="روتيني">روتيني وتجديد</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#86868B] block text-right">ملاحظات أو مورد مقترح:</label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="مثال: جودة فرنسية لوزي أو جيفودان..."
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-sm"
                >
                  حفظ طلب الشراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOMER MISSING REQUEST */}
      {showNewCustomerReqModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="apple-glass rounded-3xl p-6 w-full max-w-md border border-white/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-base font-black text-[#1D1D1F]">تسجيل طلب عميل لعطر غير متوفر</h3>
              <button onClick={() => setShowNewCustomerReqModal(false)} className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#86868B]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerRequest} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">اسم العطر المطلوب:</label>
                <input
                  type="text"
                  value={custPerfume}
                  onChange={(e) => setCustPerfume(e.target.value)}
                  placeholder="مثال: ديور هوم إنتنس..."
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">اسم العميل:</label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="اسم العميل..."
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">رقم الهاتف/واتساب:</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right font-mono outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">الحجم المرغوب:</label>
                <select
                  value={custSize}
                  onChange={(e) => setCustSize(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right font-bold outline-none"
                >
                  <option value={100}>100 مل</option>
                  <option value={50}>50 مل</option>
                  <option value={30}>30 مل</option>
                  <option value={25}>25 مل</option>
                  <option value={20}>20 مل</option>
                  <option value={10}>10 مل</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerReqModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
                >
                  حفظ ومتابعة الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCKTAKING CHECK */}
      {showNewStockCheckModal && stockCheckProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="apple-glass rounded-3xl p-6 w-full max-w-md border border-white/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-base font-black text-[#1D1D1F]">تسجيل جرد فعلي لـ ({stockCheckProduct.name})</h3>
              <button onClick={() => setShowNewStockCheckModal(false)} className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#86868B]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateStockCheck} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-black/[0.03] flex justify-between">
                <span>الرصيد الدفتري المسجل:</span>
                <strong className="font-mono text-sm">{stockCheckProduct.stock_grams} جم</strong>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">الوزن الفعلي بالميزان (جم):</label>
                <input
                  type="number"
                  value={actualGramsInput}
                  onChange={(e) => setActualGramsInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`${stockCheckProduct.stock_grams}`}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-sm font-black text-right outline-none"
                  required
                />
              </div>

              {actualGramsInput !== '' && (
                <div className={`p-2.5 rounded-xl font-bold flex justify-between ${
                  Number(actualGramsInput) - stockCheckProduct.stock_grams === 0
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-rose-100 text-rose-900'
                }`}>
                  <span>الفارق الفعلي:</span>
                  <span className="font-mono">
                    {Number(actualGramsInput) - stockCheckProduct.stock_grams} جم
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-[#86868B] block text-right">مبرر الفارق / ملاحظات:</label>
                <input
                  type="text"
                  value={stockCheckReason}
                  onChange={(e) => setStockCheckReason(e.target.value)}
                  placeholder="مثال: هالك تبخير أو قطرات أثناء التحضير..."
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] text-right outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowNewStockCheckModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  اعتماد وتحديث الرصيد الفعلي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Strategic Replenishment Order Modal */}
      {activeReplenishmentOrder && (
        <StrategicReplenishmentModal
          isOpen={showStrategicReplenishmentModal}
          onClose={() => setShowStrategicReplenishmentModal(false)}
          order={activeReplenishmentOrder}
          onUpdateOrder={(updated) => {
            setActiveReplenishmentOrder(updated);
            if (onSaveStrategicOrder) onSaveStrategicOrder(updated);
          }}
          allProducts={products}
          settings={settings}
          currentUser={currentUser}
          onAddAuditLog={onAddAuditLog}
        />
      )}

    </div>
  );
};

export default InventoryIntelligence;
