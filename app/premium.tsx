import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TextInput, Platform, ActivityIndicator, Alert, KeyboardAvoidingView,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Copy, Check } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { SkeletonPremiumDashboard } from '@/components/ui/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePetStore } from '@/store/usePetStore';
import { signIn, signUp, signOut, getSession } from '@/services/AuthService';
import { restorePurchases } from '@/services/purchases';
import { openLegal } from '@/lib/legalLinks';
import { useToastStore } from '@/store/useToastStore';
import { track, type PaywallSource } from '@/services/analytics';
import {
  checkPasswordStrength, isValidEmail, checkRateLimit,
  recordRateLimitAttempt, clearRateLimit, INPUT_LIMITS,
} from '@/lib/security';
import {
  createFamilyGroup, joinFamilyGroup, getMyFamilyGroup,
  getFamilyMembers, initialFullSync, pullGroupData,
  subscribeToFamilyLogs, unsubscribeAll,
} from '@/services/SyncService';
import type { FamilyGroup, FamilyMember } from '@/types/auth';
import { translateSupabaseError } from '@/lib/supabaseErrors';
import { ViewPitchBoldV3 } from '@/components/premium/ViewPitchBoldV3';

// ─── Tipos locais ─────────────────────────────────────────────

type ScreenView = 'loading' | 'pitch' | 'auth' | 'setup' | 'dashboard';
type AuthTab = 'signin' | 'signup';

// ─── Tela Principal ───────────────────────────────────────────

export default function PremiumScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();

  const pet            = usePetStore((s) => s.pet);
  const actionHistory  = usePetStore((s) => s.actionHistory);
  const vaccines       = usePetStore((s) => s.vaccines);
  const appointments   = usePetStore((s) => s.appointments);
  const weightHistory  = usePetStore((s) => s.weightHistory);
  const user           = usePetStore((s) => s.user);
  const familyGroupId  = usePetStore((s) => s.familyGroupId);
  const syncStatus     = usePetStore((s) => s.syncStatus);
  const setUser        = usePetStore((s) => s.setUser);
  const setFamilyGroupId = usePetStore((s) => s.setFamilyGroupId);
  const setSyncStatus  = usePetStore((s) => s.setSyncStatus);
  const appendRemoteLog   = usePetStore((s) => s.appendRemoteLog);
  const hydrateFromCloud  = usePetStore((s) => s.hydrateFromCloud);

  const [view, setView]           = useState<ScreenView>('loading');
  const [authTab, setAuthTab]     = useState<AuthTab>('signin');
  const [group, setGroup]         = useState<FamilyGroup | null>(null);
  const [members, setMembers]     = useState<FamilyMember[]>([]);
  const [loading, setLoading]     = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Auth form
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome]         = useState('');

  // Setup form
  const [groupName, setGroupName] = useState(`Família ${pet.nome}`);
  const [inviteCode, setInviteCode] = useState('');

  const showToast = useToastStore((s) => s.showToast);

  // Restore Purchases (Apple §3.1.1 obrigatório) — L2
  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      if (result.isPremium) {
        showToast('success', 'Assinatura restaurada!');
      } else {
        showToast('info', 'Nenhuma assinatura ativa encontrada.');
      }
    } catch {
      showToast('error', 'Falha ao restaurar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ── Inicialização ─────────────────────────────────────────

  // Source vem como query param do caller (router.push({ pathname: '/premium',
  // params: { source: '...' } })). Sem source = 'other' (não-rastreável).
  const { source: sourceParam } = useLocalSearchParams<{ source?: string }>();
  const paywallSource: PaywallSource = (sourceParam ?? 'other') as PaywallSource;

  useEffect(() => {
    track({ name: 'paywall_viewed', props: { source: paywallSource } });
    (async () => {
      const session = await getSession();
      if (!session) { setView('pitch'); return; }
      setUser(session);

      if (familyGroupId) {
        await loadDashboard(familyGroupId, session.id);
      } else {
        const g = await getMyFamilyGroup();
        if (g) {
          setFamilyGroupId(g.id);
          await loadDashboard(g.id, session.id);
        } else {
          setView('setup');
        }
      }
    })();

    return () => { unsubscribeAll(); };
  }, []);

  const loadDashboard = useCallback(async (gId: string, userId: string) => {
    const [g, m] = await Promise.all([
      getMyFamilyGroup(),
      getFamilyMembers(gId),
    ]);
    setGroup(g);
    setMembers(m);
    setView('dashboard');

    subscribeToFamilyLogs(gId, userId, (log) => {
      appendRemoteLog(log);
    });
  }, [appendRemoteLog]);

  // ── Auth ──────────────────────────────────────────────────

  const handleAuth = useCallback(async () => {
    // ─── Validação client-side ──────────────────────────────
    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'E-mail inválido');
      return;
    }
    if (authTab === 'signup') {
      const strength = checkPasswordStrength(password);
      if (!strength.isValid) {
        Alert.alert(
          'Senha fraca',
          `Sua senha precisa de:\n\n• ${strength.issues.join('\n• ')}`,
        );
        return;
      }
      if (!nome.trim() || nome.trim().length > INPUT_LIMITS.PET_NAME_MAX) {
        Alert.alert('Erro', 'Nome inválido');
        return;
      }
    }

    // ─── Rate limit client-side ─────────────────────────────
    // Protege contra brute-force local (ex: teclado repetindo Enter).
    // Backend ainda é a fonte de verdade (Supabase tem rate-limit próprio).
    const rateKey = `auth:${authTab}:${email.trim().toLowerCase()}`;
    const check = checkRateLimit(rateKey, {
      maxAttempts: 5,
      windowMs:    60_000,      // janela de 1 minuto
      lockoutMs:   5 * 60_000,  // lockout 5 minutos após exceder
    });
    if (!check.allowed) {
      const mins = Math.ceil(check.remainingMs / 60_000);
      Alert.alert(
        'Muitas tentativas',
        `Aguarde ${mins} minuto${mins === 1 ? '' : 's'} antes de tentar novamente.`,
      );
      return;
    }

    setLoading(true);
    try {
      const u = authTab === 'signup'
        ? await signUp(email, password, nome)
        : await signIn(email, password);
      setUser(u);
      clearRateLimit(rateKey);  // reset após sucesso

      const g = await getMyFamilyGroup();
      if (g) {
        setFamilyGroupId(g.id);
        await loadDashboard(g.id, u.id);
      } else {
        setView('setup');
      }
    } catch (err: unknown) {
      recordRateLimitAttempt(rateKey);
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro', translateSupabaseError(msg));
    } finally {
      setLoading(false);
    }
  }, [email, password, nome, authTab, loadDashboard, setUser, setFamilyGroupId]);

  // ── Setup: criar grupo ────────────────────────────────────

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim() || !user) return;
    // L4: consent LGPD art. 7º V + §5º — compartilhamento de dados
    // com terceiros (futuros membros) requer manifestação explícita.
    Alert.alert(
      'Compartilhamento familiar',
      `Ao criar este grupo:\n\n` +
      `• Tutores convidados terão acesso a TODOS os registros, fotos, notas e relatórios de ${pet.nome}.\n` +
      `• Os dados serão armazenados nos servidores do CronoPet (Supabase / AWS us-east-1) enquanto pelo menos um tutor mantiver assinatura Pro ativa.\n` +
      `• A transferência internacional é amparada pelas Cláusulas-Padrão Contratuais da ANPD (Res. 19/2024).\n` +
      `• Você pode sair do compartilhamento e desativar o grupo a qualquer momento em Ajustes.\n\n` +
      `Confirma a criação do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            setSyncStatus('syncing');
            try {
              const g = await createFamilyGroup(groupName.trim(), pet);
              setFamilyGroupId(g.id);
              await initialFullSync(g.id, user.id, actionHistory, vaccines, appointments, weightHistory);
              setSyncStatus('synced');
              await loadDashboard(g.id, user.id);
            } catch (err: any) {
              setSyncStatus('error');
              Alert.alert('Erro ao criar grupo', translateSupabaseError(err?.message));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [groupName, user, pet, actionHistory, vaccines, appointments, weightHistory,
      setFamilyGroupId, setSyncStatus, loadDashboard]);

  // ── Setup: entrar com código ──────────────────────────────

  const handleJoinGroup = useCallback(async () => {
    if (inviteCode.trim().length !== 8 || !user) return;
    // L4: aceite explícito do tutor convidado (bilateralidade LGPD)
    Alert.alert(
      'Entrar em grupo familiar',
      `Ao entrar neste grupo:\n\n` +
      `• Você terá acesso aos registros já criados pelos outros tutores deste pet.\n` +
      `• Seus próprios registros e fotos ficarão visíveis para os demais tutores.\n` +
      `• Os dados serão armazenados nos servidores do CronoPet (Supabase / AWS us-east-1).\n` +
      `• Você pode sair do grupo a qualquer momento em Ajustes.\n\n` +
      `Confirma a entrada no grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            setSyncStatus('syncing');
            try {
              const g = await joinFamilyGroup(inviteCode.trim());
              setFamilyGroupId(g.id);
              const cloudData = await pullGroupData(g.id);
              hydrateFromCloud(cloudData);
              setSyncStatus('synced');
              await loadDashboard(g.id, user.id);
            } catch (err: any) {
              setSyncStatus('error');
              Alert.alert('Erro', translateSupabaseError(err?.message));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [inviteCode, user, setFamilyGroupId, setSyncStatus, loadDashboard, hydrateFromCloud]);

  // ── Sign out ──────────────────────────────────────────────

  const handleSignOut = useCallback(() => {
    Alert.alert('Sair da conta', 'Seus dados locais serão mantidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          unsubscribeAll();
          await signOut().catch(() => {});
          setUser(null);
          setFamilyGroupId(null);
          setSyncStatus('idle');
          setGroup(null);
          setMembers([]);
          setView('auth');
        },
      },
    ]);
  }, [setUser, setFamilyGroupId, setSyncStatus]);

  // ── Copiar código ─────────────────────────────────────────

  const handleCopyCode = useCallback(() => {
    if (!group?.inviteCode) return;
    Clipboard.setString(group.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  }, [group]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      }}>
        <ScalePress onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ padding: 6, marginLeft: -6 }}>
          <ChevronLeft size={24} strokeWidth={2} color={colors.textPrimary} />
        </ScalePress>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', fontFamily: 'Nunito_700Bold' }}>CronoPet</Text>
            <View style={{ backgroundColor: '#04A29B', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 11 }}>PRO</Text>
            </View>
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>Compartilhamento Familiar</Text>
        </View>
      </View>

      {view === 'loading' && (
        <View style={{ flex: 1, paddingTop: 8 }}>
          <SkeletonPremiumDashboard />
        </View>
      )}

      {view === 'pitch' && (
        <ViewPitchBoldV3
          petNome={pet.nome}
          onRestorePurchases={handleRestore}
          onOpenLegal={(which) => openLegal(which)}
        />
      )}

      {view === 'auth' && (
        <ViewAuth
          tab={authTab} onTabChange={setAuthTab}
          email={email} onEmail={setEmail}
          password={password} onPassword={setPassword}
          nome={nome} onNome={setNome}
          loading={loading} onSubmit={handleAuth}
        />
      )}

      {view === 'setup' && user && (
        <ViewSetup
          petNome={pet.nome}
          groupName={groupName} onGroupName={setGroupName}
          inviteCode={inviteCode} onInviteCode={setInviteCode}
          loading={loading}
          onCreateGroup={handleCreateGroup}
          onJoinGroup={handleJoinGroup}
        />
      )}

      {view === 'dashboard' && group && (
        <ViewDashboard
          group={group}
          members={members}
          user={user!}
          syncStatus={syncStatus}
          codeCopied={codeCopied}
          onCopyCode={handleCopyCode}
          onSignOut={handleSignOut}
        />
      )}
    </SafeAreaView>
  );
}

// ─── View: Auth ───────────────────────────────────────────────

function ViewAuth({
  tab, onTabChange, email, onEmail, password, onPassword,
  nome, onNome, loading, onSubmit,
}: {
  tab: AuthTab; onTabChange: (t: AuthTab) => void;
  email: string; onEmail: (v: string) => void;
  password: string; onPassword: (v: string) => void;
  nome: string; onNome: (v: string) => void;
  loading: boolean; onSubmit: () => void;
}) {
  const { colors, isDark } = useThemeColors();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;

  const inputStyle = {
    backgroundColor: colors.bgInput,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.textPrimary,
  };

  // Validação progressiva — não mostra erro até usuário tentar submeter
  const canSubmit = isValidEmail(email)
    && password.length >= (tab === 'signup' ? INPUT_LIMITS.PASSWORD_MIN : 1)
    && (tab === 'signin' || nome.trim().length > 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Benefícios */}
        <View style={{ backgroundColor: darkCardBg, borderRadius: 20, padding: 20, marginBottom: 24, gap: 12 }}>
          <Text style={{ color: '#04A29B', fontWeight: '800', fontSize: 16, fontFamily: 'Nunito_800ExtraBold', marginBottom: 4 }}>
            🏆 Compartilhamento Familiar
          </Text>
          {[
            { e: '👨‍👩‍👦', t: 'Toda a família acompanha a rotina em tempo real' },
            { e: '🔄', t: 'Registros sincronizados automaticamente na nuvem' },
            { e: '🩺', t: 'Histórico médico acessível por qualquer membro' },
          ].map((b) => (
            <View key={b.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 20 }}>{b.e}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{b.t}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.bgInput, borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {(['signin', 'signup'] as AuthTab[]).map((t) => (
            <ScalePress key={t} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onTabChange(t); }} style={{ flex: 1 }}>
              <View style={{
                borderRadius: 11, paddingVertical: 10, alignItems: 'center',
                backgroundColor: tab === t ? colors.bgCard : 'transparent',
                ...(tab === t && Platform.OS === 'android' ? { elevation: 2 } : {}),
              }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: tab === t ? colors.textPrimary : colors.textTertiary }}>
                  {t === 'signin' ? 'Entrar' : 'Criar conta'}
                </Text>
              </View>
            </ScalePress>
          ))}
        </View>

        <View style={{ gap: 14 }}>
          {tab === 'signup' && (
            <TextInput
              value={nome} onChangeText={onNome}
              placeholder="Seu nome" placeholderTextColor={colors.textTertiary}
              autoCapitalize="words" autoCorrect={false} maxLength={40}
              style={inputStyle}
            />
          )}
          <TextInput
            value={email} onChangeText={onEmail}
            placeholder="E-mail" placeholderTextColor={colors.textTertiary}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            style={inputStyle}
          />
          <TextInput
            value={password} onChangeText={onPassword}
            placeholder="Senha (mínimo 6 caracteres)" placeholderTextColor={colors.textTertiary}
            secureTextEntry autoCapitalize="none"
            style={inputStyle}
          />

          <ScalePress
            onPress={() => {
              if (!canSubmit || loading) return;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onSubmit();
            }}
            style={{
              borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center',
              backgroundColor: canSubmit ? colors.textPrimary : colors.bgMuted,
              marginTop: 4,
            }}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={{ color: canSubmit ? colors.bgScreen : colors.textDisabled, fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold' }}>
                  {tab === 'signin' ? 'Entrar' : 'Criar conta'}
                </Text>
            }
          </ScalePress>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── View: Setup ──────────────────────────────────────────────

function ViewSetup({
  petNome, groupName, onGroupName, inviteCode, onInviteCode,
  loading, onCreateGroup, onJoinGroup,
}: {
  petNome: string;
  groupName: string; onGroupName: (v: string) => void;
  inviteCode: string; onInviteCode: (v: string) => void;
  loading: boolean;
  onCreateGroup: () => void; onJoinGroup: () => void;
}) {
  const { colors } = useThemeColors();

  const inputStyle = {
    backgroundColor: colors.bgInput,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.textPrimary,
  };

  const canCreate = groupName.trim().length > 0;
  const canJoin   = inviteCode.trim().length === 8;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>
          Você está conectado. Agora crie um grupo familiar para {petNome} ou entre em um grupo existente com o código de um membro.
        </Text>

        {/* Criar grupo */}
        <View style={{
          backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, gap: 14,
          ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
        }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold' }}>👨‍👩‍👦 Criar grupo familiar</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Seus dados locais serão sincronizados e sua família receberá um código de 8 dígitos para entrar.
          </Text>
          <TextInput
            value={groupName} onChangeText={onGroupName}
            placeholder="Nome do grupo" placeholderTextColor={colors.textTertiary}
            autoCapitalize="words" maxLength={30}
            style={inputStyle}
          />
          <ScalePress
            onPress={() => {
              if (!canCreate || loading) return;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onCreateGroup();
            }}
            style={{
              borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center',
              backgroundColor: canCreate ? colors.textPrimary : colors.bgMuted,
            }}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={{ color: canCreate ? colors.bgScreen : colors.textDisabled, fontWeight: '700', fontSize: 15, fontFamily: 'Nunito_700Bold' }}>
                  Criar grupo + Sincronizar dados
                </Text>
            }
          </ScalePress>
        </View>

        {/* Separador */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>ou</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {/* Entrar com código */}
        <View style={{
          backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, gap: 14,
          ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
        }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold' }}>🔑 Entrar com código</Text>
          <TextInput
            value={inviteCode} onChangeText={(v) => onInviteCode(v.toUpperCase())}
            placeholder="Código de 8 dígitos" placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters" autoCorrect={false} maxLength={8}
            style={{ ...inputStyle, letterSpacing: 4, textAlign: 'center', fontSize: 18, fontWeight: '700' }}
          />
          <ScalePress
            onPress={() => {
              if (!canJoin || loading) return;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onJoinGroup();
            }}
            style={{
              borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center',
              backgroundColor: canJoin ? '#2563eb' : colors.bgMuted,
            }}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={{ color: canJoin ? '#ffffff' : colors.textDisabled, fontWeight: '700', fontSize: 15, fontFamily: 'Nunito_700Bold' }}>
                  Entrar no grupo
                </Text>
            }
          </ScalePress>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── View: Dashboard ──────────────────────────────────────────

function ViewDashboard({
  group, members, user, syncStatus, codeCopied, onCopyCode, onSignOut,
}: {
  group: FamilyGroup; members: FamilyMember[];
  user: { id: string; email: string; nome?: string };
  syncStatus: string; codeCopied: boolean;
  onCopyCode: () => void; onSignOut: () => void;
}) {
  const { colors, actionTheme, isDark } = useThemeColors();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;

  const syncColor = syncStatus === 'synced' ? '#036E69' : syncStatus === 'syncing' ? '#d97706' : syncStatus === 'error' ? '#dc2626' : colors.textTertiary;
  const syncLabel = syncStatus === 'synced' ? '✅ Sincronizado' : syncStatus === 'syncing' ? '🔄 Sincronizando...' : syncStatus === 'error' ? '⚠️ Erro na sync' : '◦ Aguardando';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 20 }}>
      {/* Status / grupo */}
      <View style={{
        backgroundColor: darkCardBg, borderRadius: 20, padding: 20, gap: 8,
        ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#04A29B', fontWeight: '800', fontSize: 16, fontFamily: 'Nunito_700Bold' }}>{group.nome}</Text>
          <Text style={{ color: syncColor, fontSize: 12, fontWeight: '600' }}>{syncLabel}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {user.nome ?? user.email} · {group.ownerId === user.id ? 'Dono do grupo' : 'Membro'}
        </Text>
      </View>

      {/* Código de convite */}
      <View style={{
        backgroundColor: colors.bgCard, borderRadius: 20, padding: 20,
        ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
      }}>
        <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>
          🔑 Código de convite
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: colors.bgInput, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold', letterSpacing: 5 }}>
              {group.inviteCode}
            </Text>
          </View>
          <ScalePress
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCopyCode();
            }}
            style={{
              backgroundColor: codeCopied ? '#059669' : colors.textPrimary,
              borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}
          >
            {codeCopied
              ? <Check size={16} strokeWidth={2} color="#ffffff" />
              : <Copy size={16} strokeWidth={2} color={colors.bgScreen} />
            }
            <Text style={{ color: codeCopied ? '#ffffff' : colors.bgScreen, fontWeight: '700', fontSize: 13, fontFamily: 'Nunito_700Bold' }}>
              {codeCopied ? 'Copiado' : 'Copiar'}
            </Text>
          </ScalePress>
        </View>
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 10, lineHeight: 18 }}>
          Compartilhe este código com os membros da família. Eles vão usar na tela de entrada.
        </Text>
      </View>

      {/* Membros */}
      <View style={{
        backgroundColor: colors.bgCard, borderRadius: 20, padding: 20,
        ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
      }}>
        <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 15, marginBottom: 14 }}>
          👥 Membros ({members.length})
        </Text>
        {members.length === 0
          ? <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Nenhum membro carregado.</Text>
          : members.map((m) => (
            <View key={m.userId} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bgInput,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: m.role === 'owner' ? '#04A29B' : colors.bgMuted,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 18 }}>{m.role === 'owner' ? '👑' : '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                  {m.nome}{m.userId === user.id ? ' (você)' : ''}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{m.email}</Text>
              </View>
              {m.role === 'owner' && (
                <View style={{ backgroundColor: actionTheme.comida.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: actionTheme.comida.primary, fontSize: 11, fontWeight: '700' }}>Dono</Text>
                </View>
              )}
            </View>
          ))
        }
      </View>

      {/* Info realtime */}
      <View style={{
        backgroundColor: actionTheme.passeio.bg,
        borderWidth: 1, borderColor: actionTheme.passeio.border,
        borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
      }}>
        <Text style={{ fontSize: 20 }}>⚡</Text>
        <Text style={{ color: actionTheme.passeio.primary, fontSize: 13, flex: 1, lineHeight: 20 }}>
          Os registros diários de todos os membros aparecem em tempo real na tela inicial de cada dispositivo.
        </Text>
      </View>

      {/* Sair */}
      <ScalePress
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSignOut();
        }}
        style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.bgInput }}
      >
        <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14, fontFamily: 'Nunito_700Bold' }}>Sair da conta</Text>
      </ScalePress>
    </ScrollView>
  );
}

// translateSupabaseError movido pra lib/supabaseErrors.ts (sprint AUTH 2026-05-24).

