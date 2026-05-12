import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Bebas_Neue, Oswald, Noto_Serif_JP } from "next/font/google";
import SupabaseKeepAlive from "@/components/SupabaseKeepAlive";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-cond",
  display: "swap",
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jp",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export const metadata: Metadata = {
  title: {
    default: "ArenaX — Compete. Rank. Dominate.",
    template: "%s | ArenaX",
  },
  description:
    "The competitive arena for engineers. 1v1 coding battles, ELO rankings, and skill-based tiers. Prove your rank.",
  keywords: ["competitive programming", "coding battles", "ELO rating", "DSA", "engineering skills"],
  openGraph: {
    title: "ArenaX — Compete. Rank. Dominate.",
    description: "The competitive arena for engineers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${bebasNeue.variable} ${oswald.variable} ${notoSerifJP.variable}`} suppressHydrationWarning>
      <head>
        {/* Warm up Supabase connection before user submits — reduces auth latency */}
        <link rel="preconnect" href="https://budjmjqaopyjndntezqz.supabase.co" />
        <link rel="dns-prefetch" href="https://budjmjqaopyjndntezqz.supabase.co" />
      </head>
      <body className="font-sans antialiased">
        <SupabaseKeepAlive />
        {children}
      </body>
    </html>
  );
}