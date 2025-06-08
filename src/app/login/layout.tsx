
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
  // This layout component should only return the specific JSX for the login page's wrapper,
  // NOT the full <html>, <head>, <body> structure, as RootLayout (src/app/layout.tsx) handles that.
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background text-foreground font-body antialiased">
      {children}
      <Toaster /> {/* This Toaster can be specific to the login layout if needed, RootLayout may also have one */}
    </div>
  );
}
