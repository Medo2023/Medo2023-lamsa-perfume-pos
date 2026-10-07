import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Reports from './components/Reports';
import Expenses from './components/Expenses';
import Settings from './components/Settings';
import FragranceAnalyzer from './components/FragranceAnalyzer';
import MasterStoreManager from './components/MasterStoreManager';
import OperationsSystem from './components/OperationsSystem';
import AIMarketing from './components/AIMarketing';
import FinancialVaults from './components/FinancialVaults';
import ProductFormulationEngine from './components/ProductFormulationEngine';
import UsersManagement from './components/UsersManagement';
import DayOperationsModal from './components/DayOperationsModal';
import InventoryIntelligence from './components/InventoryIntelligence';
import AuditLogViewer from './components/AuditLogViewer';
import ExecutiveHeaderBar from './components/ExecutiveHeaderBar';
import { AppleWelcomeLockScreen } from './components/AppleWelcomeLockScreen';
import AppleTopNotificationBanner, { AppleNotificationItem, AppleNotificationType } from './components/AppleTopNotificationBanner';
import CustomersCRM from './components/CustomersCRM';
import AppleSignatureFooter from './components/AppleSignatureFooter';
import DailyReportAutomationModal from './components/DailyReportAutomationModal';
import AppleThemeStudioModal from './components/AppleThemeStudioModal';
import InteractiveTypingController from './components/InteractiveTypingController';
import SmartAppAssistantChat from './components/SmartAppAssistantChat';
import OwnerLiveAlertsRadarModal from './components/OwnerLiveAlertsRadarModal';
import PWAInstallModal from './components/PWAInstallModal';
import { soundAlertService } from './services/soundAlertService';
import { browserNotificationService } from './services/browserNotificationService';
import { 
  View, 
  Product, 
  Sale, 
  SaleItem,
  Expense, 
  StoreSettings, 
  BottleSize, 
  FinancialVault,
  WithdrawalTransaction,
  StaffAttendanceRecord,
  ProductionBatch,
  AuditLogRecord,
  AppUser,
  DailyClosure,
  PurchaseRequest,
  CustomerRequest,
  StockCheckRecord,
  StrategicReplenishmentOrder,
  FragranceDatabaseEntry,
  CustomCustomerRecord,
  SavedMixFormula,
  DEFAULT_SETTINGS, 
  DEFAULT_BOTTLE_SIZES,
  DEFAULT_VAULTS,
  DEFAULT_USERS,
  OWNER_FULL_PERMISSIONS,
  TAREK_OPERATIONAL_PERMISSIONS,
  resolveActiveAppTheme,
  isActualPaidOperationalExpense,
  isLiveProductionSale,
  isTestOrExampleRecord,
  LEGACY_SEEDED_BUDGET_EXPENSE_IDS
} from './types';
import {
  persistDataDurable,
  loadDataSync,
  hydrateFromIndexedDBIfNeeded,
  mergeCollectionRecords,
  addDeletedTombstone,
  removeDeletedTombstone,
  getDeletedTombstones
} from './services/persistenceService';
import { 
  subscribeToFragranceDatabase, 
  saveFragranceProfileCloud, 
  bulkUpsertFragranceProfilesCloud,
  getLocalFragranceDatabase,
  enrichFragranceProfile,
  saveLocalFragranceDatabase
} from './services/fragranceDbService';
import {
  buildDailyClosingReport,
  flushOfflineReportQueue,
  getLastAutoMidnightReportDate,
  setLastAutoMidnightReportDate,
  upsertAutomatedReport,
  executeFreeWhatsAppAutomation,
} from './services/workspaceReportService';
import { 
  subscribeToStrategicOrders, 
  saveStrategicOrderCloud, 
  getLocalStrategicOrders,
  saveLocalStrategicOrders
} from './services/strategicOrderService';
import { 
  subscribeToSales, 
  subscribeToProducts, 
  subscribeToExpenses, 
  subscribeToSettings, 
  subscribeToBottleSizes,
  subscribeToVaults,
  subscribeToWithdrawals,
  subscribeToStaffAttendance,
  saveStaffAttendanceCloud,
  saveVaultCloud,
  saveAllVaultsCloud,
  addWithdrawalCloud,
  addSaleCloud,
  deleteSaleCloud,
  deleteSaleAndRestoreInventoryCloud,
  saveProductCloud,
  deleteProductCloud,
  seedProductsCloud,
  saveExpenseCloud,
  deleteExpenseCloud,
  saveSettingsCloud,
  saveBottleSizesCloud,
  testFirestoreConnection,
  subscribeToProductionBatches,
  saveProductionBatchCloud,
  subscribeToAuditLogs,
  addAuditLogCloud,
  subscribeToAppUsers,
  saveAppUserCloud,
  subscribeToDailyClosures,
  saveDailyClosureCloud,
  subscribeToPurchaseRequests,
  savePurchaseRequestCloud,
  subscribeToCustomerRequests,
  saveCustomerRequestCloud,
  subscribeToStockChecks,
  saveStockCheckCloud,
  subscribeToCustomCustomers,
  saveCustomCustomerCloud,
  deleteCustomCustomerCloud,
  subscribeToSavedMixes,
  saveSavedMixCloud,
  deleteSavedMixCloud,
  isVirtualDemoCustomer,
  posRealtimeChannel,
  signOutFirebaseUser,
  loadAuthorizedAppUser,
  onFirebaseAuthStateChanged,
  getGoogleRedirectResult,
  getCurrentFirebaseUser,
  getGoogleSignInErrorMessage,
  isTransientFirebaseError
} from './services/firebase';
import { canAccessView } from './services/authService';
import { Lock, WifiOff } from 'lucide-react';

// Seed Data
const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: "أديداس", brand: "Adidas", origin: "ألماني", gender: "مشترك", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 2, name: "أكوا بروفومو", brand: "جورجيو أرماني", origin: "إيطالي", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 3, name: "أكوا دي جيو", brand: "جورجيو أرماني", origin: "إيطالي", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 4, name: "ألترا مارين", brand: "جيفنشي", origin: "فرنسي", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 5, name: "اسكيب", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 6, name: "اسكلبشر", brand: "نيكوس", origin: "ألماني", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 7, name: "انفيكتوس", brand: "باكو رابان", origin: "فرنسي", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 8, name: "بلو شانيل", brand: "شانيل", origin: "فرنسي", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 9, name: "جي شو", brand: "جيفنشي", origin: "فرنسي", gender: "نسائي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 10, name: "روزڤانيلا", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 11, name: "عود كمبودي", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "صيف", type: "عود", stock_grams: 1000 },
  { id: 12, name: "فواكه", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 13, name: "كليك فلير", brand: "الرصاصي", origin: "إماراتي", gender: "مشترك", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 14, name: "لاكوست اسنشيال", brand: "لاكوست", origin: "فرنسي", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 15, name: "لاكوست وايت", brand: "لاكوست", origin: "فرنسي", gender: "مشترك", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 16, name: "مون سباركل", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 17, name: "نيرولي", brand: "الرصاصي", origin: "إماراتي", gender: "مشترك", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 18, name: "هيريرا", brand: "كارولينا هيريرا", origin: "أمريكي", gender: "نسائي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 19, name: "ورد الطائف", brand: "الرصاصي", origin: "إماراتي", gender: "مشترك", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 20, name: "ڤيرساتشي إيروس", brand: "فيرساتشي", origin: "إيطالي", gender: "رجالي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 21, name: "ويك إند", brand: "بوربري", origin: "بريطاني", gender: "نسائي", season: "صيف", type: "عادي", stock_grams: 1000 },
  { id: 22, name: "أمير العود", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 23, name: "بلاك أفغانو", brand: "ناسوماتو", origin: "إيطالي", gender: "مشترك", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 24, name: "بلاك أوركيد", brand: "توم فورد", origin: "أمريكي", gender: "نسائي", season: "شتاء", type: "نيش", stock_grams: 1000 },
  { id: 25, name: "بلاك أوبيوم", brand: "إيف سان لوران", origin: "فرنسي", gender: "نسائي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 26, name: "بلاك بيور", brand: "مونتال", origin: "فرنسي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 27, name: "توباكو ڤانيلا", brand: "توم فورد", origin: "أمريكي", gender: "مشترك", season: "شتاء", type: "نيش", stock_grams: 1000 },
  { id: 28, name: "ثري جي", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 29, name: "جوتشي رش", brand: "غوتشي", origin: "إيطالي", gender: "نسائي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 30, name: "داركار نوار", brand: "جاي لاروش", origin: "فرنسي", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 31, name: "دهن العود", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 32, name: "دنهل أحمر", brand: "دنهل", origin: "بريطاني", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 33, name: "ريد عود", brand: "مونتال", origin: "فرنسي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 34, name: "سلطان العود", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 35, name: "سيلڤر سنت", brand: "جاك بوجارت", origin: "فرنسي", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 36, name: "شيروتي", brand: "شيروتي", origin: "إيطالي", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 37, name: "عنبر أسود", brand: "الرصاصي", origin: "إماراتي", gender: "مشترك", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 38, name: "عود اصفهان", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 39, name: "عود الحرمين", brand: "الحرمين", origin: "سعودي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 40, name: "عود شيخه", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 41, name: "عود مضاوي", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عود", stock_grams: 1000 },
  { id: 42, name: "فورجي", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 43, name: "كريزي لاڤ", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 44, name: "مسك مكه", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "مسك", stock_grams: 1000 },
  { id: 45, name: "مونتانا", brand: "مونتانا", origin: "فرنسي", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 46, name: "فقط للرجال", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "شتاء", type: "عادي", stock_grams: 1000 },
  { id: 47, name: "أترنيتي", brand: "كالفن كلاين", origin: "أمريكي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 48, name: "أربابورا", brand: "زيرجوف", origin: "إيطالي", gender: "مشترك", season: "كل الفصول", type: "نيش", stock_grams: 1000 },
  { id: 49, name: "أرماني بلاك كود", brand: "جورجيو أرماني", origin: "إيطالي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 50, name: "استرونجر ويز يو", brand: "جورجيو أرماني", origin: "إيطالي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 51, name: "أكسيريوس روج", brand: "جيفنشي", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 52, name: "ألترا مال", brand: "جان بول غوتييه", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 53, name: "ألمبيا", brand: "باكو رابان", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 54, name: "الوسام", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 55, name: "الهضبة", brand: "عمرو دياب", origin: "مصري", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 56, name: "أندرويد", brand: "أندرويد هوم", origin: "غير محدد", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 57, name: "أنجل", brand: "تيري موغلر", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 58, name: "أورجانزا", brand: "جيفنشي", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 59, name: "باد بوي", brand: "كارولينا هيريرا", origin: "أمريكي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 60, name: "باي جيفنشي", brand: "جيفنشي", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 61, name: "بربري هير", brand: "بوربري", origin: "بريطاني", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 62, name: "برشيوس", brand: "لورد أوف هوستري", origin: "غير محدد", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 63, name: "بكرات روج", brand: "ميسون فرانسيس كركديجيان", origin: "فرنسي", gender: "مشترك", season: "كل الفصول", type: "نيش", stock_grams: 1000 },
  { id: 64, name: "بلاك بوشن", brand: "باكو رابان", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 65, name: "بنك شوجر", brand: "أكوالينا", origin: "إيطالي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 66, name: "بوند نمبر ٩", brand: "بوند نمبر ٩", origin: "أمريكي", gender: "رجالي", season: "كل الفصول", type: "نيش", stock_grams: 1000 },
  { id: 67, name: "بي إم دبليو", brand: "كوزمو آبي", origin: "مصري", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 68, name: "تومي بوي", brand: "تومي هيلفيغر", origin: "أمريكي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 69, name: "ذا وان", brand: "دولتشي أند غابانا", origin: "إيطالي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 70, name: "جادور", brand: "ديور", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 71, name: "جاجوار جرين", brand: "جاغوار", origin: "بريطاني", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 72, name: "جود جيرل", brand: "كارولينا هيريرا", origin: "أمريكي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 73, name: "حكاية", brand: "مسك الحرمين", origin: "سعودي", gender: "مشترك", season: "كل الفصول", type: "مسك", stock_grams: 1000 },
  { id: 74, name: "خمرة", brand: "لطافة", origin: "إماراتي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 75, name: "خوخ", brand: "الماجد للعود", origin: "سعودي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 76, name: "دافي دوف", brand: "دافيدوف", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 77, name: "دعاء الجنة", brand: "علامات تجارية متعددة", origin: "شرق أوسطي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 78, name: "دنهل ديزاير", brand: "دنهل", origin: "بريطاني", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 79, name: "رومبا", brand: "تيد لابيدوس", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 80, name: "روشاس", brand: "روشاس", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 81, name: "رويال", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 82, name: "روز مسك", brand: "مونتال", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "مسك", stock_grams: 1000 },
  { id: 83, name: "سكاندال", brand: "جان بول غوتييه", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 84, name: "سلطان العطور", brand: "برفيوم تريجر", origin: "غير محدد", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 85, name: "سوبر سلطان", brand: "سدر الخليج", origin: "سعودي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 86, name: "سي كي", brand: "كالفن كلاين", origin: "أمريكي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 87, name: "سيجار", brand: "ريمي لاتور", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 88, name: "شانيل بلاتينيوم", brand: "شانيل", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 89, name: "شمس الإمارات", brand: "لطافة", origin: "إماراتي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 90, name: "شيخ جولد", brand: "شيخ", origin: "بحريني", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 91, name: "عنبر أبيض", brand: "كريد", origin: "فرنسي", gender: "مشترك", season: "كل الفصول", type: "نيش", stock_grams: 1000 },
  { id: 92, name: "عود أبيض", brand: "الرصاصي", origin: "إماراتي", gender: "مشترك", season: "كل الفصول", type: "عود", stock_grams: 1000 },
  { id: 93, name: "عود ركان", brand: "سويس أربيان", origin: "إماراتي", gender: "رجالي", season: "كل الفصول", type: "عود", stock_grams: 1000 },
  { id: 94, name: "عود عماني", brand: "عمان لكجري", origin: "عماني", gender: "مشترك", season: "كل الفصول", type: "عود", stock_grams: 1000 },
  { id: 95, name: "عود ملكي", brand: "شوبارد", origin: "سويسري", gender: "رجالي", season: "كل الفصول", type: "عود", stock_grams: 1000 },
  { id: 96, name: "عود مود", brand: "الرصاصي", origin: "إماراتي", gender: "مشترك", season: "كل الفصول", type: "عود", stock_grams: 1000 },
  { id: 97, name: "عود مبخر", brand: "الرصاصي", origin: "إماراتي", gender: "مشترك", season: "كل الفصول", type: "عود", stock_grams: 1000 },
  { id: 98, name: "فندي", brand: "فندي", origin: "إيطالي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 99, name: "فل", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 100, name: "ڤيكتوريا سيكريت", brand: "فيكتوريا سيكريت", origin: "أمريكي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 101, name: "فيري سكسي ناو", brand: "فيكتوريا سيكريت", origin: "أمريكي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 102, name: "كاريزما", brand: "باريس فلورز", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 103, name: "كاسيليا", brand: "باكوما", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 104, name: "كروما ليجند", brand: "أزارو", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 105, name: "كوكو شانيل", brand: "شانيل", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 106, name: "كلمات", brand: "العربية للعود", origin: "سعودي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 107, name: "كليك فلير أصفر", brand: "ريفلون", origin: "أمريكي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 108, name: "لافندر", brand: "أحمد المغربي", origin: "إماراتي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 109, name: "لابيدوس", brand: "تيد لابيدوس", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 110, name: "لومال جان بلو", brand: "جان بول غوتييه", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 111, name: "لڤلي بيل", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 112, name: "ليالي المدينة", brand: "جنيد للعطور", origin: "بحريني", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 113, name: "ماربرت مان", brand: "ماربرت", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 114, name: "ميدنايت", brand: "ديور", origin: "فرنسي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 115, name: "مسك أبيض", brand: "جوفان", origin: "أمريكي", gender: "رجالي", season: "كل الفصول", type: "مسك", stock_grams: 1000 },
  { id: 116, name: "مسك الطهارة", brand: "علامات تجارية متعددة", origin: "سعودي/شرق أوسطي", gender: "مشترك", season: "كل الفصول", type: "مسك", stock_grams: 1000 },
  { id: 117, name: "مشاري", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 118, name: "موصلاح", brand: "كونكا", origin: "غير محدد", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 119, name: "مون بلو", brand: "الرصاصي", origin: "إماراتي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 120, name: "نسائم", brand: "أجمل", origin: "إماراتي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 121, name: "نساء العالم", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 122, name: "ون مليون", brand: "باكو رابان", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 123, name: "وصال", brand: "أجمل", origin: "إماراتي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 124, name: "ورد بلدي", brand: "الدخيل للعود", origin: "سعودي", gender: "مشترك", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 125, name: "ياسمين", brand: "الرصاصي", origin: "إماراتي", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 126, name: "إيلي صعب", brand: "إيلي صعب", origin: "لبناني", gender: "نسائي", season: "كل الفصول", type: "عادي", stock_grams: 1000 },
  { id: 127, name: "أزورو", brand: "أزارو", origin: "فرنسي", gender: "رجالي", season: "كل الفصول", type: "عادي", stock_grams: 1000 }
];

// Default is strictly zero sales as requested (no mock or simulated sales)
const INITIAL_SALES: Sale[] = [];

// §1, §2, §36–39, §93: الموازنة الثابتة الشهرية (15,000 ج = 14,700 معلومة + 300 احتياطي) هي التزام تخطيطي شهري
// وليست مصروفاً نقدياً يومياً يُخصم من خزنة اليوم الواحد. لذلك تبدأ المصروفات النقدية اليومية الفعلية فارغة (0 ج)
// ولا يُسجل فيها إلا ما دُفع فعلياً من الدرج أو الخزنة أثناء التشغيل.
const INITIAL_EXPENSES: Expense[] = [];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [formulationProduct, setFormulationProduct] = useState<Product | null>(null);

  // Bulletproof Persistent State initialization with fallback
  const [products, setProducts] = useState<Product[]>(() => {
    return loadDataSync<Product[]>('lamsa_products', INITIAL_PRODUCTS);
  });

  // Sales (preserving all historical records; classifying any legacy system test records as TEST without deleting)
  const [sales, setSales] = useState<Sale[]>(() => {
    const parsed = loadDataSync<Sale[]>('lamsa_sales', []);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => {
        const isSystemTest = s.id.startsWith('sale-10') || isTestOrExampleRecord(s);
        return isSystemTest
          ? {
              ...s,
              dataClassification: 'TEST',
              isTestData: true,
              testClassificationNote: s.testClassificationNote || 'TEST / بيانات اختبار',
            }
          : {
              ...s,
              dataClassification: s.dataClassification || 'PRODUCTION',
              isTestData: false,
            };
      });
    }
    return [];
  });

  // Expenses (preserving all historical records; classifying legacy seeded budget items as TEST without deleting)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const parsed = loadDataSync<Expense[]>('lamsa_expenses_v2', INITIAL_EXPENSES);
    if (Array.isArray(parsed)) {
      return parsed.map((e) => {
        const isSeededOrTest = LEGACY_SEEDED_BUDGET_EXPENSE_IDS.has(e.id) || isTestOrExampleRecord(e);
        return isSeededOrTest
          ? {
              ...e,
              dataClassification: 'TEST',
              isTestData: true,
              testClassificationNote: e.testClassificationNote || 'TEST / بيانات اختبار',
            }
          : {
              ...e,
              dataClassification: e.dataClassification || 'PRODUCTION',
              isTestData: false,
            };
      });
    }
    return INITIAL_EXPENSES;
  });

  // Store Settings
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const parsed = loadDataSync<Partial<StoreSettings>>('lamsa_settings_v2', DEFAULT_SETTINGS);
    const savedQuickTheme = typeof window !== 'undefined' ? localStorage.getItem('lamsa_active_theme_v1') : null;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      activeThemeId: parsed.activeThemeId || savedQuickTheme || DEFAULT_SETTINGS.activeThemeId,
      logoUrl: parsed.logoUrl && parsed.logoUrl.trim() !== '' ? parsed.logoUrl : DEFAULT_SETTINGS.logoUrl,
      storeSlogan: parsed.storeSlogan && parsed.storeSlogan.trim() !== '' ? parsed.storeSlogan : DEFAULT_SETTINGS.storeSlogan,
    };
  });

  // Bottle Sizes
  const [bottleSizes, setBottleSizes] = useState<BottleSize[]>(() => {
    const parsed = loadDataSync<BottleSize[]>('lamsa_bottle_sizes_v2', DEFAULT_BOTTLE_SIZES);
    const has100ml = parsed.some((b: BottleSize) => b.sizeMl === 100);
    const hasOfficialCost = parsed.some((b: BottleSize) => b.officialCost !== undefined);
    if (has100ml && hasOfficialCost) {
      return parsed
        .filter((b: BottleSize) => b.sizeMl !== 12)
        .map((b: BottleSize) => {
          const def = DEFAULT_BOTTLE_SIZES.find(d => d.sizeMl === b.sizeMl && Boolean(d.isRollOn) === Boolean(b.isRollOn));
          return {
            ...b,
            coloredNormalPrice: b.coloredNormalPrice ?? def?.coloredNormalPrice,
          };
        });
    }
    return DEFAULT_BOTTLE_SIZES;
  });

  // Financial Vaults
  const [vaults, setVaults] = useState<FinancialVault[]>(() => {
    return loadDataSync<FinancialVault[]>('lamsa_vaults_v1', DEFAULT_VAULTS);
  });

  // Withdrawal Transactions
  const [withdrawals, setWithdrawals] = useState<WithdrawalTransaction[]>(() => {
    return loadDataSync<WithdrawalTransaction[]>('lamsa_withdrawals_v1', []);
  });

  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>(() => {
    return loadDataSync<StaffAttendanceRecord[]>('lamsa_attendance_v1', []);
  });

  const [batches, setBatches] = useState<ProductionBatch[]>(() => {
    return loadDataSync<ProductionBatch[]>('lamsa_batches_v1', []);
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(() => {
    return loadDataSync<AuditLogRecord[]>('lamsa_audit_logs_v1', []);
  });

  // User accounts are role profiles only; Firebase Google Auth is the sole login authority.
  const sanitizeUserAccount = (u: AppUser): AppUser => {
    const uname = (u.username || '').toLowerCase().trim();
    const dname = (u.displayName || '').trim();
    const isOwnerMohamed =
      u.id === 'user-mohamed' ||
      uname === 'mohamed' ||
      uname === 'محمد' ||
      u.role === 'OWNER' ||
      dname.includes('محمد');

    if (isOwnerMohamed) {
      return {
        ...DEFAULT_USERS[0],
        ...u,
        id: u.id || 'user-mohamed',
        username: 'mohamed',
        displayName: u.displayName || 'د. محمد (المالك)',
        role: 'OWNER',
        authEmail: u.authEmail || '',
        passwordHash: '',
        isActive: true,
        requiresPasswordChange: false,
        permissions: {
          ...OWNER_FULL_PERMISSIONS,
        },
      };
    }

    const isTarek =
      u.id === 'user-tarek' ||
      u.id === 'user-tarek-sales' ||
      uname === 'tarek' ||
      uname === 'طارق' ||
      dname.includes('طارق');

    if (isTarek) {
      return {
        ...DEFAULT_USERS[1],
        ...u,
        id: u.id || 'user-tarek',
        username: 'tarek',
        displayName: u.displayName || 'طارق (مسؤول ومدير المبيعات)',
        role: 'STORE_MANAGER',
        authEmail: u.authEmail || '',
        passwordHash: '',
        isActive: true,
        requiresPasswordChange: false,
        permissions: {
          ...TAREK_OPERATIONAL_PERMISSIONS,
          // Strictly enforce protection on sensitive financial & settings data
          canViewCostAndProfit: false,
          canViewAuditLogs: false,
          canExportData: false,
          canEditSettingsAndBudgets: false,
          canDeleteInvoices: false,
        },
      };
    }
    return {
      ...u,
      authEmail: (u.authEmail || '').trim().toLowerCase(),
      passwordHash: '',
      isActive: u.isActive !== false,
      requiresPasswordChange: false,
    };
  };

  const ensureCoreUsersList = (rawUsers: AppUser[]): AppUser[] => {
    const sanitizedList = Array.isArray(rawUsers) ? rawUsers.map(sanitizeUserAccount) : [];
    const existingOwner = sanitizedList.find(
      (u) => u.role === 'OWNER' || u.username === 'mohamed' || u.id === 'user-mohamed'
    );
    const existingTarek = sanitizedList.find(
      (u) => u.username === 'tarek' || u.id === 'user-tarek' || u.id === 'user-tarek-sales'
    );
    const otherUsers = sanitizedList.filter(
      (u) => u !== existingOwner && u !== existingTarek
    );

    return [
      existingOwner || sanitizeUserAccount(DEFAULT_USERS[0]),
      existingTarek || sanitizeUserAccount(DEFAULT_USERS[1]),
      ...otherUsers,
    ];
  };

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('lamsa_users_v1');
      if (saved) {
        const parsed: AppUser[] = JSON.parse(saved);
        return ensureCoreUsersList(parsed);
      }
    } catch (e) {
      console.error(e);
    }
    return ensureCoreUsersList(DEFAULT_USERS);
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Apple Top Dynamic Island Notifications State
  const [topNotifications, setTopNotifications] = useState<AppleNotificationItem[]>([]);

  const pushTopNotification = (
    type: AppleNotificationType,
    title: string,
    subtitle?: string,
    badgeText?: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: AppleNotificationItem = {
      id,
      type,
      title,
      subtitle,
      badgeText,
      actionLabel,
      onAction,
      createdAt: new Date().toISOString(),
    };
    setTopNotifications(prev => [newItem, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setTopNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  const dismissTopNotification = (id: string) => {
    setTopNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Apple Welcome & Lock Screen state for complete store privacy
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(true);

  const [isThemeStudioModalOpen, setIsThemeStudioModalOpen] = useState(false);

  // Synchronize active Apple Theme, Typography, Colors, Weight, Stroke, Numeral System & Surface Styles to document root
  useEffect(() => {
    const applyThemeAttributes = () => {
      const resolved = resolveActiveAppTheme(settings);
      const root = document.documentElement;
      root.setAttribute('data-theme', resolved.id);
      root.setAttribute('data-theme-mode', resolved.isDark ? 'dark' : 'light');
      root.setAttribute('data-ambient', settings.themeAmbientGlow !== false ? 'true' : 'false');
      root.setAttribute('data-glass', settings.themeGlassIntensity || 'balanced');
      root.setAttribute('data-elevation', settings.themeCardElevation || 'floating');
      root.setAttribute('data-font-scale', settings.themeFontScale || 'normal');
      root.setAttribute('data-surface-style', settings.themeSurfaceStyle || 'liquid_glass');
      root.setAttribute('data-border-radius', settings.themeBorderRadius || 'rounded');
      root.setAttribute('data-contrast-level', settings.themeContrastLevel || 'standard');

      // Custom Accent Color
      const customAccent = (settings.themeCustomAccentColor || settings.themeCustomAccent || '').trim();
      if (customAccent) {
        root.setAttribute('data-custom-accent', 'true');
        root.style.setProperty('--custom-accent', customAccent);
        root.style.setProperty('--apple-blue', customAccent);
        root.style.setProperty('--apple-blue-hover', customAccent);
      } else {
        root.removeAttribute('data-custom-accent');
        root.style.removeProperty('--custom-accent');
        root.style.removeProperty('--apple-blue');
        root.style.removeProperty('--apple-blue-hover');
      }

      // Site-Wide Font Family
      const fontMap: Record<string, string> = {
        readex: '"Readex Pro", "Tajawal", -apple-system, BlinkMacSystemFont, sans-serif',
        tajawal: '"Tajawal", "Readex Pro", -apple-system, BlinkMacSystemFont, sans-serif',
        cairo: '"Cairo", "Readex Pro", -apple-system, BlinkMacSystemFont, sans-serif',
        ibm_plex: '"IBM Plex Sans Arabic", "Readex Pro", -apple-system, sans-serif',
        almarai: '"Almarai", "Tajawal", -apple-system, sans-serif',
        noto_kufi: '"Noto Kufi Arabic", "Readex Pro", -apple-system, sans-serif',
        changa: '"Changa", "Cairo", -apple-system, sans-serif',
        amiri: '"Amiri", "Cairo", Georgia, serif',
      };
      const familyCss = fontMap[settings.siteFontFamily || 'readex'] || fontMap.readex;
      root.style.setProperty('--site-font-family', familyCss);

      // Site-Wide Font Size Percent (85% to 125%)
      let sizePercent = settings.siteFontSizePercent || 100;
      if (!settings.siteFontSizePercent && settings.themeFontScale) {
        if (settings.themeFontScale === 'compact') sizePercent = 95;
        else if (settings.themeFontScale === 'comfortable') sizePercent = 106;
      }
      const clampedSize = Math.max(80, Math.min(130, sizePercent));
      root.style.setProperty('--site-font-size', `${clampedSize}%`);
      root.style.setProperty('--site-font-scale-factor', String(Number((clampedSize / 100).toFixed(3))));

      // Site-Wide Font Weight
      const weightId = settings.siteFontWeight || 'regular';
      if (weightId === 'regular') {
        root.removeAttribute('data-font-weight');
      } else {
        root.setAttribute('data-font-weight', weightId);
      }

      // Site-Wide Font Stroke / Thickness (سمك الخط)
      const strokeMap: Record<string, string> = {
        none: '0px',
        crisp: '0.15px',
        medium: '0.32px',
        bold_stroke: '0.50px',
        heavy_stroke: '0.72px',
      };
      root.style.setProperty(
        '--site-text-stroke',
        strokeMap[settings.siteFontStrokeWidth || 'none'] || '0px'
      );

      // Site-Wide Line Height & Letter Spacing
      const lineHeightMap: Record<string, string> = {
        tight: '1.35',
        normal: '1.5',
        relaxed: '1.68',
        spacious: '1.85',
      };
      root.style.setProperty(
        '--site-line-height',
        lineHeightMap[settings.siteLineHeight || 'normal'] || '1.5'
      );

      const letterSpacingMap: Record<string, string> = {
        tight: '-0.015em',
        normal: '0em',
        wide: '0.02em',
      };
      root.style.setProperty(
        '--site-letter-spacing',
        letterSpacingMap[settings.siteLetterSpacing || 'normal'] || '0em'
      );

      // Site-Wide Primary & Secondary Font Colors
      const primaryColor = (settings.sitePrimaryTextColor || '').trim();
      if (primaryColor) {
        root.setAttribute('data-custom-text-color', 'true');
        root.style.setProperty('--apple-label', primaryColor);
      } else {
        root.removeAttribute('data-custom-text-color');
        root.style.removeProperty('--apple-label');
      }

      const secondaryColor = (settings.siteSecondaryTextColor || '').trim();
      if (secondaryColor) {
        root.setAttribute('data-custom-secondary-color', 'true');
        root.style.setProperty('--apple-secondary', secondaryColor);
      } else {
        root.removeAttribute('data-custom-secondary-color');
        root.style.removeProperty('--apple-secondary');
      }

      // Site-Wide Heading Color Mode
      const headingMode = settings.siteHeadingColorMode || 'theme_default';
      root.setAttribute('data-heading-color-mode', headingMode);
      const headingColorPresetMap: Record<string, string> = {
        royal_gold: '#B47B16',
        apple_blue: '#0071E3',
        emerald_luxury: '#059669',
        crimson_velvet: '#B91C1C',
        amethyst_silk: '#6D28D9',
        custom_solid: settings.siteHeadingCustomColor || primaryColor || resolved.colors.textPrimary,
      };
      if (headingMode !== 'theme_default' && headingColorPresetMap[headingMode]) {
        root.style.setProperty('--site-heading-color', headingColorPresetMap[headingMode]);
      } else {
        root.style.removeProperty('--site-heading-color');
      }
    };

    applyThemeAttributes();

    if (settings.themeAutoTimeOfDay) {
      const timer = setInterval(applyThemeAttributes, 60000);
      return () => clearInterval(timer);
    }
  }, [
    settings.activeThemeId,
    settings.themeAmbientGlow,
    settings.themeGlassIntensity,
    settings.themeAutoTimeOfDay,
    settings.themeCardElevation,
    settings.themeFontScale,
    settings.themeCustomAccent,
    settings.themeCustomAccentColor,
    settings.siteFontFamily,
    settings.siteFontSizePercent,
    settings.siteFontWeight,
    settings.siteFontStrokeWidth,
    settings.siteLineHeight,
    settings.siteLetterSpacing,
    settings.sitePrimaryTextColor,
    settings.siteSecondaryTextColor,
    settings.siteHeadingColorMode,
    settings.siteHeadingCustomColor,
    settings.themeSurfaceStyle,
    settings.themeBorderRadius,
    settings.themeContrastLevel,
  ]);

  // Customers & Loyalty CRM Records (Strictly real customers only — zero virtual/mock customers)
  const [customCustomers, setCustomCustomers] = useState<CustomCustomerRecord[]>(() => {
    try {
      const saved = localStorage.getItem('lamsa_custom_customers_v1');
      if (saved) {
        const parsed: CustomCustomerRecord[] = JSON.parse(saved);
        const realOnly = parsed.filter(c => !isVirtualDemoCustomer(c));
        if (realOnly.length !== parsed.length) {
          localStorage.setItem('lamsa_custom_customers_v1', JSON.stringify(realOnly));
        }
        return realOnly;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [preselectedPosCustomer, setPreselectedPosCustomer] = useState<{ name: string; phone: string; autoRedeemLoyalty?: boolean } | null>(null);

  const handleSaveCustomCustomer = (record: CustomCustomerRecord) => {
    if (isVirtualDemoCustomer(record)) return;
    setCustomCustomers(prev => {
      const idx = prev.findIndex(
        c => (record.phone && c.phone === record.phone) || c.name === record.name
      );
      let next: CustomCustomerRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = record;
      } else {
        next = [record, ...prev];
      }
      try {
        localStorage.setItem('lamsa_custom_customers_v1', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    saveCustomCustomerCloud(record).catch(err => console.error('Error saving customer to cloud:', err));
  };

  const handleDeleteCustomCustomer = (record: Partial<CustomCustomerRecord>) => {
    setCustomCustomers(prev => {
      const next = prev.filter(
        c =>
          !(
            (record.phone && c.phone === record.phone) ||
            (record.name && c.name === record.name)
          )
      );
      try {
        localStorage.setItem('lamsa_custom_customers_v1', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    deleteCustomCustomerCloud(record).catch(err => console.error('Error deleting customer from cloud:', err));
  };

  // Saved Perfume Mix Formulas (وصفات الميكسات المحفوظة)
  const [savedMixes, setSavedMixes] = useState<SavedMixFormula[]>(() => {
    return loadDataSync<SavedMixFormula[]>('lamsa_saved_mixes_v1', []);
  });

  // Daily Closures & Day Operations State
  const [dailyClosures, setDailyClosures] = useState<DailyClosure[]>(() => {
    return loadDataSync<DailyClosure[]>('lamsa_closures_v1', []);
  });
  const [isDayOpsModalOpen, setIsDayOpsModalOpen] = useState(false);
  const [isDailyReportAutomationModalOpen, setIsDailyReportAutomationModalOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<
    'loyalty_ai' | 'identity' | 'pricing' | 'budget' | 'vaults' | 'privacy' | 'pos_receipts' | 'inventory' | 'security_backup'
  >('budget');

  // Inventory Intelligence: Purchase Requests, Customer Requests, Stock Checks
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(() => {
    return loadDataSync<PurchaseRequest[]>('lamsa_purchase_requests_v1', []);
  });

  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>(() => {
    return loadDataSync<CustomerRequest[]>('lamsa_customer_requests_v1', []);
  });

  const [stockChecks, setStockChecks] = useState<StockCheckRecord[]>(() => {
    return loadDataSync<StockCheckRecord[]>('lamsa_stock_checks_v1', []);
  });

  // Fragrance Database & Strategic Replenishment Orders State
  const [fragranceDatabase, setFragranceDatabase] = useState<FragranceDatabaseEntry[]>(() => {
    return getLocalFragranceDatabase();
  });

  const [strategicOrders, setStrategicOrders] = useState<StrategicReplenishmentOrder[]>(() => {
    return getLocalStrategicOrders();
  });

  const [isCloudConnected, setIsCloudConnectedValue] = useState<boolean>(
    () => typeof navigator === 'undefined' || navigator.onLine
  );
  const setIsCloudConnected = (connected: boolean) => {
    setIsCloudConnectedValue(connected && (typeof navigator === 'undefined' || navigator.onLine));
  };
  const [savedSessionUser, setSavedSessionUser] = useState<AppUser | null>(null);
  const [isCheckingSavedSession, setIsCheckingSavedSession] = useState(true);
  const [authRestoreError, setAuthRestoreError] = useState<string | null>(null);
  const [cloudSyncError, setCloudSyncError] = useState(false);
  const [isOwnerLiveRadarOpen, setIsOwnerLiveRadarOpen] = useState<boolean>(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateNetworkStatus = () => setIsCloudConnectedValue(navigator.onLine);
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    const handleCloudSyncError = () => setCloudSyncError(true);
    window.addEventListener('lamsa-cloud-sync-error', handleCloudSyncError);
    return () => window.removeEventListener('lamsa-cloud-sync-error', handleCloudSyncError);
  }, []);

  // Track known remote event IDs to trigger real-time sound & system notifications when new records arrive from other devices
  const isInitialSalesLoadedRef = useRef<boolean>(false);
  const knownSaleIdsRef = useRef<Set<string>>(new Set());

  const isInitialExpensesLoadedRef = useRef<boolean>(false);
  const knownExpenseIdsRef = useRef<Set<string>>(new Set());

  const isInitialAttendanceLoadedRef = useRef<boolean>(false);
  const knownAttendanceIdsRef = useRef<Set<string>>(new Set());

  const isInitialClosuresLoadedRef = useRef<boolean>(false);
  const knownClosureIdsRef = useRef<Set<string>>(new Set());

  const isInitialWithdrawalsLoadedRef = useRef<boolean>(false);
  const knownWithdrawalIdsRef = useRef<Set<string>>(new Set());

  // Real-time synchronization across all devices via Firestore onSnapshot
  useEffect(() => {
    if (!currentUser?.authEmail) {
      setIsCloudConnected(false);
      return;
    }
    setIsCloudConnected(false);
    testFirestoreConnection().catch(() => {});

    // Hydrate from IndexedDB on startup if localStorage was reset or cleared
    hydrateFromIndexedDBIfNeeded<Product[]>('lamsa_products', (restored) => {
      if (restored && restored.length > 0) setProducts(restored);
    }, 'products');
    hydrateFromIndexedDBIfNeeded<Sale[]>('lamsa_sales', (restored) => {
      if (restored && restored.length > 0) setSales(restored);
    }, 'sales');
    hydrateFromIndexedDBIfNeeded<Expense[]>('lamsa_expenses_v2', (restored) => {
      if (restored && restored.length > 0) setExpenses(restored);
    }, 'expenses');
    hydrateFromIndexedDBIfNeeded<SavedMixFormula[]>('lamsa_saved_mixes_v1', (restored) => {
      if (restored && restored.length > 0) setSavedMixes(restored);
    }, 'savedMixes');
    hydrateFromIndexedDBIfNeeded<CustomCustomerRecord[]>('lamsa_custom_customers_v1', (restored) => {
      if (restored && restored.length > 0) setCustomCustomers(restored);
    });

    // Listen to real-time sales on all open terminals/devices (never delete historical records)
    const unsubSales = subscribeToSales(
      (cloudSales) => {
        const incomingSales = cloudSales || [];
        const classified = incomingSales.map((s) => {
          const isSystemTest = s.id.startsWith('sale-10') || isTestOrExampleRecord(s);
          return isSystemTest
            ? {
                ...s,
                dataClassification: 'TEST' as const,
                isTestData: true,
                testClassificationNote: s.testClassificationNote || 'TEST / بيانات اختبار',
              }
            : {
                ...s,
                dataClassification: s.dataClassification || ('PRODUCTION' as const),
                isTestData: false,
              };
        });
        setSales(prevLocal => {
          const { merged, unsyncedLocalItems } = mergeCollectionRecords(prevLocal, classified, 'sales');
          if (unsyncedLocalItems.length > 0) {
            unsyncedLocalItems.forEach(s => addSaleCloud(s).catch(console.error));
          }
          persistDataDurable('lamsa_sales', merged);
          return merged;
        });
        setIsCloudConnected(true);
      },
      (liveSale, isRemote) => {
        // Triggered ONLY for sales actually happening in real time right now!
        soundAlertService.playSaleChime();
        const currency = settings.currency || 'ج.م';
        const saleAmount = liveSale.totalPrice ?? (liveSale as any).total ?? 0;
        const cashier = liveSale.employeeName || (liveSale as any).cashierName || 'كاشير المتجر';
        const customer = liveSale.customerName || 'عميل نقدي';
        const itemsCount = liveSale.items?.length || 1;
        const deviceSource = isRemote ? 'جهاز آخر / هاتف كاشير' : 'هذا الجهاز';

        browserNotificationService.sendNotification(`💰 بيع مباشر في الوقت الفعلي: ${saleAmount} ${currency}`, {
          body: `الكاشير: ${cashier} · العميل: ${customer} · عدد الأصناف: ${itemsCount} (${deviceSource})`,
          tag: `live-sale-${liveSale.id}`,
        });

        pushTopNotification(
          'sale',
          `⚡ بيع حي الآن: ${saleAmount} ${currency}`,
          `أنجز الكاشير [${cashier}] فاتورة جديدة للعميل [${customer}] (${deviceSource})`,
          'مزامنة حية الآن',
          'عرض الفاتورة',
          () => setCurrentView(View.REPORTS)
        );
      }
    );

    // Listen to real-time perfume inventory catalogue
    const unsubProducts = subscribeToProducts((cloudProducts) => {
      if (cloudProducts && cloudProducts.length > 0) {
        setProducts(prevLocal => {
          const { merged, unsyncedLocalItems } = mergeCollectionRecords(prevLocal, cloudProducts, 'products');
          if (unsyncedLocalItems.length > 0) {
            unsyncedLocalItems.forEach(p => saveProductCloud(p).catch(console.error));
          }
          persistDataDurable('lamsa_products', merged);
          return merged;
        });
        setIsCloudConnected(true);
      }
    }, INITIAL_PRODUCTS);

    // Listen to real-time expenses
    const canReadExpenses = currentUser.role === 'OWNER'
      || currentUser.permissions.canViewExpenses
      || currentUser.permissions.canEditBudget;
    const unsubExpenses = canReadExpenses ? subscribeToExpenses((cloudExpenses) => {
      const incomingExpenses = cloudExpenses || [];

      // Detect incoming expenses from other devices in real-time
      if (isInitialExpensesLoadedRef.current && incomingExpenses.length > 0) {
        const remoteNewExpenses = incomingExpenses.filter(e => !knownExpenseIdsRef.current.has(e.id));
        if (remoteNewExpenses.length > 0) {
          remoteNewExpenses.forEach(exp => {
            knownExpenseIdsRef.current.add(exp.id);
            soundAlertService.playActionChime();
            const currency = settings.currency || 'ج.م';
            browserNotificationService.sendNotification(`💸 تسجيل مصروف جديد: ${exp.amount} ${currency}`, {
              body: `البند: ${exp.category} · البيان: ${exp.title} · التاريخ: ${exp.date}`,
              tag: `expense-${exp.id}`,
            });
            pushTopNotification(
              'info',
              `💸 مصروف جديد: ${exp.amount} ${currency}`,
              `البند: ${exp.category} — ${exp.title}`,
              'مصروفات'
            );
          });
        }
      } else {
        incomingExpenses.forEach(e => knownExpenseIdsRef.current.add(e.id));
        isInitialExpensesLoadedRef.current = true;
      }

      if (cloudExpenses) {
        const classifiedExpenses = cloudExpenses.map((exp) => {
          const isSeededOrTest = LEGACY_SEEDED_BUDGET_EXPENSE_IDS.has(exp.id) || isTestOrExampleRecord(exp);
          return isSeededOrTest
            ? {
                ...exp,
                dataClassification: 'TEST' as const,
                isTestData: true,
                testClassificationNote: exp.testClassificationNote || 'TEST / بيانات اختبار',
              }
            : {
                ...exp,
                dataClassification: exp.dataClassification || ('PRODUCTION' as const),
                isTestData: false,
              };
        });
        setExpenses(prevLocal => {
          const { merged, unsyncedLocalItems } = mergeCollectionRecords(prevLocal, classifiedExpenses, 'expenses');
          if (unsyncedLocalItems.length > 0) {
            unsyncedLocalItems.forEach(e => saveExpenseCloud(e).catch(console.error));
          }
          persistDataDurable('lamsa_expenses_v2', merged);
          return merged;
        });
        setIsCloudConnected(true);
      }
    }, INITIAL_EXPENSES) : () => {};
    if (!canReadExpenses) setExpenses([]);

    // Listen to real-time settings and branding
    const unsubSettings = subscribeToSettings((cloudSettings) => {
      if (cloudSettings) {
        setSettings(cloudSettings);
        persistDataDurable('lamsa_settings_v2', cloudSettings);
        setIsCloudConnected(true);
      }
    }, DEFAULT_SETTINGS);

    // Listen to real-time bottle sizes and pricing
    const unsubBottleSizes = subscribeToBottleSizes((cloudSizes) => {
      if (cloudSizes && cloudSizes.length > 0) {
        const enriched = cloudSizes.map((b: BottleSize) => {
          const def = DEFAULT_BOTTLE_SIZES.find(d => d.sizeMl === b.sizeMl && Boolean(d.isRollOn) === Boolean(b.isRollOn));
          return {
            ...b,
            coloredNormalPrice: b.coloredNormalPrice ?? def?.coloredNormalPrice,
          };
        });
        setBottleSizes(enriched);
        persistDataDurable('lamsa_bottle_sizes_v2', enriched);
        setIsCloudConnected(true);
      }
    }, DEFAULT_BOTTLE_SIZES);

    // Listen to real-time financial vaults
    const canReadVaults = currentUser.role === 'OWNER' || currentUser.permissions.canViewVaults;
    const unsubVaults = canReadVaults ? subscribeToVaults((cloudVaults) => {
      if (cloudVaults && cloudVaults.length > 0) {
        setVaults(cloudVaults);
        persistDataDurable('lamsa_vaults_v1', cloudVaults);
        setIsCloudConnected(true);
      }
    }, DEFAULT_VAULTS) : () => {};
    if (!canReadVaults) setVaults([]);

    // Listen to real-time audited withdrawal transactions
    const canReadWithdrawals = currentUser.role === 'OWNER'
      || currentUser.permissions.canViewVaults
      || currentUser.permissions.canApproveWithdrawal
      || currentUser.permissions.canRequestWithdrawal;
    const unsubWithdrawals = canReadWithdrawals ? subscribeToWithdrawals((cloudWithdrawals) => {
      const incomingWithdrawals = cloudWithdrawals || [];
      if (isInitialWithdrawalsLoadedRef.current && incomingWithdrawals.length > 0) {
        const remoteNewWithdrawals = incomingWithdrawals.filter(w => !knownWithdrawalIdsRef.current.has(w.id));
        if (remoteNewWithdrawals.length > 0) {
          remoteNewWithdrawals.forEach(w => {
            knownWithdrawalIdsRef.current.add(w.id);
            soundAlertService.playActionChime();
            const currency = settings.currency || 'ج.م';
            browserNotificationService.sendNotification(`⚠️ حركة سحب / عهدة مالية: ${w.amount} ${currency}`, {
              body: `المستلم: ${w.recipientName} · الغرض: ${w.reason}`,
              tag: `withdrawal-${w.id}`,
            });
            pushTopNotification(
              'warning',
              `⚠️ حركة سحب عهدة: ${w.amount} ${currency}`,
              `المستلم: ${w.recipientName} (${w.reason})`,
              'عهد وسحوبات'
            );
          });
        }
      } else {
        incomingWithdrawals.forEach(w => knownWithdrawalIdsRef.current.add(w.id));
        isInitialWithdrawalsLoadedRef.current = true;
      }

      if (cloudWithdrawals) {
      setWithdrawals(cloudWithdrawals);
      persistDataDurable('lamsa_withdrawals_v1', cloudWithdrawals);
      setIsCloudConnected(true);
    }
    }) : () => {};
    if (!canReadWithdrawals) setWithdrawals([]);

    // Listen to real-time staff attendance records (حضور وفتح المتجر لطاقم العمل)
    const unsubAttendance = subscribeToStaffAttendance((cloudAttendance) => {
      const incomingAttendance = cloudAttendance || [];
      if (isInitialAttendanceLoadedRef.current && incomingAttendance.length > 0) {
        const remoteNewAttendance = incomingAttendance.filter(a => !knownAttendanceIdsRef.current.has(a.id));
        if (remoteNewAttendance.length > 0) {
          remoteNewAttendance.forEach(rec => {
            knownAttendanceIdsRef.current.add(rec.id);
            soundAlertService.playActionChime();
            browserNotificationService.sendNotification(`⏱️ تسجيل حضور طاقم العمل: ${rec.employeeName}`, {
              body: `الحالة: ${rec.status} · الوقت: ${rec.checkInTime || 'الآن'}`,
              tag: `attendance-${rec.id}`,
            });
            pushTopNotification(
              'info',
              `⏱️ تسجيل حضور: ${rec.employeeName}`,
              `تم تسجيل حضور الموظف (${rec.status}) في النظام بنجاح من جهاز متصل`,
              'طاقم العمل'
            );
          });
        }
      } else {
        incomingAttendance.forEach(a => knownAttendanceIdsRef.current.add(a.id));
        isInitialAttendanceLoadedRef.current = true;
      }

      if (cloudAttendance) {
        setAttendanceRecords(cloudAttendance);
        persistDataDurable('lamsa_attendance_v1', cloudAttendance);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time production batches
    const unsubBatches = subscribeToProductionBatches((cloudBatches) => {
      if (cloudBatches) {
        setBatches(cloudBatches);
        persistDataDurable('lamsa_batches_v1', cloudBatches);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time audit logs
    const canReadAudit = currentUser.role === 'OWNER' || currentUser.permissions.canViewAuditLog;
    const unsubAudit = canReadAudit ? subscribeToAuditLogs((cloudAudit) => {
      if (cloudAudit) {
        setAuditLogs(cloudAudit);
        persistDataDurable('lamsa_audit_logs_v1', cloudAudit);
        setIsCloudConnected(true);
      }
    }) : () => {};
    if (!canReadAudit) setAuditLogs([]);

    // Listen to real-time app users
    const canManageUsers = currentUser.role === 'OWNER' || currentUser.permissions.canManageUsers;
    const unsubUsers = canManageUsers ? subscribeToAppUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        const completeUsers = ensureCoreUsersList(cloudUsers);
        setUsers(completeUsers);
        persistDataDurable('lamsa_users_v1', completeUsers);
        setIsCloudConnected(true);

        // Self-heal Firestore if Dr. Mohamed or Tarek was missing from cloud collection
        const hasOwnerInCloud = cloudUsers.some(
          (u) => u.role === 'OWNER' || u.username === 'mohamed' || u.id === 'user-mohamed'
        );
        const hasTarekInCloud = cloudUsers.some(
          (u) => u.username === 'tarek' || u.id === 'user-tarek' || u.id === 'user-tarek-sales'
        );
        if (!hasOwnerInCloud) {
          saveAppUserCloud(completeUsers[0]).catch(() => {});
        }
        if (!hasTarekInCloud && completeUsers[1]) {
          saveAppUserCloud(completeUsers[1]).catch(() => {});
        }
      }
    }, DEFAULT_USERS) : () => {};
    if (!canManageUsers) setUsers(ensureCoreUsersList(DEFAULT_USERS));

    // Listen to real-time daily closures
    const unsubClosures = subscribeToDailyClosures((cloudClosures) => {
      const incomingClosures = cloudClosures || [];
      if (isInitialClosuresLoadedRef.current && incomingClosures.length > 0) {
        const remoteNewClosures = incomingClosures.filter(c => !knownClosureIdsRef.current.has(c.id));
        if (remoteNewClosures.length > 0) {
          remoteNewClosures.forEach(c => {
            knownClosureIdsRef.current.add(c.id);
            soundAlertService.playActionChime();
            const currency = settings.currency || 'ج.م';
            const closureTotal = c.totalSalesRevenue ?? (c as any).totalSales ?? (c.cashSalesTotal || 0);
            browserNotificationService.sendNotification(`📋 إغلاق وردية / يومية: ${c.closedBy || c.openedBy}`, {
              body: `إجمالي مبيعات الوردية: ${closureTotal} ${currency} · تاريخ الإغلاق: ${c.date}`,
              tag: `closure-${c.id}`,
            });
            pushTopNotification(
              'goal',
              `📋 تقرير إغلاق وردية جديد`,
              `تم اعتماد الإغلاق بواسطة [${c.closedBy || c.openedBy}] بإجمالي مبيعات ${closureTotal} ${currency}`,
              'إغلاق الوردية'
            );
          });
        }
      } else {
        incomingClosures.forEach(c => knownClosureIdsRef.current.add(c.id));
        isInitialClosuresLoadedRef.current = true;
      }

      if (cloudClosures) {
        setDailyClosures(cloudClosures);
        persistDataDurable('lamsa_closures_v1', cloudClosures);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time purchase requests
    const unsubPurchases = subscribeToPurchaseRequests((cloudPurchases) => {
      if (cloudPurchases) {
        setPurchaseRequests(cloudPurchases);
        persistDataDurable('lamsa_purchase_requests_v1', cloudPurchases);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time customer requests
    const unsubCustomerReqs = subscribeToCustomerRequests((cloudReqs) => {
      if (cloudReqs) {
        setCustomerRequests(cloudReqs);
        persistDataDurable('lamsa_customer_requests_v1', cloudReqs);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time stock checks
    const unsubStockChecks = subscribeToStockChecks((cloudChecks) => {
      if (cloudChecks) {
        setStockChecks(cloudChecks);
        persistDataDurable('lamsa_stock_checks_v1', cloudChecks);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time fragrance database
    const unsubFragranceDb = subscribeToFragranceDatabase((entries) => {
      if (entries && entries.length > 0) {
        setFragranceDatabase(entries);
        saveLocalFragranceDatabase(entries);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time strategic replenishment orders
    const unsubStrategicOrders = subscribeToStrategicOrders((orders) => {
      if (orders) {
        setStrategicOrders(orders);
        saveLocalStrategicOrders(orders);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time custom customers & loyalty profiles
    const unsubCustomers = subscribeToCustomCustomers((cloudCustomers) => {
      if (cloudCustomers) {
        const cleanReal = cloudCustomers.filter(c => !isVirtualDemoCustomer(c));
        setCustomCustomers(cleanReal);
        persistDataDurable('lamsa_custom_customers_v1', cleanReal);
        setIsCloudConnected(true);
      }
    });

    // Listen to real-time saved perfume mix formulas
    const unsubSavedMixes = subscribeToSavedMixes((cloudMixes) => {
      if (cloudMixes) {
        setSavedMixes(prevLocal => {
          const { merged, unsyncedLocalItems } = mergeCollectionRecords(prevLocal, cloudMixes, 'savedMixes');
          if (unsyncedLocalItems.length > 0) {
            unsyncedLocalItems.forEach(m => saveSavedMixCloud(m).catch(console.error));
          }
          persistDataDurable('lamsa_saved_mixes_v1', merged);
          return merged;
        });
        setIsCloudConnected(true);
      }
    });

    const onRealtimeMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'LIVE_SALE' && e.data.sale) {
        const liveSale = e.data.sale as Sale;
        soundAlertService.playSaleChime();
        const currency = settings.currency || 'ج.م';
        const saleAmount = liveSale.totalPrice ?? (liveSale as any).total ?? 0;
        const cashier = liveSale.employeeName || 'كاشير المتجر';
        pushTopNotification(
          'sale',
          `⚡ بيع حي الآن: ${saleAmount} ${currency}`,
          `تم تسجيل البيع بنجاح بواسطة [${cashier}]`,
          'تبويب متصل'
        );
      }
    };

    if (posRealtimeChannel) {
      posRealtimeChannel.addEventListener('message', onRealtimeMessage);
    }

    return () => {
      if (posRealtimeChannel) {
        posRealtimeChannel.removeEventListener('message', onRealtimeMessage);
      }
      unsubSales();
      unsubProducts();
      unsubExpenses();
      unsubSettings();
      unsubBottleSizes();
      unsubVaults();
      unsubWithdrawals();
      unsubAttendance();
      unsubBatches();
      unsubAudit();
      unsubUsers();
      unsubClosures();
      unsubPurchases();
      unsubCustomerReqs();
      unsubStockChecks();
      unsubFragranceDb();
      unsubStrategicOrders();
      unsubCustomers();
      unsubSavedMixes();
    };
  }, [currentUser]);

  // Sync state changes to durable storage (localStorage + IndexedDB)
  useEffect(() => {
    persistDataDurable('lamsa_products', products);
  }, [products]);

  useEffect(() => {
    persistDataDurable('lamsa_sales', sales);
  }, [sales]);

  useEffect(() => {
    persistDataDurable('lamsa_expenses_v2', expenses);
  }, [expenses]);

  useEffect(() => {
    persistDataDurable('lamsa_settings_v2', settings);
  }, [settings]);

  useEffect(() => {
    persistDataDurable('lamsa_bottle_sizes_v2', bottleSizes);
  }, [bottleSizes]);

  useEffect(() => {
    persistDataDurable('lamsa_vaults_v1', vaults);
  }, [vaults]);

  useEffect(() => {
    persistDataDurable('lamsa_withdrawals_v1', withdrawals);
  }, [withdrawals]);

  useEffect(() => {
    persistDataDurable('lamsa_attendance_v1', attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    persistDataDurable('lamsa_batches_v1', batches);
  }, [batches]);

  useEffect(() => {
    persistDataDurable('lamsa_audit_logs_v1', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    persistDataDurable('lamsa_users_v1', users);
  }, [users]);

  useEffect(() => {
    persistDataDurable('lamsa_closures_v1', dailyClosures);
  }, [dailyClosures]);

  useEffect(() => {
    persistDataDurable('lamsa_purchase_requests_v1', purchaseRequests);
  }, [purchaseRequests]);

  useEffect(() => {
    persistDataDurable('lamsa_customer_requests_v1', customerRequests);
  }, [customerRequests]);

  useEffect(() => {
    persistDataDurable('lamsa_stock_checks_v1', stockChecks);
  }, [stockChecks]);

  useEffect(() => {
    persistDataDurable('lamsa_saved_mixes_v1', savedMixes);
  }, [savedMixes]);

  // Sync Fragrance Encyclopedia to LocalStorage
  useEffect(() => {
    try {
      saveLocalFragranceDatabase(fragranceDatabase);
    } catch (e) {
      console.error(e);
    }
  }, [fragranceDatabase]);

  // Sync Strategic Replenishment Orders to LocalStorage
  useEffect(() => {
    try {
      saveLocalStrategicOrders(strategicOrders);
    } catch (e) {
      console.error(e);
    }
  }, [strategicOrders]);

  // Automatic Fragrance Knowledge Base Auto-Enrichment (Batched once in background without blocking UI)
  useEffect(() => {
    if (!products || products.length === 0) return;

    const timer = setTimeout(async () => {
      const existingNames = new Set(
        fragranceDatabase.map((f) => f.name.trim().toLowerCase())
      );
      const existingIds = new Set(
        fragranceDatabase.map((f) => String(f.productId || ''))
      );

      const missingProducts = products.filter(
        (prod) =>
          !existingNames.has(prod.name.trim().toLowerCase()) &&
          !existingIds.has(String(prod.id))
      );

      if (missingProducts.length === 0) return;

      const newlyEnriched: FragranceDatabaseEntry[] = [];
      for (const prod of missingProducts) {
        try {
          const enriched = await enrichFragranceProfile(
            prod.name,
            prod.brand,
            prod.origin,
            prod.type,
            fragranceDatabase,
            false
          );
          if (enriched) {
            newlyEnriched.push({ ...enriched, productId: prod.id });
          }
        } catch {}
      }

      if (newlyEnriched.length > 0) {
        setFragranceDatabase((prev) => {
          const prevMap = new Map<string, FragranceDatabaseEntry>(
            prev.map((p) => [p.name.trim().toLowerCase(), p])
          );
          newlyEnriched.forEach((item) => {
            prevMap.set(item.name.trim().toLowerCase(), item);
          });
          const merged: FragranceDatabaseEntry[] = Array.from(prevMap.values());
          saveLocalFragranceDatabase(merged);
          return merged;
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [products.length]);

  // User save handler
  const handleSaveUser = async (user: AppUser) => {
    const previousEmail = users.find(u => u.id === user.id)?.authEmail;
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = user;
        return next;
      }
      return [...prev, user];
    });
    if (currentUser?.id === user.id) {
      setCurrentUser(user);
    }
    try {
      await saveAppUserCloud(user, previousEmail);
    } catch (e) {
      console.error("Error saving user:", e);
      throw e;
    }
  };

  // Daily closure save handler
  const handleSaveClosure = async (closure: DailyClosure) => {
    setDailyClosures(prev => {
      const idx = prev.findIndex(c => c.id === closure.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = closure;
        return next;
      }
      return [closure, ...prev];
    });
    try {
      await saveDailyClosureCloud(closure);
    } catch (e) {
      console.error("Error saving closure:", e);
    }
  };

  // Purchase request save handler
  const handleSavePurchaseRequest = async (req: PurchaseRequest) => {
    setPurchaseRequests(prev => {
      const idx = prev.findIndex(r => r.id === req.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = req;
        return next;
      }
      return [req, ...prev];
    });
    try {
      await savePurchaseRequestCloud(req);
    } catch (e) {
      console.error("Error saving purchase request:", e);
    }
  };

  // Customer request save handler
  const handleSaveCustomerRequest = async (req: CustomerRequest) => {
    setCustomerRequests(prev => {
      const idx = prev.findIndex(r => r.id === req.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = req;
        return next;
      }
      return [req, ...prev];
    });
    try {
      await saveCustomerRequestCloud(req);
    } catch (e) {
      console.error("Error saving customer request:", e);
    }
  };

  // Stock check save handler
  const handleSaveStockCheck = async (check: StockCheckRecord) => {
    setStockChecks(prev => [check, ...prev]);
    try {
      await saveStockCheckCloud(check);
    } catch (e) {
      console.error("Error saving stock check:", e);
    }
  };

  const handleSaveFragranceProfile = async (profile: FragranceDatabaseEntry) => {
    setFragranceDatabase(prev => [profile, ...prev.filter(p => p.id !== profile.id)]);
    try {
      await saveFragranceProfileCloud(profile);
    } catch (e) {
      console.error("Error saving fragrance profile:", e);
    }
  };

  const handleBulkUpsertFragranceProfiles = async (profiles: FragranceDatabaseEntry[]) => {
    if (!profiles || profiles.length === 0) return;
    const merged = await bulkUpsertFragranceProfilesCloud(profiles);
    setFragranceDatabase(merged);
  };

  // Automatic 12:00 Midnight Daily Closing Report Scheduler & Offline-to-Online Auto-Dispatch
  useEffect(() => {
    if (settings.autoMidnightReportEnabled === false) return;

    const handleOnlineFlush = async () => {
      try {
        const res = await flushOfflineReportQueue(
          settings.googleFormId,
          settings.googleFormWebhookUrl,
          settings
        );
        if (res.sentCount > 0 || res.whatsappDispatched) {
          pushTopNotification(
            'goal',
            `تم إرسال التقرير اليومي المؤجل تلقائياً فور عودة الإنترنت`,
            `أُرسل التقرير إلى ${settings.storeEmail || 'lamsteitr@gmail.com'} وواتساب طارق (${settings.storeWhatsAppPrimary || '01123376728'} / ${settings.storeWhatsAppSecondary || '01062018755'})`,
            'مزامنة تلقائية ✓'
          );
        }
      } catch (err) {
        console.warn('Auto flush offline report queue error:', err);
      }
    };

    window.addEventListener('online', handleOnlineFlush);

    // Check every 45 seconds if midnight (00:00 - 00:59) has arrived and today's closing report hasn't been generated yet
    const checkMidnightReport = async () => {
      const now = new Date();
      const hour = now.getHours();
      const todayKey = now.toISOString().slice(0, 10);
      const lastDispatchedDate = getLastAutoMidnightReportDate();

      if (hour === 0 && lastDispatchedDate !== todayKey) {
        setLastAutoMidnightReportDate(todayKey);
        const report = buildDailyClosingReport({
          targetDate: todayKey,
          triggerType: 'midnight_auto',
          sales,
          expenses,
          products,
          settings,
          currentClosure: dailyClosures.find(c => c.date === todayKey) || null,
          auditLogs,
          customCustomers,
          executedBy: 'الأتمتة التلقائية (12:00 منتصف الليل)',
        });

        upsertAutomatedReport({
          ...report,
          status: navigator.onLine ? 'pending_auth' : 'queued_offline',
        });

        if (navigator.onLine) {
          await executeFreeWhatsAppAutomation(report, settings).catch(() => {});
          const flushRes = await flushOfflineReportQueue(
            settings.googleFormId,
            settings.googleFormWebhookUrl,
            settings
          );
          if (flushRes.sentCount > 0) {
            pushTopNotification(
              'goal',
              `تم إرسال تقرير إغلاق منتصف الليل تلقائياً (${todayKey})`,
              `أُرسل إلى ${settings.storeEmail || 'lamsteitr@gmail.com'} وواتساب طارق (${settings.storeWhatsAppPrimary || '01123376728'} / ${settings.storeWhatsAppSecondary || '01062018755'})`,
              'أتمتة 12:00 ص'
            );
          } else {
            pushTopNotification(
              'info',
              `تم تجهيز تقرير إغلاق منتصف الليل (${todayKey}) لواتساب طارق والبريد`,
              `التقرير جاهز للإرسال إلى واتساب (${settings.storeWhatsAppPrimary || '01123376728'} / ${settings.storeWhatsAppSecondary || '01062018755'}) و ${settings.storeEmail || 'lamsteitr@gmail.com'}`,
              'تقرير 12:00 ص',
              'عرض وإرسال',
              () => setIsDailyReportAutomationModalOpen(true)
            );
          }
        } else {
          pushTopNotification(
            'warning',
            `تم حفظ تقرير منتصف الليل (${todayKey}) للإرسال التلقائي فور توفر الإنترنت`,
            `سيتم إرساله تلقائياً إلى ${settings.storeEmail || 'lamsteitr@gmail.com'} وواتساب طارق (${settings.storeWhatsAppPrimary || '01123376728'}) بمجرد عودة الاتصال`,
            'طابور الأتمتة'
          );
        }
      }
    };

    const intervalId = setInterval(checkMidnightReport, 45000);
    return () => {
      window.removeEventListener('online', handleOnlineFlush);
      clearInterval(intervalId);
    };
  }, [
    settings,
    sales,
    expenses,
    products,
    dailyClosures,
    auditLogs,
    customCustomers,
  ]);

  const handleSaveStrategicOrder = async (order: StrategicReplenishmentOrder) => {
    setStrategicOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
    try {
      await saveStrategicOrderCloud(order);
    } catch (e) {
      console.error("Error saving strategic order:", e);
    }
  };

  const handleLoginSuccess = (user: AppUser) => {
    const cleanUser: AppUser = sanitizeUserAccount(user);
    setCurrentUser(cleanUser);
    setSavedSessionUser(cleanUser);
    setAuthRestoreError(null);
    setCloudSyncError(false);
    setIsScreenLocked(false);
    if (cleanUser.role !== 'OWNER') {
      setExpenses([]);
      setVaults([]);
      setWithdrawals([]);
      setAuditLogs([]);
      setUsers(ensureCoreUsersList(DEFAULT_USERS));
      setCurrentView(View.POS);
    }
    pushTopNotification(
      'auth',
      `مرحباً بك، ${cleanUser.displayName.replace(/\(.*?\)/g, '').trim()}`,
      cleanUser.role === 'OWNER'
        ? 'تم التحقق من حساب Google وتفعيل صلاحيات المالك'
        : 'تم تفعيل واجهة مسؤول المبيعات وصالة العرض',
      cleanUser.role === 'OWNER' ? 'وضع المدير العام' : 'وضع المبيعات'
    );
  };

  useEffect(() => {
    let active = true;
    let restoreAttempt = 0;

    const restoreSavedSession = async (firebaseUser: Parameters<typeof loadAuthorizedAppUser>[0]) => {
      const attempt = ++restoreAttempt;
      setIsCheckingSavedSession(true);
      try {
        const appUser = await loadAuthorizedAppUser(firebaseUser);
        if (!active || attempt !== restoreAttempt) return;
        setSavedSessionUser(sanitizeUserAccount(appUser));
        setAuthRestoreError(null);
      } catch (error) {
        if (!active || attempt !== restoreAttempt) return;
        if (isTransientFirebaseError(error)) {
          setAuthRestoreError('تعذر تحميل صلاحيات الحساب المحفوظة. اتصل بالإنترنت وسجّل الدخول مرة واحدة على هذا الجهاز أولاً.');
        } else {
          setSavedSessionUser(null);
          setAuthRestoreError(getGoogleSignInErrorMessage(error));
          signOutFirebaseUser().catch(() => {});
        }
      } finally {
        if (active && attempt === restoreAttempt) setIsCheckingSavedSession(false);
      }
    };

    const unsubscribe = onFirebaseAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        restoreAttempt += 1;
        setSavedSessionUser(null);
        setAuthRestoreError(null);
        setIsCheckingSavedSession(false);
        return;
      }
      void restoreSavedSession(firebaseUser);
    });

    const retryWhenOnline = () => {
      const firebaseUser = getCurrentFirebaseUser();
      if (firebaseUser) void restoreSavedSession(firebaseUser);
    };
    window.addEventListener('online', retryWhenOnline);
    getGoogleRedirectResult().catch((error) => {
      if (active) setAuthRestoreError(getGoogleSignInErrorMessage(error));
    });

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('online', retryWhenOnline);
    };
  }, []);

  useEffect(() => {
    if (currentUser) setSavedSessionUser(currentUser);
  }, [currentUser]);

  const handleLockScreen = () => {
    if (currentUser) setSavedSessionUser(currentUser);
    setIsScreenLocked(true);
    setCurrentUser(null);
    setExpenses([]);
    setVaults([]);
    setWithdrawals([]);
    setAuditLogs([]);
    try {
      sessionStorage.removeItem('lamsa_unlocked_session_v1');
    } catch {}
  };

  const handleLogout = () => {
    handleLockScreen();
    setSavedSessionUser(null);
    signOutFirebaseUser().catch(err => console.error('Firebase sign-out error:', err));
  };

  // Production batch save handler (سجل التشغيل والتعتيق)
  const handleSaveBatch = async (batch: ProductionBatch) => {
    setBatches(prev => [batch, ...prev.filter(b => b.id !== batch.id)]);
    try {
      await saveProductionBatchCloud(batch);
    } catch (e) {
      console.error("Error saving batch to cloud:", e);
    }
  };

  // Audit log handler (سجل تدقيق التعديلات والعمليات والخصومات)
  const handleAddAuditLog = async (log: AuditLogRecord) => {
    setAuditLogs(prev => [log, ...prev]);
    try {
      await addAuditLogCloud(log);
    } catch (e) {
      console.error("Error saving audit log to cloud:", e);
    }
  };

  // Handle staff attendance and shift opening (تأكيد الحضور وفتح المتجر واستحقاق الراتب الأساسي)
  const handleCheckInAttendance = async (record: StaffAttendanceRecord) => {
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => r.id !== record.id && !(r.date === record.date && r.employeeName === record.employeeName));
      return [record, ...filtered];
    });
    try {
      await saveStaffAttendanceCloud(record);
    } catch (e) {
      console.error("Error saving attendance to cloud:", e);
    }
  };

  // Real-time sale completion synchronized to cloud (multi-item and single-item support)
  const handleSaleComplete = async (rawSale: Sale) => {
    const sale: Sale = {
      ...rawSale,
      dataClassification: rawSale.dataClassification || 'PRODUCTION',
      isTestData: Boolean(rawSale.isTestData),
    };
    let updatedProductsList: Product[] | undefined;
    if (sale.items.length > 0) {
      const deductionMap = new Map<string, number>();
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        if (item.isMix && item.mixComponents && item.mixComponents.length > 0) {
          item.mixComponents.forEach(comp => {
            const pidStr = String(comp.productId);
            const compGrams = (Number(comp.grams) || 0) * qty;
            deductionMap.set(pidStr, (deductionMap.get(pidStr) || 0) + compGrams);
          });
        } else {
          const pidStr = String(item.productId);
          const itemGrams = Number(item.essenceGrams) || 0;
          deductionMap.set(pidStr, (deductionMap.get(pidStr) || 0) + itemGrams);
        }
      });
      const updatedList: Product[] = [];
      const newProducts = products.map(p => {
        const pidStr = String(p.id);
        if (deductionMap.has(pidStr)) {
          const deduction = deductionMap.get(pidStr)!;
          const updated = { ...p, stock_grams: Math.max(0, p.stock_grams - deduction) };
          updatedList.push(updated);
          return updated;
        }
        return p;
      });
      updatedProductsList = updatedList;
      setProducts(newProducts);
      persistDataDurable('lamsa_products', newProducts);
    }

    // Immediate optimistic local update
    setSales(prev => {
      const next = [sale, ...prev];
      persistDataDurable('lamsa_sales', next);
      return next;
    });

    // Update Lamsat Etr Mix Library stats (timesSold & repurchaseRatePercent) when a mix formula is sold
    const mixItemsInSale = sale.items.filter(it => it.isMix && it.mixComponents && it.mixComponents.length > 0);
    if (mixItemsInSale.length > 0 && savedMixes.length > 0) {
      const isReturningCustomer = Boolean(
        sale.customerPhone &&
        sales.some(s => !s.isReversed && s.customerPhone && s.customerPhone.trim() === sale.customerPhone?.trim())
      );
      setSavedMixes(prevMixes => {
        let changed = false;
        const nextMixes = prevMixes.map(sm => {
          const smKey = sm.components.map(c => c.productName.trim()).sort().join('|');
          const matchedSaleMix = mixItemsInSale.find(it => {
            if (it.customFormulaName && it.customFormulaName.trim() === sm.name.trim()) return true;
            const itKey = (it.mixComponents || []).map(c => c.productName.trim()).sort().join('|');
            return itKey === smKey;
          });
          if (!matchedSaleMix) return sm;
          changed = true;
          const prevSold = Number(sm.timesSold || 0);
          const nextSold = prevSold + (matchedSaleMix.quantity || 1);
          const prevRepurchase = Number(sm.repurchaseRatePercent || 0);
          const nextRepurchase = isReturningCustomer
            ? Math.min(100, Math.round((prevRepurchase * prevSold + 100) / Math.max(1, nextSold)))
            : Math.round((prevRepurchase * prevSold) / Math.max(1, nextSold));
          const updatedFormula: SavedMixFormula = {
            ...sm,
            timesSold: nextSold,
            repurchaseRatePercent: nextRepurchase,
            updatedAt: new Date().toISOString(),
          };
          saveSavedMixCloud(updatedFormula).catch(() => {});
          return updatedFormula;
        });
        if (changed) {
          persistDataDurable('lamsa_saved_mixes_v1', nextMixes);
        }
        return nextMixes;
      });
    }

    // Automatically update Customer Record & Loyalty Points Balance when sale has customer info or redeemed points
    const cleanCustPhone = (sale.customerPhone || '').trim();
    const cleanCustName = (sale.customerName || '').trim();
    if (cleanCustPhone || cleanCustName) {
      const loyaltyEnabled = settings.loyaltyEnabled !== false;
      const earnStepEgp = Math.max(1, settings.loyaltyEarnStepEgp || 10);
      const cashPerPointEgp = Math.max(0.05, settings.loyaltyCashPerPointEgp || 0.10);
      const redeemedPts = loyaltyEnabled ? (sale.loyaltyPointsRedeemed || 0) : 0;
      const earnedPts = loyaltyEnabled
        ? (sale.loyaltyPointsEarned ?? Math.floor((sale.totalPrice || 0) / earnStepEgp))
        : 0;
      const actorName = sale.employeeName || currentUser?.displayName || 'طارق';

      setCustomCustomers(prev => {
        const idx = prev.findIndex(
          c =>
            (cleanCustPhone && c.phone && c.phone.trim() === cleanCustPhone) ||
            (!cleanCustPhone && cleanCustName && c.name.trim() === cleanCustName)
        );

        const newLogs = [];
        if (redeemedPts > 0) {
          newLogs.push({
            id: `log-redeem-${sale.id}`,
            date: sale.date,
            pointsDelta: -redeemedPts,
            reason: `تحويل ${redeemedPts} نقطة ولاء إلى خصم نقدي فوري (-${sale.loyaltyDiscountAmount || Math.round(redeemedPts * cashPerPointEgp)} ${settings.currency}) في فاتورة #${sale.id.slice(-5)}`,
            byUser: actorName,
          });
        }
        if (earnedPts > 0) {
          newLogs.push({
            id: `log-earn-${sale.id}`,
            date: sale.date,
            pointsDelta: earnedPts,
            reason: `نقاط ولاء مكتسبة تلقائياً من فاتورة شراء #${sale.id.slice(-5)} (${sale.totalPrice} ${settings.currency})`,
            byUser: actorName,
          });
        }

        let next: CustomCustomerRecord[];
        let targetToSaveCloud: CustomCustomerRecord;
        if (idx >= 0) {
          const existing = prev[idx];
          const updatedRecord: CustomCustomerRecord = {
            ...existing,
            name: cleanCustName || existing.name,
            phone: cleanCustPhone || existing.phone,
            redeemedPoints: (existing.redeemedPoints || 0) + redeemedPts,
            loyaltyLogs: [...newLogs, ...(existing.loyaltyLogs || [])],
            updatedAt: sale.date,
          };
          targetToSaveCloud = updatedRecord;
          next = [...prev];
          next[idx] = updatedRecord;
        } else {
          const newRecord: CustomCustomerRecord = {
            phone: cleanCustPhone,
            name: cleanCustName || 'عميل مميز',
            favoriteStyle: 'متنوع',
            bonusPoints: 0,
            redeemedPoints: redeemedPts,
            loyaltyLogs: newLogs,
            createdAt: sale.date,
            updatedAt: sale.date,
          };
          targetToSaveCloud = newRecord;
          next = [newRecord, ...prev];
        }

        saveCustomCustomerCloud(targetToSaveCloud).catch(err => console.error('Error syncing sale customer to cloud:', err));
        persistDataDurable('lamsa_custom_customers_v1', next);
        return next;
      });
    }

    const itemsSummary = sale.items.map(i => i.productName).join('، ');
    const loyaltySubtitle = sale.loyaltyPointsRedeemed
      ? ` · خصم ولاء -${sale.loyaltyDiscountAmount} ${settings.currency} (الرصيد الجديد: ★ ${sale.customerLoyaltyBalanceAfter ?? 0} نقطة)`
      : sale.loyaltyPointsEarned
      ? ` · +${sale.loyaltyPointsEarned} نقطة ولاء للعميل`
      : '';

    pushTopNotification(
      'sale',
      `تم إصدار الفاتورة #${sale.id.slice(-6)} بنجاح`,
      `${itemsSummary} · الإجمالي: ${sale.totalPrice.toLocaleString('ar-EG')} ${settings.currency} (${sale.paymentMethod || 'نقدي'})${loyaltySubtitle}`,
      `+${sale.totalPrice} ${settings.currency}`,
      'سجل الفواتير',
      () => setCurrentView(View.REPORTS)
    );

    // Update Restock Vault balance in real-time (capital recovery for raw materials)
    if (sale.totalCost > 0) {
      setVaults(prevVaults => {
        const next = prevVaults.map(v => {
          if (v.id === 'restock') {
            const updated: FinancialVault = {
              ...v,
              totalInflow: (v.totalInflow || 0) + sale.totalCost,
              currentBalance: (v.currentBalance || 0) + sale.totalCost,
            };
            saveVaultCloud(updated).catch(console.error);
            return updated;
          }
          return v;
        });
        persistDataDurable('lamsa_vaults_v1', next);
        return next;
      });
    }

    // Push to Firestore - immediately reflects on all other devices in real-time
    try {
      await addSaleCloud(sale, updatedProductsList);
    } catch (err) {
      console.error("Error saving sale to Firestore:", err);
    }
  };

  // Add audited withdrawal transaction from any financial vault
  const handleAddWithdrawal = async (tx: WithdrawalTransaction, updatedVault: FinancialVault) => {
    setWithdrawals(prev => {
      const next = [tx, ...prev];
      persistDataDurable('lamsa_withdrawals_v1', next);
      return next;
    });
    setVaults(prev => {
      const next = prev.map(v => v.id === updatedVault.id ? updatedVault : v);
      persistDataDurable('lamsa_vaults_v1', next);
      return next;
    });

    try {
      await addWithdrawalCloud(tx);
      await saveVaultCloud(updatedVault);
    } catch (err) {
      console.error("Error saving withdrawal to Firestore:", err);
    }
  };

  const handleUpdateSale = async (
    updatedSale: Sale,
    previousSale: Sale,
    restoreOrAdjustStock: boolean = true
  ) => {
    let updatedProductsList: Product[] = [];

    if (restoreOrAdjustStock) {
      const getGramsMap = (items: SaleItem[]) => {
        const map = new Map<string, number>();
        (items || []).forEach(it => {
          const qty = it.quantity || 1;
          if (it.isMix && it.mixComponents && it.mixComponents.length > 0) {
            it.mixComponents.forEach(comp => {
              const pidStr = String(comp.productId);
              map.set(pidStr, (map.get(pidStr) || 0) + (Number(comp.grams) || 0) * qty);
            });
          } else {
            const pidStr = String(it.productId);
            map.set(pidStr, (map.get(pidStr) || 0) + (Number(it.essenceGrams) || 0));
          }
        });
        return map;
      };

      const oldGramsMap = getGramsMap(previousSale.items || []);
      const newGramsMap = getGramsMap(updatedSale.items || []);
      const allPids = new Set<string>([...oldGramsMap.keys(), ...newGramsMap.keys()]);
      if (allPids.size > 0) {
        const nextProducts = products.map(p => {
          const pidStr = String(p.id);
          if (allPids.has(pidStr)) {
            const oldG = oldGramsMap.get(pidStr) || 0;
            const newG = newGramsMap.get(pidStr) || 0;
            const delta = newG - oldG; // positive means deduct more, negative means restore stock
            if (delta !== 0) {
              const updatedProd = {
                ...p,
                stock_grams: Math.max(0, p.stock_grams - delta)
              };
              updatedProductsList.push(updatedProd);
              return updatedProd;
            }
          }
          return p;
        });
        setProducts(nextProducts);
        persistDataDurable('lamsa_products', nextProducts);
      }
    }

    setSales(prev => {
      const next = prev.map(s => (s.id === updatedSale.id ? updatedSale : s));
      persistDataDurable('lamsa_sales', next);
      return next;
    });

    pushTopNotification(
      'invoice',
      `تم تحديث الفاتورة #${updatedSale.id.slice(-6)} فورياً`,
      `الإجمالي المعتمد: ${updatedSale.totalPrice.toLocaleString('ar-EG')} ${settings.currency} · ${updatedSale.paymentMethod || 'نقدي'}`,
      'تحديث ذكي'
    );

    try {
      await addSaleCloud(updatedSale, updatedProductsList.length > 0 ? updatedProductsList : undefined);
    } catch (err) {
      console.error('Error updating sale in Firestore:', err);
    }
  };

  const handleDeleteSale = async (
    saleId: string,
    restoreStock: boolean = true,
    reversalReason?: string,
    mode: 'permanent' | 'reverse' = 'permanent'
  ) => {
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;
    if (mode === 'reverse' && targetSale.isReversed) return;

    const shouldRestoreStock = restoreStock && !targetSale.isReversed;
    let restoredProductsList: Product[] = [];

    if (shouldRestoreStock && targetSale.items && targetSale.items.length > 0) {
      const restoreMap = new Map<string, number>();
      const restoreByNameMap = new Map<string, number>();

      targetSale.items.forEach(it => {
        const qty = it.quantity || 1;
        if (it.isMix && it.mixComponents && it.mixComponents.length > 0) {
          it.mixComponents.forEach(comp => {
            const pidStr = String(comp.productId);
            const g = (Number(comp.grams) || 0) * qty;
            restoreMap.set(pidStr, (restoreMap.get(pidStr) || 0) + g);
            if (comp.productName) {
              const nameKey = comp.productName.trim().toLowerCase();
              restoreByNameMap.set(nameKey, (restoreByNameMap.get(nameKey) || 0) + g);
            }
          });
        } else {
          const pidStr = String(it.productId);
          const g = Number(it.essenceGrams) || 0;
          restoreMap.set(pidStr, (restoreMap.get(pidStr) || 0) + g);
          if (it.productName) {
            const cleanName = it.productName.replace(/\s*\(عبوة ملونة\)\s*$/, '').trim().toLowerCase();
            restoreByNameMap.set(cleanName, (restoreByNameMap.get(cleanName) || 0) + g);
          }
        }
      });

      const nextProducts = products.map(p => {
        const pidStr = String(p.id);
        const pNameKey = p.name.trim().toLowerCase();
        const addBack = restoreMap.has(pidStr)
          ? restoreMap.get(pidStr)!
          : restoreByNameMap.get(pNameKey) || 0;

        if (addBack > 0) {
          const updatedProd = { ...p, stock_grams: p.stock_grams + addBack };
          restoredProductsList.push(updatedProd);
          return updatedProd;
        }
        return p;
      });
      setProducts(nextProducts);
      persistDataDurable('lamsa_products', nextProducts);
      restoredProductsList.forEach(prod => {
        saveProductCloud(prod).catch(console.error);
      });
    }

    // Reverse financial vaults impact if sale was not already reversed
    if (!targetSale.isReversed) {
      const commAmount =
        targetSale.commissionAmount ??
        targetSale.totalCommission ??
        Math.round((targetSale.totalPrice || 0) * (settings.commissionRate || 0.05));
      const updatedVaults = vaults.map(v => {
        if (v.id === 'restock') {
          return { ...v, currentBalance: Math.max(0, v.currentBalance - (targetSale.totalCost || 0)) };
        }
        if (v.id === 'commissions') {
          return { ...v, currentBalance: Math.max(0, v.currentBalance - commAmount) };
        }
        if (v.id === 'owner_profit') {
          return { ...v, currentBalance: Math.max(0, v.currentBalance - Math.max(0, targetSale.totalProfit || 0)) };
        }
        return v;
      });
      setVaults(updatedVaults);
      persistDataDurable('lamsa_vaults_v1', updatedVaults);
      saveAllVaultsCloud(updatedVaults).catch(console.error);
    }

    const reasonText =
      reversalReason?.trim() ||
      (mode === 'permanent'
        ? 'حذف نهائي للفاتورة من السجل وإلغاء أثرها المالي والمخزني'
        : 'إلغاء فاتورة بقيد عكسي مع الاحتفاظ بالسجل الأصلي للتدقيق (§41)');
    const reversedByUser = currentUser?.displayName || 'د. محمد (المالك)';
    const reversedAtIso = new Date().toISOString();

    if (mode === 'permanent') {
      // Record tombstone so cloud/IDB merge never resurrects this deleted invoice
      addDeletedTombstone('sales', saleId);

      setSales(prev => {
        const next = prev.filter(s => s.id !== saleId);
        persistDataDurable('lamsa_sales', next);
        return next;
      });

      handleAddAuditLog({
        id: `audit-del-${Date.now()}`,
        timestamp: reversedAtIso,
        user: reversedByUser,
        action: 'إلغاء بيع',
        entityType: 'sale',
        entityId: saleId,
        entityName: `فاتورة #${saleId.slice(-6)}`,
        oldValue: { totalPrice: targetSale.totalPrice, itemsCount: targetSale.items?.length || 0 },
        newValue: { deleted: true, restoreStock: shouldRestoreStock },
        reason: reasonText,
        approvedBy: reversedByUser,
        category: 'مبيعات',
      });

      pushTopNotification(
        'stock',
        `تم حذف الفاتورة #${saleId.slice(-6)} نهائياً ✓`,
        shouldRestoreStock
          ? 'تم حذف الفاتورة من السجل واسترجاع جرامات الزيوت العطرية إلى المخزون'
          : 'تم حذف الفاتورة نهائياً من السجل وتحديث الأرصدة المالية',
        shouldRestoreStock ? 'حذف + استرجاع مخزون' : 'حذف نهائي'
      );

      try {
        await deleteSaleAndRestoreInventoryCloud(
          saleId,
          restoredProductsList.length > 0 ? restoredProductsList : undefined
        );
      } catch (err) {
        console.error('Error permanently deleting sale from Firestore:', err);
      }
      return;
    }

    const reversedSale: Sale = {
      ...targetSale,
      isReversed: true,
      reversalReason: reasonText,
      reversedBy: reversedByUser,
      reversedAt: reversedAtIso,
    };

    setSales(prev => {
      const next = prev.map(s => (s.id === saleId ? reversedSale : s));
      persistDataDurable('lamsa_sales', next);
      return next;
    });

    handleAddAuditLog({
      id: `audit-rev-${Date.now()}`,
      timestamp: reversedAtIso,
      user: reversedByUser,
      action: 'قيد عكسي',
      entityType: 'sale',
      entityId: saleId,
      entityName: `فاتورة #${saleId.slice(-6)}`,
      oldValue: { totalPrice: targetSale.totalPrice, isReversed: false },
      newValue: { totalPrice: targetSale.totalPrice, isReversed: true, restoreStock },
      reason: reasonText,
      approvedBy: reversedByUser,
      category: 'مبيعات',
    });

    pushTopNotification(
      'stock',
      `تم إلغاء الفاتورة #${saleId.slice(-6)} بقيد عكسي`,
      restoreStock
        ? 'تمت استعادة جرامات الزيوت العطرية إلى المخزون والاحتفاظ بالسجل الأصلي للتدقيق'
        : 'تم تسجيل قيد عكسي للفاتورة مع الاحتفاظ بالسجل الأصلي للتدقيق (§41)',
      restoreStock ? 'قيد عكسي + استرجاع' : 'قيد عكسي'
    );

    try {
      await addSaleCloud(reversedSale, restoredProductsList.length > 0 ? restoredProductsList : undefined);
    } catch (err) {
      console.error("Error saving reversed sale to Firestore:", err);
    }
  };

  // Saved Mix handlers
  const handleSaveSavedMix = async (formula: SavedMixFormula) => {
    setSavedMixes(prev => {
      const next = [formula, ...prev.filter(m => m.id !== formula.id)];
      persistDataDurable('lamsa_saved_mixes_v1', next);
      return next;
    });
    try {
      await saveSavedMixCloud(formula);
    } catch (e) {
      console.error('Error saving mix to cloud:', e);
    }
  };

  const handleDeleteSavedMix = async (mixId: string) => {
    addDeletedTombstone('savedMixes', mixId);
    setSavedMixes(prev => {
      const next = prev.filter(m => m.id !== mixId);
      persistDataDurable('lamsa_saved_mixes_v1', next);
      return next;
    });
    try {
      await deleteSavedMixCloud(mixId);
    } catch (e) {
      console.error('Error deleting mix from cloud:', e);
    }
  };

  // Cloud-synced state updates
  const handleSetProducts: React.Dispatch<React.SetStateAction<Product[]>> = (action) => {
    setProducts(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      persistDataDurable('lamsa_products', next);
      prev.forEach(oldP => {
        if (!next.some(nP => String(nP.id) === String(oldP.id))) {
          addDeletedTombstone('products', oldP.id);
          deleteProductCloud(oldP.id).catch(console.error);
        }
      });
      seedProductsCloud(next).catch(err => console.error(err));
      return next;
    });
  };

  const handleSetExpenses: React.Dispatch<React.SetStateAction<Expense[]>> = (action) => {
    setExpenses(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      persistDataDurable('lamsa_expenses_v2', next);
      next.forEach(e => saveExpenseCloud(e).catch(err => console.error(err)));
      prev.forEach(oldExp => {
        if (!next.some(n => n.id === oldExp.id)) {
          addDeletedTombstone('expenses', oldExp.id);
          deleteExpenseCloud(oldExp.id).catch(err => console.error(err));
        }
      });
      return next;
    });
  };

  const handleSetSettings: React.Dispatch<React.SetStateAction<StoreSettings>> = (action) => {
    setSettings(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      persistDataDurable('lamsa_settings_v2', next);
      saveSettingsCloud(next).catch(err => console.error(err));
      return next;
    });
  };

  const handleSetBottleSizes: React.Dispatch<React.SetStateAction<BottleSize[]>> = (action) => {
    setBottleSizes(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      persistDataDurable('lamsa_bottle_sizes_v2', next);
      saveBottleSizesCloud(next).catch(err => console.error(err));
      return next;
    });
  };

  // Today's total gross profit for POS real-time badge (Live Production Sales only)
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentClosure = dailyClosures.find(c => c.date === todayStr) || null;
  const todaysGrossProfit = sales
    .filter(s => s.date.startsWith(todayStr) && isLiveProductionSale(s))
    .reduce((sum, s) => sum + s.totalProfit, 0);

  const dailyCoveredExpense = settings.dailyExpenseCoverageGoal || 600;

  const renderView = () => {
    // Strictly isolate confidential areas from unauthorized employees
    if (!canAccessView(currentUser, currentView)) {
      return (
        <div className="p-6 sm:p-12 max-w-xl mx-auto my-12 text-center animate-in fade-in duration-200">
          <div className="apple-glass-card rounded-3xl p-8 border border-black/[0.08] shadow-apple-lg space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-black text-[#1D1D1F]">منطقة إدارية مقيدة</h2>
            <p className="text-xs text-[#86868B] leading-relaxed">
              عذراً، هذا القسم يندرج تحت سرية الإدارة والحسابات التنفيذية. حسابك الحالي لا يمتلك الصلاحية المطلوبة للوصول إلى هذه البيانات وفقاً لسياسات الأمان المعمول بها.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setCurrentView(View.POS)}
                className="apple-btn px-6 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-sm"
              >
                العودة إلى شاشة المبيعات (الكاشير)
              </button>
            </div>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case View.DASHBOARD:
        return (
          <Dashboard 
            sales={sales} 
            products={products} 
            expenses={expenses}
            settings={settings}
            vaults={vaults}
            withdrawals={withdrawals}
            currentClosure={currentClosure}
            currentUser={currentUser}
            customCustomers={customCustomers}
            onNavigate={setCurrentView} 
            onOpenDayOperations={() => setIsDayOpsModalOpen(true)}
            onOpenLoyaltySettings={() => {
              setCurrentView(View.OPERATIONS_SYSTEM);
            }}
            onUpdateSettings={handleSetSettings}
          />
        );
      case View.INVENTORY:
        return (
          <Inventory
            products={products}
            setProducts={handleSetProducts}
            sales={sales}
            settings={settings}
            currentUser={currentUser}
            fragranceDatabase={fragranceDatabase}
            onBulkUpsertFragranceProfiles={handleBulkUpsertFragranceProfiles}
            onAddAuditLog={handleAddAuditLog}
            onSendSmartNotification={(title, subtitle, badge, type) =>
              pushTopNotification(
                type || 'stock',
                title,
                subtitle,
                badge,
                'عرض المخزون',
                () => setCurrentView(View.INVENTORY)
              )
            }
          />
        );
      case View.POS:
        return (
          <POS 
            products={products} 
            onCompleteSale={handleSaleComplete}
            settings={settings}
            bottleSizes={bottleSizes}
            dailyCoveredExpense={dailyCoveredExpense}
            todaysGrossProfit={todaysGrossProfit}
            onUpdateSettings={handleSetSettings}
            salesHistory={sales}
            attendanceRecords={attendanceRecords}
            onCheckInAttendance={handleCheckInAttendance}
            onAddAuditLog={handleAddAuditLog}
            currentUser={currentUser}
            currentClosure={dailyClosures.find(c => c.date === new Date().toISOString().slice(0, 10)) || null}
            onOpenDayOperations={() => setIsDayOpsModalOpen(true)}
            fragranceDatabase={fragranceDatabase}
            strategicOrders={strategicOrders}
            onSaveStrategicOrder={handleSaveStrategicOrder}
            onSaveClosure={handleSaveClosure}
            onSavePurchaseRequest={handleSavePurchaseRequest}
            onNavigateToInvoices={() => setCurrentView(View.REPORTS)}
            onNavigateToCustomers={() => setCurrentView(View.CUSTOMERS_LOYALTY)}
            customCustomers={customCustomers}
            preselectedCustomer={preselectedPosCustomer}
            onClearPreselectedCustomer={() => setPreselectedPosCustomer(null)}
            savedMixes={savedMixes}
            onSaveMix={handleSaveSavedMix}
            onDeleteMix={handleDeleteSavedMix}
            onDeleteSale={handleDeleteSale}
            onAddExpense={(newExp) => {
              handleSetExpenses(prev => [newExp, ...prev]);
              pushTopNotification(
                'info',
                `تم تسجيل مصروف سريع: ${newExp.title}`,
                `المبلغ: ${newExp.amount.toLocaleString('ar-EG')} ${settings.currency} · التصنيف: ${newExp.category}`,
                'مصروف فوري'
              );
            }}
            onOpenFormulationEngine={(product) => {
              setFormulationProduct(product || null);
              setCurrentView(View.FORMULATION_ENGINE);
            }}
          />
        );
      case View.CUSTOMERS_LOYALTY:
        return (
          <CustomersCRM
            sales={sales}
            products={products}
            settings={settings}
            currentUser={currentUser}
            customCustomers={customCustomers}
            bottleSizes={bottleSizes}
            customerRequests={customerRequests}
            fragranceDatabase={fragranceDatabase}
            todaysGrossProfit={todaysGrossProfit}
            onSaveCustomCustomer={handleSaveCustomCustomer}
            onDeleteCustomCustomer={handleDeleteCustomCustomer}
            onUpdateSale={handleUpdateSale}
            onSaveCustomerRequest={handleSaveCustomerRequest}
            onSelectCustomerForPOS={(cust) => {
              setPreselectedPosCustomer(cust);
              setCurrentView(View.POS);
              pushTopNotification(
                'info',
                `تم اختيار العميل: ${cust.name}`,
                'تم تجهيز بيانات العميل في شاشة الكاشير للبيع المباشر',
                'بيع مباشر'
              );
            }}
            onSendSmartNotification={(title, subtitle, badgeText) =>
              pushTopNotification('info', title, subtitle, badgeText)
            }
            onOpenLoyaltySettings={() => setCurrentView(View.OPERATIONS_SYSTEM)}
            onOpenFormulationEngine={(product) => {
              setFormulationProduct(product || null);
              setCurrentView(View.FORMULATION_ENGINE);
            }}
          />
        );
      case View.INVENTORY_INTELLIGENCE:
        return (
          <InventoryIntelligence
            products={products}
            setProducts={handleSetProducts}
            sales={sales}
            purchaseRequests={purchaseRequests}
            onSavePurchaseRequest={handleSavePurchaseRequest}
            customerRequests={customerRequests}
            onSaveCustomerRequest={handleSaveCustomerRequest}
            stockChecks={stockChecks}
            onSaveStockCheck={handleSaveStockCheck}
            currentUser={currentUser}
            settings={settings}
            onAddAuditLog={handleAddAuditLog}
            strategicOrders={strategicOrders}
            onSaveStrategicOrder={handleSaveStrategicOrder}
          />
        );
      case View.USERS_MANAGEMENT:
        return (
          <UsersManagement
            users={users}
            currentUser={currentUser}
            onSaveUser={handleSaveUser}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case View.AUDIT_LOGS:
        return (
          <AuditLogViewer logs={auditLogs} />
        );
      case View.FORMULATION_ENGINE:
        return (
          <ProductFormulationEngine
            products={products}
            setProducts={handleSetProducts}
            bottleSizes={bottleSizes}
            setBottleSizes={handleSetBottleSizes}
            settings={settings}
            sales={sales}
            expenses={expenses}
            batches={batches}
            onSaveBatch={handleSaveBatch}
            auditLogs={auditLogs}
            onAddAuditLog={handleAddAuditLog}
            initialProduct={formulationProduct}
            onNavigateToPOS={(prod, sizeMl, grams) => {
              setCurrentView(View.POS);
            }}
          />
        );
      case View.FINANCIAL_VAULTS:
        return (
          <FinancialVaults
            vaults={vaults}
            withdrawals={withdrawals}
            sales={sales}
            expenses={expenses}
            settings={settings}
            onAddWithdrawal={handleAddWithdrawal}
            onUpdateVaults={(updatedList) => {
              setVaults(updatedList);
              saveAllVaultsCloud(updatedList).catch(console.error);
            }}
          />
        );
      case View.EXPENSES:
        return (
          <Expenses
            expenses={expenses}
            setExpenses={handleSetExpenses}
            settings={settings}
            sales={sales}
          />
        );
      case View.REPORTS:
        return (
          <Reports 
            sales={sales} 
            products={products} 
            bottleSizes={bottleSizes}
            onDeleteSale={handleDeleteSale} 
            onUpdateSale={handleUpdateSale}
            onDuplicateSale={handleSaleComplete}
            onNavigateToPOS={() => setCurrentView(View.POS)}
            settings={settings}
            onUpdateSettings={handleSetSettings}
            currentUser={currentUser}
          />
        );
      case View.ANALYZER:
        return (
          <FragranceAnalyzer
            products={products}
            setProducts={handleSetProducts}
            onNavigateToPOS={(product) => setCurrentView(View.POS)}
            currentUser={currentUser}
            fragranceDatabase={fragranceDatabase}
            onSaveFragranceProfile={handleSaveFragranceProfile}
          />
        );
      case View.SETTINGS:
        return (
          <Settings
            settings={settings}
            setSettings={handleSetSettings}
            bottleSizes={bottleSizes}
            setBottleSizes={handleSetBottleSizes}
            vaults={vaults}
            withdrawals={withdrawals}
            sales={sales}
            expenses={expenses}
            products={products}
            currentUser={currentUser}
            attendanceRecords={attendanceRecords}
            onCheckInAttendance={handleCheckInAttendance}
            onAddWithdrawal={handleAddWithdrawal}
            onNavigate={setCurrentView}
            customCustomers={customCustomers}
            onAddAuditLog={handleAddAuditLog}
            initialSection={settingsInitialSection}
          />
        );
      case View.STORE_MANAGER:
        return (
          <MasterStoreManager
            products={products}
            setProducts={handleSetProducts}
            sales={sales}
            setSales={setSales}
            expenses={expenses}
            setExpenses={handleSetExpenses}
            settings={settings}
            setSettings={handleSetSettings}
            bottleSizes={bottleSizes}
            setBottleSizes={handleSetBottleSizes}
          />
        );
      case View.OPERATIONS_SYSTEM:
        return (
          <OperationsSystem
            settings={settings}
            bottleSizes={bottleSizes}
            sales={sales}
            expenses={expenses}
            attendanceRecords={attendanceRecords}
            onUpdateTarget={(newTarget) => {
              handleSetSettings(prev => ({ ...prev, dailyTargetProfit: newTarget }));
            }}
          />
        );
      case View.MARKETING:
        return <AIMarketing products={products} />;
      default:
        return (
          <Dashboard 
            sales={sales} 
            products={products} 
            expenses={expenses}
            settings={settings}
            vaults={vaults}
            withdrawals={withdrawals}
            currentClosure={currentClosure}
            currentUser={currentUser}
            customCustomers={customCustomers}
            onNavigate={setCurrentView} 
            onOpenDayOperations={() => setIsDayOpsModalOpen(true)}
            onOpenLoyaltySettings={() => {
              setCurrentView(View.OPERATIONS_SYSTEM);
            }}
            onUpdateSettings={handleSetSettings}
          />
        );
    }
  };

  if (isScreenLocked || !currentUser) {
    return (
      <>
        <InteractiveTypingController settings={settings} />
        <AppleWelcomeLockScreen
          users={users}
          currentClosure={currentClosure}
          onUnlock={handleLoginSuccess}
          savedSessionUser={savedSessionUser}
          isCheckingSavedSession={isCheckingSavedSession}
          authRestoreError={authRestoreError}
          onResumeSavedSession={() => {
            if (savedSessionUser) handleLoginSuccess({ ...savedSessionUser, lastLoginAt: new Date().toISOString() });
          }}
          onUpdateUser={handleSaveUser}
          storeName={settings.storeName || 'لَمْسَةُ عِطْر'}
          storeSlogan={settings.storeSlogan || 'فخامة العطور الشرقية والفرنسية'}
        />
      </>
    );
  }

  return (
    <div className="apple-theme-shell min-h-screen max-w-full overflow-x-hidden bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased">
      {!isCloudConnected && (
        <div role="status" className="fixed bottom-20 left-3 right-3 z-[140] mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-zinc-950/95 px-4 py-3 text-center text-xs font-semibold text-amber-100 shadow-2xl sm:bottom-4">
          <WifiOff size={16} className="shrink-0 text-amber-300" />
          <span>وضع دون اتصال — تُحفظ التغييرات على هذا الجهاز وتُزامن عند عودة الإنترنت. لا تسجّل الخروج قبل المزامنة.</span>
        </div>
      )}
      {cloudSyncError && (
        <div role="alert" className="fixed bottom-36 left-3 right-3 z-[141] mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-rose-400/40 bg-zinc-950/95 px-4 py-3 text-xs font-semibold text-rose-100 shadow-2xl sm:bottom-20">
          <span>تعذرت مزامنة بعض التغييرات. تحقق من الاتصال وصلاحيات الحساب؛ تبقى نسخة هذا الجهاز محفوظة.</span>
          <button type="button" aria-label="إغلاق التنبيه" onClick={() => setCloudSyncError(false)} className="shrink-0 rounded-lg px-2 py-1 text-rose-200 hover:bg-white/10">إغلاق</button>
        </div>
      )}

      {/* Interactive Typing Shake, Color Sparkle & Acoustic Controller */}
      <InteractiveTypingController settings={settings} />

      {/* Apple Dynamic Island Top Notification Banner (Strictly at the Top) */}
      <AppleTopNotificationBanner
        notifications={topNotifications}
        onDismiss={dismissTopNotification}
      />

      {/* Responsive Navigation: Top Bar on Mobile + Floating Glass Sidebar on Desktop */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        products={products}
        settings={settings}
        isCloudConnected={isCloudConnected}
        currentUser={currentUser}
        onOpenAuthModal={handleLockScreen}
        onLogout={handleLogout}
        onOpenDayOperations={() => setIsDayOpsModalOpen(true)}
        onLockScreen={handleLockScreen}
        onOpenThemeStudio={() => setIsThemeStudioModalOpen(true)}
        onOpenLiveAlertsRadar={() => setIsOwnerLiveRadarOpen(true)}
        onOpenPWAInstall={() => setIsPWAInstallModalOpen(true)}
        onToggleDarkMode={() => {
          const currentResolved = resolveActiveAppTheme(settings);
          const nextThemeId = currentResolved.isDark ? 'apple_sonoma_light' : 'sequoia_midnight_dark';
          handleSetSettings((prev) => ({
            ...prev,
            activeThemeId: nextThemeId,
            themeAutoTimeOfDay: false,
          }));
        }}
      />

      {/* Main Content Area: Responsive padding with max-width containment (md:pr-72 for desktop sidebar, pt-[104px] for two-deck mobile top bar) */}
      <main className="min-h-screen w-full max-w-full overflow-x-hidden relative z-0 md:pr-72 pt-[104px] md:pt-4 transition-all duration-200">
        {/* Unified Sleek Top Header Bar & Smart Color-Coded Notification Ticker */}
        <ExecutiveHeaderBar
          currentUser={currentUser}
          onOpenAuthModal={handleLockScreen}
          onOpenDayOperations={() => setIsDayOpsModalOpen(true)}
          onLockScreen={handleLockScreen}
          sales={sales}
          expenses={expenses}
          settings={settings}
          products={products}
          currentClosure={currentClosure}
          topNotifications={topNotifications}
          currentView={currentView}
          onNavigate={setCurrentView}
          onSendSmartNotification={(title, subtitle, badgeText) =>
            pushTopNotification('info', title, subtitle, badgeText)
          }
          onOpenDailyReportAutomation={() => setIsDailyReportAutomationModalOpen(true)}
          onOpenThemeStudio={() => setIsThemeStudioModalOpen(true)}
          onOpenLiveAlertsRadar={() => setIsOwnerLiveRadarOpen(true)}
          onOpenPWAInstall={() => setIsPWAInstallModalOpen(true)}
          onUpdateSettings={handleSetSettings}
        />

        <div className="flex-1">
          {renderView()}
        </div>

        {/* Sleek Apple Signature Footer & Smart Quick Spotlight (Mohamed Mhran2027©) */}
        <AppleSignatureFooter
          currentView={currentView}
          onNavigate={setCurrentView}
          onLockScreen={handleLockScreen}
          onOpenDayOperations={() => setIsDayOpsModalOpen(true)}
          products={products}
          customCustomers={customCustomers}
          sales={sales}
          settings={settings}
          onSelectCustomerForPOS={(cust) => {
            setPreselectedPosCustomer(cust);
            setCurrentView(View.POS);
            pushTopNotification(
              'info',
              `تم اختيار العميل: ${cust.name}`,
              'تم تجهيز بيانات العميل في شاشة الكاشير لتحقيق المستهدف البيعي',
              'بيع مباشر'
            );
          }}
          onOpenFormulationForProduct={(product) => {
            setFormulationProduct(product);
            setCurrentView(View.FORMULATION_ENGINE);
          }}
        />
      </main>

      {/* Day Operations Modal (فتح وإغلاق اليوم والدرج) */}
      {isDayOpsModalOpen && (
        <DayOperationsModal
          currentClosure={currentClosure}
          currentUser={currentUser}
          sales={sales}
          expenses={expenses}
          products={products}
          settings={settings}
          auditLogs={auditLogs}
          customCustomers={customCustomers}
          onSaveClosure={handleSaveClosure}
          onAddAuditLog={handleAddAuditLog}
          onClose={() => setIsDayOpsModalOpen(false)}
          onOpenDailyReportAutomation={() => {
            setIsDayOpsModalOpen(false);
            setIsDailyReportAutomationModalOpen(true);
          }}
          onSendSmartNotification={(title, subtitle, badgeText) =>
            pushTopNotification('goal', title, subtitle, badgeText)
          }
          currency={settings.currency}
        />
      )}

      {/* Automated Daily Midnight Report & Google Forms / Gmail Modal */}
      <DailyReportAutomationModal
        isOpen={isDailyReportAutomationModalOpen}
        onClose={() => setIsDailyReportAutomationModalOpen(false)}
        sales={sales}
        expenses={expenses}
        products={products}
        settings={settings}
        onUpdateSettings={handleSetSettings}
        currentClosure={currentClosure}
        auditLogs={auditLogs}
        customCustomers={customCustomers}
        currentUserDisplayName={currentUser?.displayName || 'الإدارة'}
        onSendSmartNotification={(title, subtitle, badgeText) =>
          pushTopNotification('goal', title, subtitle, badgeText)
        }
      />

      {/* Apple Dynamic Theme & Atmosphere Studio Modal */}
      <AppleThemeStudioModal
        isOpen={isThemeStudioModalOpen}
        onClose={() => setIsThemeStudioModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleSetSettings}
        onNotify={(title, subtitle, badgeText) =>
          pushTopNotification('info', title, subtitle, badgeText)
        }
      />

      {/* Specialized Smart AI Chat Assistant (Works 100% Offline & Online) */}
      <SmartAppAssistantChat
        products={products}
        sales={sales}
        expenses={expenses}
        settings={settings}
        customCustomers={customCustomers}
        customerRequests={customerRequests}
        attendanceRecords={attendanceRecords}
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={setCurrentView}
        onUpdateSettings={handleSetSettings}
        onNotify={(title, subtitle, badgeText) =>
          pushTopNotification('info', title, subtitle, badgeText)
        }
      />

      {/* Owner Live Alerts Radar Modal (رادار التنبيهات الفورية للمالك وتزامن الأجهزة في الوقت الفعلي) */}
      <OwnerLiveAlertsRadarModal
        isOpen={isOwnerLiveRadarOpen}
        onClose={() => setIsOwnerLiveRadarOpen(false)}
        recentSales={sales}
        currency={settings.currency}
        isCloudConnected={isCloudConnected}
        onTriggerTestAlert={() => {
          pushTopNotification(
            'goal',
            '🔔 تجربة رادار تنبيهات المالك الناجحة',
            'نظام التزامن الفوري والرنين وإشعارات الشاشة يعمل بكفاءة 100% على اللاب توب والموبايل',
            'تنبيه حي'
          );
        }}
      />

      {/* PWA Independent App Packaging Modal (تثبيت البرنامج كتطبيق مستقل على الموبايل واللاب توب والتابلت) */}
      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
      />
    </div>
  );
};

export default App;

    // Listen to real-time settings and branding
