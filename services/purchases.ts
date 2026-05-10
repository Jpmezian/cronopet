/**
 * services/purchases.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Wrapper para RevenueCat (StoreKit 2 + Google Billing).
 *
 * Estratégia:
 * - Hoje: stub que retorna o estado do `usePetStore.isPremium` (legado).
 * - Quando integrar: substituir `getCustomerInfo()` por `Purchases.getCustomerInfo()`
 *   e `purchasePackage()` por `Purchases.purchasePackage()`.
 * - O store usa o resultado deste módulo como fonte de verdade — nunca grava
 *   `isPremium` direto sem passar por `refreshEntitlements()`.
 *
 * Setup futuro (quando habilitar):
 *   npx expo install react-native-purchases
 *   Configurar entitlement "premium" no RevenueCat dashboard
 *   Criar produtos `cronopet_monthly` e `cronopet_yearly` no App Store Connect e Play Console
 *   Linkar em Offerings → "default" no RevenueCat
 *
 * IDs de produto (SoT — fonte única de verdade):
 *   - Apple/Google product IDs: cronopet_premium_monthly | cronopet_premium_yearly
 *   - RevenueCat entitlement ID: premium
 *   - Trial: 7 dias (configurar em App Store Connect e Play Console — não no RC)
 *
 * SEGURANÇA:
 * - `isPremium` retornado aqui é a verdade local. Para gates server-side
 *   (criar grupo familiar, sync), o backend (Supabase Edge Function) DEVE
 *   re-verificar via webhook do RevenueCat ou via receipt validation direto.
 *   O cliente é confiável apenas pra UX, nunca pra autorização.
 */

import * as Sentry from '@sentry/react-native';
import { track } from '@/services/analytics';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PremiumPlan = 'monthly' | 'yearly';

export interface CustomerInfo {
  isPremium: boolean;
  activePlan: PremiumPlan | null;
  expirationDate: Date | null;
  willRenew: boolean;
  isInTrial: boolean;
}

export interface Offering {
  id: PremiumPlan;
  priceString: string;        // ex: "R$ 14,90"
  pricePerMonth?: string;     // ex: "R$ 8,25" (yearly amortizado)
  trialDays?: number;
}

const DEFAULT_INFO: CustomerInfo = {
  isPremium: false,
  activePlan: null,
  expirationDate: null,
  willRenew: false,
  isInTrial: false,
};

// ─── State ──────────────────────────────────────────────────────────────────

let initialized = false;
let cachedInfo: CustomerInfo = DEFAULT_INFO;
let listeners: Array<(info: CustomerInfo) => void> = [];

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Inicializa o SDK. Chamar uma vez no _layout.tsx após hidratação do store.
 * Lê as keys do .env (`EXPO_PUBLIC_REVENUECAT_*`).
 */
export async function initPurchases(userId?: string): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (__DEV__) {
    console.log('[purchases] init (stub)', { userId, hasIosKey: !!process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY });
  }

  // TODO(produção):
  //   import Purchases from 'react-native-purchases';
  //   const apiKey = Platform.OS === 'ios'
  //     ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!
  //     : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;
  //   Purchases.configure({ apiKey, appUserID: userId });
  //   Purchases.addCustomerInfoUpdateListener((info) => {
  //     cachedInfo = mapCustomerInfo(info);
  //     listeners.forEach(fn => fn(cachedInfo));
  //   });
  //   await refreshEntitlements();
}

/**
 * Identifica o usuário no RevenueCat (chamar após login/signup).
 * Liga as compras anteriores do device a esta conta.
 */
export async function identifyPurchasesUser(userId: string): Promise<void> {
  if (__DEV__) console.log('[purchases] identify', userId);
  // TODO: await Purchases.logIn(userId);
}

/**
 * Limpa identificação (logout / account deletion).
 */
export async function resetPurchases(): Promise<void> {
  cachedInfo = DEFAULT_INFO;
  // TODO: await Purchases.logOut();
}

/**
 * Estado atual de premium. Use isso em gates de UI.
 * Importante: para autorização server-side, NUNCA confiar nesta resposta —
 * o backend deve validar via webhook do RevenueCat.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  // TODO: const info = await Purchases.getCustomerInfo();
  // return mapCustomerInfo(info);
  return cachedInfo;
}

/**
 * Lista de planos disponíveis. Os valores reais virão do RevenueCat,
 * mas mantemos preços fallback caso o fetch falhe (UX nunca trava).
 */
export async function getOfferings(): Promise<Offering[]> {
  // TODO: const offerings = await Purchases.getOfferings();
  // return mapOfferings(offerings.current);
  return [
    { id: 'monthly', priceString: 'R$ 14,90', trialDays: 7 },
    { id: 'yearly', priceString: 'R$ 99,00', pricePerMonth: 'R$ 8,25', trialDays: 7 },
  ];
}

/**
 * Inicia o fluxo de compra. Apple/Google mostram o popup nativo de pagamento.
 */
export async function purchasePackage(plan: PremiumPlan): Promise<{ success: boolean; cancelled: boolean; error?: string }> {
  track({ name: 'premium_purchase_started', props: { plan } });

  try {
    // TODO:
    //   const offerings = await Purchases.getOfferings();
    //   const pkg = offerings.current?.[plan === 'monthly' ? 'monthly' : 'annual'];
    //   if (!pkg) throw new Error('package_not_found');
    //   const { customerInfo } = await Purchases.purchasePackage(pkg);
    //   cachedInfo = mapCustomerInfo(customerInfo);
    //   listeners.forEach(fn => fn(cachedInfo));

    if (__DEV__) {
      console.log('[purchases] purchasePackage (stub)', plan);
      // Simula sucesso em DEV pra testar UX downstream
      cachedInfo = {
        isPremium: true,
        activePlan: plan,
        expirationDate: new Date(Date.now() + 30 * 86400000),
        willRenew: true,
        isInTrial: true,
      };
      listeners.forEach((fn) => fn(cachedInfo));
    }

    track({ name: 'premium_purchase_completed', props: { plan } });
    return { success: true, cancelled: false };
  } catch (err: any) {
    const cancelled = err?.userCancelled === true || /cancel/i.test(err?.message ?? '');
    if (!cancelled) {
      Sentry.captureException(err, { tags: { source: 'purchases' } });
      track({
        name: 'premium_purchase_failed',
        props: { plan, reason: err?.code ?? err?.message ?? 'unknown' },
      });
    }
    return { success: false, cancelled, error: cancelled ? undefined : (err?.message ?? 'unknown') };
  }
}

/**
 * Restaura compras anteriores (necessário pela política da Apple).
 */
export async function restorePurchases(): Promise<{ success: boolean; isPremium: boolean }> {
  try {
    // TODO: const info = await Purchases.restorePurchases();
    //       cachedInfo = mapCustomerInfo(info);
    return { success: true, isPremium: cachedInfo.isPremium };
  } catch (err) {
    Sentry.captureException(err, { tags: { source: 'purchases', op: 'restore' } });
    return { success: false, isPremium: false };
  }
}

/**
 * Subscreve para mudanças de status (ex: trial expirou, renovação falhou).
 * Retorna função de unsubscribe.
 */
export function onCustomerInfoUpdate(fn: (info: CustomerInfo) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/**
 * Refresh forçado (ex: após app voltar do background).
 */
export async function refreshEntitlements(): Promise<CustomerInfo> {
  // TODO: const info = await Purchases.getCustomerInfo();
  //       cachedInfo = mapCustomerInfo(info);
  //       listeners.forEach(fn => fn(cachedInfo));
  return cachedInfo;
}
