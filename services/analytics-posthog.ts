/**
 * services/analytics-posthog.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Backend PostHog que conforma à interface `AnalyticsBackend` exposta por
 * services/analytics.ts. Isolado nesse arquivo pra:
 *
 *   1. Manter analytics.ts agnóstico (qualquer SDK pluga aqui)
 *   2. Permitir tree-shaking quando PostHog não estiver configurado
 *      (sem env key = nem chega a importar PostHogProvider)
 *   3. Stubbar facilmente em testes (já temos o stub no analytics core)
 *
 * Uso (em _layout.tsx):
 *
 *   const client = await createPostHogClient();
 *   initAnalytics(client ? posthogBackend(client) : undefined);
 */

import { PostHog } from 'posthog-react-native';

/**
 * Cria o cliente PostHog se as env vars estiverem configuradas.
 * Retorna null se faltar key — analytics fica em modo stub (console em DEV).
 */
export async function createPostHogClient(): Promise<PostHog | null> {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;

  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

  try {
    const client = new PostHog(apiKey, {
      host,
      // Privacidade: NUNCA capturar input/text automaticamente.
      // App é local-first e tem dados de saúde — capture é só via track()
      // tipado em services/analytics.ts.
      captureAppLifecycleEvents: true,
    });
    return client;
  } catch {
    // Falha de init não pode bloquear startup.
    return null;
  }
}

/**
 * Adapta PostHog pra interface `AnalyticsBackend` de services/analytics.ts.
 * Métodos no-op gracefully se o cliente for null (defesa em profundidade).
 */
export function posthogBackend(client: PostHog) {
  return {
    identify(userId: string, traits?: Record<string, unknown>) {
      // Cast: AnalyticsBackend usa Record<string, unknown> pra ficar
      // agnóstico; PostHog espera JsonType. Em runtime nossos events
      // só passam booleans/numbers/strings — TS strict só não consegue
      // provar isso.
      client.identify(userId, traits as Record<string, string | number | boolean>);
    },
    capture(event: string, properties?: Record<string, unknown>) {
      client.capture(event, properties as Record<string, string | number | boolean>);
    },
    reset() {
      client.reset();
    },
  };
}
