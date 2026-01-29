import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ARIA — Air Liquide Intelligent Assistant",
  description: "BPCO demo dashboard for Air Liquide Santé"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
