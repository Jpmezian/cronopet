/**
 * services/purchases.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Wrapper para RevenueCat (StoreKit 2 + Google Billing).
 *
 * MODOS DE OPERAÇÃO:
 *   • `live`: env var `EXPO_PUBLIC_REVENUECAT_{IOS,ANDROID}_KEY` setada.
 *     Toda chamada vai pro SDK nativo.
 *   • `stub`: env var ausente → simula localmente (DEV). Útil pra rodar
 *     em simulador sem conta Sandbox Apple Connect. UI continua testável.
 *
 * O modo é decidido em `initPurchases()` e persiste pelo ciclo de vida.
 * Caller (UI) não precisa saber — gates de Premium leem `setPremiumStatus`
 * do store que é alimentado pelo customerInfo listener em ambos os modos.
 *
 * SEGURANÇA:
 * - `isPremium` retornado aqui é a verdade LOCAL. Para gates server-side
 *   (criar grupo familiar, sync), o backend (Supabase Edge Function) DEVE
 *   re-verificar via webhook do RevenueCat. O cliente é confiável apenas
 *   pra UX, nunca pra autorização.
 *
 * SETUP PRODUÇÃO (LAUNCH.md tem checklist):
 *   1. Criar produtos em App Store Connect e Play Console:
 *      - `cronopet_premium_monthly` (auto-renewable)
 *      - `cronopet_premium_yearly`
 *   2. Configurar entitlement "premium" no RevenueCat dashboard
 *   3. Linkar offering "default" com os dois packages (monthly/annual)
 *   4. Trial de 7 dias configurado em App Store Connect/Play Console
 *      (não no RevenueCat)
 *   5. Setar `EXPO_PUBLIC_REVENUECAT_IOS_KEY` + ANDROID_KEY no .env
 */

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Purchases, {
  type CustomerInfo as RCCustomerInfo,
  type PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
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

const ENTITLEMENT_ID = 'premium';

const DEFAULT_INFO: CustomerInfo = {
  isPremium: false,
  activePlan: null,
  expirationDate: null,
  willRenew: false,
  isInTrial: false,
};

// ─── State ──────────────────────────────────────────────────────────────────

let mode: 'live' | 'stub' = 'stub';
let initialized = false;
let cachedInfo: CustomerInfo = DEFAULT_INFO;
let listeners: Array<(info: CustomerInfo) => void> = [];

// ─── Mapper RC → CustomerInfo nosso ────────────────────────────────────────

function mapCustomerInfo(info: RCCustomerInfo): CustomerInfo {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (!ent) return DEFAULT_INFO;

  const identifier = ent.productIdentifier ?? '';
  const activePlan: PremiumPlan | null = identifier.includes('yearly') || identifier.includes('annual')
    ? 'yearly'
    : identifier.includes('monthly') ? 'monthly' : null;

  return {
    isPremium:      true,
    activePlan,
    expirationDate: ent.expirationDate ? new Date(ent.expirationDate) : null,
    willRenew:      ent.willRenew,
    isInTrial:      ent.periodType === 'TRIAL',
  };
}

function notifyListeners() {
  for (const fn of listeners) fn(cachedInfo);
}

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Inicializa o SDK. Decide modo live/stub baseado em env.
 * Chamar uma vez no _layout.tsx após hidratação do store.
 */
export async function initPurchases(userId?: string): Promise<void> {
  if (initialized) return;
  initialized = true;

  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

  if (!apiKey) {
    mode = 'stub';
    if (__DEV__) console.log('[purchases] init STUB (sem REVENUECAT key)');
    return;
  }

  mode = 'live';
  try {
    await Purchases.configure({ apiKey, appUserID: userId });
    Purchases.addCustomerInfoUpdateListener((info) => {
      cachedInfo = mapCustomerInfo(info);
      notifyListeners();
    });
    await refreshEntitlements();
    if (__DEV__) console.log('[purchases] init LIVE');
  } catch (err) {
    // Falha na config não pode travar startup — cai pra stub
    mode = 'stub';
    Sentry.captureException(err, { tags: { source: 'purchases', op: 'init' } });
  }
}

/**
 * Identifica o usuário no RevenueCat (chamar após login/signup).
 * Liga as compras anteriores do device a esta conta.
 */
export async function identifyPurchasesUser(userId: string): Promise<void> {
  if (mode === 'stub') {
    if (__DEV__) console.log('[purchases] identify (stub)', userId);
    return;
  }
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    cachedInfo = mapCustomerInfo(customerInfo);
    notifyListeners();
  } catch (err) {
    Sentry.captureException(err, { tags: { source: 'purchases', op: 'identify' } });
  }
}

/**
 * Limpa identificação (logout / account deletion).
 */
export async function resetPurchases(): Promise<void> {
  cachedInfo = DEFAULT_INFO;
  notifyListeners();
  if (mode === 'stub') return;
  try {
    await Purchases.logOut();
  } catch (err) {
    Sentry.captureException(err, { tags: { source: 'purchases', op: 'reset' } });
  }
}

/**
 * Estado atual de premium. Use isso em gates de UI.
 * Importante: para autorização server-side, NUNCA confiar nesta resposta —
 * o backend deve validar via webhook do RevenueCat.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  if (mode === 'stub') return cachedInfo;
  try {
    const info = await Purchases.getCustomerInfo();
    cachedInfo = mapCustomerInfo(info);
    return cachedInfo;
  } catch (err) {
    Sentry.captureException(err, { tags: { source: 'purchases', op: 'getCustomerInfo' } });
    return cachedInfo;
  }
}

/**
 * Lista de planos disponíveis. Em live, vem do RevenueCat (com preços
 * localizados pelo App Store). Em stub, fallback hardcoded em pt-BR.
 */
export async function getOfferings(): Promise<Offering[]> {
  if (mode === 'stub') {
    return [
      { id: 'monthly', priceString: 'R$ 14,90', trialDays: 7 },
      { id: 'yearly', priceString: 'R$ 99,00', pricePerMonth: 'R$ 8,25', trialDays: 7 },
    ];
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];

    const out: Offering[] = [];
    if (current.monthly) {
      out.push({
        id: 'monthly',
        priceString: current.monthly.product.priceString,
        trialDays: 7,
      });
    }
    if (current.annual) {
      out.push({
        id: 'yearly',
        priceString: current.annual.product.priceString,
        // RC já calcula priceString amortizado em annual.product.pricePerMonthString
        pricePerMonth: current.annual.product.pricePerMonthString ?? undefined,
        trialDays: 7,
      });
    }
    return out;
  } catch (err) {
    Sentry.captureException(err, { tags: { source: 'purchases', op: 'getOfferings' } });
    return [];
  }
}

/**
 * Inicia o fluxo de compra. Apple/Google mostram o popup nativo de pagamento.
 */
export async function purchasePackage(plan: PremiumPlan): Promise<{ success: boolean; cancelled: boolean; error?: string }> {
  track({ name: 'premium_purchase_started', props: { plan } });

  if (mode === 'stub') {
    // Em DEV (sem RC), simula sucesso pra testar UX downstream
    if (__DEV__) {
      cachedInfo = {
        isPremium: true,
        activePlan: plan,
        expirationDate: new Date(Date.now() + 30 * 86400000),
        willRenew: true,
        isInTrial: true,
      };
      notifyListeners();
      track({ name: 'premium_purchase_completed', props: { plan } });
      return { success: true, cancelled: false };
    }
    // Em PROD sem chave: não tem como comprar, falha graceful
    return { success: false, cancelled: false, error: 'storekit_unavailable' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    const pkg: PurchasesPackage | null | undefined = plan === 'monthly'
      ? current?.monthly
      : current?.annual;
    if (!pkg) throw new Error('package_not_found');

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    cachedInfo = mapCustomerInfo(customerInfo);
    notifyListeners();
    track({ name: 'premium_purchase_completed', props: { plan } });
    return { success: true, cancelled: false };
  } catch (err: unknown) {
    const e = err as { userCancelled?: boolean; code?: string; message?: string };
    const cancelled = e?.userCancelled === true
      || e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      || /cancel/i.test(e?.message ?? '');
    if (!cancelled) {
      Sentry.captureException(err, { tags: { source: 'purchases' } });
      track({
        name: 'premium_purchase_failed',
        props: { plan, reason: e?.code ?? e?.message ?? 'unknown' },
      });
    }
    return { success: false, cancelled, error: cancelled ? undefined : (e?.message ?? 'unknown') };
  }
}

/**
 * Restaura compras anteriores (necessário pela política da Apple).
 */
export async function restorePurchases(): Promise<{ success: boolean; isPremium: boolean }> {
  if (mode === 'stub') {
    return { success: true, isPremium: cachedInfo.isPremium };
  }
  try {
    const info = await Purchases.restorePurchases();
    cachedInfo = mapCustomerInfo(info);
    notifyListeners();
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
  if (mode === 'stub') return cachedInfo;
  try {
    const info = await Purchases.getCustomerInfo();
    cachedInfo = mapCustomerInfo(info);
    notifyListeners();
    return cachedInfo;
  } catch (err) {
    Sentry.captureException(err, { tags: { source: 'purchases', op: 'refresh' } });
    return cachedInfo;
  }
}
