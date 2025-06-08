
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
  // The RootLayout (src/app/layout.tsx) handles the main HTML structure (<html>, <head>, <body>).
  // Font links and global styles are also handled there.
  // This layout should only provide the specific structure for the login page.
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background text-foreground font-body antialiased">
      {children}
      <Toaster />
    </div>
  );
}
