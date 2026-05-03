import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://studytrack.com.br'),
  title: {
    default: 'StudyTrack — Plataforma de estudos para o ENEM',
    template: '%s | StudyTrack',
  },
  description: 'Banco de questões, simulados personalizados e dashboard de desempenho para estudantes do ENEM e vestibulares. Estude de forma inteligente com a StudyTrack.',
  keywords: ['ENEM', 'vestibular', 'questões ENEM', 'simulado ENEM', 'plataforma de estudos', 'StudyTrack'],
  authors: [{ name: 'StudyTrack' }],
  creator: 'StudyTrack',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://studytrack.com.br',
    siteName: 'StudyTrack',
    title: 'StudyTrack — Plataforma de estudos para o ENEM',
    description: 'Banco de questões, simulados personalizados e dashboard de desempenho para o ENEM e vestibulares.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StudyTrack — Plataforma de estudos para o ENEM',
    description: 'Banco de questões, simulados personalizados e dashboard de desempenho para o ENEM e vestibulares.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased animate-in fade-in duration-300`}
      >
        <ThemeProvider>
          <GlobalErrorHandler />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
