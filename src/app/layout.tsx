import type { Metadata } from "next";
import "./globals.css";
import "./toolbar-table.css";
import "./painel-mensal.css";
import "./painel-custo.css";

export const metadata: Metadata = {
  title: "API Elabore | Labor Rural",
  description: "Sistema de consulta e exportação de dados do Elabore — Labor Rural",
  icons: {
    icon: [
      { url: "/img/lr.png", type: "image/png" },
      { url: "/lr.png", type: "image/png" },
    ],
    apple: "/img/lr.png",
    shortcut: "/img/lr.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/img/lr.png" />
        <link rel="apple-touch-icon" href="/img/lr.png" />
        <link rel="shortcut icon" href="/img/lr.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
