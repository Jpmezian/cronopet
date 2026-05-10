import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, Alert, KeyboardAvoidingView,
  Clipboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronLeft, Copy, Check } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { SkeletonPremiumDashboard } from '@/components/ui/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePetStore } from '@/store/usePetStore';
import { signIn, signUp, signOut, getSession } from '@/services/AuthService';
import { track } from '@/services/analytics';
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

// ─── Tipos locais ─────────────────────────────────────────────

type ScreenView = 'loading' | 'pitch' | 'auth' | 'setup' | 'dashboard';
type AuthTab = 'signin' | 'signup';

// ─── Pricing ──────────────────────────────────────────────────
// Preços de referência (placeholder). Integrar StoreKit 2 / Billing.

interface PricingPlan {
  id: 'monthly' | 'annual';
  label: string;
  price: string;
  caption: string;
  badge?: string;
  savings?: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id:      'annual',
    label:   'Anual',
    price:   'R$ 99',
    caption: 'R$ 0,27/dia',
    badge:   '🔥 MAIS POPULAR',
    savings: 'Economize 44% · 2 meses grátis',
  },
  {
    id:      'monthly',
    label:   'Mensal',
    price:   'R$ 14,90',
    caption: 'R$ 0,50/dia',
  },
];

// ─── Benefícios do Premium (sem testimonials mockados) ────────
// Quando tivermos depoimentos reais (com consentimento explícito),
// substituir esta lista por TESTIMONIALS.

const PREMIUM_HIGHLIGHTS = [
  {
    icon:  '⏱️',
    title: 'Histórico ilimitado',
    desc:  'Plano gratuito guarda 30 dias. Premium guarda desde o primeiro registro.',
  },
  {
    icon:  '👨‍👩‍👦',
    title: 'Família compartilhada',
    desc:  'Todos os tutores acompanham a rotina em tempo real. Cada um vê quem fez o quê.',
  },
  {
    icon:  '☁️',
    title: 'Backup na nuvem',
    desc:  'Trocou de celular? Faça login e tudo está lá. Nunca perca dados do seu pet.',
  },
];

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

  // ── Inicialização ─────────────────────────────────────────

  useEffect(() => {
    track({ name: 'paywall_viewed', props: { source: 'other' } });
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
  }, [groupName, user, pet, actionHistory, vaccines, appointments, weightHistory,
      setFamilyGroupId, setSyncStatus, loadDashboard]);

  // ── Setup: entrar com código ──────────────────────────────

  const handleJoinGroup = useCallback(async () => {
    if (inviteCode.trim().length !== 8 || !user) return;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
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
            <View style={{ backgroundColor: '#fbbf24', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
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
        <ViewPitch
          petNome={pet.nome}
          onStartTrial={() => setView('auth')}
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
          <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 16, fontFamily: 'Nunito_800ExtraBold', marginBottom: 4 }}>
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

  const syncColor = syncStatus === 'synced' ? '#16a34a' : syncStatus === 'syncing' ? '#d97706' : syncStatus === 'error' ? '#dc2626' : colors.textTertiary;
  const syncLabel = syncStatus === 'synced' ? '✅ Sincronizado' : syncStatus === 'syncing' ? '🔄 Sincronizando...' : syncStatus === 'error' ? '⚠️ Erro na sync' : '◦ Aguardando';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 20 }}>
      {/* Status / grupo */}
      <View style={{
        backgroundColor: darkCardBg, borderRadius: 20, padding: 20, gap: 8,
        ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 16, fontFamily: 'Nunito_700Bold' }}>{group.nome}</Text>
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
                backgroundColor: m.role === 'owner' ? '#fbbf24' : colors.bgMuted,
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

// ─── Utils ────────────────────────────────────────────────────

function translateSupabaseError(msg?: string): string {
  if (!msg) return 'Erro desconhecido. Tente novamente.';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered'))   return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be'))        return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Unable to validate'))        return 'E-mail inválido.';
  if (msg.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar.';
  return msg;
}

// ─── View: Pitch (nova tela de vendas) ────────────────────────

function ViewPitch({ petNome, onStartTrial }: { petNome: string; onStartTrial: () => void }) {
  const { colors, actionTheme, isDark } = useThemeColors();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;

  const benefits = [
    {
      emoji: '👨‍👩‍👦',
      title: 'Família toda conectada',
      desc:  `Todos veem a rotina do ${petNome || 'pet'} em tempo real — quem já deu comida, passeou, ou registrou algo.`,
      tone:  'passeio' as const,
    },
    {
      emoji: '☁️',
      title: 'Backup na nuvem',
      desc:  'Seus dados salvos com segurança. Trocou de celular? Abra o app e tudo tá lá.',
      tone:  'agua' as const,
    },
    {
      emoji: '🐾',
      title: 'Múltiplos pets',
      desc:  'Cadastre mais de um bicho. Dashboards separados, histórico individual, planos nutricionais próprios.',
      tone:  'comida' as const,
    },
    {
      emoji: '📊',
      title: 'Histórico ilimitado',
      desc:  'Guarda registros desde o primeiro dia. Perfeito para o check-up anual do veterinário.',
      tone:  'xixi' as const,
    },
    {
      emoji: '💾',
      title: 'Exportação avançada',
      desc:  'PDF vet-friendly + JSON para sistemas veterinários. Dados seus, quando quiser.',
      tone:  'coco' as const,
    },
  ];

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={{
        backgroundColor: darkCardBg,
        borderRadius: 24,
        paddingHorizontal: 24, paddingVertical: 28,
        marginBottom: 20,
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: '#fbbf24',
          width: 72, height: 72, borderRadius: 20,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
          ...(Platform.OS === 'android' ? { elevation: 6 } : {
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2, shadowRadius: 10,
          }),
        }}>
          <Text style={{ fontSize: 36 }}>👑</Text>
        </View>
        <Text style={{
          color: '#ffffff',
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 26, fontWeight: '800',
          textAlign: 'center',
          marginBottom: 6,
        }}>
          CronoPet PRO
        </Text>
        <Text style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: 14, fontWeight: '500',
          textAlign: 'center',
          lineHeight: 20,
        }}>
          Todo o cuidado, multiplicado{'\n'}pela sua família.
        </Text>

        {/* Trial badge */}
        <View style={{
          backgroundColor: 'rgba(251,191,36,0.18)',
          borderWidth: 1.5, borderColor: '#fbbf24',
          borderRadius: 100,
          paddingHorizontal: 16, paddingVertical: 7,
          marginTop: 16,
          flexDirection: 'row', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 14, marginRight: 6 }}>🎁</Text>
          <Text style={{
            color: '#fbbf24',
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 12, fontWeight: '800',
            letterSpacing: 0.5,
          }}>
            7 DIAS GRÁTIS · SEM CARTÃO
          </Text>
        </View>

        {/* Beta honesto — sem números mockados */}
        <Text style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11, marginTop: 10,
          textAlign: 'center',
        }}>
          <Text style={{ color: '#fbbf24', fontWeight: '800' }}>Acesso antecipado</Text> · seja um dos primeiros tutores
        </Text>
      </View>

      {/* Benefícios */}
      <Text style={{
        color: colors.textTertiary,
        fontSize: 11, fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 12, marginLeft: 4,
      }}>
        O QUE VOCÊ GANHA
      </Text>

      <View style={{ gap: 10, marginBottom: 24 }}>
        {benefits.map((b) => (
          <View
            key={b.title}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
              ...(Platform.OS === 'android' ? { elevation: 1 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04, shadowRadius: 4,
              }),
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: actionTheme[b.tone].bg,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 20 }}>{b.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: colors.textPrimary,
                fontFamily: 'Nunito_700Bold',
                fontSize: 14, fontWeight: '700',
                marginBottom: 2,
              }}>
                {b.title}
              </Text>
              <Text style={{
                color: colors.textSecondary,
                fontSize: 12, lineHeight: 17,
              }}>
                {b.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Comparação Free × Pro */}
      <Text style={{
        color: colors.textTertiary,
        fontSize: 11, fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 12, marginLeft: 4,
      }}>
        FREE × PRO
      </Text>

      <View style={{
        backgroundColor: colors.bgCard,
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
      }}>
        {[
          { feat: 'Registro diário de 6 ações',         free: true, pro: true },
          { feat: 'Histórico completo',                 free: '30 dias', pro: 'Ilimitado' },
          { feat: 'Plano nutricional + rações',         free: true, pro: true },
          { feat: 'Relatório PDF veterinário',          free: true, pro: true },
          { feat: 'Card compartilhável (story)',        free: true, pro: true },
          { feat: 'Múltiplos pets',                     free: false, pro: true },
          { feat: 'Família compartilhada',              free: false, pro: true },
          { feat: 'Backup em nuvem',                    free: false, pro: true },
          { feat: 'Exportação JSON',                    free: false, pro: true },
        ].map((r, i) => (
          <View
            key={r.feat}
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16, paddingVertical: 11,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.bgInput,
              alignItems: 'center',
            }}
          >
            <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13 }}>
              {r.feat}
            </Text>
            <View style={{ width: 60, alignItems: 'center' }}>
              {typeof r.free === 'boolean' ? (
                <Text style={{ fontSize: 16, color: r.free ? actionTheme.passeio.primary : colors.textTertiary }}>
                  {r.free ? '✓' : '—'}
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600' }}>
                  {r.free}
                </Text>
              )}
            </View>
            <View style={{ width: 72, alignItems: 'center' }}>
              {typeof r.pro === 'boolean' ? (
                <Text style={{ fontSize: 16, color: '#fbbf24', fontWeight: '800' }}>
                  {r.pro ? '✓' : '—'}
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: '800' }}>
                  {r.pro}
                </Text>
              )}
            </View>
          </View>
        ))}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16, paddingVertical: 10,
          backgroundColor: colors.bgInput,
        }}>
          <Text style={{ flex: 1 }} />
          <Text style={{ width: 60, textAlign: 'center', fontSize: 10, color: colors.textTertiary, fontWeight: '700', letterSpacing: 0.5 }}>
            FREE
          </Text>
          <Text style={{ width: 72, textAlign: 'center', fontSize: 10, color: '#fbbf24', fontWeight: '800', letterSpacing: 0.5 }}>
            PRO
          </Text>
        </View>
      </View>

      {/* Pricing */}
      <Text style={{
        color: colors.textTertiary,
        fontSize: 11, fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 12, marginLeft: 4,
      }}>
        ESCOLHA SEU PLANO
      </Text>

      <View style={{ gap: 10, marginBottom: 24 }}>
        {PRICING_PLANS.map((plan) => {
          const active = plan.id === selectedPlan;
          return (
            <ScalePress
              key={plan.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlan(plan.id);
              }}
              accessible accessibilityRole="button"
              accessibilityLabel={`${plan.label}, ${plan.price}${plan.savings ? `, ${plan.savings}` : ''}`}
              accessibilityState={{ selected: active }}
              style={{
                backgroundColor: active ? actionTheme.comida.bg : colors.bgCard,
                borderRadius: 16,
                padding: 16,
                borderWidth: 2,
                borderColor: active ? '#fbbf24' : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {/* Radio */}
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 2, borderColor: active ? '#fbbf24' : colors.border,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 14,
              }}>
                {active && (
                  <View style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: '#fbbf24',
                  }} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{
                    color: colors.textPrimary,
                    fontFamily: 'Nunito_700Bold',
                    fontSize: 15, fontWeight: '700',
                  }}>
                    {plan.label}
                  </Text>
                  {plan.badge && (
                    <View style={{
                      backgroundColor: '#fbbf24',
                      borderRadius: 6,
                      paddingHorizontal: 6, paddingVertical: 2,
                      marginLeft: 8,
                    }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                        {plan.badge}
                      </Text>
                    </View>
                  )}
                </View>
                {plan.savings && (
                  <Text style={{ color: actionTheme.passeio.primary, fontSize: 11, fontWeight: '700' }}>
                    {plan.savings}
                  </Text>
                )}
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{
                  color: colors.textPrimary,
                  fontFamily: 'Nunito_800ExtraBold',
                  fontSize: 18, fontWeight: '800',
                }}>
                  {plan.price}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
                  {plan.caption}
                </Text>
              </View>
            </ScalePress>
          );
        })}
      </View>

      {/* Highlights do Premium (substitui testimonials até termos depoimentos reais) */}
      <Text style={{
        color: colors.textTertiary,
        fontSize: 11, fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 12, marginLeft: 4,
      }}>
        ✨ DESTAQUES DO PREMIUM
      </Text>

      <View style={{ gap: 10, marginBottom: 20 }}>
        {PREMIUM_HIGHLIGHTS.map((h) => (
          <View
            key={h.title}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 14,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
              borderLeftWidth: 3,
              borderLeftColor: '#fbbf24',
            }}
          >
            <Text style={{ fontSize: 22, marginRight: 12 }}>{h.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: colors.textPrimary,
                fontFamily: 'Nunito_700Bold',
                fontSize: 14, fontWeight: '700',
                marginBottom: 3,
              }}>
                {h.title}
              </Text>
              <Text style={{
                color: colors.textSecondary,
                fontSize: 12, lineHeight: 17,
              }}>
                {h.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA principal */}
      <ScalePress
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onStartTrial();
        }}
        accessible accessibilityRole="button"
        accessibilityLabel={`Iniciar teste grátis de 7 dias — plano ${selectedPlan === 'annual' ? 'anual' : 'mensal'}`}
        style={{
          backgroundColor: '#fbbf24',
          borderRadius: 16, height: 58,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 10,
          ...(Platform.OS === 'android' ? { elevation: 4 } : {
            shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.12, shadowRadius: 8,
          }),
        }}
      >
        <Text style={{
          color: colors.textPrimary,
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 16, fontWeight: '800',
        }}>
          Começar 7 dias grátis →
        </Text>
      </ScalePress>

      <Text style={{
        color: colors.textTertiary,
        fontSize: 11, textAlign: 'center',
        lineHeight: 15,
        marginBottom: 4,
      }}>
        Cancele quando quiser. Sem compromisso.{'\n'}
        Cobrança {selectedPlan === 'annual' ? 'anual' : 'mensal'} depois do trial.
      </Text>
    </ScrollView>
  );
}
