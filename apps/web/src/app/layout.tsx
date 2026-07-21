import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chrono Bid',
  description: 'A real-time multiplayer time-bidding duel. Every second you hold is a second you spend.',
};

export const viewport: Viewport = {
  themeColor: '#05070d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
