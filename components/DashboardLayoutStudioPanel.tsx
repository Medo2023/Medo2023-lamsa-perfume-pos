import React, { useState, useMemo } from 'react';
import {
  StoreSettings,
  AppUser,
  DashboardKpiCardId,
  DashboardSectionId,
  DashboardLayoutConfig,
  DashboardLayoutPresetId,
  DASHBOARD_KPI_CARD_DEFINITIONS,
  DASHBOARD_SECTION_DEFINITIONS,
  DEFAULT_DASHBOARD_LAYOUT_CONFIG,
  resolveDashboardLayoutConfig,
} from '../types';
import {
  Layout,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sparkles,
  Sliders,
  DollarSign,
  ShieldCheck,
  GripVertical,
  Layers,
} from 'lucide-react';

interface DashboardLayoutStudioPanelProps {
  settings: StoreSettings;
  onUpdateSettings: (updater: (prev: StoreSettings) => StoreSettings) => void;
  currentUser?: AppUser | null;
  onNotify?: (message: string) => void;
  onNavigateToDashboard?: () => void;
}

const PRESET_DEFINITIONS: {
  id: DashboardLayoutPresetId;
  title: string;
  badge: string;
  description: string;
  cardOrder: DashboardKpiCardId[];
  visibleCards: DashboardKpiCardId[];
}[] = [
  {
    id: 'balanced_default',
    title: 'الترتيب المتوازن الشامل',
    badge: 'الافتراضي المعتمد',
    description: 'يعرض كافة البطاقات المالية والتشغيلية بتسلسل متوازن يربط المبيعات بالتكلفة والمساهمة والربح.',
    cardOrder: [
      'today_revenue',
      'today_cogs',
      'today_net_contribution',
      'real_net_profit',
      'today_target',
      'accumulated_deficit',
      'monthly_budget_15k',
      'distributable_profit',
      'cash_in_drawer',
      'bottles_and_essence',
      'reserved_inventory_capital',
      'commissions_and_incentives',
    ],
    visibleCards: [
      'today_revenue',
      'today_cogs',
      'today_net_contribution',
      'real_net_profit',
      'today_target',
      'accumulated_deficit',
      'monthly_budget_15k',
      'distributable_profit',
      'cash_in_drawer',
      'bottles_and_essence',
      'reserved_inventory_capital',
      'commissions_and_incentives',
    ],
  },
  {
    id: 'financial_priority',
    title: 'الأولوية المالية والأرباح الصافية',
    badge: 'تركيز مالي للمالك',
    description: 'يضع الربح القابل للتوزيع، وصافي الربح الفعلي، والمساهمة، والسيولة النقدية، والموازنة في الصدارة.',
    cardOrder: [
      'distributable_profit',
      'real_net_profit',
      'today_net_contribution',
      'today_revenue',
      'cash_in_drawer',
      'monthly_budget_15k',
      'accumulated_deficit',
      'today_cogs',
      'reserved_inventory_capital',
      'commissions_and_incentives',
      'today_target',
      'bottles_and_essence',
    ],
    visibleCards: [
      'distributable_profit',
      'real_net_profit',
      'today_net_contribution',
      'today_revenue',
      'cash_in_drawer',
      'monthly_budget_15k',
      'accumulated_deficit',
      'today_cogs',
      'reserved_inventory_capital',
      'commissions_and_incentives',
      'today_target',
      'bottles_and_essence',
    ],
  },
  {
    id: 'operational_priority',
    title: 'الأولوية التشغيلية والمبيعات والتارجت',
    badge: 'تركيز تشغيلي وبيعي',
    description: 'يضع التارجت اليومي، ومبيعات اليوم، والعبوات واستهلاك الزيوت، وعمولات وحوافز المبيعات في المقدمة.',
    cardOrder: [
      'today_target',
      'today_revenue',
      'bottles_and_essence',
      'commissions_and_incentives',
      'cash_in_drawer',
      'today_net_contribution',
      'real_net_profit',
      'reserved_inventory_capital',
      'today_cogs',
      'monthly_budget_15k',
      'accumulated_deficit',
      'distributable_profit',
    ],
    visibleCards: [
      'today_target',
      'today_revenue',
      'bottles_and_essence',
      'commissions_and_incentives',
      'cash_in_drawer',
      'today_net_contribution',
      'real_net_profit',
      'reserved_inventory_capital',
      'today_cogs',
      'monthly_budget_15k',
      'accumulated_deficit',
      'distributable_profit',
    ],
  },
  {
    id: 'executive_compact',
    title: 'الوضع التنفيذي المختصر (أهم 4 بطاقات)',
    badge: 'قراءة سريعة مركزة',
    description: 'يُظهر أهم 4 مؤشرات حاسمة فقط (مبيعات اليوم، المساهمة الصافية، صافي الربح الفعلي، والربح المتاح للتوزيع).',
    cardOrder: [
      'today_revenue',
      'today_net_contribution',
      'real_net_profit',
      'distributable_profit',
      'cash_in_drawer',
      'today_target',
      'monthly_budget_15k',
      'accumulated_deficit',
      'today_cogs',
      'bottles_and_essence',
      'reserved_inventory_capital',
      'commissions_and_incentives',
    ],
    visibleCards: [
      'today_revenue',
      'today_net_contribution',
      'real_net_profit',
      'distributable_profit',
    ],
  },
];

export const DashboardLayoutStudioPanel: React.FC<DashboardLayoutStudioPanelProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onNotify,
  onNavigateToDashboard,
}) => {
  const isOwner = !currentUser || currentUser.role === 'OWNER';

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'مالي' | 'تشغيلي' | 'visible'>('all');
  const [draggedCardId, setDraggedCardId] = useState<DashboardKpiCardId | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<DashboardSectionId | null>(null);

  const layoutConfig = useMemo(() => resolveDashboardLayoutConfig(settings), [settings]);

  const orderedKpiCards = useMemo(() => {
    return layoutConfig.kpiCards
      .map((item) => {
        const meta = DASHBOARD_KPI_CARD_DEFINITIONS.find((d) => d.id === item.id);
        return meta ? { ...item, meta } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.order - b.order);
  }, [layoutConfig.kpiCards]);

  const filteredKpiCards = useMemo(() => {
    if (categoryFilter === 'all') return orderedKpiCards;
    if (categoryFilter === 'visible') return orderedKpiCards.filter((c) => c.visible);
    if (categoryFilter === 'مالي') {
      return orderedKpiCards.filter((c) => c.meta.category === 'مالي' || c.meta.category === 'مالي وتشغيلي');
    }
    return orderedKpiCards.filter((c) => c.meta.category === 'تشغيلي' || c.meta.category === 'مالي وتشغيلي');
  }, [orderedKpiCards, categoryFilter]);

  const orderedSections = useMemo(() => {
    return layoutConfig.sections
      .map((sec) => {
        const meta = DASHBOARD_SECTION_DEFINITIONS.find((d) => d.id === sec.id);
        return meta ? { ...sec, meta } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.order - b.order);
  }, [layoutConfig.sections]);

  const visibleKpiCount = useMemo(
    () => orderedKpiCards.filter((c) => c.visible).length,
    [orderedKpiCards]
  );

  const applyLayoutUpdate = (nextConfig: DashboardLayoutConfig, toastText?: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      dashboardLayout: nextConfig,
    }));
    if (toastText && onNotify) {
      onNotify(toastText);
    }
  };

  const handleSelectPreset = (presetId: DashboardLayoutPresetId) => {
    const preset = PRESET_DEFINITIONS.find((p) => p.id === presetId);
    if (!preset) return;

    const nextKpiCards = preset.cardOrder.map((cardId, index) => ({
      id: cardId,
      visible: preset.visibleCards.includes(cardId),
      order: index + 1,
    }));

    applyLayoutUpdate(
      {
        ...layoutConfig,
        presetName: preset.id,
        kpiCards: nextKpiCards,
      },
      `تم تطبيق قالب "${preset.title}" لشاشة Dashboard فوراً.`
    );
  };

  const handleToggleCardVisibility = (cardId: DashboardKpiCardId) => {
    const target = orderedKpiCards.find((c) => c.id === cardId);
    if (!target) return;

    if (target.visible && visibleKpiCount <= 1) {
      if (onNotify) onNotify('يجب الإبقاء على بطاقة واحدة على الأقل ظاهرة في شاشة Dashboard.');
      return;
    }

    const nextKpiCards = orderedKpiCards.map((c, idx) => ({
      id: c.id,
      visible: c.id === cardId ? !c.visible : c.visible,
      order: idx + 1,
    }));

    applyLayoutUpdate(
      {
        ...layoutConfig,
        presetName: 'custom',
        kpiCards: nextKpiCards,
      },
      target.visible
        ? `تم إخفاء بطاقة "${target.meta.titleAr}" من شاشة Dashboard.`
        : `تم إظهار بطاقة "${target.meta.titleAr}" في شاشة Dashboard.`
    );
  };

  const handleMoveCard = (cardId: DashboardKpiCardId, direction: 'up' | 'down' | 'top') => {
    const currentIndex = orderedKpiCards.findIndex((c) => c.id === cardId);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'up') targetIndex = Math.max(0, currentIndex - 1);
    else if (direction === 'down') targetIndex = Math.min(orderedKpiCards.length - 1, currentIndex + 1);
    else if (direction === 'top') targetIndex = 0;

    if (targetIndex === currentIndex) return;

    const list = [...orderedKpiCards];
    const [moved] = list.splice(currentIndex, 1);
    list.splice(targetIndex, 0, moved);

    const nextKpiCards = list.map((item, idx) => ({
      id: item.id,
      visible: item.visible,
      order: idx + 1,
    }));

    applyLayoutUpdate(
      {
        ...layoutConfig,
        presetName: 'custom',
        kpiCards: nextKpiCards,
      },
      direction === 'top'
        ? `تم نقل "${moved.meta.titleAr}" إلى المركز الأول (#1).`
        : `تم تحديث ترتيب بطاقة "${moved.meta.titleAr}" إلى المركز #${targetIndex + 1}.`
    );
  };

  const handleDropCard = (targetCardId: DashboardKpiCardId) => {
    if (!draggedCardId || draggedCardId === targetCardId) {
      setDraggedCardId(null);
      return;
    }

    const fromIndex = orderedKpiCards.findIndex((c) => c.id === draggedCardId);
    const toIndex = orderedKpiCards.findIndex((c) => c.id === targetCardId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedCardId(null);
      return;
    }

    const list = [...orderedKpiCards];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const nextKpiCards = list.map((item, idx) => ({
      id: item.id,
      visible: item.visible,
      order: idx + 1,
    }));

    setDraggedCardId(null);
    applyLayoutUpdate(
      {
        ...layoutConfig,
        presetName: 'custom',
        kpiCards: nextKpiCards,
      },
      `تم نقل "${moved.meta.titleAr}" إلى المركز #${toIndex + 1}.`
    );
  };

  const handleToggleSectionVisibility = (sectionId: DashboardSectionId) => {
    const target = orderedSections.find((s) => s.id === sectionId);
    if (!target) return;

    const visibleSectionsCount = orderedSections.filter((s) => s.visible).length;
    if (target.visible && visibleSectionsCount <= 1) {
      if (onNotify) onNotify('يجب الإبقاء على قسم رئيسي واحد على الأقل ظاهراً في شاشة Dashboard.');
      return;
    }

    const nextSections = orderedSections.map((s, idx) => ({
      id: s.id,
      visible: s.id === sectionId ? !s.visible : s.visible,
      order: idx + 1,
    }));

    applyLayoutUpdate(
      {
        ...layoutConfig,
        presetName: 'custom',
        sections: nextSections,
      },
      target.visible
        ? `تم إخفاء قسم "${target.meta.titleAr}".`
        : `تم إظهار قسم "${target.meta.titleAr}".`
    );
  };

  const handleMoveSection = (sectionId: DashboardSectionId, direction: 'up' | 'down') => {
    const currentIndex = orderedSections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === 'up'
        ? Math.max(0, currentIndex - 1)
        : Math.min(orderedSections.length - 1, currentIndex + 1);

    if (targetIndex === currentIndex) return;

    const list = [...orderedSections];
    const [moved] = list.splice(currentIndex, 1);
    list.splice(targetIndex, 0, moved);

    const nextSections = list.map((sec, idx) => ({
      id: sec.id,
      visible: sec.visible,
      order: idx + 1,
    }));

    applyLayoutUpdate(
      {
        ...layoutConfig,
        presetName: 'custom',
        sections: nextSections,
      },
      `تم تحديث ترتيب قسم "${moved.meta.titleAr}".`
    );
  };

  const handleShowAllCards = () => {
    const nextKpiCards = orderedKpiCards.map((c, idx) => ({
      id: c.id,
      visible: true,
      order: idx + 1,
    }));
    const nextSections = orderedSections.map((s, idx) => ({
      id: s.id,
      visible: true,
      order: idx + 1,
    }));
    applyLayoutUpdate(
      {
        ...layoutConfig,
        kpiCards: nextKpiCards,
        sections: nextSections,
      },
      'تم إظهار كافة البطاقات والأقسام في شاشة Dashboard.'
    );
  };

  const handleResetDefaultLayout = () => {
    applyLayoutUpdate(
      DEFAULT_DASHBOARD_LAYOUT_CONFIG,
      'تمت استعادة الترتيب والتكوين الافتراضي المعتمد لشاشة Dashboard.'
    );
  };

  if (!isOwner) {
    return (
      <div className="apple-glass rounded-3xl p-6 sm:p-8 border border-amber-500/25 bg-amber-500/5 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center mx-auto">
          <Lock size={24} />
        </div>
        <h3 className="text-base font-black text-[#1D1D1F]">
          تخصيص بطاقات وتقارير Dashboard متاح لصاحب المتجر (المالك فقط)
        </h3>
        <p className="text-xs text-[#86868B] max-w-md mx-auto leading-relaxed">
          هذه الميزة مخصصة حصرياً للدكتور محمد (مالك المتجر) لترتيب وإظهار أو إخفاء التقارير المالية والتشغيلية التنفيذية حسب أولوياته الإدارية.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-apple-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1D1D1F] to-[#3A3A3C] text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
              <Layout size={23} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#1D1D1F]">
                  تخصيص وترتيب بطاقات شاشة Dashboard (للمالك فقط)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-900 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-amber-700" />
                  <span>صلاحية المالك حصرياً</span>
                </span>
              </div>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                رتّب أهم التقارير المالية والتشغيلية حسب أولوياتك، أو أخفِ البطاقات الثانوية لتحصل على شاشة قيادة تنفيذية مفصّلة على مقاسك تماماً. يُحفظ اختيارك تلقائياً.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShowAllCards}
              className="apple-btn px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye size={14} />
              <span>إظهار الكل</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaultLayout}
              className="apple-btn px-3 py-2 rounded-xl bg-white border border-black/[0.08] text-[#1D1D1F] text-xs font-bold hover:bg-black/[0.03] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>الترتيب الافتراضي</span>
            </button>

            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="apple-btn px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black shadow-apple-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>معاينة شاشة Dashboard</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Quick Layout Presets */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
              <Sliders size={14} className="text-[#0071E3]" />
              <span>قوالب الترتيب الذكية الجاهزة (اضغط للتطبيق الفوري):</span>
            </span>
            <span className="text-[11px] font-bold text-[#86868B]">
              البطاقات المعروضة حالياً: <strong className="text-[#0071E3] font-mono">{visibleKpiCount}</strong> من {orderedKpiCards.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESET_DEFINITIONS.map((preset) => {
              const isSelected = layoutConfig.presetName === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-apple-sm'
                      : 'bg-white/90 hover:bg-white text-[#1D1D1F] border-black/[0.08]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-amber-400 text-black'
                            : 'bg-[#0071E3]/10 text-[#0071E3]'
                        }`}
                      >
                        {preset.badge}
                      </span>
                      {isSelected && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
                    </div>
                    <h4 className={`text-xs font-black ${isSelected ? 'text-white' : 'text-[#1D1D1F]'}`}>
                      {preset.title}
                    </h4>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isSelected ? 'text-gray-300' : 'text-[#86868B]'}`}>
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Live Visual Order Preview Bar */}
      <div className="apple-glass rounded-3xl p-4 sm:p-5 border border-black/[0.06] bg-gradient-to-br from-white via-[#FBFBFD] to-[#F5F5F7] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <h3 className="text-xs font-black text-[#1D1D1F]">
              معاينة حية لترتيب ظهور البطاقات في شاشة Dashboard (من الأول للأخير):
            </h3>
          </div>
          <span className="text-[11px] text-[#86868B]">
            اسحب أي بطاقة بالأسفل أو استخدم أسهم الترتيب (↑ ↓) لتغيير موقعها
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {orderedKpiCards
            .filter((c) => c.visible)
            .map((card, idx) => (
              <div
                key={card.id}
                className="p-2.5 rounded-2xl bg-white border border-black/[0.07] shadow-2xs flex items-center gap-2"
              >
                <span className="w-6 h-6 rounded-lg bg-[#1D1D1F] text-amber-300 font-mono text-[11px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-black text-[#1D1D1F] block truncate">
                    {card.meta.titleAr}
                  </span>
                  <span
                    className={`text-[9px] font-bold ${
                      card.meta.category === 'مالي'
                        ? 'text-emerald-700'
                        : card.meta.category === 'تشغيلي'
                        ? 'text-[#0071E3]'
                        : 'text-amber-700'
                    }`}
                  >
                    تقرير {card.meta.category}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 4. Granular KPI Cards Reordering & Visibility List */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-apple-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#1D1D1F] flex items-center gap-2">
              <DollarSign size={17} className="text-[#0071E3]" />
              <span>ترتيب وتخصيص بطاقات التقارير المالية والتشغيلية (12 بطاقة)</span>
            </h3>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              رتّب البطاقات بالأولوية التي تناسب متابعتك اليومية (يمكنك السحب والإفلات أو استخدام أزرار الترتيب).
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F5F5F7] p-1 rounded-2xl border border-black/[0.06]">
            {[
              { id: 'all', label: `الكل (${orderedKpiCards.length})` },
              { id: 'مالي', label: 'المالية' },
              { id: 'تشغيلي', label: 'التشغيلية' },
              { id: 'visible', label: `الظاهرة (${visibleKpiCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  categoryFilter === tab.id
                    ? 'bg-[#1D1D1F] text-white shadow-2xs'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredKpiCards.map((item) => {
            const globalIndex = orderedKpiCards.findIndex((c) => c.id === item.id);
            const isFirst = globalIndex === 0;
            const isLast = globalIndex === orderedKpiCards.length - 1;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedCardId(item.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropCard(item.id)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.visible
                    ? 'bg-white border-black/[0.08] shadow-2xs hover:border-[#0071E3]/40'
                    : 'bg-black/[0.02] border-black/[0.05] opacity-65'
                } ${draggedCardId === item.id ? 'ring-2 ring-[#0071E3] opacity-50' : ''}`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div
                    className="cursor-grab active:cursor-grabbing text-[#86868B] hover:text-[#1D1D1F] p-1 hidden sm:flex items-center"
                    title="اسحب لإعادة الترتيب"
                  >
                    <GripVertical size={16} />
                  </div>

                  <div
                    className={`w-9 h-9 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                      item.visible
                        ? 'bg-[#1D1D1F] text-amber-300 shadow-2xs'
                        : 'bg-black/[0.06] text-[#86868B]'
                    }`}
                  >
                    #{globalIndex + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                        {item.meta.titleAr}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.meta.category === 'مالي'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.meta.category === 'تشغيلي'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        {item.meta.category}
                      </span>
                      {!item.visible && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          مخفي من Dashboard
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#86868B] mt-0.5 leading-relaxed">
                      {item.meta.subtitleAr}
                    </p>
                  </div>
                </div>

                {/* Action Controls: Move Top, Up, Down, Toggle Visibility */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.04]">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMoveCard(item.id, 'top')}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all ${
                      isFirst
                        ? 'bg-black/[0.02] border-black/[0.04] text-gray-300 cursor-not-allowed'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-900 hover:bg-amber-500/20 cursor-pointer'
                    }`}
                    title="نقل إلى المركز الأول (#1)"
                  >
                    <ChevronsUp size={13} />
                    <span className="hidden md:inline">للأول</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMoveCard(item.id, 'up')}
                    className={`p-2 rounded-xl border transition-all ${
                      isFirst
                        ? 'bg-black/[0.02] border-black/[0.04] text-gray-300 cursor-not-allowed'
                        : 'bg-white border-black/[0.08] text-[#1D1D1F] hover:bg-black/[0.04] cursor-pointer'
                    }`}
                    title="تحريك لأعلى"
                  >
                    <ArrowUp size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMoveCard(item.id, 'down')}
                    className={`p-2 rounded-xl border transition-all ${
                      isLast
                        ? 'bg-black/[0.02] border-black/[0.04] text-gray-300 cursor-not-allowed'
                        : 'bg-white border-black/[0.08] text-[#1D1D1F] hover:bg-black/[0.04] cursor-pointer'
                    }`}
                    title="تحريك لأسفل"
                  >
                    <ArrowDown size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleCardVisibility(item.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      item.visible
                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                        : 'bg-white text-[#86868B] border-black/[0.1] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>{item.visible ? 'ظاهر' : 'مخفي'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Major Dashboard Sections Order & Visibility */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-apple-card space-y-4">
        <div className="pb-3 border-b border-black/[0.06]">
          <h3 className="text-sm sm:text-base font-black text-[#1D1D1F] flex items-center gap-2">
            <Layers size={17} className="text-[#C49746]" />
            <span>ترتيب وتخصيص الأقسام الرئيسية في شاشة Dashboard (5 أقسام كبرى)</span>
          </h3>
          <p className="text-[11px] text-[#86868B] mt-0.5">
            تحكم في ترتيب ظهور الوحدات الكبرى داخل شاشة Dashboard (مثل تقديم شبكة البطاقات المالية قبل المستشار الذكي أو العكس).
          </p>
        </div>

        <div className="space-y-2.5">
          {orderedSections.map((sec, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === orderedSections.length - 1;

            return (
              <div
                key={sec.id}
                draggable
                onDragStart={() => setDraggedSectionId(sec.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!draggedSectionId || draggedSectionId === sec.id) {
                    setDraggedSectionId(null);
                    return;
                  }
                  const fromIdx = orderedSections.findIndex((s) => s.id === draggedSectionId);
                  const toIdx = idx;
                  if (fromIdx === -1) return;
                  const list = [...orderedSections];
                  const [moved] = list.splice(fromIdx, 1);
                  list.splice(toIdx, 0, moved);
                  setDraggedSectionId(null);
                  applyLayoutUpdate(
                    {
                      ...layoutConfig,
                      presetName: 'custom',
                      sections: list.map((s, i) => ({
                        id: s.id,
                        visible: s.visible,
                        order: i + 1,
                      })),
                    },
                    `تم نقل قسم "${moved.meta.titleAr}" إلى المركز #${toIdx + 1}.`
                  );
                }}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  sec.visible
                    ? 'bg-white border-black/[0.08] shadow-2xs'
                    : 'bg-black/[0.02] border-black/[0.05] opacity-65'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] font-mono text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                        {sec.meta.titleAr}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/[0.04] text-[#86868B]">
                        {sec.meta.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#86868B] mt-0.5">{sec.meta.subtitleAr}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMoveSection(sec.id, 'up')}
                    className={`p-2 rounded-xl border transition-all ${
                      isFirst
                        ? 'bg-black/[0.02] border-black/[0.04] text-gray-300 cursor-not-allowed'
                        : 'bg-white border-black/[0.08] text-[#1D1D1F] hover:bg-black/[0.04] cursor-pointer'
                    }`}
                    title="تحريك القسم لأعلى"
                  >
                    <ArrowUp size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMoveSection(sec.id, 'down')}
                    className={`p-2 rounded-xl border transition-all ${
                      isLast
                        ? 'bg-black/[0.02] border-black/[0.04] text-gray-300 cursor-not-allowed'
                        : 'bg-white border-black/[0.08] text-[#1D1D1F] hover:bg-black/[0.04] cursor-pointer'
                    }`}
                    title="تحريك القسم لأسفل"
                  >
                    <ArrowDown size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSectionVisibility(sec.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sec.visible
                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                        : 'bg-white text-[#86868B] border-black/[0.1] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {sec.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>{sec.visible ? 'ظاهر' : 'مخفي'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayoutStudioPanel;
