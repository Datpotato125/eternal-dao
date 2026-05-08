import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      discordId: string;
      username: string;
      avatar: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId: string;
    username: string;
    avatar: string | null;
  }
}
