import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  clearIndexedDbPersistence,
  terminate,
  waitForPendingWrites,
  collection, 
  doc, 
  setDoc as firestoreSetDoc,
  getDoc, 
  getDocFromCache,
  getDocs, 
  deleteDoc as firestoreDeleteDoc,
  onSnapshot, 
  writeBatch as firestoreWriteBatch,
  query,
  where,
  orderBy,
  limit,
  getDocFromServer,
  updateDoc,
  runTransaction,
  type Firestore
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  Product, 
  Sale, 
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
  CustomCustomerRecord,
  SavedMixFormula,
  DEFAULT_USERS,
  OWNER_FULL_PERMISSIONS,
  TAREK_OPERATIONAL_PERMISSIONS,
  CASHIER_STANDARD_PERMISSIONS,
  INVENTORY_KEEPER_PERMISSIONS,
  UserRole
} from '../types';
import { mergeConfidentialDocument, privateConfidentialDocId, splitConfidentialDocument } from './confidentialData';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the specific provisioned database
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
let firestorePersistentCacheConfigured = false;
export const db = (() => {
  try {
    const settings = {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    };
    const firestore = dbId && dbId !== '(default)'
      ? initializeFirestore(app, settings, dbId)
      : initializeFirestore(app, settings);
    firestorePersistentCacheConfigured = true;
    return firestore;
  } catch (error) {
    firestorePersistentCacheConfigured = false;
    console.warn('Persistent Firestore cache is unavailable; using the default cache.', error);
    return dbId && dbId !== '(default)'
      ? getFirestore(app, dbId)
      : getFirestore(app);
  }
})();

const FIRESTORE_CACHE_RESET_FLAG = 'lamsa_firestore_cache_needs_reset_v1';

async function prepareFirestoreCacheForAccount(): Promise<void> {
  if (typeof localStorage === 'undefined' || localStorage.getItem(FIRESTORE_CACHE_RESET_FLAG) !== '1') return;
  if (!firestorePersistentCacheConfigured) {
    localStorage.removeItem(FIRESTORE_CACHE_RESET_FLAG);
    return;
  }
  try {
    await clearIndexedDbPersistence(db);
    localStorage.removeItem(FIRESTORE_CACHE_RESET_FLAG);
  } catch (error) {
    console.error('Could not clear Firestore cache before account access; keeping the session locked.', error);
    throw new Error('تعذّر عزل ذاكرة الحساب السابق على هذا الجهاز. أغلق تبويبات التطبيق الأخرى ثم أعد فتحه.');
  }
}

const rolePermissions = (role: UserRole): AppUser['permissions'] => {
  if (role === 'OWNER') return OWNER_FULL_PERMISSIONS;
  if (role === 'STORE_MANAGER') return TAREK_OPERATIONAL_PERMISSIONS;
  if (role === 'INVENTORY_KEEPER') return INVENTORY_KEEPER_PERMISSIONS;
  return CASHIER_STANDARD_PERMISSIONS;
};

const OWNER_ONLY_PERMISSION_OVERRIDES: Partial<AppUser['permissions']> = {
  canEditProductCost: false,
  canViewCosts: false,
  canViewProfits: false,
  canViewCostAndProfit: false,
  canViewProfitAndCosts: false,
  canViewExecutiveDashboard: false,
  canViewVaults: false,
  canRequestWithdrawal: false,
  canApproveWithdrawal: false,
  canInjectCapital: false,
  canTransferBetweenVaults: false,
  canWithdrawOwnerProfit: false,
  canEditBudget: false,
  canEditSalaries: false,
  canEditCommissions: false,
  canViewExpenses: false,
  canManageSettings: false,
  canManageUsers: false,
  canViewAuditLog: false,
  canViewAuditLogs: false,
  canAccessOperationsSystem: false,
  canEditSettingsAndBudgets: false,
  canExportData: false,
  canDeleteInvoices: false,
};

let activeAuthorizedRole: UserRole | null = null;
const isOwnerSession = () => activeAuthorizedRole === 'OWNER';
export const isCurrentSessionOwner = () => isOwnerSession();

export const loadAuthorizedAppUser = async (firebaseUser: User): Promise<AppUser> => {
  await prepareFirestoreCacheForAccount();
  const email = firebaseUser.email?.trim().toLowerCase();
  if (!email || !firebaseUser.emailVerified || firebaseUser.isAnonymous ||
      !firebaseUser.providerData.some((provider) => provider.providerId === 'google.com')) {
    throw new Error('يلزم الدخول بحساب Google موثّق.');
  }
  activeAuthorizedRole = null;

  const profileRef = doc(db, 'authorized_users', email);
  let profileSnap;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    profileSnap = await getDocFromCache(profileRef);
  } else {
    try {
      profileSnap = await getDoc(profileRef);
    } catch (error) {
      if (!isTransientFirebaseError(error)) throw error;
      try {
        profileSnap = await getDocFromCache(profileRef);
      } catch {
        throw error;
      }
    }
  }
  if (!profileSnap.exists()) {
    throw new Error('هذا الحساب غير مضاف إلى قائمة موظفي المتجر. اطلب من المالك إضافة بريد Google أولاً.');
  }

  const profile = profileSnap.data();
  if (profile.isActive !== true) {
    throw new Error('هذا الحساب موقوف حالياً. تواصل مع مالك المتجر.');
  }

  const allowedRoles: UserRole[] = ['OWNER', 'STORE_MANAGER', 'CASHIER', 'SALES_REP', 'INVENTORY_KEEPER'];
  if (!allowedRoles.includes(profile.role as UserRole)) {
    throw new Error('الدور المعيّن لهذا الحساب غير صالح.');
  }

  const role = profile.role as UserRole;
  if (role !== 'OWNER' && profile.migrationReady !== true) {
    throw new Error('هذا الحساب غير مفعّل بعد. يجب أن يكمل المالك عزل البيانات الخاصة ثم يفعّل الحساب من إدارة الصلاحيات.');
  }
  activeAuthorizedRole = role;
  const permissions: AppUser['permissions'] = {
    ...rolePermissions(role),
    ...(profile.permissions || {}),
  };
  if (role !== 'OWNER') Object.assign(permissions, OWNER_ONLY_PERMISSION_OVERRIDES);
  if (role === 'OWNER' && (typeof navigator === 'undefined' || navigator.onLine)) {
    // Authentication must not wait for the potentially long data migration.
    // Existing running migrations are observed instead of being duplicated.
    void startOwnerConfidentialMigrationInBackground();
  }
  return {
    id: typeof profile.appUserId === 'string' ? profile.appUserId : `google-${firebaseUser.uid}`,
    username: typeof profile.username === 'string' ? profile.username : email.split('@')[0],
    displayName: typeof profile.displayName === 'string' && profile.displayName.trim()
      ? profile.displayName
      : (firebaseUser.displayName || email),
    authEmail: email,
    role,
    passwordHash: '',
    requiresPasswordChange: false,
    isActive: true,
    createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : new Date().toISOString(),
    permissions,
  };
};

export const signInWithGoogleAndLoadAppUser = async (): Promise<AppUser> => {
  const existingUser = auth.currentUser;
  if (existingUser) {
    try {
      return await loadAuthorizedAppUser(existingUser);
    } catch (error) {
      if (isTransientFirebaseError(error)) throw error;
      const code = (error as { code?: string } | null)?.code || '';
      if (code === 'permission-denied' || code === 'unauthenticated') throw error;
      // If this Google account has no active employee profile, let the user choose another account.
    }
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // GitHub Pages is cross-origin from Firebase authDomain. Firebase recommends
  // popup sign-in for non-Firebase hosting to avoid redirect storage loops.
  const credential = await signInWithPopup(auth, provider);
  return await loadAuthorizedAppUser(credential.user);
};

export const onFirebaseAuthStateChanged = (callback: (firebaseUser: User | null) => void) =>
  onAuthStateChanged(auth, (firebaseUser) => {
    void (async () => {
      try {
        await prepareFirestoreCacheForAccount();
        callback(firebaseUser);
      } catch {
        if (firebaseUser) await signOut(auth).catch(() => {});
        callback(null);
      }
    })();
  });

export const isTransientFirebaseError = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code || '';
  const online = typeof navigator === 'undefined' || navigator.onLine;
  return !online || ['unavailable', 'deadline-exceeded', 'auth/network-request-failed', 'network-request-failed'].includes(code);
};

export const getGoogleSignInErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code || '';
  if (code === 'auth/popup-blocked') {
    return 'حظر المتصفح نافذة Google. اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/redirect-cancelled-by-user') {
    return 'لم يكتمل تسجيل Google. إذا طلب إثبات هويتك على الهاتف، اضغط «نعم» ثم اختر الرقم المطابق؛ الضغط على «لا» يرفض الدخول. إذا ظهرت صفحة «أخفق التحقق»، اضغط «إعادة المحاولة».';
  }
  if (code === 'auth/web-storage-unsupported' || code === 'auth/operation-not-supported-in-this-environment') {
    return 'هذا المتصفح لا يدعم نافذة تسجيل Google. افتح الرابط مباشرة في Chrome أو Safari ثم أعد المحاولة.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'عنوان الموقع غير مسموح به في إعدادات Firebase Authentication.';
  }
  if (code === 'auth/network-request-failed' || code === 'unavailable') {
    return 'تعذّر الاتصال بخدمة Google أو Firebase. تحقق من الإنترنت ثم أعد المحاولة.';
  }
  if (code === 'permission-denied') {
    return 'تم تسجيل حساب Google، لكن Firestore رفض قراءة ملف الصلاحيات. ستبقى بيانات المتجر مقفلة حتى تُراجع صلاحيات Firebase.';
  }
  if (code === 'unauthenticated') {
    return 'انتهت جلسة Firebase قبل تحميل الصلاحيات. أعد المحاولة من زر الدخول.';
  }
  return error instanceof Error && !error.message.startsWith('Firebase: Error (')
    ? error.message
    : 'تعذّر تسجيل الدخول. أعد المحاولة من متصفح Chrome أو Safari.';
};

export const signOutFirebaseUser = async (): Promise<void> => {
  activeAuthorizedRole = null;
  if (!auth.currentUser) return;
  let terminated = false;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(FIRESTORE_CACHE_RESET_FLAG, '1');
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      waitForPendingWrites(db),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, 6000); }),
    ]);
    if (timer) clearTimeout(timer);
    if (firestorePersistentCacheConfigured) {
      await terminate(db);
      terminated = true;
      await clearIndexedDbPersistence(db);
      if (typeof localStorage !== 'undefined') localStorage.removeItem(FIRESTORE_CACHE_RESET_FLAG);
    }
  } catch (error) {
    console.warn('Firestore account cache reset will be retried before the next account is opened.', error);
  }
  await signOut(auth);
  if (terminated || (typeof localStorage !== 'undefined' && localStorage.getItem(FIRESTORE_CACHE_RESET_FLAG) === '1')) {
    if (typeof window !== 'undefined') window.location.reload();
  }
};

export const getCurrentFirebaseUser = (): User | null => auth.currentUser;

export const ensureAuth = async (): Promise<User> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || !user.email || !user.emailVerified ||
      !user.providerData.some((provider) => provider.providerId === 'google.com')) {
    throw new Error('سجّل الدخول بحساب Google موثّق قبل استخدام بيانات المتجر.');
  }
  return user;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const queueFirestoreWrite = (writePromise: Promise<unknown>, operation: string): Promise<void> => {
  void writePromise.catch((error) => {
    const code = (error as { code?: string } | null)?.code || 'unknown';
    console.error('Firestore write was rejected or could not sync.', { operation, code });
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (!isOffline && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lamsa-cloud-sync-error', { detail: { operation, code } }));
    }
  });
  return Promise.resolve();
};

const setDoc = (reference: any, data: any, options?: any): Promise<void> =>
  queueFirestoreWrite(
    options === undefined
      ? firestoreSetDoc(reference, data)
      : firestoreSetDoc(reference, data, options),
    'set'
  );

const deleteDoc = (...args: Parameters<typeof firestoreDeleteDoc>): Promise<void> =>
  queueFirestoreWrite(firestoreDeleteDoc(...args), 'delete');

const writeBatch = (database: Firestore) => {
  const batch = firestoreWriteBatch(database);
  const commit = batch.commit.bind(batch);
  return Object.assign(batch, {
    commit: () => queueFirestoreWrite(commit(), 'batch')
  });
};

/**
 * Recursively strips keys with `undefined` values from objects or arrays.
 * Firestore throws: "Unsupported field value: undefined" if any field contains undefined.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

type ConfidentialRecord = Record<string, unknown>;
type ConfidentialWriteBatch = ReturnType<typeof firestoreWriteBatch>;
const PRIVATE_COLLECTION = 'owner_private';
const PRIVATE_MIGRATION_MARKER = '__confidential_migration_v1';
const CONFIDENTIAL_COLLECTIONS = [
  'sales', 'products', 'settings', 'bottleSizes', 'staff_attendance',
  'daily_closures', 'purchase_requests', 'stock_checks', 'customers',
  'customer_requests', 'saved_mixes', 'fragrance_database',
] as const;

export interface ConfidentialMigrationStatus {
  status?: string;
  version?: number;
  startedAt?: string;
  attemptStartedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  migratedDocuments?: number;
  totalDocuments?: number;
  currentCollection?: string | null;
  currentCollectionProcessed?: number;
  currentCollectionTotal?: number;
  errorCode?: string | null;
  failedCollection?: string | null;
  leaseId?: string | null;
  leaseUntilMs?: number;
  counts?: Record<string, number>;
}

export interface ConfidentialMigrationResult {
  alreadyComplete: boolean;
  migratedDocuments: number;
  skippedReason?: 'running' | 'legacy-running';
}

const CONFIDENTIAL_MIGRATION_LEASE_MS = 5 * 60 * 1000;
let localConfidentialMigrationTask: Promise<ConfidentialMigrationResult> | null = null;
let ownerMigrationBackgroundTask: Promise<void> | null = null;

const migrationMarkerRef = () => doc(db, PRIVATE_COLLECTION, PRIVATE_MIGRATION_MARKER);
const migrationIsComplete = (marker?: ConfidentialMigrationStatus) =>
  marker?.status === 'complete' && marker.version === 1;

export function subscribeConfidentialMigrationStatus(
  onUpdate: (status: ConfidentialMigrationStatus) => void,
): () => void {
  if (!isOwnerSession()) {
    onUpdate({ status: 'unavailable' });
    return () => {};
  }
  return onSnapshot(migrationMarkerRef(), (snapshot) => {
    onUpdate(snapshot.exists()
      ? snapshot.data() as ConfidentialMigrationStatus
      : { status: 'missing', version: 1 });
  }, (error) => {
    console.warn('Unable to read confidential migration status.', error);
    onUpdate({ status: 'unavailable' });
  });
}

function startOwnerConfidentialMigrationInBackground(): void {
  if (ownerMigrationBackgroundTask) return;
  ownerMigrationBackgroundTask = (async () => {
    try {
      const markerSnapshot = await getDoc(migrationMarkerRef());
      const marker = markerSnapshot.exists()
        ? markerSnapshot.data() as ConfidentialMigrationStatus
        : undefined;
      if (migrationIsComplete(marker) || marker?.status === 'running' || marker?.status === 'error') return;

      const result = await migrateConfidentialDataToOwnerPrivate();
      if (!result.alreadyComplete && !result.skippedReason) {
        console.info(`Sensitive data migration completed (${result.migratedDocuments} records).`);
      }
    } catch (error) {
      console.error('Confidential data migration remains incomplete; limited-access users must stay inactive.', error);
    }
  })().finally(() => {
    ownerMigrationBackgroundTask = null;
  });
}

const privateRecordRef = (collectionName: string, id: string) =>
  doc(db, PRIVATE_COLLECTION, privateConfidentialDocId(collectionName, id));

function stageConfidentialWrite(
  batch: ConfidentialWriteBatch,
  collectionName: string,
  id: string,
  record: ConfidentialRecord,
  mergePublic = false,
) {
  const { publicData, privateData } = splitConfidentialDocument(collectionName, record);
  const publicRef = doc(db, collectionName, id);
  if (mergePublic) batch.set(publicRef, cleanForFirestore(publicData), { merge: true });
  else batch.set(publicRef, cleanForFirestore(publicData));

  if (isOwnerSession()) {
    const privateRef = privateRecordRef(collectionName, id);
    if (Object.keys(privateData).length > 0) {
      batch.set(privateRef, cleanForFirestore({
        sourceCollection: collectionName,
        sourceId: id,
        payload: privateData,
        updatedAt: new Date().toISOString(),
      }));
    } else {
      batch.delete(privateRef);
    }
  }
}

async function saveConfidentialDocument(collectionName: string, id: string, record: ConfidentialRecord, mergePublic = false) {
  await ensureAuth();
  const batch = writeBatch(db);
  stageConfidentialWrite(batch, collectionName, id, record, mergePublic);
  await batch.commit();
}

function subscribeToConfidentialCollection<T extends object>(
  collectionName: string,
  onUpdate: (records: T[], pendingWriteIds: Set<string>) => void,
  seedIfEmpty?: () => Promise<void> | void,
) {
  const owner = isOwnerSession();
  let publicDocs: Array<{ id: string; data: () => ConfidentialRecord; hasPendingWrites: boolean }> | null = null;
  let privateReady = !owner;
  let didSeed = false;
  const privateById = new Map<string, ConfidentialRecord>();

  const publish = () => {
    if (!publicDocs || !privateReady) return;
    const records = publicDocs.map((docSnap) => {
      const raw = docSnap.data();
      const split = splitConfidentialDocument(collectionName, raw);
      const storedPrivate = privateById.get(docSnap.id) || {};
      const full = owner
        ? mergeConfidentialDocument(collectionName, split.publicData, { ...split.privateData, ...storedPrivate })
        : split.publicData;
      return { ...full, id: docSnap.id } as unknown as T;
    });
    onUpdate(records, new Set(publicDocs.filter((item) => item.hasPendingWrites).map((item) => item.id)));
  };

  const unsubscribePublic = onSnapshot(collection(db, collectionName), (snapshot) => {
    publicDocs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      data: () => docSnap.data(),
      hasPendingWrites: docSnap.metadata.hasPendingWrites,
    }));
    publish();
    if (snapshot.empty && seedIfEmpty && !didSeed) {
      didSeed = true;
      Promise.resolve(seedIfEmpty()).catch((error) => console.warn(`Unable to seed ${collectionName}:`, error));
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, collectionName);
  });

  const unsubscribePrivate = owner
    ? onSnapshot(query(collection(db, PRIVATE_COLLECTION), where('sourceCollection', '==', collectionName)), (snapshot) => {
        privateById.clear();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (typeof data.sourceId === 'string' && data.payload && typeof data.payload === 'object') {
            privateById.set(data.sourceId, data.payload as ConfidentialRecord);
          }
        });
        privateReady = true;
        publish();
      }, (err) => {
        console.warn(`Private companion records unavailable for ${collectionName}; using legacy owner fields if present.`, err);
        privateReady = true;
        publish();
      })
    : () => {};

  return () => {
    unsubscribePublic();
    unsubscribePrivate();
  };
}

export function sanitizeOperationalRecord<T>(collectionName: string, record: T): T {
  return splitConfidentialDocument(collectionName, (record || {}) as ConfidentialRecord).publicData as T;
}

export function toOperationalSettings(record: Partial<StoreSettings>, fallback: StoreSettings): StoreSettings {
  const fallbackPublic = splitConfidentialDocument('settings', fallback as unknown as ConfidentialRecord).publicData;
  const recordPublic = splitConfidentialDocument('settings', (record || {}) as ConfidentialRecord).publicData;
  const visible = { ...fallbackPublic, ...recordPublic } as Record<string, unknown>;
  const neutralFinance: Partial<StoreSettings> = {
    priceEssenceNormal: 0,
    priceEssenceNiche: 0,
    priceEssenceSpecial: 0,
    defaultBottleCost: 0,
    standardBottleAndSprayCost: 0,
    coloredBottleCost: 0,
    coloredBottleExtraCost: 0,
    stickerCost: 0,
    basicBagCost: 0,
    basicPlasticBagCost: 0,
    defaultMargin: 0,
    dailyTargetProfit: 0,
    monthlyTargetRevenue: 0,
    monthlyFixedBudget: 0,
    monthlyWorkDays: 0,
    employeeBaseSalary: 0,
    ownerSalary: 0,
    commissionRate: 0,
    tieredCommissionRate: 0,
    tieredThresholdBottles: 0,
    tieredCommissionBottleThreshold: 0,
    loyaltyCashPerPointEgp: 0,
    loyaltyMinSafeMarginEgp: 0,
    autoMidnightReportEnabled: false,
    googleFormId: '',
    googleFormEditUrl: '',
    googleFormResponderUrl: '',
    googleFormWebhookUrl: '',
    whatsappAutoSendOnClosure: false,
    whatsappAutoSendWithEmail: false,
    whatsappDualTargetDispatch: false,
    whatsappCallMeBotApiKey: '',
    whatsappSecondaryCallMeBotApiKey: '',
    whatsappCustomWebhookUrl: '',
  } as Partial<StoreSettings>;
  const visibleBottleSizes = Array.isArray(visible.bottleSizes)
    ? visible.bottleSizes.map((size: Record<string, unknown>) => ({
        ...size,
        officialCost: 0,
        bottleCost: 0,
        alcoholCost: 0,
        fixativeCost: 0,
      }))
    : visible.bottleSizes;
  return {
    ...visible,
    ...neutralFinance,
    bottleSizes: visibleBottleSizes,
    storeName: typeof visible.storeName === 'string' ? visible.storeName : fallback.storeName,
    currency: typeof visible.currency === 'string' ? visible.currency : fallback.currency,
  } as StoreSettings;
}

async function runConfidentialDataMigration(forceResume: boolean): Promise<ConfidentialMigrationResult> {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('ترحيل البيانات الحساسة متاح لحساب المالك فقط.');
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('يلزم الاتصال بالإنترنت لإكمال ترحيل البيانات الآمن.');

  const markerRef = migrationMarkerRef();
  const runId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  type ClaimResult = {
    state: 'complete' | 'running' | 'legacy-running' | 'acquired';
    migratedDocuments: number;
  };
  const claim = await runTransaction(db, async (transaction): Promise<ClaimResult> => {
    const markerSnapshot = await transaction.get(markerRef);
    const marker = markerSnapshot.exists()
      ? markerSnapshot.data() as ConfidentialMigrationStatus
      : undefined;
    const migrated = Number(marker?.migratedDocuments || 0);
    if (migrationIsComplete(marker)) return { state: 'complete', migratedDocuments: migrated };

    const leaseUntilMs = Number(marker?.leaseUntilMs || 0);
    if (marker?.status === 'running' && leaseUntilMs > Date.now()) {
      return { state: 'running', migratedDocuments: migrated };
    }
    if (marker?.status === 'running' && !marker.leaseId && !forceResume) {
      return { state: 'legacy-running', migratedDocuments: migrated };
    }

    transaction.set(markerRef, {
      status: 'running',
      version: 1,
      startedAt: marker?.startedAt || now,
      attemptStartedAt: now,
      updatedAt: now,
      leaseId: runId,
      leaseUntilMs: Date.now() + CONFIDENTIAL_MIGRATION_LEASE_MS,
      migratedDocuments: 0,
      totalDocuments: 0,
      currentCollection: null,
      currentCollectionProcessed: 0,
      currentCollectionTotal: 0,
      counts: {},
      errorCode: null,
      failedCollection: null,
    }, { merge: true });
    return { state: 'acquired', migratedDocuments: 0 };
  });

  if (claim.state === 'complete') return { alreadyComplete: true, migratedDocuments: claim.migratedDocuments };
  if (claim.state === 'running' || claim.state === 'legacy-running') {
    return {
      alreadyComplete: false,
      migratedDocuments: claim.migratedDocuments,
      skippedReason: claim.state,
    };
  }

  let migratedDocuments = 0;
  let totalDocuments = 0;
  let currentCollection: string | null = null;
  const counts: Record<string, number> = {};
  const renewLease = async (progress: Record<string, unknown>): Promise<boolean> => runTransaction(db, async (transaction) => {
    const markerSnapshot = await transaction.get(markerRef);
    const marker = markerSnapshot.exists() ? markerSnapshot.data() : undefined;
    if (marker?.status === 'complete' && marker.version === 1) return false;
    if (!markerSnapshot.exists() || marker?.leaseId !== runId) {
      throw new Error('confidential-migration-lease-lost');
    }
    transaction.set(markerRef, {
      ...progress,
      updatedAt: new Date().toISOString(),
      leaseUntilMs: Date.now() + CONFIDENTIAL_MIGRATION_LEASE_MS,
    }, { merge: true });
    return true;
  });

  try {
    for (const collectionName of CONFIDENTIAL_COLLECTIONS) {
      currentCollection = collectionName;
      const snapshot = await getDocs(collection(db, collectionName));
      const docs = snapshot.docs;
      counts[collectionName] = snapshot.size;
      totalDocuments += snapshot.size;

      const existingPrivateSnapshot = await getDocs(query(
        collection(db, PRIVATE_COLLECTION),
        where('sourceCollection', '==', collectionName),
      ));
      const existingPrivateById = new Map<string, ConfidentialRecord>();
      existingPrivateSnapshot.forEach((privateSnapshot) => {
        const privateData = privateSnapshot.data();
        if (typeof privateData.sourceId === 'string' && privateData.payload && typeof privateData.payload === 'object') {
          existingPrivateById.set(privateData.sourceId, privateData.payload as ConfidentialRecord);
        }
      });

      if (!await renewLease({
        currentCollection,
        currentCollectionProcessed: 0,
        currentCollectionTotal: docs.length,
        migratedDocuments,
        totalDocuments,
        counts: { ...counts },
      })) {
        return { alreadyComplete: true, migratedDocuments };
      }

      for (let offset = 0; offset < docs.length; offset += 200) {
        const batchDocs = docs.slice(offset, offset + 200);
        if (!await renewLease({
          currentCollection,
          currentCollectionProcessed: offset,
          currentCollectionTotal: docs.length,
          migratedDocuments,
          totalDocuments,
          counts: { ...counts },
        })) {
          return { alreadyComplete: true, migratedDocuments };
        }

        const batch = firestoreWriteBatch(db);
        batchDocs.forEach((docSnapshot) => {
          const publicData = docSnapshot.data() as ConfidentialRecord;
          const existingPrivate = existingPrivateById.get(docSnapshot.id) || {};
          const fullRecord = mergeConfidentialDocument(collectionName, publicData, existingPrivate) as ConfidentialRecord;
          stageConfidentialWrite(batch, collectionName, docSnapshot.id, fullRecord);
        });
        await batch.commit();
        migratedDocuments += batchDocs.length;
        if (!await renewLease({
          currentCollection,
          currentCollectionProcessed: offset + batchDocs.length,
          currentCollectionTotal: docs.length,
          migratedDocuments,
          totalDocuments,
          counts: { ...counts },
        })) {
          return { alreadyComplete: true, migratedDocuments };
        }
      }
    }

    const completed = await runTransaction(db, async (transaction) => {
      const markerSnapshot = await transaction.get(markerRef);
      const marker = markerSnapshot.exists() ? markerSnapshot.data() : undefined;
      if (marker?.status === 'complete' && marker.version === 1) return false;
      if (!markerSnapshot.exists() || marker?.leaseId !== runId) {
        throw new Error('confidential-migration-lease-lost');
      }
      transaction.set(markerRef, {
        status: 'complete',
        version: 1,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        migratedDocuments,
        totalDocuments,
        counts,
        currentCollection: null,
        currentCollectionProcessed: totalDocuments,
        currentCollectionTotal: totalDocuments,
        errorCode: null,
        failedCollection: null,
        leaseId: '',
        leaseUntilMs: 0,
      }, { merge: true });
      return true;
    });
    return { alreadyComplete: !completed, migratedDocuments };
  } catch (error) {
    const errorCode = typeof (error as { code?: unknown } | null)?.code === 'string'
      ? (error as { code: string }).code
      : (error instanceof Error && error.message === 'confidential-migration-lease-lost'
        ? 'migration-lease-lost'
        : 'migration-failed');
    try {
      await runTransaction(db, async (transaction) => {
        const markerSnapshot = await transaction.get(markerRef);
        const marker = markerSnapshot.exists() ? markerSnapshot.data() : undefined;
        if (marker?.leaseId !== runId) return;
        transaction.set(markerRef, {
          status: 'error',
          version: 1,
          updatedAt: new Date().toISOString(),
          migratedDocuments,
          totalDocuments,
          counts,
          currentCollection,
          errorCode,
          failedCollection: currentCollection,
          leaseId: '',
          leaseUntilMs: 0,
        }, { merge: true });
      });
    } catch (markerError) {
      console.error('Could not record confidential migration failure status.', markerError);
    }
    throw error;
  }
}

export function migrateConfidentialDataToOwnerPrivate(forceResume = false): Promise<ConfidentialMigrationResult> {
  if (localConfidentialMigrationTask) return localConfidentialMigrationTask;
  localConfidentialMigrationTask = runConfidentialDataMigration(forceResume).finally(() => {
    localConfidentialMigrationTask = null;
  });
  return localConfidentialMigrationTask;
}

// Test initial connection
export const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    await ensureAuth();
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or connecting...");
    }
    return false;
  }
};

// Cross-tab / cross-window real-time synchronization channel
export const posRealtimeChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('lamsa_pos_realtime_v1')
  : null;

// ========================================================
// REAL-TIME SALES SYNCHRONIZATION (Zero mock/fake sales)
// ========================================================

/**
 * Real-time listener for sales across all devices.
 * Distinguishes between initial load of historical sales and live new sales added in real-time.
 */
export const subscribeToSales = (
  onUpdate: (sales: Sale[]) => void,
  onLiveSaleAdded?: (newSale: Sale, isRemote: boolean) => void
) => {
  const seenSaleIds = new Set<string>();
  let isInitialSnapshot = true;
  return subscribeToConfidentialCollection<Sale>('sales', (list, pendingWriteIds) => {
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate(list);
    if (isInitialSnapshot) {
      list.forEach((sale) => seenSaleIds.add(sale.id));
      isInitialSnapshot = false;
    } else {
      list.forEach((sale) => {
        if (seenSaleIds.has(sale.id)) return;
        seenSaleIds.add(sale.id);
        onLiveSaleAdded?.(sale, !pendingWriteIds.has(sale.id));
      });
    }
  });
};

export const addSaleCloud = async (sale: Sale, updatedProducts?: Product[]) => {
  await ensureAuth();
  const batch = writeBatch(db);
  stageConfidentialWrite(batch, 'sales', sale.id, sale as unknown as ConfidentialRecord);
  if (updatedProducts && updatedProducts.length > 0) {
    try {
      updatedProducts.forEach((p) => {
        stageConfidentialWrite(batch, 'products', p.id.toString(), p as unknown as ConfidentialRecord, true);
      });
      await batch.commit();
    } catch (prodErr) {
      console.warn("Product stock cloud sync warning:", prodErr);
    }
  } else {
    await batch.commit();
  }

  if (posRealtimeChannel) {
    try {
      const publicSale = sanitizeOperationalRecord<Sale>('sales', sale);
      posRealtimeChannel.postMessage({ type: 'LIVE_SALE', sale: publicSale, timestamp: Date.now() });
    } catch {}
  }
};

export const deleteSaleCloud = async (saleId: string) => {
  await ensureAuth();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'sales', saleId));
  if (isOwnerSession()) batch.delete(privateRecordRef('sales', saleId));
  await batch.commit();
};

export const deleteSaleAndRestoreInventoryCloud = async (
  saleId: string,
  restoredProducts?: Product[]
) => {
  await ensureAuth();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'sales', saleId));
  if (isOwnerSession()) batch.delete(privateRecordRef('sales', saleId));

  if (restoredProducts && restoredProducts.length > 0) {
    restoredProducts.forEach((p) => {
      stageConfidentialWrite(batch, 'products', p.id.toString(), p as unknown as ConfidentialRecord, true);
    });
  }

  await batch.commit();
};

/**
 * Reverse a sale transaction instead of deleting it (Strict Non-deletion Financial Rule)
 */
export const reverseSaleCloud = async (
  sale: Sale, 
  reversalReason: string, 
  reversedBy: string,
  restoredProducts?: Product[]
) => {
  await ensureAuth();
  const batch = writeBatch(db);

  // Update sale with reversal flag
  const updatedSale: Partial<Sale> = {
    ...sale,
    isReversed: true,
    reversalReason,
    reversedBy,
    reversedAt: new Date().toISOString()
  };
  stageConfidentialWrite(batch, 'sales', sale.id, updatedSale as ConfidentialRecord, true);

  // Restore inventory if provided
  if (restoredProducts && restoredProducts.length > 0) {
    restoredProducts.forEach(p => {
      stageConfidentialWrite(batch, 'products', p.id.toString(), p as unknown as ConfidentialRecord, true);
    });
  }

  await batch.commit();
};

export const clearAllSalesCloud = async (sales: Sale[]) => {
  await ensureAuth();
  const batch = writeBatch(db);
  sales.forEach((s) => {
    batch.delete(doc(db, 'sales', s.id));
    if (isOwnerSession()) batch.delete(privateRecordRef('sales', s.id));
  });
  await batch.commit();
};

// ========================================================
// REAL-TIME PRODUCTS SYNCHRONIZATION
// ========================================================

export const subscribeToProducts = (
  onUpdate: (products: Product[]) => void, 
  seedIfEmpty?: Product[]
) => {
  return subscribeToConfidentialCollection<Product>('products', (records) => {
    const list = records.map((data) => ({ ...data, id: Number(data.id) || data.id }));
    list.sort((a, b) => Number(a.id) - Number(b.id));
    if (list.length > 0) {
      onUpdate(list);
    }
  }, seedIfEmpty && seedIfEmpty.length > 0 ? () => seedProductsCloud(seedIfEmpty) : undefined);
};

export const seedProductsCloud = async (products: Product[]) => {
  await ensureAuth();
  const chunkSize = 200;
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      stageConfidentialWrite(batch, 'products', p.id.toString(), p as unknown as ConfidentialRecord);
    });
    await batch.commit();
  }
};

export const saveProductCloud = async (product: Product) => {
  await saveConfidentialDocument('products', product.id.toString(), product as unknown as ConfidentialRecord, true);
};

export const deleteProductCloud = async (productId: number | string) => {
  await ensureAuth();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'products', productId.toString()));
  if (isOwnerSession()) batch.delete(privateRecordRef('products', productId.toString()));
  await batch.commit();
};

// ========================================================
// REAL-TIME EXPENSES SYNCHRONIZATION
// ========================================================

export const subscribeToExpenses = (
  onUpdate: (expenses: Expense[]) => void,
  seedIfEmpty?: Expense[]
) => {
  if (!isOwnerSession()) {
    onUpdate([]);
    return () => {};
  }
  const expensesCol = collection(db, 'expenses');

  return onSnapshot(expensesCol, async (snapshot) => {
    if (snapshot.empty && seedIfEmpty && seedIfEmpty.length > 0) {
      try {
        const batch = writeBatch(db);
        seedIfEmpty.forEach((e) => {
          const eRef = doc(db, 'expenses', e.id);
          batch.set(eRef, cleanForFirestore(e));
        });
        await batch.commit();
      } catch (e) {
        console.error("Error seeding initial expenses:", e);
      }
      return;
    }

    const list: Expense[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Expense;
      list.push({ ...data, id: docSnap.id });
    });
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'expenses');
  });
};

export const saveExpenseCloud = async (expense: Expense) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('المصروفات متاحة للمالك فقط.');
  await setDoc(doc(db, 'expenses', expense.id), cleanForFirestore(expense), { merge: true });
};

export const deleteExpenseCloud = async (expenseId: string) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('المصروفات متاحة للمالك فقط.');
  await deleteDoc(doc(db, 'expenses', expenseId));
};

// ========================================================
// REAL-TIME SETTINGS SYNCHRONIZATION
// ========================================================

export const subscribeToSettings = (
  onUpdate: (settings: StoreSettings) => void,
  initialFallback: StoreSettings
) => {
  const operationalFallback = toOperationalSettings(initialFallback, initialFallback);
  return subscribeToConfidentialCollection<StoreSettings>('settings', (records) => {
    const data = records.find((record) => (record as StoreSettings & { id?: string }).id === 'store');
    if (!data) {
      onUpdate(isOwnerSession() ? initialFallback : operationalFallback);
      return;
    }
    const visibleData = isOwnerSession() ? data : toOperationalSettings(data, initialFallback);
    onUpdate({
      ...operationalFallback,
      ...visibleData,
      logoUrl: visibleData.logoUrl || operationalFallback.logoUrl,
      storeSlogan: visibleData.storeSlogan || operationalFallback.storeSlogan,
    });
  }, isOwnerSession() ? () => saveSettingsCloud(initialFallback) : undefined);
};

export const saveSettingsCloud = async (settings: StoreSettings) => {
  await saveConfidentialDocument('settings', 'store', settings as unknown as ConfidentialRecord, true);
};

// ========================================================
// REAL-TIME BOTTLE SIZES SYNCHRONIZATION
// ========================================================

export const subscribeToBottleSizes = (
  onUpdate: (sizes: BottleSize[]) => void,
  initialFallback: BottleSize[]
) => {
  return subscribeToConfidentialCollection<BottleSize>('bottleSizes', (records) => {
    const list = records.map((data) => isOwnerSession() ? data : ({
      ...data,
      officialCost: 0,
      bottleCost: 0,
      alcoholCost: 0,
      fixativeCost: 0,
    } as BottleSize));
    list.sort((a, b) => b.sizeMl - a.sizeMl);
    if (list.length > 0) {
      onUpdate(list);
    }
  }, initialFallback.length > 0 ? () => saveBottleSizesCloud(initialFallback) : undefined);
};

export const saveBottleSizesCloud = async (sizes: BottleSize[]) => {
  await ensureAuth();
  const batch = writeBatch(db);
  sizes.forEach((b) => {
    stageConfidentialWrite(batch, 'bottleSizes', b.id, b as unknown as ConfidentialRecord);
  });
  await batch.commit();
};

// ========================================================
// REAL-TIME FINANCIAL VAULTS & WITHDRAWALS SYNCHRONIZATION
// ========================================================

export const subscribeToVaults = (
  onUpdate: (vaults: FinancialVault[]) => void,
  initialFallback?: FinancialVault[]
) => {
  if (!isOwnerSession()) {
    onUpdate([]);
    return () => {};
  }
  const vaultsCol = collection(db, 'vaults');

  return onSnapshot(vaultsCol, async (snapshot) => {
    if (snapshot.empty && initialFallback && initialFallback.length > 0) {
      try {
        const batch = writeBatch(db);
        initialFallback.forEach((v) => {
          const vRef = doc(db, 'vaults', v.id);
          batch.set(vRef, cleanForFirestore(v));
        });
        await batch.commit();
      } catch (e) {
        console.error("Error seeding financial vaults:", e);
      }
      return;
    }

    const list: FinancialVault[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as FinancialVault);
    });
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'vaults');
  });
};

export const saveVaultCloud = async (vault: FinancialVault) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('الخزائن المالية متاحة للمالك فقط.');
  await setDoc(doc(db, 'vaults', vault.id), cleanForFirestore(vault), { merge: true });
};

export const saveAllVaultsCloud = async (vaults: FinancialVault[]) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('الخزائن المالية متاحة للمالك فقط.');
  const batch = writeBatch(db);
  vaults.forEach((v) => {
    const vRef = doc(db, 'vaults', v.id);
    batch.set(vRef, cleanForFirestore(v));
  });
  await batch.commit();
};

export const subscribeToWithdrawals = (
  onUpdate: (withdrawals: WithdrawalTransaction[]) => void
) => {
  if (!isOwnerSession()) {
    onUpdate([]);
    return () => {};
  }
  const withdrawalsCol = collection(db, 'withdrawals');
  const q = query(withdrawalsCol);

  return onSnapshot(q, (snapshot) => {
    const list: WithdrawalTransaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as WithdrawalTransaction);
    });
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'withdrawals');
  });
};

export const addWithdrawalCloud = async (
  tx: WithdrawalTransaction,
  updatedVault?: FinancialVault
) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('السحوبات المالية متاحة للمالك فقط.');
  const batch = writeBatch(db);
  const txRef = doc(db, 'withdrawals', tx.id);
  batch.set(txRef, cleanForFirestore(tx));
  if (updatedVault) {
    const vRef = doc(db, 'vaults', updatedVault.id);
    batch.set(vRef, cleanForFirestore(updatedVault), { merge: true });
  }
  await batch.commit();
};

// ========================================================
// 8. STAFF ATTENDANCE & SHIFT OPENING (حضور وفتح المتجر)
// ========================================================
export const subscribeToStaffAttendance = (
  onUpdate: (records: StaffAttendanceRecord[]) => void
) => {
  return subscribeToConfidentialCollection<StaffAttendanceRecord>('staff_attendance', (list) => {
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  });
};

export const saveStaffAttendanceCloud = async (record: StaffAttendanceRecord) => {
  await saveConfidentialDocument('staff_attendance', record.id, record as unknown as ConfidentialRecord, true);
};

// ========================================================
// 9. PRODUCTION BATCHES (إدارة دفعات الإنتاج والتشغيل)
// ========================================================
export const subscribeToProductionBatches = (
  onUpdate: (batches: ProductionBatch[]) => void
) => {
  if (!isOwnerSession()) {
    onUpdate([]);
    return () => {};
  }
  const batchesCol = collection(db, 'production_batches');
  const q = query(batchesCol);

  return onSnapshot(q, (snapshot) => {
    const list: ProductionBatch[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as ProductionBatch);
    });
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'production_batches');
  });
};

export const saveProductionBatchCloud = async (batchRecord: ProductionBatch) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('دفعات الإنتاج وتكاليفها متاحة للمالك فقط.');
  const docRef = doc(db, 'production_batches', batchRecord.id);
  await setDoc(docRef, cleanForFirestore(batchRecord), { merge: true });
};

// ========================================================
// 10. IMMUTABLE AUDIT LOG (سجل التغييرات غير القابل للحذف)
// ========================================================
export const subscribeToAuditLogs = (
  onUpdate: (logs: AuditLogRecord[]) => void
) => {
  if (!isOwnerSession()) {
    onUpdate([]);
    return () => {};
  }
  const logsCol = collection(db, 'audit_logs');
  const q = query(logsCol);

  return onSnapshot(q, (snapshot) => {
    const list: AuditLogRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as AuditLogRecord);
    });
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'audit_logs');
  });
};

export const addAuditLogCloud = async (logRecord: AuditLogRecord) => {
  await ensureAuth();
  const docRef = doc(db, 'audit_logs', logRecord.id);
  await setDoc(docRef, cleanForFirestore(logRecord), { merge: true });
};

// ========================================================
// 11. USERS & RBAC PERMISSIONS (إدارة المستخدمين والصلاحيات)
// ========================================================

export const subscribeToAppUsers = (
  onUpdate: (users: AppUser[]) => void,
  seedIfEmpty?: AppUser[]
) => {
  if (!isOwnerSession()) {
    onUpdate([]);
    return () => {};
  }
  const usersCol = collection(db, 'app_users');
  return onSnapshot(usersCol, async (snapshot) => {
    if (snapshot.empty && seedIfEmpty && seedIfEmpty.length > 0) {
      try {
        await seedInitialUsersCloud(seedIfEmpty);
      } catch (e) {
        console.error("Error seeding initial users:", e);
      }
      return;
    }
    const list: AppUser[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({ ...data, id: docSnap.id, passwordHash: '', requiresPasswordChange: false } as AppUser);
    });
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'app_users');
  });
};

export const saveAppUserCloud = async (user: AppUser, previousEmail?: string) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('إدارة حسابات الموظفين متاحة للمالك فقط.');
  let confidentialMigrationComplete = user.role === 'OWNER';
  if (user.role !== 'OWNER') {
    const migration = await getDoc(doc(db, PRIVATE_COLLECTION, PRIVATE_MIGRATION_MARKER));
    const migrationData = migration.data();
    confidentialMigrationComplete = migrationData?.status === 'complete' && migrationData?.version === 1;
    if (user.isActive && !confidentialMigrationComplete) {
      throw new Error('لا يمكن تفعيل مستخدم محدود قبل اكتمال عزل البيانات الخاصة.');
    }
  }
  const safeUser: AppUser = {
    ...user,
    permissions: user.role !== 'OWNER'
      ? { ...user.permissions, ...OWNER_ONLY_PERMISSION_OVERRIDES }
      : user.permissions,
    passwordHash: '',
    requiresPasswordChange: false,
  };
  const email = (user.authEmail || '').trim().toLowerCase();
  const oldEmail = (previousEmail || '').trim().toLowerCase();
  const batch = firestoreWriteBatch(db);
  batch.set(doc(db, 'app_users', user.id), cleanForFirestore(safeUser), { merge: true });
  if (email) {
    batch.set(doc(db, 'authorized_users', email), cleanForFirestore({
      email,
      authEmail: email,
      username: safeUser.username,
      appUserId: safeUser.id,
      displayName: safeUser.displayName,
      role: safeUser.role,
      isActive: safeUser.isActive,
      migrationReady: safeUser.role === 'OWNER' || (safeUser.isActive && confidentialMigrationComplete),
      permissions: safeUser.permissions,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  }
  if (oldEmail && oldEmail !== email) {
    batch.delete(doc(db, 'authorized_users', oldEmail));
  }
  await batch.commit();
};

export const seedInitialUsersCloud = async (users: AppUser[]) => {
  await ensureAuth();
  if (!isOwnerSession()) throw new Error('إدارة حسابات الموظفين متاحة للمالك فقط.');
  const batch = writeBatch(db);
  users.forEach((u) => {
    const docRef = doc(db, 'app_users', u.id);
    batch.set(docRef, cleanForFirestore({ ...u, passwordHash: '', requiresPasswordChange: false }), { merge: true });
  });
  await batch.commit();
};

// ========================================================
// 12. DAILY CLOSURES (فتح وإغلاق اليوم التشغيلي)
// ========================================================

export const subscribeToDailyClosures = (
  onUpdate: (closures: DailyClosure[]) => void
) => {
  return subscribeToConfidentialCollection<DailyClosure>('daily_closures', (list) => {
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  });
};

export const saveDailyClosureCloud = async (closure: DailyClosure) => {
  await saveConfidentialDocument('daily_closures', closure.id, closure as unknown as ConfidentialRecord, true);
};

// ========================================================
// 13. PURCHASE REQUESTS (طلبات الشراء والتوريد)
// ========================================================

export const subscribeToPurchaseRequests = (
  onUpdate: (requests: PurchaseRequest[]) => void
) => {
  return subscribeToConfidentialCollection<PurchaseRequest>('purchase_requests', (list) => {
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  });
};

export const savePurchaseRequestCloud = async (request: PurchaseRequest) => {
  await saveConfidentialDocument('purchase_requests', request.id, request as unknown as ConfidentialRecord, true);
};

// ========================================================
// 14. CUSTOMER REQUESTS (طلبات المنتجات غير المتوفرة)
// ========================================================

export const subscribeToCustomerRequests = (
  onUpdate: (requests: CustomerRequest[]) => void
) => {
  return subscribeToConfidentialCollection<CustomerRequest>('customer_requests', (list) => {
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  });
};

export const saveCustomerRequestCloud = async (request: CustomerRequest) => {
  await saveConfidentialDocument('customer_requests', request.id, request as unknown as ConfidentialRecord, true);
};

// ========================================================
// 15. STOCK CHECKS (تسجيل الجرد الفعلي وفروقات المخزون)
// ========================================================

export const subscribeToStockChecks = (
  onUpdate: (checks: StockCheckRecord[]) => void
) => {
  return subscribeToConfidentialCollection<StockCheckRecord>('stock_checks', (list) => {
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  });
};

export const saveStockCheckCloud = async (record: StockCheckRecord) => {
  await saveConfidentialDocument('stock_checks', record.id, record as unknown as ConfidentialRecord, true);
};

// ========================================================
// 16. CUSTOMERS & LOYALTY CRM RECORDS (العملاء والولاء الفعليون)
// ========================================================

export const isVirtualDemoCustomer = (c?: Partial<CustomCustomerRecord> | null): boolean => {
  if (!c) return true;
  const phone = (c.phone || '').trim();
  const name = (c.name || '').trim();
  if (
    phone === '01098765432' ||
    phone === '01123456789' ||
    name === 'أ. محمود الشافعي' ||
    name === 'د. سارة المنصوري'
  ) {
    return true;
  }
  return false;
};

export const getCustomerDocId = (c: Partial<CustomCustomerRecord>): string => {
  if (c.id && c.id.trim()) return c.id.trim().replace(/[\/\\.#$\[\]]/g, '_');
  const cleanPhone = (c.phone || '').replace(/\D/g, '');
  if (cleanPhone) return `cust_${cleanPhone}`;
  const cleanName = (c.name || 'customer')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[\/\\.#$\[\]]/g, '');
  return `cust_${cleanName || Date.now()}`;
};

export const subscribeToCustomCustomers = (
  onUpdate: (customers: CustomCustomerRecord[]) => void
) => {
  return subscribeToConfidentialCollection<CustomCustomerRecord>('customers', (records) => {
    const list = records.filter((customer) => !isVirtualDemoCustomer(customer));
    list.sort((a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
    onUpdate(list);
  });
};

export const saveCustomCustomerCloud = async (record: CustomCustomerRecord) => {
  if (isVirtualDemoCustomer(record)) return;
  const docId = getCustomerDocId(record);
  await saveConfidentialDocument('customers', docId, {
      ...record,
      id: docId,
      updatedAt: new Date().toISOString(),
    }, true);
};

export const deleteCustomCustomerCloud = async (record: Partial<CustomCustomerRecord>) => {
  await ensureAuth();
  const docId = getCustomerDocId(record);
  await deleteDoc(doc(db, 'customers', docId));
  if (isOwnerSession()) await deleteDoc(privateRecordRef('customers', docId));
};

// ========================================================
// 17. SAVED MIX FORMULAS (وصفات الميكسات العطرية المحفوظة)
// ========================================================

export const subscribeToSavedMixes = (
  onUpdate: (mixes: SavedMixFormula[]) => void
) => {
  return subscribeToConfidentialCollection<SavedMixFormula>('saved_mixes', (list) => {
    list.sort((a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
    onUpdate(list);
  });
};

export const saveSavedMixCloud = async (formula: SavedMixFormula) => {
  await saveConfidentialDocument('saved_mixes', formula.id, {
      ...formula,
      updatedAt: new Date().toISOString(),
    }, true);
};

export const deleteSavedMixCloud = async (mixId: string) => {
  await ensureAuth();
  await deleteDoc(doc(db, 'saved_mixes', mixId));
  if (isOwnerSession()) await deleteDoc(privateRecordRef('saved_mixes', mixId));
};
