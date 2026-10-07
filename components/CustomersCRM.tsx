import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sale,
  Product,
  StoreSettings,
  AppUser,
  BottleSize,
  CustomerRequest,
  FragranceDatabaseEntry,
  CustomCustomerRecord,
  CustomerLoyaltyLog,
  CustomerFollowUpLog,
  CustomerFollowUpStatus,
  CustomerOfferRecord,
  CustomerAI360Analysis,
  calculateCustomerLoyaltyPoints,
  DEFAULT_BOTTLE_SIZES,
  isLiveProductionSale
} from '../types';
import { canViewProfits } from '../services/authService';
import { isVirtualDemoCustomer } from '../services/firebase';
import {
  computeDeterministicCustomer360Analysis,
  generateCustomer360AIAnalysis,
  estimateBottleConsumptionCycleDays
} from '../services/geminiService';
import {
  Users,
  Crown,
  Sparkles,
  Search,
  Plus,
  Award,
  Gift,
  ShoppingBag,
  Phone,
  Calendar,
  TrendingUp,
  MessageCircle,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Clock,
  Droplets,
  Heart,
  Edit3,
  History,
  UserPlus,
  Tag,
  Percent,
  BellRing,
  Send,
  Layers,
  FlaskConical,
  Link2,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  BrainCircuit,
  Receipt,
  BadgePercent,
  PhoneCall,
  Mail,
  Copy,
  MessageSquare
} from 'lucide-react';

interface CustomersCRMProps {
  sales: Sale[];
  products: Product[];
  settings: StoreSettings;
  currentUser: AppUser | null;
  customCustomers: CustomCustomerRecord[];
  bottleSizes?: BottleSize[];
  customerRequests?: CustomerRequest[];
  fragranceDatabase?: FragranceDatabaseEntry[];
  todaysGrossProfit?: number;
  onSaveCustomCustomer: (record: CustomCustomerRecord) => void;
  onDeleteCustomCustomer?: (record: Partial<CustomCustomerRecord>) => void;
  onUpdateSale?: (updatedSale: Sale, previousSale: Sale, restoreOrAdjustStock?: boolean) => void;
  onSaveCustomerRequest?: (request: CustomerRequest) => void;
  onSelectCustomerForPOS?: (customer: { name: string; phone: string; autoRedeemLoyalty?: boolean }) => void;
  onSendSmartNotification?: (title: string, subtitle?: string, badgeText?: string) => void;
  onOpenLoyaltySettings?: () => void;
  onOpenFormulationEngine?: (product?: Product) => void;
}

export type LoyaltyTierId = 'diamond' | 'gold' | 'silver' | 'welcome';

export interface CustomerDiscountEvent {
  id: string;
  date: string;
  invoiceId?: string;
  type: 'خصم نقدي مباشر' | 'استبدال نقاط ولاء' | 'عرض خاص مرسل' | 'مكافأة نقاط';
  title: string;
  discountEgp: number;
  pointsUsed?: number;
  invoiceTotalAfter?: number;
  byUser?: string;
}

export interface CustomerLowStockPerfumeAlert {
  perfumeName: string;
  productId?: string | number;
  purchaseCount: number;
  totalGramsBought: number;
  currentStockGrams: number;
  minThresholdGrams: number;
  bottlesRemainingForPreferredSize: number;
  severity: 'depleted' | 'critical' | 'low';
  severityLabel: string;
  isDirectPurchase: boolean;
  perfumeType: string;
  season?: string;
  alternatives: Product[];
}

export interface EnrichedCustomerProfile {
  key: string;
  phone: string;
  name: string;
  ordersCount: number;
  grossSubtotalSpent: number;
  totalSpent: number;
  totalProfit: number;
  manualDiscountsTotal: number;
  loyaltyDiscountsTotal: number;
  totalDiscountsReceived: number;
  highestOrderValue: number;
  totalBottles: number;
  totalGrams: number;
  avgOrderValue: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  earnedPointsFromSales: number;
  bonusPoints: number;
  redeemedPoints: number;
  netAvailablePoints: number;
  pointsCashValue: number;
  tierId: LoyaltyTierId;
  tierLabel: string;
  tierBadgeClass: string;
  preferredPaymentMethod: string;
  preferredBottleSize: number;
  lastPurchaseBottleQuantity: number;
  lastPurchaseTotalMl: number;
  estimatedDepletionDays: number;
  firstCheckInDay: number;
  refillReminderDay: number;
  remainingBottlePercent: number;
  preferredChannel: string;
  concentrationPreference: 'هادئ' | 'متوازن قياسي' | 'عالي وفواح' | 'إكسترا VIP';
  packagingPreference: 'كيس أساسي' | 'علبة هدايا فاخرة' | 'كيس فاخر';
  olfactoryStyle: string;
  favoriteProducts: Array<{ name: string; count: number; totalSpent: number; totalGrams: number; type: string }>;
  lowStockPurchasedPerfumes: CustomerLowStockPerfumeAlert[];
  recommendedNextProducts: Product[];
  salesList: Sale[];
  discountEvents: CustomerDiscountEvent[];
  matchedCustomerRequests: Array<CustomerRequest & { inStockGrams: number }>;
  notes: string;
  specialOccasionDate?: string;
  nextFollowUpDate?: string;
  followUpStatus: CustomerFollowUpStatus;
  loyaltyLogs: CustomerLoyaltyLog[];
  followUpLogs: CustomerFollowUpLog[];
  customOffersSent: CustomerOfferRecord[];
  customRecord?: CustomCustomerRecord;
  aiAnalysis: CustomerAI360Analysis;
}

const LOYALTY_REWARD_OPTIONS = [
  { id: 'reward-50', label: 'خصم نقدي فوري 5 ج.م (50 نقطة)', pointsCost: 50, cashEquivalent: 5, description: 'يُخصم مباشرة من الفاتورة بشرط المساهمة ≥ 10 ج' },
  { id: 'reward-100', label: 'خصم نقدي فوري 10 ج.م (100 نقطة)', pointsCost: 100, cashEquivalent: 10, description: 'القاعدة المعتمدة (§47): 100 نقطة = 10 جنيه خصم (1% استرجاع)' },
  { id: 'reward-150', label: 'خصم نقدي فوري 15 ج.م (150 نقطة)', pointsCost: 150, cashEquivalent: 15, description: 'مكافأة عملاء الولاء بشرط المساهمة ≥ 10 ج' },
  { id: 'reward-200', label: 'خصم نقدي فوري 20 ج.م (200 نقطة)', pointsCost: 200, cashEquivalent: 20, description: 'مكافأة كبار العملاء VIP بشرط المساهمة ≥ 10 ج' },
];

const CustomersCRM: React.FC<CustomersCRMProps> = ({
  sales,
  products,
  settings,
  currentUser,
  customCustomers,
  bottleSizes = DEFAULT_BOTTLE_SIZES,
  customerRequests = [],
  todaysGrossProfit = 600,
  onSaveCustomCustomer,
  onDeleteCustomCustomer,
  onUpdateSale,
  onSaveCustomerRequest,
  onSelectCustomerForPOS,
  onSendSmartNotification,
  onOpenLoyaltySettings,
  onOpenFormulationEngine,
}) => {
  const showProfit = canViewProfits(currentUser);
  const currency = settings.currency || 'ج.م';

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | LoyaltyTierId | 'inactive' | 'needs_followup' | 'has_discounts'>('all');
  const [styleFilter, setStyleFilter] = useState<'all' | 'صيفي' | 'شتوي' | 'مسك' | 'عود' | 'فرنسي'>('all');
  const [sortBy, setSortBy] = useState<'spent_desc' | 'points_desc' | 'orders_desc' | 'discounts_desc' | 'recent'>('spent_desc');

  // Selected Customer & Active Dossier Tab
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<
    'transactions' | 'discounts_offers' | 'preferences_links' | 'ai_followup' | 'link_invoices'
  >('transactions');

  // Deep AI Consultation Overrides Map
  const [aiOverrides, setAiOverrides] = useState<Record<string, CustomerAI360Analysis>>({});
  const [isGeneratingAIKey, setIsGeneratingAIKey] = useState<string | null>(null);

  // Add / Edit Customer Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingOriginalKey, setEditingOriginalKey] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingStyle, setEditingStyle] = useState<'صيفي' | 'شتوي' | 'مسك' | 'عود' | 'فرنسي' | 'متنوع'>('متنوع');
  const [editingPreferredSize, setEditingPreferredSize] = useState<number>(50);
  const [editingConcentration, setEditingConcentration] = useState<'هادئ' | 'متوازن قياسي' | 'عالي وفواح' | 'إكسترا VIP'>('عالي وفواح');
  const [editingPackaging, setEditingPackaging] = useState<'كيس أساسي' | 'علبة هدايا فاخرة' | 'كيس فاخر'>('علبة هدايا فاخرة');
  const [editingChannel, setEditingChannel] = useState<'المتجر' | 'واتساب' | 'توصيل' | 'نشاط ميداني'>('المتجر');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingOccasion, setEditingOccasion] = useState('');
  const [editingNextFollowUp, setEditingNextFollowUp] = useState('');
  const [editingFollowUpStatus, setEditingFollowUpStatus] = useState<CustomerFollowUpStatus>('نشط');
  const [editingBonusPoints, setEditingBonusPoints] = useState<number>(0);
  const [pulseCrmCustomerFields, setPulseCrmCustomerFields] = useState<boolean>(false);
  const modalNameInputRef = useRef<HTMLInputElement | null>(null);
  const modalPhoneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showCustomerModal) return;
    setPulseCrmCustomerFields(true);
    const focusTimer = setTimeout(() => {
      if (!editingName.trim()) {
        modalNameInputRef.current?.focus();
      } else if (!editingPhone.trim()) {
        modalPhoneInputRef.current?.focus();
      }
    }, 100);
    const stopPulseTimer = setTimeout(() => {
      setPulseCrmCustomerFields(false);
    }, 9000);
    return () => {
      clearTimeout(focusTimer);
      clearTimeout(stopPulseTimer);
    };
  }, [showCustomerModal]);

  // Bonus / Redeem Points Modal
  const [pointsActionModal, setPointsActionModal] = useState<{
    customer: EnrichedCustomerProfile;
    mode: 'bonus' | 'redeem';
  } | null>(null);
  const [customPointsAmount, setCustomPointsAmount] = useState<number>(50);
  const [customPointsReason, setCustomPointsReason] = useState<string>('');

  // Follow-up Log Form State inside Dossier
  const [newFollowUpChannel, setNewFollowUpChannel] = useState<CustomerFollowUpLog['channel']>('واتساب');
  const [newFollowUpType, setNewFollowUpType] = useState<CustomerFollowUpLog['actionType']>('متابعة رضا وثبات');
  const [newFollowUpSummary, setNewFollowUpSummary] = useState('');
  const [newFollowUpNextDate, setNewFollowUpNextDate] = useState('');

  // Custom Offer Builder State inside Dossier
  const [offerPerfumeName, setOfferPerfumeName] = useState('');
  const [offerBottleSizeMl, setOfferBottleSizeMl] = useState<number>(50);
  const [offerDiscountEgp, setOfferDiscountEgp] = useState<number>(20);

  // "تجهيز عرض مخصص" (Prepare Custom Offer Modal - SMS / WhatsApp / Email Generator)
  const [preparedOfferModal, setPreparedOfferModal] = useState<{
    customer: EnrichedCustomerProfile;
    channel: 'sms' | 'whatsapp' | 'email';
    targetPerfume: string;
    targetSizeMl: number;
    standardPriceEgp: number;
    discountEgp: number;
    finalPriceEgp: number;
    promoCode: string;
    emailAddress: string;
    emailSubject: string;
    smsBody: string;
    whatsappBody: string;
    emailBody: string;
    copiedFlag?: boolean;
  } | null>(null);

  // Link Unlinked Invoice Modal State
  const [showLinkInvoiceModal, setShowLinkInvoiceModal] = useState(false);

  // Unlinked walk-in sales that don't have a specific customer assigned yet
  const unlinkedSales = useMemo(() => {
    return sales.filter(s => {
      if (!isLiveProductionSale(s)) return false;
      const p = (s.customerPhone || '').trim();
      const n = (s.customerName || '').trim();
      return !p && (!n || n === 'عميل نقدي' || n === 'عميل عابر');
    });
  }, [sales]);

  // Build 360° Enriched Customer Profiles from Real Sales + Real Custom Records
  const customerProfiles = useMemo<EnrichedCustomerProfile[]>(() => {
    const map = new Map<
      string,
      {
        phone: string;
        name: string;
        salesList: Sale[];
        custom?: CustomCustomerRecord;
      }
    >();

    // 1. Seed from real customCustomers first (strictly excluding virtual demo customers)
    customCustomers.forEach(c => {
      if (isVirtualDemoCustomer(c)) return;
      const cleanPhone = (c.phone || '').trim();
      const cleanName = (c.name || '').trim();
      const key = cleanPhone || cleanName;
      if (!key) return;
      map.set(key, {
        phone: cleanPhone,
        name: cleanName || 'عميل مسجل',
        salesList: [],
        custom: c,
      });
    });

    // 2. Aggregate from all real live production sales history
    sales.forEach(s => {
      if (!isLiveProductionSale(s)) return;
      const cleanPhone = (s.customerPhone || '').trim();
      const cleanName = (s.customerName || '').trim();
      if (!cleanPhone && (!cleanName || cleanName === 'عميل نقدي' || cleanName === 'عميل عابر')) return;
      if (isVirtualDemoCustomer({ phone: cleanPhone, name: cleanName })) return;

      // Try matching by phone first, then by exact name
      let targetKey = cleanPhone || cleanName;
      if (cleanPhone && !map.has(cleanPhone) && cleanName && map.has(cleanName)) {
        targetKey = cleanName;
      } else if (!cleanPhone && cleanName) {
        // Check if any existing entry has the same name
        for (const [k, v] of map.entries()) {
          if (v.name === cleanName) {
            targetKey = k;
            break;
          }
        }
      }

      const existing = map.get(targetKey);
      if (existing) {
        existing.salesList.push(s);
        if (cleanName && (!existing.name || existing.name === 'عميل مميز' || existing.name === 'عميل مسجل')) {
          existing.name = cleanName;
        }
        if (cleanPhone && !existing.phone) {
          existing.phone = cleanPhone;
        }
      } else {
        const matchedCustom = customCustomers.find(
          c =>
            !isVirtualDemoCustomer(c) &&
            ((cleanPhone && c.phone === cleanPhone) || (cleanName && c.name === cleanName))
        );
        map.set(targetKey, {
          phone: cleanPhone,
          name: cleanName || 'عميل مسجل',
          salesList: [s],
          custom: matchedCustom,
        });
      }
    });

    const nowMs = Date.now();
    const list: EnrichedCustomerProfile[] = [];

    map.forEach((entry, key) => {
      const sortedSales = [...entry.salesList].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const ordersCount = sortedSales.length;
      const totalSpent = sortedSales.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
      const totalProfit = sortedSales.reduce((sum, s) => sum + (Number(s.totalProfit) || 0), 0);
      const manualDiscountsTotal = sortedSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
      const loyaltyDiscountsTotal = sortedSales.reduce((sum, s) => sum + (Number(s.loyaltyDiscountAmount) || 0), 0);
      const totalDiscountsReceived = manualDiscountsTotal + loyaltyDiscountsTotal;
      const grossSubtotalSpent = totalSpent + totalDiscountsReceived;
      const avgOrderValue = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
      const highestOrderValue = sortedSales.reduce((max, s) => Math.max(max, Number(s.totalPrice) || 0), 0);

      const lastSaleDate = sortedSales[0]?.date || entry.custom?.createdAt || new Date().toISOString();
      const firstSaleDate =
        sortedSales[sortedSales.length - 1]?.date || entry.custom?.createdAt || new Date().toISOString();

      const parsedLastSaleMs = new Date(lastSaleDate).getTime();
      const safeLastSaleMs = Number.isFinite(parsedLastSaleMs) ? parsedLastSaleMs : nowMs;
      const daysSinceLastPurchase = Math.max(
        0,
        Math.floor((nowMs - safeLastSaleMs) / (1000 * 60 * 60 * 24))
      );

      // Analyze items, bottles, grams, sizes, channels, and olfactory preferences
      let totalBottles = 0;
      let totalGrams = 0;
      const prodCounter = new Map<string, { name: string; count: number; totalSpent: number; totalGrams: number; type: string }>();
      const sizeCounter = new Map<number, number>();
      const payCounter = new Map<string, number>();
      const channelCounter = new Map<string, number>();
      const styleCounter = { صيفي: 0, شتوي: 0, مسك: 0, عود: 0, فرنسي: 0 };
      const discountEvents: CustomerDiscountEvent[] = [];

      sortedSales.forEach(s => {
        const pm = s.paymentMethod || 'نقدي';
        payCounter.set(pm, (payCounter.get(pm) || 0) + 1);
        const ch = s.source || 'المتجر';
        channelCounter.set(ch, (channelCounter.get(ch) || 0) + 1);

        if ((s.discount || 0) > 0) {
          discountEvents.push({
            id: `disc-man-${s.id}`,
            date: s.date,
            invoiceId: s.id,
            type: 'خصم نقدي مباشر',
            title: `خصم خاص مباشر على الفاتورة #${s.id.slice(-6)}`,
            discountEgp: Number(s.discount) || 0,
            invoiceTotalAfter: s.totalPrice,
            byUser: s.employeeName || 'المبيعات',
          });
        }

        if ((s.loyaltyDiscountAmount || 0) > 0 || (s.loyaltyPointsRedeemed || 0) > 0) {
          discountEvents.push({
            id: `disc-loy-${s.id}`,
            date: s.date,
            invoiceId: s.id,
            type: 'استبدال نقاط ولاء',
            title: `خصم نقاط ولاء (${s.loyaltyPointsRedeemed || 0} نقطة) في الفاتورة #${s.id.slice(-6)}`,
            discountEgp: Number(s.loyaltyDiscountAmount) || 0,
            pointsUsed: s.loyaltyPointsRedeemed,
            invoiceTotalAfter: s.totalPrice,
            byUser: s.employeeName || 'المبيعات',
          });
        }

        (s.items || []).forEach(it => {
          const qty = it.quantity || 1;
          const itemGrams = (it.essenceGrams || 0) * qty;
          totalBottles += qty;
          totalGrams += itemGrams;

          sizeCounter.set(it.bottleSize, (sizeCounter.get(it.bottleSize) || 0) + qty);

          const prevProd = prodCounter.get(it.productName) || {
            name: it.productName,
            count: 0,
            totalSpent: 0,
            totalGrams: 0,
            type: it.productType || 'عادي',
          };
          prodCounter.set(it.productName, {
            name: it.productName,
            count: prevProd.count + qty,
            totalSpent: prevProd.totalSpent + (it.sellingPrice || 0) * qty,
            totalGrams: prevProd.totalGrams + itemGrams,
            type: it.productType || 'عادي',
          });

          const catalogProd = products.find(
            p => String(p.id) === String(it.productId) || p.name === it.productName
          );
          if (it.productType === 'عود' || it.productName.includes('عود')) {
            styleCounter.عود += qty;
          } else if (it.productType === 'مسك' || it.productName.includes('مسك')) {
            styleCounter.مسك += qty;
          } else if (catalogProd?.season === 'صيف' || catalogProd?.season === 'ربيع') {
            styleCounter.صيفي += qty;
          } else if (catalogProd?.season === 'شتاء' || catalogProd?.season === 'خريف') {
            styleCounter.شتوي += qty;
          } else {
            styleCounter.فرنسي += qty;
          }
        });
      });

      // Include custom offers & loyalty logs in discountEvents
      (entry.custom?.customOffersSent || []).forEach(off => {
        discountEvents.push({
          id: off.id,
          date: off.date,
          type: 'عرض خاص مرسل',
          title: `${off.title}${off.perfumeName ? ` (${off.perfumeName} - ${off.bottleSizeMl || 50}مل)` : ''}`,
          discountEgp: off.discountAmountEgp,
          pointsUsed: off.pointsUsed,
          invoiceTotalAfter: off.finalPriceEgp,
          byUser: off.sentBy || 'الإدارة',
        });
      });

      discountEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const favoriteProducts = Array.from(prodCounter.values()).sort((a, b) => b.count - a.count);

      let preferredBottleSize = entry.custom?.preferredBottleSizeMl || 50;
      let maxSizeCount = 0;
      sizeCounter.forEach((cnt, sz) => {
        if (cnt > maxSizeCount) {
          maxSizeCount = cnt;
          preferredBottleSize = sz;
        }
      });

      let preferredPaymentMethod = 'نقدي';
      let maxPayCount = 0;
      payCounter.forEach((cnt, pm) => {
        if (cnt > maxPayCount) {
          maxPayCount = cnt;
          preferredPaymentMethod = pm;
        }
      });

      let preferredChannel = entry.custom?.preferredChannel || 'المتجر';
      let maxChannelCount = 0;
      channelCounter.forEach((cnt, ch) => {
        if (cnt > maxChannelCount) {
          maxChannelCount = cnt;
          preferredChannel = ch as any;
        }
      });

      // Determine Olfactory DNA style
      let dominantStyle = entry.custom?.favoriteStyle || 'فرنسي';
      if (!entry.custom?.favoriteStyle || entry.custom.favoriteStyle === 'متنوع') {
        const sortedStyles = Object.entries(styleCounter).sort((a, b) => b[1] - a[1]);
        if (sortedStyles[0][1] > 0) {
          dominantStyle = sortedStyles[0][0] as any;
        }
      }

      // Loyalty points math using store settings
      const loyaltyCalc = calculateCustomerLoyaltyPoints({
        ordersCount,
        totalSpent,
        bonusPoints: entry.custom?.bonusPoints || 0,
        redeemedPoints: entry.custom?.redeemedPoints || 0,
        settings,
      });
      const earnedPointsFromSales = loyaltyCalc.earnedPointsFromSales || 0;
      const bonusPoints = loyaltyCalc.bonusPoints || 0;
      const redeemedPoints = loyaltyCalc.redeemedPoints || 0;
      const netAvailablePoints = loyaltyCalc.netAvailablePoints || 0;
      const pointsCashValue = loyaltyCalc.pointsCashValue || 0;

      // Determine Loyalty Tier
      let tierId: LoyaltyTierId = 'welcome';
      let tierLabel = 'عضو ترحيبي';
      let tierBadgeClass = 'bg-black/[0.05] text-[#1D1D1F] border-black/[0.08]';

      if (totalSpent >= 2500 || earnedPointsFromSales + bonusPoints >= 250) {
        tierId = 'diamond';
        tierLabel = 'عضو ماسي VIP';
        tierBadgeClass = 'bg-[#1D1D1F] text-amber-300 border-[#C49746]';
      } else if (totalSpent >= 1000 || earnedPointsFromSales + bonusPoints >= 100) {
        tierId = 'gold';
        tierLabel = 'عضو ذهبي';
        tierBadgeClass = 'bg-amber-500/15 text-[#9A6E23] border-amber-500/30';
      } else if (totalSpent >= 400 || earnedPointsFromSales + bonusPoints >= 40) {
        tierId = 'silver';
        tierLabel = 'عضو فضي';
        tierBadgeClass = 'bg-blue-500/12 text-[#0071E3] border-blue-500/25';
      }

      // Recommend next 3 perfumes based on customer's Olfactory DNA that they haven't tried yet
      const boughtNames = new Set(favoriteProducts.map(f => f.name));
      const recommendedNextProducts = products
        .filter(p => p.stock_grams > 30 && !boughtNames.has(p.name))
        .filter(p => {
          if (dominantStyle === 'عود') return p.type === 'عود' || p.season === 'شتاء';
          if (dominantStyle === 'مسك') return p.type === 'مسك' || p.type === 'عادي';
          if (dominantStyle === 'صيفي') return p.season === 'صيف' || p.season === 'ربيع' || p.season === 'كل الفصول';
          if (dominantStyle === 'شتوي') return p.season === 'شتاء' || p.season === 'خريف' || p.type === 'عود';
          return true;
        })
        .slice(0, 4);

      // Automatic Low-Stock Detection for Perfumes Purchased by this Customer
      const preferredBottleObj =
        bottleSizes.find(b => b.sizeMl === preferredBottleSize) ||
        DEFAULT_BOTTLE_SIZES.find(b => b.sizeMl === 50)!;
      const gramsPerPreferredBottle = Math.max(5, preferredBottleObj.essenceGrams || 17);

      const findInStockAlternatives = (targetName: string, targetType: string, targetSeason?: string): Product[] => {
        const cleanTarget = targetName.trim().toLowerCase();
        const sameTypeAndSeason = products
          .filter(
            p =>
              p.name.trim().toLowerCase() !== cleanTarget &&
              p.stock_grams >= 80 &&
              (p.type === targetType || (targetSeason && p.season === targetSeason))
          )
          .sort((a, b) => b.stock_grams - a.stock_grams);

        if (sameTypeAndSeason.length >= 2) return sameTypeAndSeason.slice(0, 3);

        const fallbackHighStock = products
          .filter(p => p.name.trim().toLowerCase() !== cleanTarget && p.stock_grams >= 80)
          .sort((a, b) => b.stock_grams - a.stock_grams);

        const combined = [...sameTypeAndSeason];
        for (const item of fallbackHighStock) {
          if (!combined.some(c => c.id === item.id)) combined.push(item);
          if (combined.length >= 3) break;
        }
        return combined;
      };

      const lowStockPurchasedPerfumes: CustomerLowStockPerfumeAlert[] = [];
      favoriteProducts.forEach(fp => {
        const catalogProd = products.find(
          p =>
            p.name.trim().toLowerCase() === fp.name.trim().toLowerCase() ||
            p.name.trim().toLowerCase().includes(fp.name.trim().toLowerCase())
        );
        const currentStock = catalogProd ? catalogProd.stock_grams : 0;
        const minThreshold = catalogProd?.min_threshold_grams ?? 35;
        const lowThreshold = Math.max(100, minThreshold * 2, gramsPerPreferredBottle * 4);

        if (!catalogProd || currentStock <= lowThreshold) {
          const bottlesLeft = Math.max(0, Math.floor(currentStock / gramsPerPreferredBottle));
          const severity: 'depleted' | 'critical' | 'low' =
            currentStock <= 0
              ? 'depleted'
              : currentStock <= minThreshold || bottlesLeft <= 1
              ? 'critical'
              : 'low';
          const severityLabel =
            severity === 'depleted'
              ? 'نفد من المخزون (0 جم)'
              : severity === 'critical'
              ? `حرج جداً — باقي ${currentStock} جم (يكفي ${bottlesLeft} عبوة)`
              : `يوشك على النفاد — باقي ${currentStock} جم (يكفي ~${bottlesLeft} عبوات)`;

          lowStockPurchasedPerfumes.push({
            perfumeName: fp.name,
            productId: catalogProd?.id,
            purchaseCount: fp.count,
            totalGramsBought: fp.totalGrams,
            currentStockGrams: currentStock,
            minThresholdGrams: minThreshold,
            bottlesRemainingForPreferredSize: bottlesLeft,
            severity,
            severityLabel,
            isDirectPurchase: true,
            perfumeType: catalogProd?.type || fp.type || 'عادي',
            season: catalogProd?.season,
            alternatives: findInStockAlternatives(
              fp.name,
              catalogProd?.type || fp.type || 'عادي',
              catalogProd?.season
            ),
          });
        }
      });

      // Also check if customer has no direct low-stock items yet, surface any low-stock perfume matching their Olfactory DNA style or lowest-stock favorite so the seller is proactively informed
      if (lowStockPurchasedPerfumes.length === 0 && favoriteProducts.length > 0) {
        const favWithCatalog = favoriteProducts
          .map(fp => ({
            fp,
            catalogProd: products.find(
              p =>
                p.name.trim().toLowerCase() === fp.name.trim().toLowerCase() ||
                p.name.trim().toLowerCase().includes(fp.name.trim().toLowerCase())
            ),
          }))
          .filter(x => x.catalogProd && x.catalogProd.stock_grams <= 220)
          .sort((a, b) => (a.catalogProd?.stock_grams || 999) - (b.catalogProd?.stock_grams || 999));

        if (favWithCatalog.length > 0) {
          const target = favWithCatalog[0];
          const cStock = target.catalogProd!.stock_grams;
          const bLeft = Math.max(0, Math.floor(cStock / gramsPerPreferredBottle));
          lowStockPurchasedPerfumes.push({
            perfumeName: target.fp.name,
            productId: target.catalogProd!.id,
            purchaseCount: target.fp.count,
            totalGramsBought: target.fp.totalGrams,
            currentStockGrams: cStock,
            minThresholdGrams: target.catalogProd!.min_threshold_grams ?? 35,
            bottlesRemainingForPreferredSize: bLeft,
            severity: 'low',
            severityLabel: `مخزون محدود — متبقي ${cStock} جم (يكفي ~${bLeft} عبوة ${preferredBottleSize}مل)`,
            isDirectPurchase: true,
            perfumeType: target.catalogProd!.type,
            season: target.catalogProd!.season,
            alternatives: findInStockAlternatives(
              target.fp.name,
              target.catalogProd!.type,
              target.catalogProd!.season
            ),
          });
        }
      }

      if (lowStockPurchasedPerfumes.length === 0) {
        const styleLowStock = products
          .filter(p => p.stock_grams <= (p.min_threshold_grams ?? 50) + 40)
          .filter(p => {
            if (dominantStyle === 'عود') return p.type === 'عود';
            if (dominantStyle === 'مسك') return p.type === 'مسك';
            if (dominantStyle === 'صيفي') return p.season === 'صيف' || p.season === 'كل الفصول';
            if (dominantStyle === 'شتوي') return p.season === 'شتاء' || p.type === 'عود';
            return true;
          })
          .sort((a, b) => a.stock_grams - b.stock_grams)[0];

        if (styleLowStock) {
          const bLeft = Math.max(0, Math.floor(styleLowStock.stock_grams / gramsPerPreferredBottle));
          lowStockPurchasedPerfumes.push({
            perfumeName: styleLowStock.name,
            productId: styleLowStock.id,
            purchaseCount: 1,
            totalGramsBought: gramsPerPreferredBottle,
            currentStockGrams: styleLowStock.stock_grams,
            minThresholdGrams: styleLowStock.min_threshold_grams ?? 35,
            bottlesRemainingForPreferredSize: bLeft,
            severity: styleLowStock.stock_grams <= 0 ? 'depleted' : styleLowStock.stock_grams <= 35 ? 'critical' : 'low',
            severityLabel:
              styleLowStock.stock_grams <= 0
                ? 'نفد من المخزون (0 جم)'
                : `يوشك على النفاد (${styleLowStock.stock_grams} جم متبقي في فئة ${dominantStyle})`,
            isDirectPurchase: false,
            perfumeType: styleLowStock.type,
            season: styleLowStock.season,
            alternatives: findInStockAlternatives(styleLowStock.name, styleLowStock.type, styleLowStock.season),
          });
        }
      }

      // Match customer requests from Inventory Intelligence
      const matchedCustomerRequests = customerRequests
        .filter(req => {
          const rPhone = (req.customerPhone || '').trim();
          const rName = (req.customerName || '').trim();
          return (entry.phone && rPhone === entry.phone) || (entry.name && rName === entry.name);
        })
        .map(req => {
          const catalogMatch = products.find(p =>
            p.name.trim().toLowerCase().includes(req.perfumeName.trim().toLowerCase())
          );
          return {
            ...req,
            inStockGrams: catalogMatch ? catalogMatch.stock_grams : 0,
          };
        });

      const concentrationPreference = entry.custom?.concentrationPreference || 'عالي وفواح';
      const packagingPreference = entry.custom?.packagingPreference || 'علبة هدايا فاخرة';

      // Smart Bottle Size & Quantity Consumption Calculation from the customer's latest invoice
      const latestSale = sortedSales[0];
      const lastPurchaseBottleQuantity = latestSale
        ? Math.max(1, (latestSale.items || []).reduce((acc, it) => acc + Math.max(1, Number(it.quantity) || 1), 0))
        : 1;
      const lastPurchasePrimarySize = latestSale?.items?.[0]?.bottleSize || preferredBottleSize || 50;
      const lastPurchaseTotalMl = latestSale
        ? Math.max(
            10,
            (latestSale.items || []).reduce(
              (acc, it) => acc + (Number(it.bottleSize) || preferredBottleSize || 50) * Math.max(1, Number(it.quantity) || 1),
              0
            )
          )
        : (preferredBottleSize || 50);

      const bottleCycle = estimateBottleConsumptionCycleDays(
        lastPurchasePrimarySize,
        lastPurchaseBottleQuantity,
        ordersCount
      );
      const estimatedDepletionDays = bottleCycle.fullDepletionDay;
      const firstCheckInDay = bottleCycle.firstCheckInDay;
      const refillReminderDay = bottleCycle.refillReminderDay;
      const remainingBottlePercent =
        ordersCount > 0
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(((estimatedDepletionDays - daysSinceLastPurchase) / Math.max(1, estimatedDepletionDays)) * 100)
              )
            )
          : 100;

      // Follow-up starts intelligently after 7-10 days (for quality check-in) or at refillReminderDay (for bottle depletion), NOT immediately after purchase
      const followUpStatus: CustomerFollowUpStatus =
        entry.custom?.followUpStatus ||
        (ordersCount > 0 && daysSinceLastPurchase >= firstCheckInDay ? 'يحتاج متابعة' : 'نشط');

      const aiAnalysis =
        aiOverrides[key] ||
        computeDeterministicCustomer360Analysis({
          customerKey: key,
          name: entry.name,
          phone: entry.phone,
          ordersCount,
          totalSpent,
          totalProfit,
          totalDiscountsReceived,
          manualDiscountsTotal,
          loyaltyDiscountsTotal,
          netAvailablePoints,
          pointsCashValue,
          daysSinceLastPurchase,
          preferredBottleSize: lastPurchasePrimarySize,
          lastPurchaseBottleQuantity,
          lastPurchaseTotalMl,
          olfactoryStyle: dominantStyle,
          concentrationPreference,
          favoriteProducts,
          recommendedNextProducts,
          customerRequests,
          products,
          bottleSizes,
          settings,
          todayNetContribution: todaysGrossProfit,
        });

      list.push({
        key,
        phone: entry.phone,
        name: entry.name,
        ordersCount,
        grossSubtotalSpent,
        totalSpent,
        totalProfit,
        manualDiscountsTotal,
        loyaltyDiscountsTotal,
        totalDiscountsReceived,
        highestOrderValue,
        totalBottles,
        totalGrams,
        avgOrderValue,
        firstPurchaseDate: firstSaleDate,
        lastPurchaseDate: lastSaleDate,
        daysSinceLastPurchase,
        earnedPointsFromSales,
        bonusPoints,
        redeemedPoints,
        netAvailablePoints,
        pointsCashValue,
        tierId,
        tierLabel,
        tierBadgeClass,
        preferredPaymentMethod,
        preferredBottleSize: lastPurchasePrimarySize,
        lastPurchaseBottleQuantity,
        lastPurchaseTotalMl,
        estimatedDepletionDays,
        firstCheckInDay,
        refillReminderDay,
        remainingBottlePercent,
        preferredChannel,
        concentrationPreference,
        packagingPreference,
        olfactoryStyle: dominantStyle,
        favoriteProducts,
        lowStockPurchasedPerfumes,
        recommendedNextProducts,
        salesList: sortedSales,
        discountEvents,
        matchedCustomerRequests,
        notes: entry.custom?.notes || '',
        specialOccasionDate: entry.custom?.specialOccasionDate,
        nextFollowUpDate: entry.custom?.nextFollowUpDate,
        followUpStatus,
        loyaltyLogs: entry.custom?.loyaltyLogs || [],
        followUpLogs: entry.custom?.followUpLogs || [],
        customOffersSent: entry.custom?.customOffersSent || [],
        customRecord: entry.custom,
        aiAnalysis,
      });
    });

    return list;
  }, [sales, products, customCustomers, settings, bottleSizes, customerRequests, todaysGrossProfit, aiOverrides]);

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customerProfiles
      .filter(c => {
        if (tierFilter === 'inactive') {
          if (c.daysSinceLastPurchase < c.refillReminderDay) return false;
        } else if (tierFilter === 'needs_followup') {
          if (
            c.followUpStatus !== 'يحتاج متابعة' &&
            c.daysSinceLastPurchase < c.firstCheckInDay &&
            c.aiAnalysis.nextBestAction.priority !== 'عاجل اليوم'
          ) {
            return false;
          }
        } else if (tierFilter === 'has_discounts') {
          if (c.totalDiscountsReceived <= 0 && c.customOffersSent.length === 0) return false;
        } else if (tierFilter !== 'all' && c.tierId !== tierFilter) {
          return false;
        }

        if (styleFilter !== 'all' && c.olfactoryStyle !== styleFilter) {
          return false;
        }

        if (!q) return true;
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchPerfume = c.favoriteProducts.some(fp => fp.name.toLowerCase().includes(q));
        const matchNotes = (c.notes || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchPerfume || matchNotes;
      })
      .sort((a, b) => {
        if (sortBy === 'spent_desc') return b.totalSpent - a.totalSpent;
        if (sortBy === 'points_desc') return b.netAvailablePoints - a.netAvailablePoints;
        if (sortBy === 'orders_desc') return b.ordersCount - a.ordersCount;
        if (sortBy === 'discounts_desc') return b.totalDiscountsReceived - a.totalDiscountsReceived;
        return new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime();
      });
  }, [customerProfiles, searchQuery, tierFilter, styleFilter, sortBy]);

  // Overall CRM Summary KPIs
  const crmStats = useMemo(() => {
    const totalCustomers = customerProfiles.length;
    const vipCount = customerProfiles.filter(c => c.tierId === 'diamond' || c.tierId === 'gold').length;
    const totalActivePoints = customerProfiles.reduce((s, c) => s + c.netAvailablePoints, 0);
    const totalCustomerRevenue = customerProfiles.reduce((s, c) => s + c.totalSpent, 0);
    const totalDiscountsGiven = customerProfiles.reduce((s, c) => s + c.totalDiscountsReceived, 0);
    const repeatCustomers = customerProfiles.filter(c => c.ordersCount > 1).length;
    const retentionRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
    const urgentFollowUpCount = customerProfiles.filter(
      c =>
        c.aiAnalysis.nextBestAction.priority === 'عاجل اليوم' ||
        (c.ordersCount > 0 && c.daysSinceLastPurchase >= c.firstCheckInDay)
    ).length;

    return {
      totalCustomers,
      vipCount,
      totalActivePoints,
      totalCustomerRevenue,
      totalDiscountsGiven,
      repeatCustomers,
      retentionRate,
      urgentFollowUpCount,
    };
  }, [customerProfiles]);

  const activeCustomerDossier = useMemo(() => {
    if (!selectedCustomerKey) return filteredCustomers[0] || null;
    return customerProfiles.find(c => c.key === selectedCustomerKey) || filteredCustomers[0] || null;
  }, [selectedCustomerKey, customerProfiles, filteredCustomers]);

  // AI Analytics: Extract Purchasing Patterns of the Most Loyal Customer Automatically
  const topLoyalCustomerAnalytics = useMemo(() => {
    if (customerProfiles.length === 0) return null;
    const sortedByLoyalty = [...customerProfiles].sort((a, b) => {
      const scoreA = a.totalSpent * 1.2 + a.ordersCount * 150 + a.netAvailablePoints * 4;
      const scoreB = b.totalSpent * 1.2 + b.ordersCount * 150 + b.netAvailablePoints * 4;
      return scoreB - scoreA;
    });
    const champion = sortedByLoyalty[0];
    const topFav = champion.favoriteProducts[0]?.name || champion.recommendedNextProducts[0]?.name || 'مجموعة العود والمسك الملكي';
    const secondFav = champion.favoriteProducts[1]?.name || champion.recommendedNextProducts[1]?.name || 'عطر فرنسي خاص';
    const firstMs = new Date(champion.firstPurchaseDate).getTime();
    const lastMs = new Date(champion.lastPurchaseDate).getTime();
    const spanDays = Math.max(1, Math.round((lastMs - firstMs) / (1000 * 60 * 60 * 24)));
    const avgCycleDays = champion.ordersCount > 1 ? Math.max(3, Math.round(spanDays / (champion.ordersCount - 1))) : 14;

    const patternInsights = [
      `يفضل اقتناء عبوات ${champion.preferredBottleSize} مل بطابع (${champion.olfactoryStyle}) وتركيز (${champion.concentrationPreference}).`,
      `متوسط قيمة السلة الشرائية ${champion.avgOrderValue} ${currency} عبر ${champion.ordersCount} معاملات موثقة (دورة شراء كل ~${avgCycleDays} يوم).`,
      `المنتج الأكثر طلباً في سجله: «${topFav}» يليه «${secondFav}» بإجمالي إنفاق صافي ${champion.totalSpent.toLocaleString('ar-EG')} ${currency}.`,
    ];

    const autoSuggestions = [
      {
        title: `عرض VIP خاص على عطره المفضل (${topFav})`,
        desc: `منح خصم آمن ${champion.aiAnalysis.recommendedBottleUpsell.maxSafeDiscountEgp} ${currency} على عبوة ${champion.aiAnalysis.recommendedBottleUpsell.targetSizeMl} مل لتعزيز الولاء.`,
        badge: 'مقترح تلقائي ١',
      },
      {
        title: `ترشيح عطر مكمل لذوقه الـ ${champion.olfactoryStyle}`,
        desc: `دعوته لتجربة عطر (${champion.recommendedNextProducts[0]?.name || secondFav}) المتوفر بالمخزون مع هدية نقاط ولاء.`,
        badge: 'مقترح تلقائي ٢',
      },
    ];

    return {
      champion,
      topFav,
      secondFav,
      avgCycleDays,
      patternInsights,
      autoSuggestions,
    };
  }, [customerProfiles, currency]);

  // Function: "تجهيز عرض مخصص" (Prepare Custom Offer - SMS / WhatsApp / Email based on Financial History & Perfume Preferences)
  const handlePrepareCustomOffer = (
    c: EnrichedCustomerProfile,
    customPerfume?: string,
    customSizeMl?: number,
    customDiscEgp?: number
  ) => {
    const targetPerfume =
      customPerfume ||
      c.favoriteProducts[0]?.name ||
      c.recommendedNextProducts[0]?.name ||
      'عطر لمسة الخاص VIP';
    const nextSuggestedPerfume =
      c.recommendedNextProducts[0]?.name ||
      c.favoriteProducts[1]?.name ||
      'المسك الأبيض الفاخر';
    const targetSizeMl = customSizeMl || c.aiAnalysis.recommendedBottleUpsell.targetSizeMl || c.preferredBottleSize || 50;
    const bottleObj =
      bottleSizes.find(b => b.sizeMl === targetSizeMl) ||
      DEFAULT_BOTTLE_SIZES.find(b => b.sizeMl === 50)!;
    const isSpecial = targetPerfume.includes('عود') || targetPerfume.includes('مسك') || c.olfactoryStyle === 'عود' || c.olfactoryStyle === 'مسك';
    const standardPriceEgp = isSpecial ? (bottleObj.specialPrice || 450) : (bottleObj.normalPrice || 230);
    const maxSafeDisc = c.aiAnalysis.recommendedBottleUpsell.maxSafeDiscountEgp || 25;
    const discountEgp = customDiscEgp !== undefined ? customDiscEgp : maxSafeDisc;
    const finalPriceEgp = Math.max((bottleObj.officialCost || 150) + 15, standardPriceEgp - discountEgp);
    const actualDiscount = Math.max(0, standardPriceEgp - finalPriceEgp);
    const promoCode = `VIP-${c.name.trim().slice(0, 3).replace(/\s+/g, '') || 'LM'}-${targetSizeMl}`;

    const historyLine =
      c.ordersCount > 0
        ? `تقديراً لتعاملك الكريم معنا في ${c.ordersCount} معاملات سابقة بإجمالي (${c.totalSpent.toLocaleString('ar-EG')} ${currency})`
        : `تقديراً لانضمامك إلى نخبة عملاء (${settings.storeName})`;

    const favPerfumesLine =
      c.favoriteProducts.length > 0
        ? c.favoriteProducts.slice(0, 2).map(p => p.name).join(' و')
        : `العطور الـ ${c.olfactoryStyle}`;

    const smsBody = `أهلاً أ. ${c.name} في ${settings.storeName} ✨ لأنك من عملائنا المميزين (${c.tierLabel}) وعشاق (${favPerfumesLine})، جهزنا لك عرضاً خاصاً: عبوة ${targetSizeMl}مل من عطر (${targetPerfume}) بتركيز ${c.concentrationPreference} بسعر ${finalPriceEgp} ${currency} بدلاً من ${standardPriceEgp} ${currency} + رصيدك المتاح ${c.netAvailablePoints} نقطة ولاء. كود العرض: ${promoCode}`;

    const whatsappBody = [
      `مرحباً بك أستاذ/ة *${c.name}* في *${settings.storeName}* ✨`,
      ``,
      `${historyLine}، ولأننا نعلم شغفك وذوقك الرفيع في اقتناء *(${favPerfumesLine})* بطابعها الـ *${c.olfactoryStyle}*:`,
      ``,
      `🎁 *عرضك المخصص الحصري اليوم:*`,
      `• العطر المختار: *${targetPerfume}* (مع عينة هدية من *${nextSuggestedPerfume}*)`,
      `• الحجم والتركيز المفضل: *عبوة ${targetSizeMl} مل — تركيز ${c.concentrationPreference}*`,
      `• السعر المخصص لك: *${finalPriceEgp} ${currency}* بدلاً من ${standardPriceEgp} ${currency} *(خصم خاص ${actualDiscount} ${currency})*`,
      `• رصيد نقاط ولائك الحالي: *${c.netAvailablePoints} نقطة* (بقيمة ~${c.pointsCashValue} ${currency})`,
      `• كود التفعيل بالكاشير: *${promoCode}*`,
      ``,
      `يسعدنا تجهيز العبوة لك فوراً أو حجزها لزيارتك القادمة 🌸`,
    ].join('\n');

    const emailSubject = `عرض VIP مخصص لك أستاذ/ة ${c.name} — خصم خاص على عطر (${targetPerfume}) من ${settings.storeName}`;
    const emailBody = [
      `تحية طيبة وعطرة أستاذ/ة ${c.name}،`,
      ``,
      `نشكركم على ثقتكم الدائمة في (${settings.storeName} — ${settings.storeSlogan || 'أثر يبقى وذكرى تدوم'}).`,
      `${historyLine}، وبناءً على تفضيلاتكم العطرية المسجلة لدينا في فئة (${c.tierLabel}) واختياراتكم المميزة لـ (${favPerfumesLine})، يسعدنا تقديم هذا العرض المخصص لكم:`,
      ``,
      `--------------------------------------------------`,
      `تفاصيل العرض المخصص (كود: ${promoCode}):`,
      `• العطر الرئيسي: ${targetPerfume} (طابع ${c.olfactoryStyle})`,
      `• الحجم والتركيز: زجاجة ${targetSizeMl} مل — تركيز ${c.concentrationPreference} (${c.packagingPreference})`,
      `• ترشيح إضافي يناسب ذوقكم: ${nextSuggestedPerfume}`,
      `• القيمة بعد الخصم الخاص: ${finalPriceEgp} ${currency} بدلاً من ${standardPriceEgp} ${currency} (وفرتم ${actualDiscount} ${currency})`,
      `• محفظة الولاء الخاصة بكم: ${c.netAvailablePoints} نقطة متاحة (تعادل ${c.pointsCashValue} ${currency})`,
      `--------------------------------------------------`,
      ``,
      `يمكنكم الاستفادة من هذا العرض بزيارتنا في الفرع أو الرد على هذه الرسالة لتجهيز طلبكم فوراً.`,
      ``,
      `مع خالص التحية والتقدير،`,
      `إدارة ${settings.storeName}`,
      `هاتف التواصل: ${settings.storePhone || ''}`,
    ].join('\n');

    setPreparedOfferModal({
      customer: c,
      channel: 'whatsapp',
      targetPerfume,
      targetSizeMl,
      standardPriceEgp,
      discountEgp: actualDiscount,
      finalPriceEgp,
      promoCode,
      emailAddress: '',
      emailSubject,
      smsBody,
      whatsappBody,
      emailBody,
      copiedFlag: false,
    });
  };

  // Open Modal to Add or Edit Customer
  const handleOpenAddCustomer = () => {
    setEditingOriginalKey(null);
    setEditingPhone('');
    setEditingName('');
    setEditingStyle('متنوع');
    setEditingPreferredSize(50);
    setEditingConcentration('عالي وفواح');
    setEditingPackaging('علبة هدايا فاخرة');
    setEditingChannel('المتجر');
    setEditingNotes('');
    setEditingOccasion('');
    setEditingNextFollowUp('');
    setEditingFollowUpStatus('نشط');
    setEditingBonusPoints(settings.loyaltyWelcomeBonusPoints ?? 25);
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (c: EnrichedCustomerProfile) => {
    setEditingOriginalKey(c.key);
    setEditingPhone(c.phone);
    setEditingName(c.name);
    setEditingStyle((c.olfactoryStyle as any) || 'متنوع');
    setEditingPreferredSize(c.preferredBottleSize || 50);
    setEditingConcentration(c.concentrationPreference || 'عالي وفواح');
    setEditingPackaging(c.packagingPreference || 'علبة هدايا فاخرة');
    setEditingChannel((c.preferredChannel as any) || 'المتجر');
    setEditingNotes(c.notes || '');
    setEditingOccasion(c.specialOccasionDate || '');
    setEditingNextFollowUp(c.nextFollowUpDate || '');
    setEditingFollowUpStatus(c.followUpStatus || 'نشط');
    setEditingBonusPoints(c.bonusPoints || 0);
    setShowCustomerModal(true);
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingName.trim() && !editingPhone.trim()) return;

    const existing = customCustomers.find(
      c =>
        (editingOriginalKey && (c.phone === editingOriginalKey || c.name === editingOriginalKey)) ||
        (editingPhone.trim() && c.phone === editingPhone.trim()) ||
        c.name === editingName.trim()
    );

    const record: CustomCustomerRecord = {
      id: existing?.id,
      phone: editingPhone.trim(),
      name: editingName.trim() || 'عميل مسجل',
      favoriteStyle: editingStyle,
      preferredBottleSizeMl: Number(editingPreferredSize) || 50,
      concentrationPreference: editingConcentration,
      packagingPreference: editingPackaging,
      preferredChannel: editingChannel,
      notes: editingNotes.trim(),
      specialOccasionDate: editingOccasion,
      nextFollowUpDate: editingNextFollowUp,
      followUpStatus: editingFollowUpStatus,
      bonusPoints: Number(editingBonusPoints) || 0,
      redeemedPoints: existing?.redeemedPoints || 0,
      loyaltyLogs: existing?.loyaltyLogs || (Number(editingBonusPoints) > 0
        ? [
            {
              id: `log-${Date.now()}`,
              date: new Date().toISOString(),
              pointsDelta: Number(editingBonusPoints) || 0,
              reason: 'نقاط ترحيبية عند فتح ملف الولاء',
              byUser: currentUser?.displayName || 'الإدارة',
            },
          ]
        : []),
      followUpLogs: existing?.followUpLogs || [],
      customOffersSent: existing?.customOffersSent || [],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveCustomCustomer(record);
    setSelectedCustomerKey(record.phone || record.name);
    setShowCustomerModal(false);

    if (onSendSmartNotification) {
      onSendSmartNotification(
        `تم حفظ ملف العميل: ${record.name}`,
        `تم تحديث بيانات العميل وتفضيلاته العطرية (${record.favoriteStyle} · ${record.preferredBottleSizeMl}مل) في قاعدة البيانات`,
        'حفظ سحابي فوري'
      );
    }
  };

  // Run Deep Gemini AI Consultation for Selected Customer
  const handleRunDeepCustomerAI = async (c: EnrichedCustomerProfile) => {
    setIsGeneratingAIKey(c.key);
    try {
      const result = await generateCustomer360AIAnalysis({
        customerKey: c.key,
        name: c.name,
        phone: c.phone,
        ordersCount: c.ordersCount,
        totalSpent: c.totalSpent,
        totalProfit: c.totalProfit,
        totalDiscountsReceived: c.totalDiscountsReceived,
        manualDiscountsTotal: c.manualDiscountsTotal,
        loyaltyDiscountsTotal: c.loyaltyDiscountsTotal,
        netAvailablePoints: c.netAvailablePoints,
        pointsCashValue: c.pointsCashValue,
        daysSinceLastPurchase: c.daysSinceLastPurchase,
        preferredBottleSize: c.preferredBottleSize,
        olfactoryStyle: c.olfactoryStyle,
        concentrationPreference: c.concentrationPreference,
        favoriteProducts: c.favoriteProducts,
        recommendedNextProducts: c.recommendedNextProducts,
        customerRequests,
        products,
        bottleSizes,
        settings,
        todayNetContribution: todaysGrossProfit,
      });
      setAiOverrides(prev => ({ ...prev, [c.key]: result }));
      if (onSendSmartNotification) {
        onSendSmartNotification(
          `اكتمل التحليل الذكي لملف: ${c.name}`,
          `تم تحديث التوصيات العطرية وخطة المتابعة والعروض الآمنة ربحياً`,
          'ذكاء اصطناعي CRM'
        );
      }
    } finally {
      setIsGeneratingAIKey(null);
    }
  };

  // Log Follow-up / Coordination Action & Optionally Send WhatsApp
  const handleRecordFollowUp = (
    c: EnrichedCustomerProfile,
    params: {
      channel: CustomerFollowUpLog['channel'];
      actionType: CustomerFollowUpLog['actionType'];
      summary: string;
      nextDate?: string;
      newStatus?: CustomerFollowUpStatus;
      whatsappMessageToOpen?: string;
      offerRecord?: CustomerOfferRecord;
    }
  ) => {
    const existing = customCustomers.find(
      rec => (c.phone && rec.phone === c.phone) || rec.name === c.name
    );

    const newFollowLog: CustomerFollowUpLog = {
      id: `fup-${Date.now()}`,
      date: new Date().toISOString(),
      channel: params.channel,
      actionType: params.actionType,
      summary: params.summary,
      byUser: currentUser?.displayName || 'الإدارة',
      nextFollowUpDate: params.nextDate || c.nextFollowUpDate,
    };

    const updatedRecord: CustomCustomerRecord = {
      id: existing?.id,
      phone: c.phone,
      name: c.name,
      favoriteStyle: (c.olfactoryStyle as any) || 'متنوع',
      preferredBottleSizeMl: c.preferredBottleSize,
      concentrationPreference: c.concentrationPreference,
      packagingPreference: c.packagingPreference,
      preferredChannel: (c.preferredChannel as any) || 'المتجر',
      notes: c.notes,
      specialOccasionDate: c.specialOccasionDate,
      nextFollowUpDate: params.nextDate || existing?.nextFollowUpDate,
      followUpStatus: params.newStatus || 'تم إرسال عرض',
      bonusPoints: existing?.bonusPoints ?? c.bonusPoints,
      redeemedPoints: existing?.redeemedPoints ?? c.redeemedPoints,
      loyaltyLogs: existing?.loyaltyLogs || c.loyaltyLogs || [],
      followUpLogs: [newFollowLog, ...(existing?.followUpLogs || c.followUpLogs || [])],
      customOffersSent: params.offerRecord
        ? [params.offerRecord, ...(existing?.customOffersSent || c.customOffersSent || [])]
        : existing?.customOffersSent || c.customOffersSent || [],
      createdAt: existing?.createdAt || c.firstPurchaseDate,
      updatedAt: new Date().toISOString(),
    };

    onSaveCustomCustomer(updatedRecord);

    if (params.whatsappMessageToOpen && c.phone) {
      const cleanPhone = c.phone.replace(/\D/g, '');
      const intlPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
      const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(params.whatsappMessageToOpen)}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    if (onSendSmartNotification) {
      onSendSmartNotification(
        `تم توثيق متابعة العميل: ${c.name}`,
        params.summary,
        params.actionType
      );
    }
  };

  // Link an existing unlinked invoice to the currently selected customer
  const handleLinkInvoiceToCustomer = (sale: Sale, customer: EnrichedCustomerProfile) => {
    if (!onUpdateSale) return;
    const updatedSale: Sale = {
      ...sale,
      customerName: customer.name,
      customerPhone: customer.phone,
    };
    onUpdateSale(updatedSale, sale, false);
    if (onSendSmartNotification) {
      onSendSmartNotification(
        `تم ربط الفاتورة #${sale.id.slice(-6)} بالعميل ${customer.name}`,
        `تمت إضافة المبلغ (${sale.totalPrice} ${currency}) ونقاط الولاء إلى سجل العميل فوراً`,
        'ربط معاملات حقيقي'
      );
    }
  };

  // Handle Loyalty Points Bonus or Redemption
  const handleExecutePointsAction = (pointsDelta: number, reasonText: string) => {
    if (!pointsActionModal) return;
    const target = pointsActionModal.customer;

    const existing = customCustomers.find(
      c => (target.phone && c.phone === target.phone) || c.name === target.name
    );

    const newLog: CustomerLoyaltyLog = {
      id: `loy-${Date.now()}`,
      date: new Date().toISOString(),
      pointsDelta,
      reason: reasonText,
      byUser: currentUser?.displayName || 'الإدارة',
    };

    const updatedRecord: CustomCustomerRecord = {
      id: existing?.id,
      phone: target.phone,
      name: target.name,
      favoriteStyle: (target.olfactoryStyle as any) || 'متنوع',
      preferredBottleSizeMl: target.preferredBottleSize,
      concentrationPreference: target.concentrationPreference,
      packagingPreference: target.packagingPreference,
      preferredChannel: (target.preferredChannel as any) || 'المتجر',
      notes: target.notes,
      specialOccasionDate: target.specialOccasionDate,
      nextFollowUpDate: target.nextFollowUpDate,
      followUpStatus: target.followUpStatus,
      bonusPoints:
        pointsDelta > 0
          ? (existing?.bonusPoints || target.bonusPoints || 0) + pointsDelta
          : existing?.bonusPoints || target.bonusPoints || 0,
      redeemedPoints:
        pointsDelta < 0
          ? (existing?.redeemedPoints || target.redeemedPoints || 0) + Math.abs(pointsDelta)
          : existing?.redeemedPoints || target.redeemedPoints || 0,
      loyaltyLogs: [newLog, ...(existing?.loyaltyLogs || target.loyaltyLogs || [])],
      followUpLogs: existing?.followUpLogs || target.followUpLogs || [],
      customOffersSent: existing?.customOffersSent || target.customOffersSent || [],
      createdAt: existing?.createdAt || target.firstPurchaseDate,
      updatedAt: new Date().toISOString(),
    };

    onSaveCustomCustomer(updatedRecord);
    setPointsActionModal(null);
    setCustomPointsReason('');

    if (onSendSmartNotification) {
      onSendSmartNotification(
        pointsDelta > 0
          ? `تمت إضافة +${pointsDelta} نقطة ولاء للعميل ${target.name}`
          : `تم استبدال ${Math.abs(pointsDelta)} نقطة ولاء للعميل ${target.name}`,
        reasonText,
        pointsDelta > 0 ? 'مكافأة ولاء' : 'استبدال نقاط'
      );
    }
  };

  // Send WhatsApp Loyalty Card to Customer & Log Follow-up
  const handleSendWhatsAppLoyalty = (c: EnrichedCustomerProfile) => {
    const topPerfumesText =
      c.favoriteProducts.length > 0
        ? c.favoriteProducts.slice(0, 2).map(p => p.name).join(' ، ')
        : 'مجموعتنا الفاخرة';
    const nextRecText =
      c.recommendedNextProducts.length > 0
        ? c.recommendedNextProducts[0].name
        : 'أحدث العطور الشرقية والفرنسية';

    const msg = [
      `مرحباً بك أستاذ/ة *${c.name}* في *${settings.storeName}* ✨`,
      ``,
      `يسعدنا إطلاعك على بطاقة عضويتك في برنامج الولاء:`,
      `• الفئة الحالية: *${c.tierLabel}*`,
      `• رصيد نقاط الولاء المتاح: *${c.netAvailablePoints} نقطة* (بقيمة خصم ~${c.pointsCashValue} ${currency})`,
      `• إجمالي الزيارات والفواتير: *${c.ordersCount} فاتورة*`,
      `• إجمالي الخصومات والمزايا التي حصلت عليها: *${c.totalDiscountsReceived} ${currency}*`,
      `• عطورك المفضلة لدينا: *${topPerfumesText}*`,
      ``,
      `🎁 *ترشيح خاص لذوقك الرفيع في زيارتك القادمة:*`,
      `ننصحك بتجربة عطر *(${nextRecText})* المخصص لعشاق الروائح الـ ${c.olfactoryStyle}.`,
      ``,
      `نتشرف دائماً بخدمتك! 🌸`,
    ].join('\n');

    handleRecordFollowUp(c, {
      channel: 'واتساب',
      actionType: 'تذكير نقاط ولاء',
      summary: `إرسال بطاقة عضوية الولاء (${c.netAvailablePoints} نقطة) وترشيح عطر (${nextRecText}) عبر واتساب`,
      whatsappMessageToOpen: msg,
    });
  };

  // Export Customers CSV
  const handleExportCustomersCSV = () => {
    const headers = [
      'اسم العميل',
      'رقم الهاتف',
      'شريحة الولاء',
      'عدد الفواتير',
      'إجمالي المشتريات الصافي',
      'إجمالي الخصومات والعروض الممنوحة',
      'نقاط الولاء المتاحة',
      'البصمة العطرية',
      'الحجم المفضل (مل)',
      'العطر المفضل',
      'حالة المتابعة',
      'آخر زيارة',
    ];
    const rows = filteredCustomers.map(c => [
      `"${c.name}"`,
      `"${c.phone || 'غير مسجل'}"`,
      `"${c.tierLabel}"`,
      c.ordersCount,
      c.totalSpent,
      c.totalDiscountsReceived,
      c.netAvailablePoints,
      `"${c.olfactoryStyle}"`,
      c.preferredBottleSize,
      `"${c.favoriteProducts[0]?.name || '-'}"`,
      `"${c.followUpStatus}"`,
      `"${new Date(c.lastPurchaseDate).toLocaleDateString('ar-EG')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `قاعدة-بيانات-العملاء-والولاء-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* ======================================================== */}
      {/* TOP HEADER & REAL-DATA ANALYTICAL AI BADGE               */}
      {/* ======================================================== */}
      <header className="apple-glass rounded-[26px] p-4 sm:p-5 border border-[#C49746]/35 bg-gradient-to-r from-white via-[#0071E3]/[0.06] to-[#C49746]/[0.12] shadow-apple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1D1D1F] to-[#3A3A3C] text-[#C49746] flex items-center justify-center shadow-md shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-[#1D1D1F] tracking-tight">
                منظومة العملاء والولاء والذكاء التحليلي الشامل (CRM 360°)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/12 text-[#248A3D] text-[11px] font-black border border-emerald-500/25 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>بيانات حقيقية ١٠٠٪ · متصل بجميع الأقسام</span>
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              سجل المعاملات التفصيلي، العروض والخصومات الفعلية، التفضيلات العطرية، الذكاء الاصطناعي التحليلي، وجدولة المتابعة والتواصل الفوري
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenLoyaltySettings && (
            <button
              type="button"
              onClick={onOpenLoyaltySettings}
              className={`apple-btn px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all ${
                settings.loyaltyEnabled !== false
                  ? 'bg-[#1D1D1F] hover:bg-black text-amber-300 border border-[#C49746]/30'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <Sparkles size={14} className={settings.loyaltyEnabled !== false ? 'text-amber-300' : 'text-rose-600'} />
              <span>
                {settings.loyaltyEnabled !== false
                  ? 'ضبط محرك الولاء بالذكاء الاصطناعي'
                  : 'محرك الولاء متوقف · اضغط للتفعيل'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCustomersCSV}
            className="apple-btn px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] border border-black/[0.08] text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-[#248A3D]" />
            <span>تصدير السجل (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddCustomer}
            className="apple-btn px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 shadow-apple-sm cursor-pointer"
          >
            <UserPlus size={15} />
            <span>تسجيل عميل حقيقي جديد</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 5 EXECUTIVE REAL-TIME CRM, DISCOUNTS & AI KPI CARDS      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="apple-glass rounded-2xl p-3.5 border border-[#0071E3]/30 bg-gradient-to-br from-white via-[#0071E3]/[0.07] to-sky-500/[0.14] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#636366] block">العملاء الفعليون المسجلون</span>
            <span className="text-2xl font-black font-mono text-[#1D1D1F] mt-0.5 block">
              {crmStats.totalCustomers}
            </span>
            <span className="text-[10px] text-[#0071E3] font-bold mt-0.5 block">
              ولاء متكرر: {crmStats.retentionRate}% ({crmStats.repeatCustomers} عميل دائم)
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-3.5 border border-[#C49746]/35 bg-gradient-to-br from-white via-amber-500/[0.07] to-[#C49746]/[0.15] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#636366] block">إجمالي إنفاق العملاء الصافي</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1D1D1F] mt-0.5 block">
              {crmStats.totalCustomerRevenue.toLocaleString('ar-EG')} <span className="text-[11px] font-bold">{currency}</span>
            </span>
            <span className="text-[10px] text-[#86868B] mt-0.5 block">
              كبار العملاء VIP: {crmStats.vipCount} عضو
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#1D1D1F] text-amber-300 flex items-center justify-center shrink-0">
            <ShoppingBag size={19} />
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-3.5 border border-amber-300/60 bg-gradient-to-br from-white via-amber-500/[0.08] to-orange-500/[0.14] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#636366] block">إجمالي الخصومات والعروض الممنوحة</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#9A6E23] mt-0.5 block">
              {crmStats.totalDiscountsGiven.toLocaleString('ar-EG')} <span className="text-[11px] font-bold">{currency}</span>
            </span>
            <span className="text-[10px] text-[#9A6E23] font-semibold mt-0.5 block">
              خصومات فواتير + استبدال نقاط ولاء
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#C49746]/15 text-[#9A6E23] flex items-center justify-center shrink-0">
            <BadgePercent size={20} />
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-3.5 border border-emerald-300/60 bg-gradient-to-br from-white via-emerald-500/[0.08] to-teal-500/[0.15] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#636366] block">نقاط الولاء النشطة بالمحافظ</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#248A3D] mt-0.5 block">
              {crmStats.totalActivePoints.toLocaleString('ar-EG')} <span className="text-[11px] font-bold">نقطة</span>
            </span>
            <span className="text-[10px] text-[#248A3D] font-semibold mt-0.5 block">
              تعادل ~{Math.round(crmStats.totalActivePoints * (settings.loyaltyCashPerPointEgp || 0.6))} {currency} خصم آمن
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
        </div>

        <div
          onClick={() => setTierFilter(tierFilter === 'needs_followup' ? 'all' : 'needs_followup')}
          className={`apple-glass rounded-2xl p-3.5 border transition-all cursor-pointer flex items-center justify-between ${
            tierFilter === 'needs_followup'
              ? 'border-rose-400 bg-gradient-to-br from-rose-50 via-rose-500/15 to-pink-500/20 ring-2 ring-rose-500/15'
              : 'border-rose-300/60 bg-gradient-to-br from-white via-rose-500/[0.07] to-pink-500/[0.14] hover:border-rose-400'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-rose-700 block">ترشيحات المتابعة والتنسيق الآن</span>
            <span className="text-2xl font-black font-mono text-rose-600 mt-0.5 block">
              {crmStats.urgentFollowUpCount} <span className="text-xs font-bold">عميل</span>
            </span>
            <span className="text-[10px] text-[#636366] mt-0.5 block">
              غائبون أو حان موعد إعادة تعبئة عطورهم
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-500/12 text-rose-600 flex items-center justify-center shrink-0">
            <BellRing size={19} />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* AI ANALYTICS: TOP LOYAL CUSTOMER PURCHASING PATTERNS     */}
      {/* ======================================================== */}
      {topLoyalCustomerAnalytics && (
        <section className="rounded-[28px] p-4 sm:p-5 bg-gradient-to-l from-[#1D1D1F] via-[#242018] to-[#1D1D1F] text-white border border-[#C49746]/45 shadow-[0_18px_42px_rgba(0,0,0,0.14)] space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 to-[#C49746] text-[#1D1D1F] flex items-center justify-center shadow-md shrink-0">
                <Crown size={22} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-amber-300 tracking-wide">
                    تحليل الذكاء الاصطناعي التلقائي (AI Loyalty Analytics)
                  </span>
                  <span className="text-white/30">·</span>
                  <span className="text-[11px] text-emerald-300 font-bold">
                    الأنماط الشرائية للعميل الأكثر ولاءً
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-white mt-0.5">
                  العميل المتصدر في الولاء: {topLoyalCustomerAnalytics.champion.name}{' '}
                  <span className="text-amber-300 font-mono text-xs">
                    ({topLoyalCustomerAnalytics.champion.phone || 'بدون رقم'}) · {topLoyalCustomerAnalytics.champion.tierLabel}
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerKey(topLoyalCustomerAnalytics.champion.key);
                  handlePrepareCustomOffer(topLoyalCustomerAnalytics.champion);
                }}
                className="apple-btn px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-300 to-[#C49746] text-[#1D1D1F] text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Gift size={14} />
                <span>تجهيز عرض مخصص للعميل المتصدر</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerKey(topLoyalCustomerAnalytics.champion.key);
                  setActiveDossierTab('ai_followup');
                }}
                className="apple-btn px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <BrainCircuit size={14} className="text-amber-300" />
                <span>عرض ملفه الكامل</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
            {/* Extracted Purchasing Patterns */}
            <div className="lg:col-span-7 p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-2">
              <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>الأنماط الشرائية المستخرجة تلقائياً من معاملاته الفعلية:</span>
              </span>
              <div className="space-y-1.5">
                {topLoyalCustomerAnalytics.patternInsights.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-zinc-200 text-[11px] leading-relaxed">
                    <span className="text-amber-400 font-black">•</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto Personalized Communication Suggestions */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-2">
              {topLoyalCustomerAnalytics.autoSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white/[0.06] border border-[#C49746]/30 flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-emerald-300 block">{sug.badge} · {sug.title}</span>
                    <p className="text-[11px] text-zinc-300 leading-snug">{sug.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePrepareCustomOffer(topLoyalCustomerAnalytics.champion)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[10px] font-black shrink-0 cursor-pointer"
                  >
                    تجهيز وإرسال
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* FILTER & SEARCH CONTROL BAR                              */}
      {/* ======================================================== */}
      <div className="apple-glass rounded-2xl p-3.5 border border-black/[0.06] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2.5 rounded-2xl border border-[#14f9aa] bg-gradient-to-r from-[#0071E3]/10 via-[#14f9aa]/12 to-[#C49746]/12 shadow-apple-xs">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم العميل، رقم الهاتف، ملاحظاته، أو اسم عطر اشتراه..."
              className="w-full h-10 pr-10 pl-4 rounded-xl bg-white border border-black/[0.08] focus:border-[#0071E3] text-xs font-medium outline-none"
            />
            <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'all', label: 'كل العملاء الحقيقيين' },
              { id: 'needs_followup', label: '🔔 يحتاج متابعة وتنسيق' },
              { id: 'diamond', label: '💎 ماسي VIP' },
              { id: 'gold', label: '👑 ذهبي' },
              { id: 'silver', label: '🥈 فضي' },
              { id: 'welcome', label: '🌟 ترحيبي' },
              { id: 'inactive', label: '⏰ غائبون (+14 يوم)' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTierFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  tierFilter === tab.id
                    ? 'bg-[#1D1D1F] text-white shadow-2xs'
                    : 'bg-black/[0.04] text-[#636366] hover:text-[#1D1D1F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-3 rounded-xl bg-white border border-black/[0.08] text-xs font-bold text-[#1D1D1F] outline-none"
          >
            <option value="spent_desc">الأعلى إنفاقاً وشراءً</option>
            <option value="discounts_desc">الأكثر حصولاً على عروض وخصومات</option>
            <option value="points_desc">الأعلى رصيد نقاط ولاء</option>
            <option value="orders_desc">الأكثر زيارات ومعاملات</option>
            <option value="recent">الأحدث معاملة</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.04] text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#86868B] ml-1">فلترة بالتفضيل العطري:</span>
            {(['all', 'صيفي', 'شتوي', 'مسك', 'عود', 'فرنسي'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStyleFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  styleFilter === st
                    ? 'bg-[#0071E3] text-white'
                    : 'bg-white border border-black/[0.06] text-[#636366] hover:text-[#1D1D1F]'
                }`}
              >
                {st === 'all' ? 'جميع التفضيلات' : st === 'صيفي' ? '☀️ صيفي' : st === 'شتوي' ? '❄️ شتوي' : st === 'مسك' ? '💧 مسك' : st === 'عود' ? '🪵 عود' : '✨ فرنسي'}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#86868B] font-mono">
            العملاء المطابقون: {filteredCustomers.length} عميل حقيقي
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MASTER-DETAIL SPLIT VIEW: CUSTOMERS LIST + 360° DOSSIER   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Right Column (4 cols): Real Customers Directory List */}
        <div className="lg:col-span-4 space-y-2.5 max-h-[860px] overflow-y-auto pr-0.5">
          {filteredCustomers.length === 0 ? (
            <div className="apple-glass rounded-3xl p-7 text-center border border-black/[0.06] space-y-3">
              <Users size={36} className="mx-auto text-[#86868B]" />
              <p className="text-sm font-black text-[#1D1D1F]">
                لا يوجد عملاء حقيقيون مسجلون حالياً في هذا الفلتر
              </p>
              <p className="text-xs text-[#636366] leading-relaxed">
                النظام لا يعرض أي عملاء افتراضيين. يتم إنشاء ملف العميل تلقائياً بمجرد كتابة اسمه أو رقم هاتفه في شاشة الكاشير (POS)، أو يمكنك تسجيل عميل حقيقي الآن أو ربط الفواتير السابقة به.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenAddCustomer}
                  className="px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-black cursor-pointer"
                >
                  + تسجيل عميل حقيقي الآن
                </button>
                {unlinkedSales.length > 0 && (
                  <span className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                    يوجد {unlinkedSales.length} فاتورة بالكاشير متاحة للربط بالعملاء
                  </span>
                )}
              </div>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const isSelected = activeCustomerDossier?.key === customer.key;
              const urgencyColor =
                customer.aiAnalysis.nextBestAction.priority === 'عاجل اليوم'
                  ? 'bg-rose-500/12 text-rose-700 border-rose-300'
                  : customer.aiAnalysis.nextBestAction.priority === 'مهم هذا الأسبوع'
                  ? 'bg-amber-500/12 text-amber-800 border-amber-300'
                  : 'bg-emerald-500/12 text-emerald-800 border-emerald-300';

              return (
                <div
                  key={customer.key}
                  onClick={() => setSelectedCustomerKey(customer.key)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#0071E3] ring-2 ring-[#0071E3]/15 shadow-apple-card'
                      : 'bg-white/90 hover:bg-white border-black/[0.06] shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                          customer.tierId === 'diamond'
                            ? 'bg-[#1D1D1F] text-amber-300'
                            : customer.tierId === 'gold'
                            ? 'bg-amber-500/15 text-[#9A6E23]'
                            : 'bg-[#0071E3]/10 text-[#0071E3]'
                        }`}
                      >
                        {customer.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-black text-[#1D1D1F] truncate">
                            {customer.name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${customer.tierBadgeClass}`}>
                            {customer.tierLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#636366] font-mono mt-0.5 flex-wrap">
                          <span className="font-bold text-[#1D1D1F]">{customer.phone || 'بدون هاتف'}</span>
                          <span>·</span>
                          <span className="font-sans text-[10px]">ذوق {customer.olfactoryStyle} ({customer.preferredBottleSize}مل)</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-xs sm:text-sm font-black font-mono text-[#1D1D1F] block">
                        {customer.totalSpent.toLocaleString('ar-EG')} {currency}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#248A3D] bg-[#34C759]/12 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                        ★ {customer.netAvailablePoints} نقطة
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-black/[0.04] flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#636366]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        المعاملات: <strong className="font-mono text-[#1D1D1F]">{customer.ordersCount}</strong>
                      </span>
                      {customer.ordersCount > 0 && (
                        <span className="font-mono text-[#0071E3] font-bold">
                          · {customer.lastPurchaseBottleQuantity > 1 ? `${customer.lastPurchaseBottleQuantity}×${customer.preferredBottleSize}مل` : `${customer.preferredBottleSize}مل`} (متبقي ~{customer.remainingBottlePercent}%)
                        </span>
                      )}
                      {customer.totalDiscountsReceived > 0 && (
                        <span className="text-[#9A6E23] font-bold">
                          · خصومات: {customer.totalDiscountsReceived} {currency}
                        </span>
                      )}
                      {customer.lowStockPurchasedPerfumes.some(lp => lp.isDirectPurchase) && (
                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                          · ⚠️ عطر يوشك على النفاد
                        </span>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${urgencyColor}`}>
                      {customer.ordersCount > 0 && customer.daysSinceLastPurchase < customer.firstCheckInDay
                        ? `متابعة بعد ${customer.firstCheckInDay - customer.daysSinceLastPurchase}ي`
                        : customer.ordersCount > 0 && customer.daysSinceLastPurchase >= customer.refillReminderDay
                        ? 'حان موعد التعبئة'
                        : customer.followUpStatus}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Left Column (8 cols): Full 360° Customer Dossier & AI Intelligence Hub */}
        <div className="lg:col-span-8">
          {activeCustomerDossier ? (
            <div className="apple-glass rounded-3xl p-4 sm:p-6 border border-black/[0.08] shadow-apple-card space-y-4">
              {/* Dossier Header */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#1D1D1F] text-[#C49746] flex items-center justify-center font-black text-xl shadow-md shrink-0">
                    {activeCustomerDossier.name.slice(0, 1)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-[#1D1D1F]">
                        {activeCustomerDossier.name}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${activeCustomerDossier.tierBadgeClass}`}>
                        {activeCustomerDossier.tierLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-black/[0.05] text-[#1D1D1F] text-[10px] font-bold">
                        الحالة: {activeCustomerDossier.followUpStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#636366] font-mono">
                      <span className="flex items-center gap-1 font-bold text-[#1D1D1F]">
                        <Phone size={12} className="text-[#0071E3]" />
                        {activeCustomerDossier.phone || 'لم يُسجل رقم الهاتف'}
                      </span>
                      {!activeCustomerDossier.phone && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditCustomer(activeCustomerDossier)}
                          className="px-2.5 py-0.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#128C7E] text-[10px] font-sans font-black flex items-center gap-1 animate-pulse cursor-pointer"
                        >
                          <MessageCircle size={11} />
                          <span>أضف رقم واتساب للتواصل الآن ✍️</span>
                        </button>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-1 font-sans">
                        <Calendar size={12} className="text-[#86868B]" />
                        أول تعامل: {new Date(activeCustomerDossier.firstPurchaseDate).toLocaleDateString('ar-EG')}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-sans">
                        <Clock size={12} className="text-[#86868B]" />
                        {activeCustomerDossier.ordersCount === 0
                          ? 'مسجل جديد (بانتظار أول فاتورة)'
                          : activeCustomerDossier.daysSinceLastPurchase === 0
                          ? 'اشترى اليوم'
                          : `آخر معاملة منذ ${activeCustomerDossier.daysSinceLastPurchase} يوم`}
                      </span>
                      {activeCustomerDossier.ordersCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-sans text-[11px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-lg">
                            <Droplets size={11} />
                            <span>
                              {activeCustomerDossier.lastPurchaseBottleQuantity > 1
                                ? `${activeCustomerDossier.lastPurchaseBottleQuantity} عبوات × ${activeCustomerDossier.preferredBottleSize} مل (${activeCustomerDossier.lastPurchaseTotalMl} مل)`
                                : `عبوة ${activeCustomerDossier.preferredBottleSize} مل`}{' '}
                              · متبقي ~{activeCustomerDossier.remainingBottlePercent}% · المتابعة الذكية بعد {activeCustomerDossier.firstCheckInDay} أيام والتعبئة بعد {activeCustomerDossier.refillReminderDay} يوم
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons for Selected Customer */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePrepareCustomOffer(activeCustomerDossier)}
                    className="apple-btn px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#C49746] text-[#1D1D1F] text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="إنشاء رسالة نصية أو واتساب أو بريد إلكتروني مخصص بناءً على تاريخ العميل المالي وعطوره المفضلة"
                  >
                    <Gift size={14} />
                    <span>تجهيز عرض مخصص</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunDeepCustomerAI(activeCustomerDossier)}
                    disabled={isGeneratingAIKey === activeCustomerDossier.key}
                    className="apple-btn px-3 py-2 rounded-xl bg-gradient-to-r from-[#1D1D1F] to-[#3A3A3C] text-amber-300 border border-[#C49746]/40 text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <BrainCircuit size={14} className={isGeneratingAIKey === activeCustomerDossier.key ? 'animate-spin' : ''} />
                    <span>{isGeneratingAIKey === activeCustomerDossier.key ? 'جاري التحليل الذكي...' : 'تحليل AI الفوري 360°'}</span>
                  </button>

                  {onSelectCustomerForPOS && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectCustomerForPOS({
                          name: activeCustomerDossier.name,
                          phone: activeCustomerDossier.phone,
                        })
                      }
                      className="apple-btn px-3 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ShoppingBag size={13} />
                      <span>فتح بالكاشير</span>
                    </button>
                  )}

                  {activeCustomerDossier.phone && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppLoyalty(activeCustomerDossier)}
                        className="apple-btn px-3 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-[#1E7E34] hover:text-white border border-[#25D366]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageCircle size={13} />
                        <span>بطاقة واتساب</span>
                      </button>

                      <a
                        href={`tel:${activeCustomerDossier.phone}`}
                        onClick={() =>
                          handleRecordFollowUp(activeCustomerDossier, {
                            channel: 'اتصال هاتفي',
                            actionType: 'متابعة رضا وثبات',
                            summary: `بدء اتصال هاتفي مباشر بالعميل على الرقم ${activeCustomerDossier.phone}`,
                          })
                        }
                        className="apple-btn p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                        title="اتصال هاتفي مباشر وتوثيق المكالمة"
                      >
                        <PhoneCall size={14} />
                      </a>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditCustomer(activeCustomerDossier)}
                    className="apple-btn p-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] cursor-pointer"
                    title="تعديل بيانات وتفضيلات العميل"
                  >
                    <Edit3 size={15} />
                  </button>

                  {activeCustomerDossier.customRecord && onDeleteCustomCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteCustomCustomer(activeCustomerDossier.customRecord!);
                        setSelectedCustomerKey(null);
                      }}
                      className="apple-btn p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                      title="حذف البطاقة اليدوية"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Real-Time Analytical AI Executive Strip (Always Live & Connected) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-l from-amber-50/90 via-white to-blue-50/70 border border-[#C49746]/35 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#1D1D1F] text-amber-300 text-[10px] font-black flex items-center gap-1">
                      <BrainCircuit size={11} />
                      <span>الملخص الذكي الفوري</span>
                    </span>
                    <span className="text-xs font-black text-[#1D1D1F]">
                      تقييم الولاء: {activeCustomerDossier.aiAnalysis.retentionScore}/100 ({activeCustomerDossier.aiAnalysis.retentionHealth})
                    </span>
                    <span className="text-[11px] font-bold text-[#0071E3]">
                      · الإجراء المقترح: {activeCustomerDossier.aiAnalysis.nextBestAction.timingText}
                    </span>
                  </div>
                  <p className="text-xs text-[#3A3A3C] leading-relaxed">
                    {activeCustomerDossier.aiAnalysis.executiveSummary}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePrepareCustomOffer(activeCustomerDossier)}
                    className="px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Mail size={12} />
                    <span>تجهيز عرض مخصص (SMS / بريد)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDossierTab('ai_followup')}
                    className="px-3 py-1.5 rounded-xl bg-[#1D1D1F] text-amber-300 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>تنسيق متابعة</span>
                  </button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* AUTOMATIC LOW-STOCK PERFUME DETECTOR FOR SELECTED CUSTOMER */}
              {/* ======================================================== */}
              {activeCustomerDossier.lowStockPurchasedPerfumes.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-l from-[#FFF5F5] via-[#FFFDF9] to-[#FFF8EB] border-2 border-[#FF9500]/45 shadow-apple-sm space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#FF9500]/20">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FF3B30]/12 text-[#FF3B30] flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                        <AlertCircle size={19} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                            تنبيه ذكي للبائع: العميل يشتري عطراً يوشك مخزونه على النفاد!
                          </span>
                          <span className="text-[11px] font-bold text-[#D70015]">
                            · رصد تلقائي مرتبط بالمخزون الحي
                          </span>
                        </div>
                        <p className="text-[11px] text-[#636366] mt-0.5">
                          اكتشف النظام أن عطر العميل المفضل أوشك على النفاد. يمكنك فوراً <strong className="text-[#1D1D1F]">اقتراح بديل متوفر مطابق لذوقه</strong> أو <strong className="text-[#1D1D1F]">إبلاغ العميل بتوفر الكمية قريباً / حجز الأولوية</strong>.
                        </p>
                      </div>
                    </div>

                    {!activeCustomerDossier.phone && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditCustomer(activeCustomerDossier)}
                        className="px-3 py-1.5 rounded-xl bg-[#FF3B30] text-white text-[11px] font-black shrink-0 animate-pulse cursor-pointer"
                      >
                        ⚠️ أضف رقم واتساب العميل للتواصل
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {activeCustomerDossier.lowStockPurchasedPerfumes.map((alertItem, idx) => {
                      const topAlt = alertItem.alternatives[0];
                      return (
                        <div
                          key={`${alertItem.perfumeName}-${idx}`}
                          className="p-3.5 rounded-2xl bg-white border border-[#FF9500]/30 space-y-3 text-xs"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                                  عطر: {alertItem.perfumeName}
                                </span>
                                <span className="text-[11px] font-bold text-[#D70015] font-mono">
                                  ({alertItem.severityLabel})
                                </span>
                                <span className="text-[11px] text-[#636366]">
                                  · {alertItem.isDirectPurchase ? `اشتراه العميل ${alertItem.purchaseCount} مرات (${alertItem.totalGramsBought} جم)` : `ضمن بصمته العطرية (${activeCustomerDossier.olfactoryStyle})`}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#636366]">
                                الحجم المفضل للعميل: <strong>{activeCustomerDossier.preferredBottleSize} مل</strong> · المتبقي الفعلي بالمخزون الآن: <strong className="font-mono text-[#D70015]">{alertItem.currentStockGrams} جم</strong>
                              </p>
                            </div>

                            {/* Quick Action Buttons: Notify Upcoming Stock OR Register Priority Request */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const msg =
                                    alertItem.currentStockGrams > 0
                                      ? [
                                          `مرحباً بك أستاذ/ة *${activeCustomerDossier.name}* في *${settings.storeName}* ✨`,
                                          `لأننا نعلم شغفك بعطرك المفضل *(${alertItem.perfumeName})*، نود إبلاغك بأن الكمية المتبقية منه حالياً محدودة جداً (${alertItem.currentStockGrams} جم فقط)، كما أن الدفعة الجديدة المعتقة ستتوفر قريباً جداً 🌟`,
                                          `هل ترغب في حجز عبوة *${activeCustomerDossier.preferredBottleSize} مل* لك الآن أو تسجيل أولوية إشعارك فور وصول الدفعة الجديدة؟`,
                                          `كما نرشح لذوقك الرفيع تجربة عطر *(${topAlt?.name || 'مجموعتنا الخاصة'})* المتوفر حالياً بنفس الفخامة والثبات 🌸`,
                                        ].join('\n')
                                      : [
                                          `مرحباً بك أستاذ/ة *${activeCustomerDossier.name}* في *${settings.storeName}* ✨`,
                                          `نود إبلاغك بأن عطرك المفضل *(${alertItem.perfumeName})* قيد التوريد والتعتيق المعملي حالياً وستتوفر كميته الجديدة قريباً جداً بأعلى ثبات 🌟`,
                                          `لقد قمنا بتسجيل اسمك في قائمة الأولوية لإبلاغك فور توفره، ولحين ذلك نرشح لذوقك الرفيع عطر *(${topAlt?.name || 'مجموعتنا الخاصة'})* المطابق لبصمتك العطرية مع خصم VIP خاص لك 🌸`,
                                        ].join('\n');

                                  handleRecordFollowUp(activeCustomerDossier, {
                                    channel: 'واتساب',
                                    actionType: 'إشعار توفر عطر',
                                    summary: `إبلاغ العميل بحالة مخزون عطر (${alertItem.perfumeName} - متبقي ${alertItem.currentStockGrams}جم) واقتراح البديل (${topAlt?.name || '-'})`,
                                    newStatus: 'بانتظار الرد',
                                    whatsappMessageToOpen: msg,
                                  });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                              >
                                <MessageCircle size={13} />
                                <span>إبلاغ العميل بتوفر الكمية قريباً / حجز (واتساب)</span>
                              </button>

                              {onSaveCustomerRequest && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const req: CustomerRequest = {
                                      id: `req-${Date.now()}`,
                                      perfumeName: alertItem.perfumeName,
                                      customerName: activeCustomerDossier.name,
                                      customerPhone: activeCustomerDossier.phone,
                                      requestedBottleSize: activeCustomerDossier.preferredBottleSize,
                                      requestCount: 1,
                                      lastRequestedAt: new Date().toISOString(),
                                      status: 'جديد',
                                      notes: `طلب تلقائي من CRM: العميل يشتري (${alertItem.perfumeName}) والمخزون الحالي (${alertItem.currentStockGrams}جم) يوشك على النفاد`,
                                    };
                                    onSaveCustomerRequest(req);
                                    handleRecordFollowUp(activeCustomerDossier, {
                                      channel: 'رسالة عرض',
                                      actionType: 'إشعار توفر عطر',
                                      summary: `تسجيل حجز وأولوية توفير عطر (${alertItem.perfumeName} - ${activeCustomerDossier.preferredBottleSize}مل) في رادار المشتريات`,
                                    });
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#1D1D1F] hover:bg-black text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <BellRing size={12} />
                                  <span>حجز أولوية فور التوريد</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Suggested In-Stock Alternatives Row */}
                          {alertItem.alternatives.length > 0 && (
                            <div className="pt-2.5 border-t border-black/[0.05] space-y-2">
                              <span className="text-[11px] font-black text-[#0071E3] flex items-center gap-1.5">
                                <Sparkles size={13} />
                                <span>البدائل المتوفرة المقترحة للبائع (مطابقة لنفس العائلة العطرية والفصل ومليئة بالمخزون):</span>
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {alertItem.alternatives.map(alt => (
                                  <div
                                    key={alt.id}
                                    className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col justify-between gap-2"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-black text-[#1D1D1F] text-xs truncate">
                                          بديل: {alt.name}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-[#248A3D] shrink-0">
                                          متوفر {alt.stock_grams} جم
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-[#636366] block mt-0.5">
                                        {alt.brand} · {alt.type} · {alt.season}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePrepareCustomOffer(
                                            activeCustomerDossier,
                                            alt.name,
                                            activeCustomerDossier.preferredBottleSize
                                          )
                                        }
                                        className="flex-1 py-1 px-2 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-[10px] font-black text-center cursor-pointer"
                                      >
                                        اقتراح البديل بعرض مخصص
                                      </button>
                                      {onSelectCustomerForPOS && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onSelectCustomerForPOS({
                                              name: activeCustomerDossier.name,
                                              phone: activeCustomerDossier.phone,
                                            })
                                          }
                                          className="py-1 px-2 rounded-lg bg-white border border-black/[0.1] hover:border-[#0071E3] text-[#1D1D1F] text-[10px] font-bold cursor-pointer shrink-0"
                                          title="تحويل العميل للكاشير لبيع البديل"
                                        >
                                          للكاشير
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loyalty Points Wallet & Safe Redemption Strip */}
              <div className="p-4 rounded-2xl bg-gradient-to-l from-[#1D1D1F] via-[#262118] to-[#1D1D1F] text-white border border-[#C49746]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">محفظة نقاط الولاء والخصومات المكتسبة</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                      {activeCustomerDossier.netAvailablePoints.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-xs text-amber-300 font-bold">نقطة متاحة</span>
                    <span className="text-[11px] text-zinc-300 font-mono">
                      (قيمة الخصم النقدي: ~{activeCustomerDossier.pointsCashValue} {currency})
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    مكتسب من الفواتير: {activeCustomerDossier.earnedPointsFromSales} · مكافآت إضافية: {activeCustomerDossier.bonusPoints} · مستبدل سابقاً: {activeCustomerDossier.redeemedPoints} · إجمالي الخصومات الفعلية الحاصل عليها: {activeCustomerDossier.totalDiscountsReceived} {currency}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onSelectCustomerForPOS && activeCustomerDossier.netAvailablePoints > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectCustomerForPOS({
                          name: activeCustomerDossier.name,
                          phone: activeCustomerDossier.phone,
                          autoRedeemLoyalty: true,
                        })
                      }
                      className="apple-btn px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-[#1D1D1F] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles size={14} />
                      <span>تطبيق خصم النقاط بالكاشير (-{activeCustomerDossier.pointsCashValue} {currency})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCustomPointsAmount(50);
                      setCustomPointsReason('استبدال نقاط ولاء بمكافأة عطرية / خصم');
                      setPointsActionModal({ customer: activeCustomerDossier, mode: 'redeem' });
                    }}
                    className="apple-btn px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#C49746] text-[#1D1D1F] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Gift size={14} />
                    <span>استبدال مكافأة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomPointsAmount(25);
                      setCustomPointsReason('منح نقاط ولاء تشجيعية للعميل');
                      setPointsActionModal({ customer: activeCustomerDossier, mode: 'bonus' });
                    }}
                    className="apple-btn px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer border border-white/10"
                  >
                    <Plus size={13} />
                    <span>إضافة نقاط</span>
                  </button>
                </div>
              </div>

              {/* Customer Financial, Discounts & Preferences Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                  <span className="text-[10px] text-[#86868B] block">صافي المبالغ التي أنفقها</span>
                  <span className="text-sm sm:text-base font-black font-mono text-[#1D1D1F] mt-0.5 block">
                    {activeCustomerDossier.totalSpent.toLocaleString('ar-EG')} {currency}
                  </span>
                  <span className="text-[10px] text-[#0071E3] font-mono">
                    متوسط المعاملة: {activeCustomerDossier.avgOrderValue} {currency}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                  <span className="text-[10px] text-[#9A6E23] font-bold block">الخصومات والعروض الحاصل عليها</span>
                  <span className="text-sm sm:text-base font-black font-mono text-[#9A6E23] mt-0.5 block">
                    {activeCustomerDossier.totalDiscountsReceived.toLocaleString('ar-EG')} {currency}
                  </span>
                  <span className="text-[10px] text-[#636366] font-mono">
                    في {activeCustomerDossier.discountEvents.length} معاملة وعرض
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                  <span className="text-[10px] text-[#86868B] block">العبوات والزيت المستهلك</span>
                  <span className="text-sm sm:text-base font-black font-mono text-[#1D1D1F] mt-0.5 block">
                    {activeCustomerDossier.totalBottles} عبوة
                  </span>
                  <span className="text-[10px] text-[#636366] font-mono">
                    {activeCustomerDossier.totalGrams} جم زيت · مفضل {activeCustomerDossier.preferredBottleSize}مل
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                  <span className="text-[10px] text-[#86868B] block">البصمة والتفضيل العطري</span>
                  <span className="text-sm font-black text-[#9A6E23] mt-0.5 block">
                    عطور {activeCustomerDossier.olfactoryStyle}
                  </span>
                  <span className="text-[10px] text-[#636366]">
                    {activeCustomerDossier.concentrationPreference} · {activeCustomerDossier.preferredPaymentMethod}
                  </span>
                </div>

                {showProfit ? (
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
                    <span className="text-[10px] text-[#248A3D] font-bold block">صافي ربح المتجر من العميل</span>
                    <span className="text-sm sm:text-base font-black font-mono text-[#248A3D] mt-0.5 block">
                      +{Math.round(activeCustomerDossier.totalProfit).toLocaleString('ar-EG')} {currency}
                    </span>
                    <span className="text-[10px] text-[#248A3D]/80 font-mono">
                      سقف العرض الآمن: {activeCustomerDossier.aiAnalysis.recommendedBottleUpsell.maxSafeDiscountEgp} {currency}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                    <span className="text-[10px] text-[#86868B] block">إجمالي الزيارات والفواتير</span>
                    <span className="text-sm sm:text-base font-black font-mono text-[#1D1D1F] mt-0.5 block">
                      {activeCustomerDossier.ordersCount} فاتورة
                    </span>
                    <span className="text-[10px] text-[#248A3D] font-bold">
                      أعلى فاتورة: {activeCustomerDossier.highestOrderValue} {currency}
                    </span>
                  </div>
                )}
              </div>

              {/* 5 Interactive Dossier Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                {([
                  {
                    id: 'transactions',
                    label: `سجل المعاملات والفواتير (${activeCustomerDossier.salesList.length})`,
                    icon: Receipt,
                  },
                  {
                    id: 'discounts_offers',
                    label: `العروض والخصومات (${activeCustomerDossier.discountEvents.length})`,
                    icon: BadgePercent,
                  },
                  {
                    id: 'preferences_links',
                    label: 'التفضيلات وارتباط الأقسام',
                    icon: Layers,
                  },
                  {
                    id: 'ai_followup',
                    label: 'الذكاء التحليلي والتواصل الفوري',
                    icon: BrainCircuit,
                  },
                  {
                    id: 'link_invoices',
                    label: `ربط فواتير سابقة (${unlinkedSales.length})`,
                    icon: Link2,
                  },
                ] as const).map(tab => {
                  const IconComp = tab.icon;
                  const active = activeDossierTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveDossierTab(tab.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#1D1D1F] text-white shadow-xs'
                          : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-white/60'
                      }`}
                    >
                      <IconComp size={14} className={active ? 'text-amber-300' : 'text-[#0071E3]'} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ======================================================== */}
              {/* TAB 1: DETAILED TRANSACTIONS & INVOICE ITEM BREAKDOWN    */}
              {/* ======================================================== */}
              {activeDossierTab === 'transactions' && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-[#1D1D1F] flex items-center gap-1.5">
                      <History size={15} className="text-[#0071E3]" />
                      <span>سجل كافة المعاملات والفواتير التفصيلية ({activeCustomerDossier.salesList.length})</span>
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#636366]">
                      <span>إجمالي قبل الخصم: {activeCustomerDossier.grossSubtotalSpent.toLocaleString('ar-EG')} {currency}</span>
                      <span>·</span>
                      <span className="text-[#9A6E23] font-bold">الخصومات: -{activeCustomerDossier.totalDiscountsReceived} {currency}</span>
                      <span>·</span>
                      <span className="text-[#1D1D1F] font-black">الصافي المدفوع: {activeCustomerDossier.totalSpent.toLocaleString('ar-EG')} {currency}</span>
                    </div>
                  </div>

                  {activeCustomerDossier.salesList.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#F5F5F7] text-center space-y-2 text-xs text-[#86868B]">
                      <p className="font-bold text-[#1D1D1F]">لا توجد فواتير مرتبطة بهذا العميل حتى الآن.</p>
                      <p>يمكنك اختيار العميل مباشرة في شاشة الكاشير (POS) أو ربط فاتورة سابقة من تبويب (ربط فواتير سابقة).</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                      {activeCustomerDossier.salesList.map(sale => {
                        const manualDisc = Number(sale.discount) || 0;
                        const loyaltyDisc = Number(sale.loyaltyDiscountAmount) || 0;
                        const totalSaleDisc = manualDisc + loyaltyDisc;
                        const earnedPts = sale.loyaltyPointsEarned ?? Math.floor((sale.totalPrice || 0) / (settings.loyaltyPointsPerSpendEgp || 10));

                        return (
                          <div
                            key={sale.id}
                            className="p-3.5 rounded-2xl bg-[#F5F5F7]/80 border border-black/[0.06] space-y-2 text-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/[0.05]">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-[#0071E3]/12 text-[#0071E3] font-mono font-black">
                                  فاتورة #{sale.id.slice(-6)}
                                </span>
                                <span className="text-[11px] text-[#1D1D1F] font-mono font-bold">
                                  {new Date(sale.date).toLocaleDateString('ar-EG')} ·{' '}
                                  {new Date(sale.date).toLocaleTimeString('ar-EG', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-white border border-black/[0.06] text-[10px] font-bold">
                                  الدفع: {sale.paymentMethod || 'نقدي'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-white border border-black/[0.06] text-[10px] text-[#636366]">
                                  القناة: {sale.source || 'المتجر'} · البائع: {sale.employeeName || 'طارق'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {totalSaleDisc > 0 && (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-[#9A6E23] font-mono text-[10px] font-black">
                                    خصم ممنوح: -{totalSaleDisc} {currency}
                                  </span>
                                )}
                                <span className="text-sm font-black font-mono text-[#1D1D1F]">
                                  {sale.totalPrice.toLocaleString('ar-EG')} {currency}
                                </span>
                              </div>
                            </div>

                            {/* Detailed Items Table Inside Each Sale */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {(sale.items || []).map((it, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-xl bg-white border border-black/[0.04] flex items-center justify-between text-[11px]"
                                >
                                  <div>
                                    <span className="font-black text-[#1D1D1F]">{it.productName}</span>
                                    <span className="text-[10px] text-[#636366] block">
                                      عبوة {it.bottleSize} مل × {it.quantity || 1} ({it.essenceGrams} جم زيت · {it.productType || 'عادي'})
                                    </span>
                                  </div>
                                  <span className="font-mono font-bold text-[#0071E3]">
                                    {((it.sellingPrice || 0) * (it.quantity || 1)).toLocaleString('ar-EG')} {currency}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-[#636366] font-mono">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[#248A3D] font-bold">
                                  +نقاط مكتسبة: {earnedPts} نقطة
                                </span>
                                {(sale.loyaltyPointsRedeemed || 0) > 0 && (
                                  <span className="text-[#9A6E23] font-bold">
                                    · نقاط مستبدلة بالفاتورة: {sale.loyaltyPointsRedeemed} نقطة (-{loyaltyDisc} {currency})
                                  </span>
                                )}
                                {manualDisc > 0 && (
                                  <span className="text-[#9A6E23]">
                                    · خصم نقدي مباشر: -{manualDisc} {currency}
                                  </span>
                                )}
                              </div>
                              {showProfit && (
                                <span className="text-[#248A3D] font-bold">
                                  صافي ربح المعاملة: +{Math.round(sale.totalProfit || 0)} {currency}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 2: DISCOUNTS, OFFERS RECEIVED & CUSTOM OFFER BUILDER */}
              {/* ======================================================== */}
              {activeDossierTab === 'discounts_offers' && (
                <div className="space-y-4 pt-1">
                  {/* Summary of All Discounts & Offers Received */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                      <span className="text-[10px] text-[#9A6E23] font-bold block">إجمالي الخصومات النقدية المباشرة</span>
                      <span className="text-base font-black font-mono text-[#9A6E23] mt-0.5 block">
                        {activeCustomerDossier.manualDiscountsTotal.toLocaleString('ar-EG')} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
                      <span className="text-[10px] text-[#248A3D] font-bold block">خصومات استبدال نقاط الولاء</span>
                      <span className="text-base font-black font-mono text-[#248A3D] mt-0.5 block">
                        {activeCustomerDossier.loyaltyDiscountsTotal.toLocaleString('ar-EG')} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/70">
                      <span className="text-[10px] text-[#0071E3] font-bold block">عروض خاصة مرسلة للعميل</span>
                      <span className="text-base font-black font-mono text-[#0071E3] mt-0.5 block">
                        {activeCustomerDossier.customOffersSent.length} عرض مسجل
                      </span>
                    </div>
                  </div>

                  {/* Interactive Safe Personalized Offer Sender */}
                  <div className="p-4 rounded-2xl bg-gradient-to-l from-[#1D1D1F] to-[#2C2C2E] text-white space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-amber-300" />
                        <span className="text-xs font-black text-amber-300">
                          إرسال عرض خاص مخصص للعميل (مع درع حماية الربح ونقطة التعادل)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                        أقصى خصم آمن مقترح: {activeCustomerDossier.aiAnalysis.recommendedBottleUpsell.maxSafeDiscountEgp} {currency}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <input
                        type="text"
                        value={offerPerfumeName}
                        onChange={(e) => setOfferPerfumeName(e.target.value)}
                        placeholder={
                          activeCustomerDossier.recommendedNextProducts[0]?.name ||
                          activeCustomerDossier.favoriteProducts[0]?.name ||
                          'اسم العطر المقترح بالعرض...'
                        }
                        className="h-9 px-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-zinc-400 outline-none"
                      />
                      <select
                        value={offerBottleSizeMl}
                        onChange={(e) => setOfferBottleSizeMl(Number(e.target.value))}
                        className="h-9 px-2.5 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                      >
                        <option value={30} className="text-black">عبوة 30 مل</option>
                        <option value={50} className="text-black">عبوة 50 مل (الأكثر ربحية)</option>
                        <option value={100} className="text-black">عبوة 100 مل VIP</option>
                      </select>
                      <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-2.5 h-9">
                        <span className="text-[10px] text-zinc-300">قيمة الخصم:</span>
                        <input
                          type="number"
                          min={5}
                          max={200}
                          value={offerDiscountEgp}
                          onChange={(e) => setOfferDiscountEgp(Number(e.target.value) || 0)}
                          className="w-full bg-transparent text-amber-300 font-mono font-black text-center outline-none"
                        />
                        <span className="text-[10px] text-zinc-300">{currency}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetPerf =
                            offerPerfumeName.trim() ||
                            activeCustomerDossier.recommendedNextProducts[0]?.name ||
                            activeCustomerDossier.favoriteProducts[0]?.name ||
                            'عطرك المفضل';
                          const bottleObj =
                            bottleSizes.find(b => b.sizeMl === offerBottleSizeMl) ||
                            DEFAULT_BOTTLE_SIZES.find(b => b.sizeMl === 50)!;
                          const stdPrice = bottleObj.normalPrice;
                          const finalPrice = Math.max(bottleObj.officialCost + 15, stdPrice - offerDiscountEgp);
                          const actualDisc = Math.max(0, stdPrice - finalPrice);

                          const newOffer: CustomerOfferRecord = {
                            id: `off-${Date.now()}`,
                            date: new Date().toISOString(),
                            title: `عرض خاص VIP على عبوة ${offerBottleSizeMl} مل`,
                            perfumeName: targetPerf,
                            bottleSizeMl: offerBottleSizeMl,
                            originalPriceEgp: stdPrice,
                            discountAmountEgp: actualDisc,
                            finalPriceEgp: finalPrice,
                            status: 'أُرسل عبر واتساب',
                            sentBy: currentUser?.displayName || 'الإدارة',
                          };

                          const waMsg = [
                            `مرحباً أستاذ/ة *${activeCustomerDossier.name}* في *${settings.storeName}* ✨`,
                            `تقديراً لعضويتك (${activeCustomerDossier.tierLabel})، خصصنا لك عرضاً حصرياً اليوم:`,
                            `🎁 عطر *(${targetPerf})* بحجم *${offerBottleSizeMl} مل* بتركيز ${activeCustomerDossier.concentrationPreference}`,
                            `💰 بسعر خاص: *${finalPrice} ${currency}* بدلاً من ${stdPrice} ${currency} (وفرت ${actualDisc} ${currency})!`,
                            `ننتظر تشريفك لنا أو اطلبه الآن عبر الواتساب 🌸`,
                          ].join('\n');

                          handleRecordFollowUp(activeCustomerDossier, {
                            channel: 'واتساب',
                            actionType: 'إرسال عرض خاص',
                            summary: `إرسال عرض (${targetPerf} - ${offerBottleSizeMl}مل) بخصم ${actualDisc} ${currency} (بسعر ${finalPrice} ${currency})`,
                            newStatus: 'تم إرسال عرض',
                            whatsappMessageToOpen: waMsg,
                            offerRecord: newOffer,
                          });
                        }}
                        className="h-9 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-[#C49746] text-[#1D1D1F] font-black flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send size={13} />
                        <span>إرسال وتوثيق العرض</span>
                      </button>
                    </div>
                  </div>

                  {/* Chronological Log of All Discounts & Offers */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
                    {activeCustomerDossier.discountEvents.length === 0 &&
                    activeCustomerDossier.loyaltyLogs.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-[#F5F5F7] text-center text-xs text-[#86868B]">
                        لم يحصل العميل على خصومات سابقة بعد. يمكنك إرسال عرض مخصص له من الأعلى.
                      </div>
                    ) : (
                      <>
                        {activeCustomerDossier.discountEvents.map(ev => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-[#9A6E23] text-[10px] font-black">
                                  {ev.type}
                                </span>
                                <span className="font-bold text-[#1D1D1F]">{ev.title}</span>
                              </div>
                              <span className="text-[10px] text-[#86868B] font-mono mt-0.5 block">
                                {new Date(ev.date).toLocaleDateString('ar-EG')} · بواسطة: {ev.byUser || 'النظام'}
                              </span>
                            </div>
                            <div className="text-left font-mono shrink-0">
                              <span className="text-xs font-black text-[#9A6E23] block">
                                خصم {ev.discountEgp} {currency}
                              </span>
                              {ev.invoiceTotalAfter !== undefined && (
                                <span className="text-[10px] text-[#636366]">
                                  صافي المعاملة: {ev.invoiceTotalAfter} {currency}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 3: PREFERENCES, OLFACTORY DNA & CROSS-MODULE LINKS   */}
              {/* ======================================================== */}
              {activeDossierTab === 'preferences_links' && (
                <div className="space-y-4 pt-1">
                  {/* Preferences Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">العائلة العطرية المفضلة</span>
                      <span className="font-black text-[#1D1D1F] mt-0.5 block">عطور {activeCustomerDossier.olfactoryStyle}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">درجة التركيز والفوحان</span>
                      <span className="font-black text-[#0071E3] mt-0.5 block">{activeCustomerDossier.concentrationPreference}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">التغليف والعبوة المفضلة</span>
                      <span className="font-black text-[#1D1D1F] mt-0.5 block">
                        {activeCustomerDossier.preferredBottleSize} مل · {activeCustomerDossier.packagingPreference}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                      <span className="text-[10px] text-[#86868B] block">قناة التواصل والشراء</span>
                      <span className="font-black text-[#248A3D] mt-0.5 block">
                        {activeCustomerDossier.preferredChannel} ({activeCustomerDossier.preferredPaymentMethod})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Favorite Perfumes Bought */}
                    <div className="p-3.5 rounded-2xl bg-[#F5F5F7]/70 border border-black/[0.06] space-y-2">
                      <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                        <Heart size={13} className="text-rose-500 fill-rose-500" />
                        <span>العطور المفضلة التي اشتراها العميل فعلياً</span>
                      </span>
                      {activeCustomerDossier.favoriteProducts.length === 0 ? (
                        <p className="text-[11px] text-[#86868B]">لم يتم تسجيل أصناف مشتراة بعد.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {activeCustomerDossier.favoriteProducts.slice(0, 5).map((fp, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-white border border-black/[0.05] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[#1D1D1F]">{fp.name}</span>
                                <span className="text-[10px] text-[#86868B] mr-1.5">({fp.type} · {fp.totalGrams}جم)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-[#0071E3]">
                                  {fp.count} عبوة · {fp.totalSpent} {currency}
                                </span>
                                {onOpenFormulationEngine && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matchedProd = products.find(p => p.name === fp.name);
                                      onOpenFormulationEngine(matchedProd);
                                    }}
                                    className="p-1 rounded-lg bg-amber-50 text-[#9A6E23] hover:bg-amber-100 cursor-pointer"
                                    title="فتح في محرك التركيب والخلطات"
                                  >
                                    <FlaskConical size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Smart Next Perfume Recommendations Connected to Real Inventory */}
                    <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/60 space-y-2">
                      <span className="text-xs font-black text-[#0071E3] flex items-center gap-1.5">
                        <Sparkles size={13} />
                        <span>ترشيحات المخزون الحقيقي المناسبة لذوق العميل</span>
                      </span>
                      <p className="text-[11px] text-[#3A3A3C]">
                        {activeCustomerDossier.aiAnalysis.layeringSuggestion}
                      </p>
                      <div className="space-y-1.5">
                        {activeCustomerDossier.recommendedNextProducts.map(rec => (
                          <div
                            key={rec.id}
                            className="p-2 rounded-xl bg-white border border-blue-200/50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#1D1D1F]">{rec.name}</span>
                              <span className="text-[10px] text-[#86868B] block">
                                {rec.brand} · {rec.type} · {rec.season}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-[#248A3D] bg-emerald-50 px-2 py-0.5 rounded-lg">
                              متوفر {rec.stock_grams} جم
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cross-Module Link: Customer Requests from Inventory Intelligence */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#9A6E23] flex items-center gap-1.5">
                        <Layers size={14} />
                        <span>ارتباط قسم طلبات العملاء والرادار المخزني ({activeCustomerDossier.matchedCustomerRequests.length})</span>
                      </span>
                      <span className="text-[10px] text-[#636366]">{activeCustomerDossier.aiAnalysis.inventorySyncAlert}</span>
                    </div>
                    {activeCustomerDossier.matchedCustomerRequests.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeCustomerDossier.matchedCustomerRequests.map(req => (
                          <div
                            key={req.id}
                            className="p-2.5 rounded-xl bg-white border border-amber-200/70 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-black text-[#1D1D1F] block">عطر مطلوب: {req.perfumeName}</span>
                              <span className="text-[10px] text-[#636366]">
                                الحالة: {req.status} · الحجم: {req.requestedBottleSize || 50}مل
                              </span>
                            </div>
                            {req.inStockGrams > 0 && activeCustomerDossier.phone && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRecordFollowUp(activeCustomerDossier, {
                                    channel: 'واتساب',
                                    actionType: 'إشعار توفر عطر',
                                    summary: `إبلاغ العميل بتوفر عطر (${req.perfumeName}) في المخزون (${req.inStockGrams}جم)`,
                                    whatsappMessageToOpen: `مرحباً أستاذ/ة *${activeCustomerDossier.name}* 🌸\nيسعدنا إبلاغك بتوفر عطر *(${req.perfumeName})* الذي طلبته سابقاً في *${settings.storeName}* بتركيز فاخر! ننتظر تشريفك ✨`,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#25D366] text-white text-[10px] font-black cursor-pointer"
                              >
                                إبلاغ بتوفره الآن ({req.inStockGrams}جم)
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 4: ANALYTICAL AI, READY SCRIPTS & FOLLOW-UP LOGS     */}
              {/* ======================================================== */}
              {activeDossierTab === 'ai_followup' && (
                <div className="space-y-4 pt-1">
                  {/* Deep AI 360 Insights Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-1">
                      <span className="text-[10px] font-black text-[#0071E3] block">تحليل الإنفاق والخصومات</span>
                      <p className="text-[11px] text-[#1D1D1F] leading-relaxed">
                        {activeCustomerDossier.aiAnalysis.spendingAndDiscountInsight}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-1">
                      <span className="text-[10px] font-black text-[#9A6E23] block">تحليل البصمة العطرية والترقية</span>
                      <p className="text-[11px] text-[#1D1D1F] leading-relaxed">
                        {activeCustomerDossier.aiAnalysis.olfactoryDNAInsight}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
                      <span className="text-[10px] font-black text-[#248A3D] block">
                        أفضل خطوة تالية ({activeCustomerDossier.aiAnalysis.nextBestAction.priority})
                      </span>
                      <p className="text-[11px] font-bold text-[#1D1D1F]">
                        {activeCustomerDossier.aiAnalysis.nextBestAction.title} ({activeCustomerDossier.aiAnalysis.nextBestAction.channel})
                      </p>
                      <p className="text-[10px] text-[#636366]">{activeCustomerDossier.aiAnalysis.nextBestAction.reason}</p>
                    </div>
                  </div>

                  {/* AI Ready-to-Send Communication Scripts */}
                  <div className="space-y-2">
                    <span className="text-xs font-black text-[#1D1D1F] block">
                      رسائل وعروض ذكية جاهزة للإرسال الفوري عبر واتساب وتوثيق المتابعة:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeCustomerDossier.aiAnalysis.readyScripts.map(script => (
                        <div
                          key={script.id}
                          className="p-3 rounded-2xl bg-white border border-black/[0.07] shadow-2xs flex flex-col justify-between gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-[#1D1D1F]">{script.label}</span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-[#9A6E23] text-[10px] font-bold">
                                {script.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#636366] whitespace-pre-line line-clamp-3">
                              {script.messageText}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleRecordFollowUp(activeCustomerDossier, {
                                channel: 'واتساب',
                                actionType: script.type === 'vip_offer' ? 'إرسال عرض خاص' : 'متابعة رضا وثبات',
                                summary: `إرسال رسالة ذكية (${script.label}) عبر واتساب`,
                                newStatus: script.type === 'vip_offer' ? 'تم إرسال عرض' : 'بانتظار الرد',
                                whatsappMessageToOpen: script.messageText,
                              })
                            }
                            className="w-full py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-[#1E7E34] hover:text-white font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageCircle size={13} />
                            <span>إرسال عبر واتساب وتوثيق بالسجل</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Manual Follow-Up & Coordination Logger */}
                  <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2.5 text-xs">
                    <span className="font-black text-[#1D1D1F] block">
                      تسجيل متابعة أو تنسيق موعد زيارة قادم للعميل:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <select
                        value={newFollowUpChannel}
                        onChange={(e) => setNewFollowUpChannel(e.target.value as any)}
                        className="h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-bold outline-none"
                      >
                        <option value="واتساب">عبر واتساب</option>
                        <option value="اتصال هاتفي">اتصال هاتفي</option>
                        <option value="زيارة بالمتجر">زيارة بالمتجر</option>
                        <option value="رسالة عرض">رسالة عرض</option>
                      </select>
                      <select
                        value={newFollowUpType}
                        onChange={(e) => setNewFollowUpType(e.target.value as any)}
                        className="h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-bold outline-none"
                      >
                        <option value="متابعة رضا وثبات">متابعة رضا وثبات العطر</option>
                        <option value="إرسال عرض خاص">إرسال عرض خاص</option>
                        <option value="تنسيق موعد">تنسيق موعد زيارة</option>
                        <option value="تذكير نقاط ولاء">تذكير نقاط ولاء</option>
                      </select>
                      <input
                        type="date"
                        value={newFollowUpNextDate}
                        onChange={(e) => setNewFollowUpNextDate(e.target.value)}
                        className="h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono outline-none"
                        title="تاريخ المتابعة القادم"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFollowUpSummary.trim()) return;
                          handleRecordFollowUp(activeCustomerDossier, {
                            channel: newFollowUpChannel,
                            actionType: newFollowUpType,
                            summary: newFollowUpSummary.trim(),
                            nextDate: newFollowUpNextDate || undefined,
                            newStatus: newFollowUpNextDate ? 'موعد زيارة' : 'نشط',
                          });
                          setNewFollowUpSummary('');
                        }}
                        className="h-9 px-3 rounded-xl bg-[#0071E3] text-white font-black cursor-pointer"
                      >
                        حفظ المتابعة
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newFollowUpSummary}
                      onChange={(e) => setNewFollowUpSummary(e.target.value)}
                      placeholder="اكتب تفاصيل الاتصال أو ملاحظة التنسيق مع العميل (مثال: أشاد بثبات عطر سوفاج وطلب تجهيز 50 مل الأسبوع القادم)..."
                      className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.08] outline-none"
                    />
                  </div>

                  {/* Follow-Up Chronological History */}
                  {activeCustomerDossier.followUpLogs.length > 0 && (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                      {activeCustomerDossier.followUpLogs.map(flog => (
                        <div
                          key={flog.id}
                          className="p-2.5 rounded-xl bg-white border border-black/[0.05] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-black text-[#0071E3] ml-1.5">[{flog.channel} · {flog.actionType}]</span>
                            <span className="text-[#1D1D1F] font-medium">{flog.summary}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#86868B] shrink-0">
                            {new Date(flog.date).toLocaleDateString('ar-EG')} · {flog.byUser}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 5: LINK PREVIOUS WALK-IN INVOICES TO THIS CUSTOMER   */}
              {/* ======================================================== */}
              {activeDossierTab === 'link_invoices' && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/70 text-xs text-[#1D1D1F]">
                    يمكنك ربط أي فاتورة سابقة مسجلة باسم (عميل نقدي / بدون اسم) بهذا العميل لتضاف تلقائياً إلى سجل معاملاته ومشترياته ونقاط ولائه.
                  </div>
                  {unlinkedSales.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#F5F5F7] text-center text-xs text-[#86868B]">
                      جميع الفواتير الحالية مربوطة بعملائها بالفعل.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                      {unlinkedSales.slice(0, 30).map(sale => (
                        <div
                          key={sale.id}
                          className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-mono font-black text-[#0071E3] ml-2">#{sale.id.slice(-6)}</span>
                            <span className="font-mono text-[11px] text-[#636366]">
                              {new Date(sale.date).toLocaleDateString('ar-EG')}
                            </span>
                            <div className="text-[11px] font-bold text-[#1D1D1F] mt-0.5">
                              {(sale.items || []).map(i => `${i.productName} (${i.bottleSize}مل)`).join(' + ')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-black text-sm">
                              {sale.totalPrice} {currency}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleLinkInvoiceToCustomer(sale, activeCustomerDossier)}
                              className="px-3 py-1.5 rounded-xl bg-[#0071E3] text-white text-[11px] font-black cursor-pointer"
                            >
                              ربط بالعميل الآن
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Notes if any */}
              {activeCustomerDossier.notes && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-950">
                  <strong className="block mb-0.5">📌 ملاحظات وتفضيلات خاصة مسجلة عن العميل:</strong>
                  <span>{activeCustomerDossier.notes}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT CUSTOMER VIP PROFILE & PREFERENCES   */}
      {/* ======================================================== */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md smart-modal-overlay animate-in fade-in duration-150">
          <div className="apple-glass smart-modal-window rounded-[28px] p-5 w-full max-w-2xl border border-black/[0.1] shadow-apple-lg space-y-3 bg-white/95 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1D1D1F]">بطاقة عميل حقيقي وتفضيلاته العطرية</h3>
                  <span className="text-[11px] text-[#86868B]">حفظ سحابي فوري مربوط بالكاشير ومحرك الولاء</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#86868B] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="space-y-3 text-xs">
              {/* Smart Guidance Banner on Importance of Name & WhatsApp Phone */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#25D366]/12 via-emerald-50/90 to-amber-50/80 border border-[#25D366]/35 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <MessageCircle size={14} />
                </div>
                <div className="text-[11px] text-[#1D1D1F] leading-relaxed">
                  <strong className="font-black block text-[#075E54]">
                    💡 تنبيه ذكي: أهمية اسم العميل ورقم الهاتف المحمول (واتساب)
                  </strong>
                  <span>
                    إدخال <strong>الاسم الكريم</strong> و<strong>رقم هاتف محمول مُفعل عليه واتساب</strong> يضمن إرسال الفواتير والعروض المخصصة وتنبيهات توفر العطور وحفظ نقاط الولاء تلقائياً.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#1D1D1F]">اسم العميل الكريم:</label>
                    {!editingName.trim() && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-[#B25000] animate-pulse">
                        مطلوب للتركيز ✍️
                      </span>
                    )}
                  </div>
                  <input
                    ref={modalNameInputRef}
                    type="text"
                    required
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="مثال: أ. أحمد محمود..."
                    className={`w-full h-10 px-3 rounded-xl font-bold outline-none transition-all duration-300 ${
                      !editingName.trim() && pulseCrmCustomerFields
                        ? 'bg-amber-50/90 border-2 border-[#FF9500] ring-4 ring-[#FF9500]/20 animate-pulse shadow-sm'
                        : 'bg-[#F5F5F7] border border-black/[0.1] focus:bg-white focus:border-[#0071E3]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#1D1D1F] flex items-center gap-1">
                      <MessageCircle size={12} className="text-[#25D366]" />
                      <span>رقم الهاتف المحمول (يفضل واتساب):</span>
                    </label>
                    {!editingPhone.trim() ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#25D366]/15 text-[#128C7E] animate-pulse">
                        مهم للتواصل وواتساب 💬
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-[#248A3D]">
                        ✓ جاهز لواتساب
                      </span>
                    )}
                  </div>
                  <input
                    ref={modalPhoneInputRef}
                    type="tel"
                    value={editingPhone}
                    onChange={(e) => setEditingPhone(e.target.value)}
                    placeholder="010XXXXXXXX (رقم واتساب للتواصل)"
                    className={`w-full h-10 px-3 rounded-xl font-mono font-bold outline-none transition-all duration-300 ${
                      !editingPhone.trim() && pulseCrmCustomerFields
                        ? 'bg-emerald-50/90 border-2 border-[#25D366] ring-4 ring-[#25D366]/20 animate-pulse shadow-sm'
                        : 'bg-[#F5F5F7] border border-black/[0.1] focus:bg-white focus:border-[#25D366]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">العائلة العطرية المفضلة:</label>
                  <select
                    value={editingStyle}
                    onChange={(e) => setEditingStyle(e.target.value as any)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-bold outline-none"
                  >
                    <option value="متنوع">متنوع (كافة العطور)</option>
                    <option value="صيفي">☀️ صيفي ومنعش</option>
                    <option value="شتوي">❄️ شتوي ودافئ</option>
                    <option value="مسك">💧 مسك فاخر</option>
                    <option value="عود">🪵 عود وشرقي</option>
                    <option value="فرنسي">✨ فرنسي كلاسيك</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">حجم الزجاجة المفضل:</label>
                  <select
                    value={editingPreferredSize}
                    onChange={(e) => setEditingPreferredSize(Number(e.target.value))}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-mono font-bold outline-none"
                  >
                    <option value={10}>10 مل</option>
                    <option value={20}>20 مل</option>
                    <option value={25}>25 مل</option>
                    <option value={30}>30 مل</option>
                    <option value={50}>50 مل (قياسي)</option>
                    <option value={100}>100 مل VIP</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">درجة التركيز المفضلة:</label>
                  <select
                    value={editingConcentration}
                    onChange={(e) => setEditingConcentration(e.target.value as any)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-bold outline-none"
                  >
                    <option value="هادئ">هادئ</option>
                    <option value="متوازن قياسي">متوازن قياسي</option>
                    <option value="عالي وفواح">عالي وفواح</option>
                    <option value="إكسترا VIP">إكسترا VIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">التغليف المفضل:</label>
                  <select
                    value={editingPackaging}
                    onChange={(e) => setEditingPackaging(e.target.value as any)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-bold outline-none"
                  >
                    <option value="علبة هدايا فاخرة">علبة هدايا فاخرة</option>
                    <option value="كيس فاخر">كيس فاخر</option>
                    <option value="كيس أساسي">كيس أساسي</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">موعد المتابعة القادم:</label>
                  <input
                    type="date"
                    value={editingNextFollowUp}
                    onChange={(e) => setEditingNextFollowUp(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">نقاط ولاء إضافية:</label>
                  <input
                    type="number"
                    min="0"
                    value={editingBonusPoints}
                    onChange={(e) => setEditingBonusPoints(Number(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-mono font-bold text-center outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1">ملاحظات وتفضيلات خاصة (تركيبات مفضلة، مناسبات، إلخ):</label>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="مثال: يفضل ثبات عالي في زجاجات 50 مل كبس مع لمسة مسك أبيض..."
                  className="w-full h-16 p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.1] focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 h-10 rounded-xl border border-black/[0.08] font-bold text-[#1D1D1F] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-2 h-10 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-black shadow-xs cursor-pointer"
                >
                  حفظ ملف العميل وتفضيلاته
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REDEEM OR ADD LOYALTY POINTS                    */}
      {/* ======================================================== */}
      {pointsActionModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md smart-modal-overlay animate-in fade-in duration-150">
          <div className="apple-glass smart-modal-window rounded-[28px] p-5 w-full max-w-md border border-black/[0.1] shadow-apple-lg space-y-3.5 bg-white/95 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div>
                <h3 className="text-sm font-black text-[#1D1D1F]">
                  {pointsActionModal.mode === 'redeem'
                    ? `استبدال مكافآت الولاء — ${pointsActionModal.customer.name}`
                    : `إضافة نقاط مكافأة — ${pointsActionModal.customer.name}`}
                </h3>
                <span className="text-[11px] text-[#248A3D] font-bold">
                  الرصيد المتاح حالياً: {pointsActionModal.customer.netAvailablePoints} نقطة
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPointsActionModal(null)}
                className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#86868B] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {pointsActionModal.mode === 'redeem' ? (
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-[#1D1D1F] block">اختر المكافأة لاستبدال النقاط فوراً:</span>
                {LOYALTY_REWARD_OPTIONS.map(reward => {
                  const canAfford = pointsActionModal.customer.netAvailablePoints >= reward.pointsCost;
                  return (
                    <button
                      key={reward.id}
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleExecutePointsAction(-reward.pointsCost, `استبدال مكافأة: ${reward.label}`)}
                      className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
                        canAfford
                          ? 'bg-white hover:border-[#0071E3] border-black/[0.08] cursor-pointer shadow-2xs'
                          : 'bg-black/[0.03] border-black/[0.04] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-black text-[#1D1D1F] block">{reward.label}</span>
                        <span className="text-[10px] text-[#86868B]">{reward.description}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-[#1D1D1F] text-amber-300 font-mono text-xs font-black shrink-0">
                        {reward.pointsCost} نقطة
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">عدد النقاط المراد إضافتها:</label>
                  <input
                    type="number"
                    min="5"
                    value={customPointsAmount}
                    onChange={(e) => setCustomPointsAmount(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-mono font-black text-base text-center outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">سبب منح النقاط:</label>
                  <input
                    type="text"
                    value={customPointsReason}
                    onChange={(e) => setCustomPointsReason(e.target.value)}
                    placeholder="مثال: هدية ولاء لعميل مميز..."
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.1] font-medium outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleExecutePointsAction(
                      customPointsAmount,
                      customPointsReason || 'نقاط تشجيعية إضافية'
                    )
                  }
                  className="w-full h-10 rounded-xl bg-[#34C759] hover:bg-[#2DB84D] text-white font-black shadow-xs cursor-pointer"
                >
                  تأكيد إضافة +{customPointsAmount} نقطة
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL 3: APPLE-STYLE "تجهيز عرض مخصص" (SMS / EMAIL / WA) */}
      {/* ======================================================== */}
      {preparedOfferModal && (
        <div className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-2xl smart-modal-overlay animate-in fade-in duration-200">
          <div className="smart-modal-window rounded-[32px] p-5 w-full max-w-3xl bg-white/95 backdrop-blur-3xl border border-black/[0.08] shadow-[0_28px_70px_rgba(0,0,0,0.26)] space-y-3 overflow-hidden">
            {/* Apple Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1D1D1F] to-[#3A3A3C] text-[#C49746] flex items-center justify-center shadow-sm shrink-0">
                  <Gift size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1D1D1F]">
                    تجهيز عرض مخصص ذكي — {preparedOfferModal.customer.name}
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    مُنشأ تلقائياً بناءً على التاريخ المالي ({preparedOfferModal.customer.totalSpent.toLocaleString('ar-EG')} {currency}) وتفضيل العطور ({preparedOfferModal.customer.olfactoryStyle})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreparedOfferModal(null)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B] cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Financial & Olfactory Context Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">تاريخ الإنفاق</span>
                <strong className="font-mono text-[#1D1D1F]">
                  {preparedOfferModal.customer.totalSpent.toLocaleString('ar-EG')} {currency} ({preparedOfferModal.customer.ordersCount} فاتورة)
                </strong>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">العطر المفضل بالعرض</span>
                <strong className="text-[#0071E3] truncate block">{preparedOfferModal.targetPerfume}</strong>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/70">
                <span className="text-[10px] text-[#9A6E23] block">السعر المخصص بالعرض</span>
                <strong className="font-mono text-[#9A6E23]">
                  {preparedOfferModal.finalPriceEgp} {currency} (خصم {preparedOfferModal.discountEgp} {currency})
                </strong>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/70">
                <span className="text-[10px] text-[#248A3D] block">كود العرض المخصص</span>
                <strong className="font-mono text-[#248A3D]">{preparedOfferModal.promoCode}</strong>
              </div>
            </div>

            {/* Customize Offer Parameters Inline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#636366] block mb-1">العطر المشمول بالعرض:</label>
                <input
                  type="text"
                  value={preparedOfferModal.targetPerfume}
                  onChange={(e) =>
                    handlePrepareCustomOffer(
                      preparedOfferModal.customer,
                      e.target.value,
                      preparedOfferModal.targetSizeMl,
                      preparedOfferModal.discountEgp
                    )
                  }
                  className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-bold outline-none focus:border-[#0071E3]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#636366] block mb-1">حجم العبوة:</label>
                <select
                  value={preparedOfferModal.targetSizeMl}
                  onChange={(e) =>
                    handlePrepareCustomOffer(
                      preparedOfferModal.customer,
                      preparedOfferModal.targetPerfume,
                      Number(e.target.value),
                      preparedOfferModal.discountEgp
                    )
                  }
                  className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono font-bold outline-none"
                >
                  {[100, 50, 30, 25, 20, 10].map(sz => (
                    <option key={sz} value={sz}>عبوة {sz} مل</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#636366] block mb-1">قيمة الخصم النقدي ({currency}):</label>
                <input
                  type="number"
                  min={0}
                  max={250}
                  value={preparedOfferModal.discountEgp}
                  onChange={(e) =>
                    handlePrepareCustomOffer(
                      preparedOfferModal.customer,
                      preparedOfferModal.targetPerfume,
                      preparedOfferModal.targetSizeMl,
                      Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                  className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono font-bold text-center outline-none focus:border-[#0071E3]"
                />
              </div>
            </div>

            {/* Channel Switcher: WhatsApp | SMS | Email */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
              {([
                { id: 'whatsapp', label: 'رسالة واتساب مفصلة', icon: MessageCircle },
                { id: 'sms', label: 'رسالة نصية قصيرة (SMS)', icon: MessageSquare },
                { id: 'email', label: 'بريد إلكتروني رسمي (Email)', icon: Mail },
              ] as const).map(ch => {
                const IconC = ch.icon;
                const active = preparedOfferModal.channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setPreparedOfferModal({ ...preparedOfferModal, channel: ch.id, copiedFlag: false })}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#1D1D1F] text-white shadow-xs'
                        : 'text-[#636366] hover:text-[#1D1D1F]'
                    }`}
                  >
                    <IconC size={14} className={active ? 'text-amber-300' : 'text-[#0071E3]'} />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Message Editor Area */}
            <div className="space-y-2.5 text-xs">
              {preparedOfferModal.channel === 'email' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-[#1D1D1F] block mb-1">البريد الإلكتروني للعميل (اختياري):</label>
                    <input
                      type="email"
                      value={preparedOfferModal.emailAddress}
                      onChange={(e) => setPreparedOfferModal({ ...preparedOfferModal, emailAddress: e.target.value })}
                      placeholder="customer@example.com"
                      className="w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-mono outline-none focus:bg-white focus:border-[#0071E3]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1D1D1F] block mb-1">عنوان البريد الإلكتروني المقترح:</label>
                    <input
                      type="text"
                      value={preparedOfferModal.emailSubject}
                      onChange={(e) => setPreparedOfferModal({ ...preparedOfferModal, emailSubject: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] font-bold outline-none focus:bg-white focus:border-[#0071E3]"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#1D1D1F]">
                    {preparedOfferModal.channel === 'email'
                      ? 'محتوى البريد الإلكتروني المخصص:'
                      : preparedOfferModal.channel === 'sms'
                      ? 'نص الرسالة النصية القصيرة (SMS):'
                      : 'نص رسالة الواتساب المخصصة:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy =
                        preparedOfferModal.channel === 'email'
                          ? `${preparedOfferModal.emailSubject}\n\n${preparedOfferModal.emailBody}`
                          : preparedOfferModal.channel === 'sms'
                          ? preparedOfferModal.smsBody
                          : preparedOfferModal.whatsappBody;
                      navigator.clipboard?.writeText(textToCopy);
                      setPreparedOfferModal({ ...preparedOfferModal, copiedFlag: true });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>{preparedOfferModal.copiedFlag ? '✓ تم نسخ النص' : 'نسخ النص'}</span>
                  </button>
                </div>
                <textarea
                  rows={preparedOfferModal.channel === 'sms' ? 3 : 5}
                  value={
                    preparedOfferModal.channel === 'email'
                      ? preparedOfferModal.emailBody
                      : preparedOfferModal.channel === 'sms'
                      ? preparedOfferModal.smsBody
                      : preparedOfferModal.whatsappBody
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (preparedOfferModal.channel === 'email') {
                      setPreparedOfferModal({ ...preparedOfferModal, emailBody: val });
                    } else if (preparedOfferModal.channel === 'sms') {
                      setPreparedOfferModal({ ...preparedOfferModal, smsBody: val });
                    } else {
                      setPreparedOfferModal({ ...preparedOfferModal, whatsappBody: val });
                    }
                  }}
                  className="w-full p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] text-xs leading-relaxed outline-none resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.06]">
              <button
                type="button"
                onClick={() => setPreparedOfferModal(null)}
                className="px-4 h-10 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F] hover:bg-black/[0.04] cursor-pointer"
              >
                إغلاق
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {preparedOfferModal.channel === 'sms' && preparedOfferModal.customer.phone && (
                  <a
                    href={`sms:${preparedOfferModal.customer.phone}?body=${encodeURIComponent(preparedOfferModal.smsBody)}`}
                    onClick={() => {
                      const newOffer: CustomerOfferRecord = {
                        id: `off-${Date.now()}`,
                        date: new Date().toISOString(),
                        title: `عرض SMS مخصص (${preparedOfferModal.promoCode})`,
                        perfumeName: preparedOfferModal.targetPerfume,
                        bottleSizeMl: preparedOfferModal.targetSizeMl,
                        originalPriceEgp: preparedOfferModal.standardPriceEgp,
                        discountAmountEgp: preparedOfferModal.discountEgp,
                        finalPriceEgp: preparedOfferModal.finalPriceEgp,
                        status: 'أُرسل عبر واتساب',
                        sentBy: currentUser?.displayName || 'الإدارة',
                      };
                      handleRecordFollowUp(preparedOfferModal.customer, {
                        channel: 'رسالة عرض',
                        actionType: 'إرسال عرض خاص',
                        summary: `إرسال عرض SMS مخصص لعطر (${preparedOfferModal.targetPerfume} - ${preparedOfferModal.targetSizeMl}مل) بخصم ${preparedOfferModal.discountEgp} ${currency}`,
                        newStatus: 'تم إرسال عرض',
                        offerRecord: newOffer,
                      });
                      setPreparedOfferModal(null);
                    }}
                    className="px-4 h-10 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>إرسال كرسالة نصية SMS وتوثيق العرض</span>
                  </a>
                )}

                {preparedOfferModal.channel === 'email' && (
                  <a
                    href={`mailto:${preparedOfferModal.emailAddress}?subject=${encodeURIComponent(preparedOfferModal.emailSubject)}&body=${encodeURIComponent(preparedOfferModal.emailBody)}`}
                    onClick={() => {
                      const newOffer: CustomerOfferRecord = {
                        id: `off-${Date.now()}`,
                        date: new Date().toISOString(),
                        title: `عرض بريد إلكتروني VIP (${preparedOfferModal.promoCode})`,
                        perfumeName: preparedOfferModal.targetPerfume,
                        bottleSizeMl: preparedOfferModal.targetSizeMl,
                        originalPriceEgp: preparedOfferModal.standardPriceEgp,
                        discountAmountEgp: preparedOfferModal.discountEgp,
                        finalPriceEgp: preparedOfferModal.finalPriceEgp,
                        status: 'مقترح',
                        sentBy: currentUser?.displayName || 'الإدارة',
                      };
                      handleRecordFollowUp(preparedOfferModal.customer, {
                        channel: 'رسالة عرض',
                        actionType: 'إرسال عرض خاص',
                        summary: `إرسال بريد إلكتروني مخصص لعطر (${preparedOfferModal.targetPerfume} - ${preparedOfferModal.targetSizeMl}مل) بخصم ${preparedOfferModal.discountEgp} ${currency}`,
                        newStatus: 'تم إرسال عرض',
                        offerRecord: newOffer,
                      });
                      setPreparedOfferModal(null);
                    }}
                    className="px-4 h-10 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>فتح تطبيق البريد وإرسال العرض</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const newOffer: CustomerOfferRecord = {
                      id: `off-${Date.now()}`,
                      date: new Date().toISOString(),
                      title: `عرض مخصص (${preparedOfferModal.promoCode})`,
                      perfumeName: preparedOfferModal.targetPerfume,
                      bottleSizeMl: preparedOfferModal.targetSizeMl,
                      originalPriceEgp: preparedOfferModal.standardPriceEgp,
                      discountAmountEgp: preparedOfferModal.discountEgp,
                      finalPriceEgp: preparedOfferModal.finalPriceEgp,
                      status: 'أُرسل عبر واتساب',
                      sentBy: currentUser?.displayName || 'الإدارة',
                    };
                    handleRecordFollowUp(preparedOfferModal.customer, {
                      channel: 'واتساب',
                      actionType: 'إرسال عرض خاص',
                      summary: `إرسال عرض مخصص (${preparedOfferModal.targetPerfume} - ${preparedOfferModal.targetSizeMl}مل) بسعر ${preparedOfferModal.finalPriceEgp} ${currency} (خصم ${preparedOfferModal.discountEgp} ${currency})`,
                      newStatus: 'تم إرسال عرض',
                      whatsappMessageToOpen:
                        preparedOfferModal.channel === 'sms'
                          ? preparedOfferModal.smsBody
                          : preparedOfferModal.whatsappBody,
                      offerRecord: newOffer,
                    });
                    setPreparedOfferModal(null);
                  }}
                  className="px-4 h-10 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send size={14} />
                  <span>إرسال عبر واتساب وتوثيق في ملف العميل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersCRM;
