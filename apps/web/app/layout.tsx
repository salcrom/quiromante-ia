import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export const metadata: Metadata = {
  title: "Quiromante IA",
  description: "Análisis estructurado y trazable de las manos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Quiromante IA", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f5f1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
