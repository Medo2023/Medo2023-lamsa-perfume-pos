import React, { useState, useEffect, useMemo } from 'react';
import {
  Sale,
  StoreSettings,
  ReceiptDesignConfig,
  DEFAULT_RECEIPT_DESIGN,
  DEFAULT_SETTINGS,
} from '../types';
import { generatePostSaleAIAdvice } from '../services/geminiService';
import {
  Printer,
  Share2,
  MessageSquare,
  X,
  Check,
  Copy,
  Smartphone,
  Store,
  Sparkles,
  Users,
  Settings2,
  RotateCcw,
  Type,
  Palette,
  Layout,
  Eye,
  Sliders,
  CheckCircle2,
  QrCode,
  FileText,
  AlignCenter,
  AlignRight,
  AlignLeft,
} from 'lucide-react';

export interface ThermalReceiptLiveViewProps {
  sale: Sale;
  design: ReceiptDesignConfig;
  branding: {
    storeName: string;
    storeSlogan: string;
    storePhone: string;
    storeAddress: string;
    storeTaxNumber: string;
    receiptFooterMessage: string;
    logoUrl: string;
    currency: string;
  };
  recipientName?: string;
  recipientPhone?: string;
  idAttribute?: string;
}

export const FONT_FAMILY_MAP: Record<ReceiptDesignConfig['fontFamily'], string> = {
  cairo: "'Cairo', 'Plus Jakarta Sans', sans-serif",
  tajawal: "'Tajawal', 'Cairo', sans-serif",
  monospace: "'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace",
  amiri: "'Amiri', 'Cormorant Garamond', Georgia, serif",
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Cairo', sans-serif",
};

export const FONT_WEIGHT_MAP: Record<ReceiptDesignConfig['fontWeight'], number> = {
  normal: 400,
  medium: 500,
  bold: 700,
  black: 900,
};

export const LINE_SPACING_MAP: Record<ReceiptDesignConfig['lineSpacing'], number> = {
  compact: 1.2,
  normal: 1.45,
  relaxed: 1.7,
};

export const ThermalReceiptLiveView: React.FC<ThermalReceiptLiveViewProps> = ({
  sale,
  design,
  branding,
  recipientName,
  recipientPhone,
  idAttribute = 'thermal-receipt',
}) => {
  const saleDate = useMemo(() => {
    const d = new Date(sale.date);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [sale.date]);

  const formattedDate = saleDate.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = saleDate.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalBottlesCount = useMemo(
    () => sale.items.reduce((acc, item) => acc + (item.quantity || 1), 0),
    [sale.items]
  );

  const totalGramsCount = useMemo(
    () => sale.items.reduce((acc, item) => acc + (item.essenceGrams || 0) * (item.quantity || 1), 0),
    [sale.items]
  );

  const effectivePrimaryColor = design.highContrastThermal ? '#000000' : design.primaryTextColor;
  const effectiveAccentColor = design.highContrastThermal ? '#000000' : design.accentColor;

  const borderClass =
    design.borderStyle === 'none'
      ? 'border-b-0'
      : design.borderStyle === 'solid'
      ? 'border-b border-solid'
      : design.borderStyle === 'dotted'
      ? 'border-b border-dotted'
      : design.borderStyle === 'double'
      ? 'border-b-4 border-double'
      : 'border-b border-dashed';

  const alignClass =
    design.headerAlignment === 'right'
      ? 'text-right items-start'
      : design.headerAlignment === 'left'
      ? 'text-left items-end'
      : 'text-center items-center';

  const customerNameDisplay = recipientName || sale.customerName || '';
  const customerPhoneDisplay = recipientPhone || sale.customerPhone || '';

  return (
    <div
      id={idAttribute}
      dir="rtl"
      style={{
        fontFamily: FONT_FAMILY_MAP[design.fontFamily] || FONT_FAMILY_MAP.cairo,
        fontSize: `${Math.min(13, design.baseFontSizePx)}px`,
        fontWeight: FONT_WEIGHT_MAP[design.fontWeight] || 700,
        lineHeight: LINE_SPACING_MAP[design.lineSpacing] || 1.3,
        color: effectivePrimaryColor,
        padding: `${Math.max(8, Math.min(14, design.paddingMm * 2.5))}px`,
        maxWidth:
          design.paperWidth === '58mm'
            ? '245px'
            : design.paperWidth === 'A4'
            ? '100%'
            : '340px',
      }}
      className="w-full mx-auto bg-white rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.06)] border border-black/[0.08] space-y-1.5 flex flex-col justify-between transition-all duration-200 select-none"
    >
      {/* 1. COMPACT HEADER & BRANDING */}
      <div
        className={`flex flex-col ${alignClass} space-y-0.5 pb-1.5 ${borderClass}`}
        style={{ borderColor: 'rgba(0,0,0,0.22)' }}
      >
        <div className="flex items-center justify-center gap-2">
          {design.showLogo && (
            branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.storeName}
                style={{
                  width: `${Math.min(36, design.logoSizePx)}px`,
                  height: `${Math.min(36, design.logoSizePx)}px`,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="object-contain shrink-0"
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: effectivePrimaryColor,
                  color: design.accentColor || '#C49746',
                }}
                className="rounded-full font-black flex items-center justify-center text-[11px] shrink-0"
              >
                ✨
              </div>
            )
          )}

          <div className={design.headerAlignment === 'center' ? 'text-center' : ''}>
            {design.showStoreName && (
              <h2
                style={{
                  fontSize: `${Math.min(17, design.headerTitleSizePx)}px`,
                  color: effectivePrimaryColor,
                  fontWeight: 900,
                }}
                className="tracking-tight leading-tight"
              >
                {branding.storeName || 'لمسة عطر'}
              </h2>
            )}

            {design.showStoreSlogan && branding.storeSlogan && (
              <p
                style={{
                  fontSize: `${Math.max(8.5, design.baseFontSizePx - 2)}px`,
                  color: effectiveAccentColor,
                  fontWeight: 800,
                }}
                className="leading-tight"
              >
                {branding.storeSlogan}
              </p>
            )}
          </div>
        </div>

        {(design.showStoreAddress || design.showStorePhone || design.showTaxNumber) && (
          <div
            style={{ fontSize: `${Math.max(8, design.baseFontSizePx - 2.5)}px` }}
            className="opacity-80 leading-tight flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-0.5"
          >
            {design.showStoreAddress && branding.storeAddress && (
              <span>{branding.storeAddress}</span>
            )}
            {design.showStorePhone && branding.storePhone && (
              <span className="font-mono font-bold" dir="ltr">
                📞 {branding.storePhone}
              </span>
            )}
            {design.showTaxNumber && branding.storeTaxNumber && (
              <span className="font-mono">ضريبي: {branding.storeTaxNumber}</span>
            )}
          </div>
        )}
      </div>

      {/* 2. INVOICE METADATA (2x2 COMPACT GRID - ALL DATA VISIBLE) */}
      {(design.showInvoiceNumber ||
        design.showDateTime ||
        design.showCashierName ||
        design.showCustomerInfo) && (
        <div
          className={`grid grid-cols-2 gap-x-2 gap-y-0.5 pb-1.5 ${borderClass}`}
          style={{
            borderColor: 'rgba(0,0,0,0.22)',
            fontSize: `${Math.max(8.5, design.baseFontSizePx - 2)}px`,
          }}
        >
          {design.showInvoiceNumber && (
            <div className="flex items-center justify-between gap-1">
              <span className="opacity-70">الفاتورة:</span>
              <span className="font-mono font-black">#{sale.id.slice(-6)}</span>
            </div>
          )}

          {design.showDateTime && (
            <div className="flex items-center justify-between gap-1">
              <span className="opacity-70">التاريخ:</span>
              <span className="font-mono truncate">{formattedDate} {formattedTime}</span>
            </div>
          )}

          {design.showCashierName && (
            <div className="flex items-center justify-between gap-1">
              <span className="opacity-70">الكاشير:</span>
              <span className="font-bold truncate">{sale.employeeName || 'طارق'}</span>
            </div>
          )}

          {design.showCustomerInfo && (
            <div className="flex items-center justify-between gap-1">
              <span className="opacity-70">العميل:</span>
              <span className="font-bold truncate">
                {customerNameDisplay || 'عميل المتجر'}
                {customerPhoneDisplay ? ` (${customerPhoneDisplay})` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. ITEMS TABLE (COMPLETE DETAILS) */}
      <div
        className={`space-y-1 pb-1.5 ${borderClass}`}
        style={{ borderColor: 'rgba(0,0,0,0.22)' }}
      >
        <div
          style={{ fontSize: `${Math.max(8, design.baseFontSizePx - 2.5)}px` }}
          className="flex justify-between font-bold opacity-65 pb-0.5 border-b border-black/10"
        >
          <span>الصنف والحجم والتركيز</span>
          <span>الإجمالي</span>
        </div>

        {sale.items.map((item, idx) => {
          const qty = item.quantity || 1;
          const unitPrice = item.sellingPrice;
          const lineTotal = unitPrice * qty;
          return (
            <div key={idx} className="py-0.5 border-b border-dotted border-black/[0.06] last:border-b-0">
              <div
                style={{ fontSize: `${Math.min(12, design.baseFontSizePx)}px` }}
                className="flex justify-between items-baseline gap-1.5"
              >
                <span className="font-black leading-tight">
                  {idx + 1}. {item.productName}
                  {qty > 1 ? ` (×${qty})` : ''}
                </span>
                <span className="font-mono font-black shrink-0">
                  {lineTotal} {branding.currency}
                </span>
              </div>

              {item.isMix && item.mixComponents && item.mixComponents.length > 0 && (
                <div
                  style={{ fontSize: `${Math.max(7.5, design.baseFontSizePx - 3)}px` }}
                  className="pr-2 text-amber-950 opacity-90 leading-tight my-0.5"
                >
                  <span className="font-bold">مكونات التركيبة: </span>
                  <span>
                    {item.mixComponents.map(c => `${c.productName} (${c.grams}جم · ${c.percentage}%)`).join(' + ')}
                  </span>
                </div>
              )}

              {(design.showBottleSizeAndGrams ||
                design.showPerfumeCategory ||
                design.showUnitPriceBreakdown) && (
                <div
                  style={{ fontSize: `${Math.max(8, design.baseFontSizePx - 2.5)}px` }}
                  className="flex justify-between items-center opacity-75 leading-tight mt-0.5"
                >
                  <div className="flex items-center gap-1 flex-wrap">
                    {design.showBottleSizeAndGrams && (
                      <span>
                        عبوة {item.bottleSize}مل {item.isColoredBottle ? '(ملونة)' : ''} · {item.essenceGrams}جم زيت
                      </span>
                    )}
                    {design.showPerfumeCategory && item.productType && (
                      <span>· {item.productType}</span>
                    )}
                  </div>
                  {design.showUnitPriceBreakdown && (
                    <span className="font-mono">
                      {qty} × {unitPrice} ج
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. FINANCIAL TOTALS */}
      <div
        className={`space-y-0.5 pb-1.5 ${borderClass}`}
        style={{ borderColor: 'rgba(0,0,0,0.22)' }}
      >
        <div
          style={{ fontSize: `${Math.max(8, design.baseFontSizePx - 2)}px` }}
          className="flex items-center justify-between opacity-80"
        >
          {design.showItemsCountSummary ? (
            <span>
              العبوات: <strong className="font-mono">{totalBottlesCount}</strong> ({totalGramsCount} جم زيت)
            </span>
          ) : <span />}
          {design.showPaymentMethod && (
            <span>
              الدفع: <strong>{sale.paymentMethod || 'نقدي'}</strong>
            </span>
          )}
        </div>

        {sale.packagingRevenue && sale.packagingRevenue > 0 ? (
          <div
            style={{ fontSize: `${Math.max(8, design.baseFontSizePx - 2)}px` }}
            className="flex justify-between opacity-80 font-bold"
          >
            <span>تغليف الهدايا الفاخر:</span>
            <span className="font-mono">
              +{sale.packagingRevenue} {branding.currency}
            </span>
          </div>
        ) : null}

        {design.showDiscountRow && sale.discount && sale.discount > 0 ? (
          <div
            style={{ fontSize: `${Math.max(8.5, design.baseFontSizePx - 1.5)}px` }}
            className="flex justify-between text-rose-700 font-bold"
          >
            <span>الخصم الممنوح:</span>
            <span className="font-mono">
              -{sale.discount} {branding.currency}
            </span>
          </div>
        ) : null}

        <div
          style={{
            fontSize: `${Math.min(16, design.totalFontSizePx)}px`,
            color: effectivePrimaryColor,
          }}
          className="flex justify-between items-center font-black pt-0.5"
        >
          <span>الإجمالي المسدد:</span>
          <span
            style={{ color: design.highContrastThermal ? '#000000' : effectiveAccentColor }}
            className="font-mono font-black"
          >
            {sale.totalPrice} {branding.currency}
          </span>
        </div>
      </div>

      {/* 5. COMPACT FOOTER, CARE TIP, POLICY & QR CODE SIDE-BY-SIDE */}
      <div className="pt-0.5 flex items-center justify-between gap-2">
        <div className="flex-1 space-y-0.5 text-right">
          {design.showPerfumeCareTip && design.perfumeCareTipText && (
            <p
              style={{ fontSize: `${Math.max(7.5, design.baseFontSizePx - 3)}px` }}
              className="leading-tight opacity-85"
            >
              <strong>✨ نصيحة:</strong> {design.perfumeCareTipText}
            </p>
          )}

          {design.showReturnPolicy && design.returnPolicyText && (
            <p
              style={{ fontSize: `${Math.max(7.5, design.baseFontSizePx - 3)}px` }}
              className="opacity-75 font-bold leading-tight"
            >
              🛡️ {design.returnPolicyText}
            </p>
          )}

          {design.showFooterMessage && branding.receiptFooterMessage && (
            <p
              style={{ fontSize: `${Math.max(7.5, design.baseFontSizePx - 3)}px` }}
              className="opacity-80 leading-tight font-medium"
            >
              {branding.receiptFooterMessage}
            </p>
          )}
        </div>

        {design.showQrCode && (
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="w-9 h-9 rounded-lg border border-black/20 flex items-center justify-center bg-white p-0.5">
              <QrCode size={26} className="text-black" />
            </div>
            <span className="text-[7px] font-mono opacity-65 mt-0.5">واتساب</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ReceiptModalProps {
  sale: Sale;
  settings: StoreSettings;
  onClose: () => void;
  onUpdateSettings?: (settings: StoreSettings) => void;
  previousCustomers?: { name: string; phone: string }[];
  currentDailyNetContribution?: number;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  settings,
  onClose,
  onUpdateSettings,
  previousCustomers = [],
  currentDailyNetContribution = 0,
}) => {
  const [recipientPhone, setRecipientPhone] = useState(sale.customerPhone || '');
  const [recipientName, setRecipientName] = useState(sale.customerName || 'عميلنا العزيز');
  const [copied, setCopied] = useState(false);
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [studioTab, setStudioTab] = useState<'elements' | 'typography' | 'layout' | 'branding'>('elements');
  const [showContactsPicker, setShowContactsPicker] = useState(false);
  const [postSaleAdvice, setPostSaleAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(true);
  const [waViewTab, setWaViewTab] = useState<'dispatch' | 'preview'>('dispatch');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Draft state for live preview before committing
  const [draftDesign, setDraftDesign] = useState<ReceiptDesignConfig>(() => ({
    ...DEFAULT_RECEIPT_DESIGN,
    ...(settings.receiptDesign || {}),
    showLogo: settings.receiptDesign?.showLogo ?? settings.showLogoOnReceipt ?? true,
  }));

  const [customStoreName, setCustomStoreName] = useState(settings.storeName || 'لمسة عطر');
  const [customStoreSlogan, setCustomStoreSlogan] = useState(settings.storeSlogan || 'أثر يبقى وذكرى تدوم');
  const [customStorePhone, setCustomStorePhone] = useState(settings.storePhone || '01123376728');
  const [customStoreAddress, setCustomStoreAddress] = useState(
    settings.storeAddress || 'أرقى الزيوت العطرية والتركيبات الخاصة'
  );
  const [customTaxNumber, setCustomTaxNumber] = useState(settings.storeTaxNumber || '');
  const [customFooter, setCustomFooter] = useState(
    settings.receiptFooterMessage || 'شكراً لثقتكم بنا! عطورنا مصممة بثبات وفوحان يدوم طويلاً.'
  );
  const [customLogoUrl, setCustomLogoUrl] = useState(
    settings.logoUrl || 'https://l.top4top.io/p_31142jfec0.png'
  );

  // Sync if external settings update
  useEffect(() => {
    setDraftDesign({
      ...DEFAULT_RECEIPT_DESIGN,
      ...(settings.receiptDesign || {}),
      showLogo: settings.receiptDesign?.showLogo ?? settings.showLogoOnReceipt ?? true,
    });
  }, [settings.receiptDesign, settings.showLogoOnReceipt]);

  // Load smart adaptive AI feedback on sale completion
  useEffect(() => {
    let isMounted = true;
    async function fetchAdvice() {
      try {
        const item = sale.items[0];
        const advice = await generatePostSaleAIAdvice({
          productName: item?.productName || 'عطر مركب',
          bottleSize: item?.bottleSize || 50,
          price: sale.totalPrice,
          profit: sale.totalProfit,
          cumulativeContribution:
            currentDailyNetContribution + (sale.totalProfit - (sale.commissionAmount || 0)),
          breakEvenTarget: 600,
        });
        if (isMounted) {
          setPostSaleAdvice(advice);
          setLoadingAdvice(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoadingAdvice(false);
        }
      }
    }
    fetchAdvice();
    return () => {
      isMounted = false;
    };
  }, [sale, currentDailyNetContribution]);

  // Auto-print on sale completion if enabled in receipt design settings
  useEffect(() => {
    if (settings.receiptDesign?.autoPrintOnSale) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [sale.id, settings.receiptDesign?.autoPrintOnSale]);

  // Approve & Apply changes to global store settings
  const handleApproveAndSaveDesign = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        storeName: customStoreName,
        storeSlogan: customStoreSlogan,
        storePhone: customStorePhone,
        storeAddress: customStoreAddress,
        storeTaxNumber: customTaxNumber,
        receiptFooterMessage: customFooter,
        logoUrl: customLogoUrl,
        showLogoOnReceipt: draftDesign.showLogo,
        receiptDesign: draftDesign,
      });
    }
    setSavedNotice('تم اعتماد وتطبيق إعدادات الفاتورة والطباعة بنجاح');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  // Smart Auto-Save for Receipt Design & Store Header edits inside ReceiptModal
  useEffect(() => {
    if (!onUpdateSettings) return;
    const nextSettings: StoreSettings = {
      ...settings,
      storeName: customStoreName,
      storeSlogan: customStoreSlogan,
      storePhone: customStorePhone,
      storeAddress: customStoreAddress,
      storeTaxNumber: customTaxNumber,
      receiptFooterMessage: customFooter,
      logoUrl: customLogoUrl,
      showLogoOnReceipt: draftDesign.showLogo,
      receiptDesign: draftDesign,
    };
    if (JSON.stringify(nextSettings) === JSON.stringify(settings)) return;
    const timer = window.setTimeout(() => {
      onUpdateSettings(nextSettings);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    draftDesign,
    customStoreName,
    customStoreSlogan,
    customStorePhone,
    customStoreAddress,
    customTaxNumber,
    customFooter,
    customLogoUrl,
  ]);

  // Restore Default Receipt Design in Live Preview
  const handleRestoreDefaults = () => {
    setDraftDesign(DEFAULT_RECEIPT_DESIGN);
    setCustomStoreName(DEFAULT_SETTINGS.storeName);
    setCustomStoreSlogan(DEFAULT_SETTINGS.storeSlogan || 'أثر يبقى وذكرى تدوم');
    setCustomStorePhone(DEFAULT_SETTINGS.storePhone || '01123376728');
    setCustomStoreAddress(
      DEFAULT_SETTINGS.storeAddress || 'متجر لمسة عطر - أرقى الزيوت العطرية والتركيبات الخاصة'
    );
    setCustomTaxNumber('');
    setCustomFooter(
      DEFAULT_SETTINGS.receiptFooterMessage ||
        'شكراً لثقتكم بنا! عطورنا مصممة بثبات وفوحان يدوم طويلاً.'
    );
    setCustomLogoUrl(DEFAULT_SETTINGS.logoUrl || 'https://l.top4top.io/p_31142jfec0.png');
    setSavedNotice('تمت استعادة الإعدادات الافتراضية في المعاينة الفورية — اضغط اعتماد للحفظ');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Revert unsaved draft modifications
  const handleCancelDraft = () => {
    setDraftDesign({
      ...DEFAULT_RECEIPT_DESIGN,
      ...(settings.receiptDesign || {}),
      showLogo: settings.receiptDesign?.showLogo ?? settings.showLogoOnReceipt ?? true,
    });
    setCustomStoreName(settings.storeName || 'لمسة عطر');
    setCustomStoreSlogan(settings.storeSlogan || 'أثر يبقى وذكرى تدوم');
    setCustomStorePhone(settings.storePhone || '01123376728');
    setCustomStoreAddress(settings.storeAddress || 'أرقى الزيوت العطرية والتركيبات الخاصة');
    setCustomTaxNumber(settings.storeTaxNumber || '');
    setCustomFooter(
      settings.receiptFooterMessage || 'شكراً لثقتكم بنا! عطورنا مصممة بثبات وفوحان يدوم طويلاً.'
    );
    setCustomLogoUrl(settings.logoUrl || 'https://l.top4top.io/p_31142jfec0.png');
    setIsEditingBranding(false);
  };

  // Format date nicely for WhatsApp
  const saleDate = new Date(sale.date);
  const formattedDate = saleDate.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = saleDate.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Compose clean, professional text for WhatsApp respecting visibility toggles
  const generateWhatsAppMessage = () => {
    const itemsList = sale.items
      .map((item, index) => {
        const qty = item.quantity || 1;
        const lineTotal = item.sellingPrice * qty;
        const qtyStr = qty > 1 ? ` (عدد ${qty} عبوات)` : '';
        const sizeStr = draftDesign.showBottleSizeAndGrams ? ` (${item.bottleSize} مل)` : '';
        const mixComponentsStr = item.isMix && item.mixComponents && item.mixComponents.length > 0
          ? `\n   ↳ _مكونات التركيبة: ${item.mixComponents.map(c => `${c.productName} (${c.grams}جم · ${c.percentage}%)`).join(' + ')}_`
          : '';
        return `${index + 1}. *${item.productName}*${sizeStr}${qtyStr} - ${lineTotal} ${settings.currency}${mixComponentsStr}`;
      })
      .join('\n');

    const lines: string[] = [];
    lines.push(`🧾 *فاتورة شراء - ${customStoreName}*`);
    if (draftDesign.showStoreSlogan && customStoreSlogan) {
      lines.push(`✨ _${customStoreSlogan}_`);
    }
    lines.push(`--------------------------------`);
    lines.push(`أهلاً بك يا ${recipientName} 🌸`);
    lines.push(`شكراً لاختيارك متجرنا!`);
    lines.push(``);
    if (draftDesign.showDateTime) {
      lines.push(`📅 التاريخ: ${formattedDate} - ${formattedTime}`);
    }
    if (draftDesign.showInvoiceNumber) {
      lines.push(`🔢 رقم الفاتورة: #${sale.id.slice(-6)}`);
    }
    lines.push(``);
    lines.push(`🛍️ *تفاصيل المشتريات:*`);
    lines.push(itemsList);
    lines.push(``);
    if (draftDesign.showDiscountRow && sale.discount && sale.discount > 0) {
      lines.push(`🎁 الخصم الممنوح: -${sale.discount} ${settings.currency}`);
    }
    lines.push(`💰 *الإجمالي المسدد:* *${sale.totalPrice} ${settings.currency}*`);
    if (draftDesign.showPaymentMethod) {
      lines.push(`💳 طريقة الدفع: ${sale.paymentMethod || 'نقدي'}`);
    }
    if (draftDesign.showPerfumeCareTip && draftDesign.perfumeCareTipText) {
      lines.push(``);
      lines.push(`✨ *نصيحة ثبات العطر:*`);
      lines.push(draftDesign.perfumeCareTipText);
    }
    lines.push(``);
    if (draftDesign.showStorePhone && customStorePhone) {
      lines.push(`📞 للتواصل والطلبات: ${customStorePhone}`);
    }
    if (draftDesign.showFooterMessage && customFooter) {
      lines.push(customFooter);
    }

    return lines.join('\n');
  };

  // Trigger Native Web Contacts Picker API
  const handlePickNativeContact = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const contacts = await (navigator as any).contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          if (contact.name && contact.name.length > 0) {
            setRecipientName(contact.name[0]);
          }
          if (contact.tel && contact.tel.length > 0) {
            const phone = contact.tel[0].replace(/\s+/g, '').replace(/-/g, '');
            setRecipientPhone(phone);
          }
        }
      } catch (err) {
        console.error('Native Contact Picker cancelled or not allowed', err);
      }
    } else {
      setShowContactsPicker(true);
    }
  };

  // Send directly to WhatsApp
  const handleSendWhatsApp = () => {
    if (!recipientPhone.trim()) {
      setSavedNotice('⚠️ يرجى كتابة أو اختيار رقم هاتف العميل أولاً');
      setTimeout(() => setSavedNotice(null), 2500);
      return;
    }

    let cleanedPhone = recipientPhone.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('01')) {
      cleanedPhone = '20' + cleanedPhone.slice(1);
    }

    const message = encodeURIComponent(generateWhatsAppMessage());
    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  // Copy invoice text
  const handleCopyText = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Print Thermal Receipt
  const handlePrint = () => {
    window.print();
  };

  const totalModalBottles = useMemo(
    () => sale.items.reduce((sum, it) => sum + (it.quantity || 1), 0),
    [sale.items]
  );
  const totalModalGrams = useMemo(
    () => sale.items.reduce((sum, it) => sum + (it.essenceGrams || 0) * (it.quantity || 1), 0),
    [sale.items]
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xl smart-modal-overlay animate-in fade-in duration-200">
      <div className="bg-[#FBFBFD]/98 backdrop-blur-2xl smart-modal-window rounded-[28px] w-full max-w-5xl max-h-[92vh] overflow-y-auto md:overflow-hidden shadow-[0_32px_90px_-15px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.7)_inset] border border-black/[0.08] flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
        
        {/* ======================================================== */}
        {/* LEFT / TOP: Live Interactive Thermal Receipt Preview      */}
        {/* ======================================================== */}
        <div className="w-full md:w-[405px] md:max-h-[92vh] bg-[#F2F2F7]/90 p-3.5 border-b md:border-b-0 md:border-l border-black/[0.08] flex flex-col justify-between shrink-0 min-h-0">
          {/* Top Bar of Preview */}
          <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] mb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
              <span className="text-xs font-black text-[#1D1D1F]">
                معاينة الفاتورة الكاملة ({draftDesign.paperWidth})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingBranding(!isEditingBranding)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isEditingBranding
                  ? 'bg-[#1D1D1F] text-white shadow-xs'
                  : 'bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3]/20'
              }`}
            >
              <Settings2 size={12} />
              <span>{isEditingBranding ? 'العودة للمشاركة' : 'تنسيق الفاتورة'}</span>
            </button>
          </div>

          {/* Smooth Scrollable Complete Live Preview Area (Top to Bottom Visibility) */}
          <div className="flex-1 min-h-0 max-h-[52vh] md:max-h-none overflow-y-auto overscroll-contain modal-scroll-area py-2 px-1 flex flex-col items-center justify-start">
            <ThermalReceiptLiveView
              sale={sale}
              design={draftDesign}
              branding={{
                storeName: customStoreName,
                storeSlogan: customStoreSlogan,
                storePhone: customStorePhone,
                storeAddress: customStoreAddress,
                storeTaxNumber: customTaxNumber,
                receiptFooterMessage: customFooter,
                logoUrl: customLogoUrl,
                currency: settings.currency,
              }}
              recipientName={recipientName}
              recipientPhone={recipientPhone}
            />
          </div>

          {/* Direct Print & Quick Paper Width Switcher */}
          <div className="pt-2.5 border-t border-black/[0.06] space-y-2 shrink-0 mt-2 bg-[#F2F2F7]/95">
            <div className="flex items-center justify-between gap-1.5 bg-black/[0.05] p-1 rounded-xl">
              {(['80mm', '58mm', 'A4'] as const).map((pw) => (
                <button
                  key={pw}
                  type="button"
                  onClick={() => setDraftDesign((prev) => ({ ...prev, paperWidth: pw }))}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    draftDesign.paperWidth === pw
                      ? 'bg-white text-[#1D1D1F] shadow-2xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {pw === '80mm' ? '80mm قياسي' : pw === '58mm' ? '58mm مدمج' : 'A4 رسمي'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="apple-btn w-full py-2.5 rounded-2xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة الفاتورة الآن ({draftDesign.paperWidth})</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT: Complete Invoice Details & WhatsApp Dispatch      */}
        {/* ======================================================== */}
        <div className="flex-1 md:max-h-[92vh] p-4 sm:p-5 flex flex-col justify-between gap-2.5 min-h-0 overflow-hidden">
          
          {/* Top Apple Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-2xs ${
                  isEditingBranding
                    ? 'bg-[#0071E3] text-white'
                    : 'bg-emerald-500/12 text-emerald-600'
                }`}
              >
                {isEditingBranding ? <Sliders size={19} /> : <Share2 size={19} />}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                  {isEditingBranding
                    ? 'استوديو التحكم الشامل في الفاتورة والطباعة (معاينة فورية)'
                    : 'مشاركة الفاتورة والتوجيه الذكي للمبيعات'}
                </h2>
                <p className="text-[11px] text-[#86868B]">
                  {isEditingBranding
                    ? 'تحكم في إظهار أو إخفاء كل عنصر، الخط، الحجم، السُمك، واللون قبل الاعتماد'
                    : 'إرسال فوري عبر WhatsApp أو تخصيص تصميم الفاتورة الحرارية'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-all cursor-pointer"
              title="إغلاق"
            >
              <X size={16} />
            </button>
          </div>

          {savedNotice && (
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shrink-0 animate-in fade-in duration-150">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* If Comprehensive Receipt Studio Mode is Active */}
          {isEditingBranding ? (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-3 overflow-hidden">
              {/* Apple Segmented Control for Studio Tabs */}
              <div className="grid grid-cols-4 gap-1 bg-[#F2F2F7] p-1 rounded-2xl border border-black/[0.05] shrink-0">
                {[
                  { id: 'elements', label: 'العناصر (18)', icon: Eye },
                  { id: 'typography', label: 'الخط واللون', icon: Type },
                  { id: 'layout', label: 'الورق والإطار', icon: Layout },
                  { id: 'branding', label: 'النصوص والهوية', icon: Store },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = studioTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setStudioTab(t.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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

              {/* Studio Tab Content Area */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scroll-area pr-1 space-y-3">
                {/* TAB 1: GRANULAR ELEMENT VISIBILITY (18 TOGGLES) */}
                {studioTab === 'elements' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-[#86868B]">
                        اختر العناصر التي تظهر أو تختفي في الفاتورة (تحديث لحظي في المعاينة):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDraftDesign((prev) => ({
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
                          className="px-2 py-0.5 rounded-lg bg-[#0071E3]/10 text-[#0071E3] text-[10px] font-bold cursor-pointer"
                        >
                          إظهار الكل
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftDesign((prev) => ({
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
                          className="px-2 py-0.5 rounded-lg bg-black/[0.05] text-[#1D1D1F] text-[10px] font-bold cursor-pointer"
                        >
                          إيصال مختصر
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {[
                        { key: 'showLogo', label: 'شعار المتجر (Logo)' },
                        { key: 'showStoreName', label: 'اسم المتجر الرئيسي' },
                        { key: 'showStoreSlogan', label: 'الشعار اللفظي (السلوجان)' },
                        { key: 'showStoreAddress', label: 'عنوان المعرض' },
                        { key: 'showStorePhone', label: 'رقم الهاتف والواتساب' },
                        { key: 'showTaxNumber', label: 'الرقم الضريبي / السجل' },
                        { key: 'showInvoiceNumber', label: 'رقم الفاتورة التسلسلي' },
                        { key: 'showDateTime', label: 'التاريخ والوقت' },
                        { key: 'showCashierName', label: 'اسم مسؤول المبيعات' },
                        { key: 'showCustomerInfo', label: 'اسم ورقم العميل' },
                        { key: 'showBottleSizeAndGrams', label: 'حجم العبوة وجرامات الزيت' },
                        { key: 'showPerfumeCategory', label: 'تصنيف العطر (عادي/عود)' },
                        { key: 'showUnitPriceBreakdown', label: 'تفصيل (الكمية × السعر)' },
                        { key: 'showItemsCountSummary', label: 'إجمالي عدد العبوات' },
                        { key: 'showDiscountRow', label: 'سطر الخصم الممنوح' },
                        { key: 'showPaymentMethod', label: 'طريقة السداد' },
                        { key: 'showPerfumeCareTip', label: 'نصيحة ثبات وفوحان العطر' },
                        { key: 'showReturnPolicy', label: 'ضمان الثبات والاستبدال' },
                        { key: 'showFooterMessage', label: 'رسالة الشكر الختامية' },
                        { key: 'showQrCode', label: 'رمز QR السريع أسفل الفاتورة' },
                      ].map((item) => {
                        const checked = Boolean((draftDesign as any)[item.key]);
                        return (
                          <label
                            key={item.key}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              checked
                                ? 'bg-white border-[#0071E3]/40 shadow-2xs'
                                : 'bg-black/[0.02] border-black/[0.06] opacity-70'
                            }`}
                          >
                            <span className="text-[11px] font-bold text-[#1D1D1F] leading-tight">
                              {item.label}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setDraftDesign((prev) => ({
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

                {/* TAB 2: TYPOGRAPHY, SIZES, WEIGHT & COLORS */}
                {studioTab === 'typography' && (
                  <div className="space-y-3 text-xs">
                    {/* Font Family Selection */}
                    <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-2">
                      <label className="font-black text-[#1D1D1F] block text-[11px]">
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
                              setDraftDesign((prev) => ({
                                ...prev,
                                fontFamily: f.id as ReceiptDesignConfig['fontFamily'],
                              }))
                            }
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                              draftDesign.fontFamily === f.id
                                ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                                : 'bg-[#F5F5F7] text-[#1D1D1F] border-transparent hover:bg-black/[0.06]'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sliders for Font Sizes & Logo Size */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px] text-[#1D1D1F]">حجم الخط الأساسي:</span>
                          <span className="font-mono font-black text-[#0071E3] text-xs">
                            {draftDesign.baseFontSizePx}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={9}
                          max={16}
                          step={1}
                          value={draftDesign.baseFontSizePx}
                          onChange={(e) =>
                            setDraftDesign((prev) => ({
                              ...prev,
                              baseFontSizePx: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#0071E3] cursor-pointer"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px] text-[#1D1D1F]">حجم عنوان المتجر:</span>
                          <span className="font-mono font-black text-[#0071E3] text-xs">
                            {draftDesign.headerTitleSizePx}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={24}
                          step={1}
                          value={draftDesign.headerTitleSizePx}
                          onChange={(e) =>
                            setDraftDesign((prev) => ({
                              ...prev,
                              headerTitleSizePx: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#0071E3] cursor-pointer"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px] text-[#1D1D1F]">حجم خط الإجمالي المسدد:</span>
                          <span className="font-mono font-black text-[#0071E3] text-xs">
                            {draftDesign.totalFontSizePx}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={22}
                          step={1}
                          value={draftDesign.totalFontSizePx}
                          onChange={(e) =>
                            setDraftDesign((prev) => ({
                              ...prev,
                              totalFontSizePx: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#0071E3] cursor-pointer"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px] text-[#1D1D1F]">حجم الشعار (Logo):</span>
                          <span className="font-mono font-black text-[#0071E3] text-xs">
                            {draftDesign.logoSizePx}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={28}
                          max={80}
                          step={2}
                          value={draftDesign.logoSizePx}
                          onChange={(e) =>
                            setDraftDesign((prev) => ({
                              ...prev,
                              logoSizePx: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#0071E3] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Font Weight & Line Spacing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-2">
                        <span className="font-bold text-[11px] text-[#1D1D1F] block">
                          سُمك الخط (Font Weight):
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: 'normal', label: 'عادي' },
                            { id: 'medium', label: 'متوسط' },
                            { id: 'bold', label: 'عريض' },
                            { id: 'black', label: 'داكن جداً' },
                          ].map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() =>
                                setDraftDesign((prev) => ({
                                  ...prev,
                                  fontWeight: w.id as ReceiptDesignConfig['fontWeight'],
                                }))
                              }
                              className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                                draftDesign.fontWeight === w.id
                                  ? 'bg-[#0071E3] text-white'
                                  : 'bg-[#F5F5F7] text-[#1D1D1F]'
                              }`}
                            >
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-2">
                        <span className="font-bold text-[11px] text-[#1D1D1F] block">
                          تباعد الأسطر (Line Spacing):
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'compact', label: 'مدمج للورق' },
                            { id: 'normal', label: 'متوازن' },
                            { id: 'relaxed', label: 'مريح' },
                          ].map((ls) => (
                            <button
                              key={ls.id}
                              type="button"
                              onClick={() =>
                                setDraftDesign((prev) => ({
                                  ...prev,
                                  lineSpacing: ls.id as ReceiptDesignConfig['lineSpacing'],
                                }))
                              }
                              className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                                draftDesign.lineSpacing === ls.id
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

                    {/* Colors & High Contrast Thermal Switch */}
                    <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[11px] text-[#1D1D1F] block">
                            وضع الطباعة الحرارية فائقة السواد (High-Contrast Thermal):
                          </span>
                          <span className="text-[10px] text-[#86868B]">
                            يوحد كافة النصوص بالأسود الداكن #000000 لأعلى وضوح على ورق الكاشير الحراري
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={draftDesign.highContrastThermal}
                          onChange={(e) =>
                            setDraftDesign((prev) => ({
                              ...prev,
                              highContrastThermal: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-[#0071E3] rounded cursor-pointer"
                        />
                      </div>

                      {!draftDesign.highContrastThermal && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/[0.06]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#1D1D1F]">لون النص الرئيسي:</span>
                            <div className="flex items-center gap-1.5">
                              {['#000000', '#1D1D1F', '#1E293B', '#14532D'].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() =>
                                    setDraftDesign((prev) => ({ ...prev, primaryTextColor: c }))
                                  }
                                  style={{ backgroundColor: c }}
                                  className={`w-5 h-5 rounded-full border ${
                                    draftDesign.primaryTextColor === c
                                      ? 'ring-2 ring-[#0071E3] ring-offset-1'
                                      : 'border-black/20'
                                  }`}
                                />
                              ))}
                              <input
                                type="color"
                                value={draftDesign.primaryTextColor}
                                onChange={(e) =>
                                  setDraftDesign((prev) => ({
                                    ...prev,
                                    primaryTextColor: e.target.value,
                                  }))
                                }
                                className="w-6 h-6 rounded border-0 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#1D1D1F]">لون التمييز والإجمالي:</span>
                            <div className="flex items-center gap-1.5">
                              {['#C49746', '#0071E3', '#059669', '#000000'].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() =>
                                    setDraftDesign((prev) => ({ ...prev, accentColor: c }))
                                  }
                                  style={{ backgroundColor: c }}
                                  className={`w-5 h-5 rounded-full border ${
                                    draftDesign.accentColor === c
                                      ? 'ring-2 ring-[#0071E3] ring-offset-1'
                                      : 'border-black/20'
                                  }`}
                                />
                              ))}
                              <input
                                type="color"
                                value={draftDesign.accentColor}
                                onChange={(e) =>
                                  setDraftDesign((prev) => ({
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

                {/* TAB 3: PAPER, PADDING, BORDERS & ALIGNMENT */}
                {studioTab === 'layout' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-2">
                        <span className="font-bold text-[11px] text-[#1D1D1F] block">
                          نمط الفواصل والخطوط (Border Style):
                        </span>
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
                                setDraftDesign((prev) => ({
                                  ...prev,
                                  borderStyle: b.id as ReceiptDesignConfig['borderStyle'],
                                }))
                              }
                              className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                                draftDesign.borderStyle === b.id
                                  ? 'bg-[#1D1D1F] text-white'
                                  : 'bg-[#F5F5F7] text-[#1D1D1F]'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-2">
                        <span className="font-bold text-[11px] text-[#1D1D1F] block">
                          محاذاة الترويسة والشعار:
                        </span>
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
                                  setDraftDesign((prev) => ({
                                    ...prev,
                                    headerAlignment: al.id as ReceiptDesignConfig['headerAlignment'],
                                  }))
                                }
                                className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                  draftDesign.headerAlignment === al.id
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

                    <div className="p-3 rounded-2xl bg-white border border-black/[0.07] space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[11px] text-[#1D1D1F]">
                          الهامش الداخلي للورقة (Padding):
                        </span>
                        <span className="font-mono font-black text-[#0071E3]">
                          {draftDesign.paddingMm} ملم
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={10}
                        step={1}
                        value={draftDesign.paddingMm}
                        onChange={(e) =>
                          setDraftDesign((prev) => ({
                            ...prev,
                            paddingMm: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-[#0071E3] cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-black/[0.07] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[11px] text-[#1D1D1F] block">
                          الطباعة التلقائية الفورية عند إتمام البيع:
                        </span>
                        <span className="text-[10px] text-[#86868B]">
                          فتح نافذة الطابعة الحرارية تلقائياً بمجرد اعتماد الفاتورة بالكاشير
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={draftDesign.autoPrintOnSale}
                        onChange={(e) =>
                          setDraftDesign((prev) => ({
                            ...prev,
                            autoPrintOnSale: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-[#0071E3] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: BRANDING & CUSTOM RECEIPT TEXTS */}
                {studioTab === 'branding' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="font-bold text-[#1D1D1F] block mb-1 text-[11px]">اسم المتجر:</label>
                      <input
                        type="text"
                        value={customStoreName}
                        onChange={(e) => setCustomStoreName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs font-bold text-[#1D1D1F]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#1D1D1F] block mb-1 text-[11px]">
                        الشعار اللفظي (السلوجان):
                      </label>
                      <input
                        type="text"
                        value={customStoreSlogan}
                        onChange={(e) => setCustomStoreSlogan(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs font-bold text-[#C49746]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#1D1D1F] block mb-1 text-[11px]">
                        هاتف وواتساب المتجر:
                      </label>
                      <input
                        type="text"
                        value={customStorePhone}
                        onChange={(e) => setCustomStorePhone(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs font-mono font-bold text-[#1D1D1F]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#1D1D1F] block mb-1 text-[11px]">عنوان المعرض:</label>
                      <input
                        type="text"
                        value={customStoreAddress}
                        onChange={(e) => setCustomStoreAddress(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs text-[#1D1D1F]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-[#1D1D1F] block mb-1 text-[11px]">
                        نصيحة ثبات وفوحان العطر المطبوعة للعميل:
                      </label>
                      <input
                        type="text"
                        value={draftDesign.perfumeCareTipText}
                        onChange={(e) =>
                          setDraftDesign((prev) => ({
                            ...prev,
                            perfumeCareTipText: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs text-[#1D1D1F]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-[#1D1D1F] block mb-1 text-[11px]">
                        عبارة الضمان وسياسة الاستبدال:
                      </label>
                      <input
                        type="text"
                        value={draftDesign.returnPolicyText}
                        onChange={(e) =>
                          setDraftDesign((prev) => ({
                            ...prev,
                            returnPolicyText: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs text-[#1D1D1F]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-[#1D1D1F] block mb-1 text-[11px]">
                        رسالة الشكر الختامية (أسفل الفاتورة):
                      </label>
                      <input
                        type="text"
                        value={customFooter}
                        onChange={(e) => setCustomFooter(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.1] text-xs text-[#1D1D1F]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Studio Action Footer: Restore Defaults, Cancel, Approve & Apply */}
              <div className="pt-2.5 border-t border-black/[0.08] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="apple-btn px-3 py-2 rounded-xl bg-black/[0.05] hover:bg-black/[0.1] text-[#1D1D1F] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>استعادة الافتراضي</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelDraft}
                    className="px-3.5 py-2 rounded-xl bg-white border border-black/[0.1] text-xs font-bold text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveAndSaveDesign}
                    className="apple-btn px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check size={14} />
                    <span>اعتماد وتطبيق الإعدادات</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Mode: Complete Invoice Data Summary + Items List + WhatsApp Dispatch (Smooth Top-to-Bottom Scroll) */
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scroll-area space-y-3 pr-1">
                {/* Complete Invoice Data Grid (All Invoice Metadata Visible at a Glance) */}
                <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-1.5">
                    <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                      <FileText size={13} className="text-[#0071E3]" />
                      <span>كافة بيانات وتفاصيل الفاتورة المعتمدة</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#34C759]/15 text-[#248A3D] font-mono text-[10px] font-black">
                      مسجلة ومعتمدة ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                      <span className="text-[9.5px] text-[#86868B] block">رقم الفاتورة والتوقيت</span>
                      <strong className="font-mono text-[#1D1D1F] block mt-0.5">
                        #{sale.id.slice(-6)} · {formattedTime}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                      <span className="text-[9.5px] text-[#86868B] block">مسؤول المبيعات والدفع</span>
                      <strong className="text-[#1D1D1F] block mt-0.5 truncate">
                        {sale.employeeName || 'طارق'} · {sale.paymentMethod || 'نقدي'}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-black/[0.05]">
                      <span className="text-[9.5px] text-[#86868B] block">إجمالي العبوات والزيوت</span>
                      <strong className="font-mono text-[#1D1D1F] block mt-0.5">
                        {totalModalBottles} عبوة ({totalModalGrams} جم)
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-[#0071E3]/10 border border-[#0071E3]/25">
                      <span className="text-[9.5px] text-[#0071E3] font-bold block">الصافي المسدد</span>
                      <strong className="font-mono font-black text-xs text-[#0071E3] block mt-0.5">
                        {sale.totalPrice.toLocaleString('ar-EG')} {settings.currency}
                        {sale.discount ? ` (خصم ${sale.discount})` : ''}
                      </strong>
                    </div>
                  </div>

                  {/* Detailed Items Breakdown inside the Modal Right Pane */}
                  <div className="pt-1 border-t border-black/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#86868B] px-1">
                      <span>الأصناف والتركيبات المسجلة ({sale.items.length}):</span>
                      <span>الإجمالي الفرعي</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto modal-scroll-area pr-0.5">
                      {sale.items.map((item, idx) => {
                        const qty = item.quantity || 1;
                        const lineTotal = item.sellingPrice * qty;
                        return (
                          <div
                            key={idx}
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-black/[0.05] flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[#1D1D1F] truncate">
                                {idx + 1}. {item.productName} {qty > 1 ? `(×${qty})` : ''}
                              </div>
                              <div className="text-[10px] text-[#86868B] truncate">
                                عبوة {item.bottleSize}مل · {item.essenceGrams}جم زيت{' '}
                                {item.brand ? `· ${item.brand}` : ''}
                              </div>
                            </div>
                            <span className="font-mono font-black text-[#1D1D1F] shrink-0">
                              {lineTotal.toLocaleString('ar-EG')} {settings.currency}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Segmented Switch: WhatsApp Dispatch vs Message Preview */}
                <div className="flex items-center justify-between bg-[#F2F2F7] p-1 rounded-xl border border-black/[0.05]">
                  <button
                    type="button"
                    onClick={() => setWaViewTab('dispatch')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      waViewTab === 'dispatch'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-[#86868B]'
                    }`}
                  >
                    📲 إرسال الفاتورة عبر WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaViewTab('preview')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      waViewTab === 'preview'
                        ? 'bg-white text-[#1D1D1F] shadow-2xs'
                        : 'text-[#86868B]'
                    }`}
                  >
                    👁️ معاينة نص الرسالة المرسلة
                  </button>
                </div>

                {waViewTab === 'dispatch' ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col justify-between gap-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="font-bold text-emerald-950 block mb-1">اسم العميل:</label>
                        <input
                          type="text"
                          placeholder="اسم العميل"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-white border border-emerald-300 text-xs font-semibold text-[#1D1D1F] focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-emerald-950 block">
                            رقم هاتف العميل (واتساب):
                          </label>
                          <button
                            type="button"
                            onClick={handlePickNativeContact}
                            className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 bg-emerald-100/80 px-2 py-0.5 rounded-lg cursor-pointer"
                          >
                            <Users size={11} />
                            <span>اختيار عميل</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="01xxxxxxxxx"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            className="w-full h-9 pr-9 pl-3 rounded-xl bg-white border border-emerald-300 text-xs font-mono font-bold text-[#1D1D1F] focus:outline-none focus:border-emerald-600 text-left"
                            dir="ltr"
                          />
                          <Smartphone
                            size={15}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
                          />
                        </div>
                      </div>
                    </div>

                    {showContactsPicker && previousCustomers.length > 0 && (
                      <div className="p-2 rounded-xl bg-white border border-emerald-200 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-700">
                          <span>العملاء المسجلون سابقاً بالمتجر:</span>
                          <button
                            type="button"
                            onClick={() => setShowContactsPicker(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {previousCustomers.slice(0, 6).map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setRecipientName(c.name);
                                setRecipientPhone(c.phone);
                                setShowContactsPicker(false);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 text-[10px] text-gray-800 transition-colors border border-emerald-200/60 cursor-pointer"
                            >
                              <span className="font-bold">{c.name}</span>
                              <span className="font-mono text-gray-500">{c.phone}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="apple-btn flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <MessageSquare size={15} />
                        <span>إرسال الفاتورة عبر WhatsApp فوراً</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="apple-btn px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100/50 cursor-pointer"
                      >
                        {copied ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                        <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between gap-2">
                    <pre className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] text-[11px] text-[#1D1D1F] font-sans leading-snug whitespace-pre-wrap max-h-60 overflow-y-auto modal-scroll-area">
                      {generateWhatsAppMessage()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Bottom Dialog Action */}
              <div className="pt-2.5 border-t border-black/[0.06] flex items-center justify-between shrink-0 bg-[#FBFBFD]">
                <span className="text-xs text-[#86868B]">
                  رقم العملية: <strong className="text-[#1D1D1F] font-mono">#{sale.id}</strong>
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className="apple-btn px-6 py-2 rounded-xl bg-black/[0.06] hover:bg-black/[0.1] text-[#1D1D1F] text-xs font-bold cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic @media print CSS respecting user's exact paper width & settings */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: ${draftDesign.paperWidth === '58mm' ? '58mm' : draftDesign.paperWidth === 'A4' ? '210mm' : '80mm'} !important;
            max-width: ${draftDesign.paperWidth === '58mm' ? '58mm' : draftDesign.paperWidth === 'A4' ? '210mm' : '80mm'} !important;
            padding: ${draftDesign.paddingMm}mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          @page {
            size: ${draftDesign.paperWidth === '58mm' ? '58mm auto' : draftDesign.paperWidth === 'A4' ? 'A4 portrait' : '80mm auto'};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;
