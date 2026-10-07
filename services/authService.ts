import { AppUser, UserPermissions, View } from '../types';

/**
 * Checks if user possesses a specific granular permission
 */
export function hasPermission(user: AppUser | null, permission: keyof UserPermissions): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true; // Full control for owner
  return !!user.permissions[permission];
}

/**
 * Checks whether the current user is permitted to view profit figures & margins
 */
export function canViewProfits(user: AppUser | null): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true;
  return !!user.permissions.canViewProfits;
}

/**
 * Checks whether the current user is permitted to view raw costs & purchase prices
 */
export function canViewCosts(user: AppUser | null): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true;
  return !!user.permissions.canViewCosts;
}

/**
 * Checks whether the current user is permitted to view financial vaults & cash allocations
 */
export function canViewVaults(user: AppUser | null): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'OWNER') return true;
  return !!user.permissions.canViewVaults && !!user.permissions.canApproveWithdrawal;
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
      return p.canViewExecutiveDashboard === true;

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
      return p.canViewExpenses === true || p.canEditBudget === true;

    case View.OPERATIONS_SYSTEM:
      return p.canAccessOperationsSystem === true && p.canEditBudget === true;

    case View.SETTINGS:
      return p.canManageSettings === true;

    case View.USERS_MANAGEMENT:
      return p.canManageUsers === true;

    case View.AUDIT_LOGS:
      return p.canViewAuditLog === true;

    case View.STORE_MANAGER:
      return p.canExportData === true;

    case View.MARKETING:
      return true;

    default:
      return false;
  }
}
