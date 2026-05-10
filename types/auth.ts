// ─── Tipos de Autenticação / Premium ─────────────────────────

export interface CronoPetUser {
  id:    string;
  email: string;
  nome?: string;
}

export interface FamilyGroup {
  id:         string;
  nome:       string;
  inviteCode: string;
  ownerId:    string;
}

export interface FamilyMember {
  userId:   string;
  nome:     string;
  email:    string;
  role:     'owner' | 'member';
  joinedAt: string;
}
