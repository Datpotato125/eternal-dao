import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import SessionProvider from '@/components/SessionProvider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Eternal Dao — Cultivation RPG',
  description: 'A xianxia cultivation RPG spanning Discord, web, mobile, and desktop. Cultivate Qi, forge sects, and ascend the immortal path.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="bg-ink-900 text-ink-100 font-body antialiased min-h-screen">
        <SessionProvider session={session}>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-ink-600 mt-16 py-8 text-center text-ink-300 text-sm font-cinzel tracking-wider">
            <p>ETERNAL DAO · The Immortal Path Awaits</p>
            <p className="mt-1 text-xs text-ink-400">©2026 — Free to play forever</p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
