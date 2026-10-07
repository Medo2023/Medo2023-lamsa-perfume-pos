/**
 * Confidential boundary for role-limited operational copies.
 * Public fields are explicit allowlists; anything not listed remains private.
 */
export type ConfidentialDocument = Record<string, unknown>;
export interface SplitConfidentialDocument { publicData: ConfidentialDocument; privateData: ConfidentialDocument }
interface FieldPolicyMap { [field: string]: readonly string[] | FieldPolicyMap }
type FieldPolicy = readonly string[] | FieldPolicyMap;

const policies: Record<string, FieldPolicy> = {
  sales: {
    '*': ['id','items','totalPrice','date','customerName','customerPhone','paymentMethod','transactionType','discount','loyaltyPointsRedeemed','loyaltyDiscountAmount','loyaltyPointsEarned','customerLoyaltyBalanceAfter','packagingOptionId','packagingRevenueEgp','isBasicBagReplacedByLuxury','notes','employeeName','source','timestamp','transactionId','deviceTimestamp','serverTimestamp','isOfflineCreated','isReversed','originalSaleId','reversalReason','reversedBy','reversedAt','dataClassification','isTestData','testClassificationNote'],
    items: { '*': ['id','compositionType','isMix','customFormulaName','productId','productName','productType','bottleSize','essenceGrams','sellingPrice','quantity','isColoredBottle','isRollOn','alcoholMl','fixativeGrams'] },
  },
  products: {
    '*': ['id','name','brand','origin','gender','season','timeOfDay','type','stock_grams','min_threshold_grams','customSellingPriceOverride','analysis','strategicThresholdGrams','occasions','fragranceProfileId','isSavedMixRecipe','updatedAt'],
    analysis: ['topNotes','heartNotes','baseNotes','mainAccords','bestSeason','bestTime','longevity','sillage','salesPitch','layeringSuggestion'],
  },
  settings: {
    '*': ['storeName','currency','storeSlogan','storePhone','storeWhatsAppPrimary','storeWhatsAppSecondary','storeEmail','storeAddress','receiptFooterMessage','logoUrl','showLogoOnReceipt','receiptDesign','activeThemeId','themeAmbientGlow','themeGlassIntensity','themeAutoTimeOfDay','themeTypingEffects','themeTypingIntensity','themeTypingStyle','themeTypingBgColorShift','themeSoundEffects','themeCardElevation','themeCustomAccentColor','themeCustomAccent','themeFontScale','siteFontFamily','siteFontSizePercent','siteFontWeight','siteFontStrokeWidth','siteLineHeight','siteLetterSpacing','sitePrimaryTextColor','siteSecondaryTextColor','siteHeadingColorMode','siteHeadingCustomColor','siteNumeralSystem','themeSurfaceStyle','themeBorderRadius','themeContrastLevel','loyaltyEnabled','loyaltyPointsPerSpendEgp','loyaltyEarnStepEgp','loyaltyPointsPerVisit','loyaltyMinRedeemPoints','loyaltyMaxBillDiscountPercent','loyaltyWelcomeBonusPoints','bottleSizes','lowStockThresholdGrams'],
    bottleSizes: { '*': ['id','name','sizeMl','essenceGrams','normalPrice','coloredNormalPrice','specialPrice','coloredSpecialPrice','isRollOn','isActive'] },
  },
  bottleSizes: ['id','name','sizeMl','essenceGrams','normalPrice','coloredNormalPrice','specialPrice','coloredSpecialPrice','isRollOn','isActive'],
  staff_attendance: ['id','employeeName','date','checkInTime','checkOutTime','openedStore','status','salesCount','todaysSalesTotal'],
  daily_closures: ['id','date','status','openedAt','openedBy','closedAt','closedBy','electronicSalesTotal','cashSalesTotal','totalSalesRevenue','dataClassification','isTestData','testClassificationNote'],
  purchase_requests: ['id','date','requestedBy','productName','brand','requestedGrams','priority','status','approvedBy','approvedAt'],
  stock_checks: ['id','date','performedBy','productId','productName','systemGrams','actualGrams','differenceGrams','justification','status'],
  saved_mixes: ['id','name','bottleSizeMl','sellingPrice','createdAt','updatedAt','createdBy','isOwnerApproved','approvedBy','customerRating','testResult','longevityNotes','sillageNotes','balanceNotes','timesSold','repurchaseRatePercent'],
  customers: {
    '*': ['id','name','phone','notes','favoriteStyle','preferredBottleSizeMl','concentrationPreference','packagingPreference','preferredChannel','specialOccasionDate','nextFollowUpDate','followUpStatus','bonusPoints','redeemedPoints','loyaltyLogs','followUpLogs','customOffersSent','createdAt','updatedAt'],
    loyaltyLogs: ['id','date','pointsDelta','reason','byUser','invoiceId'],
    followUpLogs: ['id','date','channel','actionType','summary','byUser','nextFollowUpDate','outcome'],
    customOffersSent: ['id','date','title','perfumeName','bottleSizeMl','originalPriceEgp','discountAmountEgp','finalPriceEgp','pointsUsed','status','sentBy'],
  },
  customer_requests: ['id','date','recordedBy','customerName','customerPhone','requestedPerfume','perfumeName','brand','preferredSizeMl','requestedBottleSize','requestCount','lastRequestedAt','status','notes'],
  fragrance_database: ['id','productId','name','brand','manufacturer','origin','type','gender','concentration','classification','topNotes','heartNotes','baseNotes','mainAccords','generalCharacter','longevity','sillage','bestUses','occasions','seasons','timeOfDay','salesPitch','layeringSuggestions','inStoreAlternatives','similarPerfumes','complementaryPerfumes','sourcesRanked','confidenceDegree','confidenceReason','approvalStatus','lastUpdated','createdAt','notes'],
};

const allowedKeys = (policy: FieldPolicy): readonly string[] => Array.isArray(policy)
  ? policy
  : ((policy as FieldPolicyMap)['*'] as readonly string[] | undefined) ?? [];

function partition(data: ConfidentialDocument, policy: FieldPolicy): SplitConfidentialDocument {
  const pub: ConfidentialDocument = {};
  const priv: ConfidentialDocument = {};
  const keys = allowedKeys(policy);
  for (const [key, value] of Object.entries(data)) {
    if (!keys.includes(key)) { priv[key] = value; continue; }
    const child = !Array.isArray(policy) ? (policy as FieldPolicyMap)[key] : undefined;
    if (!child || value === null || typeof value !== 'object') { pub[key] = value; continue; }
    if (Array.isArray(value)) {
      const privateItems: unknown[] = [];
      pub[key] = value.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) { privateItems.push(null); return item; }
        const part = partition(item as ConfidentialDocument, child);
        privateItems.push(part.privateData);
        return part.publicData;
      });
      if (privateItems.some(item => item && typeof item === 'object' && Object.keys(item as object).length)) priv[key] = privateItems;
    } else {
      const part = partition(value as ConfidentialDocument, child);
      pub[key] = part.publicData;
      if (Object.keys(part.privateData).length) priv[key] = part.privateData;
    }
  }
  return { publicData: pub, privateData: priv };
}

/** Stable collection-scoped ID for the private companion document. */
export function privateConfidentialDocId(collectionName: string, id: string): string {
  return `__private__${encodeURIComponent(collectionName)}__${encodeURIComponent(id)}`;
}

/** Split with a fail-closed, per-collection allowlist; unknown keys stay private. */
export function splitConfidentialDocument(collectionName: string, data: ConfidentialDocument): SplitConfidentialDocument {
  return partition(data, policies[collectionName] ?? []);
}

function restore(publicData: ConfidentialDocument, privateData: ConfidentialDocument): ConfidentialDocument {
  const result: ConfidentialDocument = { ...publicData };
  for (const [key, secret] of Object.entries(privateData)) {
    const visible = result[key];
    if (Array.isArray(secret) && Array.isArray(visible)) {
      result[key] = visible.map((item, i) =>
        item && typeof item === 'object' && !Array.isArray(item) && secret[i] && typeof secret[i] === 'object'
          ? restore(item as ConfidentialDocument, secret[i] as ConfidentialDocument)
          : secret[i] ?? item
      );
    } else if (secret && visible && typeof secret === 'object' && typeof visible === 'object' && !Array.isArray(secret) && !Array.isArray(visible)) {
      result[key] = restore(visible as ConfidentialDocument, secret as ConfidentialDocument);
    } else {
      result[key] = secret;
    }
  }
  return result;
}

/** Restore the owner's complete data; private values always override public copies. */
export function mergeConfidentialDocument(_collectionName: string, publicData: ConfidentialDocument, privateData: ConfidentialDocument): ConfidentialDocument {
  return restore(publicData, privateData);
}
