import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Suggestions — AI Meeting Copilot",
  description: "Real-time AI suggestions during live conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
