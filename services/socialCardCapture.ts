import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// ─── Captura de social cards via react-native-view-shot ───────
//
// Centraliza a lógica que estava espalhada em app/(tabs)/index.tsx,
// components/ui/MilestoneSheet.tsx e (futuramente) qualquer outra
// tela que queira gerar uma imagem compartilhável a partir de um
// componente offscreen.
//
// Por que receber `ref` em vez de `petId`/`weekStart`:
//   O componente precisa estar montado no JSX tree em algum lugar
//   pra captureRef ler a hierarquia nativa. A montagem é
//   responsabilidade do caller (geralmente offscreen com
//   { position: 'absolute', left: -9999 }). O helper só dispara
//   a captura — não monta nem desmonta.
//
// Por que JPG por padrão:
//   • menor que PNG (~10× pra fotos com gradient)
//   • Stories do Instagram/WhatsApp re-encodam pra JPG mesmo
//   • PNG só vale se o card precisasse de transparência (não é o caso)

interface CaptureOptions {
  /** 'jpg' (default) ou 'png'. JPG é menor, suficiente pra share. */
  format?: 'jpg' | 'png';
  /** 0..1, qualidade JPG. Default 0.92 mantém qualidade alta com tamanho razoável. */
  quality?: number;
}

/**
 * Captura um componente social card como imagem.
 *
 * @param ref ref do View raiz do card (geralmente forwardRef do
 *            WeeklyReportCard, MilestoneCard, etc).
 * @param opts format/quality.
 * @returns URI temp (file://...) pronta pra `Sharing.shareAsync` ou upload.
 * @throws  se o ref não estiver montado.
 */
export async function captureSocialCard(
  ref: RefObject<View | null>,
  opts: CaptureOptions = {},
): Promise<string> {
  if (!ref.current) {
    throw new Error(
      'captureSocialCard: ref não montado. ' +
      'O componente alvo precisa estar renderizado (mesmo offscreen) ' +
      'antes desta chamada.',
    );
  }
  const uri = await captureRef(ref.current, {
    format: opts.format ?? 'jpg',
    quality: opts.quality ?? 0.92,
  });
  return uri;
}

// ─── High-level helper alinhado ao briefing 2026-06-03 ─────────
//
// Assinatura pedida no briefing original:
//   generateStoryImage(petId, weekStart) → URI pra Share API
//
// Realidade: precisa do ref do componente (já argumentado acima).
// Solução: o helper recebe ref + meta (petId/weekStart) e devolve
// um objeto com URI + meta. O caller pode passar adiante via
// query string, analytics, log, etc.

export interface StoryImageMeta {
  petId: string;
  weekStart: Date;
}

export interface StoryImageResult {
  uri: string;
  petId: string;
  weekStart: Date;
  capturedAt: number;
}

/**
 * Captura o card semanal e retorna URI + metadados pra
 * Sharing.shareAsync ou analytics.
 *
 * Uso típico no caller:
 *   const { uri } = await generateStoryImage(weeklyCardRef, {
 *     petId: pet.id,
 *     weekStart,
 *   });
 *   await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
 */
export async function generateStoryImage(
  ref: RefObject<View | null>,
  meta: StoryImageMeta,
): Promise<StoryImageResult> {
  const uri = await captureSocialCard(ref);
  return {
    uri,
    petId: meta.petId,
    weekStart: meta.weekStart,
    capturedAt: Date.now(),
  };
}
