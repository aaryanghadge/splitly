import { Metadata } from 'next';
import { headers } from 'next/headers';
import { AuthProvider } from '@/contexts/AuthContext';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Splitly - Split Expenses with Friends',
  description: 'Split expenses with friends easily',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return (
      <html lang="en">
        <body className={inter.className}>
          <AuthProvider initialSession={session}>
            {children}
          </AuthProvider>
        </body>
      </html>
    );
  } catch (error) {
    console.error('Layout Error:', error);
    return (
      <html lang="en">
        <body className={inter.className}>
          <AuthProvider initialSession={null}>
            {children}
          </AuthProvider>
        </body>
      </html>
    );
  }
}