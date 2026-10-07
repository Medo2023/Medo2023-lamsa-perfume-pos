import React, { useState, useMemo } from 'react';
import { AuditLogRecord } from '../types';
import { 
  FileText, 
  Search, 
  Filter, 
  ShieldCheck, 
  Clock, 
  User, 
  Download, 
  Calendar,
  Layers,
  ChevronDown,
  Lock
} from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditLogRecord[];
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        log.user?.includes(searchQuery) ||
        log.entityName?.includes(searchQuery) ||
        log.reason?.includes(searchQuery) ||
        log.relatedTransactionId?.includes(searchQuery);

      const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;
      const matchAction = selectedAction === 'all' || log.action === selectedAction;

      return matchSearch && matchCategory && matchAction;
    });
  }, [logs, searchQuery, selectedCategory, selectedAction]);

  // Export Audit Trail to CSV
  const handleExportCSV = () => {
    const headers = ["المعرف", "التاريخ والوقت", "المستخدم", "العملية", "العنصر", "القيمة السابقة", "القيمة الجديدة", "السبب", "الجهاز", "رقم المعاملة"];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString('ar-EG'),
      `"${l.user || ''}"`,
      `"${l.action || ''}"`,
      `"${l.entityName || ''}"`,
      `"${typeof l.oldValue === 'object' ? JSON.stringify(l.oldValue) : (l.oldValue ?? '')}"`,
      `"${typeof l.newValue === 'object' ? JSON.stringify(l.newValue) : (l.newValue ?? '')}"`,
      `"${l.reason || ''}"`,
      `"${l.device || ''}"`,
      `"${l.relatedTransactionId || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lamsa_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 p-4 sm:p-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1D1D1F]">سجل المراجعة والتدقيق الرقابي (Audit Log)</h1>
            <p className="text-xs text-[#86868B]">
              توثيق لحظي غير قابل للتعديل أو الحذف لجميع العمليات والتعديلات المالية والإدارية
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="apple-btn flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-black/[0.08] hover:bg-black/[0.04] text-[#1D1D1F] text-xs font-bold shadow-2xs transition-all"
        >
          <Download size={14} />
          <span>تصدير السجل CSV</span>
        </button>
      </div>

      {/* Strict Non-deletion Policy Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-950 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Lock size={18} className="text-blue-600 shrink-0" />
          <p className="leading-relaxed">
            <strong>قاعدة عدم الحذف الصارمة:</strong> البيانات والعمليات المالية في «لَمْسَةُ عِطْر» لا تُحذف نهائياً. أي خطأ يُعالج بواسطة <strong>القيد العكسي (Reverse Transaction)</strong> مع توثيق الأثر والمسؤول.
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-blue-800 bg-white/80 px-2.5 py-1 rounded-xl shrink-0 border border-blue-200">
          {logs.length} سجل مدقق
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالمستخدم، العنصر، السبب، أو رقم المعاملة..."
            className="w-full h-11 px-4 pr-10 rounded-2xl bg-white border border-black/[0.08] text-xs outline-none text-right font-medium"
          />
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-11 px-3 rounded-2xl bg-white border border-black/[0.08] text-xs outline-none text-right font-bold"
        >
          <option value="all">جميع التصنيفات</option>
          <option value="مبيعات">مبيعات ومرتجعات</option>
          <option value="تسعير_وتكلفة">تسعير وتكلفة</option>
          <option value="مخزون">حركة المخزون</option>
          <option value="خزائن_ومسحوبات">المحافظ والمسحوبات</option>
          <option value="مستخدمين_وأمان">المستخدمين والأمان</option>
          <option value="إغلاق_يومي">إغلاق وفتح الأيام</option>
        </select>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="h-11 px-3 rounded-2xl bg-white border border-black/[0.08] text-xs outline-none text-right font-bold"
        >
          <option value="all">جميع أنواع العمليات</option>
          <option value="قيد عكسي">قيد عكسي / تصحيح</option>
          <option value="تعديل سعر">تعديل سعر</option>
          <option value="تعديل تكلفة">تعديل تكلفة</option>
          <option value="تعديل وصفة">تعديل وصفة</option>
          <option value="سحب مالي">سحب مالي / صرف</option>
          <option value="فتح يوم">فتح يوم</option>
          <option value="إغلاق يوم">إغلاق يوم</option>
          <option value="إعادة فتح يوم">إعادة فتح يوم مغلق</option>
          <option value="تعديل صلاحيات">تعديل صلاحيات</option>
          <option value="تغيير كلمة مرور">تغيير كلمة مرور</option>
        </select>
      </div>

      {/* Log Entries List */}
      {filteredLogs.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white text-center space-y-2 border border-black/[0.06]">
          <FileText size={36} className="text-[#86868B] mx-auto" />
          <h3 className="text-sm font-black text-[#1D1D1F]">لا توجد سجلات مطابقة للبحث</h3>
          <p className="text-xs text-[#86868B]">يتم تسجيل كافة العمليات المعتمدة والتعديلات آلياً فور حدوثها.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(log => {
            const isReversal = log.action === 'قيد عكسي' || log.action === 'إلغاء بيع';
            const isReopen = log.action === 'إعادة فتح يوم';

            return (
              <div 
                key={log.id}
                className={`p-4 rounded-3xl border transition-all ${
                  isReversal 
                    ? 'bg-rose-50/50 border-rose-200' 
                    : isReopen
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-white border-black/[0.06] shadow-apple'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-black/[0.04] gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                      isReversal 
                        ? 'bg-rose-100 text-rose-800' 
                        : isReopen
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {log.action}
                    </span>
                    <h4 className="text-sm font-black text-[#1D1D1F]">{log.entityName}</h4>
                    {log.relatedTransactionId && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-black/[0.04] rounded-lg text-[#86868B]">
                        {log.relatedTransactionId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#86868B]">
                    <span className="flex items-center gap-1 font-bold text-[#1D1D1F]">
                      <User size={13} />
                      <span>{log.user}</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} · {new Date(log.timestamp).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 space-y-2 text-xs">
                  {/* Reason */}
                  <div className="flex items-start gap-1.5 text-[#1D1D1F]">
                    <span className="text-[#86868B] font-bold shrink-0">سبب العملية:</span>
                    <p className="font-medium leading-relaxed">{log.reason || 'لا يوجد سبب مسجل'}</p>
                  </div>

                  {/* Old vs New Values */}
                  {(log.oldValue !== undefined || log.newValue !== undefined) && (
                    <div className="p-2.5 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2 font-mono">
                      {log.oldValue !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#86868B]">القيمة السابقة:</span>
                          <span className="text-rose-700 font-bold">
                            {typeof log.oldValue === 'object' ? JSON.stringify(log.oldValue) : String(log.oldValue)}
                          </span>
                        </div>
                      )}
                      {log.newValue !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#86868B]">القيمة الجديدة:</span>
                          <span className="text-emerald-700 font-bold">
                            {typeof log.newValue === 'object' ? JSON.stringify(log.newValue) : String(log.newValue)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default AuditLogViewer;
