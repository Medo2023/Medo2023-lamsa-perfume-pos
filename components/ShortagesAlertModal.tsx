import React, { useState } from 'react';
import { Product, PurchaseRequest, AppUser } from '../types';
import { 
  AlertTriangle, 
  PackageX, 
  Package, 
  CheckCircle2, 
  ArrowLeft, 
  PlusCircle, 
  Flame, 
  TrendingDown, 
  ShieldAlert, 
  Sparkles,
  Search,
  ShoppingCart,
  Check,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface ShortagesAlertModalProps {
  products: Product[];
  currentUser: AppUser | null;
  onClose: () => void;
  onSavePurchaseRequest?: (request: PurchaseRequest) => void;
  onStartSelling?: () => void;
  isInitialShiftOpen?: boolean;
}

export const ShortagesAlertModal: React.FC<ShortagesAlertModalProps> = ({
  products,
  currentUser,
  onClose,
  onSavePurchaseRequest,
  onStartSelling,
  isInitialShiftOpen = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'zero' | 'critical'>('all');
  const [requestedProductIds, setRequestedProductIds] = useState<Set<number>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const ITEMS_PER_PAGE = 4;

  // Scan products against minimum stock threshold (defaults to 30g if not set)
  const shortages = products
    .filter(p => {
      const minThreshold = p.min_threshold_grams ?? 30;
      return p.stock_grams <= minThreshold;
    })
    .map(p => {
      const minThreshold = p.min_threshold_grams ?? 30;
      const deficit = Math.max(0, minThreshold - p.stock_grams);
      let severity: 'zero' | 'critical' | 'low' = 'low';
      if (p.stock_grams <= 0) severity = 'zero';
      else if (p.stock_grams <= 15) severity = 'critical';

      return {
        ...p,
        minThreshold,
        deficit,
        severity
      };
    })
    .sort((a, b) => {
      // Sort: Zero stock first, then by remaining grams ascending
      if (a.stock_grams === 0 && b.stock_grams !== 0) return -1;
      if (a.stock_grams !== 0 && b.stock_grams === 0) return 1;
      return a.stock_grams - b.stock_grams;
    });

  const zeroCount = shortages.filter(s => s.severity === 'zero').length;
  const criticalCount = shortages.filter(s => s.severity === 'critical').length;
  const lowCount = shortages.filter(s => s.severity === 'low').length;
  const totalDeficitGrams = shortages.reduce((sum, s) => sum + s.deficit, 0);

  // Filtered list
  const filteredShortages = shortages.filter(s => {
    const matchSearch = !searchTerm.trim() || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (filterType === 'zero') return s.severity === 'zero';
    if (filterType === 'critical') return s.severity === 'critical';
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredShortages.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedShortages = filteredShortages.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE
  );

  // Handle Quick Purchase Request for a shortage
  const handleQuickRequest = (product: typeof shortages[0]) => {
    if (!onSavePurchaseRequest) return;

    const targetGrams = product.deficit > 0 ? Math.max(250, product.deficit * 2) : 250;
    const req: PurchaseRequest = {
      id: `req-${Date.now()}-${product.id}`,
      date: new Date().toISOString().slice(0, 10),
      requestedBy: currentUser?.displayName || 'مسؤول المبيعات',
      productName: product.name,
      brand: product.brand,
      requestedGrams: targetGrams,
      estimatedCost: targetGrams * 5, // Approximate
      priority: product.stock_grams === 0 ? 'عاجل (نفد)' : 'متوسط (قارب النفاذ)',
      status: 'قيد الانتظار',
      notes: `طلب توريد آلي ناتج عن فحص نواقص اليوم: المتبقي حالياً ${product.stock_grams} جم فقط، الحد الأدنى ${product.minThreshold} جم.`
    };

    onSavePurchaseRequest(req);
    setRequestedProductIds(prev => new Set(prev).add(product.id));

    setFeedbackMessage(`تم إرسال طلب توريد عاجل لـ «${product.name}» إلى الإدارة`);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md smart-modal-overlay animate-in fade-in duration-200">
      <div className="apple-glass smart-modal-window rounded-3xl w-full max-w-2xl border border-white/40 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${
                shortages.length > 0 
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              }`}>
                {shortages.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-[#1D1D1F]">
                    تقرير نواقص اليوم الذكي
                  </h2>
                  {isInitialShiftOpen && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      تم فتح الوردية بنجاح ✅
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#86868B] mt-0.5">
                  فحص فوري للحد الأدنى للمخزون لمنع الإحراج مع العملاء وزيادة إنتاجية البيع
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setPage(0);
              }}
              className={`p-2 rounded-2xl border text-right transition-all ${
                filterType === 'all'
                  ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                  : 'bg-white/60 hover:bg-white text-[#1D1D1F] border-black/[0.06]'
              }`}
            >
              <span className="text-[10px] block opacity-80">إجمالي النواقص</span>
              <span className="text-base font-black">{shortages.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterType('zero');
                setPage(0);
              }}
              className={`p-2 rounded-2xl border text-right transition-all ${
                filterType === 'zero'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 hover:bg-rose-100/70 text-rose-800 border-rose-200'
              }`}
            >
              <span className="text-[10px] block opacity-80">نفد تماماً (0 جم)</span>
              <span className="text-base font-black">{zeroCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterType('critical');
                setPage(0);
              }}
              className={`p-2 rounded-2xl border text-right transition-all ${
                filterType === 'critical'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 hover:bg-amber-100/70 text-amber-800 border-amber-200'
              }`}
            >
              <span className="text-[10px] block opacity-80">حرج جداً (≤ 15 جم)</span>
              <span className="text-base font-black">{criticalCount}</span>
            </button>
          </div>

          {/* Search & Pagination Bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                placeholder="ابحث بالاسم أو الماركة..."
                className="w-full h-9 px-3 pr-9 pl-4 rounded-xl bg-white border border-black/[0.08] focus:border-[#0071E3] text-xs outline-none transition-all text-right"
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-white px-2.5 h-9 rounded-xl border border-black/[0.08] text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="p-0.5 disabled:opacity-30 hover:text-[#0071E3] cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
                <span className="font-mono text-[11px]">{safePage + 1} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="p-0.5 disabled:opacity-30 hover:text-[#0071E3] cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>{feedbackMessage}</span>
            </span>
          </div>
        )}

        {/* Shortages List (Zero-Scroll Paginated) */}
        <div className="flex-1 overflow-hidden p-3.5 sm:p-4 space-y-2 flex flex-col justify-start">
          {filteredShortages.length === 0 ? (
            <div className="py-8 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">
                {shortages.length === 0 
                  ? 'مخزونك ممتاز! لا توجد نواقص تحت الحد الأدنى' 
                  : 'لا توجد نتائج تطابق بحثك في النواقص'}
              </h3>
              <p className="text-xs text-[#86868B] max-w-sm mx-auto">
                {shortages.length === 0
                  ? 'كافة الزيوت العطرية متوفرة بكميات كافية لتغطية مبيعات اليوم بكل ثقة وسلاسة.'
                  : 'جرب تغيير كلمة البحث أو فلتر التصفية.'}
              </p>
            </div>
          ) : (
            pagedShortages.map((item) => {
              const isRequested = requestedProductIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    item.severity === 'zero'
                      ? 'bg-rose-50/70 border-rose-200'
                      : item.severity === 'critical'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-white border-black/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                      item.severity === 'zero'
                        ? 'bg-rose-100 text-rose-700'
                        : item.severity === 'critical'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}>
                      {item.severity === 'zero' ? <PackageX size={18} /> : <Package size={18} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-[#1D1D1F] truncate">
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          item.severity === 'zero'
                            ? 'bg-rose-600 text-white'
                            : item.severity === 'critical'
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-200 text-zinc-800'
                        }`}>
                          {item.severity === 'zero' ? 'نفد تماماً' : item.severity === 'critical' ? 'حرج جداً' : 'قارب النفاذ'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#86868B] mt-0.5">
                        <span>{item.brand}</span>
                        <span>·</span>
                        <span>النوع: {item.type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Metrics & Quick Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5">
                    <div className="text-right sm:text-left">
                      <div className="text-xs font-bold text-[#1D1D1F]">
                        المتبقي: <span className="font-mono text-xs text-rose-600 font-black">{item.stock_grams}</span> جم
                      </div>
                      <div className="text-[10px] text-[#86868B]">
                        الحد: {item.minThreshold} جم (عجز {item.deficit} جم)
                      </div>
                    </div>

                    {onSavePurchaseRequest && (
                      <button
                        type="button"
                        onClick={() => handleQuickRequest(item)}
                        disabled={isRequested}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
                          isRequested
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-[#1D1D1F] hover:bg-black text-white shadow-sm active:scale-95'
                        }`}
                      >
                        {isRequested ? (
                          <>
                            <Check size={12} className="text-emerald-700" />
                            <span>تم الطلب</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle size={12} />
                            <span>طلب شراء</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-black/[0.06] bg-white/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-[#86868B] text-center sm:text-right">
            <span>💡 نصيحة الإنتاجية: اعرض البدائل العطرية المتوفرة للزبائن لتجنب خسارة أي عملية بيع.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 h-11 rounded-xl border border-black/[0.1] text-xs font-bold text-[#1D1D1F] hover:bg-black/[0.04]"
            >
              إغلاق التقرير
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onStartSelling) onStartSelling();
              }}
              className="flex-2 sm:flex-none px-6 h-11 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} />
              <span>تأكيد والبدء في البيع</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShortagesAlertModal;
