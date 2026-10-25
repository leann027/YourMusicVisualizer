import type { Metadata } from 'next';
import { JetBrains_Mono, Syne } from 'next/font/google';
import './globals.css';

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'YourMusicVisualizer — Cosmos 3D de tu Música',
  description:
    'Visualizador espacial interactivo 3D que transforma tu biblioteca de canciones, artistas y géneros en un universo navegable de estrellas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${jetbrainsMono.variable} h-full bg-[#050508] antialiased`}
    >
      <body className="h-full w-full overflow-hidden bg-[#050508] text-[#F2F4F8]">
        {children}
      </body>
    </html>
  );
}
