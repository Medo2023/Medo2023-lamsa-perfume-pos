import React, { useState, useMemo } from 'react';
import { Product, FragranceDatabaseEntry, BottleSize, DEFAULT_BOTTLE_SIZES } from '../types';
import { searchFragrancesNaturally, SmartSearchResult, getLocalFragranceDatabase } from '../services/fragranceDbService';
import { 
  Search, 
  Sparkles, 
  X, 
  ShoppingBag, 
  Check, 
  Layers, 
  Award, 
  Wind, 
  Clock, 
  Tag,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface SmartFragranceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  fragranceDatabase?: FragranceDatabaseEntry[];
  onAddToCart?: (product: Product, bottleSize?: BottleSize) => void;
}

const OCCASION_SHORTCUTS = [
  { label: '💍 زفاف وأعراس', query: 'زفاف عريس فاخر' },
  { label: '🤝 مقابلة عمل', query: 'مقابلة عمل رسمي هادئ' },
  { label: '💖 خطوبة ومناسبات', query: 'خطوبة جذاب رومانسي' },
  { label: '💼 دوام يومي', query: 'دوام يومي عمل نظيف' },
  { label: '✈️ سفر ومطارات', query: 'سفر منعش خفيف' },
  { label: '🏃‍♂️ رياضي ونشاط', query: 'رياضي انتعاش طاقة' },
  { label: '🌙 سهرة فاخرة', query: 'سهرة فخم فواح ثابت' },
  { label: '🎁 هدية قيمة', query: 'هدية راقية محبوبة' },
  { label: '❄️ شتاء دافئ', query: 'شتاء دافئ فانيليا عود' },
  { label: '☀️ صيف منعش', query: 'صيف بحري منعش حمضيات' },
  { label: '🕊️ مسك ونظافة', query: 'مسك طهارة نظافة بودري' },
];

const SmartFragranceSearchModal: React.FC<SmartFragranceSearchModalProps> = ({
  isOpen,
  onClose,
  products,
  fragranceDatabase = [],
  onAddToCart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBottle, setSelectedBottle] = useState<BottleSize>(DEFAULT_BOTTLE_SIZES[0]);
  const [customModalMl, setCustomModalMl] = useState<number | ''>('');
  const [addedItemFlash, setAddedItemFlash] = useState<string | null>(null);
  const [resultsPage, setResultsPage] = useState<number>(0);
  const RESULTS_PER_PAGE = 2;

  const database = useMemo(() => {
    if (fragranceDatabase && fragranceDatabase.length > 0) {
      return fragranceDatabase;
    }
    return getLocalFragranceDatabase();
  }, [fragranceDatabase]);

  const searchResults = useMemo(() => {
    return searchFragrancesNaturally(searchQuery, products, database);
  }, [searchQuery, products, database]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(searchResults.length / RESULTS_PER_PAGE));
  const safePage = Math.min(resultsPage, totalPages - 1);
  const pagedResults = searchResults.slice(
    safePage * RESULTS_PER_PAGE,
    (safePage + 1) * RESULTS_PER_PAGE
  );

  const handleSelectShortcut = (query: string) => {
    setSearchQuery(query);
    setResultsPage(0);
  };

  const handleAddToCart = (res: SmartSearchResult, overrideBottle?: BottleSize) => {
    const targetProduct = res.matchingProduct || res.inStoreAlternative;
    if (!targetProduct || !onAddToCart) return;

    const bottleToUse = overrideBottle || selectedBottle;
    onAddToCart(targetProduct, bottleToUse);
    setAddedItemFlash(`${targetProduct.name} (${bottleToUse.sizeMl} مل)`);
    setTimeout(() => setAddedItemFlash(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1D1D1F]/45 backdrop-blur-xl smart-modal-overlay animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl smart-modal-window rounded-[32px] max-w-4xl w-full flex flex-col shadow-[0_32px_90px_rgba(0,0,0,0.28)] border border-black/[0.08] overflow-hidden my-auto">
        
        {/* Apple HIG Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-black/[0.06] bg-white/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5856D6] via-[#0071E3] to-[#AF52DE] text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                  مستشار البحث الذكي عن العطور (بالمناسبة والمود)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#5856D6]/12 text-[#5856D6] text-[10px] font-black border border-[#5856D6]/20">
                  Apple Fragrance Intelligence
                </span>
              </div>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                اكتب أي مناسبة أو إحساس وحدد حجم الزجاجة المطلوب ليضاف العطر مباشرة لسلة الكاشير
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-black/[0.1] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar, Free Bottle Size Bar & Occasion Chips */}
        <div className="px-4 py-3 border-b border-black/[0.05] bg-[#F5F5F7]/70 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                placeholder="اكتب مثلاً: عطر لزفاف، مقابلة عمل، خطوبة، سفر، رياضة، رائحة هادئة، بديل لبلو شانيل..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setResultsPage(0);
                }}
                className="w-full h-10 pr-10 pl-4 rounded-2xl bg-white border border-black/[0.08] focus:border-[#0071E3] text-xs font-bold text-[#1D1D1F] outline-none shadow-2xs placeholder:text-[#86868B] placeholder:font-normal"
              />
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0071E3]" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setResultsPage(0);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Free Size Selector inside Smart Search Modal */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-black/[0.07] shrink-0">
              <span className="text-[10px] font-black text-[#636366] px-1.5">الحجم:</span>
              {DEFAULT_BOTTLE_SIZES.slice(0, 3).map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setCustomModalMl('');
                    setSelectedBottle(b);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-black transition-all cursor-pointer ${
                    customModalMl === '' && selectedBottle.id === b.id
                      ? 'bg-[#0071E3] text-white shadow-2xs'
                      : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.06]'
                  }`}
                >
                  {b.sizeMl}مل
                </button>
              ))}
              <input
                type="number"
                min="3"
                max="1000"
                placeholder="حر (مل)"
                value={customModalMl}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Math.max(3, Math.round(Number(e.target.value)));
                  setCustomModalMl(val);
                  if (val !== '') {
                    const stdGrams = Math.max(3, Math.round(val * 0.34));
                    setSelectedBottle({
                      id: `custom-${val}ml`,
                      name: `عبوة ${val} مل`,
                      sizeMl: val,
                      essenceGrams: stdGrams,
                      bottleCost: 25,
                      alcoholCost: Math.round(val * 0.35),
                      normalPrice: Math.round(val * 4.6),
                      specialPrice: Math.round(val * 9),
                      officialCost: Math.round(val * 3.5),
                    });
                  }
                }}
                className="w-16 h-7 px-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] font-mono text-[11px] font-black text-center text-[#0071E3] outline-none"
              />
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {OCCASION_SHORTCUTS.map((sc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectShortcut(sc.query)}
                className={`apple-btn px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                  searchQuery === sc.query
                    ? 'bg-[#1D1D1F] text-white shadow-apple-xs'
                    : 'bg-white hover:bg-black/[0.04] text-[#48484A] border border-black/[0.06]'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List (Zero-Scroll 2-Column Bento Grid with Pagination) */}
        <div className="p-3.5 sm:p-4 overflow-hidden flex-1 flex flex-col justify-between gap-2.5">
          {addedItemFlash && (
            <div className="p-2 rounded-2xl bg-emerald-500 text-white text-center text-xs font-bold shrink-0">
              ✅ تم إضافة «{addedItemFlash}» مباشرة إلى سلة الكاشير!
            </div>
          )}

          {searchResults.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white/60 border border-dashed border-black/10 space-y-2 flex-1 flex flex-col items-center justify-center">
              <Sparkles size={32} className="mx-auto text-purple-400" />
              <p className="text-sm font-bold text-[#1D1D1F]">لم نعثر على مطابقة دقيقة لعبارة البحث</p>
              <p className="text-xs text-[#86868B]">
                جرب كتابة مناسبة مثل (زفاف، عمل، خطوبة، سفر) أو طابع مثل (منعش، هادئ، فواح، شرقي).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-hidden">
              {pagedResults.map((res, idx) => {
                const index = safePage * RESULTS_PER_PAGE + idx;
                const p = res.matchingProduct;
                const isAvailable = res.stockStatus === 'متوفر';
                const isLow = res.stockStatus === 'منخفض';
                const isDepleted = res.stockStatus === 'نفد بالمخزون';

                return (
                  <div
                    key={res.entry.id}
                    className={`p-3.5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isAvailable 
                        ? 'bg-white border-black/[0.06] shadow-apple-xs' 
                        : isLow
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-gray-50/60 border-gray-200 opacity-90'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Name & Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <h3 className="font-black text-sm sm:text-base text-[#1D1D1F]">
                            {res.entry.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-[#86868B]">
                            ({res.entry.brand})
                          </span>
                        </div>

                        {/* Stock Badge */}
                        {isAvailable ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            متوفر ({res.stockGrams} جم)
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                            ⚠️ متبقي {res.stockGrams} جم
                          </span>
                        ) : isDepleted ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[10px] font-black">
                            نفد بالمخزون
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
                            صنف خارجي
                          </span>
                        )}
                      </div>

                      {/* Reasons why recommended */}
                      <div className="flex flex-wrap items-center gap-1">
                        {res.matchReasons.slice(0, 3).map((r, rIdx) => (
                          <span 
                            key={rIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-purple-50/70 border border-purple-200/50 text-[10px] font-semibold text-purple-900"
                          >
                            <Sparkles size={10} className="text-purple-600" />
                            <span>{r}</span>
                          </span>
                        ))}
                      </div>

                      {/* Client Sales Pitch */}
                      <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-950 space-y-0.5">
                        <span className="font-black text-[10px] text-amber-900 block">
                          💡 عبارة الإقناع للعميل:
                        </span>
                        <p className="leading-snug font-medium line-clamp-2">
                          "{res.clientPitch}"
                        </p>
                      </div>

                      {/* Notes & Accords */}
                      <div className="text-[10px] text-[#48484A] space-y-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <Wind size={12} className="text-[#86868B] shrink-0" />
                          <span className="truncate"><strong>الأكوردات:</strong> {res.entry.mainAccords.slice(0, 4).join(' · ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-[#86868B] shrink-0" />
                          <span><strong>الثبات والفوحان:</strong> {res.entry.longevity} · {res.entry.sillage}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer inside Card */}
                    <div className="pt-2.5 mt-2 border-t border-black/[0.05] flex items-center justify-between gap-2">
                      {isDepleted && res.inStoreAlternative ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="text-[10px] text-emerald-900 font-bold truncate">
                            🔄 البديل: «{res.inStoreAlternative.name}»
                          </span>
                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={() => onAddToCart(res.inStoreAlternative!)}
                              className="apple-btn px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[10px] shrink-0"
                            >
                              إضافة البديل
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-[10px] text-[#86868B] font-semibold truncate">
                            {res.entry.classification}
                          </span>
                          {onAddToCart && (p || res.inStoreAlternative) && (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(res)}
                              className="apple-btn px-3.5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                            >
                              <ShoppingBag size={13} />
                              <span>إضافة للسلة</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="px-4 py-3 border-t border-black/[0.06] bg-white/80 flex items-center justify-between text-xs text-[#86868B] shrink-0">
          <div className="flex items-center gap-3">
            <span>إجمالي النتائج المطابقة: <strong className="text-[#1D1D1F]">{searchResults.length}</strong></span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-[#F5F5F7] px-2.5 py-1 rounded-xl border border-black/[0.06] text-[#1D1D1F] font-bold">
                <button
                  type="button"
                  onClick={() => setResultsPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="p-0.5 disabled:opacity-30 hover:text-[#0071E3] cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
                <span className="font-mono text-[11px]">
                  صفحة {safePage + 1} من {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setResultsPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="p-0.5 disabled:opacity-30 hover:text-[#0071E3] cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="apple-btn px-4 py-1.5 rounded-xl bg-black/[0.05] text-[#1D1D1F] font-bold"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

export default SmartFragranceSearchModal;
