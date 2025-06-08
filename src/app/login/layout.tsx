
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
  // Removed <html>, <head>, and <body> tags.
  // The RootLayout (src/app/layout.tsx) handles the main HTML structure.
  // Font links are also handled in RootLayout.
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background text-foreground font-body antialiased">
      {children}
      <Toaster />
    </div>
  );
}
