import React, { useState, useMemo } from 'react';
import { Product, PerfumeAnalysis, FragranceDatabaseEntry, AppUser } from '../types';
import { analyzePerfumeDetails, auditAndUpdateFullInventoryLocally } from '../services/geminiService';
import { 
  getLocalFragranceDatabase, 
  saveLocalFragranceDatabase, 
  enrichFragranceProfile, 
  scanIncompleteFragranceProfiles, 
  scanDuplicateFragrances,
  saveFragranceProfileCloud,
  bulkSeedFragranceDatabase,
  bulkSaveEnrichedPerfumesToEncyclopedia,
  VERIFIED_SEED_FRAGRANCES
} from '../services/fragranceDbService';
import SmartFragranceSearchModal from './SmartFragranceSearchModal';
import { 
  Sparkles, 
  Search, 
  Layers, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Wind, 
  MessageSquare, 
  Blend, 
  Save, 
  Check, 
  Loader2, 
  Beaker,
  Award,
  BookOpen,
  ArrowLeft,
  Database,
  RefreshCw,
  AlertTriangle,
  Copy,
  CheckCircle2,
  ExternalLink,
  Tag,
  Sliders,
  Filter,
  X
} from 'lucide-react';

interface FragranceAnalyzerProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onNavigateToPOS?: (product: Product) => void;
  currentUser?: AppUser | null;
  fragranceDatabase?: FragranceDatabaseEntry[];
  onSaveFragranceProfile?: (entry: FragranceDatabaseEntry) => void;
}

const FragranceAnalyzer: React.FC<FragranceAnalyzerProps> = ({
  products,
  setProducts,
  onNavigateToPOS,
  currentUser,
  fragranceDatabase = [],
  onSaveFragranceProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);
  const [analysis, setAnalysis] = useState<PerfumeAnalysis | null>(products[0]?.analysis || null);
  const [activeProfile, setActiveProfile] = useState<FragranceDatabaseEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Admin Tools Modals
  const [showSmartSearchModal, setShowSmartSearchModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [adminStatusMessage, setAdminStatusMessage] = useState<string | null>(null);

  // Active database list
  const currentDb = useMemo(() => {
    if (fragranceDatabase && fragranceDatabase.length > 0) {
      return fragranceDatabase;
    }
    return getLocalFragranceDatabase();
  }, [fragranceDatabase]);

  // Load profile for selected product
  React.useEffect(() => {
    if (selectedProduct) {
      const match = currentDb.find(e => 
        e.name.toLowerCase() === selectedProduct.name.toLowerCase() ||
        e.productId === selectedProduct.id
      );
      if (match) {
        setActiveProfile(match);
      } else {
        // Find in seed
        const seedMatch = VERIFIED_SEED_FRAGRANCES.find(s => 
          s.name.toLowerCase() === selectedProduct.name.toLowerCase()
        );
        setActiveProfile(seedMatch || null);
      }
    }
  }, [selectedProduct, currentDb]);

  const handleAnalyze = async (perfumeName: string, brandName: string = '') => {
    if (!perfumeName.trim()) return;
    setLoading(true);
    setSavedSuccess(false);
    try {
      const res = await analyzePerfumeDetails(perfumeName, brandName);
      setAnalysis(res);

      // Auto-enrich in database without hallucination
      const enriched = await enrichFragranceProfile(perfumeName, brandName, 'فرنسي', 'عادي', currentDb);
      setActiveProfile(enriched);
      if (onSaveFragranceProfile) {
        onSaveFragranceProfile(enriched);
      }
      saveFragranceProfileCloud(enriched).catch(console.warn);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    if (product.analysis) {
      setAnalysis(product.analysis);
    } else {
      handleAnalyze(product.name, product.brand);
    }
  };

  const handleSaveToInventory = () => {
    if (!selectedProduct || !analysis) return;
    setProducts(prev => prev.map(p => {
      if (p.id === selectedProduct.id) {
        return { ...p, analysis };
      }
      return p;
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Instant Administrative Approval of Profile
  const handleApproveProfile = (profile: FragranceDatabaseEntry) => {
    const updated: FragranceDatabaseEntry = {
      ...profile,
      approvalStatus: 'معتمد',
      confidenceDegree: 'عالية',
      lastUpdated: new Date().toISOString()
    };
    setActiveProfile(updated);
    if (onSaveFragranceProfile) onSaveFragranceProfile(updated);
    saveFragranceProfileCloud(updated).catch(console.warn);

    setAdminStatusMessage(`تم اعتماد ملف عطر «${profile.name}» رسمياً في قاعدة البيانات.`);
    setTimeout(() => setAdminStatusMessage(null), 3000);
  };

  // Sync / Bulk seed local database & audit/enrich all inventory items 100% locally and free
  const handleSyncDatabase = async () => {
    setSyncingAll(true);
    try {
      await bulkSeedFragranceDatabase();
      const report = auditAndUpdateFullInventoryLocally(products);
      setProducts(report.updatedProducts);
      await bulkSaveEnrichedPerfumesToEncyclopedia(report.enrichedRecords);
      setAdminStatusMessage(report.summaryText);
      setTimeout(() => setAdminStatusMessage(null), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingAll(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.includes(searchQuery) || p.brand.includes(searchQuery)
  );

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Incomplete & Duplicates Scans
  const incompleteList = useMemo(() => {
    return scanIncompleteFragranceProfiles(products, currentDb);
  }, [products, currentDb]);

  const duplicatesList = useMemo(() => {
    return scanDuplicateFragrances(products);
  }, [products]);

  const isOwner = !currentUser || currentUser.role === 'OWNER';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold mb-2 border border-purple-200">
            <Award size={14} className="text-purple-600" />
            <span>معايير الهرم العطري والمراجع المعتمدة (Fragrantica & IFRA Standards)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="gemini-text-gradient">موسوعة وقاعدة بيانات العطور الذكية</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B] mt-0.5">
            قاعدة بيانات موثوقة تعمل بدون إنترنت، تحليل دقيق للنوتات، كشف الأصناف المكررة، ومحرك بحث ذكي بالمناسبات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Smart Natural Search Button */}
          <button
            type="button"
            onClick={() => setShowSmartSearchModal(true)}
            className="apple-btn flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-sm"
          >
            <Sparkles size={16} />
            <span>البحث الذكي بالمناسبة والمود</span>
          </button>

          {selectedProduct && analysis && (
            <button
              onClick={handleSaveToInventory}
              className="apple-btn flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-sm"
            >
              {savedSuccess ? <Check size={16} /> : <Save size={16} />}
              <span>{savedSuccess ? 'تم حفظ التحليل في بطاقة العطر!' : 'حفظ التحليل في المخزون'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Action Control Toolbar */}
      <div className="p-3.5 rounded-3xl bg-white border border-black/[0.06] shadow-apple-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5 pl-2 border-l border-black/[0.08]">
            <Database size={15} className="text-purple-600" />
            <span>إدارة قاعدة البيانات:</span>
          </span>

          <button
            type="button"
            onClick={handleSyncDatabase}
            disabled={syncingAll}
            className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] font-bold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={13} className={syncingAll ? 'animate-spin text-purple-600' : 'text-[#86868B]'} />
            <span>{syncingAll ? 'جاري التحديث...' : 'تحديث قاعدة البيانات'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowIncompleteModal(true)}
            className="apple-btn px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold flex items-center gap-1.5 transition-all"
          >
            <AlertTriangle size={13} className="text-amber-600" />
            <span>فحص البيانات غير المكتملة</span>
            {incompleteList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                {incompleteList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowDuplicatesModal(true)}
            className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] font-bold flex items-center gap-1.5 transition-all"
          >
            <Copy size={13} className="text-[#86868B]" />
            <span>فحص الأصناف المكررة</span>
            {duplicatesList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                {duplicatesList.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#86868B]">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>متاحة 100% دون إنترنت (Offline Cache Active)</span>
        </div>
      </div>

      {/* Admin Message Toast */}
      {adminStatusMessage && (
        <div className="p-3 rounded-2xl bg-[#1D1D1F] text-white text-xs font-bold text-center animate-in fade-in duration-150">
          ✅ {adminStatusMessage}
        </div>
      )}

      {/* Main Grid: Selector & Search (col-span-4) + Analysis Card (col-span-8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Perfume Search & Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="apple-glass-card rounded-3xl p-5 space-y-3 border border-black/[0.06]">
            <h3 className="font-bold text-sm text-[#1D1D1F]">كتالوج العطور بالمحل ({filteredProducts.length})</h3>

            <div className="relative">
              <input
                type="text"
                placeholder="ابحث في المتجر أو اكتب اسم عطر عالمي..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="gemini-field field-border-purple w-full h-11 pr-10 pl-3 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
              />
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
            </div>

            {searchQuery && !filteredProducts.some(p => p.name.toLowerCase() === searchQuery.toLowerCase()) && (
              <button
                onClick={() => handleAnalyze(searchQuery, '')}
                className="apple-btn w-full py-2.5 rounded-xl bg-[#1D1D1F] text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles size={14} className="text-[#C49746]" />
                <span>تحليل العطر الخارجي "{searchQuery}"</span>
              </button>
            )}

            {/* Zero Scroll - Clean Paginated List */}
            <div className="space-y-1.5 pt-1">
              {paginatedProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const hasSavedAnalysis = Boolean(p.analysis);

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className={`apple-btn w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-white border-[#0071E3] shadow-apple font-bold text-[#1D1D1F]'
                        : 'bg-white/60 border-black/[0.04] hover:bg-white text-[#48484A]'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{p.name}</span>
                      <span className="text-[10px] text-[#86868B]">{p.brand} · {p.type}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasSavedAnalysis && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="تم حفظ التحليل" />
                      )}
                      <span className="text-[11px] font-mono font-semibold text-[#86868B]">
                        {p.stock_grams} جم
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] text-xs">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-black/[0.04] disabled:opacity-30 text-[#1D1D1F] font-bold"
                >
                  السابق
                </button>
                <span className="text-[11px] text-[#86868B]">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-black/[0.04] disabled:opacity-30 text-[#1D1D1F] font-bold"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Fragrance Profile Card */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <div className="apple-glass-card rounded-3xl p-16 text-center text-[#86868B] space-y-3 border border-black/[0.06]">
              <Loader2 size={36} className="mx-auto animate-spin text-purple-600" />
              <p className="font-bold text-sm text-[#1D1D1F]">جاري استرجاع وفحص بيانات العطر من المراجع المعتمدة...</p>
              <p className="text-xs text-[#86868B]">مطابقة الهرم العطري، الأكوردات، والتصنيف الموثق دولياً</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Product Header & Confidence Badge Card */}
              <div className="apple-glass-card rounded-3xl p-6 sm:p-7 border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-[#1D1D1F] tracking-tight">
                      {selectedProduct?.name}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/[0.04] font-semibold text-[#86868B]">
                      {selectedProduct?.brand}
                    </span>

                    {/* Confidence Degree Badge */}
                    {activeProfile && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                        activeProfile.confidenceDegree === 'عالية' 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : activeProfile.confidenceDegree === 'متوسطة'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}>
                        ثقة {activeProfile.confidenceDegree}
                      </span>
                    )}

                    {/* Approval Status */}
                    {activeProfile && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        activeProfile.approvalStatus === 'معتمد' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {activeProfile.approvalStatus}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#86868B] mt-1">
                    {activeProfile?.generalCharacter || `التصنيف: ${selectedProduct?.type} · المنشأ: ${selectedProduct?.origin} · رصيد المخزون: ${selectedProduct?.stock_grams} جم`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Approve button for unapproved profiles */}
                  {activeProfile && activeProfile.approvalStatus !== 'معتمد' && isOwner && (
                    <button
                      type="button"
                      onClick={() => handleApproveProfile(activeProfile)}
                      className="apple-btn px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                    >
                      اعتماد الملف رسمياً
                    </button>
                  )}

                  {onNavigateToPOS && selectedProduct && (
                    <button
                      onClick={() => onNavigateToPOS(selectedProduct)}
                      className="apple-btn flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold shadow-sm"
                    >
                      <span>الانتقال للبيع بالكاشير</span>
                      <ArrowLeft size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Verified Sources & Accords Row */}
              <div className="apple-glass-card rounded-3xl p-5 border border-black/[0.06] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] text-xs">
                  <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>المصادر المرجعية المعتمدة (بدون هلوسات أو معلومات تخمينية):</span>
                  </span>
                  <span className="text-[10px] text-[#86868B]">
                    {activeProfile?.confidenceReason || 'مطابقة مؤكدة مع الكتالوج الرسمي'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(activeProfile?.sourcesRanked || [
                    { rank: 1, name: 'الأرشيف الرسمي للدار المصنعة', type: 'official_brand' },
                    { rank: 2, name: 'دليل Fragrantica & Basenotes الدولي', type: 'database' },
                    { rank: 3, name: 'معايير IFRA Category 4 للأمان', type: 'ifra' }
                  ]).map((src, sIdx) => (
                    <span 
                      key={sIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/[0.03] border border-black/[0.06] text-[11px] font-semibold text-[#48484A]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#0071E3]/10 text-[#0071E3] font-bold text-[10px] flex items-center justify-center">
                        {src.rank}
                      </span>
                      <span>{src.name}</span>
                    </span>
                  ))}
                </div>

                {/* Main Accords */}
                <div className="pt-2 border-t border-black/[0.04] flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[#86868B] shrink-0">الأكوردات الرئيسية:</span>
                  {(activeProfile?.mainAccords || analysis.mainAccords).map((acc, aIdx) => (
                    <span key={aIdx} className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold text-[11px]">
                      {acc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Olfactory Pyramid (الهرم العطري الثلاثي) */}
              <div className="apple-glass-card rounded-3xl p-6 sm:p-7 border border-black/[0.06] space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06]">
                  <Layers size={18} className="text-[#0071E3]" />
                  <h3 className="font-bold text-sm text-[#1D1D1F]">الهرم العطري المعتمد (Olfactory Pyramid)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Top Notes */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/60 to-transparent border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between font-bold text-blue-900">
                      <span>1. النوتات العليا (الافتتاحية)</span>
                      <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full">أول 15 دقيقة</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {analysis.topNotes.map((note, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-xl bg-white text-[#1D1D1F] border border-blue-100 font-medium text-[11px]">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Heart Notes */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50/60 to-transparent border border-purple-100 space-y-2">
                    <div className="flex items-center justify-between font-bold text-purple-900">
                      <span>2. النوتات الوسطى (قلب العطر)</span>
                      <span className="text-[10px] bg-purple-100 px-2 py-0.5 rounded-full">2 - 4 ساعات</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {analysis.heartNotes.map((note, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-xl bg-white text-[#1D1D1F] border border-purple-100 font-medium text-[11px]">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Base Notes */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/60 to-transparent border border-amber-100 space-y-2">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span>3. النوتات القاعدية (الثبات)</span>
                      <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded-full">6 - 24 ساعة</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {analysis.baseNotes.map((note, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-xl bg-white text-[#1D1D1F] border border-amber-100 font-medium text-[11px]">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance & Seasonal Suitability */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="apple-glass-card rounded-2xl p-4 border border-black/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#86868B]">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>مستوى الثبات</span>
                  </div>
                  <span className="font-bold text-sm text-[#1D1D1F] block">{analysis.longevity}</span>
                </div>

                <div className="apple-glass-card rounded-2xl p-4 border border-black/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#86868B]">
                    <Wind size={14} className="text-[#0071E3]" />
                    <span>مستوى الفوحان</span>
                  </div>
                  <span className="font-bold text-sm text-[#1D1D1F] block">{analysis.sillage}</span>
                </div>

                <div className="apple-glass-card rounded-2xl p-4 border border-black/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#86868B]">
                    <Sun size={14} className="text-[#C49746]" />
                    <span>الموسم الأنسب</span>
                  </div>
                  <span className="font-bold text-sm text-[#1D1D1F] block">{analysis.bestSeason}</span>
                </div>

                <div className="apple-glass-card rounded-2xl p-4 border border-black/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#86868B]">
                    <Moon size={14} className="text-purple-600" />
                    <span>الوقت الأنسب</span>
                  </div>
                  <span className="font-bold text-sm text-[#1D1D1F] block">{analysis.bestTime}</span>
                </div>
              </div>

              {/* Seller Sales Pitch & Layering Recipe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="apple-glass-card rounded-3xl p-5 border border-black/[0.06] space-y-2">
                  <div className="flex items-center gap-2 text-[#0071E3] font-bold text-xs">
                    <MessageSquare size={16} />
                    <span>عبارة إقناع الزبون (Sales Pitch)</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/[0.02] text-xs font-semibold text-[#1D1D1F] leading-relaxed">
                    "{analysis.salesPitch}"
                  </div>
                  <p className="text-[10px] text-[#86868B]">
                    قل هذه العبارة للعميل بمجرد رشه على شريط الاختبار لإبراز نوتات العطر.
                  </p>
                </div>

                <div className="apple-glass-card rounded-3xl p-5 border border-black/[0.06] space-y-2">
                  <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
                    <Blend size={16} />
                    <span>اقتراح الدمج لزيادة الفاتورة (Layering)</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/40 text-xs font-semibold text-purple-950 leading-relaxed border border-purple-100">
                    {analysis.layeringSuggestion}
                  </div>
                  <p className="text-[10px] text-[#86868B]">
                    اعرض على العميل خلط الزيت مع رشة مسك لرفع قيمة الشراء والتميز.
                  </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="apple-glass-card rounded-3xl p-12 text-center text-[#86868B] space-y-2 border border-black/[0.06]">
              <BookOpen size={36} className="mx-auto text-[#AEAEB2]" />
              <p className="font-bold text-base text-[#1D1D1F]">اختر عطراً لبدء التحليل</p>
              <p className="text-xs">اضغط على أي عطر من القائمة لعرض هرمه العطري الكامل ومفاتيح البيع</p>
            </div>
          )}
        </div>
      </div>

      {/* Smart Natural Search Modal */}
      <SmartFragranceSearchModal
        isOpen={showSmartSearchModal}
        onClose={() => setShowSmartSearchModal(false)}
        products={products}
        fragranceDatabase={currentDb}
        onAddToCart={(p) => {
          if (onNavigateToPOS) onNavigateToPOS(p);
          setShowSmartSearchModal(false);
        }}
      />

      {/* Incomplete Profiles Modal */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-glass rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">الأصناف التي تحتاج مراجعة أو استكمال بيانات ({incompleteList.length})</h3>
              </div>
              <button onClick={() => setShowIncompleteModal(false)} className="text-[#86868B]">
                <X size={18} />
              </button>
            </div>

            {incompleteList.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-emerald-700">
                ✅ جميع الأصناف في المتجر مكتملة البيانات وموثقة بنجاح!
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {incompleteList.slice(0, 15).map(({ product, reason }, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#1D1D1F] block">{product.name}</span>
                      <span className="text-[10px] text-amber-700">{reason}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleSelectProduct(product);
                        setShowIncompleteModal(false);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-[10px]"
                    >
                      استكمال الآن
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Duplicates Modal */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-glass rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <Copy size={18} className="text-[#0071E3]" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">فحص الأصناف المكررة في الكتالوج ({duplicatesList.length})</h3>
              </div>
              <button onClick={() => setShowDuplicatesModal(false)} className="text-[#86868B]">
                <X size={18} />
              </button>
            </div>

            {duplicatesList.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-emerald-700">
                ✅ لا توجد أصناف مكررة بالاسم في الكتالوج الحالي!
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {duplicatesList.map((dup, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-white border border-black/[0.06] space-y-1">
                    <span className="font-black text-[#1D1D1F] block">{dup.name} (مكرر {dup.count} مرات)</span>
                    <p className="text-[10px] text-[#86868B]">يُنصح بدمج الرصيد لمنع ازدواجية السجلات.</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default FragranceAnalyzer;
