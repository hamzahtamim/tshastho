import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";
import PWAInstallPrompt from "@/components/pwa/InstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Tshastho PWA metadata
export const metadata: Metadata = {
  title: {
    default: "Tshastho - Health & Pharmacy Platform",
    template: "%s - Tshastho",
  },
  description: "Bangladesh's health-tech SaaS – pharmacy, doctor, patient management",
  applicationName: "Tshastho",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tshastho",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Tshastho",
    description: "Health & Pharmacy Platform for Bangladesh",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body className="font-sans antialiased h-full bg-slate-50 text-slate-900">
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          {children}
        </GoogleOAuthProvider>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
