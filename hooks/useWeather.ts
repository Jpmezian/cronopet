import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// ─── Constantes ────────────────────────────────────────────────

/** Copacabana, RJ — fallback quando GPS negado ou falha de rede */
export const FALLBACK_LAT = -22.9711;
export const FALLBACK_LON = -43.1822;

/** Limiar para alerta de asfalto quente (°C) — interno, testado via isAsfaltoQuente. */
const HOT_PAVEMENT_THRESHOLD = 28;

// ─── Helpers puros (testáveis sem mock de fetch/Location) ─────

/** Constrói a URL canônica do OpenWeatherMap (units=metric, lang=pt_br). */
export function buildOWMUrl(lat: number, lon: number, apiKey: string): string {
  return `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${apiKey}`;
}

/** Parse defensivo do JSON do OWM — tolera shape parcial sem crash. */
export function parseOWMResponse(json: unknown): { temp: number; descricao: string } {
  const root = (json && typeof json === 'object') ? json as Record<string, unknown> : {};
  const main = (root.main && typeof root.main === 'object') ? root.main as Record<string, unknown> : {};
  const weatherArr = Array.isArray(root.weather) ? root.weather : [];
  const first = (weatherArr[0] && typeof weatherArr[0] === 'object') ? weatherArr[0] as Record<string, unknown> : {};
  return {
    temp: Math.round(typeof main.temp === 'number' ? main.temp : 0),
    descricao: typeof first.description === 'string' && first.description.length > 0
      ? first.description
      : 'Tempo desconhecido',
  };
}

/** Asfalto está perigoso pro pet andar descalço? (limiar empírico ~28°C) */
export function isAsfaltoQuente(temp: number): boolean {
  return temp > HOT_PAVEMENT_THRESHOLD;
}

/**
 * API Key do OpenWeatherMap.
 * Defina EXPO_PUBLIC_OWM_KEY no arquivo .env na raiz do projeto.
 * Prefixo EXPO_PUBLIC_ torna a variável acessível no bundle pelo Expo.
 */
const OWM_KEY = process.env.EXPO_PUBLIC_OWM_KEY ?? '';

// ─── Tipos ─────────────────────────────────────────────────────

export interface WeatherData {
  /** Temperatura atual em °C (arredondada) */
  temp: number;
  /** Descrição textual do tempo (em pt_br via OWM) */
  descricao: string;
  /** true quando temp > HOT_PAVEMENT_THRESHOLD */
  asfaltoQuente: boolean;
  /** true enquanto o fetch está em andamento */
  loading: boolean;
  /** Mensagem de erro; null quando tudo ok */
  error: string | null;
}

// ─── Helpers internos ──────────────────────────────────────────

interface OWMResponse {
  main: { temp: number };
  weather: Array<{ description: string }>;
}

async function fetchOWM(lat: number, lon: number): Promise<{ temp: number; descricao: string }> {
  if (!OWM_KEY) throw new Error('EXPO_PUBLIC_OWM_KEY não configurada');
  const response = await fetch(buildOWMUrl(lat, lon, OWM_KEY));
  if (!response.ok) throw new Error(`OWM API retornou ${response.status}`);
  return parseOWMResponse(await response.json());
}

// ─── Hook principal ─────────────────────────────────────────────

/**
 * useWeather
 *
 * Fluxo:
 * 1. Solicita permissão de localização em primeiro plano.
 * 2. Se concedida: usa as coordenadas reais do dispositivo.
 * 3. Se negada (ou erro de GPS): usa Copacabana como fallback silencioso.
 * 4. Bate na API do OpenWeatherMap com as coordenadas obtidas.
 * 5. Se o fetch falhar: mantém os valores default e expõe `error`.
 *
 * O dashboard NUNCA fica sem um valor de clima válido.
 */
export function useWeather(): WeatherData {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 28,
    descricao: 'Parcialmente nublado',
    asfaltoQuente: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // ── 1. Geolocalização ──────────────────────────────────
      let lat = FALLBACK_LAT;
      let lon = FALLBACK_LON;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        }
        // Permissão negada → fallback silencioso (Copacabana)
      } catch {
        // GPS falhou → fallback silencioso (Copacabana)
      }

      // ── 2. Fetch de clima ──────────────────────────────────
      try {
        const { temp, descricao } = await fetchOWM(lat, lon);
        if (!cancelled) {
          setWeather({
            temp,
            descricao,
            asfaltoQuente: isAsfaltoQuente(temp),
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Clima indisponível';
          // Mantém valores default razoáveis; expõe o erro sem quebrar a UI
          setWeather((prev) => ({
            ...prev,
            descricao: 'Clima local',
            loading: false,
            error: message,
          }));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return weather;
}
