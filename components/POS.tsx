import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Product, 
  Sale, 
  SaleItem,
  BottleSize, 
  PerfumeType, 
  Gender, 
  StoreSettings, 
  DEFAULT_SETTINGS, 
  DEFAULT_BOTTLE_SIZES,
  Season,
  TimeOfDay,
  StaffAttendanceRecord,
  PackagingOption,
  DEFAULT_PACKAGING_OPTIONS,
  AuditLogRecord,
  APPROVED_OPERATIONAL_RECIPES,
  getApprovedOilGramCost,
  calculateDerivedProductCost,
  getApprovedSellingPrice,
  calculatePackagingAccounting,
  calculateMinSafeNetPrice,
  calculateMaxSafeDiscount,
  calculateInstantContribution,
  calculateCustomerLoyaltyPoints,
  calculateSafeLoyaltyRedemption,
  calculateNonRetroactiveTieredCommission,
  validateStrictSaleSafety,
  AppUser,
  DailyClosure,
  StrategicReplenishmentOrder,
  FragranceDatabaseEntry,
  PurchaseRequest,
  CustomCustomerRecord,
  Expense,
  ExpenseCategory,
  SavedMixFormula,
  MixComponent,
  MixGoalType,
  calculateMixBottleAccounting,
  distributeOptimalMixGrams,
  getSmartCompatibleMixRecommendations,
  SmartMixRecommendation,
  analyzeSelectedPerfumeProfile,
  OlfactoryProfileAnalysis,
  getCairoCurrentTimeString,
  isLiveProductionSale
} from '../types';
import { canViewProfits, canViewCosts } from '../services/authService';
import SalesCoachingCard from './SalesCoachingCard';
import POSQuickPerformanceBar from './POSQuickPerformanceBar';
import SmartFragranceSearchModal from './SmartFragranceSearchModal';
import StrategicReplenishmentModal from './StrategicReplenishmentModal';
import ShortagesAlertModal from './ShortagesAlertModal';
import { generateStrategicReplenishmentOrder, DEFAULT_STRATEGIC_THRESHOLD_GRAMS } from '../services/strategicOrderService';
import { 
  Search, 
  Check, 
  X, 
  Beaker, 
  DollarSign, 
  User, 
  Phone, 
  Printer, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  Minus, 
  CreditCard, 
  Wallet, 
  Receipt, 
  RotateCcw, 
  SlidersHorizontal, 
  ChevronLeft, 
  Clock, 
  Zap, 
  TrendingUp, 
  MessageSquare, 
  Share2, 
  Trash2, 
  ShoppingBag, 
  Percent, 
  Coins, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Box, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Store,
  Users,
  Crown,
  Gift,
  Award,
  Bookmark,
  Scale,
  Layers,
  Wifi,
  WifiOff,
  ArrowLeftRight,
  CheckCheck
} from 'lucide-react';
import { enqueueOfflineAction } from '../services/offlineSyncService';
import ReceiptModal from './ReceiptModal';

interface POSProps {
  products: Product[];
  onCompleteSale: (sale: Sale) => void;
  settings?: StoreSettings;
  bottleSizes?: BottleSize[];
  dailyCoveredExpense?: number;
  todaysGrossProfit?: number;
  onUpdateSettings?: (settings: StoreSettings) => void;
  salesHistory?: Sale[];
  attendanceRecords?: StaffAttendanceRecord[];
  onCheckInAttendance?: (record: StaffAttendanceRecord) => void;
  onAddAuditLog?: (log: AuditLogRecord) => void;
  onOpenFormulationEngine?: (product?: Product) => void;
  currentUser?: AppUser | null;
  currentClosure?: DailyClosure | null;
  onOpenDayOperations?: () => void;
  fragranceDatabase?: FragranceDatabaseEntry[];
  strategicOrders?: StrategicReplenishmentOrder[];
  onSaveStrategicOrder?: (order: StrategicReplenishmentOrder) => void;
  onSaveClosure?: (closure: DailyClosure) => void;
  onSavePurchaseRequest?: (req: PurchaseRequest) => void;
  onNavigateToInvoices?: () => void;
  onNavigateToCustomers?: () => void;
  customCustomers?: CustomCustomerRecord[];
  preselectedCustomer?: { name: string; phone: string; autoRedeemLoyalty?: boolean } | null;
  onClearPreselectedCustomer?: () => void;
  onDeleteSale?: (saleId: string, restoreStock?: boolean) => void;
  onAddExpense?: (expense: Expense) => void;
  onOpenLoyaltySettings?: () => void;
  savedMixes?: SavedMixFormula[];
  onSaveMix?: (formula: SavedMixFormula) => void;
  onDeleteMix?: (mixId: string) => void;
}

interface CartItem extends SaleItem {
  cartItemId: string;
  brand: string;
  originalStock: number;
  isRollOn?: boolean;
  isColoredBottle?: boolean;
  customFormulaName?: string;
}

const POS: React.FC<POSProps> = ({ 
  products, 
  onCompleteSale, 
  settings = DEFAULT_SETTINGS, 
  bottleSizes: rawBottleSizes = DEFAULT_BOTTLE_SIZES,
  dailyCoveredExpense = 600,
  todaysGrossProfit = 0,
  onUpdateSettings,
  salesHistory = [],
  attendanceRecords = [],
  onCheckInAttendance,
  onAddAuditLog,
  onOpenFormulationEngine,
  currentUser,
  currentClosure,
  onOpenDayOperations,
  fragranceDatabase = [],
  strategicOrders = [],
  onSaveStrategicOrder,
  onSaveClosure,
  onSavePurchaseRequest,
  onNavigateToInvoices,
  onNavigateToCustomers,
  customCustomers = [],
  preselectedCustomer,
  onClearPreselectedCustomer,
  onDeleteSale,
  onAddExpense,
  onOpenLoyaltySettings,
  savedMixes = [],
  onSaveMix,
  onDeleteMix
}) => {
  // Navigation & Catalogue Filtering (including Quick Side Filter Menu: صيفي، شتوي، نيش، مسك، عود، فرنسي)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<PerfumeType | 'all'>('all');
  const [selectedGender, setSelectedGender] = useState<Gender | 'all'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [quickSideFilter, setQuickSideFilter] = useState<'all' | 'صيفي' | 'شتوي' | 'نيش' | 'مسك' | 'عود' | 'فرنسي'>('all');
  const [showAllCatalogueExplicitly, setShowAllCatalogueExplicitly] = useState<boolean>(false);
  const [activeRecommendationFilter, setActiveRecommendationFilter] = useState<'auto' | 'summer' | 'winter' | 'morning' | 'night' | 'all'>('auto');
  const [catalogueViewMode, setCatalogueViewMode] = useState<'grid' | 'table'>('grid');

  // Modals for Smart Search, Strategic Replenishment & Shortages Alert
  const [showSmartSearchModal, setShowSmartSearchModal] = useState(false);
  const [showReplenishmentModal, setShowReplenishmentModal] = useState(false);
  const [showShortagesModal, setShowShortagesModal] = useState(false);
  const [isInitialShiftOpenAlert, setIsInitialShiftOpenAlert] = useState(false);
  const [activeStrategicOrder, setActiveStrategicOrder] = useState<StrategicReplenishmentOrder | null>(null);

  // Quick Actions Circular Floating Menu & Quick Expense Modal State
  const [isQuickActionsMenuOpen, setIsQuickActionsMenuOpen] = useState(false);
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [quickExpenseTitle, setQuickExpenseTitle] = useState('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState<number | ''>('');
  const [quickExpenseCategory, setQuickExpenseCategory] = useState<ExpenseCategory>('مصاريف تشغيل');
  const [quickExpenseNotes, setQuickExpenseNotes] = useState('');

  // Strategic reorder shortages count
  const strategicShortageProducts = useMemo(() => {
    return products.filter(p => p.stock_grams <= (p.strategicThresholdGrams || DEFAULT_STRATEGIC_THRESHOLD_GRAMS));
  }, [products]);

  // Only show active bottle sizes in POS while preserving inactive ones in settings history
  const bottleSizes = useMemo(() => {
    const active = rawBottleSizes.filter(b => b.isActive !== false);
    return active.length > 0 ? active : rawBottleSizes;
  }, [rawBottleSizes]);

  // Multi-Item POS Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Selected product being configured before adding to cart
  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
  const [selectedBottle, setSelectedBottle] = useState<BottleSize>(bottleSizes[0] || DEFAULT_BOTTLE_SIZES[0]);
  // Seller-defined active size indicator across POS (not locked to a fixed size)
  const [sellerActiveBottleId, setSellerActiveBottleId] = useState<string>(bottleSizes[0]?.id || DEFAULT_BOTTLE_SIZES[0].id);
  const [isSellerCustomSizeMode, setIsSellerCustomSizeMode] = useState<boolean>(false);
  const [sellerCustomSizeMl, setSellerCustomSizeMl] = useState<number>(75);
  const [customConfigSizeMl, setCustomConfigSizeMl] = useState<number | ''>('');
  const [essenceGrams, setEssenceGrams] = useState<number>(bottleSizes[0]?.essenceGrams || 15);
  const [configQuantity, setConfigQuantity] = useState<number>(1);
  const [configIsColoredBottle, setConfigIsColoredBottle] = useState<boolean>(false);
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [customOilCostPerGram, setCustomOilCostPerGram] = useState<number | ''>('');
  const [recipeModificationReason, setRecipeModificationReason] = useState<string>('');
  const [showPitchDrawer, setShowPitchDrawer] = useState(false);

  // Build dynamic BottleSize object based on seller's active selection or custom ML input
  const buildDynamicBottleForMl = (targetMl: number, isRoll?: boolean): BottleSize => {
    const cleanMl = Math.max(3, Math.round(targetMl || 30));
    const exactPreset = bottleSizes.find(b => b.sizeMl === cleanMl && Boolean(b.isRollOn) === Boolean(isRoll));
    if (exactPreset) return exactPreset;
    const stdGrams = isRoll ? cleanMl : Math.max(3, Math.round(cleanMl * 0.34));
    const normPrice = isRoll ? Math.round(cleanMl * 7.5) : Math.round(cleanMl * 4.6);
    const specPrice = isRoll ? Math.round(cleanMl * 12) : Math.round(cleanMl * 9);
    const offCost = isRoll ? Math.round(cleanMl * 4.5) : Math.round(cleanMl * 3.5);
    return {
      id: `custom-${cleanMl}ml-${isRoll ? 'roll' : 'spray'}`,
      name: `عبوة مخصصة ${cleanMl} مل`,
      sizeMl: cleanMl,
      essenceGrams: stdGrams,
      bottleCost: 25,
      alcoholCost: isRoll ? 0 : Math.round(cleanMl * 0.35),
      normalPrice: normPrice,
      specialPrice: specPrice,
      officialCost: offCost,
      isRollOn: Boolean(isRoll),
    };
  };

  const activeSellerBottle = useMemo<BottleSize>(() => {
    if (isSellerCustomSizeMode) {
      return buildDynamicBottleForMl(sellerCustomSizeMl, false);
    }
    return bottleSizes.find(b => b.id === sellerActiveBottleId) || bottleSizes[0] || DEFAULT_BOTTLE_SIZES[0];
  }, [isSellerCustomSizeMode, sellerCustomSizeMl, sellerActiveBottleId, bottleSizes]);

  // Packaging selection for current order
  const [packagingId, setPackagingId] = useState<'basic_bag' | 'luxury_box' | 'luxury_bag' | 'luxury_both'>('basic_bag');
  const [isPackagingPaid, setIsPackagingPaid] = useState<boolean>(false);

  // Customer & Payment Data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneSuggestions, setPhoneSuggestions] = useState<Array<{ phone: string; name: string; points?: number; tier?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'نقدي' | 'بطاقة' | 'محفظة إلكترونية' | 'تحويل بنكي'>('نقدي');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [discountInputMode, setDiscountInputMode] = useState<'amount' | 'percent'>('amount');
  const [discountPercentInput, setDiscountPercentInput] = useState<number | ''>('');

  // Loyalty Points Engine State (تحويل النقاط إلى خصم نقدي فوري بضغطة زر)
  const [redeemedLoyaltyPoints, setRedeemedLoyaltyPoints] = useState<number>(0);
  const [autoRedeemPending, setAutoRedeemPending] = useState<boolean>(false);

  // Owner Below-Cost Exception Modal
  const [ownerExceptionModalOpen, setOwnerExceptionModalOpen] = useState(false);
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [ownerExceptionReason, setOwnerExceptionReason] = useState<'تالف' | 'تصفية' | 'هدية' | 'تعويض عميل' | 'حالة إدارية خاصة'>('حالة إدارية خاصة');
  const [ownerExceptionNotes, setOwnerExceptionNotes] = useState('');
  const [ownerOverrideGranted, setOwnerOverrideGranted] = useState(false);

  // Success Modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [addedItemFlash, setAddedItemFlash] = useState<string | null>(null);

  // Guided Cashier Mode & Streamlined Cart Option Drawer
  const [showCashierGuide, setShowCashierGuide] = useState<boolean>(true);
  const [activeCartDrawer, setActiveCartDrawer] = useState<'none' | 'customer' | 'packaging' | 'discount' | 'accounting'>('none');
  const [isCustomerFieldsPulsing, setIsCustomerFieldsPulsing] = useState<boolean>(false);
  const [customerAlertDismissed, setCustomerAlertDismissed] = useState<boolean>(false);

  // ========================================================
  // COMPOSITION MODE & MIX FORMULATION STUDIO STATE
  // [ عطر فردي ] vs [ ميكس ] (§ وحدة البيع = زجاجة واحدة)
  // ========================================================
  const [compositionMode, setCompositionMode] = useState<'single' | 'mix'>('single');
  const [mixBottle, setMixBottle] = useState<BottleSize>(() => {
    return rawBottleSizes.find(b => b.sizeMl === 50 && !b.isRollOn) || rawBottleSizes[0] || DEFAULT_BOTTLE_SIZES[1];
  });
  const [mixIsColoredBottle, setMixIsColoredBottle] = useState<boolean>(false);
  const [mixCustomPrice, setMixCustomPrice] = useState<number | ''>('');
  const [mixFormulaName, setMixFormulaName] = useState<string>('');
  const [selectedMixPerfumeId, setSelectedMixPerfumeId] = useState<number | string | ''>('');
  const [selectedMixGrams, setSelectedMixGrams] = useState<number | ''>('');
  const [mixDistributionMode, setMixDistributionMode] = useState<'optimal' | 'equal'>('optimal');
  const [mixGoal, setMixGoal] = useState<MixGoalType>('standard');
  const [autoPairSecondPerfume, setAutoPairSecondPerfume] = useState<boolean>(false);
  const [conscious10MlThreeCompConfirmed, setConscious10MlThreeCompConfirmed] = useState<boolean>(false);
  const [showThirdComponentPanel, setShowThirdComponentPanel] = useState<boolean>(false);
  const [showSaveLibraryModal, setShowSaveLibraryModal] = useState<boolean>(false);
  const [libraryCustomerRating, setLibraryCustomerRating] = useState<number>(5);
  const [libraryTestResult, setLibraryTestResult] = useState<'ممتاز' | 'ناجح' | 'جيد' | 'تحت الاختبار'>('ممتاز');
  const [libraryLongevityNotes, setLibraryLongevityNotes] = useState<string>('ثبات ممتاز ومتوازن');
  const [librarySillageNotes, setLibrarySillageNotes] = useState<string>('فوحان واضح ومتناغم');
  const [libraryBalanceNotes, setLibraryBalanceNotes] = useState<string>('هرم عطري متزن بين المكونات');
  const [mixComponents, setMixComponents] = useState<Array<{
    productId: number | string;
    productName: string;
    brand?: string;
    productType: PerfumeType;
    grams: number;
    customOilGramCost?: number;
    availableStockGrams?: number;
    isAutoSelected?: boolean;
    harmonyRoleAr?: string;
    harmonyReasonAr?: string;
    compatibilityScore?: number;
    confidenceDegree?: 'عالية' | 'متوسطة' | 'منخفضة';
    replacedOutOfStockName?: string;
    isFromSavedLibrary?: boolean;
  }>>([]);
  const [showSavedMixesDrawer, setShowSavedMixesDrawer] = useState<boolean>(false);

  // New Search & Category Filters for Mix Formulation Studio (وضع الميكس / المكياج)
  const [mixSearchQuery, setMixSearchQuery] = useState<string>('');
  const [mixCategoryFilter, setMixCategoryFilter] = useState<'all' | 'عادي' | 'مسك' | 'عود' | 'نيش'>('all');
  const [showManualSecondPerfumePicker, setShowManualSecondPerfumePicker] = useState<boolean>(false);

  // Operations & Cart Persistence against sudden exit or offline internet cuts
  const [restoredSessionNotice, setRestoredSessionNotice] = useState<string | null>(null);
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Hydrate cart and active drafts from persistent storage on initial load
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('lamsa_pos_active_cart_v2');
      const savedCustomer = localStorage.getItem('lamsa_pos_active_customer_v2');
      const savedMix = localStorage.getItem('lamsa_pos_active_mix_v2');

      let restoredCount = 0;
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          setCart(parsedCart);
          restoredCount = parsedCart.length;
        }
      }

      if (savedCustomer) {
        const parsedCust = JSON.parse(savedCustomer);
        if (parsedCust.customerName) setCustomerName(parsedCust.customerName);
        if (parsedCust.customerPhone) setCustomerPhone(parsedCust.customerPhone);
        if (parsedCust.paymentMethod) setPaymentMethod(parsedCust.paymentMethod);
        if (parsedCust.orderDiscount) setOrderDiscount(parsedCust.orderDiscount);
        if (parsedCust.packagingId) setPackagingId(parsedCust.packagingId);
      }

      if (savedMix) {
        const parsedMix = JSON.parse(savedMix);
        if (Array.isArray(parsedMix.mixComponents) && parsedMix.mixComponents.length > 0) {
          setMixComponents(parsedMix.mixComponents);
          if (parsedMix.compositionMode) setCompositionMode(parsedMix.compositionMode);
          if (parsedMix.mixFormulaName) setMixFormulaName(parsedMix.mixFormulaName);
        }
      }

      if (restoredCount > 0) {
        setRestoredSessionNotice(
          `تم استعادة سلة المبيعات والعمليات تلقائياً (${restoredCount} عناصر) بعد الإغلاق أو انقطاع النت.`
        );
      }
    } catch (e) {
      console.warn('Error hydrating POS operations draft:', e);
    }
  }, []);

  // Persist cart to localStorage continuously
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('lamsa_pos_active_cart_v2', JSON.stringify(cart));
      } else {
        localStorage.removeItem('lamsa_pos_active_cart_v2');
      }
    } catch (e) {
      console.warn('Error saving POS cart draft:', e);
    }
  }, [cart]);

  // Persist customer metadata draft
  useEffect(() => {
    try {
      if (customerName || customerPhone || orderDiscount > 0) {
        localStorage.setItem(
          'lamsa_pos_active_customer_v2',
          JSON.stringify({
            customerName,
            customerPhone,
            paymentMethod,
            orderDiscount,
            packagingId,
          })
        );
      } else {
        localStorage.removeItem('lamsa_pos_active_customer_v2');
      }
    } catch (e) {
      console.warn('Error saving POS customer draft:', e);
    }
  }, [customerName, customerPhone, paymentMethod, orderDiscount, packagingId]);

  // Persist mix formulation studio draft
  useEffect(() => {
    try {
      if (mixComponents.length > 0) {
        localStorage.setItem(
          'lamsa_pos_active_mix_v2',
          JSON.stringify({
            compositionMode,
            mixComponents,
            mixFormulaName,
            mixBottleId: mixBottle.id,
          })
        );
      } else {
        localStorage.removeItem('lamsa_pos_active_mix_v2');
      }
    } catch (e) {
      console.warn('Error saving POS mix draft:', e);
    }
  }, [compositionMode, mixComponents, mixFormulaName, mixBottle.id]);

  // Offline detection and window beforeunload handling
  useEffect(() => {
    const handleOnline = () => setIsNetworkOnline(true);
    const handleOffline = () => setIsNetworkOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeUnload = () => {
      if (cart.length > 0) {
        localStorage.setItem('lamsa_pos_active_cart_v2', JSON.stringify(cart));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cart]);

  // Filtered perfumes for Mix mode live search and category tabs
  const filteredMixPerfumes = useMemo(() => {
    return products.filter((p) => {
      if (p.stock_grams <= 0) return false;
      if (mixCategoryFilter !== 'all' && p.type !== mixCategoryFilter) return false;
      if (!mixSearchQuery.trim()) return true;
      const q = mixSearchQuery.toLowerCase().trim();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      const matchType = (p.type || '').toLowerCase().includes(q);
      const matchNotes = (p.notes || []).some((n) => n.toLowerCase().includes(q));
      return matchName || matchBrand || matchType || matchNotes;
    });
  }, [products, mixCategoryFilter, mixSearchQuery]);

  // Swap first and second perfume components with 1 click
  const handleSwapFirstAndSecondMixComponents = () => {
    if (mixComponents.length < 2) return;
    setMixComponents((prev) => {
      if (prev.length < 2) return prev;
      const comp1 = { ...prev[0] };
      const comp2 = { ...prev[1] };
      return distributeOptimalMixGrams(
        [
          { ...comp2, harmonyRoleAr: 'العطر الأساسي الأول (70% - قلب التركيبة)' },
          { ...comp1, harmonyRoleAr: 'العطر المكمل الثاني (30% - تناغم وفوحان)' },
          ...prev.slice(2),
        ],
        mixBottle.essenceGrams || 15,
        mixDistributionMode,
        mixGoal
      );
    });
  };

  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerNameInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);
  const customerSectionRef = useRef<HTMLDivElement>(null);
  const quickActionsMenuRef = useRef<HTMLDivElement>(null);

  // Automatically close the Quick Actions circular menu when clicking/tapping anywhere outside it or pressing Escape
  useEffect(() => {
    if (!isQuickActionsMenuOpen) return;

    const handleOutsidePointerDown = (event: MouseEvent | TouchEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (quickActionsMenuRef.current && target && !quickActionsMenuRef.current.contains(target)) {
        setIsQuickActionsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsQuickActionsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuickActionsMenuOpen]);

  // Smart Focus & Pulse helper for Customer Name & WhatsApp Mobile inputs
  const focusMissingCustomerFieldSmartly = (customDelayMs = 110) => {
    setActiveCartDrawer('customer');
    setCustomerAlertDismissed(false);
    setIsCustomerFieldsPulsing(true);

    setTimeout(() => {
      customerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (!customerName.trim()) {
        customerNameInputRef.current?.focus();
        customerNameInputRef.current?.select();
      } else if (!customerPhone.trim()) {
        customerPhoneInputRef.current?.focus();
        customerPhoneInputRef.current?.select();
      } else {
        customerPhoneInputRef.current?.focus();
      }
    }, customDelayMs);
  };

  // Extract previous customers (merging customCustomers + salesHistory) for quick auto-complete & 1-click VIP selection
  const previousCustomers = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; ordersCount: number; totalSpent: number; bonusPoints: number; redeemedPoints: number }>();
    customCustomers.forEach(c => {
      const ph = (c.phone || '').trim();
      const nm = (c.name || '').trim() || 'عميل مميز';
      const key = ph || nm;
      if (!key) return;
      map.set(key, {
        phone: ph,
        name: nm,
        ordersCount: 0,
        totalSpent: 0,
        bonusPoints: c.bonusPoints || 0,
        redeemedPoints: c.redeemedPoints || 0,
      });
    });
    salesHistory.filter(isLiveProductionSale).forEach(s => {
      const ph = (s.customerPhone || '').trim();
      const nm = (s.customerName || '').trim();
      if (!ph && !nm) return;
      const key = ph || nm;
      const existing = map.get(key);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalSpent += s.totalPrice || 0;
        if (nm && (!existing.name || existing.name === 'عميل مميز' || existing.name === 'عميل محترم')) {
          existing.name = nm;
        }
        if (ph && !existing.phone) existing.phone = ph;
      } else {
        const matchedCustom = customCustomers.find(
          c => (ph && c.phone === ph) || (nm && c.name === nm)
        );
        map.set(key, {
          phone: ph,
          name: nm || 'عميل محترم',
          ordersCount: 1,
          totalSpent: s.totalPrice || 0,
          bonusPoints: matchedCustom?.bonusPoints || 0,
          redeemedPoints: matchedCustom?.redeemedPoints || 0,
        });
      }
    });
    return Array.from(map.values()).map(item => {
      const calc = calculateCustomerLoyaltyPoints({
        ordersCount: item.ordersCount,
        totalSpent: item.totalSpent,
        bonusPoints: item.bonusPoints,
        redeemedPoints: item.redeemedPoints,
        settings,
      });
      const totalGross = calc.earnedPointsFromSales + calc.bonusPoints;
      const tier =
        item.totalSpent >= 2500 || totalGross >= 250
          ? '💎 ماسي'
          : item.totalSpent >= 1000 || totalGross >= 100
          ? '👑 ذهبي'
          : item.totalSpent >= 400 || totalGross >= 40
          ? '🥈 فضي'
          : '🌟 ولاء';
      return {
        phone: item.phone,
        name: item.name,
        points: calc.netAvailablePoints,
        tier,
      };
    });
  }, [salesHistory, customCustomers, settings]);

  // Real-time time & season context
  const currentTimeInfo = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const hours = now.getHours();

    let currentSeason: Season = 'كل الفصول';
    if ([11, 12, 1, 2].includes(month)) currentSeason = 'شتاء';
    else if ([6, 7, 8].includes(month)) currentSeason = 'صيف';
    else if ([3, 4, 5].includes(month)) currentSeason = 'ربيع';
    else currentSeason = 'خريف';

    let timeLabel = 'صباحي منعش ☀️';
    if (hours >= 13 && hours < 17) {
      timeLabel = 'ظهيرة وعصر ⛅';
    } else if (hours >= 17 || hours < 5) {
      timeLabel = 'مساء وسهرات 🌙';
    }

    return { currentSeason, timeLabel, hours };
  }, []);

  // Sync selected bottle defaults when bottle size changes
  useEffect(() => {
    if (selectedBottle) {
      setEssenceGrams(selectedBottle.essenceGrams);
      setCustomPrice('');
    }
  }, [selectedBottle]);

  // Populate customer if navigated from Customers CRM
  useEffect(() => {
    if (preselectedCustomer) {
      setCustomerName(preselectedCustomer.name || '');
      setCustomerPhone(preselectedCustomer.phone || '');
      setRedeemedLoyaltyPoints(0);
      if (preselectedCustomer.autoRedeemLoyalty) {
        setAutoRedeemPending(true);
      }
      setActiveCartDrawer('customer');
      if (onClearPreselectedCustomer) onClearPreselectedCustomer();
    }
  }, [preselectedCustomer, onClearPreselectedCustomer]);

  // Unified Real-Time Customer Loyalty Engine when a customer phone or name is entered in POS
  const currentCustomerLoyaltyInfo = useMemo(() => {
    const cleanPhone = customerPhone.trim();
    const cleanName = customerName.trim();
    if (!cleanPhone && !cleanName) return null;

    const custSales = salesHistory.filter(s => {
      if (!isLiveProductionSale(s)) return false;
      if (cleanPhone && s.customerPhone && s.customerPhone.trim() === cleanPhone) return true;
      if (!cleanPhone && cleanName && s.customerName && s.customerName.trim() === cleanName) return true;
      return false;
    });

    const matchedCustom = customCustomers.find(c => {
      if (cleanPhone && c.phone && c.phone.trim() === cleanPhone) return true;
      if (cleanName && c.name && c.name.trim() === cleanName) return true;
      return false;
    });

    if (custSales.length === 0 && !matchedCustom) {
      return {
        isNewCustomer: true,
        name: cleanName || 'عميل جديد',
        phone: cleanPhone,
        visits: 0,
        totalSpent: 0,
        earnedPointsFromSales: 0,
        bonusPoints: 0,
        redeemedPoints: 0,
        netAvailablePoints: 0,
        cashValueAvailable: 0,
        totalCashValue: 0,
        tier: '🌟 عضو ولاء جديد',
        favoriteStyle: undefined,
      };
    }

    const totalSpent = custSales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const loyaltyCalc = calculateCustomerLoyaltyPoints({
      ordersCount: custSales.length,
      totalSpent,
      bonusPoints: matchedCustom?.bonusPoints || 0,
      redeemedPoints: matchedCustom?.redeemedPoints || 0,
      settings,
    });
    const earnedPointsFromSales = loyaltyCalc.earnedPointsFromSales || 0;
    const bonusPoints = loyaltyCalc.bonusPoints || 0;
    const redeemedPoints = loyaltyCalc.redeemedPoints || 0;
    const totalGrossPoints = earnedPointsFromSales + bonusPoints;
    const netAvailablePoints = loyaltyCalc.netAvailablePoints || 0;
    const cashValueAvailable = loyaltyCalc.pointsCashValue || 0;

    const tier =
      totalSpent >= 2500 || totalGrossPoints >= 250
        ? '💎 ماسي VIP'
        : totalSpent >= 1000 || totalGrossPoints >= 100
        ? '👑 ذهبي'
        : totalSpent >= 400 || totalGrossPoints >= 40
        ? '🥈 فضي'
        : '🌟 عضو ولاء';

    return {
      isNewCustomer: false,
      name: matchedCustom?.name || custSales[0]?.customerName || cleanName || 'عميل مميز',
      phone: matchedCustom?.phone || custSales[0]?.customerPhone || cleanPhone,
      visits: custSales.length,
      totalSpent,
      earnedPointsFromSales,
      bonusPoints,
      redeemedPoints,
      netAvailablePoints,
      cashValueAvailable,
      totalCashValue: cashValueAvailable,
      tier,
      favoriteStyle: matchedCustom?.favoriteStyle,
    };
  }, [customerPhone, customerName, salesHistory, customCustomers]);

  // Filter products by search and category
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Store open status from daily closure
  const isStoreOpen = currentClosure?.status === 'مفتوح';

  // Today's attendance record for Tarek / current user
  const activeEmployeeName = currentUser?.displayName?.replace(/\(.*?\)/g, '').trim() || 'طارق';
  const todayEmployeeAttendance = useMemo(() => {
    return attendanceRecords.find(r => r.date === todayIso && (r.employeeName === activeEmployeeName || r.employeeName === 'طارق'));
  }, [attendanceRecords, todayIso, activeEmployeeName]);

  const isEmployeeCheckedIn = Boolean(todayEmployeeAttendance?.openedStore);
  const isShiftReady = isStoreOpen && isEmployeeCheckedIn;

  // Products under minimum threshold (نواقص اليوم والحد الأدنى للمخزون)
  const todayShortageProducts = useMemo(() => {
    return products.filter(p => {
      const minThreshold = p.min_threshold_grams ?? 30;
      return p.stock_grams <= minThreshold;
    });
  }, [products]);

  // Today's sales list and revenue from successful sales
  const todaysSalesList = useMemo(() => {
    return (salesHistory || []).filter(s => s.date.startsWith(todayIso) && isLiveProductionSale(s));
  }, [salesHistory, todayIso]);

  const todaysSalesCount = todaysSalesList.length;
  const todaysSalesRevenue = useMemo(() => {
    return todaysSalesList.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
  }, [todaysSalesList]);

  // Daily fixed salary for Tarek (60 EGP) - unconditionally earned upon attendance/store opening!
  const dailyBaseSalary = useMemo(() => {
    const monthlySalary = settings.employeeBaseSalary || 1500;
    const workDays = settings.monthlyWorkDays || 25;
    return Math.round(monthlySalary / workDays);
  }, [settings.employeeBaseSalary, settings.monthlyWorkDays]);

  // Today's earned commission - ONLY and STRICTLY from successful sales!
  const todaysEarnedCommission = useMemo(() => {
    return todaysSalesList.reduce((sum, s) => {
      return sum + (s.commissionAmount || (s.totalPrice * ((settings.commissionRate || 5) / 100)));
    }, 0);
  }, [todaysSalesList, settings.commissionRate]);

  // Comprehensive "Start Work" (بدء العمل):
  // 1. Programmatically opens store
  // 2. Records attendance timestamp & vests base salary
  // 3. Verifies minimum stock threshold immediately
  // 4. Shows Today's Shortages alert on POS
  const handleStartWork = () => {
    const nowCairoTime = getCairoCurrentTimeString();
    const nowTimeOnly = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Step 1: Programmatically open the daily closure if not already opened
    if (onSaveClosure && (!currentClosure || currentClosure.status !== 'مفتوح')) {
      const newClosure: DailyClosure = {
        id: `close-${todayIso}`,
        date: todayIso,
        status: 'مفتوح',
        openedAt: nowCairoTime,
        openedBy: activeEmployeeName,
        openingCashBalance: currentClosure?.openingCashBalance ?? 0,
      };
      onSaveClosure(newClosure);

      if (onAddAuditLog) {
        onAddAuditLog({
          id: `audit-open-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: activeEmployeeName,
          action: 'بدء العمل وفتح المتجر',
          entityType: 'closure',
          entityId: newClosure.id,
          entityName: `يوم ${todayIso}`,
          oldValue: 'مغلق',
          newValue: 'مفتوح برمجياً',
          reason: 'بدء وردية العمل وتسجيل الحضور الآلي مع فحص النواقص لزيادة الإنتاجية',
          category: 'إغلاق_يومي',
        });
      }
    }

    // Step 2: Register official attendance and vest the daily base salary
    if (onCheckInAttendance) {
      const record: StaffAttendanceRecord = {
        id: `att-${currentUser?.username || 'tarek'}-${todayIso}`,
        employeeName: activeEmployeeName,
        date: todayIso,
        checkInTime: nowTimeOnly,
        openedStore: true,
        status: 'حاضر وفتح المتجر',
        dailyBaseSalary: dailyBaseSalary,
        isSalaryVested: true, // يستحق الراتب الأساسي (60 ج.م) بحضوره وفتح المتجر حتى لو لم تتم أي عملية بيع
        salesCount: todaysSalesCount,
        todaysSalesTotal: todaysSalesRevenue,
        earnedCommissions: todaysEarnedCommission,
        notes: 'تم بدء العمل وفتح المتجر برمجياً وتسجيل الحضور المعتمد مع فحص الحد الأدنى للمخزون'
      };
      onCheckInAttendance(record);
    }

    // Step 3 & 4: Instant stock threshold verification & open Today's Shortages alert
    setIsInitialShiftOpenAlert(true);
    setShowShortagesModal(true);
  };

  // Check-in handler alias
  const handleTarekShiftCheckIn = handleStartWork;

  // Immediate One-Tap "New Sale" Handler (فاتورة بيع جديدة فوراً)
  const handleQuickNewSale = () => {
    setCart([]);
    setOrderDiscount(0);
    setRedeemedLoyaltyPoints(0);
    setAutoRedeemPending(false);
    setCashTendered('');
    setCustomerName('');
    setCustomerPhone('');
    setPackagingId('basic_bag');
    setIsPackagingPaid(false);
    setActiveCartDrawer('none');
    setOwnerOverrideGranted(false);
    setSearchTerm('');
    localStorage.removeItem('lamsa_pos_active_cart_v2');
    localStorage.removeItem('lamsa_pos_active_customer_v2');
    localStorage.removeItem('lamsa_pos_active_mix_v2');
    setRestoredSessionNotice(null);
    setQuickSideFilter('all');
    setSelectedGender('all');
    setIsQuickActionsMenuOpen(false);
    setAddedItemFlash('✨ تم فتح وتجهيز فاتورة بيع جديدة فوراً');
    setTimeout(() => setAddedItemFlash(null), 2600);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
  };

  // Immediate One-Tap "Add Expense" Submit Handler
  const handleQuickExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(quickExpenseAmount);
    if (!quickExpenseTitle.trim() || !cleanAmount || cleanAmount <= 0) return;

    const newExpense: Expense = {
      id: `exp-pos-${Date.now()}`,
      title: quickExpenseTitle.trim(),
      amount: cleanAmount,
      category: quickExpenseCategory,
      date: todayIso,
      isRecurringMonthly: false,
      notes: quickExpenseNotes.trim()
        ? `${quickExpenseNotes.trim()} (سُجل من الكاشير بواسطة ${activeEmployeeName})`
        : `مصروف سريع من شاشة الكاشير بواسطة ${activeEmployeeName}`,
    };

    if (onAddExpense) {
      onAddExpense(newExpense);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-exp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: activeEmployeeName,
        action: 'تسجيل مصروف سريع من الكاشير',
        entityType: 'expense',
        entityId: newExpense.id,
        entityName: newExpense.title,
        oldValue: '0 ج.م',
        newValue: `${newExpense.amount} ${settings.currency} (${newExpense.category})`,
        reason: newExpense.notes || 'مصروف تشغيلي سريع',
      });
    }

    setAddedItemFlash(`💸 تم تسجيل مصروف: ${newExpense.title} (${newExpense.amount} ${settings.currency})`);
    setTimeout(() => setAddedItemFlash(null), 3200);
    setQuickExpenseTitle('');
    setQuickExpenseAmount('');
    setQuickExpenseCategory('مصاريف تشغيل');
    setQuickExpenseNotes('');
    setIsQuickExpenseModalOpen(false);
    setIsQuickActionsMenuOpen(false);
  };

  // Helper to check if a product matches a side filter category (صيفي، شتوي، نيش، مسك، عود، فرنسي)
  const checkMatchesSideFilter = (p: Product, filterKey: 'all' | 'صيفي' | 'شتوي' | 'نيش' | 'مسك' | 'عود' | 'فرنسي'): boolean => {
    if (filterKey === 'all') return true;
    if (filterKey === 'نيش') return p.type === 'نيش' || p.name.includes('نيش') || p.name.includes('بكرات') || p.name.includes('أفينتوس') || p.name.includes('توم فورد');
    if (filterKey === 'مسك') return p.type === 'مسك' || p.name.includes('مسك');
    if (filterKey === 'عود') return p.type === 'عود' || p.name.includes('عود');
    if (filterKey === 'فرنسي') return p.type === 'عادي';
    if (filterKey === 'صيفي') {
      return p.season === 'صيف' || p.season === 'ربيع' || (p.season === 'كل الفصول' && p.type === 'عادي');
    }
    if (filterKey === 'شتوي') {
      return p.season === 'شتاء' || p.season === 'خريف' || p.type === 'عود';
    }
    return true;
  };

  // Counts for Side Filter Menu badges
  const sideFilterCounts = useMemo(() => {
    return {
      all: products.length,
      صيفي: products.filter(p => checkMatchesSideFilter(p, 'صيفي')).length,
      شتوي: products.filter(p => checkMatchesSideFilter(p, 'شتوي')).length,
      نيش: products.filter(p => checkMatchesSideFilter(p, 'نيش')).length,
      مسك: products.filter(p => checkMatchesSideFilter(p, 'مسك')).length,
      عود: products.filter(p => checkMatchesSideFilter(p, 'عود')).length,
      فرنسي: products.filter(p => checkMatchesSideFilter(p, 'فرنسي')).length,
    };
  }, [products]);

  // Top brands directory for fast 1-click brand filtering in Cashier
  const topBrands = useMemo(() => {
    const brandCounts = new Map<string, number>();
    products.forEach((p) => {
      const b = (p.brand || '').trim();
      if (b && b !== 'عام') {
        brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
      }
    });
    return Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([brand, count]) => ({ brand, count }));
  }, [products]);

  // Hide default perfume lists unless search or a category/brand/gender filter is active
  const isCatalogueRevealed = useMemo(() => {
    return (
      searchTerm.trim().length > 0 ||
      quickSideFilter !== 'all' ||
      selectedGender !== 'all' ||
      selectedType !== 'all' ||
      selectedBrand !== 'all' ||
      showAllCatalogueExplicitly
    );
  }, [searchTerm, quickSideFilter, selectedGender, selectedType, selectedBrand, showAllCatalogueExplicitly]);

  const handleResetAndHideCatalogue = () => {
    setSearchTerm('');
    setQuickSideFilter('all');
    setSelectedGender('all');
    setSelectedType('all');
    setSelectedBrand('all');
    setShowAllCatalogueExplicitly(false);
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch = !term || 
        p.name.toLowerCase().includes(term) || 
        p.brand.toLowerCase().includes(term) || 
        p.origin.toLowerCase().includes(term);
      const matchType = selectedType === 'all' || p.type === selectedType;
      const matchGender = selectedGender === 'all' || p.gender === selectedGender;
      const matchBrand = selectedBrand === 'all' || (p.brand || '').trim().toLowerCase() === selectedBrand.toLowerCase();
      const matchSide = checkMatchesSideFilter(p, quickSideFilter);
      return matchSearch && matchType && matchGender && matchBrand && matchSide;
    });
  }, [products, searchTerm, selectedType, selectedGender, selectedBrand, quickSideFilter]);

  // Seasonal & Time Recommendations
  const recommendedPerfumes = useMemo(() => {
    return products
      .filter(p => p.stock_grams >= 50)
      .filter(p => {
        if (activeRecommendationFilter === 'summer') return p.season === 'صيف' || p.season === 'كل الفصول';
        if (activeRecommendationFilter === 'winter') return p.season === 'شتاء' || p.type === 'عود';
        if (activeRecommendationFilter === 'morning') return p.type === 'عادي' || p.type === 'مسك';
        if (activeRecommendationFilter === 'night') return p.type === 'عود' || p.season === 'شتاء';

        const seasonMatch = currentTimeInfo.currentSeason === 'صيف' 
          ? (p.season === 'صيف' || p.season === 'كل الفصول')
          : (p.season === 'شتاء' || p.type === 'عود');
        return seasonMatch;
      })
      .slice(0, 6);
  }, [products, activeRecommendationFilter, currentTimeInfo]);

  // Calculate pricing for currently configuring item based on official Commercial & Financial Reference
  const configPriceCheck = useMemo(() => {
    if (!configuringProduct || !selectedBottle) {
      return { price: 0, isColoredAllowed: false, coloredDisallowedReason: undefined };
    }
    return getApprovedSellingPrice({
      bottle: selectedBottle,
      perfumeType: configuringProduct.type,
      isColoredBottle: configIsColoredBottle,
    });
  }, [configuringProduct, selectedBottle, configIsColoredBottle]);

  const effectiveIsColored = Boolean(configIsColoredBottle && configPriceCheck.isColoredAllowed && !selectedBottle?.isRollOn);

  const configItemCost = useMemo(() => {
    if (!configuringProduct || !selectedBottle) return 0;
    return calculateDerivedProductCost({
      bottle: selectedBottle,
      perfumeType: configuringProduct.type,
      customEssenceGrams: essenceGrams,
      isColoredBottle: effectiveIsColored,
      customOilGramCost: customOilCostPerGram !== '' ? Number(customOilCostPerGram) : undefined,
      settings,
    });
  }, [configuringProduct, selectedBottle, essenceGrams, effectiveIsColored, customOilCostPerGram, settings]);

  const configItemSuggestedPrice = useMemo(() => {
    if (!configuringProduct || !selectedBottle) return 0;
    return configPriceCheck.price;
  }, [configuringProduct, selectedBottle, configPriceCheck]);

  const configItemFinalPrice = customPrice === '' ? configItemSuggestedPrice : Number(customPrice);
  // Roll-ons have 0% commission; spray bottles use rounded 5% commission per Section 10 of Reference
  const configItemCommission = selectedBottle.isRollOn ? 0 : Math.round(configItemFinalPrice * (settings.commissionRate || 0.05));
  const configItemNetProfit = configItemFinalPrice - configItemCost - configItemCommission;

  // Open config panel for product (uses seller's currently selected bottle size instead of locking to 50ml)
  const handleOpenConfig = (product: Product, preferredBottle?: BottleSize) => {
    setConfiguringProduct(product);
    const defBottle = preferredBottle || activeSellerBottle || bottleSizes[0] || DEFAULT_BOTTLE_SIZES[0];
    setSelectedBottle(defBottle);
    setCustomConfigSizeMl(isSellerCustomSizeMode && !preferredBottle ? defBottle.sizeMl : '');
    setEssenceGrams(defBottle.essenceGrams);
    setConfigQuantity(1);
    setConfigIsColoredBottle(false);
    setCustomPrice('');
    setCustomOilCostPerGram('');
    setRecipeModificationReason('');
    setShowPitchDrawer(false);
  };

  // Add configured item to cart (with specified quantity)
  const handleAddToCart = () => {
    if (!configuringProduct || !selectedBottle) return;

    const qty = Math.max(1, configQuantity || 1);
    const displayName = effectiveIsColored
      ? `${configuringProduct.name} (عبوة ملونة)`
      : configuringProduct.name;

    const newItem: CartItem = {
      cartItemId: `${configuringProduct.id}-${selectedBottle.id}-${effectiveIsColored ? 'col' : 'std'}-${Date.now()}`,
      id: Date.now().toString(),
      productId: configuringProduct.id,
      productName: displayName,
      productType: configuringProduct.type,
      bottleSize: selectedBottle.sizeMl,
      essenceGrams: essenceGrams,
      cost: configItemCost,
      sellingPrice: configItemFinalPrice,
      profit: configItemNetProfit,
      brand: configuringProduct.brand,
      originalStock: configuringProduct.stock_grams,
      quantity: qty,
      isRollOn: selectedBottle.isRollOn,
      isColoredBottle: effectiveIsColored,
    };

    setCart(prev => [newItem, ...prev]);
    setAddedItemFlash(`${displayName} (${selectedBottle.sizeMl} مل × ${qty})`);
    setTimeout(() => setAddedItemFlash(null), 3200);
    setConfiguringProduct(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      focusMissingCustomerFieldSmartly(140);
    }
  };

  // Quick 1-click add using seller's chosen bottle size (or any specific bottle clicked on card)
  const handleQuickAddWithBottle = (product: Product, targetBottle: BottleSize, e: React.MouseEvent) => {
    e.stopPropagation();
    const itemCost = calculateDerivedProductCost({
      bottle: targetBottle,
      perfumeType: product.type,
      settings,
    });
    const itemPrice = getApprovedSellingPrice({
      bottle: targetBottle,
      perfumeType: product.type,
      isColoredBottle: false,
    }).price;
    const comm = targetBottle.isRollOn ? 0 : Math.round(itemPrice * (settings.commissionRate || 0.05));
    const itemProfit = itemPrice - itemCost - comm;

    const newItem: CartItem = {
      cartItemId: `${product.id}-${targetBottle.id}-${Date.now()}`,
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      productType: product.type,
      bottleSize: targetBottle.sizeMl,
      essenceGrams: targetBottle.essenceGrams,
      cost: itemCost,
      sellingPrice: itemPrice,
      profit: itemProfit,
      brand: product.brand,
      originalStock: product.stock_grams,
      quantity: 1,
      isRollOn: targetBottle.isRollOn,
      isColoredBottle: false,
    };

    setCart(prev => [newItem, ...prev]);
    setAddedItemFlash(`${product.name} (${targetBottle.sizeMl} مل)`);
    setTimeout(() => setAddedItemFlash(null), 3200);

    if (!customerName.trim() || !customerPhone.trim()) {
      focusMissingCustomerFieldSmartly(100);
    }
  };

  // Quick 1-click add with seller's active size
  const handleQuickAddDefault = (product: Product, e: React.MouseEvent) => {
    handleQuickAddWithBottle(product, activeSellerBottle, e);
  };

  // ========================================================
  // MIX FORMULATION BOTTLE ACCOUNTING & SMART MIX ENGINE HANDLERS
  // ========================================================
  const canUserModifyMixManually = useMemo(() => {
    return (
      !currentUser ||
      currentUser.role === 'OWNER' ||
      currentUser.permissions?.canModifyStandardRecipe !== false
    );
  }, [currentUser]);

  const mixAccounting = useMemo(() => {
    return calculateMixBottleAccounting({
      bottle: mixBottle,
      components: mixComponents,
      isColoredBottle: mixIsColoredBottle,
      customSellingPrice: mixCustomPrice,
      settings,
    });
  }, [mixBottle, mixComponents, mixIsColoredBottle, mixCustomPrice, settings]);

  // تحليل الملف العطري للعطر الأساسي المختار (القاعدة 3 و 24 و 25)
  const primaryMixPerfumeProfile = useMemo<OlfactoryProfileAnalysis | null>(() => {
    if (compositionMode !== 'mix' || mixComponents.length === 0) return null;
    const firstProd = products.find((p) => String(p.id) === String(mixComponents[0].productId));
    if (!firstProd) return null;
    return analyzeSelectedPerfumeProfile({
      product: firstProd,
      fragranceDatabase,
      settings,
    });
  }, [compositionMode, mixComponents, products, fragranceDatabase, settings]);

  // بدائل العطر الثاني مرتبة حسب درجة التوافق (للتبديل السريع أو الاختيار)
  const secondComponentAlternatives = useMemo<SmartMixRecommendation[]>(() => {
    if (compositionMode !== 'mix' || mixComponents.length === 0) return [];
    const reqGrams = Math.max(1, Math.floor((mixBottle.essenceGrams || 15) * 0.3));
    return getSmartCompatibleMixRecommendations({
      selectedComponents: [mixComponents[0]],
      allProducts: products,
      fragranceDatabase,
      savedMixes,
      mixGoal,
      requiredMinGrams: reqGrams,
      settings,
    });
  }, [compositionMode, mixComponents, products, fragranceDatabase, savedMixes, mixGoal, mixBottle.essenceGrams, settings]);

  // توصيات العطر الثالث المكمل (عند وجود عطرين فقط، ويتوقف المحرك بعدها لمنع حلقة التوافقات اللانهائية)
  const thirdComponentRecommendations = useMemo<SmartMixRecommendation[]>(() => {
    if (compositionMode !== 'mix' || mixComponents.length < 2) return [];
    const reqGrams = Math.max(1, Math.round((mixBottle.essenceGrams || 15) * 0.1));
    return getSmartCompatibleMixRecommendations({
      selectedComponents: mixComponents.slice(0, 2),
      allProducts: products,
      fragranceDatabase,
      savedMixes,
      mixGoal,
      requiredMinGrams: reqGrams,
      settings,
    });
  }, [compositionMode, mixComponents, products, fragranceDatabase, savedMixes, mixGoal, mixBottle.essenceGrams, settings]);

  // Pre-filtered quick bottle sizes (20, 30, 50ml) to avoid filtering inside every product strip row
  const quickSprayBottles = useMemo(() => {
    return bottleSizes.filter((b) => [20, 30, 50].includes(b.sizeMl) && !b.isRollOn);
  }, [bottleSizes]);

  // القائمة النشطة للاقتراح التالي (فقط للعطر الثاني أو عند فتح لوحة العطر الثالث — بدون أي حلقة لا نهائية)
  const compatibleMixRecommendations = useMemo<SmartMixRecommendation[]>(() => {
    if (mixComponents.length === 1) return secondComponentAlternatives;
    if (mixComponents.length === 2) return thirdComponentRecommendations;
    return [];
  }, [mixComponents.length, secondComponentAlternatives, thirdComponentRecommendations]);

  // تغيير حجم زجاجة الميكس مع إعادة توزيع الجرامات القياسية الصحيحة للحجم الجديد فوراً
  const handleChangeMixBottleSize = (newBottle: BottleSize) => {
    setMixBottle(newBottle);
    if (newBottle.isRollOn) setMixIsColoredBottle(false);
    if ((newBottle.essenceGrams || 15) > 3) {
      setConscious10MlThreeCompConfirmed(false);
    }
    setMixComponents((prev) => {
      if (prev.length === 0) return prev;
      return distributeOptimalMixGrams(prev, newBottle.essenceGrams || 15, mixDistributionMode, mixGoal);
    });
  };

  // تغيير هدف الميكس مع إعادة تقييم وتوزيع الجرامات الصحيحة
  const handleChangeMixGoal = (newGoal: MixGoalType) => {
    setMixGoal(newGoal);
    setMixComponents((prev) => {
      if (prev.length === 0) return prev;
      return distributeOptimalMixGrams(prev, mixBottle.essenceGrams || 15, mixDistributionMode, newGoal);
    });
  };

  // إضافة عطر إلى الميكس (بمنطق ذكي محدود: عطران افتراضياً 70/30، وثالث اختياري 60/30/10 دون حلقة لا نهائية)
  const handleSelectAndAddMixPerfume = (targetPerfumeId?: number | string) => {
    const idToUse = targetPerfumeId !== undefined ? targetPerfumeId : selectedMixPerfumeId;
    if (!idToUse) return;
    const p = products.find((x) => String(x.id) === String(idToUse));
    if (!p) return;

    const targetBottleGrams = Math.max(1, Math.round(mixBottle.essenceGrams || 15));

    // في حجم 10 مل (3 جم زيت): لا يفضل ثلاثة مكونات إلا بقرار واعٍ
    if (mixComponents.length === 2 && targetBottleGrams <= 3 && !conscious10MlThreeCompConfirmed) {
      setShowThirdComponentPanel(true);
      return;
    }

    setMixComponents((prev) => {
      if (prev.some((c) => String(c.productId) === String(p.id))) {
        return distributeOptimalMixGrams(prev, targetBottleGrams, mixDistributionMode, mixGoal);
      }

      const customCost =
        p.customGramCostEgp !== undefined && p.customGramCostEgp > 0
          ? p.customGramCostEgp
          : undefined;

      // الحالة 1: اختيار العطر الأول في زجاجة فارغة -> يحلل ملفه ويقترح/يقرن أفضل عطر ثانٍ متوافق بنسبة 70% + 30% بأعداد صحيحة
      if (prev.length === 0) {
        const firstComp = {
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          productType: p.type,
          grams: targetBottleGrams,
          customOilGramCost: customCost,
          availableStockGrams: p.stock_grams,
          isAutoSelected: false,
          harmonyRoleAr: 'العطر الأساسي الأول (70% - قلب التركيبة)',
          harmonyReasonAr: 'العطر المختار من المستخدم كنقطة ارتكاز أساسية للميكس',
          compatibilityScore: 100,
          confidenceDegree: 'عالية' as const,
        };

        if (autoPairSecondPerfume) {
          const reqSecondGrams = Math.max(1, Math.floor(targetBottleGrams * 0.3));
          const secondRecs = getSmartCompatibleMixRecommendations({
            selectedComponents: [firstComp],
            allProducts: products,
            fragranceDatabase,
            savedMixes,
            mixGoal,
            requiredMinGrams: reqSecondGrams,
            settings,
          });
          const bestSecond = secondRecs[0];
          if (bestSecond) {
            const secondCustomCost =
              bestSecond.product.customGramCostEgp !== undefined &&
              bestSecond.product.customGramCostEgp > 0
                ? bestSecond.product.customGramCostEgp
                : undefined;
            const secondComp = {
              productId: bestSecond.product.id,
              productName: bestSecond.product.name,
              brand: bestSecond.product.brand,
              productType: bestSecond.product.type,
              grams: reqSecondGrams,
              customOilGramCost: secondCustomCost,
              availableStockGrams: bestSecond.product.stock_grams,
              isAutoSelected: true,
              harmonyRoleAr: bestSecond.harmonyRoleAr,
              harmonyReasonAr: bestSecond.harmonyReasonAr,
              compatibilityScore: bestSecond.compatibilityScore,
              confidenceDegree: bestSecond.confidenceDegree,
              replacedOutOfStockName: bestSecond.replacedOutOfStockName,
              isFromSavedLibrary: bestSecond.isFromSavedLibrary,
            };
            return distributeOptimalMixGrams(
              [firstComp, secondComp],
              targetBottleGrams,
              mixDistributionMode,
              mixGoal
            );
          }
        }
        return [firstComp];
      }

      // الحالة 2: إضافة العطر الثاني أو الثالث -> يعاد توزيع الجرامات بأعداد صحيحة (70/30 أو 60/30/10)
      const matchedRec = compatibleMixRecommendations.find(
        (r) => String(r.product.id) === String(p.id)
      );
      const stepNumber = prev.length + 1;
      const newComp = {
        productId: p.id,
        productName: p.name,
        brand: p.brand,
        productType: p.type,
        grams: 1,
        customOilGramCost: customCost,
        availableStockGrams: p.stock_grams,
        isAutoSelected: Boolean(matchedRec),
        harmonyRoleAr:
          matchedRec?.harmonyRoleAr ||
          (stepNumber === 2
            ? 'العطر الثاني المتوافق (30%)'
            : stepNumber === 3
            ? 'العطر الثالث المكمل والمثبت (10%)'
            : `المكون المخصص رقم ${stepNumber}`),
        harmonyReasonAr:
          matchedRec?.harmonyReasonAr ||
          'تم اختياره يدوياً من قبل المستخدم المصرح له',
        compatibilityScore: matchedRec?.compatibilityScore,
        confidenceDegree: matchedRec?.confidenceDegree || ('متوسطة' as const),
        replacedOutOfStockName: matchedRec?.replacedOutOfStockName,
        isFromSavedLibrary: matchedRec?.isFromSavedLibrary,
      };

      const nextList = [...prev, newComp];
      return distributeOptimalMixGrams(nextList, targetBottleGrams, mixDistributionMode, mixGoal);
    });

    setShowThirdComponentPanel(false);
    setSelectedMixPerfumeId('');
    setSelectedMixGrams('');
  };

  const handleAddMixComponent = () => {
    handleSelectAndAddMixPerfume(selectedMixPerfumeId);
  };

  // تبديل أي مكون داخل الزجاجة بعطر آخر أو بديل متوافق مع الحفاظ على التوزيع الصحيح للجرامات
  const handleReplaceMixComponentPerfume = (indexInMix: number, newProductId: number | string) => {
    const newProd = products.find((x) => String(x.id) === String(newProductId));
    if (!newProd) return;
    const targetBottleGrams = Math.max(1, Math.round(mixBottle.essenceGrams || 15));

    setMixComponents((prev) => {
      if (prev.some((c, idx) => idx !== indexInMix && String(c.productId) === String(newProd.id))) {
        return prev;
      }
      const matchedRec =
        indexInMix === 1
          ? secondComponentAlternatives.find((r) => String(r.product.id) === String(newProd.id))
          : indexInMix === 2
          ? thirdComponentRecommendations.find((r) => String(r.product.id) === String(newProd.id))
          : undefined;

      const updated = prev.map((c, idx) => {
        if (idx !== indexInMix) return c;
        return {
          ...c,
          productId: newProd.id,
          productName: newProd.name,
          brand: newProd.brand,
          productType: newProd.type,
          customOilGramCost:
            newProd.customGramCostEgp !== undefined && newProd.customGramCostEgp > 0
              ? newProd.customGramCostEgp
              : undefined,
          availableStockGrams: newProd.stock_grams,
          isAutoSelected: Boolean(matchedRec),
          harmonyRoleAr:
            matchedRec?.harmonyRoleAr ||
            (idx === 0
              ? 'العطر الأساسي الأول (70%)'
              : idx === 1
              ? 'العطر الثاني المتوافق (30%)'
              : 'العطر الثالث المكمل (10%)'),
          harmonyReasonAr: matchedRec?.harmonyReasonAr || 'تم تحديده من قبل المستخدم',
          compatibilityScore: matchedRec?.compatibilityScore,
          confidenceDegree: matchedRec?.confidenceDegree,
          replacedOutOfStockName: matchedRec?.replacedOutOfStockName,
          isFromSavedLibrary: matchedRec?.isFromSavedLibrary,
        };
      });
      return distributeOptimalMixGrams(updated, targetBottleGrams, mixDistributionMode, mixGoal);
    });
  };

  const handleRemoveMixComponent = (productId: number | string) => {
    const targetBottleGrams = Math.max(1, Math.round(mixBottle.essenceGrams || 15));
    setMixComponents((prev) => {
      const remaining = prev.filter((c) => String(c.productId) !== String(productId));
      if (remaining.length === 0) return [];
      return distributeOptimalMixGrams(remaining, targetBottleGrams, mixDistributionMode, mixGoal);
    });
  };

  // تعديل جرامات مكون يدوياً للمستخدم المصرح له بأعداد صحيحة فقط دون كسور مع الحفاظ على إجمالي جرامات الحجم دون زيادة أو نقص
  const handleUpdateMixComponentGrams = (productId: number | string, newGrams: number) => {
    if (!canUserModifyMixManually) return;
    const targetBottleGrams = Math.max(1, Math.round(mixBottle.essenceGrams || 15));
    const step = 1; // أعداد صحيحة فقط دون كسور (القاعدة 10)
    const maxAllowedForOne = Math.max(1, targetBottleGrams - Math.max(0, mixComponents.length - 1) * step);
    const clamped = Math.min(maxAllowedForOne, Math.max(1, Math.round(newGrams)));

    setMixComponents((prev) => {
      if (prev.length <= 1) {
        return prev.map((c) => ({ ...c, grams: targetBottleGrams }));
      }
      const others = prev.filter((c) => String(c.productId) !== String(productId));
      const remainingToDistribute = Math.max(
        others.length,
        Math.round(targetBottleGrams - clamped)
      );
      const redistributedOthers = distributeOptimalMixGrams(
        others,
        remainingToDistribute,
        mixDistributionMode,
        mixGoal
      );
      let otherIdx = 0;
      return prev.map((c) => {
        if (String(c.productId) === String(productId)) {
          return { ...c, grams: clamped };
        }
        const replacement = redistributedOthers[otherIdx++];
        return replacement || c;
      });
    });
  };

  // إعادة التوزيع الذكي الأمثل (70/30 لعطرين أو 60/30/10 لثلاثة بأعداد صحيحة)
  const handleOptimalMixProportions = () => {
    setMixDistributionMode('optimal');
    if (mixComponents.length === 0) return;
    const totalTargetGrams = Math.max(1, Math.round(mixBottle.essenceGrams || 15));
    setMixComponents((prev) => distributeOptimalMixGrams(prev, totalTargetGrams, 'optimal', mixGoal));
  };

  // توزيع بالتساوي بأعداد صحيحة مع تطابق إجمالي جرامات الحجم 100%
  const handleEqualizeMixProportions = () => {
    setMixDistributionMode('equal');
    if (mixComponents.length === 0) return;
    const totalTargetGrams = Math.max(1, Math.round(mixBottle.essenceGrams || 15));
    setMixComponents((prev) => distributeOptimalMixGrams(prev, totalTargetGrams, 'equal', mixGoal));
  };

  // حفظ التركيبة في «مكتبة تركيبات لمسة عطر» بعد اعتماد المالك مع كافة بيانات الأداء والاختبار
  const handleSaveCurrentMixAsFavorite = () => {
    if (mixComponents.length < 2 || !onSaveMix) return;
    const formulaName =
      mixFormulaName.trim() || `ميكس ${mixComponents.map((c) => c.productName).join(' + ')}`;
    const isOwner = !currentUser || currentUser.role === 'OWNER';
    const newFormula: SavedMixFormula = {
      id: `mix-${Date.now()}`,
      name: formulaName,
      bottleSizeMl: mixBottle.sizeMl,
      isRollOn: mixBottle.isRollOn,
      isColoredBottle: mixIsColoredBottle,
      components: mixAccounting.enrichedComponents,
      totalEssenceGrams: mixAccounting.totalEssenceGrams,
      sellingPrice: mixAccounting.finalSellingPriceEgp,
      totalCost: mixAccounting.unitBottleCostEgp,
      isOwnerApproved: isOwner,
      approvedBy: isOwner ? currentUser?.displayName || 'د. محمد (المالك)' : undefined,
      mixGoal,
      customerRating: libraryCustomerRating,
      testResult: libraryTestResult,
      longevityNotes: libraryLongevityNotes.trim() || 'ثبات ممتاز',
      sillageNotes: librarySillageNotes.trim() || 'فوحان متوازن',
      balanceNotes: libraryBalanceNotes.trim() || 'تناغم هرمي متزن',
      timesSold: 0,
      repurchaseRatePercent: 0,
      notes: `ثبات: ${libraryLongevityNotes} · فوحان: ${librarySillageNotes} · توازن: ${libraryBalanceNotes}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.displayName || 'د. محمد (المالك)',
    };
    onSaveMix(newFormula);
    setShowSaveLibraryModal(false);
    setAddedItemFlash(
      `تم حفظ تركيبة «${formulaName}» في مكتبة تركيبات لمسة عطر بنجاح`
    );
    setTimeout(() => setAddedItemFlash(null), 3200);
  };

  // استدعاء تركيبة من «مكتبة تركيبات لمسة عطر»
  const handleLoadSavedMixFormula = (f: SavedMixFormula) => {
    const matchedBottle =
      bottleSizes.find(
        (b) => b.sizeMl === f.bottleSizeMl && Boolean(b.isRollOn) === Boolean(f.isRollOn)
      ) || mixBottle;
    setMixBottle(matchedBottle);
    setMixIsColoredBottle(Boolean(f.isColoredBottle));
    setMixFormulaName(f.name);
    if (f.mixGoal) setMixGoal(f.mixGoal);
    setMixComponents(
      f.components.map((c, idx) => {
        const p = products.find((x) => String(x.id) === String(c.productId) || x.name === c.productName);
        return {
          productId: p?.id ?? c.productId,
          productName: c.productName,
          brand: c.brand || p?.brand || '',
          productType: c.productType || p?.type || 'عادي',
          grams: Math.max(1, Math.round(c.grams)),
          customOilGramCost: p?.customGramCostEgp,
          availableStockGrams: p?.stock_grams,
          isFromSavedLibrary: true,
          harmonyRoleAr: idx === 0 ? 'العطر الأساسي الأول' : `مكون معتمد بمكتبة لمسة عطر`,
          harmonyReasonAr: `محفوظ في مكتبة تركيبات لمسة عطر (${f.name})`,
          confidenceDegree: 'عالية',
        };
      })
    );
    setShowSavedMixesDrawer(false);
  };

  // اعتماد وإضافة الميكس كـ زجاجة واحدة إلى الفاتورة (القاعدة 22 و 23: يمنع الاعتماد إذا خالف حد التكلفة أو المساهمة الأدنى أو المخزون)
  const handleAddMixBottleToCart = () => {
    if (mixComponents.length === 0) return;
    if (!mixAccounting.canApproveMix) {
      return;
    }
    const qty = Math.max(1, configQuantity || 1);
    const displayName = mixFormulaName.trim()
      ? `ميكس: ${mixFormulaName.trim()} (${mixBottle.sizeMl} مل)`
      : `ميكس: ${mixComponents.map((c) => `${c.productName} ${c.grams}جم`).join(' + ')} (${mixBottle.sizeMl} مل)`;

    const newMixItem: CartItem = {
      cartItemId: `mix-${Date.now()}`,
      id: Date.now().toString(),
      productId: `mix-${Date.now()}`,
      productName: displayName,
      productType: mixAccounting.dominantType,
      bottleSize: mixBottle.sizeMl,
      essenceGrams: mixAccounting.totalEssenceGrams,
      cost: mixAccounting.unitBottleCostEgp,
      sellingPrice: mixAccounting.finalSellingPriceEgp,
      profit: mixAccounting.netContributionEgp,
      brand: 'ميكس لمسة عطر',
      originalStock: 999,
      quantity: qty,
      isRollOn: mixBottle.isRollOn,
      isColoredBottle: mixIsColoredBottle,
      isMix: true,
      compositionType: 'mix',
      customFormulaName: mixFormulaName.trim() || undefined,
      mixComponents: mixAccounting.enrichedComponents,
    };

    setCart((prev) => [newMixItem, ...prev]);
    setAddedItemFlash(
      `تم اعتماد وإضافة زجاجة الميكس (${mixBottle.sizeMl} مل · ${mixAccounting.totalEssenceGrams} جم زيت) إلى الفاتورة`
    );
    setTimeout(() => setAddedItemFlash(null), 3200);

    if (!customerName.trim() || !customerPhone.trim()) {
      focusMissingCustomerFieldSmartly(100);
    }
  };

  // Update item quantity in cart
  const handleUpdateItemQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(cartItemId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item
    ));
  };

  // Remove item from cart
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  // Change bottle size of item in cart
  const handleChangeCartItemBottle = (cartItemId: string, newBottle: BottleSize) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;
      const priceCheck = getApprovedSellingPrice({
        bottle: newBottle,
        perfumeType: item.productType,
        isColoredBottle: item.isColoredBottle,
      });
      const stillColored = Boolean(item.isColoredBottle && priceCheck.isColoredAllowed && !newBottle.isRollOn);
      const newCost = calculateDerivedProductCost({
        bottle: newBottle,
        perfumeType: item.productType,
        isColoredBottle: stillColored,
        settings,
      });
      const newPrice = stillColored
        ? priceCheck.price
        : getApprovedSellingPrice({ bottle: newBottle, perfumeType: item.productType, isColoredBottle: false }).price;
      const comm = newBottle.isRollOn ? 0 : Math.round(newPrice * (settings.commissionRate || 0.05));
      const baseName = item.productName.replace(/\s*\(عبوة ملونة\)\s*$/, '');
      return {
        ...item,
        productName: stillColored ? `${baseName} (عبوة ملونة)` : baseName,
        bottleSize: newBottle.sizeMl,
        essenceGrams: newBottle.essenceGrams,
        cost: newCost,
        sellingPrice: newPrice,
        profit: newPrice - newCost - comm,
        isRollOn: newBottle.isRollOn,
        isColoredBottle: stillColored,
      };
    }));
  };

  // Packaging selection calculation (Section 8: التغليف)
  const packagingAccounting = useMemo(() => {
    return calculatePackagingAccounting({
      packagingId,
      isPaidByCustomer: isPackagingPaid,
      hasCartItems: cart.length > 0,
    });
  }, [packagingId, isPackagingPaid, cart.length]);

  const selectedPackaging = packagingAccounting.option;
  const packagingCostTotal = packagingAccounting.extraStoreCostEgp;
  const packagingPriceTotal = packagingAccounting.independentPackagingRevenueEgp;

  // Cart totals calculations (multiplied by quantities)
  const cartItemsSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.sellingPrice * (item.quantity || 1)), 0);
  }, [cart]);

  const cartSubtotal = cartItemsSubtotal + (cart.length > 0 ? packagingPriceTotal : 0);

  const cartTotalCost = useMemo(() => {
    const itemsCost = cart.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0);
    return itemsCost + (cart.length > 0 ? packagingCostTotal : 0);
  }, [cart, packagingCostTotal]);

  // §47 & §48: Loyalty Points Engine (10 EGP = 1 point, 1 point = 0.10 EGP, 100 points = 10 EGP, Min Redeem = 50 points = 5 EGP, Min Safe Contribution = 10 EGP)
  const effectiveCashPerPoint = Math.max(0.05, Number(settings.loyaltyCashPerPointEgp) || 0.10);
  const isLoyaltyEngineEnabled = settings.loyaltyEnabled !== false;

  const loyaltyDiscountAmount = useMemo(() => {
    if (!isLoyaltyEngineEnabled || redeemedLoyaltyPoints <= 0) return 0;
    return Math.round(redeemedLoyaltyPoints * effectiveCashPerPoint);
  }, [isLoyaltyEngineEnabled, redeemedLoyaltyPoints, effectiveCashPerPoint]);

  const totalAppliedDiscount = orderDiscount + loyaltyDiscountAmount;
  const cartFinalTotal = Math.max(0, cartSubtotal - totalAppliedDiscount);

  // AI Profit-Guard Safe Loyalty Redemption Cap
  const safeLoyaltyCalc = useMemo(() => {
    const isRollOnly = cart.length > 0 && cart.every(it => it.isRollOn);
    return calculateSafeLoyaltyRedemption({
      billSubtotal: cartSubtotal,
      billTotalCost: cartTotalCost,
      commissionRate: settings.commissionRate || 0.05,
      isRollOnOnly: isRollOnly,
      manualDiscount: orderDiscount,
      customerAvailablePoints: currentCustomerLoyaltyInfo?.netAvailablePoints || 0,
      settings,
      todayNetContribution: todaysGrossProfit,
      dailyBreakEvenTarget: dailyCoveredExpense || 600,
    });
  }, [cart, cartSubtotal, cartTotalCost, settings, orderDiscount, currentCustomerLoyaltyInfo, todaysGrossProfit, dailyCoveredExpense]);

  const optimalLoyaltyRedemption = useMemo(() => {
    if (!isLoyaltyEngineEnabled || !currentCustomerLoyaltyInfo || currentCustomerLoyaltyInfo.netAvailablePoints <= 0) {
      return { points: 0, cashDiscount: 0 };
    }
    if (cart.length === 0) {
      return {
        points: currentCustomerLoyaltyInfo.netAvailablePoints,
        cashDiscount: currentCustomerLoyaltyInfo.cashValueAvailable,
      };
    }
    return {
      points: safeLoyaltyCalc.maxRedeemablePoints,
      cashDiscount: safeLoyaltyCalc.maxSafeLoyaltyDiscountEgp,
    };
  }, [isLoyaltyEngineEnabled, currentCustomerLoyaltyInfo, cart.length, safeLoyaltyCalc]);

  // Clamp redeemed points if customer changes or cart shrinks or loyalty is disabled
  useEffect(() => {
    if (!isLoyaltyEngineEnabled || !currentCustomerLoyaltyInfo) {
      if (redeemedLoyaltyPoints !== 0) setRedeemedLoyaltyPoints(0);
      return;
    }
    if (redeemedLoyaltyPoints > currentCustomerLoyaltyInfo.netAvailablePoints) {
      setRedeemedLoyaltyPoints(currentCustomerLoyaltyInfo.netAvailablePoints);
    }
    if (cart.length > 0 && safeLoyaltyCalc.maxRedeemablePoints >= 0 && redeemedLoyaltyPoints > safeLoyaltyCalc.maxRedeemablePoints) {
      setRedeemedLoyaltyPoints(safeLoyaltyCalc.maxRedeemablePoints);
    }
  }, [isLoyaltyEngineEnabled, currentCustomerLoyaltyInfo, redeemedLoyaltyPoints, cart.length, safeLoyaltyCalc.maxRedeemablePoints]);

  // Auto-apply loyalty discount if navigated from CRM with autoRedeemLoyalty
  useEffect(() => {
    if (autoRedeemPending && isLoyaltyEngineEnabled && currentCustomerLoyaltyInfo && cart.length > 0 && optimalLoyaltyRedemption.points > 0) {
      setRedeemedLoyaltyPoints(optimalLoyaltyRedemption.points);
      setAutoRedeemPending(false);
    }
  }, [autoRedeemPending, isLoyaltyEngineEnabled, currentCustomerLoyaltyInfo, cart.length, optimalLoyaltyRedemption]);

  // Points earned from current invoice & projected customer balance after sale
  const pointsEarnedThisSale = useMemo(() => {
    if (!isLoyaltyEngineEnabled || cart.length === 0) return 0;
    return safeLoyaltyCalc.pointsEarnedOnNetBill(cartFinalTotal);
  }, [isLoyaltyEngineEnabled, cart.length, safeLoyaltyCalc, cartFinalTotal]);

  const projectedCustomerLoyaltyBalance = useMemo(() => {
    const baseAvail = currentCustomerLoyaltyInfo ? currentCustomerLoyaltyInfo.netAvailablePoints : 0;
    return Math.max(0, baseAvail - redeemedLoyaltyPoints) + pointsEarnedThisSale;
  }, [currentCustomerLoyaltyInfo, redeemedLoyaltyPoints, pointsEarnedThisSale]);

  // One-click handler to convert points to instant cash discount within safe profit bounds
  const handleOneClickLoyaltyRedeem = (customPts?: number) => {
    if (!isLoyaltyEngineEnabled || !currentCustomerLoyaltyInfo || currentCustomerLoyaltyInfo.netAvailablePoints <= 0) return;
    const maxSafePts = cart.length > 0 ? safeLoyaltyCalc.maxRedeemablePoints : currentCustomerLoyaltyInfo.netAvailablePoints;
    const targetPts = customPts !== undefined ? customPts : maxSafePts;
    if (targetPts <= 0) return;
    const clampedPts = Math.min(currentCustomerLoyaltyInfo.netAvailablePoints, maxSafePts > 0 ? maxSafePts : targetPts, targetPts);
    setRedeemedLoyaltyPoints(clampedPts);
  };

  // §27: Non-Retroactive Tiered Commission (First 10 spray bottles today = 5%, 11th+ spray bottle = 7%, Roll-ons = 0%, Exception/Non-normal = 0%)
  const priorSprayBottlesSoldToday = useMemo(() => {
    return todaysSalesList.reduce((acc, s) => {
      if (s.isReversed || (s.transactionType && s.transactionType !== 'بيع_طبيعي')) return acc;
      const spraysInSale = (s.items || []).reduce((itemAcc, it) => {
        if (it.isRollOn || [2, 3, 5].includes(it.bottleSize)) return itemAcc;
        return itemAcc + (it.quantity || 1);
      }, 0);
      return acc + spraysInSale;
    }, 0);
  }, [todaysSalesList]);

  const tieredCommissionResult = useMemo(() => {
    const discountRatio = cartSubtotal > 0 ? Math.max(0, cartFinalTotal / cartSubtotal) : 1;
    const mappedItems = cart.map((item) => ({
      netUnitSellingPrice: Math.round(item.sellingPrice * discountRatio),
      quantity: item.quantity || 1,
      isRollOn: Boolean(item.isRollOn),
    }));
    const mappedTxType = ownerOverrideGranted
      ? ownerExceptionReason === 'هدية'
        ? 'هدية'
        : ownerExceptionReason === 'تعويض عميل'
        ? 'تعويض'
        : ownerExceptionReason === 'تصفية'
        ? 'تصفية'
        : ownerExceptionReason === 'تالف'
        ? 'إتلاف'
        : 'تصفية'
      : 'بيع_طبيعي';
    return calculateNonRetroactiveTieredCommission({
      items: mappedItems,
      priorSprayBottlesSoldToday,
      transactionType: mappedTxType,
      baseRate: settings.commissionRate || 0.05,
      tieredRate: settings.tieredCommissionRate || 0.07,
      tierThreshold: settings.tieredCommissionBottleThreshold || 10,
    });
  }, [
    cart,
    cartSubtotal,
    cartFinalTotal,
    priorSprayBottlesSoldToday,
    ownerOverrideGranted,
    ownerExceptionReason,
    settings.commissionRate,
    settings.tieredCommissionRate,
    settings.tieredCommissionBottleThreshold,
  ]);

  const cartTotalCommission = tieredCommissionResult.totalCommissionEgp;

  const cartTotalNetProfit = useMemo(() => {
    return cartFinalTotal - cartTotalCost - cartTotalCommission;
  }, [cartFinalTotal, cartTotalCost, cartTotalCommission]);

  // §28–§31: Strict Hard Minimum Price & 10 EGP Contribution Floor
  const isAllRollOnCart = cart.length > 0 && cart.every((i) => i.isRollOn);
  const strictSaleSafety = useMemo(() => {
    return validateStrictSaleSafety({
      grossPrice: cartSubtotal,
      discountAmount: orderDiscount,
      loyaltyDiscountAmount,
      productCost: cartTotalCost,
      commissionAmount: cartTotalCommission,
      commissionRateForMinCalc: settings.commissionRate || 0.05,
      isRollOnOnly: isAllRollOnCart,
      transactionType: ownerOverrideGranted ? 'تصفية' : 'بيع_طبيعي',
      hasOwnerExceptionApproval: ownerOverrideGranted,
      exceptionReason: ownerOverrideGranted ? `${ownerExceptionReason}: ${ownerExceptionNotes || 'معتمد'}` : undefined,
    });
  }, [
    cartSubtotal,
    orderDiscount,
    loyaltyDiscountAmount,
    cartTotalCost,
    cartTotalCommission,
    settings.commissionRate,
    isAllRollOnCart,
    ownerOverrideGranted,
    ownerExceptionReason,
    ownerExceptionNotes,
  ]);

  const cartMinSafeNetPrice = strictSaleSafety.minSafeNetSellingPrice;
  const cartMaxSafeDiscount = strictSaleSafety.maxAllowedTotalDiscount;

  // Hard Rule Check (§28–§31): Block any normal sale where net selling price <= cost OR net contribution < 10 EGP
  const isCartBelowCost = !strictSaleSafety.isAllowed && cart.length > 0;
  const isDiscountBeyondSafeLimit = totalAppliedDiscount > cartMaxSafeDiscount && cart.length > 0;

  const cartTotalGrams = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.essenceGrams * (item.quantity || 1)), 0);
  }, [cart]);

  const cartTotalBottles = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cart]);

  // Cash change calculation
  const cashChange = useMemo(() => {
    if (paymentMethod !== 'نقدي' || cashTendered === '') return 0;
    return Math.max(0, Number(cashTendered) - cartFinalTotal);
  }, [paymentMethod, cashTendered, cartFinalTotal]);

  // Autocomplete phone suggestions
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    if (val.trim().length >= 3) {
      const filtered = previousCustomers.filter(c => c.phone.includes(val.trim()));
      setPhoneSuggestions(filtered.slice(0, 4));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectCustomer = (c: { phone: string; name: string }) => {
    setCustomerPhone(c.phone);
    setCustomerName(c.name);
    setShowSuggestions(false);
  };

  // Final checkout confirmation with pre-sale verification
  const handleConfirmOrder = () => {
    if (cart.length === 0) return;

    // Hard Rule 16 Check: Block selling below cost unless Owner override granted
    if (isCartBelowCost && !ownerOverrideGranted) {
      setOwnerExceptionModalOpen(true);
      return;
    }

    const newSale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: cart.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productType: item.productType,
        bottleSize: item.bottleSize,
        essenceGrams: item.essenceGrams * (item.quantity || 1),
        cost: item.cost * (item.quantity || 1),
        sellingPrice: item.sellingPrice * (item.quantity || 1),
        profit: item.profit * (item.quantity || 1),
        quantity: item.quantity || 1,
        isColoredBottle: item.isColoredBottle,
        isRollOn: item.isRollOn,
        isMix: Boolean(item.isMix),
        compositionType: item.compositionType || (item.isMix ? 'ميكس' : 'عطر فردي'),
        mixComponents: item.mixComponents,
        customFormulaName: item.customFormulaName,
      })),
      totalPrice: cartFinalTotal,
      totalCost: cartTotalCost,
      totalProfit: cartTotalNetProfit,
      ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
      ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
      paymentMethod,
      ...(totalAppliedDiscount > 0 ? { discount: totalAppliedDiscount } : {}),
      ...(redeemedLoyaltyPoints > 0 ? { loyaltyPointsRedeemed: redeemedLoyaltyPoints } : {}),
      ...(loyaltyDiscountAmount > 0 ? { loyaltyDiscountAmount } : {}),
      ...(pointsEarnedThisSale > 0 ? { loyaltyPointsEarned: pointsEarnedThisSale } : {}),
      ...((customerName.trim() || customerPhone.trim())
        ? { customerLoyaltyBalanceAfter: projectedCustomerLoyaltyBalance }
        : {}),
      packagingOptionId: packagingId,
      ...(packagingAccounting.independentPackagingRevenueEgp > 0
        ? { packagingRevenueEgp: packagingAccounting.independentPackagingRevenueEgp }
        : {}),
      ...(packagingAccounting.grossLuxuryCostEgp > 0
        ? { packagingCostEgp: packagingAccounting.grossLuxuryCostEgp }
        : {}),
      ...(packagingAccounting.replacesBasicBag
        ? { isBasicBagReplacedByLuxury: true }
        : {}),
      commissionAmount: cartTotalCommission,
      totalCommission: cartTotalCommission,
      transactionType: ownerOverrideGranted
        ? ownerExceptionReason === 'هدية'
          ? 'هدية'
          : ownerExceptionReason === 'تعويض عميل'
          ? 'تعويض'
          : ownerExceptionReason === 'تصفية'
          ? 'تصفية'
          : ownerExceptionReason === 'تالف'
          ? 'إتلاف'
          : 'تصفية'
        : 'بيع_طبيعي',
      ...(ownerOverrideGranted
        ? {
            exceptionApprovedBy: 'د. محمد (المالك)',
            exceptionReason: `${ownerExceptionReason} - ${ownerExceptionNotes}`,
          }
        : {}),
      employeeName: currentUser?.displayName || 'طارق',
      source: 'المتجر',
      notes: ownerOverrideGranted 
        ? `[استثناء معتمد من المالك: ${ownerExceptionReason}] ${ownerExceptionNotes}` 
        : [
            packagingId !== 'basic_bag' ? packagingAccounting.accountingNote : '',
            redeemedLoyaltyPoints > 0 ? `خصم نقاط ولاء فوري: -${loyaltyDiscountAmount} ج.م (${redeemedLoyaltyPoints} نقطة)` : ''
          ].filter(Boolean).join(' · ') || undefined
    };

    onCompleteSale(newSale);

    // If an owner override was granted, register in Audit Log
    if (ownerOverrideGranted && onAddAuditLog) {
      onAddAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'د. محمد (المالك)',
        action: 'تجاوز حد التكلفة',
        entityType: 'sale',
        entityId: newSale.id,
        entityName: `فاتورة بيع #${newSale.id.slice(-5)}`,
        oldValue: `تكلفة: ${cartTotalCost} ج.م`,
        newValue: `بيع: ${cartFinalTotal} ج.م (أقل من التكلفة)`,
        reason: `استثناء مصرح: ${ownerExceptionReason} - ${ownerExceptionNotes}`,
        approvedBy: 'د. محمد (المالك)'
      });
    }

    if (!navigator.onLine) {
      try {
        enqueueOfflineAction('sale', newSale);
      } catch (e) {
        console.warn('Could not enqueue offline sale:', e);
      }
    }

    localStorage.removeItem('lamsa_pos_active_cart_v2');
    localStorage.removeItem('lamsa_pos_active_customer_v2');
    localStorage.removeItem('lamsa_pos_active_mix_v2');
    setRestoredSessionNotice(null);

    setCompletedSale(newSale);

    // Reset cashier cart for next transaction
    setCart([]);
    setOrderDiscount(0);
    setDiscountPercentInput('');
    setRedeemedLoyaltyPoints(0);
    setAutoRedeemPending(false);
    setCashTendered('');
    setCustomerName('');
    setCustomerPhone('');
    setOwnerOverrideGranted(false);
    setOwnerPasswordInput('');
    setOwnerExceptionNotes('');
  };

  // Up-sell suggestion when configuring product
  const upsellSuggestion = useMemo(() => {
    if (!selectedBottle || !configuringProduct) return null;
    const largerBottles = bottleSizes.filter(b => b.sizeMl > selectedBottle.sizeMl && !b.isRollOn);
    if (largerBottles.length === 0) return null;
    const nextBottle = largerBottles[largerBottles.length - 1];
    const isSpecialType = ['عود', 'مسك'].includes(configuringProduct.type);
    const nextPrice = isSpecialType ? (nextBottle.specialPrice || 350) : (nextBottle.normalPrice || 170);
    const nextCost = nextBottle.officialCost || 115;
    const nextComm = nextPrice * 0.05;
    const nextProfit = nextPrice - nextCost - nextComm;
    const extraProfit = nextProfit - configItemNetProfit;

    return {
      bottle: nextBottle,
      nextSize: nextBottle.sizeMl,
      nextPrice,
      extraProfit: Math.max(0, extraProfit),
    };
  }, [selectedBottle, configuringProduct, configItemNetProfit, bottleSizes]);

  return (
    <div className="p-3 sm:p-4 lg:p-5 max-w-[1440px] mx-auto space-y-3.5 pb-16 md:pb-10 animate-in fade-in duration-150">
      
      {/* ======================================================== */}
      {/* EXECUTIVE POS COMMAND BAR (Single-Elevation Contract)    */}
      {/* ======================================================== */}
      <header className="rounded-2xl px-4 py-3 border border-slate-200/90 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
        {/* Zone 1: Brand Identity & Active Cashier Context */}
        <div className="flex items-center gap-3 min-w-0">
          <img 
            src={settings.logoUrl || "https://l.top4top.io/p_31142jfec0.png"} 
            alt={settings.storeName} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 object-contain bg-slate-50 rounded-xl p-1 border border-slate-200/80 shrink-0" 
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                {settings.storeName}
              </h1>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-xs font-semibold text-[#9A6E23] hidden sm:inline truncate">
                محطة الكاشير والتركيب الفوري
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
              <span>
                الكاشير المناوب:{' '}
                <strong className="text-slate-900">{currentUser?.displayName?.replace(/\(.*?\)/g, '').trim() || 'طارق'}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>{currentTimeInfo.timeLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold">مزامنة فورية نشطة</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Quick Shift & Operations Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {!isShiftReady ? (
            <button
              type="button"
              onClick={handleStartWork}
              className="px-3.5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play size={13} className="fill-white" />
              <span>بدء العمل وفتح الوردية</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsInitialShiftOpenAlert(false);
                setShowShortagesModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span className="tabular-nums">الوردية مفتوحة ({todayEmployeeAttendance?.checkInTime || 'الآن'})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsQuickExpenseModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="تسجيل مصروف تشغيلي سريع من شاشة الكاشير"
          >
            <DollarSign size={13} className="text-amber-600" />
            <span>+ مصروف سريع</span>
          </button>

          {onNavigateToCustomers && (
            <button
              type="button"
              onClick={onNavigateToCustomers}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="فتح قسم العملاء وملفاتهم التفصيلية ونقاط الولاء"
            >
              <Users size={13} className="text-[#9A6E23]" />
              <span className="tabular-nums">العملاء ({previousCustomers.length})</span>
            </button>
          )}

          {onNavigateToInvoices && (
            <button
              type="button"
              onClick={onNavigateToInvoices}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="فتح سجل المبيعات والفواتير والتحكم الكامل"
            >
              <Receipt size={13} className="text-[#0071E3]" />
              <span className="tabular-nums">الفواتير ({salesHistory.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickNewSale}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="بدء وتصفير فاتورة بيع جديدة فوراً"
          >
            <RotateCcw size={12} className="text-amber-300" />
            <span>فاتورة جديدة</span>
          </button>
        </div>
      </header>

      {/* Offline Mode Reassurance Banner */}
      {!isNetworkOnline && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold apple-glass shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <WifiOff size={18} className="text-amber-700 shrink-0" />
            <span>
              ⚡ وضع العمل دون إنترنت (Offline Mode) مفعّل: جميع عمليات البيع والتركيب تُحفظ محلياً بأمان 100% وتتم المزامنة التلقائية فور عودة الاتصال.
            </span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-600/20 text-amber-950 font-black shrink-0 self-start sm:self-auto">
            محمي ومحفوظ محلياً ✓
          </span>
        </div>
      )}

      {/* Restored Session Draft Banner */}
      {restoredSessionNotice && (
        <div className="p-3.5 rounded-2xl bg-[#0071E3]/10 border border-[#0071E3]/30 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold apple-glass shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <RotateCcw size={17} className="text-[#0071E3] shrink-0" />
            <span>{restoredSessionNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setRestoredSessionNotice(null)}
              className="px-3 py-1.5 rounded-xl bg-[#0071E3] text-white hover:bg-[#0077ED] text-[11px] font-black transition-colors cursor-pointer"
            >
              متابعة العمليات
            </button>
            <button
              type="button"
              onClick={handleQuickNewSale}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
            >
              مسح والبدء من جديد
            </button>
          </div>
        </div>
      )}

      {/* Closed Day Warning Banner */}
      {currentClosure?.status === 'مغلق' && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-rose-900 font-medium">
            <Lock size={18} className="text-rose-600 shrink-0" />
            <span>
              <strong>وردية اليوم مغلقة ومقفلة:</strong> تم إغلاق حسابات اليوم رسمياً من قبل ({currentClosure.closedBy || 'الإدارة'}). تم تجميد التعديلات لحماية الدفاتر المحاسبية.
            </span>
          </div>
          {onOpenDayOperations && (
            <button
              onClick={onOpenDayOperations}
              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shrink-0 hover:bg-rose-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              عرض محضر الإغلاق / إعادة فتح
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. LIVE DAILY PERFORMANCE & PRICE REFERENCE BAR          */}
      {/* ======================================================== */}
      <POSQuickPerformanceBar
        todaysSalesList={todaysSalesList}
        todaysGrossProfit={todaysGrossProfit}
        dailyCoveredExpense={dailyCoveredExpense}
        settings={settings}
        currentUser={currentUser}
        isShiftReady={isShiftReady}
        todayEmployeeAttendance={todayEmployeeAttendance}
        dailyBaseSalary={dailyBaseSalary}
        todaysEarnedCommission={todaysEarnedCommission}
        todayShortageCount={todayShortageProducts.length}
        onStartWork={handleStartWork}
        onOpenShortages={() => {
          setIsInitialShiftOpenAlert(false);
          setShowShortagesModal(true);
        }}
        onOpenSmartSearch={() => setShowSmartSearchModal(true)}
      />

      {/* Top Item Added Toast Notification */}
      {addedItemFlash && (
        <div className="fixed top-3.5 left-1/2 -translate-x-1/2 z-[155] w-[94vw] max-w-lg px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-emerald-400/35 text-white text-xs font-bold shadow-xl space-y-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div className="min-w-0">
                <span className="font-black text-white block truncate">تمت الإضافة إلى الفاتورة: {addedItemFlash}</span>
                <span className="text-[11px] text-emerald-300 block truncate">
                  {(!customerName.trim() || !customerPhone.trim())
                    ? 'تذكير: أدخل اسم العميل ورقم واتساب في أعلى الفاتورة لحفظ نقاط ولائه'
                    : `مربوط بالعميل: ${customerName} (${customerPhone})`}
                </span>
              </div>
            </div>
            {(!customerName.trim() || !customerPhone.trim()) ? (
              <button
                type="button"
                onClick={() => focusMissingCustomerFieldSmartly(30)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black shrink-0 cursor-pointer whitespace-nowrap"
              >
                بيانات العميل
              </button>
            ) : (
              <span className="text-[10px] font-mono tabular-nums bg-white/10 px-2 py-1 rounded-lg shrink-0">
                السلة: {cart.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2-COLUMN ASYMMETRIC POS WORKSPACE (Catalogue 7, Terminal 5)*/}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start relative">
        
        {/* ======================================================== */}
        {/* MAIN CATALOGUE & MIX STUDIO WORKSPACE (7 cols)           */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-3.5">
          
          {/* ======================================================== */}
          {/* UNIFIED COMPOSITION MODE & LIBRARY DOCK                  */}
          {/* ======================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setCompositionMode('single')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  compositionMode === 'single'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles size={13} className={compositionMode === 'single' ? 'text-amber-300' : 'text-slate-400'} />
                <span>كتالوج العطور الفردية</span>
              </button>
              <button
                type="button"
                onClick={() => setCompositionMode('mix')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  compositionMode === 'mix'
                    ? 'bg-[#0071E3] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#0071E3]'
                }`}
              >
                <Beaker size={13} />
                <span>استوديو الميكس الذكي (زجاجة مركبة)</span>
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              {savedMixes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCompositionMode('mix');
                    setShowSavedMixesDrawer(prev => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    showSavedMixesDrawer
                      ? 'bg-[#C49746] text-white border-[#C49746]'
                      : 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 border-amber-200/80'
                  }`}
                  title="مكتبة تركيبات لمسة عطر المعتمدة"
                >
                  <Bookmark size={13} />
                  <span className="tabular-nums">مكتبة لمسة عطر ({savedMixes.length})</span>
                </button>
              )}

              {compositionMode === 'single' && (
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setCatalogueViewMode('grid')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      catalogueViewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    شبكة بطاقات
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogueViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      catalogueViewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    جدول سريع
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* MIX FORMULATION STUDIO (محرك الميكس الذكي - زجاجة واحدة) */}
          {/* ======================================================== */}
          {compositionMode === 'mix' ? (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* «مكتبة تركيبات لمسة عطر» المعتمدة (مرتبة بأولوية الأداء الفعلي والتقييم والمبيعات) */}
              {showSavedMixesDrawer && savedMixes.length > 0 && (
                <div className="apple-glass rounded-2xl p-3.5 border border-amber-300/70 bg-amber-50/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Bookmark size={14} className="text-amber-600" />
                      <span>مكتبة تركيبات لمسة عطر المعتمدة ({savedMixes.length}):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSavedMixesDrawer(false)}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[...savedMixes]
                      .sort((a, b) => (b.timesSold || 0) - (a.timesSold || 0) || (b.customerRating || 5) - (a.customerRating || 5))
                      .map((sm) => (
                        <div
                          key={sm.id}
                          onClick={() => handleLoadSavedMixFormula(sm)}
                          className="p-2.5 rounded-xl bg-white border border-amber-200 hover:border-amber-500 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <h4 className="font-black text-xs text-[#1D1D1F] truncate">{sm.name}</h4>
                              {sm.isOwnerApproved !== false && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black shrink-0">
                                  معتمد ✓
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono font-black text-xs text-[#0071E3]">
                                {sm.sellingPrice} ج
                              </span>
                              {onDeleteMix && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteMix(sm.id);
                                  }}
                                  className="w-5 h-5 rounded hover:bg-rose-50 text-rose-500 flex items-center justify-center cursor-pointer"
                                  title="حذف من مكتبة التركيبات"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-[#636366] block truncate font-medium">
                            {sm.bottleSizeMl}مل ({sm.totalEssenceGrams}جم) · {sm.components.map(c => `${c.productName} (${c.grams}جم)`).join(' + ')}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap text-[9px] text-[#86868B]">
                            <span className="text-amber-700 font-bold">★ {sm.customerRating || 5}/5</span>
                            <span>·</span>
                            <span>الاختبار: <strong className="text-[#1D1D1F]">{sm.testResult || 'ممتاز'}</strong></span>
                            <span>·</span>
                            <span>المبيعات: <strong className="font-mono text-[#1D1D1F]">{sm.timesSold || 0}</strong></span>
                            {sm.repurchaseRatePercent !== undefined && (
                              <>
                                <span>·</span>
                                <span>إعادة الشراء: <strong className="font-mono text-emerald-700">{sm.repurchaseRatePercent}%</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 1. تحديد الحجم + تحميل إجمالي جرامات الزيت القياسية + هدف الميكس */}
              <div className="apple-glass rounded-2xl p-3.5 border border-black/[0.07] bg-white/95 space-y-3 shadow-apple-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0071E3] to-[#5856D6] text-white flex items-center justify-center font-bold shadow-2xs">
                      <Beaker size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-xs sm:text-sm text-[#1D1D1F]">
                          محرك الميكس الذكي — عبوة {mixBottle.sizeMl} مل {mixIsColoredBottle ? '(ملونة)' : ''}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[10px] font-black font-mono">
                          {mixBottle.essenceGrams} جم زيت قياسي (أعداد صحيحة فقط)
                        </span>
                      </div>
                      <span className="text-[10px] text-[#86868B] block mt-0.5">
                        القاعدة الافتراضية: عطران (70% + 30%) · ثلاثة عطور (60% + 30% + 10%) دون أي كسور
                      </span>
                    </div>
                  </div>

                  {/* Bottle Size Selector Pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    {bottleSizes.map((b) => {
                      const isSel = mixBottle.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleChangeMixBottleSize(b)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#0071E3] text-white shadow-2xs'
                              : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.06]'
                          }`}
                          title={`تحديد عبوة ${b.sizeMl} مل وتحميل ${b.essenceGrams} جم زيت قياسي بأعداد صحيحة`}
                        >
                          <span className="font-mono font-black">{b.sizeMl}مل</span>
                          <span className={`font-mono text-[9px] mr-0.5 ${isSel ? 'text-white/90' : 'text-[#86868B]'}`}>
                            ({b.essenceGrams}جم)
                          </span>
                          {b.isRollOn && <span className="text-[9px] opacity-80">(رول)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* هدف الميكس (القاعدة 9: يراعي هدف الميكس) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-black/[0.05] text-xs">
                  <span className="font-bold text-[#1D1D1F] text-[11px] shrink-0">هدف الميكس:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { id: 'standard' as MixGoalType, label: 'قياسي متوازن (70/30 · 60/30/10)' },
                      { id: 'longevity' as MixGoalType, label: 'ثبات وفوحان أقصى' },
                      { id: 'fresh_daily' as MixGoalType, label: 'منعش ويومي' },
                      { id: 'luxury_evening' as MixGoalType, label: 'سهرة وفخامة' },
                      { id: 'economical' as MixGoalType, label: 'اقتصادي مراعي للتكلفة' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleChangeMixGoal(g.id)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                          mixGoal === g.id
                            ? 'bg-[#1D1D1F] text-white shadow-2xs'
                            : 'bg-[#F5F5F7] text-[#636366] hover:text-[#1D1D1F]'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colored Bottle Toggle (if spray bottle) */}
                {!mixBottle.isRollOn && (
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] text-xs">
                    <span className="font-bold text-[#1D1D1F] text-[11px]">نوع الزجاجة المستخدمة:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMixIsColoredBottle(false)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                          !mixIsColoredBottle ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#636366]'
                        }`}
                      >
                        زجاجة شفافة عادية
                      </button>
                      <button
                        type="button"
                        onClick={() => setMixIsColoredBottle(true)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          mixIsColoredBottle
                            ? 'bg-gradient-to-r from-[#C49746] to-amber-600 text-white shadow-2xs'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        🎨 عبوة ملونة فاخرة (+35ج)
                      </button>
                    </div>
                  </div>
                )}

                {/* Visual Proportion & Integer Essence Grams Meter Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                    <span className="font-black text-[#1D1D1F]">
                      إجمالي جرامات الزيت الصحيحة داخل الزجاجة:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs text-[#0071E3]">
                        {mixAccounting.totalEssenceGrams} جم
                      </span>
                      <span className="text-[#86868B]">/</span>
                      <span className="font-mono text-xs text-[#86868B]">
                        {mixBottle.essenceGrams} جم قياسي
                      </span>
                      {mixAccounting.isTotalGramsMatchingStandard && !mixAccounting.hasFractionalGrams ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black">
                          أعداد صحيحة مطابقة للحجم 100% ✓
                        </span>
                      ) : mixAccounting.totalEssenceGrams > mixBottle.essenceGrams ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                          زيادة يدوية (+{mixAccounting.totalEssenceGrams - mixBottle.essenceGrams}جم)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[9px] font-black">
                          متبقي {mixBottle.essenceGrams - mixAccounting.totalEssenceGrams}جم
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-black/[0.06] overflow-hidden flex">
                    {mixAccounting.enrichedComponents.map((c, i) => {
                      const colors = ['bg-[#0071E3]', 'bg-[#FF9500]', 'bg-[#34C759]', 'bg-[#AF52DE]'];
                      return (
                        <div
                          key={i}
                          style={{ width: `${c.percentage}%` }}
                          className={`h-full ${colors[i % colors.length]} transition-all duration-300`}
                          title={`${c.productName}: ${c.grams} جم (${c.percentage}%)`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. تحليل الملف العطري للعطر المختار ودرجة الثقة (القاعدة 3 و 24 و 25) */}
              {primaryMixPerfumeProfile && (
                <div className="apple-glass rounded-2xl p-3 border border-[#0071E3]/20 bg-[#0071E3]/[0.03] space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#0071E3]" />
                      <span className="text-xs font-black text-[#1D1D1F]">
                        تحليل الملف العطري للعطر الأساسي: «{primaryMixPerfumeProfile.productName}»
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        primaryMixPerfumeProfile.confidenceDegree === 'عالية'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : primaryMixPerfumeProfile.confidenceDegree === 'متوسطة'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      درجة الثقة: {primaryMixPerfumeProfile.confidenceDegree} · {primaryMixPerfumeProfile.dataSourceAr}
                    </span>
                  </div>

                  {!primaryMixPerfumeProfile.hasReliableData ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[11px] font-bold flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                      <span>{primaryMixPerfumeProfile.noDataDisclaimerAr}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                      <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                        <span className="text-[#86868B] block">العائلة والأكوردات:</span>
                        <strong className="text-[#1D1D1F]">{primaryMixPerfumeProfile.familyAr}</strong>
                        <span className="block text-[#636366] mt-0.5">
                          {primaryMixPerfumeProfile.gender} · {primaryMixPerfumeProfile.season}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                        <span className="text-[#86868B] block">هرم النوتات العطرية:</span>
                        <strong className="text-[#1D1D1F] block truncate">
                          قمة: {primaryMixPerfumeProfile.topNotes.slice(0, 3).join('، ')}
                        </strong>
                        <span className="text-[#636366] block truncate mt-0.5">
                          قاعدة: {primaryMixPerfumeProfile.baseNotes.slice(0, 3).join('، ')}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                        <span className="text-[#86868B] block">الأداء وتكلفة الجرام:</span>
                        <strong className="text-[#1D1D1F]">
                          ثبات: {primaryMixPerfumeProfile.longevityAr}
                        </strong>
                        <span className="block text-[#0071E3] font-mono font-bold mt-0.5">
                          تكلفة الجرام: {primaryMixPerfumeProfile.oilGramCostEgp} ج · المتاح: {primaryMixPerfumeProfile.availableStockGrams} جم
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. مكونات الزجاجة الحالية والجرامات الصحيحة لكل مكوّن */}
              <div className="apple-glass rounded-2xl p-3.5 border border-black/[0.07] bg-white/95 space-y-3 shadow-apple-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs text-[#1D1D1F]">مكونات الزجاجة الفعلية:</span>
                    <span className="text-[10px] font-bold text-[#86868B]">
                      ({mixComponents.length} مكونات · إجمالي {mixAccounting.totalEssenceGrams} جم من {mixBottle.essenceGrams} جم)
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoPairSecondPerfume((prev) => !prev)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                        autoPairSecondPerfume
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-[#F5F5F7] text-[#86868B] border-black/[0.06]'
                      }`}
                    >
                      {autoPairSecondPerfume ? '✓ اقتراح وإقران الثاني تلقائياً (70/30)' : 'إقران الثاني تلقائياً: متوقف'}
                    </button>
                  </div>

                  {mixComponents.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={handleOptimalMixProportions}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${
                          mixDistributionMode === 'optimal'
                            ? 'bg-[#0071E3] text-white shadow-2xs'
                            : 'bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3] hover:text-white'
                        }`}
                        title="تطبيق التوزيع القياسي الصحيح (70/30 لعطرين أو 60/30/10 لثلاثة)"
                      >
                        <Sparkles size={11} />
                        <span>
                          {mixComponents.length === 2
                            ? `توزيع 70/30 (${mixBottle.essenceGrams}جم)`
                            : mixComponents.length === 3
                            ? `توزيع 60/30/10 (${mixBottle.essenceGrams}جم)`
                            : `توزيع قياسي (${mixBottle.essenceGrams}جم)`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEqualizeMixProportions}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${
                          mixDistributionMode === 'equal'
                            ? 'bg-[#1D1D1F] text-white shadow-2xs'
                            : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.08]'
                        }`}
                        title="توزيع الجرامات الصحيحة بالتساوي"
                      >
                        <Scale size={11} />
                        <span>بالتساوي</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMixComponents([]);
                          setShowThirdComponentPanel(false);
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[10px] transition-colors cursor-pointer"
                      >
                        مسح
                      </button>
                    </div>
                  )}
                </div>

                {mixComponents.length === 0 ? (
                  <div className="space-y-3">
                    <div className="py-3 px-4 text-center space-y-1.5 border border-[#0071E3]/30 rounded-2xl bg-[#0071E3]/[0.04] apple-glass">
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles size={16} className="text-[#0071E3]" />
                        <span className="text-xs font-black text-slate-900">
                          الخطوة 1 من 2: اختر العطر الأول الأساسي ({mixBottle.sizeMl} مل = {mixBottle.essenceGrams} جم زيت قياسي)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 max-w-lg mx-auto">
                        سيقوم النظام بتحليل الهرم العطري، واقتراح العطر الثاني الأكثر توافقاً وجمالاً بنسبة{' '}
                        <strong className="text-[#0071E3] font-mono">70% + 30%</strong> مع منحك كامل الحرية لاختيار أي بديل.
                      </p>
                    </div>

                    {/* شريط البحث المباشر وتصنيفات العطور للعطر الأول */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={mixSearchQuery}
                            onChange={(e) => setMixSearchQuery(e.target.value)}
                            placeholder="ابحث عن العطر الأول بالاسم، الماركة، أو النوتات..."
                            className="w-full h-10 pr-9 pl-8 rounded-xl bg-white border border-slate-200/90 text-xs font-bold text-slate-900 outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 shadow-2xs"
                          />
                          {mixSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setMixSearchQuery('')}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        <select
                          value={selectedMixPerfumeId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedMixPerfumeId(val);
                            if (val) {
                              handleSelectAndAddMixPerfume(val);
                            }
                          }}
                          className="h-10 px-3 rounded-xl bg-white border border-slate-200/90 font-bold text-xs text-slate-900 outline-none focus:border-[#0071E3] cursor-pointer shadow-2xs sm:max-w-[220px]"
                        >
                          <option value="">قائمة سريعة ({products.filter((p) => p.stock_grams > 0).length} عطر)...</option>
                          {products
                            .filter((p) => p.stock_grams > 0)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.type} · {p.stock_grams}جم)
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* تصنيفات سريعة */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-slate-400 ml-1">التصنيف:</span>
                        {(['all', 'عادي', 'مسك', 'عود', 'نيش'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setMixCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              mixCategoryFilter === cat
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {cat === 'all' ? 'الكل' : cat}
                          </button>
                        ))}
                      </div>

                      {/* بطاقات العطور المتاحة للاختيار الفوري */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1.5 rounded-xl bg-slate-50/60 border border-slate-200/60 apple-glass">
                        {filteredMixPerfumes.slice(0, 16).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectAndAddMixPerfume(p.id)}
                            className="p-2.5 rounded-xl bg-white hover:bg-[#0071E3]/[0.05] border border-slate-200/80 hover:border-[#0071E3] text-right transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 group-hover:bg-[#0071E3]/10 group-hover:text-[#0071E3]">
                                  {p.type}
                                </span>
                                <span className="text-[9px] font-mono text-emerald-700 font-bold">
                                  {p.stock_grams} جم
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-slate-900 line-clamp-1 group-hover:text-[#0071E3]">
                                {p.name}
                              </h4>
                              {p.brand && (
                                <p className="text-[9px] text-slate-500 truncate">{p.brand}</p>
                              )}
                            </div>
                            <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                              <span>{p.customGramCostEgp || getApprovedOilGramCost(p.type, settings)} ج/جم</span>
                              <span className="text-[#0071E3] font-bold group-hover:translate-x-[-2px] transition-transform">اختيار +</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {mixAccounting.enrichedComponents.map((comp, idx) => {
                      const rawCompMeta = mixComponents[idx];
                      const badgeColors = [
                        'bg-[#0071E3] text-white',
                        'bg-[#FF9500] text-white',
                        'bg-[#34C759] text-white',
                        'bg-[#AF52DE] text-white',
                      ];
                      return (
                        <div
                          key={`${comp.productId}-${idx}`}
                          className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06] space-y-1.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`w-5 h-5 rounded-md text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${
                                    badgeColors[idx % badgeColors.length]
                                  }`}
                                >
                                  {idx + 1}
                                </span>

                                <select
                                  value={comp.productId}
                                  onChange={(e) => handleReplaceMixComponentPerfume(idx, e.target.value)}
                                  className="h-7 px-2 rounded-lg bg-white border border-black/[0.08] font-bold text-xs text-[#1D1D1F] outline-none focus:border-[#0071E3] cursor-pointer max-w-[190px] sm:max-w-[230px]"
                                >
                                  {products
                                    .filter(
                                      (p) =>
                                        String(p.id) === String(comp.productId) ||
                                        (!mixComponents.some((mc) => String(mc.productId) === String(p.id)) &&
                                          p.stock_grams > 0)
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} ({p.type} · {p.customGramCostEgp || getApprovedOilGramCost(p.type, settings)}ج/جم)
                                      </option>
                                    ))}
                                </select>

                                <span className="px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-[#636366] border border-black/[0.06]">
                                  {comp.productType}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#0071E3]/10 font-mono text-[10px] font-black text-[#0071E3]">
                                  {comp.grams} جم ({comp.percentage}%)
                                </span>
                                {rawCompMeta?.isFromSavedLibrary && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[9px] font-black border border-emerald-200">
                                    🏆 مكتبة لمسة عطر
                                  </span>
                                )}
                                {rawCompMeta?.compatibilityScore && idx > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-black border border-amber-200">
                                    توافق {rawCompMeta.compatibilityScore}% · ثقة {rawCompMeta.confidenceDegree || 'عالية'}
                                  </span>
                                )}
                              </div>

                              {/* عرض سبب الاقتراح وتكلفة الزيت والمخزون المتاح لكل مكوّن (القاعدة 7، 8، 18، 19، 24) */}
                              <div className="flex items-center gap-2 text-[10px] text-[#636366] flex-wrap pr-6">
                                {rawCompMeta?.harmonyRoleAr && (
                                  <span className="text-[#1D1D1F] font-bold">
                                    {rawCompMeta.harmonyRoleAr}
                                  </span>
                                )}
                                <span>·</span>
                                <span className="font-mono font-bold text-[#1D1D1F]">
                                  تكلفة الزيت: {comp.grams}جم × {comp.oilGramCost}ج = {comp.componentOilCost} ج
                                </span>
                                {comp.availableStockGrams !== undefined && (
                                  <>
                                    <span>·</span>
                                    <span
                                      className={
                                        comp.availableStockGrams < comp.grams
                                          ? 'text-rose-600 font-black'
                                          : 'text-emerald-700 font-semibold'
                                      }
                                    >
                                      المخزون المتاح: {comp.availableStockGrams}جم (المتبقي بعد الخصم: {Math.max(0, comp.availableStockGrams - comp.grams)}جم)
                                    </span>
                                  </>
                                )}
                              </div>

                              {rawCompMeta?.harmonyReasonAr && idx > 0 && (
                                <p className="text-[10px] text-[#0071E3] font-medium pr-6">
                                  💡 سبب الاقتراح: {rawCompMeta.harmonyReasonAr}
                                </p>
                              )}

                              {rawCompMeta?.replacedOutOfStockName && idx > 0 && (
                                <p className="text-[10px] text-amber-800 font-bold pr-6">
                                  🔄 تم اقتراحه كأعلى بديل متوافق متاح بالمخزون (نظراً لعدم توفر «{rawCompMeta.replacedOutOfStockName}» حالياً).
                                </p>
                              )}
                            </div>

                            {/* التحكم اليدوي بالجرامات الصحيحة للمستخدم المصرح له (القاعدة 10، 11، 20، 21) */}
                            <div className="flex items-center justify-end gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={!canUserModifyMixManually || comp.grams <= 1}
                                onClick={() => handleUpdateMixComponentGrams(comp.productId, comp.grams - 1)}
                                className="w-6 h-6 rounded-lg bg-white border border-black/[0.08] disabled:opacity-40 flex items-center justify-center font-bold text-xs hover:bg-gray-100 cursor-pointer"
                                title="إنقاص 1 جم صحيح (مع موازنة الباقي تلقائياً دون تغيير الوصفة القياسية)"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                disabled={!canUserModifyMixManually}
                                value={comp.grams}
                                onChange={(e) =>
                                  handleUpdateMixComponentGrams(
                                    comp.productId,
                                    Math.max(1, Math.round(Number(e.target.value) || 1))
                                  )
                                }
                                className="w-12 h-6 px-1 rounded-lg bg-white border border-black/[0.08] text-center font-mono font-black text-xs outline-none"
                              />
                              <span className="text-[10px] font-mono font-bold text-[#1D1D1F]">جم</span>
                              <button
                                type="button"
                                disabled={!canUserModifyMixManually}
                                onClick={() => handleUpdateMixComponentGrams(comp.productId, comp.grams + 1)}
                                className="w-6 h-6 rounded-lg bg-white border border-black/[0.08] disabled:opacity-40 flex items-center justify-center font-bold text-xs hover:bg-gray-100 cursor-pointer"
                                title="زيادة 1 جم صحيح (مع موازنة الباقي تلقائياً دون تغيير الوصفة القياسية)"
                              >
                                <Plus size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMixComponent(comp.productId)}
                                className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer mr-1"
                                title="حذف هذا المكون وإعادة توزيع الجرامات القياسية"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between text-[10px] text-[#86868B] px-1">
                      <span>
                        ✓ التعديل اليدوي هنا خاص بهذه الفاتورة فقط ولا يغير الوصفة القياسية للعبوات.
                      </span>
                      {!canUserModifyMixManually && (
                        <span className="text-amber-700 font-bold">
                          🔒 التعديل اليدوي للجرامات متاح للمستخدم المصرح له فقط
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. منطق التوافق الذكي المحدود: اقتراح العطر الثاني التلقائي مع ترك كامل الحرية للمستخدم */}
                {mixComponents.length === 1 && (
                  <div className="pt-2.5 border-t border-black/[0.06] space-y-3">
                    {/* بطاقة الاقتراح التلقائي الذهبي للعطر الثاني */}
                    {secondComponentAlternatives.length > 0 && (() => {
                      const topRec = secondComponentAlternatives[0];
                      const reqSecondGrams = Math.max(1, Math.floor((mixBottle.essenceGrams || 15) * 0.3));
                      return (
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-purple-500/[0.04] to-blue-500/[0.06] border border-amber-400/70 apple-glass-card space-y-3 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-300/40">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-950 font-black text-[11px] flex items-center gap-1.5 border border-amber-400/40">
                                <Sparkles size={12} className="text-amber-600 fill-amber-500" />
                                <span>اقتراح تلقائي لأجمل وأفضل عطر للمزج</span>
                              </span>
                              <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                                توافق {topRec.compatibilityScore}% ✓
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                              النسبة المثالية: 70% أساس + 30% مكمل
                            </span>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-black text-slate-900 truncate">
                                  {topRec.product.name}
                                </h3>
                                <span className="text-[10px] px-2 py-0.2 rounded-md bg-white border border-slate-200 text-slate-700 font-bold">
                                  {topRec.product.type}
                                </span>
                                {topRec.product.brand && (
                                  <span className="text-[10px] text-slate-500 truncate">· {topRec.product.brand}</span>
                                )}
                              </div>

                              <p className="text-[11px] text-[#0071E3] font-medium leading-relaxed">
                                ✨ سر التوافق العطري الفاخر: {topRec.harmonyReasonAr}
                              </p>

                              <div className="flex items-center gap-2.5 text-[10px] text-slate-600 font-mono flex-wrap">
                                <span>الجرام المقترح: {reqSecondGrams} جم</span>
                                <span>·</span>
                                <span>سعر الجرام: {topRec.oilGramCostEgp} ج.م</span>
                                <span>·</span>
                                <span className="text-emerald-700 font-bold">المخزون المتوفر: {topRec.product.stock_grams} جم</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectAndAddMixPerfume(topRec.product.id)}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-[#C49746] hover:from-amber-700 hover:to-[#B48736] text-white font-black text-xs transition-all shadow-xs hover:shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                            >
                              <CheckCheck size={14} />
                              <span>اعتماد التوليفة المقترحة تلقائياً (70% + 30%)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* حرية الاختيار الكاملة للمستخدم: بدائل أو بحث حر في كامل المخزون */}
                    <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5 apple-glass">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-slate-900">
                          أو اختر العطر الثاني بحرية تامة من المخزون أو من البدائل المتوافقة:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowManualSecondPerfumePicker((prev) => !prev)}
                          className="text-[10px] text-[#0071E3] hover:underline font-bold"
                        >
                          {showManualSecondPerfumePicker ? 'إخفاء البحث اليدوي' : 'بحث وتصفح كامل العطور 🔍'}
                        </button>
                      </div>

                      {/* شريط بدائل سريعة متوافقة */}
                      {secondComponentAlternatives.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                          {secondComponentAlternatives.slice(1, 6).map((rec) => (
                            <button
                              key={rec.product.id}
                              type="button"
                              onClick={() => handleSelectAndAddMixPerfume(rec.product.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 hover:border-[#0071E3] text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title={rec.harmonyReasonAr}
                            >
                              <Plus size={10} className="text-[#0071E3]" />
                              <span>{rec.product.name}</span>
                              <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                {rec.compatibilityScore}%
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* البحث المباشر وتصفح العطور للعطر الثاني */}
                      {showManualSecondPerfumePicker && (
                        <div className="space-y-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
                          <div className="relative">
                            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={mixSearchQuery}
                              onChange={(e) => setMixSearchQuery(e.target.value)}
                              placeholder="ابحث بالاسم أو الماركة لاختيار أي عطر كعطر ثانٍ..."
                              className="w-full h-8 pr-8 pl-8 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-[#0071E3]"
                            />
                            {mixSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setMixSearchQuery('')}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-1 rounded-lg bg-white border border-slate-200/60">
                            {filteredMixPerfumes
                              .filter((p) => String(p.id) !== String(mixComponents[0].productId))
                              .slice(0, 12)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectAndAddMixPerfume(p.id)}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-[#0071E3]/[0.05] border border-slate-200 hover:border-[#0071E3] text-right text-[10px] font-bold text-slate-900 truncate transition-all cursor-pointer flex items-center justify-between gap-1"
                                >
                                  <span className="truncate">{p.name}</span>
                                  <span className="text-[#0071E3] shrink-0 font-mono text-[9px]">+اختيار</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {mixComponents.length === 2 && (
                  <div className="pt-2.5 border-t border-black/[0.06] space-y-2.5">
                    {/* شريط تبديل الترتيب + بدائل العطر الثاني */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-slate-100/80 border border-slate-200/70">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>الهيكل الثنائي: {mixComponents[0].productName} (70%) + {mixComponents[1].productName} (30%)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSwapFirstAndSecondMixComponents}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-800 border border-slate-300/80 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                        title="عكس التركيبة وجعل العطر الثاني هو الأساس بنسبة 70% والأول مكمل بنسبة 30%"
                      >
                        <ArrowLeftRight size={11} className="text-[#0071E3]" />
                        <span>تبديل الأساس والمكمل (عكس الترتيب)</span>
                      </button>
                    </div>

                    {/* بدائل العطر الثاني مرتبة حسب درجة التوافق */}
                    {secondComponentAlternatives.length > 1 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">
                          بدائل أخرى متاحة للعطر الثاني مرتبة حسب درجة التوافق (اضغط للتبديل الفوري):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {secondComponentAlternatives
                            .filter((r) => String(r.product.id) !== String(mixComponents[1].productId))
                            .slice(0, 5)
                            .map((rec) => (
                              <button
                                key={rec.product.id}
                                type="button"
                                onClick={() => handleReplaceMixComponentPerfume(1, rec.product.id)}
                                className="px-2.5 py-1 rounded-xl bg-[#F5F5F7] hover:bg-white text-[#1D1D1F] border border-black/[0.06] hover:border-[#0071E3] text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title={rec.harmonyReasonAr}
                              >
                                <RotateCcw size={10} className="text-[#0071E3]" />
                                <span>{rec.product.name}</span>
                                <span className="font-mono text-[9px] text-[#0071E3]">({rec.compatibilityScore}%)</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* حالة الاكتمال الثنائي + زر إضافة عطر ثالث اختياري (بدون حلقة لا نهائية) */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-emerald-950 font-bold">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span>
                          الميكس الثنائي متوازن وجاهز للاعتماد ({mixAccounting.enrichedComponents[0]?.grams} جم + {mixAccounting.enrichedComponents[1]?.grams} جم = {mixAccounting.totalEssenceGrams} جم)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowThirdComponentPanel((prev) => !prev)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus size={12} />
                        <span>
                          {showThirdComponentPanel ? 'إخفاء العطر الثالث' : 'إضافة عطر ثالث مكمل (60% + 30% + 10%)'}
                        </span>
                      </button>
                    </div>

                    {/* لوحة اقتراح العطر الثالث عند طلب المستخدم */}
                    {showThirdComponentPanel && (
                      <div className="p-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] space-y-2 animate-in fade-in duration-150">
                        {(mixBottle.essenceGrams || 15) <= 3 && !conscious10MlThreeCompConfirmed ? (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                            <div className="flex items-start gap-2 font-bold">
                              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                              <span>
                                تنبيه تشغيلي لحجم {mixBottle.sizeMl} مل ({mixBottle.essenceGrams} جم زيت): الافتراضي عطران (2 + 1 جم). ولا يفضل ثلاثة مكونات في 10 مل إلا بقرار واعٍ، لأن إجمالي الزيت محدود إلى 3 جم.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setConscious10MlThreeCompConfirmed(true)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black cursor-pointer"
                            >
                              تأكيد إضافة مكون ثالث بقرار واعٍ (1 + 1 + 1 جم)
                            </button>
                          </div>
                        ) : thirdComponentRecommendations.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-black flex items-center gap-2">
                            <ShieldAlert size={15} className="text-rose-600 shrink-0" />
                            <span>لا يوجد بديل موثوق مناسب ضمن المخزون الحالي</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-[11px] font-black text-[#1D1D1F] block">
                              أفضل عطر ثالث مقترح لإكمال الهرم الثلاثي (60% + 30% + 10%):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {thirdComponentRecommendations.slice(0, 5).map((rec, idx) => (
                                <button
                                  key={rec.product.id}
                                  type="button"
                                  onClick={() => handleSelectAndAddMixPerfume(rec.product.id)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                    idx === 0
                                      ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                                      : 'bg-white hover:bg-blue-50 text-[#1D1D1F] border-black/[0.08]'
                                  }`}
                                  title={rec.harmonyReasonAr}
                                >
                                  <Plus size={11} />
                                  <span>{idx === 0 ? `⭐ الأنسب ثالثاً: ${rec.product.name}` : rec.product.name}</span>
                                  <span className={`font-mono text-[9px] px-1 rounded ${idx === 0 ? 'bg-white/20 text-white' : 'bg-black/[0.06]'}`}>
                                    {rec.compatibilityScore}% · ثقة {rec.confidenceDegree}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {mixComponents.length >= 3 && (
                  <div className="pt-2.5 border-t border-black/[0.06]">
                    <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-2 text-xs text-blue-950 font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[#0071E3] shrink-0" />
                        <span>
                          اكتمل الهرم العطري الثلاثي القياسي ({mixAccounting.enrichedComponents.map((c) => `${c.grams}جم`).join(' + ')} = {mixAccounting.totalEssenceGrams} جم) — جاهز للاعتماد.
                        </span>
                      </div>
                      <span className="text-[10px] text-[#0071E3] font-black shrink-0">
                        60% + 30% + 10% ✓
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. الحسابات الفورية لزجاجة الميكس (القاعدة 12، 13، 14، 15، 16، 17، 23) */}
              {mixComponents.length > 0 && (
                <div className="apple-glass rounded-2xl p-3.5 border border-black/[0.07] bg-white/95 space-y-2.5 shadow-apple-xs">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[11px] font-black text-[#1D1D1F]">
                      الحسابات المالية الفورية للميكس (تتحدث لحظياً مع كل تغيير):
                    </span>
                    <span className="text-[10px] font-mono text-[#636366]">
                      التكلفة الزيتية ({mixAccounting.totalComponentsOilCostEgp} ج) + بقية عناصر التكلفة ({mixAccounting.bottleOverheadCostEgp} ج) = {mixAccounting.unitBottleCostEgp} ج
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">التكلفة الفعلية:</span>
                      <span className="font-mono font-black text-sm text-[#1D1D1F]">
                        {mixAccounting.unitBottleCostEgp} {settings.currency}
                      </span>
                      <span className="text-[9px] text-[#86868B] block mt-0.5">
                        زيوت {mixAccounting.totalComponentsOilCostEgp}ج + عبوة {mixAccounting.bottleOverheadCostEgp}ج
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">السعر الأدنى الآمن:</span>
                      <span className="font-mono font-black text-sm text-[#1D1D1F]">
                        {mixAccounting.minSafeSellingPriceEgp} {settings.currency}
                      </span>
                      <span className="text-[9px] text-[#86868B] block mt-0.5">
                        يحمي التكلفة + المساهمة
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">الخصم المسموح:</span>
                      <span className="font-mono font-black text-sm text-[#0071E3]">
                        {mixAccounting.maxAllowedDiscountEgp} {settings.currency}
                      </span>
                      <span className="text-[9px] text-[#86868B] block mt-0.5">
                        أقصى خصم آمن للزجاجة
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">عمولة المبيعات:</span>
                      <span className="font-mono font-black text-sm text-amber-700">
                        +{mixAccounting.commissionEgp} {settings.currency}
                      </span>
                      <span className="text-[9px] text-[#86868B] block mt-0.5">
                        {mixBottle.isRollOn ? '0% (رول معفى)' : '5% من سعر البيع'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">صافي المساهمة:</span>
                      <span
                        className={`font-mono font-black text-sm ${
                          mixAccounting.netContributionEgp >= 10 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {mixAccounting.netContributionEgp >= 0 ? `+${mixAccounting.netContributionEgp}` : mixAccounting.netContributionEgp} {settings.currency}
                      </span>
                      <span className="text-[9px] text-[#86868B] block mt-0.5">
                        {mixAccounting.netContributionEgp >= 10 ? 'مساهمة آمنة (≥ 10ج) ✓' : 'تحت الحد الأدنى ⚠️'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">نقاط الولاء:</span>
                      <span className="font-mono font-black text-sm text-purple-700">
                        +{mixAccounting.loyaltyPointsEarned} نقطة
                      </span>
                      <span className="text-[9px] text-[#86868B] block mt-0.5">
                        تضاف لرصيد العميل
                      </span>
                    </div>
                  </div>

                  {/* السعر النهائي وإمكانية تعديل السعر */}
                  <div className="pt-2 border-t border-black/[0.05] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-bold text-[#636366]">
                      سعر بيع زجاجة الميكس (المقترح الموزون: {mixAccounting.suggestedSellingPriceEgp} {settings.currency}):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder={`${mixAccounting.suggestedSellingPriceEgp}`}
                        value={mixCustomPrice}
                        onChange={(e) => setMixCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-24 h-8 px-2 rounded-xl bg-white border border-black/[0.1] text-center font-mono font-black text-xs outline-none focus:border-[#0071E3]"
                      />
                      <span className="font-mono text-[10px] text-[#86868B]">{settings.currency}</span>
                      {mixCustomPrice !== '' && (
                        <button
                          type="button"
                          onClick={() => setMixCustomPrice('')}
                          className="text-[10px] text-[#0071E3] hover:underline font-bold cursor-pointer"
                        >
                          استعادة السعر المعتمد
                        </button>
                      )}
                    </div>
                  </div>

                  {/* تنبيه المنع الصارم إذا خالف الميكس حد التكلفة أو حد المساهمة الأدنى أو المخزون (القاعدة 23) */}
                  {!mixAccounting.canApproveMix && mixAccounting.blockingReasonsAr.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-rose-700">
                        <ShieldAlert size={15} />
                        <span>تم منع اعتماد الميكس لمخالفة الضوابط المالية أو المخزنية:</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] font-bold space-y-0.5">
                        {mixAccounting.blockingReasonsAr.map((reason, rIdx) => (
                          <li key={rIdx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 6. حفظ في «مكتبة تركيبات لمسة عطر» واعتماد الميكس للفاتورة */}
              <div className="apple-glass rounded-2xl p-3.5 border border-black/[0.07] bg-white/95 space-y-3 shadow-apple-xs">
                <div>
                  <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">
                    اسم تركيبة الميكس (يسجل في الفاتورة ومكتبة تركيبات لمسة عطر):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ميكس لمسة الملكي (بلو شانيل + أكوا دي جيو)..."
                    value={mixFormulaName}
                    onChange={(e) => setMixFormulaName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-bold outline-none focus:bg-white focus:border-[#0071E3]"
                  />
                </div>

                {/* نموذج توثيق وحفظ التركيبة في «مكتبة تركيبات لمسة عطر» */}
                {showSaveLibraryModal && mixComponents.length >= 2 && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2.5 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-950 flex items-center gap-1.5">
                        <Award size={14} className="text-amber-600" />
                        <span>حفظ وتوثيق في «مكتبة تركيبات لمسة عطر» (باعتماد المالك):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSaveLibraryModal(false)}
                        className="text-[10px] text-amber-800 font-bold cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-amber-950 block mb-0.5">تقييم العميل (1 - 5):</label>
                        <select
                          value={libraryCustomerRating}
                          onChange={(e) => setLibraryCustomerRating(Number(e.target.value))}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-amber-200 text-xs font-bold"
                        >
                          <option value={5}>★★★★★ (5/5 ممتاز جداً)</option>
                          <option value={4}>★★★★☆ (4/5 جيد جداً)</option>
                          <option value={3}>★★★☆☆ (3/5 مقبول)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-950 block mb-0.5">نتيجة الاختبار العطري:</label>
                        <select
                          value={libraryTestResult}
                          onChange={(e) => setLibraryTestResult(e.target.value as any)}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-amber-200 text-xs font-bold"
                        >
                          <option value="ممتاز">ممتاز — معتمد بلمسة عطر</option>
                          <option value="ناجح">ناجح — متوازن</option>
                          <option value="جيد">جيد</option>
                          <option value="تحت الاختبار">تحت الاختبار</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-amber-950 block mb-0.5">ملاحظات الثبات:</label>
                        <input
                          type="text"
                          value={libraryLongevityNotes}
                          onChange={(e) => setLibraryLongevityNotes(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-amber-200 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-950 block mb-0.5">ملاحظات الفوحان:</label>
                        <input
                          type="text"
                          value={librarySillageNotes}
                          onChange={(e) => setLibrarySillageNotes(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-amber-200 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-950 block mb-0.5">ملاحظات التوازن:</label>
                        <input
                          type="text"
                          value={libraryBalanceNotes}
                          onChange={(e) => setLibraryBalanceNotes(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg bg-white border border-amber-200 text-[11px]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveCurrentMixAsFavorite}
                      className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-2xs"
                    >
                      اعتماد وحفظ التركيبة في مكتبة لمسة عطر ✓
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  {onSaveMix && mixComponents.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => setShowSaveLibraryModal((prev) => !prev)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bookmark size={13} className="text-amber-600" />
                      <span>حفظ في مكتبة تركيبات لمسة عطر</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddMixBottleToCart}
                    disabled={!mixAccounting.canApproveMix}
                    className="flex-1 w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-apple-sm cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>
                      اعتماد وإضافة زجاجة الميكس للفاتورة ({mixBottle.sizeMl} مل · {mixAccounting.totalEssenceGrams} جم · {mixAccounting.finalSellingPriceEgp} {settings.currency})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Otherwise Render Normal Single Perfume Catalogue */
            <>
          {/* ======================================================== */}
          {/* UNIFIED CATALOGUE CONTROL DOCK (Fast Search + Brand + Filters + Size) */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-4 border border-slate-200/90 bg-white space-y-3.5 shadow-[0_6px_24px_rgba(15,23,42,0.04)]">
            {/* Row 1: Prominent Fast Search Bar (By Perfume Name or Brand Directly) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Search size={14} className="text-[#0071E3]" />
                  <span>البحث السريع المباشر باسم العطر أو الماركة العالمية:</span>
                </label>
                <div className="flex items-center gap-2">
                  {isCatalogueRevealed ? (
                    <button
                      type="button"
                      onClick={handleResetAndHideCatalogue}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <X size={12} />
                      <span>إخفاء قائمة العطور ({filteredProducts.length})</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">
                      القائمة الافتراضية مخفية · ابحث أو اختر قسماً للإظهار
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="اكتب اسم العطر أو الماركة مباشرة (مثال: سوفاج، بلو شانيل، Dior، Creed، توم فورد، عود)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchTerm.trim() && filteredProducts.length > 0) {
                        e.preventDefault();
                        handleQuickAddWithBottle(filteredProducts[0], activeSellerBottle, e as any);
                      } else if (e.key === 'Escape') {
                        setSearchTerm('');
                      }
                    }}
                    className="w-full h-11 pr-11 pl-24 rounded-xl bg-slate-50 focus:bg-white border-2 border-slate-200/90 focus:border-[#0071E3] text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium shadow-2xs"
                  />
                  <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0071E3]" />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchTerm ? (
                      <>
                        <span className="px-2 py-0.5 rounded-md bg-[#0071E3]/10 text-[#0071E3] font-mono tabular-nums text-[10px] font-black">
                          {filteredProducts.length} نتيجة
                        </span>
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="w-6 h-6 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
                          title="مسح البحث"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-500 font-mono text-[10px] font-bold">
                        F2 للبحث
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSmartSearchModal(true)}
                  className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-[#0071E3] text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors whitespace-nowrap shadow-2xs"
                  title="مستشار العطور بالمناسبة والمود"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>ترشيح بالمناسبة</span>
                </button>
              </div>

              {/* Instant Top Search Matches Bar (When Cashier Types in Search Input) */}
              {searchTerm.trim().length > 0 && filteredProducts.length > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-50/60 border border-[#0071E3]/25 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 px-1">
                    <span>⚡ وصول وإضافة فورية لأقرب النتائج المطابقة (اضغط Enter لإضافة الأول بعبوة {activeSellerBottle.sizeMl}مل):</span>
                    <span className="font-mono text-[#0071E3] font-black">{filteredProducts.length} عطر مطابق</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto modal-scroll-area pb-0.5">
                    {filteredProducts.slice(0, 6).map((qp, idx) => {
                      const qPrice = getApprovedSellingPrice({
                        bottle: activeSellerBottle,
                        perfumeType: qp.type,
                        isColoredBottle: false,
                      }).price;
                      return (
                        <div
                          key={qp.id}
                          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 transition-all ${
                            idx === 0
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-900 border-slate-200/90 hover:border-[#0071E3]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleQuickAddWithBottle(qp, activeSellerBottle, e)}
                            className="flex items-center gap-1.5 text-right cursor-pointer"
                            title={`إضافة فورية إلى الفاتورة (${activeSellerBottle.sizeMl} مل)`}
                          >
                            <Plus size={12} className={idx === 0 ? 'text-amber-300' : 'text-[#0071E3]'} />
                            <div>
                              <div className="text-[11px] font-black leading-tight">{qp.name}</div>
                              <div className={`text-[9.5px] ${idx === 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                                {qp.brand} · <span className="font-mono font-bold">{qPrice} ج</span> ({activeSellerBottle.sizeMl}مل)
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenConfig(qp)}
                            className={`p-1 rounded-lg cursor-pointer ${
                              idx === 0 ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="تخصيص الحجم والتركيز"
                          >
                            <SlidersHorizontal size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Row 2: Horizontal Category Filter Tabs + Gender Segmented Filter */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                {([
                  { id: 'صيفي', label: '☀️ صيفي منعش', count: sideFilterCounts.صيفي },
                  { id: 'شتوي', label: '❄️ شتوي دافئ', count: sideFilterCounts.شتوي },
                  { id: 'نيش', label: '👑 نيش عالمي', count: sideFilterCounts.نيش },
                  { id: 'مسك', label: '🫧 مسك فاخر', count: sideFilterCounts.مسك },
                  { id: 'عود', label: '🪵 عود وشرقي', count: sideFilterCounts.عود },
                  { id: 'فرنسي', label: '✨ فرنسي كلاسيك', count: sideFilterCounts.فرنسي },
                ] as const).map((cat) => {
                  const isActive = quickSideFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setQuickSideFilter('all');
                        } else {
                          setQuickSideFilter(cat.id);
                          setSelectedType('all');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-700'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`font-mono tabular-nums text-[10px] font-black ${
                          isActive ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    if (showAllCatalogueExplicitly) {
                      setShowAllCatalogueExplicitly(false);
                    } else {
                      setQuickSideFilter('all');
                      setSelectedType('all');
                      setShowAllCatalogueExplicitly(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 border ${
                    showAllCatalogueExplicitly && quickSideFilter === 'all'
                      ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90'
                  }`}
                >
                  <span>عرض الكل</span>
                  <span className="font-mono tabular-nums text-[10px] font-black opacity-80">
                    ({sideFilterCounts.all})
                  </span>
                </button>
              </div>

              {/* Gender Segmented Control */}
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200/60 self-start xl:self-auto shrink-0">
                {([
                  { id: 'all', label: 'الكل' },
                  { id: 'رجالي', label: 'رجالي' },
                  { id: 'نسائي', label: 'نسائي' },
                  { id: 'مشترك', label: 'مشترك' },
                ] as const).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGender(selectedGender === g.id && g.id !== 'all' ? 'all' : g.id)}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      selectedGender === g.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2.5: Direct Brand Filter Bar (الوصول السريع بالماركة مباشرة) */}
            {topBrands.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                <span className="text-[10px] font-black text-slate-400 shrink-0 ml-1">الماركة:</span>
                {selectedBrand !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrand('all')}
                    className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    إلغاء ({selectedBrand}) ×
                  </button>
                )}
                {topBrands.map((bItem) => {
                  const isBrandActive = selectedBrand.toLowerCase() === bItem.brand.toLowerCase();
                  return (
                    <button
                      key={bItem.brand}
                      type="button"
                      onClick={() => setSelectedBrand(isBrandActive ? 'all' : bItem.brand)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer border ${
                        isBrandActive
                          ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      <span>{bItem.brand}</span>
                      <span className={`font-mono text-[9px] ${isBrandActive ? 'text-white/90' : 'text-slate-400'}`}>
                        {bItem.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Row 3: Active Bottle Size Controller (تحديد الحجم المعتمد للإضافة الفورية) */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={13} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-black text-slate-900">
                    الحجم النشط للإضافة بضغطة واحدة:
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[#0071E3]">
                    {activeSellerBottle.sizeMl} مل · {activeSellerBottle.essenceGrams} جم زيت قياسي
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {bottleSizes.map((b) => {
                  const isCurrent = !isSellerCustomSizeMode && activeSellerBottle.id === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setIsSellerCustomSizeMode(false);
                        setSellerActiveBottleId(b.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-0.5 whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#0071E3] text-white shadow-2xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 hover:border-[#0071E3]'
                      }`}
                    >
                      <span className="font-mono tabular-nums font-black">{b.sizeMl}مل</span>
                      {b.isRollOn && <span className="text-[9px] opacity-80">(رول)</span>}
                    </button>
                  );
                })}

                {/* Custom Seller ML Input */}
                <div
                  onClick={() => setIsSellerCustomSizeMode(true)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer border ${
                    isSellerCustomSizeMode
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-800 border-slate-200/80 hover:border-[#0071E3]'
                  }`}
                >
                  <span>حر:</span>
                  <input
                    type="number"
                    min="3"
                    max="1000"
                    value={sellerCustomSizeMl}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSellerCustomSizeMode(true);
                    }}
                    onChange={(e) => {
                      setIsSellerCustomSizeMode(true);
                      setSellerCustomSizeMl(Math.max(3, Number(e.target.value) || 30));
                    }}
                    className={`w-10 h-5 rounded text-center font-mono tabular-nums text-[11px] font-black outline-none ${
                      isSellerCustomSizeMode
                        ? 'bg-white/15 text-amber-300'
                        : 'bg-slate-100 text-[#0071E3]'
                    }`}
                    title="اكتب أي حجم عبوة بالملي يطلبه العميل"
                  />
                  <span className="text-[9px] opacity-80">مل</span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CONDITIONAL PERFUME CATALOGUE (HIDDEN BY DEFAULT UNTIL SEARCH OR FILTER) */}
          {/* ======================================================== */}
          {!isCatalogueRevealed ? (
            <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      بوابة الوصول السريع للأقسام والماركات العالمية
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      قوائم العطور مخفية افتراضياً لراحة العين وسرعة الكاشير — ابحث بالاسم أو الماركة أعلاه أو اختر قسماً لإظهار العطور فوراً
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllCatalogueExplicitly(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-900 text-slate-800 hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  إظهار جميع العطور ({products.length})
                </button>
              </div>

              {/* 6 Interactive Luxury Category Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {([
                  {
                    id: 'صيفي' as const,
                    title: 'عطور صيفية منعشة',
                    subtitle: 'حمضيات · بحري · فواكه يومية',
                    count: sideFilterCounts.صيفي,
                    accent: 'border-t-[#0071E3] hover:border-[#0071E3]',
                    badgeBg: 'bg-blue-50 text-[#0071E3]',
                  },
                  {
                    id: 'شتوي' as const,
                    title: 'عطور شتوية دافئة',
                    subtitle: 'عنبر · فانيليا · توابل وسهرات',
                    count: sideFilterCounts.شتوي,
                    accent: 'border-t-indigo-600 hover:border-indigo-600',
                    badgeBg: 'bg-indigo-50 text-indigo-700',
                  },
                  {
                    id: 'نيش' as const,
                    title: 'عطور النيش العالمية',
                    subtitle: 'كريد · باكارا · توم فورد · زيرجوف',
                    count: sideFilterCounts.نيش,
                    accent: 'border-t-teal-600 hover:border-teal-600',
                    badgeBg: 'bg-teal-50 text-teal-700',
                  },
                  {
                    id: 'عود' as const,
                    title: 'العود والشرقي الفاخر',
                    subtitle: 'عود ملكي · كمبودي · زعفران وبخور',
                    count: sideFilterCounts.عود,
                    accent: 'border-t-[#9A6E23] hover:border-[#9A6E23]',
                    badgeBg: 'bg-amber-50 text-amber-900',
                  },
                  {
                    id: 'مسك' as const,
                    title: 'المسك الفاخر والبيور',
                    subtitle: 'مسك الطهارة · رمان · فانيليا وبودر',
                    count: sideFilterCounts.مسك,
                    accent: 'border-t-emerald-600 hover:border-emerald-600',
                    badgeBg: 'bg-emerald-50 text-emerald-800',
                  },
                  {
                    id: 'فرنسي' as const,
                    title: 'الفرنسي الكلاسيكي',
                    subtitle: 'ديور · شانيل · إيف سان لوران · جوتشي',
                    count: sideFilterCounts.فرنسي,
                    accent: 'border-t-slate-800 hover:border-slate-800',
                    badgeBg: 'bg-slate-100 text-slate-800',
                  },
                ]).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setQuickSideFilter(card.id);
                      setSelectedType('all');
                    }}
                    className={`p-3.5 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/90 border-t-4 ${card.accent} text-right transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <span className="font-black text-xs sm:text-sm text-slate-900">{card.title}</span>
                      <span className={`px-2 py-0.5 rounded-lg font-mono tabular-nums text-[11px] font-black shrink-0 ${card.badgeBg}`}>
                        {card.count} عطر
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{card.subtitle}</span>
                  </button>
                ))}
              </div>

              {/* Fast Brand Selector Directory */}
              {topBrands.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-800">تصفية فورية حسب الماركة العالمية:</span>
                    <span className="text-[11px] text-slate-400">اضغط على أي ماركة لعرض عطورها</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topBrands.map((bItem) => (
                      <button
                        key={bItem.brand}
                        type="button"
                        onClick={() => setSelectedBrand(bItem.brand)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-900 text-slate-800 hover:text-white border border-slate-200/90 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{bItem.brand}</span>
                        <span className="font-mono text-[10px] opacity-70">({bItem.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full space-y-2.5 animate-in fade-in duration-150">
              {/* Active Filter Status Bar + Hide List Button */}
              <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-black">
                    نتائج البحث والتصفية النشطة ({filteredProducts.length} عطر):
                  </span>
                  {searchTerm.trim() && (
                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-amber-300 font-bold text-[11px]">
                      بحث: «{searchTerm}»
                    </span>
                  )}
                  {quickSideFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-sky-300 font-bold text-[11px]">
                      القسم: {quickSideFilter}
                    </span>
                  )}
                  {selectedBrand !== 'all' && (
                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-emerald-300 font-bold text-[11px]">
                      الماركة: {selectedBrand}
                    </span>
                  )}
                  {selectedGender !== 'all' && (
                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-purple-300 font-bold text-[11px]">
                      النوع: {selectedGender}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResetAndHideCatalogue}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-rose-600 text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <X size={13} />
                  <span>إخفاء القائمة والعودة للأقسام</span>
                </button>
              </div>
            {catalogueViewMode === 'grid' ? (
              /* MODE A: PROFESSIONAL ARCHITECTURAL POS CARD GRID */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[680px] overflow-y-auto pr-0.5">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock_grams < 100;
                  const minThresh = p.min_threshold_grams ?? 30;
                  const isShortage = p.stock_grams <= minThresh;
                  const activeBottlePrice = getApprovedSellingPrice({
                    bottle: activeSellerBottle,
                    perfumeType: p.type,
                    isColoredBottle: false,
                  }).price;

                  const familyLabel =
                    p.type === 'عود'
                      ? 'عود شرقي'
                      : p.type === 'مسك'
                      ? 'مسك فاخر'
                      : p.type === 'نيش'
                      ? 'نيش عالمي'
                      : p.season === 'شتاء' || p.season === 'خريف'
                      ? 'شتوي دافئ'
                      : 'صيفي منعش';

                  const accentBorderClass =
                    p.type === 'عود'
                      ? 'border-t-[#9A6E23]'
                      : p.type === 'مسك'
                      ? 'border-t-emerald-600'
                      : p.type === 'نيش'
                      ? 'border-t-teal-600'
                      : p.season === 'شتاء' || p.season === 'خريف'
                      ? 'border-t-indigo-600'
                      : 'border-t-[#0071E3]';

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpenConfig(p)}
                      className={`group rounded-2xl bg-white border border-slate-200/90 border-t-4 ${accentBorderClass} hover:border-slate-300 p-3 flex flex-col justify-between gap-2.5 shadow-2xs transition-colors duration-150 cursor-pointer`}
                    >
                      {/* Top Section: Title, Unboxed Metadata & Active Price */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-[13px] text-slate-900 group-hover:text-[#0071E3] transition-colors leading-snug line-clamp-1">
                            {p.name}
                          </h3>
                          <div className="text-left shrink-0">
                            <span className="font-mono tabular-nums text-sm font-black text-slate-900">
                              {activeBottlePrice}{' '}
                              <span className="text-[10px] font-semibold text-slate-500">{settings.currency}</span>
                            </span>
                            <span className="block text-[9px] font-mono tabular-nums text-slate-400 text-left">
                              عبوة {activeSellerBottle.sizeMl}مل
                            </span>
                          </div>
                        </div>

                        {/* Unboxed Metadata Row (Zero-Pill Discipline) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                          <span className="truncate font-medium text-slate-700">{p.brand}</span>
                          <span aria-hidden="true">·</span>
                          <span>{familyLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{p.gender}</span>
                        </div>

                        {/* Stock Status Indicator (Explicit Text + Semantic Color) */}
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-slate-400">الرصيد بالمخزون:</span>
                          <span
                            className={`font-mono tabular-nums font-bold ${
                              isShortage
                                ? 'text-rose-600'
                                : isLowStock
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {p.stock_grams === 0
                              ? 'نفد من المخزون'
                              : isShortage
                              ? `${p.stock_grams} جم (حد حرج)`
                              : `${p.stock_grams} جم متاح`}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Section: Instant 1-Click POS Action Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        {/* Quick 20/30/50ml 1-Click Buttons */}
                        <div className="flex items-center gap-1">
                          {quickSprayBottles.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={(e) => handleQuickAddWithBottle(p, b, e)}
                              className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white font-mono tabular-nums text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                              title={`إضافة فورية عبوة ${b.sizeMl} مل`}
                            >
                              +{b.sizeMl}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Primary Active Size 1-Click Add Button */}
                          <button
                            type="button"
                            onClick={(e) => handleQuickAddWithBottle(p, activeSellerBottle, e)}
                            title={`إضافة فورية بحجم ${activeSellerBottle.sizeMl} مل`}
                            className="px-2.5 py-1 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            <Plus size={12} />
                            <span className="font-mono tabular-nums">{activeSellerBottle.sizeMl}مل</span>
                          </button>

                          {/* 1-Click Send to Smart Mix Studio */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompositionMode('mix');
                              handleSelectAndAddMixPerfume(p.id);
                            }}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="بدء ميكس ذكي (70/30) بهذا العطر كقاعدة أساسية"
                          >
                            <Beaker size={13} />
                          </button>

                          {/* Full Configurator Modal Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenConfig(p);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="تخصيص الحجم والتركيز والسعر"
                          >
                            <SlidersHorizontal size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MODE B: HIGH-SPEED COMPACT POS TABLE VIEW */
              <div className="space-y-1.5">
                <div className="hidden sm:grid sm:grid-cols-12 items-center px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200/70 text-[11px] font-black text-slate-500">
                  <div className="col-span-5">العطر · الماركة والعائلة العطرية</div>
                  <div className="col-span-3 text-center">المخزون · سعر {activeSellerBottle.sizeMl}مل</div>
                  <div className="col-span-4 text-left">إضافة فورية / ميكس / تخصيص</div>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[650px] overflow-y-auto pr-0.5">
                  {filteredProducts.map((p, idx) => {
                    const isLowStock = p.stock_grams < 100;
                    const minThresh = p.min_threshold_grams ?? 30;
                    const isShortage = p.stock_grams <= minThresh;
                    const activeBottlePrice = getApprovedSellingPrice({
                      bottle: activeSellerBottle,
                      perfumeType: p.type,
                      isColoredBottle: false,
                    }).price;

                    const familyLabel =
                      p.type === 'عود'
                        ? 'عود شرقي'
                        : p.type === 'مسك'
                        ? 'مسك فاخر'
                        : p.type === 'نيش'
                        ? 'نيش عالمي'
                        : p.season === 'شتاء' || p.season === 'خريف'
                        ? 'شتوي دافئ'
                        : 'صيفي منعش';

                    const accentBarClass =
                      p.type === 'عود'
                        ? 'bg-[#9A6E23]'
                        : p.type === 'مسك'
                        ? 'bg-emerald-600'
                        : p.type === 'نيش'
                        ? 'bg-teal-600'
                        : p.season === 'شتاء' || p.season === 'خريف'
                        ? 'bg-indigo-600'
                        : 'bg-[#0071E3]';

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleOpenConfig(p)}
                        className="group relative flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 sm:gap-2.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-[#0071E3]/45 transition-colors duration-150 cursor-pointer"
                      >
                        <div className="sm:col-span-5 flex items-center gap-2.5 min-w-0">
                          <div className={`w-1 h-8 rounded-full shrink-0 ${accentBarClass}`} />
                          <span className="font-mono tabular-nums text-[10px] text-slate-400 w-5 shrink-0 hidden xl:inline-block">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-[#0071E3] transition-colors truncate leading-snug">
                              {p.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate mt-0.5">
                              <span className="truncate">{p.brand}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-slate-700 font-medium">{familyLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>{p.gender}</span>
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-3 flex items-center justify-between sm:justify-center gap-3 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span
                            className={`font-mono tabular-nums text-[11px] font-bold ${
                              isShortage ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-600'
                            }`}
                          >
                            {p.stock_grams === 0 ? 'نفد' : `${p.stock_grams} جم`}
                          </span>

                          <span aria-hidden="true" className="text-slate-300 hidden sm:inline">|</span>

                          <div className="text-left sm:text-center">
                            <span className="font-mono tabular-nums text-xs font-black text-slate-900">
                              {activeBottlePrice} <span className="text-[10px] font-normal text-slate-500">ج</span>
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-4 flex items-center justify-end gap-1">
                          <div className="hidden xl:flex items-center gap-1">
                            {quickSprayBottles.map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={(e) => handleQuickAddWithBottle(p, b, e)}
                                className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white font-mono tabular-nums text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                title={`إضافة سريعة عبوة ${b.sizeMl} مل`}
                              >
                                +{b.sizeMl}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleQuickAddWithBottle(p, activeSellerBottle, e)}
                            title={`إضافة فورية بحجم ${activeSellerBottle.sizeMl} مل`}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
                          >
                            <Plus size={12} />
                            <span className="font-mono tabular-nums">{activeSellerBottle.sizeMl}مل</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompositionMode('mix');
                              handleSelectAndAddMixPerfume(p.id);
                            }}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="بدء ميكس ذكي بهذا العطر"
                          >
                            <Beaker size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenConfig(p);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="تخصيص الحجم والتركيز والسعر"
                          >
                            <SlidersHorizontal size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="py-12 text-center text-slate-500 space-y-2 rounded-2xl bg-white border border-slate-200/80">
                <Search size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-900">لا توجد عطور مطابقة لهذا التصنيف أو البحث</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSideFilter('all');
                      setSelectedGender('all');
                      setSelectedBrand('all');
                      setSearchTerm('');
                      setShowAllCatalogueExplicitly(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0071E3] text-white text-xs font-bold cursor-pointer"
                  >
                    إظهار جميع العطور ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAndHideCatalogue}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    العودة لبوابة الأقسام
                  </button>
                </div>
              </div>
            )}
            </div>
          )}
          </>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: EXECUTIVE POS BILLING & CRM TERMINAL (5 cols) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-3.5">
          <div
            id="pos-cart-panel"
            className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden sticky top-3 flex flex-col"
          >
            {/* 1. Executive Terminal Header (Dark Slate Command Strip) */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Receipt size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                      محطة الفاتورة والدفع الفوري
                    </h2>
                    {cart.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono tabular-nums text-[10px] font-bold">
                        {cartTotalBottles} عبوة · {cartTotalGrams} جم
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums truncate">
                    {cart.length > 0
                      ? `${cart.length} أصناف مسجلة · جاهزة للإصدار والطباعة`
                      : 'بانتظار اختيار العطور أو تركيب الميكس'}
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title="تفريغ الفاتورة بالكامل"
                >
                  <Trash2 size={11} />
                  <span>تفريغ</span>
                </button>
              )}
            </div>

            {/* 2. Integrated Customer CRM & VIP Loyalty Points Dock */}
            <div
              ref={customerSectionRef}
              className={`px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200/80 space-y-2 transition-colors ${
                isCustomerFieldsPulsing ? 'ring-2 ring-inset ring-[#0071E3] bg-blue-50/40' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-black text-slate-800 flex items-center gap-1.5">
                  <User size={12} className="text-[#0071E3]" />
                  <span>بيانات العميل وولاء النقاط (CRM):</span>
                </span>

                <div className="flex items-center gap-2">
                  {currentCustomerLoyaltyInfo && !currentCustomerLoyaltyInfo.isNewCustomer && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-[10px] flex items-center gap-1">
                      <Crown size={10} className="text-amber-600" />
                      <span>
                        {currentCustomerLoyaltyInfo.tier} · {currentCustomerLoyaltyInfo.netAvailablePoints} نقطة
                      </span>
                    </span>
                  )}

                  {(customerName.trim() || customerPhone.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName('');
                        setCustomerPhone('');
                        setRedeemedLoyaltyPoints(0);
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>
              </div>

              {/* Side-by-Side Customer Name & WhatsApp Phone Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <input
                  ref={customerNameInputRef}
                  type="text"
                  placeholder="اسم العميل..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      customerPhoneInputRef.current?.focus();
                    }
                  }}
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 focus:border-[#0071E3] text-xs font-bold text-slate-900 outline-none transition-colors"
                />

                <div className="relative">
                  <input
                    ref={customerPhoneInputRef}
                    type="tel"
                    placeholder="واتساب (010xxxxxxx)"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowSuggestions(false);
                        setIsCustomerFieldsPulsing(false);
                      }
                    }}
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 focus:border-[#0071E3] text-xs font-mono tabular-nums font-bold text-slate-900 outline-none transition-colors"
                    dir="ltr"
                  />
                  {showSuggestions && phoneSuggestions.length > 0 && (
                    <div className="absolute top-9 right-0 left-0 z-30 bg-white rounded-xl shadow-lg border border-slate-200 p-1 space-y-0.5">
                      {phoneSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleSelectCustomer(s);
                            setIsCustomerFieldsPulsing(false);
                          }}
                          className="w-full p-1.5 rounded-lg text-right hover:bg-slate-100 text-[11px] flex items-center justify-between gap-1 cursor-pointer"
                        >
                          <span className="font-bold text-slate-900 truncate">{s.name}</span>
                          <span className="font-mono tabular-nums text-slate-500 text-[10px]">{s.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Customer Selector Chips */}
              {previousCustomers.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                  <span className="text-[9px] font-bold text-slate-400 shrink-0 ml-1">عملاء سابقون:</span>
                  {previousCustomers.slice(0, 5).map((c, idx) => {
                    const isSelected =
                      (c.phone && customerPhone === c.phone) || (!c.phone && customerName === c.name);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleSelectCustomer(c);
                          setIsCustomerFieldsPulsing(false);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 border transition-colors flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-amber-300 border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200/80 hover:border-[#0071E3]'
                        }`}
                      >
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Instant 1-Click VIP Loyalty Points Redemption Strip (If eligible) */}
              {currentCustomerLoyaltyInfo && currentCustomerLoyaltyInfo.netAvailablePoints > 0 && cart.length > 0 && (
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/60 text-[10px]">
                  <span className="text-slate-600 font-medium">
                    رصيد مكافآت العميل:{' '}
                    <strong className="font-mono tabular-nums text-amber-800">
                      {currentCustomerLoyaltyInfo.netAvailablePoints} نقطة ({currentCustomerLoyaltyInfo.cashValueAvailable} ج)
                    </strong>
                  </span>
                  {redeemedLoyaltyPoints > 0 ? (
                    <button
                      type="button"
                      onClick={() => setRedeemedLoyaltyPoints(0)}
                      className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 transition-colors cursor-pointer"
                    >
                      إلغاء استبدال النقاط (-{loyaltyDiscountAmount} ج)
                    </button>
                  ) : (
                    optimalLoyaltyRedemption.points > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOneClickLoyaltyRedeem()}
                        className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors cursor-pointer"
                      >
                        تطبيق خصم الولاء (-{optimalLoyaltyRedemption.cashDiscount} ج)
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 3. Active Invoice Line Items List */}
            <div className="p-3.5 space-y-3">
              {cart.length === 0 ? (
                <div className="py-7 px-4 text-center text-slate-500 space-y-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mx-auto">
                    <ShoppingBag size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-black text-slate-900">
                      سلة الفاتورة جاهزة لاستقبال الأصناف
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                      اضغط على أي حجم عبوة مباشرة داخل بطاقة العطر للإضافة الفورية، أو استخدم زر{' '}
                      <strong className="text-slate-800">«تخصيص»</strong> لتعديل التركيز والسعر.
                    </p>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => searchInputRef.current?.focus()}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:border-[#0071E3] text-slate-800 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Search size={12} className="text-[#0071E3]" />
                      <span>بحث سريع (F2)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSmartSearchModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>ترشيح ذكي للعميل</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-0.5">
                  {cart.map((item, idx) => {
                    const lineTotal = item.sellingPrice * (item.quantity || 1);
                    return (
                      <div
                        key={item.cartItemId}
                        className="p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono tabular-nums text-[10px] font-bold text-slate-400">
                                #{idx + 1}
                              </span>
                              <h4 className="font-bold text-xs text-slate-900 truncate">{item.productName}</h4>
                              {item.isMix && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[9px] border border-amber-200">
                                  🧪 ميكس
                                </span>
                              )}
                              {item.isColoredBottle && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[9px]">
                                  ملونة
                                </span>
                              )}
                            </div>

                            {item.isMix && item.mixComponents && item.mixComponents.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.mixComponents.map((c, ci) => (
                                  <span
                                    key={ci}
                                    className="bg-amber-50 text-amber-950 px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums border border-amber-200/80"
                                  >
                                    {c.productName}: {c.grams}جم ({c.percentage}%)
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {item.brand} · {item.productType}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-left">
                              <span className="font-mono tabular-nums font-black text-xs sm:text-sm text-slate-900 block">
                                {lineTotal.toLocaleString('ar-EG')}{' '}
                                <span className="text-[10px] font-normal text-slate-500">{settings.currency}</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.cartItemId)}
                              className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="حذف الصنف من الفاتورة"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Quantity Stepper & Inline Bottle Size Switcher */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px] gap-2">
                          <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(item.cartItemId, (item.quantity || 1) - 1)}
                              className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                              title="تقليل الكمية"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="font-mono tabular-nums font-black text-xs px-1.5 min-w-5 text-center text-slate-900">
                              {item.quantity || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(item.cartItemId, (item.quantity || 1) + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                              title="زيادة الكمية"
                            >
                              <Plus size={10} />
                            </button>
                          </div>

                          {item.isMix ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold font-mono tabular-nums border border-amber-200/60">
                              زجاجة {item.bottleSize}مل
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                              {bottleSizes.slice(0, 4).map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => handleChangeCartItemBottle(item.cartItemId, b)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums transition-colors shrink-0 cursor-pointer ${
                                    item.bottleSize === b.sizeMl
                                      ? 'bg-slate-900 text-white font-bold'
                                      : 'bg-white border border-slate-200/70 text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {b.sizeMl}مل
                                </button>
                              ))}
                            </div>
                          )}

                          <span className="text-slate-500 font-mono tabular-nums font-bold text-[10px] shrink-0">
                            {item.essenceGrams * (item.quantity || 1)} جم زيت
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. Quick Add-Ons & Payment Controls */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                {/* Packaging & Invoice Discount Quick Toggles */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveCartDrawer(activeCartDrawer === 'packaging' ? 'none' : 'packaging')}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeCartDrawer === 'packaging'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : packagingId !== DEFAULT_PACKAGING_OPTIONS[0].id
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <span>🎁 التغليف ({selectedPackaging.type === 'basic' ? 'أساسي' : selectedPackaging.name})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCartDrawer(activeCartDrawer === 'discount' ? 'none' : 'discount')}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeCartDrawer === 'discount'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : totalAppliedDiscount > 0
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <span>🏷️ خصم الفاتورة {totalAppliedDiscount > 0 ? `(-${totalAppliedDiscount} ج)` : ''}</span>
                  </button>
                </div>

                {/* Expandable Packaging Drawer */}
                {activeCartDrawer === 'packaging' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px]">
                        خيارات التغليف والهدايا ({selectedPackaging.name}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveCartDrawer('none')}
                        className="text-[10px] text-[#0071E3] font-bold cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DEFAULT_PACKAGING_OPTIONS.map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setPackagingId(pkg.id)}
                          className={`p-2 rounded-lg text-[10px] font-bold transition-colors text-right border cursor-pointer flex items-center justify-between gap-1 ${
                            packagingId === pkg.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{pkg.name}</span>
                          <span
                            className={`font-mono tabular-nums text-[9px] shrink-0 px-1.5 py-0.5 rounded ${
                              packagingId === pkg.id ? 'bg-white/20 text-amber-300' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {pkg.type === 'basic' ? 'مشمول' : `${pkg.price} ج`}
                          </span>
                        </button>
                      ))}
                    </div>
                    {selectedPackaging.type === 'luxury' && (
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg text-[10px] border border-slate-200/70">
                        <span className="font-bold text-slate-800">حالة التغليف الفاخر:</span>
                        <button
                          type="button"
                          onClick={() => setIsPackagingPaid(!isPackagingPaid)}
                          className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                            isPackagingPaid ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isPackagingPaid ? `مباع للعميل (+${selectedPackaging.price} ج)` : 'هدية مجانية للعميل'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable Discount & Profit Safety Drawer */}
                {activeCartDrawer === 'discount' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-900 font-bold text-[11px]">آلية احتساب الخصم:</span>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70">
                        <button
                          type="button"
                          onClick={() => setDiscountInputMode('amount')}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                            discountInputMode === 'amount'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          بالمبلغ ({settings.currency})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountInputMode('percent')}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                            discountInputMode === 'percent'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          بالنسبة (%)
                        </button>
                      </div>
                    </div>

                    {discountInputMode === 'amount' ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-600 font-medium text-[11px]">
                          قيمة الخصم بالمبلغ ({settings.currency}):
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={orderDiscount || ''}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setOrderDiscount(val);
                            setDiscountPercentInput(
                              cartSubtotal > 0 ? Math.round((val / cartSubtotal) * 1000) / 10 : ''
                            );
                          }}
                          className="w-28 h-8 px-2 rounded-lg bg-white border border-slate-300 font-mono tabular-nums text-xs text-center font-bold outline-none focus:border-[#0071E3]"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-600 font-medium text-[11px]">نسبة الخصم المئوية (%):</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0%"
                            value={discountPercentInput}
                            onChange={(e) => {
                              const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                              setDiscountPercentInput(e.target.value === '' ? '' : pct);
                              const computedAmt = Math.round((cartSubtotal * pct) / 100);
                              setOrderDiscount(computedAmt);
                            }}
                            className="w-24 h-8 px-2 rounded-lg bg-white border border-slate-300 font-mono tabular-nums text-xs text-center font-bold outline-none focus:border-[#0071E3]"
                          />
                          <span className="font-mono tabular-nums text-[10px] font-bold text-rose-600">
                            = {orderDiscount} {settings.currency}
                          </span>
                        </div>
                      </div>
                    )}

                    {cart.length > 0 && (
                      <div className="p-2 rounded-lg bg-white border border-slate-200/80 grid grid-cols-2 gap-1.5 text-[10px] font-mono tabular-nums">
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">الإجمالي:</span>
                          <span className="font-bold text-slate-900">{cartSubtotal} ج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">الخصم:</span>
                          <span className="font-bold text-rose-600">-{totalAppliedDiscount} ج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">صافي البيع:</span>
                          <span className="font-bold text-[#0071E3]">{cartFinalTotal} ج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">العمولة:</span>
                          <span className="font-bold text-amber-700">{cartTotalCommission} ج</span>
                        </div>
                        {canViewCosts(currentUser) && (
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">التكلفة:</span>
                            <span className="font-bold text-slate-900">{cartTotalCost} ج</span>
                          </div>
                        )}
                        {canViewProfits(currentUser) && (
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">المساهمة:</span>
                            <span
                              className={`font-black ${
                                cartTotalNetProfit >= 10 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {cartTotalNetProfit} ج
                            </span>
                          </div>
                        )}
                        <div className="col-span-2 pt-1 border-t border-slate-100 flex justify-between items-center">
                          <span className="font-sans text-slate-500">أدنى صافي بيع مسموح:</span>
                          <span className="font-black text-slate-900">
                            {cartMinSafeNetPrice} ج (أقصى خصم: {cartMaxSafeDiscount} ج)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Segmented Payment Method Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-slate-700">طريقة السداد المعتمدة:</span>
                    <span className="text-slate-400 font-medium">{paymentMethod}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                    {(['نقدي', 'بطاقة', 'محفظة إلكترونية', 'تحويل بنكي'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                          paymentMethod === m
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m === 'نقدي' && <Wallet size={12} />}
                        {m === 'بطاقة' && <CreditCard size={12} />}
                        {m === 'محفظة إلكترونية' && <Coins size={12} />}
                        {m === 'تحويل بنكي' && <DollarSign size={12} />}
                        <span>{m === 'محفظة إلكترونية' ? 'محفظة' : m === 'تحويل بنكي' ? 'تحويل' : m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Tendered & Change Calculator */}
                {paymentMethod === 'نقدي' && cart.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-600 font-bold">حاسبة النقدية والباقي للعميل:</span>
                      {cashChange > 0 && (
                        <span className="text-emerald-700 font-black font-mono tabular-nums">
                          الباقي للعميل: {cashChange.toLocaleString('ar-EG')} {settings.currency}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder={`المبلغ المستلم (${cartFinalTotal})`}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 font-mono tabular-nums text-xs font-bold outline-none focus:border-[#0071E3]"
                      />
                      <button
                        type="button"
                        onClick={() => setCashTendered(cartFinalTotal)}
                        className="px-2 h-8 rounded-lg bg-white border border-slate-200 text-[10px] font-bold shrink-0 hover:bg-slate-100 cursor-pointer"
                      >
                        بالضبط
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashTendered((Number(cashTendered) || cartFinalTotal) + 50)}
                        className="px-2 h-8 rounded-lg bg-white border border-slate-200 text-[10px] font-mono tabular-nums font-bold shrink-0 hover:bg-slate-100 cursor-pointer"
                      >
                        +50
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashTendered((Number(cashTendered) || cartFinalTotal) + 100)}
                        className="px-2 h-8 rounded-lg bg-white border border-slate-200 text-[10px] font-mono tabular-nums font-bold shrink-0 hover:bg-slate-100 cursor-pointer"
                      >
                        +100
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Hard Block Rule (§28–§31) Safety Guard if Selling Below Cost */}
              {isCartBelowCost && !ownerOverrideGranted && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                    <span>❌ العملية مرفوضة (§28): تجاوز الحد الأدنى الصلب للسعر والمساهمة</span>
                  </div>
                  <p className="text-[11px] leading-tight text-rose-800">
                    {strictSaleSafety.rejectionReason ||
                      `لا يسمح النظام بعملية بيع طبيعية تقل فيها المساهمة عن 10 جنيهات (الحد الأدنى لصافي البيع: ${cartMinSafeNetPrice} ج | أقصى خصم مسموح: ${cartMaxSafeDiscount} ج).`}
                  </p>

                  <button
                    type="button"
                    onClick={() => setOwnerExceptionModalOpen(true)}
                    className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Lock size={12} />
                    <span>تحويل لمعاملة استثنائية معتمدة من المالك (0% عمولة)</span>
                  </button>
                </div>
              )}

              {ownerOverrideGranted && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>تم اعتماد استثناء المالك: {ownerExceptionReason}</span>
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-emerald-800">موثق في التدقيق</span>
                </div>
              )}

              {/* 6. High-Contrast Final Ledger & Checkout Action Dock */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-3">
                {totalAppliedDiscount > 0 && (
                  <div className="space-y-1 pb-2 border-b border-slate-800 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>إجمالي الأصناف قبل الخصم:</span>
                      <span className="font-mono tabular-nums font-bold text-slate-200">
                        {cartSubtotal.toLocaleString('ar-EG')} {settings.currency}
                      </span>
                    </div>
                    {loyaltyDiscountAmount > 0 && (
                      <div className="flex justify-between text-amber-300 font-bold">
                        <span>★ خصم نقاط الولاء ({redeemedLoyaltyPoints} نقطة):</span>
                        <span className="font-mono tabular-nums text-rose-400 font-black">
                          -{loyaltyDiscountAmount} {settings.currency}
                        </span>
                      </div>
                    )}
                    {orderDiscount > 0 && (
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>خصم ترويجي إضافي:</span>
                        <span className="font-mono tabular-nums">
                          -{orderDiscount} {settings.currency}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-end justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      صافي المطلوب سداده ({paymentMethod}):
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono tabular-nums font-bold">
                      <span>عمولة البيع ({tieredCommissionResult.effectiveRateLabel}):</span>
                      <span>+{cartTotalCommission} {settings.currency}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-2xl font-black font-mono tabular-nums text-white tracking-tight">
                      {cartFinalTotal.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-xs font-bold text-slate-400 mr-1">{settings.currency}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={cart.length === 0 || (isCartBelowCost && !ownerOverrideGranted)}
                  className={`w-full py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    cart.length > 0 && (!isCartBelowCost || ownerOverrideGranted)
                      ? 'bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-[0_6px_20px_rgba(0,113,227,0.4)] cursor-pointer active:scale-98'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Check size={18} strokeWidth={2.5} />
                  <span>
                    إصدار وطباعة الفاتورة ({cartFinalTotal.toLocaleString('ar-EG')} {settings.currency})
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* QUICK ACTIONS CIRCULAR FLOATING MENU (Within Main Container) */}
        {/* Immediate one-tap access: New Sale, Add Expense, Record Attendance */}
        {/* ======================================================== */}
        <div
          ref={quickActionsMenuRef}
          aria-label="قائمة الإجراءات السريعة للكاشير"
          className="fixed bottom-6 left-6 z-40 flex flex-col items-center"
        >
          <div className="relative z-40 flex items-center justify-center">
            {/* Decorative Subtle Rotating Orbital Halo Ring */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute w-44 h-44 rounded-full border border-dashed border-[#0071E3]/30 bg-gradient-to-tr from-[#0071E3]/[0.04] via-transparent to-[#C49746]/[0.08] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isQuickActionsMenuOpen
                  ? 'scale-100 rotate-180 opacity-100'
                  : 'scale-40 -rotate-90 opacity-0'
              }`}
            />

            {/* Rotational Satellite Container (Spirals open smoothly) */}
            <div
              className={`relative flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isQuickActionsMenuOpen ? 'rotate-0' : '-rotate-90'
              }`}
            >
              {/* Circular Radial Satellite Buttons */}
              {/* 1. New Sale (Top Node: 90 deg) */}
              <button
                type="button"
                onClick={handleQuickNewSale}
                aria-label="New Sale - بيع جديد"
                title="بيع جديد وتصفير الفاتورة فوراً (New Sale)"
                className={`group absolute flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer ${
                  isQuickActionsMenuOpen
                    ? '-translate-y-24 translate-x-0 rotate-0 opacity-100 scale-100 pointer-events-auto'
                    : 'translate-y-0 translate-x-0 -rotate-180 opacity-0 scale-50 pointer-events-none'
                }`}
              >
                <div
                  className={`w-13 h-13 rounded-full bg-gradient-to-tr from-[#0071E3] to-[#32ADE6] text-white shadow-[0_10px_28px_rgba(0,113,227,0.45)] border-2 border-white flex flex-col items-center justify-center hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-500 ${
                    isQuickActionsMenuOpen ? 'rotate-0' : '-rotate-180'
                  }`}
                >
                  <ShoppingBag size={18} />
                  <span className="text-[8px] font-black leading-none mt-0.5">بيع جديد</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#1D1D1F]/95 text-white text-[10px] font-black whitespace-nowrap shadow-md border border-white/15">
                  بيع جديد · New Sale
                </span>
              </button>

              {/* 2. Add Expense (Diagonal Node: 45 deg top-right) */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsMenuOpen(false);
                  setIsQuickExpenseModalOpen(true);
                }}
                aria-label="Add Expense - إضافة مصروف"
                title="تسجيل مصروف سريع من الكاشير (Add Expense)"
                className={`group absolute flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75 cursor-pointer ${
                  isQuickActionsMenuOpen
                    ? '-translate-y-16 translate-x-16 rotate-0 opacity-100 scale-100 pointer-events-auto'
                    : 'translate-y-0 translate-x-0 -rotate-180 opacity-0 scale-50 pointer-events-none'
                }`}
              >
                <div
                  className={`w-13 h-13 rounded-full bg-gradient-to-tr from-[#FF9500] to-[#FF3B30] text-white shadow-[0_10px_28px_rgba(255,149,0,0.45)] border-2 border-white flex flex-col items-center justify-center hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-500 ${
                    isQuickActionsMenuOpen ? 'rotate-0' : '-rotate-180'
                  }`}
                >
                  <DollarSign size={18} />
                  <span className="text-[8px] font-black leading-none mt-0.5">مصروف</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#1D1D1F]/95 text-white text-[10px] font-black whitespace-nowrap shadow-md border border-white/15">
                  إضافة مصروف · Add Expense
                </span>
              </button>

              {/* 3. Record Attendance (Right Node: 0 deg) */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsMenuOpen(false);
                  handleStartWork();
                  setAddedItemFlash(
                    `✅ تم تسجيل الحضور وفتح الوردية (${activeEmployeeName}) · الراتب الأساسي مثبت (${dailyBaseSalary} ${settings.currency})`
                  );
                  setTimeout(() => setAddedItemFlash(null), 3200);
                }}
                aria-label="Record Attendance - تسجيل الحضور"
                title="تسجيل الحضور وفتح الوردية بضغطة واحدة (Record Attendance)"
                className={`group absolute flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-150 cursor-pointer ${
                  isQuickActionsMenuOpen
                    ? 'translate-y-2 translate-x-24 rotate-0 opacity-100 scale-100 pointer-events-auto'
                    : 'translate-y-0 translate-x-0 -rotate-180 opacity-0 scale-50 pointer-events-none'
                }`}
              >
                <div
                  className={`w-13 h-13 rounded-full text-white shadow-[0_10px_28px_rgba(52,199,89,0.45)] border-2 border-white flex flex-col items-center justify-center hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-500 ${
                    isQuickActionsMenuOpen ? 'rotate-0' : '-rotate-180'
                  } ${
                    isShiftReady
                      ? 'bg-gradient-to-tr from-[#248A3D] to-[#34C759]'
                      : 'bg-gradient-to-tr from-[#34C759] to-emerald-500 animate-pulse'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  <span className="text-[8px] font-black leading-none mt-0.5">الحضور</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#1D1D1F]/95 text-white text-[10px] font-black whitespace-nowrap shadow-md border border-white/15">
                  {isShiftReady ? 'تأكيد الحضور · Attendance ✓' : 'تسجيل الحضور · Record Attendance'}
                </span>
              </button>
            </div>

            {/* Main Circular Floating Launcher Button */}
            <button
              type="button"
              onClick={() => setIsQuickActionsMenuOpen((prev) => !prev)}
              aria-expanded={isQuickActionsMenuOpen}
              aria-label="Quick Actions Menu - قائمة الإجراءات السريعة"
              title="قائمة الإجراءات السريعة (بيع جديد · إضافة مصروف · تسجيل الحضور)"
              className={`w-15 h-15 rounded-full flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer border-2 border-white/90 shadow-[0_14px_35px_rgba(0,0,0,0.28)] ${
                isQuickActionsMenuOpen
                  ? 'bg-[#1D1D1F] text-white rotate-180 scale-110 ring-4 ring-[#0071E3]/25'
                  : 'bg-gradient-to-tr from-[#1D1D1F] via-[#2C2C2E] to-[#0071E3] text-white rotate-0 hover:scale-105 hover:rotate-12 active:scale-95'
              }`}
            >
              {isQuickActionsMenuOpen ? (
                <X size={22} strokeWidth={2.5} className="transition-transform duration-300" />
              ) : (
                <>
                  <Zap size={20} className="text-[#C49746] fill-[#C49746] transition-transform duration-300" />
                  <span className="text-[8px] font-black tracking-tight mt-0.5 leading-none">
                    سريع
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* QUICK EXPENSE MODAL (One-Tap Cashier Expense Entry)      */}
      {/* ======================================================== */}
      {isQuickExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1D1D1F]/45 backdrop-blur-xl smart-modal-overlay animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl smart-modal-window rounded-[32px] p-5 w-full max-w-md border border-black/[0.08] shadow-[0_28px_80px_rgba(0,0,0,0.28)] space-y-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF9500] to-[#FF3B30] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <DollarSign size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-[#FF9500] uppercase tracking-wider block">
                    Quick Cashier Expense
                  </span>
                  <h4 className="text-sm font-black text-[#1D1D1F]">
                    إضافة مصروف تشغيلي سريع
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-black/[0.08] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* One-Tap Quick Presets for Cashier */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-[#86868B] block">
                اختيار سريع بضغطة واحدة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { title: 'ضيافة ومشروبات للعملاء', amount: 30, category: 'مصاريف تشغيل' as ExpenseCategory },
                  { title: 'أكياس وتغليف عاجل', amount: 50, category: 'مستلزمات وتغليف' as ExpenseCategory },
                  { title: 'نثريات ومواصلات شحن', amount: 40, category: 'صيانة ونثريات' as ExpenseCategory },
                  { title: 'شحن رصيد / كهرباء ومرافق', amount: 100, category: 'فواتير ومرافق' as ExpenseCategory },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuickExpenseTitle(preset.title);
                      setQuickExpenseAmount(preset.amount);
                      setQuickExpenseCategory(preset.category);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#F5F5F7] hover:bg-[#1D1D1F] text-[#1D1D1F] hover:text-white text-[10px] font-bold transition-all cursor-pointer border border-black/[0.06]"
                  >
                    {preset.title} ({preset.amount} ج)
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleQuickExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">
                  بيان المصروف:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شراء مستلزمات نظافة أو ضيافة..."
                  value={quickExpenseTitle}
                  onChange={(e) => setQuickExpenseTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] font-bold outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">
                    المبلغ ({settings.currency}):
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={quickExpenseAmount}
                    onChange={(e) =>
                      setQuickExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] font-mono font-black text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">
                    التصنيف:
                  </label>
                  <select
                    value={quickExpenseCategory}
                    onChange={(e) => setQuickExpenseCategory(e.target.value as ExpenseCategory)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] font-bold outline-none transition-all"
                  >
                    <option value="مصاريف تشغيل">مصاريف تشغيل</option>
                    <option value="مستلزمات وتغليف">مستلزمات وتغليف</option>
                    <option value="صيانة ونثريات">صيانة ونثريات</option>
                    <option value="فواتير ومرافق">فواتير ومرافق</option>
                    <option value="تسويق وإعلان">تسويق وإعلان</option>
                    <option value="رواتب">رواتب</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">
                  ملاحظات إضافية (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="أي تفاصيل إضافية..."
                  value={quickExpenseNotes}
                  onChange={(e) => setQuickExpenseNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickExpenseModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-[#F5F5F7] hover:bg-black/[0.08] text-[#1D1D1F] text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!quickExpenseTitle.trim() || !quickExpenseAmount || Number(quickExpenseAmount) <= 0}
                  className="flex-2 py-2.5 px-4 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white text-xs font-black shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={15} />
                  <span>حفظ المصروف فوراً</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MOBILE TOP DYNAMIC ISLAND CART BAR (Non-blocking, lg:hidden)*/}
      {/* ======================================================== */}
      {cart.length > 0 && (
        <aside aria-label="شريط السلة السريع العلوي" className="lg:hidden fixed top-[102px] left-3 right-3 z-30 animate-in fade-in slide-in-from-top-3 duration-250">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('pos-cart-panel');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="apple-btn w-full p-2.5 px-3.5 rounded-[20px] bg-[#161618]/95 backdrop-blur-2xl hover:bg-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] border border-white/15 flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShoppingBag size={16} />
              </div>
              <div className="text-right">
                <span className="text-xs font-black block">{cartTotalBottles} عبوات في الفاتورة الحالية</span>
                <span className="text-[10px] text-zinc-300 font-mono">انقر للانتقال للفاتورة والطباعة ↵</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono text-emerald-400">
                {cartFinalTotal.toLocaleString('ar-EG')} {settings.currency}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#0071E3] text-white text-[11px] font-black shadow-xs">
                إتمام
              </span>
            </div>
          </button>
        </aside>
      )}

      {/* ======================================================== */}
      {/* OWNER BELOW-COST EXCEPTION MODAL (Apple HIG Security Sheet)*/}
      {/* ======================================================== */}
      {ownerExceptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1D1D1F]/45 backdrop-blur-xl smart-modal-overlay animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl smart-modal-window rounded-[32px] p-5 w-full max-w-md border border-[#FF3B30]/25 shadow-[0_28px_80px_rgba(0,0,0,0.28)] space-y-3 overflow-hidden">
            <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FF3B30]/12 text-[#FF3B30] flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-[#FF3B30] uppercase tracking-wider block">Apple Security Override</span>
                  <h4 className="text-sm font-black text-[#1D1D1F]">تصريح استثناء بيع بأقل من التكلفة</h4>
                </div>
              </div>
              <button
                onClick={() => setOwnerExceptionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-black/[0.08] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFF5F5] border border-[#FF3B30]/20 text-xs text-[#1D1D1F] leading-relaxed">
              هذا الإجراء مقيد بصلاحية المالك (<strong className="text-[#FF3B30]">د. محمد</strong>). سيتم توثيق العملية فوراً في سجل التدقيق الرقابي (<strong className="font-mono">Audit Log</strong>) لحماية رأس المال.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">تصنيف سبب الاستثناء الإداري:</label>
                <select
                  value={ownerExceptionReason}
                  onChange={(e) => setOwnerExceptionReason(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] font-bold outline-none transition-all"
                >
                  <option value="تالف">بضاعة تالفة / عيب في الزجاجة</option>
                  <option value="تصفية">تصفية مخزون بطيء الحركة</option>
                  <option value="هدية">هدية أو عينة ترويجية معتمدة</option>
                  <option value="تعويض عميل">تعويض عميل عن خطأ سابق</option>
                  <option value="حالة إدارية خاصة">حالة إدارية خاصة بقرار المالك</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">تفاصيل وملاحظات الاستثناء:</label>
                <textarea
                  value={ownerExceptionNotes}
                  onChange={(e) => setOwnerExceptionNotes(e.target.value)}
                  placeholder="اكتب التوضيح الخاص بالاستثناء..."
                  className="w-full h-16 p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none resize-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-[#1D1D1F] block mb-1">توقيع واعتماد المالك (اكتب موافق أو د. محمد):</label>
                <input
                  type="text"
                  placeholder="د. محمد / موافق"
                  value={ownerPasswordInput}
                  onChange={(e) => setOwnerPasswordInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] font-bold outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOwnerExceptionModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-[#F5F5F7] hover:bg-black/[0.08] text-[#1D1D1F] text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!ownerPasswordInput.trim()) return;
                  setOwnerOverrideGranted(true);
                  setOwnerExceptionModalOpen(false);
                }}
                disabled={!ownerPasswordInput.trim()}
                className="flex-2 py-2.5 px-4 rounded-2xl bg-[#FF3B30] hover:bg-[#D70015] disabled:opacity-40 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                اعتماد الاستثناء وتمرير البيع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PRODUCT CONFIGURATION MODAL (Apple Store Configurator)   */}
      {/* ======================================================== */}
      {configuringProduct && (() => {
        const isSpecial = ['عود', 'مسك'].includes(configuringProduct.type);
        const alcoholMlEstimate = selectedBottle.isRollOn ? 0 : Math.max(0, selectedBottle.sizeMl - Math.round(essenceGrams) - 1);
        const concentrationPercent = Math.min(100, Math.round((essenceGrams / Math.max(1, selectedBottle.sizeMl)) * 100));

        return (
          <div className="fixed inset-0 z-50 bg-[#1D1D1F]/45 backdrop-blur-xl smart-modal-overlay animate-in fade-in duration-200">
            <div className="bg-white/98 backdrop-blur-2xl smart-modal-window rounded-[32px] p-4 sm:p-5 w-full max-w-3xl max-h-[92vh] border border-black/[0.08] shadow-[0_32px_90px_rgba(0,0,0,0.28)] flex flex-col justify-between gap-3 overflow-hidden">
            
            {/* Apple Configurator Modal Header */}
            <div className="flex items-start justify-between pb-2.5 border-b border-black/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#5856D6] text-white flex items-center justify-center shadow-sm shrink-0">
                  <Beaker size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#86868B]">
                    <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#1D1D1F] font-bold">{configuringProduct.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{configuringProduct.brand}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[#248A3D] font-bold">المخزون: {configuringProduct.stock_grams} جم</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#1D1D1F] mt-0.5">{configuringProduct.name}</h3>
                </div>
              </div>

              <button
                onClick={() => setConfiguringProduct(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 2-Column Horizontal Bento Grid with Smooth Top-to-Bottom Scrolling */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 overflow-y-auto modal-scroll-area pr-1">
              {/* Right Column (7 cols): Bottle Size Selector */}
              <div className="md:col-span-7 p-3 rounded-2xl bg-[#F5F5F7]/90 border border-black/[0.06] flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between text-xs shrink-0">
                  <div>
                    <span className="font-black text-[#1D1D1F] block">١. تحديد حجم الزجاجة (اختيار حر للبائع):</span>
                    <span className="text-[10px] text-[#636366]">اختر من الأحجام المعتمدة أو اكتب أي حجم بالملي</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-[#0071E3] text-white font-mono text-xs font-black">
                    {selectedBottle.sizeMl} مل
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {bottleSizes.map(bottle => {
                    const isSelected = customConfigSizeMl === '' && selectedBottle.id === bottle.id;
                    const pPrice = getApprovedSellingPrice({
                      bottle,
                      perfumeType: configuringProduct.type,
                      isColoredBottle: false,
                    }).price;
                    const hasColoredPriceForSize = !bottle.isRollOn && getApprovedSellingPrice({
                      bottle,
                      perfumeType: configuringProduct.type,
                      isColoredBottle: true,
                    }).isColoredAllowed;
                    return (
                      <button
                        key={bottle.id}
                        type="button"
                        onClick={() => {
                          setCustomConfigSizeMl('');
                          setSelectedBottle(bottle);
                          setEssenceGrams(bottle.essenceGrams);
                          if (bottle.isRollOn || !hasColoredPriceForSize) {
                            setConfigIsColoredBottle(false);
                          }
                        }}
                        className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-sm font-bold'
                            : 'bg-white border-black/[0.08] hover:border-[#0071E3] text-[#1D1D1F]'
                        }`}
                      >
                        <span className="text-xs font-black block font-mono">{bottle.sizeMl} مل {bottle.isRollOn ? '(رول)' : ''}</span>
                        <span className={`text-[9px] block ${isSelected ? 'text-blue-100' : 'text-[#86868B]'}`}>
                          {bottle.essenceGrams} جم زيت
                        </span>
                        <span className={`text-[10px] font-black block mt-0.5 ${isSelected ? 'text-white' : 'text-[#0071E3]'}`}>
                          {pPrice} ج
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Colored Bottle Selector (Section 7: العبوة الملونة) */}
                {!selectedBottle.isRollOn && (() => {
                  const coloredCheck = getApprovedSellingPrice({
                    bottle: selectedBottle,
                    perfumeType: configuringProduct.type,
                    isColoredBottle: true,
                  });
                  return (
                    <div className="p-2.5 rounded-2xl bg-white border border-black/[0.07] space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-black text-[#1D1D1F]">🎁 نوع الزجاجة (عادية 15ج / ملونة فاخرة 50ج):</span>
                        {coloredCheck.isColoredAllowed ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setConfigIsColoredBottle(false);
                                setCustomPrice('');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                !configIsColoredBottle
                                  ? 'bg-[#1D1D1F] text-white'
                                  : 'bg-[#F5F5F7] text-[#636366]'
                              }`}
                            >
                              عادية ({getApprovedSellingPrice({ bottle: selectedBottle, perfumeType: configuringProduct.type, isColoredBottle: false }).price} ج)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfigIsColoredBottle(true);
                                setCustomPrice('');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                                configIsColoredBottle
                                  ? 'bg-gradient-to-r from-[#C49746] to-amber-600 text-white shadow-2xs'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              🎨 عبوة ملونة ({coloredCheck.price} ج)
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            سعر الملون غير معتمد لهذه الفئة
                          </span>
                        )}
                      </div>
                      {!coloredCheck.isColoredAllowed && coloredCheck.coloredDisallowedReason && (
                        <p className="text-[10px] text-[#86868B] leading-tight">
                          ℹ️ {coloredCheck.coloredDisallowedReason}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Custom Bottle Size Input Field inside Config Modal */}
                <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between gap-2 shrink-0">
                  <span className="text-[11px] font-black text-[#1D1D1F]">حجم مخصص (مل):</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="3"
                      max="1000"
                      placeholder="اكتب الحجم..."
                      value={customConfigSizeMl}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                        setCustomConfigSizeMl(val);
                        if (val !== '') {
                          const dyn = buildDynamicBottleForMl(val, selectedBottle.isRollOn);
                          setSelectedBottle(dyn);
                          setEssenceGrams(dyn.essenceGrams);
                        }
                      }}
                      className="w-24 h-8 px-2.5 rounded-xl bg-white border border-[#0071E3]/40 focus:border-[#0071E3] font-mono text-xs font-black text-center text-[#0071E3] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const toggledRoll = !selectedBottle.isRollOn;
                        const dyn = buildDynamicBottleForMl(selectedBottle.sizeMl, toggledRoll);
                        setSelectedBottle(dyn);
                        setEssenceGrams(dyn.essenceGrams);
                      }}
                      className={`px-2.5 h-8 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        selectedBottle.isRollOn
                          ? 'bg-[#AF52DE] text-white border-[#AF52DE]'
                          : 'bg-white text-[#636366] border-black/[0.08]'
                      }`}
                    >
                      {selectedBottle.isRollOn ? '💧 رول أون بيور' : '💨 بخاخ كحول'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Left Column (5 cols): Concentration, Quantity, Price & Summary */}
              <div className="md:col-span-5 flex flex-col justify-between gap-2.5 overflow-hidden">
                {/* 2. Essence Concentration Adjuster */}
                <div className="p-3 rounded-2xl bg-[#F5F5F7]/90 border border-black/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-[#1D1D1F] block">٢. جرامات الزيت الخام:</span>
                      <span className="text-[10px] text-[#636366]">
                        المعيار: <strong>{selectedBottle.essenceGrams} جم</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEssenceGrams(Math.max(1, Math.round(essenceGrams) - 1))}
                        className="w-7 h-7 rounded-xl bg-white border border-black/[0.08] flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={Math.round(essenceGrams)}
                        onChange={(e) => setEssenceGrams(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                        className="w-14 h-7 rounded-xl bg-white border border-black/[0.08] font-mono font-black text-xs text-center text-[#1D1D1F] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEssenceGrams(Math.round(essenceGrams) + 1)}
                        className="w-7 h-7 rounded-xl bg-white border border-black/[0.08] flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Visual Formula Proportion Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="text-[#C49746]">🧪 زيت: {Math.round(essenceGrams)} جم ({concentrationPercent}%)</span>
                      {!selectedBottle.isRollOn && (
                        <span className="text-[#0071E3]">💧 كحول ومثبت: {alcoholMlEstimate + 1} مل</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/[0.06] overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-[#C49746] to-[#FF9500] transition-all duration-300"
                        style={{ width: `${concentrationPercent}%` }}
                      />
                      <div
                        className="h-full bg-[#0071E3]/60 transition-all duration-300"
                        style={{ width: `${Math.max(0, 100 - concentrationPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Quantity & Price Row */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Bottle Quantity Stepper */}
                  <div className="p-2.5 rounded-2xl bg-[#F5F5F7]/90 border border-black/[0.06] flex flex-col justify-between text-xs">
                    <span className="font-black text-[11px] text-[#1D1D1F] block mb-1">عدد العبوات:</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setConfigQuantity(Math.max(1, configQuantity - 1))}
                        className="w-7 h-7 rounded-xl bg-white border border-black/[0.08] flex items-center justify-center font-bold text-[#1D1D1F] cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-mono font-black text-sm text-center text-[#1D1D1F]">
                        {configQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfigQuantity(configQuantity + 1)}
                        className="w-7 h-7 rounded-xl bg-white border border-black/[0.08] flex items-center justify-center font-bold text-[#1D1D1F] cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Custom Price Overwrite */}
                  <div className="p-2.5 rounded-2xl bg-[#F5F5F7]/90 border border-black/[0.06] flex flex-col justify-between text-xs">
                    <span className="font-black text-[11px] text-[#1D1D1F] block mb-1">
                      السعر ({configItemSuggestedPrice} ج):
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder={`${configItemSuggestedPrice}`}
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full h-7 px-2 rounded-xl bg-white border border-black/[0.08] focus:border-[#0071E3] font-mono text-xs font-black text-center outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Item Live Summary & Contribution Breakdown */}
                <div className="p-3 rounded-2xl bg-[#1D1D1F] text-white space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-zinc-300 font-sans">الإجمالي للعميل:</span>
                    <span className="text-sm font-black text-[#34C759]">{configItemFinalPrice * configQuantity} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span className="font-sans">العمولة ({selectedBottle.isRollOn ? '0%' : '5%'}):</span>
                    <span className="font-bold text-amber-300">+{configItemCommission * configQuantity} {settings.currency}</span>
                  </div>
                  {canViewProfits(currentUser ?? null) && (
                    <div className="flex justify-between text-emerald-400 font-bold pt-0.5 border-t border-white/10">
                      <span className="font-sans">صافي المساهمة:</span>
                      <span>+{configItemNetProfit * configQuantity} {settings.currency}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-black/[0.06] shrink-0">
              {onOpenFormulationEngine && (
                <button
                  type="button"
                  onClick={() => {
                    const p = configuringProduct;
                    setConfiguringProduct(null);
                    onOpenFormulationEngine(p);
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-[#0071E3]/10 hover:bg-[#0071E3]/18 text-[#0071E3] text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Beaker size={14} />
                  <span className="hidden sm:inline">مختبر التركيب والتعتيق</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const p = configuringProduct;
                  setCompositionMode('mix');
                  setMixBottle(selectedBottle);
                  setMixIsColoredBottle(effectiveIsColored);
                  setMixComponents([
                    {
                      productId: p.id,
                      productName: p.name,
                      brand: p.brand,
                      productType: p.type,
                      grams: Math.round((selectedBottle.essenceGrams / 2) * 10) / 10,
                      availableStockGrams: p.stock_grams,
                    }
                  ]);
                  setConfiguringProduct(null);
                }}
                className="px-3 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="تحويل هذا العطر إلى تركيبة ميكس وإضافة عطور أخرى معه داخل نفس الزجاجة"
              >
                <Beaker size={14} className="text-amber-600" />
                <span>خلط في ميكس 🧪</span>
              </button>

              <div className="flex items-center gap-2 flex-1 justify-end">
                <button
                  type="button"
                  onClick={() => setConfiguringProduct(null)}
                  className="apple-btn px-5 py-2.5 rounded-2xl bg-[#F5F5F7] hover:bg-black/[0.08] text-xs font-bold text-[#1D1D1F] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="apple-btn flex-1 sm:flex-none py-2.5 px-6 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-apple-sm cursor-pointer"
                >
                  <Plus size={15} />
                  <span>إضافة للفاتورة ({selectedBottle.sizeMl} مل · {configItemFinalPrice * configQuantity} {settings.currency})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      {/* ======================================================== */}
      {/* SMART NATURAL LANGUAGE FRAGRANCE SEARCH MODAL            */}
      {/* ======================================================== */}
      <SmartFragranceSearchModal
        isOpen={showSmartSearchModal}
        onClose={() => setShowSmartSearchModal(false)}
        products={products}
        fragranceDatabase={fragranceDatabase}
        onAddToCart={(prod, chosenBottle) => {
          handleQuickAddWithBottle(prod, chosenBottle || activeSellerBottle, { stopPropagation: () => {} } as any);
        }}
      />

      {/* ======================================================== */}
      {/* STRATEGIC REORDER & REPLENISHMENT INVOICE MODAL          */}
      {/* ======================================================== */}
      {activeStrategicOrder && (
        <StrategicReplenishmentModal
          isOpen={showReplenishmentModal}
          onClose={() => setShowReplenishmentModal(false)}
          order={activeStrategicOrder}
          onUpdateOrder={(updated) => {
            setActiveStrategicOrder(updated);
            if (onSaveStrategicOrder) onSaveStrategicOrder(updated);
          }}
          allProducts={products}
          settings={settings}
          currentUser={currentUser ?? null}
          onAddAuditLog={onAddAuditLog}
        />
      )}

      {/* ======================================================== */}
      {/* TODAY'S SHORTAGES & MINIMUM THRESHOLD ALERT MODAL       */}
      {/* ======================================================== */}
      {showShortagesModal && (
        <ShortagesAlertModal
          products={products}
          currentUser={currentUser ?? null}
          onClose={() => {
            setShowShortagesModal(false);
            setIsInitialShiftOpenAlert(false);
          }}
          onSavePurchaseRequest={onSavePurchaseRequest}
          onStartSelling={() => {
            setShowShortagesModal(false);
            setIsInitialShiftOpenAlert(false);
          }}
          isInitialShiftOpen={isInitialShiftOpenAlert}
        />
      )}

      {/* ======================================================== */}
      {/* THERMAL RECEIPT & WHATSAPP MODAL                         */}
      {/* ======================================================== */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          settings={settings}
          onClose={() => setCompletedSale(null)}
          onUpdateSettings={onUpdateSettings}
          previousCustomers={previousCustomers}
          currentDailyNetContribution={todaysGrossProfit}
        />
      )}
    </div>
  );
};

export default POS;
