import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider } from '@/firebase/provider';
import { UserProvider } from '@/hooks/use-user';

export const metadata: Metadata = {
  title: 'Captionize',
  description: 'Automatically generate, edit, and export video subtitles with AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Merriweather:wght@400;700&family=Poppins:wght@400;600&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Source+Code+Pro:wght@400;700&family=Source+Sans+3:wght@400;700&family=Oswald:wght@400;700&family=Lora:wght@400;700&family=Ubuntu:wght@400;700&family=PT+Serif:wght@400;700&family=Dosis:wght@400;700&family=Exo+2:wght@400;700&family=Caveat&family=Pacifico&family=Dancing+Script&family=Bebas+Neue&family=Lobster&family=Anton&family=Righteous&family=Comfortaa&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </FirebaseProvider>
        <Toaster />
      </body>
    </html>
  );
}
