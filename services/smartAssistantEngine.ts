import { GoogleGenAI } from '@google/genai';
import {
  Product,
  Sale,
  Expense,
  StoreSettings,
  CustomCustomerRecord,
  CustomerRequest,
  StaffAttendanceRecord,
  AppUser,
  View,
  DEFAULT_BOTTLE_SIZES,
  APP_THEMES,
  TypingInteractionStyle,
  SavedMixFormula,
  FinancialVault,
  DailyClosure,
  BottleSize,
  isLiveProductionSale,
  isActualPaidOperationalExpense,
  calculateDailyAccountingSeparation,
} from '../types';
import { VERIFIED_SEED_FRAGRANCES } from './fragranceDbService';

export type SmartActionType =
  | 'navigate'
  | 'set_theme'
  | 'set_typing_style'
  | 'set_numerals'
  | 'add_expense'
  | 'update_stock'
  | 'delete_sale'
  | 'open_day_ops'
  | 'open_daily_report'
  | 'open_theme_studio'
  | 'prompt'
  | 'copy_text';

export interface SmartChatAction {
  id: string;
  label: string;
  type: SmartActionType;
  payload: string;
  actionData?: any;
  colorTone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export interface CopyableTextBlock {
  id: string;
  title: string;
  badge?: string;
  text: string;
}

export interface WebCitation {
  title: string;
  uri: string;
}

export interface SmartChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  badge?: string;
  sourceMode: 'offline_brain' | 'hybrid_ai' | 'web_search';
  copyableBlocks?: CopyableTextBlock[];
  coachTip?: string;
  executedActionSummary?: string;
  autoExecuteAction?: SmartChatAction;
  metrics?: Array<{
    label: string;
    value: string;
    tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  }>;
  actions?: SmartChatAction[];
  citations?: WebCitation[];
}

export interface ShathaMemoryFact {
  id: string;
  title: string;
  content: string;
  category: 'perfume_rule' | 'store_policy' | 'customer_note' | 'custom';
  createdAt: string;
}

export interface SmartAssistantContext {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  settings: StoreSettings;
  customCustomers: CustomCustomerRecord[];
  customerRequests: CustomerRequest[];
  attendanceRecords: StaffAttendanceRecord[];
  currentUser: AppUser | null;
  currentView: View;
  savedMixes?: SavedMixFormula[];
  vaults?: FinancialVault[];
  currentClosure?: DailyClosure | null;
  bottleSizes?: BottleSize[];
}

const SHATHA_MEMORY_STORAGE_KEY = 'lamsa_shatha_custom_memory_v3';

/**
 * Built-in Master Perfumery, Mixing & Retail Strategy Knowledge Base for «شَذَى»
 */
export const SHATHA_MASTER_KNOWLEDGE_BASE = {
  persona: {
    nameAr: 'شَذَى',
    title: 'خبير الطيب ومستشار الأعمال لمتجر لمسة عطر',
    meaning: 'الشَّذَى في العربية هو قوّة ذكاء الرائحة الطيبة وانتشار عبيرها الفاخر في الأرجاء.',
  },
  macerationAndFixationSecrets: [
    'سر الثبات الفائق (التعتيق): بعد خلط الزيت العطري مع الكحول الطبي الإيثيلي 96% والمثبت، يُنصح برج الزجاجة بهدوء وتركها في مكان مظلم وبارد لمدة 48 ساعة لتترابط الجزيئات العطرية.',
    'التركيز المثالي للبخاخات هو 30% إلى 33% (مثل 10 جم زيت في عبوة 30 مل، و15 جم زيت في عبوة 50 مل)؛ زيادة الزيت عن 40% قد تضعف الفوحان وتثقل البخاخ.',
    'أفضل نقاط النبض لرش العطر: خلف الأذنين، جانبي الرقبة، المعصمين بدون فرك (لأن الفرك يكسر النوتات الافتتاحية)، وعلى الملابس من مسافة 20 سم.',
  ],
  layeringCombinations: [
    {
      name: 'الخلطة الملكية الشرقية',
      mix: '70% بكرات روج 540 + 30% عود أبيض أو مسك الطهارة',
      character: 'فوحان كريستالي سكري مع عمق شرقي فخم يدوم أكثر من 48 ساعة على الملابس.',
    },
    {
      name: 'خلطة الهيبة الرسمية للرجال',
      mix: '75% بلو شانيل أو سوفاج + 25% كريد أفينتوس',
      character: 'انتعاش الأناناس والبرغموت المدخن مع أخشاب الأرز؛ مثالي للاجتماعات والمناسبات.',
    },
    {
      name: 'خلطة الأنوثة المخملية',
      mix: '70% جود جيرل أو لا في إيه بيل + 30% فانيليا أو مسك الرمان',
      character: 'جاذبية دافئة وناعمة تناسب السهرات والمناسبات الخاصة.',
    },
    {
      name: 'خلطة الشتاء الدافئ (جورماند)',
      mix: '80% خمرة لطافة + 20% عود كمبودي أو توم فورد عود وود',
      character: 'توازن ساحر بين القرفة والفانيليا الحلوة وفخامة العود الداكن.',
    },
  ],
  worldPerfumeEncyclopediaExtras: [
    {
      keywords: ['سوفاج', 'sauvage', 'ديور سوفاج'],
      name: 'ديور سوفاج (Dior Sauvage)',
      brand: 'Christian Dior',
      family: 'أروماتيك فوجير (Aromatic Fougère)',
      notes: 'الافتتاحية: برغموت كالابريا وفلفل؛ القلب: فلفل سيتشوان، لافندر، إبرة الراعي؛ القاعدة: أمبروكسان، خشب الأرز، لابدانوم.',
      advice: 'أكثر عطر رجالي طلباً في العالم؛ يناسب جميع الفصول وأوقات العمل والمناسبات.',
    },
    {
      keywords: ['بكرات', 'باكارات', 'baccarat', '540'],
      name: 'بكرات روج 540 (Baccarat Rouge 540)',
      brand: 'Maison Francis Kurkdjian',
      family: 'شرقي زهري عنبري (Amber Floral)',
      notes: 'الافتتاحية: الزعفران والياسمين؛ القلب: العنبر الرمادي والأمبروكسان؛ القاعدة: صمغ التنوب وخشب الأرز.',
      advice: 'عطر نيش أسطوري مشترك للجنسين، يتميز برائحة غزل البنات الفاخرة والزعفران الملكي.',
    },
    {
      keywords: ['افينتوس', 'أفينتوس', 'aventus', 'كريد'],
      name: 'كريد أفينتوس (Creed Aventus)',
      brand: 'Creed',
      family: 'تشيبر فاكهي مدخن (Chypre Fruity)',
      notes: 'الافتتاحية: الأناناس، البرغموت، الكشمش الأسود، التفاح؛ القلب: خشب البتولا، الباتشولي، الياسمين؛ القاعدة: المسك، طحلب البلوط، العنبر، الفانيليا.',
      advice: 'عطر الملوك والقيادة؛ فوحان استثنائي يجمع بين الانتعاش والوقار.',
    },
    {
      keywords: ['خمره', 'خمرة', 'khamrah', 'لطافه'],
      name: 'خمرة (Khamrah Lattafa)',
      brand: 'Lattafa',
      family: 'شرقي تابلي جورماند (Warm Spicy Gourmand)',
      notes: 'الافتتاحية: القرفة، جوزة الطيب، البرغموت؛ القلب: التمر، البرالين، مسك الروم؛ القاعدة: الفانيليا، التونكا، خشب العنبر، المر، البنزوين.',
      advice: 'ملك العطور الشتوية والمسائية؛ ثبات وفوحان يملأ المكان.',
    },
    {
      keywords: ['بلو شانيل', 'بلو دو شانيل', 'bleu de chanel'],
      name: 'بلو دو شانيل (Bleu de Chanel)',
      brand: 'Chanel',
      family: 'خشبي أروماتيك (Woody Aromatic)',
      notes: 'الجريب فروت، الليمون، النعناع، الفلفل الوردي، الزنجبيل، البخور، خشب الصندل، والأرز.',
      advice: 'الأناقة الفرنسية الكلاسيكية؛ جوكر رسمي ويومي لا يختلف عليه اثنان.',
    },
    {
      keywords: ['سترونجر', 'stronger with you', 'ارماني'],
      name: 'سترونجر وذ يو إنتنسلي (Stronger With You Intensely)',
      brand: 'Giorgio Armani',
      family: 'شرقي فوجير دافئ (Amber Fougère)',
      notes: 'الفلفل الوردي، العرعر، التوفي، القرفة، اللافندر، الفانيليا، الكستناء، والتونكا.',
      advice: 'عطر شتوي شبابي جذاب جداً ذو طابع سكري كراميل مدخن.',
    },
    {
      keywords: ['ليبر', 'libre', 'ايف سان لوران'],
      name: 'ليبر إيف سان لوران (YSL Libre)',
      brand: 'Yves Saint Laurent',
      family: 'زهري أروماتيك (Floral)',
      notes: 'اللافندر الفرنسي، اليوسفي، الكشمش الأسود، زهر البرتقال المغربي، الياسمين، فانيليا مدغشقر، المسك، والعنبر.',
      advice: 'أقوى عطر نسائي عصري يجمع بين الفخامة الرسمية والجاذبية.',
    },
    {
      keywords: ['جود جيرل', 'good girl', 'كارولينا هيريرا'],
      name: 'جود جيرل (Good Girl Carolina Herrera)',
      brand: 'Carolina Herrera',
      family: 'شرقي زهري (Amber Floral)',
      notes: 'اللوز، القهوة، البرغموت، مسك الروم، الياسمين، التونكا، الكاكاو، الفانيليا، وخشب الصندل.',
      advice: 'من أعلى العطور النسائية مبيعاً في المتجر، مناسب للسهرات والهدايا.',
    },
  ],
};

export function loadShathaMemoryFacts(): ShathaMemoryFact[] {
  try {
    const raw = localStorage.getItem(SHATHA_MEMORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    {
      id: 'mem-default-1',
      title: 'هوية متجر لمسة عطر',
      content: 'شعار المتجر: أثر يبقى وذكرى تدوم — متخصصون في أرقى الزيوت العطرية النقية والتركيبات الخاصة بالجرام.',
      category: 'store_policy',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem-default-2',
      title: 'قاعدة التركيب القياسية',
      content: 'تُعتمد الأعداد الصحيحة فقط للجرامات (10مل=5جم، 20مل=7جم، 30مل=10جم، 50مل=15جم، 100مل=30جم) مع 1 جم مثبت وكحول طبي 96%.',
      category: 'perfume_rule',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function saveShathaMemoryFact(
  fact: Omit<ShathaMemoryFact, 'id' | 'createdAt'>
): ShathaMemoryFact[] {
  const current = loadShathaMemoryFacts();
  const newFact: ShathaMemoryFact = {
    ...fact,
    id: `mem-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newFact, ...current].slice(0, 50);
  try {
    localStorage.setItem(SHATHA_MEMORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function deleteShathaMemoryFact(id: string): ShathaMemoryFact[] {
  const current = loadShathaMemoryFacts();
  const updated = current.filter((f) => f.id !== id);
  try {
    localStorage.setItem(SHATHA_MEMORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Normalizes Arabic text for fuzzy intent & perfume matching
 */
function normalizeArabic(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

/**
 * Extracts fenced ```...``` blocks from AI responses into isolated CopyableTextBlocks
 * so copyable messages are never mixed with commentary.
 */
function extractIsolatedCopyBlocksFromMarkdown(rawText: string): {
  cleanCommentary: string;
  extractedBlocks: CopyableTextBlock[];
} {
  const extractedBlocks: CopyableTextBlock[] = [];
  let blockIndex = 1;

  const cleanCommentary = rawText
    .replace(/```(?:[a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, inner) => {
      const trimmedInner = (inner || '').trim();
      if (trimmedInner) {
        extractedBlocks.push({
          id: `extracted-block-${Date.now()}-${blockIndex}`,
          title:
            extractedBlocks.length === 0
              ? 'النص الجاهز للنسخ والمشاركة'
              : `نموذج نص إضافي (${blockIndex})`,
          badge: 'معزول وجاهز للنسخ 📋',
          text: trimmedInner,
        });
        blockIndex++;
      }
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanCommentary, extractedBlocks };
}

/**
 * Computes a complete live analytical snapshot of the store for both Offline & Cloud AI
 * Uses exact accounting separation & live fields from POS, Inventory, and Expenses
 */
export function computeStoreLiveIntelligence(ctx: SmartAssistantContext) {
  const { products, sales, expenses, settings, customCustomers, customerRequests, currentUser } =
    ctx;
  const currency = settings.currency || 'ج.م';

  const isOwner =
    !currentUser ||
    currentUser.role === 'OWNER' ||
    currentUser.username === 'mohamed' ||
    Boolean(currentUser.permissions?.canViewProfits) ||
    Boolean(currentUser.permissions?.canViewCostAndProfit);

  const bottleSizes =
    ctx.bottleSizes && ctx.bottleSizes.length > 0
      ? ctx.bottleSizes
      : settings.bottleSizes && settings.bottleSizes.length > 0
      ? settings.bottleSizes
      : DEFAULT_BOTTLE_SIZES;

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const activeSales = (sales || []).filter((s) => isLiveProductionSale(s));

  const todaySales = activeSales.filter((s) => {
    const rawDate = (s.date || s.timestamp || '').slice(0, 10);
    if (rawDate === todayStr) return true;
    const d = new Date(s.timestamp || s.date);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === todayStr;
  });

  const monthSales = activeSales.filter((s) => {
    const rawDate = (s.date || s.timestamp || '').slice(0, 7);
    if (rawDate === currentMonthPrefix) return true;
    const d = new Date(s.timestamp || s.date);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 7) === currentMonthPrefix;
  });

  const todayRevenue = todaySales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const todayCost = todaySales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const todayCommission = todaySales.reduce(
    (acc, s) => acc + (s.commissionAmount ?? s.totalCommission ?? Math.round((s.totalPrice || 0) * 0.05)),
    0
  );
  const todayBottles = todaySales.reduce(
    (acc, s) => acc + (s.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0),
    0
  );
  const todayGramsUsed = todaySales.reduce(
    (acc, s) =>
      acc + (s.items || []).reduce((sum, i) => sum + (i.essenceGrams || 0) * (i.quantity || 1), 0),
    0
  );

  const cashSalesToday = todaySales
    .filter((s) => !s.paymentMethod || s.paymentMethod === 'نقدي')
    .reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const cardSalesToday = todaySales
    .filter((s) => s.paymentMethod === 'بطاقة')
    .reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const walletSalesToday = todaySales
    .filter((s) => s.paymentMethod === 'محفظة إلكترونية' || s.paymentMethod === 'تحويل بنكي')
    .reduce((acc, s) => acc + (s.totalPrice || 0), 0);

  // Filter actual live operational expenses (excluding seeded 15,000 monthly budget rows & reversed expenses)
  const liveOperationalExpenses = (expenses || []).filter((e) => isActualPaidOperationalExpense(e));
  const todayExpensesList = liveOperationalExpenses.filter(
    (e) => (e.date || '').slice(0, 10) === todayStr
  );
  const monthExpensesList = liveOperationalExpenses.filter(
    (e) => (e.date || '').slice(0, 7) === currentMonthPrefix
  );

  const todayExpenses = todayExpensesList.reduce((acc, e) => acc + (e.amount || 0), 0);
  const monthExpenses = monthExpensesList.reduce((acc, e) => acc + (e.amount || 0), 0);

  // Group monthly operational expenses by category
  const expensesByCategoryMap = new Map<string, { category: string; total: number; count: number }>();
  monthExpensesList.forEach((e) => {
    const cat = e.category || 'مصاريف تشغيل';
    const prev = expensesByCategoryMap.get(cat) || { category: cat, total: 0, count: 0 };
    prev.total += e.amount || 0;
    prev.count += 1;
    expensesByCategoryMap.set(cat, prev);
  });
  const expensesByCategory = Array.from(expensesByCategoryMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const dailyAccounting = calculateDailyAccountingSeparation({
    netSales: todayRevenue,
    productCost: todayCost,
    commissions: todayCommission,
    plannedDailyAllocation: settings.dailyTargetProfit || 600,
    actualCashExpensesPaidToday: todayExpenses,
  });

  // Net contribution today = Sales - Raw Cost - Commissions
  const todayProfit = dailyAccounting.contribution;

  const monthRevenue = monthSales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const monthCost = monthSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const monthCommission = monthSales.reduce(
    (acc, s) => acc + (s.commissionAmount ?? s.totalCommission ?? Math.round((s.totalPrice || 0) * 0.05)),
    0
  );
  const monthProfit = monthRevenue - monthCost - monthCommission;

  const perfumeSalesMap = new Map<
    string,
    { name: string; bottles: number; revenue: number; gramsUsed: number }
  >();
  activeSales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const name = item.productName || 'عطر';
      const prev = perfumeSalesMap.get(name) || { name, bottles: 0, revenue: 0, gramsUsed: 0 };
      const qty = item.quantity || 1;
      prev.bottles += qty;
      prev.revenue += (item.sellingPrice || 0) * qty;
      prev.gramsUsed += (item.essenceGrams || 0) * qty;
      perfumeSalesMap.set(name, prev);
    });
  });

  const topSellingPerfumes = Array.from(perfumeSalesMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  const totalGramsInStore = products.reduce((acc, p) => acc + (p.stock_grams || 0), 0);
  const lowThreshold = settings.lowStockThresholdGrams || 150;
  const lowStockItems = products.filter((p) => p.stock_grams <= (p.min_threshold_grams ?? lowThreshold));
  const outOfStockItems = products.filter((p) => p.stock_grams <= 0);

  const todayNetCashInDrawer = Math.max(0, cashSalesToday - todayExpenses);
  const todayExpensesTotal = todayExpenses;
  const todayExpenseCount = todayExpensesList.length;

  return {
    isOwner,
    currency,
    bottleSizes,
    todayStr,
    currentMonthPrefix,
    activeSales,
    todaySales,
    monthSales,
    todayRevenue,
    todayCost,
    todayCommission,
    todayProfit,
    todayBottles,
    todayGramsUsed,
    cashSalesToday,
    cardSalesToday,
    walletSalesToday,
    todayNetCashInDrawer,
    todayExpensesTotal,
    todayExpenseCount,
    dailyAccounting,
    monthRevenue,
    monthCost,
    monthProfit,
    monthCommission,
    todayExpenses,
    monthExpenses,
    todayExpensesList,
    monthExpensesList,
    liveOperationalExpenses,
    expensesByCategory,
    topSellingPerfumes,
    totalGramsInStore,
    lowThreshold,
    lowStockItems,
    outOfStockItems,
    totalCustomers: customCustomers.length,
    pendingRequests: customerRequests.length,
  };
}

/**
 * 100% Offline Super-Agent Brain for «شَذَى»
 * Returns structured Gemini-style responses with isolated copyable text boxes.
 */
export function generateOfflineExpertResponse(
  rawQuery: string,
  ctx: SmartAssistantContext
): Omit<SmartChatMessage, 'id' | 'timestamp'> {
  const q = normalizeArabic(rawQuery);
  const { products, settings, customCustomers, customerRequests, currentUser } = ctx;
  const stats = computeStoreLiveIntelligence(ctx);
  const {
    isOwner,
    currency,
    bottleSizes,
    todaySales,
    todayRevenue,
    todayCommission,
    todayProfit,
    todayBottles,
    monthRevenue,
    monthProfit,
    monthCommission,
    monthSales,
    topSellingPerfumes,
    totalGramsInStore,
    lowThreshold,
    lowStockItems,
  } = stats;

  // --------------------------------------------------------
  // 0. TEACH / REMEMBER INTENT ("تذكر ان ..." / "احفظ معلومة ...")
  // --------------------------------------------------------
  if (q.startsWith('تذكر ان') || q.startsWith('احفظ ان') || q.startsWith('سجل في ذاكرتك')) {
    const cleanedFact = rawQuery
      .replace(/^(تذكر أن|تذكر ان|احفظ أن|احفظ ان|سجل في ذاكرتك)\s*:?\s*/i, '')
      .trim();
    if (cleanedFact.length > 3) {
      saveShathaMemoryFact({
        title: 'معلومة مخصصة من المستخدم',
        content: cleanedFact,
        category: 'custom',
      });
      return {
        role: 'assistant',
        badge: 'ذاكرة «شَذَى» الدائمة 🧠',
        sourceMode: 'offline_brain',
        content: `تم توثيق هذه القاعدة في ذاكرتي الدائمة بنجاح يا **${currentUser?.fullName || 'شريك النجاح'}**، وسأعتمد عليها في كافة تحليلاتي القادمة:`,
        copyableBlocks: [
          {
            id: `mem-saved-${Date.now()}`,
            title: 'المعلومة المحفوظة في ذاكرة شَذَى',
            badge: 'تم الحفظ تلقائياً ✓',
            text: cleanedFact,
          },
        ],
      };
    }
  }

  const memoryFacts = loadShathaMemoryFacts();
  const matchedFact = memoryFacts.find((f) => {
    const fNorm = normalizeArabic(f.title + ' ' + f.content);
    const words = q.split(/\s+/).filter((w) => w.length >= 4);
    return words.length >= 2 && words.every((w) => fNorm.includes(w));
  });

  // --------------------------------------------------------
  // 1. WHO ARE YOU / PERSONA ("من انت" / "اسمك" / "شذى")
  // --------------------------------------------------------
  if (q.includes('من انت') || q.includes('عرفني بنفسك') || q.includes('ما اسمك') || q === 'شذي') {
    return {
      role: 'assistant',
      badge: 'شَذَى — خبير الطيب والأعمال 👑',
      sourceMode: 'offline_brain',
      content: [
        `أنا **«شَذَى»** — خبير الطيب ومستشار الأعمال الذكي الخاص بمتجر **${settings.storeName}**. ✨`,
        ``,
        `• **معنى اسمي:** الشَّذَى في لغتنا العربية الأصيلة هو قوّة ذكاء الرائحة الطيبة وانتشار عبيرها الفاخر.`,
        `• **عند الاتصال بالإنترنت:** أبحث في الويب العالمي وموسوعات العطور العالمية وأجيبك عن أي سؤال عطري أو علمي أو تجاري في العالم.`,
        `• **بدون اتصال بالإنترنت:** أتغذى لحظياً على كل كبيرة وصغيرة في قاعدة بيانات متجرك (${products.length} عطر، ${totalGramsInStore.toLocaleString('ar-EG')} جم زيت، الفواتير، الخلطات، العملاء، والتارجت).`,
      ].join('\n'),
      metrics: [
        { label: 'الأصناف الحية', value: `${products.length} عطر`, tone: 'blue' },
        { label: 'مخزون الزيوت', value: `${totalGramsInStore} جم`, tone: 'purple' },
        { label: 'ذاكرة شَذَى', value: `${memoryFacts.length} قاعدة`, tone: 'emerald' },
        { label: 'مبيعات اليوم', value: `${todayRevenue} ${currency}`, tone: 'amber' },
      ],
      actions: [
        { id: 'ask-best', label: '🏆 أكثر العطور مبيعاً', type: 'prompt', payload: 'ما هي أكثر العطور مبيعاً في المتجر؟' },
        { id: 'ask-wa', label: '📲 نصوص رسائل واتساب جاهزة', type: 'prompt', payload: 'اكتب لي رسالة تسويق واتساب احترافية للعملاء' },
        { id: 'ask-sales', label: '📊 تحليل مبيعات اليوم والشهر', type: 'prompt', payload: 'حلل لي مبيعات وأداء اليوم والشهر' },
      ],
    };
  }

  // --------------------------------------------------------
  // 2. WHATSAPP MARKETING & SALES SCRIPTS (ISOLATED IN COPYABLE BOXES!)
  // --------------------------------------------------------
  if (
    q.includes('واتساب') ||
    q.includes('رساله') ||
    q.includes('اعلان') ||
    q.includes('تسويق') ||
    q.includes('بوست') ||
    q.includes('نص ترويجي') ||
    q.includes('عرض خاص')
  ) {
    const topPerfume = topSellingPerfumes[0]?.name || products[0]?.name || 'بكرات روج 540';
    const secondPerfume = topSellingPerfumes[1]?.name || products[1]?.name || 'بلو دو شانيل';
    const thirdPerfume = topSellingPerfumes[2]?.name || products[2]?.name || 'خمرة لطافة';
    const b30 = bottleSizes.find((b) => b.sizeMl === 30) || DEFAULT_BOTTLE_SIZES[2];
    const b50 = bottleSizes.find((b) => b.sizeMl === 50) || DEFAULT_BOTTLE_SIZES[1];
    const storePhone = settings.storePhone || '01123376728';

    const vipOfferScript = [
      `✨ *${settings.storeName} — ${settings.storeSlogan || 'أثر يبقى وذكرى تدوم'}* ✨`,
      ``,
      `نختار لك اليوم نخبة من أرقى زيوتنا العطرية النقية بتركيز فائق الثبات والفوحان:`,
      `👑 *${topPerfume}*`,
      `👑 *${secondPerfume}*`,
      `👑 *${thirdPerfume}*`,
      ``,
      `💎 *عروض الأحجام الأكثر طلباً:*`,
      `• عبوة 30 مل (تركيز إكستريت فواح): *${b30.normalPrice} ${currency}*`,
      `• عبوة 50 مل (الحجم الملكي الموفر): *${b50.normalPrice} ${currency}*`,
      `🎁 تضاف نقاط ولاء فورية لرصيدك مع كل فاتورة!`,
      ``,
      `📍 نسعد بتشريفكم في المتجر أو الطلب المباشر عبر واتساب: ${storePhone}`,
    ].join('\n');

    const loyaltyFollowUpScript = [
      `مرحباً بك من أسرة *${settings.storeName}* 🌸`,
      ``,
      `لأنك من عملائنا المميزين، يسعدنا إبلاغك بوصول دفعة جديدة من الزيوت العطرية الفرنسية والشرقية المعتقة بثبات يتجاوز 24 ساعة، وعلى رأسها *(${topPerfume})* و*(${secondPerfume})*.`,
      ``,
      `✨ يمكنك الاستفادة من رصيد نقاط الولاء الخاص بك للحصول على خصم فوري عند زيارتك القادمة.`,
      `للحجز أو الاستفسار: ${storePhone}`,
    ].join('\n');

    return {
      role: 'assistant',
      badge: 'استوديو «شَذَى» لصياغة الرسائل التسويقية 📲',
      sourceMode: 'offline_brain',
      content: `جهزتُ لك نموذجين احترافيين لرسائل واتساب تسويقية بناءً على أعلى العطور مبيعاً في **${settings.storeName}**. النصوص معزولة تماماً في الصناديق التالية لتنسخ النص الصافي بضغطة واحدة دون أي تعليقات إضافية:`,
      copyableBlocks: [
        {
          id: `wa-script-vip-${Date.now()}`,
          title: 'النموذج الأول: رسالة عرض عطور النخبة والأحجام',
          badge: 'نص صافي جاهز للنسخ 📋',
          text: vipOfferScript,
        },
        {
          id: `wa-script-loyalty-${Date.now() + 1}`,
          title: 'النموذج الثاني: رسالة تنشيط العملاء ونقاط الولاء',
          badge: 'نص صافي جاهز للنسخ 📋',
          text: loyaltyFollowUpScript,
        },
      ],
      coachTip: `عندما يطلب العميل عبوة 20 مل (120 ${currency})، اعرض عليه عبوة الـ 50 مل (${b50.normalPrice} ${currency}) ووضح له أنه يحصل على أكثر من ضعف الكمية بـ 15 جرام زيت صافي.`,
      actions: [
        { id: 'go-mkt', label: 'فتح استوديو التسويق الذكي', type: 'navigate', payload: View.MARKETING },
        { id: 'go-crm', label: 'فتح قائمة العملاء للإرسال', type: 'navigate', payload: View.CUSTOMERS_LOYALTY },
      ],
    };
  }

  // --------------------------------------------------------
  // 3. LAYERING, MACERATION & FIXATION SECRETS
  // --------------------------------------------------------
  if (
    q.includes('ثبات') ||
    q.includes('فوحان') ||
    q.includes('تعتيق') ||
    q.includes('مكس') ||
    q.includes('دمج') ||
    q.includes('طبقات') ||
    q.includes('خلطات مميزه') ||
    q.includes('خلطات ملكيه')
  ) {
    const mixesText = SHATHA_MASTER_KNOWLEDGE_BASE.layeringCombinations
      .map((m, i) => `${i + 1}. **${m.name}:** (${m.mix})\n   • *الطابع العطري:* ${m.character}`)
      .join('\n\n');

    return {
      role: 'assistant',
      badge: 'أسرار «شَذَى» للدمج العطري والثبات ✨',
      sourceMode: 'offline_brain',
      content: [
        `إليك أقوى خلطات الدمج (Layering) المعتمدة في **${settings.storeName}** لابتكار بصمة عطرية حصرية:`,
        ``,
        mixesText,
        ``,
        `🔬 **القواعد الذهبية لثبات يتجاوز 24 ساعة:**`,
        ...SHATHA_MASTER_KNOWLEDGE_BASE.macerationAndFixationSecrets.map((s) => `• ${s}`),
      ].join('\n'),
      coachTip:
        'اقترح على الزبون الباحث عن التميز تجربة دمج عطرين بنسب (70% قاعدة + 30% لمسة عليا) في عبوة 50 مل لتعزيز ولائه للمتجر.',
      actions: [
        { id: 'go-formulation', label: 'فتح محرك هندسة التركيبات', type: 'navigate', payload: View.FORMULATION_ENGINE },
        { id: 'go-pos', label: 'تجهيز خلطة في الكاشير', type: 'navigate', payload: View.POS },
      ],
    };
  }

  // --------------------------------------------------------
  // 4. SPECIFIC PERFUME SEARCH (LIVE INVENTORY + ENCYCLOPEDIA + WORLD KB)
  // --------------------------------------------------------
  const matchedProduct = products.find((p) => {
    const pNorm = normalizeArabic(p.name);
    return (
      pNorm.length >= 3 &&
      (q.includes(pNorm) || pNorm.split(' ').some((w) => w.length >= 4 && q.includes(w)))
    );
  });

  const matchedWorldExtra = SHATHA_MASTER_KNOWLEDGE_BASE.worldPerfumeEncyclopediaExtras.find((item) =>
    item.keywords.some((kw) => q.includes(normalizeArabic(kw)))
  );

  if (matchedProduct || matchedWorldExtra) {
    if (matchedProduct) {
      const encMatch = VERIFIED_SEED_FRAGRANCES.find(
        (e) =>
          normalizeArabic(e.name).includes(normalizeArabic(matchedProduct.name)) ||
          normalizeArabic(matchedProduct.name).includes(normalizeArabic(e.name))
      );

      const b30 = bottleSizes.find((b) => b.sizeMl === 30) || DEFAULT_BOTTLE_SIZES[2];
      const b50 = bottleSizes.find((b) => b.sizeMl === 50) || DEFAULT_BOTTLE_SIZES[1];
      const isSpecial = matchedProduct.type === 'عود' || matchedProduct.type === 'مسك';
      const price30 = isSpecial ? b30.specialPrice : b30.normalPrice;
      const price50 = isSpecial ? b50.specialPrice : b50.normalPrice;

      const bottles30Possible = Math.floor(matchedProduct.stock_grams / (b30.essenceGrams || 10));
      const bottles50Possible = Math.floor(matchedProduct.stock_grams / (b50.essenceGrams || 15));

      const salesHistory = topSellingPerfumes.find((s) => s.name === matchedProduct.name);

      const customerPitchCard = [
        `✨ عطر *${matchedProduct.name}* من *${settings.storeName}*`,
        `• الفئة: ${matchedProduct.type} (${matchedProduct.gender} - ${matchedProduct.season})`,
        `• عبوة 30 مل بتركيز عالٍ: ${price30} ${currency}`,
        `• عبوة 50 مل الموفرة: ${price50} ${currency}`,
      ].join('\n');

      return {
        role: 'assistant',
        badge: `بطاقة عطر حية من مستودع ${settings.storeName} 🌸`,
        sourceMode: 'offline_brain',
        content: [
          `إليك التحليل الكامل لعطر **${matchedProduct.name}** من قاعدة بيانات المتجر:`,
          ``,
          `• **الدار والمنشأ:** ${matchedProduct.brand || 'لمسة عطر'} (${matchedProduct.origin || 'فرنسي'})`,
          `• **التصنيف والموسم:** ${matchedProduct.type} • ${matchedProduct.gender} • ${matchedProduct.season}`,
          `• **الرصيد الفعلي بالجرام:** **${matchedProduct.stock_grams} جم** (${
            matchedProduct.stock_grams <= lowThreshold
              ? '⚠️ رصيد منخفض يحتاج إعادة طلب'
              : '✅ متوفر برصيد آمن'
          })`,
          `• **القدرة الإنتاجية الفورية:** يكفي لتحضير **${bottles30Possible} زجاجة 30 مل** أو **${bottles50Possible} زجاجة 50 مل**.`,
          `• **أسعار البيع المعتمدة:** عبوة 30 مل = **${price30} ${currency}** | عبوة 50 مل = **${price50} ${currency}**`,
          salesHistory
            ? `• **حركة المبيعات الفعلية:** تم بيع **${salesHistory.bottles} عبوة** بإجمالي **${salesHistory.revenue} ${currency}** (استهلاك ${salesHistory.gramsUsed} جم).`
            : '',
          encMatch
            ? `\n✨ **الهرم العطري:** ${encMatch.classification}\n  - *الافتتاحية:* ${encMatch.topNotes.join('، ')}\n  - *القلب:* ${encMatch.heartNotes.join('، ')}\n  - *القاعدة:* ${encMatch.baseNotes.join('، ')}`
            : matchedWorldExtra
            ? `\n✨ **الهرم العطري (${matchedWorldExtra.family}):** ${matchedWorldExtra.notes}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        copyableBlocks: [
          {
            id: `pitch-${matchedProduct.id}`,
            title: `بطاقة عرض سريعة لعطر ${matchedProduct.name} (جاهزة للنسخ للعميل)`,
            badge: 'نص معزول للنسخ 📋',
            text: customerPitchCard,
          },
        ],
        coachTip: matchedWorldExtra?.advice || encMatch?.salesPitch,
        metrics: [
          {
            label: 'الرصيد الحالي',
            value: `${matchedProduct.stock_grams} جم`,
            tone: matchedProduct.stock_grams <= lowThreshold ? 'rose' : 'emerald',
          },
          { label: 'يكفي لـ 50 مل', value: `${bottles50Possible} عبوة`, tone: 'purple' },
          { label: 'سعر 30 مل', value: `${price30} ${currency}`, tone: 'blue' },
          { label: 'سعر 50 مل', value: `${price50} ${currency}`, tone: 'amber' },
        ],
        actions: [
          { id: 'nav-pos', label: 'تجهيز وبيع في الكاشير', type: 'navigate', payload: View.POS },
          { id: 'nav-inv', label: 'فحص في المخزون', type: 'navigate', payload: View.INVENTORY },
        ],
      };
    }

    if (matchedWorldExtra) {
      return {
        role: 'assistant',
        badge: 'موسوعة «شَذَى» للعطور العالمية 🌍',
        sourceMode: 'offline_brain',
        content: [
          `إليك البطاقة العطرية التفصيلية لعطر **${matchedWorldExtra.name}** من دار **${matchedWorldExtra.brand}**:`,
          ``,
          `• **العائلة العطرية:** ${matchedWorldExtra.family}`,
          `• **النوتات والمكونات:** ${matchedWorldExtra.notes}`,
        ].join('\n'),
        coachTip: matchedWorldExtra.advice,
        actions: [
          { id: 'go-advisor', label: 'فتح مختبر وموسوعة العطور', type: 'navigate', payload: View.AI_ADVISOR },
        ],
      };
    }
  }

  // --------------------------------------------------------
  // 5. TOP SELLING PERFUMES ("الاكثر مبيعا" / "افضل المبيعات")
  // --------------------------------------------------------
  if (
    q.includes('اكثر مبيعا') ||
    q.includes('اعلي مبيعات') ||
    q.includes('الاكثر طلبا') ||
    q.includes('نجوم المبيعات')
  ) {
    const top5 = topSellingPerfumes.slice(0, 5);
    const listStr =
      top5.length > 0
        ? top5
            .map(
              (item, idx) =>
                `${idx + 1}. **${item.name}**: تم بيع **${item.bottles} عبوة** بإجمالي **${item.revenue.toLocaleString('ar-EG')} ${currency}** (استهلك ${item.gramsUsed} جم زيت)`
            )
            .join('\n')
        : 'لم يتم تسجيل فواتير مبيعات كافية بعد؛ ابدأ البيع من شاشة الكاشير لتظهر قائمة المتصدرين تلقائياً.';

    return {
      role: 'assistant',
      badge: 'ترتيب العطور الأكثر مبيعاً 🏆',
      sourceMode: 'offline_brain',
      content: [
        `بناءً على تحليل فواتير **${settings.storeName}** الفعلية، إليك قائمة العطور المتصدرة للمبيعات:`,
        ``,
        listStr,
      ].join('\n'),
      coachTip:
        'احرص دائماً على ألا يقل رصيد هذه العطور الخمسة عن 500 جرام لأنها العمود الفقري لسيولة المتجر اليومية.',
      actions: [
        { id: 'go-pos', label: 'فتح شاشة الكاشير', type: 'navigate', payload: View.POS },
        { id: 'go-inv', label: 'مراجعة أرصدة المتصدرين', type: 'navigate', payload: View.INVENTORY },
      ],
    };
  }

  // --------------------------------------------------------
  // 6. RECIPE, MIXING, GRAMS & BOTTLE SIZES
  // --------------------------------------------------------
  if (
    q.includes('خلط') ||
    q.includes('تركيب') ||
    q.includes('وصفه') ||
    q.includes('مقادير') ||
    q.includes('احجام') ||
    q.includes('زجاجه') ||
    q.includes('عبوه') ||
    q.includes('اسعار العبوات') ||
    /\b(10|15|20|25|30|50|100)\s*مل/.test(q)
  ) {
    const sizeMatch = q.match(/\b(10|15|20|25|30|50|100)\b/);
    if (sizeMatch) {
      const targetSize = Number(sizeMatch[1]);
      const spec = bottleSizes.find((b) => b.sizeMl === targetSize);
      if (spec) {
        const alcoholMl = Math.max(0, spec.sizeMl - spec.essenceGrams - (spec.isRollOn ? 0 : 1));
        const lines = [
          `إليك المعادلة الهندسية والتسعيرية المعتمدة لعبوة **${spec.sizeMl} مل (${spec.isRollOn ? 'رول أون زيت صافي' : 'بخاخ'})**:`,
          ``,
          `• **كمية الزيت العطري الخام:** ${spec.essenceGrams} جرام صافي (أعداد صحيحة بدون كسور)`,
          spec.isRollOn
            ? `• **طريقة التحضير:** عبوة رول أون زيت عطري نقي بدون كحول.`
            : `• **المثبت والكحول:** +1 جرام مثبت طبي + ~${alcoholMl} مل كحول إيثيلي طبي 96%.`,
          `• **سعر البيع (عطور عادية):** ${spec.normalPrice} ${currency}`,
          spec.coloredNormalPrice
            ? `• **سعر البيع بالعبوة الملونة الفاخرة:** ${spec.coloredNormalPrice} ${currency}`
            : '',
          `• **سعر البيع (مسك / عود / نيش):** ${spec.specialPrice} ${currency}`,
          `• **عمولة البائع الفورية (5%):** +${(spec.normalPrice * (settings.commissionRate || 0.05)).toFixed(1)} ${currency}`,
        ].filter(Boolean);

        if (isOwner) {
          lines.push(
            `• **التكلفة الرسمية للعبوة (خاص بـ د. محمد):** ${spec.officialCost || spec.bottleCost} ${currency} | **صافي المساهمة الربحية:** +${(
              spec.normalPrice -
              (spec.officialCost || 0) -
              spec.normalPrice * (settings.commissionRate || 0.05)
            ).toFixed(1)} ${currency}`
          );
        }

        return {
          role: 'assistant',
          badge: `معادلة وتسعير عبوة ${spec.sizeMl} مل 🧪`,
          sourceMode: 'offline_brain',
          content: lines.join('\n'),
          metrics: [
            { label: 'حجم العبوة', value: `${spec.sizeMl} مل`, tone: 'blue' },
            { label: 'جرامات الزيت', value: `${spec.essenceGrams} جم`, tone: 'purple' },
            { label: 'سعر العادي', value: `${spec.normalPrice} ${currency}`, tone: 'emerald' },
            { label: 'سعر العود/المسك', value: `${spec.specialPrice} ${currency}`, tone: 'amber' },
          ],
          actions: [
            { id: 'go-pos', label: 'الانتقال للكاشير للبيع الفوري', type: 'navigate', payload: View.POS },
          ],
        };
      }
    }

    const tableLines = bottleSizes
      .slice()
      .sort((a, b) => a.sizeMl - b.sizeMl)
      .map(
        (b) =>
          `• **عبوة ${b.sizeMl} مل (${b.isRollOn ? 'رول' : 'بخاخ'}):** ${b.essenceGrams} جم زيت | عادي: **${b.normalPrice} ${currency}**${
            b.coloredNormalPrice ? ` (ملون: ${b.coloredNormalPrice} ${currency})` : ''
          } | مسك/عود: **${b.specialPrice} ${currency}**`
      );

    const priceListCopyText = bottleSizes
      .slice()
      .sort((a, b) => a.sizeMl - b.sizeMl)
      .map(
        (b) =>
          `• عبوة ${b.sizeMl} مل: عطور فرنسية ${b.normalPrice} ${currency} | مسك وعود ونيش ${b.specialPrice} ${currency}`
      )
      .join('\n');

    return {
      role: 'assistant',
      badge: 'المرجع الهندسي للخلط والتسعير 🧴',
      sourceMode: 'offline_brain',
      content: [
        `إليك جدول الخلط القياسي وأسعار البيع المعتمدة في **${settings.storeName}**:`,
        ``,
        ...tableLines,
      ].join('\n'),
      copyableBlocks: [
        {
          id: `price-list-${Date.now()}`,
          title: 'قائمة أسعار الأحجام للعملاء (جاهزة للنسخ والإرسال)',
          badge: 'قائمة أسعار صافية 📋',
          text: `✨ *قائمة أحجام وأسعار ${settings.storeName}* ✨\n${priceListCopyText}`,
        },
      ],
      coachTip: `جميع البخاخات يضاف لها 1 جرام مثبت ثم تُستكمل بكحول طبي 96%، وتُحسب عمولة البيع بنسبة ${Math.round(
        (settings.commissionRate || 0.05) * 100
      )}% تلقائياً.`,
      actions: [
        { id: 'ask-50ml', label: 'تفاصيل عبوة 50 مل', type: 'prompt', payload: 'ما هي وصفة وتسعير عبوة 50 مل؟' },
        { id: 'ask-30ml', label: 'تفاصيل عبوة 30 مل', type: 'prompt', payload: 'ما هي وصفة وتسعير عبوة 30 مل؟' },
        { id: 'go-pos', label: 'فتح شاشة الكاشير', type: 'navigate', payload: View.POS },
      ],
    };
  }

  // --------------------------------------------------------
  // 6.B REAL EXECUTABLE ACTION INTENTS (تسجيل مصروف، تعديل مخزون، حذف فاتورة، تبديل أرقام، فتح أقسام)
  // --------------------------------------------------------

  // A) Record a Real Expense from Natural Language ("سجل مصروف 50 جنيه نظافة" / "اضف مصروف 120 تغليف")
  if (
    (q.includes('سجل مصروف') || q.includes('اضف مصروف') || q.includes('تسجيل مصروف') || q.includes('صرفنا')) &&
    /\d+/.test(q)
  ) {
    const numMatch = q.match(/(\d+(?:\.\d+)?)/);
    const amount = numMatch ? Number(numMatch[1]) : 0;
    if (amount > 0) {
      let category = 'مصاريف تشغيل';
      if (q.includes('تغليف') || q.includes('اكياس') || q.includes('شنط') || q.includes('زجاج') || q.includes('ستيكر')) {
        category = 'مستلزمات وتغليف';
      } else if (q.includes('كهرباء') || q.includes('مياه') || q.includes('نت') || q.includes('انترنت') || q.includes('فاتوره')) {
        category = 'فواتير ومرافق';
      } else if (q.includes('اعلان') || q.includes('تسويق') || q.includes('دعايه')) {
        category = 'تسويق وإعلان';
      } else if (q.includes('صيانه') || q.includes('نظافه') || q.includes('نثريات') || q.includes('ضيافه')) {
        category = 'صيانة ونثريات';
      }

      const cleanTitle =
        rawQuery
          .replace(/سجل مصروف|اضف مصروف|أضف مصروف|تسجيل مصروف|صرفنا|بقيمه|بقيمة|مبلغ|جنيه|ج\.م|\d+/gi, '')
          .trim() || `مصروف ${category}`;

      const payload = JSON.stringify({
        title: cleanTitle,
        amount,
        category,
      });

      const execAction: SmartChatAction = {
        id: `exec-exp-${Date.now()}`,
        label: `تم تسجيل مصروف: ${cleanTitle} (${amount} ${currency})`,
        type: 'add_expense',
        payload,
        colorTone: 'emerald',
      };

      return {
        role: 'assistant',
        badge: 'تنفيذ محاسبي فوري ⚡',
        sourceMode: 'offline_brain',
        executedActionSummary: `تم تسجيل مصروف فعلي بقيمة ${amount} ${currency} (${cleanTitle} — ${category})`,
        autoExecuteAction: execAction,
        content: [
          `✅ **تم تنفيذ أمرك فوراً وتسجيل المصروف في السجل المالي لمتجر ${settings.storeName}:**`,
          ``,
          `• **بيان المصروف:** ${cleanTitle}`,
          `• **المبلغ المسجل:** **${amount.toLocaleString('ar-EG')} ${currency}**`,
          `• **التصنيف المحاسبي:** ${category}`,
          `• **إجمالي مصروفات الدرج اليوم بعد الإضافة:** **${(stats.todayExpenses + amount).toLocaleString('ar-EG')} ${currency}**`,
        ].join('\n'),
        metrics: [
          { label: 'المبلغ المضاف', value: `${amount} ${currency}`, tone: 'rose' },
          { label: 'التصنيف', value: category, tone: 'purple' },
          { label: 'مصروفات اليوم', value: `${stats.todayExpenses + amount} ${currency}`, tone: 'amber' },
          { label: 'الحالة', value: 'تم الحفظ ✓', tone: 'emerald' },
        ],
        actions: [
          { id: 'go-exp-view', label: 'فتح سجل المصروفات للمراجعة', type: 'navigate', payload: View.EXPENSES, colorTone: 'rose' },
          { id: 'ask-exp-rep', label: 'عرض تقرير المصروفات الكامل', type: 'prompt', payload: 'أريد تقرير المصروفات', colorTone: 'blue' },
        ],
      };
    }
  }

  // B) Real Stock Addition / Update from Natural Language ("زود مخزون سوفاج 150 جرام" / "عدل مخزون بكرات الى 500 جرام")
  if (
    (q.includes('زود مخزون') ||
      q.includes('اضف مخزون') ||
      q.includes('عدل مخزون') ||
      q.includes('تحديث مخزون') ||
      (q.includes('زود') && q.includes('جرام'))) &&
    /\d+/.test(q)
  ) {
    const gramsMatch = q.match(/(\d+(?:\.\d+)?)/);
    const gramsVal = gramsMatch ? Math.round(Number(gramsMatch[1])) : 0;
    const targetProd = products.find((p) => {
      const pNorm = normalizeArabic(p.name);
      return pNorm.length >= 3 && (q.includes(pNorm) || pNorm.split(' ').some((w) => w.length >= 4 && q.includes(w)));
    });

    if (targetProd && gramsVal > 0) {
      const isAbsolute = q.includes('عدل مخزون') || q.includes('الي ') || q.includes('ليصبح');
      const newStock = isAbsolute ? gramsVal : targetProd.stock_grams + gramsVal;
      const payload = JSON.stringify({
        productId: targetProd.id,
        newStockGrams: newStock,
        deltaGrams: isAbsolute ? newStock - targetProd.stock_grams : gramsVal,
        productName: targetProd.name,
      });

      const execAction: SmartChatAction = {
        id: `exec-stk-${Date.now()}`,
        label: `تحديث مخزون ${targetProd.name} إلى ${newStock} جم`,
        type: 'update_stock',
        payload,
        colorTone: 'emerald',
      };

      return {
        role: 'assistant',
        badge: 'تحديث فعلي للمخزون بالجرام 📦',
        sourceMode: 'offline_brain',
        executedActionSummary: `تم تحديث رصيد (${targetProd.name}) من ${targetProd.stock_grams} جم إلى ${newStock} جم`,
        autoExecuteAction: execAction,
        content: [
          `✅ **تم تنفيذ تحديث المخزون فعلياً في قاعدة بيانات ${settings.storeName}:**`,
          ``,
          `• **الصنف العطري:** ${targetProd.name} (${targetProd.type})`,
          `• **الرصيد السابق:** ${targetProd.stock_grams} جرام`,
          `• **الرصيد الجديد المعتمد:** **${newStock} جرام** (${isAbsolute ? 'تعديل مباشر' : `+${gramsVal} جم مضافة`})`,
        ].join('\n'),
        metrics: [
          { label: 'العطر', value: targetProd.name, tone: 'purple' },
          { label: 'الرصيد السابق', value: `${targetProd.stock_grams} جم`, tone: 'amber' },
          { label: 'الرصيد الجديد', value: `${newStock} جم`, tone: 'emerald' },
          { label: 'الحالة', value: 'تم التحديث ✓', tone: 'blue' },
        ],
        actions: [
          { id: 'go-inv-now', label: 'فتح المخزون بالجرام', type: 'navigate', payload: View.INVENTORY, colorTone: 'emerald' },
        ],
      };
    }
  }

  // C) Quick System & Navigation Commands ("افتح الكاشير", "حول الارقام للعربي", "افتح الدرج", "صدر تقرير اليوم")
  if (
    q.startsWith('افتح ') ||
    q.startsWith('اذهب الي') ||
    q.startsWith('وديني ') ||
    q.includes('حول الارقام') ||
    q.includes('فعل ثيم اللافندر') ||
    q.includes('صدر تقرير اليوم')
  ) {
    if (q.includes('حول الارقام') || q.includes('ارقام عربي') || q.includes('ارقام انجليزي')) {
      const targetNum = q.includes('انجليزي') ? 'en' : 'ar';
      const execAction: SmartChatAction = {
        id: `exec-num-${Date.now()}`,
        label: targetNum === 'ar' ? 'تفعيل الأرقام العربية (٠١٢٣)' : 'تفعيل الأرقام الإنجليزية (0123)',
        type: 'set_numerals',
        payload: targetNum,
        colorTone: 'purple',
      };
      return {
        role: 'assistant',
        badge: 'تنفيذ فوري للإعدادات ⚡',
        sourceMode: 'offline_brain',
        executedActionSummary: execAction.label,
        autoExecuteAction: execAction,
        content: `✅ تم تحويل نظام الأرقام في كامل الموقع والأقسام فوراً إلى **${
          targetNum === 'ar' ? 'الأرقام العربية المشرقية (٠١٢٣٤٥٦٧٨٩)' : 'الأرقام الإنجليزية العالمية (0123456789)'
        }**.`,
      };
    }

    if (q.includes('ثيم اللافندر')) {
      const execAction: SmartChatAction = {
        id: `exec-lav-${Date.now()}`,
        label: 'تفعيل ثيم اللافندر البلوري 3D ✨',
        type: 'set_theme',
        payload: 'frosted_lavender_clay',
        colorTone: 'purple',
      };
      return {
        role: 'assistant',
        badge: 'تطبيق الثيم ثلاثي الأبعاد 🎨',
        sourceMode: 'offline_brain',
        executedActionSummary: 'تم تفعيل ثيم اللافندر البلوري ثلاثي الأبعاد (3D Clay)',
        autoExecuteAction: execAction,
        content: `✨ تم تفعيل **ثيم اللافندر البلوري ثلاثي الأبعاد (3D Frosted Lavender Clay)** على كامل النظام بنجاح!`,
      };
    }

    if (q.includes('درج') || q.includes('اغلاق اليوم') || q.includes('فتح اليوم')) {
      const execAction: SmartChatAction = {
        id: `exec-day-${Date.now()}`,
        label: 'فتح نافذة الدرج وعمليات اليوم',
        type: 'open_day_ops',
        payload: 'open',
        colorTone: 'emerald',
      };
      return {
        role: 'assistant',
        badge: 'تنفيذ أمر تشغيلي ⚡',
        sourceMode: 'offline_brain',
        executedActionSummary: 'تم فتح نافذة إدارة الدرج وإغلاق/فتح اليوم',
        autoExecuteAction: execAction,
        content: `✅ قمتُ بفتح **نافذة إدارة الدرج وعمليات اليوم** لك الآن مباشرة.`,
      };
    }

    if (q.includes('تقرير اليوم') || q.includes('اتمته التقرير')) {
      const execAction: SmartChatAction = {
        id: `exec-rep-${Date.now()}`,
        label: 'فتح أتمتة وتصدير التقرير اليومي',
        type: 'open_daily_report',
        payload: 'open',
        colorTone: 'blue',
      };
      return {
        role: 'assistant',
        badge: 'تصدير التقرير اليومي 📄',
        sourceMode: 'offline_brain',
        executedActionSummary: 'تم فتح نافذة التقرير اليومي الشامل',
        autoExecuteAction: execAction,
        content: `✅ قمتُ بفتح **لوحة التقرير اليومي المالي والتشغيلي** لتصديره أو إرساله فوراً.`,
      };
    }

    if (q.includes('كاشير') || q.includes('شاشه البيع')) {
      const execAction: SmartChatAction = {
        id: `exec-pos-${Date.now()}`,
        label: 'فتح شاشة الكاشير والمبيعات',
        type: 'navigate',
        payload: View.POS,
        colorTone: 'emerald',
      };
      return {
        role: 'assistant',
        badge: 'انتقال فوري للكاشير 🛒',
        sourceMode: 'offline_brain',
        executedActionSummary: 'تم الانتقال إلى شاشة الكاشير والمبيعات السريعة',
        autoExecuteAction: execAction,
        content: `✅ تم فتح **شاشة الكاشير والمبيعات السريعة** لك الآن. جاهزون لإصدار الفواتير وتركيب الميكسات!`,
      };
    }
  }

  // --------------------------------------------------------
  // 6.C DEDICATED EXPENSES REPORT INTENT ("أريد تقرير المصروفات" / "تقرير المصروفات" / "كم صرفت اليوم؟" / "المصروفات")
  // --------------------------------------------------------
  if (
    q.includes('مصروف') ||
    q.includes('مصاريف') ||
    q.includes('تقرير المصروفات') ||
    q.includes('كم صرفت') ||
    q.includes('نفقات')
  ) {
    const todayExpItems =
      stats.todayExpensesList.length > 0
        ? stats.todayExpensesList
            .map(
              (e, idx) =>
                `${idx + 1}. **${e.title}** (${e.category}) — **${e.amount.toLocaleString('ar-EG')} ${currency}**`
            )
            .join('\n')
        : '• لم يتم تسجيل أي مصروفات نقدية خارجة من الدرج اليوم حتى الآن.';

    const recentMonthItems =
      stats.monthExpensesList.length > 0
        ? stats.monthExpensesList
            .slice(0, 8)
            .map(
              (e, idx) =>
                `${idx + 1}. **${e.title}** [${e.category}] — **${e.amount.toLocaleString('ar-EG')} ${currency}** (${(e.date || '').slice(0, 10)})`
            )
            .join('\n')
        : '• لا توجد مصروفات تشغيلية مسجلة خلال هذا الشهر حتى الآن.';

    const categoryBreakdown =
      stats.expensesByCategory.length > 0
        ? stats.expensesByCategory
            .map(
              (c) =>
                `• **${c.category}:** ${c.total.toLocaleString('ar-EG')} ${currency} (${c.count} حركة)`
            )
            .join('\n')
        : '• لا يوجد تفصيل فئات مسجل بعد.';

    const copyableExpenseReport = [
      `📋 *تقرير المصروفات والموازنة — ${settings.storeName}*`,
      `التاريخ: ${stats.todayStr}`,
      `----------------------------------------`,
      `• مصروفات الدرج النقدية اليوم: ${stats.todayExpenses.toLocaleString('ar-EG')} ${currency} (${stats.todayExpensesList.length} حركة)`,
      `• إجمالي المصروفات التشغيلية للشهر: ${stats.monthExpenses.toLocaleString('ar-EG')} ${currency} (${stats.monthExpensesList.length} حركة)`,
      `• الموازنة الثابتة المعتمدة للشهر: ${(settings.monthlyFixedBudget || 15000).toLocaleString('ar-EG')} ${currency} (مخصص تخطيطي 600 ${currency}/يوم)`,
      ...(stats.monthExpensesList.length > 0
        ? [
            `----------------------------------------`,
            `أحدث المصروفات المسجلة:`,
            ...stats.monthExpensesList
              .slice(0, 6)
              .map((e, i) => `${i + 1}. ${e.title} (${e.category}): ${e.amount} ${currency} [${(e.date || '').slice(0, 10)}]`),
          ]
        : []),
    ].join('\n');

    const shouldAutoNavigate = q.includes('افتح تقرير المصروفات') || q.includes('افتح المصروفات');
    const navAction: SmartChatAction = {
      id: `go-exp-${Date.now()}`,
      label: 'فتح قسم المصروفات والموازنة',
      type: 'navigate',
      payload: View.EXPENSES,
      colorTone: 'rose',
    };

    return {
      role: 'assistant',
      badge: 'تقرير المصروفات والموازنة اللحظي 💸',
      sourceMode: 'offline_brain',
      executedActionSummary: shouldAutoNavigate ? 'تم فتح شاشة المصروفات والموازنة' : undefined,
      autoExecuteAction: shouldAutoNavigate ? navAction : undefined,
      content: [
        `إليك **تقرير المصروفات التفصيلي الحي** من السجلات الفعلية لمتجر **${settings.storeName}**:`,
        ``,
        `📌 **أولاً: مصروفات اليوم النقدية (${stats.todayStr}):**`,
        `• **إجمالي المنصرف اليوم من الدرج:** **${stats.todayExpenses.toLocaleString('ar-EG')} ${currency}** (${stats.todayExpensesList.length} حركة)`,
        todayExpItems,
        ``,
        `📌 **ثانياً: مصروفات الشهر الحالي (${stats.currentMonthPrefix}):**`,
        `• **إجمالي المصروفات التشغيلية المدفوعة هذا الشهر:** **${stats.monthExpenses.toLocaleString('ar-EG')} ${currency}** (${stats.monthExpensesList.length} حركة)`,
        `• **توزيع المصروفات حسب الفئة:**`,
        categoryBreakdown,
        ``,
        `📌 **ثالثاً: أحدث الحركات المسجلة بالشهر:**`,
        recentMonthItems,
        ``,
        `💡 **ملاحظة محاسبية (فصل المصروف اليومي عن الموازنة):** الموازنة الشهرية الثابتة (**${(settings.monthlyFixedBudget || 15000).toLocaleString('ar-EG')} ${currency}** / **600 ${currency} يومياً** للإيجار والرواتب والفواتير) مفصولة محاسبياً ولا تُخصم كسحب نقدي يومي من الدرج إلا عند الصرف الفعلي.`,
        `✨ *لتسجيل مصروف جديد فوراً من هنا، اكتب لي مثلاً: «سجل مصروف 50 جنيه نظافة».*`,
      ].join('\n'),
      copyableBlocks: [
        {
          id: `exp-rep-copy-${Date.now()}`,
          title: 'تقرير المصروفات المنظم (جاهز للنسخ والإرسال)',
          badge: 'تقرير مالي صافي 📋',
          text: copyableExpenseReport,
        },
      ],
      metrics: [
        { label: 'مصروفات اليوم', value: `${stats.todayExpenses.toLocaleString('ar-EG')} ${currency}`, tone: 'rose' },
        { label: 'حركات اليوم', value: `${stats.todayExpensesList.length} حركة`, tone: 'amber' },
        { label: 'مصروفات الشهر', value: `${stats.monthExpenses.toLocaleString('ar-EG')} ${currency}`, tone: 'purple' },
        { label: 'الموازنة الشهرية', value: `${(settings.monthlyFixedBudget || 15000).toLocaleString('ar-EG')} ${currency}`, tone: 'blue' },
      ],
      actions: [
        navAction,
        {
          id: 'quick-add-exp-sample',
          label: '➕ تجربة: سجل مصروف 50 ج نظافة',
          type: 'prompt',
          payload: 'سجل مصروف 50 جنيه نظافة ونثريات',
          colorTone: 'emerald',
        },
      ],
    };
  }

  // --------------------------------------------------------
  // 7. SALES, REVENUE, "كم بعت اليوم؟", TAREK COMMISSION & TARGET QUERIES
  // --------------------------------------------------------
  if (
    q.includes('كم بعت') ||
    q.includes('بعت كام') ||
    q.includes('بعنا كام') ||
    q.includes('مبيعات') ||
    q.includes('تارجت') ||
    q.includes('عموله') ||
    q.includes('طارق') ||
    q.includes('دخل') ||
    q.includes('ارباح') ||
    q.includes('خزائن') ||
    q.includes('موازنه') ||
    q.includes('اداء')
  ) {
    const breakEven = settings.dailyTargetProfit || 600;
    const todayInvoicesBreakdown =
      todaySales.length > 0
        ? todaySales
            .slice(0, 6)
            .map(
              (s, idx) =>
                `${idx + 1}. **فاتورة #${s.id.slice(-5)}** (${s.customerName || 'عميل نقدي'}) — **${s.totalPrice.toLocaleString('ar-EG')} ${currency}** [${s.paymentMethod || 'نقدي'}] • ${(s.items || [])
                  .map((it) => `${it.productName} (${it.bottleSize}مل)`)
                  .join(' + ')}`
            )
            .join('\n')
        : '• لم يتم إصدار فواتير بيع اليوم حتى هذه اللحظة.';

    const copyableSalesSummary = [
      `📊 *ملخص مبيعات اليوم — ${settings.storeName}*`,
      `التاريخ: ${stats.todayStr}`,
      `----------------------------------------`,
      `• عدد الفواتير: ${todaySales.length} فاتورة (${todayBottles} عبوة / ${stats.todayGramsUsed} جم زيت)`,
      `• إجمالي المبيعات: ${todayRevenue.toLocaleString('ar-EG')} ${currency}`,
      `  - نقدي بالدرج: ${stats.cashSalesToday.toLocaleString('ar-EG')} ${currency}`,
      `  - بطاقة بنكية: ${stats.cardSalesToday.toLocaleString('ar-EG')} ${currency}`,
      `  - محفظة إلكترونية: ${stats.walletSalesToday.toLocaleString('ar-EG')} ${currency}`,
      `• عمولة المبيعات (5%): ${todayCommission.toFixed(1)} ${currency}`,
      `• مصروفات الدرج اليوم: ${stats.todayExpenses.toLocaleString('ar-EG')} ${currency}`,
      `• صافي النقدية بالدرج: ${Math.max(0, stats.cashSalesToday - stats.todayExpenses).toLocaleString('ar-EG')} ${currency}`,
    ].join('\n');

    const lines = [
      `إليك القراءة اللحظية الدقيقة لمبيعات وأداء **${settings.storeName}** حتى هذه الثانية:`,
      ``,
      `📊 **أولاً: مبيعات وحركة اليوم (${stats.todayStr}):**`,
      `• **إجمالي مبيعات اليوم:** **${todayRevenue.toLocaleString('ar-EG')} ${currency}** عبر **${todaySales.length} فاتورة**`,
      `• **العبوات والزيوت المباعة اليوم:** **${todayBottles} عبوة عطرية** (استهلكت **${stats.todayGramsUsed} جرام** زيت نقي)`,
      `• **تفصيل طرق الدفع اليوم:**`,
      `  - 💵 نقدي (كاش بالدرج): **${stats.cashSalesToday.toLocaleString('ar-EG')} ${currency}**`,
      `  - 💳 بطاقة بنكية: **${stats.cardSalesToday.toLocaleString('ar-EG')} ${currency}**`,
      `  - 📱 محفظة إلكترونية / تحويل: **${stats.walletSalesToday.toLocaleString('ar-EG')} ${currency}**`,
      `• **عمولة المبيعات المستحقة اليوم:** **+${todayCommission.toFixed(1)} ${currency}**`,
      `• **مصروفات اليوم النقدية:** **${stats.todayExpenses.toLocaleString('ar-EG')} ${currency}**`,
      ``,
      `🧾 **أحدث فواتير اليوم:**`,
      todayInvoicesBreakdown,
      ``,
      `📅 **ثانياً: تراكمي الشهر الحالي (${stats.currentMonthPrefix}):**`,
      `• **إجمالي مبيعات الشهر:** **${monthRevenue.toLocaleString('ar-EG')} ${currency}** (${monthSales.length} فاتورة)`,
      `• **إجمالي عمولات الشهر:** **+${monthCommission.toFixed(1)} ${currency}**`,
    ];

    if (isOwner) {
      const remainingBreakEven = Math.max(0, breakEven - todayProfit);
      lines.push(
        ``,
        `🔒 **التحليل المالي التنفيذي (خاص بـ د. محمد - المالك):**`,
        `• **تكلفة الخامات والزجاجات اليوم:** ${stats.todayCost.toLocaleString('ar-EG')} ${currency} (تُحول لمحفظة استرداد المخزون)`,
        `• **صافي المساهمة الربحية اليوم (المبيعات - التكلفة - العمولة):** **+${todayProfit.toFixed(1)} ${currency}** (${
          remainingBreakEven === 0
            ? `✅ تم تغطية نقطة التعادل اليومية 600 ج.م بالكامل وفائض ربح حر +${(todayProfit - breakEven).toFixed(0)} ${currency}!`
            : `متبقي **${remainingBreakEven.toFixed(0)} ${currency}** لتغطية نقطة التعادل اليومية 600 ج.م`
        })`,
        `• **صافي المساهمة الربحية للشهر:** **+${monthProfit.toFixed(0)} ${currency}**`
      );
    }

    return {
      role: 'assistant',
      badge: isOwner ? 'تقرير المبيعات والمساهمة اللحظي 📈' : 'ملخص المبيعات والعمولات الحي ⚡',
      sourceMode: 'offline_brain',
      content: lines.join('\n'),
      copyableBlocks: [
        {
          id: `sales-today-copy-${Date.now()}`,
          title: 'ملخص مبيعات اليوم (جاهز للنسخ والمشاركة)',
          badge: 'تقرير مبيعات صافي 📋',
          text: copyableSalesSummary,
        },
      ],
      coachTip: `التركيز على عرض عبوات الـ 50 مل (230 ${currency}) والـ 30 مل (170 ${currency}) يضاعف قيمة السلة ويرفع المساهمة اليومية بسرعة.`,
      metrics: [
        { label: 'مبيعات اليوم', value: `${todayRevenue.toLocaleString('ar-EG')} ${currency}`, tone: 'blue' },
        { label: 'فواتير / عبوات', value: `${todaySales.length} فاتورة (${todayBottles} عبوة)`, tone: 'purple' },
        { label: 'عمولة اليوم', value: `+${todayCommission.toFixed(1)} ${currency}`, tone: 'emerald' },
        ...(isOwner
          ? [{ label: 'صافي مساهمة اليوم', value: `+${todayProfit.toFixed(0)} ${currency}`, tone: 'amber' as const }]
          : [{ label: 'الزيوت المستهلكة', value: `${stats.todayGramsUsed} جم`, tone: 'amber' as const }]),
      ],
      actions: [
        { id: 'go-pos', label: '🛒 الذهاب للكاشير', type: 'navigate', payload: View.POS, colorTone: 'emerald' },
        { id: 'open-daily-rep', label: '📄 تصدير التقرير اليومي الكامل', type: 'open_daily_report', payload: 'open', colorTone: 'blue' },
        ...(isOwner
          ? [{ id: 'go-reports', label: '📊 فتح سجل الفواتير والتقارير', type: 'navigate' as const, payload: View.REPORTS, colorTone: 'purple' as const }]
          : [{ id: 'go-ops', label: '🎯 فتح التارجت والحوافز', type: 'navigate' as const, payload: View.OPERATIONS_DAILY, colorTone: 'amber' as const }]),
      ],
    };
  }

  // --------------------------------------------------------
  // 8. INVENTORY, SHORTAGES & STOCK AUDIT
  // --------------------------------------------------------
  if (
    q.includes('مخزون') ||
    q.includes('جرد') ||
    q.includes('نواقص') ||
    q.includes('ناقص') ||
    q.includes('جرام') ||
    q.includes('اصناف')
  ) {
    const topLow = lowStockItems
      .slice(0, 6)
      .map((p) => `• **${p.name}** (${p.type}): متبقي **${p.stock_grams} جم** فقط`);
    const topAbundant = [...products]
      .sort((a, b) => b.stock_grams - a.stock_grams)
      .slice(0, 4)
      .map((p) => `${p.name} (${p.stock_grams} جم)`)
      .join('، ');

    const supplierOrderText =
      lowStockItems.length > 0
        ? [
            `📋 *طلبية نواقص زيوت عطرية — ${settings.storeName}*`,
            ...lowStockItems.slice(0, 10).map((p, idx) => `${idx + 1}. ${p.name} (${p.type}) — الرصيد الحالي: ${p.stock_grams} جم`),
          ].join('\n')
        : '';

    return {
      role: 'assistant',
      badge: 'تقرير مستودع الزيوت والنواقص بالجرام 📦',
      sourceMode: 'offline_brain',
      content: [
        `إليك الجرد الحي لمستودع الزيوت العطرية في **${settings.storeName}**:`,
        ``,
        `• **إجمالي الأصناف المسجلة:** ${products.length} صنف عطري`,
        `• **إجمالي وزن الزيوت بالمخزون:** ${totalGramsInStore.toLocaleString('ar-EG')} جرام (~${(
          totalGramsInStore / 1000
        ).toFixed(2)} كجم)`,
        `• **الأصناف تحت حد النقص (${lowThreshold} جم):** ${lowStockItems.length} صنف`,
        `• **طلبات العملاء لعطور غير متوفرة:** ${customerRequests.length} طلب مسجل`,
        topLow.length > 0
          ? `\n⚠️ **أهم الأصناف التي تحتاج إعادة طلب:**\n${topLow.join('\n')}`
          : `\n✅ **جميع الأصناف فوق حد الأمان حالياً!**`,
        `\n🏆 **أعلى الأصناف وفرة:** ${topAbundant}`,
      ].join('\n'),
      copyableBlocks: supplierOrderText
        ? [
            {
              id: `shortage-order-${Date.now()}`,
              title: 'قائمة طلبية النواقص للمورد (معزولة وجاهزة للنسخ)',
              badge: 'جاهز للإرسال للمورد 📋',
              text: supplierOrderText,
            },
          ]
        : undefined,
      metrics: [
        { label: 'عدد العطور', value: `${products.length} عطر`, tone: 'blue' },
        { label: 'إجمالي الجرامات', value: `${totalGramsInStore} جم`, tone: 'emerald' },
        {
          label: 'نواقص حرجة',
          value: `${lowStockItems.length} صنف`,
          tone: lowStockItems.length > 0 ? 'rose' : 'emerald',
        },
        { label: 'طلبات العملاء', value: `${customerRequests.length} طلب`, tone: 'amber' },
      ],
      actions: [
        { id: 'go-inv', label: 'فتح إدارة المخزون بالجرام', type: 'navigate', payload: View.INVENTORY },
        { id: 'go-intel', label: 'ذكاء المخزون والمشتريات', type: 'navigate', payload: View.INVENTORY_INTELLIGENCE },
      ],
    };
  }

  // --------------------------------------------------------
  // 9. CUSTOMERS, CRM & LOYALTY POINTS
  // --------------------------------------------------------
  if (q.includes('عميل') || q.includes('عملاء') || q.includes('ولاء') || q.includes('نقاط') || q.includes('خصم')) {
    return {
      role: 'assistant',
      badge: 'نظام العملاء ونقاط الولاء الذكي 👑',
      sourceMode: 'offline_brain',
      content: [
        `يعمل نظام العملاء والولاء (CRM) في **${settings.storeName}** آلياً مع كل فاتورة:`,
        ``,
        `• **العملاء المسجلون في قاعدة الولاء:** ${customCustomers.length} عميل`,
        `• **قاعدة احتساب النقاط:** نقطة لكل **${settings.loyaltyPointsPerSpendEgp || 10} ${currency}** إنفاق + **${
          settings.loyaltyPointsPerVisit || 5
        } نقاط** مكافأة زيارة.`,
        `• **قيمة النقطة عند الاستبدال:** كل نقطة تساوي **${settings.loyaltyCashPerPointEgp || 0.6} ${currency}** خصم نقدي فوري.`,
        `• **درع حماية الربح:** يحسب الكاشير آلياً أقصى خصم آمن مسموح به بحيث لا يمس تكلفة الخام أو عمولة البائع.`,
      ].join('\n'),
      actions: [
        { id: 'go-crm', label: 'فتح سجل العملاء والولاء (CRM)', type: 'navigate', payload: View.CUSTOMERS_LOYALTY },
        { id: 'go-pos', label: 'تطبيق نقاط ولاء في الكاشير', type: 'navigate', payload: View.POS },
      ],
    };
  }

  // --------------------------------------------------------
  // 10. PERFUME RECOMMENDATIONS BY SEASON / GENDER / TYPE
  // --------------------------------------------------------
  if (
    q.includes('رشح') ||
    q.includes('اقترح') ||
    q.includes('افضل عطر') ||
    q.includes('رجالي') ||
    q.includes('نسائي') ||
    q.includes('شتوي') ||
    q.includes('صيفي') ||
    q.includes('عود') ||
    q.includes('مسك')
  ) {
    let filtered = [...products].filter((p) => p.stock_grams > 20);
    if (q.includes('رجالي')) filtered = filtered.filter((p) => p.gender === 'رجالي' || p.gender === 'مشترك');
    if (q.includes('نسائي') || q.includes('حريمي')) filtered = filtered.filter((p) => p.gender === 'نسائي' || p.gender === 'مشترك');
    if (q.includes('شتوي') || q.includes('شتاء')) filtered = filtered.filter((p) => p.season === 'شتاء' || p.season === 'كل الفصول');
    if (q.includes('صيفي') || q.includes('صيف')) filtered = filtered.filter((p) => p.season === 'صيف' || p.season === 'كل الفصول');
    if (q.includes('عود')) filtered = filtered.filter((p) => p.type === 'عود');
    if (q.includes('مسك')) filtered = filtered.filter((p) => p.type === 'مسك');

    const picks = filtered.slice(0, 6);
    const listText = picks
      .map(
        (p, idx) =>
          `${idx + 1}. **${p.name}** (${p.brand}) — ${p.type} • ${p.gender} • متوفر **${p.stock_grams} جم**`
      )
      .join('\n');

    const shareableRecommendations = picks
      .map((p, idx) => `${idx + 1}. ✨ ${p.name} (${p.type} - ${p.gender})`)
      .join('\n');

    return {
      role: 'assistant',
      badge: 'ترشيحات «شَذَى» من المخزون الحي ✨',
      sourceMode: 'offline_brain',
      content: [
        `بناءً على طلبك والأرصدة المتاحة فعلياً في **${settings.storeName}**، يرشح لك **«شَذَى»** هذه النخبة:`,
        ``,
        listText || 'جميع العطور متاحة في شاشة الكاشير والمخزون.',
      ].join('\n'),
      copyableBlocks:
        picks.length > 0
          ? [
              {
                id: `rec-copy-${Date.now()}`,
                title: 'قائمة الترشيحات المختارة (جاهزة للنسخ وإرسالها للعميل)',
                badge: 'نص معزول للنسخ 📋',
                text: `🌸 *ترشيحات ${settings.storeName} المختارة لك:*\n${shareableRecommendations}`,
              },
            ]
          : undefined,
      coachTip: `اعرض على العميل تجربة العطر في عبوة 50 مل (230 ${currency}) أو 30 مل (170 ${currency}) مع إضافة 1 جم مثبت لضمان ثبات يدوم لأكثر من 24 ساعة.`,
      actions: [
        { id: 'go-pos', label: 'فتح شاشة الكاشير لتجهيزها', type: 'navigate', payload: View.POS },
        { id: 'go-analyzer', label: 'فتح مختبر وموسوعة العطور', type: 'navigate', payload: View.AI_ADVISOR },
      ],
    };
  }

  // --------------------------------------------------------
  // 11. THEMES & FOCUS CUSTOMIZATION
  // --------------------------------------------------------
  if (q.includes('ثيم') || q.includes('الوان') || q.includes('مظهر') || q.includes('دارك') || q.includes('ليلي')) {
    return {
      role: 'assistant',
      badge: 'استوديو الثيمات والجو العام 🎨',
      sourceMode: 'offline_brain',
      content: [
        `يضم النظام **${APP_THEMES.length} ثيماً احترافياً** مصممة بهوية العطور الفاخرة مع تركيز هادئ ومريح للعين وحفظ ذكي تلقائي:`,
        `• **الثيم النشط حالياً:** ${APP_THEMES.find((t) => t.id === settings.activeThemeId)?.nameAr || 'أبل سونوما'}`,
        `اضغط على أي زر بالأسفل لتغيير الجو اللوني فوراً:`,
      ].join('\n'),
      actions: [
        { id: 'act-theme-amber', label: 'تفعيل ثيم العنبر الملكي', type: 'set_theme', payload: 'royal_amber_oud' },
        { id: 'act-theme-dark', label: 'تفعيل الوضع الليلي (سيكويا)', type: 'set_theme', payload: 'sequoia_midnight_dark' },
        { id: 'act-theme-sonoma', label: 'تفعيل سونوما الافتراضي', type: 'set_theme', payload: 'apple_sonoma_light' },
      ],
    };
  }

  if (matchedFact) {
    return {
      role: 'assistant',
      badge: 'من ذاكرة «شَذَى» الخاصة 🧠',
      sourceMode: 'offline_brain',
      content: `وجدتُ في قاعدة معرفتي المحفوظة تحت عنوان (**${matchedFact.title}**):`,
      copyableBlocks: [
        {
          id: `fact-copy-${matchedFact.id}`,
          title: matchedFact.title,
          badge: 'من الذاكرة المحفوظة 📋',
          text: matchedFact.content,
        },
      ],
    };
  }

  // --------------------------------------------------------
  // 11.5. CONVERSATIONAL GREETINGS, INVOICES LOOKUP & REAL INVOICE DELETION
  // --------------------------------------------------------
  if (
    q.includes('فاتوره') ||
    q.includes('فواتير') ||
    q.includes('اخر بيع') ||
    q.includes('اخر فاتوره') ||
    q.includes('حذف الفواتير') ||
    q.includes('مسح الفواتير') ||
    q.includes('احذف اخر فاتوره') ||
    q.includes('امسح اخر فاتوره')
  ) {
    const activeSales = (ctx.sales || []).filter((s) => !s.isReversed);
    const reversedSales = (ctx.sales || []).filter((s) => s.isReversed);
    const latestSale = activeSales[0];

    // If user explicitly asks to delete the last invoice right now
    if ((q.includes('احذف اخر فاتوره') || q.includes('امسح اخر فاتوره') || q.includes('الغاء اخر فاتوره')) && latestSale) {
      const delAction: SmartChatAction = {
        id: `exec-del-sale-${latestSale.id}`,
        label: `🗑️ تأكيد حذف فاتورة #${latestSale.id.slice(-6)} (${latestSale.totalPrice} ${currency}) واسترجاع المخزون`,
        type: 'delete_sale',
        payload: latestSale.id,
        colorTone: 'rose',
      };
      return {
        role: 'assistant',
        badge: 'حذف فاتورة واسترداد المخزون 🧾',
        sourceMode: 'offline_brain',
        content: [
          `وجدتُ آخر فاتورة نشطة في السجل:`,
          `• **رقم الفاتورة:** #${latestSale.id.slice(-6)}`,
          `• **العميل:** ${latestSale.customerName || 'عميل نقدي'}`,
          `• **الإجمالي:** **${latestSale.totalPrice} ${currency}** (${latestSale.paymentMethod || 'نقدي'})`,
          `• **الأصناف:** ${(latestSale.items || []).map((it) => `${it.productName} (${it.bottleSize}مل - ${it.essenceGrams}جم)`).join(' + ')}`,
          ``,
          `⚡ **اضغط على الزر الأحمر بالأسفل لتنفيذ الحذف النهائي للفاتورة فوراً واسترجاع الزيوت للمخزون:**`,
        ].join('\n'),
        actions: [
          delAction,
          { id: 'go-rep-inv', label: 'فتح سجل الفواتير والتقارير', type: 'navigate', payload: View.REPORTS, colorTone: 'blue' },
        ],
      };
    }

    const recentFive = activeSales.slice(0, 5);
    const recentList =
      recentFive.length > 0
        ? recentFive
            .map(
              (s, i) =>
                `${i + 1}. **فاتورة #${s.id.slice(-6)}** — ${s.customerName || 'عميل نقدي'} • **${s.totalPrice} ${currency}** (${s.paymentMethod || 'نقدي'}) • ${(s.items || []).map((it) => `${it.productName} ${it.bottleSize}مل`).join(' + ')}`
            )
            .join('\n')
        : 'لا توجد فواتير نشطة مسجلة حالياً في السجل.';

    return {
      role: 'assistant',
      badge: 'إدارة الفواتير والسجل المالي 🧾',
      sourceMode: 'offline_brain',
      content: [
        `إليك حالة سجل الفواتير الحي في **${settings.storeName}**:`,
        `• **الفواتير النشطة حالياً:** ${activeSales.length} فاتورة`,
        reversedSales.length > 0 ? `• **الفواتير الملغاة بقيد عكسي:** ${reversedSales.length} فاتورة` : '',
        ``,
        `📋 **أحدث الفواتير المسجلة:**`,
        recentList,
        ``,
        `💡 **لحذف آخر فاتورة مباشرة من هنا:** اضغط على زر الحذف الفوري بالأسفل أو اكتب «احذف آخر فاتورة».`,
      ]
        .filter(Boolean)
        .join('\n'),
      actions: [
        ...(latestSale
          ? [
              {
                id: `del-latest-${latestSale.id}`,
                label: `🗑️ حذف آخر فاتورة (#${latestSale.id.slice(-5)} - ${latestSale.totalPrice} ${currency})`,
                type: 'delete_sale' as const,
                payload: latestSale.id,
                colorTone: 'rose' as const,
              },
            ]
          : []),
        { id: 'go-rep-inv', label: 'فتح سجل الفواتير والتقارير', type: 'navigate', payload: View.REPORTS, colorTone: 'blue' },
        { id: 'go-pos-new', label: 'إصدار فاتورة جديدة', type: 'navigate', payload: View.POS, colorTone: 'emerald' },
      ],
    };
  }

  if (
    q.includes('ازيك') ||
    q.includes('عامل ايه') ||
    q.includes('مرحبا') ||
    q.includes('اهلا') ||
    q.includes('السلام عليكم') ||
    q.includes('صباح') ||
    q.includes('مساء') ||
    q.includes('مين انت') ||
    q.includes('من انت') ||
    q.includes('انت مين')
  ) {
    return {
      role: 'assistant',
      badge: 'شَذَى — حوار ذكي مباشر 💬',
      sourceMode: 'offline_brain',
      content: [
        `أهلاً وسهلاً بك يا **${currentUser?.fullName || 'د. محمد'}**! وعليكم السلام ورحمة الله 🌸`,
        `أنا بخير وفي أتم الاستعداد لخدمتك في **${settings.storeName}**.`,
        ``,
        `اليوم سجلنا حتى الآن **${todaySales.length} فاتورة** بإجمالي **${todayRevenue.toLocaleString('ar-EG')} ${currency}**، ومصروفات اليوم **${stats.todayExpenses.toLocaleString('ar-EG')} ${currency}**، ولدينا **${products.length} صنف عطري** في المستودع بإجمالي **${totalGramsInStore.toLocaleString('ar-EG')} جرام**.`,
        `يمكنك أن تطلب مني أي تقرير لحظي («كم بعت اليوم؟»، «أريد تقرير المصروفات»، «نواقص المخزون») أو أمر تنفيذي مباشر («سجل مصروف 50 جنيه نظافة»، «زود مخزون سوفاج 100 جرام»، «حول الأرقام للعربي»)!`,
      ].join('\n'),
    };
  }

  // --------------------------------------------------------
  // 12. CONTEXT-AWARE CONVERSATIONAL FALLBACK (When Offline)
  // --------------------------------------------------------
  return {
    role: 'assistant',
    badge: 'شَذَى — المستشار الذكي ✨',
    sourceMode: 'offline_brain',
    content: [
      `سمعتك يا **${currentUser?.fullName || 'شريك النجاح'}** بخصوص: *"${rawQuery.trim()}"*`,
      ``,
      `إليك خلاصة الموقف اللحظي في **${settings.storeName}** لمساعدتك فوراً:`,
      `• **مبيعات اليوم:** ${todayRevenue.toLocaleString('ar-EG')} ${currency} (${todaySales.length} فاتورة / ${todayBottles} عبوة) — ${
        todayProfit >= (settings.dailyTargetProfit || 600)
          ? `تم تغطية نقطة التعادل اليومية بنجاح (+${todayProfit.toFixed(0)} ${currency} مساهمة)`
          : `متبقي **${Math.max(0, (settings.dailyTargetProfit || 600) - todayProfit).toFixed(0)} ${currency}** مساهمة للوصول لنقطة التعادل اليومية (600 ${currency})`
      }.`,
      `• **مصروفات اليوم النقدية:** ${stats.todayExpenses.toLocaleString('ar-EG')} ${currency} (إجمالي مصروفات الشهر: ${stats.monthExpenses.toLocaleString('ar-EG')} ${currency}).`,
      `• **المخزون الحالي:** ${products.length} عطر بإجمالي **${totalGramsInStore.toLocaleString('ar-EG')} جم** (${
        lowStockItems.length > 0 ? `منها ${lowStockItems.length} أصناف تحتاج تعزيز` : 'جميعها فوق حد الأمان'
      }).`,
      ``,
      `اكتب لي سؤالك أو أمرك المباشر (مثلاً: «كم بعت اليوم؟»، «أريد تقرير المصروفات»، «سجل مصروف 50 جنيه نظافة»، أو اسم أي عطر) وسأنفذه فوراً!`,
    ].join('\n'),
    actions: [
      { id: 'q-sales', label: '📊 كم بعت اليوم؟', type: 'prompt', payload: 'كم بعت اليوم؟', colorTone: 'blue' },
      { id: 'q-exp', label: '💸 أريد تقرير المصروفات', type: 'prompt', payload: 'أريد تقرير المصروفات', colorTone: 'rose' },
      { id: 'q-wa', label: '📲 نص رسالة تسويق واتساب', type: 'prompt', payload: 'اكتب لي رسالة تسويق واتساب للعملاء', colorTone: 'emerald' },
    ],
  };
}

/**
 * Helper to build smart contextual action buttons based on query & reply content
 * without polluting every conversational reply with generic template buttons.
 */
function buildContextualActions(rawQuery: string, replyText: string): SmartChatAction[] | undefined {
  const combined = normalizeArabic(`${rawQuery} ${replyText}`);
  const actions: SmartChatAction[] = [];

  if (combined.includes('مصروف') || combined.includes('مصاريف') || combined.includes('نفقات')) {
    actions.push({ id: `act-exp-${Date.now()}`, label: '💸 فتح سجل المصروفات والموازنة', type: 'navigate', payload: View.EXPENSES, colorTone: 'rose' });
  }
  if (combined.includes('فاتور') || combined.includes('فواتير') || combined.includes('تقارير') || combined.includes('مبيعات')) {
    actions.push({ id: `act-rep-${Date.now()}`, label: '📊 فتح الفواتير والتقارير', type: 'navigate', payload: View.REPORTS, colorTone: 'blue' });
  }
  if (combined.includes('كاشير') || combined.includes('ميكس') || combined.includes('عبوه') || combined.includes('زجاجه')) {
    actions.push({ id: `act-pos-${Date.now()}`, label: '🛒 فتح شاشة الكاشير والميكس', type: 'navigate', payload: View.POS, colorTone: 'emerald' });
  }
  if (combined.includes('مخزون') || combined.includes('نواقص') || combined.includes('جرد')) {
    actions.push({ id: `act-inv-${Date.now()}`, label: '📦 فتح المخزون بالجرام', type: 'navigate', payload: View.INVENTORY, colorTone: 'purple' });
  }
  if (combined.includes('عميل') || combined.includes('نقاط') || combined.includes('ولاء')) {
    actions.push({ id: `act-crm-${Date.now()}`, label: '👑 فتح سجل العملاء والولاء', type: 'navigate', payload: View.CUSTOMERS_LOYALTY, colorTone: 'amber' });
  }

  return actions.length > 0 ? actions.slice(0, 3) : undefined;
}

/**
 * Hybrid Super-Agent Query Handler for «شَذَى»:
 * - Immediately executes deterministic real actions (recording expenses, updating stock, switching numerals/themes, opening views)
 * - Uses Gemini Flash with full multi-turn conversation history and 100% accurate live store data
 * - Enables Google Search Grounding selectively when external/global info is needed (with fast direct fallback)
 * - Automatically extracts any ready-to-copy message/text inside ```...``` into isolated CopyableTextBlocks
 */
export async function askShathaSuperAgent(
  rawQuery: string,
  ctx: SmartAssistantContext,
  history: SmartChatMessage[] = [],
  forceOffline: boolean = false
): Promise<Omit<SmartChatMessage, 'id' | 'timestamp'>> {
  const qNorm = normalizeArabic(rawQuery);

  // 1. Check if the query is a direct executable action or high-precision local report intent
  const localIntentResponse = generateOfflineExpertResponse(rawQuery, ctx);
  if (
    localIntentResponse.autoExecuteAction ||
    qNorm.startsWith('تذكر ان') ||
    qNorm.startsWith('احفظ ان') ||
    qNorm.includes('احذف اخر فاتوره') ||
    qNorm.includes('امسح اخر فاتوره')
  ) {
    return localIntentResponse;
  }

  const isBrowserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (forceOffline || !isBrowserOnline) {
    return localIntentResponse;
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    '';

  if (!apiKey) {
    return localIntentResponse;
  }

  try {
    const stats = computeStoreLiveIntelligence(ctx);
    const memoryFacts = loadShathaMemoryFacts();

    // Include products matching the query + top 65 products so Gemini knows the exact stock
    const queryWords = qNorm.split(/\s+/).filter((w) => w.length >= 2);
    const matchedQueryProducts = ctx.products.filter((p) => {
      const pNorm = normalizeArabic(`${p.name} ${p.brand} ${p.type}`);
      return queryWords.some((w) => pNorm.includes(w));
    });
    const combinedProducts = [
      ...matchedQueryProducts,
      ...ctx.products.filter((p) => !matchedQueryProducts.some((m) => m.id === p.id)),
    ].slice(0, 75);

    const topProductsSummary = combinedProducts
      .map((p) => `${p.name} (${p.brand} - ${p.type}/${p.gender}/${p.season}: ${p.stock_grams}جم)`)
      .join(' | ');

    const bottleSummary = stats.bottleSizes
      .map((b) => `${b.sizeMl}مل=${b.essenceGrams}جم زيت (عادي:${b.normalPrice}ج، خاص/نيش:${b.specialPrice}ج)`)
      .join(' | ');

    // Recent invoices summary
    const activeSalesList = stats.activeSales;
    const reversedSalesCount = (ctx.sales || []).filter((s) => s.isReversed).length;
    const recentInvoicesSummary = activeSalesList
      .slice(0, 8)
      .map(
        (s) =>
          `#${s.id.slice(-6)} (${(s.date || '').slice(0, 10)} - ${s.customerName || 'نقدي'}: ${s.totalPrice}ج [${s.paymentMethod || 'نقدي'}] [${(s.items || [])
            .map((it) => `${it.productName} ${it.bottleSize}مل`)
            .join('+')}])`
      )
      .join(' ؛ ');

    // Live expenses summary for Gemini
    const todayExpensesSummary =
      stats.todayExpensesList.length > 0
        ? stats.todayExpensesList.map((e) => `${e.title} (${e.category}: ${e.amount}ج)`).join(' + ')
        : '0 ج.م (لا توجد مصروفات نقدية اليوم)';
    const monthExpensesSummary =
      stats.monthExpensesList.length > 0
        ? stats.monthExpensesList
            .slice(0, 10)
            .map((e) => `${e.title} [${e.category}: ${e.amount}ج في ${(e.date || '').slice(0, 10)}]`)
            .join(' ؛ ')
        : '0 ج.م';

    const savedMixesSummary = (ctx.savedMixes || [])
      .slice(0, 10)
      .map(
        (m) =>
          `${m.name} (${m.bottleSizeMl}مل: ${m.components.map((c) => `${c.productName} ${c.grams}جم`).join(' + ')})`
      )
      .join(' | ');

    const financialContext = stats.isOwner
      ? `المستخدم هو المالك (${ctx.currentUser?.fullName || 'د. محمد'}). لك صلاحية كاملة لذكر كافة التكاليف والأرباح والمصروفات: تكلفة جرام الزيت (عادي: ${ctx.settings.priceEssenceNormal || 10}ج، نيش: ${ctx.settings.priceEssenceNiche || 15}ج، عود: ${ctx.settings.priceEssenceSpecial || 20}ج)، تكلفة الزجاجة الفارغة 15ج (الملونة 50ج). تكلفة المبيعات اليوم: ${stats.todayCost}ج، صافي مساهمة اليوم: +${stats.todayProfit.toFixed(1)} ج.م (نقطة التعادل اليومية: ${ctx.settings.dailyTargetProfit || 600} ج.م، الهدف التطويري: 1000 ج.م)، صافي مساهمة الشهر: +${stats.monthProfit.toFixed(0)} ج.م، موازنة الشهر الثابتة: ${ctx.settings.monthlyFixedBudget || 15000} ج.م على 25 يوم عمل.`
      : `المستخدم الحالي هو (${ctx.currentUser?.fullName || 'طارق - مدير المبيعات'}). ممنوع ذكر التكاليف السرية أو صافي أرباح المالك، واذكر فقط أسعار البيع والمبيعات الإجمالية والمصروفات اليومية والعمولة التصاعدية (5% لأول 10 عبوات بخاخ في اليوم، ثم 7% من العبوة الـ 11 فصاعداً، والرول أون 0%).`;

    const systemInstruction = [
      `أنت «شَذَى»، المساعد الذكي الفائق، خبير العطور والخلطات ومستشار الأعمال والمبيعات في متجر "${ctx.settings.storeName}" (${ctx.settings.storeSlogan || 'أثر يبقى وذكرى تدوم'}).`,
      `شخصيتك وأسلوبك في الحوار:`,
      `- أنت ذكي جداً، متفاعل، مرن، وودود. تتحدث مع المستخدم كشريك نجاح حقيقي يفهم كلامه فوراً سواء تحدث معك بالعامية المصرية أو بالعربية الفصحى، وترد عليه بإجابة مباشرة وذكية ومفصلة تناسب سؤاله بالضبط.`,
      `- اعتمد بدقة 100% على البيانات اللحظية المرفقة بالأسفل عندما يسألك المستخدم عن "كم بعت اليوم؟" أو "أريد تقرير المصروفات" أو "نواقص المخزون" أو أي عطر أو فاتورة.`,
      `- قاعدة تنسيق النصوص والتقارير الجاهزة للنسخ: إذا طلب المستخدم تقرير مبيعات أو تقرير مصروفات أو رسالة واتساب، ضع نسخة نصية صافية ومنظمة داخل علامات كود ثلاثية (\`\`\`text ... \`\`\`) حتى يعزلها النظام في صندوق نسخ مستقل بضغطة زر.`,
      ``,
      `قواعد محرك الميكس والتشغيل في متجر لمسة عطر:`,
      `- أوزان الزيت القياسية للأحجام: 10 مل = 3 جم | 20 مل = 6 جم | 25 مل = 8 جم | 30 مل = 10 جم | 50 مل = 15 جم | 100 مل = 30 جم.`,
      `- النسب الافتراضية للميكس (بأعداد صحيحة فقط دون كسور): عطران (70% + 30%، مثل 30مل: 7+3 جم، 50مل: 11+4 جم، 100مل: 21+9 جم) | ثلاثة عطور (60% + 30% + 10%، مثل 30مل: 6+3+1 جم، 50مل: 9+5+1 جم، 100مل: 18+9+3 جم).`,
      ``,
      `البيانات اللحظية الحقيقية لمتجر "${ctx.settings.storeName}" في هذه الثانية (${stats.todayStr}):`,
      `- الصلاحيات والملف المالي: ${financialContext}`,
      `- مبيعات اليوم (${stats.todayStr}): الإجمالي = ${stats.todayRevenue} ج.م عبر ${stats.todaySales.length} فاتورة (${stats.todayBottles} عبوة مباعة، استهلكت ${stats.todayGramsUsed} جم زيت) | تفصيل الدفع اليوم: نقدي بالدرج=${stats.cashSalesToday}ج، بطاقة=${stats.cardSalesToday}ج، محفظة=${stats.walletSalesToday}ج | عمولة اليوم: +${stats.todayCommission.toFixed(1)} ج.م.`,
      `- مصروفات اليوم النقدية (${stats.todayStr}): الإجمالي = ${stats.todayExpenses} ج.م (${stats.todayExpensesList.length} حركة: ${todayExpensesSummary}).`,
      `- مصروفات الشهر التشغيلية (${stats.currentMonthPrefix}): الإجمالي = ${stats.monthExpenses} ج.م (${stats.monthExpensesList.length} حركة: ${monthExpensesSummary}) | توزيع الفئات: ${stats.expensesByCategory.map((c) => `${c.category}=${c.total}ج`).join('، ') || 'لا يوجد'}.`,
      `- مبيعات الشهر (${stats.currentMonthPrefix}): ${stats.monthRevenue} ج.م (${stats.monthSales.length} فاتورة) | عمولات الشهر: +${stats.monthCommission.toFixed(1)} ج.م.`,
      `- إجمالي الفواتير النشطة بالسجل: ${activeSalesList.length} فاتورة (والملغاة بقيد عكسي: ${reversedSalesCount}) | أحدث الفواتير: ${recentInvoicesSummary || 'لا توجد فواتير بعد'}.`,
      `- إجمالي الأصناف بالمستودع: ${ctx.products.length} عطر | إجمالي الجرامات: ${stats.totalGramsInStore} جم | النواقص تحت حد الأمان: ${stats.lowStockItems.map((i) => `${i.name}(${i.stock_grams}جم)`).join('، ') || 'لا يوجد'}.`,
      `- قائمة العطور وأرصدتها بالجرام: ${topProductsSummary}`,
      `- جدول الأحجام والأسعار: ${bottleSummary}`,
      `- أكثر العطور مبيعاً: ${stats.topSellingPerfumes.slice(0, 6).map((t) => `${t.name}(${t.bottles} عبوة - ${t.revenue}ج)`).join('، ') || 'في بداية التسجيل'}.`,
      savedMixesSummary ? `- مكتبة تركيبات الميكس المحفوظة: ${savedMixesSummary}` : '',
      memoryFacts.length > 0 ? `- ذاكرة شَذَى المحفوظة من المستخدم: ${memoryFacts.map((m) => `${m.title}: ${m.content}`).join(' ؛ ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const ai = new GoogleGenAI({ apiKey });

    // Build genuine multi-turn conversation contents so Gemini maintains full conversational context
    const validHistory = history
      .filter((m) => m.content && m.content.trim().length > 0 && m.id !== 'welcome-shatha')
      .slice(-12);

    const multiTurnContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const msg of validHistory) {
      const targetRole = msg.role === 'user' ? 'user' : 'model';
      const textContent =
        msg.copyableBlocks && msg.copyableBlocks.length > 0
          ? `${msg.content}\n\n${msg.copyableBlocks.map((b) => `\`\`\`text\n${b.text}\n\`\`\``).join('\n')}`
          : msg.content;

      if (multiTurnContents.length > 0 && multiTurnContents[multiTurnContents.length - 1].role === targetRole) {
        multiTurnContents[multiTurnContents.length - 1].parts[0].text += `\n${textContent}`;
      } else {
        multiTurnContents.push({
          role: targetRole,
          parts: [{ text: textContent }],
        });
      }
    }

    while (multiTurnContents.length > 0 && multiTurnContents[0].role !== 'user') {
      multiTurnContents.shift();
    }

    if (multiTurnContents.length > 0 && multiTurnContents[multiTurnContents.length - 1].role === 'user') {
      multiTurnContents[multiTurnContents.length - 1].parts[0].text += `\n${rawQuery}`;
    } else {
      multiTurnContents.push({
        role: 'user',
        parts: [{ text: rawQuery }],
      });
    }

    const needsWebSearch =
      qNorm.includes('ابحث في النت') ||
      qNorm.includes('ابحث في جوجل') ||
      qNorm.includes('بحث ويب') ||
      qNorm.includes('عالميا') ||
      qNorm.includes('في العالم') ||
      qNorm.includes('سعره الاصلي') ||
      qNorm.includes('سعر العطر الاصلي') ||
      qNorm.includes('اصدار سنه') ||
      qNorm.includes('فراجرانتيكا') ||
      qNorm.includes('fragrantica');

    let response: any = null;

    if (needsWebSearch) {
      try {
        response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: multiTurnContents,
            config: {
              systemInstruction,
              tools: [{ googleSearch: {} }],
              temperature: 0.65,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 15000)
          ),
        ]);
      } catch {
        response = null;
      }
    }

    if (!response) {
      try {
        response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: multiTurnContents,
            config: {
              systemInstruction,
              temperature: 0.65,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('DIRECT_TIMEOUT')), 16000)
          ),
        ]);
      } catch {
        response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: multiTurnContents,
            config: {
              systemInstruction,
              temperature: 0.65,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('FALLBACK_TIMEOUT')), 16000)
          ),
        ]);
      }
    }

    const rawText = response?.text?.trim();
    if (!rawText) {
      return localIntentResponse;
    }

    const sanitizedText = rawText.replace(/عبيق|عَبِيق|Abeeq/gi, 'شَذَى');
    const { cleanCommentary, extractedBlocks } = extractIsolatedCopyBlocksFromMarkdown(sanitizedText);

    const citations: WebCitation[] = [];
    const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach((chunk: any) => {
      if (chunk?.web?.uri && chunk?.web?.title) {
        if (!citations.some((c) => c.uri === chunk.web.uri)) {
          citations.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
          });
        }
      }
    });

    const contextualActions =
      buildContextualActions(rawQuery, cleanCommentary || sanitizedText) || localIntentResponse.actions;

    return {
      role: 'assistant',
      badge:
        citations.length > 0
          ? 'شَذَى المتصل + بحث الويب الحي 🌐'
          : 'شَذَى — الذكاء الحواري المتصل ✨',
      sourceMode: citations.length > 0 ? 'web_search' : 'hybrid_ai',
      content: cleanCommentary || sanitizedText,
      copyableBlocks:
        extractedBlocks.length > 0 ? extractedBlocks : localIntentResponse.copyableBlocks,
      metrics: localIntentResponse.metrics,
      actions: contextualActions,
      citations: citations.length > 0 ? citations.slice(0, 4) : undefined,
    };
  } catch (err) {
    console.error('Shatha Gemini error:', err);
    return localIntentResponse;
  }
}
