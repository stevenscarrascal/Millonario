import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import ThemeToggle from "./theme-toggle";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") || incoming.get("host") || "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  return {
    metadataBase: base,
    title: "Cumplimiento — Experiencias que transforman",
    description: "Formación inmersiva en ética y compliance internacional para empresas, universidades y eventos corporativos.",
    openGraph: {
      title: "Cumplimiento — Experiencias que transforman",
      description: "Convierte la formación en compliance en una experiencia que tu equipo sí recordará.",
      images: [{ url: new URL("/og-marketing.png", base).toString(), width: 1200, height: 630 }],
      type: "website",
    },
    twitter: { card: "summary_large_image", images: [new URL("/og-marketing.png", base).toString()] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `(function(){try{var saved=localStorage.getItem('cumplimiento-theme');document.documentElement.dataset.theme=saved==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html:themeScript }}/></head><body>{children}<ThemeToggle/></body></html>;
}
