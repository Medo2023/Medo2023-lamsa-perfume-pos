import React, { useState, useMemo } from 'react';
import {
  APP_THEMES,
  AppThemeDefinition,
  StoreSettings,
  TypingInteractionStyle,
  SiteFontFamilyId,
  SiteFontWeightId,
  SiteFontStrokeId,
  SiteNumeralSystem,
  ThemeSurfaceStyleId,
  SiteHeadingColorMode,
  resolveActiveAppTheme,
  convertDigitsToSystem,
} from '../types';
import {
  Palette,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Check,
  RotateCcw,
  Shuffle,
  X,
  Layers,
  Eye,
  Flame,
  Keyboard,
  Sliders,
  Activity,
  Waves,
  CheckCircle2,
  Type,
  Hash,
  Minus,
  Plus,
  AlignJustify,
  Crown,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

const FONT_FAMILY_LIBRARY: Array<{
  id: SiteFontFamilyId;
  nameAr: string;
  nameEn: string;
  desc: string;
  badge: string;
  cssFamily: string;
}> = [
  {
    id: 'readex',
    nameAr: 'ريدكس برو (Readex Pro)',
    nameEn: 'Apple Modern Sans',
    desc: 'خط هندسي عصري فائق الوضوح ومريح للعين في الأرقام والجداول',
    badge: 'الافتراضي ✨',
    cssFamily: '"Readex Pro", sans-serif',
  },
  {
    id: 'tajawal',
    nameAr: 'تجوال الملكي (Tajawal)',
    nameEn: 'Elegant Geometric',
    desc: 'خط انسيابي ناعم وأنيق يمنح الواجهة طابعاً راقياً وعصرياً',
    badge: 'أنيق وناعم',
    cssFamily: '"Tajawal", sans-serif',
  },
  {
    id: 'cairo',
    nameAr: 'القاهرة الاحترافي (Cairo)',
    nameEn: 'Accounting Classic',
    desc: 'أعلى درجات الوضوح المحاسبي للأرقام والفواتير والبيانات الكثيفة',
    badge: 'ممتاز للمحاسبة',
    cssFamily: '"Cairo", sans-serif',
  },
  {
    id: 'ibm_plex',
    nameAr: 'آي بي إم بليكس (IBM Plex)',
    nameEn: 'Executive Tech',
    desc: 'تصميم هندسي دقيق جداً مخصص للأنظمة المالية ولوحات القيادة',
    badge: 'دقة تقنية',
    cssFamily: '"IBM Plex Sans Arabic", sans-serif',
  },
  {
    id: 'almarai',
    nameAr: 'المراعي الواضح (Almarai)',
    nameEn: 'Ultra Legible',
    desc: 'حروف متزنة ومقروئية استثنائية حتى في الأحجام الصغيرة والمدمجة',
    badge: 'مقروئية فائقة',
    cssFamily: '"Almarai", sans-serif',
  },
  {
    id: 'noto_kufi',
    nameAr: 'نوتو كوفي (Noto Kufi)',
    nameEn: 'Luxury Kufi',
    desc: 'طابع كوفي هندسي فخم يبرز العناوين وأسماء العطور الشرقية والفرنسية',
    badge: 'كوفي فاخر',
    cssFamily: '"Noto Kufi Arabic", sans-serif',
  },
  {
    id: 'changa',
    nameAr: 'شانجا العصري (Changa)',
    nameEn: 'Modern Display',
    desc: 'حواف عصرية جريئة تمنح شاشات الكاشير والأرقام حضوراً قوياً',
    badge: 'جريء وعصري',
    cssFamily: '"Changa", sans-serif',
  },
  {
    id: 'amiri',
    nameAr: 'أميري الكلاسيكي (Amiri)',
    nameEn: 'Royal Naskh Serif',
    desc: 'خط نسخ ملكي أصيل يعكس تراث العطور الشرقية والعود المعتق',
    badge: 'تراثي ملكي',
    cssFamily: '"Amiri", serif',
  },
];

const FONT_WEIGHT_OPTIONS: Array<{
  id: SiteFontWeightId;
  label: string;
  num: string;
  desc: string;
}> = [
  { id: 'light', label: 'نحيف (Light)', num: '300', desc: 'خفيف وناعم' },
  { id: 'regular', label: 'قياسي (Regular)', num: '400', desc: 'الافتراضي المتوازن' },
  { id: 'medium', label: 'متوسط (Medium)', num: '500', desc: 'وضوح يومي مريح' },
  { id: 'semibold', label: 'شبه عريض (SemiBold)', num: '600', desc: 'بارز ومقروء' },
  { id: 'bold', label: 'عريض (Bold)', num: '700', desc: 'قوي وواضح جداً' },
  { id: 'extrabold', label: 'عريض جداً (ExtraBold)', num: '800', desc: 'كثافة عالية' },
  { id: 'black', label: 'فائق السماكة (Black)', num: '900', desc: 'أقصى سماكة ممكنة' },
];

const FONT_STROKE_OPTIONS: Array<{
  id: SiteFontStrokeId;
  label: string;
  px: string;
  desc: string;
}> = [
  { id: 'none', label: 'طبيعي (بدون حد)', px: '0px', desc: 'نعومة أبل القياسية' },
  { id: 'crisp', label: 'حاد ونقي (Crisp)', px: '0.15px', desc: 'إبراز خفيف للحروف' },
  { id: 'medium', label: 'سمك متوسط', px: '0.32px', desc: 'امتلاء واضح ومريح' },
  { id: 'bold_stroke', label: 'سمك عريض غني', px: '0.50px', desc: 'حروف ممتلئة وقوية' },
  { id: 'heavy_stroke', label: 'سمك فائق القوة', px: '0.72px', desc: 'أعلى بروز بصري' },
];

const PRIMARY_TEXT_COLOR_SWATCHES: Array<{ color: string; name: string }> = [
  { color: '#1D1D1F', name: 'كربوني أبل (الافتراضي)' },
  { color: '#000000', name: 'أسود حالك فائق التباين' },
  { color: '#0F172A', name: 'كحلي ملكي عميق' },
  { color: '#231C14', name: 'إسبريسو العود الملكي' },
  { color: '#281114', name: 'عنابي بكرات المخملي' },
  { color: '#06281E', name: 'أخضر زمردي داكن' },
  { color: '#1E1B4B', name: 'نيلي إمبراطوري' },
  { color: '#2C2C2E', name: 'رمادي تيتانيوم داكن' },
  { color: '#0C4A6E', name: 'ياقوتي محيطي' },
  { color: '#581C87', name: 'أرجواني ملكي عميق' },
  { color: '#78350F', name: 'عنبر ذهبي معتق' },
  { color: '#F8FAFC', name: 'أبيض ثلجي (للثيم الداكن)' },
  { color: '#FAF6F0', name: 'لؤلؤي دافئ (للثيم الداكن)' },
  { color: '#FEF08A', name: 'شامبانيا مضيء (للثيم الداكن)' },
];

const SECONDARY_TEXT_COLOR_SWATCHES: Array<{ color: string; name: string }> = [
  { color: '#86868B', name: 'رمادي أبل القياسي' },
  { color: '#475569', name: 'أردوازي واضح عالي المقروئية' },
  { color: '#334155', name: 'داكن رسمي واضح' },
  { color: '#7E705E', name: 'برونزي دافئ' },
  { color: '#5F7561', name: 'زيتوني هادئ' },
  { color: '#6D28D9', name: 'بنفسجي ناعم' },
  { color: '#0369A1', name: 'أزرق محيطي هادئ' },
  { color: '#9A3412', name: 'تيراكوتا دافئ' },
  { color: '#94A3B8', name: 'فضي ليلي (للثيم الداكن)' },
  { color: '#CBD5E1', name: 'بلاتيني فاتح (للثيم الداكن)' },
];

const SURFACE_STYLE_LIBRARY: Array<{
  id: ThemeSurfaceStyleId;
  nameAr: string;
  desc: string;
  badge: string;
}> = [
  {
    id: 'win12_apple_mica_hybrid',
    nameAr: 'هجين أبل وويندوز 12 ميكا (Apple Sequoia × Win 12 Mica)',
    desc: 'خامات ميكا وأكريليك ويندوز 12 ممزوجة بزجاج أبل السائل وحواف الكريستال المضيئة',
    badge: 'تحفة هجينة ✨',
  },
  {
    id: 'lavender_clay_3d',
    nameAr: 'كلايمورفيزم اللافندر البلوري (3D Clay & Frosted Glass)',
    desc: 'بطاقات وأزرار ثلاثية الأبعاد بلمعان داخلي ناعم وزجاج مصنفر فاخر',
    badge: 'تصميم 3D فاخر ✨',
  },
  {
    id: 'liquid_glass',
    nameAr: 'زجاج أبل السائل (Liquid Glass)',
    desc: 'شفافية بلورية ناعمة مع ظلال هوائية متوازنة',
    badge: 'الافتراضي',
  },
  {
    id: 'crystal_border',
    nameAr: 'إطار كريستالي مشرق (Crystal Specular)',
    desc: 'حدود مضيئة بارزة تمنح البطاقات بريقاً زجاجياً فاخراً',
    badge: 'جديد ✨',
  },
  {
    id: 'royal_gold_trim',
    nameAr: 'تطعيم ذهبي ملكي (Royal Gold Trim)',
    desc: 'إطارات مطعمة بلمسة الذهب الخالص لعشاق الفخامة الشرقية',
    badge: 'ملكي فاخر',
  },
  {
    id: 'silk_matte',
    nameAr: 'حرير مطفي هادئ (Silk Matte)',
    desc: 'أسطح ناعمة خالية من اللمعان والظلال المشتتة لراحة العين',
    badge: 'مريح للعين',
  },
  {
    id: 'neo_bento',
    nameAr: 'بينتو هندسي عالي التباين (Neo Bento)',
    desc: 'حدود هندسية صريحة وواضحة جداً تفصل الأقسام بدقة',
    badge: 'تباين عالي',
  },
];

const TYPING_STYLE_LIBRARY: Array<{
  id: TypingInteractionStyle;
  nameAr: string;
  nameEn: string;
  desc: string;
  badge: string;
  color: string;
  icon: any;
}> = [
  {
    id: 'pulse',
    nameAr: 'تركيز أبل الهادئ',
    nameEn: 'Calm Focus',
    desc: 'استجابة إطار هادئة وثابتة تماماً بدون أي اهتزاز أو عناصر عائمة مشتتة',
    badge: 'الافتراضي ✨',
    color: '#0071E3',
    icon: Activity,
  },
  {
    id: 'glow',
    nameAr: 'هالة تركيز ناعمة',
    nameEn: 'Soft Ring',
    desc: 'إضاءة محيطية خفيفة ومريحة للعين حول الحقل النشط أثناء الكتابة',
    badge: 'مريح للعين',
    color: '#8E24AA',
    icon: Sparkles,
  },
  {
    id: 'wave',
    nameAr: 'تدرج إطار انسيابي',
    nameEn: 'Smooth Tint',
    desc: 'تغير لوني هادئ وناعم لإطار الحقل بدون أي حركة أو اهتزاز',
    badge: 'أنيق',
    color: '#059669',
    icon: Waves,
  },
];

interface AppleThemeStudioPanelProps {
  settings: StoreSettings;
  onUpdateSettings: (updater: (prev: StoreSettings) => StoreSettings) => void;
  onNotify?: (title: string, subtitle?: string, badge?: string) => void;
  compact?: boolean;
}

export const AppleThemeStudioPanel: React.FC<AppleThemeStudioPanelProps> = ({
  settings,
  onUpdateSettings,
  onNotify,
  compact = false,
}) => {
  const [studioTab, setStudioTab] = useState<'all' | 'typography' | 'themes' | 'surfaces'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'bright' | 'luxury_warm' | 'dark_pro'>('all');
  const [liveTypingSample, setLiveTypingSample] = useState('');

  const activeTheme = useMemo(() => resolveActiveAppTheme(settings), [settings]);
  const ambientGlow = settings.themeAmbientGlow !== false;
  const glassIntensity = settings.themeGlassIntensity || 'balanced';
  const autoTimeOfDay = Boolean(settings.themeAutoTimeOfDay);
  const typingEffects = settings.themeTypingEffects !== false;
  const typingStyle: TypingInteractionStyle = settings.themeTypingStyle || 'pulse';
  const cardElevation = settings.themeCardElevation || 'floating';
  const customAccentColor = settings.themeCustomAccentColor || settings.themeCustomAccent || '';

  // Typography, Color, Weight, Thickness & Numeral settings
  const siteFontFamily: SiteFontFamilyId = settings.siteFontFamily || 'readex';
  const siteFontSizePercent: number = settings.siteFontSizePercent || 100;
  const siteFontWeight: SiteFontWeightId = settings.siteFontWeight || 'regular';
  const siteFontStrokeWidth: SiteFontStrokeId = settings.siteFontStrokeWidth || 'none';
  const siteLineHeight = settings.siteLineHeight || 'normal';
  const siteLetterSpacing = settings.siteLetterSpacing || 'normal';
  const sitePrimaryTextColor = settings.sitePrimaryTextColor || '';
  const siteSecondaryTextColor = settings.siteSecondaryTextColor || '';
  const siteHeadingColorMode: SiteHeadingColorMode = settings.siteHeadingColorMode || 'theme_default';
  const siteHeadingCustomColor = settings.siteHeadingCustomColor || '';
  const siteNumeralSystem: SiteNumeralSystem = settings.siteNumeralSystem || 'en';
  const themeSurfaceStyle: ThemeSurfaceStyleId = settings.themeSurfaceStyle || 'liquid_glass';
  const themeBorderRadius = settings.themeBorderRadius || 'rounded';
  const themeContrastLevel = settings.themeContrastLevel || 'standard';

  const filteredThemes = useMemo(() => {
    if (selectedCategory === 'all') return APP_THEMES;
    return APP_THEMES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const fmtPreviewNum = (txt: string) => convertDigitsToSystem(txt, siteNumeralSystem);

  const handleSelectTheme = (theme: AppThemeDefinition) => {
    try {
      localStorage.setItem('lamsa_active_theme_v1', theme.id);
    } catch {}
    onUpdateSettings((prev) => ({
      ...prev,
      activeThemeId: theme.id,
      themeAutoTimeOfDay: false,
    }));
    if (onNotify) {
      onNotify(
        `تم تفعيل ثيم: ${theme.nameAr}`,
        `${theme.moodDescription} (${theme.fragranceInspiration})`,
        theme.badge
      );
    }
  };

  const handleSurpriseTheme = () => {
    const candidates = APP_THEMES.filter((t) => t.id !== activeTheme.id);
    const randomTheme = candidates[Math.floor(Math.random() * candidates.length)] || APP_THEMES[0];
    handleSelectTheme(randomTheme);
  };

  const handleResetTypographyOnly = () => {
    onUpdateSettings((prev) => ({
      ...prev,
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
      themeFontScale: 'normal',
    }));
    if (onNotify) {
      onNotify(
        'تمت استعادة إعدادات الخطوط والأرقام الافتراضية',
        'خط Readex Pro بحجم 100% ووزن قياسي مع ألوان الثيم المتناغمة تلقائياً',
        'افتراضي الخطوط'
      );
    }
  };

  const handleRestoreDefault = () => {
    const defaultTheme = APP_THEMES[0];
    try {
      localStorage.setItem('lamsa_active_theme_v1', defaultTheme.id);
    } catch {}
    onUpdateSettings((prev) => ({
      ...prev,
      activeThemeId: 'apple_sonoma_light',
      themeAmbientGlow: true,
      themeGlassIntensity: 'balanced',
      themeAutoTimeOfDay: false,
      themeTypingEffects: true,
      themeTypingIntensity: 'lively',
      themeSoundEffects: true,
      themeCardElevation: 'floating',
      themeCustomAccentColor: '',
      themeCustomAccent: '',
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
      themeSurfaceStyle: 'liquid_glass',
      themeBorderRadius: 'rounded',
      themeContrastLevel: 'standard',
    }));
    if (onNotify) {
      onNotify(
        'تمت استعادة ثيم أبل سونوما وإعدادات الخطوط الافتراضية',
        'تمت إعادة الألوان والخطوط والأرقام وكثافة الزجاج للوضع القياسي الأصلي',
        'افتراضي أبل'
      );
    }
  };

  const handleToggleAutoTime = () => {
    const nextVal = !autoTimeOfDay;
    onUpdateSettings((prev) => ({
      ...prev,
      themeAutoTimeOfDay: nextVal,
    }));
    if (onNotify) {
      onNotify(
        nextVal ? 'تم تفعيل التبديل الذكي حسب وقت اليوم' : 'تم إيقاف التبديل التلقائي حسب الوقت',
        nextVal
          ? 'سيقوم النظام بتغيير الجو اللوني تلقائياً بين الصباح والمساء والليل لمنع الملل وإراحة العين'
          : 'يمكنك الآن تثبيت أي ثيم تفضله يدوياً',
        nextVal ? 'ديناميكي ذكي' : 'يدوي'
      );
    }
  };

  const activeFontMeta =
    FONT_FAMILY_LIBRARY.find((f) => f.id === siteFontFamily) || FONT_FAMILY_LIBRARY[0];

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* 1. Active Atmosphere & Typography Hero Banner */}
      <div
        className="rounded-3xl p-4 sm:p-5 border transition-all relative overflow-hidden"
        style={{
          backgroundColor: activeTheme.colors.cardSolid,
          borderColor: activeTheme.colors.borderSubtle,
          backgroundImage: `radial-gradient(circle at 15% 20%, ${activeTheme.colors.ambientOrb1} 0%, transparent 55%), radial-gradient(circle at 85% 80%, ${activeTheme.colors.ambientOrb2} 0%, transparent 55%)`,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{
                background: `linear-gradient(135deg, ${activeTheme.colors.primaryAccent}, ${activeTheme.colors.secondaryGold})`,
              }}
            >
              <Palette size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white"
                  style={{ backgroundColor: activeTheme.colors.primaryAccent }}
                >
                  الثيم النشط: {activeTheme.nameAr}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-black/[0.06] text-[#1D1D1F]">
                  الخط: {activeFontMeta.nameAr} ({siteFontSizePercent}%)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                  الأرقام: {siteNumeralSystem === 'ar' ? 'عربية (٠١٢٣٤٥٦٧٨٩)' : 'إنجليزية (0123456789)'}
                </span>
              </div>
              <h3
                className="text-base sm:text-lg font-black mt-1 tracking-tight"
                style={{ color: sitePrimaryTextColor || activeTheme.colors.textPrimary }}
              >
                استوديو الخطوط، الألوان، لغة الأرقام، والثيمات الفاخرة ({APP_THEMES.length} نمطاً)
              </h3>
              <p
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: siteSecondaryTextColor || activeTheme.colors.textSecondary }}
              >
                تحكم كامل ولحظي في لون الخط، حجمه، وزنه، سمكه، ولغة الأرقام في كامل الموقع والأقسام مع معاينة فورية.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSurpriseTheme}
              className="apple-btn px-3.5 py-2 rounded-2xl text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
              style={{ backgroundColor: activeTheme.colors.primaryAccent }}
              title="اختر ثيماً جديداً بشكل ذكي لتغيير الجو وكسر الملل فوراً"
            >
              <Shuffle size={14} />
              <span>تجديد الجو عشوائياً</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreDefault}
              className="apple-btn px-3 py-2 rounded-2xl bg-black/[0.05] hover:bg-black/[0.09] text-[#1D1D1F] border border-black/[0.08] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="استعادة جميع إعدادات الثيم والخطوط للوضع الافتراضي"
            >
              <RotateCcw size={13} />
              <span>استعادة الافتراضي</span>
            </button>
          </div>
        </div>
      </div>

      {/* Studio Section Segmented Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-black/[0.04] p-1.5 rounded-2xl border border-black/[0.06]">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'العرض الشامل المتكامل', icon: Sliders },
            { id: 'typography', label: 'الخطوط والألوان والسمك ولغة الأرقام', icon: Type },
            { id: 'themes', label: `مكتبة الثيمات الفاخرة (${APP_THEMES.length})`, icon: Palette },
            { id: 'surfaces', label: 'الأنماط البصرية والخامات والتركيز', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = studioTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStudioTab(tab.id as any)}
                className={`apple-btn px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1D1D1F] text-white shadow-2xs'
                    : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500/12 text-emerald-700 border border-emerald-500/25 flex items-center gap-1">
          <CheckCircle2 size={11} />
          <span>تطبيق لحظي وحفظ تلقائي ✓</span>
        </span>
      </div>

      {/* ===================================================================== */}
      {/* FEATURED SHOWCASE: APPLE SEQUOIA × WINDOWS 12 FLUENT HYBRID MASTERPIECE */}
      {/* ===================================================================== */}
      <div
        className="rounded-3xl p-4 sm:p-5 border transition-all relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(242, 246, 253, 0.96) 0%, rgba(255, 255, 255, 0.94) 52%, rgba(238, 242, 255, 0.92) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.96)',
          boxShadow:
            '0 20px 44px -14px rgba(0, 103, 192, 0.14), inset 0 1.5px 0 rgba(255, 255, 255, 0.98), inset 0 -1px 0 rgba(15, 23, 42, 0.05)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0071E3 0%, #0067C0 55%, #4F46E5 100%)',
                boxShadow:
                  '0 10px 22px -5px rgba(0, 103, 192, 0.42), inset 0 1.5px 2px rgba(255, 255, 255, 0.45)',
              }}
            >
              <Layers size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-black text-[#0F172A]">
                  تحفة أبل وويندوز 12 الهجينة (Apple Sequoia × Windows 12 Fluent Hybrid)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r from-[#0067C0] to-[#4F46E5] shadow-2xs">
                  الجيل القادم 2026 ✨
                </span>
                {settings.activeThemeId === 'apple_win12_fluent_hybrid' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                    مُفعّل حالياً ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-[#475569] leading-relaxed max-w-2xl">
                مزيج هندسي فريد يجمع بين فخامة زجاج أبل السائل (visionOS Specular Glass) وخامات الميكا والأكريليك العائمة في مايكروسوفت ويندوز 12 (Fluent Mica) بتناغم لوني هادئ ومؤشرات نشطة انسيابية.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onUpdateSettings((prev) => ({
                  ...prev,
                  activeThemeId: 'apple_win12_fluent_hybrid',
                  themeSurfaceStyle: 'win12_apple_mica_hybrid',
                  themeGlassIntensity: 'ultra',
                  themeCardElevation: 'floating',
                  themeAmbientGlow: true,
                  themeAutoTimeOfDay: false,
                  themeCustomAccentColor: '',
                }));
                if (onNotify) {
                  onNotify(
                    'تم تفعيل استايل أبل × ويندوز 12 الهجين الفاخر ✨',
                    'تم تطبيق خامات الميكا والزجاج السائل والألوان المتناغمة في كامل الموقع',
                    'Apple × Win 12'
                  );
                }
              }}
              className="apple-btn px-4 py-2.5 rounded-2xl text-xs font-black text-white flex items-center gap-2 cursor-pointer transition-all"
              style={{
                background: 'linear-gradient(135deg, #0071E3 0%, #0067C0 52%, #4F46E5 100%)',
                boxShadow:
                  '0 10px 22px -6px rgba(0, 103, 192, 0.42), inset 0 1.5px 2px rgba(255, 255, 255, 0.42)',
              }}
            >
              <Sparkles size={14} />
              <span>
                {settings.activeThemeId === 'apple_win12_fluent_hybrid'
                  ? 'مُفعّل بالكامل (إعادة ضبط إعداداته المثالية)'
                  : 'تفعيل استايل أبل × ويندوز 12 الهجين الآن'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateSettings((prev) => ({
                  ...prev,
                  activeThemeId: 'frosted_lavender_clay',
                  themeSurfaceStyle: 'lavender_clay_3d',
                  themeGlassIntensity: 'ultra',
                  themeCardElevation: '3d_luxury',
                  themeAmbientGlow: true,
                  themeAutoTimeOfDay: false,
                }));
                if (onNotify) {
                  onNotify(
                    'تم التبديل إلى ثيم اللافندر البلوري ثلاثي الأبعاد (3D Clay) ✨',
                    'يمكنك التبديل بين استايل أبل × ويندوز 12 وثيم اللافندر في أي وقت',
                    '3D Lavender'
                  );
                }
              }}
              className="apple-btn px-3 py-2.5 rounded-2xl text-[11px] font-bold text-[#4F46E5] bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200/80 cursor-pointer"
            >
              ثيم اللافندر 3D
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION A: SITE-WIDE TYPOGRAPHY, COLOR, WEIGHT, STROKE & NUMERALS     */}
      {/* ===================================================================== */}
      {(studioTab === 'all' || studioTab === 'typography') && (
        <div className="apple-glass-card rounded-3xl p-4 sm:p-5 border border-black/[0.08] space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#6D28D9] text-white flex items-center justify-center shadow-xs shrink-0">
                <Type size={19} />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                  محرك التحكم الشامل في الخطوط والألوان والسمك ولغة الأرقام
                </h4>
                <p className="text-[11px] text-[#86868B]">
                  يسري تلقائياً على كافة صفحات الموقع (الرئيسية، الكاشير، المخزون، الفواتير، التقارير، الخزائن، والعملاء)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetTypographyOnly}
              className="apple-btn px-3 py-1.5 rounded-xl bg-black/[0.05] hover:bg-black/[0.09] text-[#1D1D1F] text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>إعادة ضبط الخطوط والأرقام</span>
            </button>
          </div>

          {/* 1. NUMERAL LANGUAGE CONTROL (لغة الأرقام في كامل الموقع: عربية / إنجليزية) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-l from-[#0071E3]/[0.05] via-transparent to-[#C49746]/[0.06] border border-black/[0.08] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0071E3] text-white flex items-center justify-center">
                  <Hash size={15} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-[#1D1D1F] block">
                    لغة ونظام الأرقام في كامل الموقع والأقسام (Numeral Language)
                  </span>
                  <span className="text-[10px] text-[#86868B] block">
                    اختر طريقة عرض كافة الأسعار، الجرامات، التواريخ، والكميات في جميع الشاشات
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#0071E3]/12 text-[#0071E3]">
                {siteNumeralSystem === 'ar' ? 'نشط: أرقام عربية مشرقية (٠١٢٣)' : 'نشط: أرقام إنجليزية عالمية (0123)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-keep-numerals="true">
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings((prev) => ({ ...prev, siteNumeralSystem: 'en' }));
                  if (onNotify) {
                    onNotify(
                      'تم تفعيل الأرقام الإنجليزية العالمية (0123456789)',
                      'تُعرض الآن كافة المبالغ والجرامات والتواريخ في الموقع بالأرقام الإنجليزية',
                      '123 EN'
                    );
                  }
                }}
                className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  siteNumeralSystem === 'en'
                    ? 'bg-[#1D1D1F] text-white border-[#0071E3] shadow-sm'
                    : 'bg-white/80 hover:bg-white border-black/[0.08] text-[#1D1D1F]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black">الأرقام الإنجليزية العالمية</span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#0071E3] text-white">
                      English Digits
                    </span>
                  </div>
                  <p className={`text-[10px] ${siteNumeralSystem === 'en' ? 'text-white/75' : 'text-[#86868B]'}`}>
                    مثالية للعمليات المحاسبية السريعة والجداول المالية القياسية
                  </p>
                </div>
                <div className="text-left font-mono font-black text-base sm:text-lg tracking-wider px-3 py-1.5 rounded-xl bg-black/10 shrink-0">
                  0123456789
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateSettings((prev) => ({ ...prev, siteNumeralSystem: 'ar' }));
                  if (onNotify) {
                    onNotify(
                      'تم تفعيل الأرقام العربية المشرقية (٠١٢٣٤٥٦٧٨٩)',
                      'تُعرض الآن كافة المبالغ والجرامات والتواريخ في الموقع بالأرقام العربية الأصيلة',
                      '١٢٣ عربي'
                    );
                  }
                }}
                className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  siteNumeralSystem === 'ar'
                    ? 'bg-[#1D1D1F] text-white border-[#C49746] shadow-sm'
                    : 'bg-white/80 hover:bg-white border-black/[0.08] text-[#1D1D1F]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black">الأرقام العربية الأصيلة</span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#C49746] text-white">
                      أرقام عربية
                    </span>
                  </div>
                  <p className={`text-[10px] ${siteNumeralSystem === 'ar' ? 'text-white/75' : 'text-[#86868B]'}`}>
                    تناغم عربي أصيل مع النصوص والخطوط العربية في كل الأقسام
                  </p>
                </div>
                <div className="text-left font-mono font-black text-base sm:text-lg tracking-wider px-3 py-1.5 rounded-xl bg-black/10 shrink-0">
                  ٠١٢٣٤٥٦٧٨٩
                </div>
              </button>
            </div>
          </div>

          {/* 2. FONT FAMILY SELECTOR (8 خطوط احترافية) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1D1D1F]">
                نوع وعائلة الخط في كامل الموقع (8 خطوط عربية وعالمية):
              </span>
              <span className="text-[10px] font-bold text-[#86868B]">
                النشط: {activeFontMeta.nameAr}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {FONT_FAMILY_LIBRARY.map((font) => {
                const isSelected = siteFontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteFontFamily: font.id,
                      }))
                    }
                    style={{ fontFamily: font.cssFamily }}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-[#1D1D1F] text-white border-[#0071E3] ring-2 ring-[#0071E3]/25 shadow-xs'
                        : 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.07] text-[#1D1D1F]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black truncate">{font.nameAr}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                          isSelected ? 'bg-[#0071E3] text-white' : 'bg-black/[0.06] text-[#636366]'
                        }`}
                      >
                        {font.badge}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] leading-snug line-clamp-2 ${
                        isSelected ? 'text-white/80' : 'text-[#86868B]'
                      }`}
                    >
                      {font.desc}
                    </p>
                    <div
                      className={`pt-1.5 mt-0.5 border-t text-[11px] font-bold flex items-center justify-between ${
                        isSelected ? 'border-white/15 text-amber-300' : 'border-black/[0.05] text-[#0071E3]'
                      }`}
                    >
                      <span>لمسة عطر</span>
                      <span>1,250 ج.م</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. FONT SIZE SLIDER & PRESETS + FONT WEIGHT + FONT STROKE (THICKNESS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Font Size Control (85% to 125%) */}
            <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-[#1D1D1F] block">
                    حجم الخط الشامل في كامل الموقع والأقسام
                  </span>
                  <span className="text-[10px] text-[#86868B]">
                    يكبّر أو يصغّر كافة النصوص والأرقام والبطاقات بتناسب ذكي
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteFontSizePercent: Math.max(85, (prev.siteFontSizePercent || 100) - 2),
                      }))
                    }
                    className="w-7 h-7 rounded-lg bg-black/[0.06] hover:bg-black/[0.12] flex items-center justify-center text-[#1D1D1F] cursor-pointer"
                    title="تصغير الخط"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="px-2.5 py-1 rounded-xl bg-[#0071E3] text-white font-mono text-xs font-black min-w-[54px] text-center">
                    {siteFontSizePercent}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteFontSizePercent: Math.min(125, (prev.siteFontSizePercent || 100) + 2),
                      }))
                    }
                    className="w-7 h-7 rounded-lg bg-black/[0.06] hover:bg-black/[0.12] flex items-center justify-center text-[#1D1D1F] cursor-pointer"
                    title="تكبير الخط"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <input
                type="range"
                min={85}
                max={125}
                step={1}
                value={siteFontSizePercent}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateSettings((prev) => ({
                    ...prev,
                    siteFontSizePercent: val,
                    themeFontScale: val < 97 ? 'compact' : val > 103 ? 'comfortable' : 'normal',
                  }));
                }}
                className="w-full accent-[#0071E3] cursor-pointer h-2 rounded-lg"
              />

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                {[
                  { pct: 85, label: '85% مدمج+' },
                  { pct: 90, label: '90% مدمج' },
                  { pct: 95, label: '95% رشيق' },
                  { pct: 100, label: '100% قياسي' },
                  { pct: 105, label: '105% مريح' },
                  { pct: 110, label: '110% واضح' },
                  { pct: 115, label: '115% كبير' },
                  { pct: 120, label: '120% مكبّر' },
                ].map((preset) => (
                  <button
                    key={preset.pct}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteFontSizePercent: preset.pct,
                        themeFontScale:
                          preset.pct < 97 ? 'compact' : preset.pct > 103 ? 'comfortable' : 'normal',
                      }))
                    }
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-black transition-all cursor-pointer text-center ${
                      siteFontSizePercent === preset.pct
                        ? 'bg-[#1D1D1F] text-white shadow-2xs'
                        : 'bg-black/[0.04] text-[#636366] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Weight & Stroke Thickness Control */}
            <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.07] space-y-3">
              <div>
                <span className="text-xs font-black text-[#1D1D1F] block">
                  وزن الخط (Font Weight) وسمك الحروف (Stroke Thickness)
                </span>
                <span className="text-[10px] text-[#86868B]">
                  تحكم دقيق في سماكة وبروز الحروف والأرقام من النحيف الناعم حتى السميك الداكن
                </span>
              </div>

              {/* 7 Font Weights */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                {FONT_WEIGHT_OPTIONS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteFontWeight: w.id,
                      }))
                    }
                    className={`py-1.5 px-1 rounded-xl text-[9px] font-black transition-all cursor-pointer flex flex-col items-center justify-center ${
                      siteFontWeight === w.id
                        ? 'bg-[#0071E3] text-white shadow-2xs'
                        : 'bg-black/[0.04] text-[#636366] hover:text-[#1D1D1F]'
                    }`}
                    title={w.desc}
                  >
                    <span>{w.label.split(' ')[0]}</span>
                    <span className="opacity-75 font-mono text-[8px]">{w.num}</span>
                  </button>
                ))}
              </div>

              {/* 5 Stroke Thickness Levels */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#636366] block">
                  درجة تعزيز سمك وحدّة الخط الإضافي (Text Stroke):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
                  {FONT_STROKE_OPTIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          siteFontStrokeWidth: st.id,
                        }))
                      }
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
                        siteFontStrokeWidth === st.id
                          ? 'bg-[#1D1D1F] text-white shadow-2xs'
                          : 'bg-black/[0.04] text-[#636366] hover:text-[#1D1D1F]'
                      }`}
                      title={st.desc}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. SITE-WIDE FONT COLORS (PRIMARY, SECONDARY, AND HEADINGS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* Primary Text Color */}
            <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.07] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-[#1D1D1F] block">
                    لون الخط الأساسي في كامل الموقع
                  </span>
                  <span className="text-[10px] text-[#86868B]">
                    العناوين، الأسماء، المبالغ، والجداول
                  </span>
                </div>
                {sitePrimaryTextColor ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        sitePrimaryTextColor: '',
                      }))
                    }
                    className="text-[10px] font-black text-[#0071E3] hover:underline cursor-pointer"
                  >
                    تلقائي مع الثيم
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    متناغم مع الثيم
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {PRIMARY_TEXT_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        sitePrimaryTextColor: sw.color,
                      }))
                    }
                    style={{ backgroundColor: sw.color }}
                    title={sw.name}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      sitePrimaryTextColor.toLowerCase() === sw.color.toLowerCase()
                        ? 'scale-115 ring-2 ring-[#0071E3] ring-offset-1 border-white'
                        : 'border-black/20 hover:scale-110'
                    }`}
                  />
                ))}
                <label
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/[0.05] hover:bg-black/[0.09] text-[10px] font-bold text-[#1D1D1F] cursor-pointer"
                  title="اختيار أي لون حر للخط الأساسي"
                >
                  <input
                    type="color"
                    value={sitePrimaryTextColor || activeTheme.colors.textPrimary}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        sitePrimaryTextColor: e.target.value,
                      }))
                    }
                    className="w-4 h-4 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span>لون حر</span>
                </label>
              </div>
            </div>

            {/* Secondary Text Color */}
            <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.07] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-[#1D1D1F] block">
                    لون الخط الفرعي والتوضيحي
                  </span>
                  <span className="text-[10px] text-[#86868B]">
                    الوصف، الملاحظات، والتفاصيل المساندة
                  </span>
                </div>
                {siteSecondaryTextColor ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteSecondaryTextColor: '',
                      }))
                    }
                    className="text-[10px] font-black text-[#0071E3] hover:underline cursor-pointer"
                  >
                    تلقائي مع الثيم
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    متناغم مع الثيم
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {SECONDARY_TEXT_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteSecondaryTextColor: sw.color,
                      }))
                    }
                    style={{ backgroundColor: sw.color }}
                    title={sw.name}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      siteSecondaryTextColor.toLowerCase() === sw.color.toLowerCase()
                        ? 'scale-115 ring-2 ring-[#0071E3] ring-offset-1 border-white'
                        : 'border-black/20 hover:scale-110'
                    }`}
                  />
                ))}
                <label
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/[0.05] hover:bg-black/[0.09] text-[10px] font-bold text-[#1D1D1F] cursor-pointer"
                  title="اختيار أي لون حر للنصوص الفرعية"
                >
                  <input
                    type="color"
                    value={siteSecondaryTextColor || activeTheme.colors.textSecondary}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteSecondaryTextColor: e.target.value,
                      }))
                    }
                    className="w-4 h-4 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span>لون حر</span>
                </label>
              </div>
            </div>

            {/* Headings Color Mode & Line Spacing */}
            <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.07] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#1D1D1F]">
                  لون العناوين وتباعد الأسطر:
                </span>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'tight', label: 'مدمج' },
                      { id: 'normal', label: 'متوازن' },
                      { id: 'relaxed', label: 'مريح' },
                      { id: 'spacious', label: 'واسع' },
                    ] as const
                  ).map((lh) => (
                    <button
                      key={lh.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          siteLineHeight: lh.id,
                        }))
                      }
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                        siteLineHeight === lh.id
                          ? 'bg-[#0071E3] text-white'
                          : 'bg-black/[0.05] text-[#636366]'
                      }`}
                    >
                      {lh.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'theme_default', label: 'تلقائي الثيم', color: activeTheme.colors.textPrimary },
                    { id: 'royal_gold', label: 'ذهبي ملكي', color: '#B47B16' },
                    { id: 'apple_blue', label: 'أزرق أبل', color: '#0071E3' },
                    { id: 'emerald_luxury', label: 'زمردي فاخر', color: '#059669' },
                    { id: 'crimson_velvet', label: 'ياقوتي بكرات', color: '#B91C1C' },
                    { id: 'amethyst_silk', label: 'أرجواني ملكي', color: '#6D28D9' },
                  ] as const
                ).map((hm) => (
                  <button
                    key={hm.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        siteHeadingColorMode: hm.id,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-xl text-[9px] font-black flex items-center gap-1.5 cursor-pointer border ${
                      siteHeadingColorMode === hm.id
                        ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                        : 'bg-white/70 text-[#1D1D1F] border-black/[0.06]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: hm.color }}
                    />
                    <span className="truncate">{hm.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. LIVE MULTI-SECTION PREVIEW BOX (شاشة المعاينة الحية الفورية) */}
          <div
            className="rounded-2xl p-4 border-2 transition-all space-y-3"
            style={{
              backgroundColor: activeTheme.colors.bgCanvas,
              borderColor: activeTheme.colors.borderSubtle,
              fontFamily: activeFontMeta.cssFamily,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/[0.07]">
              <div className="flex items-center gap-2">
                <Eye size={15} style={{ color: activeTheme.colors.primaryAccent }} />
                <span className="text-xs font-black text-[#1D1D1F]">
                  معاينة حية فورية للخطوط والألوان ولغة الأرقام على أقسام الموقع
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#86868B]">
                <span>الحجم: {fmtPreviewNum(`${siteFontSizePercent}%`)}</span>
                <span>•</span>
                <span>الوزن: {siteFontWeight}</span>
                <span>•</span>
                <span>السمك: {siteFontStrokeWidth}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Preview 1: Financial KPI Card */}
              <div
                className="rounded-2xl p-3 border flex flex-col justify-between"
                style={{
                  backgroundColor: activeTheme.colors.cardSolid,
                  borderColor: activeTheme.colors.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#86868B]">إجمالي مبيعات اليوم</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-black text-white"
                    style={{ backgroundColor: activeTheme.colors.primaryAccent }}
                  >
                    {fmtPreviewNum('+18.5%')}
                  </span>
                </div>
                <div className="my-1.5">
                  <h3 className="text-lg font-black text-[#1D1D1F] font-mono">
                    {fmtPreviewNum('4,850.00')} ج.م
                  </h3>
                  <p className="text-[10px] text-[#86868B]">
                    صافي المساهمة: {fmtPreviewNum('1,120')} ج.م • التارجت: {fmtPreviewNum('1,000')} ج.م
                  </p>
                </div>
              </div>

              {/* Preview 2: POS Mix Item */}
              <div
                className="rounded-2xl p-3 border flex flex-col justify-between"
                style={{
                  backgroundColor: activeTheme.colors.cardSolid,
                  borderColor: activeTheme.colors.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1D1D1F]">
                    ميكس سوفاج ديور + بكرات روج {fmtPreviewNum('540')}
                  </span>
                  <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    {fmtPreviewNum('50')} مل
                  </span>
                </div>
                <p className="text-[10px] text-[#86868B] my-1">
                  توزيع الزيوت: {fmtPreviewNum('11')} جم سوفاج ({fmtPreviewNum('70%')}) + {fmtPreviewNum('4')} جم بكرات ({fmtPreviewNum('30%')}) = {fmtPreviewNum('15')} جم
                </p>
                <div className="flex items-center justify-between text-[11px] font-black">
                  <span className="text-emerald-600">السعر: {fmtPreviewNum('230')} ج.م</span>
                  <span className="text-[#86868B]">نقاط الولاء: +{fmtPreviewNum('23')} نقطة</span>
                </div>
              </div>

              {/* Preview 3: Inventory & Customer Info */}
              <div
                className="rounded-2xl p-3 border flex flex-col justify-between"
                style={{
                  backgroundColor: activeTheme.colors.cardSolid,
                  borderColor: activeTheme.colors.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1D1D1F]">دهن عود كمبودي ملكي</span>
                  <span className="text-[10px] font-bold text-emerald-700">
                    متاح: {fmtPreviewNum('845')} جم
                  </span>
                </div>
                <p className="text-[10px] text-[#86868B] my-1">
                  واتساب المتجر: {fmtPreviewNum('01123376728')} / {fmtPreviewNum('01062018755')}
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold text-[#86868B]">
                  <span>تاريخ اليوم: {fmtPreviewNum('2026/10/05')}</span>
                  <span style={{ color: activeTheme.colors.primaryAccent }}>معتمد ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION B: MODERN SURFACE STYLES, GLASS, FOCUS & ACCENT CONTROLS      */}
      {/* ===================================================================== */}
      {(studioTab === 'all' || studioTab === 'surfaces') && (
        <div className="space-y-3.5">
          {/* Dynamic Environment & Apple Glass Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Auto Time-of-Day Mode */}
            <div className="apple-glass-card rounded-2xl p-3 border border-black/[0.07] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/12 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#1D1D1F] block truncate">التبديل الذكي حسب الوقت</span>
                  <span className="text-[10px] text-[#86868B] block truncate">صباح منعش • مساء دافئ • ليل مريح</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoTime}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                  autoTimeOfDay
                    ? 'bg-[#0071E3] text-white shadow-2xs'
                    : 'bg-black/[0.05] text-[#636366] hover:bg-black/[0.09]'
                }`}
              >
                {autoTimeOfDay ? 'مفعّل تلقائياً' : 'تفعيل'}
              </button>
            </div>

            {/* Ambient Aura Mesh Toggle */}
            <div className="apple-glass-card rounded-2xl p-3 border border-black/[0.07] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-500/12 text-purple-600 flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#1D1D1F] block truncate">الإضاءة المحيطية (Ambient Aura)</span>
                  <span className="text-[10px] text-[#86868B] block truncate">هالات ضوئية ناعمة في خلفية الشاشة</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    themeAmbientGlow: !ambientGlow,
                  }))
                }
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                  ambientGlow
                    ? 'bg-[#34C759] text-white shadow-2xs'
                    : 'bg-black/[0.05] text-[#636366] hover:bg-black/[0.09]'
                }`}
              >
                {ambientGlow ? 'نشطة' : 'متوقفة'}
              </button>
            </div>

            {/* Glass Blur Intensity */}
            <div className="apple-glass-card rounded-2xl p-3 border border-black/[0.07] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500/12 text-[#0071E3] flex items-center justify-center shrink-0">
                  <Layers size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#1D1D1F] block truncate">شفافية زجاج أبل</span>
                  <span className="text-[10px] text-[#86868B] block truncate">مستوى الضبابية (Blur)</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-black/[0.05] p-1 rounded-xl shrink-0">
                {(
                  [
                    { id: 'subtle', label: 'ناعم' },
                    { id: 'balanced', label: 'متوازن' },
                    { id: 'ultra', label: 'فائق' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        themeGlassIntensity: opt.id,
                      }))
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      glassIntensity === opt.id
                        ? 'bg-[#1D1D1F] text-white shadow-2xs'
                        : 'text-[#636366] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modern Surface Styles & Architectural Finish */}
          <div className="apple-glass-card rounded-3xl p-4 border border-black/[0.08] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#C49746] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Crown size={17} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                    أنماط التشطيب السطحي للبطاقات، الزوايا، ولون التمييز
                  </h4>
                  <p className="text-[10px] text-[#86868B]">
                    تقنيات تشطيب حديثة للبطاقات والفواصل والظلال في جميع الأقسام
                  </p>
                </div>
              </div>
            </div>

            {/* 5 Surface Styles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {SURFACE_STYLE_LIBRARY.map((surf) => {
                const isSelected = themeSurfaceStyle === surf.id;
                return (
                  <button
                    key={surf.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        themeSurfaceStyle: surf.id,
                      }))
                    }
                    className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-[#1D1D1F] text-white border-[#C49746] shadow-xs'
                        : 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.07] text-[#1D1D1F]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-black truncate">{surf.nameAr}</span>
                    </div>
                    <span
                      className={`text-[9px] leading-snug ${
                        isSelected ? 'text-white/75' : 'text-[#86868B]'
                      }`}
                    >
                      {surf.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Border Radius & Contrast */}
              <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#1D1D1F]">انسيابية الزوايا والتباين:</span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'standard', label: 'تباين قياسي' },
                        { id: 'high', label: 'تباين عالي' },
                        { id: 'ultra_crisp', label: 'حاد جداً' },
                      ] as const
                    ).map((cl) => (
                      <button
                        key={cl.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            themeContrastLevel: cl.id,
                          }))
                        }
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                          themeContrastLevel === cl.id
                            ? 'bg-[#0071E3] text-white'
                            : 'bg-black/[0.05] text-[#636366]'
                        }`}
                      >
                        {cl.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-black/[0.04] p-1 rounded-xl">
                  {(
                    [
                      { id: 'sharp', label: 'حادة رسمية' },
                      { id: 'rounded', label: 'أبل القياسية' },
                      { id: 'ultra_pill', label: 'كبسولية ناعمة' },
                    ] as const
                  ).map((br) => (
                    <button
                      key={br.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          themeBorderRadius: br.id,
                        }))
                      }
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        themeBorderRadius === br.id
                          ? 'bg-[#1D1D1F] text-white shadow-2xs'
                          : 'text-[#636366] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {br.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Elevation & Depth */}
              <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.06] space-y-2">
                <span className="text-[11px] font-black text-[#1D1D1F] block">
                  عمق البطاقات والظلال (Card Elevation):
                </span>
                <div className="grid grid-cols-3 gap-1 bg-black/[0.04] p-1 rounded-xl">
                  {(
                    [
                      { id: 'flat', label: 'مسطح ناعم' },
                      { id: 'floating', label: 'عائم قياسي' },
                      { id: '3d_luxury', label: 'ثلاثي الأبعاد' },
                    ] as const
                  ).map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          themeCardElevation: el.id,
                        }))
                      }
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        cardElevation === el.id
                          ? 'bg-[#1D1D1F] text-white shadow-2xs'
                          : 'text-[#636366] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {el.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Accent Color Override */}
              <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#1D1D1F]">لون التمييز والأزرار المخصص:</span>
                  {customAccentColor && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          themeCustomAccentColor: '',
                          themeCustomAccent: '',
                        }))
                      }
                      className="text-[10px] font-bold text-[#0071E3] hover:underline cursor-pointer"
                    >
                      إلغاء التخصيص
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  {[
                    { color: '#0071E3', name: 'أزرق أبل' },
                    { color: '#C49746', name: 'ذهبي ملكي' },
                    { color: '#B91C1C', name: 'ياقوتي' },
                    { color: '#059669', name: 'زمردي' },
                    { color: '#7C3AED', name: 'أرجواني' },
                    { color: '#DB2777', name: 'وردي فرنسي' },
                    { color: '#0284C7', name: 'سماوي' },
                  ].map((sw) => (
                    <button
                      key={sw.color}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          themeCustomAccentColor: sw.color,
                          themeCustomAccent: sw.color,
                        }))
                      }
                      style={{ backgroundColor: sw.color }}
                      title={sw.name}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                        customAccentColor === sw.color
                          ? 'scale-115 ring-2 ring-[#1D1D1F] ring-offset-1 border-white'
                          : 'border-white/60 hover:scale-110'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={customAccentColor || activeTheme.colors.primaryAccent}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        themeCustomAccentColor: e.target.value,
                        themeCustomAccent: e.target.value,
                      }))
                    }
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                    title="اختر أي لون مخصص للأزرار والتمييز"
                  />
                </div>
              </div>
            </div>

            {/* Calm Focus Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {TYPING_STYLE_LIBRARY.map((styleItem) => {
                const Icon = styleItem.icon;
                const isSelected = typingStyle === styleItem.id && typingEffects;
                return (
                  <button
                    key={styleItem.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings((prev) => ({
                        ...prev,
                        themeTypingEffects: true,
                        themeTypingStyle: styleItem.id,
                      }));
                    }}
                    className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-xs'
                        : 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.07] text-[#1D1D1F]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: styleItem.color }}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black truncate">{styleItem.nameAr}</div>
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-white/80' : 'text-[#86868B]'
                          }`}
                        >
                          {styleItem.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Interactive Typing Playground */}
            <div className="pt-1">
              <div className="relative">
                <input
                  type="text"
                  value={liveTypingSample}
                  onChange={(e) => setLiveTypingSample(e.target.value)}
                  placeholder="✨ جرب الكتابة هنا لمعاينة الخط وحجمه ووزنه داخل حقول الإدخال (مثل: بكرات روج 540 أو عود ملكي)..."
                  className="w-full h-11 px-4 rounded-2xl bg-white border border-black/[0.1] text-xs sm:text-sm font-bold text-[#1D1D1F] outline-none transition-all placeholder:text-[#86868B]"
                />
                {liveTypingSample && (
                  <button
                    type="button"
                    onClick={() => setLiveTypingSample('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-lg bg-black/[0.05] text-[#636366] hover:text-[#1D1D1F] cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION C: 20 INTERACTIVE LUXURY APPLE THEMES GRID                    */}
      {/* ===================================================================== */}
      {(studioTab === 'all' || studioTab === 'themes') && (
        <div className="space-y-3.5">
          {/* Category Filter Segmented Control */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 bg-black/[0.04] p-1.5 rounded-2xl border border-black/[0.06]">
              {[
                { id: 'all', label: `جميع الثيمات (${APP_THEMES.length})`, icon: Palette },
                {
                  id: 'bright',
                  label: `أنماط نهارية مشرقة (${APP_THEMES.filter((t) => t.category === 'bright').length})`,
                  icon: Sun,
                },
                {
                  id: 'luxury_warm',
                  label: `أنماط العطور الفاخرة (${APP_THEMES.filter((t) => t.category === 'luxury_warm').length})`,
                  icon: Flame,
                },
                {
                  id: 'dark_pro',
                  label: `الوضع الليلي الاحترافي (${APP_THEMES.filter((t) => t.category === 'dark_pro').length})`,
                  icon: Moon,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategory(tab.id as any)}
                    className={`apple-btn px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1D1D1F] text-white shadow-2xs'
                        : 'text-[#636366] hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-semibold text-[#86868B] flex items-center gap-1">
              <Eye size={12} />
              اضغط على أي بطاقة لتطبيق الثيم فوراً ومعاينته حياً
            </span>
          </div>

          {/* Interactive Apple Theme Cards Grid */}
          <div
            className={`grid grid-cols-1 ${
              compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3'
            } gap-3.5`}
          >
            {filteredThemes.map((theme) => {
              const isSelected = activeTheme.id === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme)}
                  className={`group text-right rounded-3xl p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden border-2 ${
                    isSelected
                      ? 'ring-4 ring-[#0071E3]/20 scale-[1.01]'
                      : 'hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: theme.colors.cardSolid,
                    borderColor: isSelected ? theme.colors.primaryAccent : theme.colors.borderSubtle,
                  }}
                >
                  {/* Top Mini macOS / iOS Live Window Mockup */}
                  <div
                    className="w-full h-28 rounded-2xl p-2.5 mb-3 relative overflow-hidden border flex flex-col justify-between shadow-inner"
                    style={{
                      backgroundColor: theme.colors.bgCanvas,
                      borderColor: theme.colors.borderSubtle,
                      backgroundImage: `radial-gradient(circle at 20% 25%, ${theme.colors.ambientOrb1} 0%, transparent 60%), radial-gradient(circle at 85% 75%, ${theme.colors.ambientOrb2} 0%, transparent 60%)`,
                    }}
                  >
                    {/* Mini Top Window Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
                        <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                        <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-black"
                        style={{
                          backgroundColor: theme.colors.primaryAccent,
                          color: '#FFFFFF',
                        }}
                      >
                        {theme.badge}
                      </span>
                    </div>

                    {/* Mini Bento Cards Inside Mockup */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <div
                        className="col-span-2 rounded-xl p-2 border flex flex-col justify-between"
                        style={{
                          backgroundColor: theme.colors.cardGlass,
                          borderColor: theme.colors.borderSubtle,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="w-10 h-1.5 rounded-full"
                            style={{ backgroundColor: theme.colors.textPrimary, opacity: 0.85 }}
                          />
                          <span
                            className="w-3 h-3 rounded-md"
                            style={{ backgroundColor: theme.colors.primaryAccent }}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold"
                            style={{
                              backgroundColor: theme.colors.primaryAccent,
                              color: '#FFFFFF',
                            }}
                          >
                            +1,000 ج.م
                          </span>
                          <span
                            className="w-6 h-1.5 rounded-full"
                            style={{ backgroundColor: theme.colors.secondaryGold }}
                          />
                        </div>
                      </div>

                      <div
                        className="rounded-xl p-2 border flex flex-col items-center justify-center gap-1"
                        style={{
                          backgroundColor: theme.colors.cardGlass,
                          borderColor: theme.colors.borderSubtle,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{
                            background: `linear-gradient(135deg, ${theme.colors.primaryAccent}, ${theme.colors.secondaryGold})`,
                          }}
                        >
                          ع
                        </div>
                        <span
                          className="w-8 h-1 rounded-full"
                          style={{ backgroundColor: theme.colors.textSecondary, opacity: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme Info & Color Swatches */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className="text-sm font-black tracking-tight"
                        style={{ color: theme.colors.textPrimary }}
                      >
                        {theme.nameAr}
                      </h4>
                      {isSelected ? (
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs shrink-0"
                          style={{ backgroundColor: theme.colors.primaryAccent }}
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg border opacity-75 group-hover:opacity-100 transition-opacity"
                          style={{
                            color: theme.colors.primaryAccent,
                            borderColor: theme.colors.borderSubtle,
                          }}
                        >
                          تطبيق
                        </span>
                      )}
                    </div>

                    <p
                      className="text-[11px] leading-relaxed line-clamp-2"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {theme.moodDescription}
                    </p>

                    <div
                      className="pt-2 mt-2 border-t flex items-center justify-between gap-2"
                      style={{ borderColor: theme.colors.borderSubtle }}
                    >
                      <span
                        className="text-[10px] font-bold truncate"
                        style={{ color: theme.colors.primaryAccent }}
                      >
                        🌸 {theme.fragranceInspiration}
                      </span>

                      {/* 4 Color Palette Dots */}
                      <div className="flex items-center -space-x-1 space-x-reverse shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-black/15 shadow-2xs"
                          style={{ backgroundColor: theme.colors.bgCanvas }}
                          title="لون الخلفية"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/60 shadow-2xs"
                          style={{ backgroundColor: theme.colors.primaryAccent }}
                          title="اللون الأساسي"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/60 shadow-2xs"
                          style={{ backgroundColor: theme.colors.secondaryGold }}
                          title="اللون الذهبي المساند"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/60 shadow-2xs"
                          style={{ backgroundColor: theme.colors.textPrimary }}
                          title="لون النص الأساسي"
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface AppleThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onUpdateSettings: (updater: (prev: StoreSettings) => StoreSettings) => void;
  onNotify?: (title: string, subtitle?: string, badge?: string) => void;
}

export const AppleThemeStudioModal: React.FC<AppleThemeStudioModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onNotify,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="smart-modal-window apple-glass rounded-[28px] w-full max-w-6xl border border-black/[0.1] shadow-2xl bg-white/95 flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-black/[0.07] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] via-[#8E24AA] to-[#C49746] text-white flex items-center justify-center shadow-sm">
              <Palette size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#1D1D1F] tracking-tight">
                  استوديو الخطوط، الألوان، لغة الأرقام، والثيمات الفاخرة
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#0071E3]/12 text-[#0071E3] border border-[#0071E3]/25">
                  {APP_THEMES.length} نمطاً + 8 خطوط
                </span>
              </div>
              <p className="text-[11px] text-[#86868B]">
                تحكم شامل في لون وحجم وسمك الخط، لغة الأرقام (عربية/إنجليزية)، والثيمات اللونية — يطبق لحظياً على كامل الموقع.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.06] hover:bg-black/[0.12] flex items-center justify-center text-[#1D1D1F] transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <AppleThemeStudioPanel
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onNotify={onNotify}
            compact
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-black/[0.07] bg-black/[0.02] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#86868B] font-medium">
            💡 ملاحظة: جميع الفواتير المطبوعة تظل بخلفية ورقية بيضاء عالية التباين مهما كان الثيم أو لون الخط المختار.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="apple-btn px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black shadow-xs cursor-pointer"
          >
            اعتماد وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppleThemeStudioModal;
