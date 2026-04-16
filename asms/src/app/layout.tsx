import type { Metadata } from "next";
import { Gowun_Batang } from "next/font/google";
import "./globals.css";

const gowunBatang = Gowun_Batang({ 
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: '--font-gowun-batang',
  display: 'swap',
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
    <html lang="ko" className={gowunBatang.variable}>
      <body className={`${gowunBatang.className} font-sans`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
