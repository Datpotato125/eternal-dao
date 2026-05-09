import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Character {
  id: string;
  server_id: string;
  realm_level: number;
  qi_current: number;
  qi_max: number;
  cultivation_rate: number;
  spirit_root: string;
  pvp_wins: number;
  pvp_losses: number;
  cultivation_started_at: string | null;
  players: { username: string; avatar_url: string | null } | null;
}

interface AuthState {
  session:      Session | null;
  character:    Character | null;
  username:     string | null;
  setSession:   (s: Session | null) => void;
  fetchCharacter: () => Promise<void>;
  signOut:      () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session:   null,
  character: null,
  username:  null,

  setSession: (session) => {
    const username =
      session?.user?.user_metadata?.full_name ??
      session?.user?.user_metadata?.name ??
      session?.user?.email ??
      null;
    set({ session, username });
  },

  fetchCharacter: async () => {
    const { session } = get();
    if (!session) return;
    const discordId = session.user.user_metadata?.provider_id ?? session.user.id;

    const [{ data: player }, { data: char }] = await Promise.all([
      supabase.from('players').select('username').eq('discord_id', discordId).maybeSingle(),
      supabase
        .from('characters')
        .select('id, server_id, realm_level, qi_current, qi_max, cultivation_rate, spirit_root, pvp_wins, pvp_losses, cultivation_started_at, players!player_id(username, avatar_url)')
        .eq('player_id', discordId)
        .maybeSingle(),
    ]);

    set({
      character: (char as unknown as Character) ?? null,
      username:  player?.username ?? get().username,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, character: null, username: null });
  },
}));
