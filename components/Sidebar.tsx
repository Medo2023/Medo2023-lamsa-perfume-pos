import React, { useState, useEffect } from 'react';
import { View, Product, StoreSettings, AppUser, resolveActiveAppTheme } from '../types';
import { canAccessView } from '../services/authService';
import {
  LayoutDashboard,
  ShoppingBag,
  Box,
  FileText,
  Sparkles,
  Plus,
  Sliders,
  X,
  Building,
  ChevronDown,
  ChevronLeft,
  ShieldCheck,
  Target,
  Wallet,
  Beaker,
  Users,
  Clock,
  Package,
  Lock,
  Crown,
  Palette,
  Award,
  Megaphone,
  Moon,
  Sun,
  Layers,
  FlaskConical,
  Bell,
  Download,
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  products?: Product[];
  settings?: StoreSettings;
  isCloudConnected?: boolean;
  currentUser?: AppUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onOpenDayOperations?: () => void;
  onLockScreen?: () => void;
  onOpenThemeStudio?: () => void;
  onToggleDarkMode?: () => void;
  onOpenLiveAlertsRadar?: () => void;
  onOpenPWAInstall?: () => void;
}

interface NavItemConfig {
  id: View | 'DAY_OPERATIONS_ACTION';
  label: string;
  shortLabel?: string;
  icon: any;
  badge?: string | number | null;
  isAction?: boolean;
  iconBg: string;
  iconColor: string;
  activeGradient: string;
}

interface NavSectionConfig {
  id: string;
  title: string;
  shortTitle: string;
  headerBg: string;
  headerText: string;
  headerBorder: string;
  dotColor: string;
  items: NavItemConfig[];
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  products = [],
  settings,
  currentUser,
  onOpenAuthModal,
  onOpenDayOperations,
  onLockScreen,
  onOpenThemeStudio,
  onToggleDarkMode,
  onOpenLiveAlertsRadar,
  onOpenPWAInstall,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePopoverCategory, setMobilePopoverCategory] = useState<string | null>(null);
  const [desktopShowAllSections, setDesktopShowAllSections] = useState(false);
  const [openSectionIds, setOpenSectionIds] = useState<Record<string, boolean>>({
    sales_crm: true,
    inventory_lab: true,
    finance_reports: true,
    admin_security: false,
  });
  const [logoLoadError, setLogoLoadError] = useState(false);

  const lowStockCount = products.filter((p) => p.stock_grams < 100).length;
  const isDarkMode = resolveActiveAppTheme(settings).isDark;

  const logoUrl = settings?.logoUrl || 'https://l.top4top.io/p_31142jfec0.png';
  const storeName = settings?.storeName || 'لمسة عطر';
  const storeSlogan = settings?.storeSlogan || 'أثر يبقى وذكرى تدوم';

  // Master sections with harmonious Apple Sequoia × Windows 12 Fluent palette
  const allDesktopSections: NavSectionConfig[] = [
    {
      id: 'sales_crm',
      title: 'المبيعات والعملاء والتارجت',
      shortTitle: 'المبيعات والعملاء',
      headerBg: 'bg-[#0067C0]/[0.06] hover:bg-[#0067C0]/[0.10]',
      headerText: 'text-[#0F172A]',
      headerBorder: 'border-[#0067C0]/20',
      dotColor: 'bg-[#0067C0]',
      items: [
        {
          id: View.POS,
          label: 'الكاشير والمبيعات السريعة',
          shortLabel: 'الكاشير',
          icon: ShoppingBag,
          badge: 'مباشر',
          iconBg: 'bg-[#0067C0]/10',
          iconColor: 'text-[#0067C0]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.DASHBOARD,
          label: 'لوحة القيادة التنفيذية',
          shortLabel: 'الرئيسية',
          icon: LayoutDashboard,
          badge: null,
          iconBg: 'bg-slate-500/10',
          iconColor: 'text-slate-700',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.CUSTOMERS_LOYALTY,
          label: 'العملاء والولاء والمتابعة',
          shortLabel: 'العملاء والولاء',
          icon: Award,
          badge: 'CRM',
          iconBg: 'bg-[#C49746]/15',
          iconColor: 'text-[#9A6E23]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.OPERATIONS_SYSTEM,
          label: 'نظام التارجت والحوافز',
          shortLabel: 'التارجت والحوافز',
          icon: Target,
          badge: '600 / 1000ج',
          iconBg: 'bg-[#0067C0]/10',
          iconColor: 'text-[#0067C0]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: 'DAY_OPERATIONS_ACTION',
          label: 'فتح وإغلاق اليوم والدرج',
          shortLabel: 'فتح/إغلاق اليوم',
          icon: Lock,
          badge: 'يومي',
          isAction: true,
          iconBg: 'bg-emerald-500/12',
          iconColor: 'text-emerald-700',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
      ],
    },
    {
      id: 'inventory_lab',
      title: 'المخزون والتركيب والتسويق',
      shortTitle: 'المخزون والتركيب',
      headerBg: 'bg-slate-500/[0.06] hover:bg-slate-500/[0.10]',
      headerText: 'text-[#0F172A]',
      headerBorder: 'border-slate-500/20',
      dotColor: 'bg-emerald-600',
      items: [
        {
          id: View.INVENTORY,
          label: 'المخزون الخام (جرام)',
          shortLabel: 'المخزون',
          icon: Box,
          badge: lowStockCount > 0 ? lowStockCount : null,
          iconBg: 'bg-emerald-500/12',
          iconColor: 'text-emerald-700',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.INVENTORY_INTELLIGENCE,
          label: 'ذكاء المخزون والنواقص',
          shortLabel: 'النواقص الذكية',
          icon: Package,
          badge: 'ذكي',
          iconBg: 'bg-[#0067C0]/10',
          iconColor: 'text-[#0067C0]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.FORMULATION_ENGINE,
          label: 'محرك التركيب والخلطات',
          shortLabel: 'محرك التركيب',
          icon: Beaker,
          badge: 'معتمد',
          iconBg: 'bg-[#C49746]/15',
          iconColor: 'text-[#9A6E23]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.ANALYZER,
          label: 'موسوعة وتحليل العطور',
          shortLabel: 'موسوعة العطور',
          icon: Sparkles,
          badge: 'خبير',
          iconBg: 'bg-slate-500/10',
          iconColor: 'text-slate-700',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.MARKETING,
          label: 'التسويق والحملات الذكية',
          shortLabel: 'التسويق الذكي',
          icon: Megaphone,
          badge: 'نمو',
          iconBg: 'bg-[#0067C0]/10',
          iconColor: 'text-[#0067C0]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
      ],
    },
    {
      id: 'finance_reports',
      title: 'السجلات والمحاسبة والمالية',
      shortTitle: 'الفواتير والمالية',
      headerBg: 'bg-[#C49746]/[0.08] hover:bg-[#C49746]/[0.13]',
      headerText: 'text-[#0F172A]',
      headerBorder: 'border-[#C49746]/25',
      dotColor: 'bg-[#C49746]',
      items: [
        {
          id: View.REPORTS,
          label: 'سجل المبيعات والفواتير',
          shortLabel: 'الفواتير والسجل',
          icon: FileText,
          badge: 'تحكم كامل',
          iconBg: 'bg-[#0067C0]/10',
          iconColor: 'text-[#0067C0]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.EXPENSES,
          label: 'المصاريف والرواتب الثابتة',
          shortLabel: 'المصاريف',
          icon: Building,
          badge: null,
          iconBg: 'bg-slate-500/10',
          iconColor: 'text-slate-700',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.FINANCIAL_VAULTS,
          label: 'المحافظ والمسحوبات المقيدة',
          shortLabel: 'المحافظ المالية',
          icon: Wallet,
          badge: 'سري',
          iconBg: 'bg-[#C49746]/15',
          iconColor: 'text-[#9A6E23]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
      ],
    },
    {
      id: 'admin_security',
      title: 'الإدارة العليا وأمان النظام',
      shortTitle: 'الإدارة والأمان',
      headerBg: 'bg-slate-500/[0.06] hover:bg-slate-500/[0.10]',
      headerText: 'text-[#0F172A]',
      headerBorder: 'border-slate-500/20',
      dotColor: 'bg-slate-700',
      items: [
        {
          id: View.SETTINGS,
          label: 'لوحة الإعدادات الشاملة',
          shortLabel: 'الإعدادات',
          icon: Sliders,
          badge: 'المالك',
          iconBg: 'bg-slate-500/10',
          iconColor: 'text-slate-700',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.USERS_MANAGEMENT,
          label: 'إدارة المستخدمين والصلاحيات',
          shortLabel: 'المستخدمين',
          icon: Users,
          badge: '👑',
          iconBg: 'bg-[#C49746]/15',
          iconColor: 'text-[#9A6E23]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.AUDIT_LOGS,
          label: 'سجل العمليات والتدقيق',
          shortLabel: 'سجل التدقيق',
          icon: Clock,
          badge: 'أمني',
          iconBg: 'bg-slate-500/10',
          iconColor: 'text-slate-700',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
        {
          id: View.STORE_MANAGER,
          label: 'لوحة المتجر والنسخ الاحتياطي',
          shortLabel: 'النسخ الاحتياطي',
          icon: ShieldCheck,
          badge: null,
          iconBg: 'bg-[#0067C0]/10',
          iconColor: 'text-[#0067C0]',
          activeGradient: 'from-[#0F172A] via-[#1E293B] to-[#005A9E]',
        },
      ],
    },
  ];

  // Strictly filter items based on permissions
  const desktopSections = allDesktopSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.id === 'DAY_OPERATIONS_ACTION'
          ? true
          : canAccessView(currentUser ?? null, item.id as View)
      ),
    }))
    .filter((section) => section.items.length > 0);

  // Automatically expand the section containing currentView on Desktop
  useEffect(() => {
    const matchingSection = desktopSections.find((s) =>
      s.items.some((it) => it.id === currentView)
    );
    if (matchingSection) {
      setOpenSectionIds((prev) => ({ ...prev, [matchingSection.id]: true }));
    }
  }, [currentView]);

  const toggleDesktopSection = (secId: string) => {
    setOpenSectionIds((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  // Primary 4 Direct Mobile Buttons (Fastest 1-Click Access)
  const primaryMobileButtons: NavItemConfig[] = [
    {
      id: View.POS,
      label: 'الكاشير',
      icon: ShoppingBag,
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-600',
      activeGradient: 'from-blue-600 to-indigo-600',
    },
    {
      id: View.DASHBOARD,
      label: 'الرئيسية',
      icon: LayoutDashboard,
      iconBg: 'bg-indigo-500/15',
      iconColor: 'text-indigo-600',
      activeGradient: 'from-indigo-600 to-blue-700',
    },
    {
      id: View.REPORTS,
      label: 'الفواتير',
      icon: FileText,
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600',
      activeGradient: 'from-amber-500 to-orange-600',
    },
    {
      id: View.INVENTORY,
      label: 'المخزون',
      icon: Box,
      badge: lowStockCount > 0 ? lowStockCount : null,
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      activeGradient: 'from-emerald-600 to-teal-600',
    },
  ].filter((item) => canAccessView(currentUser ?? null, item.id as View));

  const handleItemClick = (item: NavItemConfig) => {
    setMobilePopoverCategory(null);
    setMobileMenuOpen(false);
    if (item.id === 'DAY_OPERATIONS_ACTION') {
      if (onOpenDayOperations) onOpenDayOperations();
    } else {
      setCurrentView(item.id as View);
    }
  };

  return (
    <>
      {/* ======================================================== */}
      {/* MOBILE & TABLET TOP BAR (Clean Colorful Buttons + Popover Menus) */}
      {/* ======================================================== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 apple-glass border-b border-black/[0.08] shadow-apple-xs">
        {/* Row 1: Brand & Executive Director Badge & Quick Controls */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-black/[0.05]">
          <div className="flex items-center gap-2 min-w-0">
            {!logoLoadError ? (
              <img
                src={logoUrl}
                alt={storeName}
                onError={() => setLogoLoadError(true)}
                className="w-8 h-8 max-w-[32px] max-h-[32px] object-contain rounded-xl bg-white p-0.5 shadow-2xs border border-black/[0.08] shrink-0 block"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1D1D1F] to-[#48484A] flex items-center justify-center shadow-sm shrink-0">
                <span className="text-[#C49746] text-xs font-bold">ع</span>
              </div>
            )}

            {currentUser?.role === 'OWNER' ? (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-600/20 border border-amber-400/50 text-amber-950 font-black text-[11px] shadow-2xs active:scale-95 transition-all truncate"
                title="المدير العام د. محمد (المالك) — اضغط للتبديل"
              >
                <Crown size={13} className="text-amber-600 fill-amber-500 shrink-0" />
                <span className="truncate max-w-[105px]">د. محمد (المدير)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 font-bold text-[11px] shadow-2xs active:scale-95 transition-all truncate"
                title="مسؤول ومدير المبيعات: طارق — اضغط للتبديل"
              >
                <span className="shrink-0">💼</span>
                <span className="truncate max-w-[105px]">طارق (المبيعات)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={isDarkMode ? 'التبديل إلى الوضع النهاري الفاتح' : 'التبديل إلى الوضع الليلي الداكن'}
                className={`apple-btn flex items-center justify-center w-8 h-8 rounded-full border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#1D1D1F] text-amber-400 border-amber-400/30'
                    : 'bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] border-black/[0.06]'
                }`}
              >
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            )}
            {onOpenThemeStudio && (
              <button
                type="button"
                onClick={onOpenThemeStudio}
                className="apple-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-violet-500/12 hover:bg-violet-500/20 text-violet-800 border border-violet-500/25 text-[11px] font-black"
                title="ثيمات وأنماط أبل اللونية"
              >
                <Palette size={13} className="text-violet-600" />
                <span>الثيمات</span>
              </button>
            )}

            {onOpenLiveAlertsRadar && (
              <button
                type="button"
                onClick={onOpenLiveAlertsRadar}
                className="apple-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 border border-amber-500/35 text-[11px] font-black"
                title="رادار تنبيهات المالك المباشرة للمبيعات والعمليات"
              >
                <Bell size={13} className="text-amber-600 fill-amber-500 animate-pulse" />
                <span>تنبيهات</span>
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-emerald-500 text-white font-mono font-bold">LIVE</span>
              </button>
            )}

            {onOpenPWAInstall && (
              <button
                type="button"
                onClick={onOpenPWAInstall}
                className="apple-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-950 border border-blue-500/35 text-[11px] font-black"
                title="تثبيت التطبيق على الموبايل والتابلت والكمبيوتر"
              >
                <Download size={13} className="text-blue-600" />
                <span>تثبيت</span>
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-blue-600 text-white font-mono font-bold">APP</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobilePopoverCategory(null);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className={`apple-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black border border-[#8f9ebe] transition-all ${
                mobileMenuOpen
                  ? 'bg-[#0071E3] text-white border-[#0071E3]'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F]'
              }`}
            >
              <Layers size={13} />
              <span className="text-[#0f0f62]">كل الأقسام</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Row 2: Organized Colorful Direct Tabs + Popover Section Menus */}
        <div className="h-11 px-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {/* 4 Essential Colorful Direct Tabs */}
          {primaryMobileButtons.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`apple-btn relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap shrink-0 transition-all border ${
                  isActive
                    ? `bg-gradient-to-l ${item.activeGradient} text-white border-transparent shadow-xs`
                    : `${item.iconBg} ${item.iconColor} border-black/[0.05] hover:opacity-90`
                }`}
              >
                <Icon size={13} strokeWidth={2.3} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      isActive ? 'bg-white/25 text-white' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="h-5 w-px bg-black/[0.08] shrink-0 mx-0.5" />

          {/* Categorized Popover Dropdown Buttons (قوائم منبثقة للأقسام) */}
          {desktopSections.map((sec) => {
            const isPopActive = mobilePopoverCategory === sec.id;
            const hasActiveChild = sec.items.some((it) => it.id === currentView);
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobilePopoverCategory(isPopActive ? null : sec.id);
                }}
                className={`apple-btn flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap shrink-0 border transition-all ${
                  isPopActive
                    ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-xs'
                    : hasActiveChild
                    ? `${sec.headerBg} ${sec.headerText} ${sec.headerBorder} ring-1 ring-current/20`
                    : 'bg-white/80 text-[#1D1D1F] border-black/[0.08]'
                }`}
              >
                <span>{sec.shortTitle}</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-150 ${isPopActive ? 'rotate-180' : ''}`}
                />
              </button>
            );
          })}
        </div>

        {/* Floating Mobile Popover Menu when a Category Pill is Tapped */}
        {mobilePopoverCategory && (
          <div className="px-3 py-3 bg-white/98 backdrop-blur-xl border-b border-black/[0.12] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-black text-[#1D1D1F]">
                {desktopSections.find((s) => s.id === mobilePopoverCategory)?.title}
              </span>
              <button
                type="button"
                onClick={() => setMobilePopoverCategory(null)}
                className="text-[10px] font-bold text-[#86868B] hover:text-[#1D1D1F] flex items-center gap-1"
              >
                <span>إغلاق</span>
                <X size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {desktopSections
                .find((s) => s.id === mobilePopoverCategory)
                ?.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`p-2.5 rounded-2xl border text-right flex items-center justify-between gap-2 transition-all ${
                        isActive
                          ? `bg-gradient-to-l ${item.activeGradient} text-white border-transparent shadow-sm`
                          : 'bg-[#F8FAFC] hover:bg-blue-50/60 text-[#1D1D1F] border-black/[0.07]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : `${item.iconBg} ${item.iconColor}`
                          }`}
                        >
                          <Icon size={14} />
                        </div>
                        <span className="text-[11px] font-black truncate">
                          {item.shortLabel || item.label}
                        </span>
                      </div>
                      <ChevronLeft size={12} className="shrink-0 opacity-60" />
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </header>

      {/* Full Mobile All-Sections Categorized Grid Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-start pt-14">
          <div className="apple-glass rounded-b-3xl p-4 border-b border-black/[0.08] space-y-4 animate-in slide-in-from-top duration-200 max-h-[84vh] overflow-y-auto shadow-apple-lg bg-white/95">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#0071E3]" />
                <h3 className="font-black text-sm text-[#1D1D1F]">
                  دليل أقسام النظام المنظم
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#86868B]"
              >
                <X size={16} />
              </button>
            </div>

            {/* User & Quick Lock Bar */}
            <div className="p-3 rounded-2xl bg-black/[0.03] border border-black/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    currentUser?.role === 'OWNER'
                      ? 'bg-[#C49746] text-white'
                      : 'bg-[#0071E3] text-white'
                  }`}
                >
                  {currentUser?.role === 'OWNER' ? '👑' : '👤'}
                </div>
                <div>
                  <span className="text-xs font-black text-[#1D1D1F] block">
                    {currentUser?.displayName || 'د. محمد'}
                  </span>
                  <span className="text-[10px] text-[#86868B] font-bold">
                    {currentUser?.role === 'OWNER' ? 'المالك والمدير العام' : 'مسؤول ومدير المبيعات'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {onLockScreen && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLockScreen();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 text-xs font-black flex items-center gap-1"
                  >
                    <Lock size={12} />
                    <span>قفل</span>
                  </button>
                )}
                {onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0071E3]/10 text-[#0071E3] text-xs font-black"
                  >
                    تبديل الحساب
                  </button>
                )}
              </div>
            </div>

            {/* Categorized Sections Grid */}
            <div className="space-y-3">
              {desktopSections.map((sec) => (
                <div
                  key={sec.id}
                  className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.06] space-y-2"
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${sec.dotColor}`} />
                    <span className={`text-xs font-black ${sec.headerText}`}>{sec.title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleItemClick(item)}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2 transition-all ${
                            isActive
                              ? `bg-gradient-to-l ${item.activeGradient} text-white border-transparent shadow-xs`
                              : 'bg-white text-[#1D1D1F] border-black/[0.06]'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-white/20 text-white' : `${item.iconBg} ${item.iconColor}`
                            }`}
                          >
                            <Icon size={14} />
                          </div>
                          <span className="text-[11px] font-black truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DESKTOP FLOATING GLASS SIDEBAR (Clean, Color-Coded, Collapsible) */}
      {/* ======================================================== */}
      <aside className="hidden md:flex fixed top-4 right-4 bottom-4 w-64 apple-glass rounded-3xl p-4 flex-col justify-between z-30 shadow-apple-card border border-black/[0.08] overflow-hidden">
        {/* Top Fixed Identity & Brand */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center gap-3 px-1 pb-3 border-b border-black/[0.06]">
            {!logoLoadError ? (
              <img
                src={logoUrl}
                alt={storeName}
                onError={() => setLogoLoadError(true)}
                className="w-11 h-11 max-w-[44px] max-h-[44px] object-contain rounded-2xl bg-white p-1 shadow-apple-sm border border-black/[0.08] shrink-0 hover:scale-105 transition-transform block"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1D1D1F] to-[#48484A] flex items-center justify-center shadow-sm shrink-0">
                <span className="text-[#C49746] text-lg font-bold">ع</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-black text-[#1D1D1F] gemini-text-gradient-blue tracking-tight leading-tight truncate">
                {storeName}
              </h1>
              <p className="text-[10px] font-bold text-[#C49746] gemini-text-gradient-amber tracking-tight truncate">
                {storeSlogan}
              </p>
              <span className="text-[9px] font-semibold gemini-text-gradient block">
                نظام الإدارة والمحاسبة الذكي
              </span>
            </div>
          </div>

          {/* Current User Card */}
          <div
            className={`p-2.5 rounded-2xl border transition-all ${
              currentUser?.role === 'OWNER'
                ? 'bg-gradient-to-r from-amber-500/10 via-yellow-400/15 to-amber-600/10 border-amber-400/40 shadow-apple-xs'
                : 'bg-black/[0.03] border-black/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                    currentUser?.role === 'OWNER'
                      ? 'bg-gradient-to-tr from-amber-500 to-yellow-600 text-slate-950 font-black border border-amber-300'
                      : 'bg-[#0071E3] text-white'
                  }`}
                >
                  {currentUser?.role === 'OWNER' ? (
                    <Crown size={15} className="fill-slate-950 stroke-slate-950" />
                  ) : (
                    '👤'
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-[#1D1D1F] truncate">
                      {currentUser?.displayName?.replace(/\(.*?\)/g, '').trim() || 'د. محمد'}
                    </span>
                    {currentUser?.role === 'OWNER' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] block truncate font-bold text-[#0071E3]">
                    {currentUser?.role === 'OWNER' ? 'المدير العام' : 'مدير المبيعات'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onLockScreen && (
                  <button
                    type="button"
                    onClick={onLockScreen}
                    className="apple-btn p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer"
                    title="قفل الشاشة فوراً"
                  >
                    <Lock size={12} />
                  </button>
                )}
                {onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="apple-btn px-2 py-1 rounded-xl text-[10px] font-black bg-[#0071E3]/12 hover:bg-[#0071E3] text-[#0071E3] hover:text-white transition-all cursor-pointer"
                    title="تبديل الحساب"
                  >
                    تبديل
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section Organization Controls (Expand All / Smart Accordion) */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-[#86868B] flex items-center gap-1">
              <Layers size={11} className="text-[#0071E3]" />
              <span>أقسام النظام المنظمة</span>
            </span>
            <button
              type="button"
              onClick={() => {
                const nextAll = !desktopShowAllSections;
                setDesktopShowAllSections(nextAll);
                const nextMap: Record<string, boolean> = {};
                desktopSections.forEach((s) => {
                  nextMap[s.id] = nextAll ? true : s.items.some((it) => it.id === currentView);
                });
                if (!nextAll && !Object.values(nextMap).some(Boolean)) {
                  nextMap.sales_crm = true;
                }
                setOpenSectionIds(nextMap);
              }}
              className="text-[10px] font-black text-[#0071E3] hover:underline cursor-pointer"
            >
              {desktopShowAllSections ? 'طي ذكي للأقسام' : 'عرض كل الأقسام'}
            </button>
          </div>
        </div>

        {/* Scrollable Organized Sections Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar my-2 space-y-2.5 pr-0.5">
          {desktopSections.map((section) => {
            const isSecOpen =
              desktopShowAllSections ||
              openSectionIds[section.id] ||
              section.items.some((it) => it.id === currentView);

            return (
              <div
                key={section.id}
                className="rounded-2xl border border-black/[0.06] bg-white/45 overflow-hidden transition-all"
              >
                {/* Clickable Colorful Category Header */}
                <button
                  type="button"
                  onClick={() => toggleDesktopSection(section.id)}
                  className={`w-full px-3 py-2 flex items-center justify-between text-right transition-colors cursor-pointer ${section.headerBg}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${section.dotColor}`} />
                    <span className={`text-[11px] font-black truncate ${section.headerText}`}>
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-white/70 text-[#1D1D1F]">
                      {section.items.length}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${section.headerText} ${
                        isSecOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Collapsible Section Items */}
                {isSecOpen && (
                  <div className="p-1.5 space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleItemClick(item)}
                          className={`apple-btn w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'win12-fluent-nav-active text-white pr-3.5'
                              : 'text-[#0F172A] hover:bg-[#0067C0]/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : `${item.iconBg} ${item.iconColor}`
                              }`}
                            >
                              <Icon size={14} strokeWidth={isActive ? 2.4 : 2} />
                            </div>
                            <span
                              className={`truncate text-[11.5px] ${
                                isActive ? 'text-white font-black' : 'font-bold text-[#1D1D1F]'
                              }`}
                            >
                              {item.label}
                            </span>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${
                                isActive
                                  ? 'bg-white/25 text-white'
                                  : typeof item.badge === 'number'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-black/[0.06] text-[#1D1D1F]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Store Footer with Theme Studio & Signature */}
        <div className="pt-2.5 border-t border-black/[0.06] px-1 space-y-2 shrink-0">
          {onOpenLiveAlertsRadar && (
            <button
              type="button"
              onClick={onOpenLiveAlertsRadar}
              className="apple-btn w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-amber-500/12 hover:bg-amber-500/22 border border-amber-500/35 text-[11px] font-black text-amber-950 transition-all cursor-pointer shadow-2xs"
              title="رادار تنبيهات المالك المباشرة للمبيعات والعمليات"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Bell size={13} className="text-amber-600 fill-amber-500 animate-pulse shrink-0" />
                <span className="truncate">رادار تنبيهات المالك</span>
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                LIVE 24/7
              </span>
            </button>
          )}

          {onOpenPWAInstall && (
            <button
              type="button"
              onClick={onOpenPWAInstall}
              className="apple-btn w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[11px] font-black text-blue-950 transition-all cursor-pointer shadow-2xs"
              title="تثبيت لمسة عطر كتطبيق مستقل على الموبايل والكمبيوتر"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Download size={13} className="text-blue-600 shrink-0" />
                <span className="truncate">تثبيت التطبيق (PWA)</span>
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white shrink-0">
                APP
              </span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title={isDarkMode ? 'التبديل الفوري إلى الوضع الفاتح' : 'التبديل الفوري إلى الوضع الداكن'}
                className={`apple-btn flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer border shrink-0 ${
                  isDarkMode
                    ? 'bg-[#1D1D1F] text-amber-400 border-amber-400/30 shadow-2xs'
                    : 'bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] border-black/[0.06]'
                }`}
              >
                {isDarkMode ? (
                  <>
                    <Sun size={13} className="text-amber-400 shrink-0" />
                    <span>فاتح</span>
                  </>
                ) : (
                  <>
                    <Moon size={13} className="text-[#0071E3] shrink-0" />
                    <span>داكن</span>
                  </>
                )}
              </button>
            )}

            {onOpenThemeStudio && (
              <button
                type="button"
                onClick={onOpenThemeStudio}
                className="apple-btn flex-1 min-w-0 flex items-center justify-between px-2.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 text-[11px] font-black text-violet-900 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Palette size={13} className="text-violet-600 shrink-0" />
                  <span className="truncate">استوديو الثيمات</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-600 text-white shrink-0">
                  16
                </span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[10.5px] font-bold px-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              <span className="gemini-text-gradient-cyan">المتجر متصل</span>
            </span>
            <span dir="ltr" className="font-black text-[10px] tracking-tight apple-signature-text">
              Mohamed Mhran2027©
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
