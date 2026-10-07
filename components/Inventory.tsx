import React, { useState, useMemo } from 'react';
import {
  Product,
  PerfumeType,
  Gender,
  Season,
  AppUser,
  FragranceDatabaseEntry,
  AuditLogRecord,
  Sale,
  StoreSettings,
  DEFAULT_SETTINGS,
  getApprovedOilGramCost,
  isLiveProductionSale,
} from '../types';
import {
  BulkPerfumeImporterModal,
  BulkImportExecutionResult,
} from './BulkPerfumeImporterModal';
import {
  analyzeClassifyAndEnrichBulkPerfumesWithAI,
  autoCorrectAndEnrichItemDeterministic,
  normalizePerfumeNameForAudit,
} from '../services/geminiService';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Package,
  Layers,
  PlusCircle,
  Sparkles,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Wand2,
  Database,
  Download,
  CheckCircle2,
  RefreshCw,
  Eye,
  TrendingUp,
  ShoppingCart,
  Calendar,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sales?: Sale[];
  settings?: StoreSettings;
  currentUser?: AppUser | null;
  fragranceDatabase?: FragranceDatabaseEntry[];
  onBulkUpsertFragranceProfiles?: (profiles: FragranceDatabaseEntry[]) => Promise<void> | void;
  onAddAuditLog?: (log: AuditLogRecord) => void;
  onSendSmartNotification?: (
    title: string,
    subtitle?: string,
    badgeText?: string,
    type?: 'stock' | 'audit' | 'info' | 'goal'
  ) => void;
}

const Inventory: React.FC<InventoryProps> = ({
  products,
  setProducts,
  sales = [],
  settings = DEFAULT_SETTINGS,
  currentUser,
  fragranceDatabase = [],
  onBulkUpsertFragranceProfiles,
  onAddAuditLog,
  onSendSmartNotification,
}) => {
  const isOwner = currentUser?.role === 'OWNER';
  const canAdd =
    isOwner ||
    !!currentUser?.permissions.canCreatePurchaseRequest ||
    !!currentUser?.permissions.canEditProductPrice;
  const canEdit =
    isOwner ||
    !!currentUser?.permissions.canEditProductPrice ||
    !!currentUser?.permissions.canEditProductCost;
  const canDelete = isOwner;
  const canRestock =
    isOwner ||
    !!currentUser?.permissions.canStockCheck ||
    !!currentUser?.permissions.canRecordShortage;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PerfumeType | 'all'>('all');
  const [filterGender, setFilterGender] = useState<Gender | 'all'>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInitialTab, setBulkInitialTab] = useState<'csv_upload' | 'manual_table' | 'ai_text'>(
    'csv_upload'
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [quickRestockProduct, setQuickRestockProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(500);
  const [selectedProfileProduct, setSelectedProfileProduct] = useState<Product | null>(null);

  // Global AI Audit & Auto-Enrich Existing Inventory State
  const [isRunningInventoryAudit, setIsRunningInventoryAudit] = useState(false);
  const [isSingleAIFilling, setIsSingleAIFilling] = useState(false);

  // Consumption Rate & Smart Purchase Recommendation State (Based on Last Month's Sales)
  const [showConsumptionSection, setShowConsumptionSection] = useState<boolean>(true);
  const [targetCoverageDays, setTargetCoverageDays] = useState<30 | 45 | 60>(30);
  const [consumptionViewFilter, setConsumptionViewFilter] = useState<'recommended' | 'critical' | 'all'>('recommended');
  const [consumptionSearchTerm, setConsumptionSearchTerm] = useState<string>('');
  const [customPurchaseGramsOverrides, setCustomPurchaseGramsOverrides] = useState<Record<string, number>>({});

  // Form State for Single Add / Edit
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    origin: 'فرنسي',
    gender: 'مشترك',
    season: 'كل الفصول',
    type: 'عادي',
    stock_grams: 1000,
  });

  // Detect duplicate in single-add modal in real-time
  const singleModalDuplicateMatch = useMemo(() => {
    if (!formData.name?.trim() || editingProduct) return null;
    const normInput = normalizePerfumeNameForAudit(formData.name);
    if (normInput.length < 2) return null;
    return (
      products.find((p) => {
        const pNorm = normalizePerfumeNameForAudit(p.name);
        return pNorm === normInput;
      }) || null
    );
  }, [formData.name, editingProduct, products]);

  // Detect existing duplicates across current inventory
  const existingInventoryDuplicates = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((p) => {
      const norm = normalizePerfumeNameForAudit(p.name);
      if (!norm) return;
      const arr = map.get(norm) || [];
      arr.push(p);
      map.set(norm, arr);
    });
    const dupGroups: { norm: string; items: Product[] }[] = [];
    map.forEach((items, norm) => {
      if (items.length > 1) dupGroups.push({ norm, items });
    });
    return dupGroups;
  }, [products]);

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.origin.toLowerCase().includes(q);
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesGender = filterGender === 'all' || p.gender === filterGender;
    const matchesLowStock = !showLowStockOnly || p.stock_grams < 100;
    return matchesSearch && matchesType && matchesGender && matchesLowStock;
  });

  // Real-time Detailed KPI Metrics
  const totalStockGrams = products.reduce((acc, p) => acc + (p.stock_grams || 0), 0);
  const lowStockCount = products.filter((p) => p.stock_grams < 100).length;
  const documentedInDbCount = useMemo(() => {
    return products.filter(
      (p) =>
        Boolean(p.analysis?.topNotes?.length) ||
        fragranceDatabase.some(
          (f) =>
            f.productId === p.id ||
            normalizePerfumeNameForAudit(f.name) === normalizePerfumeNameForAudit(p.name)
        )
    ).length;
  }, [products, fragranceDatabase]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        brand: '',
        origin: 'فرنسي',
        gender: 'مشترك',
        season: 'كل الفصول',
        type: 'عادي',
        stock_grams: 1000,
      });
    }
    setIsModalOpen(true);
  };

  // Auto-correct & classify single perfume in modal using AI
  const handleAutoCorrectSingleModal = async () => {
    if (!formData.name?.trim()) return;
    setIsSingleAIFilling(true);
    try {
      const [enriched] = await analyzeClassifyAndEnrichBulkPerfumesWithAI([
        {
          originalInputName: formData.name.trim(),
          name: formData.name.trim(),
          brand: formData.brand || '',
          origin: formData.origin || 'فرنسي',
          gender: (formData.gender as Gender) || 'مشترك',
          season: (formData.season as Season) || 'كل الفصول',
          type: (formData.type as PerfumeType) || 'عادي',
          stock_grams: Number(formData.stock_grams) || 1000,
        },
      ]);
      if (enriched) {
        setFormData((prev) => ({
          ...prev,
          name: enriched.name,
          brand: enriched.brand,
          origin: enriched.origin,
          gender: enriched.gender,
          season: enriched.season,
          timeOfDay: enriched.timeOfDay || 'كل الأوقات',
          type: enriched.type,
          occasions: enriched.occasions,
          analysis: {
            topNotes: enriched.topNotes || ['برغموت'],
            heartNotes: enriched.heartNotes || ['ياسمين'],
            baseNotes: enriched.baseNotes || ['مسك أبيض', 'عنبر'],
            mainAccords: enriched.mainAccords || ['أروماتيك'],
            bestSeason: enriched.season,
            bestTime: enriched.timeOfDay || 'كل الأوقات',
            longevity: enriched.longevity || 'ممتاز (10 ساعات)',
            sillage: enriched.sillage || 'فوحان قوي',
            salesPitch: enriched.salesPitch || '',
            layeringSuggestion: enriched.layeringSuggestions || '',
          },
        }));
      }
    } finally {
      setIsSingleAIFilling(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return;

    // Auto-enrich deterministically before saving so every item has full encyclopedia info
    const enriched = autoCorrectAndEnrichItemDeterministic({
      originalInputName: formData.name.trim(),
      name: formData.name.trim(),
      brand: formData.brand || '',
      origin: formData.origin || 'فرنسي',
      gender: (formData.gender as Gender) || 'مشترك',
      season: (formData.season as Season) || 'كل الفصول',
      type: (formData.type as PerfumeType) || 'عادي',
      stock_grams: Number(formData.stock_grams) || 1000,
    });

    const finalAnalysis = formData.analysis || {
      topNotes: enriched.topNotes || ['برغموت'],
      heartNotes: enriched.heartNotes || ['قلب عطري فاخر'],
      baseNotes: enriched.baseNotes || ['عنبر', 'مسك أبيض'],
      mainAccords: enriched.mainAccords || ['أروماتيك'],
      bestSeason: enriched.season,
      bestTime: enriched.timeOfDay || 'كل الأوقات',
      longevity: enriched.longevity || 'ممتاز (10 ساعات)',
      sillage: enriched.sillage || 'فوحان جذاب',
      salesPitch: enriched.salesPitch || '',
      layeringSuggestion: enriched.layeringSuggestions || '',
    };

    let savedProd: Product;

    if (editingProduct) {
      savedProd = {
        ...editingProduct,
        ...formData,
        name: formData.name.trim(),
        brand: formData.brand?.trim() || enriched.brand,
        origin: formData.origin?.trim() || enriched.origin,
        analysis: finalAnalysis,
      } as Product;
      setProducts(products.map((p) => (p.id === editingProduct.id ? savedProd : p)));
    } else if (singleModalDuplicateMatch) {
      // Prevent duplicate: merge stock with existing product
      const addedGrams = Number(formData.stock_grams) || 0;
      savedProd = {
        ...singleModalDuplicateMatch,
        stock_grams: (singleModalDuplicateMatch.stock_grams || 0) + addedGrams,
        analysis: finalAnalysis,
      };
      setProducts(products.map((p) => (p.id === singleModalDuplicateMatch.id ? savedProd : p)));
      if (onSendSmartNotification) {
        onSendSmartNotification(
          `منع تكرار الصنف: تم دمج الرصيد مع «${savedProd.name}»`,
          `تمت إضافة +${addedGrams} جم ليصبح الرصيد الإجمالي ${savedProd.stock_grams} جم ومزامنته سحابياً`,
          'تدقيق آلي',
          'stock'
        );
      }
    } else {
      savedProd = {
        id: Date.now(),
        name: enriched.name,
        brand: formData.brand?.trim() || enriched.brand,
        origin: formData.origin?.trim() || enriched.origin,
        gender: (formData.gender as Gender) || enriched.gender,
        season: (formData.season as Season) || enriched.season,
        timeOfDay: enriched.timeOfDay || 'كل الأوقات',
        type: (formData.type as PerfumeType) || enriched.type,
        stock_grams: Number(formData.stock_grams) || 1000,
        analysis: finalAnalysis,
        occasions: enriched.occasions || ['دوام يومي', 'مناسبات'],
      };
      setProducts([savedProd, ...products]);
      if (onSendSmartNotification) {
        onSendSmartNotification(
          `تم إضافة وتوثيق عطر «${savedProd.name}» (${savedProd.stock_grams} جم)`,
          `تم تصنيف العطر (${savedProd.brand} · ${savedProd.type}) وحفظ الهرم العطري في قاعدة البيانات ومزامنته فوراً`,
          'مزامنة فورية',
          'stock'
        );
      }
    }

    // Save to internal fragrance encyclopedia & sync to cloud
    if (onBulkUpsertFragranceProfiles) {
      const slug = normalizePerfumeNameForAudit(savedProd.name).replace(/\s+/g, '-') || 'item';
      const entry: FragranceDatabaseEntry = {
        id: `frag-${slug}-${savedProd.id}`,
        productId: savedProd.id,
        name: savedProd.name,
        brand: savedProd.brand,
        origin: savedProd.origin,
        type: savedProd.type,
        gender: savedProd.gender,
        concentration: 'زيت عطري خام نقي 100%',
        classification: enriched.classification || 'أروماتيك شرقي فاخر',
        topNotes: finalAnalysis.topNotes,
        heartNotes: finalAnalysis.heartNotes,
        baseNotes: finalAnalysis.baseNotes,
        mainAccords: finalAnalysis.mainAccords,
        generalCharacter: enriched.generalCharacter || 'عطر فاخر ذو ثبات عالٍ',
        longevity: finalAnalysis.longevity,
        sillage: finalAnalysis.sillage,
        bestUses: 'الاستخدام اليومي والمناسبات',
        occasions: savedProd.occasions || ['دوام يومي', 'مناسبات'],
        seasons: [savedProd.season],
        timeOfDay: [savedProd.timeOfDay || 'كل الأوقات'],
        salesPitch: finalAnalysis.salesPitch,
        layeringSuggestions: finalAnalysis.layeringSuggestion,
        inStoreAlternatives: [],
        similarPerfumes: [],
        sourcesRanked: [{ rank: 1, name: 'موسوعة لمسة عطر الذكية', type: 'official_brand' }],
        confidenceDegree: 'عالية',
        confidenceReason: 'تم التحقق والتصنيف عبر محرك الذكاء الاصطناعي للمتجر.',
        approvalStatus: 'معتمد',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      onBulkUpsertFragranceProfiles([entry]);
    }

    setIsModalOpen(false);
  };

  // Handle Bulk CSV / Multi-Item Execution with Audit, Encyclopedia Save & Instant Notification
  const handleExecuteBulkImport = async (result: BulkImportExecutionResult) => {
    setProducts(result.finalProductsList);

    if (onBulkUpsertFragranceProfiles && result.enrichedProfiles.length > 0) {
      await onBulkUpsertFragranceProfiles(result.enrichedProfiles);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-bulk-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'إدخال_مخزون_جماعي',
        actorName: currentUser?.displayName || 'الإدارة',
        description: `تحديث فاتورة مخزون جماعية (${result.invoiceReference || 'بدون مرجع'} - ${result.supplierName || 'مورد'}): إضافة ${result.addedCount} صنف جديد، دمج وتزويد ${result.mergedCount} صنف مكرر، تصحيح إملائي لـ ${result.correctedNamesCount} اسم، وتوثيق ${result.enrichedProfiles.length} ملف بموسوعة العطور بإجمالي +${result.totalGramsAdded.toLocaleString('ar-EG')} جم.`,
        requiresOwnerApproval: false,
        approvalStatus: 'معتمد',
      });
    }

    if (onSendSmartNotification) {
      onSendSmartNotification(
        `تم تحديث المخزون وموسوعة العطور ومزامنتها فوراً (+${result.totalGramsAdded.toLocaleString('ar-EG')} جم)`,
        `أُضيف ${result.addedCount} عطر جديد · دُمج ${result.mergedCount} صنف لمنع التكرار · صُحح ${result.correctedNamesCount} اسم بالـ AI · حُفظ ${result.enrichedProfiles.length} ملف بقاعدة البيانات`,
        'تدقيق ومزامنة AI',
        'stock'
      );
    }
  };

  // One-Click AI Full Inventory Audit, Deduplication, Name Correction & Encyclopedia Sync
  const handleRunFullInventoryAIAuditAndSync = async () => {
    if (products.length === 0 || isRunningInventoryAudit) return;
    setIsRunningInventoryAudit(true);

    try {
      // 1. Deduplicate any existing duplicate items in inventory by merging their grams
      const dedupMap = new Map<string, Product>();
      let mergedDuplicatesCount = 0;

      products.forEach((p) => {
        const norm = normalizePerfumeNameForAudit(p.name);
        const existing = dedupMap.get(norm);
        if (existing) {
          existing.stock_grams = (existing.stock_grams || 0) + (p.stock_grams || 0);
          mergedDuplicatesCount++;
        } else {
          dedupMap.set(norm, { ...p });
        }
      });

      const uniqueProducts = Array.from(dedupMap.values());

      // 2. Run AI Auto-Correction, Classification & Full Encyclopedia Gathering
      const enrichedList = await analyzeClassifyAndEnrichBulkPerfumesWithAI(
        uniqueProducts.map((p) => ({
          id: p.id,
          originalInputName: p.name,
          name: p.name,
          brand: p.brand,
          origin: p.origin,
          gender: p.gender,
          season: p.season,
          type: p.type,
          stock_grams: p.stock_grams,
        }))
      );

      let correctedCount = 0;
      const updatedProducts: Product[] = [];
      const dbProfiles: FragranceDatabaseEntry[] = [];

      uniqueProducts.forEach((origProd, idx) => {
        const enriched = enrichedList[idx] || autoCorrectAndEnrichItemDeterministic(origProd);
        if (enriched.wasNameCorrected) correctedCount++;

        const analysisObj = {
          topNotes: enriched.topNotes || origProd.analysis?.topNotes || ['برغموت'],
          heartNotes: enriched.heartNotes || origProd.analysis?.heartNotes || ['ياسمين'],
          baseNotes: enriched.baseNotes || origProd.analysis?.baseNotes || ['مسك أبيض', 'عنبر'],
          mainAccords: enriched.mainAccords || origProd.analysis?.mainAccords || ['أروماتيك'],
          bestSeason: enriched.season || origProd.season,
          bestTime: enriched.timeOfDay || origProd.timeOfDay || 'كل الأوقات',
          longevity: enriched.longevity || origProd.analysis?.longevity || 'ممتاز (10 ساعات)',
          sillage: enriched.sillage || origProd.analysis?.sillage || 'فوحان قوي وجذاب',
          salesPitch:
            enriched.salesPitch ||
            origProd.analysis?.salesPitch ||
            `عطر ${enriched.name} يمنحك حضوراً فاخراً وثباتاً عالياً.`,
          layeringSuggestion:
            enriched.layeringSuggestions ||
            origProd.analysis?.layeringSuggestion ||
            'يمزج مع مسك الطهارة الأبيض لثبات مضاعف.',
        };

        const finalProd: Product = {
          ...origProd,
          name: enriched.name,
          brand: enriched.brand || origProd.brand,
          origin: enriched.origin || origProd.origin,
          gender: enriched.gender || origProd.gender,
          season: enriched.season || origProd.season,
          timeOfDay: enriched.timeOfDay || origProd.timeOfDay || 'كل الأوقات',
          type: enriched.type || origProd.type,
          analysis: analysisObj,
          occasions: enriched.occasions || origProd.occasions || ['دوام يومي', 'مناسبات', 'سهرة'],
        };

        updatedProducts.push(finalProd);

        const slug = normalizePerfumeNameForAudit(finalProd.name).replace(/\s+/g, '-') || `p-${idx}`;
        dbProfiles.push({
          id: `frag-${slug}-${finalProd.id}`,
          productId: finalProd.id,
          name: finalProd.name,
          brand: finalProd.brand,
          origin: finalProd.origin,
          type: finalProd.type,
          gender: finalProd.gender,
          concentration: 'زيت عطري خام نقي 100%',
          classification: enriched.classification || 'أروماتيك شرقي فاخر',
          topNotes: analysisObj.topNotes,
          heartNotes: analysisObj.heartNotes,
          baseNotes: analysisObj.baseNotes,
          mainAccords: analysisObj.mainAccords,
          generalCharacter: enriched.generalCharacter || 'عطر متوازن ذو حضور أنيق',
          longevity: analysisObj.longevity,
          sillage: analysisObj.sillage,
          bestUses: 'الاستخدام اليومي والمناسبات الخاصة',
          occasions: finalProd.occasions || ['دوام يومي', 'مناسبات'],
          seasons: [finalProd.season],
          timeOfDay: [finalProd.timeOfDay || 'كل الأوقات'],
          salesPitch: analysisObj.salesPitch,
          layeringSuggestions: analysisObj.layeringSuggestion,
          inStoreAlternatives: enriched.similarPerfumes || [],
          similarPerfumes: enriched.similarPerfumes || [],
          sourcesRanked: [
            { rank: 1, name: 'المدقق الذكي وموسوعة لمسة عطر', type: 'official_brand' },
          ],
          confidenceDegree: 'عالية',
          confidenceReason: 'تم التدقيق الشامل وتوحيد الأسماء وبناء الهرم العطري بالذكاء الاصطناعي.',
          approvalStatus: 'معتمد',
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      });

      setProducts(updatedProducts);
      if (onBulkUpsertFragranceProfiles) {
        await onBulkUpsertFragranceProfiles(dbProfiles);
      }

      if (onSendSmartNotification) {
        onSendSmartNotification(
          `اكتمل التدقيق الذكي الشامل وتحديث موسوعة العطور (${updatedProducts.length} عطر)`,
          `تم توثيق ${dbProfiles.length} ملف عطري بقاعدة البيانات · تصحيح ${correctedCount} اسم · دمج ${mergedDuplicatesCount} صنف مكرر ومزامنتها فوراً`,
          'مزامنة شاملة ✓',
          'audit'
        );
      }
    } finally {
      setIsRunningInventoryAudit(false);
    }
  };

  // Export current inventory to CSV
  const handleExportInventoryCsv = () => {
    const header = 'اسم العطر,الماركة,المنشأ,الفئة,الموسم,النوع,الكمية بالجرام,النوتات الافتتاحية,الثبات\n';
    const rows = products
      .map((p) => {
        const top = (p.analysis?.topNotes || []).join(' - ');
        const longv = p.analysis?.longevity || 'ممتاز';
        return `"${p.name}","${p.brand}","${p.origin}","${p.gender}","${p.season}","${p.type}",${p.stock_grams},"${top}","${longv}"`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `مخزون-عطور-لمسة-عطر-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (!productToDelete) return;
    setProducts(products.filter((p) => p.id !== productToDelete.id));
    setProductToDelete(null);
  };

  const handleQuickRestock = () => {
    if (!quickRestockProduct) return;
    const nextStock = Math.max(0, quickRestockProduct.stock_grams + restockAmount);
    setProducts(
      products.map((p) =>
        p.id === quickRestockProduct.id ? { ...p, stock_grams: nextStock } : p
      )
    );
    if (onSendSmartNotification) {
      onSendSmartNotification(
        `تم تزويد رصيد عطر «${quickRestockProduct.name}» (+${restockAmount} جم)`,
        `الرصيد المحدث في المخزون والسحابة الآن: ${nextStock.toLocaleString('ar-EG')} جم`,
        'تزويد فوري',
        'stock'
      );
    }
    setQuickRestockProduct(null);
  };

  // ========================================================
  // CONSUMPTION RATE & SMART PURCHASE RECOMMENDATION ENGINE
  // (تحليل معدل استهلاك العطور وتوصية الشراء الذكية بناءً على مبيعات الشهر الماضي)
  // ========================================================
  const consumptionAnalytics = useMemo(() => {
    const nowMs = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff30DaysMs = nowMs - thirtyDaysMs;

    const liveSales = sales.filter((s) => !s.isReversed && isLiveProductionSale(s));

    // Map productId / normalized name -> consumption stats
    const statsById = new Map<
      string,
      {
        gramsLast30Days: number;
        gramsAllTime: number;
        invoicesLast30Days: number;
        bottlesLast30Days: number;
        revenueLast30Days: number;
        mixUsesCount: number;
      }
    >();

    const getOrCreateStat = (key: string) => {
      let st = statsById.get(key);
      if (!st) {
        st = {
          gramsLast30Days: 0,
          gramsAllTime: 0,
          invoicesLast30Days: 0,
          bottlesLast30Days: 0,
          revenueLast30Days: 0,
          mixUsesCount: 0,
        };
        statsById.set(key, st);
      }
      return st;
    };

    // Map normalized product names to product IDs for fallback matching
    const normNameToProductId = new Map<string, string>();
    products.forEach((p) => {
      normNameToProductId.set(normalizePerfumeNameForAudit(p.name), String(p.id));
    });

    liveSales.forEach((sale) => {
      const saleTime = new Date(sale.date).getTime();
      const isWithinLast30Days = !isNaN(saleTime) ? saleTime >= cutoff30DaysMs : true;
      const seenProductsInInvoice = new Set<string>();

      (sale.items || []).forEach((item) => {
        const qty = Math.max(1, item.quantity || 1);

        if (item.isMix && item.mixComponents && item.mixComponents.length > 0) {
          item.mixComponents.forEach((comp) => {
            const matchedId =
              products.find((p) => String(p.id) === String(comp.productId))?.id ??
              normNameToProductId.get(normalizePerfumeNameForAudit(comp.productName || ''));
            if (matchedId === undefined) return;
            const key = String(matchedId);
            const st = getOrCreateStat(key);
            const compGrams = Math.max(0, (comp.grams || 0) * qty);
            st.gramsAllTime += compGrams;
            if (isWithinLast30Days) {
              st.gramsLast30Days += compGrams;
              st.mixUsesCount += qty;
              const pct = (comp.percentage || 50) / 100;
              st.revenueLast30Days += Math.round((item.sellingPrice || 0) * qty * pct);
              seenProductsInInvoice.add(key);
            }
          });
        } else {
          const matchedId =
            products.find((p) => String(p.id) === String(item.productId))?.id ??
            normNameToProductId.get(normalizePerfumeNameForAudit(item.productName || ''));
          if (matchedId === undefined) return;
          const key = String(matchedId);
          const st = getOrCreateStat(key);
          const itemGrams = Math.max(0, (item.essenceGrams || 0) * qty);
          st.gramsAllTime += itemGrams;
          if (isWithinLast30Days) {
            st.gramsLast30Days += itemGrams;
            st.bottlesLast30Days += qty;
            st.revenueLast30Days += Math.round((item.sellingPrice || 0) * qty);
            seenProductsInInvoice.add(key);
          }
        }
      });

      if (isWithinLast30Days) {
        seenProductsInInvoice.forEach((key) => {
          const st = getOrCreateStat(key);
          st.invoicesLast30Days += 1;
        });
      }
    });

    const items = products.map((product) => {
      const key = String(product.id);
      const stat = statsById.get(key) || {
        gramsLast30Days: 0,
        gramsAllTime: 0,
        invoicesLast30Days: 0,
        bottlesLast30Days: 0,
        revenueLast30Days: 0,
        mixUsesCount: 0,
      };

      // Use last 30 days consumption; if 0 in last 30 days but has historical consumption, use 50% of historical as baseline
      const effectiveMonthlyConsumptionGrams =
        stat.gramsLast30Days > 0
          ? Math.round(stat.gramsLast30Days)
          : stat.gramsAllTime > 0
          ? Math.round(stat.gramsAllTime * 0.5)
          : 0;

      // Daily consumption rate (grams / day)
      const dailyBurnRateGrams = Number((effectiveMonthlyConsumptionGrams / 30).toFixed(2));

      // Days until depletion based on current stock and daily burn rate
      const currentStock = Math.max(0, product.stock_grams || 0);
      const daysUntilDepletion =
        currentStock === 0
          ? 0
          : dailyBurnRateGrams > 0
          ? Math.floor(currentStock / dailyBurnRateGrams)
          : 999;

      // Required stock for target coverage period (30 / 45 / 60 days) + 20% safety buffer
      const minSafeThreshold = product.min_threshold_grams ?? 50;
      const strategicFloor = product.strategicThresholdGrams ?? 100;
      const projectedNeedForPeriod = Math.ceil(dailyBurnRateGrams * targetCoverageDays);
      const safetyBufferGrams =
        effectiveMonthlyConsumptionGrams > 0
          ? Math.max(minSafeThreshold, Math.round(projectedNeedForPeriod * 0.2))
          : currentStock < strategicFloor
          ? strategicFloor
          : 0;

      const targetStockLevelGrams = projectedNeedForPeriod + safetyBufferGrams;
      const rawDeficitGrams = Math.max(0, targetStockLevelGrams - currentStock);

      // Round recommended order quantity to practical supplier wholesale packs (nearest 50g, minimum 100g if ordering)
      const autoRecommendedPurchaseGrams =
        rawDeficitGrams > 0
          ? Math.max(100, Math.ceil(rawDeficitGrams / 50) * 50)
          : currentStock < minSafeThreshold
          ? 100
          : 0;

      const finalRecommendedGrams =
        customPurchaseGramsOverrides[key] !== undefined
          ? customPurchaseGramsOverrides[key]
          : autoRecommendedPurchaseGrams;

      const unitGramCostEgp =
        product.customGramCostEgp && product.customGramCostEgp > 0
          ? product.customGramCostEgp
          : getApprovedOilGramCost(product.type, settings);

      const estimatedPurchaseCostEgp = Math.round(finalRecommendedGrams * unitGramCostEgp);

      // Priority & Smart Recommendation Reason
      let priorityLevel: 'critical' | 'high_velocity' | 'preventive' | 'safe' = 'safe';
      let priorityLabel = 'مخزون آمن ومستقر';
      let recommendationReason = 'الرصيد الحالي يغطي معدل السحب الشهري بأمان.';

      if (currentStock === 0 || (daysUntilDepletion <= 7 && effectiveMonthlyConsumptionGrams > 0) || currentStock <= minSafeThreshold) {
        priorityLevel = 'critical';
        priorityLabel = 'عاجل جداً (حرج)';
        recommendationReason =
          currentStock === 0
            ? 'نفد بالكامل من المخزون ويحتاج توريد فوري.'
            : daysUntilDepletion <= 7
            ? `يكفي ${daysUntilDepletion} أيام فقط بمعدل سحب (${dailyBurnRateGrams} جم/يوم).`
            : `الرصيد (${currentStock} جم) وصل للحد الحرج الأدنى.`;
      } else if (daysUntilDepletion <= 20 || effectiveMonthlyConsumptionGrams >= 150) {
        priorityLevel = 'high_velocity';
        priorityLabel = 'أولوية عالية · سحب سريع';
        recommendationReason = `استهلاك شهري مرتفع (${effectiveMonthlyConsumptionGrams} جم/شهر) · يكفي ${
          daysUntilDepletion === 999 ? 'فترة طويلة' : `${daysUntilDepletion} يوماً`
        }.`;
      } else if (autoRecommendedPurchaseGrams > 0 || currentStock < strategicFloor) {
        priorityLevel = 'preventive';
        priorityLabel = 'تزويد وقائي للشهر القادم';
        recommendationReason =
          effectiveMonthlyConsumptionGrams > 0
            ? `لتغطية استهلاك ${targetCoverageDays} يوماً قادمة مع هامش الأمان.`
            : `تحت حد الأمان الاستراتيجي (${strategicFloor} جم).`;
      }

      return {
        product,
        consumedLast30DaysGrams: Math.round(stat.gramsLast30Days),
        effectiveMonthlyConsumptionGrams,
        invoicesLast30Days: stat.invoicesLast30Days,
        bottlesLast30Days: stat.bottlesLast30Days,
        mixUsesCount: stat.mixUsesCount,
        revenueLast30Days: stat.revenueLast30Days,
        dailyBurnRateGrams,
        daysUntilDepletion,
        rawDeficitGrams,
        autoRecommendedPurchaseGrams,
        finalRecommendedGrams,
        unitGramCostEgp,
        estimatedPurchaseCostEgp,
        priorityLevel,
        priorityLabel,
        recommendationReason,
      };
    });

    // Sort by priority (critical -> high_velocity -> preventive -> safe) then by monthly consumption desc
    const priorityRank = { critical: 0, high_velocity: 1, preventive: 2, safe: 3 };
    items.sort((a, b) => {
      if (priorityRank[a.priorityLevel] !== priorityRank[b.priorityLevel]) {
        return priorityRank[a.priorityLevel] - priorityRank[b.priorityLevel];
      }
      if (b.effectiveMonthlyConsumptionGrams !== a.effectiveMonthlyConsumptionGrams) {
        return b.effectiveMonthlyConsumptionGrams - a.effectiveMonthlyConsumptionGrams;
      }
      return a.product.stock_grams - b.product.stock_grams;
    });

    const totalConsumed30DaysGrams = items.reduce((s, i) => s + i.consumedLast30DaysGrams, 0);
    const recommendedItems = items.filter((i) => i.finalRecommendedGrams > 0);
    const criticalCount = items.filter((i) => i.priorityLevel === 'critical').length;
    const totalRecommendedPurchaseGrams = recommendedItems.reduce((s, i) => s + i.finalRecommendedGrams, 0);
    const totalEstimatedPurchaseCostEgp = recommendedItems.reduce((s, i) => s + i.estimatedPurchaseCostEgp, 0);

    return {
      items,
      totalConsumed30DaysGrams,
      recommendedItemsCount: recommendedItems.length,
      criticalCount,
      totalRecommendedPurchaseGrams,
      totalEstimatedPurchaseCostEgp,
    };
  }, [products, sales, targetCoverageDays, customPurchaseGramsOverrides, settings]);

  const filteredConsumptionItems = useMemo(() => {
    const q = consumptionSearchTerm.trim().toLowerCase();
    return consumptionAnalytics.items.filter((item) => {
      const matchesQuery =
        !q ||
        item.product.name.toLowerCase().includes(q) ||
        item.product.brand.toLowerCase().includes(q) ||
        item.product.type.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (consumptionViewFilter === 'recommended') return item.finalRecommendedGrams > 0 || item.consumedLast30DaysGrams > 0;
      if (consumptionViewFilter === 'critical') return item.priorityLevel === 'critical' || item.priorityLevel === 'high_velocity';
      return true;
    });
  }, [consumptionAnalytics.items, consumptionSearchTerm, consumptionViewFilter]);

  const handleApplySingleRecommendedRestock = (product: Product, gramsToAdd: number) => {
    if (gramsToAdd <= 0) return;
    const nextStock = Math.max(0, (product.stock_grams || 0) + gramsToAdd);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock_grams: nextStock } : p))
    );
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-rec-restock-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentUser?.displayName || 'مدير المتجر',
        action: 'توريد مخزون بناءً على توصية الاستهلاك الشهري',
        entityType: 'product',
        entityId: String(product.id),
        entityName: product.name,
        oldValue: `${product.stock_grams} جم`,
        newValue: `${nextStock} جم (+${gramsToAdd} جم)`,
        reason: `توصية شراء ذكية لتغطية ${targetCoverageDays} يوماً`,
      });
    }
    if (onSendSmartNotification) {
      onSendSmartNotification(
        `تم توريد وإضافة الكمية الموصى بها لعطر «${product.name}» (+${gramsToAdd} جم)`,
        `الرصيد الجديد بالمخزون: ${nextStock.toLocaleString('ar-EG')} جم`,
        'توصية شراء مطبقة ✓',
        'stock'
      );
    }
  };

  const handleExportSmartPurchaseRecommendationsCsv = () => {
    const rowsToExport = consumptionAnalytics.items.filter((i) => i.finalRecommendedGrams > 0);
    const header =
      'اسم العطر,الماركة,النوع,الرصيد الحالي (جم),استهلاك آخر 30 يوم (جم),معدل السحب اليومي (جم/يوم),الأيام المتبقية للنفاد,الكمية الموصى بشرائها (جم),تكلفة الجرام (ج.م),التكلفة التقديرية للشراء (ج.م),الأولوية,سبب التوصية\n';
    const body = rowsToExport
      .map(
        (r) =>
          `"${r.product.name}","${r.product.brand}","${r.product.type}",${r.product.stock_grams},${r.consumedLast30DaysGrams},${r.dailyBurnRateGrams},${
            r.daysUntilDepletion === 999 ? 'آمن' : r.daysUntilDepletion
          },${r.finalRecommendedGrams},${r.unitGramCostEgp},${r.estimatedPurchaseCostEgp},"${r.priorityLabel}","${r.recommendationReason}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `توصيات-شراء-العطور-الذكية-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Resolve FragranceDatabaseEntry or Product.analysis for preview modal
  const getProductEncyclopediaEntry = (product: Product) => {
    const dbEntry = fragranceDatabase.find(
      (f) =>
        f.productId === product.id ||
        normalizePerfumeNameForAudit(f.name) === normalizePerfumeNameForAudit(product.name)
    );
    const det = autoCorrectAndEnrichItemDeterministic(product);
    return {
      classification: dbEntry?.classification || det.classification || 'أروماتيك شرقي فاخر',
      topNotes: dbEntry?.topNotes || product.analysis?.topNotes || det.topNotes || [],
      heartNotes: dbEntry?.heartNotes || product.analysis?.heartNotes || det.heartNotes || [],
      baseNotes: dbEntry?.baseNotes || product.analysis?.baseNotes || det.baseNotes || [],
      mainAccords: dbEntry?.mainAccords || product.analysis?.mainAccords || det.mainAccords || [],
      longevity: dbEntry?.longevity || product.analysis?.longevity || det.longevity || 'ممتاز',
      sillage: dbEntry?.sillage || product.analysis?.sillage || det.sillage || 'قوي وجذاب',
      generalCharacter: dbEntry?.generalCharacter || det.generalCharacter || '',
      salesPitch: dbEntry?.salesPitch || product.analysis?.salesPitch || det.salesPitch || '',
      layeringSuggestions:
        dbEntry?.layeringSuggestions ||
        product.analysis?.layeringSuggestion ||
        det.layeringSuggestions ||
        '',
    };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header & Bulk / CSV / AI Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              <span className="gemini-text-gradient">إدارة المخزون الخام وموسوعة العطور الذكية</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={12} />
              <span>مدقق منع التكرار + مزامنة فورية</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#86868B] mt-0.5">
            رفع فواتير CSV، إدخال سريع لعدة عطور دفعة واحدة (Bulk Add)، وتصحيح الأسماء وبناء الموسوعة العطرية بالذكاء الاصطناعي
          </p>
        </div>

        {canAdd && (
          <div className="flex items-center flex-wrap gap-2">
            {/* Button 1: Direct CSV Upload */}
            <button
              type="button"
              onClick={() => {
                setBulkInitialTab('csv_upload');
                setIsBulkModalOpen(true);
              }}
              className="apple-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>رفع ملف CSV / فاتورة</span>
            </button>

            {/* Button 2: Fast Multi-Perfume Bulk Add */}
            <button
              type="button"
              onClick={() => {
                setBulkInitialTab('manual_table');
                setIsBulkModalOpen(true);
              }}
              className="apple-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-l from-[#1D1D1F] to-[#3A3A3C] hover:bg-black text-white text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              <Layers size={15} className="text-[#C49746]" />
              <span>إدخال عدة عطور دفعة واحدة (Bulk Add)</span>
            </button>

            {/* Button 3: AI Full Audit & Encyclopedia Sync */}
            <button
              type="button"
              onClick={handleRunFullInventoryAIAuditAndSync}
              disabled={isRunningInventoryAudit}
              className="apple-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black transition-all cursor-pointer disabled:opacity-50"
              title="يفحص المخزون بالكامل، يدمج أي مكرر، يصحح الأسماء، ويجمع معلومات كل العطور في قاعدة البيانات"
            >
              <RefreshCw size={14} className={isRunningInventoryAudit ? 'animate-spin' : ''} />
              <span>
                {isRunningInventoryAudit
                  ? 'جاري تدقيق وتحديث الموسوعة...'
                  : 'تدقيق وتصحيح المخزون بالـ AI ✨'}
              </span>
            </button>

            {/* Button 4: Single Perfume Add */}
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="apple-btn flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black shadow-apple-sm transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>+ إضافة عطر منفرد</span>
            </button>
          </div>
        )}
      </div>

      {/* Alert Banner if Existing Inventory Contains Duplicates */}
      {existingInventoryDuplicates.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs text-amber-950">
            <ShieldAlert size={20} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-black block">
                تنبيه التدقيق الآلي (Audit): تم رصد ({existingInventoryDuplicates.length}) صنف مكرر في المخزون الحالي!
              </span>
              <span className="text-[11px] text-amber-800">
                اضغط على «دمج الأصناف المكررة وتوحيد الأسماء» لجمع أرصدتها بالجرام ومنع التكرار فوراً.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunFullInventoryAIAuditAndSync}
            className="apple-btn px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 cursor-pointer"
          >
            دمج المكرر وتوحيد الأسماء الآن
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-[#86868B]">إجمالي الأصناف المدققة</span>
          <div className="text-2xl font-bold text-[#1D1D1F] mt-1 font-mono">
            {products.length} <span className="text-xs font-normal text-[#86868B]">عطر</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">نواقص المخزون</span>
            {lowStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-ping"></span>
            )}
          </div>
          <div className="text-2xl font-bold text-[#FF3B30] mt-1 font-mono">
            {lowStockCount} <span className="text-xs font-normal text-[#86868B]">أقل من 100 جم</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-[#86868B]">إجمالي الوزن بالكيلو</span>
          <div className="text-2xl font-bold text-[#0071E3] mt-1 font-mono">
            {(totalStockGrams / 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#86868B]">كجم</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-[#86868B]">أرصدة الزيت بالجرام</span>
          <div className="text-2xl font-bold text-[#1D1D1F] mt-1 font-mono">
            {totalStockGrams.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-normal text-[#86868B]">جم</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-50/70 to-blue-50/50 border border-purple-200/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900">موسوعة العطور الداخلية</span>
            <Database size={14} className="text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-950 mt-1 font-mono">
            {documentedInDbCount} / {products.length}{' '}
            <span className="text-[11px] font-bold text-purple-700">موثق بالـ AI</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CONSUMPTION RATE & SMART PURCHASE RECOMMENDATION SECTION */}
      {/* (تحليل معدل استهلاك العطور وتوصية الشراء الذكية بناءً على مبيعات الشهر الماضي) */}
      {/* ======================================================== */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Top Executive Header of Consumption & Purchase Engine */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-sm">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  تحليل معدل استهلاك العطور وتوصيات الشراء الذكية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black">
                  بناءً على مبيعات الشهر الماضي (آخر 30 يوماً)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                يحسب السحب الفعلي بالجرام (عبوات فردية + مكونات الميكس) ويحدد الكمية المثالية للشراء لكل عطر قبل نفاده
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Target Coverage Days Selector */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
              <span className="text-[10px] font-bold text-slate-300 px-2">خطة التغطية:</span>
              {([30, 45, 60] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTargetCoverageDays(days)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    targetCoverageDays === days
                      ? 'bg-[#0071E3] text-white shadow-2xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {days} يوم
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportSmartPurchaseRecommendationsCsv}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>تصدير أمر الشراء (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConsumptionSection((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {showConsumptionSection ? 'طي القسم ▲' : 'عرض التحليل والتوصيات ▼'}
            </button>
          </div>
        </div>

        {showConsumptionSection && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* 4 KPI Summary Cards for Consumption & Recommended Purchases */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>استهلاك الشهر الماضي (30 يوماً)</span>
                  <Calendar size={14} className="text-[#0071E3]" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-mono text-slate-900">
                    {consumptionAnalytics.totalConsumed30DaysGrams.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    جم ({(consumptionAnalytics.totalConsumed30DaysGrams / 1000).toFixed(2)} كجم)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 font-mono">
                  بمعدل سحب يومي: {(consumptionAnalytics.totalConsumed30DaysGrams / 30).toFixed(1)} جم / يوم
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-rose-800 font-bold">
                  <span>عطور موصى بشرائها الآن</span>
                  <AlertTriangle size={14} className="text-rose-600" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-mono text-rose-700">
                    {consumptionAnalytics.recommendedItemsCount}
                  </span>
                  <span className="text-xs font-bold text-rose-800">
                    صنف ({consumptionAnalytics.criticalCount} حرج عاجل)
                  </span>
                </div>
                <span className="text-[10px] text-rose-700 mt-1">
                  بناءً على سرعة السحب والأيام المتبقية للنفاد
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#0071E3] font-bold">
                  <span>إجمالي الكمية الموصى بشرائها</span>
                  <ShoppingCart size={14} className="text-[#0071E3]" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-mono text-[#0071E3]">
                    {consumptionAnalytics.totalRecommendedPurchaseGrams.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    جم ({(consumptionAnalytics.totalRecommendedPurchaseGrams / 1000).toFixed(2)} كجم)
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 mt-1">
                  لتأمين مبيعات {targetCoverageDays} يوماً قادمة + رصيد أمان
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                  <span>التكلفة التقديرية لخطة الشراء</span>
                  <Sparkles size={14} className="text-amber-600" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-mono text-amber-950">
                    {consumptionAnalytics.totalEstimatedPurchaseCostEgp.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-xs font-bold text-amber-800">{settings.currency}</span>
                </div>
                <span className="text-[10px] text-amber-800 mt-1">
                  محسوبة بتكلفة الجرام الفعلية لكل فئة عطرية
                </span>
              </div>
            </div>

            {/* Filter & Search Bar for Consumption Table */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {([
                  {
                    id: 'recommended' as const,
                    label: `الموصى بشرائها والأعلى سحباً (${
                      consumptionAnalytics.items.filter((i) => i.finalRecommendedGrams > 0 || i.consumedLast30DaysGrams > 0).length
                    })`,
                  },
                  {
                    id: 'critical' as const,
                    label: `الحرجة وعاجلة التوريد (${
                      consumptionAnalytics.items.filter((i) => i.priorityLevel === 'critical' || i.priorityLevel === 'high_velocity').length
                    })`,
                  },
                  {
                    id: 'all' as const,
                    label: `جميع العطور بالمخزون (${products.length})`,
                  },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setConsumptionViewFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      consumptionViewFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="بحث في تحليل الاستهلاك والتوصيات..."
                  value={consumptionSearchTerm}
                  onChange={(e) => setConsumptionSearchTerm(e.target.value)}
                  className="w-full h-9 pr-9 pl-3 rounded-xl bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#0071E3] text-xs font-bold text-slate-900 outline-none"
                />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Consumption Analysis & Smart Purchase Recommendation Table */}
            <div className="rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="max-h-[460px] overflow-y-auto modal-scroll-area">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-black text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">العطر والماركة</th>
                      <th className="py-2.5 px-3 text-center">الرصيد الحالي</th>
                      <th className="py-2.5 px-3 text-center">استهلاك آخر 30 يوم</th>
                      <th className="py-2.5 px-3 text-center">معدل السحب اليومي</th>
                      <th className="py-2.5 px-3 text-center">الأيام المتبقية للنفاد</th>
                      <th className="py-2.5 px-3 text-center">الأولوية والتحليل</th>
                      <th className="py-2.5 px-3 text-center">الكمية الموصى بشرائها</th>
                      <th className="py-2.5 px-3 text-center">التكلفة التقديرية</th>
                      <th className="py-2.5 px-3 text-left">إجراء سريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs bg-white">
                    {filteredConsumptionItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 font-bold">
                          لا توجد عطور مطابقة لهذا الفلتر حالياً — جرب التبديل إلى «جميع العطور بالمخزون»
                        </td>
                      </tr>
                    ) : (
                      filteredConsumptionItems.map((row) => {
                        const key = String(row.product.id);
                        const badgeColors =
                          row.priorityLevel === 'critical'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : row.priorityLevel === 'high_velocity'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : row.priorityLevel === 'preventive'
                            ? 'bg-blue-50 text-[#0071E3] border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                        return (
                          <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                            {/* 1. Perfume Name & Brand */}
                            <td className="py-2.5 px-3">
                              <div className="font-black text-slate-900">{row.product.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {row.product.brand} · {row.product.type}
                                {row.mixUsesCount > 0 ? ` · دخل في ${row.mixUsesCount} ميكس` : ''}
                              </div>
                            </td>

                            {/* 2. Current Stock */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span
                                className={`font-black ${
                                  row.product.stock_grams <= (row.product.min_threshold_grams ?? 50)
                                    ? 'text-rose-600'
                                    : row.product.stock_grams < 100
                                    ? 'text-amber-600'
                                    : 'text-slate-900'
                                }`}
                              >
                                {row.product.stock_grams} جم
                              </span>
                            </td>

                            {/* 3. Last 30 Days Consumption */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="font-mono font-black text-slate-900">
                                {row.consumedLast30DaysGrams > 0
                                  ? `${row.consumedLast30DaysGrams} جم`
                                  : row.effectiveMonthlyConsumptionGrams > 0
                                  ? `${row.effectiveMonthlyConsumptionGrams} جم (تاريخي)`
                                  : '0 جم'}
                              </div>
                              {row.invoicesLast30Days > 0 && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {row.invoicesLast30Days} فاتورة · {row.revenueLast30Days.toLocaleString('ar-EG')} ج
                                </span>
                              )}
                            </td>

                            {/* 4. Daily Burn Rate */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span className="font-bold text-[#0071E3]">
                                {row.dailyBurnRateGrams} جم/يوم
                              </span>
                            </td>

                            {/* 5. Days Until Depletion */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              {row.daysUntilDepletion === 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px]">
                                  نفد (0 يوم)
                                </span>
                              ) : row.daysUntilDepletion === 999 ? (
                                <span className="text-emerald-700 font-bold text-[11px]">+90 يوماً</span>
                              ) : (
                                <span
                                  className={`font-black ${
                                    row.daysUntilDepletion <= 7
                                      ? 'text-rose-600'
                                      : row.daysUntilDepletion <= 20
                                      ? 'text-amber-600'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {row.daysUntilDepletion} يوم
                                </span>
                              )}
                            </td>

                            {/* 6. Priority & Reason */}
                            <td className="py-2.5 px-3 text-center max-w-[210px]">
                              <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-black ${badgeColors}`}>
                                {row.priorityLabel}
                              </span>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug truncate" title={row.recommendationReason}>
                                {row.recommendationReason}
                              </p>
                            </td>

                            {/* 7. Recommended Purchase Quantity (Editable Grams) */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200/80">
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  value={row.finalRecommendedGrams}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                                    setCustomPurchaseGramsOverrides((prev) => ({
                                      ...prev,
                                      [key]: val,
                                    }));
                                  }}
                                  className="w-16 h-6 rounded-lg bg-white border border-slate-200 text-center font-mono font-black text-xs text-[#0071E3] outline-none focus:border-[#0071E3]"
                                />
                                <span className="text-[10px] font-bold text-slate-600">جم</span>
                              </div>
                            </td>

                            {/* 8. Estimated Purchase Cost */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span className="font-black text-slate-900">
                                {row.estimatedPurchaseCostEgp.toLocaleString('ar-EG')} {settings.currency}
                              </span>
                              <span className="block text-[9.5px] text-slate-400">
                                ({row.unitGramCostEgp} ج/جم)
                              </span>
                            </td>

                            {/* 9. Quick Action (1-Click Restock with Recommended Quantity) */}
                            <td className="py-2.5 px-3 text-left">
                              {canRestock && row.finalRecommendedGrams > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApplySingleRecommendedRestock(row.product, row.finalRecommendedGrams)
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
                                  title="إضافة الكمية الموصى بها إلى رصيد المخزون فوراً"
                                >
                                  <PlusCircle size={12} />
                                  <span>توريد +{row.finalRecommendedGrams}جم</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700">مكتفٍ ✓</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="apple-glass-card rounded-3xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث بالاسم، الماركة، أو بلد المنشأ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="gemini-field field-border-blue w-full h-11 pr-11 pl-4 rounded-xl bg-white text-xs font-medium text-[#1D1D1F] placeholder:text-[#86868B]"
            />
            <Search
              size={18}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868B]"
            />
          </div>

          {/* Low Stock Quick Toggle */}
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`apple-btn flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showLowStockOnly
                ? 'bg-[#FF3B30] text-white border-[#FF3B30] shadow-xs'
                : 'bg-white text-[#48484A] border-black/[0.08] hover:bg-black/[0.02]'
            }`}
          >
            <AlertTriangle size={15} />
            <span>نواقص المخزون ({lowStockCount})</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportInventoryCsv}
            className="apple-btn flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-[#1D1D1F] border border-black/[0.08] hover:bg-black/[0.03] cursor-pointer"
          >
            <Download size={14} />
            <span>تصدير CSV</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.06]">
          <span className="text-xs text-[#86868B] ml-1">نوع العطر:</span>
          <div className="apple-segmented-bg flex items-center flex-wrap gap-1">
            {(['all', 'عادي', 'نيش', 'مسك', 'عود'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterType === t
                    ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {t === 'all' ? 'الكل' : t}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#86868B] mr-2 ml-1">الفئة:</span>
          <div className="apple-segmented-bg flex items-center flex-wrap gap-1">
            {(['all', 'رجالي', 'نسائي', 'مشترك'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setFilterGender(g)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterGender === g
                    ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {g === 'all' ? 'الكل' : g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE CARDS VIEW (Visible on < md)                     */}
      {/* ======================================================== */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map((product) => {
          const isLow = product.stock_grams < 100;
          return (
            <div
              key={product.id}
              className="apple-glass-card rounded-2xl p-4 border border-black/[0.06] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        product.type === 'عادي'
                          ? 'bg-blue-50 text-blue-700'
                          : product.type === 'نيش'
                          ? 'bg-teal-50 text-teal-800'
                          : product.type === 'مسك'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {product.type}
                    </span>
                    <span className="text-[10px] text-[#86868B]">
                      {product.gender} · {product.season}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#1D1D1F]">{product.name}</h3>
                  <p className="text-xs text-[#86868B]">
                    {product.brand} · {product.origin}
                  </p>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-[#86868B] block">المخزون</span>
                  <span
                    className={`font-mono text-base font-bold ${
                      isLow ? 'text-[#FF3B30]' : 'text-[#34C759]'
                    }`}
                  >
                    {product.stock_grams} جم
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setQuickRestockProduct(product);
                      setRestockAmount(500);
                    }}
                    className="apple-btn flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/[0.04] text-xs font-semibold text-[#1D1D1F] hover:bg-black/[0.08]"
                  >
                    <PlusCircle size={14} />
                    <span>تزويد</span>
                  </button>
                  <button
                    onClick={() => setSelectedProfileProduct(product)}
                    className="apple-btn flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 text-[11px] font-bold"
                  >
                    <Eye size={13} />
                    <span>موسوعة العطر</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="p-2 rounded-xl text-[#0071E3] hover:bg-[#0071E3]/10 transition-colors"
                    title="تعديل"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setProductToDelete(product)}
                    className="p-2 rounded-xl text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* DESKTOP TABLE VIEW (Visible on md+)                     */}
      {/* ======================================================== */}
      <div className="hidden md:block apple-glass-card rounded-3xl overflow-hidden shadow-apple-card border border-black/[0.06]">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-black/[0.02] border-b border-black/[0.06] text-[#86868B]">
              <th className="py-3.5 px-4 font-semibold">اسم العطر والهرم العطري</th>
              <th className="py-3.5 px-4 font-semibold">النوع</th>
              <th className="py-3.5 px-4 font-semibold">الماركة والمنشأ</th>
              <th className="py-3.5 px-4 font-semibold">الفئة والموسم</th>
              <th className="py-3.5 px-4 font-semibold">المخزون (جرام)</th>
              <th className="py-3.5 px-4 font-semibold text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {filteredProducts.map((product) => {
              const isLow = product.stock_grams < 100;
              const enc = getProductEncyclopediaEntry(product);
              return (
                <tr key={product.id} className="hover:bg-black/[0.02] transition-colors group">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#1D1D1F] text-sm flex items-center gap-2">
                      <span>{product.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedProfileProduct(product)}
                        className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/70 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        title="عرض البطاقة العطرية الكاملة المحفوظة بقاعدة البيانات"
                      >
                        <Sparkles size={10} />
                        <span>موسوعة AI</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-[#86868B] mt-0.5 truncate max-w-xs">
                      {enc.topNotes.slice(0, 3).join(' · ')}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        product.type === 'عادي'
                          ? 'bg-blue-50 text-blue-700'
                          : product.type === 'نيش'
                          ? 'bg-teal-50 text-teal-800'
                          : product.type === 'مسك'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {product.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#48484A]">
                    <div className="font-semibold text-[#1D1D1F]">{product.brand}</div>
                    <div className="text-[11px] text-[#86868B]">{product.origin}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#86868B]">
                    <div>
                      {product.gender} · {product.season}
                    </div>
                    <div className="text-[10px] text-[#0071E3] font-semibold">{enc.longevity}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isLow ? 'text-[#FF3B30]' : 'text-[#34C759]'
                        }`}
                      >
                        {product.stock_grams} جم
                      </span>
                      {isLow && (
                        <span className="text-[10px] text-[#FF3B30] bg-red-50 px-2 py-0.5 rounded-md font-semibold">
                          ناقص
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-left">
                    <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setSelectedProfileProduct(product)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[11px] font-bold text-purple-800 transition-colors cursor-pointer"
                      >
                        النوتات والملف
                      </button>
                      {canRestock && (
                        <button
                          onClick={() => {
                            setQuickRestockProduct(product);
                            setRestockAmount(500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[11px] font-medium text-[#1D1D1F] transition-colors cursor-pointer"
                        >
                          + تزويد
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-1.5 rounded-lg text-[#0071E3] hover:bg-[#0071E3]/10 transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setProductToDelete(product)}
                          className="p-1.5 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 size={15} />
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

      {filteredProducts.length === 0 && (
        <div className="apple-glass-card rounded-3xl p-12 text-center text-[#86868B] space-y-2">
          <Package size={36} className="mx-auto text-[#AEAEB2]" />
          <p className="font-semibold text-base text-[#1D1D1F]">لا توجد نتائج مطابقة</p>
          <p className="text-xs">جرّب تغيير معايير البحث أو تصفية الأنواع</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* BULK CSV & MULTI-PERFUME AI IMPORTER MODAL               */}
      {/* ======================================================== */}
      <BulkPerfumeImporterModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        existingProducts={products}
        onExecuteBulkImport={handleExecuteBulkImport}
        initialTab={bulkInitialTab}
      />

      {/* ======================================================== */}
      {/* FRAGRANCE ENCYCLOPEDIA PROFILE PREVIEW MODAL             */}
      {/* ======================================================== */}
      {selectedProfileProduct && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProfileProduct(null);
          }}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm smart-modal-overlay animate-in fade-in duration-150"
        >
          {(() => {
            const info = getProductEncyclopediaEntry(selectedProfileProduct);
            return (
              <div className="apple-glass-card smart-modal-window rounded-3xl w-full max-w-lg overflow-hidden shadow-apple-lg border border-black/[0.08] bg-white flex flex-col">
                <div className="p-5 border-b border-black/[0.06] flex items-center justify-between bg-gradient-to-l from-[#1D1D1F] to-[#2C2C2E] text-white">
                  <div>
                    <span className="text-[10px] font-bold text-amber-300 block">
                      بطاقة موسوعة العطور الموثقة بقاعدة البيانات الداخلية
                    </span>
                    <h3 className="font-black text-base sm:text-lg">{selectedProfileProduct.name}</h3>
                    <p className="text-xs text-zinc-300">
                      {selectedProfileProduct.brand} · {selectedProfileProduct.origin} · {info.classification}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProfileProduct(null)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/60">
                      <span className="font-black text-blue-950 block mb-1">الافتتاحية</span>
                      <p className="text-[#48484A] leading-relaxed">{info.topNotes.join('، ')}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/60">
                      <span className="font-black text-purple-950 block mb-1">قلب العطر</span>
                      <p className="text-[#48484A] leading-relaxed">{info.heartNotes.join('، ')}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60">
                      <span className="font-black text-amber-950 block mb-1">القاعدة العطرية</span>
                      <p className="text-[#48484A] leading-relaxed">{info.baseNotes.join('، ')}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#1D1D1F]">الأكوردات الرئيسية:</span>
                      <span className="font-bold text-[#0071E3]">{info.mainAccords.join(' · ')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#1D1D1F]">الثبات والفوحان:</span>
                      <span className="font-bold text-emerald-700">
                        {info.longevity} | {info.sillage}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                    <span className="font-black text-emerald-950 block">
                      💬 جملة الإقناع البيعية للكاشير:
                    </span>
                    <p className="text-emerald-900 font-semibold leading-relaxed">
                      &ldquo;{info.salesPitch}&rdquo;
                    </p>
                    {info.layeringSuggestions && (
                      <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                        <strong>نصيحة الدمج (Layering):</strong> {info.layeringSuggestions}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT SINGLE PERFUME MODAL (With AI Auto-Correct)   */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm smart-modal-overlay">
          <div className="apple-glass-card smart-modal-window rounded-3xl w-full max-w-xl overflow-hidden shadow-apple-lg border border-black/[0.08] animate-in fade-in zoom-in-95 duration-200 bg-white flex flex-col">
            <div className="px-5 py-3.5 border-b border-black/[0.06] flex items-center justify-between bg-black/[0.02] shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-[#1D1D1F]">
                {editingProduct ? 'تعديل بيانات العطر' : 'إضافة عطر خام جديد (مع تدقيق وتصنيف ذكي)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs flex-1 overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-[#1D1D1F]">اسم العطر بالكامل *</label>
                  <button
                    type="button"
                    onClick={handleAutoCorrectSingleModal}
                    disabled={!formData.name?.trim() || isSingleAIFilling}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0071E3] text-[11px] font-black inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <Wand2 size={12} />
                    <span>
                      {isSingleAIFilling
                        ? 'جاري التصحيح والتصنيف...'
                        : 'تصحيح الاسم وتعبئة التصنيف بالـ AI ✨'}
                    </span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: سوفاج اليكسر / بكرات روج"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="gemini-field field-border-blue w-full h-11 px-3.5 rounded-xl bg-white text-xs font-bold text-[#1D1D1F]"
                />

                {singleModalDuplicateMatch && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[11px] font-bold flex items-center gap-2">
                    <ShieldAlert size={15} className="text-amber-600 shrink-0" />
                    <span>
                      تدقيق منع التكرار: هذا العطر موجود بالفعل بالمخزون ({singleModalDuplicateMatch.stock_grams} جم). عند الحفظ سيتم دمج وتزويد الرصيد تلقائياً بدلاً من تكرار الصنف!
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">الماركة (Brand)</label>
                  <input
                    type="text"
                    placeholder="مثال: ديور / ناسوماتو"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="gemini-field field-border-purple w-full h-11 px-3.5 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">بلد المنشأ</label>
                  <input
                    type="text"
                    placeholder="مثال: فرنسي، إيطالي"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="gemini-field field-border-emerald w-full h-11 px-3.5 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">
                    نوع الخام (يحدد التكلفة)
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="gemini-field field-border-amber w-full h-11 px-3 rounded-xl bg-white text-xs font-medium text-[#1D1D1F]"
                  >
                    <option value="عادي">🧴 عادي (10 ج.م/جم)</option>
                    <option value="نيش">🌿 نيش (15 ج.م/جم)</option>
                    <option value="مسك">🟤 مسك (20 ج.م/جم)</option>
                    <option value="عود">🟤 عود (20 ج.م/جم)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">
                    {singleModalDuplicateMatch
                      ? 'الكمية المضافة على الرصيد الحالي (جرام)'
                      : 'الرصيد الافتتاحي (جرام)'}
                  </label>
                  <input
                    type="number"
                    value={formData.stock_grams}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_grams: Number(e.target.value) })
                    }
                    className="gemini-field field-border-rose w-full h-11 px-3.5 rounded-xl bg-white text-xs font-medium text-[#1D1D1F] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">الفئة المستهدفة</label>
                  <div className="apple-segmented-bg flex items-center p-1">
                    {(['رجالي', 'نسائي', 'مشترك'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          formData.gender === g
                            ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                            : 'text-[#86868B]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">الموسم المفضل</label>
                  <select
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value as any })}
                    className="w-full h-11 px-3 rounded-xl bg-white border border-black/[0.08] text-xs font-medium text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
                  >
                    <option value="صيف">صيف</option>
                    <option value="شتاء">شتاء</option>
                    <option value="كل الفصول">كل الفصول</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/[0.02] border-t border-black/[0.06] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="apple-btn px-4 py-2.5 rounded-xl bg-black/[0.05] text-[#1D1D1F] text-xs font-semibold hover:bg-black/[0.08]"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name?.trim()}
                className="apple-btn px-6 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {editingProduct
                  ? 'حفظ التعديلات والمزامنة'
                  : singleModalDuplicateMatch
                  ? 'دمج وتزويد الرصيد (منع التكرار)'
                  : 'إضافة وتوثيق في قاعدة البيانات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK RESTOCK MODAL (Apple Sheet Style)                 */}
      {/* ======================================================== */}
      {quickRestockProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm smart-modal-overlay">
          <div className="apple-glass-card smart-modal-window rounded-3xl w-full max-w-sm overflow-hidden p-5 space-y-3.5 shadow-apple-lg border border-black/[0.08] text-center bg-white">
            <div className="w-12 h-12 rounded-full bg-[#0071E3]/15 text-[#0071E3] flex items-center justify-center mx-auto">
              <Package size={24} />
            </div>

            <div>
              <h3 className="font-bold text-base text-[#1D1D1F]">
                تزويد رصيد {quickRestockProduct.name}
              </h3>
              <p className="text-xs text-[#86868B] mt-1">
                الرصيد الحالي: {quickRestockProduct.stock_grams} جرام
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#86868B] block">
                الكمية المضافة (جرام):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRestockAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      restockAmount === amt
                        ? 'bg-[#0071E3] text-white border-[#0071E3]'
                        : 'bg-white text-[#1D1D1F] border-black/[0.08]'
                    }`}
                  >
                    +{amt} جم
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={restockAmount}
                onChange={(e) => setRestockAmount(Number(e.target.value))}
                className="w-full h-11 px-3 text-center rounded-xl bg-white border border-black/[0.08] font-mono text-base font-bold text-[#1D1D1F] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setQuickRestockProduct(null)}
                className="apple-btn py-2.5 rounded-xl bg-black/[0.05] text-[#1D1D1F] text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={handleQuickRestock}
                className="apple-btn py-2.5 rounded-xl bg-[#0071E3] text-white text-xs font-semibold shadow-sm"
              >
                تأكيد الإضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION DIALOG (Apple Action Sheet Style)    */}
      {/* ======================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm smart-modal-overlay">
          <div className="apple-glass-card smart-modal-window rounded-3xl w-full max-w-sm overflow-hidden p-5 text-center space-y-3.5 shadow-apple-lg border border-black/[0.08] bg-white">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#FF3B30] flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1D1D1F]">حذف العطر من المخزون</h3>
              <p className="text-xs text-[#86868B] mt-1">
                هل أنت متأكد من حذف &ldquo;{productToDelete.name}&rdquo;؟ لن تتمكن من التراجع عن هذه العملية.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="apple-btn py-2.5 rounded-xl bg-black/[0.05] text-[#1D1D1F] text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="apple-btn py-2.5 rounded-xl bg-[#FF3B30] text-white text-xs font-semibold hover:bg-red-600 shadow-sm"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
