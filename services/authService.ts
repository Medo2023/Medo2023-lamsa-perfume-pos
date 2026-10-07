import { AppUser, UserPermissions, View } from '../types';

const OWNER_ONLY_PERMISSIONS = new Set<keyof UserPermissions>([
  'canEditProductCost', 'canViewCosts', 'canViewProfits', 'canViewCostAndProfit',
  'canViewProfitAndCosts', 'canViewExecutiveDashboard', 'canViewVaults',
  'canRequestWithdrawal', 'canApproveWithdrawal', 'canInjectCapital',
  'canTransferBetweenVaults', 'canWithdrawOwnerProfit', 'canEditBudget',
  'canEditSalaries', 'canEditCommissions', 'canViewExpenses', 'canManageSettings',
  'canManageUsers', 'canViewAuditLog', 'canViewAuditLogs', 'canAccessOperationsSystem',
  'canEditSettingsAndBudgets', 'canExportData', 'canDeleteInvoices',
]);

/**
 * Checks if user possesses a specific granular permission
 */
export function hasPermission(user: AppUser | null, permission: keyof UserPermissions): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true; // Full control for owner
  if (OWNER_ONLY_PERMISSIONS.has(permission)) return false;
  return !!user.permissions[permission];
}

/**
 * Checks whether the current user is permitted to view profit figures & margins
 */
export function canViewProfits(user: AppUser | null): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true;
  return hasPermission(user, 'canViewProfits');
}

/**
 * Checks whether the current user is permitted to view raw costs & purchase prices
 */
export function canViewCosts(user: AppUser | null): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true;
  return hasPermission(user, 'canViewCosts');
}

/**
 * Checks whether the current user is permitted to view financial vaults & cash allocations
 */
export function canViewVaults(user: AppUser | null): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true;
  return hasPermission(user, 'canViewVaults') && hasPermission(user, 'canApproveWithdrawal');
}

/**
 * Checks whether the current user is permitted to access a specific app view.
 */
export function canAccessView(user: AppUser | null, view: View | string): boolean {
  if (!user || !user.isActive) {
    return view === View.POS;
  }

  // Owner always has 100% unconditional access to all views
  if (user.role === 'OWNER') {
    return true;
  }

  const p = user.permissions;

  switch (view) {
    case View.POS:
      return p.canRecordSale;

    case View.CUSTOMERS_LOYALTY:
      return true;

    case View.ANALYZER:
      return true;

    case View.DASHBOARD:
      return hasPermission(user, 'canViewExecutiveDashboard');

    case View.REPORTS:
      // Allow access to Sales & Invoices Ledger (profit/cost columns remain role-protected inside)
      return true;

    case View.DAY_OPERATIONS:
    case 'DAY_OPERATIONS_ACTION':
      return p.canOpenDay || p.canCloseDay;

    case View.INVENTORY:
      return p.canViewStock;

    case View.INVENTORY_INTELLIGENCE:
      return p.canViewStock || p.canRecordShortage || p.canStockCheck || p.canCreatePurchaseRequest;

    case View.FORMULATION_ENGINE:
      return p.canEditProductCost === true && p.canViewCosts === true;

    case View.FINANCIAL_VAULTS:
      return p.canViewVaults && p.canApproveWithdrawal;

    case View.EXPENSES:
      return hasPermission(user, 'canViewExpenses') || hasPermission(user, 'canEditBudget');

    case View.OPERATIONS_SYSTEM:
      return hasPermission(user, 'canAccessOperationsSystem') && hasPermission(user, 'canEditBudget');

    case View.SETTINGS:
      return hasPermission(user, 'canManageSettings');

    case View.USERS_MANAGEMENT:
      return hasPermission(user, 'canManageUsers');

    case View.AUDIT_LOGS:
      return hasPermission(user, 'canViewAuditLog');

    case View.STORE_MANAGER:
      return hasPermission(user, 'canExportData');

    case View.MARKETING:
      return true;

    default:
      return false;
  }
}
