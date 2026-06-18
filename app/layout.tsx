import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MLX Flow',
  description: 'Sistema interno MLX Mind',
  // sistema privado: nunca indexar
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
