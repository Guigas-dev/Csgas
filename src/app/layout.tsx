
import type { Metadata } from 'next';
import './globals.css';
import { AppSidebarNav } from '@/components/layout/app-sidebar-nav';
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider

export const metadata: Metadata = {
  title: 'VendaFacil',
  description: 'Sistema de gestão de vendas VendaFacil',
};

export default function RootLayout({
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
      <body className="font-body antialiased">
        <AuthProvider> {/* Wrap with AuthProvider */}
          <SidebarProvider defaultOpen={true}>
            <Sidebar className="border-r border-sidebar-border">
              <AppSidebarNav />
            </Sidebar>
            <SidebarInset>
              <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
                {children}
              </div>
            </SidebarInset>
            <Toaster />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
