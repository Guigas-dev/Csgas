import type { Metadata } from 'next';
import '../globals.css'; // Ensure global styles apply
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Login - VendaFacil',
  description: 'Acesse o sistema VendaFacil',
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <div className="flex items-center justify-center min-h-screen p-4">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
