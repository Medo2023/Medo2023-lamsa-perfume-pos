import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Product,
  PerfumeType,
  Gender,
  Season,
  FragranceDatabaseEntry,
} from '../types';
import {
  parseBulkPerfumesWithAI,
  analyzeClassifyAndEnrichBulkPerfumesWithAI,
  autoCorrectAndEnrichItemDeterministic,
  normalizePerfumeNameForAudit,
  ParsedBulkProduct,
} from '../services/geminiService';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Check,
  FileText,
  UploadCloud,
  AlertCircle,
  Table,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  GitMerge,
  Eye,
  Wand2,
  Database,
  Layers,
  ArrowRightLeft,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export type DuplicateResolutionAction = 'merge_stock' | 'skip' | 'add_new';

export interface BulkImportExecutionResult {
  finalProductsList: Product[];
  addedCount: number;
  mergedCount: number;
  skippedCount: number;
  correctedNamesCount: number;
  totalGramsAdded: number;
  enrichedProfiles: FragranceDatabaseEntry[];
  invoiceReference?: string;
  supplierName?: string;
}

interface BulkPerfumeImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  onExecuteBulkImport: (result: BulkImportExecutionResult) => void;
  initialTab?: 'csv_upload' | 'manual_table' | 'ai_text';
}

const SAMPLE_TEXT_TEMPLATE = `فاتورة توريد زيوت عطرية خام - مورد النخبة:
1. سوفاج اليكسر - ديور - فرنسي - رجالي - شتاء - عادي - 1000 جرام
2. بكرات روج 540 - فرنسي - مشترك - 750 جم
3. مسك الطهاره الابيض - سويسري - مسك - 500 جرام
4. ليبر انتنس - ايف سان لوران - نسائي - 500 جم
5. خمره لطافه - إماراتي - مشترك - شتاء - 1000 جرام
6. عود كمبودى معتق - إماراتي - عود - 250 جم`;

const SAMPLE_CSV_CONTENT = `اسم العطر,الماركة,المنشأ,الفئة,الموسم,النوع,الكمية بالجرام
سوفاج اليكسر,ديور,فرنسي,رجالي,شتاء,عادي,1000
بكرات روج 540,MFK,فرنسي,مشترك,كل الفصول,عادي,750
خمره,لطافة,إماراتي,مشترك,شتاء,عادي,1000
مسك الطهاره,لمسة عطر,سويسري,مشترك,كل الفصول,مسك,500
جود جيرل,كارولينا هيريرا,أمريكي,نسائي,شتاء,عادي,500
عود كمبودي معتق,الرصاصي,إماراتي,مشترك,شتاء,عود,250`;

export const BulkPerfumeImporterModal: React.FC<BulkPerfumeImporterModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  onExecuteBulkImport,
  initialTab = 'csv_upload',
}) => {
  const [activeTab, setActiveTab] = useState<'csv_upload' | 'manual_table' | 'ai_text'>(initialTab);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedBulkProduct[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Invoice metadata for audit trail
  const [supplierName, setSupplierName] = useState('مورد الزيوت العطرية المعتمد');
  const [invoiceReference, setInvoiceReference] = useState(
    `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  );

  // Per-row duplicate resolution override & expanded profile preview
  const [rowResolutions, setRowResolutions] = useState<Record<number, DuplicateResolutionAction>>({});
  const [globalDuplicatePolicy, setGlobalDuplicatePolicy] = useState<DuplicateResolutionAction>('merge_stock');
  const [expandedRowIdx, setExpandedRowIdx] = useState<number | null>(null);
  const [intraBatchMergeNotice, setIntraBatchMergeNotice] = useState<string | null>(null);

  // Fast Bulk Grid state
  const [defaultBulkGrams, setDefaultBulkGrams] = useState<number>(1000);
  const [defaultBulkOrigin, setDefaultBulkOrigin] = useState<string>('فرنسي');
  const [defaultBulkType, setDefaultBulkType] = useState<PerfumeType>('عادي');
  const [manualPage, setManualPage] = useState<number>(1);
  const [auditPage, setAuditPage] = useState<number>(1);
  const MANUAL_ROWS_PER_PAGE = 4;
  const AUDIT_ROWS_PER_PAGE = 4;
  const [tableRows, setTableRows] = useState<ParsedBulkProduct[]>([
    { name: '', brand: '', origin: 'فرنسي', gender: 'مشترك', season: 'كل الفصول', type: 'عادي', stock_grams: 1000 },
    { name: '', brand: '', origin: 'فرنسي', gender: 'مشترك', season: 'كل الفصول', type: 'عادي', stock_grams: 1000 },
    { name: '', brand: '', origin: 'فرنسي', gender: 'مشترك', season: 'كل الفصول', type: 'عادي', stock_grams: 1000 },
  ]);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build normalized lookup of existing inventory for Automated Anti-Duplicate Audit
  const existingInventoryMap = useMemo(() => {
    const map = new Map<string, Product>();
    existingProducts.forEach((p) => {
      const norm = normalizePerfumeNameForAudit(p.name);
      if (norm) map.set(norm, p);
    });
    return map;
  }, [existingProducts]);

  // Audit analysis for each parsed item
  const auditReport = useMemo(() => {
    const seenInBatch = new Map<string, number>();
    const rowAudits = parsedItems.map((item, idx) => {
      const normName = normalizePerfumeNameForAudit(item.name);
      const normOriginal = normalizePerfumeNameForAudit(item.originalInputName || item.name);

      const matchedExisting =
        existingInventoryMap.get(normName) ||
        existingInventoryMap.get(normOriginal) ||
        existingProducts.find((p) => {
          const pNorm = normalizePerfumeNameForAudit(p.name);
          return (
            pNorm.length >= 4 &&
            normName.length >= 4 &&
            (pNorm === normName || pNorm.includes(normName) || normName.includes(pNorm))
          );
        });

      const firstBatchIdx = seenInBatch.get(normName);
      const isIntraBatchDuplicate = firstBatchIdx !== undefined && firstBatchIdx !== idx;
      if (firstBatchIdx === undefined && normName) {
        seenInBatch.set(normName, idx);
      }

      const resolution: DuplicateResolutionAction =
        rowResolutions[idx] || (matchedExisting ? globalDuplicatePolicy : 'add_new');

      return {
        idx,
        normName,
        matchedExisting,
        isExistingDuplicate: Boolean(matchedExisting),
        isIntraBatchDuplicate,
        firstBatchIdx,
        resolution,
      };
    });

    const existingDuplicatesCount = rowAudits.filter((a) => a.isExistingDuplicate).length;
    const intraBatchDuplicatesCount = rowAudits.filter((a) => a.isIntraBatchDuplicate).length;
    const correctedNamesCount = parsedItems.filter((i) => i.wasNameCorrected).length;
    const enrichedCount = parsedItems.filter((i) => i.topNotes && i.topNotes.length > 0).length;

    return {
      rowAudits,
      existingDuplicatesCount,
      intraBatchDuplicatesCount,
      correctedNamesCount,
      enrichedCount,
    };
  }, [parsedItems, existingInventoryMap, existingProducts, rowResolutions, globalDuplicatePolicy]);

  if (!isOpen) return null;

  // CSV Parser supporting quotes, commas, semicolons, tabs, and Arabic headers
  const parseCsvStringToItems = async (csvText: string, fileNameLabel?: string) => {
    setAnalysisError(null);
    setIntraBatchMergeNotice(null);
    const cleanText = csvText.replace(/^\uFEFF/, '').trim();
    if (!cleanText) {
      setAnalysisError('ملف CSV فارغ أو لا يحتوي على أسطر صالحة.');
      return;
    }

    const lines = cleanText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setAnalysisError('لم يتم العثور على بيانات داخل الملف.');
      return;
    }

    // Detect delimiter (comma, semicolon, or tab)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t')
      ? '\t'
      : firstLine.split(';').length > firstLine.split(',').length
      ? ';'
      : ',';

    const splitCsvRow = (rowStr: string): string[] => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const ch = rowStr[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === delimiter && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      return cells.map((c) => c.replace(/^["']|["']$/g, '').trim());
    };

    const headerCells = splitCsvRow(lines[0]).map((h) => h.toLowerCase());
    const hasHeader = headerCells.some((h) =>
      /(اسم|العطر|الصنف|name|perfume|item|الماركة|brand|الكمية|جرام|stock|grams)/i.test(h)
    );

    const dataLines = hasHeader ? lines.slice(1) : lines;
    if (dataLines.length === 0) {
      setAnalysisError('الملف يحتوي على سطر العناوين فقط بدون أصناف.');
      return;
    }

    // Map column indices
    let nameIdx = 0;
    let brandIdx = 1;
    let originIdx = 2;
    let genderIdx = 3;
    let seasonIdx = 4;
    let typeIdx = 5;
    let gramsIdx = 6;

    if (hasHeader) {
      headerCells.forEach((h, i) => {
        if (/(اسم|العطر|الصنف|name|perfume|product)/i.test(h)) nameIdx = i;
        else if (/(ماركة|الماركة|براند|brand|دار)/i.test(h)) brandIdx = i;
        else if (/(منشأ|المنشأ|بلد|origin|country)/i.test(h)) originIdx = i;
        else if (/(فئة|الفئة|جنس|الجنس|gender)/i.test(h)) genderIdx = i;
        else if (/(موسم|الموسم|فصل|season)/i.test(h)) seasonIdx = i;
        else if (/(نوع|النوع|خام|type|category)/i.test(h)) typeIdx = i;
        else if (/(كمية|الكمية|جرام|الوزن|رصيد|grams|stock|qty|weight)/i.test(h)) gramsIdx = i;
      });
    }

    const rawDrafts: ParsedBulkProduct[] = [];
    dataLines.forEach((line) => {
      const cols = splitCsvRow(line);
      if (cols.length === 0 || !cols[nameIdx]?.trim()) return;

      const rawName = cols[nameIdx].trim();
      // If a 2-column CSV (Name, Grams) was uploaded
      let rawGrams = 1000;
      if (cols.length === 2 && !isNaN(Number(cols[1].replace(/[^\d.]/g, '')))) {
        rawGrams = Number(cols[1].replace(/[^\d.]/g, '')) || 1000;
      } else if (cols[gramsIdx] !== undefined) {
        const parsedG = Number(cols[gramsIdx].replace(/[^\d.]/g, ''));
        if (!isNaN(parsedG) && parsedG > 0) rawGrams = parsedG;
      }

      const rawBrand = cols.length > 2 ? cols[brandIdx] || '' : '';
      const rawOrigin = cols.length > 2 ? cols[originIdx] || '' : '';
      const rawGender = (cols.length > 3 ? cols[genderIdx] : '') as Gender;
      const rawSeason = (cols.length > 4 ? cols[seasonIdx] : '') as Season;
      const rawType = (cols.length > 5 ? cols[typeIdx] : '') as PerfumeType;

      rawDrafts.push(
        autoCorrectAndEnrichItemDeterministic({
          originalInputName: rawName,
          name: rawName,
          brand: rawBrand,
          origin: rawOrigin,
          gender: ['رجالي', 'نسائي', 'مشترك'].includes(rawGender) ? rawGender : undefined,
          season: ['صيف', 'شتاء', 'كل الفصول'].includes(rawSeason) ? rawSeason : undefined,
          type: ['عادي', 'مسك', 'عود'].includes(rawType) ? rawType : undefined,
          stock_grams: Math.round(rawGrams),
        })
      );
    });

    if (rawDrafts.length === 0) {
      setAnalysisError('لم يتم العثور على أصناف صالحة في ملف CSV.');
      return;
    }

    if (fileNameLabel) setUploadedFileName(fileNameLabel);
    setIsAnalyzing(true);
    try {
      const aiEnriched = await analyzeClassifyAndEnrichBulkPerfumesWithAI(rawDrafts);
      setParsedItems(aiEnriched);
    } catch {
      setParsedItems(rawDrafts);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target?.result || '');
      parseCsvStringToItems(content, file.name);
    };
    reader.onerror = () => {
      setAnalysisError('تعذر قراءة الملف المرفوع. يرجى التأكد من صيغة CSV أو TXT.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDownloadCsvTemplate = () => {
    const blob = new Blob(['\uFEFF' + SAMPLE_CSV_CONTENT], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `قالب-فاتورة-عطور-لمسة-عطر.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle AI Text Parse
  const handleAnalyzeText = async () => {
    if (!inputText.trim()) {
      setAnalysisError('يرجى كتابة أو لصق نص قائمة العطور أولاً.');
      return;
    }
    setAnalysisError(null);
    setIntraBatchMergeNotice(null);
    setIsAnalyzing(true);
    try {
      const items = await parseBulkPerfumesWithAI(inputText);
      if (items.length === 0) {
        setAnalysisError('لم يتم العثور على أصناف قابلة للاستخراج، يرجى التأكد من صياغة النص.');
      } else {
        setParsedItems(items);
      }
    } catch {
      setAnalysisError('حدث خطأ أثناء تحليل النص، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-run AI Deep Analysis & Auto-Correction on current review list
  const handleRunDeepAIEnrichmentOnReview = async () => {
    if (parsedItems.length === 0) return;
    setIsAnalyzing(true);
    try {
      const enriched = await analyzeClassifyAndEnrichBulkPerfumesWithAI(parsedItems);
      setParsedItems(enriched);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Deduplicate Intra-Batch Duplicates automatically (combines grams of identical rows in the same invoice)
  const handleDeduplicateIntraBatch = () => {
    const map = new Map<string, ParsedBulkProduct>();
    let mergedRows = 0;

    parsedItems.forEach((item) => {
      const norm = normalizePerfumeNameForAudit(item.name);
      const existing = map.get(norm);
      if (existing) {
        existing.stock_grams = (Number(existing.stock_grams) || 0) + (Number(item.stock_grams) || 0);
        mergedRows++;
      } else {
        map.set(norm, { ...item });
      }
    });

    if (mergedRows > 0) {
      setParsedItems(Array.from(map.values()));
      setIntraBatchMergeNotice(
        `تم دمج (${mergedRows}) سطر مكرر داخل نفس الفاتورة وجمع جراماتها تلقائياً بنجاح!`
      );
    }
  };

  // Add manual rows in table mode
  const handleAddManualRows = (count: number = 1) => {
    const additions: ParsedBulkProduct[] = Array.from({ length: count }, () => ({
      name: '',
      brand: '',
      origin: defaultBulkOrigin,
      gender: 'مشترك',
      season: 'كل الفصول',
      type: defaultBulkType,
      stock_grams: defaultBulkGrams,
    }));
    setTableRows((prev) => {
      const next = [...prev, ...additions];
      setManualPage(Math.max(1, Math.ceil(next.length / MANUAL_ROWS_PER_PAGE)));
      return next;
    });
  };

  const handleApplyDefaultsToAllTableRows = () => {
    setTableRows((prev) =>
      prev.map((row) => ({
        ...row,
        origin: defaultBulkOrigin,
        type: defaultBulkType,
        stock_grams: defaultBulkGrams,
      }))
    );
  };

  const handleRemoveItem = (index: number, fromReview: boolean = true) => {
    if (fromReview) {
      setParsedItems((prev) => prev.filter((_, i) => i !== index));
    } else {
      if (tableRows.length <= 1) return;
      setTableRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpdateParsedItem = (index: number, field: keyof ParsedBulkProduct, val: any) => {
    setParsedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleUpdateTableRow = (index: number, field: keyof ParsedBulkProduct, val: any) => {
    setTableRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Move manual table rows to AI Audit & Review
  const handleMoveTableToReview = async () => {
    const valid = tableRows.filter((r) => r.name.trim().length > 0);
    if (valid.length === 0) {
      setAnalysisError('يرجى إدخال اسم عطر واحد على الأقل في الجدول.');
      return;
    }
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const enriched = await analyzeClassifyAndEnrichBulkPerfumesWithAI(
        valid.map((r) => ({
          ...r,
          originalInputName: r.name.trim(),
        }))
      );
      setParsedItems(enriched);
    } catch {
      setParsedItems(valid.map((r) => autoCorrectAndEnrichItemDeterministic(r)));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Final Confirmation: Execute Anti-Duplicate Audit, Save Products & Build Full FragranceDatabaseEntry Profiles
  const handleConfirmAndSave = () => {
    if (parsedItems.length === 0) return;

    const baseId = Date.now();
    const updatedProductsMap = new Map<number | string, Product>();
    existingProducts.forEach((p) => updatedProductsMap.set(p.id, { ...p }));

    const newlyAddedProducts: Product[] = [];
    const enrichedProfiles: FragranceDatabaseEntry[] = [];

    let addedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;
    let correctedNamesCount = 0;
    let totalGramsAdded = 0;

    parsedItems.forEach((item, idx) => {
      const audit = auditReport.rowAudits[idx];
      const grams = Math.max(1, Math.round(Number(item.stock_grams) || 1000));
      if (item.wasNameCorrected) correctedNamesCount++;

      // Build complete analysis object for Product
      const productAnalysis = {
        topNotes: item.topNotes && item.topNotes.length > 0 ? item.topNotes : ['برغموت', 'نوتات افتتاحية منعشة'],
        heartNotes: item.heartNotes && item.heartNotes.length > 0 ? item.heartNotes : ['قلب عطري فاخر'],
        baseNotes: item.baseNotes && item.baseNotes.length > 0 ? item.baseNotes : ['عنبر', 'مسك أبيض', 'أخشاب'],
        mainAccords: item.mainAccords && item.mainAccords.length > 0 ? item.mainAccords : ['أروماتيك', 'فاخر'],
        bestSeason: item.season || 'كل الفصول',
        bestTime: item.timeOfDay || 'كل الأوقات',
        longevity: item.longevity || 'ممتاز (10 ساعات)',
        sillage: item.sillage || 'فوحان قوي وجذاب',
        salesPitch:
          item.salesPitch ||
          `عطر ${item.name} بتركيز زيت نقي 100% يمنحك ثباتاً وفوحاناً استثنائياً طوال اليوم.`,
        layeringSuggestion:
          item.layeringSuggestions || 'ينصح بخلطه مع لمسة مسك أبيض نقي لمضاعفة الثبات.',
      };

      let targetProductId: number | string = baseId + idx;

      if (audit.isExistingDuplicate && audit.matchedExisting) {
        if (audit.resolution === 'skip') {
          skippedCount++;
          return;
        } else if (audit.resolution === 'merge_stock') {
          const existingProd = updatedProductsMap.get(audit.matchedExisting.id) || audit.matchedExisting;
          targetProductId = existingProd.id;
          const mergedProd: Product = {
            ...existingProd,
            name: item.name.trim() || existingProd.name,
            brand: item.brand.trim() || existingProd.brand,
            origin: item.origin || existingProd.origin,
            gender: item.gender || existingProd.gender,
            season: item.season || existingProd.season,
            timeOfDay: item.timeOfDay || existingProd.timeOfDay || 'كل الأوقات',
            type: item.type || existingProd.type,
            stock_grams: (existingProd.stock_grams || 0) + grams,
            analysis: productAnalysis,
            occasions: item.occasions || existingProd.occasions || ['دوام يومي', 'مناسبات', 'سهرة'],
          };
          updatedProductsMap.set(existingProd.id, mergedProd);
          mergedCount++;
          totalGramsAdded += grams;
        } else {
          // Force add as new product
          const newProd: Product = {
            id: targetProductId,
            name: item.name.trim(),
            brand: item.brand.trim() || 'لمسة عطر',
            origin: item.origin || 'فرنسي',
            gender: item.gender || 'مشترك',
            season: item.season || 'كل الفصول',
            timeOfDay: item.timeOfDay || 'كل الأوقات',
            type: item.type || 'عادي',
            stock_grams: grams,
            analysis: productAnalysis,
            occasions: item.occasions || ['دوام يومي', 'مناسبات', 'سهرة'],
          };
          newlyAddedProducts.push(newProd);
          addedCount++;
          totalGramsAdded += grams;
        }
      } else {
        // Brand new product
        const newProd: Product = {
          id: targetProductId,
          name: item.name.trim(),
          brand: item.brand.trim() || 'لمسة عطر',
          origin: item.origin || 'فرنسي',
          gender: item.gender || 'مشترك',
          season: item.season || 'كل الفصول',
          timeOfDay: item.timeOfDay || 'كل الأوقات',
          type: item.type || 'عادي',
          stock_grams: grams,
          analysis: productAnalysis,
          occasions: item.occasions || ['دوام يومي', 'مناسبات', 'سهرة'],
        };
        newlyAddedProducts.push(newProd);
        addedCount++;
        totalGramsAdded += grams;
      }

      // Build comprehensive FragranceDatabaseEntry for internal encyclopedia & cloud sync
      const slug = normalizePerfumeNameForAudit(item.name).replace(/\s+/g, '-') || `item-${idx}`;
      const dbProfile: FragranceDatabaseEntry = {
        id: `frag-${slug}-${targetProductId}`,
        productId: targetProductId,
        name: item.name.trim(),
        brand: item.brand.trim() || 'لمسة عطر',
        manufacturer: item.brand.trim() || 'معامل الزيوت العطرية المعتمدة',
        origin: item.origin || 'فرنسي',
        type: item.type || 'عادي',
        gender: item.gender || 'مشترك',
        concentration: 'زيت عطري خام نقي 100% (Pure Perfume Oil)',
        classification: item.classification || 'أروماتيك شرقي فاخر',
        topNotes: productAnalysis.topNotes,
        heartNotes: productAnalysis.heartNotes,
        baseNotes: productAnalysis.baseNotes,
        mainAccords: productAnalysis.mainAccords,
        generalCharacter: item.generalCharacter || 'عطر متوازن ذو حضور فخم وثبات عالٍ',
        longevity: productAnalysis.longevity,
        sillage: productAnalysis.sillage,
        bestUses: 'الاستخدام اليومي والمناسبات الخاصة والسهرات',
        occasions: item.occasions || ['دوام يومي', 'عمل', 'مناسبات', 'سهرة'],
        seasons: [item.season || 'كل الفصول'],
        timeOfDay: [item.timeOfDay || 'كل الأوقات'],
        salesPitch: productAnalysis.salesPitch,
        layeringSuggestions: productAnalysis.layeringSuggestion,
        inStoreAlternatives: item.similarPerfumes || [],
        similarPerfumes: item.similarPerfumes || [],
        sourcesRanked: [
          { rank: 1, name: 'محرك الذكاء الاصطناعي وموسوعة لمسة عطر المعتمدة', type: 'official_brand' },
          { rank: 2, name: `فاتورة توريد (${invoiceReference || 'مباشر'})`, type: 'supplier' },
          { rank: 3, name: 'معايير IFRA الدولية للزيوت العطرية', type: 'ifra' },
        ],
        confidenceDegree: 'عالية',
        confidenceReason: 'تم التحليل والتصحيح الإملائي والتصنيف العطري آلياً عبر الذكاء الاصطناعي ومطابقة الكتالوج.',
        approvalStatus: 'معتمد',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      enrichedProfiles.push(dbProfile);
    });

    const finalProductsList = [...newlyAddedProducts, ...Array.from(updatedProductsMap.values())];

    onExecuteBulkImport({
      finalProductsList,
      addedCount,
      mergedCount,
      skippedCount,
      correctedNamesCount,
      totalGramsAdded,
      enrichedProfiles,
      invoiceReference: invoiceReference.trim(),
      supplierName: supplierName.trim(),
    });
    onClose();
  };

  const totalManualPages = Math.max(1, Math.ceil(tableRows.length / MANUAL_ROWS_PER_PAGE));
  const safeManualPage = Math.min(manualPage, totalManualPages);
  const manualStartIndex = (safeManualPage - 1) * MANUAL_ROWS_PER_PAGE;
  const visibleManualRows = tableRows.slice(
    manualStartIndex,
    manualStartIndex + MANUAL_ROWS_PER_PAGE
  );

  const totalAuditPages = Math.max(1, Math.ceil(parsedItems.length / AUDIT_ROWS_PER_PAGE));
  const safeAuditPage = Math.min(auditPage, totalAuditPages);
  const auditStartIndex = (safeAuditPage - 1) * AUDIT_ROWS_PER_PAGE;
  const visibleAuditItems = parsedItems.slice(
    auditStartIndex,
    auditStartIndex + AUDIT_ROWS_PER_PAGE
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
    >
      <div className="smart-modal-window apple-glass rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl border border-white/60 flex flex-col bg-[#FBFBFD] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-black/[0.06] flex items-center justify-between bg-gradient-to-l from-[#1D1D1F] via-[#242426] to-[#1D1D1F] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0071E3] via-indigo-500 to-[#C49746] text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white">
                  الإدخال الجماعي السريع ورفع فواتير CSV مع التدقيق الذكي (Bulk Add & AI Audit)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  منع تكرار الأصناف + تصحيح وتصنيف AI تلقائي
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 truncate">
                ارفع ملف CSV أو أدخل فاتورة كاملة دفعة واحدة — تصحيح الأسماء، تصنيف العطور، ومنع التكرار تلقائياً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="إغلاق النافذة"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-hidden space-y-3 flex-1 flex flex-col justify-between">
          {/* Supplier & Invoice Metadata Bar */}
          <div className="p-3.5 rounded-2xl bg-white border border-black/[0.06] shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <label className="text-[11px] font-bold text-[#636366] block mb-1">
                اسم المورد / مصدر الفاتورة:
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="مثال: شركة لوزي / مورد الزيوت العطرية"
                className="w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.06] text-xs font-bold text-[#1D1D1F] outline-none focus:border-[#0071E3]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#636366] block mb-1">
                رقم الفاتورة المرجعي (للتدقيق والأرشفة):
              </label>
              <input
                type="text"
                dir="ltr"
                value={invoiceReference}
                onChange={(e) => setInvoiceReference(e.target.value)}
                placeholder="INV-20260927"
                className="w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.06] font-mono text-xs font-bold text-[#0071E3] outline-none focus:border-[#0071E3]"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
              <div className="text-right">
                <span className="text-[10px] text-[#86868B] block">الأصناف المسجلة حالياً بالمخزون</span>
                <span className="text-sm font-black text-[#1D1D1F] font-mono">
                  {existingProducts.length} عطر خام
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0071E3] flex items-center justify-center">
                <Database size={18} />
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs (When not in review screen) */}
          {parsedItems.length === 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-black/[0.06]">
              <div className="apple-segmented-bg flex items-center flex-wrap p-1 rounded-2xl bg-black/[0.05] gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('csv_upload');
                    setAnalysisError(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'csv_upload'
                      ? 'bg-white text-[#1D1D1F] shadow-xs font-black'
                      : 'text-[#636366] hover:text-[#1D1D1F]'
                  }`}
                >
                  <FileSpreadsheet
                    size={15}
                    className={activeTab === 'csv_upload' ? 'text-emerald-600' : ''}
                  />
                  <span>1. رفع ملف CSV / إكسل للفواتير الكبيرة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('manual_table');
                    setAnalysisError(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'manual_table'
                      ? 'bg-white text-[#1D1D1F] shadow-xs font-black'
                      : 'text-[#636366] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Table size={15} className={activeTab === 'manual_table' ? 'text-[#0071E3]' : ''} />
                  <span>2. جدول الإدخال السريع لعدة عطور (Bulk Add)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ai_text');
                    setAnalysisError(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'ai_text'
                      ? 'bg-white text-[#1D1D1F] shadow-xs font-black'
                      : 'text-[#636366] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Sparkles size={15} className={activeTab === 'ai_text' ? 'text-[#C49746]' : ''} />
                  <span>3. لصق نص فاتورة أو رسالة واتساب بالذكاء الاصطناعي</span>
                </button>
              </div>

              {activeTab === 'csv_upload' && (
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="apple-btn px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>تحميل قالب CSV قياسي جاهز</span>
                </button>
              )}

              {activeTab === 'ai_text' && (
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_TEXT_TEMPLATE)}
                  className="text-[11px] font-bold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={13} />
                  <span>تجربة نموذج فاتورة عطور جاهزة</span>
                </button>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: CSV FILE UPLOAD & DRAG-AND-DROP                   */}
          {/* ======================================================== */}
          {parsedItems.length === 0 && activeTab === 'csv_upload' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingCsv(true);
                }}
                onDragLeave={() => setIsDraggingCsv(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingCsv(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDraggingCsv
                    ? 'border-[#0071E3] bg-blue-50/70 scale-[0.99]'
                    : 'border-black/[0.14] hover:border-[#0071E3] bg-white hover:bg-blue-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#0071E3] text-white flex items-center justify-center shadow-md">
                  {isAnalyzing ? (
                    <RefreshCw size={28} className="animate-spin" />
                  ) : (
                    <UploadCloud size={28} />
                  )}
                </div>

                <div className="space-y-1 max-w-lg">
                  <h3 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                    {isAnalyzing
                      ? 'جاري قراءة الملف، تصحيح الأسماء، وبناء الموسوعة العطرية بالذكاء الاصطناعي...'
                      : 'اسحب وأفلت ملف الفاتورة (CSV / TXT) هنا أو اضغط لاختيار ملف من جهازك'}
                  </h3>
                  <p className="text-xs text-[#636366] leading-relaxed">
                    يدعم ملفات Excel CSV باللغة العربية والإنجليزية. حتى لو كان الملف يحتوي فقط على{' '}
                    <strong>(اسم العطر، الكمية بالجرام)</strong> سيتكفل الذكاء الاصطناعي بتصحيح الاسم، تحديد الماركة والمنشأ والموسم، وجمع النوتات العطرية كاملة!
                  </p>
                </div>

                <div className="flex items-center flex-wrap justify-center gap-2 pt-2">
                  <span className="px-3 py-1.5 rounded-xl bg-[#0071E3] text-white text-xs font-black shadow-xs">
                    اختيار ملف CSV من الجهاز
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      parseCsvStringToItems(SAMPLE_CSV_CONTENT, 'فاتورة-عطور-نموذجية.csv');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors"
                  >
                    ⚡ محاكاة رفع ملف CSV لفاتورة مورد (6 عطور مع أخطاء إملائية لاختبار التصحيح والتدقيق)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-emerald-950 block">تدقيق آلي لمنع التكرار (Audit)</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      يكتشف الأصناف المكررة داخل نفس ملف CSV أو الموجودة مسبقاً بالمخزون، ويخيرك بين تزويد الرصيد تلقائياً أو التخطي.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-2.5">
                  <Wand2 size={18} className="text-[#0071E3] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-blue-950 block">تصحيح الأسماء والتصنيف الذكي</span>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      يصحح الأخطاء الإملائية الشائعة في الفواتير (مثل: «بكرات روج» ← «باكارات روج 540») ويصنف النوع والفصل والماركة.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/70 flex items-start gap-2.5">
                  <Database size={18} className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-purple-950 block">حفظ شامل بقاعدة البيانات ومزامنة</span>
                    <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                      يجمع النوتات الافتتاحية والقلب والقاعدة وعبارة الإقناع البيعية ويحفظها في موسوعة العطور الداخلية والسحابة فوراً.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: FAST MULTI-ROW BULK ENTRY GRID                    */}
          {/* ======================================================== */}
          {parsedItems.length === 0 && activeTab === 'manual_table' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Quick Bulk Defaults Toolbar */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[#0071E3]" />
                  <span className="font-black text-blue-950">
                    إعدادات موحدة سريعة للأسطر (اكتب اسم العطر فقط وسيكمل الذكاء الاصطناعي الباقي!):
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-black/[0.08]">
                    <span className="text-[11px] text-[#636366]">الكمية الافتراضية:</span>
                    <input
                      type="number"
                      value={defaultBulkGrams}
                      onChange={(e) => setDefaultBulkGrams(Number(e.target.value) || 500)}
                      className="w-16 font-mono font-black text-center text-[#0071E3] outline-none"
                    />
                    <span className="text-[10px] text-[#86868B]">جم</span>
                  </div>

                  <select
                    value={defaultBulkOrigin}
                    onChange={(e) => setDefaultBulkOrigin(e.target.value)}
                    className="h-8 px-2.5 rounded-xl bg-white border border-black/[0.08] text-xs font-bold"
                  >
                    <option value="فرنسي">منشأ: فرنسي</option>
                    <option value="إماراتي">منشأ: إماراتي</option>
                    <option value="إيطالي">منشأ: إيطالي</option>
                    <option value="سويسري">منشأ: سويسري</option>
                  </select>

                  <select
                    value={defaultBulkType}
                    onChange={(e) => setDefaultBulkType(e.target.value as PerfumeType)}
                    className="h-8 px-2.5 rounded-xl bg-white border border-black/[0.08] text-xs font-bold"
                  >
                    <option value="عادي">النوع: عادي</option>
                    <option value="مسك">النوع: مسك</option>
                    <option value="عود">النوع: عود</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleApplyDefaultsToAllTableRows}
                    className="px-3 py-1.5 rounded-xl bg-[#0071E3] text-white text-[11px] font-bold hover:bg-[#0077ED] cursor-pointer"
                  >
                    تطبيق على كل الأسطر
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="bg-black/[0.03] border-b border-black/[0.06] text-[#636366]">
                    <tr>
                      <th className="py-2.5 px-3 font-bold w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-bold">اسم العطر الخام * (يكفي الاسم فقط)</th>
                      <th className="py-2.5 px-3 font-bold">الماركة (تلقائي بالـ AI)</th>
                      <th className="py-2.5 px-3 font-bold">المنشأ</th>
                      <th className="py-2.5 px-3 font-bold">الفئة</th>
                      <th className="py-2.5 px-3 font-bold">النوع</th>
                      <th className="py-2.5 px-3 font-bold">الموسم</th>
                      <th className="py-2.5 px-3 font-bold">الكمية (جرام)</th>
                      <th className="py-2.5 px-3 font-bold text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {visibleManualRows.map((row, localIdx) => {
                      const idx = manualStartIndex + localIdx;
                      return (
                      <tr key={idx} className="hover:bg-black/[0.01]">
                        <td className="py-1.5 px-2.5 text-center text-[#86868B] font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-2.5">
                          <input
                            type="text"
                            placeholder="مثال: سوفاج اليكسر، خمرة، مسك الرمان..."
                            value={row.name}
                            onChange={(e) => handleUpdateTableRow(idx, 'name', e.target.value)}
                            className="w-full h-8 px-2.5 rounded-xl border border-black/[0.08] bg-[#FAF9F5] font-bold text-xs focus:border-[#0071E3] outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <input
                            type="text"
                            placeholder="يحددها الذكاء الاصطناعي تلقائياً"
                            value={row.brand}
                            onChange={(e) => handleUpdateTableRow(idx, 'brand', e.target.value)}
                            className="w-full h-8 px-2.5 rounded-xl border border-black/[0.08] text-xs outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <select
                            value={row.origin}
                            onChange={(e) => handleUpdateTableRow(idx, 'origin', e.target.value)}
                            className="h-8 px-2 rounded-xl border border-black/[0.08] text-xs bg-white"
                          >
                            <option value="فرنسي">فرنسي</option>
                            <option value="إيطالي">إيطالي</option>
                            <option value="إماراتي">إماراتي</option>
                            <option value="سويسري">سويسري</option>
                            <option value="أمريكي">أمريكي</option>
                            <option value="ألماني">ألماني</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <select
                            value={row.gender}
                            onChange={(e) => handleUpdateTableRow(idx, 'gender', e.target.value as Gender)}
                            className="h-8 px-2 rounded-xl border border-black/[0.08] text-xs bg-white"
                          >
                            <option value="مشترك">مشترك / تلقائي</option>
                            <option value="رجالي">رجالي</option>
                            <option value="نسائي">نسائي</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <select
                            value={row.type}
                            onChange={(e) => handleUpdateTableRow(idx, 'type', e.target.value as PerfumeType)}
                            className="h-8 px-2 rounded-xl border border-black/[0.08] text-xs bg-white font-bold"
                          >
                            <option value="عادي">عادي</option>
                            <option value="مسك">مسك</option>
                            <option value="عود">عود</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <select
                            value={row.season}
                            onChange={(e) => handleUpdateTableRow(idx, 'season', e.target.value as Season)}
                            className="h-8 px-2 rounded-xl border border-black/[0.08] text-xs bg-white"
                          >
                            <option value="كل الفصول">كل الفصول / تلقائي</option>
                            <option value="صيف">صيف</option>
                            <option value="شتاء">شتاء</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <input
                            type="number"
                            value={row.stock_grams}
                            onChange={(e) => handleUpdateTableRow(idx, 'stock_grams', Number(e.target.value))}
                            className="w-24 h-8 px-2 rounded-xl border border-black/[0.08] text-xs font-mono font-bold text-center text-[#0071E3]"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx, false)}
                            disabled={tableRows.length <= 1}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-20 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddManualRows(1)}
                    className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>+ سطر جديد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddManualRows(5)}
                    className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-xs font-bold text-[#0071E3] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>+ 5 أسطر</span>
                  </button>
                  {totalManualPages > 1 && (
                    <div className="flex items-center gap-1.5 mr-2 text-xs">
                      <button
                        type="button"
                        disabled={safeManualPage <= 1}
                        onClick={() => setManualPage((p) => Math.max(1, p - 1))}
                        className="px-2 py-1 rounded-lg bg-white border border-black/[0.08] disabled:opacity-40 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <ChevronRight size={13} />
                        <span>السابق</span>
                      </button>
                      <span className="font-mono text-[11px] text-[#636366]">
                        صفحة {safeManualPage} / {totalManualPages} ({tableRows.length} سطر)
                      </span>
                      <button
                        type="button"
                        disabled={safeManualPage >= totalManualPages}
                        onClick={() => setManualPage((p) => Math.min(totalManualPages, p + 1))}
                        className="px-2 py-1 rounded-lg bg-white border border-black/[0.08] disabled:opacity-40 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>التالي</span>
                        <ChevronLeft size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleMoveTableToReview}
                  disabled={isAnalyzing}
                  className="apple-btn px-6 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>جاري التدقيق وتصحيح الأسماء وجمع المعلومات بالذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={15} />
                      <span>
                        تدقيق وتصحيح الأسماء وجمع معلومات العطور ({tableRows.filter((r) => r.name.trim()).length}) ✨
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: AI SMART UNSTRUCTURED TEXT / WHATSAPP PARSER      */}
          {/* ======================================================== */}
          {parsedItems.length === 0 && activeTab === 'ai_text' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-950 flex items-start gap-2.5">
                <Info size={16} className="text-[#0071E3] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">
                    تحليل الفواتير النصية ورسائل الواتساب مع التصحيح الإملائي وبناء الموسوعة:
                  </span>
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    الصق أي نص يحتوي على أسماء عطور (رسالة طلبية من واتساب، فاتورة مورد خام، أو قائمة مكتوبة بسرعة).
                    سيقوم الذكاء الاصطناعي باستخراج الأصناف، وتصحيح الأسماء إملائياً، وتحديد الماركة والمنشأ والموسم، وجمع النوتات العطرية الكاملة، مع فحص التكرار قبل الحفظ.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1D1D1F] block text-right">
                  الصق أو اكتب نص الفاتورة أو قائمة العطور هنا:
                </label>
                <textarea
                  rows={7}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="مثال:
سوفاج اليكسر - 1000 جم
بكرات روج 540 - 750 جم
مسك الطهاره الابيض - 500 جرام..."
                  className="w-full p-4 rounded-2xl bg-white border border-black/[0.08] text-xs font-mono outline-none focus:border-[#0071E3] shadow-inner resize-y leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAnalyzeText}
                  disabled={isAnalyzing || !inputText.trim()}
                  className="apple-btn px-6 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>جاري تحليل النص وتصحيح الأسماء وجمع المعلومات العطرية...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>تحليل الفاتورة وتصحيح الأسماء وبناء الموسوعة بالذكاء الاصطناعي ✨</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {analysisError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* REVIEW, AUDIT & AI ENCYCLOPEDIA SCREEN                   */}
          {/* ======================================================== */}
          {parsedItems.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Top Audit & AI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 block">إجمالي أصناف الدفعة</span>
                    <span className="text-lg font-black text-emerald-950 font-mono">
                      {parsedItems.length} صنف
                    </span>
                  </div>
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 block">تصحيح إملائي وتوحيد AI</span>
                    <span className="text-lg font-black text-blue-950 font-mono">
                      {auditReport.correctedNamesCount} اسم مصحح
                    </span>
                  </div>
                  <Wand2 size={22} className="text-[#0071E3]" />
                </div>

                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    auditReport.existingDuplicatesCount > 0 || auditReport.intraBatchDuplicatesCount > 0
                      ? 'bg-amber-50/90 border-amber-300'
                      : 'bg-zinc-50 border-black/[0.06]'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold text-amber-900 block">
                      تدقيق التكرار (Audit)
                    </span>
                    <span className="text-sm font-black text-amber-950">
                      {auditReport.existingDuplicatesCount} بالمخزون · {auditReport.intraBatchDuplicatesCount} بالدفعة
                    </span>
                  </div>
                  <ShieldAlert
                    size={22}
                    className={
                      auditReport.existingDuplicatesCount > 0 || auditReport.intraBatchDuplicatesCount > 0
                        ? 'text-amber-600'
                        : 'text-zinc-400'
                    }
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/90 border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-800 block">موسوعة العطور الداخلية</span>
                    <span className="text-sm font-black text-purple-950">
                      {auditReport.enrichedCount} ملف عطري كامل
                    </span>
                  </div>
                  <Database size={22} className="text-purple-600" />
                </div>
              </div>

              {/* Intra-Batch Duplicate Alert & 1-Click Deduplication */}
              {auditReport.intraBatchDuplicatesCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-rose-950">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                    <div>
                      <span className="font-black block">
                        تنبيه التدقيق الآلي: تم اكتشاف ({auditReport.intraBatchDuplicatesCount}) سطر مكرر لنفس العطر داخل هذه الفاتورة!
                      </span>
                      <span className="text-[11px] text-rose-800">
                        منعاً لتكرار الأصناف، يمكنك دمج الأسطر المتكررة وجمع كمياتها بالجرام بضغطة واحدة.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeduplicateIntraBatch}
                    className="apple-btn px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <GitMerge size={14} />
                    <span>دمج الأسطر المكررة في الفاتورة فوراً</span>
                  </button>
                </div>
              )}

              {intraBatchMergeNotice && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{intraBatchMergeNotice}</span>
                </div>
              )}

              {/* Existing Inventory Duplicate Global Policy Bar */}
              {auditReport.existingDuplicatesCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <ArrowRightLeft size={17} className="text-amber-700 shrink-0" />
                    <div>
                      <span className="font-black text-amber-950 block">
                        سياسة التعامل مع الأصناف الموجودة مسبقاً بالمخزون ({auditReport.existingDuplicatesCount} صنف):
                      </span>
                      <span className="text-[11px] text-amber-800">
                        حدد الإجراء الافتراضي لمنع تكرار البطاقات في المخزون عند تحديث الفواتير الكبيرة:
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalDuplicatePolicy('merge_stock');
                        setRowResolutions({});
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                        globalDuplicatePolicy === 'merge_stock'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-amber-900 border-amber-300'
                      }`}
                    >
                      دمج وتزويد الرصيد (+ جرام)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalDuplicatePolicy('skip');
                        setRowResolutions({});
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                        globalDuplicatePolicy === 'skip'
                          ? 'bg-zinc-800 text-white border-zinc-800 shadow-2xs'
                          : 'bg-white text-zinc-700 border-zinc-300'
                      }`}
                    >
                      تخطي المكرر تماماً
                    </button>
                  </div>
                </div>
              )}

              {/* Toolbar above Review Table */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {uploadedFileName && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                      <FileSpreadsheet size={13} />
                      <span>الملف: {uploadedFileName}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRunDeepAIEnrichmentOnReview}
                    disabled={isAnalyzing}
                    className="apple-btn px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                    <span>إعادة الفحص والتصحيح الإملائي وجمع النوتات بالذكاء الاصطناعي ✨</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParsedItems([]);
                    setUploadedFileName(null);
                    setRowResolutions({});
                    setIntraBatchMergeNotice(null);
                  }}
                  className="apple-btn px-3 py-1.5 rounded-xl bg-white border border-black/[0.1] text-[#1D1D1F] text-xs font-bold hover:bg-black/[0.04] cursor-pointer"
                >
                  إعادة الإدخال / تغيير الملف
                </button>
              </div>

              {/* Editable Review & Audit Table (Paginated Zero-Scroll) */}
              <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.08] text-[#48484A]">
                    <tr>
                      <th className="py-2 px-2.5 font-bold w-8 text-center">#</th>
                      <th className="py-2 px-3 font-bold min-w-[180px]">
                        اسم العطر (بعد تصحيح الـ AI)
                      </th>
                      <th className="py-2 px-2.5 font-bold min-w-[140px]">
                        حالة التدقيق ومنع التكرار (Audit)
                      </th>
                      <th className="py-2 px-2.5 font-bold">الماركة والمنشأ</th>
                      <th className="py-2 px-2.5 font-bold">التصنيف والنوع</th>
                      <th className="py-2 px-2.5 font-bold">الكمية (جم)</th>
                      <th className="py-2 px-2.5 font-bold text-center">موسوعة العطر</th>
                      <th className="py-2 px-2.5 font-bold text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    {visibleAuditItems.map((item, localIdx) => {
                      const idx = auditStartIndex + localIdx;
                      const audit = auditReport.rowAudits[idx];
                      const isExpanded = expandedRowIdx === idx;
                      return (
                        <React.Fragment key={idx}>
                          <tr
                            className={`transition-colors ${
                              audit.isIntraBatchDuplicate
                                ? 'bg-rose-50/50'
                                : audit.isExistingDuplicate
                                ? 'bg-amber-50/40'
                                : 'hover:bg-blue-50/25'
                            }`}
                          >
                            <td className="py-2.5 px-2.5 text-center text-[#86868B] font-mono">
                              {idx + 1}
                            </td>

                            {/* Name + Auto-Correction Badge */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateParsedItem(idx, 'name', e.target.value)}
                                className="w-full h-8 px-2.5 rounded-lg border border-black/[0.1] bg-[#FAF9F5] font-black text-xs text-[#1D1D1F]"
                              />
                              {item.wasNameCorrected && item.originalInputName && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#0071E3]">
                                  <Wand2 size={11} />
                                  <span>
                                    صُحح تلقائياً من: <del className="text-[#86868B]">{item.originalInputName}</del>
                                  </span>
                                </div>
                              )}
                              {item.classification && (
                                <span className="text-[10px] text-[#636366] block mt-0.5">
                                  {item.classification}
                                </span>
                              )}
                            </td>

                            {/* Anti-Duplicate Audit Status & Action Selector */}
                            <td className="py-2.5 px-2.5">
                              {audit.isExistingDuplicate && audit.matchedExisting ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                                    <ShieldAlert size={11} />
                                    <span>
                                      موجود بالمخزون ({audit.matchedExisting.stock_grams} جم)
                                    </span>
                                  </span>
                                  <select
                                    value={audit.resolution}
                                    onChange={(e) =>
                                      setRowResolutions((prev) => ({
                                        ...prev,
                                        [idx]: e.target.value as DuplicateResolutionAction,
                                      }))
                                    }
                                    className="w-full h-7 px-1.5 rounded-lg border border-amber-300 bg-white text-[10px] font-black text-amber-950"
                                  >
                                    <option value="merge_stock">
                                      دمج وتزويد الرصيد (+{item.stock_grams} جم)
                                    </option>
                                    <option value="skip">تخطي هذا الصنف المكرر</option>
                                    <option value="add_new">إضافة كصنف مستقل</option>
                                  </select>
                                </div>
                              ) : audit.isIntraBatchDuplicate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-black">
                                  <AlertCircle size={11} />
                                  <span>مكرر مع السطر #{Number(audit.firstBatchIdx) + 1}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                                  <ShieldCheck size={11} />
                                  <span>صنف جديد مدقق ✓</span>
                                </span>
                              )}
                            </td>

                            {/* Brand & Origin */}
                            <td className="py-2.5 px-2.5 space-y-1">
                              <input
                                type="text"
                                value={item.brand}
                                onChange={(e) => handleUpdateParsedItem(idx, 'brand', e.target.value)}
                                placeholder="الماركة"
                                className="w-28 h-7 px-2 rounded-lg border border-black/[0.08] text-[11px] font-bold block"
                              />
                              <input
                                type="text"
                                value={item.origin}
                                onChange={(e) => handleUpdateParsedItem(idx, 'origin', e.target.value)}
                                placeholder="المنشأ"
                                className="w-28 h-7 px-2 rounded-lg border border-black/[0.08] text-[10px] text-[#636366] block"
                              />
                            </td>

                            {/* Gender, Season & Type */}
                            <td className="py-2.5 px-2.5 space-y-1">
                              <div className="flex items-center gap-1">
                                <select
                                  value={item.type}
                                  onChange={(e) =>
                                    handleUpdateParsedItem(idx, 'type', e.target.value as PerfumeType)
                                  }
                                  className="h-7 px-1.5 rounded-lg border border-black/[0.08] text-[11px] bg-white font-black"
                                >
                                  <option value="عادي">عادي</option>
                                  <option value="مسك">مسك</option>
                                  <option value="عود">عود</option>
                                </select>
                                <select
                                  value={item.gender}
                                  onChange={(e) =>
                                    handleUpdateParsedItem(idx, 'gender', e.target.value as Gender)
                                  }
                                  className="h-7 px-1.5 rounded-lg border border-black/[0.08] text-[11px] bg-white"
                                >
                                  <option value="رجالي">رجالي</option>
                                  <option value="نسائي">نسائي</option>
                                  <option value="مشترك">مشترك</option>
                                </select>
                              </div>
                              <select
                                value={item.season}
                                onChange={(e) =>
                                  handleUpdateParsedItem(idx, 'season', e.target.value as Season)
                                }
                                className="w-full h-7 px-1.5 rounded-lg border border-black/[0.08] text-[10px] bg-white text-[#636366]"
                              >
                                <option value="كل الفصول">كل الفصول</option>
                                <option value="صيف">صيف</option>
                                <option value="شتاء">شتاء</option>
                              </select>
                            </td>

                            {/* Grams */}
                            <td className="py-2.5 px-2.5">
                              <input
                                type="number"
                                value={item.stock_grams}
                                onChange={(e) =>
                                  handleUpdateParsedItem(idx, 'stock_grams', Number(e.target.value))
                                }
                                className="w-20 h-8 px-2 rounded-lg border border-black/[0.1] text-xs font-mono font-black text-center text-[#0071E3]"
                              />
                            </td>

                            {/* Encyclopedia Preview Toggle */}
                            <td className="py-2.5 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setExpandedRowIdx(isExpanded ? null : idx)}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'bg-[#0071E3] text-white'
                                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                                }`}
                                title="معاينة الهرم العطري والمعلومات المجموعة بالذكاء الاصطناعي"
                              >
                                <Eye size={12} />
                                <span>{isExpanded ? 'إخفاء' : 'النوتات والملف'}</span>
                              </button>
                            </td>

                            {/* Remove Row */}
                            <td className="py-2.5 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx, true)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                                title="حذف هذا السطر"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Encyclopedia Details Row */}
                          {isExpanded && (
                            <tr className="bg-gradient-to-l from-indigo-50/50 via-purple-50/40 to-blue-50/50">
                              <td colSpan={8} className="p-3.5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                  <div className="p-2.5 rounded-xl bg-white border border-black/[0.06] space-y-1">
                                    <span className="font-black text-[#1D1D1F] block">
                                      🌿 الهرم العطري الموثق (يُحفظ بقاعدة البيانات):
                                    </span>
                                    <p className="text-[#48484A]">
                                      <strong>الافتتاحية:</strong> {(item.topNotes || []).join('، ')}
                                    </p>
                                    <p className="text-[#48484A]">
                                      <strong>القلب:</strong> {(item.heartNotes || []).join('، ')}
                                    </p>
                                    <p className="text-[#48484A]">
                                      <strong>القاعدة:</strong> {(item.baseNotes || []).join('، ')}
                                    </p>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-white border border-black/[0.06] space-y-1">
                                    <span className="font-black text-[#1D1D1F] block">
                                      ⚡ الأداء والأكوردات الرئيسية:
                                    </span>
                                    <p className="text-[#48484A]">
                                      <strong>الأكوردات:</strong> {(item.mainAccords || []).join(' · ')}
                                    </p>
                                    <p className="text-[#48484A]">
                                      <strong>الثبات والفوحان:</strong> {item.longevity} | {item.sillage}
                                    </p>
                                    <p className="text-[#48484A]">
                                      <strong>الطابع العام:</strong> {item.generalCharacter}
                                    </p>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-white border border-black/[0.06] space-y-1">
                                    <span className="font-black text-[#1D1D1F] block">
                                      💬 دليل الكاشير والإقناع البيعي:
                                    </span>
                                    <p className="text-emerald-900 font-semibold">
                                      &ldquo;{item.salesPitch}&rdquo;
                                    </p>
                                    <p className="text-[#636366]">
                                      <strong>اقتراح الخلط (Layering):</strong> {item.layeringSuggestions}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalAuditPages > 1 && (
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-[11px] font-bold text-[#636366]">
                    عرض أصناف الفاتورة: صفحة {safeAuditPage} من {totalAuditPages} (إجمالي {parsedItems.length} صنف)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeAuditPage <= 1}
                      onClick={() => {
                        setExpandedRowIdx(null);
                        setAuditPage((p) => Math.max(1, p - 1));
                      }}
                      className="apple-btn px-2.5 py-1 rounded-xl bg-white border border-black/[0.08] disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronRight size={13} />
                      <span>السابق</span>
                    </button>
                    <button
                      type="button"
                      disabled={safeAuditPage >= totalAuditPages}
                      onClick={() => {
                        setExpandedRowIdx(null);
                        setAuditPage((p) => Math.min(totalAuditPages, p + 1));
                      }}
                      className="apple-btn px-2.5 py-1 rounded-xl bg-white border border-black/[0.08] disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>التالي</span>
                      <ChevronLeft size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Final Confirmation Action Bar */}
              <div className="p-4 rounded-2xl bg-white border border-black/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-0.5 text-xs">
                  <div className="font-black text-[#1D1D1F] flex items-center gap-2 flex-wrap">
                    <span>ملخص التدقيق والمزامنة الفورية:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      +{ parsedItems.filter((_, i) => !auditReport.rowAudits[i].isExistingDuplicate || auditReport.rowAudits[i].resolution === 'add_new').length } صنف جديد
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                      { parsedItems.filter((_, i) => auditReport.rowAudits[i].isExistingDuplicate && auditReport.rowAudits[i].resolution === 'merge_stock').length } دمج وتزويد رصيد
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200">
                      {parsedItems.length} ملف بموسوعة العطور الداخلية
                    </span>
                  </div>
                  <p className="text-[11px] text-[#636366]">
                    سيتم الحفظ في قاعدة البيانات الداخلية والمزامنة السحابية الفورية مع إرسال إشعار فوري في الشريط العلوي.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="apple-btn px-4 py-2.5 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F] hover:bg-black/[0.04] cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAndSave}
                    className="apple-btn px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>اعتماد التدقيق وحفظ ومزامنة الدفعة فوراً 🚀</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkPerfumeImporterModal;
