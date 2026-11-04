import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import { PerformancePatch } from "@/components/PerformancePatch";

const generalSans = localFont({
  src: "../../public/fonts/GeneralSans-Variable.woff2",
  variable: "--font-general",
  weight: "200 700",
  display: "swap",
});

// Fontes self-hosted (antes via next/font/google). O next/font/google baixa os
// arquivos do fonts.gstatic.com durante o build, e uma falha nesse download
// derrubou builds na Vercel (2026-11-04). Arquivos: versões variáveis, subset
// latin (o mesmo que era carregado), tirados de @fontsource-variable/* 5.3.0.
// Licenças OFL em public/fonts/licenses/.
const plusJakartaSans = localFont({
  src: "../../public/fonts/PlusJakartaSans-Variable-latin.woff2",
  variable: "--font-plus-jakarta",
  weight: "200 800",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/GeistMono-Variable-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
});

const caveat = localFont({
  src: "../../public/fonts/Caveat-Variable-latin.woff2",
  variable: "--font-caveat",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://studytrack.com.br'),
  title: {
    default: 'StudyTrack - Estude direcionado',
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
  // PWA / iOS "Adicionar à Tela de Início" — usado pelo hint de instalação
  // no app do aluno (PushManager.tsx). manifest.ts cobre o Android/Chrome;
  // estes campos cobrem o Safari/iOS, que ignora o manifest para esse fim.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StudyTrack",
  },
  icons: {
    apple: "/logost.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${generalSans.variable} ${plusJakartaSans.variable} ${geistMono.variable} ${caveat.variable} antialiased animate-in fade-in duration-300`}
      >
        <ThemeProvider>
          <PerformancePatch />
          <GlobalErrorHandler />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
