import type { Metadata, Viewport } from "next";
import { Archivo_Black, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { RegisterSw } from "@/components/register-sw";
import { SiteHeader } from "@/components/site-header";
import { product } from "@/lib/factory";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: true,
});

const body = Newsreader({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  adjustFontFallback: true,
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: product.name,
    template: `%s · ${product.name}`,
  },
  description:
    "Turn a maintenance procedure into a short video someone can play beside the task.",
  applicationName: product.name,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: {
    capable: true,
    title: "PSVF",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#14110f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <RegisterSw />
        <SiteHeader />
        {children}
        <footer>
          <p>{product.name}</p>
          <p>{product.owner}</p>
        </footer>
      </body>
    </html>
  );
}
