import { AuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { supabase } from './supabase';

export const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId:     process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!profile || account?.provider !== 'discord') return false;
      const p = profile as Record<string, string>;
      await supabase.from('players').upsert({
        discord_id:    p.id,
        username:      p.username,
        discriminator: p.discriminator ?? '0',
        avatar_url:    p.avatar
          ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
          : null,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'discord_id' });
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'discord' && profile) {
        const p = profile as Record<string, string>;
        token.discordId = p.id;
        token.username  = p.username;
        token.avatar    = p.avatar
          ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
          : null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.discordId = token.discordId as string;
      session.user.username  = token.username  as string;
      session.user.avatar    = token.avatar    as string | null;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
