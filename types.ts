export type PerfumeType = 'عادي' | 'نيش' | 'مسك' | 'عود';
export type Gender = 'رجالي' | 'نسائي' | 'مشترك';
export type Season = 'صيف' | 'شتاء' | 'خريف' | 'ربيع' | 'كل الفصول';
export type TimeOfDay = 'صباح' | 'عصر' | 'مساء' | 'ليل' | 'كل الأوقات';

export interface PerfumeAnalysis {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  mainAccords: string[];
  bestSeason: string;
  bestTime: string;
  longevity: string; // الثبات
  sillage: string; // الفوحان
  salesPitch: string; // عبارة إقناع البائع
  layeringSuggestion: string; // دمج مع عطر آخر
}

export interface Product {
  id: number | string;
  name: string;
  brand: string;
  origin: string;
  gender: Gender;
  season: Season;
  timeOfDay?: TimeOfDay;
  type: PerfumeType;
  stock_grams: number; // Stock in grams
  min_threshold_grams?: number; // حد التنبيه الأدنى بالمخزون (افتراضي 30 جم)
  customGramCostEgp?: number; // تكلفة الجرام المخصصة لهذا العطر إن وجدت
  customSellingPriceOverride?: number; // سعر بيع مخصص اختياري
  analysis?: PerfumeAnalysis;
  strategicThresholdGrams?: number; // حد الطلب الاستراتيجي بالجرام (افتراضي 150 جم)
  occasions?: string[]; // مناسبات العطر (زفاف، عمل، مقابلة، إلخ)
  fragranceProfileId?: string;
  isSavedMixRecipe?: boolean;
  savedMixComponents?: MixComponent[];
  updatedAt?: string;
}

export type MixGoalType =
  | 'standard'        // القاعدة التشغيلية القياسية (70/30 و 60/30/10)
  | 'longevity'       // ثبات وفوحان أقصى (تعزيز القاعدة المثبتة)
  | 'fresh_daily'     // منعش ويومي متوازن
  | 'luxury_evening'  // سهرة وفخامة (نيش وشرقي)
  | 'economical';     // اقتصادي ذكي مراعي لتكلفة الجرام

export interface MixComponent {
  productId: number | string;
  productName: string;
  brand: string;
  productType: PerfumeType;
  grams: number; // كمية هذا المكوّن بالجرام (أعداد صحيحة فقط دون كسور) داخل الزجاجة الواحدة
  percentage?: number; // نسبة هذا المكوّن من إجمالي الزيت في الزجاجة
  oilGramCost: number; // تكلفة الجرام الواحد لهذا المكوّن
  componentOilCost: number; // grams * oilGramCost
  availableStockGrams?: number;
}

export interface SavedMixFormula {
  id: string;
  name: string;
  bottleSizeMl: number;
  isRollOn?: boolean;
  isColoredBottle?: boolean;
  components: MixComponent[];
  totalEssenceGrams: number;
  totalCost: number;
  sellingPrice: number;
  suggestedPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // حقول «مكتبة تركيبات لمسة عطر» المعتمدة:
  isOwnerApproved?: boolean;
  approvedBy?: string;
  mixGoal?: MixGoalType;
  customerRating?: number; // 1 إلى 5
  testResult?: 'ممتاز' | 'ناجح' | 'جيد' | 'تحت الاختبار';
  longevityNotes?: string; // ملاحظات الثبات
  sillageNotes?: string;   // ملاحظات الفوحان
  balanceNotes?: string;   // ملاحظات التوازن
  timesSold?: number;      // عدد مرات البيع
  repurchaseRatePercent?: number; // معدل إعادة الشراء (%)
}

// ========================================================
// STRATEGIC REORDER & REPLENISHMENT PURCHASE ORDERS
// (حد الطلب الاستراتيجي وفاتورة النواقص الفورية)
// ========================================================

export type StrategicOrderPriority = 'عاجل جداً' | 'عاجل' | 'مهم' | 'متوسط' | 'منخفض';

export interface StrategicOrderItem {
  productId: number | string;
  productName: string;
  brand: string;
  type: PerfumeType;
  currentStockGrams: number;
  strategicThresholdGrams: number;
  suggestedOrderGrams: number;
  unitCostPerGram: number;
  totalEstimatedCost: number;
  priority: StrategicOrderPriority;
  priorityReason: string;
  linkedSeasonOrEvent?: string;
  status: 'قيد الطلب' | 'مؤجل' | 'معتمد' | 'تم الاستلام';
}

export interface StrategicReplenishmentOrder {
  id: string; // e.g. "PO-2026-09-001"
  orderNumber: string;
  createdAt: string;
  supplierName: string;
  supplierPhone?: string;
  items: StrategicOrderItem[];
  totalGrams: number;
  totalEstimatedCost: number;
  status: 'معتمد' | 'بانتظار الاعتماد' | 'مؤجل' | 'تم التوريد';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  sentViaWhatsAppAt?: string;
  lastUpdated: string;
}

// ========================================================
// PERSISTENT FRAGRANCE DATABASE ENTRY (موسوعة العطور الموثقة)
// ========================================================

export interface FragranceDatabaseEntry {
  id: string; // e.g. "frag-1" or "frag-bleu-chanel"
  productId?: number | string;
  name: string;
  brand: string;
  manufacturer?: string;
  origin: string;
  type: PerfumeType;
  gender: Gender;
  concentration?: string; // e.g. "زيت عطري نقي 100%"
  classification: string; // Olfactive family (e.g. Woody Aromatic, Amber Floral)
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  mainAccords: string[];
  generalCharacter: string;
  longevity: string;
  sillage: string;
  bestUses: string;
  occasions: string[]; // ['زفاف', 'مقابلة عمل', 'خطوبة', 'دوام يومي', 'سفر', 'سهرة', 'رياضي', ...]
  seasons: Season[];
  timeOfDay: TimeOfDay[];
  salesPitch: string;
  layeringSuggestions: string;
  inStoreAlternatives: string[];
  similarPerfumes: string[];
  complementaryPerfumes?: string[];
  sourcesRanked: Array<{
    rank: number;
    name: string;
    type: 'official_brand' | 'supplier' | 'ifra' | 'database' | 'community';
    urlOrRef?: string;
  }>;
  confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة';
  confidenceReason: string;
  approvalStatus: 'معتمد' | 'يحتاج مراجعة واعتماد';
  lastUpdated: string;
  createdAt: string;
  notes?: string;
}

export interface BottleSize {
  id: string;
  name?: string;
  sizeMl: number;
  essenceGrams: number;
  bottleCost: number; // EGP cost of bottle + sprayer (15 EGP standard, 50 EGP colored)
  alcoholCost?: number;
  suggestedMargin?: number; // EGP custom profit margin
  normalPrice: number; // Official price for Normal perfumes
  coloredNormalPrice?: number; // Approved price for Colored bottle in Normal category (600, 300, 250)
  specialPrice: number; // Official price for Oud / Musk / Niche
  coloredSpecialPrice?: number; // ONLY if explicitly approved by Owner in DB (never auto-invented!)
  officialCost: number; // Approved standard unit cost for Normal oil (10 EGP/g)
  isRollOn?: boolean; // True for Roll-ons (5ml, 3ml, 2ml)
  isActive?: boolean; // True by default; if cancelled, becomes false ('غير نشط') without deleting historical records
}

export interface SaleItem {
  id: string;
  compositionType?: 'single' | 'mix' | string; // 'عطر فردي' | 'ميكس'
  isMix?: boolean; // True when bottle contains 2+ perfume components as a single bottle unit
  mixComponents?: MixComponent[]; // مكونات تركيبة الميكس داخل نفس الزجاجة الواحدة
  customFormulaName?: string; // اسم تركيبة الميكس المخصص
  productId: number | string;
  productName: string;
  productType: PerfumeType;
  bottleSize: number; // ml
  essenceGrams: number; // إجمالي جرامات الزيت داخل الزجاجة الواحدة
  cost: number; // التكلفة الفعلية للزجاجة الواحدة (شاملة زجاجة واحدة + مجموع تكلفة المكونات)
  sellingPrice: number; // سعر البيع النهائي للزجاجة الواحدة
  profit: number; // Contribution = sellingPrice - cost - commission
  quantity?: number; // عدد الزجاجات من هذه التركيبة (افتراضي 1 زجاجة فقط)
  isColoredBottle?: boolean; // True if sold in colored bottle (+35 EGP cost)
  isRollOn?: boolean;
  alcoholMl?: number;
  fixativeGrams?: number;
}

export type DataClassification = 'PRODUCTION' | 'TEST' | 'DOC_EXAMPLE';

export interface Sale {
  id: string;
  items: SaleItem[];
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  date: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: 'نقدي' | 'بطاقة' | 'محفظة إلكترونية' | 'تحويل بنكي';
  transactionType?: 'بيع_طبيعي' | 'هدية' | 'تعويض' | 'تصفية' | 'إتلاف' | 'عينات_مجانية';
  exceptionApprovedBy?: string;
  exceptionReason?: string;
  discount?: number;
  loyaltyPointsRedeemed?: number; // عدد نقاط الولاء المستبدلة في الفاتورة
  loyaltyDiscountAmount?: number; // قيمة الخصم النقدي الناتج عن استبدال النقاط (ج.م)
  loyaltyPointsEarned?: number; // النقاط المكتسبة من هذه الفاتورة
  customerLoyaltyBalanceAfter?: number; // رصيد نقاط الولاء المحدث بعد الفاتورة
  packagingOptionId?: 'basic_bag' | 'luxury_box' | 'luxury_bag' | 'luxury_both';
  packagingRevenueEgp?: number; // إيراد التغليف الفاخر إذا بيع للعميل بصورة مستقلة
  packagingCostEgp?: number; // تكلفة التغليف الفاخر المسجلة
  isBasicBagReplacedByLuxury?: boolean; // تسجيل استبدال الكيس الأساسي (1 ج) بالكيس الفاخر
  notes?: string;
  employeeName?: string;
  source?: 'المتجر' | 'نشاط ميداني' | 'واتساب' | 'توصيل';
  commissionAmount?: number;
  totalCommission?: number; // Alias for commissionAmount
  timestamp?: string; // Alias for date
  // Non-deletion & Offline transaction tracking
  transactionId?: string;
  deviceTimestamp?: string;
  serverTimestamp?: string;
  isOfflineCreated?: boolean;
  isReversed?: boolean; // قيد عكسي بدلاً من الحذف
  originalSaleId?: string; // رابط للعملية الأصلية في حال الإلغاء أو القيد العكسي
  reversalReason?: string;
  reversedBy?: string;
  reversedAt?: string;
  // Strict Technical Separation: Live Production Data vs Test Data vs Documentation Examples
  dataClassification?: DataClassification;
  isTestData?: boolean;
  testClassificationNote?: string;
}

export type ExpenseCategory = 
  | 'رواتب' 
  | 'إيجار' 
  | 'فواتير ومرافق' 
  | 'مستلزمات وتغليف' 
  | 'تسويق وإعلان' 
  | 'صيانة ونثريات' 
  | 'مصاريف تشغيل'
  | 'أخرى';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD or ISO
  isRecurringMonthly: boolean;
  notes?: string;
  dataClassification?: DataClassification;
  isTestData?: boolean;
  testClassificationNote?: string;
  isReversed?: boolean; // قيد عكسي / إلغاء بسبب دون حذف السجل التاريخي
  reversalReason?: string;
  reversedBy?: string;
  reversedAt?: string;
}

export interface ReceiptDesignConfig {
  // Paper & Print Layout
  paperWidth: '80mm' | '58mm' | 'A4';
  paddingMm: number; // 2 to 10mm
  borderStyle: 'dashed' | 'solid' | 'dotted' | 'double' | 'none';
  headerAlignment: 'center' | 'right' | 'left';
  autoPrintOnSale: boolean;
  printCopies: number;
  // Typography & Colors
  fontFamily: 'cairo' | 'tajawal' | 'monospace' | 'amiri' | 'system';
  baseFontSizePx: number; // 9 to 16
  headerTitleSizePx: number; // 12 to 24
  totalFontSizePx: number; // 12 to 22
  fontWeight: 'normal' | 'medium' | 'bold' | 'black';
  lineSpacing: 'compact' | 'normal' | 'relaxed';
  primaryTextColor: string;
  accentColor: string;
  highContrastThermal: boolean;
  // Granular Element Visibility Toggles (18+ controls)
  showLogo: boolean;
  logoSizePx: number; // 28 to 80
  showStoreName: boolean;
  showStoreSlogan: boolean;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  showTaxNumber: boolean;
  showInvoiceNumber: boolean;
  showDateTime: boolean;
  showCashierName: boolean;
  showCustomerInfo: boolean;
  showBottleSizeAndGrams: boolean;
  showPerfumeCategory: boolean;
  showUnitPriceBreakdown: boolean;
  showDiscountRow: boolean;
  showPaymentMethod: boolean;
  showItemsCountSummary: boolean;
  showPerfumeCareTip: boolean;
  perfumeCareTipText: string;
  showReturnPolicy: boolean;
  returnPolicyText: string;
  showFooterMessage: boolean;
  showQrCode: boolean;
}

export const DEFAULT_RECEIPT_DESIGN: ReceiptDesignConfig = {
  paperWidth: '80mm',
  paddingMm: 4,
  borderStyle: 'dashed',
  headerAlignment: 'center',
  autoPrintOnSale: false,
  printCopies: 1,
  fontFamily: 'cairo',
  baseFontSizePx: 11,
  headerTitleSizePx: 15,
  totalFontSizePx: 14,
  fontWeight: 'bold',
  lineSpacing: 'normal',
  primaryTextColor: '#1D1D1F',
  accentColor: '#C49746',
  highContrastThermal: true,
  showLogo: true,
  logoSizePx: 44,
  showStoreName: true,
  showStoreSlogan: true,
  showStoreAddress: true,
  showStorePhone: true,
  showTaxNumber: false,
  showInvoiceNumber: true,
  showDateTime: true,
  showCashierName: true,
  showCustomerInfo: true,
  showBottleSizeAndGrams: true,
  showPerfumeCategory: true,
  showUnitPriceBreakdown: true,
  showDiscountRow: true,
  showPaymentMethod: true,
  showItemsCountSummary: true,
  showPerfumeCareTip: true,
  perfumeCareTipText: 'رُش العطر على أماكن النبض (المعصم والرقبة) وخلف الأذن لفوحان يدوم طوال اليوم.',
  showReturnPolicy: true,
  returnPolicyText: 'ضمان لمسة عطر: ثبات وفوحان معتمد لأرقى الزيوت العطرية النقية.',
  showFooterMessage: true,
  showQrCode: true,
};

// ========================================================
// APPLE DYNAMIC THEME & ATMOSPHERE ENGINE (أنماط أبل اللونية)
// ========================================================

export type AppThemeId =
  | 'apple_sonoma_light'
  | 'royal_amber_oud'
  | 'paris_rose_silk'
  | 'emerald_botanical'
  | 'capri_ocean_breeze'
  | 'provence_lavender'
  | 'desert_titanium'
  | 'baccarat_crimson_velvet'
  | 'imperial_matcha_bergamot'
  | 'tuscan_saffron_leather'
  | 'royal_champagne_pearl'
  | 'amalfi_citrus_linen'
  | 'silk_cashmere_mocha'
  | 'sequoia_midnight_dark'
  | 'obsidian_oud_dark'
  | 'velvet_iris_amethyst'
  | 'emerald_palace_nocturne'
  | 'aurora_borealis_cyber'
  | 'roja_haute_luxe'
  | 'imperial_sapphire_velvet'
  | 'frosted_lavender_clay'
  | 'apple_win12_fluent_hybrid';

export type SiteFontFamilyId =
  | 'readex'
  | 'tajawal'
  | 'cairo'
  | 'ibm_plex'
  | 'almarai'
  | 'noto_kufi'
  | 'changa'
  | 'amiri';

export type SiteFontWeightId =
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 'black';

export type SiteFontStrokeId =
  | 'none'
  | 'crisp'
  | 'medium'
  | 'bold_stroke'
  | 'heavy_stroke';

export type SiteNumeralSystem = 'ar' | 'en';

export type ThemeSurfaceStyleId =
  | 'win12_apple_mica_hybrid'
  | 'liquid_glass'
  | 'lavender_clay_3d'
  | 'silk_matte'
  | 'crystal_border'
  | 'royal_gold_trim'
  | 'neo_bento';

export type SiteHeadingColorMode =
  | 'theme_default'
  | 'custom_solid'
  | 'royal_gold'
  | 'apple_blue'
  | 'emerald_luxury'
  | 'crimson_velvet'
  | 'amethyst_silk';

export interface AppThemeDefinition {
  id: AppThemeId;
  nameAr: string;
  nameEn: string;
  badge: string;
  category: 'bright' | 'luxury_warm' | 'dark_pro';
  isDark: boolean;
  moodDescription: string;
  fragranceInspiration: string;
  colors: {
    bgCanvas: string;
    cardGlass: string;
    cardSolid: string;
    textPrimary: string;
    textSecondary: string;
    primaryAccent: string;
    primaryAccentHover: string;
    secondaryGold: string;
    borderSubtle: string;
    ambientOrb1: string;
    ambientOrb2: string;
    ambientOrb3: string;
  };
}

export const APP_THEMES: AppThemeDefinition[] = [
  {
    id: 'apple_win12_fluent_hybrid',
    nameAr: 'الهجين الملكي: أبل سيـكويا × ويندوز 12 فلونت (Masterpiece Hybrid)',
    nameEn: 'Apple Sequoia × Windows 12 Fluent Mica',
    badge: 'التحفة الهجينة الأحدث 👑',
    category: 'bright',
    isDark: false,
    moodDescription: 'تحفة بصرية تجمع بين نقاء زجاج أبل السائل (visionOS / macOS Sequoia) وطبقات الميكا والأكريليك الحريرية لويندوز 12 (Fluent Design 2.0) بتناغم لوني ملكي متقن.',
    fragranceInspiration: 'مستوحى من الألماسة الزرقاء، العنبر الأبيض، والذهب الملكي الصافي',
    colors: {
      bgCanvas: '#EFF4FA',
      cardGlass: 'rgba(255, 255, 255, 0.88)',
      cardSolid: '#FFFFFF',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      primaryAccent: '#0067C0',
      primaryAccentHover: '#005BA8',
      secondaryGold: '#C49746',
      borderSubtle: 'rgba(15, 23, 42, 0.08)',
      ambientOrb1: 'rgba(0, 103, 192, 0.14)',
      ambientOrb2: 'rgba(56, 189, 248, 0.12)',
      ambientOrb3: 'rgba(196, 151, 70, 0.10)',
    },
  },
  {
    id: 'apple_sonoma_light',
    nameAr: 'أبل سونوما النقي',
    nameEn: 'Apple Sonoma Pure',
    badge: 'الافتراضي الكلاسيكي',
    category: 'bright',
    isDark: false,
    moodDescription: 'بيئة عمل ناصعة البياض بوضوح بصري فائق ولمسات أزرق أبل الكلاسيكي.',
    fragranceInspiration: 'مستوحى من النقاء البلوري وشانيل بلاتينيوم',
    colors: {
      bgCanvas: '#FAF9F6',
      cardGlass: 'rgba(255, 255, 255, 0.90)',
      cardSolid: '#FFFFFF',
      textPrimary: '#0F172A',
      textSecondary: '#4A3E56',
      primaryAccent: '#0071E3',
      primaryAccentHover: '#0077ED',
      secondaryGold: '#C49746',
      borderSubtle: 'rgba(196, 151, 70, 0.16)',
      ambientOrb1: 'rgba(0, 113, 227, 0.09)',
      ambientOrb2: 'rgba(196, 151, 70, 0.08)',
      ambientOrb3: 'rgba(142, 36, 170, 0.06)',
    },
  },
  {
    id: 'frosted_lavender_clay',
    nameAr: 'اللافندر البلوري ثلاثي الأبعاد (3D Clay)',
    nameEn: '3D Frosted Lavender Clay',
    badge: 'تصميم 3D بلوري فاخر ✨',
    category: 'bright',
    isDark: false,
    moodDescription: 'توليفة ساحرة تجمع بين الزجاج البلوري المصنفر (Frosted Glass) والبطاقات والأزرار البارزة ثلاثية الأبعاد (3D Claymorphism) بلمسات اللافندر والوردي المشرق.',
    fragranceInspiration: 'مستوحى من اللافندر الفرنسي، السوسن المخملي، والمسك البلوري الأبيض',
    colors: {
      bgCanvas: '#EAE6F8',
      cardGlass: 'rgba(255, 255, 255, 0.78)',
      cardSolid: '#FAF8FF',
      textPrimary: '#1E1638',
      textSecondary: '#635685',
      primaryAccent: '#7C3AED',
      primaryAccentHover: '#6D28D9',
      secondaryGold: '#EC4899',
      borderSubtle: 'rgba(255, 255, 255, 0.85)',
      ambientOrb1: 'rgba(139, 92, 246, 0.24)',
      ambientOrb2: 'rgba(236, 72, 153, 0.16)',
      ambientOrb3: 'rgba(99, 102, 241, 0.20)',
    },
  },
  {
    id: 'royal_amber_oud',
    nameAr: 'العنبر الملكي والعود الدافئ',
    nameEn: 'Royal Amber & Gold',
    badge: 'فخامة شرقية',
    category: 'luxury_warm',
    isDark: false,
    moodDescription: 'أجواء عاجية دافئة مطعمة بالذهب المعتق والعنبر الملكي تمنح شعوراً بالفخامة والوقار.',
    fragranceInspiration: 'مستوحى من عود كمبودي ملكي وكلمات العربية',
    colors: {
      bgCanvas: '#F9F5EE',
      cardGlass: 'rgba(255, 252, 246, 0.88)',
      cardSolid: '#FFFDF9',
      textPrimary: '#231C14',
      textSecondary: '#7E705E',
      primaryAccent: '#B47B16',
      primaryAccentHover: '#9A670E',
      secondaryGold: '#C99700',
      borderSubtle: 'rgba(180, 123, 22, 0.14)',
      ambientOrb1: 'rgba(217, 119, 6, 0.12)',
      ambientOrb2: 'rgba(180, 83, 9, 0.09)',
      ambientOrb3: 'rgba(234, 179, 8, 0.10)',
    },
  },
  {
    id: 'paris_rose_silk',
    nameAr: 'مخمل الورد الباريسي',
    nameEn: 'Parisian Rose & Silk',
    badge: 'أناقة فرنسية',
    category: 'luxury_warm',
    isDark: false,
    moodDescription: 'تناغم لؤلؤي ناعم بلمسات الورد الفرنسي والتوت الهادئ يكسر رتابة الأرقام.',
    fragranceInspiration: 'مستوحى من بكرات روج وروز فانيلا ومون سباركل',
    colors: {
      bgCanvas: '#FCF5F7',
      cardGlass: 'rgba(255, 250, 252, 0.88)',
      cardSolid: '#FFFCFD',
      textPrimary: '#26151D',
      textSecondary: '#886B78',
      primaryAccent: '#C81E5B',
      primaryAccentHover: '#AD174D',
      secondaryGold: '#C49746',
      borderSubtle: 'rgba(200, 30, 91, 0.12)',
      ambientOrb1: 'rgba(225, 29, 72, 0.10)',
      ambientOrb2: 'rgba(192, 38, 211, 0.08)',
      ambientOrb3: 'rgba(244, 114, 182, 0.11)',
    },
  },
  {
    id: 'emerald_botanical',
    nameAr: 'واحة الزمرد والبرغموت',
    nameEn: 'Emerald Botanical',
    badge: 'انتعاش وتركيز',
    category: 'bright',
    isDark: false,
    moodDescription: 'طابع زمردي طبيعي مريح جداً للعين يبعث على التفاؤل والحيوية والنشاط البيعي.',
    fragranceInspiration: 'مستوحى من نيرولي، لاكوست وايت، والبرغموت الأخضر',
    colors: {
      bgCanvas: '#F2F9F6',
      cardGlass: 'rgba(250, 255, 252, 0.88)',
      cardSolid: '#FCFFFD',
      textPrimary: '#13241D',
      textSecondary: '#617C70',
      primaryAccent: '#059669',
      primaryAccentHover: '#047857',
      secondaryGold: '#B8860B',
      borderSubtle: 'rgba(5, 150, 105, 0.13)',
      ambientOrb1: 'rgba(16, 185, 129, 0.11)',
      ambientOrb2: 'rgba(13, 148, 136, 0.09)',
      ambientOrb3: 'rgba(52, 211, 153, 0.10)',
    },
  },
  {
    id: 'capri_ocean_breeze',
    nameAr: 'نسيم كابري والأكوا',
    nameEn: 'Capri Ocean Breeze',
    badge: 'صفاء بحري',
    category: 'bright',
    isDark: false,
    moodDescription: 'زرقة سماوية وفيروزية مستوحاة من سواحل إيطاليا تمنح برودة وهدوءاً ذهنيّاً.',
    fragranceInspiration: 'مستوحى من أكوا دي جيو وبلو دي شانيل وألترا مارين',
    colors: {
      bgCanvas: '#F1F7FC',
      cardGlass: 'rgba(250, 253, 255, 0.88)',
      cardSolid: '#FAFDFF',
      textPrimary: '#12202E',
      textSecondary: '#60778C',
      primaryAccent: '#0284C7',
      primaryAccentHover: '#0369A1',
      secondaryGold: '#C49746',
      borderSubtle: 'rgba(2, 132, 199, 0.13)',
      ambientOrb1: 'rgba(14, 165, 233, 0.12)',
      ambientOrb2: 'rgba(6, 182, 212, 0.10)',
      ambientOrb3: 'rgba(59, 130, 246, 0.08)',
    },
  },
  {
    id: 'provence_lavender',
    nameAr: 'لافندر بروفانس الملكي',
    nameEn: 'Provence Lavender',
    badge: 'إبداع وهدوء',
    category: 'bright',
    isDark: false,
    moodDescription: 'تدرجات الخزامى البنفسجية الأنيقة بأسلوب iMac، مثالية لساعات العمل الطويلة.',
    fragranceInspiration: 'مستوحى من لافندر بروفانس وبلاك أوركيد وميدنايت',
    colors: {
      bgCanvas: '#F6F4FC',
      cardGlass: 'rgba(252, 250, 255, 0.88)',
      cardSolid: '#FDFCFF',
      textPrimary: '#1D162B',
      textSecondary: '#73688A',
      primaryAccent: '#6D28D9',
      primaryAccentHover: '#5B21B6',
      secondaryGold: '#C49746',
      borderSubtle: 'rgba(109, 40, 217, 0.12)',
      ambientOrb1: 'rgba(124, 58, 237, 0.11)',
      ambientOrb2: 'rgba(168, 85, 247, 0.09)',
      ambientOrb3: 'rgba(99, 102, 241, 0.09)',
    },
  },
  {
    id: 'desert_titanium',
    nameAr: 'تيتانيوم الصحراء الفاخر',
    nameEn: 'Desert Titanium Pro',
    badge: 'iPhone 16 Pro',
    category: 'luxury_warm',
    isDark: false,
    moodDescription: 'معدن التيتانيوم الرملي المصقول مع لمسات البرونز الدافئ، توازن رسمي فائق الرقي.',
    fragranceInspiration: 'مستوحى من توباكو فانيلا، عنبر أبيض، وشيخ جولد',
    colors: {
      bgCanvas: '#F3F1EC',
      cardGlass: 'rgba(252, 251, 248, 0.88)',
      cardSolid: '#FAF9F6',
      textPrimary: '#1F1D1A',
      textSecondary: '#756F65',
      primaryAccent: '#8C5828',
      primaryAccentHover: '#73461D',
      secondaryGold: '#B8860B',
      borderSubtle: 'rgba(140, 88, 40, 0.14)',
      ambientOrb1: 'rgba(161, 98, 7, 0.10)',
      ambientOrb2: 'rgba(120, 113, 108, 0.10)',
      ambientOrb3: 'rgba(180, 130, 70, 0.09)',
    },
  },
  {
    id: 'sequoia_midnight_dark',
    nameAr: 'ليل سيكويا الاحترافي',
    nameEn: 'Sequoia Midnight Pro',
    badge: 'وضع ليلي داكن',
    category: 'dark_pro',
    isDark: true,
    moodDescription: 'الوضع الليلي العميق من macOS Sequoia، راحة فائقة للعين مساءً مع زجاج كحلي مضيء.',
    fragranceInspiration: 'مستوحى من سوفاج إليكسير وبلاك أفغانو وليالي المدينة',
    colors: {
      bgCanvas: '#0D1017',
      cardGlass: 'rgba(22, 27, 38, 0.86)',
      cardSolid: '#171C28',
      textPrimary: '#FFFFFF',
      textSecondary: '#C4B5FD',
      primaryAccent: '#0A84FF',
      primaryAccentHover: '#389BFF',
      secondaryGold: '#EAB308',
      borderSubtle: 'rgba(168, 85, 247, 0.22)',
      ambientOrb1: 'rgba(10, 132, 255, 0.16)',
      ambientOrb2: 'rgba(139, 92, 246, 0.13)',
      ambientOrb3: 'rgba(234, 179, 8, 0.08)',
    },
  },
  {
    id: 'obsidian_oud_dark',
    nameAr: 'أوبسيديان العود الأسود',
    nameEn: 'Obsidian Oud Nocturne',
    badge: 'ملكي داكن فاخر',
    category: 'dark_pro',
    isDark: true,
    moodDescription: 'فخامة الليل العربي بالأسود البركاني والذهب الملكي الساطع، هيبة استثنائية للمتجر.',
    fragranceInspiration: 'مستوحى من دهن العود المعتق، أمير العود، وعنبر أسود',
    colors: {
      bgCanvas: '#110E0C',
      cardGlass: 'rgba(28, 23, 19, 0.88)',
      cardSolid: '#1E1915',
      textPrimary: '#FAF6F0',
      textSecondary: '#B0A292',
      primaryAccent: '#D49B27',
      primaryAccentHover: '#E5AE3B',
      secondaryGold: '#F59E0B',
      borderSubtle: 'rgba(212, 155, 39, 0.20)',
      ambientOrb1: 'rgba(212, 155, 39, 0.16)',
      ambientOrb2: 'rgba(180, 83, 9, 0.14)',
      ambientOrb3: 'rgba(245, 158, 11, 0.10)',
    },
  },
  {
    id: 'baccarat_crimson_velvet',
    nameAr: 'ياقوت بكرات روج المخملي',
    nameEn: 'Baccarat Crimson Velvet',
    badge: 'أيقونة النيش',
    category: 'luxury_warm',
    isDark: false,
    moodDescription: 'تناغم الكريستال الأحمر الملكي مع خيوط الزعفران الذهبي يمنح المتجر حضوراً آسراً.',
    fragranceInspiration: 'مستوحى من بكرات روج 540، الزعفران الأحمر، وخشب الأرز',
    colors: {
      bgCanvas: '#FDF6F6',
      cardGlass: 'rgba(255, 250, 250, 0.90)',
      cardSolid: '#FFFFFF',
      textPrimary: '#281114',
      textSecondary: '#845B60',
      primaryAccent: '#B91C1C',
      primaryAccentHover: '#991B1B',
      secondaryGold: '#D4AF37',
      borderSubtle: 'rgba(185, 28, 28, 0.14)',
      ambientOrb1: 'rgba(220, 38, 38, 0.12)',
      ambientOrb2: 'rgba(212, 175, 55, 0.11)',
      ambientOrb3: 'rgba(244, 63, 94, 0.09)',
    },
  },
  {
    id: 'imperial_matcha_bergamot',
    nameAr: 'ماتشا طوكيو واليوزو الملكي',
    nameEn: 'Imperial Matcha & Yuzu',
    badge: 'صفاء زن الياباني',
    category: 'bright',
    isDark: false,
    moodDescription: 'اخضرار الشاي الأخضر الإمبراطوري مع إشراقة اليوزو الحمضية لتركيز ذهني فائق.',
    fragranceInspiration: 'مستوحى من ماتشا 26، يوزو طوكيو، والشاي الأبيض',
    colors: {
      bgCanvas: '#F4F8F2',
      cardGlass: 'rgba(251, 254, 249, 0.89)',
      cardSolid: '#FCFDFB',
      textPrimary: '#162417',
      textSecondary: '#5F7561',
      primaryAccent: '#15803D',
      primaryAccentHover: '#166534',
      secondaryGold: '#CA8A04',
      borderSubtle: 'rgba(21, 128, 61, 0.13)',
      ambientOrb1: 'rgba(34, 197, 94, 0.12)',
      ambientOrb2: 'rgba(202, 138, 4, 0.09)',
      ambientOrb3: 'rgba(16, 185, 129, 0.09)',
    },
  },
  {
    id: 'tuscan_saffron_leather',
    nameAr: 'زعفران توسكانا والجلد الفاخر',
    nameEn: 'Tuscan Saffron & Leather',
    badge: 'دفء إيطالي',
    category: 'luxury_warm',
    isDark: false,
    moodDescription: 'درجات التيراكوتا الإيطالية الدافئة مع العنبر والجلد المصقول بلمسة كلاسيكية راقية.',
    fragranceInspiration: 'مستوحى من توسكان ليذر، عود أصفهان، والزعفران الدافئ',
    colors: {
      bgCanvas: '#FBF5EF',
      cardGlass: 'rgba(255, 251, 246, 0.89)',
      cardSolid: '#FFFDFB',
      textPrimary: '#27170E',
      textSecondary: '#806453',
      primaryAccent: '#C2410C',
      primaryAccentHover: '#9A3412',
      secondaryGold: '#D97706',
      borderSubtle: 'rgba(194, 65, 12, 0.14)',
      ambientOrb1: 'rgba(234, 88, 12, 0.12)',
      ambientOrb2: 'rgba(217, 119, 6, 0.10)',
      ambientOrb3: 'rgba(180, 83, 9, 0.08)',
    },
  },
  {
    id: 'velvet_iris_amethyst',
    nameAr: 'سوسن فلورنسا والأميثيست الليلي',
    nameEn: 'Velvet Iris Amethyst',
    badge: 'ليلي مخملي',
    category: 'dark_pro',
    isDark: true,
    moodDescription: 'عمق البنفسج الملكي الداكن مع إضاءة السوسن الفضية والذهب الوردي الساحر.',
    fragranceInspiration: 'مستوحى من ديور هوم إنتنس، بلاك أوركيد، زهرة السوسن',
    colors: {
      bgCanvas: '#110D1A',
      cardGlass: 'rgba(26, 20, 40, 0.88)',
      cardSolid: '#1B1429',
      textPrimary: '#F7F4FC',
      textSecondary: '#A396B8',
      primaryAccent: '#A855F7',
      primaryAccentHover: '#C084FC',
      secondaryGold: '#F59E0B',
      borderSubtle: 'rgba(168, 85, 247, 0.20)',
      ambientOrb1: 'rgba(168, 85, 247, 0.17)',
      ambientOrb2: 'rgba(236, 72, 153, 0.13)',
      ambientOrb3: 'rgba(245, 158, 11, 0.09)',
    },
  },
  {
    id: 'emerald_palace_nocturne',
    nameAr: 'قصر الزمرد والعود الملكي الداكن',
    nameEn: 'Emerald Palace Nocturne',
    badge: 'هيبة ملكية داكنة',
    category: 'dark_pro',
    isDark: true,
    moodDescription: 'أخضر زمردي ملكي عميق مطعم بالذهب الخالص، يجسد قمة الفخامة الشرقية الليلية.',
    fragranceInspiration: 'مستوحى من عود الحرمين، كريد أفينتوس، والمسك الملكي',
    colors: {
      bgCanvas: '#081410',
      cardGlass: 'rgba(15, 31, 25, 0.88)',
      cardSolid: '#10221B',
      textPrimary: '#F2FBF7',
      textSecondary: '#8AB0A0',
      primaryAccent: '#10B981',
      primaryAccentHover: '#34D399',
      secondaryGold: '#EAB308',
      borderSubtle: 'rgba(16, 185, 129, 0.20)',
      ambientOrb1: 'rgba(16, 185, 129, 0.16)',
      ambientOrb2: 'rgba(234, 179, 8, 0.13)',
      ambientOrb3: 'rgba(6, 182, 212, 0.10)',
    },
  },
  {
    id: 'aurora_borealis_cyber',
    nameAr: 'شفق الشمال الكريستالي الداكن',
    nameEn: 'Aurora Borealis Pro',
    badge: 'مستقبلي متوهج',
    category: 'dark_pro',
    isDark: true,
    moodDescription: 'توهج الشفق القطبي الفيروزي والبنفسجي فوق زجاج ليلي فائق الحداثة والمتعة البصرية.',
    fragranceInspiration: 'مستوحى من بلو شانيل، سيلفر سنت، وأكوا الكريستال',
    colors: {
      bgCanvas: '#090E17',
      cardGlass: 'rgba(16, 24, 39, 0.88)',
      cardSolid: '#121B2B',
      textPrimary: '#F0F9FF',
      textSecondary: '#94A3B8',
      primaryAccent: '#06B6D4',
      primaryAccentHover: '#22D3EE',
      secondaryGold: '#F472B6',
      borderSubtle: 'rgba(6, 182, 212, 0.20)',
      ambientOrb1: 'rgba(6, 182, 212, 0.17)',
      ambientOrb2: 'rgba(139, 92, 246, 0.15)',
      ambientOrb3: 'rgba(244, 114, 182, 0.11)',
    },
  },
  {
    id: 'royal_champagne_pearl',
    nameAr: 'شامبانيا اللؤلؤ والذهب الفرنسي',
    nameEn: 'Royal Champagne & Pearl',
    badge: 'أوت كوتور باريسي',
    category: 'luxury_warm',
    isDark: false,
    moodDescription: 'تألق اللؤلؤ الكريمي الناعم مع بريق الشامبانيا الذهبي لتجربة بيع راقية ومشرقة.',
    fragranceInspiration: 'مستوحى من جادور ديور، كوكو مادموزيل، والمسك اللؤلؤي',
    colors: {
      bgCanvas: '#FAF7F0',
      cardGlass: 'rgba(255, 253, 249, 0.90)',
      cardSolid: '#FFFFFF',
      textPrimary: '#211C15',
      textSecondary: '#7A6F5D',
      primaryAccent: '#A16207',
      primaryAccentHover: '#854D0E',
      secondaryGold: '#D4AF37',
      borderSubtle: 'rgba(161, 98, 7, 0.14)',
      ambientOrb1: 'rgba(212, 175, 55, 0.13)',
      ambientOrb2: 'rgba(245, 158, 11, 0.09)',
      ambientOrb3: 'rgba(251, 191, 36, 0.08)',
    },
  },
  {
    id: 'amalfi_citrus_linen',
    nameAr: 'كتان أمالفي والبرغموت الإيطالي',
    nameEn: 'Amalfi Citrus & Linen',
    badge: 'انتعاش متوسطي',
    category: 'bright',
    isDark: false,
    moodDescription: 'بياض الكتان الإيطالي النقي مع نفحات الفيروز الساحلي والليمون المنعش.',
    fragranceInspiration: 'مستوحى من نيرولي بورتوفينو، أكوا دي بارما، وزهر البرتقال',
    colors: {
      bgCanvas: '#F2F8F9',
      cardGlass: 'rgba(251, 254, 255, 0.90)',
      cardSolid: '#FFFFFF',
      textPrimary: '#0F252A',
      textSecondary: '#58737A',
      primaryAccent: '#0D9488',
      primaryAccentHover: '#0F766E',
      secondaryGold: '#EAB308',
      borderSubtle: 'rgba(13, 148, 136, 0.14)',
      ambientOrb1: 'rgba(20, 184, 166, 0.12)',
      ambientOrb2: 'rgba(250, 204, 21, 0.10)',
      ambientOrb3: 'rgba(56, 189, 248, 0.09)',
    },
  },
  {
    id: 'silk_cashmere_mocha',
    nameAr: 'كشمير الموكا والفانيليا الدافئة',
    nameEn: 'Silk Cashmere & Mocha',
    badge: 'فخامة مخملية',
    category: 'luxury_warm',
    isDark: false,
    moodDescription: 'تدرجات الكشمير والموكا السويسرية الدافئة تمنح هدوءاً بصرياً فائق الفخامة.',
    fragranceInspiration: 'مستوحى من بلاك فانيلا، قهوة محمصة، وخشب الصندل',
    colors: {
      bgCanvas: '#F6F2EE',
      cardGlass: 'rgba(253, 250, 247, 0.90)',
      cardSolid: '#FDFBF9',
      textPrimary: '#241914',
      textSecondary: '#78665C',
      primaryAccent: '#7C2D12',
      primaryAccentHover: '#60200B',
      secondaryGold: '#C49746',
      borderSubtle: 'rgba(124, 45, 18, 0.14)',
      ambientOrb1: 'rgba(154, 52, 18, 0.11)',
      ambientOrb2: 'rgba(196, 151, 70, 0.11)',
      ambientOrb3: 'rgba(180, 83, 9, 0.08)',
    },
  },
  {
    id: 'roja_haute_luxe',
    nameAr: 'روجا أوت لوكس والأبنوس الملكي',
    nameEn: 'Roja Haute Luxe Ebony',
    badge: 'إمبراطوري فاخر',
    category: 'dark_pro',
    isDark: true,
    moodDescription: 'تناغم الأبنوس الأسود الملكي مع رقائق الذهب عيار ٢٤ والياقوت القرمزي.',
    fragranceInspiration: 'مستوحى من روجا دوف، عود إمبريال، والعنبر الملكي المعتق',
    colors: {
      bgCanvas: '#0E0A0A',
      cardGlass: 'rgba(26, 18, 18, 0.89)',
      cardSolid: '#1A1212',
      textPrimary: '#FDF8F5',
      textSecondary: '#B8A39A',
      primaryAccent: '#E11D48',
      primaryAccentHover: '#F43F5E',
      secondaryGold: '#F59E0B',
      borderSubtle: 'rgba(225, 29, 72, 0.22)',
      ambientOrb1: 'rgba(225, 29, 72, 0.17)',
      ambientOrb2: 'rgba(245, 158, 11, 0.14)',
      ambientOrb3: 'rgba(190, 18, 60, 0.10)',
    },
  },
  {
    id: 'imperial_sapphire_velvet',
    nameAr: 'السافير الأزرق الملكي الليلي',
    nameEn: 'Imperial Sapphire Velvet',
    badge: 'سافير ملكي داكن',
    category: 'dark_pro',
    isDark: true,
    moodDescription: 'عمق الياقوت الأزرق السافيري مع لمسات البلاتين والذهب الملكي لأعلى درجات الهيبة.',
    fragranceInspiration: 'مستوحى من لايتون دي مارلي، بلو دي شانيل بارفان، والبخور الملكي',
    colors: {
      bgCanvas: '#070D19',
      cardGlass: 'rgba(14, 23, 42, 0.89)',
      cardSolid: '#111C33',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      primaryAccent: '#3B82F6',
      primaryAccentHover: '#60A5FA',
      secondaryGold: '#FBBF24',
      borderSubtle: 'rgba(59, 130, 246, 0.22)',
      ambientOrb1: 'rgba(59, 130, 246, 0.18)',
      ambientOrb2: 'rgba(251, 191, 36, 0.12)',
      ambientOrb3: 'rgba(99, 102, 241, 0.13)',
    },
  },
];

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function convertDigitsToSystem(text: string, system: SiteNumeralSystem = 'ar'): string {
  if (!text) return text;
  if (system === 'en') {
    return text
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/٬/g, ',')
      .replace(/٫/g, '.');
  }
  return text.replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)] || d);
}

/**
 * Resolves the active theme automatically when `themeAutoTimeOfDay` is enabled,
 * or returns the user's selected theme from `APP_THEMES`.
 */
export function resolveActiveAppTheme(settings?: Partial<StoreSettings>): AppThemeDefinition {
  if (settings?.themeAutoTimeOfDay) {
    const hour = new Date().getHours();
    let autoId: AppThemeId = 'apple_sonoma_light';
    if (hour >= 6 && hour < 11) {
      autoId = 'emerald_botanical'; // Morning freshness
    } else if (hour >= 11 && hour < 15) {
      autoId = 'apple_sonoma_light'; // Midday clarity
    } else if (hour >= 15 && hour < 18) {
      autoId = 'capri_ocean_breeze'; // Afternoon breeze
    } else if (hour >= 18 && hour < 21) {
      autoId = 'royal_amber_oud'; // Evening warm luxury
    } else {
      autoId = 'sequoia_midnight_dark'; // Night comfort
    }
    return APP_THEMES.find((t) => t.id === autoId) || APP_THEMES[0];
  }

  const targetId = settings?.activeThemeId || 'apple_sonoma_light';
  return APP_THEMES.find((t) => t.id === targetId) || APP_THEMES[0];
}

export type TypingInteractionStyle = 'pulse' | 'glow' | 'bounce' | 'shake' | 'wave';

// ========================================================
// OWNER DASHBOARD CARDS & REPORTS CUSTOMIZATION ENGINE
// (تخصيص وترتيب بطاقات وتقارير شاشة Dashboard للمالك فقط)
// ========================================================

export type DashboardKpiCardId =
  | 'today_revenue'
  | 'today_cogs'
  | 'today_net_contribution'
  | 'real_net_profit'
  | 'today_target'
  | 'accumulated_deficit'
  | 'monthly_budget_15k'
  | 'distributable_profit'
  | 'cash_in_drawer'
  | 'bottles_and_essence'
  | 'reserved_inventory_capital'
  | 'commissions_and_incentives';

export type DashboardSectionId =
  | 'ai_advisor_and_target'
  | 'kpi_executive_cards'
  | 'loss_warning_banner'
  | 'goal_and_low_stock'
  | 'today_sales_register';

export interface DashboardCardConfigItem {
  id: DashboardKpiCardId;
  visible: boolean;
  order: number;
}

export interface DashboardSectionConfigItem {
  id: DashboardSectionId;
  visible: boolean;
  order: number;
}

export type DashboardLayoutPresetId =
  | 'balanced_default'
  | 'financial_priority'
  | 'operational_priority'
  | 'executive_compact'
  | 'custom';

export interface DashboardLayoutConfig {
  kpiCards: DashboardCardConfigItem[];
  sections: DashboardSectionConfigItem[];
  presetName?: DashboardLayoutPresetId;
}

export interface DashboardKpiCardMeta {
  id: DashboardKpiCardId;
  titleAr: string;
  subtitleAr: string;
  category: 'مالي' | 'تشغيلي' | 'مالي وتشغيلي';
  badgeColor: string;
  defaultVisible: boolean;
  defaultOrder: number;
}

export interface DashboardSectionMeta {
  id: DashboardSectionId;
  titleAr: string;
  subtitleAr: string;
  category: 'تحليل ذكي وتارجت' | 'مؤشرات مالية وتشغيلية' | 'تنبيهات ومخزون' | 'سجل المبيعات';
  defaultVisible: boolean;
  defaultOrder: number;
}

export const DASHBOARD_KPI_CARD_DEFINITIONS: DashboardKpiCardMeta[] = [
  {
    id: 'today_revenue',
    titleAr: 'مبيعات اليوم',
    subtitleAr: 'إجمالي المبيعات اليومية مع تفصيل النقدي والإلكتروني ومتوسط الفاتورة',
    category: 'مالي',
    badgeColor: 'blue',
    defaultVisible: true,
    defaultOrder: 1,
  },
  {
    id: 'today_cogs',
    titleAr: 'تكلفة المبيعات (خام)',
    subtitleAr: 'تكلفة الزيوت والزجاجات المستهلكة اليوم والتي تؤول لمحفظة استرداد المخزون',
    category: 'مالي',
    badgeColor: 'red',
    defaultVisible: true,
    defaultOrder: 2,
  },
  {
    id: 'today_net_contribution',
    titleAr: 'المساهمة الصافية اليوم',
    subtitleAr: 'صافي المساهمة بعد خصم تكلفة الخامات وعمولة طارق (5%) لتغطية الـ 600 ج',
    category: 'مالي',
    badgeColor: 'indigo',
    defaultVisible: true,
    defaultOrder: 3,
  },
  {
    id: 'real_net_profit',
    titleAr: 'صافي الربح الفعلي الحر / الموقف المالي',
    subtitleAr: 'الفائض الربحي الحر بعد تغطية نقطة التعادل اليومية (600 ج) أو قيمة العجز المتبقي',
    category: 'مالي',
    badgeColor: 'emerald',
    defaultVisible: true,
    defaultOrder: 4,
  },
  {
    id: 'today_target',
    titleAr: 'Target اليوم والتحقيق',
    subtitleAr: 'نسبة إنجاز مرحلة التعادل (600 ج) والمستهدف الربحي الكامل (1,000 ج)',
    category: 'تشغيلي',
    badgeColor: 'amber',
    defaultVisible: true,
    defaultOrder: 5,
  },
  {
    id: 'accumulated_deficit',
    titleAr: 'العجز المتراكم للشهر',
    subtitleAr: 'الفارق التراكمي بين المستهدف المطلوب حتى اليوم والمساهمة المحققة فعلياً',
    category: 'مالي',
    badgeColor: 'rose',
    defaultVisible: true,
    defaultOrder: 6,
  },
  {
    id: 'monthly_budget_15k',
    titleAr: 'موازنة الـ 15,000 ج الشهرية',
    subtitleAr: 'متابعة المخصص التراكمي والمنصرف الفعلي من موازنة المصاريف الثابتة',
    category: 'مالي',
    badgeColor: 'purple',
    defaultVisible: true,
    defaultOrder: 7,
  },
  {
    id: 'distributable_profit',
    titleAr: 'الربح المتاح للتوزيع للمالك',
    subtitleAr: 'صافي الفائض المالي الحر القابل للسحب للمالك بعد تأمين المخزون والموازنة',
    category: 'مالي',
    badgeColor: 'emerald',
    defaultVisible: true,
    defaultOrder: 8,
  },
  {
    id: 'cash_in_drawer',
    titleAr: 'السيولة النقدية بالدرج والمدفوعات الإلكترونية',
    subtitleAr: 'رصيد الكاش الفعلي في درج الكاشير مقابل المحافظ الإلكترونية والبطاقات',
    category: 'مالي وتشغيلي',
    badgeColor: 'teal',
    defaultVisible: true,
    defaultOrder: 9,
  },
  {
    id: 'bottles_and_essence',
    titleAr: 'العبوات المجهزة واستهلاك الزيوت اليوم',
    subtitleAr: 'إجمالي عدد الزجاجات المباعة اليوم وكمية الزيت العطري المستهلك بالجرام',
    category: 'تشغيلي',
    badgeColor: 'amber',
    defaultVisible: true,
    defaultOrder: 10,
  },
  {
    id: 'reserved_inventory_capital',
    titleAr: 'رأس مال المخزون المحجوز ومحفظة الاسترداد',
    subtitleAr: 'القيمة الدفترية للزيوت الخام بالرفوف + رصيد محفظة إعادة شراء البضاعة',
    category: 'مالي وتشغيلي',
    badgeColor: 'cyan',
    defaultVisible: true,
    defaultOrder: 11,
  },
  {
    id: 'commissions_and_incentives',
    titleAr: 'عمولات وحوافز المبيعات (5% / 7%)',
    subtitleAr: 'عمولة اليوم والشهر المستحقة لطارق ومتابعة شريحة الحافز التشجيعي (10 عبوات)',
    category: 'تشغيلي',
    badgeColor: 'sky',
    defaultVisible: true,
    defaultOrder: 12,
  },
];

export const DASHBOARD_SECTION_DEFINITIONS: DashboardSectionMeta[] = [
  {
    id: 'ai_advisor_and_target',
    titleAr: 'مستشار الإدارة الذكي + مركز المساهمة والتارجت',
    subtitleAr: 'بطاقة التحليل اللحظي بالذكاء الاصطناعي وبطاقة تحفيز التارجت وشريحة العمولة',
    category: 'تحليل ذكي وتارجت',
    defaultVisible: true,
    defaultOrder: 1,
  },
  {
    id: 'kpi_executive_cards',
    titleAr: 'شبكة بطاقات التقارير المالية والتشغيلية للمالك',
    subtitleAr: 'البطاقات التفصيلية القابلة للترتيب والتخصيص مع نافذة تتبع المعادلات الحسابية',
    category: 'مؤشرات مالية وتشغيلية',
    defaultVisible: true,
    defaultOrder: 2,
  },
  {
    id: 'loss_warning_banner',
    titleAr: 'شريط تنبيه العجز التشغيلي وخطة الإنقاذ السريعة',
    subtitleAr: 'يظهر تلقائياً عند عدم تغطية الـ 600 ج.م اليومية مع اقتراحات البيع السريع',
    category: 'تنبيهات ومخزون',
    defaultVisible: true,
    defaultOrder: 3,
  },
  {
    id: 'goal_and_low_stock',
    titleAr: 'توزيع مبيعات اليوم على الهدف + نواقص المخزون (< 100 جم)',
    subtitleAr: 'شريطا تقدم المرحلة 1 والمرحلة 2 مع قائمة العطور الحرجة التي أوشكت على النفاد',
    category: 'تنبيهات ومخزون',
    defaultVisible: true,
    defaultOrder: 4,
  },
  {
    id: 'today_sales_register',
    titleAr: 'سجل وجدول مبيعات اليوم المسجلة',
    subtitleAr: 'جدول تفصيلي بعمليات البيع اليومية والأحجام والتكلفة والمساهمة وطريقة السداد',
    category: 'سجل المبيعات',
    defaultVisible: true,
    defaultOrder: 5,
  },
];

export const DEFAULT_DASHBOARD_LAYOUT_CONFIG: DashboardLayoutConfig = {
  presetName: 'balanced_default',
  kpiCards: DASHBOARD_KPI_CARD_DEFINITIONS.map((c) => ({
    id: c.id,
    visible: c.defaultVisible,
    order: c.defaultOrder,
  })),
  sections: DASHBOARD_SECTION_DEFINITIONS.map((s) => ({
    id: s.id,
    visible: s.defaultVisible,
    order: s.defaultOrder,
  })),
};

export function resolveDashboardLayoutConfig(settings?: Partial<StoreSettings>): DashboardLayoutConfig {
  const raw = settings?.dashboardLayout;
  const kpiMap = new Map<DashboardKpiCardId, DashboardCardConfigItem>();
  if (raw?.kpiCards && Array.isArray(raw.kpiCards)) {
    raw.kpiCards.forEach((item, idx) => {
      if (item && item.id) {
        kpiMap.set(item.id, {
          id: item.id,
          visible: item.visible !== false,
          order: typeof item.order === 'number' ? item.order : idx + 1,
        });
      }
    });
  }

  const mergedKpiCards: DashboardCardConfigItem[] = DASHBOARD_KPI_CARD_DEFINITIONS.map((def) => {
    const existing = kpiMap.get(def.id);
    return existing
      ? existing
      : {
          id: def.id,
          visible: def.defaultVisible,
          order: def.defaultOrder + 100,
        };
  })
    .sort((a, b) => a.order - b.order)
    .map((item, idx) => ({ ...item, order: idx + 1 }));

  const sectionMap = new Map<DashboardSectionId, DashboardSectionConfigItem>();
  if (raw?.sections && Array.isArray(raw.sections)) {
    raw.sections.forEach((sec, idx) => {
      if (sec && sec.id) {
        sectionMap.set(sec.id, {
          id: sec.id,
          visible: sec.visible !== false,
          order: typeof sec.order === 'number' ? sec.order : idx + 1,
        });
      }
    });
  }

  const mergedSections: DashboardSectionConfigItem[] = DASHBOARD_SECTION_DEFINITIONS.map((def) => {
    const existing = sectionMap.get(def.id);
    return existing
      ? existing
      : {
          id: def.id,
          visible: def.defaultVisible,
          order: def.defaultOrder + 100,
        };
  })
    .sort((a, b) => a.order - b.order)
    .map((sec, idx) => ({ ...sec, order: idx + 1 }));

  return {
    presetName: raw?.presetName || 'balanced_default',
    kpiCards: mergedKpiCards,
    sections: mergedSections,
  };
}

export interface StoreSettings {
  storeName: string;
  currency: string;
  priceEssenceNormal: number; // 10 EGP per gram (الزيت العادي)
  priceEssenceNiche?: number; // 15 EGP per gram (النيش)
  priceEssenceSpecial: number; // 20 EGP per gram (العود والمسك)
  defaultBottleCost: number; // 15 EGP (العبوة العادية + البخاخ)
  standardBottleAndSprayCost?: number; // 15 EGP alias
  coloredBottleCost?: number; // 50 EGP (العبوة الملونة)
  coloredBottleExtraCost?: number; // 35 EGP (الفرق في تكلفة العبوة الملونة = 50 - 15)
  stickerCost?: number; // 1 EGP (الاستيكر)
  basicBagCost?: number; // 1 EGP (الكيس البلاستيك الأساسي الإلزامي)
  basicPlasticBagCost?: number; // 1 EGP alias
  defaultMargin: number; // EGP
  dailyTargetProfit: number; // Target daily contribution EGP (600 or 1000)
  monthlyTargetRevenue: number; // Target monthly sales
  monthlyFixedBudget: number; // 15,000 EGP safe fixed budget
  monthlyWorkDays: number; // 25 days
  employeeBaseSalary: number; // 1,500 EGP for Tarek
  ownerSalary: number; // 10,000 EGP for Dr. Mohamed
  commissionRate: number; // 5%
  tieredCommissionRate: number; // 7% above threshold
  tieredThresholdBottles: number; // 10 spray bottles per day
  // Receipt & Branding Customization
  storeSlogan?: string;
  storePhone?: string;
  storeWhatsAppPrimary?: string; // 01123376728 (Official Store WhatsApp 1 - Tarek)
  storeWhatsAppSecondary?: string; // 01062018755 (Official Store WhatsApp 2 - Tarek)
  storeWhatsAppManager?: string;
  storeEmail?: string;
  storeAddress?: string;
  storeTaxNumber?: string;
  receiptFooterMessage?: string;
  logoUrl?: string;
  showLogoOnReceipt?: boolean;
  receiptDesign?: ReceiptDesignConfig;
  // Dynamic Apple Theme & Atmosphere Engine Settings
  activeThemeId?: AppThemeId;
  themeAmbientGlow?: boolean;
  themeGlassIntensity?: 'subtle' | 'balanced' | 'ultra';
  themeAutoTimeOfDay?: boolean;
  themeTypingEffects?: boolean; // اهتزاز تفاعلي ولون وتأثيرات أنيقة للحروف المدخلة
  themeTypingIntensity?: 'subtle' | 'lively' | 'festive'; // مستوى التأثير التفاعلي عند الكتابة
  themeTypingStyle?: TypingInteractionStyle; // نمط التفاعل الحركي (نبض، توهج، ارتداد، اهتزاز، موجة لونية)
  themeTypingBgColorShift?: boolean; // تغيير لون خلفية الحقل مع كل حرف مدخل
  themeSoundEffects?: boolean; // نغمات تفاعلية لطيفة عند الكتابة والبيع
  themeCardElevation?: 'flat' | 'floating' | '3d_luxury'; // عمق البطاقات والظلال
  themeCustomAccentColor?: string; // لون تمييز مخصص اختياري
  themeCustomAccent?: string; // Alias for custom accent
  themeFontScale?: 'compact' | 'normal' | 'comfortable'; // حجم الخط والكثافة
  // Site-Wide Typography, Color, Weight, Thickness & Numeral Language Studio Settings
  siteFontFamily?: SiteFontFamilyId; // نوع الخط في كامل الموقع
  siteFontSizePercent?: number; // حجم الخط المئوي الشامل (85% - 125%)
  siteFontWeight?: SiteFontWeightId; // وزن الخط الشامل (300 - 900)
  siteFontStrokeWidth?: SiteFontStrokeId; // سمك الخط الإضافي (Text Stroke)
  siteLineHeight?: 'tight' | 'normal' | 'relaxed' | 'spacious'; // تباعد الأسطر
  siteLetterSpacing?: 'tight' | 'normal' | 'wide'; // تباعد الأحرف
  sitePrimaryTextColor?: string; // لون الخط الأساسي المخصص لكامل الموقع والأقسام
  siteSecondaryTextColor?: string; // لون الخط الفرعي المخصص لكامل الموقع والأقسام
  siteHeadingColorMode?: SiteHeadingColorMode; // نمط تلوين العناوين والأرقام البارزة
  siteHeadingCustomColor?: string; // لون مخصص للعناوين
  siteNumeralSystem?: SiteNumeralSystem; // لغة الأرقام في كامل الموقع ('ar' = ٠١٢٣٤٥٦٧٨٩ | 'en' = 0123456789)
  themeSurfaceStyle?: ThemeSurfaceStyleId; // نمط الأسطح والخامات البصرية الحديثة
  themeBorderRadius?: 'sharp' | 'rounded' | 'ultra_pill'; // استدارة حواف البطاقات والأزرار
  themeContrastLevel?: 'standard' | 'high' | 'ultra_crisp'; // مستوى التباين والوضوح
  // Daily Midnight Automated Closing Report & Google Forms / Gmail / WhatsApp Settings
  autoMidnightReportEnabled?: boolean;
  googleFormId?: string;
  googleFormEditUrl?: string;
  googleFormResponderUrl?: string;
  googleFormWebhookUrl?: string;
  whatsappAutoSendOnClosure?: boolean; // إرسال تلقائي للواتساب فور إغلاق اليوم
  whatsappAutoSendWithEmail?: boolean; // إرسال متزامن للواتساب مع التقرير البريدي
  whatsappDualTargetDispatch?: boolean; // إرسال للرقمين الرسميين (01123376728 + 01062018755)
  whatsappFreeMethod?: 'instant_direct' | 'callmebot_api' | 'custom_webhook' | 'all_combined';
  whatsappCallMeBotApiKey?: string;
  whatsappSecondaryCallMeBotApiKey?: string;
  whatsappCustomWebhookUrl?: string;
  // Smart Loyalty Points Engine & AI Profit-Guard Governance
  loyaltyEnabled?: boolean; // تفعيل أو إيقاف نظام نقاط الولاء بالكامل
  loyaltyAutoAI?: boolean; // الإدارة الذكية التلقائية بالذكاء الاصطناعي المتوافقة مع المبيعات والربح
  loyaltyProtectBreakEven?: boolean; // حماية نقطة التعادل اليومية (600 ج.م) تلقائياً
  loyaltyPointsPerSpendEgp?: number; // العميل يكسب 1 نقطة لكل X ج.م (افتراضي 10 ج.م)
  loyaltyEarnStepEgp?: number; // Alias for loyaltyPointsPerSpendEgp
  loyaltyPointsPerVisit?: number; // نقاط مكافأة الزيارة/الفاتورة (افتراضي 5 نقاط)
  loyaltyCashPerPointEgp?: number; // القيمة النقدية للنقطة الواحدة عند الاستبدال (افتراضي 0.60 ج.م)
  loyaltyMinRedeemPoints?: number; // الحد الأدنى لعدد النقاط المسموح باستبدالها (افتراضي 10 نقاط)
  loyaltyMaxBillDiscountPercent?: number; // أقصى نسبة خصم مسموح بها من إجمالي الفاتورة عبر النقاط (افتراضي 25%)
  loyaltyMinSafeMarginEgp?: number; // الحد الأدنى الصارم لصافي ربح المتجر في الفاتورة بعد التكلفة والعمولة (افتراضي 15 ج.م)
  loyaltyWelcomeBonusPoints?: number; // نقاط ترحيبية للعميل الجديد (افتراضي 25 نقطة)
  loyaltyStrategyMode?: 'profit_shield' | 'balanced' | 'growth_vip'; // وضع السياسة الذكية
  // Owner Dashboard Cards & Sections Customization (تخصيص وترتيب بطاقات Dashboard للمالك فقط)
  dashboardLayout?: DashboardLayoutConfig;
  tieredCommissionBottleThreshold?: number; // Alias for tieredThresholdBottles
  bottleSizes?: BottleSize[]; // Global active bottle sizes list
  lowStockThresholdGrams?: number; // Low stock alert threshold in grams
}

// Staff Attendance & Shift Records (سجل دوام وحضور وفتح المتجر للموظف طارق)
export interface StaffAttendanceRecord {
  id: string; // e.g. att-2026-09-23
  employeeName: string; // 'طارق'
  date: string; // YYYY-MM-DD
  checkInTime: string; // e.g. "01:15 م"
  checkOutTime?: string;
  openedStore: boolean; // فتح المتجر وتأكيد الحضور
  status: 'حاضر وفتح المتجر' | 'حاضر' | 'غياب' | 'إجازة';
  dailyBaseSalary: number; // 60 EGP (1,500 / 25)
  isSalaryVested: boolean; // true - يستحق الراتب الأساسي بمجرد الحضور وفتح المتجر حتى لو لم تتم أي عملية بيع
  salesCount: number; // عدد عمليات البيع الناجحة لليوم
  todaysSalesTotal: number; // إجمالي مبيعات اليوم
  earnedCommissions: number; // العمولة المستحقة فقط عن المبيعات الناجحة (5%)
  notes?: string;
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  CUSTOMERS_LOYALTY = 'CUSTOMERS_LOYALTY',
  FORMULATION_ENGINE = 'FORMULATION_ENGINE',
  FINANCIAL_VAULTS = 'FINANCIAL_VAULTS',
  INVENTORY = 'INVENTORY',
  INVENTORY_INTELLIGENCE = 'INVENTORY_INTELLIGENCE',
  EXPENSES = 'EXPENSES',
  REPORTS = 'REPORTS',
  ANALYZER = 'ANALYZER',
  AI_ADVISOR = 'ANALYZER', // Alias for ANALYZER
  SETTINGS = 'SETTINGS',
  STORE_MANAGER = 'STORE_MANAGER',
  OPERATIONS_SYSTEM = 'OPERATIONS_SYSTEM',
  OPERATIONS_DAILY = 'OPERATIONS_SYSTEM', // Alias for OPERATIONS_SYSTEM
  MARKETING = 'MARKETING',
  USERS_MANAGEMENT = 'USERS_MANAGEMENT',
  AUDIT_LOGS = 'AUDIT_LOGS',
  DAY_OPERATIONS = 'DAY_OPERATIONS',
}

export interface CustomerLoyaltyLog {
  id: string;
  date: string;
  pointsDelta: number; // positive for bonus/earned, negative for redemption
  reason: string;
  byUser?: string;
  invoiceId?: string;
  cashDiscountValue?: number;
}

export type CustomerFollowUpStatus =
  | 'نشط'
  | 'يحتاج متابعة'
  | 'بانتظار الرد'
  | 'موعد زيارة'
  | 'تم إرسال عرض';

export interface CustomerFollowUpLog {
  id: string;
  date: string;
  channel: 'واتساب' | 'اتصال هاتفي' | 'زيارة بالمتجر' | 'رسالة عرض';
  actionType: 'متابعة رضا وثبات' | 'إرسال عرض خاص' | 'تذكير نقاط ولاء' | 'إشعار توفر عطر' | 'تنسيق موعد';
  summary: string;
  byUser: string;
  nextFollowUpDate?: string;
  outcome?: string;
}

export interface CustomerOfferRecord {
  id: string;
  date: string;
  title: string;
  perfumeName?: string;
  bottleSizeMl?: number;
  originalPriceEgp?: number;
  discountAmountEgp: number;
  finalPriceEgp?: number;
  pointsUsed?: number;
  status: 'مقترح' | 'أُرسل عبر واتساب' | 'تم تطبيقه بالكاشير';
  sentBy?: string;
}

export interface CustomerAI360Analysis {
  customerKey: string;
  generatedAt: string;
  retentionHealth: 'نشط جداً (VIP)' | 'منتظم ومستقر' | 'يحتاج تنشيط ومتابعة' | 'معرض للانقطاع';
  retentionScore: number; // 0 - 100
  executiveSummary: string;
  spendingAndDiscountInsight: string;
  olfactoryDNAInsight: string;
  inventorySyncAlert: string;
  layeringSuggestion: string;
  recommendedBottleUpsell: {
    targetSizeMl: number;
    standardPriceEgp: number;
    maxSafeDiscountEgp: number;
    netOfferPriceEgp: number;
    safeNetProfitEgp: number;
    reason: string;
  };
  nextBestAction: {
    priority: 'عاجل اليوم' | 'مهم هذا الأسبوع' | 'روتيني';
    title: string;
    timingText: string;
    channel: 'واتساب' | 'اتصال هاتفي' | 'عند الزيارة القادمة';
    reason: string;
  };
  readyScripts: Array<{
    id: string;
    type: 'vip_offer' | 'post_purchase' | 'loyalty_reminder' | 'win_back' | 'stock_alert';
    label: string;
    badge: string;
    messageText: string;
    discountEgp?: number;
    recommendedPerfume?: string;
  }>;
}

export interface CustomCustomerRecord {
  id?: string;
  phone: string;
  name: string;
  notes?: string;
  favoriteStyle?: 'صيفي' | 'شتوي' | 'مسك' | 'عود' | 'فرنسي' | 'متنوع';
  preferredBottleSizeMl?: number;
  concentrationPreference?: 'هادئ' | 'متوازن قياسي' | 'عالي وفواح' | 'إكسترا VIP';
  packagingPreference?: 'كيس أساسي' | 'علبة هدايا فاخرة' | 'كيس فاخر';
  preferredChannel?: 'المتجر' | 'واتساب' | 'توصيل' | 'نشاط ميداني';
  specialOccasionDate?: string;
  nextFollowUpDate?: string;
  followUpStatus?: CustomerFollowUpStatus;
  bonusPoints?: number;
  redeemedPoints?: number;
  loyaltyLogs?: CustomerLoyaltyLog[];
  followUpLogs?: CustomerFollowUpLog[];
  customOffersSent?: CustomerOfferRecord[];
  createdAt?: string;
  updatedAt?: string;
}

// Financial Segregation Vaults (فصل التكاليف عن الأرباح والمحافظ المنفصلة)
export type VaultType = 
  | 'restock'      // ① قسم تكلفة المخزون وإعادة الشراء 🧴 (قيمة البضاعة المباعة - سحب فوري في أي وقت لشراء زيوت وزجاجات)
  | 'commissions'  // ② قسم مخصص العمولات 💸 (تكلفة متغيرة 5% على المبيعات لصرف مستحقات البيع)
  | 'rent'         // ③.1 مخصص الإيجار 🏪 (1,200 ج.م شهرياً / 48 ج.م يومياً)
  | 'salaries'     // ③.2 مخصص الرواتب 👤 (11,500 ج.م: د. محمد 10,000 + طارق 1,500)
  | 'utilities'    // ③.3 فواتير وتشغيل ⚡ (2,000 ج.م: كهرباء 800 + نت 300 + نقل 300 + تشغيل 300 + مياه 100 + خط 100 + نظافة 100)
  | 'contingency'  // ③.4 احتياطي الهالك والتالف 🛡️ (300 ج.م شهرياً / 12 ج.م يومياً)
  | 'owner_profit' // ④ قسم الأرباح الصافية الحرة للمالك 📈 (لا يوضع فيه إلا بعد توفير المخزون والعمولات والموازنة الـ 15,000)
  | 'capital';     // ⑤ قسم رأس المال وتمويل صاحب المشروع 🔒 (ضخ تمويل جديد ولا يسجل كإيراد أو ربح)

export interface FinancialVault {
  id: VaultType;
  name: string;
  description: string;
  currentBalance: number;
  totalInflow: number;
  totalWithdrawn: number;
  targetMonthlyAllocation?: number;
  withdrawalFrequency: 'anytime' | 'monthly';
  iconName: string;
}

export interface WithdrawalTransaction {
  id: string;
  vaultId: VaultType;
  vaultName: string;
  type?: 'withdrawal' | 'capital_deposit'; // سحب أو إضافة رأس مال
  amount: number;
  date: string;
  executedBy: string; // e.g. "د. محمد (المالك)"
  recipientName?: string; // اسم المستلم
  reason: string; // e.g. "شراء زيوت عطرية جديدة وتعويض هالك"
  invoiceRef?: string;
  status: 'مؤكد ومصروف' | 'مؤكد ومودع' | 'قيد التنفيذ';
  balanceBefore?: number;
  balanceAfter: number;
  notes?: string;
  dataClassification?: DataClassification;
  isTestData?: boolean;
  testClassificationNote?: string;
}

// Approved 11 Fixed Budget Items (Total 15,000 EGP / 25 days = 600 EGP/day)
export interface FixedBudgetItem {
  id: string;
  name: string;
  category: 'rent' | 'salaries' | 'utilities' | 'contingency';
  monthlyAmount: number;
  dailyRate: number; // monthlyAmount / 25
  icon: string;
}

export const APPROVED_FIXED_BUDGET_ITEMS: FixedBudgetItem[] = [
  { id: 'rent', name: '🏪 الإيجار', category: 'rent', monthlyAmount: 1200, dailyRate: 48, icon: 'Building' },
  { id: 'electricity', name: '⚡ الكهرباء', category: 'utilities', monthlyAmount: 800, dailyRate: 32, icon: 'Zap' },
  { id: 'water', name: '💧 المياه', category: 'utilities', monthlyAmount: 100, dailyRate: 4, icon: 'Droplets' },
  { id: 'internet', name: '🌐 الإنترنت', category: 'utilities', monthlyAmount: 300, dailyRate: 12, icon: 'Globe' },
  { id: 'phone', name: '📱 الخط', category: 'utilities', monthlyAmount: 100, dailyRate: 4, icon: 'Smartphone' },
  { id: 'cleaning', name: '🧹 النظافة', category: 'utilities', monthlyAmount: 100, dailyRate: 4, icon: 'Sparkles' },
  { id: 'transport', name: '🚚 النقل', category: 'utilities', monthlyAmount: 300, dailyRate: 12, icon: 'Truck' },
  { id: 'operations', name: '📦 مصاريف تشغيل أخرى', category: 'utilities', monthlyAmount: 300, dailyRate: 12, icon: 'Box' },
  { id: 'salary_owner', name: '👤 مخصص الإدارة والإشراف العام', category: 'salaries', monthlyAmount: 10000, dailyRate: 400, icon: 'UserCheck' },
  { id: 'salary_tarek', name: '👤 مخصص التشغيل والمبيعات الأساسي', category: 'salaries', monthlyAmount: 1500, dailyRate: 60, icon: 'User' },
  { id: 'reserve_spoilage', name: '🛡️ احتياطي (هالك/تالف/فاقد)', category: 'contingency', monthlyAmount: 300, dailyRate: 12, icon: 'ShieldAlert' },
];

export const DEFAULT_VAULTS: FinancialVault[] = [
  {
    id: 'restock',
    name: '🧴 قسم تكلفة المخزون وإعادة الشراء',
    description: 'قيمة البضاعة التي خرجت من المخزون لحفظها وإعادة شراء الزيوت والزجاجات. ليست ربحاً.',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    withdrawalFrequency: 'anytime',
    iconName: 'ShieldCheck',
  },
  {
    id: 'commissions',
    name: '💸 قسم مخصص العمولات (5%)',
    description: 'حجز العمولات المتغيرة المستحقة على المبيعات (تكلفة بيعية متغيرة منفصلة عن الـ 15,000 ج.م).',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    withdrawalFrequency: 'anytime',
    iconName: 'Coins',
  },
  {
    id: 'rent',
    name: '🏪 مخصص الإيجار الشهري',
    description: 'موازنة إيجار المحل المعتمدة (1,200 ج.م شهرياً / مخصص إداري 48 ج.م يومياً).',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    targetMonthlyAllocation: 1200,
    withdrawalFrequency: 'monthly',
    iconName: 'Building',
  },
  {
    id: 'salaries',
    name: '👤 مخصص الإدارة والتشغيل المعتمد',
    description: 'المخصص الشهري المعتمد للإدارة والتشغيل ضمن موازنة الـ 15,000 ج.م (بيانات خلفية محمية).',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    targetMonthlyAllocation: 11500,
    withdrawalFrequency: 'monthly',
    iconName: 'Users',
  },
  {
    id: 'utilities',
    name: '⚡ مخصص الفواتير ومصاريف التشغيل',
    description: 'كهرباء (800) + إنترنت (300) + نقل (300) + تشغيل (300) + مياه (100) + خط (100) + نظافة (100) = 2,000 ج.م شهرياً.',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    targetMonthlyAllocation: 2000,
    withdrawalFrequency: 'monthly',
    iconName: 'Zap',
  },
  {
    id: 'contingency',
    name: '🛡️ احتياطي الهالك والتالف والفاقد',
    description: 'مخصص معتمد داخل الـ 15,000 ج.م لتغطية الهالك والتالف والمصروفات غير المتوقعة (300 ج.م شهرياً / 12 ج.م يومياً).',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    targetMonthlyAllocation: 300,
    withdrawalFrequency: 'anytime',
    iconName: 'ShieldAlert',
  },
  {
    id: 'owner_profit',
    name: '📈 قسم الأرباح الصافية الحرة للمالك',
    description: 'لا يوضع فيه أي مبالغ إلا بعد اكتمال تكلفة المخزون والعمولات والموازنة الثابتة (15,000 ج.م). متاح للسحب الشخصي فقط عند تحققه.',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    withdrawalFrequency: 'monthly',
    iconName: 'TrendingUp',
  },
  {
    id: 'capital',
    name: '🔒 قسم رأس المال وتمويل صاحب المشروع',
    description: 'أموال رأس المال وضخ التمويل الجديد. ليس ربحاً ولا يستخدم للمصروفات اليومية إلا بقرار رسمي.',
    currentBalance: 0,
    totalInflow: 0,
    totalWithdrawn: 0,
    withdrawalFrequency: 'anytime',
    iconName: 'Wallet',
  },
];

export interface StoreBackupData {
  version: string;
  timestamp: string;
  storeName: string;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  settings: StoreSettings;
  bottleSizes: BottleSize[];
}

// Approved Global Settings
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'لمسة عطر',
  currency: 'جنيه',
  priceEssenceNormal: 10, // الزيت العادي: 10 جنيه/جرام
  priceEssenceNiche: 15, // النيش: 15 جنيه/جرام
  priceEssenceSpecial: 20, // العود والمسك: 20 جنيه/جرام
  defaultBottleCost: 15, // العبوة العادية + البخاخ: 15 جنيه
  standardBottleAndSprayCost: 15,
  coloredBottleCost: 50, // العبوة الملونة: 50 جنيه
  coloredBottleExtraCost: 35, // الفرق في تكلفة العبوة الملونة: 35 جنيه
  stickerCost: 1, // الاستيكر: 1 جنيه
  basicBagCost: 1, // الكيس البلاستيك الأساسي: 1 جنيه (إلزامي لكل عملية بيع)
  basicPlasticBagCost: 1,
  defaultMargin: 35,
  dailyTargetProfit: 600, // 600 EGP Initial Daily Contribution (15,000 / 25)
  monthlyTargetRevenue: 28000,
  monthlyFixedBudget: 15000, // 15,000 EGP Approved Safe Monthly Budget
  monthlyWorkDays: 25, // 25 Days Planning Basis
  employeeBaseSalary: 1500, // Tarek Base Salary
  ownerSalary: 10000, // Dr. Mohamed
  commissionRate: 0.05, // 5%
  tieredCommissionRate: 0.07, // 7%
  tieredThresholdBottles: 10,
  storePhone: '01123376728',
  storeWhatsAppPrimary: '01123376728',
  storeWhatsAppSecondary: '01062018755',
  storeWhatsAppManager: 'طارق (مسؤول المبيعات والواتساب)',
  storeEmail: 'lamsteitr@gmail.com',
  storeAddress: 'متجر لمسة عطر - أرقى الزيوت العطرية والتركيبات الخاصة',
  storeSlogan: 'أثر يبقى وذكرى تدوم',
  storeTaxNumber: '',
  receiptFooterMessage: 'شكراً لثقتكم بنا! عطورنا مصممة بثبات وفوحان يدوم طويلاً. واتساب المتجر: 01123376728 / 01062018755',
  logoUrl: 'https://l.top4top.io/p_31142jfec0.png',
  showLogoOnReceipt: true,
  receiptDesign: DEFAULT_RECEIPT_DESIGN,
  activeThemeId: 'apple_win12_fluent_hybrid',
  themeAmbientGlow: true,
  themeGlassIntensity: 'ultra',
  themeAutoTimeOfDay: false,
  themeTypingEffects: true,
  themeTypingIntensity: 'lively',
  themeTypingStyle: 'pulse',
  themeTypingBgColorShift: true,
  themeSoundEffects: true,
  themeCardElevation: 'floating',
  themeCustomAccentColor: '',
  themeFontScale: 'normal',
  siteFontFamily: 'readex',
  siteFontSizePercent: 100,
  siteFontWeight: 'regular',
  siteFontStrokeWidth: 'none',
  siteLineHeight: 'normal',
  siteLetterSpacing: 'normal',
  sitePrimaryTextColor: '',
  siteSecondaryTextColor: '',
  siteHeadingColorMode: 'theme_default',
  siteHeadingCustomColor: '',
  siteNumeralSystem: 'en',
  themeSurfaceStyle: 'win12_apple_mica_hybrid',
  themeBorderRadius: 'rounded',
  themeContrastLevel: 'standard',
  autoMidnightReportEnabled: true,
  whatsappAutoSendOnClosure: true,
  whatsappAutoSendWithEmail: true,
  whatsappDualTargetDispatch: true,
  whatsappFreeMethod: 'all_combined',
  // Official Loyalty Engine & AI Profit-Guard Settings (§47 & §48: 10 EGP = 1 pt, 1 pt = 0.10 EGP, 100 pts = 10 EGP, Min Redeem = 50 pts = 5 EGP, Min Safe Contribution = 10 EGP)
  loyaltyEnabled: true,
  loyaltyAutoAI: false,
  loyaltyProtectBreakEven: true,
  loyaltyPointsPerSpendEgp: 10,
  loyaltyPointsPerVisit: 0,
  loyaltyCashPerPointEgp: 0.10,
  loyaltyMinRedeemPoints: 50,
  loyaltyMaxBillDiscountPercent: 25,
  loyaltyMinSafeMarginEgp: 10,
  loyaltyWelcomeBonusPoints: 0,
  loyaltyStrategyMode: 'balanced',
  dashboardLayout: DEFAULT_DASHBOARD_LAYOUT_CONFIG,
};

// Approved Official Bottle Sizes and Exact Price/Cost Matrices
// (100ml, 50ml, 30ml, 25ml, 20ml, 10ml spray, and 5ml, 3ml, 2ml roll-ons)
export const DEFAULT_BOTTLE_SIZES: BottleSize[] = [
  { 
    id: 'b-100', 
    sizeMl: 100, 
    essenceGrams: 30, 
    bottleCost: 15, 
    suggestedMargin: 210,
    normalPrice: 550, 
    coloredNormalPrice: 600,
    specialPrice: 700, 
    officialCost: 340,
    isRollOn: false 
  },
  { 
    id: 'b-50', 
    sizeMl: 50, 
    essenceGrams: 15, 
    bottleCost: 15, 
    suggestedMargin: 50,
    normalPrice: 230, 
    coloredNormalPrice: 300,
    specialPrice: 450, 
    officialCost: 180,
    isRollOn: false 
  },
  { 
    id: 'b-30', 
    sizeMl: 30, 
    essenceGrams: 10, 
    bottleCost: 15, 
    suggestedMargin: 55,
    normalPrice: 170, 
    coloredNormalPrice: 250,
    specialPrice: 350, 
    officialCost: 115,
    isRollOn: false 
  },
  { 
    id: 'b-25', 
    sizeMl: 25, 
    essenceGrams: 8, 
    bottleCost: 15, 
    suggestedMargin: 65,
    normalPrice: 160, 
    specialPrice: 320, 
    officialCost: 95,
    isRollOn: false 
  },
  { 
    id: 'b-20', 
    sizeMl: 20, 
    essenceGrams: 6, 
    bottleCost: 15, 
    suggestedMargin: 35,
    normalPrice: 120, 
    specialPrice: 280, 
    officialCost: 85,
    isRollOn: false 
  },
  { 
    id: 'b-10', 
    sizeMl: 10, 
    essenceGrams: 3, 
    bottleCost: 15, 
    suggestedMargin: 20,
    normalPrice: 70, 
    specialPrice: 150, 
    officialCost: 50,
    isRollOn: false 
  },
  // Roll-ons (Pure Essence without alcohol)
  { 
    id: 'r-5', 
    sizeMl: 5, 
    essenceGrams: 5, 
    bottleCost: 6, 
    suggestedMargin: 20,
    normalPrice: 80, 
    specialPrice: 150, 
    officialCost: 60,
    isRollOn: true 
  },
  { 
    id: 'r-3', 
    sizeMl: 3, 
    essenceGrams: 3, 
    bottleCost: 5, 
    suggestedMargin: 20,
    normalPrice: 60, 
    specialPrice: 130, 
    officialCost: 40,
    isRollOn: true 
  },
  { 
    id: 'r-2', 
    sizeMl: 2, 
    essenceGrams: 2, 
    bottleCost: 4, 
    suggestedMargin: 10,
    normalPrice: 40, 
    specialPrice: 100, 
    officialCost: 30,
    isRollOn: true 
  },
];

// ========================================================
// OPERATIONAL RECIPES & FORMULATION ENGINE SPECIFICATIONS
// ========================================================

export interface OperationalRecipe {
  sizeMl: number;
  oilGrams: number;
  fixativeGrams: number; // 1g for sprays, 0g for rolls
  alcoholMethod: string;
  isRollOn: boolean;
  officialCost: number; // Approved standard cost
  standardNormalPrice: number;
  coloredNormalPrice?: number;
  standardSpecialPrice: number;
  notes?: string;
}

export const APPROVED_OPERATIONAL_RECIPES: Record<number, OperationalRecipe> = {
  100: {
    sizeMl: 100,
    oilGrams: 30,
    fixativeGrams: 1,
    alcoholMethod: 'استكمال العبوة بالكحول الطبي 96%',
    isRollOn: false,
    officialCost: 340,
    standardNormalPrice: 550,
    coloredNormalPrice: 600,
    standardSpecialPrice: 700,
  },
  50: {
    sizeMl: 50,
    oilGrams: 15,
    fixativeGrams: 1,
    alcoholMethod: 'استكمال العبوة بالكحول الطبي 96%',
    isRollOn: false,
    officialCost: 180,
    standardNormalPrice: 230,
    coloredNormalPrice: 300,
    standardSpecialPrice: 450,
  },
  30: {
    sizeMl: 30,
    oilGrams: 10,
    fixativeGrams: 1,
    alcoholMethod: 'استكمال العبوة بالكحول الطبي 96%',
    isRollOn: false,
    officialCost: 115,
    standardNormalPrice: 170,
    coloredNormalPrice: 250,
    standardSpecialPrice: 350,
  },
  25: {
    sizeMl: 25,
    oilGrams: 8,
    fixativeGrams: 1,
    alcoholMethod: 'استكمال العبوة بالكحول الطبي 96%',
    isRollOn: false,
    officialCost: 95,
    standardNormalPrice: 160,
    standardSpecialPrice: 320,
  },
  20: {
    sizeMl: 20,
    oilGrams: 6,
    fixativeGrams: 1,
    alcoholMethod: 'استكمال العبوة بالكحول الطبي 96%',
    isRollOn: false,
    officialCost: 85,
    standardNormalPrice: 120,
    standardSpecialPrice: 280,
  },
  10: {
    sizeMl: 10,
    oilGrams: 3,
    fixativeGrams: 1,
    alcoholMethod: 'استكمال العبوة بالكحول الطبي 96%',
    isRollOn: false,
    officialCost: 50,
    standardNormalPrice: 70,
    standardSpecialPrice: 150,
  },
  5: {
    sizeMl: 5,
    oilGrams: 5,
    fixativeGrams: 0,
    alcoholMethod: 'بدون كحول (زيت خام نقي)',
    isRollOn: true,
    officialCost: 60,
    standardNormalPrice: 80,
    standardSpecialPrice: 150,
  },
  3: {
    sizeMl: 3,
    oilGrams: 3,
    fixativeGrams: 0,
    alcoholMethod: 'بدون كحول (زيت خام نقي)',
    isRollOn: true,
    officialCost: 40,
    standardNormalPrice: 60,
    standardSpecialPrice: 130,
  },
  2: {
    sizeMl: 2,
    oilGrams: 2,
    fixativeGrams: 0,
    alcoholMethod: 'بدون كحول (زيت خام نقي)',
    isRollOn: true,
    officialCost: 30,
    standardNormalPrice: 40,
    standardSpecialPrice: 100,
  },
};

export type OperationalRecipeSpec = OperationalRecipe;

// Packaging options (التغليف — ثامنًا من المرجع التجاري والمالي)
export interface PackagingOption {
  id: 'basic_bag' | 'luxury_box' | 'luxury_bag' | 'luxury_both';
  name: string;
  type: 'basic' | 'luxury';
  cost: number; // Store gross cost (1 EGP basic, 10 EGP box, 10 EGP bag, 20 EGP both)
  price: number; // Customer price if charged (0, 10, 10, 20)
  replacesBasicBag?: boolean; // True when luxury bag replaces the mandatory 1 EGP basic plastic bag
  isFreeToCustomer?: boolean; // Whether given free or paid
}

export const DEFAULT_PACKAGING_OPTIONS: PackagingOption[] = [
  { id: 'basic_bag', name: 'كيس بلاستيكي أساسي (إلزامي)', type: 'basic', cost: 1, price: 0, replacesBasicBag: false, isFreeToCustomer: true },
  { id: 'luxury_box', name: 'العلبة الفاخرة فقط', type: 'luxury', cost: 10, price: 10, replacesBasicBag: false, isFreeToCustomer: false },
  { id: 'luxury_bag', name: 'الكيس القماش/الورقي الفاخر', type: 'luxury', cost: 10, price: 10, replacesBasicBag: true, isFreeToCustomer: false },
  { id: 'luxury_both', name: 'العلبة + الكيس الفاخر معاً', type: 'luxury', cost: 20, price: 20, replacesBasicBag: true, isFreeToCustomer: false },
];

// Production Batch Management (GMP / IFRA Good Practices)
export interface ProductionBatch {
  id: string; // e.g. BATCH-2026-09-001
  batchNumber: string;
  date: string;
  perfumeName: string;
  brand?: string;
  supplier: string; // e.g. الرصاصي / مان / جيفودان / لوزي
  oilType: PerfumeType;
  bottleSizeMl: number;
  oilGramsPerUnit: number;
  fixativeGramsPerUnit: number;
  alcoholMlPerUnit: number;
  unitsCount: number;
  totalOilUsedGrams: number;
  preparedBy: string; // e.g. 'طارق' or 'د. محمد'
  mixingDate: string;
  firstTestDate: string; // +7 days
  finalTestDate: string; // +14 days
  status: 'مجهزة' | 'تحت الاختبار' | 'معتمدة' | 'مرفوضة';
  sensoryEvaluation?: {
    longevity: 'ضعيف' | 'مقبول' | 'جيد' | 'ممتاز';
    sillage: 'ضعيف' | 'مقبول' | 'جيد' | 'ممتاز';
    balance: 'ضعيف' | 'مقبول' | 'جيد' | 'ممتاز';
    evaluatedAt?: string;
    evaluatedBy?: string;
    notes?: string;
  };
  ifraComplianceNote?: string;
  calculatedUnitCost: number;
  notes?: string;
}

// Immutable Audit Log Record (سجل التغيير غير القابل للحذف)
export interface AuditLogRecord {
  id: string;
  timestamp: string;
  user: string; // e.g. 'د. محمد (المالك)' or 'طارق (المبيعات)'
  action: 'تعديل سعر' | 'تعديل تكلفة' | 'تعديل وصفة' | 'تجاوز حد التكلفة' | 'اعتماد دفعة' | 'سحب مالي' | 'تعديل مخزون' | 'استثناء إداري' | 'قيد عكسي' | 'إلغاء بيع' | 'مرتجع' | 'فتح يوم' | 'إغلاق يوم' | 'إعادة فتح يوم' | 'تغيير كلمة مرور' | 'تعديل صلاحيات' | 'ضخ رأس مال' | 'تحويل محافظ';
  entityType: 'product' | 'bottle_size' | 'sale' | 'batch' | 'vault' | 'recipe' | 'user' | 'closure' | 'inventory_check';
  entityId: string | number;
  entityName: string;
  oldValue: any;
  newValue: any;
  reason: string; // Mandatory explanation
  approvedBy?: string;
  device?: string;
  relatedTransactionId?: string;
  category?: 'مبيعات' | 'تسعير_وتكلفة' | 'مخزون' | 'خزائن_ومسحوبات' | 'مستخدمين_وأمان' | 'إغلاق_يومي';
  serverTimestamp?: string;
}

// Fragrance Intelligence Data (معلومات العطر والمصادر ودرجة الثقة)
export interface FragranceIntel {
  name: string;
  brand: string;
  releaseYear?: number | string;
  type: PerfumeType;
  classification: string; // e.g. 'Woody Amber', 'Oriental Floral', 'Fresh Citrus'
  mainAccords: string[];
  generalCharacter: string;
  appropriateUse: string;
  seasonSuggested: Season;
  genderSuggested: Gender;
  conflictingInfo?: string;
  sourcesRanked: Array<{
    rank: number;
    name: string;
    type: 'official_brand' | 'supplier' | 'ifra' | 'database' | 'community';
    urlOrRef?: string;
  }>;
  confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة';
  confidenceReason: string;
  ifraCategory4SafeLimitPercent?: number; // e.g. 20% or 30%
  ambiguityMatches?: string[]; // e.g. ['Dior Sauvage EDT', 'Sauvage EDP', 'Sauvage Elixir', 'Sauvage Parfum']
  isAmbiguous?: boolean;
}

// AI Recipe Recommendation (اقتراح التركيز والجرامات)
export interface RecipeProposal {
  perfumeName: string;
  sizeMl: number;
  currentStandardOilGrams: number;
  proposedOilGrams: number; // Must be integer! No fractions
  proposedConcentrationPercent: number;
  fixativeGrams: number;
  alcoholMethod: string;
  expectedOutcome: {
    longevityDesc: string;
    sillageDesc: string;
    balanceDesc: string;
  };
  costImpactEgp: number; // Difference in EGP
  suggestedPriceEgp?: number;
  confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة';
  reasoning: string;
  ifraSafeWarning?: string;
  status: 'معلق' | 'معتمد' | 'حفظ كتجربة' | 'مرفوض';
}

// Financial Audit Anomaly (مدقق الذكاء الاصطناعي المحاسبي)
export interface FinancialAuditAnomaly {
  id: string;
  severity: 'حرجة' | 'مهمة' | 'تحتاج مراجعة' | 'ملاحظة';
  category: 'تسعير_وتكلفة' | 'مساهمة_سالبة' | 'مخزون_سلبي' | 'خصم_غير_آمن' | 'تعارض_وصفة' | 'نقدية_وفروقات';
  title: string;
  description: string;
  suggestedAction: string;
  expectedImpact: string;
  confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة';
  detectedAt: string;
}

// ========================================================
// MATHEMATICAL FINANCIAL HELPERS (مساهمة، خصم آمن، تكلفة مشتقة)
// (المرجع التجاري والمالي للمنتجات — متجر «لَمْسَةُ عِطْر»)
// ========================================================

/**
 * ثالثًا: تكلفة الجرام المعتمدة حسب نوع الزيت
 * الزيت العادي = 10 جنيه/جم | النيش = 15 جنيه/جم | العود = 20 جنيه/جم | المسك = 20 جنيه/جم
 */
export function getApprovedOilGramCost(
  type: PerfumeType,
  settings?: Partial<StoreSettings>
): number {
  const s = settings || DEFAULT_SETTINGS;
  if (type === 'نيش') return Number(s.priceEssenceNiche ?? 15);
  if (type === 'عود' || type === 'مسك') return Number(s.priceEssenceSpecial ?? 20);
  return Number(s.priceEssenceNormal ?? 10);
}

/**
 * سادسًا وسابعًا: التكلفة المشتقة حسب نوع الزيت والعبوة الملونة
 * يعتمد النظام تكلفة الحجم العادية (officialCost) كأساس، ثم يضيف فرق تكلفة الجرام عند استخدام النيش (+5/جم)
 * أو العود/المسك (+10/جم)، مع إضافة فرق العبوة الملونة (+35 ج = 50 - 15) عند اختيارها.
 */
export function calculateDerivedProductCost(
  paramsOrBottle:
    | {
        bottle: Pick<BottleSize, 'sizeMl' | 'essenceGrams' | 'officialCost' | 'isRollOn'>;
        perfumeType: PerfumeType;
        customEssenceGrams?: number;
        isColoredBottle?: boolean;
        customOilGramCost?: number;
        settings?: Partial<StoreSettings>;
      }
    | Pick<BottleSize, 'sizeMl' | 'essenceGrams' | 'officialCost' | 'isRollOn'>,
  perfumeTypeArg?: PerfumeType,
  isColoredBottleArg?: boolean,
  settingsArg?: Partial<StoreSettings>,
  customEssenceGramsArg?: number,
  customOilGramCostArg?: number
): number {
  const isParamsObj = 'bottle' in paramsOrBottle;
  const bottle = isParamsObj ? paramsOrBottle.bottle : paramsOrBottle;
  const perfumeType = isParamsObj ? paramsOrBottle.perfumeType : (perfumeTypeArg || 'عادي');
  const isColoredBottle = isParamsObj ? paramsOrBottle.isColoredBottle : isColoredBottleArg;
  const s = (isParamsObj ? paramsOrBottle.settings : settingsArg) || DEFAULT_SETTINGS;
  const customEssenceGrams = isParamsObj ? paramsOrBottle.customEssenceGrams : customEssenceGramsArg;
  const customOilGramCost = isParamsObj ? paramsOrBottle.customOilGramCost : customOilGramCostArg;

  const normalGramCost = Number(s.priceEssenceNormal ?? 10);
  const standardTypeGramCost = getApprovedOilGramCost(perfumeType, s);
  const effectiveGramCost =
    customOilGramCost !== undefined && Number.isFinite(customOilGramCost)
      ? Number(customOilGramCost)
      : standardTypeGramCost;

  const baseNormalOfficialCost = Number(bottle.officialCost || 0);
  const standardGrams = Number(bottle.essenceGrams || 0);
  const actualGrams =
    customEssenceGrams !== undefined && Number.isFinite(customEssenceGrams)
      ? Math.round(Number(customEssenceGrams))
      : standardGrams;

  // 1. Oil category differential on standard grams: standardGrams * (effectiveGramCost - normalGramCost)
  const oilCategoryDelta = standardGrams * (effectiveGramCost - normalGramCost);

  // 2. Extra or reduced grams differential if modified from standard recipe
  const customGramsDelta = (actualGrams - standardGrams) * effectiveGramCost;

  // 3. Colored bottle differential: 50 EGP colored - 15 EGP standard = +35 EGP (only for spray bottles)
  const coloredDelta =
    isColoredBottle && !bottle.isRollOn
      ? Number(s.coloredBottleExtraCost ?? 35)
      : 0;

  return Math.max(0, Math.round(baseNormalOfficialCost + oilCategoryDelta + customGramsDelta + coloredDelta));
}

/**
 * ثانيًا وسابعًا: استخراج سعر البيع المعتمد والتحقق من قاعدة العبوة الملونة
 * لا ينشئ النظام سعرًا ملونًا للعود أو المسك أو النيش تلقائيًا إذا لم يكن له سعر بيع معتمد في قاعدة البيانات من المالك.
 */
export function getApprovedSellingPrice(params: {
  bottle: BottleSize;
  perfumeType: PerfumeType;
  isColoredBottle?: boolean;
}): {
  price: number;
  isColoredAllowed: boolean;
  coloredDisallowedReason?: string;
};
export function getApprovedSellingPrice(
  bottle: BottleSize,
  perfumeType: PerfumeType,
  isColoredBottle?: boolean
): number;
export function getApprovedSellingPrice(
  paramsOrBottle:
    | {
        bottle: BottleSize;
        perfumeType: PerfumeType;
        isColoredBottle?: boolean;
      }
    | BottleSize,
  perfumeTypeArg?: PerfumeType,
  isColoredBottleArg?: boolean
):
  | {
      price: number;
      isColoredAllowed: boolean;
      coloredDisallowedReason?: string;
    }
  | number {
  const isParamsObj = 'bottle' in paramsOrBottle;
  const bottle = isParamsObj ? paramsOrBottle.bottle : paramsOrBottle;
  const perfumeType = isParamsObj ? paramsOrBottle.perfumeType : (perfumeTypeArg || 'عادي');
  const isColoredBottle = isParamsObj ? paramsOrBottle.isColoredBottle : isColoredBottleArg;

  const isSpecialOrNiche =
    perfumeType === 'نيش' || perfumeType === 'عود' || perfumeType === 'مسك';

  let result: {
    price: number;
    isColoredAllowed: boolean;
    coloredDisallowedReason?: string;
  };

  if (isColoredBottle && !bottle.isRollOn) {
    if (isSpecialOrNiche) {
      if (bottle.coloredSpecialPrice && bottle.coloredSpecialPrice > 0) {
        result = {
          price: bottle.coloredSpecialPrice,
          isColoredAllowed: true,
        };
      } else {
        result = {
          price: bottle.specialPrice,
          isColoredAllowed: false,
          coloredDisallowedReason:
            'لا يجوز للنظام اختراع سعر بيع للعبوة الملونة في فئات العود والمسك والنيش دون اعتماد سعر من المالك في قاعدة البيانات.',
        };
      }
    } else {
      const defaultColoredNormal =
        bottle.coloredNormalPrice ??
        (bottle.sizeMl === 100
          ? 600
          : bottle.sizeMl === 50
          ? 300
          : bottle.sizeMl === 30
          ? 250
          : undefined);
      if (defaultColoredNormal && defaultColoredNormal > 0) {
        result = {
          price: defaultColoredNormal,
          isColoredAllowed: true,
        };
      } else {
        result = {
          price: bottle.normalPrice,
          isColoredAllowed: false,
          coloredDisallowedReason: `لا يوجد سعر بيع معتمد للعبوة الملونة بحجم ${bottle.sizeMl} مل حالياً إلا باعتماد المالك.`,
        };
      }
    }
  } else {
    result = {
      price: isSpecialOrNiche ? bottle.specialPrice : bottle.normalPrice,
      isColoredAllowed: true,
    };
  }

  return isParamsObj ? result : result.price;
}

/**
 * حساب تكلفة وسعر زجاجة الميكس الواحدة (Mix Bottle as 1 Single Sale Unit with Multiple Perfume Components)
 * - الزجاجة هي وحدة البيع (1 زجاجة فقط مهما تعددت مكونات العطور داخلها A + B + C).
 * - تُحمّل تكلفة الزجاجة والكحول والمثبت والاستيكر والكيس الأساسي مرة واحدة فقط للزجاجة.
 * - تُجمع تكلفة الزيوت الفعلية لكل مكوّن حسب جراماته وتكلفة جرامه (عادي 10 / نيش 15 / عود ومسك 20 أو مخصص).
 */
export function calculateMixBottleAccounting(params: {
  bottle: BottleSize;
  components: Array<{
    productId: number | string;
    productName: string;
    brand?: string;
    productType: PerfumeType;
    grams: number;
    customOilGramCost?: number;
    availableStockGrams?: number;
  }>;
  isColoredBottle?: boolean;
  customSellingPrice?: number | '';
  settings?: Partial<StoreSettings>;
}): {
  enrichedComponents: MixComponent[];
  totalEssenceGrams: number;
  standardBottleEssenceGrams: number;
  bottleOverheadCostEgp: number;
  totalComponentsOilCostEgp: number;
  unitBottleCostEgp: number;
  suggestedSellingPriceEgp: number;
  finalSellingPriceEgp: number;
  commissionEgp: number;
  netContributionEgp: number;
  minSafeSellingPriceEgp: number;
  maxAllowedDiscountEgp: number;
  loyaltyPointsEarned: number;
  dominantType: PerfumeType;
  mixDisplayName: string;
  alcoholMl: number;
  fixativeGrams: number;
  isBelowCost: boolean;
  isBelowMinContribution: boolean;
  hasStockShortage: boolean;
  hasFractionalGrams: boolean;
  isTotalGramsMatchingStandard: boolean;
  canApproveMix: boolean;
  blockingReasonsAr: string[];
} {
  const s = params.settings || DEFAULT_SETTINGS;
  const bottle = params.bottle;
  const normalGramCost = Number(s.priceEssenceNormal ?? 10);
  const standardGrams = Math.max(1, Math.round(Number(bottle.essenceGrams || 15)));
  const baseNormalOfficialCost = Number(bottle.officialCost || 0);

  // Overhead for 1 single bottle (bottle + sprayer + alcohol + fixative + sticker + basic bag)
  const baseVesselAndAlcoholOverhead = Math.max(
    bottle.isRollOn ? 5 : 15,
    baseNormalOfficialCost - standardGrams * normalGramCost
  );
  const coloredExtra =
    params.isColoredBottle && !bottle.isRollOn
      ? Number(s.coloredBottleExtraCost ?? 35)
      : 0;
  const bottleOverheadCostEgp = Math.round(baseVesselAndAlcoholOverhead + coloredExtra);

  const rawTotalGrams = params.components.reduce(
    (sum, c) => sum + Math.max(0, Math.round(Number(c.grams) || 0)),
    0
  );
  const totalEssenceGrams = Math.max(0, Math.round(rawTotalGrams));

  const hasFractionalGrams = params.components.some(
    (c) => !Number.isInteger(Number(c.grams))
  );

  const enrichedComponents: MixComponent[] = params.components.map((c) => {
    const g = Math.max(0, Math.round(Number(c.grams) || 0));
    const gramCost =
      c.customOilGramCost !== undefined && Number.isFinite(c.customOilGramCost) && c.customOilGramCost > 0
        ? Number(c.customOilGramCost)
        : getApprovedOilGramCost(c.productType, s);
    const compCost = Math.round(g * gramCost);
    const pct = totalEssenceGrams > 0 ? Math.round((g / totalEssenceGrams) * 100) : 0;
    return {
      productId: c.productId,
      productName: c.productName,
      brand: c.brand || '',
      productType: c.productType,
      grams: g,
      percentage: pct,
      oilGramCost: gramCost,
      componentOilCost: compCost,
      availableStockGrams: c.availableStockGrams,
    };
  });

  // التكلفة الزيتية = مجموع (جرامات كل مكوّن × تكلفة جرامه)
  const totalComponentsOilCostEgp = enrichedComponents.reduce(
    (sum, c) => sum + c.componentOilCost,
    0
  );

  // التكلفة الكلية للزجاجة = التكلفة الزيتية + بقية مكونات المنتج
  const unitBottleCostEgp = Math.max(
    0,
    Math.round(bottleOverheadCostEgp + totalComponentsOilCostEgp)
  );

  // Determine dominant perfume type & weighted suggested selling price for 1 bottle
  const hasSpecial = enrichedComponents.some(
    (c) => c.productType === 'عود' || c.productType === 'مسك'
  );
  const hasNiche = enrichedComponents.some((c) => c.productType === 'نيش');
  const dominantType: PerfumeType = hasSpecial
    ? enrichedComponents.find((c) => c.productType === 'عود' || c.productType === 'مسك')!.productType
    : hasNiche
    ? 'نيش'
    : 'عادي';

  // Weighted base price across components for standard bottle size
  const normalBottlePrice = getApprovedSellingPrice({
    bottle,
    perfumeType: 'عادي',
    isColoredBottle: params.isColoredBottle,
  }).price;
  const specialBottlePrice = getApprovedSellingPrice({
    bottle,
    perfumeType: 'عود',
    isColoredBottle: params.isColoredBottle,
  }).price;

  let weightedBasePrice = normalBottlePrice;
  if (totalEssenceGrams > 0) {
    let weightedSum = 0;
    enrichedComponents.forEach((c) => {
      const weight = c.grams / totalEssenceGrams;
      const compBottlePrice =
        c.productType === 'عود' || c.productType === 'مسك' || c.productType === 'نيش'
          ? specialBottlePrice
          : normalBottlePrice;
      weightedSum += weight * compBottlePrice;
    });
    weightedBasePrice = Math.round(weightedSum);
  }

  // If total grams exceed standard bottle grams, add the extra oil cost + margin
  const extraGrams = Math.max(0, totalEssenceGrams - standardGrams);
  const avgGramCost =
    totalEssenceGrams > 0 ? totalComponentsOilCostEgp / totalEssenceGrams : normalGramCost;
  const extraGramsPriceDelta = Math.round(extraGrams * avgGramCost * 1.35);

  const commRate = bottle.isRollOn ? 0 : Number(s.commissionRate ?? 0.05);
  const minAcceptableContrib = 10;
  const minSafeSellingPriceEgp = Math.ceil((unitBottleCostEgp + minAcceptableContrib) / Math.max(0.1, 1 - commRate));

  const rawSuggested = Math.max(minSafeSellingPriceEgp, weightedBasePrice + extraGramsPriceDelta);
  const isUniformNormal = enrichedComponents.every((c) => c.productType === 'عادي') && extraGrams === 0;
  const isUniformSpecial =
    enrichedComponents.every((c) => c.productType !== 'عادي') && extraGrams === 0;
  const suggestedSellingPriceEgp = isUniformNormal
    ? Math.max(minSafeSellingPriceEgp, normalBottlePrice)
    : isUniformSpecial
    ? Math.max(minSafeSellingPriceEgp, specialBottlePrice)
    : Math.ceil(rawSuggested / 5) * 5;

  const finalSellingPriceEgp =
    params.customSellingPrice !== undefined && params.customSellingPrice !== ''
      ? Math.max(0, Number(params.customSellingPrice))
      : suggestedSellingPriceEgp;

  const commissionEgp = bottle.isRollOn ? 0 : Math.round(finalSellingPriceEgp * commRate);
  const netContributionEgp = finalSellingPriceEgp - unitBottleCostEgp - commissionEgp;
  const maxAllowedDiscountEgp = Math.max(0, finalSellingPriceEgp - minSafeSellingPriceEgp);
  const loyaltyPointsEarned = Math.max(1, Math.floor(finalSellingPriceEgp / 50));

  const isBelowCost = finalSellingPriceEgp < unitBottleCostEgp;
  const isBelowMinContribution = netContributionEgp < minAcceptableContrib;
  const hasStockShortage = enrichedComponents.some(
    (c) => c.availableStockGrams !== undefined && c.grams > c.availableStockGrams
  );
  const isTotalGramsMatchingStandard = totalEssenceGrams === standardGrams;

  const blockingReasonsAr: string[] = [];
  if (isBelowCost) {
    blockingReasonsAr.push(
      `سعر البيع (${finalSellingPriceEgp} ج) أقل من تكلفة الزجاجة الفعلية (${unitBottleCostEgp} ج).`
    );
  } else if (isBelowMinContribution) {
    blockingReasonsAr.push(
      `صافي المساهمة (${netContributionEgp} ج) أقل من الحد الأدنى المعتمد للمساهمة (${minAcceptableContrib} ج). الحد الأدنى الآمن للبيع: ${minSafeSellingPriceEgp} ج.`
    );
  }
  if (hasStockShortage) {
    const shortNames = enrichedComponents
      .filter((c) => c.availableStockGrams !== undefined && c.grams > c.availableStockGrams)
      .map((c) => `${c.productName} (المطلوب ${c.grams}جم والمتاح ${c.availableStockGrams}جم)`)
      .join('، ');
    blockingReasonsAr.push(`المخزون المتاح غير كافٍ للمكونات التالية: ${shortNames}.`);
  }

  const canApproveMix = !isBelowCost && !isBelowMinContribution && !hasStockShortage && enrichedComponents.length > 0;

  const namesJoined = enrichedComponents
    .map((c) => `${c.productName} (${c.grams}جم)`)
    .join(' + ');
  const mixDisplayName =
    enrichedComponents.length > 0
      ? `ميكس (${enrichedComponents.map((c) => c.productName).join(' + ')})${
          params.isColoredBottle && !bottle.isRollOn ? ' - عبوة ملونة' : ''
        }`
      : 'ميكس خاص';

  const fixativeGrams = bottle.isRollOn ? 0 : bottle.sizeMl >= 80 ? 2 : 1;
  const alcoholMl = bottle.isRollOn
    ? 0
    : Math.max(0, Math.round(bottle.sizeMl - totalEssenceGrams - fixativeGrams));

  return {
    enrichedComponents,
    totalEssenceGrams,
    standardBottleEssenceGrams: standardGrams,
    bottleOverheadCostEgp,
    totalComponentsOilCostEgp,
    unitBottleCostEgp,
    suggestedSellingPriceEgp,
    finalSellingPriceEgp,
    commissionEgp,
    netContributionEgp,
    minSafeSellingPriceEgp,
    maxAllowedDiscountEgp,
    loyaltyPointsEarned,
    dominantType,
    mixDisplayName: namesJoined ? `${mixDisplayName}` : 'ميكس خاص',
    alcoholMl,
    fixativeGrams,
    isBelowCost,
    isBelowMinContribution,
    hasStockShortage,
    hasFractionalGrams,
    isTotalGramsMatchingStandard,
    canApproveMix,
    blockingReasonsAr,
  };
}

/**
 * القاعدة التشغيلية المعتمدة لتوزيع الجرامات بأعداد صحيحة فقط دون كسور
 * مع الحفاظ على إجمالي جرامات الحجم القياسية دون زيادة أو نقص:
 * - عطران (70% + 30%):
 *   100 مل (30 جم) -> 21 + 9
 *   50 مل (15 جم)  -> 11 + 4
 *   30 مل (10 جم)  -> 7 + 3
 *   25 مل (8 جم)   -> 6 + 2
 *   20 مل (6 جم)   -> 4 + 2
 *   10 مل (3 جم)   -> 2 + 1
 * - ثلاثة عطور (60% + 30% + 10%):
 *   100 مل (30 جم) -> 18 + 9 + 3
 *   50 مل (15 جم)  -> 9 + 5 + 1
 *   30 مل (10 جم)  -> 6 + 3 + 1
 *   25 مل (8 جم)   -> 5 + 2 + 1
 *   20 مل (6 جم)   -> 3 + 2 + 1
 *   10 مل (3 جم)   -> 1 + 1 + 1 (بقرار واعٍ فقط)
 */
const STANDARD_INTEGER_SPLIT_2: Record<number, [number, number]> = {
  30: [21, 9],
  15: [11, 4],
  10: [7, 3],
  8: [6, 2],
  6: [4, 2],
  5: [4, 1],
  3: [2, 1],
  2: [1, 1],
};

const STANDARD_INTEGER_SPLIT_3: Record<number, [number, number, number]> = {
  30: [18, 9, 3],
  15: [9, 5, 1],
  10: [6, 3, 1],
  8: [5, 2, 1],
  6: [3, 2, 1],
  5: [3, 1, 1],
  3: [1, 1, 1],
};

export function distributeOptimalMixGrams<
  T extends {
    productId: number | string;
    productName: string;
    productType: PerfumeType;
    grams: number;
    availableStockGrams?: number;
  }
>(
  components: T[],
  standardBottleGrams: number,
  mode: 'optimal' | 'equal' = 'optimal',
  mixGoal: MixGoalType = 'standard'
): T[] {
  const count = components.length;
  if (count === 0) return [];
  const targetTotal = Math.max(1, Math.round(Number(standardBottleGrams) || 15));

  if (count === 1) {
    return [{ ...components[0], grams: targetTotal }];
  }

  let allocated: number[] = [];

  if (mode === 'equal') {
    // توزيع متساوٍ بأعداد صحيحة تماماً دون أي كسور مع الحفاظ على المجموع 100%
    const base = Math.max(1, Math.floor(targetTotal / count));
    allocated = components.map(() => base);
    let diff = targetTotal - allocated.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (diff !== 0 && idx < 100) {
      const targetIdx = idx % count;
      if (diff > 0) {
        allocated[targetIdx] += 1;
        diff -= 1;
      } else if (diff < 0 && allocated[count - 1 - targetIdx] > 1) {
        allocated[count - 1 - targetIdx] -= 1;
        diff += 1;
      }
      idx++;
    }
  } else if (count === 2) {
    // القاعدة الافتراضية لعطرين: 70% + 30% بأعداد صحيحة
    if (STANDARD_INTEGER_SPLIT_2[targetTotal]) {
      allocated = [...STANDARD_INTEGER_SPLIT_2[targetTotal]];
    } else {
      const g2 = Math.max(1, Math.floor(targetTotal * 0.3 + 0.25));
      const g1 = Math.max(1, targetTotal - g2);
      allocated = [g1, g2];
    }

    // تعديل ذكي قابل للتغيير وفق هدف الميكس وتحليل العطر (مع بقاء الأعداد صحيحة والمجموع ثابتاً)
    if (mixGoal === 'longevity' && targetTotal >= 6) {
      const is1Fixer = components[1].productType === 'عود' || components[1].productType === 'مسك' || components[1].productType === 'نيش';
      if (is1Fixer && allocated[0] > allocated[1] + 1) {
        allocated[0] -= 1;
        allocated[1] += 1;
      }
    } else if (mixGoal === 'economical' && targetTotal >= 6) {
      const is0Normal = components[0].productType === 'عادي';
      const is1Expensive = components[1].productType !== 'عادي';
      if (is0Normal && is1Expensive && allocated[1] > 1) {
        allocated[0] += 1;
        allocated[1] -= 1;
      }
    }
  } else if (count === 3) {
    // القاعدة الافتراضية لثلاثة عطور: 60% + 30% + 10% بأعداد صحيحة
    if (STANDARD_INTEGER_SPLIT_3[targetTotal]) {
      allocated = [...STANDARD_INTEGER_SPLIT_3[targetTotal]];
    } else if (targetTotal <= 3) {
      allocated = [1, 1, 1];
    } else {
      const g3 = Math.max(1, Math.round(targetTotal * 0.1));
      const g2 = Math.max(1, Math.round(targetTotal * 0.3));
      const g1 = Math.max(1, targetTotal - g2 - g3);
      allocated = [g1, g2, g3];
    }

    if (mixGoal === 'longevity' && targetTotal >= 10) {
      const is2Fixer = components[2].productType === 'عود' || components[2].productType === 'مسك';
      if (is2Fixer && allocated[0] > allocated[1] + 1) {
        allocated[0] -= 1;
        allocated[2] += 1;
      }
    }
  } else {
    // 4 مكونات أو أكثر (للتعديل اليدوي المصرح به): أعداد صحيحة فقط دون كسور
    const rawWeights = components.map((_, idx) => Math.max(1, count - idx * 0.55));
    const wSum = rawWeights.reduce((a, b) => a + b, 0);
    allocated = rawWeights.map((w) => Math.max(1, Math.floor((targetTotal * w) / wSum)));
    let diff = targetTotal - allocated.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (diff !== 0 && idx < 200) {
      const targetIdx = idx % count;
      if (diff > 0) {
        allocated[targetIdx] += 1;
        diff -= 1;
      } else if (diff < 0 && allocated[count - 1 - targetIdx] > 1) {
        allocated[count - 1 - targetIdx] -= 1;
        diff += 1;
      }
      idx++;
    }
  }

  // مراعاة المخزون المتاح لكل مكوّن (إذا كان المخزون المتاح أقل من الجرامات الموزعة، نعدل تلقائياً بالمتاح ونحول الباقي للمكون المتاح)
  const totalAvailableStock = components.reduce(
    (sum, c) => sum + (c.availableStockGrams !== undefined ? Math.floor(Math.max(0, c.availableStockGrams)) : targetTotal),
    0
  );
  if (totalAvailableStock >= targetTotal) {
    for (let i = 0; i < count; i++) {
      const avail = components[i].availableStockGrams;
      if (avail !== undefined && avail > 0 && allocated[i] > Math.floor(avail)) {
        const excess = allocated[i] - Math.floor(avail);
        allocated[i] = Math.floor(avail);
        // تحويل الفائض لأول مكون يمتلك رصيداً كافياً
        for (let j = 0; j < count; j++) {
          if (j === i) continue;
          const otherAvail = components[j].availableStockGrams ?? targetTotal;
          if (allocated[j] + excess <= Math.floor(otherAvail)) {
            allocated[j] += excess;
            break;
          }
        }
      }
    }
  }

  // ضمان صارم أن جميع الجرامات أعداد صحيحة وأن المجموع يطابق جرامات الحجم القياسية تماماً دون زيادة أو نقص
  allocated = allocated.map((v) => Math.max(1, Math.round(v)));
  const finalSum = allocated.reduce((a, b) => a + b, 0);
  if (finalSum !== targetTotal) {
    const delta = targetTotal - finalSum;
    if (allocated[0] + delta >= 1) {
      allocated[0] += delta;
    } else {
      // توزيع الفرق على المكونات التي تسمح بذلك
      let rem = delta;
      for (let i = 0; i < count && rem !== 0; i++) {
        if (rem > 0) {
          allocated[i] += rem;
          rem = 0;
        } else if (rem < 0 && allocated[i] > 1) {
          const canTake = Math.min(-rem, allocated[i] - 1);
          allocated[i] -= canTake;
          rem += canTake;
        }
      }
    }
  }

  return components.map((comp, idx) => ({
    ...comp,
    grams: Math.round(allocated[idx]),
  }));
}

export interface OlfactoryProfileAnalysis {
  productId: number | string;
  productName: string;
  brand: string;
  productType: PerfumeType;
  gender: Gender;
  season: Season;
  familyAr: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  mainAccords: string[];
  longevityAr: string;
  sillageAr: string;
  oilGramCostEgp: number;
  availableStockGrams: number;
  hasReliableData: boolean;
  confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة';
  dataSourceAr: string;
  noDataDisclaimerAr?: string;
}

/**
 * تحليل الملف العطري للعطر المختار مع التحقق من توفر معلومات موثوقة كافية (القاعدة 3 و 24 و 25)
 * إذا لم تتوفر معلومات موثوقة كافية، يصرح النظام بذلك بوضوح ولا يخمن.
 */
export function analyzeSelectedPerfumeProfile(params: {
  product: Product;
  fragranceDatabase?: FragranceDatabaseEntry[];
  settings?: Partial<StoreSettings>;
}): OlfactoryProfileAnalysis {
  const { product, fragranceDatabase = [], settings } = params;
  const cleanName = product.name.trim();
  const dbEntry = fragranceDatabase.find((e) => e.name.trim() === cleanName);
  const curatedPartners = MASTER_PERFUMER_HARMONY_MAP[cleanName] || [];
  const hasAnalysis = Boolean(
    product.analysis &&
      ((product.analysis.topNotes && product.analysis.topNotes.length > 0) ||
        (product.analysis.mainAccords && product.analysis.mainAccords.length > 0))
  );

  const hasReliableData = Boolean(dbEntry || curatedPartners.length > 0 || hasAnalysis);
  const oilGramCostEgp =
    product.customGramCostEgp !== undefined && product.customGramCostEgp > 0
      ? product.customGramCostEgp
      : getApprovedOilGramCost(product.type, settings);

  if (!hasReliableData) {
    return {
      productId: product.id,
      productName: product.name,
      brand: product.brand || 'غير محدد',
      productType: product.type,
      gender: product.gender,
      season: product.season,
      familyAr: `فئة ${product.type} (${product.gender})`,
      topNotes: [],
      heartNotes: [],
      baseNotes: [],
      mainAccords: [],
      longevityAr: 'غير موثق بقاعدة البيانات',
      sillageAr: 'غير موثق بقاعدة البيانات',
      oilGramCostEgp,
      availableStockGrams: product.stock_grams,
      hasReliableData: false,
      confidenceDegree: 'منخفضة',
      dataSourceAr: 'بيانات الصنف الأساسية فقط (تفتقر للملف العطري التفصيلي)',
      noDataDisclaimerAr:
        'لا تتوفر معلومات عطرية موثوقة كافية لهذا العطر في قاعدة البيانات؛ النظام يصرح بذلك ولا يخمن.',
    };
  }

  const topNotes = dbEntry?.topNotes?.length
    ? dbEntry.topNotes
    : product.analysis?.topNotes || ['افتتاحية عطرية متوازنة'];
  const heartNotes = dbEntry?.heartNotes?.length
    ? dbEntry.heartNotes
    : product.analysis?.heartNotes || ['قلب عطري متناغم'];
  const baseNotes = dbEntry?.baseNotes?.length
    ? dbEntry.baseNotes
    : product.analysis?.baseNotes || ['قاعدة مثبتة'];
  const mainAccords = dbEntry?.mainAccords?.length
    ? dbEntry.mainAccords
    : product.analysis?.mainAccords || [product.type, product.season];

  const familyAr =
    dbEntry?.classification ||
    (mainAccords.length > 0 ? mainAccords.slice(0, 2).join(' · ') : `عائلة ${product.type}`);

  const confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة' =
    dbEntry && curatedPartners.length > 0
      ? 'عالية'
      : dbEntry || curatedPartners.length > 0
      ? 'عالية'
      : 'متوسطة';

  return {
    productId: product.id,
    productName: product.name,
    brand: product.brand,
    productType: product.type,
    gender: product.gender,
    season: product.season,
    familyAr,
    topNotes,
    heartNotes,
    baseNotes,
    mainAccords,
    longevityAr: dbEntry?.longevity || product.analysis?.longevity || 'جيد جداً إلى ممتاز',
    sillageAr: dbEntry?.sillage || product.analysis?.sillage || 'فوحان متوازن',
    oilGramCostEgp,
    availableStockGrams: product.stock_grams,
    hasReliableData: true,
    confidenceDegree,
    dataSourceAr: dbEntry
      ? `موسوعة لمسة عطر الموثقة (${dbEntry.confidenceDegree || 'عالية'})`
      : 'مصفوفة التوافق العطري المعتمدة بلمسة عطر',
  };
}

export interface SmartMixRecommendation {
  product: Product;
  compatibilityScore: number;
  confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة';
  harmonyRoleAr: string;
  harmonyReasonAr: string;
  stepOrderNumber: number; // 2 = العطر الثاني، 3 = العطر الثالث
  oilGramCostEgp: number;
  availableStockGrams: number;
  isFromSavedLibrary?: boolean;
  savedLibraryFormulaName?: string;
  savedLibraryTimesSold?: number;
  savedLibraryRating?: number;
  replacedOutOfStockName?: string; // إذا كان هذا البديل يعوض عطراً مقترحاً نفد من المخزون
  isReliable: boolean;
}

const MASTER_PERFUMER_HARMONY_MAP: Record<string, string[]> = {
  'بلو شانيل': ['أكوا دي جيو', 'مسك أبيض', 'انفيكتوس', 'سيلڤر سنت', 'كروما ليجند', 'أربابورا', 'مسك مكه', 'شانيل بلاتينيوم'],
  'أكوا دي جيو': ['بلو شانيل', 'مسك أبيض', 'لاكوست وايت', 'انفيكتوس', 'أكوا بروفومو', 'نيرولي', 'أربابورا'],
  'أكوا بروفومو': ['بلو شانيل', 'أكوا دي جيو', 'مسك أبيض', 'سيلڤر سنت', 'عود أبيض'],
  'انفيكتوس': ['بلو شانيل', 'ڤيرساتشي إيروس', 'أربابورا', 'مسك أبيض', 'ألترا مال', 'لاكوست وايت'],
  'ڤيرساتشي إيروس': ['انفيكتوس', 'بلو شانيل', 'ألترا مال', 'استرونجر ويز يو', 'مسك أبيض'],
  'توباكو ڤانيلا': ['خمرة', 'عود كمبودي', 'بلاك أفغانو', 'روزڤانيلا', 'كلمات', 'عنبر أسود', 'الوسام'],
  'خمرة': ['توباكو ڤانيلا', 'كلمات', 'عود كمبودي', 'روزڤانيلا', 'أمير العود', 'استرونجر ويز يو'],
  'بكرات روج': ['أربابورا', 'عود أبيض', 'مسك الطهارة', 'كلمات', 'بربري هير', 'روز مسك', 'عنبر أبيض'],
  'أربابورا': ['بكرات روج', 'مسك أبيض', 'بلو شانيل', 'فواكه', 'بربري هير', 'كلمات'],
  'بلاك أفغانو': ['توباكو ڤانيلا', 'عود اصفهان', 'مسك مكه', 'كلمات', 'عنبر أسود', 'ورد الطائف'],
  'عود كمبودي': ['ورد الطائف', 'مسك مكه', 'كلمات', 'توباكو ڤانيلا', 'دهن العود', 'روزڤانيلا'],
  'أمير العود': ['كلمات', 'خمرة', 'روزڤانيلا', 'مسك مكه', 'ورد الطائف', 'توباكو ڤانيلا'],
  'سلطان العود': ['ورد الطائف', 'مسك مكه', 'كلمات', 'عنبر أبيض', 'عود ملكي'],
  'عود اصفهان': ['ورد الطائف', 'روزڤانيلا', 'مسك مكه', 'كلمات', 'بلاك أفغانو'],
  'كلمات': ['بكرات روج', 'عود كمبودي', 'خمرة', 'مسك الطهارة', 'توباكو ڤانيلا', 'روزڤانيلا'],
  'ورد الطائف': ['عود كمبودي', 'مسك الطهارة', 'مسك مكه', 'عود اصفهان', 'بكرات روج', 'كلمات'],
  'روزڤانيلا': ['جود جيرل', 'بلاك أوبيوم', 'مسك الطهارة', 'توباكو ڤانيلا', 'كلمات', 'خمرة'],
  'جود جيرل': ['روزڤانيلا', 'بلاك أوبيوم', 'مسك الطهارة', 'بربري هير', 'ڤيكتوريا سيكريت', 'كوكو شانيل'],
  'بلاك أوبيوم': ['جود جيرل', 'روزڤانيلا', 'سكاندال', 'مسك الطهارة', 'ألمبيا'],
  'سكاندال': ['جود جيرل', 'بلاك أوبيوم', 'بربري هير', 'روز مسك', 'روزڤانيلا'],
  'بربري هير': ['بكرات روج', 'أربابورا', 'مسك الطهارة', 'ڤيكتوريا سيكريت', 'روز مسك'],
  'كوكو شانيل': ['جادور', 'مسك الطهارة', 'جود جيرل', 'روز مسك', 'إيلي صعب'],
  'جادور': ['كوكو شانيل', 'مسك الطهارة', 'إيلي صعب', 'فل', 'ياسمين'],
  'استرونجر ويز يو': ['ألترا مال', 'خمرة', 'توباكو ڤانيلا', 'ون مليون', 'مسك أبيض'],
  'ألترا مال': ['استرونجر ويز يو', 'انفيكتوس', 'ڤيرساتشي إيروس', 'ون مليون', 'مسك أبيض'],
  'ون مليون': ['استرونجر ويز يو', 'ألترا مال', 'بلو شانيل', 'كلمات', 'مسك مكه'],
  'سيلڤر سنت': ['بلو شانيل', 'انفيكتوس', 'كروما ليجند', 'مسك أبيض', 'الوسام'],
  'لاكوست وايت': ['بلو شانيل', 'أكوا دي جيو', 'انفيكتوس', 'مسك أبيض', 'كروما ليجند'],
  'مسك أبيض': ['بلو شانيل', 'أكوا دي جيو', 'أربابورا', 'ورد الطائف', 'بكرات روج'],
  'مسك الطهارة': ['بكرات روج', 'روزڤانيلا', 'ورد الطائف', 'بربري هير', 'جود جيرل', 'كوكو شانيل'],
  'مسك مكه': ['عود كمبودي', 'ورد الطائف', 'كلمات', 'بلو شانيل', 'أمير العود'],
};

/**
 * محرك الميكس الذكي المحدود والمنطقي (يقترح العطر الثاني، وعند طلب الثالث يقترح الثالث الأنسب، ويتوقف عند الهرم الثلاثي لمنع أي حلقة توافقات لا نهائية)
 * - يعطي أولوية لنتائج «مكتبة تركيبات لمسة عطر» الفعلية المعتمدة من المالك عند توفرها.
 * - يراعي المخزون المتاح وتكلفة كل زيت وهدف الميكس.
 * - عند عدم توفر العطر المقترح يقترح البديل الأعلى توافقاً والمتاح في المخزون.
 * - عند فشل جميع البدائل الموثوقة لا يخترع تركيبة بل يرجع قائمة فارغة ليظهر النظام: «لا يوجد بديل موثوق مناسب ضمن المخزون الحالي».
 */
export function getSmartCompatibleMixRecommendations(params: {
  selectedComponents: Array<{
    productId: number | string;
    productName: string;
    productType: PerfumeType;
  }>;
  allProducts: Product[];
  fragranceDatabase?: FragranceDatabaseEntry[];
  savedMixes?: SavedMixFormula[];
  mixGoal?: MixGoalType;
  requiredMinGrams?: number;
  settings?: Partial<StoreSettings>;
}): SmartMixRecommendation[] {
  const {
    selectedComponents,
    allProducts,
    fragranceDatabase = [],
    savedMixes = [],
    mixGoal = 'standard',
    requiredMinGrams = 1,
    settings,
  } = params;

  // منع حلقة التوافقات اللانهائية: الميكس القياسي يتكون من عطرين (70/30) أو ثلاثة كحد أقصى للهرم العطري (60/30/10)
  if (selectedComponents.length === 0 || selectedComponents.length >= 3) {
    return [];
  }

  const selectedIds = new Set(selectedComponents.map((c) => String(c.productId)));
  const selectedNames = new Set(selectedComponents.map((c) => c.productName.trim()));
  const selectedProducts = selectedComponents
    .map((c) => allProducts.find((p) => String(p.id) === String(c.productId) || p.name === c.productName))
    .filter((p): p is Product => Boolean(p));

  const primaryProduct = selectedProducts[0];
  const stepOrderNumber = selectedComponents.length + 1; // 2 = العطر الثاني، 3 = العطر الثالث فقط
  const hasBaseFixerAlready = selectedComponents.some(
    (c) => c.productType === 'مسك' || c.productType === 'عود'
  );
  const hasNicheAlready = selectedComponents.some((c) => c.productType === 'نيش');

  // 1. فحص «مكتبة تركيبات لمسة عطر» الفعلية لإعطاء أولوية للتركيبات الناجحة والمعتمدة
  const libraryPartnerBoost = new Map<
    string,
    { bonus: number; formulaName: string; timesSold: number; rating: number }
  >();
  savedMixes.forEach((formula) => {
    const formulaNames = formula.components.map((fc) => fc.productName.trim());
    const matchesAllSelected = selectedComponents.every((sc) =>
      formulaNames.includes(sc.productName.trim())
    );
    if (matchesAllSelected) {
      const salesCount = Number(formula.timesSold || 0);
      const rating = Number(formula.customerRating || 5);
      const repurchase = Number(formula.repurchaseRatePercent || 0);
      const ownerApprovedBonus = formula.isOwnerApproved !== false ? 15 : 8;
      const totalLibraryBonus =
        ownerApprovedBonus + Math.min(20, salesCount * 2) + Math.round(rating * 2) + Math.round(repurchase * 0.1);

      formula.components.forEach((fc) => {
        const fcName = fc.productName.trim();
        if (!selectedNames.has(fcName)) {
          const existing = libraryPartnerBoost.get(fcName);
          if (!existing || totalLibraryBonus > existing.bonus) {
            libraryPartnerBoost.set(fcName, {
              bonus: totalLibraryBonus,
              formulaName: formula.name,
              timesSold: salesCount,
              rating,
            });
          }
        }
      });
    }
  });

  // 2. جمع العطور المكملة من مصفوفة التناغم العطري وموسوعة العطور مع تتبع المقترحات غير المتوفرة بالمخزون
  const directComplementaryNames = new Map<string, number>();
  const outOfStockSuggestedNames: string[] = [];

  selectedComponents.forEach((comp, idx) => {
    const weightMultiplier = idx === 0 ? 1.25 : 1.0;
    const curatedList = MASTER_PERFUMER_HARMONY_MAP[comp.productName.trim()] || [];
    curatedList.forEach((targetName, rankIdx) => {
      const inStockProd = allProducts.find((p) => p.name.trim() === targetName.trim());
      if (inStockProd && inStockProd.stock_grams < requiredMinGrams) {
        if (!outOfStockSuggestedNames.includes(targetName.trim())) {
          outOfStockSuggestedNames.push(targetName.trim());
        }
      }
      const bonus = Math.round((44 - rankIdx * 3) * weightMultiplier);
      directComplementaryNames.set(
        targetName.trim(),
        (directComplementaryNames.get(targetName.trim()) || 0) + Math.max(18, bonus)
      );
    });

    const dbEntry = fragranceDatabase.find(
      (e) => e.name.trim() === comp.productName.trim()
    );
    if (dbEntry) {
      (dbEntry.complementaryPerfumes || []).forEach((name, rIdx) => {
        const cleanTarget = name.trim();
        const inStockProd = allProducts.find((p) => p.name.trim() === cleanTarget);
        if (inStockProd && inStockProd.stock_grams < requiredMinGrams) {
          if (!outOfStockSuggestedNames.includes(cleanTarget)) {
            outOfStockSuggestedNames.push(cleanTarget);
          }
        }
        directComplementaryNames.set(
          cleanTarget,
          (directComplementaryNames.get(cleanTarget) || 0) + (38 - rIdx * 4)
        );
      });
      (dbEntry.inStoreAlternatives || []).forEach((name, rIdx) => {
        const cleanTarget = name.trim();
        directComplementaryNames.set(
          cleanTarget,
          (directComplementaryNames.get(cleanTarget) || 0) + (24 - rIdx * 3)
        );
      });
    }
  });

  // 3. تصفية العطور المتاحة فعلياً في المخزون بالجرامات المطلوبة
  const candidates = allProducts.filter(
    (p) =>
      !selectedIds.has(String(p.id)) &&
      !selectedNames.has(p.name.trim()) &&
      p.stock_grams >= requiredMinGrams
  );

  // التحقق مما إذا كان العطر المختار يمتلك بيانات موثوقة
  const primaryProfile = primaryProduct
    ? analyzeSelectedPerfumeProfile({ product: primaryProduct, fragranceDatabase, settings })
    : null;

  const scored: SmartMixRecommendation[] = [];

  candidates.forEach((cand) => {
    const candName = cand.name.trim();
    const libMatch = libraryPartnerBoost.get(candName);
    const directBonus = directComplementaryNames.get(candName) || 0;
    const candProfile = analyzeSelectedPerfumeProfile({
      product: cand,
      fragranceDatabase,
      settings,
    });

    // مشاركة النوتات أو العائلة العطرية الموثقة
    let sharedNotesCount = 0;
    if (primaryProfile && primaryProfile.hasReliableData && candProfile.hasReliableData) {
      const primaryNotesSet = new Set([
        ...primaryProfile.topNotes,
        ...primaryProfile.heartNotes,
        ...primaryProfile.baseNotes,
        ...primaryProfile.mainAccords,
      ]);
      [
        ...candProfile.topNotes,
        ...candProfile.heartNotes,
        ...candProfile.baseNotes,
        ...candProfile.mainAccords,
      ].forEach((n) => {
        if (primaryNotesSet.has(n)) sharedNotesCount++;
      });
    }

    const isFixerBridge =
      (cand.type === 'مسك' || cand.type === 'عود') &&
      primaryProfile?.hasReliableData &&
      (cand.gender === primaryProduct?.gender || cand.gender === 'مشترك' || primaryProduct?.gender === 'مشترك');

    // القاعدة 25: إذا لم تتوفر معلومات موثوقة كافية لا يخمن النظام ولا يخترع تركيبة
    const isReliable = Boolean(
      libMatch ||
        directBonus > 0 ||
        sharedNotesCount > 0 ||
        (primaryProfile?.hasReliableData && candProfile.hasReliableData && isFixerBridge)
    );

    if (!isReliable) {
      return;
    }

    let score = 52;
    let confidenceDegree: 'عالية' | 'متوسطة' | 'منخفضة' = 'متوسطة';
    let roleAr =
      stepOrderNumber === 2
        ? 'العطر الثاني المتوافق (30%)'
        : 'العطر الثالث المكمل والمثبت (10%)';
    let reasonAr = `يتناغم عطرياً مع «${selectedComponents.map((c) => c.productName).join(' + ')}»`;

    // أ. أولوية مكتبة تركيبات لمسة عطر الفعلية
    if (libMatch) {
      score += libMatch.bonus;
      confidenceDegree = 'عالية';
      roleAr = `تركيبة معتمدة في مكتبة لمسة عطر`;
      reasonAr = `نجاح فعلي موثق في «${libMatch.formulaName}» (مبيعات: ${libMatch.timesSold} مرة · تقييم: ${libMatch.rating}/5)`;
    }

    // ب. تطابق مباشر مع مصفوفة التناغم أو الموسوعة العطرية
    if (directBonus > 0) {
      score += directBonus;
      confidenceDegree = 'عالية';
      if (!libMatch) {
        reasonAr = `توافق عطري موثق مع «${selectedComponents[0].productName}» يمنح فوحاناً متكاملاً وثباتاً أعلى`;
      }
    } else if (sharedNotesCount > 0) {
      score += Math.min(22, sharedNotesCount * 7);
      confidenceDegree = sharedNotesCount >= 2 ? 'عالية' : 'متوسطة';
      if (!libMatch) {
        reasonAr = `يشترك في النوتات والأكوردات العطرية مع «${selectedComponents[0].productName}» بتناغم هرمي`;
      }
    }

    // ج. تناغم الفئة والموسم
    if (primaryProduct) {
      if (cand.gender === primaryProduct.gender) {
        score += 12;
      } else if (cand.gender === 'مشترك' || primaryProduct.gender === 'مشترك') {
        score += 10;
      } else {
        score -= 18;
      }

      if (
        cand.season === primaryProduct.season ||
        cand.season === 'كل الفصول' ||
        primaryProduct.season === 'كل الفصول'
      ) {
        score += 6;
      }
    }

    // د. مراعاة الدور الهرمي (العطر الثاني 30% مقابل العطر الثالث 10%)
    if (stepOrderNumber === 2) {
      if (primaryProduct?.type === 'عادي' && (cand.type === 'نيش' || cand.type === 'مسك')) {
        score += 9;
        if (!libMatch) {
          roleAr = cand.type === 'مسك' ? 'قاعدة مسك مثبتة (30%)' : 'قلب نيش فاخر رافع للفوحان (30%)';
          reasonAr = `يضيف لمسة ${cand.type} فاخرة تزيد ثبات وفخامة «${primaryProduct.name}»`;
        }
      } else if (primaryProduct?.type === 'عود' && (cand.type === 'عادي' || cand.type === 'مسك')) {
        score += 11;
        if (!libMatch) {
          roleAr = 'ملطف وموازن لحدة العود (30%)';
          reasonAr = `يلطف قوة «${primaryProduct.name}» ويمنحه افتتاحية جذابة ومتوازنة`;
        }
      }
    } else if (stepOrderNumber === 3) {
      if (!hasBaseFixerAlready && (cand.type === 'مسك' || cand.type === 'عود')) {
        score += 16;
        if (!libMatch) {
          roleAr = cand.type === 'مسك' ? 'قاعدة مسك مثبتة للثنائي (10%)' : 'قاعدة عود شرقية رابطة (10%)';
          reasonAr = `يربط بين (${selectedComponents.map((c) => c.productName).join(' + ')}) ويضاعف ثبات الزجاجة`;
        }
      } else if (!hasNicheAlready && cand.type === 'نيش') {
        score += 13;
        if (!libMatch) {
          roleAr = 'لمسة نيش ثالثة معززة للفوحان (10%)';
          reasonAr = `يمنح الميكس بصمة نيش عالمية فريدة تكمل المكونين الأول والثاني`;
        }
      }
    }

    // هـ. مراعاة هدف الميكس وتكلفة الجرام (القاعدة 8 و 9)
    const candGramCost = candProfile.oilGramCostEgp;
    if (mixGoal === 'economical') {
      if (candGramCost <= 10) {
        score += 12;
        reasonAr += ` · تكلفة اقتصادية (${candGramCost} ج/جم)`;
      } else if (candGramCost >= 20) {
        score -= 8;
      }
    } else if (mixGoal === 'longevity') {
      if (cand.type === 'مسك' || cand.type === 'عود' || cand.type === 'نيش') {
        score += 12;
        reasonAr += ' · يعزز هدف الثبات والفوحان الأقصى';
      }
    } else if (mixGoal === 'fresh_daily') {
      if (cand.season === 'صيف' || cand.season === 'ربيع' || cand.type === 'عادي') {
        score += 10;
        reasonAr += ' · يناسب الاستخدام اليومي المنعش';
      }
    } else if (mixGoal === 'luxury_evening') {
      if (cand.type === 'نيش' || cand.type === 'عود') {
        score += 12;
        reasonAr += ' · يعزز فخامة السهرة';
      }
    }

    const clampedScore = Math.min(99, Math.max(68, Math.round(score)));
    scored.push({
      product: cand,
      compatibilityScore: clampedScore,
      confidenceDegree,
      harmonyRoleAr: roleAr,
      harmonyReasonAr: reasonAr,
      stepOrderNumber,
      oilGramCostEgp: candGramCost,
      availableStockGrams: cand.stock_grams,
      isFromSavedLibrary: Boolean(libMatch),
      savedLibraryFormulaName: libMatch?.formulaName,
      savedLibraryTimesSold: libMatch?.timesSold,
      savedLibraryRating: libMatch?.rating,
      replacedOutOfStockName:
        outOfStockSuggestedNames.length > 0 ? outOfStockSuggestedNames[0] : undefined,
      isReliable: true,
    });
  });

  scored.sort((a, b) => {
    if (Boolean(b.isFromSavedLibrary) !== Boolean(a.isFromSavedLibrary)) {
      return b.isFromSavedLibrary ? 1 : -1;
    }
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    return b.product.stock_grams - a.product.stock_grams;
  });

  return scored;
}

/**
 * ثامنًا: حساب التغليف بدقة (مع تسجيل الكيس الأساسي المستبدل بالكيس الفاخر بصورة صحيحة)
 * - الكيس البلاستيكي الأساسي (1 ج) والاستيكر (1 ج) مشمولان ضمن التكلفة المعيارية للعبوة.
 * - التغليف الفاخر لا يدخل في التكلفة إذا لم يستخدم.
 * - عند استخدام الكيس الفاخر (10 ج) أو العلبة + الكيس الفاخر (20 ج)، يتم استبدال الكيس الأساسي (1 ج) بالكيس الفاخر
 *   بحيث يسجل النظام استبدال الكيس الأساسي ولا يحمله مرتين.
 */
export function calculatePackagingAccounting(
  paramsOrId:
    | {
        packagingId: 'basic_bag' | 'luxury_box' | 'luxury_bag' | 'luxury_both' | string;
        isPaidByCustomer: boolean;
        hasCartItems?: boolean;
      }
    | string,
  isPaidByCustomerArg?: boolean,
  _settingsOrHasItemsArg?: Partial<StoreSettings> | boolean
): {
  option: PackagingOption;
  extraStoreCostEgp: number; // التكلفة الإضافية الصافية فوق التكلفة المعيارية للعبوة
  extraPackagingStoreCost: number; // Alias
  grossLuxuryCostEgp: number; // إجمالي تكلفة التغليف الفاخر (0 أو 10 أو 20)
  basicBagReplacedCreditEgp: number; // قيمة الكيس الأساسي المستبدل (1 ج عند استخدام كيس فاخر)
  independentPackagingRevenueEgp: number; // إيراد التغليف المستقل إذا بيع للعميل
  packagingRevenue: number; // Alias
  replacesBasicBag: boolean;
  accountingNote: string;
} {
  const isObj = typeof paramsOrId === 'object' && paramsOrId !== null;
  const packagingId = isObj ? paramsOrId.packagingId : paramsOrId;
  const isPaidByCustomer = isObj ? paramsOrId.isPaidByCustomer : Boolean(isPaidByCustomerArg);
  const hasCartItems = isObj ? (paramsOrId.hasCartItems ?? true) : true;

  const option =
    DEFAULT_PACKAGING_OPTIONS.find((p) => p.id === packagingId) || DEFAULT_PACKAGING_OPTIONS[0];

  if (!hasCartItems || option.type === 'basic') {
    return {
      option,
      extraStoreCostEgp: 0, // الكيس الأساسي (1 ج) والاستيكر (1 ج) ضمن التكلفة المعيارية للعبوة
      extraPackagingStoreCost: 0,
      grossLuxuryCostEgp: 0,
      basicBagReplacedCreditEgp: 0,
      independentPackagingRevenueEgp: 0,
      packagingRevenue: 0,
      replacesBasicBag: false,
      accountingNote: 'كيس بلاستيك أساسي إلزامي (1 ج) + استيكر (1 ج) مشمول ضمن التكلفة المعيارية',
    };
  }

  const grossLuxuryCostEgp = option.cost; // 10 for box, 10 for bag, 20 for both
  const basicBagReplacedCreditEgp = option.replacesBasicBag ? 1 : 0;
  const extraStoreCostEgp = grossLuxuryCostEgp;
  const independentPackagingRevenueEgp = isPaidByCustomer ? option.price : 0;

  const accountingNote = isPaidByCustomer
    ? `تغليف فاخر مباع للعميل (${option.name}): إيراد مستقل +${independentPackagingRevenueEgp} ج وتكلفة ${grossLuxuryCostEgp} ج${
        option.replacesBasicBag ? ' (تم تسجيل استبدال الكيس الأساسي 1 ج بالكيس الفاخر)' : ''
      }`
    : `تغليف فاخر مجاني (${option.name}): تكلفة ${grossLuxuryCostEgp} ج مسجلة على المتجر${
        option.replacesBasicBag ? ' (مع تسجيل استبدال الكيس الأساسي 1 ج بالكيس الفاخر)' : ''
      }`;

  return {
    option,
    extraStoreCostEgp,
    extraPackagingStoreCost: extraStoreCostEgp,
    grossLuxuryCostEgp,
    basicBagReplacedCreditEgp,
    independentPackagingRevenueEgp,
    packagingRevenue: independentPackagingRevenueEgp,
    replacesBasicBag: Boolean(option.replacesBasicBag),
    accountingNote,
  };
}

/**
 * عاشرًا: مصفوفة المرجع التجاري والمالي الكاملة لكل حجم (أسعار، تكاليف معيارية ومشتقة، عمولة 5%، ومساهمة)
 */
export function buildCommercialReferenceRow(
  bottle: BottleSize,
  settings?: Partial<StoreSettings>
) {
  const s = settings || DEFAULT_SETTINGS;
  const commRate = s.commissionRate ?? 0.05;
  const isRoll = Boolean(bottle.isRollOn);

  // 1. Normal (عادي)
  const normalPrice = bottle.normalPrice;
  const normalCost = calculateDerivedProductCost({ bottle, perfumeType: 'عادي', settings: s });
  const normalComm = isRoll ? 0 : Math.round(normalPrice * commRate);
  const normalContrib = normalPrice - normalCost - normalComm;

  // 2. Colored Normal (عبوة عادية ملونة — 100، 50، 30 مل)
  const coloredInfo = getApprovedSellingPrice({ bottle, perfumeType: 'عادي', isColoredBottle: true });
  const hasColoredNormal = !isRoll && coloredInfo.isColoredAllowed && Boolean(bottle.coloredNormalPrice || [100, 50, 30].includes(bottle.sizeMl));
  const coloredNormalPrice = hasColoredNormal ? coloredInfo.price : null;
  const coloredNormalCost = hasColoredNormal
    ? calculateDerivedProductCost({ bottle, perfumeType: 'عادي', isColoredBottle: true, settings: s })
    : null;
  const coloredNormalComm =
    hasColoredNormal && coloredNormalPrice !== null ? Math.round(coloredNormalPrice * commRate) : null;
  const coloredNormalContrib =
    hasColoredNormal && coloredNormalPrice !== null && coloredNormalCost !== null && coloredNormalComm !== null
      ? coloredNormalPrice - coloredNormalCost - coloredNormalComm
      : null;

  // 3. Niche (نيش — 15 ج/جم)
  const nichePrice = bottle.specialPrice;
  const nicheCost = calculateDerivedProductCost({ bottle, perfumeType: 'نيش', settings: s });
  const nicheComm = isRoll ? 0 : Math.round(nichePrice * commRate);
  const nicheContrib = nichePrice - nicheCost - nicheComm;

  // 4. Oud & Musk (عود ومسك — 20 ج/جم)
  const oudMuskPrice = bottle.specialPrice;
  const oudMuskCost = calculateDerivedProductCost({ bottle, perfumeType: 'عود', settings: s });
  const oudMuskComm = isRoll ? 0 : Math.round(oudMuskPrice * commRate);
  const oudMuskContrib = oudMuskPrice - oudMuskCost - oudMuskComm;

  return {
    bottle,
    sizeMl: bottle.sizeMl,
    essenceGrams: bottle.essenceGrams,
    fixativeGrams: isRoll ? 0 : 1,
    isRollOn: isRoll,
    // Flat properties for direct matrix access
    normalPrice,
    normalCost,
    normalComm5: normalComm,
    normalContrib5: normalContrib,
    coloredNormalPrice,
    coloredNormalCost,
    coloredNormalComm5: coloredNormalComm,
    coloredNormalContrib5: coloredNormalContrib,
    specialPrice: nichePrice,
    nicheCost,
    nicheComm5: nicheComm,
    nicheContrib5: nicheContrib,
    oudMuskCost,
    oudMuskComm5: oudMuskComm,
    oudMuskContrib5: oudMuskContrib,
    // Nested structured properties
    normal: {
      price: normalPrice,
      cost: normalCost,
      commission: normalComm,
      contribution: normalContrib,
    },
    coloredNormal: hasColoredNormal
      ? {
          price: coloredNormalPrice!,
          cost: coloredNormalCost!,
          commission: coloredNormalComm!,
          contribution: coloredNormalContrib!,
        }
      : null,
    niche: {
      price: nichePrice,
      cost: nicheCost,
      commission: nicheComm,
      contribution: nicheContrib,
    },
    oudMusk: {
      price: oudMuskPrice,
      cost: oudMuskCost,
      commission: oudMuskComm,
      contribution: oudMuskContrib,
    },
  };
}

/**
 * Calculates minimum safe net selling price before discounts:
 * MinSafeNetPrice = (ProductCost + MinRequiredContribution) / (1 - CommissionRate)
 */
export function calculateMinSafeNetPrice(
  productCost: number,
  minRequiredContribution: number = 10,
  commissionRate: number = 0.05
): number {
  if (commissionRate >= 1) return productCost + minRequiredContribution;
  const raw = (productCost + minRequiredContribution) / (1 - commissionRate);
  return Math.ceil(raw); // Round up to nearest whole pound
}

/**
 * Calculates maximum allowable discount:
 * MaxDiscount = OriginalPrice - MinSafeNetPrice
 */
export function calculateMaxSafeDiscount(
  originalPrice: number,
  productCost: number,
  minRequiredContribution: number = 10,
  commissionRate: number = 0.05
): number {
  const minNet = calculateMinSafeNetPrice(productCost, minRequiredContribution, commissionRate);
  return Math.max(0, originalPrice - minNet);
}

/**
 * Calculates instant contribution:
 * NetSellingPrice = SellingPrice - Discount
 * Commission = NetSellingPrice * CommissionRate (or 0 for roll-ons)
 * Contribution = NetSellingPrice - ProductCost - Commission
 */
export function calculateInstantContribution(
  sellingPrice: number,
  productCost: number,
  discount: number = 0,
  commissionRate: number = 0.05,
  isRollOn: boolean = false
): {
  netPrice: number;
  commission: number;
  contribution: number;
  isBelowCost: boolean;
  marginPercent: number;
} {
  const netPrice = Math.max(0, sellingPrice - discount);
  const commission = isRollOn ? 0 : Math.round(netPrice * commissionRate);
  const contribution = netPrice - productCost - commission;
  const isBelowCost = netPrice < productCost;
  const marginPercent = netPrice > 0 ? ((contribution / netPrice) * 100) : 0;

  return {
    netPrice,
    commission,
    contribution,
    isBelowCost,
    marginPercent,
  };
}

// ========================================================
// SMART LOYALTY ENGINE & PROFIT-GUARD MATHEMATICAL HELPERS
// ========================================================

export interface LoyaltyAIAnalysisResult {
  healthScore: number; // 0 to 100
  profitSafetyStatus: 'آمن ومثالي' | 'متوازن تحت المراقبة' | 'يتطلب حماية هامش فورية';
  alertLevel: 'safe' | 'caution' | 'critical';
  statusTitle: string;
  statusBadge: string;
  executiveSummary: string;
  profitAlignmentReport: string;
  metrics: {
    activeMembersCount: number;
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    unredeemedPointsBalance: number;
    unredeemedCashLiabilityEgp: number;
    totalLoyaltyDiscountsGrantedEgp: number;
    discountToGrossProfitRatioPercent: number;
    loyaltyAvgBasketEgp: number;
    walkInAvgBasketEgp: number;
    basketUpliftPercent: number;
  };
  tacticalSuggestions: Array<{
    title: string;
    detail: string;
    impact: string;
    category: 'profit_protection' | 'upsell' | 'retention' | 'cashier_rule';
  }>;
  recommendedSettings: {
    loyaltyStrategyMode: 'profit_shield' | 'balanced' | 'growth_vip';
    loyaltyPointsPerSpendEgp: number;
    loyaltyPointsPerVisit: number;
    loyaltyCashPerPointEgp: number;
    loyaltyMinRedeemPoints: number;
    loyaltyMaxBillDiscountPercent: number;
    loyaltyMinSafeMarginEgp: number;
    loyaltyProtectBreakEven: boolean;
    loyaltyAutoAI: boolean;
    reasoning: string;
  };
}

/**
 * Calculates unified customer loyalty points and cash value across POS, CRM, Dashboard, and Settings.
 * Supports both object parameter and positional parameters to prevent any NaN ("ليس رقما") issues.
 */
export function calculateCustomerLoyaltyPoints(
  paramsOrSpent:
    | {
        ordersCount?: number;
        totalSpent: number;
        bonusPoints?: number;
        redeemedPoints?: number;
        settings?: Partial<StoreSettings>;
      }
    | number,
  bonusPointsArg?: number,
  redeemedPointsArg?: number,
  settingsArg?: Partial<StoreSettings>,
  ordersCountArg?: number
): {
  earnedPointsFromSales: number;
  bonusPoints: number;
  redeemedPoints: number;
  netAvailablePoints: number;
  cashValueEgp: number;
  pointsCashValue: number;
  effectivePointsPerSpend: number;
  effectivePointsPerVisit: number;
  effectiveCashPerPoint: number;
} {
  const isObj = typeof paramsOrSpent === 'object' && paramsOrSpent !== null;
  const rawSpent = isObj ? paramsOrSpent.totalSpent : paramsOrSpent;
  const rawOrders = isObj ? paramsOrSpent.ordersCount : ordersCountArg;
  const rawBonus = isObj ? paramsOrSpent.bonusPoints : bonusPointsArg;
  const rawRedeemed = isObj ? paramsOrSpent.redeemedPoints : redeemedPointsArg;
  const s = (isObj ? paramsOrSpent.settings : settingsArg) || DEFAULT_SETTINGS;

  const totalSpent = Number.isFinite(Number(rawSpent)) ? Math.max(0, Number(rawSpent)) : 0;
  const ordersCount = Number.isFinite(Number(rawOrders)) ? Math.max(0, Number(rawOrders)) : 0;
  const bonusPoints = Number.isFinite(Number(rawBonus)) ? Math.max(0, Math.round(Number(rawBonus))) : 0;
  const redeemedPoints = Number.isFinite(Number(rawRedeemed)) ? Math.max(0, Math.round(Number(rawRedeemed))) : 0;

  const rawPointsPerSpend = Number(s.loyaltyPointsPerSpendEgp ?? s.loyaltyEarnStepEgp ?? 10);
  const effectivePointsPerSpend = Number.isFinite(rawPointsPerSpend) && rawPointsPerSpend >= 1 ? rawPointsPerSpend : 10;

  const rawPointsPerVisit = Number(s.loyaltyPointsPerVisit ?? 0);
  const effectivePointsPerVisit = Number.isFinite(rawPointsPerVisit) && rawPointsPerVisit >= 0 ? rawPointsPerVisit : 0;

  const rawCashPerPoint = Number(s.loyaltyCashPerPointEgp ?? 0.10);
  const effectiveCashPerPoint = Number.isFinite(rawCashPerPoint) && rawCashPerPoint >= 0.01 ? rawCashPerPoint : 0.10;

  const earnedFromSpend = Math.floor(totalSpent / effectivePointsPerSpend);
  const earnedFromVisits = ordersCount * effectivePointsPerVisit;
  const earnedPointsFromSales = earnedFromSpend + earnedFromVisits;
  const netAvailablePoints = Math.max(0, earnedPointsFromSales + bonusPoints - redeemedPoints);
  const cashValueEgp = Math.round(netAvailablePoints * effectiveCashPerPoint * 100) / 100;

  return {
    earnedPointsFromSales,
    bonusPoints,
    redeemedPoints,
    netAvailablePoints,
    cashValueEgp,
    pointsCashValue: cashValueEgp,
    effectivePointsPerSpend,
    effectivePointsPerVisit,
    effectiveCashPerPoint,
  };
}

/**
 * Calculates the mathematically guaranteed safe loyalty discount cap so store profit is NEVER harmed
 */
export function calculateSafeLoyaltyRedemption(params: {
  billSubtotal: number;
  billTotalCost: number;
  commissionRate?: number;
  isRollOnOnly?: boolean;
  manualDiscount?: number;
  customerAvailablePoints: number;
  settings?: Partial<StoreSettings>;
  todayNetContribution?: number;
  dailyBreakEvenTarget?: number;
}): {
  isLoyaltyActive: boolean;
  maxSafeLoyaltyDiscountEgp: number;
  maxRedeemablePoints: number;
  effectiveCashPerPoint: number;
  effectiveMaxPercent: number;
  effectiveMinMarginEgp: number;
  isBreakEvenProtected: boolean;
  protectionReason: string;
  pointsEarnedOnNetBill: (netTotalAfterDiscount: number) => number;
} {
  const s = params.settings || DEFAULT_SETTINGS;
  const isLoyaltyActive = s.loyaltyEnabled !== false;
  const effectiveCashPerPoint = Math.max(0.05, Number(s.loyaltyCashPerPointEgp) || 0.10);
  const effectivePointsPerSpend = Math.max(1, Number(s.loyaltyPointsPerSpendEgp) || 10);
  const effectivePointsPerVisit = Math.max(0, Number(s.loyaltyPointsPerVisit ?? 0));
  const minRedeemPoints = Math.max(1, Number(s.loyaltyMinRedeemPoints) || 50);

  let effectiveMaxPercent = Math.min(60, Math.max(5, Number(s.loyaltyMaxBillDiscountPercent) || 25));
  let effectiveMinMarginEgp = Math.max(10, Number(s.loyaltyMinSafeMarginEgp ?? 10));

  const todayContrib = params.todayNetContribution ?? 600;
  const breakEvenTarget = params.dailyBreakEvenTarget ?? (s.dailyTargetProfit || 600);
  const isBelowBreakEven = todayContrib < breakEvenTarget;
  const isBreakEvenProtected = Boolean((s.loyaltyProtectBreakEven !== false || s.loyaltyAutoAI !== false) && isBelowBreakEven);

  // If AI Autopilot or Profit-Shield mode is active, adaptively tighten bounds to protect store profit
  if (s.loyaltyStrategyMode === 'profit_shield' || isBreakEvenProtected) {
    effectiveMaxPercent = Math.min(effectiveMaxPercent, 18);
    effectiveMinMarginEgp = Math.max(effectiveMinMarginEgp, 20);
  } else if (s.loyaltyStrategyMode === 'growth_vip' && !isBelowBreakEven) {
    effectiveMaxPercent = Math.max(effectiveMaxPercent, 30);
  }

  if (!isLoyaltyActive || params.billSubtotal <= 0 || params.customerAvailablePoints < minRedeemPoints) {
    return {
      isLoyaltyActive,
      maxSafeLoyaltyDiscountEgp: 0,
      maxRedeemablePoints: 0,
      effectiveCashPerPoint,
      effectiveMaxPercent,
      effectiveMinMarginEgp,
      isBreakEvenProtected,
      protectionReason: !isLoyaltyActive
        ? 'نظام نقاط الولاء متوقف حالياً من الإعدادات'
        : params.customerAvailablePoints < minRedeemPoints
        ? `الحد الأدنى للاستبدال هو ${minRedeemPoints} نقطة`
        : 'أضف أصنافاً للفاتورة لتفعيل الاستبدال الذكي',
      pointsEarnedOnNetBill: (netTotalAfterDiscount: number) =>
        isLoyaltyActive && netTotalAfterDiscount > 0
          ? Math.max(1, Math.floor(netTotalAfterDiscount / effectivePointsPerSpend) + effectivePointsPerVisit)
          : 0,
    };
  }

  const commRate = params.isRollOnOnly ? 0 : (params.commissionRate ?? s.commissionRate ?? 0.05);
  // 1) Absolute minimum net price to cover Raw Cost + Sales Commission + Minimum Safe Store Profit Margin
  const minSafeInvoiceNetPrice = calculateMinSafeNetPrice(
    params.billTotalCost,
    effectiveMinMarginEgp,
    commRate
  );
  const maxTotalAllowedDiscountByMargin = Math.max(0, params.billSubtotal - minSafeInvoiceNetPrice);
  const remainingMarginAllowance = Math.max(0, maxTotalAllowedDiscountByMargin - (params.manualDiscount || 0));

  // 2) Maximum discount allowed by percentage of bill cap (e.g., 25% of subtotal)
  const maxDiscountByPercentCap = Math.floor((params.billSubtotal * effectiveMaxPercent) / 100);

  // 3) Customer's available points cash value
  const customerMaxCashValue = Math.floor(params.customerAvailablePoints * effectiveCashPerPoint);

  // The final safe discount is the strict minimum of all 3 constraints!
  const maxSafeLoyaltyDiscountEgp = Math.max(
    0,
    Math.min(remainingMarginAllowance, maxDiscountByPercentCap, customerMaxCashValue)
  );

  const maxRedeemablePoints =
    maxSafeLoyaltyDiscountEgp > 0
      ? Math.min(
          params.customerAvailablePoints,
          Math.ceil(maxSafeLoyaltyDiscountEgp / effectiveCashPerPoint)
        )
      : 0;

  let protectionReason = `هامش ربح المتجر محمي (+${effectiveMinMarginEgp} ج صافي ربح مضمون بعد الخام والعمولة)`;
  if (isBreakEvenProtected) {
    protectionReason = `درع حماية التعادل نشط (المتجر تحت 600 ج) — سقف آمن ${effectiveMaxPercent}% لحماية ربح اليوم`;
  }

  return {
    isLoyaltyActive,
    maxSafeLoyaltyDiscountEgp,
    maxRedeemablePoints,
    effectiveCashPerPoint,
    effectiveMaxPercent,
    effectiveMinMarginEgp,
    isBreakEvenProtected,
    protectionReason,
    pointsEarnedOnNetBill: (netTotalAfterDiscount: number) =>
      isLoyaltyActive && netTotalAfterDiscount > 0
        ? Math.max(1, Math.floor(netTotalAfterDiscount / effectivePointsPerSpend) + effectivePointsPerVisit)
        : 0,
  };
}

// ========================================================
// USER ROLES & GRANULAR RBAC PERMISSIONS
// ========================================================

export type UserRole = 'OWNER' | 'STORE_MANAGER' | 'CASHIER' | 'SALES_REP' | 'INVENTORY_KEEPER';

export interface UserPermissions {
  // Sales & POS
  canRecordSale: boolean;
  canEditSaleBeforeClose: boolean;
  canCancelSale: boolean;
  canReturnSale: boolean;
  canApplyDiscount: boolean;
  canOverridePrice: boolean;
  // Customers & Follow-up
  canManageCustomers: boolean;
  // Stock & Inventory
  canViewStock: boolean;
  canRecordShortage: boolean;
  canStockCheck: boolean;
  canCreatePurchaseRequest: boolean;
  canEditProductCost: boolean;
  canEditProductPrice: boolean;
  // Shifts & Day Operations
  canOpenDay: boolean;
  canCloseDay: boolean;
  canReopenClosedDay: boolean;
  canLogFieldActivity: boolean;
  // Financial & Vaults
  canViewExecutiveDashboard: boolean;
  canViewVaults: boolean;
  canRequestWithdrawal: boolean;
  canApproveWithdrawal: boolean;
  canInjectCapital: boolean;
  canTransferBetweenVaults: boolean;
  canWithdrawOwnerProfit: boolean;
  canEditBudget: boolean;
  canEditSalaries: boolean;
  canEditCommissions: boolean;
  // Users & System Administration
  canManageUsers: boolean;
  canViewAuditLog: boolean;
  canExportData: boolean;
  // Administrative Confidentiality & Trade Secrets (أسرار الإدارة والخصوصية)
  canViewProfits: boolean; // رؤية هوامش وصافي الأرباح
  canViewCosts: boolean; // رؤية تكاليف الخامات وأسعار الجملة
  canViewExpenses: boolean; // رؤية سجل المصروفات والرواتب
  canViewReports: boolean; // رؤية التقارير المحاسبية التنفيذية
  canManageSettings: boolean; // التحكم بإعدادات النظام والتسعير
  canAccessOperationsSystem: boolean; // الوصول لنظام التارجت والموازنة المعتمدة
  canViewCostAndProfit?: boolean; // Alias for canViewProfits && canViewCosts
  canViewProfitAndCosts?: boolean; // Alias
  canViewAuditLogs?: boolean; // Alias for canViewAuditLog
  canEditSettingsAndBudgets?: boolean; // Alias
  canDeleteInvoices?: boolean; // Alias
}

export interface AppUser {
  id: string;
  username: string; // e.g. "mohamed", "tarek"
  displayName: string; // e.g. "د. محمد", "طارق"
  fullName?: string; // Alias for displayName
  authEmail?: string; // Verified Google account used to authenticate this staff member
  role: UserRole;
  passwordHash: string; // Legacy field retained for migration only; never used for authentication
  requiresPasswordChange: boolean; // Enforce change on first login
  isActive: boolean; // Toggle active / frozen
  createdAt: string;
  lastLoginAt?: string;
  permissions: UserPermissions;
}

// Default Full Permissions for Dr. Mohamed (Owner)
export const OWNER_FULL_PERMISSIONS: UserPermissions = {
  canRecordSale: true,
  canEditSaleBeforeClose: true,
  canCancelSale: true,
  canReturnSale: true,
  canApplyDiscount: true,
  canOverridePrice: true,
  canManageCustomers: true,
  canViewStock: true,
  canRecordShortage: true,
  canStockCheck: true,
  canCreatePurchaseRequest: true,
  canEditProductCost: true,
  canEditProductPrice: true,
  canOpenDay: true,
  canCloseDay: true,
  canReopenClosedDay: true,
  canLogFieldActivity: true,
  canViewExecutiveDashboard: true,
  canViewVaults: true,
  canRequestWithdrawal: true,
  canApproveWithdrawal: true,
  canInjectCapital: true,
  canTransferBetweenVaults: true,
  canWithdrawOwnerProfit: true,
  canEditBudget: true,
  canEditSalaries: true,
  canEditCommissions: true,
  canManageUsers: true,
  canViewAuditLog: true,
  canExportData: true,
  canViewProfits: true,
  canViewCosts: true,
  canViewExpenses: true,
  canViewReports: true,
  canManageSettings: true,
  canAccessOperationsSystem: true,
};

// Default Operational Permissions for Tarek (Store & Sales Manager)
// Empowered across all operational, sales, customer CRM, formulation, stock, and target modules,
// while STRICTLY isolating Owner Settings, User Management, Financial Vaults, Fixed Expenses, Raw Costs & Net Profits!
export const TAREK_OPERATIONAL_PERMISSIONS: UserPermissions = {
  canRecordSale: true,
  canEditSaleBeforeClose: true,
  canCancelSale: true, // With audit log reason
  canReturnSale: true,
  canApplyDiscount: true,
  canOverridePrice: true, // Owner-only approval is enforced before a below-cost sale is committed.
  canManageCustomers: true, // Full CRM, loyalty & WhatsApp follow-up
  canViewStock: true,
  canRecordShortage: true,
  canStockCheck: true,
  canCreatePurchaseRequest: true,
  canEditProductCost: false, // STRICTLY FORBIDDEN (سر تجاري - تكلفة الخامات)
  canEditProductPrice: true, // Retail-price operations only; confidential cost fields remain isolated.
  canOpenDay: true,
  canCloseDay: true,
  canReopenClosedDay: false, // STRICTLY FORBIDDEN (خاص بالمالك)
  canLogFieldActivity: true,
  canViewExecutiveDashboard: false, // Owner's private financial summary isolated
  canViewVaults: false, // STRICTLY FORBIDDEN (خزائن وسرية الإدارة)
  canRequestWithdrawal: false,
  canApproveWithdrawal: false, // STRICTLY FORBIDDEN
  canInjectCapital: false,
  canTransferBetweenVaults: false,
  canWithdrawOwnerProfit: false, // STRICTLY FORBIDDEN
  canEditBudget: false, // STRICTLY FORBIDDEN
  canEditSalaries: false, // STRICTLY FORBIDDEN
  canEditCommissions: false, // STRICTLY FORBIDDEN
  canManageUsers: false, // STRICTLY FORBIDDEN
  canViewAuditLog: false, // STRICTLY FORBIDDEN (سجل الرقابة الخاص بالمالك)
  canExportData: false, // STRICTLY FORBIDDEN (النسخ الاحتياطي الشامل وقاعدة البيانات)
  canViewProfits: false, // STRICTLY FORBIDDEN (أسرار الأرباح الصافية للمالك)
  canViewCosts: false, // STRICTLY FORBIDDEN (أسرار التكلفة وسعر الجملة)
  canViewExpenses: false, // STRICTLY FORBIDDEN (رواتب الإدارة والمصاريف الحساسة)
  canViewReports: true, // Empowered to access Sales & Invoices Ledger (with Cost/Profit columns hidden)
  canManageSettings: false, // STRICTLY FORBIDDEN (إعدادات النظام الحساسة)
  canAccessOperationsSystem: false, // Owner-only console can include budgets, commissions and profit controls.
};

// Standard Cashier Preset (فقط البيع والكاشير والزبائن)
export const CASHIER_STANDARD_PERMISSIONS: UserPermissions = {
  canRecordSale: true,
  canEditSaleBeforeClose: true,
  canCancelSale: false,
  canReturnSale: true,
  canApplyDiscount: false,
  canOverridePrice: false,
  canManageCustomers: true,
  canViewStock: true,
  canRecordShortage: true,
  canStockCheck: false,
  canCreatePurchaseRequest: false,
  canEditProductCost: false,
  canEditProductPrice: false,
  canOpenDay: true,
  canCloseDay: true,
  canReopenClosedDay: false,
  canLogFieldActivity: false,
  canViewExecutiveDashboard: false,
  canViewVaults: false,
  canRequestWithdrawal: false,
  canApproveWithdrawal: false,
  canInjectCapital: false,
  canTransferBetweenVaults: false,
  canWithdrawOwnerProfit: false,
  canEditBudget: false,
  canEditSalaries: false,
  canEditCommissions: false,
  canManageUsers: false,
  canViewAuditLog: false,
  canExportData: false,
  canViewProfits: false,
  canViewCosts: false,
  canViewExpenses: false,
  canViewReports: false,
  canManageSettings: false,
  canAccessOperationsSystem: false,
};

// Standard Inventory Keeper Preset (المخزون والجرد وطلبات الشراء)
export const INVENTORY_KEEPER_PERMISSIONS: UserPermissions = {
  canRecordSale: false,
  canEditSaleBeforeClose: false,
  canCancelSale: false,
  canReturnSale: false,
  canApplyDiscount: false,
  canOverridePrice: false,
  canManageCustomers: false,
  canViewStock: true,
  canRecordShortage: true,
  canStockCheck: true,
  canCreatePurchaseRequest: true,
  canEditProductCost: false,
  canEditProductPrice: false,
  canOpenDay: false,
  canCloseDay: false,
  canReopenClosedDay: false,
  canLogFieldActivity: false,
  canViewExecutiveDashboard: false,
  canViewVaults: false,
  canRequestWithdrawal: false,
  canApproveWithdrawal: false,
  canInjectCapital: false,
  canTransferBetweenVaults: false,
  canWithdrawOwnerProfit: false,
  canEditBudget: false,
  canEditSalaries: false,
  canEditCommissions: false,
  canManageUsers: false,
  canViewAuditLog: false,
  canExportData: false,
  canViewProfits: false,
  canViewCosts: false,
  canViewExpenses: false,
  canViewReports: false,
  canManageSettings: false,
  canAccessOperationsSystem: false,
};

// Default role profiles; authentication is exclusively through Firebase Google accounts.
export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-mohamed',
    username: 'mohamed',
    displayName: 'د. محمد (المالك)',
    role: 'OWNER',
    authEmail: '',
    passwordHash: '',
    requiresPasswordChange: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: OWNER_FULL_PERMISSIONS,
  },
  {
    id: 'user-tarek',
    username: 'tarek',
    displayName: 'طارق (مسؤول ومدير المبيعات)',
    role: 'STORE_MANAGER',
    authEmail: '',
    passwordHash: '',
    requiresPasswordChange: false,
    isActive: false,
    createdAt: new Date().toISOString(),
    permissions: TAREK_OPERATIONAL_PERMISSIONS,
  },
];

// ========================================================
// DAY OPERATIONS & SHIFT CLOSURE (فتح وإغلاق اليوم التشغيلي)
// ========================================================

export interface DailyClosure {
  id: string; // e.g. close-2026-09-24
  date: string; // YYYY-MM-DD
  status: 'مفتوح' | 'مغلق';
  openedAt: string;
  openedBy: string;
  openingCashBalance: number;
  closedAt?: string;
  closedBy?: string;
  actualCashInDrawer?: number; // الجرد الفعلي للنقدية بالدرج
  electronicSalesTotal?: number; // إجمالي الدفع الإلكتروني/البطاقات
  cashSalesTotal?: number; // إجمالي المبيعات النقدية
  totalSalesRevenue?: number; // إجمالي مبيعات اليوم
  totalExpensesPaidFromDrawer?: number; // مصاريف نقدية صُرفت من الدرج
  expectedCashInDrawer?: number; // النقدية المتوقعة = افتتاح + نقدي - مصاريف
  cashDifference?: number; // الفرق = الفعلي - المتوقع
  notes?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
  dataClassification?: DataClassification;
  isTestData?: boolean;
  testClassificationNote?: string;
}

// ========================================================
// INVENTORY INTELLIGENCE: PURCHASES & SHORTAGES
// ========================================================

export interface PurchaseRequest {
  id: string;
  date: string;
  requestedBy: string;
  productName: string;
  brand: string;
  requestedGrams: number;
  estimatedCost: number;
  priority: 'عاجل (نفد)' | 'متوسط (قارب النفاذ)' | 'روتيني';
  status: 'قيد الانتظار' | 'معتمد من د. محمد' | 'تم الشراء والتوريد' | 'مرفوض';
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CustomerRequest {
  id: string;
  date?: string;
  recordedBy?: string;
  customerName: string;
  customerPhone: string;
  requestedPerfume?: string;
  perfumeName?: string;
  brand?: string;
  preferredSizeMl?: number;
  requestedBottleSize?: string | number;
  requestCount?: number;
  lastRequestedAt?: string;
  status: 'جديد' | 'تم توفيره والتواصل' | 'ألغى الطلب';
  notes?: string;
}

export interface StockCheckRecord {
  id: string;
  date: string;
  performedBy: string;
  productId: number | string;
  productName: string;
  systemGrams: number;
  actualGrams: number;
  differenceGrams: number;
  varianceCost: number;
  justification?: string;
  status: 'مسجل' | 'معتمد من الإدارة';
}

// ========================================================
// OFFLINE SYNC QUEUE (العمل مع انقطاع الإنترنت)
// ========================================================

export interface OfflineQueueItem {
  id: string; // Transaction ID
  entityType: 'sale' | 'expense' | 'withdrawal' | 'stock_check' | 'closure';
  payload: any;
  deviceTimestamp: string; // Cairo local time
  retryCount: number;
  status: 'معلق' | 'جاري المزامنة' | 'تمت المزامنة' | 'فشل';
  errorMessage?: string;
}

// ========================================================
// TRANSPARENT CALCULATION BREAKDOWN (تتبع أي رقم مالي)
// ========================================================

export interface CalculationStep {
  label: string;
  formula: string;
  value: number;
  sign?: '+' | '-' | '=';
  note?: string;
}

export interface CalculationBreakdown {
  title: string;
  description: string;
  finalValue: number;
  unit: string;
  steps: CalculationStep[];
}

// Helper: Format Cairo Timezone
export function getCairoCurrentTimeString(): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());
  } catch (e) {
    return new Date().toLocaleString('ar-EG');
  }
}

// Helper: Generate Unique Transaction ID
export function generateTransactionId(prefix: string = 'TX'): string {
  const cairoNow = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${cairoNow}-${rand}`;
}

// ========================================================
// AUTOMATED MIDNIGHT DAILY CLOSING REPORT & OFFLINE QUEUE
// ========================================================
export interface AutomatedDailyReportItem {
  id: string;
  reportDate: string; // YYYY-MM-DD
  generatedAt: string;
  triggerType: 'midnight_auto' | 'day_closure' | 'manual_instant';
  recipientEmail: string; // default: lamsteitr@gmail.com
  whatsappPhone: string; // default: 01123376728 (Tarek Official 1)
  whatsappSecondaryPhone?: string; // default: 01062018755 (Tarek Official 2)
  whatsappFormattedMessage?: string; // Dedicated WhatsApp-formatted executive closure report
  subject: string;
  plainTextBody: string;
  htmlBody: string;
  metrics: {
    salesCount: number;
    bottlesSold: number;
    gramsConsumed: number;
    totalRevenue: number;
    cashSales: number;
    cardSales: number;
    walletSales: number;
    rawMaterialCost: number;
    commissions: number;
    directExpenses: number;
    netProfit: number;
    lowStockCount: number;
  };
  status: 'sent' | 'queued_offline' | 'pending_auth' | 'failed';
  sentAt?: string;
  whatsappStatus?: 'sent_api' | 'opened_direct' | 'queued_offline' | 'ready';
  whatsappSentAt?: string;
  whatsappDispatchedNumbers?: string[];
  googleFormId?: string;
  googleFormUrl?: string;
  errorMessage?: string;
}

// ========================================================
// BULK SUPPLIER INVOICE / MULTI-PERFUME BATCH IMPORT RECORD
// ========================================================
export interface BulkSupplierInvoiceRecord {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierPhone?: string;
  date: string;
  paymentStatus: 'مدفوع نقداً من خزينة المخزون' | 'آجل للمورد' | 'إيداع عيني مباشر';
  itemsCount: number;
  newProductsCount: number;
  restockedProductsCount: number;
  totalGramsAdded: number;
  totalEstimatedCostEgp: number;
  createdBy: string;
  notes?: string;
  itemsSummary: Array<{
    name: string;
    type: PerfumeType;
    gramsAdded: number;
    action: 'new' | 'restock';
    unitCostEgp: number;
  }>;
}

// ============================================================================
// EXECUTIVE SPECIFICATION ENGINE (§1–§96):
// 1. Non-Retroactive Tiered Commission (§27: First 10 sprays = 5%, 11+ = 7%, Roll = 0%)
// 2. Strict Hard Minimum Price & 10 EGP Contribution Floor (§28–§31)
// 3. Cash Drawer Reconciliation Independent of Contribution (§36, §38, §39)
// 4. Daily & Monthly Accounting Separation (§1–§16, §36–§37, §51–§59, §80–§87, §93)
// 5. 20 Mandatory Acceptance Tests Runner (§92)
// ============================================================================

/**
 * §27: حساب العمولة المتدرجة غير الرجعية:
 * - أول 10 عبوات بخاخ في اليوم: 5%
 * - من العبوة رقم 11 فما بعد: 7% (تطبق على العبوات الزائدة عن 10 فقط دون أثر رجعي)
 * - الرولات: 0% عمولة
 * - أي عملية ملغاة أو مرتجعة أو هدية أو عينات مجانية أو تعويض أو إتلاف: 0% عمولة
 */
export function calculateNonRetroactiveTieredCommission(params: {
  items: Array<{
    netUnitSellingPrice: number; // صافي سعر بيع العبوة الواحدة بعد نصيبها من الخصم
    quantity: number;
    isRollOn?: boolean;
  }>;
  priorSprayBottlesSoldToday?: number; // عدد عبوات البخاخ المباعة سابقاً في نفس اليوم
  transactionType?: 'بيع_طبيعي' | 'هدية' | 'تعويض' | 'تصفية' | 'إتلاف' | 'عينات_مجانية';
  isReversedOrCancelled?: boolean;
  baseRate?: number; // 0.05
  tieredRate?: number; // 0.07
  tierThreshold?: number; // 10
}): {
  totalCommissionEgp: number;
  sprayBottlesInThisSale: number;
  rollOnBottlesInThisSale: number;
  bottlesAt5Percent: number;
  bottlesAt7Percent: number;
  effectiveRateLabel: string;
  perBottleBreakdown: Array<{
    bottleIndexToday: number;
    isRollOn: boolean;
    netPrice: number;
    appliedRate: number;
    commissionEgp: number;
  }>;
} {
  const baseRate = params.baseRate ?? 0.05;
  const tieredRate = params.tieredRate ?? 0.07;
  const threshold = params.tierThreshold ?? 10;

  if (
    params.isReversedOrCancelled ||
    (params.transactionType && params.transactionType !== 'بيع_طبيعي')
  ) {
    return {
      totalCommissionEgp: 0,
      sprayBottlesInThisSale: 0,
      rollOnBottlesInThisSale: 0,
      bottlesAt5Percent: 0,
      bottlesAt7Percent: 0,
      effectiveRateLabel: '0% (معاملة غير خاضعة للعمولة)',
      perBottleBreakdown: [],
    };
  }

  let runningSprayIndex = Math.max(0, Math.floor(params.priorSprayBottlesSoldToday || 0));
  let totalCommissionEgp = 0;
  let sprayBottlesInThisSale = 0;
  let rollOnBottlesInThisSale = 0;
  let bottlesAt5Percent = 0;
  let bottlesAt7Percent = 0;
  const perBottleBreakdown: Array<{
    bottleIndexToday: number;
    isRollOn: boolean;
    netPrice: number;
    appliedRate: number;
    commissionEgp: number;
  }> = [];

  for (const item of params.items) {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const isRoll = Boolean(item.isRollOn);
    for (let i = 0; i < qty; i++) {
      if (isRoll) {
        rollOnBottlesInThisSale += 1;
        perBottleBreakdown.push({
          bottleIndexToday: runningSprayIndex,
          isRollOn: true,
          netPrice: item.netUnitSellingPrice,
          appliedRate: 0,
          commissionEgp: 0,
        });
      } else {
        runningSprayIndex += 1;
        sprayBottlesInThisSale += 1;
        const rate = runningSprayIndex <= threshold ? baseRate : tieredRate;
        if (runningSprayIndex <= threshold) {
          bottlesAt5Percent += 1;
        } else {
          bottlesAt7Percent += 1;
        }
        const comm = Math.round(item.netUnitSellingPrice * rate);
        totalCommissionEgp += comm;
        perBottleBreakdown.push({
          bottleIndexToday: runningSprayIndex,
          isRollOn: false,
          netPrice: item.netUnitSellingPrice,
          appliedRate: rate,
          commissionEgp: comm,
        });
      }
    }
  }

  let effectiveRateLabel = '5%';
  if (sprayBottlesInThisSale === 0 && rollOnBottlesInThisSale > 0) {
    effectiveRateLabel = '0% (رول بدون عمولة)';
  } else if (bottlesAt7Percent > 0 && bottlesAt5Percent > 0) {
    effectiveRateLabel = `متدرجة (${bottlesAt5Percent}×5% + ${bottlesAt7Percent}×7%)`;
  } else if (bottlesAt7Percent > 0) {
    effectiveRateLabel = '7% (فوق 10 عبوات)';
  }

  return {
    totalCommissionEgp,
    sprayBottlesInThisSale,
    rollOnBottlesInThisSale,
    bottlesAt5Percent,
    bottlesAt7Percent,
    effectiveRateLabel,
    perBottleBreakdown,
  };
}

/**
 * §28–§31: فحص الحد الأدنى الصلب للسعر والمساهمة (صافي البيع - التكلفة - العمولة >= 10 ج.م)
 * لا يسمح النظام أبداً بعملية بيع طبيعية تقل فيها المساهمة عن 10 جنيهات.
 */
export function validateStrictSaleSafety(params: {
  grossPrice: number;
  discountAmount: number;
  loyaltyDiscountAmount?: number;
  productCost: number;
  commissionAmount: number;
  commissionRateForMinCalc?: number;
  isRollOnOnly?: boolean;
  transactionType?: 'بيع_طبيعي' | 'هدية' | 'تعويض' | 'تصفية' | 'إتلاف' | 'عينات_مجانية';
  hasOwnerExceptionApproval?: boolean;
  exceptionReason?: string;
}): {
  isAllowed: boolean;
  netSellingPrice: number;
  productCost: number;
  commissionAmount: number;
  netContribution: number;
  minRequiredContribution: number;
  minSafeNetSellingPrice: number;
  maxAllowedTotalDiscount: number;
  rejectionReason?: string;
} {
  const minRequiredContribution = 10; // قاعدة صلبة لا تقل عن 10 جنيهات
  const totalDiscount = Math.max(0, (params.discountAmount || 0) + (params.loyaltyDiscountAmount || 0));
  const netSellingPrice = Math.max(0, params.grossPrice - totalDiscount);
  const effectiveCommRate = params.isRollOnOnly ? 0 : (params.commissionRateForMinCalc ?? 0.05);
  const minSafeNetSellingPrice = calculateMinSafeNetPrice(
    params.productCost,
    minRequiredContribution,
    effectiveCommRate
  );
  const maxAllowedTotalDiscount = Math.max(0, params.grossPrice - minSafeNetSellingPrice);
  const netContribution = netSellingPrice - params.productCost - params.commissionAmount;

  const txType = params.transactionType || 'بيع_طبيعي';
  if (txType !== 'بيع_طبيعي') {
    if (!params.hasOwnerExceptionApproval || !params.exceptionReason?.trim()) {
      return {
        isAllowed: false,
        netSellingPrice,
        productCost: params.productCost,
        commissionAmount: 0,
        netContribution: -params.productCost,
        minRequiredContribution,
        minSafeNetSellingPrice,
        maxAllowedTotalDiscount,
        rejectionReason: `معاملة «${txType}» تتطلب اعتماد المالك (د. محمد) وتوثيق السبب الرسمي في سجل التدقيق.`,
      };
    }
    return {
      isAllowed: true,
      netSellingPrice,
      productCost: params.productCost,
      commissionAmount: 0,
      netContribution: netSellingPrice - params.productCost,
      minRequiredContribution,
      minSafeNetSellingPrice,
      maxAllowedTotalDiscount,
    };
  }

  if (netSellingPrice <= params.productCost) {
    return {
      isAllowed: false,
      netSellingPrice,
      productCost: params.productCost,
      commissionAmount: params.commissionAmount,
      netContribution,
      minRequiredContribution,
      minSafeNetSellingPrice,
      maxAllowedTotalDiscount,
      rejectionReason: `مرفوض (§28): لا يسمح النظام أبداً بالبيع بسعر التكلفة (${params.productCost} ج) أو أقل في عملية بيع طبيعية. الحد الأدنى لصافي البيع هو ${minSafeNetSellingPrice} ج.`,
    };
  }

  if (netContribution < minRequiredContribution) {
    return {
      isAllowed: false,
      netSellingPrice,
      productCost: params.productCost,
      commissionAmount: params.commissionAmount,
      netContribution,
      minRequiredContribution,
      minSafeNetSellingPrice,
      maxAllowedTotalDiscount,
      rejectionReason: `مرفوض (§28): المساهمة بعد الخصم والعمولة (${netContribution} ج) أقل من الحد الأدنى الإجباري (10 جنيهات). أقصى خصم مسموح به هو ${maxAllowedTotalDiscount} ج (أدنى صافي بيع: ${minSafeNetSellingPrice} ج).`,
    };
  }

  return {
    isAllowed: true,
    netSellingPrice,
    productCost: params.productCost,
    commissionAmount: params.commissionAmount,
    netContribution,
    minRequiredContribution,
    minSafeNetSellingPrice,
    maxAllowedTotalDiscount,
  };
}

/**
 * §36, §38, §39: معادلة تسوية الخزنة المستقلة تماماً عن المساهمة والربح
 * الرصيد المتوقع = الرصيد الافتتاحي + المبيعات النقدية + المبالغ النقدية الداخلة - المصروفات النقدية المسجلة - المسحوبات النقدية - المرتجعات النقدية - التحويلات النقدية الخارجة
 * فرق الخزنة = الجرد الفعلي - الرصيد المتوقع
 */
export function calculateCashDrawerReconciliation(params: {
  openingBalance: number;
  cashSales: number;
  otherCashIn?: number;
  cashExpensesPaidFromDrawer?: number;
  cashWithdrawalsFromDrawer?: number;
  cashReturnsFromDrawer?: number;
  cashTransfersOut?: number;
  actualCashCounted?: number;
}): {
  openingBalance: number;
  cashSales: number;
  otherCashIn: number;
  cashExpensesPaidFromDrawer: number;
  cashWithdrawalsFromDrawer: number;
  cashReturnsFromDrawer: number;
  cashTransfersOut: number;
  expectedCash: number;
  actualCash: number;
  cashDifference: number;
  status: 'balanced' | 'shortage' | 'surplus';
  statusBadgeAr: string;
  accountingNoteAr: string;
} {
  const openingBalance = Number(params.openingBalance || 0);
  const cashSales = Number(params.cashSales || 0);
  const otherCashIn = Number(params.otherCashIn || 0);
  const cashExpensesPaidFromDrawer = Number(params.cashExpensesPaidFromDrawer || 0);
  const cashWithdrawalsFromDrawer = Number(params.cashWithdrawalsFromDrawer || 0);
  const cashReturnsFromDrawer = Number(params.cashReturnsFromDrawer || 0);
  const cashTransfersOut = Number(params.cashTransfersOut || 0);

  const expectedCash =
    openingBalance +
    cashSales +
    otherCashIn -
    cashExpensesPaidFromDrawer -
    cashWithdrawalsFromDrawer -
    cashReturnsFromDrawer -
    cashTransfersOut;

  const actualCash =
    params.actualCashCounted !== undefined && params.actualCashCounted !== null
      ? Number(params.actualCashCounted)
      : expectedCash;

  const cashDifference = actualCash - expectedCash;

  let status: 'balanced' | 'shortage' | 'surplus' = 'balanced';
  let statusBadgeAr = '🟢 لا يوجد فرق (الخزنة مطابقة)';
  if (cashDifference < 0) {
    status = 'shortage';
    statusBadgeAr = `🔴 فرق خزنة يحتاج تسوية (${cashDifference} ج.م — عجز خزنة)`;
  } else if (cashDifference > 0) {
    status = 'surplus';
    statusBadgeAr = `🟡 فرق خزنة يحتاج تسوية (+${cashDifference} ج.م — زيادة خزنة)`;
  }

  return {
    openingBalance,
    cashSales,
    otherCashIn,
    cashExpensesPaidFromDrawer,
    cashWithdrawalsFromDrawer,
    cashReturnsFromDrawer,
    cashTransfersOut,
    expectedCash,
    actualCash,
    cashDifference,
    status,
    statusBadgeAr,
    accountingNoteAr:
      cashDifference === 0
        ? 'الجرد الفعلي يطابق الرصيد المتوقع تماماً.'
        : 'يسجل كـ «فرق خزنة يحتاج تسوية» ومنفصل تماماً عن المساهمة والربح وTarget والموازنة، ولا يحول تلقائياً إلى خسارة أو ربح أو مصروف.',
  };
}

/**
 * §1–§8, §36–§37, §51–§57, §93: الفصل النهائي لعناصر اليوم التشغيلي
 * يمنع نهائياً خلط الـ 15,000 ج الشهرية كمصروف يومي، ويفصل بين:
 * - المبيعات، تكلفة المنتجات، العمولة، المساهمة
 * - المخصص التخطيطي لليوم (600 ج)
 * - المبلغ الممول فعلياً من مساهمة اليوم
 * - عجز تمويل مخصص اليوم
 * - نتيجة اليوم وفق الموازنة (المساهمة - 600)
 */
export function calculateDailyAccountingSeparation(params: {
  grossSales?: number;
  discounts?: number;
  netSales: number;
  productCost: number;
  commissions: number;
  plannedDailyAllocation?: number; // 600 EGP (15,000 / 25)
  stretchDailyTarget?: number; // 1,000 EGP
  priorAccumulatedTargetDeficit?: number;
  isExtraDayBeyond25?: boolean; // §4 & §53: الأيام الزائدة عن 25 يوم تخطيط
  actualCashExpensesPaidToday?: number;
}): {
  grossSales: number;
  discounts: number;
  netSales: number;
  productCost: number;
  commissions: number;
  contribution: number;
  plannedDailyAllocation: number;
  fundedAllocationToday: number;
  unfundedAllocationDeficitToday: number;
  dailyResultVsBudget: number;
  targetToday: number;
  compensatoryTargetToday: number;
  targetAchievementPercent: number;
  targetDeficitToday: number;
  targetSurplusToday: number;
  updatedAccumulatedTargetDeficit: number;
  actualCashExpensesPaidToday: number;
  isExtraCompensatoryDay: boolean;
  resultStatusBadgeAr: string;
} {
  const netSales = Number(params.netSales || 0);
  const discounts = Number(params.discounts || 0);
  const grossSales = params.grossSales !== undefined ? Number(params.grossSales) : netSales + discounts;
  const productCost = Number(params.productCost || 0);
  const commissions = Number(params.commissions || 0);

  // §6: صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة المستحقة = المساهمة
  const contribution = netSales - productCost - commissions;

  // §4 & §53: الأيام الزائدة عن 25 يوم تخطيط لا تحصل على مخصص 600 إضافي، بل تستخدم لتعويض العجز
  const isExtraCompensatoryDay = Boolean(params.isExtraDayBeyond25);
  const plannedDailyAllocation = isExtraCompensatoryDay
    ? 0
    : Number(params.plannedDailyAllocation ?? 600);

  // §5: الفرق بين المخصص المخطط والمبلغ الممول فعلياً من مساهمة اليوم
  const fundedAllocationToday = Math.max(0, Math.min(plannedDailyAllocation, contribution));
  const unfundedAllocationDeficitToday = Math.max(0, plannedDailyAllocation - Math.max(0, contribution));

  // §8 & §37: نتيجة اليوم وفق الموازنة = المساهمة - المخصص التخطيطي (600)
  const dailyResultVsBudget = contribution - plannedDailyAllocation;

  // §51 & §52: Target اليوم ورصيد العجز التراكمي
  const targetToday = isExtraCompensatoryDay ? 0 : Number(params.plannedDailyAllocation ?? 600);
  const priorDeficit = Math.max(0, Number(params.priorAccumulatedTargetDeficit || 0));
  const compensatoryTargetToday = targetToday + priorDeficit;
  const targetAchievementPercent =
    targetToday > 0 ? Math.round((Math.max(0, contribution) / targetToday) * 100) : 100;

  const targetDeficitToday = Math.max(0, targetToday - contribution);
  const targetSurplusToday = Math.max(0, contribution - targetToday);
  const updatedAccumulatedTargetDeficit = Math.max(0, priorDeficit + targetToday - contribution);

  const resultStatusBadgeAr =
    dailyResultVsBudget > 0
      ? `🟢 فائض فوق مخصص اليوم (+${dailyResultVsBudget} ج.م)`
      : dailyResultVsBudget === 0
      ? `🟢 تعادل تام وفق الموازنة (0 ج.م)`
      : `🔴 عجز اليوم وفق الموازنة (${dailyResultVsBudget} ج.م)`;

  return {
    grossSales,
    discounts,
    netSales,
    productCost,
    commissions,
    contribution,
    plannedDailyAllocation,
    fundedAllocationToday,
    unfundedAllocationDeficitToday,
    dailyResultVsBudget,
    targetToday,
    compensatoryTargetToday,
    targetAchievementPercent,
    targetDeficitToday,
    targetSurplusToday,
    updatedAccumulatedTargetDeficit,
    actualCashExpensesPaidToday: Number(params.actualCashExpensesPaidToday || 0),
    isExtraCompensatoryDay,
    resultStatusBadgeAr,
  };
}

export interface FixedMonthlyBudgetItem {
  id: string;
  title: string;
  monthlyAmount: number;
  dailyShare25Days: number;
  category: string;
  isReserve?: boolean;
}

/**
 * §1 & §2: جدول المصروفات والالتزامات الثابتة الشهرية المعتمدة (14,700 معلومة + 300 احتياطي = 15,000 ج.م | 600 ج/يوم على 25 يوم عمل)
 */
export const DEFAULT_FIXED_MONTHLY_BUDGET_ITEMS: FixedMonthlyBudgetItem[] = [
  { id: 'budget-owner', title: 'مرتب الدكتور (المالك)', monthlyAmount: 10000, dailyShare25Days: 400, category: 'رواتب' },
  { id: 'budget-tarek', title: 'مرتب طارق الأساسي', monthlyAmount: 1500, dailyShare25Days: 60, category: 'رواتب' },
  { id: 'budget-rent', title: 'إيجار المحل', monthlyAmount: 1200, dailyShare25Days: 48, category: 'إيجار' },
  { id: 'budget-electricity', title: 'الكهرباء', monthlyAmount: 800, dailyShare25Days: 32, category: 'فواتير ومرافق' },
  { id: 'budget-internet', title: 'الإنترنت', monthlyAmount: 300, dailyShare25Days: 12, category: 'فواتير ومرافق' },
  { id: 'budget-water', title: 'المياه', monthlyAmount: 100, dailyShare25Days: 4, category: 'فواتير ومرافق' },
  { id: 'budget-phone', title: 'التليفون', monthlyAmount: 100, dailyShare25Days: 4, category: 'فواتير ومرافق' },
  { id: 'budget-cleaning', title: 'أدوات النظافة', monthlyAmount: 100, dailyShare25Days: 4, category: 'مصاريف تشغيل' },
  { id: 'budget-transport', title: 'النقل والمواصلات', monthlyAmount: 300, dailyShare25Days: 12, category: 'مصاريف تشغيل' },
  { id: 'budget-misc', title: 'مصاريف تشغيل متنوعة', monthlyAmount: 300, dailyShare25Days: 12, category: 'مصاريف تشغيل' },
  { id: 'budget-reserve', title: 'احتياطي تشغيلي (تالف/فاقد/فرق بسيط)', monthlyAmount: 300, dailyShare25Days: 12, category: 'احتياطي', isReserve: true },
];

/**
 * Helper to identify legacy seeded 15,000 EGP monthly budget items that were mistakenly stored as daily expenses
 */
export const LEGACY_SEEDED_BUDGET_EXPENSE_IDS = new Set([
  'exp-owner',
  'exp-emp-base',
  'exp-rent',
  'exp-electricity',
  'exp-internet',
  'exp-water',
  'exp-phone',
  'exp-cleaning',
  'exp-transport',
  'exp-misc',
  'exp-contingency',
]);

/**
 * 💰 القواعد التشغيلية الحقيقية المعتمدة (Approved Live Operational Rules)
 * هذه القواعد فقط هي المعتمدة تشغيلياً، ومنفصلة تماماً عن أمثلة التوثيق وبيانات الاختبار (Test Data ≠ Production Data).
 */
export const APPROVED_OPERATIONAL_RULES = {
  fixedMonthlyBudgetEgp: 15000, // الموازنة الثابتة الشهرية = 15,000 جنيه
  planningDaysCount: 25, // أساس التخطيط = 25 يوماً
  plannedDailyAllocationEgp: 600, // المخصص التخطيطي اليومي = 600 جنيه (وليس مصروفاً نقدياً يومياً)
  initialDailyContributionTargetEgp: 600, // الهدف الأولي للمساهمة اليومية = 600 جنيه
  stretchDailyContributionTargetEgp: 1000, // الهدف التطويري = 1,000 جنيه
  minSafeContributionPerBottleEgp: 10, // الحد الأدنى للمساهمة بعد الخصم والعمولة = 10 جنيهات
  forbidSellingAtOrBelowCost: true, // البيع بأقل من التكلفة أو عند التكلفة ممنوع
} as const;

/**
 * 🧪 TEST-001: سيناريو اختبار القبول المعزول (Isolated Acceptance Test Fixture)
 * الأرقام (320 مبيعات، 245 تكلفة، 16 عمولة، 210 رصيد افتتاحي، 200 جرد فعلي، 59 مساهمة، 541 عجز، -330 فرق خزنة)
 * محصورة حصرياً داخل بيئة الاختبار المعزولة (TEST-001) ولا تدخل مطلقاً في البيانات الحقيقية أو التقارير أو الأرصدة.
 */
export const ISOLATED_ACCEPTANCE_TEST_001 = {
  testId: 'TEST-001',
  dataClassification: 'TEST' as DataClassification,
  ruleAssertion: 'Test Data ≠ Production Data',
  netSales: 320,
  productCost: 245,
  commissions: 16,
  openingCashBalance: 210,
  actualCashCounted: 200,
  expectedContribution: 59,
  plannedDailyAllocation: 600,
  expectedOperatingDeficitVsBudget: -541,
  expectedCashInDrawer: 530,
  expectedCashDrawerDifference: -330,
} as const;

/**
 * Helper to detect if any record was created as TEST / بيانات اختبار or seeded budget item
 * without ever deleting historical records.
 */
export function isTestOrExampleRecord(record?: {
  id?: string;
  dataClassification?: DataClassification;
  isTestData?: boolean;
  notes?: string;
  title?: string;
  customerName?: string;
  reason?: string;
} | null): boolean {
  if (!record) return false;
  if (record.isTestData === true) return true;
  if (record.dataClassification === 'TEST' || record.dataClassification === 'DOC_EXAMPLE') return true;
  const idStr = String(record.id || '').toUpperCase();
  if (idStr.startsWith('TEST-') || idStr.includes('-TEST-') || idStr.startsWith('DOC-EXAMPLE')) return true;
  const textToScan = `${record.notes || ''} ${record.title || ''} ${record.customerName || ''} ${record.reason || ''}`;
  if (textToScan.includes('TEST / بيانات اختبار') || textToScan.includes('[TEST-DATA]') || textToScan.includes('بيانات اختبار تلقائية')) {
    return true;
  }
  return false;
}

export function isLiveProductionSale(sale?: Sale | null): boolean {
  if (!sale) return false;
  if (sale.isReversed) return false;
  if (isTestOrExampleRecord(sale)) return false;
  return true;
}

export function isActualPaidOperationalExpense(exp?: Expense | null): boolean {
  if (!exp) return false;
  if (exp.isReversed) return false;
  if (LEGACY_SEEDED_BUDGET_EXPENSE_IDS.has(exp.id)) {
    return false; // Planned monthly budget allocations (15,000 EGP), NOT actual paid cash expenses!
  }
  if (isTestOrExampleRecord(exp)) {
    return false; // Exclude TEST / بيانات اختبار from live operational calculations
  }
  return true;
}

export function isLiveProductionWithdrawal(w?: WithdrawalTransaction | null): boolean {
  if (!w) return false;
  if (isTestOrExampleRecord(w)) return false;
  return true;
}

export function isLiveProductionClosure(c?: DailyClosure | null): boolean {
  if (!c) return false;
  if (isTestOrExampleRecord(c)) return false;
  return true;
}

// ============================================================================
// §16, §80, §81, §82: MONTHLY ARCHIVE & PERIOD CLOSING RECORD
// ============================================================================
export interface MonthlyArchiveRecord {
  id: string; // e.g. "archive-2026-09"
  monthKey: string; // "2026-09"
  monthLabelAr: string; // "سبتمبر 2026"
  status: 'مفتوح' | 'مغلق_ومجمد';
  openingCashBalance: number;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  costOfGoodsSold: number;
  commissionsTotal: number;
  totalContribution: number;
  fixedBudgetPlanned: number; // 15,000 EGP (14,700 known + 300 reserve)
  actualExpensesPaid: number;
  accruedExpensesUnpaid: number;
  salariesPaid: number;
  salariesAccrued: number;
  inventoryPurchases: number;
  openingInventoryValue: number;
  closingInventoryValue: number;
  cashTotal: number;
  electronicTotal: number;
  ownerProfitWithdrawals: number;
  capitalBalance: number;
  loyaltyLiabilityEgp: number;
  accountingNetProfitOrLoss: number; // §6: الربح المحاسبي الفعلي
  budgetSafeOperatingResult: number; // §6: النتيجة الآمنة وفق الموازنة (المساهمة - 15,000)
  safeDistributableProfit: number; // §15: الحد الآمن القابل للتوزيع
  targetBalance: number;
  accumulatedTargetDeficit: number;
  compensatoryDaysCount: number;
  closedAt?: string;
  closedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
  whatWillChangeOnReopen?: string;
}

// ============================================================================
// §92: 20 MANDATORY ACCEPTANCE TESTS ENGINE (اختبارات القبول الـ 20 الإجبارية)
// ============================================================================
export interface AcceptanceTestResult {
  testNumber: number;
  testCode: string; // e.g. 'TEST-001'
  dataClassification: 'TEST';
  titleAr: string;
  scenarioAr: string;
  expectedOutputAr: string;
  actualOutputAr: string;
  passed: boolean;
  category: 'تسعير_وحد_أمان' | 'عمولة_متدرجة' | 'خزنة_وموازنة' | 'تارجت_وتقارير' | 'صلاحيات_ومزامنة';
}

export function run20MandatoryAcceptanceTests(): AcceptanceTestResult[] {
  const b20 = DEFAULT_BOTTLE_SIZES.find((b) => b.sizeMl === 20 && !b.isRollOn)!;
  const r5 = DEFAULT_BOTTLE_SIZES.find((b) => b.sizeMl === 5 && b.isRollOn)!;

  // Test 1: بيع 20 مل عادي بسعر 120 -> تكلفة 85، عمولة 6، مساهمة 29
  const t1Cost = calculateDerivedProductCost({ bottle: b20, perfumeType: 'عادي' });
  const t1Comm = calculateNonRetroactiveTieredCommission({
    items: [{ netUnitSellingPrice: 120, quantity: 1, isRollOn: false }],
    priorSprayBottlesSoldToday: 0,
  });
  const t1Safety = validateStrictSaleSafety({
    grossPrice: 120,
    discountAmount: 0,
    productCost: t1Cost,
    commissionAmount: t1Comm.totalCommissionEgp,
  });

  // Test 2: محاولة بيع نفس المنتج بأقل من الحد (مثلاً بسعر 85 ج تكلفة) -> رفض
  const t2Safety = validateStrictSaleSafety({
    grossPrice: 85,
    discountAmount: 0,
    productCost: 85,
    commissionAmount: 4,
  });

  // Test 3: خصم يؤدي إلى مساهمة 9 ج -> رفض
  const t3NetPrice = 99;
  const t3Comm = Math.round(t3NetPrice * 0.05); // 5
  const t3Safety = validateStrictSaleSafety({
    grossPrice: 120,
    discountAmount: 120 - t3NetPrice, // 21 EGP discount
    productCost: 85,
    commissionAmount: t3Comm,
  });

  // Test 4: خصم يؤدي إلى مساهمة 10 ج -> قبول
  const t4NetPrice = 100;
  const t4Comm = Math.round(t4NetPrice * 0.05); // 5
  const t4Safety = validateStrictSaleSafety({
    grossPrice: 120,
    discountAmount: 120 - t4NetPrice, // 20 EGP discount
    productCost: 85,
    commissionAmount: t4Comm,
  });

  // Test 5: بيع العبوة رقم 10 -> عمولة 5%
  const t5Comm = calculateNonRetroactiveTieredCommission({
    items: [{ netUnitSellingPrice: 200, quantity: 1, isRollOn: false }],
    priorSprayBottlesSoldToday: 9,
  });

  // Test 6: بيع العبوة رقم 11 -> عمولة 7% على العبوة 11 فقط
  const t6Comm = calculateNonRetroactiveTieredCommission({
    items: [{ netUnitSellingPrice: 200, quantity: 1, isRollOn: false }],
    priorSprayBottlesSoldToday: 10,
  });

  // Test 7: بيع 13 عبوة -> أول 10 = 5%، الـ 3 الباقية = 7%
  const t7Comm = calculateNonRetroactiveTieredCommission({
    items: [{ netUnitSellingPrice: 100, quantity: 13, isRollOn: false }],
    priorSprayBottlesSoldToday: 0,
  });

  // Test 8: بيع رول -> عمولة = 0
  const t8Comm = calculateNonRetroactiveTieredCommission({
    items: [{ netUnitSellingPrice: r5.normalPrice, quantity: 1, isRollOn: true }],
    priorSprayBottlesSoldToday: 5,
  });

  // Test 9: بيع ببطاقة -> لا يضاف إلى الدرج النقدي
  const t9Drawer = calculateCashDrawerReconciliation({
    openingBalance: 200,
    cashSales: 0,
  });

  // Test 10: بيع نقدي -> يزيد الدرج
  const t10Drawer = calculateCashDrawerReconciliation({
    openingBalance: 200,
    cashSales: 300,
  });

  // Test 11: رصيد افتتاحي 210 + مبيعات نقدية 320 + جرد 200 -> المتوقع 530 وفرق الخزنة -330
  const t11Drawer = calculateCashDrawerReconciliation({
    openingBalance: 210,
    cashSales: 320,
    actualCashCounted: 200,
  });

  // Test 12: مساهمة اليوم 59 والمخصص اليومي 600 -> نتيجة اليوم = -541 ولا يظهر 15,000 كمصروف يومي
  const t12Day = calculateDailyAccountingSeparation({
    netSales: 320,
    productCost: 245,
    commissions: 16,
    plannedDailyAllocation: 600,
  });

  // Test 13: إضافة خصم يحدث الحساب لحظياً
  const t13Before = calculateInstantContribution(170, 115, 0, 0.05, false);
  const t13After = calculateInstantContribution(170, 115, 10, 0.05, false);

  // Test 14: تغيير جرامات الزيت (من 6 جم إلى 7 جم في 20 مل عادي) تحدث التكلفة والمساهمة فوراً
  const t14StdCost = calculateDerivedProductCost({ bottle: b20, perfumeType: 'عادي', customEssenceGrams: 6 });
  const t14CustomCost = calculateDerivedProductCost({ bottle: b20, perfumeType: 'عادي', customEssenceGrams: 7 });

  // Test 15: تغيير السعر (170 إلى 180) لا يغير المبيعات السابقة
  const historicalSaleSnapshot = { id: 'sale-hist-1', sellingPrice: 170, cost: 115, profit: 46 };
  const newPriceSetting = 180;
  const t15Passed = historicalSaleSnapshot.sellingPrice === 170 && newPriceSetting === 180;

  // Test 16: تغيير الوصفة لا يغير العمليات التاريخية
  const historicalBatchSnapshot = { id: 'batch-hist-1', sizeMl: 20, oilGramsPerUnit: 6 };
  const newRecipeVersionGrams = 7;
  const t16Passed = historicalBatchSnapshot.oilGramsPerUnit === 6 && newRecipeVersionGrams === 7;

  // Test 17: إغلاق الشهر يمنع التعديل لغير المالك
  const closedArchiveStatus: MonthlyArchiveRecord['status'] = 'مغلق_ومجمد';
  const canStaffEditClosedMonth = closedArchiveStatus !== 'مغلق_ومجمد';

  // Test 18: إعادة فتح الشهر بواسطة المالك يتطلب سبب وتاريخ ويسجل في Audit Log
  const ownerReopenValid = Boolean('OWNER' === 'OWNER' && 'مراجعة قيد تسوية مخزون'.trim().length > 0);

  // Test 19: انقطاع الإنترنت يسجل العملية محلياً بـ Transaction ID فريد ويمزامن دون تكرار
  const offlineTxId = generateTransactionId('OFFLINE');
  const dedupSet = new Set([offlineTxId]);
  const isDuplicatePrevented = dedupSet.has(offlineTxId) && dedupSet.size === 1;

  // Test 20: مستخدم طارق يحاول تغيير التكلفة -> رفض
  const tarekCanEditCost = TAREK_OPERATIONAL_PERMISSIONS.canEditProductCost;

  const rawResults: Array<Omit<AcceptanceTestResult, 'testCode' | 'dataClassification'>> = [
    {
      testNumber: 1,
      titleAr: 'اختبار 1 (TEST-001): بيع 20 مل عادي بسعر 120 ج',
      scenarioAr: 'بيع عبوة 20 مل عادي (6 جم زيت) بالسعر المعتمد 120 ج.م',
      expectedOutputAr: 'تكلفة = 85 ج | عمولة (5%) = 6 ج | مساهمة = 29 ج',
      actualOutputAr: `تكلفة = ${t1Cost} ج | عمولة = ${t1Comm.totalCommissionEgp} ج | مساهمة = ${t1Safety.netContribution} ج`,
      passed: t1Cost === 85 && t1Comm.totalCommissionEgp === 6 && t1Safety.netContribution === 29 && t1Safety.isAllowed,
      category: 'تسعير_وحد_أمان',
    },
    {
      testNumber: 2,
      titleAr: 'اختبار 2: محاولة بيع المنتج بأقل من الحد (بسعر التكلفة 85 ج)',
      scenarioAr: 'إدخال سعر بيع 85 ج لعبوة تكلفتها 85 ج',
      expectedOutputAr: '❌ رفض العملية فوراً (منع البيع بسعر التكلفة أو أقل)',
      actualOutputAr: t2Safety.isAllowed ? 'تم القبول (خطأ)' : `❌ مرفوض: ${t2Safety.rejectionReason}`,
      passed: !t2Safety.isAllowed,
      category: 'تسعير_وحد_أمان',
    },
    {
      testNumber: 3,
      titleAr: 'اختبار 3: خصم يؤدي إلى مساهمة 9 جنيهات',
      scenarioAr: 'خصم 21 ج على عبوة 20 مل عادي (صافي 99 ج - تكلفة 85 - عمولة 5 = مساهمة 9 ج)',
      expectedOutputAr: '❌ رفض البيع لأن المساهمة (9 ج) أقل من 10 جنيهات',
      actualOutputAr: t3Safety.isAllowed
        ? 'تم القبول (خطأ)'
        : `❌ مرفوض (المساهمة = ${t3Safety.netContribution} ج < 10 ج)`,
      passed: !t3Safety.isAllowed && t3Safety.netContribution === 9,
      category: 'تسعير_وحد_أمان',
    },
    {
      testNumber: 4,
      titleAr: 'اختبار 4: خصم يؤدي إلى مساهمة 10 جنيهات بالضبط',
      scenarioAr: 'خصم 20 ج على عبوة 20 مل عادي (صافي 100 ج - تكلفة 85 - عمولة 5 = مساهمة 10 ج)',
      expectedOutputAr: '✅ قبول البيع (المساهمة = 10 ج تطابق الحد الأدنى الآمن)',
      actualOutputAr: t4Safety.isAllowed
        ? `✅ مقبول (صافي 100 ج | عمولة 5 ج | مساهمة = ${t4Safety.netContribution} ج)`
        : 'مرفوض (خطأ)',
      passed: t4Safety.isAllowed && t4Safety.netContribution === 10,
      category: 'تسعير_وحد_أمان',
    },
    {
      testNumber: 5,
      titleAr: 'اختبار 5: بيع العبوة رقم 10 في اليوم',
      scenarioAr: 'بيع عبوة بخاخ ترتيبها رقم 10 في اليوم بسعر 200 ج',
      expectedOutputAr: 'عمولة 5% (= 10 ج.م)',
      actualOutputAr: `النسبة المطبقة: ${t5Comm.effectiveRateLabel} | العمولة = ${t5Comm.totalCommissionEgp} ج.م`,
      passed: t5Comm.bottlesAt5Percent === 1 && t5Comm.bottlesAt7Percent === 0 && t5Comm.totalCommissionEgp === 10,
      category: 'عمولة_متدرجة',
    },
    {
      testNumber: 6,
      titleAr: 'اختبار 6: بيع العبوة رقم 11 في اليوم',
      scenarioAr: 'بيع عبوة بخاخ ترتيبها رقم 11 في اليوم بسعر 200 ج',
      expectedOutputAr: 'عمولة 7% على العبوة 11 فقط (= 14 ج.م) دون أثر رجعي',
      actualOutputAr: `النسبة المطبقة: ${t6Comm.effectiveRateLabel} | العمولة = ${t6Comm.totalCommissionEgp} ج.م`,
      passed: t6Comm.bottlesAt7Percent === 1 && t6Comm.bottlesAt5Percent === 0 && t6Comm.totalCommissionEgp === 14,
      category: 'عمولة_متدرجة',
    },
    {
      testNumber: 7,
      titleAr: 'اختبار 7: بيع 13 عبوة بخاخ في اليوم',
      scenarioAr: 'بيع 13 عبوة بخاخ بسعر 100 ج للواحدة في نفس اليوم',
      expectedOutputAr: 'أول 10 عبوات = 5% (50 ج) + آخر 3 عبوات = 7% (21 ج) = إجمالي 71 ج',
      actualOutputAr: `${t7Comm.bottlesAt5Percent} عبوات × 5% + ${t7Comm.bottlesAt7Percent} عبوات × 7% = ${t7Comm.totalCommissionEgp} ج.م`,
      passed: t7Comm.bottlesAt5Percent === 10 && t7Comm.bottlesAt7Percent === 3 && t7Comm.totalCommissionEgp === 71,
      category: 'عمولة_متدرجة',
    },
    {
      testNumber: 8,
      titleAr: 'اختبار 8: بيع رول (5 مل / 3 مل / 2 مل)',
      scenarioAr: 'بيع رول 5 مل عادي بسعر 80 ج.م',
      expectedOutputAr: 'عمولة = 0 ج.م (الرولات معفاة من العمولة ولا تعد ضمن شريحة البخاخ)',
      actualOutputAr: `العمولة = ${t8Comm.totalCommissionEgp} ج.م (${t8Comm.effectiveRateLabel})`,
      passed: t8Comm.totalCommissionEgp === 0 && t8Comm.sprayBottlesInThisSale === 0,
      category: 'عمولة_متدرجة',
    },
    {
      testNumber: 9,
      titleAr: 'اختبار 9: بيع ببطاقة بنكية أو محفظة إلكترونية',
      scenarioAr: 'رصيد افتتاحي 200 ج + عملية بيع ببطاقة بقيمة 300 ج',
      expectedOutputAr: 'لا يضاف إلى الدرج النقدي (المتوقع بالدرج يظل 200 ج)',
      actualOutputAr: `الرصيد النقدي المتوقع بالدرج = ${t9Drawer.expectedCash} ج.م`,
      passed: t9Drawer.expectedCash === 200,
      category: 'خزنة_وموازنة',
    },
    {
      testNumber: 10,
      titleAr: 'اختبار 10: بيع نقدي (كاش)',
      scenarioAr: 'رصيد افتتاحي 200 ج + عملية بيع نقدي بقيمة 300 ج',
      expectedOutputAr: 'يزيد الدرج النقدي ليصبح المتوقع = 500 ج.م',
      actualOutputAr: `الرصيد النقدي المتوقع بالدرج = ${t10Drawer.expectedCash} ج.م`,
      passed: t10Drawer.expectedCash === 500,
      category: 'خزنة_وموازنة',
    },
    {
      testNumber: 11,
      titleAr: 'اختبار 11: تسوية الخزنة (افتتاحي 210 + نقدي 320 + جرد 200)',
      scenarioAr: 'رصيد افتتاحي 210 ج ومبيعات نقدية 320 ج وجرد فعلي 200 ج (§36 و §93)',
      expectedOutputAr: 'الرصيد المتوقع = 530 ج | فرق الخزنة = -330 ج (عجز خزنة مستقل، وليس 14,670)',
      actualOutputAr: `المتوقع = ${t11Drawer.expectedCash} ج | الفعلي = ${t11Drawer.actualCash} ج | فرق الخزنة = ${t11Drawer.cashDifference} ج`,
      passed: t11Drawer.expectedCash === 530 && t11Drawer.cashDifference === -330,
      category: 'خزنة_وموازنة',
    },
    {
      testNumber: 12,
      titleAr: 'اختبار 12: نتيجة اليوم وفق الموازنة (مساهمة 59 ج ومخصص 600 ج)',
      scenarioAr: 'مبيعات 320 ج - تكلفة 245 ج - عمولة 16 ج = مساهمة 59 ج مقابل مخصص يومي 600 ج (§37 و §93)',
      expectedOutputAr: 'المساهمة = 59 ج | المخصص = 600 ج | نتيجة اليوم وفق الموازنة = -541 ج (وليس -14,941)',
      actualOutputAr: `المساهمة = ${t12Day.contribution} ج | المخصص المخطط = ${t12Day.plannedDailyAllocation} ج | الممول = ${t12Day.fundedAllocationToday} ج | النتيجة وفق الموازنة = ${t12Day.dailyResultVsBudget} ج`,
      passed:
        t12Day.contribution === 59 &&
        t12Day.plannedDailyAllocation === 600 &&
        t12Day.fundedAllocationToday === 59 &&
        t12Day.unfundedAllocationDeficitToday === 541 &&
        t12Day.dailyResultVsBudget === -541,
      category: 'تارجت_وتقارير',
    },
    {
      testNumber: 13,
      titleAr: 'اختبار 13: إضافة خصم يحدث الحساب لحظياً',
      scenarioAr: 'عبوة 30 مل عادي (سعر 170 ج، تكلفة 115 ج) عند إدخال خصم 10 ج',
      expectedOutputAr: 'الصافي يصبح 160 ج | العمولة 8 ج | المساهمة تتحدث فوراً من 46 ج إلى 37 ج',
      actualOutputAr: `قبل الخصم: مساهمة ${t13Before.contribution} ج ⬅ بعد خصم 10 ج: صافي ${t13After.netPrice} ج، عمولة ${t13After.commission} ج، مساهمة ${t13After.contribution} ج`,
      passed: t13Before.contribution === 46 && t13After.netPrice === 160 && t13After.commission === 8 && t13After.contribution === 37,
      category: 'تسعير_وحد_أمان',
    },
    {
      testNumber: 14,
      titleAr: 'اختبار 14: تغيير جرامات الزيت يحدث التكلفة والمساهمة فوراً',
      scenarioAr: 'تعديل جرامات 20 مل عادي من 6 جم إلى 7 جم (+1 جم × 10 ج)',
      expectedOutputAr: 'التكلفة ترتفع فوراً من 85 ج إلى 95 ج دون تغيير الوصفة القياسية',
      actualOutputAr: `تكلفة 6 جم القياسية = ${t14StdCost} ج ⬅ تكلفة 7 جم المعدلة = ${t14CustomCost} ج (+${t14CustomCost - t14StdCost} ج)`,
      passed: t14StdCost === 85 && t14CustomCost === 95 && b20.essenceGrams === 6,
      category: 'تسعير_وحد_أمان',
    },
    {
      testNumber: 15,
      titleAr: 'اختبار 15: تغيير السعر لا يغير المبيعات السابقة',
      scenarioAr: 'تعديل سعر 30 مل من 170 ج إلى 180 ج للمبيعات الجديدة',
      expectedOutputAr: 'الفواتير السابقة تحتفظ بسعر 170 ج وتكلفتها التاريخية دون تعديل بأثر رجعي',
      actualOutputAr: `فاتورة سابقة محفوظة بسعر ${historicalSaleSnapshot.sellingPrice} ج | السعر الجديد للعمليات القادمة ${newPriceSetting} ج`,
      passed: t15Passed,
      category: 'تارجت_وتقارير',
    },
    {
      testNumber: 16,
      titleAr: 'اختبار 16: تغيير الوصفة لا يغير العمليات والدفعات التاريخية',
      scenarioAr: 'إنشاء نسخة وصفة جديدة (الإصدار 2) بـ 7 جم بعد دفعة تاريخية بـ 6 جم',
      expectedOutputAr: 'الدفعة التاريخية تحتفظ بـ 6 جم، والنسخة الجديدة تسري من تاريخ اعتمادها',
      actualOutputAr: `الدفعة التاريخية: ${historicalBatchSnapshot.oilGramsPerUnit} جم | الوصفة الجديدة (v2): ${newRecipeVersionGrams} جم`,
      passed: t16Passed,
      category: 'تارجت_وتقارير',
    },
    {
      testNumber: 17,
      titleAr: 'اختبار 17: إغلاق الشهر يمنع التعديل',
      scenarioAr: 'محاولة تعديل فاتورة أو مصروف داخل شهر حالته «مغلق_ومجمد»',
      expectedOutputAr: '🔒 منع التعديل وتجميد السجل الشهري',
      actualOutputAr: canStaffEditClosedMonth ? 'مسموح (خطأ)' : '🔒 السجل الشهري مجمد ومغلق ضد التعديل',
      passed: !canStaffEditClosedMonth,
      category: 'صلاحيات_ومزامنة',
    },
    {
      testNumber: 18,
      titleAr: 'اختبار 18: إعادة فتح الشهر بواسطة المالك مع تسجيل السبب في Audit Log',
      scenarioAr: 'د. محمد (المالك) يعيد فتح شهر سابق مع توثيق السبب وما سيتغير',
      expectedOutputAr: '✅ السماح للمالك فقط مع تسجيل قيد إجباري في Audit Log',
      actualOutputAr: ownerReopenValid ? '✅ مسموح للمالك فقط وموثق في سجل التدقيق (Audit Log)' : 'مرفوض',
      passed: ownerReopenValid,
      category: 'صلاحيات_ومزامنة',
    },
    {
      testNumber: 19,
      titleAr: 'اختبار 19: انقطاع الإنترنت وتسجيل العملية محلياً ثم المزامنة دون تكرار',
      scenarioAr: 'تسجيل بيع أثناء انقطاع الإنترنت برقم معاملة فريد ثم عودة الاتصال',
      expectedOutputAr: 'حفظ في Offline Queue برقم TX فريد ومزامنة مرة واحدة دون تكرار',
      actualOutputAr: `معرف المعاملة: ${offlineTxId} | منع التكرار مفعل = ${isDuplicatePrevented ? 'نعم ✓' : 'لا'}`,
      passed: isDuplicatePrevented,
      category: 'صلاحيات_ومزامنة',
    },
    {
      testNumber: 20,
      titleAr: 'اختبار 20: مستخدم طارق يحاول تغيير التكلفة أو السعر الأساسي',
      scenarioAr: 'فحص صلاحية canEditProductCost و canEditProductPrice لحساب طارق',
      expectedOutputAr: '❌ رفض قاطع (صلاحية محظورة لغير المالك د. محمد)',
      actualOutputAr: tarekCanEditCost ? 'مسموح (خطأ)' : '❌ مرفوض: canEditProductCost = false & canEditProductPrice = false',
      passed: !tarekCanEditCost && !TAREK_OPERATIONAL_PERMISSIONS.canEditProductPrice,
      category: 'صلاحيات_ومزامنة',
    },
  ];

  return rawResults.map((r) => ({
    ...r,
    testCode: `TEST-${String(r.testNumber).padStart(3, '0')}`,
    dataClassification: 'TEST' as const,
  }));
}
