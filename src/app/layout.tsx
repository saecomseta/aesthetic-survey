import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import "./globals.css";

const bodoniModa = Bodoni_Moda({ 
  weight: ['400', '500', '700', '900'],
  subsets: ["latin"],
  variable: '--font-bodoni-moda',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "SomeGood - 고객 관리 & 설문 시스템",
  description: "프리미엄 고객 설문 및 진단 관리 플랫폼",
};

import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={bodoniModa.variable}>
      <body className={`${bodoniModa.className} font-sans bg-brand-bg text-brand-text`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
