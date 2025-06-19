
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react"; 
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
  Flame, 
  Loader2, 
  ClipboardList, 
  CalendarDays,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context"; 

const CSGASLogo = () => (
  <Flame className="h-9 w-9 text-primary" /> 
);

interface SubNavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface NavItemType {
  href?: string;
  label: string;
  icon: LucideIcon;
  subItems?: SubNavItem[];
}

const navItems: NavItemType[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/defaults", label: "Inadimplência", icon: CreditCard },
  { href: "/stock", label: "Estoque", icon: Archive },
  { 
    label: "Fechamento de Caixa", 
    icon: ClipboardList, 
    subItems: [
      { href: "/cash-closing", label: "Diário", icon: ClipboardList },
      { href: "/cash-closing-history", label: "Histórico", icon: CalendarDays },
    ]
  },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/users", label: "Usuários", icon: UserCog },
];

export function AppSidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading, signOutUser } = useAuth(); 
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialOpenState: Record<string, boolean> = {};
    let hasChanged = false;
    navItems.forEach(item => {
      if (item.subItems) {
        const isActiveParent = item.subItems.some(sub => pathname.startsWith(sub.href));
        if (initialOpenState[item.label] !== isActiveParent) {
          initialOpenState[item.label] = isActiveParent;
          if (isActiveParent) hasChanged = true; // Only mark changed if opening
        }
         // Ensure non-active parent submenus are marked as closed if not already
        if (initialOpenState[item.label] === undefined) {
            initialOpenState[item.label] = false;
        }
      }
    });
    
    // Only update if the new state for actively opened submenus differs
    // or if the initial state is different from the current openSubMenus
    let stateNeedsUpdate = false;
    for (const key in initialOpenState) {
        if (openSubMenus[key] !== initialOpenState[key]) {
            stateNeedsUpdate = true;
            break;
        }
    }
    if(Object.keys(openSubMenus).length !== Object.keys(initialOpenState).length && !stateNeedsUpdate){
        stateNeedsUpdate = true;
    }


    if (stateNeedsUpdate) {
        setOpenSubMenus(initialOpenState);
    }
  }, [pathname]); // Removed openSubMenus from dependency array to avoid potential loops


  useEffect(() => {
    if (!loading && !currentUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [currentUser, loading, router, pathname]);

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

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
            {navItems.map((item) => {
              const isActiveParent = item.subItems?.some(sub => pathname.startsWith(sub.href)) || (item.href && pathname.startsWith(item.href));
              
              const tooltipConfig = {
                children: item.label,
                side: "right" as const,
                className: "bg-popover text-popover-foreground"
              };

              return (
                <SidebarMenuItem key={item.label}>
                  {item.subItems ? (
                    <>
                      <SidebarMenuButton
                        onClick={() => toggleSubMenu(item.label)}
                        className={cn(
                          "w-full justify-between",
                           isActiveParent
                            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary-hover-bg"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                        isActive={isActiveParent}
                        data-state={openSubMenus[item.label] ? "open" : "closed"}
                        tooltip={tooltipConfig}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            openSubMenus[item.label] ? "rotate-180" : ""
                          )} 
                        />
                      </SidebarMenuButton>
                      {openSubMenus[item.label] && (
                        <SidebarMenuSub>
                          {item.subItems.map(subItem => (
                            <SidebarMenuSubItem key={subItem.label}>
                              <Link href={subItem.href} passHref legacyBehavior>
                                <SidebarMenuSubButton
                                  isActive={pathname.startsWith(subItem.href)}
                                   className={cn(
                                      pathname.startsWith(subItem.href)
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                   )}
                                >
                                  {subItem.icon && <subItem.icon className="mr-2 h-4 w-4 opacity-70" />}
                                  <span>{subItem.label}</span>
                                </SidebarMenuSubButton>
                              </Link>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </>
                  ) : (
                    <Link href={item.href!} passHref legacyBehavior>
                      <SidebarMenuButton
                        className={cn(
                          "w-full justify-start",
                          isActiveParent
                            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary-hover-bg"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                        isActive={isActiveParent}
                        tooltip={tooltipConfig}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  )}
                </SidebarMenuItem>
              );
            })}
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
