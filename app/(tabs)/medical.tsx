import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, Platform, Pressable,
  Modal, TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Trash2, Plus, Check, Stethoscope, Syringe, CalendarPlus, Scale,
  Droplet, Footprints, ClipboardList, Thermometer, BicepsFlexed, UtensilsCrossed,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScalePress } from '@/components/ui/ScalePress';
import { resolvePhotoUri } from '@/lib/photoPath';
import { getLocalToday } from '@/lib/dateLocal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { WeightChart } from '@/components/medical/WeightChart';
import { BreedHealthCard } from '@/components/medical/BreedHealthCard';
import { AIHealthAnalysis } from '@/components/medical/AIHealthAnalysis';
import { useMotion } from '@/hooks/useMotion';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePetStore } from '@/store/usePetStore';
import { generateVetReport } from '@/services/PdfReportService';
import type { MedicalEventType, Vaccine } from '@/types/pet';

// ─── Tipos de sintoma ─────────────────────────────────────────

// Migração 2026-05-15: emojis substituídos por Lucide. Cada sintoma tem
// um ícone semântico — sem chrome cartoony.
const SYMPTOM_OPTIONS: { type: MedicalEventType; Icon: typeof Stethoscope; label: string }[] = [
  { type: 'vomito',        Icon: Droplet,         label: 'Vômito' },
  { type: 'febre',         Icon: Thermometer,     label: 'Febre' },
  { type: 'mancando',      Icon: BicepsFlexed,    label: 'Mancando' },
  { type: 'diarreia',      Icon: Droplet,         label: 'Diarreia' },
  { type: 'coceira',       Icon: Footprints,      label: 'Coceira' },
  { type: 'perda_apetite', Icon: UtensilsCrossed, label: 'Sem apetite' },
  { type: 'outro',         Icon: ClipboardList,   label: 'Outro' },
];

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtISODate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Componente Principal ─────────────────────────────────────

export default function MedicalScreen() {
  const { colors, actionTheme, isDark } = useThemeColors();
  const { entering, sectionEntering } = useMotion();

  // ── Cores semânticas adaptadas ao tema ───────────────────────
  const errorBg      = isDark ? 'rgba(220,38,38,0.18)'  : '#fef2f2';
  const errorBorder  = isDark ? 'rgba(220,38,38,0.35)'  : '#fecaca';
  const errorText    = isDark ? '#fca5a5'               : '#991b1b';
  const errorSubtext = isDark ? '#f87171'               : '#dc2626';
  const errorMuted   = isDark ? '#fca5a5'               : '#b91c1c';

  const infoBg       = isDark ? 'rgba(37,99,235,0.18)'  : '#eff6ff';
  const infoBorder   = isDark ? 'rgba(37,99,235,0.35)'  : '#bfdbfe';
  const infoText     = isDark ? '#93c5fd'               : '#1d4ed8';
  const infoSubtext  = isDark ? '#60a5fa'               : '#3b82f6';

  const modalOverlay = isDark ? 'rgba(0,0,0,0.55)'     : 'rgba(28,25,23,0.35)';

  // ── Store ────────────────────────────────────────────────────
  const pet              = usePetStore((s) => s.pet);
  const actionHistory    = usePetStore((s) => s.actionHistory);
  const medicalEvents    = usePetStore((s) => s.medicalEvents);
  const vaccines         = usePetStore((s) => s.vaccines);
  const appointments     = usePetStore((s) => s.appointments);
  const weightHistory    = usePetStore((s) => s.weightHistory);

  const addMedicalEvent    = usePetStore((s) => s.addMedicalEvent);
  const removeMedicalEvent = usePetStore((s) => s.removeMedicalEvent);
  const addVaccine         = usePetStore((s) => s.addVaccine);
  const removeVaccine      = usePetStore((s) => s.removeVaccine);
  const addAppointment     = usePetStore((s) => s.addAppointment);
  const removeAppointment  = usePetStore((s) => s.removeAppointment);
  const addWeightEntry     = usePetStore((s) => s.addWeightEntry);
  const removeWeightEntry  = usePetStore((s) => s.removeWeightEntry);

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab]         = useState(0);

  // Modal: sintoma
  const [symptomModal, setSymptomModal]   = useState(false);
  const [symptomType, setSymptomType]     = useState<MedicalEventType>('outro');
  const [symptomNote, setSymptomNote]     = useState('');
  const [symptomPhoto, setSymptomPhoto]   = useState<string | null>(null);

  // Modal: vacina
  const [vaccineModal, setVaccineModal]   = useState(false);
  const [vacNome, setVacNome]             = useState('');
  const [vacData, setVacData]             = useState('');
  const [vacProxima, setVacProxima]       = useState('');
  const [vacVet, setVacVet]               = useState('');
  const [vacLote, setVacLote]             = useState('');
  const [vacNota, setVacNota]             = useState('');

  // Modal: consulta
  const [apptModal, setApptModal]         = useState(false);
  const [apptTitulo, setApptTitulo]       = useState('');
  const [apptData, setApptData]           = useState('');
  const [apptHora, setApptHora]           = useState('');
  const [apptVet, setApptVet]             = useState('');
  const [apptNota, setApptNota]           = useState('');
  const [savingAppt, setSavingAppt]       = useState(false);

  // Modal: peso
  const [weightModal, setWeightModal]     = useState(false);
  const [weightPeso, setWeightPeso]       = useState('');
  const [weightData, setWeightData]       = useState(() => getLocalToday());
  const [weightNota, setWeightNota]       = useState('');

  // ── PDF ───────────────────────────────────────────────────────
  const handleGeneratePdf = useCallback(async () => {
    setGeneratingPdf(true);
    try {
      await generateVetReport(pet, actionHistory, medicalEvents, vaccines, appointments, weightHistory);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [pet, actionHistory, medicalEvents, vaccines, appointments, weightHistory]);

  // ── Sintoma ───────────────────────────────────────────────────
  const handlePickSymptomPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) setSymptomPhoto(result.assets[0].uri);
  }, []);

  const handleSaveSymptom = useCallback(() => {
    addMedicalEvent(symptomType, symptomNote || undefined, symptomPhoto ?? undefined);
    setSymptomModal(false);
    setSymptomNote(''); setSymptomPhoto(null); setSymptomType('outro');
  }, [symptomType, symptomNote, symptomPhoto, addMedicalEvent]);

  const confirmRemoveMedical = useCallback((id: string) => {
    Alert.alert('Remover ocorrência', 'Deseja remover este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeMedicalEvent(id) },
    ]);
  }, [removeMedicalEvent]);

  // ── Vacina ────────────────────────────────────────────────────
  const handleSaveVaccine = useCallback(() => {
    if (!vacNome.trim() || !vacData.trim()) return;
    const vaccine: Omit<Vaccine, 'id'> = {
      nome: vacNome.trim(), data: vacData.trim(),
      ...(vacProxima.trim() ? { proxima: vacProxima.trim() } : {}),
      ...(vacVet.trim()     ? { veterinario: vacVet.trim() } : {}),
      ...(vacLote.trim()    ? { lote: vacLote.trim() } : {}),
      ...(vacNota.trim()    ? { nota: vacNota.trim() } : {}),
    };
    addVaccine(vaccine);
    setVaccineModal(false);
    setVacNome(''); setVacData(''); setVacProxima('');
    setVacVet(''); setVacLote(''); setVacNota('');
  }, [vacNome, vacData, vacProxima, vacVet, vacLote, vacNota, addVaccine]);

  const confirmRemoveVaccine = useCallback((id: string, nome: string) => {
    Alert.alert('Remover vacina', `Remover "${nome}" da carteira?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeVaccine(id) },
    ]);
  }, [removeVaccine]);

  // ── Consulta ──────────────────────────────────────────────────
  const handleSaveAppt = useCallback(async () => {
    if (!apptTitulo.trim() || !apptData.trim()) return;
    setSavingAppt(true);
    await addAppointment({
      titulo: apptTitulo.trim(),
      data: apptData.trim(),
      ...(apptHora.trim() ? { hora: apptHora.trim() } : {}),
      ...(apptVet.trim()  ? { veterinario: apptVet.trim() } : {}),
      ...(apptNota.trim() ? { nota: apptNota.trim() } : {}),
    });
    setSavingAppt(false);
    setApptModal(false);
    setApptTitulo(''); setApptData(''); setApptHora('');
    setApptVet(''); setApptNota('');
  }, [apptTitulo, apptData, apptHora, apptVet, apptNota, addAppointment]);

  const confirmRemoveAppt = useCallback((id: string, titulo: string) => {
    Alert.alert('Remover consulta', `Remover "${titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeAppointment(id) },
    ]);
  }, [removeAppointment]);

  // ── Peso ──────────────────────────────────────────────────────
  const handleSaveWeight = useCallback(() => {
    const peso = parseFloat(weightPeso.replace(',', '.'));
    if (isNaN(peso) || peso <= 0 || !weightData.trim()) return;
    addWeightEntry(peso, weightData.trim(), weightNota || undefined);
    setWeightModal(false);
    setWeightPeso(''); setWeightNota('');
    setWeightData(getLocalToday());
  }, [weightPeso, weightData, weightNota, addWeightEntry]);

  const confirmRemoveWeight = useCallback((id: string) => {
    Alert.alert('Remover registro', 'Remover este registro de peso?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeWeightEntry(id) },
    ]);
  }, [removeWeightEntry]);

  // Peso: mini gráfico
  const weightSorted  = useMemo(() =>
    [...weightHistory].sort((a, b) => a.data.localeCompare(b.data)), [weightHistory]);
  const maxPeso       = useMemo(() =>
    weightSorted.length ? Math.max(...weightSorted.map((w) => w.peso)) : 1, [weightSorted]);

  const selectedSymptomMeta = SYMPTOM_OPTIONS.find((s) => s.type === symptomType);

  // Consultas ordenadas: futuras primeiro, depois passadas
  const apptSorted = useMemo(() =>
    [...appointments].sort((a, b) => {
      const da = a.data + (a.hora ?? '00:00');
      const db = b.data + (b.hora ?? '00:00');
      return db.localeCompare(da);
    }), [appointments]);

  const today = getLocalToday();

  // ── Input style compartilhado ────────────────────────────────
  const inputStyle = {
    backgroundColor: colors.bgInput, borderRadius: 12,
    paddingHorizontal: 14 as const, paddingVertical: 12 as const,
    fontSize: 15 as const, color: colors.textPrimary,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ──────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500', fontFamily: 'Nunito_700Bold' }}>Área médica</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: -2, fontFamily: 'Nunito_700Bold' }}>
            Saúde do {pet.nome || 'seu pet'}
          </Text>
        </View>

        {/* ── Disclaimer ──────────────────────────────── */}
        <View style={{
          marginHorizontal: 20, marginTop: 16, marginBottom: 4,
          backgroundColor: actionTheme.comida.bg,
          borderWidth: 1, borderColor: actionTheme.comida.border,
          borderRadius: 16, padding: 16,
        }}>
          <Text style={{ color: actionTheme.coco.primary, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
            ⚠️ Aviso importante
          </Text>
          <Text style={{ color: actionTheme.coco.primary, fontSize: 12, lineHeight: 20 }}>
            O CronoPet <Text style={{ fontWeight: '700' }}>não se responsabiliza pela saúde do seu pet</Text> e
            não substitui a avaliação de um médico veterinário. Este app é apenas um apoio para
            organizar informações e facilitar o acompanhamento clínico profissional.
          </Text>
        </View>

        {/* ── Perfil de saúde da raça ──────────────────── */}
        {pet.raca ? (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <BreedHealthCard raca={pet.raca} tipo={pet.tipo} petNome={pet.nome || 'seu pet'} />
          </View>
        ) : null}

        {/* ── Análise por IA ──────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <AIHealthAnalysis
            pet={pet}
            actionHistory={actionHistory}
            weightHistory={weightHistory}
            medicalEvents={medicalEvents}
          />
        </View>

        {/* ── Gerar Relatório PDF ──────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <ScalePress
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleGeneratePdf();
            }}
            disabled={generatingPdf}
            style={{
              backgroundColor: colors.textPrimary, borderRadius: 16, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              ...(Platform.OS === 'android' ? { elevation: 4 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06, shadowRadius: 8,
              }),
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Gerar relatório PDF para veterinário"
          >
            {generatingPdf
              ? <ActivityIndicator color="#ffffff" />
              : <>
                  <Text style={{ fontSize: 20 }}>📄</Text>
                  <View>
                    <Text style={{ color: colors.bgScreen, fontWeight: '700', fontSize: 15, fontFamily: 'Nunito_700Bold' }}>
                      Gerar Relatório para Veterinário
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
                      PDF com histórico, vacinas e ocorrências
                    </Text>
                  </View>
                </>
            }
          </ScalePress>
        </View>

        {/* ── Segmented Control ───────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <SegmentedControl
            segments={['Consultas', 'Vacinas', 'Peso', 'Ocorrências']}
            selectedIndex={activeTab}
            onChange={setActiveTab}
            accentColor={actionTheme.passeio.primary}
            accentBg={actionTheme.passeio.bg}
          />
        </View>

        {/* ── Consultas ───────────────────────────────── */}
        {activeTab === 0 && (
        <Animated.View entering={sectionEntering(0)} style={{ marginHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 17, fontFamily: 'Nunito_700Bold' }}>🗓️ Consultas</Text>
            <ScalePress
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setApptModal(true); }}
              style={{ backgroundColor: infoText, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Agendar consulta"
            >
              <Plus size={16} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, fontFamily: 'Nunito_700Bold' }}>Agendar</Text>
            </ScalePress>
          </View>

          {apptSorted.length === 0 ? (
            <EmptyState
              Icon={CalendarPlus}
              title="Nenhuma consulta agendada"
              subtitle="Agende consultas e procedimentos para receber lembretes automáticos."
              accentColor={infoText}
              accentBg={infoBg}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {apptSorted.map((appt, index) => {
                const isFuture = appt.data >= today;
                return (
                  <Animated.View key={appt.id} entering={entering(index)}>
                    <View style={{
                      backgroundColor: isFuture ? infoBg    : colors.bgCard,
                      borderWidth: 1,
                      borderColor:     isFuture ? infoBorder : colors.bgInput,
                      borderRadius: 16, padding: 14,
                      ...(Platform.OS === 'android' ? { elevation: 1 } : {
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06, shadowRadius: 8,
                      }),
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: isFuture ? infoText : colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
                            {appt.titulo}
                          </Text>
                          <Text style={{ color: isFuture ? infoSubtext : colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                            {fmtISODate(appt.data)}{appt.hora ? ` às ${appt.hora}` : ''}
                          </Text>
                          {appt.veterinario && (
                            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                              Vet: {appt.veterinario}
                            </Text>
                          )}
                          {appt.nota && (
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                              {appt.nota}
                            </Text>
                          )}
                        </View>
                        <ScalePress
                          onPress={() => confirmRemoveAppt(appt.id, appt.titulo)}
                          style={{ padding: 4, marginLeft: 8 }}
                          accessible
                          accessibilityRole="button"
                          accessibilityLabel={`Remover consulta ${appt.titulo}`}
                        >
                          <Trash2 size={18} color="#dc2626" strokeWidth={2} />
                        </ScalePress>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>
        )}

        {/* ── Carteira de Vacinação ───────────────────── */}
        {activeTab === 1 && (
        <Animated.View entering={sectionEntering(1)} style={{ marginHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 17, fontFamily: 'Nunito_700Bold' }}>💉 Carteira de Vacinação</Text>
            <ScalePress
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVaccineModal(true); }}
              style={{ backgroundColor: colors.textPrimary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Adicionar vacina"
            >
              <Plus size={16} color={colors.bgScreen} strokeWidth={2.5} />
              <Text style={{ color: colors.bgScreen, fontWeight: '700', fontSize: 13, fontFamily: 'Nunito_700Bold' }}>Adicionar</Text>
            </ScalePress>
          </View>

          {vaccines.length === 0 ? (
            <EmptyState
              Icon={Syringe}
              title="Carteira vazia"
              subtitle="Registre as vacinas do seu pet para manter o histórico sempre atualizado."
              accentColor={actionTheme.passeio.primary}
              accentBg={actionTheme.passeio.bg}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {vaccines.map((v, index) => (
                <Animated.View key={v.id} entering={entering(index)}>
                  <View style={{
                    backgroundColor: actionTheme.passeio.bg,
                    borderWidth: 1, borderColor: actionTheme.passeio.border,
                    borderRadius: 16, padding: 14,
                    ...(Platform.OS === 'android' ? { elevation: 1 } : {
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06, shadowRadius: 8,
                    }),
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: actionTheme.passeio.primary, fontWeight: '700', fontSize: 15 }}>{v.nome}</Text>
                        <Text style={{ color: actionTheme.passeio.primary, fontSize: 13, marginTop: 4 }}>
                          Aplicada em {fmtISODate(v.data)}
                        </Text>
                        {v.proxima && (
                          <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, marginTop: 2 }}>
                            Próxima: {fmtISODate(v.proxima)}
                          </Text>
                        )}
                        {v.veterinario && <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, marginTop: 2 }}>Vet: {v.veterinario}</Text>}
                        {v.lote && <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, marginTop: 2 }}>Lote: {v.lote}</Text>}
                        {v.nota && <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>{v.nota}</Text>}
                      </View>
                      <ScalePress onPress={() => confirmRemoveVaccine(v.id, v.nome)} style={{ padding: 4, marginLeft: 8 }} accessible accessibilityRole="button" accessibilityLabel={`Remover vacina ${v.nome}`}>
                        <Trash2 size={18} color="#dc2626" strokeWidth={2} />
                      </ScalePress>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
        )}

        {/* ── Peso ────────────────────────────────────── */}
        {activeTab === 2 && (
        <Animated.View entering={sectionEntering(2)} style={{ marginHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 17, fontFamily: 'Nunito_700Bold' }}>⚖️ Peso</Text>
            <ScalePress
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWeightModal(true); }}
              style={{ backgroundColor: actionTheme.xixi.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Registrar peso"
            >
              <Plus size={16} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, fontFamily: 'Nunito_700Bold' }}>Registrar</Text>
            </ScalePress>
          </View>

          {weightSorted.length === 0 ? (
            <EmptyState
              Icon={Scale}
              title="Sem registros de peso"
              subtitle="Acompanhe a evolução do peso do seu pet ao longo do tempo."
              accentColor={actionTheme.xixi.primary}
              accentBg={actionTheme.xixi.bg}
            />
          ) : (
            <View style={{
              backgroundColor: colors.bgCard, borderRadius: 16, padding: 16,
              ...(Platform.OS === 'android' ? { elevation: 2 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06, shadowRadius: 8,
              }),
            }}>
              {/* Line chart com tendência */}
              {weightSorted.length > 1 && (
                <View style={{ marginBottom: 16 }}>
                  <WeightChart entries={weightSorted} maxPoints={10} />
                </View>
              )}

              {/* Lista */}
              <View style={{ gap: 8 }}>
                {[...weightSorted].reverse().map((w, index) => (
                  <Animated.View key={w.id} entering={entering(index)}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bgInput,
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15, fontFamily: 'Nunito_800ExtraBold' }}>
                          {w.peso.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{fmtISODate(w.data)}</Text>
                        {w.nota && <Text style={{ color: colors.textTertiary, fontSize: 12, fontStyle: 'italic' }}>{w.nota}</Text>}
                      </View>
                      <ScalePress onPress={() => confirmRemoveWeight(w.id)} style={{ padding: 8 }} accessible accessibilityRole="button" accessibilityLabel={`Remover registro de peso de ${w.peso} kg`}>
                        <Trash2 size={18} color="#dc2626" strokeWidth={2} />
                      </ScalePress>
                    </View>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
        )}

        {/* ── Ocorrências de Saúde ─────────────────────── */}
        {activeTab === 3 && (
        <Animated.View entering={sectionEntering(3)} style={{ marginHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 17, fontFamily: 'Nunito_700Bold' }}>🩺 Ocorrências</Text>
            <ScalePress
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSymptomModal(true); }}
              style={{ backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Registrar ocorrência de saúde"
            >
              <Plus size={16} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, fontFamily: 'Nunito_700Bold' }}>Registrar</Text>
            </ScalePress>
          </View>

          {medicalEvents.length === 0 ? (
            <EmptyState
              Icon={Stethoscope}
              title="Nenhuma ocorrência registrada"
              subtitle="Registre sintomas e eventos de saúde para compartilhar com o veterinário."
              accentColor="#b91c1c"
              accentBg={errorBg}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {medicalEvents.map((e, index) => {
                const meta = SYMPTOM_OPTIONS.find((s) => s.type === e.type);
                return (
                  <Animated.View key={e.id} entering={entering(index)}>
                    <View style={{
                      backgroundColor: errorBg, borderWidth: 1, borderColor: errorBorder,
                      borderRadius: 16, overflow: 'hidden',
                      ...(Platform.OS === 'android' ? { elevation: 1 } : {
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06, shadowRadius: 8,
                      }),
                    }}>
                      {e.photo && (
                        <Image source={{ uri: resolvePhotoUri(e.photo) }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                      )}
                      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {meta?.Icon && <meta.Icon size={16} strokeWidth={2.2} color={errorText} />}
                            <Text style={{ color: errorText, fontWeight: '700', fontSize: 15 }}>
                              {meta?.label ?? e.type}
                            </Text>
                          </View>
                          <Text style={{ color: errorSubtext, fontSize: 12, marginTop: 4 }}>
                            {fmtDateTime(e.timestamp)}
                          </Text>
                          {e.note && (
                            <Text style={{ color: errorMuted, fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>
                              "{e.note}"
                            </Text>
                          )}
                        </View>
                        <ScalePress onPress={() => confirmRemoveMedical(e.id)} style={{ padding: 4, marginLeft: 8 }} accessible accessibilityRole="button" accessibilityLabel={`Remover ocorrência de ${meta?.label ?? e.type}`}>
                          <Trash2 size={18} color="#dc2626" strokeWidth={2} />
                        </ScalePress>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>
        )}
      </ScrollView>

      {/* ── Modal: Registrar Ocorrência ─────────────── */}
      <Modal visible={symptomModal} transparent animationType="slide" onRequestClose={() => setSymptomModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: modalOverlay }} onPress={() => setSymptomModal(false)} accessibilityLabel="Fechar modal de sintoma" />
          <View style={{
            backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
          }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Stethoscope size={20} color={colors.textPrimary} strokeWidth={2} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>Registrar Ocorrência</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {SYMPTOM_OPTIONS.map((opt) => {
                const sel = symptomType === opt.type;
                return (
                  <ScalePress
                    key={opt.type}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSymptomType(opt.type); }}
                    style={{
                      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: sel ? '#dc2626' : colors.bgInput,
                    }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`${opt.label}${sel ? ', selecionado' : ''}`}
                  >
                    <opt.Icon size={16} strokeWidth={2.2} color={sel ? '#FFFEF8' : colors.textSecondary} />
                    <Text style={{ fontWeight: '600', fontSize: 13, color: sel ? '#FFFEF8' : colors.textSecondary }}>
                      {opt.label}
                    </Text>
                  </ScalePress>
                );
              })}
            </View>
            <ScalePress
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handlePickSymptomPhoto(); }}
              style={{
                borderRadius: 14, overflow: 'hidden', marginBottom: 12,
                borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={symptomPhoto ? 'Alterar foto da ocorrência' : 'Adicionar foto da ocorrência'}
            >
              {symptomPhoto ? (
                <Image source={{ uri: symptomPhoto }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
              ) : (
                <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 13 }}>📷 Adicionar foto (opcional)</Text>
                </View>
              )}
            </ScalePress>
            <TextInput
              value={symptomNote} onChangeText={setSymptomNote}
              placeholder='Descreva o que observou...'
              placeholderTextColor={colors.textTertiary}
              multiline numberOfLines={3} maxLength={300}
              style={{
                ...inputStyle, marginBottom: 16,
                textAlignVertical: 'top', minHeight: 80,
              }}
            />
            <ScalePress
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); handleSaveSymptom(); }}
              style={{ backgroundColor: '#dc2626', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Registrar ${selectedSymptomMeta?.label ?? 'ocorrência'}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Check size={18} color="#ffffff" strokeWidth={2.5} />
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold' }}>
                  Registrar {selectedSymptomMeta?.label}
                </Text>
              </View>
            </ScalePress>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Adicionar Vacina ──────────────────── */}
      <Modal visible={vaccineModal} transparent animationType="slide" onRequestClose={() => setVaccineModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: modalOverlay }} onPress={() => setVaccineModal(false)} accessibilityLabel="Fechar modal de vacina" />
          <View style={{
            backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
          }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Syringe size={20} color={colors.textPrimary} strokeWidth={2} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>Adicionar Vacina</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { label: 'Nome da vacina *', value: vacNome,    setter: setVacNome,    placeholder: 'Ex: V10, Antirrábica, FIV/FeLV' },
                { label: 'Data de aplicação * (AAAA-MM-DD)', value: vacData, setter: setVacData, placeholder: 'Ex: 2024-03-15' },
                { label: 'Próxima dose (AAAA-MM-DD)',    value: vacProxima,  setter: setVacProxima, placeholder: 'Opcional' },
                { label: 'Veterinário',     value: vacVet,      setter: setVacVet,     placeholder: 'Nome do vet (opcional)' },
                { label: 'Lote',            value: vacLote,     setter: setVacLote,    placeholder: 'Número do lote (opcional)' },
                { label: 'Observação',      value: vacNota,     setter: setVacNota,    placeholder: 'Observações adicionais' },
              ].map((field) => (
                <View key={field.label} style={{ marginBottom: 14 }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>
                    {field.label}
                  </Text>
                  <TextInput
                    value={field.value} onChangeText={field.setter}
                    placeholder={field.placeholder} placeholderTextColor={colors.textTertiary}
                    autoCorrect={false} maxLength={100}
                    style={inputStyle}
                  />
                </View>
              ))}
              <ScalePress
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); handleSaveVaccine(); }}
                disabled={!vacNome.trim() || !vacData.trim()}
                style={{
                  borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 4,
                  backgroundColor: vacNome.trim() && vacData.trim() ? '#059669' : colors.bgMuted,
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Salvar vacina"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Check size={18} color={vacNome.trim() && vacData.trim() ? '#ffffff' : colors.textDisabled} strokeWidth={2.5} />
                  <Text style={{
                    fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
                    color: vacNome.trim() && vacData.trim() ? '#ffffff' : colors.textDisabled,
                  }}>Salvar Vacina</Text>
                </View>
              </ScalePress>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Agendar Consulta ──────────────────── */}
      <Modal visible={apptModal} transparent animationType="slide" onRequestClose={() => setApptModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: modalOverlay }} onPress={() => setApptModal(false)} accessibilityLabel="Fechar modal de consulta" />
          <View style={{
            backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
          }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CalendarPlus size={20} color={colors.textPrimary} strokeWidth={2} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>Agendar Consulta</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { label: 'Título *', value: apptTitulo, setter: setApptTitulo, placeholder: 'Ex: Consulta anual, Banho e tosa' },
                { label: 'Data * (AAAA-MM-DD)', value: apptData, setter: setApptData, placeholder: 'Ex: 2025-06-20' },
                { label: 'Horário (HH:MM)', value: apptHora, setter: setApptHora, placeholder: 'Ex: 14:30 (opcional)' },
                { label: 'Veterinário', value: apptVet, setter: setApptVet, placeholder: 'Nome do vet (opcional)' },
                { label: 'Observação', value: apptNota, setter: setApptNota, placeholder: 'Notas adicionais' },
              ].map((field) => (
                <View key={field.label} style={{ marginBottom: 14 }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>
                    {field.label}
                  </Text>
                  <TextInput
                    value={field.value} onChangeText={field.setter}
                    placeholder={field.placeholder} placeholderTextColor={colors.textTertiary}
                    autoCorrect={false} maxLength={100}
                    style={inputStyle}
                  />
                </View>
              ))}
              <ScalePress
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); handleSaveAppt(); }}
                disabled={!apptTitulo.trim() || !apptData.trim() || savingAppt}
                style={{
                  borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 4,
                  backgroundColor: apptTitulo.trim() && apptData.trim() ? infoText : colors.bgMuted,
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Salvar consulta"
              >
                {savingAppt
                  ? <ActivityIndicator color="#ffffff" />
                  : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Check size={18} color={apptTitulo.trim() && apptData.trim() ? '#ffffff' : colors.textDisabled} strokeWidth={2.5} />
                      <Text style={{
                        fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
                        color: apptTitulo.trim() && apptData.trim() ? '#ffffff' : colors.textDisabled,
                      }}>Salvar Consulta</Text>
                    </View>
                }
              </ScalePress>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Registrar Peso ────────────────────── */}
      <Modal visible={weightModal} transparent animationType="slide" onRequestClose={() => setWeightModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: modalOverlay }} onPress={() => setWeightModal(false)} accessibilityLabel="Fechar modal de peso" />
          <View style={{
            backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
          }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Scale size={20} color={colors.textPrimary} strokeWidth={2} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>Registrar Peso</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Peso (kg) *</Text>
              <TextInput
                value={weightPeso} onChangeText={setWeightPeso}
                placeholder="Ex: 8.5" placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad" maxLength={10}
                style={inputStyle}
              />
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Data * (AAAA-MM-DD)</Text>
              <TextInput
                value={weightData} onChangeText={setWeightData}
                placeholder="Ex: 2025-04-01" placeholderTextColor={colors.textTertiary}
                autoCorrect={false} maxLength={10}
                style={inputStyle}
              />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Observação</Text>
              <TextInput
                value={weightNota} onChangeText={setWeightNota}
                placeholder="Ex: Após castração (opcional)" placeholderTextColor={colors.textTertiary}
                maxLength={100}
                style={inputStyle}
              />
            </View>
            <ScalePress
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); handleSaveWeight(); }}
              disabled={!weightPeso.trim() || !weightData.trim()}
              style={{
                borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center',
                backgroundColor: weightPeso.trim() && weightData.trim() ? actionTheme.xixi.primary : colors.bgMuted,
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Salvar peso"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Check size={18} color={weightPeso.trim() && weightData.trim() ? '#ffffff' : colors.textDisabled} strokeWidth={2.5} />
                <Text style={{
                  fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
                  color: weightPeso.trim() && weightData.trim() ? '#ffffff' : colors.textDisabled,
                }}>Salvar Peso</Text>
              </View>
            </ScalePress>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
