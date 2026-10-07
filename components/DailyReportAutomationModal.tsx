import React, { useState, useEffect, useMemo } from 'react';
import {
  Sale,
  Expense,
  Product,
  StoreSettings,
  DailyClosure,
  AuditLogRecord,
  CustomCustomerRecord,
  AutomatedDailyReportItem,
} from '../types';
import {
  initWorkspaceAuth,
  googleWorkspaceSignIn,
  getWorkspaceAccessToken,
  getConnectedGoogleEmail,
  buildDailyClosingReport,
  getSavedAutomatedReports,
  upsertAutomatedReport,
  sendDailyReportViaGmail,
  syncDailyReportToGoogleForm,
  flushOfflineReportQueue,
  buildWhatsAppDirectUrl,
  executeFreeWhatsAppAutomation,
  OFFICIAL_STORE_WHATSAPP_NUMBERS,
} from '../services/workspaceReportService';
import {
  X,
  Mail,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Wifi,
  WifiOff,
  Send,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Calendar,
  Copy,
  Check,
  Download,
  MessageCircle,
  Smartphone,
  Share2,
  Zap,
  Settings2,
  History,
  FileText,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface DailyReportAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  settings: StoreSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  currentClosure: DailyClosure | null;
  auditLogs: AuditLogRecord[];
  customCustomers: CustomCustomerRecord[];
  currentUserDisplayName?: string;
  onSendSmartNotification?: (title: string, subtitle?: string, badgeText?: string) => void;
}

type ModalTab = 'dispatch' | 'preview' | 'settings' | 'history';

export const DailyReportAutomationModal: React.FC<DailyReportAutomationModalProps> = ({
  isOpen,
  onClose,
  sales,
  expenses,
  products,
  settings,
  onUpdateSettings,
  currentClosure,
  auditLogs,
  customCustomers,
  currentUserDisplayName = 'طارق',
  onSendSmartNotification,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('dispatch');
  const [historyPage, setHistoryPage] = useState(1);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [reportsHistory, setReportsHistory] = useState<AutomatedDailyReportItem[]>([]);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'whatsapp' | 'email'>('whatsapp');

  // Pending confirmation state before sending via Gmail & Google Forms API
  const [pendingConfirmReport, setPendingConfirmReport] =
    useState<AutomatedDailyReportItem | null>(null);

  // Editable settings inside modal
  const [storeEmailInput, setStoreEmailInput] = useState<string>(
    settings.storeEmail || 'lamsteitr@gmail.com'
  );
  const [primaryWhatsAppInput, setPrimaryWhatsAppInput] = useState<string>(
    settings.storeWhatsAppPrimary || '01123376728'
  );
  const [secondaryWhatsAppInput, setSecondaryWhatsAppInput] = useState<string>(
    settings.storeWhatsAppSecondary || '01062018755'
  );
  const [storeManagerInput, setStoreManagerInput] = useState<string>(
    settings.storeWhatsAppManager || 'طارق'
  );
  const [autoMidnightEnabled, setAutoMidnightEnabled] = useState<boolean>(
    settings.autoMidnightReportEnabled !== false
  );
  const [customWebhookInput, setCustomWebhookInput] = useState<string>(
    settings.googleFormWebhookUrl || ''
  );

  // Free WhatsApp Automation Settings
  const [whatsappAutoOnClosure, setWhatsappAutoOnClosure] = useState<boolean>(
    settings.whatsappAutoSendOnClosure !== false
  );
  const [whatsappAutoWithEmail, setWhatsappAutoWithEmail] = useState<boolean>(
    settings.whatsappAutoSendWithEmail !== false
  );
  const [whatsappDualTarget, setWhatsappDualTarget] = useState<boolean>(
    settings.whatsappDualTargetDispatch !== false
  );
  const [callMeBotKey1, setCallMeBotKey1] = useState<string>(
    settings.whatsappCallMeBotApiKey || ''
  );
  const [callMeBotKey2, setCallMeBotKey2] = useState<string>(
    settings.whatsappSecondaryCallMeBotApiKey || ''
  );
  const [whatsappWebhookInput, setWhatsappWebhookInput] = useState<string>(
    settings.whatsappCustomWebhookUrl || ''
  );

  // Initialize Google OAuth & load history
  useEffect(() => {
    if (!isOpen) return;
    setReportsHistory(getSavedAutomatedReports());
    setStoreEmailInput(settings.storeEmail || 'lamsteitr@gmail.com');
    setPrimaryWhatsAppInput(settings.storeWhatsAppPrimary || '01123376728');
    setSecondaryWhatsAppInput(settings.storeWhatsAppSecondary || '01062018755');
    setStoreManagerInput(settings.storeWhatsAppManager || 'طارق');
    setAutoMidnightEnabled(settings.autoMidnightReportEnabled !== false);
    setCustomWebhookInput(settings.googleFormWebhookUrl || '');
    setWhatsappAutoOnClosure(settings.whatsappAutoSendOnClosure !== false);
    setWhatsappAutoWithEmail(settings.whatsappAutoSendWithEmail !== false);
    setWhatsappDualTarget(settings.whatsappDualTargetDispatch !== false);
    setCallMeBotKey1(settings.whatsappCallMeBotApiKey || '');
    setCallMeBotKey2(settings.whatsappSecondaryCallMeBotApiKey || '');
    setWhatsappWebhookInput(settings.whatsappCustomWebhookUrl || '');

    const unsubscribe = initWorkspaceAuth(
      (user) => {
        setNeedsAuth(false);
        setConnectedEmail(user.email || null);
      },
      () => {
        setNeedsAuth(!getWorkspaceAccessToken());
        setConnectedEmail(getConnectedGoogleEmail());
      }
    );
    return () => unsubscribe();
  }, [isOpen, settings]);

  // Listen for online/offline transitions
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const result = await flushOfflineReportQueue(
        settings.googleFormId,
        settings.googleFormWebhookUrl,
        settings
      );
      setReportsHistory(getSavedAutomatedReports());
      if (result.sentCount > 0 || result.whatsappDispatched) {
        setStatusBanner({
          type: 'success',
          text: `تم استعادة الاتصال بالإنترنت وإرسال (${result.sentCount}) تقرير يومي مخزن تلقائياً إلى ${storeEmailInput} وواتساب طارق (${primaryWhatsAppInput} / ${secondaryWhatsAppInput})!`,
        });
        if (onSendSmartNotification) {
          onSendSmartNotification(
            `تم إرسال ${result.sentCount || 1} تقرير يومي تلقائياً فور الاتصال`,
            `وصل التقرير إلى ${storeEmailInput} وواتساب طارق (${primaryWhatsAppInput} / ${secondaryWhatsAppInput})`,
            'مزامنة التقارير ✓'
          );
        }
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    settings,
    storeEmailInput,
    primaryWhatsAppInput,
    secondaryWhatsAppInput,
    onUpdateSettings,
    onSendSmartNotification,
  ]);

  // Live preview of today's closing report
  const liveTodayReport = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return buildDailyClosingReport({
      targetDate: todayStr,
      triggerType: 'manual_instant',
      sales,
      expenses,
      products,
      settings: {
        ...settings,
        storeEmail: storeEmailInput.trim() || 'lamsteitr@gmail.com',
        storeWhatsApp: primaryWhatsAppInput.trim() || '01123376728',
        storeWhatsAppPrimary: primaryWhatsAppInput.trim() || '01123376728',
        storeWhatsAppSecondary: secondaryWhatsAppInput.trim() || '01062018755',
        storeWhatsAppManager: storeManagerInput.trim() || 'طارق',
      },
      currentClosure,
      auditLogs,
      customCustomers,
      executedBy: currentUserDisplayName,
    });
  }, [
    sales,
    expenses,
    products,
    settings,
    storeEmailInput,
    primaryWhatsAppInput,
    secondaryWhatsAppInput,
    storeManagerInput,
    currentClosure,
    auditLogs,
    customCustomers,
    currentUserDisplayName,
  ]);

  const queuedOfflineReports = useMemo(
    () =>
      reportsHistory.filter(
        (r) => r.status === 'queued_offline' || r.status === 'pending_auth'
      ),
    [reportsHistory]
  );

  // Direct WhatsApp URLs for the official numbers
  const whatsappMessageText =
    liveTodayReport.whatsappFormattedMessage || liveTodayReport.plainTextBody;

  const primaryWaDirectUrl = useMemo(
    () => buildWhatsAppDirectUrl(primaryWhatsAppInput || '01123376728', whatsappMessageText),
    [primaryWhatsAppInput, whatsappMessageText]
  );

  const secondaryWaDirectUrl = useMemo(
    () => buildWhatsAppDirectUrl(secondaryWhatsAppInput || '01062018755', whatsappMessageText),
    [secondaryWhatsAppInput, whatsappMessageText]
  );

  const thirdWaDirectUrl = useMemo(
    () => buildWhatsAppDirectUrl('01008102863', whatsappMessageText),
    [whatsappMessageText]
  );

  // Pagination for History Tab (3 items per page -> zero scrollbars)
  const ITEMS_PER_PAGE = 3;
  const totalHistoryPages = Math.max(1, Math.ceil(reportsHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return reportsHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [reportsHistory, historyPage]);

  if (!isOpen) return null;

  // Save contact & automation settings
  const handleSaveSettings = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      storeEmail: storeEmailInput.trim() || 'lamsteitr@gmail.com',
      storeWhatsApp: primaryWhatsAppInput.trim() || '01123376728',
      storeWhatsAppPrimary: primaryWhatsAppInput.trim() || '01123376728',
      storeWhatsAppSecondary: secondaryWhatsAppInput.trim() || '01062018755',
      storeWhatsAppManager: storeManagerInput.trim() || 'طارق',
      autoMidnightReportEnabled: autoMidnightEnabled,
      googleFormWebhookUrl: customWebhookInput.trim() || undefined,
      whatsappAutoSendOnClosure: whatsappAutoOnClosure,
      whatsappAutoSendWithEmail: whatsappAutoWithEmail,
      whatsappDualTargetDispatch: whatsappDualTarget,
      whatsappCallMeBotApiKey: callMeBotKey1.trim() || undefined,
      whatsappSecondaryCallMeBotApiKey: callMeBotKey2.trim() || undefined,
      whatsappCustomWebhookUrl: whatsappWebhookInput.trim() || undefined,
    }));
    setStatusBanner({
      type: 'success',
      text: `تم حفظ إعدادات الأتمتة: واتساب المتجر (${primaryWhatsAppInput} / ${secondaryWhatsAppInput} - ${storeManagerInput}) والبريد (${storeEmailInput}) بنجاح.`,
    });
  };

  // Sign in with Google Workspace
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setStatusBanner(null);
    try {
      const result = await googleWorkspaceSignIn();
      if (result?.accessToken) {
        setNeedsAuth(false);
        setConnectedEmail(result.user.email || null);
        setStatusBanner({
          type: 'success',
          text: `تم ربط حساب Google (${result.user.email}) وتفعيل صلاحيات Gmail و Google Forms بنجاح!`,
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'تعذر تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Trigger Free Background WhatsApp Automation + Copy to Clipboard
  const handleTriggerFreeWhatsAppAutomation = async (
    targetPhone?: string,
    reportItem: AutomatedDailyReportItem = liveTodayReport
  ) => {
    const effectiveSettings: StoreSettings = {
      ...settings,
      storeWhatsAppPrimary: primaryWhatsAppInput.trim() || '01123376728',
      storeWhatsAppSecondary: secondaryWhatsAppInput.trim() || '01062018755',
      whatsappDualTargetDispatch: whatsappDualTarget,
      whatsappCallMeBotApiKey: callMeBotKey1.trim(),
      whatsappSecondaryCallMeBotApiKey: callMeBotKey2.trim(),
      whatsappCustomWebhookUrl: whatsappWebhookInput.trim(),
    };

    const res = await executeFreeWhatsAppAutomation(reportItem, effectiveSettings);
    const chosenPhone = targetPhone || primaryWhatsAppInput || '01123376728';

    setStatusBanner({
      type: 'success',
      text: res.sentBackgroundApi
        ? `تم إرسال تقرير إغلاق اليوم تلقائياً عبر بوابة واتساب المجانية إلى المسؤول طارق (${res.dispatchedPhones.join(' + ')}) ونسخ الرسالة!`
        : `تم تجهيز ونسخ تقرير واتساب المنسق للمسؤول طارق (${chosenPhone}) — المحادثة جاهزة للإرسال!`,
    });

    if (onSendSmartNotification) {
      onSendSmartNotification(
        `أتمتة واتساب إغلاق اليوم — طارق (${chosenPhone})`,
        `تم تجهيز وإرسال ملخص إغلاق اليوم (${reportItem.reportDate}) إلى واتساب المتجر الرسمي`,
        'واتساب طارق ✓'
      );
    }
  };

  // Web Share API for native mobile instant WhatsApp sharing
  const handleNativeShareWhatsApp = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: liveTodayReport.subject,
          text: whatsappMessageText,
        });
      } else {
        await navigator.clipboard.writeText(whatsappMessageText);
        setCopiedReport(true);
        setTimeout(() => setCopiedReport(false), 2000);
      }
    } catch {
      // user cancelled share
    }
  };

  // Request user confirmation before executing Gmail & Google Forms API calls
  const handleInitiateSendReport = (reportToSend: AutomatedDailyReportItem) => {
    setStatusBanner(null);
    if (!isOnline) {
      const queued: AutomatedDailyReportItem = {
        ...reportToSend,
        status: 'queued_offline',
        whatsappStatus: 'queued_offline',
      };
      const updated = upsertAutomatedReport(queued);
      setReportsHistory(updated);
      setStatusBanner({
        type: 'warning',
        text: `الجهاز غير متصل بالإنترنت حالياً — تم حفظ التقرير في طابور الانتظار الذكي وسيتم إرساله تلقائياً للإيميل وواتساب طارق (${primaryWhatsAppInput} / ${secondaryWhatsAppInput}) فور عودة الإنترنت!`,
      });
      if (onSendSmartNotification) {
        onSendSmartNotification(
          'تمت جدولة التقرير للإرسال التلقائي عند الاتصال',
          `سيُرسل تقرير يوم ${queued.reportDate} إلى ${queued.recipientEmail} وواتساب طارق فور توفر الإنترنت`,
          'جدولة ذكية'
        );
      }
      return;
    }

    setPendingConfirmReport(reportToSend);
  };

  // Execute confirmed Gmail + Google Forms + Simultaneous Free WhatsApp Automation
  const handleConfirmAndExecuteDispatch = async () => {
    if (!pendingConfirmReport) return;
    const report = pendingConfirmReport;
    setPendingConfirmReport(null);
    setIsSending(true);
    setStatusBanner(null);

    const effectiveSettings: StoreSettings = {
      ...settings,
      storeEmail: storeEmailInput.trim() || 'lamsteitr@gmail.com',
      storeWhatsAppPrimary: primaryWhatsAppInput.trim() || '01123376728',
      storeWhatsAppSecondary: secondaryWhatsAppInput.trim() || '01062018755',
      whatsappDualTargetDispatch: whatsappDualTarget,
      whatsappCallMeBotApiKey: callMeBotKey1.trim(),
      whatsappSecondaryCallMeBotApiKey: callMeBotKey2.trim(),
      whatsappCustomWebhookUrl: whatsappWebhookInput.trim(),
    };

    try {
      let waResult = {
        sentBackgroundApi: false,
        dispatchedPhones: [primaryWhatsAppInput, secondaryWhatsAppInput],
      };
      if (whatsappAutoWithEmail) {
        waResult = await executeFreeWhatsAppAutomation(report, effectiveSettings);
      }

      let token = getWorkspaceAccessToken();
      if (!token) {
        const signInRes = await googleWorkspaceSignIn();
        if (!signInRes?.accessToken) {
          throw new Error('يلزم تأكيد الربط بحساب Google لإرسال التقرير عبر Gmail و Google Forms.');
        }
        token = signInRes.accessToken;
        setNeedsAuth(false);
        setConnectedEmail(signInRes.user.email || null);
      }

      await sendDailyReportViaGmail(report, token);

      const formResult = await syncDailyReportToGoogleForm(
        report,
        token,
        settings.googleFormId,
        customWebhookInput.trim() || settings.googleFormWebhookUrl
      );

      if (formResult.formId && formResult.formId !== settings.googleFormId) {
        onUpdateSettings((prev) => ({
          ...prev,
          googleFormId: formResult.formId,
          googleFormResponderUrl: formResult.responderUri,
        }));
      }

      const sentRecord: AutomatedDailyReportItem = {
        ...report,
        status: 'sent',
        sentAt: new Date().toISOString(),
        whatsappStatus: waResult.sentBackgroundApi ? 'sent_api' : 'opened_direct',
        whatsappSentAt: new Date().toISOString(),
        whatsappDispatchedNumbers: waResult.dispatchedPhones,
        googleFormId: formResult.formId,
        googleFormUrl: formResult.responderUri,
        errorMessage: undefined,
      };
      const nextList = upsertAutomatedReport(sentRecord);
      setReportsHistory(nextList);

      setStatusBanner({
        type: 'success',
        text: `تم إرسال تقرير إغلاق يوم (${report.reportDate}) بنجاح إلى ${report.recipientEmail} وتوثيقه في Google Forms وتجهيز/إرسال نسخة واتساب للمسؤول طارق (${primaryWhatsAppInput} / ${secondaryWhatsAppInput})!`,
      });

      if (onSendSmartNotification) {
        onSendSmartNotification(
          `تم إرسال تقرير الإغلاق للبريد وواتساب طارق`,
          `أُرسل التقرير إلى ${report.recipientEmail} وواتساب (${primaryWhatsAppInput} / ${secondaryWhatsAppInput}) بنجاح`,
          'أتمتة شاملة ✓'
        );
      }
    } catch (err: any) {
      const failedOrQueued: AutomatedDailyReportItem = {
        ...report,
        status: !navigator.onLine ? 'queued_offline' : 'pending_auth',
        errorMessage: err?.message || 'تعذر الإرسال، محفوظ في الطابور لإعادة المحاولة تلقائياً',
      };
      const nextList = upsertAutomatedReport(failedOrQueued);
      setReportsHistory(nextList);
      setStatusBanner({
        type: 'warning',
        text: `تم حفظ التقرير في طابور الإرسال التلقائي (${err?.message || 'سيتم إرساله فور توفر الاتصال'}). يمكنك إرساله فوراً عبر أزرار واتساب طارق!`,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Download .TXT
  const handleDownloadTxt = () => {
    const contentToDownload =
      previewMode === 'whatsapp' ? whatsappMessageText : liveTodayReport.plainTextBody;
    const blob = new Blob(['\uFEFF' + contentToDownload], {
      type: 'text/plain;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-إغلاق-لمسة-عطر-${liveTodayReport.reportDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currency = settings.currency || 'ج.م';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[130] bg-black/55 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div className="smart-modal-window apple-glass rounded-[28px] w-full max-w-5xl overflow-hidden border border-black/[0.12] shadow-2xl bg-white/95 flex flex-col">
        {/* Compact Header + Tab Bar */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-black/[0.08] bg-gradient-to-l from-[#1D1D1F] via-[#242426] to-[#1D1D1F] text-white shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 via-[#0071E3] to-[#C49746] flex items-center justify-center shadow-md shrink-0">
                <Clock size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                    أتمتة تقرير إغلاق اليوم (واتساب طارق الفوري + البريد + Google Forms)
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isOnline
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                    <span>{isOnline ? 'متصل (إرسال فوري)' : 'غير متصل (طابور ذكي)'}</span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 truncate">
                  واتساب المتجر الرسمي:{' '}
                  <strong dir="ltr" className="text-emerald-300">
                    {primaryWhatsAppInput} / {secondaryWhatsAppInput}
                  </strong>{' '}
                  ({storeManagerInput}) · البريد:{' '}
                  <strong className="text-amber-300">{storeEmailInput}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* 4-Tab Zero-Scroll Navigation Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-white/10 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'dispatch'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageCircle size={13} />
              <span>الإرسال الفوري وواتساب طارق</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText size={13} />
              <span>معاينة نص التقرير ({liveTodayReport.reportDate})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#C49746] text-white shadow-xs'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings2 size={13} />
              <span>إعدادات الأتمتة والبوابة المجانية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-[#1D1D1F] shadow-xs'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <History size={13} />
              <span>سجل التقارير والطابور ({reportsHistory.length})</span>
            </button>
          </div>
        </div>

        {/* Dynamic Zero-Scroll Body Container */}
        <div className="p-4 sm:p-5 flex-1 overflow-hidden flex flex-col justify-between gap-3">
          {/* Compact Status Banner if active */}
          {statusBanner && (
            <div
              className={`px-3.5 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-2 shrink-0 animate-in fade-in ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusBanner.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {statusBanner.type === 'success' ? (
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={15} className="shrink-0" />
                )}
                <span className="truncate">{statusBanner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: INSTANT DISPATCH & FREE WHATSAPP AUTOMATION FOR TAREK              */}
          {/* ========================================================================= */}
          {activeTab === 'dispatch' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-stretch overflow-hidden">
              {/* Right Column (7 cols): Official WhatsApp Numbers & Automation Controls */}
              <div className="lg:col-span-7 p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 border border-emerald-500/30 flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <MessageCircle size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-[#1D1D1F] flex items-center gap-1.5">
                          <span>منظومة أتمتة واتساب المجانية — المسؤول طارق</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            مجانية 100%
                          </span>
                        </h3>
                        <p className="text-[10px] text-[#48484A]">
                          إرسال فوري لتقرير إغلاق اليوم إلى أرقام المتجر الرسمية بالتزامن مع التقرير البريدي
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Direct WhatsApp Dispatch Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <a
                      href={primaryWaDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        handleTriggerFreeWhatsAppAutomation(primaryWhatsAppInput || '01123376728')
                      }
                      className="apple-btn p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-between gap-1.5 transition-all cursor-pointer no-underline"
                    >
                      <div className="min-w-0 text-right">
                        <div className="text-[9px] font-bold text-emerald-100">الرقم الرسمي 1 — طارق</div>
                        <div dir="ltr" className="text-xs font-black font-mono truncate">
                          {primaryWhatsAppInput || '01123376728'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[9px] font-black shrink-0">
                        إرسال ↗
                      </span>
                    </a>

                    <a
                      href={secondaryWaDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        handleTriggerFreeWhatsAppAutomation(secondaryWhatsAppInput || '01062018755')
                      }
                      className="apple-btn p-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center justify-between gap-1.5 transition-all cursor-pointer no-underline"
                    >
                      <div className="min-w-0 text-right">
                        <div className="text-[9px] font-bold text-teal-100">الرقم الرسمي 2 — طارق</div>
                        <div dir="ltr" className="text-xs font-black font-mono truncate">
                          {secondaryWhatsAppInput || '01062018755'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[9px] font-black shrink-0">
                        إرسال ↗
                      </span>
                    </a>

                    <a
                      href={thirdWaDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleTriggerFreeWhatsAppAutomation('01008102863')}
                      className="apple-btn p-2.5 rounded-2xl bg-[#1D1D1F] hover:bg-black text-white shadow-xs flex items-center justify-between gap-1.5 transition-all cursor-pointer no-underline"
                    >
                      <div className="min-w-0 text-right">
                        <div className="text-[9px] font-bold text-zinc-300">الرقم الإضافي — طارق</div>
                        <div dir="ltr" className="text-xs font-black font-mono text-emerald-300 truncate">
                          01008102863
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-white/15 text-[9px] font-black shrink-0">
                        إرسال ↗
                      </span>
                    </a>
                  </div>

                  {/* 3 Automation Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="p-2 rounded-xl bg-white/90 border border-emerald-200/80 flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={whatsappAutoOnClosure}
                        onChange={(e) => setWhatsappAutoOnClosure(e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                      />
                      <span className="text-[10px] font-bold text-[#1D1D1F] leading-tight">
                        إرسال تلقائي لواتساب طارق فور إغلاق اليوم
                      </span>
                    </label>

                    <label className="p-2 rounded-xl bg-white/90 border border-emerald-200/80 flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={whatsappAutoWithEmail}
                        onChange={(e) => setWhatsappAutoWithEmail(e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                      />
                      <span className="text-[10px] font-bold text-[#1D1D1F] leading-tight">
                        إرسال متزامن للواتساب مع البريد (Gmail)
                      </span>
                    </label>

                    <label className="p-2 rounded-xl bg-white/90 border border-emerald-200/80 flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={whatsappDualTarget}
                        onChange={(e) => setWhatsappDualTarget(e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                      />
                      <span className="text-[10px] font-bold text-[#1D1D1F] leading-tight">
                        تفعيل الرقمين معاً (01123376728 + 01062018755)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Google Workspace Connection Bar inside Right Column */}
                <div className="p-3 rounded-2xl bg-white/95 border border-black/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck
                        size={15}
                        className={!needsAuth ? 'text-emerald-600 shrink-0' : 'text-[#0071E3] shrink-0'}
                      />
                      <span className="text-xs font-black text-[#1D1D1F] truncate">
                        الربط مع Google Workspace (Gmail + Forms)
                      </span>
                    </div>
                    <p className="text-[10px] text-[#636366] truncate mt-0.5">
                      {!needsAuth
                        ? `متصل (${connectedEmail || 'حساب معتمد'}) — جاهز لإرسال تقارير منتصف الليل وتحديث النموذج.`
                        : 'سجل الدخول بحساب Google لتفعيل الإرسال التلقائي عبر Gmail و Google Forms.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoggingIn}
                    className="apple-btn flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-black/[0.06] text-[#1F1F1F] border border-black/15 text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    <Mail size={13} className="text-[#0071E3]" />
                    <span>
                      {isLoggingIn
                        ? 'جاري الاتصال...'
                        : !needsAuth
                        ? 'تحديث ربط Google ✓'
                        : 'ربط حساب Google'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Left Column (5 cols): Live Daily Closure Metrics & Master Dispatch Hub */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-[#1D1D1F] text-white flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span>ملخص إغلاق اليوم ({liveTodayReport.reportDate})</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-zinc-300">
                      12:00 AM Auto
                    </span>
                  </div>

                  {/* 2x2 Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10">
                      <span className="text-[10px] text-zinc-400 block">إجمالي المبيعات</span>
                      <span className="text-sm font-black font-mono text-white">
                        {liveTodayReport.metrics.totalRevenue.toLocaleString('ar-EG')} {currency}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10">
                      <span className="text-[10px] text-zinc-400 block">صافي الربح المحقق</span>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        +{Math.round(liveTodayReport.metrics.netProfit).toLocaleString('ar-EG')} {currency}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10">
                      <span className="text-[10px] text-zinc-400 block">عدد الفواتير والعبوات</span>
                      <span className="text-xs font-black font-mono text-amber-300">
                        {liveTodayReport.metrics.salesCount} فاتورة ({liveTodayReport.metrics.totalBottlesSold} عبوة)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10">
                      <span className="text-[10px] text-zinc-400 block">النقدية بالدرج</span>
                      <span className="text-xs font-black font-mono text-blue-300">
                        {liveTodayReport.metrics.expectedCashInDrawer.toLocaleString('ar-EG')} {currency}
                      </span>
                    </div>
                  </div>

                  {queuedOfflineReports.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-amber-200 font-bold truncate">
                        ⏳ يوجد ({queuedOfflineReports.length}) تقرير معلق في الطابور الذكي
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInitiateSendReport(queuedOfflineReports[0])}
                        disabled={!isOnline || isSending}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-[10px] shrink-0 cursor-pointer"
                      >
                        إرسال الآن
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Dispatch Actions */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleInitiateSendReport(liveTodayReport)}
                    disabled={isSending}
                    className="apple-btn w-full py-2.5 px-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>جاري الإرسال الشامل...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>إرسال التقرير الآن (Gmail + Google Forms + واتساب طارق)</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(whatsappMessageText);
                        setCopiedReport(true);
                        setTimeout(() => setCopiedReport(false), 2000);
                      }}
                      className="apple-btn py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copiedReport ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedReport ? 'تم النسخ!' : 'نسخ واتساب'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="apple-btn py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>تحميل .TXT</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativeShareWhatsApp}
                      className="apple-btn py-2 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Share2 size={13} />
                      <span>مشاركة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LIVE REPORT PREVIEW (WHATSAPP / EMAIL) — ZERO EXTERNAL SCROLL      */}
          {/* ========================================================================= */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col justify-between gap-3 overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#0071E3]" />
                    <span>معاينة تقرير إغلاق اليوم ({liveTodayReport.reportDate}):</span>
                  </span>
                  <div className="inline-flex rounded-xl bg-[#F5F5F7] p-0.5 border border-black/[0.06]">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('whatsapp')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        previewMode === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-[#636366] hover:text-[#1D1D1F]'
                      }`}
                    >
                      رسالة واتساب طارق المنسقة
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('email')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        previewMode === 'email'
                          ? 'bg-[#0071E3] text-white shadow-2xs'
                          : 'text-[#636366] hover:text-[#1D1D1F]'
                      }`}
                    >
                      تقرير البريد والنموذج
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {settings.googleFormResponderUrl && (
                    <a
                      href={settings.googleFormResponderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0071E3] hover:underline"
                    >
                      <span>نموذج Google Forms</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        previewMode === 'whatsapp' ? whatsappMessageText : liveTodayReport.plainTextBody
                      );
                      setCopiedReport(true);
                      setTimeout(() => setCopiedReport(false), 2000);
                    }}
                    className="apple-btn px-3 py-1 rounded-xl bg-[#1D1D1F] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedReport ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedReport ? 'تم النسخ!' : 'نسخ النص'}</span>
                  </button>
                </div>
              </div>

              {/* Multi-column compact summary view instead of a tall scrolling pre block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-hidden">
                <div className="rounded-2xl bg-[#1D1D1F] text-emerald-50 p-3.5 font-mono text-[11px] leading-relaxed overflow-hidden border border-black/15 flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-amber-300 pb-1.5 border-b border-white/10 flex items-center justify-between">
                    <span>الجزء الأول: المؤشرات المالية وحركة الدرج</span>
                    <span>{liveTodayReport.reportDate}</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-[10.5px] leading-snug overflow-hidden flex-1 pt-1.5">
                    {(previewMode === 'whatsapp' ? whatsappMessageText : liveTodayReport.plainTextBody)
                      .split('\n')
                      .slice(0, 14)
                      .join('\n')}
                  </pre>
                </div>

                <div className="rounded-2xl bg-[#1D1D1F] text-emerald-50 p-3.5 font-mono text-[11px] leading-relaxed overflow-hidden border border-black/15 flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-emerald-300 pb-1.5 border-b border-white/10 flex items-center justify-between">
                    <span>الجزء الثاني: الأصناف الأكثر مبيعاً وحالة المخزون</span>
                    <span>جاهز للإرسال ✓</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-[10.5px] leading-snug overflow-hidden flex-1 pt-1.5">
                    {(previewMode === 'whatsapp' ? whatsappMessageText : liveTodayReport.plainTextBody)
                      .split('\n')
                      .slice(14, 29)
                      .join('\n')}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SETTINGS & FREE BACKGROUND WHATSAPP GATEWAY — ZERO SCROLL          */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-stretch overflow-hidden">
              {/* Contact & Schedule Config (7 cols) */}
              <div className="lg:col-span-7 p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.07] flex flex-col justify-between gap-2.5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs font-black text-[#1D1D1F] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#C49746]" />
                      <span>بيانات التواصل الرسمية وجدولة منتصف الليل (12:00 AM)</span>
                    </h3>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoMidnightEnabled}
                        onChange={(e) => setAutoMidnightEnabled(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#0071E3] rounded"
                      />
                      <span className="text-[11px] font-bold text-[#1D1D1F]">
                        جدولة تلقائية 12:00 ص
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[#48484A] mb-1 block">
                        البريد الرسمي للمتجر (Gmail):
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={storeEmailInput}
                        onChange={(e) => setStoreEmailInput(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono text-xs font-bold text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#48484A] mb-1 block">
                        المسؤول المستلم للتقرير:
                      </label>
                      <input
                        type="text"
                        value={storeManagerInput}
                        onChange={(e) => setStoreManagerInput(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] text-xs font-bold text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#48484A] mb-1 block">
                        رقم واتساب المتجر الرسمي (1):
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={primaryWhatsAppInput}
                        onChange={(e) => setPrimaryWhatsAppInput(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono text-xs font-bold text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#48484A] mb-1 block">
                        رقم واتساب المتجر الرسمي (2):
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={secondaryWhatsAppInput}
                        onChange={(e) => setSecondaryWhatsAppInput(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono text-xs font-bold text-[#1D1D1F]"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span className="font-bold text-[#86868B]">أرقام طارق المعتمدة:</span>
                    {OFFICIAL_STORE_WHATSAPP_NUMBERS.map((num) => (
                      <button
                        key={num.phone}
                        type="button"
                        onClick={() => setPrimaryWhatsAppInput(num.phone)}
                        className={`px-2 py-0.5 rounded-lg font-mono font-bold border transition-all cursor-pointer ${
                          primaryWhatsAppInput === num.phone
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-[#1D1D1F] border-black/[0.08]'
                        }`}
                      >
                        {num.phone} ({num.badge})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-end gap-2 pt-2 border-t border-black/[0.06]">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[#636366] mb-1 block">
                      رابط نموذج Google Forms إضافي (اختياري):
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={customWebhookInput}
                      onChange={(e) => setCustomWebhookInput(e.target.value)}
                      placeholder="https://docs.google.com/forms/..."
                      className="w-full h-8 px-2.5 rounded-xl bg-white border border-black/[0.08] font-mono text-[11px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="apple-btn h-8 px-4 rounded-xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    حفظ الإعدادات
                  </button>
                </div>
              </div>

              {/* Free Background WhatsApp Gateway Config (5 cols) */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 flex flex-col justify-between gap-2.5">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                    <Zap size={15} className="text-emerald-600 shrink-0" />
                    <span>بوابة الإرسال الخلفي الصامت المجانية (CallMeBot / Webhook)</span>
                  </div>
                  <p className="text-[10px] text-[#48484A] leading-relaxed">
                    لإرسال التقرير تلقائياً في الخلفية بدون فتح نافذة واتساب، أرسل{' '}
                    <code className="px-1 py-0.5 rounded bg-emerald-100 font-mono text-[9px]">
                      I allow callmebot to send me messages
                    </code>{' '}
                    إلى <strong dir="ltr">+34 644 52 74 88</strong> وأدخل الكود المجاني:
                  </p>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[#48484A] mb-0.5 block">
                        مفتاح CallMeBot لرقم ({primaryWhatsAppInput}):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={callMeBotKey1}
                        onChange={(e) => setCallMeBotKey1(e.target.value)}
                        placeholder="مثال: 123456 (اختياري)"
                        className="w-full h-8 px-2.5 rounded-xl bg-white border border-emerald-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#48484A] mb-0.5 block">
                        مفتاح CallMeBot لرقم ({secondaryWhatsAppInput}):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={callMeBotKey2}
                        onChange={(e) => setCallMeBotKey2(e.target.value)}
                        placeholder="مثال: 654321 (اختياري)"
                        className="w-full h-8 px-2.5 rounded-xl bg-white border border-emerald-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#48484A] mb-0.5 block">
                        رابط Webhook واتساب مجاني (Apps Script / WAHA):
                      </label>
                      <input
                        type="url"
                        dir="ltr"
                        value={whatsappWebhookInput}
                        onChange={(e) => setWhatsappWebhookInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/..."
                        className="w-full h-8 px-2.5 rounded-xl bg-white border border-emerald-200 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="apple-btn w-full h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                >
                  حفظ مفاتيح الأتمتة الخلفية المجانية
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PAGINATED REPORTS HISTORY (3 PER PAGE — ZERO SCROLLBARS)           */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <div className="flex-1 flex flex-col justify-between gap-3 overflow-hidden">
              {reportsHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#F5F5F7] border border-black/[0.05]">
                  <History size={28} className="text-[#86868B] mb-2" />
                  <p className="text-xs font-black text-[#1D1D1F]">لا توجد تقارير سابقة مسجلة بعد</p>
                  <p className="text-[11px] text-[#86868B] mt-0.5">
                    سيتم حفظ تقارير إغلاق اليوم وتقارير منتصف الليل التلقائية هنا
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 flex-1 overflow-hidden">
                    {paginatedHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black font-mono text-[#1D1D1F]">{item.reportDate}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                item.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status === 'sent'
                                ? 'تم الإرسال عبر الإيميل والنموذج وواتساب ✓'
                                : 'محفوظ في طابور الإرسال التلقائي'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#636366] font-mono block mt-0.5 truncate">
                            المبيعات: {item.metrics.totalRevenue.toLocaleString('ar-EG')} {currency} · صافي الربح: +
                            {Math.round(item.metrics.netProfit).toLocaleString('ar-EG')} {currency} · واتساب:{' '}
                            {item.whatsappPhone} / {item.whatsappSecondaryPhone || '01062018755'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={buildWhatsAppDirectUrl(
                              primaryWhatsAppInput || '01123376728',
                              item.whatsappFormattedMessage || item.plainTextBody
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apple-btn px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-bold no-underline"
                          >
                            واتساب 1
                          </a>
                          <a
                            href={buildWhatsAppDirectUrl(
                              secondaryWhatsAppInput || '01062018755',
                              item.whatsappFormattedMessage || item.plainTextBody
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apple-btn px-2.5 py-1.5 rounded-xl bg-teal-700 text-white text-[10px] font-bold no-underline"
                          >
                            واتساب 2
                          </a>
                          {item.status !== 'sent' && (
                            <button
                              type="button"
                              onClick={() => handleInitiateSendReport(item)}
                              className="apple-btn px-3 py-1.5 rounded-xl bg-[#0071E3] text-white text-[10px] font-bold cursor-pointer"
                            >
                              إرسال البريد
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] text-xs shrink-0">
                    <span className="text-[11px] text-[#86868B] font-bold">
                      إجمالي السجل: {reportsHistory.length} تقرير · صفحة {historyPage} من {totalHistoryPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        className="apple-btn px-2.5 py-1 rounded-xl bg-[#F5F5F7] border border-black/[0.08] disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronRight size={14} />
                        <span>السابق</span>
                      </button>
                      <button
                        type="button"
                        disabled={historyPage >= totalHistoryPages}
                        onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                        className="apple-btn px-2.5 py-1 rounded-xl bg-[#F5F5F7] border border-black/[0.08] disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>التالي</span>
                        <ChevronLeft size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXPLICIT USER CONFIRMATION DIALOG FOR WORKSPACE API MUTATIONS        */}
      {/* ==================================================================== */}
      {pendingConfirmReport && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="smart-modal-window apple-glass rounded-3xl p-5 w-full max-w-md bg-white border border-black/[0.12] shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#0071E3]/15 text-[#0071E3] flex items-center justify-center shrink-0">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#1D1D1F]">
                  تأكيد إرسال تقرير إغلاق اليوم (البريد + النموذج + واتساب طارق)
                </h3>
                <span className="text-[10px] text-[#86868B]">
                  إذن المستخدم لتنفيذ الإرسال عبر Gmail و Google Forms وأتمتة واتساب
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] text-[11px] space-y-1 text-[#1D1D1F]">
              <div>
                • <strong>تاريخ التقرير:</strong> <span className="font-mono">{pendingConfirmReport.reportDate}</span>
              </div>
              <div>
                • <strong>البريد المستلم:</strong>{' '}
                <span dir="ltr" className="font-mono font-bold text-[#0071E3]">
                  {pendingConfirmReport.recipientEmail}
                </span>
              </div>
              <div>
                • <strong>واتساب المتجر الرسمي (طارق):</strong>{' '}
                <span dir="ltr" className="font-mono font-bold text-emerald-700">
                  {primaryWhatsAppInput} / {secondaryWhatsAppInput}
                </span>
              </div>
              <div>
                • <strong>الأداء:</strong> مبيعات{' '}
                <strong className="font-mono">
                  {pendingConfirmReport.metrics.totalRevenue.toLocaleString('ar-EG')} {currency}
                </strong>{' '}
                ({pendingConfirmReport.metrics.salesCount} فاتورة) · صافي ربح{' '}
                <strong className="font-mono text-emerald-700">
                  +{Math.round(pendingConfirmReport.metrics.netProfit).toLocaleString('ar-EG')} {currency}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={primaryWaDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-btn py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black flex items-center justify-center gap-1 no-underline"
              >
                <MessageCircle size={12} className="text-emerald-600" />
                <span>واتساب ({primaryWhatsAppInput})</span>
              </a>
              <a
                href={secondaryWaDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-btn py-2 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-[10px] font-black flex items-center justify-center gap-1 no-underline"
              >
                <Smartphone size={12} className="text-teal-600" />
                <span>واتساب ({secondaryWhatsAppInput})</span>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingConfirmReport(null)}
                className="apple-btn py-2 rounded-xl bg-black/[0.05] hover:bg-black/[0.09] text-[#1D1D1F] text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmAndExecuteDispatch}
                className="apple-btn py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-black shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>تأكيد الإرسال الشامل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportAutomationModal;
