import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basket Trials Simulator",
  description: "Bayesian basket trial simulation: BBHM, CBHM, EXNEX, MUCE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
