import React, { useState } from 'react';
import { 
  AppUser, 
  UserRole, 
  UserPermissions, 
  OWNER_FULL_PERMISSIONS, 
  TAREK_OPERATIONAL_PERMISSIONS,
  CASHIER_STANDARD_PERMISSIONS,
  INVENTORY_KEEPER_PERMISSIONS,
  AuditLogRecord
} from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Check, 
  X, 
  AlertCircle, 
  Edit3, 
  Eye, 
  EyeOff, 
  UserX, 
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface UsersManagementProps {
  users: AppUser[];
  currentUser: AppUser | null;
  onSaveUser: (user: AppUser) => Promise<void> | void;
  onAddAuditLog: (log: AuditLogRecord) => void;
}

const PERMISSION_LABELS: Partial<Record<keyof UserPermissions, { label: string; group: string }>> = {
  // Sales & POS
  canRecordSale: { label: 'تسجيل بيع جديد', group: 'المبيعات والكاشير' },
  canEditSaleBeforeClose: { label: 'تعديل البيع قبل إغلاق اليوم', group: 'المبيعات والكاشير' },
  canCancelSale: { label: 'إلغاء عملية بيع (مع سبب)', group: 'المبيعات والكاشير' },
  canReturnSale: { label: 'تسجيل مرتجع', group: 'المبيعات والكاشير' },
  canApplyDiscount: { label: 'تطبيق خصومات ترويجية', group: 'المبيعات والكاشير' },
  canOverridePrice: { label: 'تغيير سعر البيع يدوياً', group: 'المبيعات والكاشير' },
  // Customers
  canManageCustomers: { label: 'تسجيل ومتابعة العملاء', group: 'العملاء والمتابعة' },
  // Stock
  canViewStock: { label: 'عرض رصيد المخزون', group: 'المخزون والخامات' },
  canRecordShortage: { label: 'تسجيل نقص مخزون', group: 'المخزون والخامات' },
  canStockCheck: { label: 'تسجيل جرد فعلي', group: 'المخزون والخامات' },
  canCreatePurchaseRequest: { label: 'إنشاء طلب شراء خامات', group: 'المخزون والخامات' },
  canEditProductCost: { label: 'تعديل تكلفة المنتج (خطير)', group: 'المخزون والخامات' },
  canEditProductPrice: { label: 'تعديل أسعار الكتالوج (خطير)', group: 'المخزون والخامات' },
  // Shifts
  canOpenDay: { label: 'فتح يوم العمل والدرج', group: 'الورديات والتشغيل' },
  canCloseDay: { label: 'إغلاق اليوم واعتماد الجرد', group: 'الورديات والتشغيل' },
  canReopenClosedDay: { label: 'إعادة فتح يوم مغلق (خاص بالمالك)', group: 'الورديات والتشغيل' },
  canLogFieldActivity: { label: 'تسجيل نشاط ميداني/تسويقي', group: 'الورديات والتشغيل' },
  // Financial
  canViewExecutiveDashboard: { label: 'عرض لوحة المؤشرات المالية للمالك', group: 'المالية والخزائن' },
  canViewVaults: { label: 'عرض المحافظ والخزائن', group: 'المالية والخزائن' },
  canRequestWithdrawal: { label: 'طلب صرف مصاريف تشغيل', group: 'المالية والخزائن' },
  canApproveWithdrawal: { label: 'اعتماد عمليات الصرف', group: 'المالية والخزائن' },
  canInjectCapital: { label: 'ضخ تمويل / رأس مال جديد', group: 'المالية والخزائن' },
  canTransferBetweenVaults: { label: 'تحويل معتمد بين المحافظ', group: 'المالية والخزائن' },
  canWithdrawOwnerProfit: { label: 'سحب أرباح المالك', group: 'المالية والخزائن' },
  canEditBudget: { label: 'تعديل الموازنة التقديرية', group: 'المالية والخزائن' },
  canEditSalaries: { label: 'تعديل الرواتب المعتمدة', group: 'المالية والخزائن' },
  canEditCommissions: { label: 'تعديل نسب العمولات', group: 'المالية والخزائن' },
  // Users & System
  canManageUsers: { label: 'إدارة المستخدمين والصلاحيات', group: 'النظام والأمان' },
  canViewAuditLog: { label: 'عرض سجل التدقيق والمراجعة', group: 'النظام والأمان' },
  canExportData: { label: 'تصدير البيانات والتقارير', group: 'النظام والأمان' },
  // Administrative Confidentiality & Trade Secrets (أسرار الإدارة والسرية)
  canViewProfits: { label: 'الاطلاع على هوامش وصافي الأرباح (سر إداري)', group: 'أسرار الإدارة والسرية' },
  canViewCosts: { label: 'الاطلاع على تكلفة الخامات وسعر الجملة (سر تجاري)', group: 'أسرار الإدارة والسرية' },
  canViewExpenses: { label: 'الاطلاع على المصروفات والرواتب والإيجارات', group: 'أسرار الإدارة والسرية' },
  canViewReports: { label: 'الاطلاع على التقارير المحاسبية التنفيذية', group: 'أسرار الإدارة والسرية' },
  canManageSettings: { label: 'التحكم بإعدادات النظام والتسعير', group: 'أسرار الإدارة والسرية' },
  canAccessOperationsSystem: { label: 'الوصول لنظام التارجت والموازنة المعتمدة', group: 'أسرار الإدارة والسرية' },
};

const UsersManagement: React.FC<UsersManagementProps> = ({
  users,
  currentUser,
  onSaveUser,
  onAddAuditLog,
}) => {
  const isOwner = currentUser?.role === 'OWNER';

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formAuthEmail, setFormAuthEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('CASHIER');
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(TAREK_OPERATIONAL_PERMISSIONS);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Open Edit Modal for a User
  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsCreatingNew(false);
    setFormDisplayName(user.displayName);
    setFormUsername(user.username);
    setFormAuthEmail(user.authEmail || '');
    setFormRole(user.role);
    setFormPermissions({ ...user.permissions });
    setStatusMessage(null);
  };

  // Open New User Form
  const handleAddNewUser = () => {
    setSelectedUser(null);
    setIsCreatingNew(true);
    setFormDisplayName('');
    setFormUsername('');
    setFormAuthEmail('');
    setFormRole('CASHIER');
    setFormPermissions({ ...TAREK_OPERATIONAL_PERMISSIONS });
    setStatusMessage(null);
  };

  // Toggle Single Permission
  const togglePermission = (key: keyof UserPermissions) => {
    setFormPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Apply Role Preset
  const handleRolePreset = (role: UserRole) => {
    setFormRole(role);
    if (role === 'OWNER') {
      setFormPermissions({ ...OWNER_FULL_PERMISSIONS });
    } else if (role === 'CASHIER' || role === 'SALES_REP') {
      setFormPermissions({ ...CASHIER_STANDARD_PERMISSIONS });
    } else if (role === 'INVENTORY_KEEPER') {
      setFormPermissions({ ...INVENTORY_KEEPER_PERMISSIONS });
    } else {
      setFormPermissions({ ...TAREK_OPERATIONAL_PERMISSIONS });
    }
  };

  // Save User (Create or Edit)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDisplayName.trim() || !formUsername.trim()) {
      alert('يرجى ملء الاسم واسم المستخدم.');
      return;
    }

    const normalizedEmail = formAuthEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      alert('أدخل بريد Google صحيحاً لهذا الموظف.');
      return;
    }
    if (users.some(u => u.id !== selectedUser?.id && (u.authEmail || '').toLowerCase() === normalizedEmail)) {
      alert('هذا البريد مرتبط بالفعل بحساب موظف آخر.');
      return;
    }

    try {
      if (isCreatingNew) {
        const newUser: AppUser = {
          id: `user-${formUsername.trim().toLowerCase()}-${Date.now().toString(36)}`,
          username: formUsername.trim().toLowerCase(),
          displayName: formDisplayName.trim(),
          authEmail: normalizedEmail,
          role: formRole,
          passwordHash: '',
          requiresPasswordChange: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          permissions: formPermissions,
        };

        await onSaveUser(newUser);

        onAddAuditLog({
          id: `audit-user-add-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: currentUser?.displayName || 'المالك',
          action: 'تعديل صلاحيات',
          entityType: 'user',
          entityId: newUser.id,
          entityName: newUser.displayName,
          oldValue: null,
          newValue: `إضافة مستخدم جديد بدور ${newUser.role}`,
          reason: 'إنشاء حساب موظف جديد وتحديد صلاحياته',
          category: 'مستخدمين_وأمان'
        });

        setStatusMessage(`تمت إضافة الموظف ${newUser.displayName} بنجاح.`);
        setIsCreatingNew(false);
      } else if (selectedUser) {
        const updated: AppUser = {
          ...selectedUser,
          displayName: formDisplayName.trim(),
          username: formUsername.trim().toLowerCase(),
          authEmail: normalizedEmail,
          role: formRole,
          passwordHash: '',
          requiresPasswordChange: false,
          permissions: formPermissions,
        };

        await onSaveUser(updated);

        onAddAuditLog({
          id: `audit-user-edit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: currentUser?.displayName || 'المالك',
          action: 'تعديل صلاحيات',
          entityType: 'user',
          entityId: updated.id,
          entityName: updated.displayName,
          oldValue: selectedUser.permissions,
          newValue: updated.permissions,
          reason: 'تحديث بريد Google والدور والصلاحيات',
          category: 'مستخدمين_وأمان'
        });

        setStatusMessage(`تم تحديث بيانات وصلاحيات ${updated.displayName} بنجاح.`);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ المستخدم.');
    }
  };

  // Toggle Active / Freeze Account
  const handleToggleFreeze = (user: AppUser) => {
    if (user.role === 'OWNER') {
      alert('لا يمكن إيقاف حساب المالك الأساسي.');
      return;
    }

    const updated: AppUser = {
      ...user,
      isActive: !user.isActive
    };

    onSaveUser(updated);

    onAddAuditLog({
      id: `audit-user-freeze-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.displayName || 'المالك',
      action: 'تعديل صلاحيات',
      entityType: 'user',
      entityId: user.id,
      entityName: user.displayName,
      oldValue: user.isActive ? 'نشط' : 'موقوف',
      newValue: updated.isActive ? 'نشط' : 'موقوف',
      reason: updated.isActive ? 'إعادة تفعيل حساب الموظف' : 'إيقاف حساب الموظف مؤقتاً',
      category: 'مستخدمين_وأمان'
    });
  };

  // Group permissions by category
  const permissionGroups = Object.entries(PERMISSION_LABELS).reduce((acc, [key, item]) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(key as keyof UserPermissions);
    return acc;
  }, {} as Record<string, (keyof UserPermissions)[]>);

  if (!isOwner) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h2 className="text-lg font-black text-[#1D1D1F]">صلاحية مخصصة للمالك فقط</h2>
        <p className="text-xs text-[#86868B] leading-relaxed">
          إدارة المستخدمين والصلاحيات وإضافة الموظفين وتعديل كلمات المرور مقتصرة تماماً على د. محمد.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 p-4 sm:p-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1D1D1F]">إدارة المستخدمين والصلاحيات (RBAC)</h1>
              <p className="text-xs text-[#86868B]">
                لوحة تحكم د. محمد لإضافة وتجميد الموظفين وضبط الصلاحيات الدقيقة لكل وظيفة
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddNewUser}
          className="apple-btn flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-sm transition-all"
        >
          <UserPlus size={16} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Users List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(u => {
          const isOwnerUser = u.role === 'OWNER';
          const isCurrent = currentUser?.id === u.id;

          return (
            <div 
              key={u.id}
              className={`p-5 rounded-3xl border transition-all ${
                u.isActive 
                  ? 'bg-white border-black/[0.08] shadow-apple' 
                  : 'bg-black/[0.02] border-black/[0.04] opacity-75'
              }`}
            >
              <div className="flex items-start justify-between pb-3 border-b border-black/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-[#1D1D1F]">{u.displayName}</h3>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                        أنت
                      </span>
                    )}
                    {!u.isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                        موقوف
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#86868B] font-mono block">@{u.username}</span>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  isOwnerUser 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  {isOwnerUser ? 'مالك (تحكم كامل)' : 'مسؤول تشغيل'}
                </span>
              </div>

              {/* Status and permissions count */}
              <div className="py-3 flex items-center justify-between text-xs text-[#86868B]">
                <span>
                  الصلاحيات المفعلة:{' '}
                  <strong className="text-[#1D1D1F] font-mono">
                    {isOwnerUser ? 'الكل (30/30)' : Object.values(u.permissions).filter(Boolean).length}
                  </strong>
                </span>
                <span>
                  الحالة:{' '}
                  <strong className={u.isActive ? 'text-emerald-700' : 'text-rose-700'}>
                    {u.isActive ? 'نشط ويعمل' : 'موقوف مؤقتاً'}
                  </strong>
                </span>
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => handleEditUser(u)}
                  className="flex-1 py-2 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] text-[#1D1D1F] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit3 size={14} />
                  <span>تعديل الصلاحيات</span>
                </button>

                {!isOwnerUser && (
                  <button
                    type="button"
                    onClick={() => handleToggleFreeze(u)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                      u.isActive 
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {u.isActive ? <UserX size={14} /> : <CheckCircle2 size={14} />}
                    <span>{u.isActive ? 'إيقاف الموظف' : 'تفعيل'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {(isCreatingNew || selectedUser) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs smart-modal-overlay animate-in fade-in duration-150">
          <div className="apple-glass smart-modal-window rounded-3xl p-4 sm:p-5 w-full max-w-4xl border border-white/60 shadow-2xl space-y-3.5 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1D1D1F]">
                    {isCreatingNew ? 'إضافة موظف جديد وتعيين الصلاحيات' : `تعديل صلاحيات ${selectedUser?.displayName}`}
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    التحكم في الصلاحيات المنفردة لكل مهمة تشغيلية ومحاسبية
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setIsCreatingNew(false);
                }}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3 flex-1 flex flex-col justify-between overflow-hidden">
              
              {/* Basic Fields (4 columns on desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs shrink-0">
                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">الاسم الظاهر:</label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="مثال: طارق، أحمد..."
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] outline-none text-right font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">اسم المستخدم:</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="مثال: tarek..."
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] outline-none text-right font-mono"
                    disabled={!isCreatingNew && selectedUser?.username === 'mohamed'}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">الدور الوظيفي:</label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRolePreset(e.target.value as UserRole)}
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] outline-none text-right font-bold"
                  >
                    <option value="CASHIER">كاشير ومبيعات</option>
                    <option value="STORE_MANAGER">مسؤول تشغيل (مثل طارق)</option>
                    <option value="SALES_REP">بائع ومسوق ميداني</option>
                    <option value="INVENTORY_KEEPER">أمين مخزون وخامات</option>
                    <option value="OWNER">مالك (صلاحية كاملة)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block text-right">بريد حساب Google:</label>
                  <input
                    type="email"
                    value={formAuthEmail}
                    onChange={(e) => setFormAuthEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    autoComplete="email"
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/[0.08] outline-none text-left font-mono"
                    required
                  />
                </div>
              </div>

              {/* Granular Permissions Section (2-Column Bento Grid without Scrollbar) */}
              <div className="space-y-2 pt-2 border-t border-black/[0.06] flex-1 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#1D1D1F]">
                    <Sliders size={14} className="text-[#0071E3]" />
                    <span>الصلاحيات التفصيلية المنفصلة:</span>
                  </div>
                  <span className="text-[10px] text-[#86868B]">
                    التحكم بكل زر ووظيفة مستقلة
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 overflow-hidden">
                  {Object.entries(permissionGroups).map(([groupName, permKeys]) => (
                    <div key={groupName} className="p-2.5 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-1.5">
                      <span className="text-[11px] font-black text-[#1D1D1F] block text-right">
                        {groupName}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {permKeys.map(permKey => {
                          const isAllowed = formRole === 'OWNER' ? true : !!formPermissions[permKey];
                          const info = PERMISSION_LABELS[permKey];

                          return (
                            <label
                              key={permKey}
                              className={`px-2 py-1.5 rounded-xl border text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
                                isAllowed
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-white border-black/[0.06] text-[#86868B]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  disabled={formRole === 'OWNER'}
                                  onChange={() => togglePermission(permKey)}
                                  className="w-3.5 h-3.5 rounded text-[#0071E3] focus:ring-0 shrink-0"
                                />
                                <span className="truncate">{info.label}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-black/[0.06] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setIsCreatingNew(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.08] text-xs font-bold text-[#1D1D1F] hover:bg-black/[0.04]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-sm transition-all"
                >
                  حفظ البيانات والصلاحيات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersManagement;
