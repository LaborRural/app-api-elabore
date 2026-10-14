import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elabore",
  description: "Consulta de dados do Elabore — Labor Rural",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
