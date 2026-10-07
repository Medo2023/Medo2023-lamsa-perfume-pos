import React, { useState, useMemo, useEffect } from 'react';
import { 
  BottleSize, 
  StoreSettings, 
  DEFAULT_SETTINGS, 
  DEFAULT_BOTTLE_SIZES,
  FinancialVault,
  WithdrawalTransaction,
  VaultType,
  Sale,
  Expense,
  Product,
  StaffAttendanceRecord,
  AppUser,
  View,
  CustomCustomerRecord,
  LoyaltyAIAnalysisResult,
  calculateSafeLoyaltyRedemption,
  ReceiptDesignConfig,
  DEFAULT_RECEIPT_DESIGN,
  AuditLogRecord,
  buildCommercialReferenceRow,
  isLiveProductionSale,
  isLiveProductionWithdrawal
} from '../types';
import { ThermalReceiptLiveView } from './ReceiptModal';
import { AppleThemeStudioPanel } from './AppleThemeStudioModal';
import { DashboardLayoutStudioPanel } from './DashboardLayoutStudioPanel';
import { canViewProfits, canViewCosts } from '../services/authService';
import { analyzeLoyaltyProgramWithAI } from '../services/geminiService';
import { 
  Store, 
  Sliders, 
  Beaker, 
  Target, 
  Wallet, 
  ShieldCheck, 
  Receipt, 
  Package, 
  KeyRound, 
  RotateCcw, 
  Save, 
  Check, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  ArrowDownRight, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Building, 
  Coins, 
  Zap, 
  Users, 
  Eye, 
  EyeOff,
  Sparkles,
  ArrowRight,
  Crown,
  Gift,
  RefreshCw,
  TrendingUp,
  Power,
  Award,
  Calculator,
  Printer,
  Type,
  Layout,
  Palette,
  AlignCenter,
  AlignRight,
  AlignLeft
} from 'lucide-react';

export type SettingsSection = 
  | 'dashboard_layout'
  | 'themes'
  | 'loyalty_ai'
  | 'identity' 
  | 'pricing' 
  | 'budget' 
  | 'vaults' 
  | 'privacy' 
  | 'pos_receipts' 
  | 'inventory' 
  | 'security_backup';

interface SettingsProps {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  bottleSizes: BottleSize[];
  setBottleSizes: React.Dispatch<React.SetStateAction<BottleSize[]>>;
  vaults?: FinancialVault[];
  withdrawals?: WithdrawalTransaction[];
  sales?: Sale[];
  expenses?: Expense[];
  products?: Product[];
  customCustomers?: CustomCustomerRecord[];
  currentUser?: AppUser | null;
  attendanceRecords?: StaffAttendanceRecord[];
  onCheckInAttendance?: (record: StaffAttendanceRecord) => void;
  onAddWithdrawal?: (tx: WithdrawalTransaction, updatedVault: FinancialVault) => void;
  onNavigate?: (view: View) => void;
  onAddAuditLog?: (log: AuditLogRecord) => void;
  initialSection?: SettingsSection;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  setSettings,
  bottleSizes,
  setBottleSizes,
  vaults = [],
  withdrawals = [],
  sales = [],
  expenses = [],
  products = [],
  customCustomers = [],
  currentUser,
  attendanceRecords = [],
  onCheckInAttendance,
  onAddWithdrawal,
  onNavigate,
  onAddAuditLog,
  initialSection = 'budget'
}) => {
  const isOwner = currentUser?.role === 'OWNER';

  // Navigation tab index (defaulting to budget/targets)
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    initialSection === 'loyalty_ai' ? 'budget' : initialSection
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Sync if initialSection prop changes or if navigated from Dashboard customization button
  useEffect(() => {
    try {
      const requestedSection = sessionStorage.getItem('lamsa_open_settings_section') as SettingsSection | null;
      if (requestedSection) {
        sessionStorage.removeItem('lamsa_open_settings_section');
        setActiveSection(requestedSection);
        return;
      }
    } catch {
      // ignore storage errors
    }
    if (initialSection) {
      setActiveSection(initialSection === 'loyalty_ai' ? 'budget' : initialSection);
    }
  }, [initialSection]);

  // Local settings draft state
  const [localSettings, setLocalSettings] = useState<StoreSettings>(settings);
  const [receiptStudioTab, setReceiptStudioTab] = useState<'elements' | 'typography' | 'layout' | 'branding'>('elements');
  const [draftReceiptDesign, setDraftReceiptDesign] = useState<ReceiptDesignConfig>(() => ({
    ...DEFAULT_RECEIPT_DESIGN,
    ...(settings.receiptDesign || {}),
    showLogo: settings.receiptDesign?.showLogo ?? settings.showLogoOnReceipt ?? true,
  }));

  useEffect(() => {
    setLocalSettings(settings);
    setDraftReceiptDesign({
      ...DEFAULT_RECEIPT_DESIGN,
      ...(settings.receiptDesign || {}),
      showLogo: settings.receiptDesign?.showLogo ?? settings.showLogoOnReceipt ?? true,
    });
  }, [settings]);

  // Sample sale for Live Receipt Preview in Settings (Strictly isolated as DOC_EXAMPLE)
  const samplePreviewSale: Sale = useMemo(() => {
    const liveSales = sales.filter(s => isLiveProductionSale(s));
    if (liveSales.length > 0) {
      return liveSales[0];
    }
    return {
      id: 'DOC-PREVIEW-RECEIPT',
      date: new Date().toISOString(),
      customerName: 'معاينة تصميم الفاتورة',
      customerPhone: '01000000000',
      employeeName: 'طارق',
      paymentMethod: 'نقدي',
      discount: 10,
      totalPrice: 390,
      totalCost: 295,
      totalProfit: 95,
      dataClassification: 'DOC_EXAMPLE',
      isTestData: true,
      testClassificationNote: 'DOC_EXAMPLE / معاينة تصميم الفاتورة فقط — لا تدخل في المبيعات أو التقارير',
      items: [
        {
          id: 'item-1',
          productId: 1,
          productName: 'سوفاج ديور (Sauvage Elixir)',
          productType: 'عادي',
          bottleSize: 50,
          essenceGrams: 15,
          cost: 180,
          sellingPrice: 230,
          profit: 38.5,
          quantity: 1,
        },
        {
          id: 'item-2',
          productId: 2,
          productName: 'عود كمبودي ملكي خاص',
          productType: 'عود',
          bottleSize: 30,
          essenceGrams: 10,
          cost: 115,
          sellingPrice: 170,
          profit: 46.5,
          quantity: 1,
        },
      ],
    };
  }, [sales]);

  const handleApproveReceiptStudio = () => {
    const updated: StoreSettings = {
      ...localSettings,
      showLogoOnReceipt: draftReceiptDesign.showLogo,
      receiptDesign: draftReceiptDesign,
    };
    setLocalSettings(updated);
    setSettings(updated);
    setToastMessage('✅ تم اعتماد وتطبيق إعدادات الفاتورة والطباعة الشاملة بنجاح.');
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  const handleRestoreDefaultReceiptStudio = () => {
    setDraftReceiptDesign(DEFAULT_RECEIPT_DESIGN);
    setLocalSettings((prev) => ({
      ...prev,
      storeName: DEFAULT_SETTINGS.storeName,
      storeSlogan: DEFAULT_SETTINGS.storeSlogan,
      storePhone: DEFAULT_SETTINGS.storePhone,
      storeAddress: DEFAULT_SETTINGS.storeAddress,
      receiptFooterMessage: DEFAULT_SETTINGS.receiptFooterMessage,
      logoUrl: DEFAULT_SETTINGS.logoUrl,
      showLogoOnReceipt: true,
      receiptDesign: DEFAULT_RECEIPT_DESIGN,
    }));
    setToastMessage('🔄 تمت استعادة التصميم الافتراضي للفاتورة في المعاينة الفورية — اضغط اعتماد للحفظ.');
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3500);
  };

  const [isSavedToast, setIsSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('تم حفظ الإعدادات بنجاح ومزامنتها لحظياً.');

  // Smart Auto-Save: Persist any changes to localSettings or draftReceiptDesign automatically
  useEffect(() => {
    const mergedWithReceipt: StoreSettings = {
      ...localSettings,
      showLogoOnReceipt: draftReceiptDesign.showLogo,
      receiptDesign: draftReceiptDesign,
    };
    if (JSON.stringify(mergedWithReceipt) === JSON.stringify(settings)) return;
    const timer = window.setTimeout(() => {
      setSettings(mergedWithReceipt);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [localSettings, draftReceiptDesign]);

  // AI Loyalty Governance & Profit Alignment state
  const [loyaltyAiReport, setLoyaltyAiReport] = useState<LoyaltyAIAnalysisResult | null>(null);
  const [isAnalyzingLoyaltyAi, setIsAnalyzingLoyaltyAi] = useState(false);
  const [simBottlePrice, setSimBottlePrice] = useState<number>(230);
  const [simBottleCost, setSimBottleCost] = useState<number>(180);
  const [simCustomerPoints, setSimCustomerPoints] = useState<number>(100);

  // Bottle size add/edit modal & Owner Audit Reason
  const [isBottleModalOpen, setIsBottleModalOpen] = useState(false);
  const [editingBottle, setEditingBottle] = useState<BottleSize | null>(null);
  const [ownerAuditReason, setOwnerAuditReason] = useState<string>('تحديث معتمد من لوحة المالك وفق المرجع التجاري والمالي');
  const [bottleFormData, setBottleFormData] = useState<Partial<BottleSize>>({
    sizeMl: 50,
    essenceGrams: 15,
    bottleCost: 15,
    suggestedMargin: 35,
    normalPrice: 230,
    coloredNormalPrice: 300,
    specialPrice: 450,
    coloredSpecialPrice: undefined,
    officialCost: 180,
    isRollOn: false
  });

  // Owner withdrawal quick ledger modal
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawType, setWithdrawType] = useState<'owner_salary' | 'owner_profit' | 'restock' | 'utilities' | 'capital'>('owner_salary');
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [withdrawReason, setWithdrawReason] = useState('صرف جزء من مخصص راتب الإدارة المعتمد');
  const [withdrawRef, setWithdrawRef] = useState('');

  // Password change in security tab

  // Financial calculations summary (Live Production Data only)
  const liveSalesList = useMemo(() => sales.filter(s => isLiveProductionSale(s)), [sales]);
  const liveWithdrawalsList = useMemo(() => withdrawals.filter(w => isLiveProductionWithdrawal(w)), [withdrawals]);
  const totalRevenue = useMemo(() => liveSalesList.reduce((s, x) => s + (x.totalPrice || 0), 0), [liveSalesList]);
  const totalRestockCost = useMemo(() => liveSalesList.reduce((s, x) => s + (x.totalCost || 0), 0), [liveSalesList]);
  const restockWithdrawn = useMemo(() => {
    return liveWithdrawalsList.filter(w => w.vaultId === 'restock' && w.type !== 'capital_deposit').reduce((s, w) => s + w.amount, 0);
  }, [liveWithdrawalsList]);
  const restockBalance = Math.max(0, totalRestockCost - restockWithdrawn);

  // Today's net contribution for AI Loyalty alignment
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysSales = useMemo(() => liveSalesList.filter(s => s.date && s.date.startsWith(todayStr)), [liveSalesList, todayStr]);
  const todayNetContribution = useMemo(() => {
    const rev = todaysSales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
    const cost = todaysSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const comm = todaysSales.reduce((acc, s) => acc + (s.commissionAmount ?? (s.totalPrice * 0.05)), 0);
    return rev - cost - comm;
  }, [todaysSales]);

  // Run AI Loyalty Analysis
  const runLoyaltyAiAnalysis = async (overrideSettings?: StoreSettings) => {
    setIsAnalyzingLoyaltyAi(true);
    try {
      const report = await analyzeLoyaltyProgramWithAI({
        sales,
        customCustomers,
        settings: overrideSettings || localSettings,
        todayNetContribution,
        dailyBreakEvenTarget: 600,
      });
      setLoyaltyAiReport(report);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsAnalyzingLoyaltyAi(false);
    }
  };

  // Apply AI Recommended Loyalty Settings in 1 click
  const handleApplyAiLoyaltyRecommendation = () => {
    if (!loyaltyAiReport) return;
    const rec = loyaltyAiReport.recommendedSettings;
    const updated: StoreSettings = {
      ...localSettings,
      loyaltyEnabled: true,
      loyaltyAutoAI: rec.loyaltyAutoAI,
      loyaltyProtectBreakEven: rec.loyaltyProtectBreakEven,
      loyaltyStrategyMode: rec.loyaltyStrategyMode,
      loyaltyPointsPerSpendEgp: rec.loyaltyPointsPerSpendEgp,
      loyaltyPointsPerVisit: rec.loyaltyPointsPerVisit,
      loyaltyCashPerPointEgp: rec.loyaltyCashPerPointEgp,
      loyaltyMinRedeemPoints: rec.loyaltyMinRedeemPoints,
      loyaltyMaxBillDiscountPercent: rec.loyaltyMaxBillDiscountPercent,
      loyaltyMinSafeMarginEgp: rec.loyaltyMinSafeMarginEgp,
    };
    setLocalSettings(updated);
    setSettings(updated);
    setToastMessage('✨ تم اعتماد وتطبيق إعدادات الذكاء الاصطناعي لنقاط الولاء وحماية الأرباح بنجاح!');
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3500);
    runLoyaltyAiAnalysis(updated);
  };

  // Apply one of the 3 Smart AI Strategy Modes
  const handleSelectLoyaltyStrategyPreset = (mode: 'profit_shield' | 'balanced' | 'growth_vip') => {
    let updated: StoreSettings;
    if (mode === 'profit_shield') {
      updated = {
        ...localSettings,
        loyaltyEnabled: true,
        loyaltyStrategyMode: 'profit_shield',
        loyaltyPointsPerSpendEgp: 10,
        loyaltyPointsPerVisit: 3,
        loyaltyCashPerPointEgp: 0.5,
        loyaltyMinRedeemPoints: 20,
        loyaltyMaxBillDiscountPercent: 18,
        loyaltyMinSafeMarginEgp: 22,
        loyaltyProtectBreakEven: true,
      };
    } else if (mode === 'growth_vip') {
      updated = {
        ...localSettings,
        loyaltyEnabled: true,
        loyaltyStrategyMode: 'growth_vip',
        loyaltyPointsPerSpendEgp: 8,
        loyaltyPointsPerVisit: 8,
        loyaltyCashPerPointEgp: 0.75,
        loyaltyMinRedeemPoints: 10,
        loyaltyMaxBillDiscountPercent: 30,
        loyaltyMinSafeMarginEgp: 15,
        loyaltyProtectBreakEven: true,
      };
    } else {
      updated = {
        ...localSettings,
        loyaltyEnabled: true,
        loyaltyStrategyMode: 'balanced',
        loyaltyPointsPerSpendEgp: 10,
        loyaltyPointsPerVisit: 0,
        loyaltyCashPerPointEgp: 0.10,
        loyaltyMinRedeemPoints: 50,
        loyaltyMaxBillDiscountPercent: 25,
        loyaltyMinSafeMarginEgp: 10,
        loyaltyProtectBreakEven: true,
      };
    }
    setLocalSettings(updated);
    setSettings(updated);
    setToastMessage(
      mode === 'profit_shield'
        ? '🛡️ تم تفعيل وضع درع حماية الربح والتعادل بنجاح'
        : mode === 'growth_vip'
        ? '🚀 تم تفعيل وضع تنشيط المبيعات ومكافأة VIP بنجاح'
        : '⚖️ تم تفعيل وضع التوازن الذكي المعتمد بنجاح'
    );
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  // Live Simulator Calculation for Loyalty Profit Protection
  const simResult = useMemo(() => {
    const safeCalc = calculateSafeLoyaltyRedemption({
      billSubtotal: simBottlePrice,
      billTotalCost: simBottleCost,
      commissionRate: localSettings.commissionRate || 0.05,
      customerAvailablePoints: simCustomerPoints,
      settings: localSettings,
      todayNetContribution,
      dailyBreakEvenTarget: 600,
    });
    const netPriceAfterMaxDiscount = Math.max(0, simBottlePrice - safeCalc.maxSafeLoyaltyDiscountEgp);
    const commissionAfterDiscount = Math.round(netPriceAfterMaxDiscount * (localSettings.commissionRate || 0.05));
    const guaranteedStoreNetProfit = netPriceAfterMaxDiscount - simBottleCost - commissionAfterDiscount;
    const newPointsEarned = safeCalc.pointsEarnedOnNetBill(netPriceAfterMaxDiscount);

    return {
      ...safeCalc,
      netPriceAfterMaxDiscount,
      commissionAfterDiscount,
      guaranteedStoreNetProfit,
      newPointsEarned,
    };
  }, [simBottlePrice, simBottleCost, simCustomerPoints, localSettings, todayNetContribution]);

  // Menu items definition for the indexed side menu
  const menuItems: { id: SettingsSection; label: string; desc: string; icon: any; category: string }[] = [
    ...(isOwner
      ? [
          {
            id: 'dashboard_layout' as SettingsSection,
            label: 'تخصيص بطاقات Dashboard (للمالك)',
            desc: 'ترتيب وإظهار أهم التقارير المالية والتشغيلية حسب رغبتك',
            icon: Layout,
            category: 'لوحة القيادة والتقارير',
          },
        ]
      : []),
    {
      id: 'themes',
      label: 'الخطوط، الألوان، الأرقام، والثيمات (Typography & Themes)',
      desc: 'لون وحجم وسمك الخط، لغة الأرقام (١٢٣/123)، و20 ثيماً فاخراً',
      icon: Palette,
      category: 'المظهر والخطوط والجو العام'
    },
    {
      id: 'budget',
      label: 'الموازنة والتارجت وحوافز المبيعات',
      desc: 'الـ 15,000 ج.م، تارجت المساهمة، والعمولات',
      icon: Target,
      category: 'المبيعات والتارجت'
    },
    {
      id: 'identity',
      label: 'الهوية والمتجر',
      desc: 'الاسم، الشعار، العنوان، والواتساب',
      icon: Store,
      category: 'عام'
    },
    {
      id: 'pricing',
      label: 'التسعير والأحجام والخلطات',
      desc: 'أسعار الجرام، أحجام الزجاجات، والتكاليف',
      icon: Beaker,
      category: 'التسعير والمنتجات'
    },
    {
      id: 'vaults',
      label: 'الخزائن وقواعد المسحوبات',
      desc: 'المحافظ الثمانية وضوابط سحب المالك',
      icon: Wallet,
      category: 'المالية'
    },
    {
      id: 'privacy',
      label: 'الصلاحيات والسرية والخصوصية',
      desc: 'حجب الأرباح والتكاليف عن الكاشير',
      icon: ShieldCheck,
      category: 'الأمان والسرية'
    },
    {
      id: 'pos_receipts',
      label: 'الفواتير والطباعة والـ POS',
      desc: 'ترويسة الفاتورة، الشعار، وسياسة المتجر',
      icon: Receipt,
      category: 'المبيعات'
    },
    {
      id: 'inventory',
      label: 'المخزون والتنبيهات الذكية',
      desc: 'حد النقص بالجرام وإجراءات الجرد',
      icon: Package,
      category: 'المستودع'
    },
    {
      id: 'security_backup',
      label: 'الأمان والنسخ الاحتياطي',
      desc: 'كلمة المرور، تصدير JSON، والمزامنة',
      icon: KeyRound,
      category: 'الأمان والسرية'
    }
  ];

  // Filter menu items by search
  const filteredMenuItems = useMemo(() => {
    if (!searchTerm.trim()) return menuItems;
    const term = searchTerm.toLowerCase();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(term) || 
      item.desc.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  }, [searchTerm, menuItems]);

  // Save Settings handler with automatic Audit Trail logging (Old Value, New Value, Timestamp, Reason)
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onAddAuditLog) {
      const trackedFields: { key: keyof StoreSettings; label: string }[] = [
        { key: 'priceEssenceNormal', label: 'تكلفة جرام الزيت العادي' },
        { key: 'priceEssenceNiche', label: 'تكلفة جرام زيت النيش' },
        { key: 'priceEssenceSpecial', label: 'تكلفة جرام العود/المسك' },
        { key: 'standardBottleAndSprayCost', label: 'تكلفة العبوة العادية + البخاخ' },
        { key: 'coloredBottleCost', label: 'تكلفة العبوة الملونة' },
        { key: 'stickerCost', label: 'تكلفة الاستيكر' },
        { key: 'basicPlasticBagCost', label: 'تكلفة الكيس البلاستيك الأساسي' },
        { key: 'commissionRate', label: 'نسبة العمولة الأساسية' },
        { key: 'monthlyFixedBudget', label: 'الموازنة الشهرية الثابتة' },
        { key: 'dailyTargetProfit', label: 'التارجت اليومي' },
      ];
      trackedFields.forEach(({ key, label }) => {
        if (settings[key] !== localSettings[key]) {
          onAddAuditLog({
            id: `audit-${Date.now()}-${String(key)}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.fullName || 'د. محمد (المالك)',
            action: 'تعديل تسعير',
            entityType: 'pricing',
            entityId: String(key),
            entityName: label,
            oldValue: String(settings[key] ?? ''),
            newValue: String(localSettings[key] ?? ''),
            reason: ownerAuditReason.trim() || 'تعديل معتمد من لوحة المالك',
            approvedBy: 'المالك',
          });
        }
      });
    }
    setSettings(localSettings);
    setToastMessage('تم حفظ الإعدادات وتوثيق التغييرات في سجل الرقابة بنجاح.');
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  // Reset defaults handler
  const handleResetDefaults = () => {
    if (confirm('هل أنت متأكد من استعادة كافة الإعدادات الافتراضية المعتمدة للمتجر وفق المرجع التجاري والمالي؟')) {
      if (onAddAuditLog) {
        onAddAuditLog({
          id: `audit-reset-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: currentUser?.fullName || 'د. محمد (المالك)',
          action: 'تعديل تسعير',
          entityType: 'pricing',
          entityId: 'reset-defaults',
          entityName: 'المرجع التجاري والمالي للمنتجات',
          oldValue: 'إعدادات مخصصة',
          newValue: 'المرجع الافتراضي المعتمد',
          reason: ownerAuditReason.trim() || 'استعادة القيم المعيارية المعتمدة من لوحة المالك',
          approvedBy: 'المالك',
        });
      }
      setLocalSettings(DEFAULT_SETTINGS);
      setSettings(DEFAULT_SETTINGS);
      setBottleSizes(DEFAULT_BOTTLE_SIZES);
      setToastMessage('تمت استعادة الإعدادات الافتراضية وتوثيقها في سجل التدقيق.');
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 3000);
    }
  };

  // Bottle size modal handlers
  const handleOpenBottleModal = (bottle?: BottleSize) => {
    if (bottle) {
      setEditingBottle(bottle);
      setBottleFormData(bottle);
    } else {
      setEditingBottle(null);
      setBottleFormData({
        sizeMl: 50,
        essenceGrams: 15,
        bottleCost: 15,
        suggestedMargin: 35,
        normalPrice: 230,
        coloredNormalPrice: 300,
        specialPrice: 450,
        coloredSpecialPrice: undefined,
        officialCost: 180,
        isRollOn: false
      });
    }
    setIsBottleModalOpen(true);
  };

  const handleSaveBottleForm = () => {
    if (!bottleFormData.sizeMl || bottleFormData.sizeMl <= 0) {
      alert('يرجى تحديد حجم الزجاجة بالمليلتر.');
      return;
    }

    const calculatedCost = 
      (Number(bottleFormData.essenceGrams || 10) * localSettings.priceEssenceNormal) + 
      Number(bottleFormData.bottleCost || 15) + 
      (bottleFormData.isRollOn ? 0 : 5);

    const updatedBottle: BottleSize = {
      id: editingBottle ? editingBottle.id : `b-${bottleFormData.sizeMl}-${Date.now().toString(36)}`,
      sizeMl: Number(bottleFormData.sizeMl),
      essenceGrams: Number(bottleFormData.essenceGrams || 10),
      bottleCost: Number(bottleFormData.bottleCost || 15),
      suggestedMargin: Number(bottleFormData.suggestedMargin || 35),
      normalPrice: Number(bottleFormData.normalPrice || (calculatedCost + (bottleFormData.suggestedMargin || 35))),
      coloredNormalPrice: bottleFormData.coloredNormalPrice && Number(bottleFormData.coloredNormalPrice) > 0
        ? Number(bottleFormData.coloredNormalPrice)
        : undefined,
      specialPrice: Number(bottleFormData.specialPrice || (calculatedCost * 1.8)),
      coloredSpecialPrice: bottleFormData.coloredSpecialPrice && Number(bottleFormData.coloredSpecialPrice) > 0
        ? Number(bottleFormData.coloredSpecialPrice)
        : undefined,
      officialCost: Number(bottleFormData.officialCost || calculatedCost),
      isRollOn: Boolean(bottleFormData.isRollOn)
    };

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-bottle-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentUser?.fullName || 'د. محمد (المالك)',
        action: 'تعديل تسعير',
        entityType: 'pricing',
        entityId: updatedBottle.id,
        entityName: `حجم عبوة ${updatedBottle.sizeMl} مل ${updatedBottle.isRollOn ? '(رول)' : '(بخاخ)'}`,
        oldValue: editingBottle
          ? `عادي: ${editingBottle.normalPrice}ج | ملون: ${editingBottle.coloredNormalPrice || '—'} | نيش/عود: ${editingBottle.specialPrice}ج | تكلفة: ${editingBottle.officialCost}ج | زيت: ${editingBottle.essenceGrams}جم`
          : 'حجم جديد غير مسجل',
        newValue: `عادي: ${updatedBottle.normalPrice}ج | ملون: ${updatedBottle.coloredNormalPrice || '—'} | نيش/عود: ${updatedBottle.specialPrice}ج | تكلفة: ${updatedBottle.officialCost}ج | زيت: ${updatedBottle.essenceGrams}جم`,
        reason: ownerAuditReason.trim() || 'تعديل معتمد من لوحة المالك',
        approvedBy: 'المالك',
      });
    }

    if (editingBottle) {
      setBottleSizes(prev => prev.map(b => b.id === editingBottle.id ? updatedBottle : b));
    } else {
      setBottleSizes(prev => [...prev, updatedBottle].sort((a, b) => b.sizeMl - a.sizeMl));
    }

    setIsBottleModalOpen(false);
    setToastMessage('تم حفظ حجم الزجاجة وتوثيق القيمة القديمة والجديدة وتاريخ التغيير وسببه.');
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleDeleteBottleSize = (id: string) => {
    const targetBottle = bottleSizes.find(b => b.id === id);
    if (!targetBottle) return;
    const isCurrentlyActive = targetBottle.isActive !== false;
    const activeCount = bottleSizes.filter(b => b.isActive !== false).length;

    if (isCurrentlyActive && activeCount <= 1) {
      alert('يجب الإبقاء على حجم زجاجة واحد نشط على الأقل في النظام.');
      return;
    }

    const nextActiveState = !isCurrentlyActive;
    const actionConfirmMsg = isCurrentlyActive
      ? `هل تريد تحويل حجم الزجاجة (${targetBottle.sizeMl} مل) إلى حالة «غير نشط»؟ ستبقى جميع السجلات التاريخية محفوظة.`
      : `هل تريد إعادة تفعيل حجم الزجاجة (${targetBottle.sizeMl} مل) ليصبح «نشط» في الكاشير؟`;

    if (confirm(actionConfirmMsg)) {
      setBottleSizes(prev => prev.map(b => b.id === id ? { ...b, isActive: nextActiveState } : b));
      if (onAddAuditLog) {
        onAddAuditLog({
          id: `audit-bottle-status-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: currentUser?.fullName || 'د. محمد (المالك)',
          action: 'تعديل تسعير',
          entityType: 'pricing',
          entityId: targetBottle.id,
          entityName: `حالة حجم عبوة ${targetBottle.sizeMl} مل`,
          oldValue: isCurrentlyActive ? 'نشط' : 'غير نشط',
          newValue: nextActiveState ? 'نشط' : 'غير نشط (مع حفظ السجلات التاريخية)',
          reason: ownerAuditReason.trim() || (nextActiveState ? 'إعادة تفعيل الحجم من لوحة المالك' : 'إيقاف الحجم وتحويله إلى غير نشط مع بقاء السجلات التاريخية محفوظة'),
          approvedBy: 'المالك',
        });
      }
      setToastMessage(
        nextActiveState
          ? `تم إعادة تفعيل عبوة ${targetBottle.sizeMl} مل بنجاح.`
          : `تم تحويل عبوة ${targetBottle.sizeMl} مل إلى «غير نشط» مع الاحتفاظ بالسجلات التاريخية.`
      );
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 2800);
    }
  };

  // Owner withdrawal submission with ledger rules
  const handleExecuteWithdrawal = () => {
    if (!onAddWithdrawal || !withdrawAmount || Number(withdrawAmount) <= 0) return;

    const amount = Number(withdrawAmount);
    let targetVaultId: VaultType = 'salaries';
    let vaultName = '👤 مخصص راتب د. محمد (الإدارة)';
    let isCapital = false;

    if (withdrawType === 'owner_salary') {
      targetVaultId = 'salaries';
      vaultName = '👤 مخصص راتب د. محمد (الإدارة)';
    } else if (withdrawType === 'owner_profit') {
      targetVaultId = 'owner_profit';
      vaultName = '📈 محفظة الأرباح الصافية الحرة للمالك';
    } else if (withdrawType === 'restock') {
      targetVaultId = 'restock';
      vaultName = '🧴 قسم تكلفة المخزون وإعادة الشراء';
    } else if (withdrawType === 'utilities') {
      targetVaultId = 'utilities';
      vaultName = '🏪 محفظة المصروفات التشغيلية والمرافق';
    } else if (withdrawType === 'capital') {
      targetVaultId = 'capital';
      vaultName = '🔒 قسم رأس المال وتمويل صاحب المشروع';
      isCapital = true;
    }

    const activeVault = vaults.find(v => v.id === targetVaultId) || {
      id: targetVaultId,
      name: vaultName,
      description: 'محفظة مالية رسمية',
      currentBalance: 0,
      totalInflow: 0,
      totalWithdrawn: 0,
      withdrawalFrequency: 'anytime',
      iconName: 'Wallet',
    };

    const balanceBefore = activeVault.currentBalance;
    const balanceAfter = isCapital ? (balanceBefore + amount) : Math.max(0, balanceBefore - amount);

    const tx: WithdrawalTransaction = {
      id: `wth-${Date.now()}`,
      vaultId: targetVaultId,
      vaultName,
      type: isCapital ? 'capital_deposit' : 'withdrawal',
      amount,
      date: new Date().toISOString(),
      executedBy: currentUser?.displayName || 'د. محمد (صاحب المتجر)',
      recipientName: isCapital ? 'خزينة متجر لمسة عطر' : (currentUser?.displayName || 'د. محمد (صاحب المتجر)'),
      reason: withdrawReason.trim(),
      invoiceRef: withdrawRef.trim() || undefined,
      status: isCapital ? 'مؤكد ومودع' : 'مؤكد ومصروف',
      balanceBefore,
      balanceAfter,
      notes: `مسحوب رسمي مصنف - ممنوع السحب العشوائي غير الموثق`,
    };

    const updatedVault: FinancialVault = {
      ...activeVault,
      currentBalance: balanceAfter,
      totalInflow: isCapital ? (activeVault.totalInflow + amount) : activeVault.totalInflow,
      totalWithdrawn: !isCapital ? (activeVault.totalWithdrawn + amount) : activeVault.totalWithdrawn,
    };

    onAddWithdrawal(tx, updatedVault);
    setIsWithdrawModalOpen(false);
    setWithdrawAmount('');
    setWithdrawRef('');
    setToastMessage('تم تسجيل المعاملة المالية وترحيلها للخزائن بنجاح.');
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  // Export JSON Backup file
  const handleExportBackup = () => {
    const backupData = {
      version: '2.5',
      exportDate: new Date().toISOString(),
      storeName: localSettings.storeName,
      settings: localSettings,
      bottleSizes,
      productsCount: products.length,
      salesCount: sales.length,
      expensesCount: expenses.length,
      products,
      sales,
      expenses,
      vaults,
      withdrawals
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lamsa_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setToastMessage('تم تنزيل النسخة الاحتياطية الشاملة بصيغة JSON.');
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER & INSTANT SAVE BAR                         */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              مركز التحكم والإعدادات الشاملة (Unified Control Hub)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1D1D1F] tracking-tight mt-1">
            إعدادات النظام والتحكم المؤسسي
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B] mt-0.5">
            فهرس موحد لإدارة هوية المتجر، التسعير، الخزائن، موازنة الـ 15,000 ج.م، صلاحيات الموظفين، وسرية الإدارة.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>حفظ ذكي تلقائي نشط ✓</span>
          </span>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="apple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-black/[0.08] text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] shadow-apple-sm transition-all"
            title="استعادة القيم الافتراضية"
          >
            <RotateCcw size={14} />
            <span>الافتراضيات</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            className="apple-btn flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-apple-sm transition-all"
          >
            <Save size={15} />
            <span>تأكيد وتوثيق الآن</span>
          </button>
        </div>
      </div>

      {isSavedToast && (
        <div className="apple-glass rounded-2xl p-4 border border-emerald-300 bg-emerald-50 flex items-center gap-3 text-emerald-900 text-xs font-bold shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN 2-COLUMN LAYOUT: INDEXED SIDEBAR + ACTIVE PANEL  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Right in RTL): Navigation & Search Index */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Search Index Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث في الإعدادات والتحكم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 px-4 pr-10 rounded-2xl bg-white border border-black/[0.08] text-xs font-medium outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 shadow-apple-xs transition-all"
            />
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#86868B] hover:text-[#1D1D1F]"
              >
                مسح
              </button>
            )}
          </div>

          {/* Navigation Category List */}
          <div className="apple-glass rounded-3xl p-2 border border-black/[0.06] shadow-apple-sm space-y-1">
            {filteredMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`apple-btn w-full p-3 rounded-2xl text-right transition-all flex items-start gap-3 ${
                    isActive 
                      ? 'bg-[#1D1D1F] text-white shadow-apple-sm' 
                      : 'hover:bg-black/[0.04] text-[#1D1D1F]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                    isActive 
                      ? 'bg-[#C49746] text-white' 
                      : 'bg-black/[0.04] text-[#0071E3]'
                  }`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs font-black block truncate leading-tight ${isActive ? 'text-white' : 'text-[#1D1D1F]'}`}>
                      {item.label}
                    </span>
                    <span className={`text-[11px] block truncate mt-0.5 ${isActive ? 'text-gray-300' : 'text-[#86868B]'}`}>
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Manager Privileges Badge */}
          <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5 text-right">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldCheck size={16} className="text-amber-700 shrink-0" />
              <span>خصوصية وسرية الإدارة:</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              هذا المركز مخصص حصرياً للمدير العام. كافة هوامش الربح وتكاليف الخامات تُحجب تلقائياً عن شاشات الموظفين والكاشير.
            </p>
          </div>
        </div>

        {/* Right Column (Left in RTL): Active Settings Screen */}
        <div className="lg:col-span-8 space-y-5">

          {/* ======================================================== */}
          {/* SECTION: OWNER DASHBOARD CARDS & REPORTS CUSTOMIZATION   */}
          {/* ======================================================== */}
          {activeSection === 'dashboard_layout' && (
            <div className="animate-in fade-in duration-150">
              <DashboardLayoutStudioPanel
                settings={localSettings}
                currentUser={currentUser}
                onUpdateSettings={(updater) => {
                  setLocalSettings((prev) => {
                    const next = updater(prev);
                    setSettings(next);
                    return next;
                  });
                }}
                onNotify={(msg) => {
                  setToastMessage(`📊 ${msg}`);
                  setIsSavedToast(true);
                  setTimeout(() => setIsSavedToast(false), 3000);
                }}
                onNavigateToDashboard={
                  onNavigate ? () => onNavigate(View.DASHBOARD) : undefined
                }
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION: APPLE DYNAMIC THEMES & ATMOSPHERE STUDIO        */}
          {/* ======================================================== */}
          {activeSection === 'themes' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card animate-in fade-in duration-150">
              <AppleThemeStudioPanel
                settings={localSettings}
                onUpdateSettings={(updater) => {
                  setLocalSettings((prev) => {
                    const next = updater(prev);
                    setSettings(next);
                    return next;
                  });
                }}
                onNotify={(title) => {
                  setToastMessage(`🎨 ${title}`);
                  setIsSavedToast(true);
                  setTimeout(() => setIsSavedToast(false), 3000);
                }}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 0: SMART LOYALTY ENGINE & AI PROFIT GOVERNANCE   */}
          {/* ======================================================== */}
          {activeSection === 'loyalty_ai' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 1. Master Loyalty Engine Control & AI Autopilot Card */}
              <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      localSettings.loyaltyEnabled !== false
                        ? 'bg-gradient-to-tr from-[#1D1D1F] to-[#3A3A3C] text-amber-400'
                        : 'bg-black/[0.06] text-[#86868B]'
                    }`}>
                      <Crown size={24} className={localSettings.loyaltyEnabled !== false ? 'fill-amber-400/20' : ''} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black text-[#1D1D1F]">
                          محرك نقاط الولاء والإدارة الذكية بالذكاء الاصطناعي
                        </h2>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          localSettings.loyaltyEnabled !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {localSettings.loyaltyEnabled !== false ? '● مفعّل ونشط في الكاشير' : '○ متوقف مؤقتاً'}
                        </span>
                      </div>
                      <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                        تحكم كامل في تفعيل أو إيقاف نقاط الولاء، مع معادلة حماية صارمة تضمن عدم تأثر صافي ربح المتجر أو نقطة التعادل اليومية (600 ج.م) على حساب إرضاء العميل.
                      </p>
                    </div>
                  </div>

                  {/* Instant Master Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = localSettings.loyaltyEnabled === false ? true : false;
                      const updated = { ...localSettings, loyaltyEnabled: nextEnabled };
                      setLocalSettings(updated);
                      setSettings(updated);
                      setToastMessage(
                        nextEnabled
                          ? '✅ تم تفعيل محرك نقاط الولاء في الكاشير وسجل العملاء فوراً'
                          : '⏸️ تم إيقاف احتساب واستبدال نقاط الولاء مؤقتاً'
                      );
                      setIsSavedToast(true);
                      setTimeout(() => setIsSavedToast(false), 3000);
                    }}
                    className={`apple-btn px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shrink-0 shadow-xs transition-all cursor-pointer ${
                      localSettings.loyaltyEnabled !== false
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    <Power size={15} />
                    <span>{localSettings.loyaltyEnabled !== false ? 'مفعّل — اضغط للإيقاف المؤقت' : 'متوقف — اضغط لتفعيل النظام'}</span>
                  </button>
                </div>

                {/* Master Smart Switches Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Switch 1: AI Autopilot */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-blue-50/40 border border-amber-300/60 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-black text-[#1D1D1F]">
                        <Sparkles size={14} className="text-[#0071E3]" />
                        <span>الإدارة الذكية الكاملة بالذكاء الاصطناعي (AI Autopilot)</span>
                      </div>
                      <p className="text-[11px] text-[#636366] leading-relaxed">
                        يضبط سقف استبدال النقاط تلقائياً حسب مبيعات اليوم وحالة المتجر لحماية صافي الربح.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={localSettings.loyaltyAutoAI !== false}
                        onChange={(e) => {
                          const updated = { ...localSettings, loyaltyAutoAI: e.target.checked };
                          setLocalSettings(updated);
                          setSettings(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0071E3]"></div>
                    </label>
                  </div>

                  {/* Switch 2: Break-Even 600 EGP Protection */}
                  <div className="p-4 rounded-2xl bg-white border border-black/[0.08] flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-black text-[#1D1D1F]">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>درع حماية نقطة التعادل اليومية (600 ج.م)</span>
                      </div>
                      <p className="text-[11px] text-[#636366] leading-relaxed">
                        يمنع الخصومات الكبيرة بالنقاط قبل تغطية مصاريف اليوم الثابتة (600 ج.م) لضمان عدم تضرر المتجر.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={localSettings.loyaltyProtectBreakEven !== false}
                        onChange={(e) => {
                          const updated = { ...localSettings, loyaltyProtectBreakEven: e.target.checked };
                          setLocalSettings(updated);
                          setSettings(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. AI Smart Analysis & Store Profit Alignment Panel */}
              <div className="rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-[#1D1D1F] via-[#25221B] to-[#1D1D1F] text-white border border-[#C49746]/40 shadow-apple-lg space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#C49746] to-amber-300 text-[#1D1D1F] flex items-center justify-center font-black shadow-sm shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          التحليل الذكي بالذكاء الاصطناعي وتوافق ربحية المتجر
                        </h3>
                        <span className="text-[11px] font-mono font-bold text-amber-300">
                          · Gemini 3.8 Flash
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-0.5">
                        دراسة لحظية لبيانات المبيعات، هوامش الربح، وأرصدة نقاط العملاء لمنع أي تآكل في الأرباح
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {loyaltyAiReport && (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black">
                        مؤشر الأمان الربحي: {loyaltyAiReport.healthScore}%
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => runLoyaltyAiAnalysis()}
                      disabled={isAnalyzingLoyaltyAi}
                      className="apple-btn p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer"
                      title="إعادة فحص وتحليل بيانات المبيعات والولاء"
                    >
                      <RefreshCw size={15} className={isAnalyzingLoyaltyAi ? 'animate-spin text-amber-400' : ''} />
                    </button>
                  </div>
                </div>

                {/* Live Financial Alignment Telemetry */}
                {loyaltyAiReport && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1">
                        <span className="text-[10px] text-zinc-400 block">نسبة خصم الولاء من مجمل الربح</span>
                        <span className="text-xl font-black font-mono text-emerald-400 block">
                          {loyaltyAiReport.metrics.discountToGrossProfitRatioPercent}%
                        </span>
                        <span className="text-[10px] text-zinc-300 block">
                          إجمالي خصومات الولاء: {loyaltyAiReport.metrics.totalLoyaltyDiscountsGrantedEgp} ج
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1">
                        <span className="text-[10px] text-zinc-400 block">الرصيد المتاح في محافظ العملاء</span>
                        <span className="text-xl font-black font-mono text-amber-300 block">
                          {loyaltyAiReport.metrics.unredeemedPointsBalance} نقطة
                        </span>
                        <span className="text-[10px] text-zinc-300 block">
                          قيمتها النقدية: {loyaltyAiReport.metrics.unredeemedCashLiabilityEgp} ج.م
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1">
                        <span className="text-[10px] text-zinc-400 block">متوسط فاتورة عميل الولاء</span>
                        <span className="text-xl font-black font-mono text-white block">
                          {loyaltyAiReport.metrics.loyaltyAvgBasketEgp} ج.م
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold block">
                          +{loyaltyAiReport.metrics.basketUpliftPercent}% أعلى من العميل العابر
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1">
                        <span className="text-[10px] text-zinc-400 block">حالة تعادل اليوم (600 ج.م)</span>
                        <span className={`text-base font-black block ${todayNetContribution >= 600 ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {todayNetContribution >= 600 ? 'مغطى بالكامل ✓' : `محقق ${Math.round(todayNetContribution)} / 600 ج`}
                        </span>
                        <span className="text-[10px] text-zinc-300 block">
                          {todayNetContribution >= 600 ? 'يسمح بالمرونة الكاملة' : 'درع حماية الهامش نشط'}
                        </span>
                      </div>
                    </div>

                    {/* Executive AI Verdict & Profit Protection Report */}
                    <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-black text-amber-300">
                          {loyaltyAiReport.statusTitle}
                        </span>
                        <span className="text-[10px] text-emerald-300 font-bold">
                          {loyaltyAiReport.profitSafetyStatus}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {loyaltyAiReport.executiveSummary}
                      </p>
                      <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-emerald-300 font-bold">
                        <ShieldCheck size={14} className="shrink-0" />
                        <span>{loyaltyAiReport.profitAlignmentReport}</span>
                      </div>
                    </div>

                    {/* 4 Studied AI Tactical Recommendations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {loyaltyAiReport.tacticalSuggestions.map((sug, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-white">{i + 1}. {sug.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 leading-relaxed">{sug.detail}</p>
                          <div className="text-[10px] font-bold text-amber-300 pt-0.5">
                            الأثر المتوقع: {sug.impact}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* One-Click Apply AI Optimal Settings Bar */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#C49746]/25 to-emerald-500/20 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-amber-200 block">
                          توصية الذكاء الاصطناعي للإعدادات المثالية الآن:
                        </span>
                        <p className="text-[11px] text-zinc-200">
                          {loyaltyAiReport.recommendedSettings.reasoning}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyAiLoyaltyRecommendation}
                        className="apple-btn px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#C49746] hover:brightness-110 text-[#1D1D1F] text-xs font-black flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                      >
                        <Sparkles size={14} />
                        <span>تطبيق الضبط الذكي الموصى به بضغطة زر</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 3. Three Studied AI Strategy Modes (One-Click Presets) */}
              <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-[#1D1D1F]">
                      أوضاع السياسة الذكية لنقاط الولاء (اختر الوضع المناسب لحالة المتجر)
                    </h3>
                    <p className="text-xs text-[#86868B]">
                      كل وضع مضبوط رياضياً ليحقق التوازن بين إرضاء الزبون وحماية ربح المتجر وموازنة الـ 15,000 ج.م.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Mode 1: Profit Shield */}
                  <button
                    type="button"
                    onClick={() => handleSelectLoyaltyStrategyPreset('profit_shield')}
                    className={`p-4 rounded-2xl border text-right transition-all space-y-2 cursor-pointer ${
                      localSettings.loyaltyStrategyMode === 'profit_shield'
                        ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-md'
                        : 'bg-white hover:bg-black/[0.02] text-[#1D1D1F] border-black/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">🛡️ درع حماية الربح الصارم</span>
                      {localSettings.loyaltyStrategyMode === 'profit_shield' && (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${
                      localSettings.loyaltyStrategyMode === 'profit_shield' ? 'text-zinc-300' : 'text-[#86868B]'
                    }`}>
                      مثالي قبل الوصول لنقطة التعادل (600 ج.م)؛ يمنح النقطة قيمة 0.50 ج.م ويحمي هامش ربح لا يقل عن 22 ج.م لكل فاتورة.
                    </p>
                    <div className={`text-[10px] font-mono font-bold pt-1 ${
                      localSettings.loyaltyStrategyMode === 'profit_shield' ? 'text-amber-300' : 'text-[#0071E3]'
                    }`}>
                      أقصى خصم: 18% · هامش محمي: +22 ج
                    </div>
                  </button>

                  {/* Mode 2: Smart Balanced (Recommended) */}
                  <button
                    type="button"
                    onClick={() => handleSelectLoyaltyStrategyPreset('balanced')}
                    className={`p-4 rounded-2xl border text-right transition-all space-y-2 cursor-pointer ${
                      (localSettings.loyaltyStrategyMode || 'balanced') === 'balanced'
                        ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-md'
                        : 'bg-white hover:bg-black/[0.02] text-[#1D1D1F] border-black/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">⚖️ التوازن الذكي المعتمد</span>
                      {(localSettings.loyaltyStrategyMode || 'balanced') === 'balanced' && (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${
                      (localSettings.loyaltyStrategyMode || 'balanced') === 'balanced' ? 'text-zinc-300' : 'text-[#86868B]'
                    }`}>
                      القاعدة المعتمدة (§47): كل 10 جنيه = 1 نقطة، و100 نقطة = 10 جنيه خصم (1% استرجاع) مع حماية حد المساهمة 10 ج.
                    </p>
                    <div className={`text-[10px] font-mono font-bold pt-1 ${
                      (localSettings.loyaltyStrategyMode || 'balanced') === 'balanced' ? 'text-amber-300' : 'text-[#0071E3]'
                    }`}>
                      100 نقطة = 10 ج · حد المساهمة: +10 ج
                    </div>
                  </button>

                  {/* Mode 3: VIP Growth */}
                  <button
                    type="button"
                    onClick={() => handleSelectLoyaltyStrategyPreset('growth_vip')}
                    className={`p-4 rounded-2xl border text-right transition-all space-y-2 cursor-pointer ${
                      localSettings.loyaltyStrategyMode === 'growth_vip'
                        ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-md'
                        : 'bg-white hover:bg-black/[0.02] text-[#1D1D1F] border-black/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">🚀 تنشيط المبيعات وVIP</span>
                      {localSettings.loyaltyStrategyMode === 'growth_vip' && (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${
                      localSettings.loyaltyStrategyMode === 'growth_vip' ? 'text-zinc-300' : 'text-[#86868B]'
                    }`}>
                      مثالي أيام الذروة وبعد تخطي التارجت لتحفيز شراء العبوات الكبيرة 50 مل و100 مل مع بقاء التكلفة والهامش محميين.
                    </p>
                    <div className={`text-[10px] font-mono font-bold pt-1 ${
                      localSettings.loyaltyStrategyMode === 'growth_vip' ? 'text-amber-300' : 'text-[#0071E3]'
                    }`}>
                      أقصى خصم: 30% · هامش محمي: +15 ج
                    </div>
                  </button>
                </div>
              </div>

              {/* 4. Granular Loyalty Parameters & Rules */}
              <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <h3 className="text-base font-black text-[#1D1D1F]">
                      الضبط الدقيق لمعادلات اكتساب واستبدال النقاط وحماية الهامش
                    </h3>
                    <p className="text-xs text-[#86868B]">
                      تُطبق هذه المعادلات فوراً في شاشة الكاشير (`POS`) وسجل العملاء (`CRM`) والفواتير.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSettings()}
                    className="apple-btn px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save size={14} />
                    <span>اعتماد المعادلات</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  {/* Parameter 1 */}
                  <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                    <label className="font-bold text-[#1D1D1F] block">معدل كسب النقاط من المبيعات:</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#86868B] shrink-0">1 نقطة لكل</span>
                      <input
                        type="number"
                        min={1}
                        value={localSettings.loyaltyPointsPerSpendEgp ?? 10}
                        onChange={(e) => setLocalSettings({ ...localSettings, loyaltyPointsPerSpendEgp: Math.max(1, Number(e.target.value) || 10) })}
                        className="w-full h-9 px-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono text-sm font-black text-center outline-none focus:border-[#0071E3]"
                      />
                      <span className="font-bold text-[#1D1D1F]">ج.م</span>
                    </div>
                    <span className="text-[10px] text-[#86868B] block">الموصى به: 1 نقطة لكل 10 ج.م</span>
                  </div>

                  {/* Parameter 2 */}
                  <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                    <label className="font-bold text-[#1D1D1F] block">مكافأة الزيارة / الفاتورة:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={localSettings.loyaltyPointsPerVisit ?? 0}
                        onChange={(e) => setLocalSettings({ ...localSettings, loyaltyPointsPerVisit: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full h-9 px-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono text-sm font-black text-center outline-none focus:border-[#0071E3]"
                      />
                      <span className="font-bold text-[#1D1D1F] shrink-0">نقطة / فاتورة</span>
                    </div>
                    <span className="text-[10px] text-[#86868B] block">المعتمد: 0 نقطة (النقاط على صافي المبيعات)</span>
                  </div>

                  {/* Parameter 3 */}
                  <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                    <label className="font-bold text-[#1D1D1F] block">قيمة النقطة عند الخصم النقدي:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.05"
                        min={0.05}
                        max={5}
                        value={localSettings.loyaltyCashPerPointEgp ?? 0.10}
                        onChange={(e) => setLocalSettings({ ...localSettings, loyaltyCashPerPointEgp: Math.max(0.05, Number(e.target.value) || 0.10) })}
                        className="w-full h-9 px-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono text-sm font-black text-center text-[#0071E3] outline-none focus:border-[#0071E3]"
                      />
                      <span className="font-bold text-[#1D1D1F] shrink-0">ج.م / نقطة</span>
                    </div>
                    <span className="text-[10px] text-[#86868B] block">المعتمد: 0.10 ج.م (100 نقطة = 10 ج.م خصم)</span>
                  </div>

                  {/* Parameter 4 */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                    <label className="font-black text-emerald-950 block">🛡️ الحد الأدنى المحمي للمساهمة:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={5}
                        value={localSettings.loyaltyMinSafeMarginEgp ?? 10}
                        onChange={(e) => setLocalSettings({ ...localSettings, loyaltyMinSafeMarginEgp: Math.max(5, Number(e.target.value) || 10) })}
                        className="w-full h-9 px-2 rounded-xl bg-white border border-emerald-300 font-mono text-sm font-black text-center text-emerald-800 outline-none focus:border-emerald-600"
                      />
                      <span className="font-bold text-emerald-950 shrink-0">ج.م مساهمة</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-medium block">
                      الحد الأدنى للمساهمة بعد الخصم والعمولة (10 ج)
                    </span>
                  </div>

                  {/* Parameter 5 */}
                  <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                    <label className="font-bold text-[#1D1D1F] block">أقصى نسبة خصم من الفاتورة:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={5}
                        max={60}
                        value={localSettings.loyaltyMaxBillDiscountPercent ?? 25}
                        onChange={(e) => setLocalSettings({ ...localSettings, loyaltyMaxBillDiscountPercent: Math.min(60, Math.max(5, Number(e.target.value) || 25)) })}
                        className="w-full h-9 px-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono text-sm font-black text-center outline-none focus:border-[#0071E3]"
                      />
                      <span className="font-bold text-[#1D1D1F] shrink-0">% من الفاتورة</span>
                    </div>
                    <span className="text-[10px] text-[#86868B] block">الموصى به: 25% كحد أقصى</span>
                  </div>

                  {/* Parameter 6 */}
                  <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                    <label className="font-bold text-[#1D1D1F] block">الحد الأدنى لاستبدال النقاط:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={5}
                        value={localSettings.loyaltyMinRedeemPoints ?? 10}
                        onChange={(e) => setLocalSettings({ ...localSettings, loyaltyMinRedeemPoints: Math.max(1, Number(e.target.value) || 10) })}
                        className="w-full h-9 px-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono text-sm font-black text-center outline-none focus:border-[#0071E3]"
                      />
                      <span className="font-bold text-[#1D1D1F] shrink-0">نقطة فأكثر</span>
                    </div>
                    <span className="text-[10px] text-[#86868B] block">الموصى به: 10 أو 15 نقطة</span>
                  </div>
                </div>
              </div>

              {/* 5. Interactive Live Invoice & Profit-Guard Simulator */}
              <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <Calculator size={18} className="text-[#0071E3]" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                        محاكي الفاتورة واختبار صمام حماية ربح المتجر (Live Simulator)
                      </h3>
                      <p className="text-[11px] text-[#86868B]">
                        اختبر أي حجم زجاجة ورصيد نقاط لترى كيف يحمي النظام تكلفة الخام والعمولة وربح المتجر قبل منح الخصم.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '50 مل عادي (230ج)', price: 230, cost: 180 },
                      { label: '30 مل عادي (170ج)', price: 170, cost: 115 },
                      { label: '100 مل عادي (550ج)', price: 550, cost: 340 },
                      { label: '50 مل عود/خاص (450ج)', price: 450, cost: 320 },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSimBottlePrice(preset.price);
                          setSimBottleCost(preset.cost);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          simBottlePrice === preset.price && simBottleCost === preset.cost
                            ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                            : 'bg-white text-[#1D1D1F] border-black/[0.08] hover:bg-black/[0.03]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-1">
                    <span className="text-[11px] font-bold text-[#86868B] block">سعر الفاتورة الأصلي (ج.م):</span>
                    <input
                      type="number"
                      value={simBottlePrice}
                      onChange={(e) => setSimBottlePrice(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 px-2 rounded-xl bg-white border border-black/[0.08] font-mono text-sm font-black text-center"
                    />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-1">
                    <span className="text-[11px] font-bold text-[#86868B] block">تكلفة الخام والزجاجة (ج.م):</span>
                    <input
                      type="number"
                      value={simBottleCost}
                      onChange={(e) => setSimBottleCost(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 px-2 rounded-xl bg-white border border-black/[0.08] font-mono text-sm font-black text-center text-rose-600"
                    />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-1">
                    <span className="text-[11px] font-bold text-[#86868B] block">رصيد نقاط العميل المتاح:</span>
                    <input
                      type="number"
                      value={simCustomerPoints}
                      onChange={(e) => setSimCustomerPoints(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 px-2 rounded-xl bg-white border border-black/[0.08] font-mono text-sm font-black text-center text-amber-700"
                    />
                  </div>
                </div>

                {/* Simulation Output Breakdown */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-white to-blue-50/70 border border-emerald-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#86868B] block font-bold">أقصى خصم ولاء مسموح آلياً</span>
                    <span className="text-lg font-black font-mono text-[#0071E3]">
                      -{simResult.maxSafeLoyaltyDiscountEgp} {settings.currency}
                    </span>
                    <span className="text-[10px] text-[#636366] block">
                      مقابل استبدال {simResult.maxRedeemablePoints} نقطة
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#86868B] block font-bold">الصافي المطلوب من العميل</span>
                    <span className="text-lg font-black font-mono text-[#1D1D1F]">
                      {simResult.netPriceAfterMaxDiscount} {settings.currency}
                    </span>
                    <span className="text-[10px] text-[#636366] block">
                      بعد خصم النقاط الفوري
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-emerald-800 block font-bold">صافي ربح المتجر المضمون</span>
                    <span className="text-lg font-black font-mono text-emerald-700">
                      +{simResult.guaranteedStoreNetProfit} {settings.currency}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold block">
                      بعد استرداد الخام ({simBottleCost}ج) والعمولة ({simResult.commissionAfterDiscount}ج)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#86868B] block font-bold">نقاط جديدة يكسبها العميل</span>
                    <span className="text-lg font-black font-mono text-amber-700">
                      +{simResult.newPointsEarned} نقطة
                    </span>
                    <span className="text-[10px] text-[#636366] block">
                      تضاف لسجله تلقائياً عند البيع
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 1: STORE IDENTITY & GENERAL INFO                 */}
          {/* ======================================================== */}
          {activeSection === 'identity' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1D1D1F]">الهوية التجارية وبيانات المتجر العامة</h2>
                  <p className="text-xs text-[#86868B]">تظهر هذه البيانات في ترويسة الفواتير، التقارير، والرسائل الرسمية للزبائن.</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
                  <Store size={20} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#1D1D1F] block text-right">اسم المتجر / العلامة التجارية:</label>
                  <input
                    type="text"
                    value={localSettings.storeName}
                    onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-bold outline-none focus:border-[#0071E3] text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#1D1D1F] block text-right">الشعار اللفظي (Slogan):</label>
                  <input
                    type="text"
                    value={localSettings.storeSlogan || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, storeSlogan: e.target.value })}
                    placeholder="مثال: أثر يبقى وذكرى تدوم"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-medium outline-none focus:border-[#0071E3] text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#1D1D1F] block text-right">رقم الهاتف / الواتساب الرسمي:</label>
                  <input
                    type="tel"
                    value={localSettings.storePhone || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, storePhone: e.target.value })}
                    placeholder="مثال: 01000000000"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-mono font-medium outline-none focus:border-[#0071E3] text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#1D1D1F] block text-right">العملة المعتمدة:</label>
                  <input
                    type="text"
                    value={localSettings.currency}
                    onChange={(e) => setLocalSettings({ ...localSettings, currency: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-bold outline-none focus:border-[#0071E3] text-right"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-[#1D1D1F] block text-right">العنوان والمعرض:</label>
                  <input
                    type="text"
                    value={localSettings.storeAddress || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, storeAddress: e.target.value })}
                    placeholder="عنوان المعرض والفرع..."
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-medium outline-none focus:border-[#0071E3] text-right"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-[#1D1D1F] block text-right">رابط شعار المتجر (Logo URL):</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      value={localSettings.logoUrl || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-mono outline-none focus:border-[#0071E3] text-left"
                    />
                    <img 
                      src={localSettings.logoUrl || "https://l.top4top.io/p_31142jfec0.png"} 
                      alt="Logo preview" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-11 h-11 max-w-[44px] max-h-[44px] object-contain bg-white rounded-xl p-1 border border-black/[0.08] shadow-apple-xs shrink-0 block" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#1D1D1F] block text-right">الرقم الضريبي / السجل التجاري (إن وجد):</label>
                  <input
                    type="text"
                    value={localSettings.storeTaxNumber || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, storeTaxNumber: e.target.value })}
                    placeholder="اختياري للفواتير الضريبية"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-mono outline-none focus:border-[#0071E3] text-right"
                  />
                </div>
              </div>

              {/* Owner Quick Access to Dashboard Cards Customization inside Store Identity Settings */}
              {isOwner && (
                <div className="pt-4 border-t border-black/[0.06]">
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1D1D1F] via-[#252528] to-[#1D1D1F] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                        <Layout size={19} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-white">
                            تخصيص وترتيب البطاقات الظاهرة في شاشة Dashboard
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black">
                            للمالك فقط
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 mt-0.5">
                          رتّب أهم التقارير المالية والتشغيلية الـ 12 والأقسام الرئيسية في شاشة Dashboard حسب أولوياتك.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('dashboard_layout')}
                      className="apple-btn px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sliders size={14} />
                      <span>فتح استوديو تخصيص وترتيب البطاقات</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: PRICING, ESSENCE OILS & BOTTLE SIZES          */}
          {/* ======================================================== */}
          {activeSection === 'pricing' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-[#1D1D1F]">🔻 المرجع التجاري والمالي للمنتجات — متجر «لَمْسَةُ عِطْر»</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black">
                      أثر يبقى وذكرى تدوم
                    </span>
                  </div>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    هذه البيانات هي المرجع الحالي للنظام. أي تغيير لاحق لا يتم إلا من لوحة المالك، مع تسجيل القيمة القديمة والجديدة وتاريخ التغيير وسببه.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenBottleModal()}
                  className="apple-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-xs shrink-0"
                >
                  <Plus size={14} />
                  <span>إضافة حجم زجاجة</span>
                </button>
              </div>

              {/* Mandatory Owner Audit Reason Box */}
              <div className="p-3.5 rounded-2xl bg-[#FFF8EB] border border-[#C49746]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#9A6E23] shrink-0" />
                  <span className="font-black text-[#9A6E23]">سبب التغيير لتوثيقه في سجل الرقابة مع القيمة القديمة والجديدة:</span>
                </div>
                <input
                  type="text"
                  value={ownerAuditReason}
                  onChange={(e) => setOwnerAuditReason(e.target.value)}
                  placeholder="اكتب سبب التعديل لاعتماده في سجل التدقيق..."
                  className="flex-1 h-9 px-3 rounded-xl bg-white border border-[#C49746]/40 text-xs font-bold text-[#1D1D1F] outline-none"
                />
              </div>

              {/* Section 3 of Reference: Approved Gram Costs (عادي 10ج / نيش 15ج / عود 20ج / مسك 20ج) */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-[#1D1D1F]">🧪 ثالثًا: تكلفة الجرام المعتمدة حسب نوع الزيت الخام</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5 text-right">
                    <span className="text-[#0071E3] text-[11px] block font-black">🧴 الزيت العادي (جنيه/جرام):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={localSettings.priceEssenceNormal}
                        onChange={(e) => setLocalSettings({ ...localSettings, priceEssenceNormal: Number(e.target.value) || 0 })}
                        className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold text-center outline-none"
                      />
                      <span className="font-bold text-[#1D1D1F]">ج/جم</span>
                    </div>
                    <span className="text-[10px] text-[#86868B] block">المعيار المعتمد: 10 جنيه/جرام</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-teal-200 space-y-1.5 text-right">
                    <span className="text-teal-800 text-[11px] block font-black">🌿 زيت النيش (جنيه/جرام):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={localSettings.priceEssenceNiche ?? 15}
                        onChange={(e) => setLocalSettings({ ...localSettings, priceEssenceNiche: Number(e.target.value) || 0 })}
                        className="w-full h-9 px-2 rounded-lg bg-teal-50/40 border border-teal-200 font-mono text-sm font-bold text-center outline-none text-teal-900"
                      />
                      <span className="font-bold text-[#1D1D1F]">ج/جم</span>
                    </div>
                    <span className="text-[10px] text-teal-700 font-bold block">المعيار المعتمد: 15 جنيه/جرام (+5ج/جم عن العادي)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-1.5 text-right">
                    <span className="text-amber-800 text-[11px] block font-black">🟤 العود والمسك (جنيه/جرام):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={localSettings.priceEssenceSpecial}
                        onChange={(e) => setLocalSettings({ ...localSettings, priceEssenceSpecial: Number(e.target.value) || 0 })}
                        className="w-full h-9 px-2 rounded-lg bg-amber-50/40 border border-amber-200 font-mono text-sm font-bold text-center outline-none text-amber-900"
                      />
                      <span className="font-bold text-[#1D1D1F]">ج/جم</span>
                    </div>
                    <span className="text-[10px] text-amber-800 font-bold block">المعيار المعتمد: 20 جنيه/جرام (+10ج/جم عن العادي)</span>
                  </div>
                </div>
              </div>

              {/* Section 7 & 8 of Reference: Colored Bottle & Packaging Costs */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-[#1D1D1F]">🎁 سابعًا وثامنًا: تكاليف العبوة العادية والملونة والتغليف</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white border border-black/[0.08] space-y-1 text-right">
                    <span className="text-[#86868B] text-[10px] block font-bold">العبوة العادية + البخاخ:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={localSettings.standardBottleAndSprayCost ?? 15}
                        onChange={(e) => setLocalSettings({ ...localSettings, standardBottleAndSprayCost: Number(e.target.value) || 0 })}
                        className="w-full h-8 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-xs font-bold text-center outline-none"
                      />
                      <span className="font-bold">ج</span>
                    </div>
                    <span className="text-[9px] text-[#86868B] block">معتمد: 15 جنيه</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-1 text-right">
                    <span className="text-amber-900 text-[10px] block font-bold">العبوة الملونة (فرق +35ج):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={localSettings.coloredBottleCost ?? 50}
                        onChange={(e) => setLocalSettings({ ...localSettings, coloredBottleCost: Number(e.target.value) || 0 })}
                        className="w-full h-8 px-2 rounded-lg bg-white border border-amber-200 font-mono text-xs font-bold text-center outline-none text-amber-900"
                      />
                      <span className="font-bold">ج</span>
                    </div>
                    <span className="text-[9px] text-amber-800 block">معتمد: 50 جنيه (فرق 35ج)</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-black/[0.08] space-y-1 text-right">
                    <span className="text-[#86868B] text-[10px] block font-bold">الاستيكر:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={localSettings.stickerCost ?? 1}
                        onChange={(e) => setLocalSettings({ ...localSettings, stickerCost: Number(e.target.value) || 0 })}
                        className="w-full h-8 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-xs font-bold text-center outline-none"
                      />
                      <span className="font-bold">ج</span>
                    </div>
                    <span className="text-[9px] text-[#86868B] block">معتمد: 1 جنيه</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-black/[0.08] space-y-1 text-right">
                    <span className="text-[#86868B] text-[10px] block font-bold">الكيس البلاستيك الأساسي:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={localSettings.basicPlasticBagCost ?? 1}
                        onChange={(e) => setLocalSettings({ ...localSettings, basicPlasticBagCost: Number(e.target.value) || 0 })}
                        className="w-full h-8 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-xs font-bold text-center outline-none"
                      />
                      <span className="font-bold">ج</span>
                    </div>
                    <span className="text-[9px] text-emerald-700 font-bold block">1 جنيه (إلزامي لكل عملية بيع)</span>
                  </div>
                </div>
              </div>

              {/* Complete Commercial & Financial Reference Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                    <Sliders size={14} className="text-[#0071E3]" />
                    <span>مصفوفة الأحجام والوصفات والتكاليف المشتقة وصافي المساهمة ({bottleSizes.length} أحجام معتمدة):</span>
                  </h3>
                  <span className="text-[11px] text-amber-800 font-bold">
                    🔒 لا ينشئ النظام سعرًا ملونًا للعود أو المسك أو النيش تلقائيًا إلا باعتماد المالك
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-black/[0.03] text-[#86868B] font-bold text-[11px] border-b border-black/[0.06]">
                      <tr>
                        <th className="p-2.5">الحجم والوصفة التشغيلية</th>
                        <th className="p-2.5">العادي (سعر / تكلفة / مساهمة)</th>
                        <th className="p-2.5 text-amber-800">🎁 العبوة الملونة (عادي)</th>
                        <th className="p-2.5">سعر النيش/العود/المسك</th>
                        <th className="p-2.5 text-teal-800">🌿 النيش (تكلفة / مساهمة)</th>
                        <th className="p-2.5 text-amber-900">🟤 العود والمسك (تكلفة / مساهمة)</th>
                        <th className="p-2.5 text-center">إجراءات المالك</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      {bottleSizes.map(b => {
                        const row = buildCommercialReferenceRow(b, localSettings);
                        return (
                          <tr key={b.id} className="hover:bg-black/[0.01] transition-colors">
                            <td className="p-2.5">
                              <div className="font-mono font-black text-[#1D1D1F] flex items-center gap-1.5">
                                <span>{b.sizeMl} مل</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold ${
                                  b.isRollOn ? 'bg-purple-100 text-purple-900' : 'bg-blue-50 text-blue-800'
                                }`}>
                                  {b.isRollOn ? 'رول' : 'بخاخ'}
                                </span>
                                {b.isActive === false ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold bg-rose-100 text-rose-700">
                                    غير نشط (محفوظ تاريخياً)
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold bg-emerald-100 text-emerald-700">
                                    نشط
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#86868B] font-mono block">
                                {b.isRollOn ? `${b.essenceGrams} جم زيت خام بدون كحول` : `${b.essenceGrams} جم زيت + 1 جم مثبت + كحول`}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[11px]">
                              <div>بيع: <strong className="text-[#0071E3]">{row.normalPrice}ج</strong> · تكلفة: <strong>{row.normalCost}ج</strong></div>
                              <div className="text-emerald-700 font-black">عمولة {row.normalComm5}ج ⬅ +{row.normalContrib5}ج مساهمة</div>
                            </td>
                            <td className="p-2.5 font-mono text-[11px]">
                              {row.coloredNormalPrice ? (
                                <div>
                                  <div>بيع: <strong className="text-amber-800">{row.coloredNormalPrice}ج</strong> · تكلفة: <strong>{row.coloredNormalCost}ج</strong></div>
                                  <div className="text-amber-700 font-black">عمولة {row.coloredNormalComm5}ج ⬅ +{row.coloredNormalContrib5}ج</div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#86868B] font-sans">—</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-[#1D1D1F]">
                              {row.specialPrice} ج
                              <span className="block text-[10px] text-[#86868B] font-normal">عمولة: {row.nicheComm5}ج</span>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] bg-teal-50/30">
                              <div>تكلفة مشتقة: <strong>{row.nicheCost}ج</strong></div>
                              <div className="text-teal-800 font-black">+{row.nicheContrib5}ج مساهمة</div>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] bg-amber-50/30">
                              <div>تكلفة مشتقة: <strong>{row.oudMuskCost}ج</strong></div>
                              <div className={`font-black ${b.sizeMl === 100 && !b.isRollOn ? 'text-rose-600' : 'text-amber-900'}`}>
                                +{row.oudMuskContrib5}ج مساهمة
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenBottleModal(b)}
                                  className="w-7 h-7 rounded-lg bg-black/[0.04] hover:bg-[#0071E3] hover:text-white flex items-center justify-center text-[#1D1D1F] transition-colors cursor-pointer"
                                  title="تعديل الحجم والأسعار مع التوثيق الرقابي"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBottleSize(b.id)}
                                  className={`px-2 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                                    b.isActive === false
                                      ? 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700'
                                      : 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700'
                                  }`}
                                  title={b.isActive === false ? 'إعادة تفعيل الحجم' : 'إيقاف الحجم وتحويله إلى غير نشط مع بقاء السجلات التاريخية محفوظة'}
                                >
                                  {b.isActive === false ? 'تفعيل' : 'إيقاف'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 3: APPROVED FIXED BUDGET & TARGETS               */}
          {/* ======================================================== */}
          {activeSection === 'budget' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1D1D1F]">الموازنة الشهرية المعتمدة والتارجت ومسير الرواتب</h2>
                  <p className="text-xs text-[#86868B]">موازنة الـ 15,000 ج.م الآمنة لحماية مصاريف المتجر والرواتب.</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <Target size={20} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-1.5 text-right">
                  <span className="text-[#86868B] text-[11px] block font-bold">الموازنة الشهرية الثابتة:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={localSettings.monthlyFixedBudget}
                      onChange={(e) => setLocalSettings({ ...localSettings, monthlyFixedBudget: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold text-center outline-none"
                    />
                    <span className="font-bold text-[#1D1D1F]">ج</span>
                  </div>
                  <span className="text-[10px] text-amber-800 font-bold block">15,000 ج.م المعتمدة رسمياً</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-1.5 text-right">
                  <span className="text-[#86868B] text-[11px] block font-bold">أيام العمل التخطيطية للشهر:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={localSettings.monthlyWorkDays}
                      onChange={(e) => setLocalSettings({ ...localSettings, monthlyWorkDays: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold text-center outline-none"
                    />
                    <span className="font-bold text-[#1D1D1F]">يوم</span>
                  </div>
                  <span className="text-[10px] text-blue-800 font-bold block">معدل: 600 ج.م مساهمة يومية</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-1.5 text-right">
                  <span className="text-[#86868B] text-[11px] block font-bold">التارجت اليومي المستهدف:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={localSettings.dailyTargetProfit}
                      onChange={(e) => setLocalSettings({ ...localSettings, dailyTargetProfit: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold text-center outline-none"
                    />
                    <span className="font-bold text-[#1D1D1F]">ج</span>
                  </div>
                  <span className="text-[10px] text-emerald-800 font-bold block">المرحلة الأولى: 600ج / الثانية: 1000ج</span>
                </div>
              </div>

              {/* Payroll & Salaries */}
              <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.06] space-y-3">
                <h3 className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                  <Users size={14} className="text-[#0071E3]" />
                  <span>مسير الرواتب المعتمد ضمن الموازنة:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1">
                    <span className="text-[#86868B] text-[11px] block">راتب الإدارة (د. محمد):</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={localSettings.ownerSalary}
                        onChange={(e) => setLocalSettings({ ...localSettings, ownerSalary: Number(e.target.value) || 0 })}
                        className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold outline-none text-center"
                      />
                      <span className="font-bold text-xs">ج.م/شهر</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block">400 ج.م مخصص يومي في ذمة المتجر</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1">
                    <span className="text-[#86868B] text-[11px] block">المخصص الشهري الخلفي للتشغيل (سري بالنظام):</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={localSettings.employeeBaseSalary}
                        onChange={(e) => setLocalSettings({ ...localSettings, employeeBaseSalary: Number(e.target.value) || 0 })}
                        className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold outline-none text-center"
                      />
                      <span className="font-bold text-xs">ج.م/شهر</span>
                    </div>
                    <span className="text-[10px] text-purple-800 font-bold block">
                      🔒 بيانات خلفية سرية — يظهر للموظف في الواجهة العمولة (5% - 7%) فقط
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1">
                    <span className="text-[#86868B] text-[11px] block">نسبة العمولة الأساسية للمبيعات:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={localSettings.commissionRate}
                        onChange={(e) => setLocalSettings({ ...localSettings, commissionRate: Number(e.target.value) || 0 })}
                        className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold outline-none text-center"
                      />
                      <span className="font-bold text-xs">% (0.05 = 5%)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1">
                    <span className="text-[#86868B] text-[11px] block">نسبة عمولة الشريحة التشجيعية:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={localSettings.tieredCommissionRate}
                        onChange={(e) => setLocalSettings({ ...localSettings, tieredCommissionRate: Number(e.target.value) || 0 })}
                        className="w-full h-9 px-2 rounded-lg bg-black/[0.02] border border-black/[0.08] font-mono text-sm font-bold outline-none text-center"
                      />
                      <span className="font-bold text-xs">% (0.07 = 7%)</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block">تطبق بعد تخطي 10 عبوات يومياً</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: FINANCIAL VAULTS & STRICT WITHDRAWALS         */}
          {/* ======================================================== */}
          {activeSection === 'vaults' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1D1D1F]">الخزائن المالية وقواعد المسحوبات الصارمة</h2>
                  <p className="text-xs text-[#86868B]">فصل التكاليف عن الأرباح والمحافظ ومنع السحب بالسالب أو العشوائي.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="apple-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-xs"
                >
                  <ArrowDownRight size={14} />
                  <span>تسجيل سحب مالك رسمي</span>
                </button>
              </div>

              {/* Strict Prohibition Warning */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-center gap-3">
                <AlertTriangle size={20} className="text-rose-600 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <strong>قاعدة مالية صارمة:</strong> ممنوع خروج أي مبالغ من الخزائن دون تصنيف صريح في الدفاتر (راتب مالك، أرباح معتمدة، شراء مخزون، مصروف تشغيل، أو ضخ رأس مال).
                </p>
              </div>

              {/* 8 Segregated Vaults Live Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {vaults.map(v => (
                  <div key={v.id} className="p-3.5 rounded-2xl bg-white border border-black/[0.08] shadow-apple-xs space-y-1.5 text-right">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#1D1D1F] text-xs">{v.name}</span>
                      <span className="font-mono font-bold text-xs text-[#0071E3]">
                        {v.currentBalance.toLocaleString('ar-EG')} {settings.currency}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#86868B] line-clamp-2 leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 5: PRIVACY & ADMINISTRATIVE SECRETS              */}
          {/* ======================================================== */}
          {activeSection === 'privacy' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1D1D1F]">السرية المؤسسية وحماية أسرار الإدارة</h2>
                  <p className="text-xs text-[#86868B]">ضبط عزل البيانات المالية والتكاليف وهوامش الربح وفق أعلى معايير أمن المعلومات.</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#1D1D1F]">حجب هوامش وصافي الأرباح عن الكاشير والموظفين</h4>
                      <p className="text-[11px] text-[#86868B]">
                        الكاشير يشاهد فقط سعر البيع للزبون، العبوات، والكميات، دون إظهار ربح القطعة أو صافي دخل المتجر.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                      مفعل ومحمٍ دائماً
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#1D1D1F]">حجب تكاليف الخامات وأسعار الجملة عن غير الإدارة</h4>
                      <p className="text-[11px] text-[#86868B]">
                        أسعار شراء الزيوت من الموردين وتكلفة الزجاجة الخام تعتبر أسراراً تجارية مقفلة على الإدارة.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                      مفعل ومحمٍ دائماً
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#1D1D1F]">عزل الخزائن ومسير الرواتب والموازنة</h4>
                      <p className="text-[11px] text-[#86868B]">
                        لا تظهر أقسام الخزائن ومسير الرواتب إلا للمدير العام صاحب الصلاحية الشاملة.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                      مفعل ومحمٍ دائماً
                    </span>
                  </div>
                </div>

                {onNavigate && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onNavigate(View.USERS_MANAGEMENT)}
                      className="apple-btn w-full p-3.5 rounded-2xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-[#C49746]" />
                        <span>فتح لوحة إدارة المستخدمين وضبط صلاحيات كل موظف بالتفصيل</span>
                      </div>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 6: COMPREHENSIVE RECEIPT & PRINT STUDIO          */}
          {/* ======================================================== */}
          {activeSection === 'pos_receipts' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              {/* Top Header & Quick Global Presets */}
              <div className="pb-4 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#1D1D1F]">
                      استوديو التحكم الشامل في الفواتير والطباعة (معاينة فورية)
                    </h2>
                    <p className="text-xs text-[#86868B]">
                      تحكم كامل في إظهار أو إخفاء كل عنصر، نوع وحجم وسُمك ولون الخط، مقاس الورق، والهوية مع معاينة حية قبل الاعتماد.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultReceiptStudio}
                    className="apple-btn px-3 py-2 rounded-xl bg-black/[0.05] hover:bg-black/[0.1] text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>استعادة الافتراضي</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveReceiptStudio}
                    className="apple-btn px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check size={14} />
                    <span>اعتماد وتطبيق التصميم</span>
                  </button>
                </div>
              </div>

              {/* 3 One-Click Global Templates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setDraftReceiptDesign({
                      ...DEFAULT_RECEIPT_DESIGN,
                      paperWidth: '80mm',
                      highContrastThermal: true,
                      fontFamily: 'cairo',
                      baseFontSizePx: 11,
                      headerTitleSizePx: 15,
                      fontWeight: 'bold',
                    })
                  }
                  className="p-3 rounded-2xl bg-white hover:bg-black/[0.02] border border-black/[0.08] text-right space-y-1 transition-all cursor-pointer"
                >
                  <div className="font-black text-[#1D1D1F] flex items-center justify-between">
                    <span>🎯 الكاشير الحراري القياسي (80mm)</span>
                    <span className="text-[10px] font-mono text-[#0071E3]">موصى به</span>
                  </div>
                  <p className="text-[10px] text-[#86868B]">
                    تباين أسود فائق الوضوح مع كافة تفاصيل العبوات والضمان ونصيحة الثبات.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDraftReceiptDesign({
                      ...DEFAULT_RECEIPT_DESIGN,
                      paperWidth: '80mm',
                      highContrastThermal: false,
                      primaryTextColor: '#1D1D1F',
                      accentColor: '#C49746',
                      fontFamily: 'amiri',
                      baseFontSizePx: 12,
                      headerTitleSizePx: 18,
                      borderStyle: 'double',
                    })
                  }
                  className="p-3 rounded-2xl bg-white hover:bg-black/[0.02] border border-black/[0.08] text-right space-y-1 transition-all cursor-pointer"
                >
                  <div className="font-black text-[#1D1D1F] flex items-center justify-between">
                    <span>✨ لمسة عطر الملكي الفاخر</span>
                    <span className="text-[10px] font-bold text-[#C49746]">ذهبي وكربوني</span>
                  </div>
                  <p className="text-[10px] text-[#86868B]">
                    خط Amiri كلاسيكي فاخر مع فواصل مزدوجة ولون ذهبي ملكي للهوية.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDraftReceiptDesign({
                      ...DEFAULT_RECEIPT_DESIGN,
                      paperWidth: '58mm',
                      paddingMm: 2,
                      baseFontSizePx: 10,
                      headerTitleSizePx: 13,
                      totalFontSizePx: 12,
                      lineSpacing: 'compact',
                      showLogo: false,
                      showStoreAddress: false,
                      showPerfumeCareTip: false,
                      showReturnPolicy: false,
                      showQrCode: false,
                    })
                  }
                  className="p-3 rounded-2xl bg-white hover:bg-black/[0.02] border border-black/[0.08] text-right space-y-1 transition-all cursor-pointer"
                >
                  <div className="font-black text-[#1D1D1F] flex items-center justify-between">
                    <span>⚡ إيصال سريع مدمج (58mm)</span>
                    <span className="text-[10px] font-mono text-emerald-700">توفير الورق</span>
                  </div>
                  <p className="text-[10px] text-[#86868B]">
                    مصمم للطابعات الصغيرة 58mm مع اختصار الهوامش وتوفير طول الورقة.
                  </p>
                </button>
              </div>

              {/* Side-by-Side Studio: Controls + Instant Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Controls Column (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Segmented Studio Sub-Tabs */}
                  <div className="grid grid-cols-4 gap-1 bg-[#F2F2F7] p-1 rounded-2xl border border-black/[0.05]">
                    {[
                      { id: 'elements', label: 'العناصر (18)', icon: Eye },
                      { id: 'typography', label: 'الخط واللون', icon: Type },
                      { id: 'layout', label: 'الورق والإطار', icon: Layout },
                      { id: 'branding', label: 'النصوص والهوية', icon: Store },
                    ].map((t) => {
                      const Icon = t.icon;
                      const active = receiptStudioTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setReceiptStudioTab(t.id as any)}
                          className={`py-2 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            active
                              ? 'bg-white text-[#1D1D1F] shadow-xs'
                              : 'text-[#86868B] hover:text-[#1D1D1F]'
                          }`}
                        >
                          <Icon size={13} className={active ? 'text-[#0071E3]' : ''} />
                          <span className="truncate">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-Tab 1: 18 Element Visibility Toggles */}
                  {receiptStudioTab === 'elements' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#86868B]">
                          تحكم في إظهار أو إخفاء كل عنصر في الفاتورة:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setDraftReceiptDesign((prev) => ({
                                ...prev,
                                showLogo: true,
                                showStoreName: true,
                                showStoreSlogan: true,
                                showStoreAddress: true,
                                showStorePhone: true,
                                showTaxNumber: true,
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
                                showReturnPolicy: true,
                                showFooterMessage: true,
                                showQrCode: true,
                              }))
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#0071E3]/10 text-[#0071E3] text-[10px] font-bold cursor-pointer"
                          >
                            إظهار كافة العناصر
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraftReceiptDesign((prev) => ({
                                ...prev,
                                showLogo: false,
                                showStoreName: true,
                                showStoreSlogan: false,
                                showStoreAddress: false,
                                showStorePhone: true,
                                showTaxNumber: false,
                                showInvoiceNumber: true,
                                showDateTime: true,
                                showCashierName: false,
                                showCustomerInfo: false,
                                showBottleSizeAndGrams: true,
                                showPerfumeCategory: false,
                                showUnitPriceBreakdown: false,
                                showDiscountRow: true,
                                showPaymentMethod: true,
                                showItemsCountSummary: false,
                                showPerfumeCareTip: false,
                                showReturnPolicy: false,
                                showFooterMessage: true,
                                showQrCode: false,
                              }))
                            }
                            className="px-2.5 py-1 rounded-lg bg-black/[0.05] text-[#1D1D1F] text-[10px] font-bold cursor-pointer"
                          >
                            إيصال مختصر
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'showLogo', label: 'شعار المتجر (Logo)' },
                          { key: 'showStoreName', label: 'اسم المتجر الرئيسي' },
                          { key: 'showStoreSlogan', label: 'الشعار اللفظي (السلوجان)' },
                          { key: 'showStoreAddress', label: 'عنوان المعرض' },
                          { key: 'showStorePhone', label: 'رقم الهاتف والواتساب' },
                          { key: 'showTaxNumber', label: 'الرقم الضريبي / السجل التجاري' },
                          { key: 'showInvoiceNumber', label: 'رقم الفاتورة التسلسلي' },
                          { key: 'showDateTime', label: 'التاريخ والوقت الدقيق' },
                          { key: 'showCashierName', label: 'اسم مسؤول المبيعات' },
                          { key: 'showCustomerInfo', label: 'اسم ورقم هاتف العميل' },
                          { key: 'showBottleSizeAndGrams', label: 'حجم العبوة وجرامات الزيت' },
                          { key: 'showPerfumeCategory', label: 'تصنيف العطر (عادي / مسك / عود)' },
                          { key: 'showUnitPriceBreakdown', label: 'تفصيل (الكمية × سعر الوحدة)' },
                          { key: 'showItemsCountSummary', label: 'إجمالي عدد العبوات والأصناف' },
                          { key: 'showDiscountRow', label: 'سطر الخصم الممنوح' },
                          { key: 'showPaymentMethod', label: 'طريقة السداد (نقدي/بطاقة/محفظة)' },
                          { key: 'showPerfumeCareTip', label: 'نصيحة ثبات وفوحان العطر' },
                          { key: 'showReturnPolicy', label: 'عبارة ضمان الثبات والاستبدال' },
                          { key: 'showFooterMessage', label: 'رسالة الشكر الختامية' },
                          { key: 'showQrCode', label: 'رمز QR السريع أسفل الفاتورة' },
                        ].map((item) => {
                          const checked = Boolean((draftReceiptDesign as any)[item.key]);
                          return (
                            <label
                              key={item.key}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                checked
                                  ? 'bg-white border-[#0071E3]/40 shadow-2xs'
                                  : 'bg-black/[0.02] border-black/[0.06] opacity-70'
                              }`}
                            >
                              <span className="text-xs font-bold text-[#1D1D1F]">{item.label}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setDraftReceiptDesign((prev) => ({
                                    ...prev,
                                    [item.key]: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 accent-[#0071E3] rounded cursor-pointer shrink-0"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 2: Typography, Font Size, Weight & Color */}
                  {receiptStudioTab === 'typography' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                        <label className="font-black text-[#1D1D1F] block">
                          نوع الخط المطبوع (Font Family):
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {[
                            { id: 'cairo', label: 'Cairo عصري' },
                            { id: 'tajawal', label: 'Tajawal ناعم' },
                            { id: 'monospace', label: 'حراري رقمي' },
                            { id: 'amiri', label: 'Amiri ملكي' },
                            { id: 'system', label: 'Apple قياسي' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() =>
                                setDraftReceiptDesign((prev) => ({
                                  ...prev,
                                  fontFamily: f.id as ReceiptDesignConfig['fontFamily'],
                                }))
                              }
                              className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                draftReceiptDesign.fontFamily === f.id
                                  ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                                  : 'bg-[#F5F5F7] text-[#1D1D1F] border-transparent hover:bg-black/[0.06]'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#1D1D1F]">حجم الخط الأساسي:</span>
                            <span className="font-mono font-black text-[#0071E3]">
                              {draftReceiptDesign.baseFontSizePx}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={9}
                            max={16}
                            step={1}
                            value={draftReceiptDesign.baseFontSizePx}
                            onChange={(e) =>
                              setDraftReceiptDesign((prev) => ({
                                ...prev,
                                baseFontSizePx: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-[#0071E3] cursor-pointer"
                          />
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#1D1D1F]">حجم عنوان المتجر:</span>
                            <span className="font-mono font-black text-[#0071E3]">
                              {draftReceiptDesign.headerTitleSizePx}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={12}
                            max={24}
                            step={1}
                            value={draftReceiptDesign.headerTitleSizePx}
                            onChange={(e) =>
                              setDraftReceiptDesign((prev) => ({
                                ...prev,
                                headerTitleSizePx: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-[#0071E3] cursor-pointer"
                          />
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#1D1D1F]">حجم خط الإجمالي النهائي:</span>
                            <span className="font-mono font-black text-[#0071E3]">
                              {draftReceiptDesign.totalFontSizePx}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={12}
                            max={22}
                            step={1}
                            value={draftReceiptDesign.totalFontSizePx}
                            onChange={(e) =>
                              setDraftReceiptDesign((prev) => ({
                                ...prev,
                                totalFontSizePx: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-[#0071E3] cursor-pointer"
                          />
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#1D1D1F]">حجم الشعار (Logo):</span>
                            <span className="font-mono font-black text-[#0071E3]">
                              {draftReceiptDesign.logoSizePx}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={28}
                            max={80}
                            step={2}
                            value={draftReceiptDesign.logoSizePx}
                            onChange={(e) =>
                              setDraftReceiptDesign((prev) => ({
                                ...prev,
                                logoSizePx: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-[#0071E3] cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                          <span className="font-bold text-[#1D1D1F] block">سُمك الخط (Font Weight):</span>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { id: 'normal', label: 'عادي' },
                              { id: 'medium', label: 'متوسط' },
                              { id: 'bold', label: 'عريض' },
                              { id: 'black', label: 'فائق' },
                            ].map((w) => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() =>
                                  setDraftReceiptDesign((prev) => ({
                                    ...prev,
                                    fontWeight: w.id as ReceiptDesignConfig['fontWeight'],
                                  }))
                                }
                                className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                                  draftReceiptDesign.fontWeight === w.id
                                    ? 'bg-[#0071E3] text-white'
                                    : 'bg-[#F5F5F7] text-[#1D1D1F]'
                                }`}
                              >
                                {w.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                          <span className="font-bold text-[#1D1D1F] block">تباعد الأسطر:</span>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: 'compact', label: 'مدمج' },
                              { id: 'normal', label: 'قياسي' },
                              { id: 'relaxed', label: 'مريح' },
                            ].map((ls) => (
                              <button
                                key={ls.id}
                                type="button"
                                onClick={() =>
                                  setDraftReceiptDesign((prev) => ({
                                    ...prev,
                                    lineSpacing: ls.id as ReceiptDesignConfig['lineSpacing'],
                                  }))
                                }
                                className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                                  draftReceiptDesign.lineSpacing === ls.id
                                    ? 'bg-[#0071E3] text-white'
                                    : 'bg-[#F5F5F7] text-[#1D1D1F]'
                                }`}
                              >
                                {ls.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Colors & Thermal High Contrast */}
                      <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-[#1D1D1F] block">
                              تحسين التباين العالي للطابعات الحرارية (High-Contrast Black):
                            </span>
                            <span className="text-[10px] text-[#86868B]">
                              يجعل جميع النصوص باللون الأسود الداكن #000000 لطباعة حرارية واضحة جداً
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={draftReceiptDesign.highContrastThermal}
                            onChange={(e) =>
                              setDraftReceiptDesign((prev) => ({
                                ...prev,
                                highContrastThermal: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 accent-[#0071E3] rounded cursor-pointer"
                          />
                        </div>

                        {!draftReceiptDesign.highContrastThermal && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/[0.06]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#1D1D1F]">لون النص الأساسي:</span>
                              <div className="flex items-center gap-1.5">
                                {['#000000', '#1D1D1F', '#1E293B', '#14532D'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() =>
                                      setDraftReceiptDesign((prev) => ({
                                        ...prev,
                                        primaryTextColor: c,
                                      }))
                                    }
                                    style={{ backgroundColor: c }}
                                    className={`w-5 h-5 rounded-full border ${
                                      draftReceiptDesign.primaryTextColor === c
                                        ? 'ring-2 ring-[#0071E3] ring-offset-1'
                                        : 'border-black/20'
                                    }`}
                                  />
                                ))}
                                <input
                                  type="color"
                                  value={draftReceiptDesign.primaryTextColor}
                                  onChange={(e) =>
                                    setDraftReceiptDesign((prev) => ({
                                      ...prev,
                                      primaryTextColor: e.target.value,
                                    }))
                                  }
                                  className="w-6 h-6 rounded border-0 cursor-pointer"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#1D1D1F]">لون التمييز والإجمالي:</span>
                              <div className="flex items-center gap-1.5">
                                {['#C49746', '#0071E3', '#059669', '#000000'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() =>
                                      setDraftReceiptDesign((prev) => ({
                                        ...prev,
                                        accentColor: c,
                                      }))
                                    }
                                    style={{ backgroundColor: c }}
                                    className={`w-5 h-5 rounded-full border ${
                                      draftReceiptDesign.accentColor === c
                                        ? 'ring-2 ring-[#0071E3] ring-offset-1'
                                        : 'border-black/20'
                                    }`}
                                  />
                                ))}
                                <input
                                  type="color"
                                  value={draftReceiptDesign.accentColor}
                                  onChange={(e) =>
                                    setDraftReceiptDesign((prev) => ({
                                      ...prev,
                                      accentColor: e.target.value,
                                    }))
                                  }
                                  className="w-6 h-6 rounded border-0 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 3: Paper Size, Padding, Borders & Alignment */}
                  {receiptStudioTab === 'layout' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                        <span className="font-bold text-[#1D1D1F] block">مقاس ورق الطابعة (Paper Size):</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: '80mm', label: '80mm حراري قياسي' },
                            { id: '58mm', label: '58mm حراري مدمج' },
                            { id: 'A4', label: 'A4 فاتورة رسمية' },
                          ].map((pw) => (
                            <button
                              key={pw.id}
                              type="button"
                              onClick={() =>
                                setDraftReceiptDesign((prev) => ({
                                  ...prev,
                                  paperWidth: pw.id as ReceiptDesignConfig['paperWidth'],
                                }))
                              }
                              className={`py-2 rounded-xl font-bold cursor-pointer ${
                                draftReceiptDesign.paperWidth === pw.id
                                  ? 'bg-[#1D1D1F] text-white'
                                  : 'bg-[#F5F5F7] text-[#1D1D1F]'
                              }`}
                            >
                              {pw.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                          <span className="font-bold text-[#1D1D1F] block">نمط الفواصل والحدود:</span>
                          <div className="grid grid-cols-5 gap-1">
                            {[
                              { id: 'dashed', label: 'متقطع' },
                              { id: 'solid', label: 'متصل' },
                              { id: 'dotted', label: 'منقط' },
                              { id: 'double', label: 'مزدوج' },
                              { id: 'none', label: 'بدون' },
                            ].map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() =>
                                  setDraftReceiptDesign((prev) => ({
                                    ...prev,
                                    borderStyle: b.id as ReceiptDesignConfig['borderStyle'],
                                  }))
                                }
                                className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                                  draftReceiptDesign.borderStyle === b.id
                                    ? 'bg-[#0071E3] text-white'
                                    : 'bg-[#F5F5F7] text-[#1D1D1F]'
                                }`}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                          <span className="font-bold text-[#1D1D1F] block">محاذاة الترويسة والشعار:</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'center', label: 'توسيط', icon: AlignCenter },
                              { id: 'right', label: 'يمين', icon: AlignRight },
                              { id: 'left', label: 'يسار', icon: AlignLeft },
                            ].map((al) => {
                              const Icon = al.icon;
                              return (
                                <button
                                  key={al.id}
                                  type="button"
                                  onClick={() =>
                                    setDraftReceiptDesign((prev) => ({
                                      ...prev,
                                      headerAlignment: al.id as ReceiptDesignConfig['headerAlignment'],
                                    }))
                                  }
                                  className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                    draftReceiptDesign.headerAlignment === al.id
                                      ? 'bg-[#0071E3] text-white'
                                      : 'bg-[#F5F5F7] text-[#1D1D1F]'
                                  }`}
                                >
                                  <Icon size={12} />
                                  <span>{al.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] space-y-1.5">
                        <div className="flex justify-between">
                          <span className="font-bold text-[#1D1D1F]">الهامش الداخلي للورقة (Padding):</span>
                          <span className="font-mono font-black text-[#0071E3]">
                            {draftReceiptDesign.paddingMm} ملم
                          </span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={10}
                          step={1}
                          value={draftReceiptDesign.paddingMm}
                          onChange={(e) =>
                            setDraftReceiptDesign((prev) => ({
                              ...prev,
                              paddingMm: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#0071E3] cursor-pointer"
                        />
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#1D1D1F] block">
                            الطباعة التلقائية الفورية بعد إتمام البيع:
                          </span>
                          <span className="text-[10px] text-[#86868B]">
                            إرسال أمر الطباعة تلقائياً للطابعة الحرارية فور حفظ الفاتورة بالكاشير
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={draftReceiptDesign.autoPrintOnSale}
                          onChange={(e) =>
                            setDraftReceiptDesign((prev) => ({
                              ...prev,
                              autoPrintOnSale: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-[#0071E3] rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 4: Custom Texts & Store Branding */}
                  {receiptStudioTab === 'branding' && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-[#1D1D1F] block mb-1">اسم المتجر المطبوع:</label>
                          <input
                            type="text"
                            value={localSettings.storeName}
                            onChange={(e) =>
                              setLocalSettings({ ...localSettings, storeName: e.target.value })
                            }
                            className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-[#1D1D1F] block mb-1">الشعار اللفظي (السلوجان):</label>
                          <input
                            type="text"
                            value={localSettings.storeSlogan || ''}
                            onChange={(e) =>
                              setLocalSettings({ ...localSettings, storeSlogan: e.target.value })
                            }
                            className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-bold text-[#C49746]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-[#1D1D1F] block mb-1">
                          نصيحة ثبات وفوحان العطر المطبوعة للعميل:
                        </label>
                        <input
                          type="text"
                          value={draftReceiptDesign.perfumeCareTipText}
                          onChange={(e) =>
                            setDraftReceiptDesign((prev) => ({
                              ...prev,
                              perfumeCareTipText: e.target.value,
                            }))
                          }
                          className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08]"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-[#1D1D1F] block mb-1">
                          عبارة ضمان الثبات وسياسة المتجر:
                        </label>
                        <input
                          type="text"
                          value={draftReceiptDesign.returnPolicyText}
                          onChange={(e) =>
                            setDraftReceiptDesign((prev) => ({
                              ...prev,
                              returnPolicyText: e.target.value,
                            }))
                          }
                          className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08]"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-[#1D1D1F] block mb-1">
                          رسالة الشكر الختامية (Receipt Footer):
                        </label>
                        <textarea
                          rows={2}
                          value={localSettings.receiptFooterMessage || ''}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              receiptFooterMessage: e.target.value,
                            })
                          }
                          className="w-full p-3 rounded-xl bg-white border border-black/[0.08] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Interactive Preview Column (5 cols) */}
                <div className="lg:col-span-5 rounded-3xl bg-[#F2F2F7] p-4 border border-black/[0.08] space-y-3 sticky top-4">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-[#1D1D1F]">
                        المعاينة الفورية الحية ({draftReceiptDesign.paperWidth})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-2.5 py-1 rounded-xl bg-[#1D1D1F] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} />
                      <span>طباعة تجريبية</span>
                    </button>
                  </div>

                  <div className="py-1 flex items-center justify-center">
                    <ThermalReceiptLiveView
                      sale={samplePreviewSale}
                      design={draftReceiptDesign}
                      branding={{
                        storeName: localSettings.storeName,
                        storeSlogan: localSettings.storeSlogan || '',
                        storePhone: localSettings.storePhone || '',
                        storeAddress: localSettings.storeAddress || '',
                        storeTaxNumber: localSettings.storeTaxNumber || '',
                        receiptFooterMessage: localSettings.receiptFooterMessage || '',
                        logoUrl: localSettings.logoUrl || '',
                        currency: localSettings.currency,
                      }}
                      idAttribute="settings-thermal-receipt-preview"
                    />
                  </div>

                  <p className="text-[10px] text-center text-[#86868B]">
                    أي تغيير في العناصر أو الخطوط أو الألوان يظهر هنا فوراً قبل الضغط على «اعتماد وتطبيق التصميم».
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 7: INVENTORY INTELLIGENCE & THRESHOLDS           */}
          {/* ======================================================== */}
          {activeSection === 'inventory' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1D1D1F]">إعدادات المخزون والتنبيهات الذكية</h2>
                  <p className="text-xs text-[#86868B]">مراقبة رصيد الزيوت بالجرام والتنبيه المبكر قبل نفاد الخامات.</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                  <Package size={20} />
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1D1D1F] block">حد التنبيه الحرج لنقص المخزون:</span>
                      <span className="text-[10px] text-[#86868B]">يتم إظهار تنبيه وإدراج العطر في قائمة النواقص تلقائياً</span>
                    </div>
                    <span className="font-mono font-bold text-xs bg-black/[0.04] px-2.5 py-1 rounded-lg text-[#1D1D1F]">
                      100 جرام
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/[0.08] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1D1D1F] block">عدد العطور المسجلة في النظام حالياً:</span>
                    <span className="text-[10px] text-[#86868B]">الزيوت العطرية العادية والعود والمسك</span>
                  </div>
                  <span className="font-mono font-bold text-base text-[#0071E3]">
                    {products.length} عطر
                  </span>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate(View.INVENTORY_INTELLIGENCE)}
                    className="apple-btn w-full p-3.5 rounded-2xl bg-white border border-black/[0.08] hover:bg-black/[0.02] text-xs font-bold flex items-center justify-between"
                  >
                    <span>فتح شاشة ذكاء المخزون والنواقص والجرد الفعلي</span>
                    <ArrowRight size={15} className="text-[#86868B]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 8: SECURITY, PASSWORD & CLOUD BACKUP            */}
          {/* ======================================================== */}
          {activeSection === 'security_backup' && (
            <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-black/[0.06] shadow-apple-card space-y-6 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1D1D1F]">أمان الوصول والنسخ الاحتياطي</h2>
                  <p className="text-xs text-[#86868B]">الدخول عبر Google الموثق؛ وتصدير نسخ احتياطية شاملة بصيغة JSON.</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <KeyRound size={20} />
                </div>
              </div>

              {/* Password Change Form */}
              <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <h3 className="font-bold text-xs text-[#1D1D1F]">حساب Google المرتبط:</h3>
                </div>
                <p className="text-xs text-[#6E6E73] leading-6">
                  تتم المصادقة من Google ولا يحتفظ التطبيق برموز PIN أو كلمات مرور محلية. لإضافة موظف أو تغيير دوره، استخدم إدارة الموظفين وأدخل بريد Google الخاص به.
                </p>
              </div>

              {/* Backup & Export */}
              <div className="p-4 rounded-2xl bg-white border border-black/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-[#1D1D1F]">تصدير نسخة احتياطية كاملة (Full Backup):</h3>
                    <p className="text-[11px] text-[#86868B]">
                      تصدير كافة المنتجات، الفواتير، المصروفات، الخزائن، وسجلات النظام في ملف JSON مشفر.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="apple-btn flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/[0.04] hover:bg-[#1D1D1F] hover:text-white text-xs font-bold text-[#1D1D1F] transition-all shrink-0"
                  >
                    <Download size={14} />
                    <span>تنزيل النسخة</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTLE SIZE ADD / EDIT MODAL                          */}
      {/* ======================================================== */}
      {isBottleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="apple-glass rounded-3xl p-5 sm:p-6 w-full max-w-md border border-white/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-base font-black text-[#1D1D1F]">
                {editingBottle ? `تعديل حجم ${editingBottle.sizeMl} مل` : 'إضافة حجم زجاجة جديد'}
              </h3>
              <button
                onClick={() => setIsBottleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">حجم الزجاجة (مل):</label>
                  <input
                    type="number"
                    value={bottleFormData.sizeMl || ''}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, sizeMl: Number(e.target.value) || 0 })}
                    placeholder="مثال: 50"
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-center font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">جرامات الزيت القياسية:</label>
                  <input
                    type="number"
                    value={bottleFormData.essenceGrams || ''}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, essenceGrams: Number(e.target.value) || 0 })}
                    placeholder="مثال: 15"
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-center font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">سعر بيع العادي (جنيه):</label>
                  <input
                    type="number"
                    value={bottleFormData.normalPrice || ''}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, normalPrice: Number(e.target.value) || 0 })}
                    placeholder="مثال: 230"
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-center font-bold text-[#0071E3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-amber-900 block text-right">سعر العبوة الملونة (عادي - اختياري):</label>
                  <input
                    type="number"
                    value={bottleFormData.coloredNormalPrice || ''}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, coloredNormalPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="مثال: 600 / 300 / 250"
                    className="w-full h-10 px-3 rounded-xl bg-amber-50/40 border border-amber-200 font-mono text-center font-bold text-amber-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">سعر النيش/العود/المسك (جنيه):</label>
                  <input
                    type="number"
                    value={bottleFormData.specialPrice || ''}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, specialPrice: Number(e.target.value) || 0 })}
                    placeholder="مثال: 450"
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-center font-bold text-amber-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">التكلفة المعيارية المعتمدة (عادي):</label>
                  <input
                    type="number"
                    value={bottleFormData.officialCost || ''}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, officialCost: Number(e.target.value) || 0 })}
                    placeholder="مثال: 180"
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-center font-bold text-rose-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">نوع العبوة:</label>
                  <select
                    value={bottleFormData.isRollOn ? 'roll' : 'spray'}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, isRollOn: e.target.value === 'roll' })}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-bold"
                  >
                    <option value="spray">بخاخ مع كحول طبي</option>
                    <option value="roll">رول أون (زيت خام بيور)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-purple-900 block text-right">سعر ملون خاص معتمد (نيش/عود):</label>
                  <input
                    type="number"
                    value={bottleFormData.coloredSpecialPrice || ''}
                    onChange={(e) => setBottleFormData({ ...bottleFormData, coloredSpecialPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="اتركه فارغاً لمنع التوليد التلقائي"
                    className="w-full h-10 px-3 rounded-xl bg-purple-50/40 border border-purple-200 font-mono text-center font-bold text-purple-900"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="font-bold text-[#9A6E23] block text-right">سبب التعديل لسجل الرقابة (إلزامي):</label>
                <input
                  type="text"
                  value={ownerAuditReason}
                  onChange={(e) => setOwnerAuditReason(e.target.value)}
                  placeholder="اكتب سبب التعديل..."
                  className="w-full h-9 px-3 rounded-xl bg-[#FFF8EB] border border-[#C49746]/40 text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsBottleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveBottleForm}
                  className="flex-2 py-2.5 rounded-xl bg-[#0071E3] text-white text-xs font-bold shadow-xs"
                >
                  حفظ الحجم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. OWNER WITHDRAWAL FAST ACTION MODAL                    */}
      {/* ======================================================== */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="apple-glass rounded-3xl p-5 sm:p-6 w-full max-w-md border border-white/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <ArrowDownRight size={16} />
                </div>
                <h3 className="text-base font-black text-[#1D1D1F]">تسجيل مسحوب مصنف لصاحب المتجر</h3>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#86868B]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">تصنيف المعاملة المالية (إلزامي لمنع الهدر):</label>
                <select
                  value={withdrawType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setWithdrawType(val);
                    if (val === 'owner_salary') setWithdrawReason('صرف جزء من مخصص راتب الإدارة المعتمد');
                    else if (val === 'owner_profit') setWithdrawReason('سحب أرباح صافية محققة بعد الموازنة');
                    else if (val === 'restock') setWithdrawReason('شراء زيوت عطرية وخامات جديدة للمخزون');
                    else if (val === 'utilities') setWithdrawReason('سداد مصروفات تشغيل أو فواتير');
                    else if (val === 'capital') setWithdrawReason('ضخ رأس مال / تمويل نقدي رسمي');
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-bold"
                >
                  <option value="owner_salary">1. راتب مالك (من مخصص الـ 10,000 ج)</option>
                  <option value="owner_profit">2. أرباح مسحوبة (بعد اكتمال الـ 15k)</option>
                  <option value="restock">3. شراء مخزون وخامات (تعويض رأس المال)</option>
                  <option value="utilities">4. مصروف تشغيلي / فواتير</option>
                  <option value="capital">5. ضخ تمويل / رأس مال جديد للمتجر</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">المبلغ ({settings.currency}):</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="أدخل المبلغ بالجنيه..."
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-center text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">البيان والسبب:</label>
                <input
                  type="text"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-medium text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1D1D1F] block text-right">رقم الفاتورة / المرجع (اختياري):</label>
                <input
                  type="text"
                  value={withdrawRef}
                  onChange={(e) => setWithdrawRef(e.target.value)}
                  placeholder="مثال: فاتورة زيت #412"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/[0.08] font-mono text-right"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleExecuteWithdrawal}
                  className="flex-2 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-xs"
                >
                  اعتماد وترحيل المعاملة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
