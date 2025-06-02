
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  UserCog, // Corrected from UsersCog
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  { href: "/users", label: "Usuários", icon: UserCog }, // Corrected from UsersCog
];

export function AppSidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Here you would typically clear any session/token
    // For now, just redirect to login
    router.push('/login');
  };

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
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </SidebarFooter>
    </>
  );
}
