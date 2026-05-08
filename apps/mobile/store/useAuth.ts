import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Character {
  id: string;
  realm_level: number;
  qi_current: number;
  qi_max: number;
  cultivation_rate: number;
  spirit_root: string;
  pvp_wins: number;
  pvp_losses: number;
  breakthrough_attempts: number;
  cultivation_started_at: string | null;
}

interface AuthState {
  session:   Session | null;
  user:      User    | null;
  character: Character | null;
  discordId: string  | null;
  username:  string  | null;
  avatarUrl: string  | null;
  loading:   boolean;

  setSession:   (session: Session | null) => void;
  setCharacter: (character: Character | null) => void;
  fetchCharacter: () => Promise<void>;
  signOut:      () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session:   null,
  user:      null,
  character: null,
  discordId: null,
  username:  null,
  avatarUrl: null,
  loading:   true,

  setSession: (session) => {
    const user      = session?.user ?? null;
    const meta      = user?.user_metadata ?? {};
    const discordId = meta.provider_id ?? meta.sub ?? null;
    const username  = meta.full_name ?? meta.name ?? meta.user_name ?? null;
    const avatarUrl = meta.avatar_url ?? null;
    set({ session, user, discordId, username, avatarUrl, loading: false });
  },

  setCharacter: (character) => set({ character }),

  fetchCharacter: async () => {
    const { discordId } = get();
    if (!discordId) return;

    // Upsert player record from Discord OAuth metadata
    const { username, avatarUrl } = get();
    if (username) {
      await supabase.from('players').upsert({
        discord_id: discordId,
        username,
        avatar_url: avatarUrl,
        last_seen:  new Date().toISOString(),
      }, { onConflict: 'discord_id' });
    }

    const { data } = await supabase
      .from('characters')
      .select('id, realm_level, qi_current, qi_max, cultivation_rate, spirit_root, pvp_wins, pvp_losses, breakthrough_attempts, cultivation_started_at')
      .eq('player_id', discordId)
      .order('realm_level', { ascending: false })
      .limit(1)
      .maybeSingle();

    set({ character: data ?? null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, character: null, discordId: null });
  },
}));
