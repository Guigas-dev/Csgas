
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react"; 
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
  Bell,
  Flame, // Changed from custom SVG to Flame icon
  Loader2, 
  ClipboardList, // Added for Cash Closing
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context"; 

const CSGASLogo = () => (
  <Flame className="h-9 w-9 text-primary" /> // Replaced custom SVG with Flame icon
);


const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/defaults", label: "Inadimplência", icon: CreditCard },
  { href: "/stock", label: "Estoque", icon: Archive },
  { href: "/cash-closing", label: "Fechamento de Caixa", icon: ClipboardList }, // New item
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/users", label: "Usuários", icon: UserCog },
];

export function AppSidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading, signOutUser } = useAuth(); 

  useEffect(() => {
    if (!loading && !currentUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [currentUser, loading, router, pathname]);


  const handleLogout = async () => {
    await signOutUser();
  };

  if (loading && !currentUser && pathname !== '/login') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 bg-sidebar text-sidebar-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm">Carregando...</p>
      </div>
    );
  }
  
  if (pathname === '/login' || (!currentUser && loading)) {
      return null; 
  }


  return (
    <>
      <SidebarHeader className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CSGASLogo />
          <h1 className="text-xl font-semibold text-foreground font-headline">CS GAS</h1>
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
          disabled={loading} 
        >
          {loading && !currentUser ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
          Sair
        </Button>
      </SidebarFooter>
    </>
  );
}
