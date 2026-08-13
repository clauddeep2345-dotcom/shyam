import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shyam Textile — Business Management',
  description: 'Production tracking, payroll, and worker management for Shyam Textile.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
