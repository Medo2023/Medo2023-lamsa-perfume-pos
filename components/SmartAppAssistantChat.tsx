import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  AppThemeId,
  TypingInteractionStyle,
  APP_THEMES,
} from '../types';
import {
  generateOfflineExpertResponse,
  askShathaSuperAgent,
  computeStoreLiveIntelligence,
  loadShathaMemoryFacts,
  saveShathaMemoryFact,
  deleteShathaMemoryFact,
  SmartChatMessage,
  SmartChatAction,
  ShathaMemoryFact,
} from '../services/smartAssistantEngine';
import {
  Send,
  Sparkles,
  X,
  WifiOff,
  Trash2,
  ChevronLeft,
  ChevronDown,
  Maximize2,
  Minimize2,
  Zap,
  Globe,
  Database,
  Plus,
  Copy,
  Check,
  BrainCircuit,
  BookOpen,
  ExternalLink,
  EyeOff,
  RotateCcw,
  Lightbulb,
  MessageSquareShare,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Play,
  CheckCircle2,
  SlidersHorizontal,
  PackagePlus,
  Receipt,
} from 'lucide-react';

interface SmartAppAssistantChatProps {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  settings: StoreSettings;
  customCustomers: CustomCustomerRecord[];
  customerRequests: CustomerRequest[];
  attendanceRecords: StaffAttendanceRecord[];
  currentUser: AppUser | null;
  currentView: View;
  onNavigate: (view: View) => void;
  onUpdateSettings: (updater: (prev: StoreSettings) => StoreSettings) => void;
  onAddExpense?: (expense: Expense) => void;
  onUpdatePerfumeStock?: (
    productId: string | number,
    deltaGrams: number,
    mode: 'add' | 'set' | 'deduct',
    reason?: string
  ) => void;
  onDeleteSale?: (
    saleId: string,
    restoreStock?: boolean,
    reason?: string,
    mode?: 'permanent' | 'reverse'
  ) => void;
  onOpenThemeStudio?: () => void;
  onNotify?: (title: string, subtitle?: string, badge?: string) => void;
}

const CHAT_STORAGE_KEY = 'lamsa_shatha_chat_v3';
const ORB_POS_STORAGE_KEY = 'lamsa_shatha_orb_pos_v2';

interface OrbPosition {
  x: number;
  y: number;
  isDockedEdge?: boolean;
  isMiniCircle?: boolean;
}

const QUICK_INTENT_CATEGORIES = [
  {
    id: 'sales_reports',
    label: '📊 المبيعات والتقارير',
    colorClass: 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700',
    softClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    items: [
      { label: '💰 كم بعت اليوم؟ (تقرير لحظي)', prompt: 'كم بعت اليوم؟' },
      { label: '🧾 أريد تقرير المصروفات التفصيلي', prompt: 'أريد تقرير المصروفات' },
      { label: '💵 كم صافي الكاش في الدرج الآن؟', prompt: 'كم صافي الكاش في الدرج الآن؟' },
      { label: '🏆 ما هي أكثر العطور مبيعاً؟', prompt: 'ما هي أكثر العطور مبيعاً في المتجر؟' },
      { label: '🎯 كم عمولة وتارجت طارق اليوم؟', prompt: 'كم عمولة وتارجت طارق اليوم؟' },
      { label: '📑 اعرض آخر الفواتير المصدرة', prompt: 'اعرض آخر الفواتير' },
    ],
  },
  {
    id: 'inventory_mixes',
    label: '🧪 المخزون والخلطات',
    colorClass: 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700',
    softClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    items: [
      { label: '⚠️ نواقص المخزون والأصناف الحرجة', prompt: 'ما هي نواقص المخزون الحالية؟' },
      { label: '📦 جرد إجمالي الجرامات ورأس المال', prompt: 'اعرض تقرير جرد المخزون' },
      { label: '👑 خلطات ملكية وأسرار الثبات', prompt: 'اقترح لي خلطات عطور ملكية وأسرار الثبات' },
      { label: '🧴 جدول الخلط وأسعار العبوات', prompt: 'اعرض جدول الخلط وأسعار العبوات' },
      { label: '📲 رسالة تسويق واتساب جاهزة للنسخ', prompt: 'اكتب لي رسالة تسويق واتساب احترافية للعملاء' },
    ],
  },
  {
    id: 'navigation_popup',
    label: '🧭 انتقال سريع للأقسام',
    colorClass: 'bg-purple-600 text-white border-purple-500 hover:bg-purple-700',
    softClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    items: [
      { label: '🛒 نقطة البيع والكاشير (POS)', view: View.POS },
      { label: '📈 لوحة القيادة التنفيذية', view: View.DASHBOARD },
      { label: '🧴 خزانة الزيوت والمخزون', view: View.INVENTORY },
      { label: '🧾 المصروفات والخزائن المالية', view: View.EXPENSES },
      { label: '📊 التقارير وسجل الفواتير', view: View.REPORTS },
      { label: '👑 العملاء ونقاط الولاء', view: View.CUSTOMERS_LOYALTY },
      { label: '✨ محرك التركيب والخلطات', view: View.FORMULATION_ENGINE },
      { label: '⚙️ الإعدادات وإدارة النظام', view: View.OPERATIONS_SYSTEM },
    ],
  },
];

export const SmartAppAssistantChat: React.FC<SmartAppAssistantChatProps> = ({
  products,
  sales,
  expenses,
  settings,
  customCustomers,
  customerRequests,
  attendanceRecords,
  currentUser,
  currentView,
  onNavigate,
  onUpdateSettings,
  onAddExpense,
  onUpdatePerfumeStock,
  onDeleteSale,
  onOpenThemeStudio,
  onNotify,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'actions' | 'knowledge'>('chat');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [forceOfflineMode, setForceOfflineMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<Record<string, boolean>>({});

  // Quick Real Action Form States (for 1-click real execution inside assistant)
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [quickExpenseDesc, setQuickExpenseDesc] = useState('');
  const [quickExpenseCategory, setQuickExpenseCategory] = useState('مصاريف تشغيل');
  const [quickStockProductId, setQuickStockProductId] = useState<string>('');
  const [quickStockGrams, setQuickStockGrams] = useState('');
  const [quickStockMode, setQuickStockMode] = useState<'add' | 'deduct' | 'set'>('add');

  // Draggable & Controllable Mini Orb State
  const [orbConfig, setOrbConfig] = useState<OrbPosition>(() => {
    try {
      const saved = localStorage.getItem(ORB_POS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return {
            x: parsed.x,
            y: parsed.y,
            isDockedEdge: Boolean(parsed.isDockedEdge),
            isMiniCircle: parsed.isMiniCircle !== false,
          };
        }
      }
    } catch {}
    return {
      x: 16,
      y: typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 68) : 520,
      isDockedEdge: false,
      isMiniCircle: true,
    };
  });

  const dragRef = useRef<{
    isDragging: boolean;
    hasMoved: boolean;
    startX: number;
    startY: number;
    initialOrbX: number;
    initialOrbY: number;
  }>({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initialOrbX: 16,
    initialOrbY: 500,
  });

  const [memoryFacts, setMemoryFacts] = useState<ShathaMemoryFact[]>(() => loadShathaMemoryFacts());
  const [newFactTitle, setNewFactTitle] = useState('');
  const [newFactContent, setNewFactContent] = useState('');

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(ORB_POS_STORAGE_KEY, JSON.stringify(orbConfig));
    } catch {}
  }, [orbConfig]);

  useEffect(() => {
    const handleResize = () => {
      setOrbConfig((prev) => ({
        ...prev,
        x: Math.min(Math.max(8, prev.x), Math.max(8, window.innerWidth - 52)),
        y: Math.min(Math.max(56, prev.y), Math.max(56, window.innerHeight - 52)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      isDragging: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      initialOrbX: orbConfig.x,
      initialOrbY: orbConfig.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.hasMoved = true;
    }
    if (!dragRef.current.hasMoved) return;

    const maxX = Math.max(8, window.innerWidth - 48);
    const maxY = Math.max(52, window.innerHeight - 48);
    const nextX = Math.min(Math.max(6, dragRef.current.initialOrbX + dx), maxX);
    const nextY = Math.min(Math.max(52, dragRef.current.initialOrbY + dy), maxY);
    const nearEdge = nextX <= 10 || nextX >= window.innerWidth - 54;

    setOrbConfig((prev) => ({
      ...prev,
      x: nextX,
      y: nextY,
      isDockedEdge: nearEdge ? prev.isDockedEdge : false,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (!dragRef.current.hasMoved) {
      setIsOpen((prev) => !prev);
    }
  };

  const resetOrbPosition = () => {
    setOrbConfig({
      x: 16,
      y: typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 68) : 520,
      isDockedEdge: false,
      isMiniCircle: true,
    });
  };

  const assistantCtx = useMemo(
    () => ({
      products,
      sales,
      expenses,
      settings,
      customCustomers,
      customerRequests,
      attendanceRecords,
      currentUser,
      currentView,
    }),
    [
      products,
      sales,
      expenses,
      settings,
      customCustomers,
      customerRequests,
      attendanceRecords,
      currentUser,
      currentView,
    ]
  );

  // Compute live intelligence whenever assistant is open OR when sales/expenses/products change
  const liveStats = useMemo(
    () => computeStoreLiveIntelligence(assistantCtx),
    [assistantCtx]
  );

  const [messages, setMessages] = useState<SmartChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const welcome = generateOfflineExpertResponse('مرحبا', {
      products,
      sales,
      expenses,
      settings,
      customCustomers,
      customerRequests,
      attendanceRecords,
      currentUser,
      currentView,
    });
    return [
      {
        ...welcome,
        id: 'welcome-msg',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-35)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab, isThinking]);

  // Execute a SmartChatAction (either clicked by user or auto-triggered on explicit command)
  const executeSystemAction = (action: SmartChatAction, isAuto = false) => {
    if (action.type === 'navigate') {
      onNavigate(action.payload as View);
      setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
      if (onNotify) {
        onNotify('انتقال ذكي عبر «شَذَى»', 'تم فتح القسم المطلوب مباشرة', 'تنقل فوري ✓');
      }
      return;
    }

    if (action.type === 'set_theme') {
      const themeId = action.payload as AppThemeId;
      const found = APP_THEMES.find((t) => t.id === themeId);
      onUpdateSettings((prev) => ({
        ...prev,
        activeThemeId: themeId,
        themeSurfaceStyle: themeId === 'frosted_lavender_clay' ? 'lavender_clay_3d' : prev.themeSurfaceStyle,
        themeCardElevation: themeId === 'frosted_lavender_clay' ? '3d_luxury' : prev.themeCardElevation,
        themeAutoTimeOfDay: false,
      }));
      setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
      if (onNotify) {
        onNotify(
          `تم تفعيل ثيم: ${found?.nameAr || 'اللافندر البلوري 3D'}`,
          found?.moodDescription || 'تم تطبيق المظهر الجديد فوراً',
          'تغيير ثيم ✓'
        );
      }
      return;
    }

    if (action.type === 'set_numerals') {
      const sys: 'ar' | 'en' =
        action.payload === 'arabic' || action.payload === 'ar' ? 'ar' : 'en';
      onUpdateSettings((prev) => ({
        ...prev,
        siteNumeralSystem: sys,
      }));
      setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
      if (onNotify) {
        onNotify(
          sys === 'ar' ? 'تم تحويل الأرقام إلى العربية (٠١٢٣٤٥٦٧٨٩)' : 'تم تحويل الأرقام إلى الإنجليزية (0123456789)',
          'تم التحديث الفوري في كامل الموقع والأقسام',
          'تحديث الأرقام ✓'
        );
      }
      return;
    }

    if (action.type === 'open_theme_studio') {
      if (onOpenThemeStudio) {
        onOpenThemeStudio();
        setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
      }
      return;
    }

    if (action.type === 'set_typing_style') {
      const styleId = action.payload as TypingInteractionStyle;
      onUpdateSettings((prev) => ({
        ...prev,
        themeTypingEffects: true,
        themeTypingStyle: styleId,
      }));
      setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
      if (onNotify) {
        onNotify('تم تحديث نمط التركيز', 'تم حفظ الإعداد تلقائياً عبر النظام', 'تركيز هادئ ✓');
      }
      return;
    }

    if (action.type === 'add_expense') {
      let data = action.actionData;
      if (!data && action.payload) {
        try {
          data = JSON.parse(action.payload);
        } catch {}
      }
      const amount = Number(data?.amount || 0);
      if (amount > 0 && onAddExpense) {
        const expTitle = data?.title || data?.description || 'مصروف تشغيلي عبر شذى';
        const newExpense: Expense = {
          id: `exp-ai-${Date.now()}`,
          title: expTitle,
          amount,
          category: (data?.category || 'مصاريف تشغيل') as any,
          date: new Date().toISOString().slice(0, 10),
          isRecurringMonthly: false,
          notes: `سُجّل عبر المساعد الذكي شَذَى (${currentUser?.displayName || 'الإدارة'})`,
        };
        onAddExpense(newExpense);
        setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
        if (onNotify) {
          onNotify(
            `تم تسجيل مصروف فعلي: ${amount} ${settings.currency || 'ج.م'}`,
            `${newExpense.title} (${newExpense.category}) — خُصم من درج الكاش`,
            'تنفيذ حقيقي ✓'
          );
        }
      }
      return;
    }

    if (action.type === 'update_stock') {
      let data = action.actionData;
      if (!data && action.payload) {
        try {
          data = JSON.parse(action.payload);
        } catch {}
      }
      if (data && data.productId !== undefined && onUpdatePerfumeStock) {
        const grams = Number(data.gramsDelta || 0);
        const mode = data.mode || 'add';
        if (grams > 0) {
          onUpdatePerfumeStock(
            data.productId,
            grams,
            mode,
            `تحديث عبر المساعد الذكي شَذَى (${data.productName || ''})`
          );
          setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
          if (onNotify) {
            onNotify(
              `تم تحديث مخزون «${data.productName || 'العطر'}» فعلياً`,
              mode === 'add'
                ? `تمت إضافة +${grams} جرام إلى الرصيد الفعلي`
                : mode === 'deduct'
                ? `تم خصم -${grams} جرام من الرصيد الفعلي`
                : `تم ضبط الرصيد الفعلي على ${grams} جرام`,
              'تحديث مخزون ✓'
            );
          }
        }
      }
      return;
    }

    if (action.type === 'delete_sale') {
      const saleId = action.actionData?.saleId || action.payload;
      if (saleId && onDeleteSale) {
        onDeleteSale(
          saleId,
          true,
          action.actionData?.reason || 'حذف عبر المساعد الذكي شَذَى مع استرجاع المخزون',
          'permanent'
        );
        setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
        if (onNotify) {
          onNotify(
            `تم حذف الفاتورة #${String(saleId).slice(-5)} نهائياً`,
            'تمت استعادة جرامات الزيوت العطرية إلى المخزون وتحديث الكاش',
            'حذف فعلي ✓'
          );
        }
      }
      return;
    }

    if (action.type === 'copy_text') {
      handleCopyText(action.payload, action.id);
      return;
    }

    if (action.type === 'prompt' && !isAuto) {
      handleSendMessage(action.payload);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt ?? inputText).trim();
    if (!text || isThinking) return;

    setOpenPopoverId(null);

    const nowTime = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: SmartChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: nowTime,
      sourceMode: 'offline_brain',
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!customPrompt) {
      setInputText('');
    }
    setActiveTab('chat');
    setIsThinking(true);

    try {
      const replyData = await askShathaSuperAgent(
        text,
        assistantCtx,
        nextHistory,
        forceOfflineMode
      );

      setMemoryFacts(loadShathaMemoryFacts());

      const assistantMsgId = `a-${Date.now() + 1}`;
      const assistantMsg: SmartChatMessage = {
        ...replyData,
        id: assistantMsgId,
        timestamp: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-execute safe direct commands when user explicitly commanded an action
      if (assistantMsg.actions && assistantMsg.actions.length > 0) {
        const primaryAction = assistantMsg.actions[0];
        const isExplicitImperative =
          /^(سجل مصروف|اضف مصروف|أضف مصروف|زود مخزون|اضف مخزون|اخصم مخزون|اضبط مخزون|حول الارقام|غير الارقام|ارقام عربي|ارقام انجليزي|فعل ثيم|افتح قسم|اذهب الى)/i.test(
            text.trim()
          );

        if (
          isExplicitImperative &&
          (primaryAction.type === 'add_expense' ||
            primaryAction.type === 'update_stock' ||
            primaryAction.type === 'set_numerals' ||
            primaryAction.type === 'set_theme' ||
            primaryAction.type === 'navigate')
        ) {
          executeSystemAction(primaryAction, true);
        }
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuickExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(quickExpenseAmount);
    if (!amount || amount <= 0 || !onAddExpense) return;
    const desc = quickExpenseDesc.trim() || 'مصروف تشغيلي سريع';
    const newExp: Expense = {
      id: `exp-quick-${Date.now()}`,
      title: desc,
      amount,
      category: (quickExpenseCategory || 'مصاريف تشغيل') as any,
      date: new Date().toISOString().slice(0, 10),
      isRecurringMonthly: false,
      notes: `سُجّل عبر المساعد الذكي شَذَى (${currentUser?.displayName || 'الإدارة'})`,
    };
    onAddExpense(newExp);
    setQuickExpenseAmount('');
    setQuickExpenseDesc('');
    if (onNotify) {
      onNotify(
        `تم تسجيل المصروف الفعلي (${amount} ${settings.currency || 'ج.م'})`,
        `${desc} — تم خصمه من الكاش وتحديث التقارير لحظياً`,
        'تنفيذ فوري ✓'
      );
    }
    const confirmMsg: SmartChatMessage = {
      id: `a-exp-${Date.now()}`,
      role: 'assistant',
      content: `✅ **تم تنفيذ الإجراء فعلياً في النظام:**\n• تم تسجيل مصروف بمبلغ **${amount} ${settings.currency || 'ج.م'}** تحت بيان **"${desc}"** (${quickExpenseCategory}).\n• تم تحديث صافي الكاش بالدرج وتقرير المصروفات اللحظي.`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      badge: 'تنفيذ عملية مالية ✓',
      sourceMode: 'offline_brain',
      actions: [{ id: `nav-exp-${Date.now()}`, label: 'فتح قسم المصروفات للمراجعة', type: 'navigate', payload: View.EXPENSES }],
    };
    setMessages((prev) => [...prev, confirmMsg]);
    setActiveTab('chat');
  };

  const handleQuickStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd =
      products.find((p) => String(p.id) === String(quickStockProductId)) || products[0];
    const grams = Number(quickStockGrams);
    if (!targetProd || !grams || grams <= 0 || !onUpdatePerfumeStock) return;

    onUpdatePerfumeStock(
      targetProd.id,
      grams,
      quickStockMode,
      `تعديل سريع من نافذة شذى للإجراءات الفورية`
    );
    setQuickStockGrams('');
    if (onNotify) {
      onNotify(
        `تم تحديث مخزون «${targetProd.name}»`,
        quickStockMode === 'add'
          ? `تمت إضافة +${grams} جرام بنجاح`
          : quickStockMode === 'deduct'
          ? `تم خصم -${grams} جرام بنجاح`
          : `تم ضبط الرصيد على ${grams} جرام`,
        'تحديث مخزون ✓'
      );
    }
    const confirmMsg: SmartChatMessage = {
      id: `a-stk-${Date.now()}`,
      role: 'assistant',
      content: `✅ **تم تحديث المخزون الفعلي بنجاح:**\n• الصنف: **${targetProd.name}**\n• العملية: **${
        quickStockMode === 'add' ? `إضافة +${grams} جرام` : quickStockMode === 'deduct' ? `خصم -${grams} جرام` : `ضبط الرصيد على ${grams} جرام`
      }**\n• الرصيد الجديد في الخزانة: **${
        quickStockMode === 'add'
          ? targetProd.stock_grams + grams
          : quickStockMode === 'deduct'
          ? Math.max(0, targetProd.stock_grams - grams)
          : grams
      } جرام**`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      badge: 'تحديث مخزون فعلي ✓',
      sourceMode: 'offline_brain',
      actions: [{ id: `nav-inv-${Date.now()}`, label: 'فتح خزانة الزيوت والمخزون', type: 'navigate', payload: View.INVENTORY }],
    };
    setMessages((prev) => [...prev, confirmMsg]);
    setActiveTab('chat');
  };

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2200);
      if (onNotify) {
        onNotify(
          'تم نسخ النص الصافي بنجاح',
          'النص جاهز للصق مباشرة في واتساب أو أي محادثة بدون أي تعليقات إضافية',
          'نسخ فوري ✓'
        );
      }
    } catch {}
  };

  const handleAddMemoryFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactTitle.trim() || !newFactContent.trim()) return;
    const updated = saveShathaMemoryFact({
      title: newFactTitle.trim(),
      content: newFactContent.trim(),
      category: 'custom',
    });
    setMemoryFacts(updated);
    setNewFactTitle('');
    setNewFactContent('');
    if (onNotify) {
      onNotify(
        'تمت تغذية ذاكرة «شَذَى»',
        'تم حفظ المعلومة في الذاكرة المحلية الدائمة للوكيل الذكي',
        'تعلم ذاتي 🧠'
      );
    }
  };

  const handleDeleteFact = (id: string) => {
    setMemoryFacts(deleteShathaMemoryFact(id));
  };

  const handleClearChat = () => {
    const welcome = generateOfflineExpertResponse('مرحبا', assistantCtx);
    setMessages([
      {
        ...welcome,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const effectiveOnline = isOnline && !forceOfflineMode;

  return (
    <>
      {/* Compact, Draggable, Non-Intrusive Floating Orb for «شَذَى» */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          left: `${orbConfig.isDockedEdge ? 4 : orbConfig.x}px`,
          top: `${orbConfig.y}px`,
          touchAction: 'none',
          background: 'linear-gradient(135deg, #1D1D1F 0%, #0071E3 55%, #C49746 100%)',
          boxShadow: '0 6px 20px -4px rgba(0, 113, 227, 0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
        className={`fixed z-[120] group select-none flex items-center gap-1.5 text-white transition-opacity duration-200 cursor-grab active:cursor-grabbing border border-white/30 ${
          orbConfig.isDockedEdge
            ? 'h-9 px-2 rounded-r-2xl rounded-l-md opacity-55 hover:opacity-100'
            : orbConfig.isMiniCircle
            ? 'h-10 px-2.5 rounded-full opacity-90 hover:opacity-100'
            : 'h-10 px-3 rounded-full opacity-95 hover:opacity-100'
        }`}
        title="«شَذَى» المساعد التنفيذي الذكي — اسحب الأيقونة لتحريكها أو اضغط للفتح"
      >
        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white/15 shrink-0">
          <Sparkles size={13} className="text-amber-300" />
          <span
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#1D1D1F] ${
              effectiveOnline ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
        </div>

        {!orbConfig.isDockedEdge && (
          <span className="text-[11px] font-black tracking-tight pr-0.5 whitespace-nowrap">
            شَذَى AI
          </span>
        )}
      </button>

      {/* Main Dynamic Context & Action-Oriented Window */}
      {isOpen && (
        <div
          dir="rtl"
          className={`fixed z-[135] transition-all duration-200 flex flex-col overflow-hidden rounded-[26px] border border-black/[0.12] shadow-2xl apple-glass bg-white/95 ${
            isExpanded
              ? 'inset-2 sm:inset-5 max-w-5xl mx-auto'
              : 'bottom-16 left-2 right-2 sm:right-auto sm:left-5 sm:w-[490px] h-[83dvh] max-h-[720px]'
          }`}
        >
          {/* Top Header */}
          <div
            className="px-4 py-3 text-white flex flex-col gap-2 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #141417 0%, #1E293B 52%, #0F172A 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center border border-white/25 shrink-0 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #0071E3 0%, #8E24AA 55%, #C49746 100%)',
                  }}
                >
                  <BrainCircuit size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black tracking-tight truncate">
                      «شَذَى» — المساعد التنفيذي الحي
                    </h3>
                    <button
                      type="button"
                      onClick={() => setForceOfflineMode((prev) => !prev)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
                        effectiveOnline
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                          : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                      }`}
                      title="اضغط للتبديل بين وضع الاتصال السحابي ووضع العمل المحلي"
                    >
                      {effectiveOnline ? <Globe size={9} /> : <WifiOff size={9} />}
                      <span>{effectiveOnline ? 'سياق لحظي مباشر' : 'محرك محلي فوري'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-white/75 truncate mt-0.5">
                    يقرأ المخزون والمبيعات والمصروفات لحظياً وينفذ الأوامر الفعلية فوراً
                  </p>
                </div>
              </div>

              {/* Window Control Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setOrbConfig((prev) => ({
                      ...prev,
                      x: 4,
                      isDockedEdge: !prev.isDockedEdge,
                    }));
                    setIsOpen(false);
                  }}
                  className="px-2 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[9px] font-bold text-white/90 transition-colors cursor-pointer"
                  title="طي الأيقونة على حافة الشاشة"
                >
                  <EyeOff size={11} />
                  <span className="hidden sm:inline">طي للحافة</span>
                </button>
                <button
                  type="button"
                  onClick={resetOrbPosition}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition-colors cursor-pointer"
                  title="إعادة ضبط مكان الأيقونة"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition-colors cursor-pointer"
                  title="بدء محادثة جديدة وتحديث الترحيب اللحظي"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 hidden sm:flex items-center justify-center text-white/90 transition-colors cursor-pointer"
                  title={isExpanded ? 'تصغير النافذة' : 'تكبير النافذة'}
                >
                  {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Live Store Pulse Bar (Clickable Real-Time Metrics) */}
            {liveStats && (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendMessage('كم بعت اليوم؟')}
                  className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-right transition-all cursor-pointer group"
                  title="اضغط لعرض تفصيل مبيعات اليوم"
                >
                  <div className="flex items-center justify-between text-[9px] text-emerald-200 font-bold">
                    <span>مبيعات اليوم</span>
                    <TrendingUp size={10} className="text-emerald-300" />
                  </div>
                  <div className="text-[11px] font-black text-white font-mono truncate mt-0.5">
                    {(liveStats.todayRevenue ?? 0).toLocaleString('ar-EG')} {liveStats.currency || 'ج.م'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('كم صافي الكاش في الدرج الآن؟')}
                  className="p-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 text-right transition-all cursor-pointer group"
                  title="اضغط لعرض تفصيل درج الكاش والتسوية"
                >
                  <div className="flex items-center justify-between text-[9px] text-blue-200 font-bold">
                    <span>كاش الدرج</span>
                    <Wallet size={10} className="text-blue-300" />
                  </div>
                  <div className="text-[11px] font-black text-white font-mono truncate mt-0.5">
                    {(liveStats.todayNetCashInDrawer ?? 0).toLocaleString('ar-EG')} {liveStats.currency || 'ج.م'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('أريد تقرير المصروفات')}
                  className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-right transition-all cursor-pointer group"
                  title="اضغط لعرض تقرير المصروفات التفصيلي"
                >
                  <div className="flex items-center justify-between text-[9px] text-amber-200 font-bold">
                    <span>مصروف اليوم</span>
                    <Receipt size={10} className="text-amber-300" />
                  </div>
                  <div className="text-[11px] font-black text-white font-mono truncate mt-0.5">
                    {(liveStats.todayExpensesTotal ?? liveStats.todayExpenses ?? 0).toLocaleString('ar-EG')} {liveStats.currency || 'ج.م'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('ما هي نواقص المخزون الحالية؟')}
                  className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-right transition-all cursor-pointer group"
                  title="اضغط لعرض نواقص المخزون والأصناف الحرجة"
                >
                  <div className="flex items-center justify-between text-[9px] text-rose-200 font-bold">
                    <span>نواقص حرجة</span>
                    <AlertTriangle size={10} className="text-rose-300" />
                  </div>
                  <div className="text-[11px] font-black text-white font-mono truncate mt-0.5">
                    {liveStats.lowStockItems.length + liveStats.outOfStockItems.length} صنف
                  </div>
                </button>
              </div>
            )}

            {/* 3-Tab Switcher: Chat | Instant Actions | Memory */}
            <div className="grid grid-cols-3 gap-1 bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-white text-[#1D1D1F] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Sparkles size={12} />
                <span>المحادثة الذكية</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'actions'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <Zap size={12} />
                <span>تنفيذ إجراء فعلي</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('knowledge')}
                className={`py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'knowledge'
                    ? 'bg-white text-[#1D1D1F] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Database size={12} />
                <span>الذاكرة ({memoryFacts.length})</span>
              </button>
            </div>
          </div>

          {activeTab === 'chat' ? (
            <>
              {/* Categorized Popover Command Bar + Direct Quick Buttons */}
              <div className="relative px-3 py-2 bg-white border-b border-black/[0.07] shrink-0 space-y-1.5">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {QUICK_INTENT_CATEGORIES.map((cat) => {
                    const isPopOpen = openPopoverId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setOpenPopoverId(isPopOpen ? null : cat.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black border flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-2xs ${
                          isPopOpen ? cat.colorClass : cat.softClass
                        }`}
                      >
                        <span>{cat.label}</span>
                        <ChevronDown
                          size={11}
                          className={`transition-transform duration-150 ${
                            isPopOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handleSendMessage('كم بعت اليوم؟')}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-200 text-[10px] font-black whitespace-nowrap transition-all cursor-pointer shrink-0"
                  >
                    ⚡ كم بعت اليوم؟
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('أريد تقرير المصروفات')}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-[10px] font-black whitespace-nowrap transition-all cursor-pointer shrink-0"
                  >
                    🧾 تقرير المصروفات
                  </button>
                </div>

                {/* Popover Dropdown Menu for Selected Category */}
                {openPopoverId && (
                  <div className="p-2 rounded-2xl bg-[#F8FAFC] border border-black/[0.1] shadow-lg grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-in fade-in duration-150">
                    {QUICK_INTENT_CATEGORIES.find((c) => c.id === openPopoverId)?.items.map(
                      (item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setOpenPopoverId(null);
                            if ('view' in item && item.view) {
                              onNavigate(item.view);
                              if (onNotify) {
                                onNotify('انتقال فوري للقسم', item.label, 'تنقل سريع ✓');
                              }
                            } else if ('prompt' in item && item.prompt) {
                              handleSendMessage(item.prompt);
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-[#0071E3] text-[#1D1D1F] hover:text-white border border-black/[0.06] text-[11px] font-black text-right flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="truncate">{item.label}</span>
                          <ChevronLeft size={12} className="shrink-0 opacity-70" />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Gemini-Style Structured Messages Stream */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#F5F5F7]/70">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`w-full ${
                          isUser
                            ? 'max-w-[85%] bg-[#0071E3] text-white rounded-2xl rounded-tr-xs p-3 font-bold text-xs shadow-xs'
                            : 'max-w-[98%] bg-white text-[#1D1D1F] border border-black/[0.08] rounded-3xl p-3.5 text-xs shadow-xs space-y-3'
                        }`}
                      >
                        {/* Assistant Header Bar */}
                        {!isUser && (
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/[0.06]">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-5 h-5 rounded-lg flex items-center justify-center text-white shrink-0"
                                style={{
                                  background:
                                    'linear-gradient(135deg, #0071E3 0%, #8E24AA 55%, #C49746 100%)',
                                }}
                              >
                                <Sparkles size={11} />
                              </span>
                              <span className="font-black text-[11px] text-[#1D1D1F]">شَذَى</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#0071E3]/10 text-[#0071E3] flex items-center gap-1">
                                {msg.sourceMode === 'web_search' ? (
                                  <Globe size={9} />
                                ) : (
                                  <Zap size={9} />
                                )}
                                {msg.badge || 'خبير الطيب والأعمال'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyText(msg.content, msg.id)}
                                className="px-2 py-0.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[#636366] hover:text-[#1D1D1F] text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="نسخ الشرح"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check size={10} className="text-emerald-600" />
                                    <span className="text-emerald-700">تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={10} />
                                    <span>نسخ الرد</span>
                                  </>
                                )}
                              </button>
                              <span className="text-[9px] text-[#86868B] font-mono">
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Structured Assistant Commentary */}
                        <div className="leading-relaxed space-y-1.5">
                          {msg.content.split('\n').map((line, i) => {
                            const trimmedLine = line.trim();
                            if (!trimmedLine) return <div key={i} className="h-1" />;

                            const isBullet =
                              trimmedLine.startsWith('•') ||
                              trimmedLine.startsWith('-') ||
                              /^\d+\./.test(trimmedLine);

                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                              <div
                                key={i}
                                className={
                                  !isUser && isBullet
                                    ? 'pr-2 py-0.5 border-r-2 border-[#0071E3]/30 bg-black/[0.015] rounded-l-lg px-2'
                                    : ''
                                }
                              >
                                {parts.map((part, idx) =>
                                  part.startsWith('**') && part.endsWith('**') ? (
                                    <strong
                                      key={idx}
                                      className={
                                        isUser ? 'font-black underline' : 'font-black text-[#0071E3]'
                                      }
                                    >
                                      {part.slice(2, -2)}
                                    </strong>
                                  ) : (
                                    <span key={idx}>{part}</span>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* ISOLATED COPYABLE ARTIFACT BOXES */}
                        {!isUser && msg.copyableBlocks && msg.copyableBlocks.length > 0 && (
                          <div className="space-y-2.5 pt-1">
                            {msg.copyableBlocks.map((block) => {
                              const isBlockCopied = copiedId === block.id;
                              return (
                                <div
                                  key={block.id}
                                  className="rounded-2xl border-2 border-[#0071E3]/25 bg-[#F8FAFC] overflow-hidden shadow-xs"
                                >
                                  <div className="px-3 py-2 bg-[#0F172A] text-white flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <MessageSquareShare size={13} className="text-amber-300 shrink-0" />
                                      <span className="text-[10px] font-black truncate">
                                        {block.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(block.text, block.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                                          isBlockCopied
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[#0071E3] hover:bg-[#0077ED] text-white'
                                        }`}
                                      >
                                        {isBlockCopied ? (
                                          <>
                                            <Check size={11} />
                                            <span>تم نسخ النص الصافي ✓</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={11} />
                                            <span>نسخ النص فقط</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="p-3 text-right bg-white font-medium text-[#1D1D1F] text-[11px] leading-relaxed whitespace-pre-line select-all border-t border-black/[0.05]">
                                    {block.text}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Separate Coach / Strategy Tip Callout */}
                        {!isUser && msg.coachTip && (
                          <div className="p-2.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-950">
                            <Lightbulb size={14} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-black">نصيحة «شَذَى» الاحترافية: </span>
                              <span>{msg.coachTip}</span>
                            </div>
                          </div>
                        )}

                        {/* Web Search Grounding Citations */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <div className="pt-2 border-t border-black/[0.06] space-y-1">
                            <span className="text-[9px] font-black text-[#86868B] flex items-center gap-1">
                              <Globe size={10} />
                              المصادر الموثقة من الويب:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {msg.citations.map((cit, idx) => (
                                <a
                                  key={idx}
                                  href={cit.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[9px] font-bold text-[#0071E3] flex items-center gap-1 truncate max-w-[200px]"
                                >
                                  <span className="truncate">{cit.title}</span>
                                  <ExternalLink size={9} className="shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Live Metrics Mini Cards */}
                        {!isUser && msg.metrics && msg.metrics.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-black/[0.06]">
                            {msg.metrics.map((m, idx) => (
                              <div
                                key={idx}
                                className="p-1.5 rounded-xl bg-black/[0.025] border border-black/[0.05] text-center"
                              >
                                <span className="text-[9px] text-[#86868B] block truncate">
                                  {m.label}
                                </span>
                                <span className="text-[11px] font-black text-[#1D1D1F] font-mono">
                                  {m.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actionable Buttons Inside Reply (With Real Execution State) */}
                        {!isUser && msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/[0.06]">
                            {msg.actions.map((act) => {
                              const isRealSystemAction =
                                act.type === 'add_expense' ||
                                act.type === 'update_stock' ||
                                act.type === 'delete_sale' ||
                                act.type === 'set_numerals' ||
                                act.type === 'set_theme' ||
                                act.type === 'open_theme_studio';
                              const isDone = Boolean(executedActionIds[act.id]);

                              return (
                                <button
                                  key={act.id}
                                  type="button"
                                  onClick={() => executeSystemAction(act, false)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                    isDone
                                      ? 'bg-emerald-600 text-white'
                                      : isRealSystemAction
                                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                      : 'bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white'
                                  }`}
                                >
                                  {isDone ? (
                                    <>
                                      <CheckCircle2 size={12} />
                                      <span>تم التنفيذ الفعلي ✓ ({act.label})</span>
                                    </>
                                  ) : isRealSystemAction ? (
                                    <>
                                      <Play size={11} />
                                      <span>{act.label}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>{act.label}</span>
                                      <ChevronLeft size={11} />
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isThinking && (
                  <div className="flex justify-end">
                    <div className="rounded-2xl px-4 py-2.5 bg-white border border-black/[0.08] text-xs font-bold text-[#1D1D1F] flex items-center gap-2 shadow-2xs">
                      <Sparkles size={14} className="text-[#0071E3] animate-spin" />
                      <span>«شَذَى» يقرأ السجلات اللحظية ويجهز الرد الدقيق...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-black/[0.07] flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اسأل مثلاً: «كم بعت اليوم؟» أو «سجل مصروف 50 جنيه نظافة»..."
                  className="flex-1 h-10 px-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-bold text-[#1D1D1F] outline-none placeholder:text-[#86868B]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isThinking}
                  className="h-10 px-4 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <span>إرسال</span>
                  <Send size={13} />
                </button>
              </form>
            </>
          ) : activeTab === 'actions' ? (
            /* Real Executable Operations Studio Inside Assistant */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F5F7]/70">
              {/* 1. Instant Expense Registration */}
              <form
                onSubmit={handleQuickExpenseSubmit}
                className="rounded-2xl p-3.5 bg-white border border-black/[0.08] space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                    <Receipt size={15} className="text-rose-600" />
                    تسجيل مصروف تشغيلي فوري في الكاش
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-700">
                    يُخصم فعلياً من الدرج
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={quickExpenseAmount}
                    onChange={(e) => setQuickExpenseAmount(e.target.value)}
                    placeholder={`المبلغ (${settings.currency || 'ج.م'})`}
                    className="h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-black text-[#1D1D1F] outline-none"
                  />
                  <input
                    type="text"
                    value={quickExpenseDesc}
                    onChange={(e) => setQuickExpenseDesc(e.target.value)}
                    placeholder="بيان المصروف (مثال: نظافة وضيافة)"
                    className="h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-bold text-[#1D1D1F] outline-none"
                  />
                  <select
                    value={quickExpenseCategory}
                    onChange={(e) => setQuickExpenseCategory(e.target.value)}
                    className="h-9 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-bold text-[#1D1D1F] outline-none"
                  >
                    <option value="مصاريف تشغيل">مصاريف تشغيل</option>
                    <option value="صيانة ونثريات">صيانة ونثريات</option>
                    <option value="مستلزمات وتغليف">مستلزمات وتغليف</option>
                    <option value="فواتير ومرافق">فواتير ومرافق</option>
                    <option value="تسويق وإعلان">تسويق وإعلان</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!quickExpenseAmount || Number(quickExpenseAmount) <= 0}
                  className="w-full h-9 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <CheckCircle2 size={14} />
                  <span>اعتماد وتسجيل المصروف فعلياً الآن</span>
                </button>
              </form>

              {/* 2. Instant Perfume Stock Adjustment */}
              <form
                onSubmit={handleQuickStockSubmit}
                className="rounded-2xl p-3.5 bg-white border border-black/[0.08] space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                    <PackagePlus size={15} className="text-emerald-600" />
                    تعديل فوري لرصيد جرامات عطر بالمخزون
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-700">
                    تحديث لحظي للخزانة
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={quickStockProductId || (products[0]?.id ? String(products[0].id) : '')}
                    onChange={(e) => setQuickStockProductId(e.target.value)}
                    className="h-9 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-bold text-[#1D1D1F] outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name} ({p.stock_grams} جم)
                      </option>
                    ))}
                  </select>
                  <select
                    value={quickStockMode}
                    onChange={(e) => setQuickStockMode(e.target.value as any)}
                    className="h-9 px-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-bold text-[#1D1D1F] outline-none"
                  >
                    <option value="add">تزويد الرصيد (+ جرام)</option>
                    <option value="deduct">خصم من الرصيد (- جرام)</option>
                    <option value="set">ضبط الرصيد النهائي (= جرام)</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={quickStockGrams}
                    onChange={(e) => setQuickStockGrams(e.target.value)}
                    placeholder="الكمية بالجرام (مثال: 250)"
                    className="h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-black text-[#1D1D1F] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!quickStockGrams || Number(quickStockGrams) <= 0}
                  className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <CheckCircle2 size={14} />
                  <span>تحديث رصيد المخزون الفعلي الآن</span>
                </button>
              </form>

              {/* 3. Quick System & Appearance Controls */}
              <div className="rounded-2xl p-3.5 bg-white border border-black/[0.08] space-y-2.5 shadow-2xs">
                <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                  <SlidersHorizontal size={15} className="text-purple-600" />
                  تحكم فوري في النظام والمظهر والفواتير
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      executeSystemAction({
                        id: 'quick-num-ar',
                        label: 'الأرقام العربية (٠١٢٣)',
                        type: 'set_numerals',
                        payload: 'arabic',
                      })
                    }
                    className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-[11px] font-black transition-all cursor-pointer"
                  >
                    🔢 تفعيل الأرقام العربية (٠١٢٣٤٥٦٧٨٩)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      executeSystemAction({
                        id: 'quick-num-en',
                        label: 'الأرقام الإنجليزية (0123)',
                        type: 'set_numerals',
                        payload: 'latin',
                      })
                    }
                    className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-[11px] font-black transition-all cursor-pointer"
                  >
                    🔢 تفعيل الأرقام الإنجليزية (0123456789)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      executeSystemAction({
                        id: 'quick-theme-lav',
                        label: 'ثيم اللافندر 3D',
                        type: 'set_theme',
                        payload: 'frosted_lavender_clay',
                      })
                    }
                    className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 text-[11px] font-black transition-all cursor-pointer"
                  >
                    ✨ تفعيل ثيم اللافندر البلوري 3D
                  </button>
                  {onOpenThemeStudio && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenThemeStudio();
                        setIsOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-200 text-[11px] font-black transition-all cursor-pointer"
                    >
                      🎨 فتح استوديو الخطوط والثيمات
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Knowledge Base & Live App Data Feed Tab */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F5F7]/60">
              <div className="rounded-2xl p-3.5 bg-white border border-black/[0.08] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                    <BrainCircuit size={15} className="text-[#0071E3]" />
                    التغذي اللحظي على بيانات المتجر
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/12 text-emerald-700">
                    متصل 100% بالبيانات الحية
                  </span>
                </div>
                <p className="text-[11px] text-[#636366] leading-relaxed">
                  يقرأ «شَذَى» لحظياً كافة سجلات المبيعات والمخزون والمصروفات ليجيب بدقة حسابية كاملة:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-black/[0.025] border border-black/[0.05] text-center">
                    <span className="text-[9px] text-[#86868B] block">الأصناف والزيوت</span>
                    <span className="text-xs font-black text-[#1D1D1F]">
                      {products.length} عطر ({liveStats?.totalGramsInStore || 0} جم)
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.025] border border-black/[0.05] text-center">
                    <span className="text-[9px] text-[#86868B] block">فواتير اليوم</span>
                    <span className="text-xs font-black text-[#1D1D1F]">
                      {liveStats?.todaySales.length || 0} فاتورة ({liveStats?.todayRevenue || 0}{' '}
                      {liveStats?.currency || 'ج.م'})
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.025] border border-black/[0.05] text-center">
                    <span className="text-[9px] text-[#86868B] block">مصروفات اليوم</span>
                    <span className="text-xs font-black text-[#1D1D1F]">
                      {liveStats?.todayExpenseCount || 0} حركة ({liveStats?.todayExpensesTotal || 0}{' '}
                      {liveStats?.currency || 'ج.م'})
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.025] border border-black/[0.05] text-center">
                    <span className="text-[9px] text-[#86868B] block">العملاء والولاء</span>
                    <span className="text-xs font-black text-[#1D1D1F]">
                      {customCustomers.length} عميل مسجل
                    </span>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleAddMemoryFact}
                className="rounded-2xl p-3.5 bg-white border border-black/[0.08] space-y-2.5 shadow-2xs"
              >
                <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                  <BookOpen size={14} className="text-purple-600" />
                  إضافة قاعدة أو معلومة خاصة لذاكرة «شَذَى» الدائمة:
                </span>
                <input
                  type="text"
                  value={newFactTitle}
                  onChange={(e) => setNewFactTitle(e.target.value)}
                  placeholder="عنوان المعلومة (مثال: خلطة العيد الخاصة أو سياسة عميل مميز)"
                  className="w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-bold text-[#1D1D1F] outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFactContent}
                    onChange={(e) => setNewFactContent(e.target.value)}
                    placeholder="تفاصيل المعلومة التي سيتذكرها «شَذَى» دائماً..."
                    className="flex-1 h-9 px-3 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-xs font-medium text-[#1D1D1F] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newFactTitle.trim() || !newFactContent.trim()}
                    className="px-3.5 h-9 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>حفظ بالذاكرة</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <span className="text-[11px] font-black text-[#86868B] block px-1">
                  قواعد المعرفة المحفوظة في ذاكرة «شَذَى» ({memoryFacts.length}):
                </span>
                {memoryFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="p-3 rounded-2xl bg-white border border-black/[0.07] flex items-start justify-between gap-2 shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-black text-[#1D1D1F]">{fact.title}</div>
                      <p className="text-[11px] text-[#636366] leading-relaxed">{fact.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFact(fact.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-[#86868B] hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title="حذف من الذاكرة"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SmartAppAssistantChat;
