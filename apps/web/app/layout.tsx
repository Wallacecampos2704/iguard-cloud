import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'iGuard Cloud',
  description: 'SaaS de monitoramento inteligente para integradores de segurança eletrônica.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
