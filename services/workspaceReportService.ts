import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import {
  Sale,
  Expense,
  Product,
  StoreSettings,
  DailyClosure,
  AuditLogRecord,
  CustomCustomerRecord,
  AutomatedDailyReportItem,
  isActualPaidOperationalExpense,
  isLiveProductionSale,
  calculateCashDrawerReconciliation,
  calculateDailyAccountingSeparation,
} from '../types';

// Official Google Workspace Scopes configured via set_up_oauth
export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/forms.body',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Strictly in-memory token cache (NEVER stored in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let connectedGoogleEmail: string | null = null;

export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && !user.isAnonymous) {
      connectedGoogleEmail = user.email || null;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      connectedGoogleEmail = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleWorkspaceSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    provider.setCustomParameters({ prompt: 'consent' });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم استلام رمز الصلاحية (Access Token) من حساب جوجل.');
    }
    cachedAccessToken = credential.accessToken;
    connectedGoogleEmail = result.user.email || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getConnectedGoogleEmail = (): string | null => {
  return connectedGoogleEmail;
};

export const workspaceLogout = async () => {
  cachedAccessToken = null;
  connectedGoogleEmail = null;
};

// ============================================================================
// BUILD COMPREHENSIVE DAILY CLOSING REPORT (PLAIN TEXT + LUXURY APPLE HTML)
// ============================================================================
export function buildDailyClosingReport(params: {
  targetDate?: string; // YYYY-MM-DD
  triggerType: 'midnight_auto' | 'day_closure' | 'manual_instant';
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  settings?: StoreSettings;
  currentClosure?: DailyClosure | null;
  auditLogs?: AuditLogRecord[];
  customCustomers?: CustomCustomerRecord[];
  executedBy?: string;
}): AutomatedDailyReportItem {
  const reportDate = params.targetDate || new Date().toISOString().slice(0, 10);
  const storeName = params.settings?.storeName || 'لمسة عطر';
  const currency = params.settings?.currency || 'ج.م';
  const recipientEmail = params.settings?.storeEmail?.trim() || 'lamsteitr@gmail.com';
  const whatsappPhone =
    params.settings?.storeWhatsAppPrimary?.trim() ||
    params.settings?.storePhone?.trim() ||
    '01123376728';
  const whatsappSecondaryPhone =
    params.settings?.storeWhatsAppSecondary?.trim() || '01062018755';
  const whatsappManager =
    params.settings?.storeWhatsAppManager || 'طارق (مسؤول المبيعات والواتساب)';

  const daySales = params.sales.filter(
    (s) => s.date && s.date.startsWith(reportDate) && isLiveProductionSale(s)
  );
  // §1, §2, §36, §93: فقط المصروفات النقدية اليومية المدفوعة فعلياً من الدرج (دون خلط موازنة الـ 15,000 الشهرية أبداً)
  const dayExpenses = params.expenses.filter(
    (e) => e.date && e.date.startsWith(reportDate) && isActualPaidOperationalExpense(e)
  );

  const totalDiscounts = daySales.reduce(
    (acc, s) => acc + (s.discount || 0) + (s.loyaltyDiscountAmount || 0),
    0
  );
  const totalRevenue = daySales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const grossSalesBeforeDiscount = totalRevenue + totalDiscounts;
  const rawMaterialCost = daySales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const commissions = daySales.reduce(
    (acc, s) => acc + (s.commissionAmount ?? Math.round((s.totalPrice || 0) * 0.05)),
    0
  );

  const cashSales = daySales
    .filter((s) => !s.paymentMethod || s.paymentMethod === 'نقدي')
    .reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const cardSales = daySales
    .filter((s) => s.paymentMethod === 'بطاقة')
    .reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const walletSales = daySales
    .filter((s) => s.paymentMethod === 'محفظة إلكترونية' || s.paymentMethod === 'تحويل بنكي')
    .reduce((acc, s) => acc + (s.totalPrice || 0), 0);

  const directExpenses = dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const dailyFixedBudgetShare = Math.round(
    (params.settings?.monthlyFixedBudget || 15000) /
      (params.settings?.monthlyWorkDays || 25)
  );

  // §37, §57, §93: الفصل التام بين المساهمة ونتيجة اليوم وفق الموازنة وبين الخزنة
  const dailyAccounting = calculateDailyAccountingSeparation({
    grossSales: grossSalesBeforeDiscount,
    discounts: totalDiscounts,
    netSales: totalRevenue,
    productCost: rawMaterialCost,
    commissions,
    plannedDailyAllocation: dailyFixedBudgetShare,
    actualCashExpensesPaidToday: directExpenses,
  });

  // grossProfit = المساهمة (صافي المبيعات ← تكلفة المنتجات المباعة ← العمولة المتغيرة)
  const grossProfit = dailyAccounting.contribution;
  // netProfit = نتيجة التشغيل وفق الموازنة (تظهر فقط من البيانات الفعلية المسجلة)
  const netProfit = daySales.length > 0 ? dailyAccounting.dailyResultVsBudget : 0;

  // §36, §38, §39: تسوية الخزنة المستقلة تماماً عن المساهمة والربح
  const drawerRec = calculateCashDrawerReconciliation({
    openingBalance: params.currentClosure?.openingCashBalance || 0,
    cashSales,
    cashExpensesPaidFromDrawer: directExpenses,
    actualCashCounted: params.currentClosure?.actualCashInDrawer,
  });

  let bottlesSold = 0;
  let gramsConsumed = 0;
  const perfumeStats = new Map<string, { qty: number; grams: number; revenue: number }>();

  daySales.forEach((s) => {
    (s.items || []).forEach((it) => {
      const q = it.quantity || 1;
      bottlesSold += q;
      gramsConsumed += (it.essenceGrams || 0) * q;
      const cur = perfumeStats.get(it.productName) || { qty: 0, grams: 0, revenue: 0 };
      perfumeStats.set(it.productName, {
        qty: cur.qty + q,
        grams: cur.grams + (it.essenceGrams || 0) * q,
        revenue: cur.revenue + (it.sellingPrice || 0) * q,
      });
    });
  });

  const topPerfumes = Array.from(perfumeStats.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8);

  const lowStockProducts = params.products.filter((p) => p.stock_grams < 100);
  const dayAuditLogs = (params.auditLogs || [])
    .filter((l) => l.timestamp && l.timestamp.startsWith(reportDate))
    .slice(0, 10);

  const triggerLabel =
    params.triggerType === 'midnight_auto'
      ? 'إغلاق منتصف الليل التلقائي (12:00 ص)'
      : params.triggerType === 'day_closure'
      ? 'تقرير إغلاق اليوم والدرج الرسمي'
      : 'تقرير فوري شامل';

  const closureStatusText = params.currentClosure
    ? `${params.currentClosure.status} (افتتاحي: ${drawerRec.openingBalance} ${currency} | المتوقع: ${drawerRec.expectedCash} ${currency} | الجرد الفعلي: ${drawerRec.actualCash} ${currency} | فرق الخزنة: ${drawerRec.cashDifference} ${currency} [${drawerRec.statusBadgeAr}])`
    : `لم يسجل إغلاق يدوي للدرج (النقدية المتوقعة من المبيعات: ${drawerRec.expectedCash} ${currency})`;

  const subject = `📊 تقرير إغلاق اليوم (${reportDate}) — ${storeName} | صافي المبيعات: ${totalRevenue.toLocaleString('ar-EG')} ${currency} | المساهمة: ${grossProfit.toLocaleString('ar-EG')} ${currency}`;

  const plainLines: string[] = [
    `====================================================================`,
    `   ${storeName} — ${triggerLabel} (§57–§58)`,
    `====================================================================`,
    `1. بيانات التقرير وحالة اليوم:`,
    `--------------------------------------------------------------------`,
    `• تاريخ التقرير         : ${reportDate}`,
    `• وقت الإنشاء           : ${new Date().toLocaleString('ar-EG')}`,
    `• المسؤول عن الإغلاق    : ${params.executedBy || whatsappManager}`,
    `• البريد الرسمي للمتجر   : ${recipientEmail}`,
    `• واتساب المتجر الرسمي   : ${whatsappPhone} / ${whatsappSecondaryPhone}`,
    `• حالة اليوم والدرج     : ${closureStatusText}`,
    `--------------------------------------------------------------------`,
    `2. ملخص المبيعات (إجمالي، خصومات، صافي، نقدي، إلكتروني):`,
    `--------------------------------------------------------------------`,
    `• عدد الفواتير المصدرة : ${daySales.length} فاتورة (${bottlesSold} عبوة | ${gramsConsumed} جم زيت)`,
    `• إجمالي المبيعات قبل الخصم: ${dailyAccounting.grossSales.toLocaleString('ar-EG')} ${currency}`,
    `• إجمالي الخصومات والولاء  : ${dailyAccounting.discounts.toLocaleString('ar-EG')} ${currency}`,
    `• صافي المبيعات المعتمد   : ${totalRevenue.toLocaleString('ar-EG')} ${currency}`,
    `  - نقدي (كاش)        : ${cashSales.toLocaleString('ar-EG')} ${currency}`,
    `  - بطاقة بنكية        : ${cardSales.toLocaleString('ar-EG')} ${currency}`,
    `  - محفظة / تحويل بنكي : ${walletSales.toLocaleString('ar-EG')} ${currency}`,
    `--------------------------------------------------------------------`,
    `3. النتيجة التشغيلية لليوم والمخصص وفق الموازنة (§37 & §93):`,
    `--------------------------------------------------------------------`,
    ...(daySales.length === 0
      ? [
          `• الحالة اليومية          : لا توجد بيانات مبيعات فعلية مسجلة لهذا اليوم`,
          `• المخصص التخطيطي اليومي  : ${dailyAccounting.plannedDailyAllocation.toLocaleString('ar-EG')} ${currency} (مخصص تخطيطي من موازنة 15,000 ج / 25 يوم وليس مصروفاً نقدياً يومياً)`,
        ]
      : [
          `• صافي المبيعات          : ${totalRevenue.toLocaleString('ar-EG')} ${currency}`,
          `• تكلفة المنتجات المباعة : ${Math.round(rawMaterialCost).toLocaleString('ar-EG')} ${currency}`,
          `• العمولة المتغيرة       : ${Math.round(commissions).toLocaleString('ar-EG')} ${currency}`,
          `• المساهمة               : ${Math.round(grossProfit).toLocaleString('ar-EG')} ${currency}`,
          `• المخصص التخطيطي اليومي : ${dailyAccounting.plannedDailyAllocation.toLocaleString('ar-EG')} ${currency} (من موازنة 15,000 الشهرية / 25 يوم)`,
          `• نتيجة التشغيل وفق الموازنة: ${dailyAccounting.dailyResultVsBudget >= 0 ? '+' : ''}${dailyAccounting.dailyResultVsBudget.toLocaleString('ar-EG')} ${currency} (${dailyAccounting.resultStatusBadgeAr})`,
        ]),
    `--------------------------------------------------------------------`,
    `4. تسوية الخزنة اليومية المستقلة عن المساهمة (§36 & §38):`,
    `--------------------------------------------------------------------`,
    `• الرصيد الافتتاحي بالدرج : ${drawerRec.openingBalance.toLocaleString('ar-EG')} ${currency}`,
    `• المبيعات النقدية الداخلة: ${drawerRec.cashSales.toLocaleString('ar-EG')} ${currency}`,
    `• المصروفات النقدية بالدرج: ${drawerRec.cashExpensesPaidFromDrawer.toLocaleString('ar-EG')} ${currency}`,
    `• الرصيد النقدي المتوقع   : ${drawerRec.expectedCash.toLocaleString('ar-EG')} ${currency}`,
    `• الجرد النقدي الفعلي     : ${drawerRec.actualCash.toLocaleString('ar-EG')} ${currency}`,
    `• فرق الخزنة المستقل      : ${drawerRec.cashDifference >= 0 ? '+' : ''}${drawerRec.cashDifference.toLocaleString('ar-EG')} ${currency} (${drawerRec.statusBadgeAr})`,
    `• ملاحظة محاسبية         : ${drawerRec.accountingNoteAr}`,
    `--------------------------------------------------------------------`,
    `5. حالة التارجت اليومي (600 ج أساسي | 1,000 ج طموح):`,
    `--------------------------------------------------------------------`,
    `• التارجت اليومي الأساسي : ${dailyAccounting.targetToday.toLocaleString('ar-EG')} ${currency}`,
    `• المساهمة المحققة اليوم : ${Math.round(grossProfit).toLocaleString('ar-EG')} ${currency} (${dailyAccounting.targetAchievementPercent}%)`,
    `• فائض / عجز التارجت     : ${dailyAccounting.dailyResultVsBudget >= 0 ? `فائض +${dailyAccounting.targetSurplusToday}` : `عجز -${dailyAccounting.targetDeficitToday}`} ${currency}`,
    `--------------------------------------------------------------------`,
    `6. أعلى العطور مبيعاً اليوم:`,
    `--------------------------------------------------------------------`,
    ...(topPerfumes.length > 0
      ? topPerfumes.map(
          ([name, st], idx) =>
            `${idx + 1}. ${name} — ${st.qty} عبوة (${st.grams} جم) — ${st.revenue.toLocaleString('ar-EG')} ${currency}`
        )
      : ['• لم تُسجل مبيعات عطور خلال هذا اليوم.']),
    `--------------------------------------------------------------------`,
    `7. نواقص المخزون الحرجة (< 100 جرام): (${lowStockProducts.length} صنف)`,
    `--------------------------------------------------------------------`,
    ...(lowStockProducts.length > 0
      ? lowStockProducts
          .slice(0, 12)
          .map((p) => `• ${p.name} (${p.type}): المتبقي ${p.stock_grams} جم`)
      : ['• جميع الأصناف العطرية في مستوى آمن ومستقر.']),
    `--------------------------------------------------------------------`,
    `8. سجل العمليات والتدقيق اليومي (${dayAuditLogs.length} عملية):`,
    `--------------------------------------------------------------------`,
    ...(dayAuditLogs.length > 0
      ? dayAuditLogs.map(
          (l) => `• [${new Date(l.timestamp).toLocaleTimeString('ar-EG')}] ${l.action} — ${l.entityName} (${l.user})`
        )
      : ['• لا توجد عمليات استثنائية مسجلة اليوم.']),
    `====================================================================`,
    `تم الإرسال آلياً بواسطة نظام ${storeName} الذكي — Mohamed Mhran2027©`,
    `====================================================================`,
  ];

  const htmlBody = `
  <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #F5F5F7; padding: 24px; color: #1D1D1F;">
    <div style="max-width: 680px; margin: 0 auto; background: #FFFFFF; border-radius: 24px; overflow: hidden; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 12px 32px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%); color: #FFFFFF; padding: 24px 28px;">
        <div style="font-size: 12px; color: #FFD60A; font-weight: 700; margin-bottom: 6px;">${triggerLabel}</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 900;">${storeName} — التقرير اليومي التنفيذي المعتمد</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #AEAEB2;">
          التاريخ: <strong>${reportDate}</strong> · واتساب المتجر الرسمي: <strong dir="ltr">${whatsappPhone} / ${whatsappSecondaryPhone}</strong> (${whatsappManager})
        </p>
      </div>

      <div style="padding: 24px 28px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="background: #F0F7FF; border: 1px solid #CCE4FF; border-radius: 16px; padding: 14px;">
            <div style="font-size: 11px; color: #0071E3; font-weight: 700;">صافي المبيعات</div>
            <div style="font-size: 20px; font-weight: 900; color: #1D1D1F; margin-top: 4px;">${totalRevenue.toLocaleString('ar-EG')} ${currency}</div>
            <div style="font-size: 11px; color: #636366;">${daySales.length} فاتورة · ${bottlesSold} عبوة</div>
          </div>
          <div style="background: #FFF9EB; border: 1px solid #FDE68A; border-radius: 16px; padding: 14px;">
            <div style="font-size: 11px; color: #B45309; font-weight: 700;">تكلفة المنتجات + العمولة</div>
            <div style="font-size: 20px; font-weight: 900; color: #1D1D1F; margin-top: 4px;">${Math.round(rawMaterialCost + commissions).toLocaleString('ar-EG')} ${currency}</div>
            <div style="font-size: 11px; color: #636366;">تكلفة: ${Math.round(rawMaterialCost)} ج | عمولة: ${Math.round(commissions)} ج</div>
          </div>
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 16px; padding: 14px;">
            <div style="font-size: 11px; color: #047857; font-weight: 700;">المساهمة الصافية لليوم</div>
            <div style="font-size: 20px; font-weight: 900; color: #047857; margin-top: 4px;">${Math.round(grossProfit).toLocaleString('ar-EG')} ${currency}</div>
            <div style="font-size: 11px; color: #065F46;">نتيجة الموازنة (مقابل 600 ج): ${dailyAccounting.dailyResultVsBudget} ${currency}</div>
          </div>
        </div>

        <div style="background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 16px; padding: 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.8;">
          <strong>النتيجة التشغيلية لليوم وفق الموازنة (§37 - مستقلة عن الخزنة):</strong><br/>
          • المساهمة الصافية (المبيعات ${totalRevenue} - التكلفة ${Math.round(rawMaterialCost)} - العمولة ${Math.round(commissions)}): <strong>${Math.round(grossProfit)} ${currency}</strong><br/>
          • المخصص التخطيطي لليوم (من موازنة 15,000 الشهرية / 25 يوم): <strong>${dailyAccounting.plannedDailyAllocation} ${currency}</strong><br/>
          • المبلغ الممول فعلياً من مساهمة اليوم: <strong>${dailyAccounting.fundedAllocationToday} ${currency}</strong> | عجز التمويل: <strong>${dailyAccounting.unfundedAllocationDeficitToday} ${currency}</strong><br/>
          • نتيجة اليوم وفق الموازنة: <strong>${dailyAccounting.dailyResultVsBudget >= 0 ? '+' : ''}${dailyAccounting.dailyResultVsBudget} ${currency}</strong> (${dailyAccounting.resultStatusBadgeAr})
        </div>

        <div style="background: #F5F5F7; border-radius: 16px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.8;">
          <strong>تسوية الخزنة اليومية المستقلة (§36 & §38):</strong><br/>
          • الرصيد الافتتاحي: <strong>${drawerRec.openingBalance} ${currency}</strong> + المبيعات النقدية: <strong>${cashSales} ${currency}</strong> - مصاريف الدرج النقدية: <strong>${directExpenses} ${currency}</strong><br/>
          • الرصيد النقدي المتوقع بالدرج: <strong>${drawerRec.expectedCash} ${currency}</strong> | الجرد الفعلي: <strong>${drawerRec.actualCash} ${currency}</strong><br/>
          • فرق الخزنة المستقل: <strong>${drawerRec.cashDifference >= 0 ? '+' : ''}${drawerRec.cashDifference} ${currency}</strong> (${drawerRec.statusBadgeAr})<br/>
          • مبيعات البطاقات: <strong>${cardSales} ${currency}</strong> | المحافظ والتحويلات: <strong>${walletSales} ${currency}</strong>
        </div>

        <h3 style="font-size: 15px; font-weight: 800; border-bottom: 1px solid #E5E5EA; padding-bottom: 8px;">أعلى العطور مبيعاً اليوم</h3>
        <ul style="font-size: 13px; line-height: 1.8; padding-right: 18px;">
          ${
            topPerfumes.length > 0
              ? topPerfumes
                  .map(
                    ([name, st]) =>
                      `<li><strong>${name}</strong> — ${st.qty} عبوة (${st.grams} جم) — <strong>${st.revenue.toLocaleString('ar-EG')} ${currency}</strong></li>`
                  )
                  .join('')
              : '<li>لم تُسجل مبيعات عطور خلال هذا اليوم.</li>'
          }
        </ul>

        <h3 style="font-size: 15px; font-weight: 800; border-bottom: 1px solid #E5E5EA; padding-bottom: 8px; margin-top: 20px;">تنبيهات نواقص المخزون (${lowStockProducts.length} صنف أقل من 100 جم)</h3>
        <ul style="font-size: 13px; line-height: 1.8; padding-right: 18px; color: #B91C1C;">
          ${
            lowStockProducts.length > 0
              ? lowStockProducts
                  .slice(0, 10)
                  .map((p) => `<li><strong>${p.name}</strong> (${p.type}): المتبقي <strong>${p.stock_grams} جم</strong></li>`)
                  .join('')
              : '<li style="color: #047857;">جميع الأصناف العطرية في مستوى آمن ومستقر.</li>'
          }
        </ul>
      </div>

      <div style="background: #F5F5F7; padding: 14px 28px; text-align: center; font-size: 11px; color: #86868B; border-top: 1px solid #E5E5EA;">
        تم إنشاء وإرسال هذا التقرير تلقائياً عبر نظام <strong>${storeName}</strong> · البريد الرسمي: ${recipientEmail} · واتساب: ${whatsappPhone} / ${whatsappSecondaryPhone} · <strong>Mohamed Mhran2027©</strong>
      </div>
    </div>
  </div>`;

  // Build dedicated WhatsApp-optimized Executive Daily Closure message (§57–§59 & §93)
  const whatsappLines: string[] = [
    `🌸 *${storeName} — ${triggerLabel}* 🌸`,
    `📅 *التاريخ:* ${reportDate} | ⏰ ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
    `👤 *المسؤول:* ${params.executedBy || whatsappManager}`,
    `📱 *واتساب المتجر:* ${whatsappPhone} | ${whatsappSecondaryPhone}`,
    `📧 *البريد الرسمي:* ${recipientEmail}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💰 *1. ملخص المبيعات وحركة الكاشير:*`,
    `• عدد الفواتير: *${daySales.length} فاتورة* (${bottlesSold} عبوة | ${gramsConsumed} جم زيت)`,
    `• إجمالي المبيعات قبل الخصم: *${dailyAccounting.grossSales.toLocaleString('ar-EG')} ${currency}*`,
    `• الخصومات والولاء: *${dailyAccounting.discounts.toLocaleString('ar-EG')} ${currency}*`,
    `• صافي المبيعات المعتمد: *${totalRevenue.toLocaleString('ar-EG')} ${currency}*`,
    `  💵 نقدي (كاش): *${cashSales.toLocaleString('ar-EG')} ${currency}*`,
    `  💳 بطاقة بنكية: *${cardSales.toLocaleString('ar-EG')} ${currency}*`,
    `  📲 محفظة / تحويل: *${walletSales.toLocaleString('ar-EG')} ${currency}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📊 *2. النتيجة التشغيلية لليوم وفق الموازنة (§37):*`,
    `• تكلفة المنتجات المباعة: *${Math.round(rawMaterialCost).toLocaleString('ar-EG')} ${currency}*`,
    `• عمولة طارق المستحقة: *${Math.round(commissions).toLocaleString('ar-EG')} ${currency}*`,
    `• المساهمة الصافية لليوم: *${Math.round(grossProfit).toLocaleString('ar-EG')} ${currency}*`,
    `• المخصص التخطيطي لليوم: *${dailyAccounting.plannedDailyAllocation} ${currency}* (الممول: *${dailyAccounting.fundedAllocationToday} ${currency}* | غير الممول: *${dailyAccounting.unfundedAllocationDeficitToday} ${currency}*)`,
    `• نتيجة اليوم وفق الموازنة: *${dailyAccounting.dailyResultVsBudget >= 0 ? '+' : ''}${dailyAccounting.dailyResultVsBudget} ${currency}* (${dailyAccounting.resultStatusBadgeAr})`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏦 *3. تسوية الخزنة المستقلة (§36 & §39):*`,
    `• الرصيد الافتتاحي: *${drawerRec.openingBalance} ${currency}*`,
    `• النقدي الداخل: *${cashSales} ${currency}* | مصروفات الدرج: *${directExpenses} ${currency}*`,
    `• الرصيد النقدي المتوقع: *${drawerRec.expectedCash} ${currency}*`,
    `• الجرد النقدي الفعلي: *${drawerRec.actualCash} ${currency}*`,
    `• فرق الخزنة المستقل: *${drawerRec.cashDifference >= 0 ? '+' : ''}${drawerRec.cashDifference} ${currency}* (${drawerRec.statusBadgeAr})`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏆 *4. أعلى العطور مبيعاً اليوم:*`,
    ...(topPerfumes.length > 0
      ? topPerfumes.slice(0, 5).map(
          ([name, st], idx) =>
            `${idx + 1}. *${name}* — ${st.qty} عبوة (${st.grams} جم) — *${st.revenue.toLocaleString('ar-EG')} ${currency}*`
        )
      : ['• لم تُسجل مبيعات عطور خلال هذا اليوم.']),
    `━━━━━━━━━━━━━━━━━━━━`,
    `⚠️ *5. نواقص المخزون الحرجة (< 100 جم): (${lowStockProducts.length} صنف)*`,
    ...(lowStockProducts.length > 0
      ? lowStockProducts
          .slice(0, 8)
          .map((p) => `• *${p.name}* (${p.type}): متبقي *${p.stock_grams} جم*`)
      : ['• جميع الأصناف العطرية في مستوى آمن ومستقر ✓']),
    `━━━━━━━━━━━━━━━━━━━━`,
    `_أُرسل آلياً عبر منظومة أتمتة ${storeName} — Mohamed Mhran2027©_`,
  ];

  return {
    id: `rep-${reportDate}-${Date.now()}`,
    reportDate,
    generatedAt: new Date().toISOString(),
    triggerType: params.triggerType,
    recipientEmail,
    whatsappPhone,
    whatsappSecondaryPhone,
    whatsappFormattedMessage: whatsappLines.join('\n'),
    subject,
    plainTextBody: plainLines.join('\n'),
    htmlBody,
    metrics: {
      salesCount: daySales.length,
      bottlesSold,
      gramsConsumed,
      totalRevenue,
      cashSales,
      cardSales,
      walletSales,
      rawMaterialCost,
      commissions,
      directExpenses,
      netProfit,
      lowStockCount: lowStockProducts.length,
    },
    status: 'queued_offline',
    whatsappStatus: 'ready',
    whatsappDispatchedNumbers: [whatsappPhone, whatsappSecondaryPhone],
  };
}

// ============================================================================
// FREE PROFESSIONAL WHATSAPP AUTOMATION ENGINE (01123376728 & 01062018755)
// Supports:
// 1. Direct Instant WhatsApp Protocol (wa.me / api.whatsapp.com / Web Share)
// 2. Free CallMeBot / TextMeBot Background Cloud API (100% Free, Zero Subscription)
// 3. Free Custom Webhook Bridge (Google Apps Script / WAHA / Make Free)
// ============================================================================
export const OFFICIAL_STORE_WHATSAPP_NUMBERS = [
  {
    phone: '01123376728',
    intl: '201123376728',
    label: 'الرقم الرسمي الأول للواتساب — طارق (01123376728)',
    shortLabel: 'واتساب طارق 1 (01123376728)',
    badge: 'رسمي أساسي 1',
  },
  {
    phone: '01062018755',
    intl: '201062018755',
    label: 'الرقم الرسمي الثاني للواتساب — طارق (01062018755)',
    shortLabel: 'واتساب طارق 2 (01062018755)',
    badge: 'رسمي أساسي 2',
  },
  {
    phone: '01008102863',
    intl: '201008102863',
    label: 'رقم تواصل المتجر الإضافي — طارق (01008102863)',
    shortLabel: 'واتساب المتجر (01008102863)',
    badge: 'رقم إضافي',
  },
];

export function formatEgyptianWhatsAppIntl(rawPhone: string): string {
  const digits = (rawPhone || '01123376728').replace(/\D/g, '');
  if (!digits) return '201123376728';
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return `2${digits}`;
  return `20${digits}`;
}

export function buildWhatsAppDirectUrl(phone: string, messageText: string): string {
  const intl = formatEgyptianWhatsAppIntl(phone);
  return `https://wa.me/${intl}?text=${encodeURIComponent(messageText)}`;
}

export function buildWhatsAppWebUrl(phone: string, messageText: string): string {
  const intl = formatEgyptianWhatsAppIntl(phone);
  return `https://web.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(messageText)}`;
}

/**
 * Executes free background WhatsApp automation (CallMeBot Free Gateway + Custom Webhook + Clipboard Auto-Prep)
 * and returns direct instant dispatch URLs for 01123376728 and 01062018755.
 */
export async function executeFreeWhatsAppAutomation(
  report: AutomatedDailyReportItem,
  settings?: StoreSettings
): Promise<{
  sentBackgroundApi: boolean;
  dispatchedPhones: string[];
  primaryDirectUrl: string;
  secondaryDirectUrl: string;
  copiedToClipboard: boolean;
}> {
  const primaryPhone =
    settings?.storeWhatsAppPrimary?.trim() || report.whatsappPhone || '01123376728';
  const secondaryPhone =
    settings?.storeWhatsAppSecondary?.trim() || report.whatsappSecondaryPhone || '01062018755';
  const messageText = report.whatsappFormattedMessage || report.plainTextBody;

  const primaryDirectUrl = buildWhatsAppDirectUrl(primaryPhone, messageText);
  const secondaryDirectUrl = buildWhatsAppDirectUrl(secondaryPhone, messageText);
  const dispatchedPhones: string[] = [primaryPhone];
  if (settings?.whatsappDualTargetDispatch !== false && secondaryPhone) {
    dispatchedPhones.push(secondaryPhone);
  }

  let sentBackgroundApi = false;
  let copiedToClipboard = false;

  // 1. Auto-copy formatted WhatsApp report to clipboard so Tarek can also paste immediately
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(messageText);
      copiedToClipboard = true;
    }
  } catch {
    // Ignore clipboard permission errors in background
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      sentBackgroundApi: false,
      dispatchedPhones,
      primaryDirectUrl,
      secondaryDirectUrl,
      copiedToClipboard,
    };
  }

  // 2. Method A: CallMeBot Free WhatsApp API (100% Free background message to 01123376728 / 01062018755)
  const primaryApiKey = settings?.whatsappCallMeBotApiKey?.trim();
  if (primaryApiKey) {
    try {
      const intlPrimary = formatEgyptianWhatsAppIntl(primaryPhone);
      const callMeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=${intlPrimary}&text=${encodeURIComponent(
        messageText
      )}&apikey=${encodeURIComponent(primaryApiKey)}`;
      await fetch(callMeBotUrl, { method: 'GET', mode: 'no-cors' });
      sentBackgroundApi = true;
    } catch (e) {
      console.warn('CallMeBot primary WhatsApp dispatch warning:', e);
    }
  }

  const secondaryApiKey = settings?.whatsappSecondaryCallMeBotApiKey?.trim();
  if (secondaryApiKey && secondaryPhone) {
    try {
      const intlSecondary = formatEgyptianWhatsAppIntl(secondaryPhone);
      const callMeBotUrl2 = `https://api.callmebot.com/whatsapp.php?phone=${intlSecondary}&text=${encodeURIComponent(
        messageText
      )}&apikey=${encodeURIComponent(secondaryApiKey)}`;
      await fetch(callMeBotUrl2, { method: 'GET', mode: 'no-cors' });
      sentBackgroundApi = true;
    } catch (e) {
      console.warn('CallMeBot secondary WhatsApp dispatch warning:', e);
    }
  }

  // 3. Method B: Free Custom WhatsApp Webhook Bridge (Apps Script / WAHA / Make)
  const customWaWebhook = settings?.whatsappCustomWebhookUrl?.trim();
  if (customWaWebhook && customWaWebhook.startsWith('http')) {
    try {
      await fetch(customWaWebhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          reportDate: report.reportDate,
          triggerType: report.triggerType,
          primaryWhatsApp: formatEgyptianWhatsAppIntl(primaryPhone),
          secondaryWhatsApp: formatEgyptianWhatsAppIntl(secondaryPhone),
          managerName: settings?.storeWhatsAppManager || 'طارق',
          recipientEmail: report.recipientEmail,
          totalRevenue: String(report.metrics.totalRevenue),
          netProfit: String(Math.round(report.metrics.netProfit)),
          salesCount: String(report.metrics.salesCount),
          whatsappMessage: messageText,
        }).toString(),
      });
      sentBackgroundApi = true;
    } catch (e) {
      console.warn('Custom WhatsApp webhook error:', e);
    }
  }

  return {
    sentBackgroundApi,
    dispatchedPhones,
    primaryDirectUrl,
    secondaryDirectUrl,
    copiedToClipboard,
  };
}

// ============================================================================
// SEND EMAIL VIA GMAIL REST API (RFC 2822 UTF-8 BASE64URL)
// ============================================================================
function encodeBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendDailyReportViaGmail(
  report: AutomatedDailyReportItem,
  accessToken: string
): Promise<void> {
  const encodedSubject = `=?utf-8?B?${btoa(
    String.fromCharCode(...new TextEncoder().encode(report.subject))
  )}?=`;

  const mimeLines = [
    `To: ${report.recipientEmail}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    report.htmlBody,
  ];

  const raw = encodeBase64Url(mimeLines.join('\r\n'));

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `فشل إرسال البريد عبر Gmail (كود ${res.status})`);
  }
}

// ============================================================================
// SYNC / CREATE DAILY CLOSING REPORT IN GOOGLE FORMS API
// ============================================================================
export async function syncDailyReportToGoogleForm(
  report: AutomatedDailyReportItem,
  accessToken: string,
  existingFormId?: string,
  customWebhookUrl?: string
): Promise<{ formId: string; responderUri: string }> {
  let formId = existingFormId?.trim() || '';
  let responderUri = '';

  // 1. If no formId exists yet, create an official Google Form for Lamsa Perfumes Daily Closing Reports
  if (!formId) {
    const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        info: {
          title: 'سجل تقارير إغلاق اليوم الأوتوماتيكي — لمسة عطر (Lamsa Perfumes)',
          documentTitle: `تقارير إغلاق اليوم — لمسة عطر (${report.reportDate})`,
        },
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `فشل إنشاء نموذج Google Form (${createRes.status})`);
    }

    const createdForm = await createRes.json();
    formId = createdForm.formId;
    responderUri = createdForm.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`;
  } else {
    // Verify form exists
    const getRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (getRes.ok) {
      const formData = await getRes.json();
      responderUri = formData.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`;
    } else {
      // Fallback: create a new form if the old formId was deleted
      return syncDailyReportToGoogleForm(report, accessToken, undefined, customWebhookUrl);
    }
  }

  // 2. Append today's official closing report entry to the Google Form via batchUpdate
  const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          createItem: {
            item: {
              title: `تقرير إغلاق يوم ${report.reportDate} — المبيعات: ${report.metrics.totalRevenue} ج.م | صافي الربح: +${Math.round(report.metrics.netProfit)} ج.م`,
              description: report.plainTextBody.slice(0, 1800),
              questionItem: {
                question: {
                  required: false,
                  textQuestion: {
                    paragraph: true,
                  },
                },
              },
            },
            location: { index: 0 },
          },
        },
      ],
    }),
  });

  if (!batchRes.ok) {
    console.warn('Google Form batchUpdate warning:', await batchRes.text());
  }

  // 3. If user also provided a custom Google Form formResponse / webhook URL, post to it
  if (customWebhookUrl && customWebhookUrl.trim().startsWith('http')) {
    try {
      await fetch(customWebhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          reportDate: report.reportDate,
          totalRevenue: String(report.metrics.totalRevenue),
          netProfit: String(Math.round(report.metrics.netProfit)),
          salesCount: String(report.metrics.salesCount),
          reportBody: report.plainTextBody,
        }).toString(),
      });
    } catch (e) {
      console.warn('Custom form webhook post error:', e);
    }
  }

  return { formId, responderUri };
}

// ============================================================================
// PERSISTENT REPORT LOGS & OFFLINE-TO-ONLINE QUEUE STORAGE
// ============================================================================
const REPORTS_STORAGE_KEY = 'lamsa_automated_reports_history_v1';
const LAST_AUTO_DATE_KEY = 'lamsa_last_midnight_report_date_v1';

export function getSavedAutomatedReports(): AutomatedDailyReportItem[] {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveAutomatedReportsList(list: AutomatedDailyReportItem[]): void {
  try {
    // Keep most recent 45 daily reports
    const trimmed = list.slice(0, 45);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error(e);
  }
}

export function upsertAutomatedReport(item: AutomatedDailyReportItem): AutomatedDailyReportItem[] {
  const current = getSavedAutomatedReports();
  const idx = current.findIndex((r) => r.id === item.id || (r.reportDate === item.reportDate && r.triggerType === item.triggerType));
  let next: AutomatedDailyReportItem[];
  if (idx >= 0) {
    next = [...current];
    next[idx] = item;
  } else {
    next = [item, ...current];
  }
  saveAutomatedReportsList(next);
  return next;
}

export function getLastAutoReportDate(): string | null {
  try {
    return localStorage.getItem(LAST_AUTO_DATE_KEY);
  } catch {
    return null;
  }
}

export function setLastAutoReportDate(dateStr: string): void {
  try {
    localStorage.setItem(LAST_AUTO_DATE_KEY, dateStr);
  } catch (e) {
    console.error(e);
  }
}

export const getLastAutoMidnightReportDate = getLastAutoReportDate;
export const setLastAutoMidnightReportDate = setLastAutoReportDate;
export const loadAutomatedReportsHistory = getSavedAutomatedReports;

export async function flushOfflineReportQueue(
  existingFormId?: string,
  customWebhookUrl?: string,
  settings?: StoreSettings
): Promise<{ sentCount: number; remainingCount: number; whatsappDispatched: boolean }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const queued = getSavedAutomatedReports().filter((r) => r.status === 'queued_offline');
    return { sentCount: 0, remainingCount: queued.length, whatsappDispatched: false };
  }

  const token = getWorkspaceAccessToken();
  const allReports = getSavedAutomatedReports();
  const pending = allReports.filter(
    (r) => r.status === 'queued_offline' || r.status === 'pending_auth'
  );

  let whatsappDispatched = false;
  // Always attempt free background WhatsApp API dispatch for pending reports when online
  for (const rep of pending) {
    try {
      const waRes = await executeFreeWhatsAppAutomation(rep, settings);
      if (waRes.sentBackgroundApi) {
        whatsappDispatched = true;
      }
    } catch {
      // ignore background error
    }
  }

  if (!token || pending.length === 0) {
    return { sentCount: 0, remainingCount: pending.length, whatsappDispatched };
  }

  let sentCount = 0;
  let currentFormId = existingFormId;

  for (const rep of pending) {
    try {
      await sendDailyReportViaGmail(rep, token);
      const formRes = await syncDailyReportToGoogleForm(
        rep,
        token,
        currentFormId,
        customWebhookUrl
      );
      currentFormId = formRes.formId;
      upsertAutomatedReport({
        ...rep,
        status: 'sent',
        sentAt: new Date().toISOString(),
        whatsappStatus: whatsappDispatched ? 'sent_api' : 'ready',
        whatsappSentAt: new Date().toISOString(),
        googleFormId: formRes.formId,
        googleFormUrl: formRes.responderUri,
        errorMessage: undefined,
      });
      sentCount++;
    } catch (e: any) {
      upsertAutomatedReport({
        ...rep,
        status: !navigator.onLine ? 'queued_offline' : 'pending_auth',
        errorMessage: e?.message || 'بانتظار تجديد صلاحية الإرسال',
      });
    }
  }

  const remaining = getSavedAutomatedReports().filter(
    (r) => r.status === 'queued_offline' || r.status === 'pending_auth'
  ).length;

  return { sentCount, remainingCount: remaining, whatsappDispatched };
}

