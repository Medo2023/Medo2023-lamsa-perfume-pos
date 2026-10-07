import React, { useState, useEffect, useMemo } from 'react';
import { View, Product, CustomCustomerRecord, Sale, StoreSettings } from '../types';
import {
  Sparkles,
  ShieldCheck,
  Command,
  ShoppingBag,
  Users,
  Beaker,
  LayoutDashboard,
  Lock,
  Search,
  X,
  ArrowUpRight,
  Crown,
  CheckCircle2,
  Package,
  FileText,
  Sliders,
  Award,
  Zap
} from 'lucide-react';

interface AppleSignatureFooterProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onLockScreen?: () => void;
  onOpenDayOperations?: () => void;
  products?: Product[];
  customCustomers?: CustomCustomerRecord[];
  sales?: Sale[];
  settings?: StoreSettings;
  onSelectCustomerForPOS?: (cust: { name: string; phone: string }) => void;
  onOpenFormulationForProduct?: (product: Product) => void;
}

export const AppleSignatureFooter: React.FC<AppleSignatureFooterProps> = ({
  currentView,
  onNavigate,
  onLockScreen,
  onOpenDayOperations,
  products = [],
  customCustomers = [],
  sales = [],
  settings,
  onSelectCustomerForPOS,
  onOpenFormulationForProduct,
}) => {
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSpotlightModal, setShowSpotlightModal] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');

  const storeName = settings?.storeName || 'لَمْسَةُ عِطْر';
  const currency = settings?.currency || 'ج.م';

  // Global keyboard shortcuts (Alt+1..5, Alt+L, Ctrl+K / Cmd+K for Apple Spotlight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K opens Apple Spotlight Quick Command
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSpotlightModal((prev) => !prev);
        return;
      }

      // Ignore Alt shortcuts if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          onNavigate(View.DASHBOARD);
        } else if (e.key === '2') {
          e.preventDefault();
          onNavigate(View.POS);
        } else if (e.key === '3') {
          e.preventDefault();
          onNavigate(View.OPERATIONS_SYSTEM);
        } else if (e.key === '4') {
          e.preventDefault();
          onNavigate(View.FORMULATION_ENGINE);
        } else if (e.key === '5') {
          e.preventDefault();
          onNavigate(View.INVENTORY_INTELLIGENCE);
        } else if (e.key.toLowerCase() === 'l' && onLockScreen) {
          e.preventDefault();
          onLockScreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onLockScreen]);

  // Spotlight search results across Views, Perfumes, and Customers (Computed only when modal is open)
  const spotlightResults = useMemo(() => {
    if (!showSpotlightModal) {
      return { navItems: [], matchedProducts: [], matchedCustomers: [] };
    }
    const q = spotlightQuery.trim().toLowerCase();

    const navItems = [
      { id: View.POS, label: 'شاشة الكاشير والمبيعات السريعة', hint: 'Alt + 2', icon: ShoppingBag, color: 'text-[#0071E3] bg-blue-50' },
      { id: View.OPERATIONS_SYSTEM, label: 'نظام التارجت والمساهمة وتشجيع المبيعات', hint: 'Alt + 3', icon: Award, color: 'text-amber-600 bg-amber-50' },
      { id: View.FORMULATION_ENGINE, label: 'مختبر التركيب والتعتيق والتسعير الهندسي', hint: 'Alt + 4', icon: Beaker, color: 'text-indigo-600 bg-indigo-50' },
      { id: View.DASHBOARD, label: 'لوحة القيادة التنفيذية والتارجت', hint: 'Alt + 1', icon: LayoutDashboard, color: 'text-emerald-600 bg-emerald-50' },
      { id: View.INVENTORY_INTELLIGENCE, label: 'ذكاء المخزون والنواقص الحرجة', hint: 'Alt + 5', icon: Package, color: 'text-amber-600 bg-amber-50' },
      { id: View.REPORTS, label: 'سجل المبيعات والفواتير الشامل', hint: 'تقارير', icon: FileText, color: 'text-cyan-600 bg-cyan-50' },
      { id: View.SETTINGS, label: 'لوحة الإعدادات والتحكم الشاملة', hint: 'إعدادات', icon: Sliders, color: 'text-slate-700 bg-slate-100' },
    ].filter((item) => !q || item.label.toLowerCase().includes(q));

    const matchedProducts = q
      ? products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.brand && p.brand.toLowerCase().includes(q)) ||
              p.type.toLowerCase().includes(q)
          )
          .slice(0, 5)
      : products.slice(0, 3);

    const matchedCustomers = q
      ? customCustomers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.phone && c.phone.includes(q))
          )
          .slice(0, 4)
      : customCustomers.slice(0, 3);

    return { navItems, matchedProducts, matchedCustomers };
  }, [showSpotlightModal, spotlightQuery, products, customCustomers]);

  const todaySalesCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return sales.filter((s) => s.date && s.date.startsWith(todayStr)).length;
  }, [sales]);

  return (
    <>
      {/* ======================================================== */}
      {/* APPLE SMART COMPACT FOOTER BAR (Mohamed Mhran2027©)      */}
      {/* ======================================================== */}
      <footer
        aria-label="حقوق الملكية والوصول الذكي السريع"
        className="mx-3 sm:mx-5 lg:mx-6 mt-8 mb-5 select-none animate-in fade-in duration-300"
      >
        <div className="apple-glass rounded-2xl border border-black/[0.06] px-3.5 py-2 shadow-apple-xs flex flex-wrap items-center justify-between gap-2.5">
          {/* Right Zone: Store Status & Quick Navigation Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#48484A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
              <span>{storeName}</span>
            </span>

            <span className="text-black/15 text-xs" aria-hidden="true">·</span>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#636366]">
              <button
                type="button"
                onClick={() => onNavigate(View.POS)}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  currentView === View.POS
                    ? 'bg-[#0071E3]/10 text-[#0071E3] font-bold'
                    : 'hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                }`}
              >
                الكاشير
              </button>
              <span aria-hidden="true" className="text-black/15">·</span>
              <button
                type="button"
                onClick={() => onNavigate(View.OPERATIONS_SYSTEM)}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  currentView === View.OPERATIONS_SYSTEM
                    ? 'bg-amber-500/10 text-amber-700 font-bold'
                    : 'hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                }`}
              >
                التارجت والمساهمة
              </button>
              <span aria-hidden="true" className="text-black/15">·</span>
              <button
                type="button"
                onClick={() => onNavigate(View.FORMULATION_ENGINE)}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  currentView === View.FORMULATION_ENGINE
                    ? 'bg-indigo-500/10 text-indigo-700 font-bold'
                    : 'hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                }`}
              >
                مختبر التركيب
              </button>
            </div>

            {/* Apple Spotlight Quick Search Button */}
            <button
              type="button"
              onClick={() => {
                setSpotlightQuery('');
                setShowSpotlightModal(true);
              }}
              className="apple-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] border border-black/[0.06] text-[10px] font-bold text-[#1D1D1F] cursor-pointer whitespace-nowrap"
              title="البحث الذكي والتنقل السريع (Ctrl+K أو ⌘K)"
            >
              <Search size={11} className="text-[#0071E3]" />
              <span>بحث وتنقل سريع</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 rounded bg-white/90 border border-black/[0.08] font-mono text-[9px] text-[#86868B] shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Left/Center Zone: Sleek Apple Animated Copyright Badge (Mohamed Mhran2027©) */}
          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            <button
              type="button"
              onClick={() => setShowCertificateModal(true)}
              dir="ltr"
              className="apple-signature-badge group inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/[0.08] cursor-pointer"
              title="انقر لعرض بطاقة حقوق الملكية الفكرية وهندسة النظام — Mohamed Mhran2027©"
            >
              <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#1D1D1F] via-[#0071E3] to-[#C49746] flex items-center justify-center text-white shadow-2xs group-hover:rotate-12 transition-transform duration-200">
                <Crown size={9} className="fill-amber-300 text-amber-300" />
              </span>
              <span className="text-[11px] font-black tracking-tight apple-signature-text whitespace-nowrap">
                Mohamed Mhran2027©
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] group-hover:scale-125 transition-transform" />
            </button>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* APPLE SPOTLIGHT QUICK COMMAND & SEARCH MODAL (⌘K)        */}
      {/* ======================================================== */}
      {showSpotlightModal && (
        <div
          className="fixed inset-0 z-[150] bg-black/45 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
          onClick={() => setShowSpotlightModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apple-glass rounded-[28px] w-full max-w-xl border border-black/[0.12] shadow-2xl bg-white/95 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Header */}
            <div className="p-3.5 sm:p-4 border-b border-black/[0.07] flex items-center gap-3 bg-[#F5F5F7]/70">
              <div className="w-9 h-9 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Command size={17} />
              </div>
              <input
                type="text"
                autoFocus
                value={spotlightQuery}
                onChange={(e) => setSpotlightQuery(e.target.value)}
                placeholder="ابحث عن عطر، عميل، أو انتقل لأي قسم فوراً..."
                className="flex-1 bg-transparent text-sm font-bold text-[#1D1D1F] placeholder:text-[#86868B] outline-none"
              />
              {spotlightQuery && (
                <button
                  type="button"
                  onClick={() => setSpotlightQuery('')}
                  className="text-[11px] text-[#0071E3] font-bold px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer"
                >
                  مسح
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSpotlightModal(false)}
                className="w-8 h-8 rounded-full bg-black/[0.06] hover:bg-black/[0.1] flex items-center justify-center text-[#636366] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Results Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* Quick Navigation */}
              {spotlightResults.navItems.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-[#86868B] px-1 block">
                    الأقسام والتنقل الذكي السريع
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {spotlightResults.navItems.map((nav) => {
                      const Icon = nav.icon;
                      return (
                        <button
                          key={nav.id}
                          type="button"
                          onClick={() => {
                            onNavigate(nav.id);
                            setShowSpotlightModal(false);
                          }}
                          className="apple-btn flex items-center justify-between p-2.5 rounded-2xl bg-[#F5F5F7]/80 hover:bg-[#0071E3]/10 border border-black/[0.05] text-right transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${nav.color}`}>
                              <Icon size={15} />
                            </div>
                            <span className="text-xs font-bold text-[#1D1D1F] truncate group-hover:text-[#0071E3]">
                              {nav.label}
                            </span>
                          </div>
                          <span dir="ltr" className="text-[10px] font-mono text-[#86868B] bg-white px-2 py-0.5 rounded-md border border-black/[0.06] shrink-0">
                            {nav.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Perfumes Direct Access */}
              {spotlightResults.matchedProducts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-[#86868B] px-1 block">
                    العطور والزيوت الخام ({products.length} صنف متاح)
                  </span>
                  <div className="space-y-1">
                    {spotlightResults.matchedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-black/[0.06] hover:border-[#0071E3]/30 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#1D1D1F] truncate">{prod.name}</span>
                            <span className="text-[10px] text-[#86868B]">· {prod.brand}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#636366] tabular-nums">
                            المخزون المتاح: {prod.stock_grams} جرام · النوع: {prod.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onOpenFormulationForProduct && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenFormulationForProduct(prod);
                                setShowSpotlightModal(false);
                              }}
                              className="apple-btn px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                            >
                              معادلة التركيب
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate(View.POS);
                              setShowSpotlightModal(false);
                            }}
                            className="apple-btn px-2.5 py-1 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            بيع بالكاشير
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Direct Access */}
              {spotlightResults.matchedCustomers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-[#86868B] px-1 block">
                    العملاء المسجلون ({customCustomers.length} عميل)
                  </span>
                  <div className="space-y-1">
                    {spotlightResults.matchedCustomers.map((cust, i) => (
                      <div
                        key={`${cust.phone || cust.name}-${i}`}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-black/[0.06] hover:border-purple-300 transition-all"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-black text-[#1D1D1F] block truncate">{cust.name}</span>
                          <span dir="ltr" className="text-[10px] font-mono text-[#86868B] tabular-nums">
                            {cust.phone || 'بدون رقم واتساب'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onSelectCustomerForPOS && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCustomerForPOS({ name: cust.name, phone: cust.phone || '' });
                                setShowSpotlightModal(false);
                              }}
                              className="apple-btn px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap"
                            >
                              فتح فاتورة للعميل
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate(View.OPERATIONS_SYSTEM);
                              setShowSpotlightModal(false);
                            }}
                            className="apple-btn px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            نظام التارجت
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-[#F5F5F7] border-t border-black/[0.06] flex items-center justify-between text-[10px] text-[#86868B]">
              <span>اختصارات سريعة: Alt+1 الرئيسية · Alt+2 الكاشير · Alt+3 العملاء · Alt+4 التركيب</span>
              <span dir="ltr" className="font-black apple-signature-text">Mohamed Mhran2027©</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* APPLE INTELLECTUAL PROPERTY & ARCHITECTURE CERTIFICATE   */}
      {/* ======================================================== */}
      {showCertificateModal && (
        <div
          className="fixed inset-0 z-[160] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowCertificateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apple-glass rounded-[30px] p-6 w-full max-w-md border border-black/[0.12] shadow-2xl bg-white/95 space-y-5 relative overflow-hidden"
          >
            {/* Subtle Apple Ambient Glow */}
            <div className="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-gradient-to-br from-[#0071E3]/15 via-purple-500/10 to-amber-500/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1D1D1F] via-[#0071E3] to-[#C49746] text-white flex items-center justify-center shadow-sm">
                  <Award size={20} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1D1D1F]">بطاقة الحقوق والملكية الفكرية</h3>
                  <span className="text-[11px] text-[#86868B]">Apple Human Interface Executive Edition</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#636366] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Center Signature Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1D1D1F] via-[#141416] to-[#2C2C2E] text-white text-center space-y-2.5 shadow-lg border border-white/10 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-amber-300">
                <Sparkles size={11} />
                <span>النسخة التنفيذية المعتمدة 2027</span>
              </div>
              <div dir="ltr" className="text-xl sm:text-2xl font-black tracking-tight apple-signature-text-dark py-1">
                Mohamed Mhran2027©
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                جميع حقوق التصميم والبرمجة وهندسة التشغيل المالي والذكاء الاصطناعي محفوظة بالكامل لصالح
                <strong className="text-amber-300 mx-1">د. محمد مهران (Mohamed Mhran)</strong>.
              </p>
            </div>

            {/* Live System Telemetry Summary */}
            <div className="grid grid-cols-3 gap-2 text-center relative z-10">
              <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">الأصناف العطرية</span>
                <span className="text-xs font-black font-mono text-[#1D1D1F] tabular-nums">{products.length} صنف</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">قاعدة العملاء</span>
                <span className="text-xs font-black font-mono text-[#0071E3] tabular-nums">{customCustomers.length} عميل</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                <span className="text-[10px] text-[#86868B] block">فواتير اليوم</span>
                <span className="text-xs font-black font-mono text-emerald-700 tabular-nums">{todaySalesCount} فاتورة</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setShowCertificateModal(false);
                  setShowSpotlightModal(true);
                }}
                className="apple-btn flex-1 py-2.5 rounded-2xl bg-[#F5F5F7] hover:bg-black/[0.08] text-[#1D1D1F] text-xs font-bold flex items-center justify-center gap-1.5 border border-black/[0.08] cursor-pointer"
              >
                <Zap size={14} className="text-[#0071E3]" />
                <span>فتح الباحث الذكي (⌘K)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="apple-btn flex-1 py-2.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>تم الاطلاع</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppleSignatureFooter;
