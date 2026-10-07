import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
  orderBy,
  getDocFromServer,
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

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the specific provisioned database
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = (() => {
  try {
    const settings = {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    };
    return dbId && dbId !== '(default)'
      ? initializeFirestore(app, settings, dbId)
      : initializeFirestore(app, settings);
  } catch (error) {
    console.warn('Persistent Firestore cache is unavailable; using the default cache.', error);
    return dbId && dbId !== '(default)'
      ? getFirestore(app, dbId)
      : getFirestore(app);
  }
})();

const rolePermissions = (role: UserRole): AppUser['permissions'] => {
  if (role === 'OWNER') return OWNER_FULL_PERMISSIONS;
  if (role === 'STORE_MANAGER') return TAREK_OPERATIONAL_PERMISSIONS;
  if (role === 'INVENTORY_KEEPER') return INVENTORY_KEEPER_PERMISSIONS;
  return CASHIER_STANDARD_PERMISSIONS;
};

export const loadAuthorizedAppUser = async (firebaseUser: User): Promise<AppUser> => {
  const email = firebaseUser.email?.trim().toLowerCase();
  if (!email || !firebaseUser.emailVerified || firebaseUser.isAnonymous) {
    throw new Error('يلزم الدخول بحساب Google موثّق.');
  }

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
    permissions: { ...rolePermissions(role), ...(profile.permissions || {}) },
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
  onAuthStateChanged(auth, callback);

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
  if (auth.currentUser) await signOut(auth);
};

export const getCurrentFirebaseUser = (): User | null => auth.currentUser;

export const ensureAuth = async (): Promise<User> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || !user.email || !user.emailVerified) {
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
  const salesCol = collection(db, 'sales');
  const q = query(salesCol);
  const seenSaleIds = new Set<string>();
  let isInitialSnapshot = true;

  return onSnapshot(q, (snapshot) => {
    const list: Sale[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Sale;
      list.push({ ...data, id: docSnap.id });
    });
    // Sort newest first
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate(list);

    // CRITICAL: Only trigger live alert for new documents added in real-time AFTER the initial load!
    // Historical/past sales are loaded silently without buzzing or alerting.
    if (isInitialSnapshot) {
      snapshot.forEach((docSnap) => seenSaleIds.add(docSnap.id));
      isInitialSnapshot = false;
    } else {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !seenSaleIds.has(change.doc.id)) {
          seenSaleIds.add(change.doc.id);
          const newSale = { ...(change.doc.data() as Sale), id: change.doc.id };
          const isRemote = !change.doc.metadata.hasPendingWrites;
          if (onLiveSaleAdded) {
            onLiveSaleAdded(newSale, isRemote);
          }
        }
      });
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'sales');
  });
};

export const addSaleCloud = async (sale: Sale, updatedProducts?: Product[]) => {
  await ensureAuth();

  // 1. Immediately persist the sale document so all connected devices sync instantaneously
  const saleRef = doc(db, 'sales', sale.id);
  await setDoc(saleRef, cleanForFirestore(sale));

  // 2. Synchronize product inventory stock deductions in the cloud
  if (updatedProducts && updatedProducts.length > 0) {
    try {
      const batch = writeBatch(db);
      updatedProducts.forEach((p) => {
        const pRef = doc(db, 'products', p.id.toString());
        batch.set(pRef, cleanForFirestore(p), { merge: true });
      });
      await batch.commit();
    } catch (prodErr) {
      console.warn("Product stock cloud sync warning:", prodErr);
    }
  }

  // 3. Notify other local browser windows and tabs immediately
  if (posRealtimeChannel) {
    try {
      posRealtimeChannel.postMessage({ type: 'LIVE_SALE', sale, timestamp: Date.now() });
    } catch {}
  }
};

export const deleteSaleCloud = async (saleId: string) => {
  await ensureAuth();
  await deleteDoc(doc(db, 'sales', saleId));
};

export const deleteSaleAndRestoreInventoryCloud = async (
  saleId: string,
  restoredProducts?: Product[]
) => {
  await ensureAuth();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'sales', saleId));

  if (restoredProducts && restoredProducts.length > 0) {
    restoredProducts.forEach((p) => {
      const pRef = doc(db, 'products', p.id.toString());
      batch.set(pRef, cleanForFirestore(p), { merge: true });
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
  const saleRef = doc(db, 'sales', sale.id);
  const updatedSale: Partial<Sale> = {
    ...sale,
    isReversed: true,
    reversalReason,
    reversedBy,
    reversedAt: new Date().toISOString()
  };
  batch.set(saleRef, cleanForFirestore(updatedSale), { merge: true });

  // Restore inventory if provided
  if (restoredProducts && restoredProducts.length > 0) {
    restoredProducts.forEach(p => {
      const pRef = doc(db, 'products', p.id.toString());
      batch.set(pRef, cleanForFirestore(p), { merge: true });
    });
  }

  await batch.commit();
};

export const clearAllSalesCloud = async (sales: Sale[]) => {
  await ensureAuth();
  const batch = writeBatch(db);
  sales.forEach((s) => {
    batch.delete(doc(db, 'sales', s.id));
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
  const productsCol = collection(db, 'products');

  return onSnapshot(productsCol, async (snapshot) => {
    if (snapshot.empty && seedIfEmpty && seedIfEmpty.length > 0) {
      // Seed initial perfume catalogue to cloud once if collection is empty
      try {
        await seedProductsCloud(seedIfEmpty);
      } catch (e) {
        console.error("Error seeding products:", e);
      }
      return;
    }

    const list: Product[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Product;
      list.push({ ...data, id: Number(docSnap.id) || data.id });
    });
    list.sort((a, b) => Number(a.id) - Number(b.id));
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'products');
  });
};

export const seedProductsCloud = async (products: Product[]) => {
  await ensureAuth();
  // Batch writes in chunks of 450 (Firestore limit is 500)
  const chunkSize = 400;
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      const pRef = doc(db, 'products', p.id.toString());
      batch.set(pRef, cleanForFirestore(p));
    });
    await batch.commit();
  }
};

export const saveProductCloud = async (product: Product) => {
  await ensureAuth();
  await setDoc(doc(db, 'products', product.id.toString()), cleanForFirestore(product), { merge: true });
};

export const deleteProductCloud = async (productId: number | string) => {
  await ensureAuth();
  await deleteDoc(doc(db, 'products', productId.toString()));
};

// ========================================================
// REAL-TIME EXPENSES SYNCHRONIZATION
// ========================================================

export const subscribeToExpenses = (
  onUpdate: (expenses: Expense[]) => void,
  seedIfEmpty?: Expense[]
) => {
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
  await setDoc(doc(db, 'expenses', expense.id), cleanForFirestore(expense), { merge: true });
};

export const deleteExpenseCloud = async (expenseId: string) => {
  await ensureAuth();
  await deleteDoc(doc(db, 'expenses', expenseId));
};

// ========================================================
// REAL-TIME SETTINGS SYNCHRONIZATION
// ========================================================

export const subscribeToSettings = (
  onUpdate: (settings: StoreSettings) => void,
  initialFallback: StoreSettings
) => {
  const settingsDocRef = doc(db, 'settings', 'store');

  return onSnapshot(settingsDocRef, async (docSnap) => {
    if (!docSnap.exists()) {
      try {
        await ensureAuth();
        await setDoc(settingsDocRef, cleanForFirestore(initialFallback));
      } catch (e) {
        console.error("Error creating initial cloud settings:", e);
      }
      return;
    }

    const data = docSnap.data() as StoreSettings;
    onUpdate({
      ...initialFallback,
      ...data,
      logoUrl: data.logoUrl || initialFallback.logoUrl,
      storeSlogan: data.storeSlogan || initialFallback.storeSlogan,
    });
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'settings/store');
  });
};

export const saveSettingsCloud = async (settings: StoreSettings) => {
  await ensureAuth();
  await setDoc(doc(db, 'settings', 'store'), cleanForFirestore(settings), { merge: true });
};

// ========================================================
// REAL-TIME BOTTLE SIZES SYNCHRONIZATION
// ========================================================

export const subscribeToBottleSizes = (
  onUpdate: (sizes: BottleSize[]) => void,
  initialFallback: BottleSize[]
) => {
  const bottleSizesCol = collection(db, 'bottleSizes');

  return onSnapshot(bottleSizesCol, async (snapshot) => {
    if (snapshot.empty && initialFallback && initialFallback.length > 0) {
      try {
        const batch = writeBatch(db);
        initialFallback.forEach((b) => {
          const bRef = doc(db, 'bottleSizes', b.id);
          batch.set(bRef, cleanForFirestore(b));
        });
        await batch.commit();
      } catch (e) {
        console.error("Error seeding bottle sizes:", e);
      }
      return;
    }

    const list: BottleSize[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as BottleSize;
      list.push({ ...data, id: docSnap.id });
    });
    list.sort((a, b) => b.sizeMl - a.sizeMl);
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'bottleSizes');
  });
};

export const saveBottleSizesCloud = async (sizes: BottleSize[]) => {
  await ensureAuth();
  const batch = writeBatch(db);
  sizes.forEach((b) => {
    const bRef = doc(db, 'bottleSizes', b.id);
    batch.set(bRef, cleanForFirestore(b));
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
  await setDoc(doc(db, 'vaults', vault.id), cleanForFirestore(vault), { merge: true });
};

export const saveAllVaultsCloud = async (vaults: FinancialVault[]) => {
  await ensureAuth();
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
  const attCol = collection(db, 'staff_attendance');
  const q = query(attCol);

  return onSnapshot(q, (snapshot) => {
    const list: StaffAttendanceRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as StaffAttendanceRecord);
    });
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'staff_attendance');
  });
};

export const saveStaffAttendanceCloud = async (record: StaffAttendanceRecord) => {
  await ensureAuth();
  const docRef = doc(db, 'staff_attendance', record.id);
  await setDoc(docRef, cleanForFirestore(record), { merge: true });
};

// ========================================================
// 9. PRODUCTION BATCHES (إدارة دفعات الإنتاج والتشغيل)
// ========================================================
export const subscribeToProductionBatches = (
  onUpdate: (batches: ProductionBatch[]) => void
) => {
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
  const docRef = doc(db, 'production_batches', batchRecord.id);
  await setDoc(docRef, cleanForFirestore(batchRecord), { merge: true });
};

// ========================================================
// 10. IMMUTABLE AUDIT LOG (سجل التغييرات غير القابل للحذف)
// ========================================================
export const subscribeToAuditLogs = (
  onUpdate: (logs: AuditLogRecord[]) => void
) => {
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
  const docRef = doc(db, 'app_users', user.id);
  const safeUser = { ...user, passwordHash: '', requiresPasswordChange: false };
  await setDoc(docRef, cleanForFirestore(safeUser), { merge: true });

  const email = (user.authEmail || '').trim().toLowerCase();
  if (email) {
    await setDoc(doc(db, 'authorized_users', email), cleanForFirestore({
      email,
      authEmail: email,
      username: user.username,
      appUserId: user.id,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      permissions: user.permissions,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  }

  const oldEmail = (previousEmail || '').trim().toLowerCase();
  if (oldEmail && oldEmail !== email) {
    await deleteDoc(doc(db, 'authorized_users', oldEmail));
  }
};

export const seedInitialUsersCloud = async (users: AppUser[]) => {
  await ensureAuth();
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
  const closuresCol = collection(db, 'daily_closures');
  return onSnapshot(closuresCol, (snapshot) => {
    const list: DailyClosure[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as DailyClosure);
    });
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'daily_closures');
  });
};

export const saveDailyClosureCloud = async (closure: DailyClosure) => {
  await ensureAuth();
  const docRef = doc(db, 'daily_closures', closure.id);
  await setDoc(docRef, cleanForFirestore(closure), { merge: true });
};

// ========================================================
// 13. PURCHASE REQUESTS (طلبات الشراء والتوريد)
// ========================================================

export const subscribeToPurchaseRequests = (
  onUpdate: (requests: PurchaseRequest[]) => void
) => {
  const reqCol = collection(db, 'purchase_requests');
  return onSnapshot(reqCol, (snapshot) => {
    const list: PurchaseRequest[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as PurchaseRequest);
    });
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'purchase_requests');
  });
};

export const savePurchaseRequestCloud = async (request: PurchaseRequest) => {
  await ensureAuth();
  const docRef = doc(db, 'purchase_requests', request.id);
  await setDoc(docRef, cleanForFirestore(request), { merge: true });
};

// ========================================================
// 14. CUSTOMER REQUESTS (طلبات المنتجات غير المتوفرة)
// ========================================================

export const subscribeToCustomerRequests = (
  onUpdate: (requests: CustomerRequest[]) => void
) => {
  const reqCol = collection(db, 'customer_requests');
  return onSnapshot(reqCol, (snapshot) => {
    const list: CustomerRequest[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as CustomerRequest);
    });
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'customer_requests');
  });
};

export const saveCustomerRequestCloud = async (request: CustomerRequest) => {
  await ensureAuth();
  const docRef = doc(db, 'customer_requests', request.id);
  await setDoc(docRef, cleanForFirestore(request), { merge: true });
};

// ========================================================
// 15. STOCK CHECKS (تسجيل الجرد الفعلي وفروقات المخزون)
// ========================================================

export const subscribeToStockChecks = (
  onUpdate: (checks: StockCheckRecord[]) => void
) => {
  const checksCol = collection(db, 'stock_checks');
  return onSnapshot(checksCol, (snapshot) => {
    const list: StockCheckRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as StockCheckRecord);
    });
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    onUpdate(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'stock_checks');
  });
};

export const saveStockCheckCloud = async (record: StockCheckRecord) => {
  await ensureAuth();
  const docRef = doc(db, 'stock_checks', record.id);
  await setDoc(docRef, cleanForFirestore(record), { merge: true });
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
  const custCol = collection(db, 'customers');
  return onSnapshot(
    custCol,
    (snapshot) => {
      const list: CustomCustomerRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CustomCustomerRecord;
        if (isVirtualDemoCustomer(data)) {
          deleteDoc(doc(db, 'customers', docSnap.id)).catch(() => {});
          return;
        }
        list.push({ ...data, id: docSnap.id });
      });
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'customers');
    }
  );
};

export const saveCustomCustomerCloud = async (record: CustomCustomerRecord) => {
  if (isVirtualDemoCustomer(record)) return;
  await ensureAuth();
  const docId = getCustomerDocId(record);
  const docRef = doc(db, 'customers', docId);
  await setDoc(
    docRef,
    cleanForFirestore({
      ...record,
      id: docId,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );
};

export const deleteCustomCustomerCloud = async (record: Partial<CustomCustomerRecord>) => {
  await ensureAuth();
  const docId = getCustomerDocId(record);
  await deleteDoc(doc(db, 'customers', docId));
};

// ========================================================
// 17. SAVED MIX FORMULAS (وصفات الميكسات العطرية المحفوظة)
// ========================================================

export const subscribeToSavedMixes = (
  onUpdate: (mixes: SavedMixFormula[]) => void
) => {
  const mixesCol = collection(db, 'saved_mixes');
  return onSnapshot(
    mixesCol,
    (snapshot) => {
      const list: SavedMixFormula[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SavedMixFormula;
        list.push({ ...data, id: docSnap.id });
      });
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'saved_mixes');
    }
  );
};

export const saveSavedMixCloud = async (formula: SavedMixFormula) => {
  await ensureAuth();
  const docRef = doc(db, 'saved_mixes', formula.id);
  await setDoc(
    docRef,
    cleanForFirestore({
      ...formula,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );
};

export const deleteSavedMixCloud = async (mixId: string) => {
  await ensureAuth();
  await deleteDoc(doc(db, 'saved_mixes', mixId));
};
