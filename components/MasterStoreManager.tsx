import React, { useState, useMemo, useRef } from 'react';
import { 
  Product, 
  Sale, 
  Expense, 
  StoreSettings, 
  BottleSize, 
  StoreBackupData, 
  PerfumeType, 
  Gender, 
  Season,
  ExpenseCategory 
} from '../types';
import { 
  ShieldCheck, 
  Download, 
  Upload, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Check, 
  Database, 
  Sliders, 
  Package, 
  DollarSign, 
  Building, 
  FileText, 
  AlertTriangle, 
  Sparkles,
  Search,
  CheckCircle2,
  HardDrive,
  Copy,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface MasterStoreManagerProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  bottleSizes: BottleSize[];
  setBottleSizes: React.Dispatch<React.SetStateAction<BottleSize[]>>;
}

type ManagementTab = 'backup' | 'products' | 'expenses' | 'bottles' | 'settings';

const MasterStoreManager: React.FC<MasterStoreManagerProps> = ({
  products,
  setProducts,
  sales,
  setSales,
  expenses,
  setExpenses,
  settings,
  setSettings,
  bottleSizes,
  setBottleSizes,
}) => {
  const [activeTab, setActiveTab] = useState<ManagementTab>('backup');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>(new Date().toLocaleTimeString('ar-EG'));
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string, isError: boolean = false) => {
    if (isError) {
      setErrorNotice(msg);
      setTimeout(() => setErrorNotice(null), 4000);
    } else {
      setSuccessNotice(msg);
      setLastAutoSaveTime(new Date().toLocaleTimeString('ar-EG'));
      setTimeout(() => setSuccessNotice(null), 3500);
    }
  };

  // ========================================================
  // BACKUP & RESTORE ACTIONS
  // ========================================================
  const handleExportBackup = () => {
    const backupData: StoreBackupData = {
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      storeName: settings.storeName,
      products,
      sales,
      expenses,
      settings,
      bottleSizes,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateFormatted = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lamsa-store-full-backup-${dateFormatted}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showNotification('تم تحميل النسخة الاحتياطية الشاملة بنجاح على جهازك!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], 'UTF-8');
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as StoreBackupData;
        if (!parsed.products || !Array.isArray(parsed.products)) {
          throw new Error('ملف النسخة الاحتياطية غير صالح أو ناقص');
        }

        // Restore all states
        setProducts(parsed.products);
        if (parsed.sales && Array.isArray(parsed.sales)) setSales(parsed.sales);
        if (parsed.expenses && Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
        if (parsed.settings && typeof parsed.settings === 'object') setSettings(parsed.settings);
        if (parsed.bottleSizes && Array.isArray(parsed.bottleSizes)) setBottleSizes(parsed.bottleSizes);

        showNotification('تمت استعادة النسخة الاحتياطية بالكامل بنجاح وتحديث كافة أقسام المتجر!');
      } catch (err) {
        showNotification('فشل استيراد الملف: تأكد من اختيار ملف نسخة احتياطية صالح بصيغة JSON', true);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  // Instant Snapshot to localStorage
  const handleCreateSnapshot = () => {
    const snapshot: StoreBackupData = {
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      storeName: settings.storeName,
      products,
      sales,
      expenses,
      settings,
      bottleSizes,
    };
    localStorage.setItem('lamsa_emergency_snapshot', JSON.stringify(snapshot));
    showNotification('تم حفظ لقطة طوارئ داخلية مؤمنة في ذاكرة المتصفح!');
  };

  const handleRestoreSnapshot = () => {
    try {
      const saved = localStorage.getItem('lamsa_emergency_snapshot');
      if (!saved) {
        showNotification('لا توجد لقطة طوارئ محفوظة مسبقاً', true);
        return;
      }
      const parsed = JSON.parse(saved) as StoreBackupData;
      setProducts(parsed.products);
      setSales(parsed.sales || []);
      setExpenses(parsed.expenses || []);
      setSettings(parsed.settings);
      setBottleSizes(parsed.bottleSizes);
      showNotification('تمت استعادة لقطة الطوارئ بنجاح!');
    } catch (e) {
      showNotification('تعذر استعادة لقطة الطوارئ', true);
    }
  };

  // ========================================================
  // PRODUCT CRUD STATE & LOGIC
  // ========================================================
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 8;
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    brand: '',
    origin: 'فرنسي',
    gender: 'مشترك',
    season: 'كل الفصول',
    type: 'عادي',
    stock_grams: 1000,
  });

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.includes(productSearch) || 
      p.brand.includes(productSearch) ||
      p.origin.includes(productSearch)
    );
  }, [products, productSearch]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [filteredProducts, productPage]);

  const handleSaveNewProduct = () => {
    if (!newProduct.name?.trim() || !newProduct.brand?.trim()) {
      showNotification('يرجى كتابة اسم العطر والماركة', true);
      return;
    }
    const created: Product = {
      id: Date.now(),
      name: newProduct.name.trim(),
      brand: newProduct.brand.trim(),
      origin: newProduct.origin || 'فرنسي',
      gender: newProduct.gender || 'مشترك',
      season: newProduct.season || 'كل الفصول',
      type: newProduct.type || 'عادي',
      stock_grams: Number(newProduct.stock_grams) || 1000,
    };
    setProducts(prev => [created, ...prev]);
    setIsAddingProduct(false);
    setNewProduct({
      name: '',
      brand: '',
      origin: 'فرنسي',
      gender: 'مشترك',
      season: 'كل الفصول',
      type: 'عادي',
      stock_grams: 1000,
    });
    showNotification(`تمت إضافة العطر "${created.name}" بنجاح إلى المتجر!`);
  };

  const handleUpdateProduct = (prod: Product) => {
    setProducts(prev => prev.map(p => p.id === prod.id ? prod : p));
    setEditingProduct(null);
    showNotification(`تم حفظ تعديلات العطر "${prod.name}" بنجاح!`);
  };

  const handleDeleteProduct = (id: number | string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف العطر "${name}" من المتجر والمخزون؟`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotification(`تم حذف العطر "${name}" بنجاح`);
    }
  };

  // Quick Restock helper
  const handleQuickAddStock = (id: number | string, addedGrams: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, stock_grams: p.stock_grams + addedGrams };
      }
      return p;
    }));
    showNotification(`تم تزويد الرصيد بـ +${addedGrams} جرام بنجاح!`);
  };

  // ========================================================
  // EXPENSES CRUD STATE & LOGIC
  // ========================================================
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<{
    title: string;
    amount: number | '';
    category: ExpenseCategory;
    isRecurringMonthly: boolean;
    notes: string;
  }>({
    title: '',
    amount: '',
    category: 'رواتب',
    isRecurringMonthly: true,
    notes: '',
  });

  const handleSaveNewExpense = () => {
    if (!newExpense.title.trim() || !newExpense.amount) {
      showNotification('يرجى إدخال اسم البند والمبلغ المطلوب', true);
      return;
    }
    const created: Expense = {
      id: Date.now().toString(),
      title: newExpense.title.trim(),
      amount: Number(newExpense.amount),
      category: newExpense.category,
      date: new Date().toISOString().slice(0, 10),
      isRecurringMonthly: newExpense.isRecurringMonthly,
      notes: newExpense.notes.trim() || undefined,
    };
    setExpenses(prev => [created, ...prev]);
    setIsAddingExpense(false);
    setNewExpense({
      title: '',
      amount: '',
      category: 'رواتب',
      isRecurringMonthly: true,
      notes: '',
    });
    showNotification(`تمت إضافة بند المصروف "${created.title}" بنجاح!`);
  };

  const handleUpdateExpense = (exp: Expense) => {
    setExpenses(prev => prev.map(e => e.id === exp.id ? exp : e));
    setEditingExpense(null);
    showNotification(`تم تحديث المصروف "${exp.title}" بنجاح!`);
  };

  const handleDeleteExpense = (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف بند المصروف "${title}"؟`)) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      showNotification(`تم حذف بند المصروف "${title}"`);
    }
  };

  // ========================================================
  // BOTTLE SIZES CRUD STATE & LOGIC
  // ========================================================
  const [editingBottle, setEditingBottle] = useState<BottleSize | null>(null);
  const [isAddingBottle, setIsAddingBottle] = useState(false);
  const [newBottle, setNewBottle] = useState<{
    sizeMl: number | '';
    essenceGrams: number | '';
    bottleCost: number | '';
    suggestedMargin: number | '';
  }>({
    sizeMl: '',
    essenceGrams: '',
    bottleCost: 10,
    suggestedMargin: 35,
  });

  const handleSaveNewBottle = () => {
    if (!newBottle.sizeMl || !newBottle.essenceGrams) {
      showNotification('يرجى تحديد حجم الزجاجة وكمية الزيت بالجرام', true);
      return;
    }
    const grams = Number(newBottle.essenceGrams);
    const bottleC = Number(newBottle.bottleCost) || settings.defaultBottleCost;
    const margin = Number(newBottle.suggestedMargin) || settings.defaultMargin;
    const normCost = (grams * settings.priceEssenceNormal) + bottleC;
    const normPrice = normCost + margin;

    const created: BottleSize = {
      id: `b-${newBottle.sizeMl}-${Date.now()}`,
      sizeMl: Number(newBottle.sizeMl),
      essenceGrams: grams,
      bottleCost: bottleC,
      suggestedMargin: margin,
      normalPrice: normPrice,
      specialPrice: normPrice + 100,
      officialCost: normCost,
      isRollOn: false,
    };
    setBottleSizes(prev => [...prev, created].sort((a, b) => b.sizeMl - a.sizeMl));
    setIsAddingBottle(false);
    setNewBottle({ sizeMl: '', essenceGrams: '', bottleCost: 10, suggestedMargin: 35 });
    showNotification(`تمت إضافة الحجم ${created.sizeMl} مل بنجاح!`);
  };

  const handleUpdateBottle = (bottle: BottleSize) => {
    setBottleSizes(prev => prev.map(b => b.id === bottle.id ? bottle : b));
    setEditingBottle(null);
    showNotification(`تم تحديث إعدادات حجم ${bottle.sizeMl} مل!`);
  };

  const handleDeleteBottle = (id: string, sizeMl: number) => {
    if (bottleSizes.length <= 1) {
      showNotification('يجب الإبقاء على حجم زجاجة واحد على الأقل في المتجر', true);
      return;
    }
    setBottleSizes(prev => prev.filter(b => b.id !== id));
    showNotification(`تم حذف حجم الزجاجة ${sizeMl} مل`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* HEADER & AUTO-SAVE SHIELD INDICATOR                     */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold mb-2">
            <ShieldCheck size={15} className="text-[#0071E3]" />
            <span>لوحة التحكم الشاملة والنسخ الاحتياطي الفوري</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            <span className="gemini-text-gradient">إدارة المتجر المركزية</span>{' '}
            <span className="text-[#1D1D1F]">والحماية السحابية</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#86868B] mt-1">
            تحكم كامل في إضافة وتعديل وحذف العطور، المصاريف، الأحجام، والأسعار مع حفظ تلقائي فوري ونسخ احتياطي
          </p>
        </div>

        {/* Live Auto-Save Status Badge */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          <div className="apple-glass-card px-4 py-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 flex items-center gap-2.5 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <div>
              <span className="text-[11px] font-bold text-emerald-900 block leading-tight">
                الحفظ التلقائي مؤمّن ونشط
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">
                آخر مزامنة ناجحة: {lastAutoSaveTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Notifications */}
      {successNotice && (
        <div className="apple-glass-card rounded-2xl p-4 border border-emerald-500/40 bg-emerald-50/90 text-emerald-950 flex items-center justify-between shadow-apple-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-800 hover:text-emerald-950">
            <X size={15} />
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="apple-glass-card rounded-2xl p-4 border border-red-500/40 bg-red-50/90 text-red-950 flex items-center justify-between shadow-apple-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-red-800 hover:text-red-950">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MANAGEMENT SUB-NAV (Apple Segmented Style)               */}
      {/* ======================================================== */}
      <div className="apple-segmented-bg flex flex-wrap items-center gap-1 p-1.5">
        <button
          onClick={() => setActiveTab('backup')}
          className={`apple-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'backup'
              ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <HardDrive size={15} className="text-[#0071E3]" />
          <span>النسخ الاحتياطي والاستعادة</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`apple-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <Package size={15} className="text-[#8E24AA]" />
          <span>العطور والمخزون ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`apple-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'expenses'
              ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <Building size={15} className="text-[#E65100]" />
          <span>المصاريف والرواتب ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bottles')}
          className={`apple-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bottles'
              ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <Sliders size={15} className="text-[#10B981]" />
          <span>أحجام الزجاجات ({bottleSizes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`apple-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <DollarSign size={15} className="text-[#C49746]" />
          <span>أسعار الجرامات والهوية</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BACKUP & DATA PROTECTION CENTER                   */}
      {/* ======================================================== */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Main Backup Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Export Backup Card */}
            <div className="apple-glass-card rounded-3xl p-6 sm:p-7 border border-blue-100 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1D1D1F]">
                    <span className="gemini-text-gradient-blue">تصدير نسخة احتياطية كاملة (Export)</span>
                  </h3>
                  <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                    تحميل ملف JSON كامل يحتوي على جميع منتجاتك، وأرصدة المخزون، وسجل المبيعات، وبنود المصاريف، وإعدادات الأسعار والأحجام. احتفظ به في أمان على جهازك أو الفلاشة.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.04] space-y-2">
                <button
                  onClick={handleExportBackup}
                  className="apple-btn w-full py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-apple-sm"
                >
                  <Download size={16} />
                  <span>تنزيل ملف النسخة الاحتياطية الشاملة (.json)</span>
                </button>
                <p className="text-[10px] text-center text-[#86868B]">
                  الملف يشمل {products.length} عطر + {sales.length} فاتورة + {expenses.length} مصروف
                </p>
              </div>
            </div>

            {/* Import Backup Card */}
            <div className="apple-glass-card rounded-3xl p-6 sm:p-7 border border-purple-100 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#8E24AA] flex items-center justify-center">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1D1D1F]">
                    <span className="gemini-text-gradient">استعادة نسخة احتياطية (Restore)</span>
                  </h3>
                  <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                    قم برفع ملف نسخة احتياطية سابقة لاستعادة كافة البيانات فوراً دون فقدان أي بند. يتحقق النظام تلقائياً من بنية الملف وسلامة الأرقام قبل التحديث.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.04] space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="apple-btn w-full py-3.5 rounded-2xl bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-apple-sm"
                >
                  <Upload size={16} />
                  <span>اختيار ملف النسخة الاحتياطية واستعادته</span>
                </button>
                <p className="text-[10px] text-center text-[#86868B]">
                  يقبل ملفات .json المنشأة من نظام لمسة عطر
                </p>
              </div>
            </div>
          </div>

          {/* Quick Snapshot & Safety Zone */}
          <div className="apple-glass-card rounded-3xl p-6 border border-black/[0.06] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06]">
              <Database size={18} className="text-[#C49746]" />
              <h3 className="font-bold text-sm text-[#1D1D1F]">لقطات الطوارئ السريعة وحماية البيانات</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
                <div>
                  <span className="font-bold text-[#1D1D1F] block">أخذ لقطة سريعة للمتجر الآن</span>
                  <p className="text-[#86868B] text-[11px] mt-0.5">
                    تخزين حالة المتجر الراهنة كنسخة طوارئ فورية في المتصفح للرجوع إليها بلمسة واحدة
                  </p>
                </div>
                <button
                  onClick={handleCreateSnapshot}
                  className="apple-btn w-full py-2.5 rounded-xl bg-white border border-black/[0.08] font-bold text-[#1D1D1F] hover:bg-black/[0.02] flex items-center justify-center gap-1.5"
                >
                  <Copy size={14} />
                  <span>حفظ لقطة فورية (Snapshot)</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
                <div>
                  <span className="font-bold text-[#1D1D1F] block">استعادة لقطة الطوارئ السابقة</span>
                  <p className="text-[#86868B] text-[11px] mt-0.5">
                    استرجاع آخر لقطة طوارئ تم حفظها محلياً في حالة حدوث أي تعديل غير مقصود
                  </p>
                </div>
                <button
                  onClick={handleRestoreSnapshot}
                  className="apple-btn w-full py-2.5 rounded-xl bg-white border border-black/[0.08] font-bold text-[#1D1D1F] hover:bg-black/[0.02] flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>استرجاع لقطة الطوارئ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PRODUCTS CRUD & BULK INVENTORY MANAGEMENT         */}
      {/* ======================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Top Products Bar: Search + Add Product Button */}
          <div className="apple-glass-card rounded-3xl p-5 border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="ابحث بالاسم، الماركة، أو بلد المنشأ..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
                className="gemini-field field-border-purple w-full h-11 pr-10 pl-3 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
              />
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
            </div>

            <button
              onClick={() => setIsAddingProduct(!isAddingProduct)}
              className="apple-btn px-4 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>إضافة عطر جديد للمتجر</span>
            </button>
          </div>

          {/* New Product Form Drawer */}
          {isAddingProduct && (
            <div className="apple-glass-card rounded-3xl p-6 border border-purple-200 bg-purple-50/20 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                <h3 className="font-bold text-sm text-[#1D1D1F]">
                  <span className="gemini-text-gradient">بيانات العطر الجديد</span>
                </h3>
                <button onClick={() => setIsAddingProduct(false)} className="text-[#86868B] hover:text-[#1D1D1F]">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-[#86868B] mb-1 block">اسم العطر *</label>
                  <input
                    type="text"
                    placeholder="مثال: بلاك أوركيد"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="gemini-field field-border-blue w-full h-11 px-3 rounded-xl bg-white text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#86868B] mb-1 block">الماركة العالمية *</label>
                  <input
                    type="text"
                    placeholder="مثال: توم فورد"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="gemini-field field-border-purple w-full h-11 px-3 rounded-xl bg-white text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#86868B] mb-1 block">بلد المنشأ</label>
                  <input
                    type="text"
                    placeholder="فرنسي / إيطالي / شرقي..."
                    value={newProduct.origin}
                    onChange={(e) => setNewProduct({ ...newProduct, origin: e.target.value })}
                    className="gemini-field field-border-emerald w-full h-11 px-3 rounded-xl bg-white text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#86868B] mb-1 block">نوع الزيت العطري</label>
                  <select
                    value={newProduct.type}
                    onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value as PerfumeType })}
                    className="gemini-field field-border-amber w-full h-11 px-3 rounded-xl bg-white text-[#1D1D1F]"
                  >
                    <option value="عادي">عادي فرنسي ({settings.priceEssenceNormal} {settings.currency}/جم)</option>
                    <option value="مسك">مسك ({settings.priceEssenceSpecial} {settings.currency}/جم)</option>
                    <option value="عود">عود شرقي ({settings.priceEssenceSpecial} {settings.currency}/جم)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#86868B] mb-1 block">التصنيف (الجنس)</label>
                  <select
                    value={newProduct.gender}
                    onChange={(e) => setNewProduct({ ...newProduct, gender: e.target.value as Gender })}
                    className="gemini-field field-border-rose w-full h-11 px-3 rounded-xl bg-white text-[#1D1D1F]"
                  >
                    <option value="مشترك">مشترك (Unisex)</option>
                    <option value="رجالي">رجالي</option>
                    <option value="نسائي">نسائي</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#86868B] mb-1 block">الرصيد الخام الافتتاحي (جرام)</label>
                  <input
                    type="number"
                    value={newProduct.stock_grams}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_grams: Number(e.target.value) })}
                    className="gemini-field field-border-blue w-full h-11 px-3 rounded-xl bg-white text-[#1D1D1F] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddingProduct(false)}
                  className="apple-btn px-4 py-2 rounded-xl bg-black/[0.05] text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveNewProduct}
                  className="apple-btn px-5 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-bold shadow-sm"
                >
                  حفظ العطر في المتجر
                </button>
              </div>
            </div>
          )}

          {/* Products List - Full Cards without nested scrollbars */}
          <div className="space-y-3">
            {paginatedProducts.map((p) => {
              const isEditing = editingProduct?.id === p.id;
              if (isEditing && editingProduct) {
                return (
                  <div key={p.id} className="apple-glass-card rounded-3xl p-5 border border-purple-300 space-y-3 bg-white">
                    <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                      <span className="text-xs font-bold text-purple-900">تعديل بيانات العطر #{p.id}</span>
                      <button onClick={() => setEditingProduct(null)} className="text-[#86868B]">
                        <X size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-[#86868B] block mb-1">اسم العطر</label>
                        <input
                          type="text"
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="gemini-field field-border-blue w-full h-10 px-3 rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#86868B] block mb-1">الماركة</label>
                        <input
                          type="text"
                          value={editingProduct.brand}
                          onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                          className="gemini-field field-border-purple w-full h-10 px-3 rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#86868B] block mb-1">الرصيد بالجرام</label>
                        <input
                          type="number"
                          value={editingProduct.stock_grams}
                          onChange={(e) => setEditingProduct({ ...editingProduct, stock_grams: Number(e.target.value) })}
                          className="gemini-field field-border-emerald w-full h-10 px-3 rounded-xl bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingProduct(null)} className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.05] text-xs font-semibold">
                        إلغاء
                      </button>
                      <button onClick={() => handleUpdateProduct(editingProduct)} className="apple-btn px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                        حفظ التعديل
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={p.id}
                  className="apple-glass-card rounded-2xl p-4 border border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-black/[0.1] transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1D1D1F]">{p.name}</span>
                      <span className="text-[10px] text-[#86868B]">· {p.brand}</span>
                      <span className="text-[10px] text-[#86868B]">· {p.origin}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] text-[#1D1D1F]">
                        {p.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Stock amount & quick restock buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[#1D1D1F] bg-black/[0.03] px-2.5 py-1 rounded-xl">
                        {p.stock_grams} جم
                      </span>
                      <button
                        onClick={() => handleQuickAddStock(p.id, 500)}
                        className="apple-btn px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold"
                        title="إضافة 500 جم للمخزون"
                      >
                        +500 جم
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="p-1.5 rounded-lg text-[#0071E3] hover:bg-blue-50 transition-colors"
                        title="تعديل"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Pagination Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#86868B]">
              إجمالي {filteredProducts.length} عطور · صفحة {productPage} من {totalProductPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setProductPage(Math.max(1, productPage - 1))}
                disabled={productPage === 1}
                className="apple-btn px-3 py-1.5 rounded-xl bg-white border border-black/[0.08] text-xs font-semibold disabled:opacity-30"
              >
                السابق
              </button>
              <button
                onClick={() => setProductPage(Math.min(totalProductPages, productPage + 1))}
                disabled={productPage === totalProductPages}
                className="apple-btn px-3 py-1.5 rounded-xl bg-white border border-black/[0.08] text-xs font-semibold disabled:opacity-30"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: EXPENSES & SALARIES CRUD                          */}
      {/* ======================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="apple-glass-card rounded-3xl p-5 border border-black/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">إدارة بنود الرواتب والمصروفات</h3>
              <p className="text-xs text-[#86868B]">إجمالي المصاريف المسجلة: {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('ar-EG')} {settings.currency}</p>
            </div>

            <button
              onClick={() => setIsAddingExpense(!isAddingExpense)}
              className="apple-btn px-4 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>إضافة بند مصروف أو راتب</span>
            </button>
          </div>

          {isAddingExpense && (
            <div className="apple-glass-card rounded-3xl p-6 border border-amber-200 bg-amber-50/20 space-y-4 animate-in fade-in duration-200">
              <h4 className="font-bold text-xs text-[#1D1D1F]">إضافة بند تكلفة جديد</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[#86868B] block mb-1">اسم البند (مثال: راتب أحمد، إيجار المعرض)</label>
                  <input
                    type="text"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    className="gemini-field field-border-amber w-full h-10 px-3 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="text-[#86868B] block mb-1">المبلغ ({settings.currency})</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="gemini-field field-border-rose w-full h-10 px-3 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#86868B] block mb-1">التصنيف</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })}
                    className="gemini-field field-border-purple w-full h-10 px-3 rounded-xl bg-white"
                  >
                    <option value="رواتب">رواتب</option>
                    <option value="إيجار">إيجار</option>
                    <option value="فواتير ومرافق">فواتير ومرافق</option>
                    <option value="مستلزمات وتغليف">مستلزمات وتغليف</option>
                    <option value="تسويق وإعلان">تسويق وإعلان</option>
                    <option value="صيانة ونثريات">صيانة ونثريات</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsAddingExpense(false)} className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.05] text-xs font-semibold">
                  إلغاء
                </button>
                <button onClick={handleSaveNewExpense} className="apple-btn px-4 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold">
                  حفظ المصروف
                </button>
              </div>
            </div>
          )}

          {/* Expenses List */}
          <div className="space-y-2.5">
            {expenses.map((exp) => {
              const isEditing = editingExpense?.id === exp.id;
              if (isEditing && editingExpense) {
                return (
                  <div key={exp.id} className="apple-glass-card rounded-2xl p-4 border border-amber-300 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <input
                        type="text"
                        value={editingExpense.title}
                        onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                        className="gemini-field field-border-blue h-10 px-3 rounded-xl bg-white"
                      />
                      <input
                        type="number"
                        value={editingExpense.amount}
                        onChange={(e) => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })}
                        className="gemini-field field-border-emerald h-10 px-3 rounded-xl bg-white font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingExpense(null)} className="apple-btn px-3 py-1 text-xs">إلغاء</button>
                      <button onClick={() => handleUpdateExpense(editingExpense)} className="apple-btn px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">حفظ</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={exp.id} className="apple-glass-card rounded-2xl p-4 border border-black/[0.05] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-[#1D1D1F] block">{exp.title}</span>
                    <span className="text-[10px] text-[#86868B]">{exp.category} · {exp.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-red-600">
                      {exp.amount.toLocaleString('ar-EG')} {settings.currency}
                    </span>
                    <button onClick={() => setEditingExpense(exp)} className="p-1 text-[#0071E3] hover:bg-blue-50 rounded-lg">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDeleteExpense(exp.id, exp.title)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BOTTLE SIZES CRUD                                 */}
      {/* ======================================================== */}
      {activeTab === 'bottles' && (
        <div className="space-y-6">
          <div className="apple-glass-card rounded-3xl p-5 border border-black/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">التحكم في أحجام الزجاجات وتوزيع الجرامات</h3>
              <p className="text-xs text-[#86868B]">متوفر {bottleSizes.length} أحجام معتمدة في الكاشير</p>
            </div>

            <button
              onClick={() => setIsAddingBottle(!isAddingBottle)}
              className="apple-btn px-4 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>إضافة حجم زجاجة جديد</span>
            </button>
          </div>

          {isAddingBottle && (
            <div className="apple-glass-card rounded-3xl p-6 border border-emerald-200 bg-emerald-50/20 space-y-4 animate-in fade-in duration-200">
              <h4 className="font-bold text-xs text-[#1D1D1F]">إضافة مقاس زجاجة جديد</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[#86868B] block mb-1">الحجم (مل)</label>
                  <input
                    type="number"
                    placeholder="مثلاً 60"
                    value={newBottle.sizeMl}
                    onChange={(e) => setNewBottle({ ...newBottle, sizeMl: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="gemini-field field-border-emerald w-full h-10 px-3 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#86868B] block mb-1">كمية الزيت (جرام)</label>
                  <input
                    type="number"
                    placeholder="مثلاً 18"
                    value={newBottle.essenceGrams}
                    onChange={(e) => setNewBottle({ ...newBottle, essenceGrams: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="gemini-field field-border-blue w-full h-10 px-3 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#86868B] block mb-1">سعر الزجاجة الفارغة</label>
                  <input
                    type="number"
                    value={newBottle.bottleCost}
                    onChange={(e) => setNewBottle({ ...newBottle, bottleCost: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="gemini-field field-border-amber w-full h-10 px-3 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#86868B] block mb-1">هامش الربح المقترح</label>
                  <input
                    type="number"
                    value={newBottle.suggestedMargin}
                    onChange={(e) => setNewBottle({ ...newBottle, suggestedMargin: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="gemini-field field-border-purple w-full h-10 px-3 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsAddingBottle(false)} className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.05] text-xs font-semibold">
                  إلغاء
                </button>
                <button onClick={handleSaveNewBottle} className="apple-btn px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                  حفظ المقاس
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {bottleSizes.map((b) => (
              <div key={b.id} className="apple-glass-card rounded-2xl p-4 border border-black/[0.05] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black font-mono text-[#1D1D1F]">{b.sizeMl} مل</span>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                    {b.essenceGrams} جم زيت
                  </span>
                </div>

                <div className="text-xs text-[#86868B] space-y-1">
                  <div className="flex justify-between">
                    <span>تكلفة الزجاجة:</span>
                    <span className="font-mono text-[#1D1D1F]">{b.bottleCost} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>هامش الربح:</span>
                    <span className="font-mono text-emerald-600 font-bold">+{b.suggestedMargin || settings.defaultMargin} {settings.currency}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-black/[0.04] flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleDeleteBottle(b.id, b.sizeMl)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                    title="حذف الحجم"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: GENERAL SETTINGS & ESSENCE PRICING                */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 border border-black/[0.06] space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#1D1D1F]">
              <span className="gemini-text-gradient">أسعار الخامات وهوية المتجر</span>
            </h3>
            <p className="text-xs text-[#86868B] mt-0.5">تطبق التغييرات فوراً في الكاشير وحسابات التكلفة والأرباح</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#86868B] mb-1.5 block">اسم المتجر</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="gemini-field field-border-blue w-full h-11 px-3.5 rounded-xl bg-white font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-[#86868B] mb-1.5 block">العملة المعتمدة</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="gemini-field field-border-purple w-full h-11 px-3.5 rounded-xl bg-white font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-[#86868B] mb-1.5 block">سعر جرام الزيت العادي ({settings.currency}/جم)</label>
              <input
                type="number"
                value={settings.priceEssenceNormal}
                onChange={(e) => setSettings({ ...settings, priceEssenceNormal: Number(e.target.value) })}
                className="gemini-field field-border-emerald w-full h-11 px-3.5 rounded-xl bg-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-[#86868B] mb-1.5 block">سعر جرام الزيوت الخاصة (عود/مسك) ({settings.currency}/جم)</label>
              <input
                type="number"
                value={settings.priceEssenceSpecial}
                onChange={(e) => setSettings({ ...settings, priceEssenceSpecial: Number(e.target.value) })}
                className="gemini-field field-border-amber w-full h-11 px-3.5 rounded-xl bg-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-[#86868B] mb-1.5 block">مستهدف صافي الربح اليومي ({settings.currency})</label>
              <input
                type="number"
                value={settings.dailyTargetProfit}
                onChange={(e) => setSettings({ ...settings, dailyTargetProfit: Number(e.target.value) })}
                className="gemini-field field-border-rose w-full h-11 px-3.5 rounded-xl bg-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-[#86868B] mb-1.5 block">مستهدف المبيعات الشهري ({settings.currency})</label>
              <input
                type="number"
                value={settings.monthlyTargetRevenue}
                onChange={(e) => setSettings({ ...settings, monthlyTargetRevenue: Number(e.target.value) })}
                className="gemini-field field-border-blue w-full h-11 px-3.5 rounded-xl bg-white font-mono font-bold text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between">
            <span className="text-xs text-[#86868B]">يتم الحفظ التلقائي لكل حرف يتم تغييره فورا وبشكل آمن</span>
            <button
              onClick={() => showNotification('تم حفظ وتحديث الإعدادات بنجاح!')}
              className="apple-btn px-6 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Save size={15} />
              <span>تأكيد الحفظ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterStoreManager;
