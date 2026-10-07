import { 
  Product, 
  Sale, 
  StoreSettings, 
  StrategicReplenishmentOrder, 
  StrategicOrderItem, 
  StrategicOrderPriority,
  AppUser,
  getApprovedOilGramCost,
  isLiveProductionSale
} from '../types';
import { db, cleanForFirestore, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';

const LOCAL_STORAGE_ORDERS_KEY = 'lamsa_strategic_orders_v1';
export const DEFAULT_STRATEGIC_THRESHOLD_GRAMS = 150;

/**
 * Calculates priority, suggested order quantity, and reason for replenishment
 */
export function calculateItemReplenishmentPriority(
  product: Product,
  recentSales: Sale[],
  settings: StoreSettings
): {
  priority: StrategicOrderPriority;
  suggestedGrams: number;
  priorityReason: string;
  unitCost: number;
} {
  const stock = product.stock_grams;
  const threshold = product.strategicThresholdGrams || DEFAULT_STRATEGIC_THRESHOLD_GRAMS;

  // Determine cost per gram (10 EGP Normal, 15 EGP Niche, 20 EGP Oud/Musk)
  const isSpecial = ['عود', 'مسك', 'نيش'].includes(product.type);
  const unitCost = getApprovedOilGramCost(product.type, settings);

  // 1. Calculate sales in the last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoffStr = fourteenDaysAgo.toISOString();

  let gramsSoldLast14Days = 0;
  recentSales.forEach(s => {
    if (s.date >= cutoffStr && isLiveProductionSale(s)) {
      s.items.forEach(it => {
        if (it.productId === product.id) {
          gramsSoldLast14Days += it.essenceGrams || 0;
        }
      });
    }
  });

  const dailyVelocityGrams = gramsSoldLast14Days / 14;
  const daysOfStockLeft = dailyVelocityGrams > 0 ? stock / dailyVelocityGrams : 999;

  // 2. Suggested reorder quantity (Standard minimum is 500g or 1000g depending on velocity)
  let suggestedGrams = 500;
  if (dailyVelocityGrams > 20 || stock <= 50) {
    suggestedGrams = 1000;
  } else if (isSpecial) {
    suggestedGrams = 250; // Oud & Musk typically ordered in 250g or 500g batches
  }

  // 3. Priority & reasoning rules
  let priority: StrategicOrderPriority = 'متوسط';
  let priorityReason = '';

  if (stock <= 0) {
    priority = 'عاجل جداً';
    priorityReason = '🚨 المخزون منعدم تماماً (0 جم) - الزبائن يطلبون هذا الصنف ويجب توريده فوراً لمنع فقدان المبيعات.';
  } else if (stock <= 50 || daysOfStockLeft <= 2) {
    priority = 'عاجل جداً';
    priorityReason = `⚠️ رصيد حرج (${stock} جم) يكفي لأقل من يومين تشغيل بناءً على معدل السحب اليومي (${dailyVelocityGrams.toFixed(1)} جم/يوم).`;
  } else if (stock <= 100 || daysOfStockLeft <= 5) {
    priority = 'عاجل';
    priorityReason = `معدل مبيعات نشط والمخزون المتبقي (${stock} جم) قارب على النفاذ؛ يحتاج توريد سريع قبل عطلة نهاية الأسبوع.`;
  } else if (stock <= threshold) {
    if (product.type === 'عود' || product.type === 'مسك') {
      priority = 'مهم';
      priorityReason = `صنف ذو قيمة وهوامش ربح عالية وصل لحد الطلب الاستراتيجي (${threshold} جم).`;
    } else {
      priority = 'مهم';
      priorityReason = `وصل لحد الأمان الاستراتيجي (${threshold} جم)؛ يقترح إدراجه ضمن دورة الشراء القادمة.`;
    }
  } else {
    priority = 'منخفض';
    priorityReason = 'المخزون ضمن الحدود الآمنة ولكن يقترح للتجديد الموسمي.';
  }

  return {
    priority,
    suggestedGrams,
    priorityReason,
    unitCost
  };
}

/**
 * Builds or refreshes the live Strategic Replenishment Order
 */
export function generateStrategicReplenishmentOrder(
  products: Product[],
  recentSales: Sale[],
  settings: StoreSettings,
  existingOrder?: StrategicReplenishmentOrder | null
): StrategicReplenishmentOrder {
  // Find all products that reached or breached their strategic reorder threshold
  const shortageProducts = products.filter(p => {
    const threshold = p.strategicThresholdGrams || DEFAULT_STRATEGIC_THRESHOLD_GRAMS;
    return p.stock_grams <= threshold;
  });

  const now = new Date();
  const cairoDate = now.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // Map each product to an itemized order line
  const items: StrategicOrderItem[] = shortageProducts.map(p => {
    const { priority, suggestedGrams, priorityReason, unitCost } = calculateItemReplenishmentPriority(p, recentSales, settings);
    
    // Check if user already customized suggested quantity in an existing order
    const prevItem = existingOrder?.items.find(it => it.productId === p.id);
    const finalGrams = prevItem?.suggestedOrderGrams || suggestedGrams;
    const finalCostPerGram = prevItem?.unitCostPerGram || unitCost;

    return {
      productId: p.id,
      productName: p.name,
      brand: p.brand,
      type: p.type,
      currentStockGrams: p.stock_grams,
      strategicThresholdGrams: p.strategicThresholdGrams || DEFAULT_STRATEGIC_THRESHOLD_GRAMS,
      suggestedOrderGrams: finalGrams,
      unitCostPerGram: finalCostPerGram,
      totalEstimatedCost: finalGrams * finalCostPerGram,
      priority,
      priorityReason,
      linkedSeasonOrEvent: p.season || 'كل الفصول',
      status: prevItem?.status || 'قيد الطلب'
    };
  });

  // Sort: most urgent first (عاجل جداً -> عاجل -> مهم -> متوسط -> منخفض)
  const priorityOrder: Record<StrategicOrderPriority, number> = {
    'عاجل جداً': 0,
    'عاجل': 1,
    'مهم': 2,
    'متوسط': 3,
    'منخفض': 4
  };

  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const totalGrams = items.reduce((sum, it) => sum + it.suggestedOrderGrams, 0);
  const totalEstimatedCost = items.reduce((sum, it) => sum + it.totalEstimatedCost, 0);

  const orderNumber = existingOrder?.orderNumber || `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  return {
    id: existingOrder?.id || `po-${Date.now()}`,
    orderNumber,
    createdAt: existingOrder?.createdAt || new Date().toISOString(),
    supplierName: existingOrder?.supplierName || 'شركة توريد الزيوت العطرية والخامات المعتمدة',
    supplierPhone: existingOrder?.supplierPhone || '',
    items,
    totalGrams,
    totalEstimatedCost,
    status: existingOrder?.status || 'بانتظار الاعتماد',
    approvedBy: existingOrder?.approvedBy,
    approvedAt: existingOrder?.approvedAt,
    notes: existingOrder?.notes || 'تم الإنشاء تلقائياً فور بلوغ المخزون لحد الطلب الاستراتيجي المحدد بالمحل.',
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Generates an official, beautifully formatted Arabic text message
 * suitable for instant copying or sharing directly via WhatsApp Web / App.
 */
export function formatOrderForWhatsApp(order: StrategicReplenishmentOrder, storeSettings: StoreSettings): string {
  const dateStr = new Date(order.createdAt).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let text = `*طلب توريد خامات ونواقص عطرية رسمية*\n`;
  text += `🏛️ *${storeSettings.storeName}* - ${storeSettings.storeSlogan || 'أرقى الزيوت العطرية'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📄 *رقم الطلب:* \`${order.orderNumber}\`\n`;
  text += `📅 *التاريخ:* ${dateStr}\n`;
  text += `👤 *المورد المعتمد:* ${order.supplierName}\n`;
  text += `📦 *إجمالي الأصناف المطلوبة:* ${order.items.length} صنف\n`;
  text += `⚖️ *إجمالي الوزن المطلوب:* ${order.totalGrams.toLocaleString('ar-EG')} جم (~${(order.totalGrams / 1000).toFixed(2)} كجم)\n`;
  text += `💰 *القيمة التقديرية:* ${order.totalEstimatedCost.toLocaleString('ar-EG')} ${storeSettings.currency}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `*قائمة الأصناف والنواقص الاستراتيجية:*\n\n`;

  order.items.forEach((item, index) => {
    const priorityIcon = 
      item.priority === 'عاجل جداً' ? '🚨' :
      item.priority === 'عاجل' ? '⚠️' :
      item.priority === 'مهم' ? '🔶' : '🔹';

    text += `${index + 1}. *${item.productName}* (${item.brand})\n`;
    text += `   • النوع: ${item.type} | الحالي بالمحل: ${item.currentStockGrams} جم\n`;
    text += `   • *الكمية المطلوبة:* *${item.suggestedOrderGrams} جم* (${priorityIcon} ${item.priority})\n`;
    text += `   • التكلفة التقديرية: ~${item.totalEstimatedCost.toLocaleString('ar-EG')} ${storeSettings.currency}\n`;
    if (item.priorityReason) {
      text += `   • سبب الطلب: ${item.priorityReason}\n`;
    }
    text += `\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📌 *حالة الاعتماد:* ${order.status === 'معتمد' ? '✅ معتمد رسمياً من إدارة المتجر' : '⏳ قيد المراجعة والاعتماد'}\n`;
  if (order.notes) {
    text += `📝 *ملاحظات إضافية:* ${order.notes}\n`;
  }
  text += `\nيرجى تأكيد الاستلام وموعد التوريد وتجهيز الدفعة. شكراً لتعاونكم المثمر!`;

  return text;
}

/**
 * Direct WhatsApp Link Generator
 */
export function openOrderInWhatsApp(order: StrategicReplenishmentOrder, storeSettings: StoreSettings, phone?: string): void {
  const text = formatOrderForWhatsApp(order, storeSettings);
  const encodedText = encodeURIComponent(text);
  const cleanPhone = (phone || order.supplierPhone || '').replace(/[^0-9]/g, '');

  let url = '';
  if (cleanPhone.length >= 10) {
    // Add Egypt prefix 20 if starting with 01
    const finalPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;
    url = `https://wa.me/${finalPhone}?text=${encodedText}`;
  } else {
    url = `https://wa.me/?text=${encodedText}`;
  }

  try {
    const win = window.open(url, '_blank');
    if (!win) {
      // Popup blocked, fallback to copying text
      navigator.clipboard?.writeText(text);
    }
  } catch (e) {
    navigator.clipboard?.writeText(text);
  }
}

/**
 * Storage & Firestore Sync
 */
export function getLocalStrategicOrders(): StrategicReplenishmentOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveLocalStrategicOrders(orders: StrategicReplenishmentOrder[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {}
}

export const subscribeToStrategicOrders = (callback: (orders: StrategicReplenishmentOrder[]) => void) => {
  const path = 'replenishment_orders';
  return onSnapshot(collection(db, path), (snapshot) => {
    const cloudOrders: StrategicReplenishmentOrder[] = [];
    snapshot.forEach(docSnap => {
      cloudOrders.push(docSnap.data() as StrategicReplenishmentOrder);
    });

    if (cloudOrders.length > 0) {
      saveLocalStrategicOrders(cloudOrders);
      callback(cloudOrders);
    } else {
      callback(getLocalStrategicOrders());
    }
  }, (err) => {
    console.warn('Strategic orders subscription error, using local fallback:', err);
    callback(getLocalStrategicOrders());
  });
};

export const saveStrategicOrderCloud = async (order: StrategicReplenishmentOrder): Promise<void> => {
  const path = 'replenishment_orders';
  try {
    const cleaned = cleanForFirestore(order);
    await setDoc(doc(db, path, order.id), cleaned);

    const current = getLocalStrategicOrders();
    const updated = [cleaned, ...current.filter(o => o.id !== order.id)];
    saveLocalStrategicOrders(updated);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${path}/${order.id}`);
  }
};
