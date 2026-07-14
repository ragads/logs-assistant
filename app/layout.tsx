import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logs Assistant",
  description: "Browse Supabase logs and ask AI questions about them."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
