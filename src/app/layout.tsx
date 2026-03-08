import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
<<<<<<< HEAD
=======
import { Toaster } from "sonner";
import { PageTransition } from "@/components/ui/PageTransition";
>>>>>>> 648796428de17a1b98c8dbb4010206b9f26ab703

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyTrack",
  description: "Plano de estudos inteligente para o ENEM",
};

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
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased animate-in fade-in duration-300`}
      >
<<<<<<< HEAD
        {children}
=======
        <PageTransition>
          {children}
        </PageTransition>
        <Toaster richColors position="top-center" />
>>>>>>> 648796428de17a1b98c8dbb4010206b9f26ab703
      </body>
    </html>
  );
}
