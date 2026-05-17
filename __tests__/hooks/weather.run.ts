/**
 * Suite — hooks/useWeather.ts (pure fns extraídas)
 *
 * Cobertura:
 *  - buildOWMUrl: URL canônica com units=metric, lang=pt_br, key
 *  - parseOWMResponse: shape válido + shape parcial sem crash
 *  - isAsfaltoQuente: limiar de 28°C
 *  - FALLBACK_LAT/LON: Copacabana garantido (não regrediu pra (0,0))
 */

import {
  buildOWMUrl, parseOWMResponse, isAsfaltoQuente,
  FALLBACK_LAT, FALLBACK_LON,
} from '@/hooks/useWeather';
import { assertEq, assertTrue, runSuite } from '../_lib/assert';

runSuite('hooks/useWeather', [
  {
    name: '01. buildOWMUrl: query params canônicos (metric + pt_br + key)',
    fn: () => {
      const url = buildOWMUrl(-22.97, -43.18, 'KEY123');
      assertTrue(url.startsWith('https://api.openweathermap.org/data/2.5/weather'));
      assertTrue(url.includes('lat=-22.97'));
      assertTrue(url.includes('lon=-43.18'));
      assertTrue(url.includes('units=metric'), 'celsius, não kelvin');
      assertTrue(url.includes('lang=pt_br'), 'pt_br pra "ensolarado" não "sunny"');
      assertTrue(url.includes('appid=KEY123'));
    },
  },

  {
    name: '02. parseOWMResponse: shape feliz (temp arredondada + descrição)',
    fn: () => {
      const parsed = parseOWMResponse({
        main: { temp: 28.7 },
        weather: [{ description: 'parcialmente nublado' }],
      });
      assertEq(parsed.temp, 29, 'Math.round');
      assertEq(parsed.descricao, 'parcialmente nublado');
    },
  },

  {
    name: '03. parseOWMResponse: shape parcial não crasha, retorna defaults sensatos',
    fn: () => {
      // Sem main.temp
      assertEq(parseOWMResponse({ weather: [{ description: 'sol' }] }).temp, 0);
      // Sem weather array
      assertEq(parseOWMResponse({ main: { temp: 25 } }).descricao, 'Tempo desconhecido');
      // Shape inválido total
      assertEq(parseOWMResponse(null).temp, 0);
      assertEq(parseOWMResponse(null).descricao, 'Tempo desconhecido');
      assertEq(parseOWMResponse('garbage').temp, 0);
    },
  },

  {
    name: '04. isAsfaltoQuente: limiar > 28°C',
    fn: () => {
      assertEq(isAsfaltoQuente(28),   false, 'igual NÃO conta — comparação estrita');
      assertEq(isAsfaltoQuente(28.1), true);
      assertEq(isAsfaltoQuente(35),   true);
      assertEq(isAsfaltoQuente(20),   false);
      assertEq(isAsfaltoQuente(-5),   false, 'frio óbvio');
    },
  },

  {
    name: '05. FALLBACK_LAT/LON apontam pra Copacabana (regressão guard)',
    fn: () => {
      // Sem isso, fallback poderia regredir pra (0,0) ou outro lugar
      // e usuários sem GPS veriam clima de Gana/Atlântico
      assertEq(FALLBACK_LAT, -22.9711, 'Copacabana lat');
      assertEq(FALLBACK_LON, -43.1822, 'Copacabana lon');
    },
  },
]);
