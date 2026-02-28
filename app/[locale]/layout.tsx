import type { Metadata } from 'next'
import { Sora, Manrope, Fira_Code } from 'next/font/google'
import '../globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { WalletProvider } from '@/components/providers/wallet-provider'
import { AnalyticsProvider } from '@/components/providers/analytics-provider'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const sora = Sora({
  variable: '--font-heading',
  subsets: ['latin'],
})

const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
})

const firaCode = Fira_Code({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Superteam Academy - Learn Solana Development',
  description: 'Interactive Solana development courses with on-chain credentials and gamified learning.',
  keywords: ['Solana', 'blockchain', 'web3', 'learning', 'courses', 'education'],
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const children = props.children;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${sora.variable} ${firaCode.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <WalletProvider>
              <AnalyticsProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
              </AnalyticsProvider>
            </WalletProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
