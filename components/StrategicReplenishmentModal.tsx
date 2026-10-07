import React, { useState } from 'react';
import { 
  StrategicReplenishmentOrder, 
  StrategicOrderItem, 
  StrategicOrderPriority, 
  StoreSettings, 
  Product, 
  AppUser, 
  AuditLogRecord 
} from '../types';
import { 
  formatOrderForWhatsApp, 
  openOrderInWhatsApp, 
  saveStrategicOrderCloud,
  DEFAULT_STRATEGIC_THRESHOLD_GRAMS
} from '../services/strategicOrderService';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Send, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Package, 
  FileText, 
  CheckCircle2, 
  Edit3,
  Calendar,
  Building,
  User,
  ArrowRight,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface StrategicReplenishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: StrategicReplenishmentOrder;
  onUpdateOrder: (updatedOrder: StrategicReplenishmentOrder) => void;
  allProducts: Product[];
  settings: StoreSettings;
  currentUser: AppUser | null;
  onAddAuditLog?: (log: AuditLogRecord) => void;
}

const StrategicReplenishmentModal: React.FC<StrategicReplenishmentModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdateOrder,
  allProducts,
  settings,
  currentUser,
  onAddAuditLog,
}) => {
  const [copied, setCopied] = useState(false);
  const [editableOrder, setEditableOrder] = useState<StrategicReplenishmentOrder>(order);
  const [supplierPhone, setSupplierPhone] = useState(order.supplierPhone || '');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<string>('');
  const [addedGrams, setAddedGrams] = useState<number>(500);
  const [itemsPage, setItemsPage] = useState<number>(0);
  const ITEMS_PER_PAGE = 3;

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(editableOrder.items.length / ITEMS_PER_PAGE));
  const safePage = Math.min(itemsPage, totalPages - 1);
  const pagedItems = editableOrder.items.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE
  );

  const isOwnerOrAdmin = !currentUser || currentUser.role === 'OWNER' || currentUser.permissions?.canApproveWithdrawal;

  // Handle inline grams change
  const handleGramsChange = (productId: number | string, newGrams: number) => {
    const updatedItems = editableOrder.items.map(it => {
      if (it.productId === productId) {
        const grams = Math.max(50, newGrams);
        return {
          ...it,
          suggestedOrderGrams: grams,
          totalEstimatedCost: grams * it.unitCostPerGram
        };
      }
      return it;
    });

    const totalGrams = updatedItems.reduce((sum, it) => sum + it.suggestedOrderGrams, 0);
    const totalEstimatedCost = updatedItems.reduce((sum, it) => sum + it.totalEstimatedCost, 0);

    const updated = {
      ...editableOrder,
      items: updatedItems,
      totalGrams,
      totalEstimatedCost,
      lastUpdated: new Date().toISOString()
    };

    setEditableOrder(updated);
    onUpdateOrder(updated);
  };

  // Remove item from order
  const handleRemoveItem = (productId: number | string) => {
    const updatedItems = editableOrder.items.filter(it => it.productId !== productId);
    const totalGrams = updatedItems.reduce((sum, it) => sum + it.suggestedOrderGrams, 0);
    const totalEstimatedCost = updatedItems.reduce((sum, it) => sum + it.totalEstimatedCost, 0);

    const updated = {
      ...editableOrder,
      items: updatedItems,
      totalGrams,
      totalEstimatedCost,
      lastUpdated: new Date().toISOString()
    };

    setEditableOrder(updated);
    onUpdateOrder(updated);
  };

  // Add new item to replenishment invoice
  const handleAddItemToOrder = () => {
    if (!selectedProductIdToAdd) return;
    const prod = allProducts.find(p => String(p.id) === String(selectedProductIdToAdd));
    if (!prod) return;

    // Check if already in order
    if (editableOrder.items.some(it => String(it.productId) === String(prod.id))) {
      setIsAddingItem(false);
      setSelectedProductIdToAdd('');
      return;
    }

    const isSpec = ['عود', 'مسك'].includes(prod.type);
    const costPerGram = isSpec ? settings.priceEssenceSpecial : settings.priceEssenceNormal;

    const newItem: StrategicOrderItem = {
      productId: prod.id,
      productName: prod.name,
      brand: prod.brand,
      type: prod.type,
      currentStockGrams: prod.stock_grams,
      strategicThresholdGrams: prod.strategicThresholdGrams || DEFAULT_STRATEGIC_THRESHOLD_GRAMS,
      suggestedOrderGrams: addedGrams,
      unitCostPerGram: costPerGram,
      totalEstimatedCost: addedGrams * costPerGram,
      priority: prod.stock_grams <= 50 ? 'عاجل جداً' : prod.stock_grams <= 100 ? 'عاجل' : 'مهم',
      priorityReason: 'تمت إضافته يدوياً من قبل مسؤول المبيعات والإدارة لتجديد الرصيد.',
      linkedSeasonOrEvent: prod.season || 'كل الفصول',
      status: 'قيد الطلب'
    };

    const updatedItems = [newItem, ...editableOrder.items];
    const totalGrams = updatedItems.reduce((sum, it) => sum + it.suggestedOrderGrams, 0);
    const totalEstimatedCost = updatedItems.reduce((sum, it) => sum + it.totalEstimatedCost, 0);

    const updated = {
      ...editableOrder,
      items: updatedItems,
      totalGrams,
      totalEstimatedCost,
      lastUpdated: new Date().toISOString()
    };

    setEditableOrder(updated);
    onUpdateOrder(updated);
    setIsAddingItem(false);
    setSelectedProductIdToAdd('');
  };

  // Instant Approval
  const handleApproveOrder = async () => {
    const updated: StrategicReplenishmentOrder = {
      ...editableOrder,
      status: 'معتمد',
      approvedBy: currentUser?.displayName || 'د. محمد (المالك)',
      approvedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    setEditableOrder(updated);
    onUpdateOrder(updated);
    await saveStrategicOrderCloud(updated);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `log-po-app-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentUser?.displayName || 'الإدارة',
        action: 'اعتماد دفعة',
        entityType: 'product',
        entityId: updated.orderNumber,
        entityName: `فاتورة النواقص الاستراتيجية #${updated.orderNumber}`,
        oldValue: 'بانتظار الاعتماد',
        newValue: 'معتمد',
        reason: `اعتماد طلب توريد نواقص لـ ${updated.items.length} صنف بإجمالي ${updated.totalGrams} جم`,
        approvedBy: currentUser?.displayName || 'د. محمد',
      });
    }
  };

  // Copy WhatsApp Formatted Message
  const handleCopyWhatsApp = () => {
    const text = formatOrderForWhatsApp(editableOrder, settings);
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Send WhatsApp Web
  const handleSendWhatsApp = () => {
    openOrderInWhatsApp(editableOrder, settings, supplierPhone);
  };

  // Print Invoice
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm smart-modal-overlay animate-in fade-in duration-150">
      <div className="apple-glass smart-modal-window rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl border border-white/40 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-black/[0.06] bg-white/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                  فاتورة وطلب توريد النواقص الاستراتيجية
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  editableOrder.status === 'معتمد' 
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {editableOrder.status === 'معتمد' ? '✅ معتمد رسمياً' : '⏳ جاهز للاعتماد الفوري'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#86868B] mt-0.5">
                <span className="font-mono font-bold text-[#1D1D1F]">رقم الطلب: {editableOrder.orderNumber}</span>
                <span>·</span>
                <span>المتجر: {settings.storeName}</span>
                <span>·</span>
                <span>{new Date(editableOrder.createdAt).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] text-[#86868B] flex items-center justify-center transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body (Zero-Scroll Dynamic Fit) */}
        <div className="p-3.5 sm:p-4 overflow-hidden flex-1 flex flex-col justify-between gap-2.5">
          
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-2.5 rounded-2xl bg-white border border-black/[0.06] shadow-apple-xs">
              <span className="text-[10px] font-bold text-[#86868B] block">الأصناف بالنواقص</span>
              <span className="text-base font-black text-[#1D1D1F] font-mono mt-0.5 block">
                {editableOrder.items.length} صنف
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-black/[0.06] shadow-apple-xs">
              <span className="text-[10px] font-bold text-[#86868B] block">إجمالي الكمية المقترحة</span>
              <span className="text-base font-black text-[#0071E3] font-mono mt-0.5 block">
                {editableOrder.totalGrams.toLocaleString('ar-EG')} <span className="text-[11px] font-sans">جم</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-black/[0.06] shadow-apple-xs">
              <span className="text-[10px] font-bold text-[#86868B] block">التكلفة الإجمالية التقديرية</span>
              <span className="text-base font-black text-[#C49746] font-mono mt-0.5 block">
                {editableOrder.totalEstimatedCost.toLocaleString('ar-EG')} <span className="text-[11px] font-sans">{settings.currency}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-black/[0.06] shadow-apple-xs">
              <span className="text-[10px] font-bold text-[#86868B] block">أعلى مستوى أولوية</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {editableOrder.items.some(i => i.priority === 'عاجل جداً') ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[11px] font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                    عاجل جداً (حرج)
                  </span>
                ) : editableOrder.items.some(i => i.priority === 'عاجل') ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black">
                    عاجل
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-black">
                    مهم ومجدول
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Supplier & Notes Combined Compact Bar */}
          <div className="p-2.5 rounded-2xl bg-white/70 border border-black/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Building size={14} className="text-[#86868B] shrink-0" />
              <span className="font-bold text-[#1D1D1F] shrink-0">المورد:</span>
              <input
                type="text"
                value={editableOrder.supplierName}
                onChange={(e) => setEditableOrder({ ...editableOrder, supplierName: e.target.value })}
                className="gemini-field field-border-neutral px-2 py-1 rounded-lg bg-white text-xs font-semibold text-[#1D1D1F] border border-black/10 w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#86868B] shrink-0">واتساب المورد:</span>
              <input
                type="text"
                placeholder="01xxxxxxxxx"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                className="gemini-field field-border-neutral px-2 py-1 rounded-lg bg-white text-xs font-mono font-bold text-[#1D1D1F] border border-black/10 w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#86868B] shrink-0">ملاحظة:</span>
              <input
                type="text"
                value={editableOrder.notes}
                onChange={(e) => setEditableOrder({ ...editableOrder, notes: e.target.value })}
                placeholder="ملاحظات التوريد والشحن..."
                className="gemini-field field-border-neutral px-2 py-1 rounded-lg bg-white text-xs text-[#1D1D1F] border border-black/10 w-full"
              />
            </div>
          </div>

          {/* Items Table with Smart Pagination */}
          <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-xs sm:text-sm text-[#1D1D1F]">
                  جدول الأصناف والنواقص الاستراتيجية ({editableOrder.items.length})
                </h3>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 bg-black/[0.04] px-2 py-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setItemsPage(p => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      className="p-0.5 disabled:opacity-30 hover:text-[#0071E3] cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                    <span className="font-mono text-[10px]">
                      {safePage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItemsPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={safePage >= totalPages - 1}
                      className="p-0.5 disabled:opacity-30 hover:text-[#0071E3] cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                  </div>
                )}
              </div>
              
              {!isAddingItem ? (
                <button
                  type="button"
                  onClick={() => setIsAddingItem(true)}
                  className="apple-btn px-2.5 py-1 rounded-xl bg-black/[0.05] hover:bg-black/[0.08] text-[11px] font-bold text-[#0071E3] flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>إضافة صنف للفاتورة</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="text-xs text-[#86868B] hover:text-[#1D1D1F]"
                >
                  إلغاء الإضافة
                </button>
              )}
            </div>

            {/* Quick Add Form */}
            {isAddingItem && (
              <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row items-center gap-2 text-xs shrink-0">
                <div className="flex-1 w-full">
                  <select
                    value={selectedProductIdToAdd}
                    onChange={(e) => setSelectedProductIdToAdd(e.target.value)}
                    className="w-full h-8 rounded-xl bg-white px-2.5 font-semibold text-[#1D1D1F] border border-blue-300 text-xs"
                  >
                    <option value="">-- اختر عطراً من الكتالوج لإدراجه --</option>
                    {allProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.brand}) - الرصيد الحالي: {p.stock_grams} جم
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="font-bold text-blue-900 shrink-0">الكمية:</span>
                  <input
                    type="number"
                    value={addedGrams}
                    onChange={(e) => setAddedGrams(Number(e.target.value) || 250)}
                    step="50"
                    min="50"
                    className="w-20 h-8 rounded-xl bg-white px-2 font-mono font-bold text-[#1D1D1F] border border-blue-300 text-center text-xs"
                  />
                  <span className="text-xs text-blue-900">جم</span>

                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    disabled={!selectedProductIdToAdd}
                    className="apple-btn px-3.5 h-8 rounded-xl bg-[#0071E3] text-white font-bold text-xs disabled:opacity-50 shrink-0"
                  >
                    إضافة
                  </button>
                </div>
              </div>
            )}

            {/* Itemized List (Paginated for Zero-Scroll) */}
            {editableOrder.items.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-white/60 border border-dashed border-black/10 space-y-1.5 flex-1 flex flex-col items-center justify-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                <p className="text-xs font-bold text-[#1D1D1F]">لا توجد نواقص في المخزون حالياً!</p>
                <p className="text-[11px] text-[#86868B]">جميع أصناف الزيوت العطرية أعلى من حد الطلب الاستراتيجي ({DEFAULT_STRATEGIC_THRESHOLD_GRAMS} جم).</p>
              </div>
            ) : (
              <div className="space-y-1.5 flex-1 flex flex-col justify-start overflow-hidden">
                {pagedItems.map((item, idx) => {
                  const index = safePage * ITEMS_PER_PAGE + idx;
                  const priorityColor = 
                    item.priority === 'عاجل جداً' ? 'bg-rose-50 text-rose-900 border-rose-200' :
                    item.priority === 'عاجل' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                    item.priority === 'مهم' ? 'bg-blue-50 text-blue-900 border-blue-200' :
                    'bg-gray-50 text-gray-800 border-gray-200';

                  return (
                    <div 
                      key={item.productId}
                      className="p-2.5 rounded-2xl bg-white border border-black/[0.06] shadow-apple-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-black/[0.04] text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs sm:text-sm text-[#1D1D1F]">{item.productName}</span>
                              <span className="text-[11px] text-[#86868B]">({item.brand})</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.04] font-semibold text-[#48484A]">
                                {item.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#86868B] mt-0.5">
                              <span>المخزون: <strong className={item.currentStockGrams <= 50 ? 'text-rose-600' : 'text-[#1D1D1F]'}>{item.currentStockGrams} جم</strong></span>
                              <span>·</span>
                              <span>الحد: {item.strategicThresholdGrams} جم</span>
                              <span>·</span>
                              <span>الجرام: {item.unitCostPerGram} {settings.currency}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Quantity & Priority */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className={`px-2 py-0.5 rounded-xl text-[10px] font-black border ${priorityColor} shrink-0`}>
                            {item.priority}
                          </span>

                          <div className="flex items-center gap-1 bg-[#F5F5F7] px-2 py-0.5 rounded-xl border border-black/[0.06]">
                            <span className="text-[10px] font-bold text-[#86868B]">الطلب:</span>
                            <input
                              type="number"
                              value={item.suggestedOrderGrams}
                              onChange={(e) => handleGramsChange(item.productId, Number(e.target.value) || 0)}
                              step="50"
                              min="50"
                              className="w-14 h-6 rounded-lg bg-white text-center font-mono font-black text-xs text-[#1D1D1F] border border-black/10"
                            />
                            <span className="text-[10px] font-bold text-[#48484A]">جم</span>
                          </div>

                          <div className="text-right font-mono min-w-14">
                            <span className="text-xs font-black text-[#C49746]">
                              {item.totalEstimatedCost.toLocaleString('ar-EG')}
                            </span>
                            <span className="text-[9px] text-[#86868B] mr-0.5">{settings.currency}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0"
                            title="حذف من الفاتورة"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-black/[0.06] bg-white/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* WhatsApp Send Button */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="apple-btn px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <Send size={15} />
              <span>إرسال عبر واتساب</span>
            </button>

            {/* Copy WhatsApp Message */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="apple-btn px-3.5 py-2.5 rounded-2xl bg-black/[0.05] hover:bg-black/[0.08] text-[#1D1D1F] font-bold text-xs flex items-center gap-1.5"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              <span>{copied ? 'تم نسخ نص الفاتورة!' : 'نسخ نص الفاتورة'}</span>
            </button>

            {/* Print PO */}
            <button
              type="button"
              onClick={handlePrint}
              className="apple-btn px-3 py-2.5 rounded-2xl bg-black/[0.05] hover:bg-black/[0.08] text-[#1D1D1F] font-bold text-xs flex items-center gap-1.5 hidden sm:flex"
            >
              <Printer size={15} />
              <span>طباعة</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {isOwnerOrAdmin && editableOrder.status !== 'معتمد' && (
              <button
                type="button"
                onClick={handleApproveOrder}
                className="apple-btn px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-2 shadow-md"
              >
                <CheckCircle2 size={16} />
                <span>اعتماد فوري للطلب</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="apple-btn px-4 py-2.5 rounded-2xl bg-black/[0.04] text-[#86868B] hover:text-[#1D1D1F] font-bold text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StrategicReplenishmentModal;
