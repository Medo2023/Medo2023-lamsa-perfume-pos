import React, { useState, useMemo, useEffect } from 'react';
import { 
  Product, 
  BottleSize, 
  StoreSettings, 
  Sale, 
  Expense,
  ProductionBatch, 
  AuditLogRecord,
  FragranceIntel,
  RecipeProposal,
  FinancialAuditAnomaly,
  PackagingOption,
  DEFAULT_PACKAGING_OPTIONS,
  APPROVED_OPERATIONAL_RECIPES,
  DEFAULT_BOTTLE_SIZES,
  getApprovedOilGramCost,
  calculateDerivedProductCost,
  getApprovedSellingPrice,
  calculatePackagingAccounting,
  calculateMinSafeNetPrice,
  calculateMaxSafeDiscount,
  calculateInstantContribution,
  OperationalRecipeSpec
} from '../types';
import { 
  searchFragranceIntelligence, 
  proposeRecipeOptimization, 
  performFinancialAIAudit 
} from '../services/geminiService';
import { 
  Beaker, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Sliders, 
  Check, 
  X, 
  Plus, 
  Minus,
  History, 
  Search, 
  HelpCircle, 
  FileText, 
  Tag, 
  TrendingUp, 
  Clock, 
  Box, 
  CheckCircle2, 
  ArrowRight,
  Printer,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Lock,
  RotateCcw,
  Droplets,
  Flame,
  Info,
  Award,
  BookOpen,
  Gauge
} from 'lucide-react';

interface ProductFormulationEngineProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  bottleSizes: BottleSize[];
  setBottleSizes: React.Dispatch<React.SetStateAction<BottleSize[]>>;
  settings: StoreSettings;
  sales: Sale[];
  expenses: Expense[];
  batches: ProductionBatch[];
  onSaveBatch: (batch: ProductionBatch) => void;
  auditLogs: AuditLogRecord[];
  onAddAuditLog: (log: AuditLogRecord) => void;
  onNavigateToPOS?: (product: Product, sizeMl: number, grams: number) => void;
  initialProduct?: Product | null;
}

type EngineTab = 'formulation' | 'batches' | 'intel' | 'auditor' | 'audit_trail';

// Helper to compute dynamic operational recipe for ANY user-defined size in ML
const getDynamicOperationalRecipe = (sizeMl: number, isRollOnMode: boolean): OperationalRecipeSpec => {
  const cleanSize = Math.max(2, Math.round(sizeMl || 50));
  if (!isRollOnMode && APPROVED_OPERATIONAL_RECIPES[cleanSize] && !APPROVED_OPERATIONAL_RECIPES[cleanSize].isRollOn) {
    return APPROVED_OPERATIONAL_RECIPES[cleanSize];
  }
  if (isRollOnMode && APPROVED_OPERATIONAL_RECIPES[cleanSize] && APPROVED_OPERATIONAL_RECIPES[cleanSize].isRollOn) {
    return APPROVED_OPERATIONAL_RECIPES[cleanSize];
  }
  if (isRollOnMode) {
    return {
      sizeMl: cleanSize,
      oilGrams: cleanSize,
      fixativeGrams: 0,
      alcoholMethod: 'زيت عطري صافي (بيور) بدون كحول — مخصص لعبوات الرول والتعتيق المركز',
      officialCost: Math.max(20, Math.round(cleanSize * 9)),
      standardNormalPrice: Math.max(35, Math.round(cleanSize * 14)),
      standardSpecialPrice: Math.max(50, Math.round(cleanSize * 20)),
      isRollOn: true,
    };
  }
  const oilGrams = Math.max(3, Math.round(cleanSize * 0.34));
  const fixativeGrams = cleanSize >= 80 ? 2 : 1;
  return {
    sizeMl: cleanSize,
    oilGrams,
    fixativeGrams,
    alcoholMethod: `خلط ${oilGrams} جم زيت خام + ${fixativeGrams} جم مثبت جزيئي ثم استكمال العبوة (${Math.max(0, cleanSize - oilGrams - fixativeGrams)} مل) بكحول إيثيلي طبي 96%`,
    officialCost: Math.max(45, Math.round(cleanSize * 3.5)),
    standardNormalPrice: Math.max(70, Math.round(cleanSize * 4.6)),
    standardSpecialPrice: Math.max(120, Math.round(cleanSize * 9)),
    isRollOn: false,
  };
};

const ProductFormulationEngine: React.FC<ProductFormulationEngineProps> = ({
  products,
  setProducts,
  bottleSizes,
  settings,
  sales,
  expenses,
  batches,
  onSaveBatch,
  auditLogs,
  onAddAuditLog,
  onNavigateToPOS,
  initialProduct,
}) => {
  const [activeTab, setActiveTab] = useState<EngineTab>('formulation');
  const [showExpertGuide, setShowExpertGuide] = useState<boolean>(true);

  // Selected product and size for formulation
  const [selectedProduct, setSelectedProduct] = useState<Product>(() => initialProduct || products[0] || {
    id: 1,
    name: 'خمرة',
    brand: 'لطافة',
    origin: 'إماراتي',
    gender: 'مشترك',
    season: 'شتاء',
    type: 'عادي',
    stock_grams: 1000
  });

  useEffect(() => {
    if (initialProduct) {
      setSelectedProduct(initialProduct);
    }
  }, [initialProduct]);

  // Free user-defined size state (Not locked to fixed sizes)
  const [selectedSizeMl, setSelectedSizeMl] = useState<number>(50);
  const [isCustomSizeMode, setIsCustomSizeMode] = useState<boolean>(false);
  const [customSizeInputMl, setCustomSizeInputMl] = useState<number | ''>('');
  const [isRollOnVessel, setIsRollOnVessel] = useState<boolean>(false);

  const activeRecipe = useMemo(() => {
    return getDynamicOperationalRecipe(selectedSizeMl, isRollOnVessel);
  }, [selectedSizeMl, isRollOnVessel]);

  // Custom formulation overrides (Integers only)
  const [customOilGrams, setCustomOilGrams] = useState<number>(activeRecipe.oilGrams);
  const [fixativeGrams, setFixativeGrams] = useState<number>(activeRecipe.fixativeGrams);
  const [macerationTargetDays, setMacerationTargetDays] = useState<number>(14);
  const [oilCostPerGramOverride, setOilCostPerGramOverride] = useState<number | ''>('');
  const [customSellingPrice, setCustomSellingPrice] = useState<number | ''>('');
  const [recipeChangeReason, setRecipeChangeReason] = useState<string>('');
  const [showRecipeWarning, setShowRecipeWarning] = useState<boolean>(false);

  // Packaging & Colored Bottle selection
  const [packagingOptions] = useState<PackagingOption[]>(DEFAULT_PACKAGING_OPTIONS);
  const [selectedPackagingId, setSelectedPackagingId] = useState<'basic_bag' | 'luxury_box' | 'luxury_bag' | 'luxury_both'>('basic_bag');
  const [isPackagingPaidByCustomer, setIsPackagingPaidByCustomer] = useState<boolean>(false);
  const [isColoredBottle, setIsColoredBottle] = useState<boolean>(false);

  // Discount test slider
  const [testDiscountType, setTestDiscountType] = useState<'amount' | 'percent'>('amount');
  const [testDiscountValue, setTestDiscountValue] = useState<number>(0);

  // AI Proposal state
  const [aiProposal, setAiProposal] = useState<RecipeProposal | null>(null);
  const [aiProposalLoading, setAiProposalLoading] = useState<boolean>(false);
  const [previewApprovalModal, setPreviewApprovalModal] = useState<{
    open: boolean;
    title: string;
    proposedChanges: string[];
    onConfirm: () => void;
  }>({ open: false, title: '', proposedChanges: [], onConfirm: () => {} });

  // Fragrance Intelligence Explorer
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [intelResult, setIntelResult] = useState<FragranceIntel | null>(null);
  const [intelLoading, setIntelLoading] = useState<boolean>(false);

  // Production Batches & Maceration
  const [newBatchUnits, setNewBatchUnits] = useState<number>(5);
  const [newBatchSupplier, setNewBatchSupplier] = useState<string>('الرصاصي / لوزي المعتمد');
  const [newBatchPreparedBy, setNewBatchPreparedBy] = useState<string>('طارق (مسؤول المختبر والمبيعات)');
  const [selectedBatchForEval, setSelectedBatchForEval] = useState<ProductionBatch | null>(null);
  const [evalLongevity, setEvalLongevity] = useState<'ضعيف' | 'مقبول' | 'جيد' | 'ممتاز'>('ممتاز');
  const [evalSillage, setEvalSillage] = useState<'ضعيف' | 'مقبول' | 'جيد' | 'ممتاز'>('جيد');
  const [evalBalance, setEvalBalance] = useState<'ضعيف' | 'مقبول' | 'جيد' | 'ممتاز'>('ممتاز');
  const [evalNotes, setEvalNotes] = useState<string>('');

  // AI Financial Auditor
  const [auditAnomalies, setAuditAnomalies] = useState<FinancialAuditAnomaly[]>([]);
  const [auditorLoading, setAuditorLoading] = useState<boolean>(false);

  // Notification banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'danger' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'warning' | 'danger' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Sync grams when size or vessel mode changes
  useEffect(() => {
    const std = getDynamicOperationalRecipe(selectedSizeMl, isRollOnVessel);
    setCustomOilGrams(std.oilGrams);
    setFixativeGrams(std.fixativeGrams);
    setRecipeChangeReason('');
    setShowRecipeWarning(false);
  }, [selectedSizeMl, isRollOnVessel]);

  // Check if current recipe is modified
  useEffect(() => {
    if (customOilGrams !== activeRecipe.oilGrams || fixativeGrams !== activeRecipe.fixativeGrams) {
      setShowRecipeWarning(true);
    } else {
      setShowRecipeWarning(false);
    }
  }, [customOilGrams, fixativeGrams, activeRecipe]);

  // Scientific Concentration Classification
  const concentrationMetrics = useMemo(() => {
    const pct = Math.min(100, Math.round((customOilGrams / Math.max(1, selectedSizeMl)) * 100));
    const alcoholMl = isRollOnVessel ? 0 : Math.max(0, selectedSizeMl - customOilGrams - fixativeGrams);
    const fixativePct = isRollOnVessel ? 0 : Math.round((fixativeGrams / Math.max(1, selectedSizeMl)) * 100);
    const alcoholPct = isRollOnVessel ? 0 : Math.max(0, 100 - pct - fixativePct);

    let gradeLabel = 'Eau de Parfum (EDP)';
    let gradeDesc = 'توازن مثالي بين الفوحان القوي والثبات الطويل (8 - 12 ساعة)';
    let recommendedMaceration = 10;

    if (isRollOnVessel || pct >= 90) {
      gradeLabel = 'Pure Perfume Oil (زيت عطري صافي 100%)';
      gradeDesc = 'تركيز خام فائق النقاء بدون كحول — ثبات يتجاوز 24 ساعة على نقاط النبض';
      recommendedMaceration = 3;
    } else if (pct >= 32) {
      gradeLabel = 'Extrait de Parfum (إكستريت دي بارفيوم مكثف)';
      gradeDesc = 'أعلى درجة تركيز عطري فاخر — ثبات عميق جداً (14 - 24 ساعة) ويحتاج تعتيقاً هادئاً لدمج الجزيئات الثقيلة';
      recommendedMaceration = 14;
    } else if (pct >= 22) {
      gradeLabel = 'Eau de Parfum Intense (أو دو بارفيوم مركز)';
      gradeDesc = 'التركيز القياسي المعتمد في لمسة عطر — فوحان ملحوظ وثبات ممتاز (8 - 12 ساعة)';
      recommendedMaceration = 10;
    } else {
      gradeLabel = 'Eau de Toilette / Fraîche (تركيز خفيف منعش)';
      gradeDesc = 'مناسب للعطور الصيفية الحمضية والصباحية سريعة الانتشار (4 - 6 ساعات)';
      recommendedMaceration = 7;
    }

    return {
      pct,
      alcoholMl,
      fixativePct,
      alcoholPct,
      gradeLabel,
      gradeDesc,
      recommendedMaceration,
    };
  }, [customOilGrams, fixativeGrams, selectedSizeMl, isRollOnVessel]);

  // Pricing & Cost Calculation per Commercial & Financial Reference
  const isSpecial = selectedProduct.type === 'عود' || selectedProduct.type === 'مسك' || selectedProduct.type === 'نيش';
  const defaultTypeGramCost = getApprovedOilGramCost(selectedProduct.type, settings);
  const effectiveOilCostPerGram = oilCostPerGramOverride !== '' 
    ? Number(oilCostPerGramOverride) 
    : defaultTypeGramCost;

  const isOilHigherCost = effectiveOilCostPerGram > defaultTypeGramCost;

  const currentBottleConfig = useMemo(() => {
    return bottleSizes.find(b => b.sizeMl === selectedSizeMl) || {
      id: `custom-${selectedSizeMl}`,
      sizeMl: selectedSizeMl,
      essenceGrams: activeRecipe.oilGrams,
      bottleCost: activeRecipe.isRollOn ? 5 : 15,
      suggestedMargin: 40,
      normalPrice: activeRecipe.standardNormalPrice,
      coloredNormalPrice: activeRecipe.coloredNormalPrice,
      specialPrice: activeRecipe.standardSpecialPrice,
      officialCost: activeRecipe.officialCost,
      isRollOn: activeRecipe.isRollOn,
    };
  }, [bottleSizes, selectedSizeMl, activeRecipe]);

  const canUseColoredBottle = useMemo(() => {
    if (activeRecipe.isRollOn) return false;
    if (selectedProduct.type === 'عادي') {
      return Boolean(currentBottleConfig.coloredNormalPrice && currentBottleConfig.coloredNormalPrice > 0);
    }
    return Boolean(currentBottleConfig.coloredSpecialPrice && currentBottleConfig.coloredSpecialPrice > 0);
  }, [activeRecipe.isRollOn, selectedProduct.type, currentBottleConfig]);

  const effectiveColoredBottle = isColoredBottle && canUseColoredBottle;

  const standardApprovedCost = useMemo(() => {
    const baseDerived = calculateDerivedProductCost(currentBottleConfig, selectedProduct.type, effectiveColoredBottle, settings);
    const extraOilGramsDelta = (customOilGrams - activeRecipe.oilGrams) * effectiveOilCostPerGram;
    return Math.max(0, baseDerived + extraOilGramsDelta);
  }, [currentBottleConfig, selectedProduct.type, effectiveColoredBottle, settings, customOilGrams, activeRecipe.oilGrams, effectiveOilCostPerGram]);

  const standardApprovedPrice = useMemo(() => {
    return getApprovedSellingPrice(currentBottleConfig, selectedProduct.type, effectiveColoredBottle);
  }, [currentBottleConfig, selectedProduct.type, effectiveColoredBottle]);

  const selectedPackaging = packagingOptions.find(p => p.id === selectedPackagingId) || packagingOptions[0];
  const pkgAccounting = calculatePackagingAccounting(selectedPackagingId, isPackagingPaidByCustomer, settings);
  const packagingPrice = pkgAccounting.packagingRevenue;

  // Raw component costs per Commercial & Financial Reference
  const oilCost = customOilGrams * effectiveOilCostPerGram;
  const alcoholCost = activeRecipe.isRollOn ? 0 : Math.round((selectedSizeMl - customOilGrams) * 0.4);
  const fixativeCost = fixativeGrams * 2;
  const bottleUnitCost = effectiveColoredBottle ? (settings.coloredBottleCost || 50) : (activeRecipe.isRollOn ? 5 : (settings.standardBottleAndSprayCost || 15));
  const sprayCapCost = 0; // Included in standardBottleAndSprayCost (15 EGP)
  const stickerCost = settings.stickerCost || 1;
  const basicBagCost = pkgAccounting.replacesBasicBag ? 0 : (settings.basicPlasticBagCost || 1);
  const extraLuxuryCost = selectedPackaging.type === 'luxury' ? selectedPackaging.cost : 0;

  const totalCalculatedCost = oilCost + alcoholCost + fixativeCost + bottleUnitCost + sprayCapCost + stickerCost + basicBagCost + extraLuxuryCost;
  const hasCostDiscrepancy = Math.abs(totalCalculatedCost - standardApprovedCost) > 0;

  const baseSellingPrice = customSellingPrice !== '' ? Number(customSellingPrice) : standardApprovedPrice;
  const finalPriceWithPackaging = baseSellingPrice + packagingPrice;

  const calculatedDiscountAmount = useMemo(() => {
    if (testDiscountType === 'percent') {
      return Math.round(finalPriceWithPackaging * (testDiscountValue / 100));
    }
    return Math.min(finalPriceWithPackaging, testDiscountValue);
  }, [finalPriceWithPackaging, testDiscountType, testDiscountValue]);

  const commissionRate = settings.commissionRate || 0.05;
  const minRequiredContribution = 10; // الحد الأدنى الإلزامي للمساهمة = 10 جنيهات
  const minSafeNetPrice = calculateMinSafeNetPrice(standardApprovedCost, minRequiredContribution, commissionRate);
  const maxSafeDiscount = calculateMaxSafeDiscount(finalPriceWithPackaging, standardApprovedCost, minRequiredContribution, commissionRate);

  const financialResult = calculateInstantContribution(
    finalPriceWithPackaging,
    standardApprovedCost,
    calculatedDiscountAmount,
    commissionRate,
    activeRecipe.isRollOn
  );

  const isDiscountExceedingSafeLimit = calculatedDiscountAmount > maxSafeDiscount;

  const priceTiers = useMemo(() => {
    const base = finalPriceWithPackaging;
    const marketingFloor = Math.round(base * 0.90);
    const costFloor = standardApprovedCost;
    return { base, marketingFloor, costFloor };
  }, [finalPriceWithPackaging, standardApprovedCost]);

  // ========================================================
  // AI ACTIONS
  // ========================================================
  const handleRequestAiRecipe = async () => {
    setAiProposalLoading(true);
    try {
      const proposal = await proposeRecipeOptimization({
        perfumeName: selectedProduct.name,
        sizeMl: selectedSizeMl,
        currentGrams: activeRecipe.oilGrams,
        currentCost: standardApprovedCost,
        oilCostPerGram: effectiveOilCostPerGram,
      });
      setAiProposal(proposal);
    } catch (e) {
      console.error(e);
      showNotification('تعذر استخراج اقتراح الوصفة', 'danger');
    } finally {
      setAiProposalLoading(false);
    }
  };

  const handleAdoptAiProposal = () => {
    if (!aiProposal) return;
    setPreviewApprovalModal({
      open: true,
      title: 'معاينة واعتماد اقتراح الذكاء الاصطناعي للمختبر',
      proposedChanges: [
        `العطر المستهدف: ${selectedProduct.name} (عبوة ${selectedSizeMl} مل)`,
        `الجرامات القياسية الحالية: ${activeRecipe.oilGrams} جم ← المقترح الجديد: ${aiProposal.proposedOilGrams} جم (عدد صحيح)`,
        `درجة التركيز المقترحة: ${aiProposal.proposedConcentrationPercent}%`,
        `الأثر المالي المتوقع: ${aiProposal.costImpactEgp >= 0 ? `+${aiProposal.costImpactEgp}` : aiProposal.costImpactEgp} ج.م في التكلفة`,
        `طريقة الخلط والتعتيق: ${aiProposal.alcoholMethod}`,
      ],
      onConfirm: () => {
        setCustomOilGrams(aiProposal.proposedOilGrams);
        setFixativeGrams(aiProposal.fixativeGrams);
        setRecipeChangeReason(`اعتماد اقتراح AI: ${aiProposal.reasoning.slice(0, 60)}...`);
        
        const log: AuditLogRecord = {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: 'د. محمد (المالك)',
          action: 'تعديل وصفة',
          entityType: 'recipe',
          entityId: `${selectedProduct.id}-${selectedSizeMl}`,
          entityName: `${selectedProduct.name} (${selectedSizeMl}مل)`,
          oldValue: `${activeRecipe.oilGrams} جم زيت`,
          newValue: `${aiProposal.proposedOilGrams} جم زيت`,
          reason: `اعتماد التوصية الفنية: ${aiProposal.reasoning}`,
          approvedBy: 'المالك',
        };
        onAddAuditLog(log);
        showNotification('تم اعتماد الاقتراح الفني بنجاح وتسجيله في سجل التدقيق', 'success');
        setPreviewApprovalModal(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleSaveAsExperiment = () => {
    if (!aiProposal) return;
    const log: AuditLogRecord = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'د. محمد (المالك)',
      action: 'تعديل وصفة',
      entityType: 'recipe',
      entityId: `${selectedProduct.id}-${selectedSizeMl}`,
      entityName: `${selectedProduct.name} (${selectedSizeMl}مل)`,
      oldValue: 'وصفة قياسية',
      newValue: `حفظ تجربة: ${aiProposal.proposedOilGrams} جم`,
      reason: 'حفظ كتجربة مخبرية قيد الاختبار والتقييم الحسي',
    };
    onAddAuditLog(log);
    showNotification('تم حفظ الاقتراح كتجربة مخبرية دون تغيير الوصفة المعتمدة', 'warning');
    setAiProposal(null);
  };

  const handleSearchFragranceIntel = async (q: string) => {
    if (!q.trim()) return;
    setIntelLoading(true);
    try {
      const res = await searchFragranceIntelligence(q, selectedProduct.brand);
      setIntelResult(res);
    } catch (e) {
      console.error(e);
      showNotification('تعذر البحث عن بيانات العطر', 'danger');
    } finally {
      setIntelLoading(false);
    }
  };

  const handleRunAuditor = async () => {
    setAuditorLoading(true);
    try {
      const res = await performFinancialAIAudit(sales, products, expenses);
      setAuditAnomalies(res);
      showNotification(`اكتمل الفحص الذكي: تم رصد ${res.length} نقاط تدقيق`, 'success');
    } catch (e) {
      console.error(e);
    } finally {
      setAuditorLoading(false);
    }
  };

  // Create Batch with Custom Maceration Schedule
  const handleCreateProductionBatch = () => {
    if (newBatchUnits <= 0) return;
    const totalOil = customOilGrams * newBatchUnits;

    if (selectedProduct.stock_grams < totalOil) {
      showNotification(`المخزون غير كافٍ لتصنيع الدفعة: يتطلب ${totalOil} جم بينما المتوفر ${selectedProduct.stock_grams} جم`, 'danger');
      return;
    }

    const batchNumber = `MAC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date();
    const halfDays = Math.max(2, Math.round(macerationTargetDays / 2));
    const firstTest = new Date(now.getTime() + halfDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const finalTest = new Date(now.getTime() + macerationTargetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const newBatch: ProductionBatch = {
      id: `batch-${Date.now()}`,
      batchNumber,
      date: new Date().toISOString(),
      perfumeName: selectedProduct.name,
      brand: selectedProduct.brand,
      supplier: newBatchSupplier,
      oilType: selectedProduct.type,
      bottleSizeMl: selectedSizeMl,
      oilGramsPerUnit: customOilGrams,
      fixativeGramsPerUnit: fixativeGrams,
      alcoholMlPerUnit: activeRecipe.isRollOn ? 0 : Math.max(0, selectedSizeMl - customOilGrams - fixativeGrams),
      unitsCount: newBatchUnits,
      totalOilUsedGrams: totalOil,
      preparedBy: newBatchPreparedBy,
      mixingDate: new Date().toISOString().slice(0, 10),
      firstTestDate: firstTest,
      finalTestDate: finalTest,
      status: 'تحت الاختبار',
      calculatedUnitCost: standardApprovedCost,
      ifraComplianceNote: 'مطابق لإرشادات IFRA Category 4 للمنتجات العطرية التجميلية على الجلد',
      notes: recipeChangeReason || `تم الخلط والتعليق للتعتيق لمدة ${macerationTargetDays} يوماً بتركيز ${concentrationMetrics.pct}%`
    };

    setProducts(prev => prev.map(p => {
      if (p.id === selectedProduct.id) {
        return { ...p, stock_grams: Math.max(0, p.stock_grams - totalOil) };
      }
      return p;
    }));

    onSaveBatch(newBatch);

    onAddAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: newBatchPreparedBy,
      action: 'اعتماد دفعة',
      entityType: 'batch',
      entityId: batchNumber,
      entityName: `${selectedProduct.name} (${newBatchUnits} عبوات × ${selectedSizeMl}مل)`,
      oldValue: `مخزون زيت: ${selectedProduct.stock_grams} جم`,
      newValue: `مخزون زيت: ${selectedProduct.stock_grams - totalOil} جم (-${totalOil} جم)`,
      reason: `إنتاج وتعليق دفعة تعتيق جديدة برقم ${batchNumber} لمدة ${macerationTargetDays} يوم`,
      approvedBy: 'الإدارة التشغيلية'
    });

    showNotification(`تم إصدار دفعة التعتيق ${batchNumber} وخصم ${totalOil} جم من المخزون بنجاح`, 'success');
  };

  // Submit sensory evaluation
  const handleSaveSensoryEval = () => {
    if (!selectedBatchForEval) return;
    const updated: ProductionBatch = {
      ...selectedBatchForEval,
      status: 'معتمدة',
      sensoryEvaluation: {
        longevity: evalLongevity,
        sillage: evalSillage,
        balance: evalBalance,
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: 'د. محمد (المالك)',
        notes: evalNotes || 'اجتازت فترة التعتيق والفحص الحسي بجدارة ومطابقة لمعايير لمسة عطر'
      }
    };
    onSaveBatch(updated);

    onAddAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'د. محمد (المالك)',
      action: 'اعتماد دفعة',
      entityType: 'batch',
      entityId: updated.batchNumber,
      entityName: updated.perfumeName,
      oldValue: 'تحت الاختبار والتعتيق',
      newValue: 'معتمدة وجاهزة للبيع',
      reason: `اعتماد الفحص الحسي بعد التعتيق: ثبات (${evalLongevity}) / فوحان (${evalSillage}) / توازن (${evalBalance})`,
      approvedBy: 'المالك'
    });

    setSelectedBatchForEval(null);
    showNotification(`تم اعتماد الدفعة ${updated.batchNumber} بعد التعتيق وإدخالها للبيع التجاري`, 'success');
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-5 pb-24 md:pb-12 animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* 1. APPLE LAB HEADER & COLOR-CODED DOMAIN NAVIGATION       */}
      {/* ======================================================== */}
      <header className="apple-glass rounded-[28px] p-4 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5856D6] via-[#0071E3] to-[#AF52DE] text-white flex items-center justify-center shadow-md shrink-0">
              <Beaker size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#5856D6]/12 text-[#5856D6] text-[11px] font-black">
                  مختبر الهندسة العطرية والتعتيق (Formulation & Maceration Lab)
                </span>
                <button
                  type="button"
                  onClick={() => setShowExpertGuide(!showExpertGuide)}
                  className="px-2.5 py-0.5 rounded-full bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen size={11} />
                  <span>{showExpertGuide ? 'إخفاء دليل الشرح العلمي' : 'إظهار دليل الشرح العلمي للتركيب والتعتيق'}</span>
                </button>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-[#1D1D1F] tracking-tight">
                منظومة التركيب الحر والتعتيق (التعليق) والهندسة المالية للعطور
              </h1>
              <p className="text-xs text-[#636366] mt-0.5 leading-relaxed">
                كل قسم مصمم بطابع لوني مستقل يربط عناصره الوظيفية بوضوح تام: <strong className="text-[#5856D6]">الهوية العطرية (بنفسجي إنديغو)</strong> · <strong className="text-[#0071E3]">الحجم الحر (أزرق أبل)</strong> · <strong className="text-[#C49746]">النسب الكيميائية (ذهبي كهرماني)</strong> · <strong className="text-[#AF52DE]">التعتيق والمكث (أرجواني معملي)</strong> · <strong className="text-[#248A3D]">التسعير والربح (أخضر زمردي)</strong>
              </p>
            </div>
          </div>

          {/* Apple Color-Coded Segmented Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-2xl shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('formulation')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'formulation'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-white/60'
              }`}
            >
              <Sliders size={14} />
              <span>١. هندسة التركيب والحجم الحر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'batches'
                  ? 'bg-[#AF52DE] text-white shadow-xs'
                  : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-white/60'
              }`}
            >
              <Clock size={14} />
              <span>٢. التعتيق (التعليق) والدفعات ({batches.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('intel')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'intel'
                  ? 'bg-[#C49746] text-white shadow-xs'
                  : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-white/60'
              }`}
            >
              <Search size={14} />
              <span>٣. موسوعة النوتات و IFRA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('auditor');
                handleRunAuditor();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'auditor'
                  ? 'bg-[#FF2D55] text-white shadow-xs'
                  : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-white/60'
              }`}
            >
              <ShieldAlert size={14} />
              <span>٤. المدقق الذكي</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit_trail')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'audit_trail'
                  ? 'bg-[#1D1D1F] text-white shadow-xs'
                  : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-white/60'
              }`}
            >
              <History size={14} />
              <span>٥. سجل الرقابة ({auditLogs.length})</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SCIENTIFIC & OPERATIONAL EXPLANATION GUIDE (دليل الخبير)  */}
        {/* ======================================================== */}
        {showExpertGuide && (
          <div className="pt-3 border-t border-black/[0.06] grid grid-cols-1 md:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
            {/* Guide Card 1: Indigo - Oil Identity */}
            <div className="p-3.5 rounded-2xl bg-[#5856D6]/[0.06] border border-[#5856D6]/20 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-[#5856D6]">
                <Droplets size={14} />
                <span>١. الهوية والزيت الخام (Indigo)</span>
              </div>
              <p className="text-[11px] text-[#48484A] leading-relaxed">
                الزيت العطري الخام (Fragrance Compound) هو قلب العطر. تختلف كثافته ولزوجته بين <strong className="text-[#5856D6]">العطور الشرقية/العود</strong> (جزيئات ثقيلة عالية الثبات) و<strong className="text-[#5856D6]">الفرنسية الصيفية</strong> (جزيئات حمضية سريعة الفوحان).
              </p>
            </div>

            {/* Guide Card 2: Apple Blue - Free Volume & Concentration */}
            <div className="p-3.5 rounded-2xl bg-[#0071E3]/[0.06] border border-[#0071E3]/20 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-[#0071E3]">
                <Gauge size={14} />
                <span>٢. الحجم الحر والتركيز (Apple Blue)</span>
              </div>
              <p className="text-[11px] text-[#48484A] leading-relaxed">
                لست مقيداً بحجم ثابت! يمكنك اختيار أي عبوة قياسية أو <strong className="text-[#0071E3]">كتابة أي حجم مخصص بالملي (مثلاً 15، 75، 250 مل)</strong> وسيقوم المختبر بحساب جرامات الزيت والكحول والمثبت تلقائياً.
              </p>
            </div>

            {/* Guide Card 3: Purple - Maceration (التعتيق والتعليق) */}
            <div className="p-3.5 rounded-2xl bg-[#AF52DE]/[0.06] border border-[#AF52DE]/20 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-[#AF52DE]">
                <Clock size={14} />
                <span>٣. سر التعتيق والتعليق (Purple)</span>
              </div>
              <p className="text-[11px] text-[#48484A] leading-relaxed">
                <strong>التعتيق (Maceration):</strong> عند خلط الزيت بالكحول، تكون رائحة الكحول حادة أول 48 ساعة. وضع الخلطة في مكان مظلم وبارد (7–14 يوماً) يكسر حدة الكحول ويوحد الروابط الجزيئية لثبات أقوى بـ 50%.
              </p>
            </div>

            {/* Guide Card 4: Emerald Green - Profit & Financial Engineering */}
            <div className="p-3.5 rounded-2xl bg-[#34C759]/[0.08] border border-[#34C759]/25 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-[#248A3D]">
                <ShieldCheck size={14} />
                <span>٤. الهندسة المالية الآمنة (Emerald)</span>
              </div>
              <p className="text-[11px] text-[#48484A] leading-relaxed">
                كل جرام زيت أو تغيير في الحجم ينعكس فوراً على <strong className="text-[#248A3D]">التكلفة الفعلية، والحد الآمن للخصم، وصافي المساهمة</strong> مع منع البيع بأقل من التكلفة نهائياً.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Floating Notification */}
      {notification && (
        <div className={`p-3.5 rounded-2xl text-xs font-black flex items-center justify-between border shadow-apple-sm animate-in slide-in-from-top-2 ${
          notification.type === 'success' ? 'bg-[#E8F8EE] text-[#248A3D] border-[#34C759]/30' :
          notification.type === 'warning' ? 'bg-[#FFF8EB] text-[#9A6E23] border-[#FF9500]/30' :
          'bg-[#FFF5F5] text-[#D70015] border-[#FF3B30]/30'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="opacity-60 hover:opacity-100 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: COLOR-CODED FORMULATION, FREE SIZE & COST ENGINE  */}
      {/* ======================================================== */}
      {activeTab === 'formulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Color-Coded Scientific Sections (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* ======================================================== */}
            {/* SECTION 1 [ROYAL INDIGO #5856D6]: OLFACTORY IDENTITY     */}
            {/* ======================================================== */}
            <section className="rounded-[28px] bg-white border-2 border-[#5856D6]/20 shadow-apple-card overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-l from-[#5856D6]/12 via-[#5856D6]/[0.05] to-transparent border-b border-[#5856D6]/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#5856D6] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                      الهوية العطرية واختيار الزيت الخام (Olfactory Base)
                    </h2>
                    <span className="text-[10px] text-[#5856D6] font-bold block">
                      الطابع اللوني: بنفسجي إنديغو · يحدد كثافة الزيت ونوع التسعير (فرنسي عادي / عود ومسك خاص)
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-xl bg-[#5856D6]/10 border border-[#5856D6]/20 text-[#5856D6] font-mono text-xs font-black">
                  المخزون: {selectedProduct.stock_grams} جم
                </div>
              </div>

              <div className="p-5 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-[#1D1D1F] block mb-1.5">
                      اختر الزيت العطري الخام من المخزون:
                    </label>
                    <select
                      value={selectedProduct.id}
                      onChange={(e) => {
                        const found = products.find(p => String(p.id) === e.target.value);
                        if (found) setSelectedProduct(found);
                      }}
                      className="w-full h-11 px-3.5 rounded-2xl bg-[#F5F5F7] border border-[#5856D6]/25 focus:bg-white focus:border-[#5856D6] text-xs font-black text-[#1D1D1F] outline-none transition-all"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ({p.brand} · {p.type} · متاح {p.stock_grams} جم)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-[#1D1D1F] block mb-1.5">
                      الخصائص الفيزيائية والتصنيف:
                    </label>
                    <div className="h-11 px-3.5 rounded-2xl bg-[#5856D6]/[0.05] border border-[#5856D6]/15 flex items-center justify-between text-xs">
                      <span className="font-black text-[#5856D6]">
                        {selectedProduct.type} · {selectedProduct.gender} · {selectedProduct.season}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-white text-[#1D1D1F] font-bold text-[10px] shadow-2xs">
                        {selectedProduct.origin}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* SECTION 2 [APPLE BLUE #0071E3]: FREE VOLUME & VESSEL     */}
            {/* ======================================================== */}
            <section className="rounded-[28px] bg-white border-2 border-[#0071E3]/20 shadow-apple-card overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-l from-[#0071E3]/12 via-[#0071E3]/[0.05] to-transparent border-b border-[#0071E3]/15 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#0071E3] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                      تحديد حجم الزجاجة أو وعاء التعتيق بحرية (Free Size Selector)
                    </h2>
                    <span className="text-[10px] text-[#0071E3] font-bold block">
                      الطابع اللوني: أزرق أبل · البائع أو المستخدم هو من يحدد أي حجم بالملي دون التقييد بحجم معين
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-xl bg-[#0071E3] text-white font-mono text-xs font-black shadow-2xs">
                  الحجم النشط: {selectedSizeMl} مل {isRollOnVessel ? '(رول بيور)' : '(بخاخ كحول)'}
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Free Custom Size Input Box (Prominent & Empowering) */}
                <div className="p-3.5 rounded-2xl bg-[#0071E3]/[0.06] border border-[#0071E3]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-[#0071E3] flex items-center gap-1.5">
                      <Sliders size={14} />
                      <span>إدخال حجم حر مخصص (يحدده البائع أو المستخدم بالملي):</span>
                    </span>
                    <p className="text-[11px] text-[#48484A] mt-0.5">
                      اكتب أي حجم تريده (مثلاً: 15 مل، 40 مل، 75 مل، 150 مل، أو زجاجة تعتيق 250 / 500 مل) وسيتم ضبط المعادلة تلقائياً.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="2"
                      max="2000"
                      placeholder="اكتب الحجم (مل)..."
                      value={customSizeInputMl}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(2, Math.round(Number(e.target.value)));
                        setCustomSizeInputMl(val);
                        if (val !== '') {
                          setIsCustomSizeMode(true);
                          setSelectedSizeMl(val);
                        }
                      }}
                      className="w-28 h-10 px-3 rounded-xl bg-white border-2 border-[#0071E3] font-mono text-sm font-black text-center text-[#0071E3] outline-none shadow-2xs"
                    />
                    <span className="text-xs font-black text-[#1D1D1F]">مل</span>

                    <button
                      type="button"
                      onClick={() => setIsRollOnVessel(!isRollOnVessel)}
                      className={`px-3 h-10 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                        isRollOnVessel
                          ? 'bg-[#AF52DE] text-white border-[#AF52DE]'
                          : 'bg-white text-[#0071E3] border-[#0071E3]/30 hover:bg-[#0071E3]/10'
                      }`}
                    >
                      {isRollOnVessel ? '💧 رول أون بيور' : '💨 بخاخ كحولي'}
                    </button>
                  </div>
                </div>

                {/* Quick Preset Spray Sizes */}
                <div>
                  <span className="text-[11px] font-black text-[#636366] block mb-2">
                    أو اختر بضغطة واحدة من أحجام البخاخ السريعة:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[100, 50, 30, 25, 20, 10].map(size => {
                      const isSelected = !isCustomSizeMode && !isRollOnVessel && selectedSizeMl === size;
                      const r = APPROVED_OPERATIONAL_RECIPES[size];
                      const pPrice = isSpecial ? r.standardSpecialPrice : r.standardNormalPrice;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setIsCustomSizeMode(false);
                            setCustomSizeInputMl('');
                            setIsRollOnVessel(false);
                            setSelectedSizeMl(size);
                          }}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-sm font-bold scale-[1.02]'
                              : 'bg-[#F5F5F7] border-black/[0.06] hover:border-[#0071E3] text-[#1D1D1F]'
                          }`}
                        >
                          <span className="text-xs font-black block font-mono">{size} مل</span>
                          <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-blue-100' : 'text-[#86868B]'}`}>
                            {r.oilGrams} جم زيت
                          </span>
                          <span className={`text-[11px] font-black block mt-1 ${isSelected ? 'text-white' : 'text-[#0071E3]'}`}>
                            {pPrice} ج
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Preset Roll-on Sizes */}
                <div className="pt-2 border-t border-black/[0.05]">
                  <span className="text-[11px] font-black text-[#636366] block mb-2">
                    أحجام الرول أون والدهن الصافي (بدون كحول):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 3, 2].map(size => {
                      const isSelected = !isCustomSizeMode && isRollOnVessel && selectedSizeMl === size;
                      const r = APPROVED_OPERATIONAL_RECIPES[size];
                      const pPrice = isSpecial ? r.standardSpecialPrice : r.standardNormalPrice;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setIsCustomSizeMode(false);
                            setCustomSizeInputMl('');
                            setIsRollOnVessel(true);
                            setSelectedSizeMl(size);
                          }}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-sm font-bold scale-[1.02]'
                              : 'bg-[#F5F5F7] border-black/[0.06] hover:border-[#0071E3] text-[#1D1D1F]'
                          }`}
                        >
                          <span className="text-xs font-black block font-mono">{size} مل رول</span>
                          <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-blue-100' : 'text-[#86868B]'}`}>
                            {r.oilGrams} جم بيور
                          </span>
                          <span className={`text-[11px] font-black block mt-1 ${isSelected ? 'text-white' : 'text-[#0071E3]'}`}>
                            {pPrice} ج
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* SECTION 3 [AMBER GOLD #C49746]: CHEMICAL FORMULATION LAB */}
            {/* ======================================================== */}
            <section className="rounded-[28px] bg-white border-2 border-[#C49746]/30 shadow-apple-card overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-l from-[#C49746]/18 via-[#FF9500]/[0.06] to-transparent border-b border-[#C49746]/20 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#C49746] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                    3
                  </span>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                      معادلة التركيب الكيميائي ونسب المزج (Chemical Ratio Lab)
                    </h2>
                    <span className="text-[10px] text-[#9A6E23] font-bold block">
                      الطابع اللوني: ذهبي كهرماني · يضبط التوازن بين الزيت الخام والمثبت الجزيئي والكحول الطبي (أعداد صحيحة)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRequestAiRecipe}
                  disabled={aiProposalLoading}
                  className="px-3 py-1.5 rounded-xl bg-[#1D1D1F] hover:bg-black text-amber-300 text-[11px] font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>{aiProposalLoading ? 'جاري التحليل المعملي...' : 'استشارة الذكاء الاصطناعي للتركيبة'}</span>
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Live Concentration Classification Banner */}
                <div className="p-3.5 rounded-2xl bg-[#FFF8EB] border border-[#C49746]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#C49746] text-white font-mono text-[11px] font-black">
                        تركيز {concentrationMetrics.pct}%
                      </span>
                      <strong className="text-xs font-black text-[#1D1D1F]">
                        {concentrationMetrics.gradeLabel}
                      </strong>
                    </div>
                    <p className="text-[11px] text-[#636366]">
                      {concentrationMetrics.gradeDesc}
                    </p>
                  </div>

                  <div className="text-left shrink-0 bg-white px-3 py-1.5 rounded-xl border border-[#C49746]/25">
                    <span className="text-[10px] text-[#86868B] block">التعتيق الموصى به</span>
                    <strong className="font-mono text-xs font-black text-[#AF52DE]">
                      {concentrationMetrics.recommendedMaceration} أيام تعتيق
                    </strong>
                  </div>
                </div>

                {/* 3 Interactive Ingredient Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card A: Raw Fragrance Oil (Amber) */}
                  <div className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#C49746]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#9A6E23]">🧪 ١. الزيت العطري الخام</span>
                      <span className="text-[10px] font-mono font-bold text-[#C49746]">{concentrationMetrics.pct}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCustomOilGrams(Math.max(1, customOilGrams - 1))}
                        className="w-8 h-8 rounded-xl bg-[#F5F5F7] hover:bg-[#C49746] hover:text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={customOilGrams}
                        onChange={(e) => setCustomOilGrams(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                        className="w-16 h-8 rounded-xl bg-white border border-[#C49746]/40 font-mono font-black text-sm text-center text-[#1D1D1F] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomOilGrams(customOilGrams + 1)}
                        className="w-8 h-8 rounded-xl bg-[#F5F5F7] hover:bg-[#C49746] hover:text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-[10px] text-[#636366] block text-center">
                      المعيار القياسي لـ {selectedSizeMl}مل: <strong>{activeRecipe.oilGrams} جم</strong>
                    </span>
                  </div>

                  {/* Card B: Molecular Fixative (Purple/Indigo) */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8FF] border border-[#AF52DE]/25 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#AF52DE]">🔒 ٢. المثبت الجزيئي</span>
                      <span className="text-[10px] font-mono font-bold text-[#AF52DE]">{concentrationMetrics.fixativePct}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        disabled={activeRecipe.isRollOn}
                        onClick={() => setFixativeGrams(Math.max(0, fixativeGrams - 1))}
                        className="w-8 h-8 rounded-xl bg-[#F5F5F7] hover:bg-[#AF52DE] hover:text-white font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="font-mono font-black text-base text-[#1D1D1F] min-w-12 text-center">
                        {fixativeGrams} <span className="text-xs font-normal text-[#86868B]">جم</span>
                      </span>
                      <button
                        type="button"
                        disabled={activeRecipe.isRollOn}
                        onClick={() => setFixativeGrams(fixativeGrams + 1)}
                        className="w-8 h-8 rounded-xl bg-[#F5F5F7] hover:bg-[#AF52DE] hover:text-white font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-[10px] text-[#636366] block text-center">
                      {activeRecipe.isRollOn ? 'لا يضاف في الرول البيور' : 'يبطئ تبخر النوتات العليا'}
                    </span>
                  </div>

                  {/* Card C: Medical Ethyl Alcohol 96% (Apple Blue) */}
                  <div className="p-3.5 rounded-2xl bg-[#F5FAFF] border border-[#0071E3]/25 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#0071E3]">💧 ٣. الكحول الإيثيلي 96%</span>
                      <span className="text-[10px] font-mono font-bold text-[#0071E3]">{concentrationMetrics.alcoholPct}%</span>
                    </div>
                    <div className="h-8 rounded-xl bg-white border border-[#0071E3]/20 flex items-center justify-center font-mono font-black text-sm text-[#0071E3]">
                      {activeRecipe.isRollOn ? '0 مل (بيور)' : `${concentrationMetrics.alcoholMl} مل كحول`}
                    </div>
                    <span className="text-[10px] text-[#636366] block text-center">
                      {activeRecipe.isRollOn ? 'زيت صافي بدون كحول' : 'وسيط الانتشار والفوحان'}
                    </span>
                  </div>
                </div>

                {/* Visual Proportional Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-[#9A6E23]">زيت عطري ({customOilGrams} جم)</span>
                    {!activeRecipe.isRollOn && <span className="text-[#AF52DE]">مثبت ({fixativeGrams} جم)</span>}
                    {!activeRecipe.isRollOn && <span className="text-[#0071E3]">كحول طبي نقي ({concentrationMetrics.alcoholMl} مل)</span>}
                  </div>
                  <div className="h-3 w-full rounded-full bg-black/[0.06] overflow-hidden flex p-0.5 gap-0.5">
                    <div
                      className="h-full rounded-r-full bg-gradient-to-l from-[#C49746] to-[#FF9500] transition-all duration-300"
                      style={{ width: `${concentrationMetrics.pct}%` }}
                    />
                    {!activeRecipe.isRollOn && fixativeGrams > 0 && (
                      <div
                        className="h-full bg-[#AF52DE] transition-all duration-300"
                        style={{ width: `${Math.max(3, concentrationMetrics.fixativePct)}%` }}
                      />
                    )}
                    {!activeRecipe.isRollOn && (
                      <div
                        className="h-full rounded-l-full bg-[#0071E3] transition-all duration-300"
                        style={{ width: `${concentrationMetrics.alcoholPct}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Deviation Warning when grams are modified */}
                {showRecipeWarning && (
                  <div className="p-3.5 rounded-2xl bg-[#FFF8EB] border border-[#FF9500]/35 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-[#9A6E23] font-black text-xs">
                      <AlertTriangle size={15} className="text-[#FF9500] shrink-0" />
                      <span>تم تعديل النسب عن المعيار الافتراضي ({activeRecipe.oilGrams} جم زيت) — وثّق السبب للسجل:</span>
                    </div>
                    <select
                      value={recipeChangeReason}
                      onChange={(e) => setRecipeChangeReason(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-[#FF9500]/40 text-xs font-bold outline-none"
                    >
                      <option value="">-- اختر سبب تخصيص الوصفة --</option>
                      <option value="طلب عميل لزيادة التركيز والثبات (Extrait)">طلب عميل لزيادة التركيز والثبات (Extrait)</option>
                      <option value="تعديل فوحان ونعومة الرائحة">تعديل فوحان ونعومة الرائحة</option>
                      <option value="تحضير دفعة تعتيق خاصة عالية التركيز">تحضير دفعة تعتيق خاصة عالية التركيز</option>
                      <option value="اختبار دفعة جديدة من المورد">اختبار دفعة جديدة من المورد</option>
                    </select>
                  </div>
                )}

                {/* AI Proposal Card */}
                {aiProposal && (
                  <div className="p-4 rounded-2xl bg-[#F5FAFF] border-2 border-[#0071E3]/30 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[#0071E3]" />
                        <span className="text-xs font-black text-[#1D1D1F]">
                          توصية المختبر الذكي (تركيز {aiProposal.proposedConcentrationPercent}%)
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0071E3]/15 text-[#0071E3] text-[10px] font-black">
                        درجة الثقة: {aiProposal.confidenceDegree}
                      </span>
                    </div>

                    <p className="text-xs text-[#1D1D1F] leading-relaxed font-medium">
                      {aiProposal.reasoning}
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-white p-3 rounded-xl border border-[#0071E3]/15">
                      <div>
                        <span className="text-[#86868B] block text-[10px]">الزيت المقترح:</span>
                        <strong className="text-[#0071E3] font-black">{aiProposal.proposedOilGrams} جم</strong>
                      </div>
                      <div>
                        <span className="text-[#86868B] block text-[10px]">فرق التكلفة:</span>
                        <strong className={aiProposal.costImpactEgp >= 0 ? 'text-[#FF9500]' : 'text-[#248A3D]'}>
                          {aiProposal.costImpactEgp >= 0 ? `+${aiProposal.costImpactEgp}` : aiProposal.costImpactEgp} ج.م
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#86868B] block text-[10px]">الأداء المتوقع:</span>
                        <strong className="text-[#1D1D1F] truncate block">{aiProposal.expectedOutcome.longevityDesc}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAdoptAiProposal}
                        className="px-3.5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check size={13} />
                        <span>اعتماد التوصية</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAsExperiment}
                        className="px-3.5 py-2 rounded-xl bg-[#FFF8EB] hover:bg-[#FF9500]/20 text-[#9A6E23] border border-[#FF9500]/30 text-xs font-black transition-all cursor-pointer"
                      >
                        <span>حفظ كتجربة مخبرية</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiProposal(null)}
                        className="px-3 py-2 rounded-xl bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>إغلاق</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ======================================================== */}
            {/* SECTION 4 [DEEP PURPLE #AF52DE]: MACERATION & MATURATION */}
            {/* ======================================================== */}
            <section className="rounded-[28px] bg-white border-2 border-[#AF52DE]/25 shadow-apple-card overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-l from-[#AF52DE]/15 via-[#AF52DE]/[0.05] to-transparent border-b border-[#AF52DE]/15 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#AF52DE] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                    4
                  </span>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                      بروتوكول التعتيق والمكث المعملي (Maceration & Aging Protocol)
                    </h2>
                    <span className="text-[10px] text-[#AF52DE] font-bold block">
                      الطابع اللوني: أرجواني معملي · يشرح وينظم عملية «تعليق وتعتيق» العطر لدمج الكحول بالزيت ومضاعفة الثبات
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('batches')}
                  className="px-3 py-1.5 rounded-xl bg-[#AF52DE] hover:bg-[#9B30FF] text-white text-[11px] font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Box size={13} />
                  <span>فتح سجل دفعات التعتيق ({batches.length})</span>
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Scientific Explanation of Maceration Stages */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-[#AF52DE]/20 space-y-1">
                    <span className="text-[10px] font-mono font-black text-[#AF52DE] block">المرحلة ١ (يوم 1 - 3)</span>
                    <strong className="font-black text-[#1D1D1F] block">الاستقرار الجزيئي الأولي</strong>
                    <p className="text-[11px] text-[#636366] leading-relaxed">
                      بعد الرجّ الجيد لمدة دقيقتين، تبدأ جزيئات الزيت في الذوبان داخل الكحول وتختفي رائحة الكحول اللاذعة تدريجياً.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-[#AF52DE]/20 space-y-1">
                    <span className="text-[10px] font-mono font-black text-[#AF52DE] block">المرحلة ٢ (يوم 4 - 7)</span>
                    <strong className="font-black text-[#1D1D1F] block">ترابط القلب والقاعدة</strong>
                    <p className="text-[11px] text-[#636366] leading-relaxed">
                      يعمل المثبت على ربط النوتات الوسطى بالقاعدة، وتظهر نعومة العطر الحقيقية على شريط الاختبار.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-[#AF52DE]/20 space-y-1">
                    <span className="text-[10px] font-mono font-black text-[#AF52DE] block">المرحلة ٣ (يوم 8 - 14+)</span>
                    <strong className="font-black text-[#1D1D1F] block">النضج الكامل والثبات الأقصى</strong>
                    <p className="text-[11px] text-[#636366] leading-relaxed">
                      يكتمل التعتيق في درجة حرارة (15-20°م) بعيداً عن الضوء، ويزداد الثبات بنسبة 50% ويكون جاهزاً للبيع.
                    </p>
                  </div>
                </div>

                {/* Quick Batch Maceration Launcher inside Tab 1 */}
                <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#636366] block mb-0.5">عدد العبوات للتعتيق:</label>
                      <input
                        type="number"
                        min="1"
                        value={newBatchUnits}
                        onChange={(e) => setNewBatchUnits(Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 h-8 px-2 rounded-xl bg-white border border-black/[0.1] font-mono font-black text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#636366] block mb-0.5">مدة التعتيق (أيام):</label>
                      <select
                        value={macerationTargetDays}
                        onChange={(e) => setMacerationTargetDays(Number(e.target.value))}
                        className="h-8 px-2.5 rounded-xl bg-white border border-black/[0.1] font-bold text-xs outline-none"
                      >
                        <option value={3}>3 أيام (سريع / رول)</option>
                        <option value={7}>7 أيام (تعتيق قياسي)</option>
                        <option value={14}>14 يوماً (تعتيق ملكي عميق)</option>
                        <option value={21}>21 يوماً (تعتيق عود وشرقي مكثف)</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#636366] block mb-0.5">إجمالي الزيت المسحوب:</span>
                      <span className="font-mono font-black text-xs text-[#AF52DE] block">
                        {customOilGrams * newBatchUnits} جم زيت خام
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateProductionBatch}
                    className="px-4 py-2.5 rounded-xl bg-[#AF52DE] hover:bg-[#9B30FF] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <Clock size={14} />
                    <span>تعليق وتعتيق دفعة جديدة الآن</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN [EMERALD GREEN #34C759]: FINANCIAL LEDGER   */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-[28px] bg-white border-2 border-[#34C759]/30 shadow-apple-card overflow-hidden sticky top-4">
              {/* Emerald Header */}
              <div className="px-5 py-4 bg-gradient-to-l from-[#34C759]/15 via-[#34C759]/[0.05] to-transparent border-b border-[#34C759]/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#248A3D] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                    5
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-[#1D1D1F]">
                      الهندسة المالية وحماية الربح (Profit Ledger)
                    </h3>
                    <span className="text-[10px] text-[#248A3D] font-bold block">
                      الطابع اللوني: أخضر زمردي · يحسب التكلفة والسعر والخصم الآمن وصافي المساهمة
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-[#248A3D]/10 text-[#248A3D] font-mono text-xs font-black">
                  {selectedSizeMl} مل
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Raw Material Cost & Packaging Quick Controls */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                    <label className="text-[10px] font-bold text-[#636366] block mb-1">
                      تكلفة جرام الزيت ({selectedProduct.type}):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder={`${effectiveOilCostPerGram}`}
                        value={oilCostPerGramOverride}
                        onChange={(e) => setOilCostPerGramOverride(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full h-8 px-2 rounded-xl bg-white border border-black/[0.08] font-mono text-xs font-black text-center outline-none focus:border-[#248A3D]"
                      />
                      <span className="text-[10px] font-bold text-[#636366]">ج/جم</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                    <label className="text-[10px] font-bold text-[#636366] block mb-1">
                      تعديل سعر البيع (اختياري):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder={`${standardApprovedPrice}`}
                        value={customSellingPrice}
                        onChange={(e) => setCustomSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full h-8 px-2 rounded-xl bg-white border border-black/[0.08] font-mono text-xs font-black text-center outline-none focus:border-[#248A3D]"
                      />
                      <span className="text-[10px] font-bold text-[#636366]">ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Colored Bottle Toggle & Packaging Selector Compact */}
                {!activeRecipe.isRollOn && (
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-black text-amber-950 block">🎁 خيار العبوة الملونة (+35ج فرق تكلفة):</span>
                      <span className="text-[10px] text-amber-800">
                        {canUseColoredBottle
                          ? `سعر البيع المعتمد للعبوة الملونة: ${currentBottleConfig.coloredNormalPrice || currentBottleConfig.coloredSpecialPrice} ج.م`
                          : 'غير متاح تلقائياً لهذا النوع/الحجم دون اعتماد سعر من المالك'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!canUseColoredBottle}
                      onClick={() => setIsColoredBottle(!isColoredBottle)}
                      className={`px-3 py-1.5 rounded-xl font-black text-[10px] transition-all cursor-pointer disabled:opacity-40 ${
                        effectiveColoredBottle
                          ? 'bg-[#C49746] text-white shadow-2xs'
                          : 'bg-white text-amber-900 border border-amber-300'
                      }`}
                    >
                      {effectiveColoredBottle ? '✓ عبوة ملونة نشطة' : 'عبوة عادية قياسية'}
                    </button>
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-black text-[#1D1D1F]">🏷️ خيار التغليف المرفق:</span>
                    <span className="text-[10px] text-[#636366]">
                      تكلفة إضافية: {pkgAccounting.extraPackagingStoreCost >= 0 ? `+${pkgAccounting.extraPackagingStoreCost}` : pkgAccounting.extraPackagingStoreCost} ج
                      {pkgAccounting.replacesBasicBag ? ' (يستبدل الكيس الأساسي 1ج)' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {packagingOptions.map(pkg => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackagingId(pkg.id)}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all truncate cursor-pointer ${
                          selectedPackagingId === pkg.id
                            ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                            : 'bg-white text-[#636366] border-black/[0.08]'
                        }`}
                      >
                        {pkg.name}
                      </button>
                    ))}
                  </div>
                  {selectedPackaging.type === 'luxury' && (
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span>احتساب التغليف الفاخر:</span>
                      <button
                        type="button"
                        onClick={() => setIsPackagingPaidByCustomer(!isPackagingPaidByCustomer)}
                        className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer ${
                          isPackagingPaidByCustomer ? 'bg-[#248A3D] text-white' : 'bg-white border text-[#1D1D1F]'
                        }`}
                      >
                        {isPackagingPaidByCustomer ? `مباع للعميل (+${selectedPackaging.price} ج)` : 'مجاناً (تكلفة على المتجر)'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Detailed Cost & Contribution Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#636366]">
                    <span>١. سعر البيع الإجمالي للعميل:</span>
                    <span className="font-mono font-black text-[#1D1D1F]">{finalPriceWithPackaging} ج.م</span>
                  </div>

                  {/* Discount Simulator */}
                  <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-black text-[#1D1D1F]">٢. محاكي الخصم الآمن:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setTestDiscountType('amount'); setTestDiscountValue(0); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${testDiscountType === 'amount' ? 'bg-[#0071E3] text-white' : 'bg-white text-[#86868B]'}`}
                        >
                          مبلغ (ج)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTestDiscountType('percent'); setTestDiscountValue(0); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${testDiscountType === 'percent' ? 'bg-[#0071E3] text-white' : 'bg-white text-[#86868B]'}`}
                        >
                          نسبة (%)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={testDiscountValue || ''}
                        onChange={(e) => setTestDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full h-8 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono text-xs font-bold outline-none"
                      />
                      <span className="text-[11px] font-mono font-bold text-[#D70015] shrink-0">
                        = -{calculatedDiscountAmount} ج.م
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between font-black text-[#1D1D1F]">
                    <span>٣. صافي السعر بعد الخصم:</span>
                    <span className="font-mono text-sm">{financialResult.netPrice} ج.م</span>
                  </div>

                  <div className="flex justify-between text-[#9A6E23] bg-[#FFF8EB] p-2.5 rounded-xl border border-[#FF9500]/20">
                    <span>٤. التكلفة المعيارية المعتمدة (شاملة الخامات):</span>
                    <span className="font-mono font-black">-{standardApprovedCost} ج.م</span>
                  </div>

                  {hasCostDiscrepancy && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 space-y-1">
                      <div className="font-black flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        <span>«يوجد اختلاف بين التكلفة المعيارية والتكلفة المحسوبة»</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        التكلفة المعيارية المعتمدة ({standardApprovedCost} ج.م) مقابل الحساب التفصيلي ({totalCalculatedCost} ج.م). لا يستبدل النظام التكلفة المعيارية تلقائيًا بحساب آخر وينتظر اعتماد المالك.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-[#5856D6] bg-[#5856D6]/[0.06] p-2.5 rounded-xl border border-[#5856D6]/15">
                    <span>٥. عمولة المبيعات ({activeRecipe.isRollOn ? '0% للرول' : '5%'}):</span>
                    <span className="font-mono font-black">-{financialResult.commission} ج.م</span>
                  </div>

                  {/* Final Net Contribution Highlight */}
                  <div className="p-3.5 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white block">٦. المساهمة (صافي البيع ← التكلفة ← العمولة):</span>
                      <span className="text-[10px] text-zinc-400">هامش المساهمة: {financialResult.marginPercent.toFixed(1)}% · الحد الأدنى الإلزامي ≥ 10 ج</span>
                    </div>
                    <span className={`text-2xl font-black font-mono ${financialResult.contribution >= 10 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      {financialResult.contribution >= 0 ? `+${financialResult.contribution}` : financialResult.contribution} <span className="text-xs font-bold text-zinc-300">ج.م</span>
                    </span>
                  </div>
                </div>

                {/* Safe Discount Guard & 3 Price Tiers */}
                <div className="p-3 rounded-2xl bg-[#E8F8EE]/70 border border-[#34C759]/30 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#248A3D] font-bold">أقصى خصم مسموح به بأمان (مساهمة ≥ 10 ج):</span>
                    <strong className="font-mono text-[#248A3D] font-black">{maxSafeDiscount} ج.م (السعر الآمن ≥ {minSafeNetPrice} ج)</strong>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                    <div className="p-1.5 rounded-xl bg-white border border-black/[0.05]">
                      <span className="text-[9px] text-[#86868B] block font-sans">سعر أساسي</span>
                      <strong className="text-xs text-[#0071E3] font-black">{priceTiers.base} ج</strong>
                    </div>
                    <div className="p-1.5 rounded-xl bg-white border border-black/[0.05]">
                      <span className="text-[9px] text-[#86868B] block font-sans">حد التسويق</span>
                      <strong className="text-xs text-[#FF9500] font-black">{priceTiers.marketingFloor} ج</strong>
                    </div>
                    <div className="p-1.5 rounded-xl bg-white border border-black/[0.05]">
                      <span className="text-[9px] text-[#86868B] block font-sans">خط التكلفة</span>
                      <strong className="text-xs text-[#FF3B30] font-black">{priceTiers.costFloor} ج</strong>
                    </div>
                  </div>
                </div>

                {/* Send to POS Button */}
                <button
                  type="button"
                  disabled={financialResult.isBelowCost || financialResult.contribution < 10}
                  onClick={() => {
                    if (onNavigateToPOS) {
                      onNavigateToPOS(selectedProduct, selectedSizeMl, customOilGrams);
                      showNotification(`تم إرسال تركيبة ${selectedProduct.name} (${selectedSizeMl} مل) إلى الكاشير`, 'success');
                    }
                  }}
                  className={`apple-btn w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-apple-sm transition-all ${
                    !financialResult.isBelowCost && financialResult.contribution >= 10
                      ? 'bg-[#248A3D] hover:bg-[#1E7533] text-white cursor-pointer'
                      : 'bg-black/[0.06] text-[#86868B] cursor-not-allowed'
                  }`}
                >
                  <ArrowRight size={16} />
                  <span>
                    {financialResult.isBelowCost || financialResult.contribution < 10
                      ? '❌ مرفوض: المساهمة أقل من 10 جنيهات أو بسعر التكلفة'
                      : `اعتماد وإرسال للكاشير (${selectedSizeMl} مل · ${finalPriceWithPackaging} ج.م)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2 [DEEP PURPLE #AF52DE]: MACERATION & BATCHES LAB    */}
      {/* ======================================================== */}
      {activeTab === 'batches' && (
        <div className="space-y-5">
          {/* Maceration Scientific Guide Header Card */}
          <div className="rounded-[28px] bg-gradient-to-br from-[#2B124C] via-[#1D1D1F] to-[#1D1D1F] text-white p-5 sm:p-6 border border-[#AF52DE]/40 shadow-apple-card space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-[#AF52DE]/25 border border-[#AF52DE]/40 text-purple-200 text-[11px] font-black inline-flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>غرفة التعتيق والتعليق المعملي (Maceration & Maturation Chamber)</span>
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  لماذا نقوم بتعليق وتعتيق الدفعات العطرية قبل البيع؟
                </h2>
                <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
                  عند خلط الزيت العطري الخام بالكحول الإيثيلي، تظل الجزيئات منفصلة في البداية وتطغى حدة الكحول. عملية <strong>التعليق والتعتيق</strong> في خزانة معتمة بدرجة حرارة (15°–20° مئوية) تسمح بتكوين روابط هيدروجينية مستقرة تمنح العطر ثباتاً أقوى وفوحاناً مخملياً متجانساً.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 shrink-0 text-center font-mono">
                <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
                  <span className="text-[10px] text-purple-300 block font-sans">إجمالي الدفعات</span>
                  <strong className="text-lg font-black text-white">{batches.length}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30">
                  <span className="text-[10px] text-amber-200 block font-sans">قيد التعتيق</span>
                  <strong className="text-lg font-black text-amber-300">
                    {batches.filter(b => b.status === 'تحت الاختبار').length}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30">
                  <span className="text-[10px] text-emerald-200 block font-sans">معتمدة للبيع</span>
                  <strong className="text-lg font-black text-emerald-300">
                    {batches.filter(b => b.status === 'معتمدة').length}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Create New Batch Form Card */}
          <div className="rounded-[28px] bg-white p-5 sm:p-6 border-2 border-[#AF52DE]/25 shadow-apple-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#AF52DE]/12 text-[#AF52DE] flex items-center justify-center">
                  <Box size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1D1D1F]">
                    تسجيل وتعليق دفعة إنتاج جديدة للتعتيق
                  </h3>
                  <p className="text-[11px] text-[#636366]">
                    يتم خصم جرامات الزيت تلقائياً من المخزون وجدولة مواعيد الفحص الحسي الأول والنهائي
                  </p>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-[#AF52DE]/10 text-[#AF52DE] font-mono text-xs font-black">
                {selectedProduct.name} · {selectedSizeMl} مل ({customOilGrams} جم زيت/عبوة)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1">العطر المستهدف:</label>
                <select
                  value={selectedProduct.id}
                  onChange={(e) => {
                    const found = products.find(p => String(p.id) === e.target.value);
                    if (found) setSelectedProduct(found);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-bold outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.stock_grams} جم)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1">حجم العبوة (مل — حر):</label>
                <input
                  type="number"
                  min="2"
                  max="2000"
                  value={selectedSizeMl}
                  onChange={(e) => setSelectedSizeMl(Math.max(2, Number(e.target.value) || 50))}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono font-black text-center outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1">عدد العبوات في الدفعة:</label>
                <input
                  type="number"
                  min="1"
                  value={newBatchUnits}
                  onChange={(e) => setNewBatchUnits(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono font-black text-center outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1">مدة التعتيق المستهدفة:</label>
                <select
                  value={macerationTargetDays}
                  onChange={(e) => setMacerationTargetDays(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-bold outline-none"
                >
                  <option value={3}>3 أيام (تعتيق سريع)</option>
                  <option value={7}>7 أيام (تعتيق قياسي)</option>
                  <option value={14}>14 يوماً (تعتيق ملكي 100%)</option>
                  <option value={21}>21 يوماً (تعتيق شرقي/عود)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1">المورد / مسؤول الخلط:</label>
                <input
                  type="text"
                  value={newBatchSupplier}
                  onChange={(e) => setNewBatchSupplier(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-medium outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF5FF] border border-[#AF52DE]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-black text-[#1D1D1F] block">
                  ملخص الدفعة: إجمالي الزيت المطلوب <strong className="font-mono text-[#AF52DE]">{customOilGrams * newBatchUnits} جم</strong> (متوفر بالمخزون: {selectedProduct.stock_grams} جم)
                </span>
                <span className="text-[11px] text-[#636366]">
                  الفحص الحسي الأول بعد {Math.max(2, Math.round(macerationTargetDays / 2))} أيام · الاعتماد النهائي بعد {macerationTargetDays} يوماً
                </span>
              </div>

              <button
                type="button"
                onClick={handleCreateProductionBatch}
                className="apple-btn px-5 py-2.5 rounded-xl bg-[#AF52DE] hover:bg-[#9B30FF] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
              >
                <Check size={14} />
                <span>اعتماد وتعليق الدفعة للتعتيق ({customOilGrams * newBatchUnits} جم)</span>
              </button>
            </div>
          </div>

          {/* Batches Log List */}
          <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1D1D1F]">سجل دفعات التعتيق والفحص الحسي ({batches.length})</h3>
              <span className="text-[11px] text-[#86868B]">تتبع كامل لتاريخ الخلط والاختبار والاعتماد</span>
            </div>

            {batches.length === 0 ? (
              <div className="py-12 text-center text-[#86868B] space-y-2 bg-[#F5F5F7]/60 rounded-2xl border border-dashed border-black/[0.1]">
                <Clock size={30} className="mx-auto text-[#AF52DE]" />
                <p className="text-xs font-black text-[#1D1D1F]">لا توجد دفعات قيد التعتيق حالياً</p>
                <p className="text-[11px]">استخدم النموذج أعلاه لتعليق أول دفعة إنتاج ومتابعة مراحل نضجها العطري.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {batches.map(b => (
                  <div key={b.id} className="p-4 rounded-2xl bg-[#F5F5F7]/70 border border-black/[0.07] space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-mono font-black text-[#1D1D1F]">{b.batchNumber}</strong>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            b.status === 'معتمدة' ? 'bg-[#E8F8EE] text-[#248A3D]' :
                            b.status === 'تحت الاختبار' ? 'bg-[#FAF5FF] text-[#AF52DE] border border-[#AF52DE]/30' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {b.status === 'تحت الاختبار' ? '⏳ قيد التعتيق والمكث' : '✅ معتمدة وجاهزة'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-[#1D1D1F] mt-1">
                          {b.perfumeName} — {b.unitsCount} عبوات × {b.bottleSizeMl} مل
                        </h4>
                        <span className="text-[11px] text-[#636366] block">
                          التركيبة: {b.oilGramsPerUnit} جم زيت + {b.fixativeGramsPerUnit} جم مثبت + {b.alcoholMlPerUnit} مل كحول · المورد: {b.supplier}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white border border-black/[0.05] text-[10px] font-mono text-center">
                      <div>
                        <span className="text-[#86868B] block font-sans">تاريخ الخلط</span>
                        <strong className="text-[#1D1D1F]">{b.mixingDate}</strong>
                      </div>
                      <div>
                        <span className="text-[#86868B] block font-sans">فحص أولي</span>
                        <strong className="text-[#AF52DE]">{b.firstTestDate}</strong>
                      </div>
                      <div>
                        <span className="text-[#86868B] block font-sans">اكتمال التعتيق</span>
                        <strong className="text-[#248A3D]">{b.finalTestDate}</strong>
                      </div>
                    </div>

                    {b.sensoryEvaluation ? (
                      <div className="p-2.5 rounded-xl bg-[#E8F8EE] border border-[#34C759]/30 text-xs grid grid-cols-3 gap-2 font-mono text-center">
                        <div>
                          <span className="text-[10px] text-[#248A3D] block font-sans">الثبات:</span>
                          <strong className="text-[#1D1D1F] font-black">{b.sensoryEvaluation.longevity}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#248A3D] block font-sans">الفوحان:</span>
                          <strong className="text-[#1D1D1F] font-black">{b.sensoryEvaluation.sillage}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#248A3D] block font-sans">تجانس النوتات:</span>
                          <strong className="text-[#1D1D1F] font-black">{b.sensoryEvaluation.balance}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#AF52DE] font-bold">بانتظار الفحص الحسي بعد التعتيق</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBatchForEval(b)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#AF52DE] hover:bg-[#9B30FF] text-white text-xs font-black transition-colors cursor-pointer"
                        >
                          فحص واعتماد الدفعة 🧪
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Apple HIG Sensory Evaluation Modal */}
          {selectedBatchForEval && (
            <div className="fixed inset-0 z-50 bg-[#1D1D1F]/45 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 w-full max-w-md border border-[#AF52DE]/30 shadow-[0_28px_80px_rgba(0,0,0,0.28)] space-y-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#AF52DE]/12 text-[#AF52DE] flex items-center justify-center">
                      <Beaker size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-[#AF52DE] uppercase tracking-wider block">Maceration Quality Control</span>
                      <h4 className="text-sm font-black text-[#1D1D1F]">اعتماد الفحص الحسي بعد التعتيق</h4>
                      <span className="text-[10px] text-[#86868B] font-mono">{selectedBatchForEval.batchNumber} · {selectedBatchForEval.perfumeName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBatchForEval(null)}
                    className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-black/[0.08] flex items-center justify-center text-[#86868B] cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-black text-[#1D1D1F] block mb-1">١. تقييم الثبات (Longevity):</label>
                    <select
                      value={evalLongevity}
                      onChange={(e) => setEvalLongevity(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-bold outline-none"
                    >
                      <option value="ممتاز">ممتاز (أكثر من 12 ساعة)</option>
                      <option value="جيد">جيد (7 - 10 ساعات)</option>
                      <option value="مقبول">مقبول (4 - 6 ساعات)</option>
                      <option value="ضعيف">ضعيف (يحتاج زيادة تعتيق)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-black text-[#1D1D1F] block mb-1">٢. تقييم الفوحان والانتشار (Sillage):</label>
                    <select
                      value={evalSillage}
                      onChange={(e) => setEvalSillage(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-bold outline-none"
                    >
                      <option value="ممتاز">ممتاز (هالة عطرية واسعة وجذابة)</option>
                      <option value="جيد">جيد (متوازن وملحوظ)</option>
                      <option value="مقبول">مقبول (قريب من الجلد)</option>
                      <option value="ضعيف">ضعيف</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-black text-[#1D1D1F] block mb-1">٣. اختفاء حدة الكحول وتجانس النوتات:</label>
                    <select
                      value={evalBalance}
                      onChange={(e) => setEvalBalance(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-bold outline-none"
                    >
                      <option value="ممتاز">ممتاز (تدرج نقي ومتجانس 100%)</option>
                      <option value="جيد">جيد</option>
                      <option value="مقبول">مقبول</option>
                      <option value="ضعيف">ضعيف</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-black text-[#1D1D1F] block mb-1">ملاحظات المختبر بعد التعتيق:</label>
                    <textarea
                      value={evalNotes}
                      onChange={(e) => setEvalNotes(e.target.value)}
                      placeholder="سجل ملاحظاتك حول نضج الرائحة..."
                      className="w-full h-16 p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchForEval(null)}
                    className="flex-1 py-2.5 rounded-2xl bg-[#F5F5F7] hover:bg-black/[0.08] text-xs font-bold text-[#1D1D1F] cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSensoryEval}
                    className="flex-2 py-2.5 px-4 rounded-2xl bg-[#248A3D] hover:bg-[#1E7533] text-white text-xs font-black shadow-sm cursor-pointer"
                  >
                    اعتماد الدفعة للبيع التجاري
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SMART FRAGRANCE INTEL & SOURCES EXPLORER          */}
      {/* ======================================================== */}
      {activeTab === 'intel' && (
        <div className="space-y-4">
          <div className="rounded-[28px] bg-white p-5 sm:p-6 border-2 border-[#C49746]/30 shadow-apple-card space-y-4">
            <div>
              <span className="text-xs font-black text-[#9A6E23] flex items-center gap-1.5">
                <Search size={16} className="text-[#C49746]" />
                <span>موسوعة النوتات العطرية ومعايير السلامة الدولية (IFRA Category 4)</span>
              </span>
              <p className="text-xs text-[#636366] mt-0.5">
                ابحث عن أي عطر عالمي أو شرقي لاستخراج الهرم العطري والأكوردات وحدود الأمان الجلدية المعتمدة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchFragranceIntel(searchQuery)}
                placeholder="اكتب اسم العطر بدقة (مثال: Khamrah, Sauvage, Baccarat Rouge)..."
                className="w-full h-11 px-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#C49746] text-xs font-bold outline-none"
              />
              <button
                type="button"
                onClick={() => handleSearchFragranceIntel(searchQuery || selectedProduct.name)}
                disabled={intelLoading}
                className="px-5 h-11 rounded-2xl bg-[#C49746] hover:bg-[#9A6E23] text-white text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Search size={14} />
                <span>{intelLoading ? 'جاري الفحص...' : 'فحص موثق'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none pt-1">
              <span className="text-[#86868B] shrink-0">عطور سريعة الفحص:</span>
              {['خمرة', 'سوفاج', 'بلاك أفغانو', 'بلو شانيل', 'عود كمبودي', 'توباكو ڤانيلا'].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setSearchQuery(chip);
                    handleSearchFragranceIntel(chip);
                  }}
                  className="px-3 py-1 rounded-xl bg-[#FFF8EB] hover:bg-[#C49746] text-[#9A6E23] hover:text-white font-bold shrink-0 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {intelResult && (
            <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/[0.06] gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#86868B]">
                    <span>{intelResult.brand}</span>
                    <span aria-hidden="true">·</span>
                    <span>سنة الإصدار: {intelResult.releaseYear || 'موثقة'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-[#1D1D1F]">{intelResult.classification}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1D1D1F] mt-1">{intelResult.name}</h2>
                </div>

                <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  intelResult.confidenceDegree === 'عالية' ? 'bg-[#E8F8EE] text-[#248A3D]' :
                  intelResult.confidenceDegree === 'متوسطة' ? 'bg-[#FFF8EB] text-[#9A6E23]' :
                  'bg-[#FFF5F5] text-[#D70015]'
                }`}>
                  درجة الثقة: {intelResult.confidenceDegree}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] space-y-1">
                  <span className="text-[11px] font-black text-[#1D1D1F] block">الأكوردات الرئيسية:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {intelResult.mainAccords.map((acc, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-lg bg-white text-[#1D1D1F] text-xs font-bold shadow-2xs">
                        {acc}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] space-y-1">
                  <span className="text-[11px] font-black text-[#1D1D1F] block">الطابع العام والموسم:</span>
                  <p className="text-xs text-[#48484A] font-medium leading-relaxed">
                    {intelResult.generalCharacter}
                  </p>
                  <span className="text-[10px] text-[#0071E3] font-black block pt-1">
                    {intelResult.appropriateUse} · {intelResult.seasonSuggested}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#E8F8EE]/60 border border-[#34C759]/30 space-y-1">
                  <span className="text-[11px] font-black text-[#248A3D] block">حد الأمان وفق IFRA Category 4:</span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-xl font-black font-mono text-[#248A3D]">
                      {intelResult.ifraCategory4SafeLimitPercent || 25}%
                    </span>
                    <span className="text-[11px] text-[#48484A]">حد أقصى آمن على الجلد</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: FINANCIAL AI AUDITOR                              */}
      {/* ======================================================== */}
      {activeTab === 'auditor' && (
        <div className="space-y-4">
          <div className="rounded-[28px] bg-white p-5 border-2 border-[#FF2D55]/25 shadow-apple-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-[#FF2D55] flex items-center gap-1.5">
                <ShieldAlert size={16} />
                <span>المدقق المحاسبي والتشغيلي الذكي (AI Financial Auditor)</span>
              </span>
              <p className="text-xs text-[#636366] mt-0.5">
                فحص آلي لتكاليف التركيب، الهوامش الربحية، وتنبيهات المخزون.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunAuditor}
              disabled={auditorLoading}
              className="px-4 py-2 rounded-xl bg-[#FF2D55] hover:bg-[#D70015] text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>{auditorLoading ? 'جاري الفحص الدقيق...' : 'إعادة التدقيق الآن'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {auditAnomalies.map(anom => (
              <div key={anom.id} className="p-4 rounded-2xl bg-white border border-black/[0.08] shadow-apple-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#1D1D1F]">{anom.title}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFF5F5] text-[#D70015] text-[10px] font-black">
                    {anom.severity}
                  </span>
                </div>
                <p className="text-xs text-[#48484A] leading-relaxed">{anom.description}</p>
                <div className="p-2.5 rounded-xl bg-[#F5F5F7] text-[11px] space-y-0.5">
                  <div><span className="text-[#86868B]">الإجراء المقترح: </span><strong className="text-[#1D1D1F]">{anom.suggestedAction}</strong></div>
                  <div><span className="text-[#86868B]">الأثر المتوقع: </span><span className="text-[#248A3D] font-bold">{anom.expectedImpact}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: IMMUTABLE AUDIT TRAIL                             */}
      {/* ======================================================== */}
      {activeTab === 'audit_trail' && (
        <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
            <div>
              <h3 className="text-sm font-black text-[#1D1D1F] flex items-center gap-1.5">
                <History size={16} />
                <span>سجل التغييرات والتدقيق الرقابي (Immutable Audit Trail)</span>
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                توثيق زمني كامل لأي تعديل في النسب أو الأسعار أو دفعات التعتيق.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-[#F5F5F7] font-mono text-xs font-black text-[#1D1D1F]">
              {auditLogs.length} سجلات
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-0.5">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3.5 rounded-2xl bg-[#F5F5F7]/70 border border-black/[0.06] space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <strong className="text-[#1D1D1F]">{log.user}</strong>
                    <span className="px-2 py-0.5 rounded-md bg-white text-[#0071E3] font-bold">{log.action}</span>
                    <span className="text-[#636366] font-mono">{log.entityName}</span>
                  </div>
                  <span className="text-[#86868B] font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                  <span className="text-[#D70015]">السابق: {String(log.oldValue)}</span>
                  <span className="text-gray-400">←</span>
                  <span className="text-[#248A3D] font-bold">الجديد: {String(log.newValue)}</span>
                </div>
                <p className="text-[11px] text-[#636366]">السبب: <strong className="text-[#1D1D1F]">{log.reason}</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* APPLE HIG PREVIEW BEFORE APPROVAL MODAL                  */}
      {/* ======================================================== */}
      {previewApprovalModal.open && (
        <div className="fixed inset-0 z-50 bg-[#1D1D1F]/45 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 w-full max-w-md border border-black/[0.08] shadow-[0_28px_80px_rgba(0,0,0,0.28)] space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06]">
              <h4 className="text-sm font-black text-[#1D1D1F] flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#0071E3]" />
                <span>{previewApprovalModal.title}</span>
              </h4>
              <button
                onClick={() => setPreviewApprovalModal(prev => ({ ...prev, open: false }))}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-black/[0.08] flex items-center justify-center text-[#86868B] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-[#636366] block">التغييرات المقترحة والأثر التشغيلي:</span>
              <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2">
                {previewApprovalModal.proposedChanges.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[#1D1D1F] font-medium">
                    <span className="text-[#0071E3] font-black">•</span>
                    <span>{change}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPreviewApprovalModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 rounded-2xl bg-[#F5F5F7] hover:bg-black/[0.08] text-xs font-bold text-[#1D1D1F] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={previewApprovalModal.onConfirm}
                className="flex-2 py-2.5 px-4 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black shadow-sm cursor-pointer"
              >
                اعتماد التعديل رسمياً
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductFormulationEngine;
