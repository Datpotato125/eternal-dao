'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/realms',      label: 'Realms' },
  { href: '/lore',        label: 'Lore' },
  { href: '/shop',        label: 'Shop' },
  { href: '/patreon',     label: 'Patreon' },
];

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-ink-600 bg-ink-800/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-cinzel text-gold-500 text-lg font-bold tracking-widest gold-glow hover:text-gold-400 transition-colors">
          ☯ ETERNAL DAO
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-cinzel text-sm text-ink-200 hover:text-gold-400 transition-colors tracking-wide"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <Link href={`/profile/${session.user.discordId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {session.user.avatar && (
                  <Image
                    src={session.user.avatar}
                    alt={session.user.username ?? ''}
                    width={28}
                    height={28}
                    className="rounded-full border border-gold-600"
                  />
                )}
                <span className="font-cinzel text-sm text-ink-100 hidden sm:block">
                  {session.user.username}
                </span>
              </Link>
              <button
                onClick={() => signOut()}
                className="text-xs text-ink-300 hover:text-gold-400 transition-colors font-cinzel"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('discord')}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-cinzel text-sm px-4 py-1.5 rounded transition-colors"
            >
              Login with Discord
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
