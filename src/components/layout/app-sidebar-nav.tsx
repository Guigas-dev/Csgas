
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react"; // Import useEffect
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Archive,
  LogOut,
  UserCog,
  Loader2, // Import Loader2 for loading state
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context"; // Import useAuth

const VendaFacilLogo = () => (
  <svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="text-primary">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: "hsl(var(--primary))", stopOpacity:1}} />
        <stop offset="100%" style={{stopColor: "hsl(var(--accent))", stopOpacity:1}} />
      </linearGradient>
    </defs>
    <path fill="url(#grad1)" d="M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z M50 15 L85 32.5 V 67.5 L50 85 L15 67.5 V 32.5 Z"></path>
    <text x="50" y="62" fontSize="40" fill="hsl(var(--primary-foreground))" textAnchor="middle" fontWeight="bold" className="font-headline">V</text>
  </svg>
);


const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/defaults", label: "Inadimplência", icon: CreditCard },
  { href: "/stock", label: "Estoque", icon: Archive },
  { href: "/users", label: "Usuários", icon: UserCog },
];

export function AppSidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading, signOutUser } = useAuth(); // Use auth context

  useEffect(() => {
    // If auth is not loading and there's no user, redirect to login.
    // This effect also runs when `currentUser` changes.
    // Ensure this doesn't run on the login page itself by checking pathname.
    if (!loading && !currentUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [currentUser, loading, router, pathname]);


  const handleLogout = async () => {
    await signOutUser();
    // router.push('/login') is handled by signOutUser or the useEffect above
  };

  // If auth is loading and there's no user yet, show a loading state for the sidebar
  // or prevent rendering its content to avoid flashes of content.
  // This could be a more sophisticated skeleton loader.
  if (loading && !currentUser && pathname !== '/login') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 bg-sidebar text-sidebar-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm">Carregando...</p>
      </div>
    );
  }
  
  // Do not render sidebar on login page or if user is not authenticated and still loading
  if (pathname === '/login' || (!currentUser && loading)) {
      return null; 
  }


  return (
    <>
      <SidebarHeader className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VendaFacilLogo />
          <h1 className="text-xl font-semibold text-foreground font-headline">VendaFacil</h1>
        </div>
        <SidebarTrigger className="md:hidden" />
      </SidebarHeader>
      <ScrollArea className="flex-1">
        <SidebarContent className="p-4">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    className={cn(
                      "w-full justify-start",
                      pathname === item.href
                        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary-hover-bg"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label, side: "right", className:"bg-popover text-popover-foreground" }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
      <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          disabled={loading} // Disable while any auth operation is in progress
        >
          {loading && !currentUser ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
          Sair
        </Button>
      </SidebarFooter>
    </>
  );
}
