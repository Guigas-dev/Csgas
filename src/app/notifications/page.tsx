
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArchiveX,
  ArchiveRestore,
  Bell,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Info,
  MailCheck,
  MailWarning,
  ShoppingCart,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type NotificationType =
  | "alert"
  | "info"
  | "stock_low"
  | "stock_in"
  | "new_sale"
  | "payment_due"
  | "payment_overdue"
  | "payment_received";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

// mockNotifications array has been removed.
// const mockNotifications: Notification[] = [
//   {
//     id: "1",
//     type: "stock_low",
//     title: "Estoque Baixo!",
//     description: "Botijões P13 estão com apenas 15 unidades. Considere fazer um novo pedido.",
//     timestamp: subHours(new Date(), 2),
//     read: false,
//     link: "/stock",
//   },
//   // ... other mock notifications removed for brevity
// ];

const getNotificationIcon = (type: NotificationType, read: boolean): React.ReactNode => {
  const commonClass = "h-5 w-5";
  switch (type) {
    case "alert":
      return <AlertTriangle className={cn(commonClass, read ? "text-muted-foreground" : "text-yellow-500")} />;
    case "info":
      return <Info className={cn(commonClass, read ? "text-muted-foreground" : "text-blue-500")} />;
    case "stock_low":
      return <ArchiveX className={cn(commonClass, read ? "text-muted-foreground" : "text-destructive")} />;
    case "stock_in":
      return <ArchiveRestore className={cn(commonClass, read ? "text-muted-foreground" : "text-success")} />;
    case "new_sale":
      return <ShoppingCart className={cn(commonClass, read ? "text-muted-foreground" : "text-primary")} />;
    case "payment_due":
      return <CalendarClock className={cn(commonClass, read ? "text-muted-foreground" : "text-yellow-600")} />;
    case "payment_overdue":
      return <CalendarX2 className={cn(commonClass, read ? "text-muted-foreground" : "text-destructive")} />;
    case "payment_received":
      return <CheckCircle2 className={cn(commonClass, read ? "text-muted-foreground" : "text-success")} />;
    default:
      return <Bell className={cn(commonClass, "text-muted-foreground")} />;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]); // Initialize with an empty array

  // useEffect(() => {
  //   // If you were fetching notifications from an API, you would do it here.
  //   // For now, we're just using the initial empty state.
  //   // setNotifications(
  //   //  mockNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  //   // );
  // }, []);


  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleReadStatus = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  
  const markAllAsUnread = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: false })));
  };

  return (
    <div>
      <PageHeader
        title="Central de Notificações"
        description="Acompanhe alertas importantes e atualizações do sistema."
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 ? (
                 <Button onClick={markAllAsRead} variant="outline">
                    <MailCheck className="mr-2 h-4 w-4" /> Marcar todas como lidas ({unreadCount})
                 </Button>
            ) : (
                 <Button onClick={markAllAsUnread} variant="outline" disabled={notifications.length === 0}>
                    <MailWarning className="mr-2 h-4 w-4" /> Marcar todas como não lidas
                 </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Suas Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              Você não tem nenhuma notificação no momento.
            </p>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
              <div className="space-y-4 pr-4">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start p-4 rounded-lg border transition-colors",
                      notification.read
                        ? "bg-card hover:bg-muted/50"
                        : "bg-primary/5 border-primary/20 hover:bg-primary/10",
                    )}
                  >
                    <div className="flex-shrink-0 mr-4 pt-1">
                      {getNotificationIcon(notification.type, notification.read)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <h3 className={cn(
                            "font-semibold",
                            notification.read ? "text-card-foreground" : "text-primary"
                         )}
                        >
                            {notification.title}
                        </h3>
                        {!notification.read && (
                          <Badge variant="default" className="text-xs bg-primary text-primary-foreground">Nova</Badge>
                        )}
                      </div>
                      <p className={cn(
                          "text-sm mt-1",
                          notification.read ? "text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(notification.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {notification.link && (
                        <Button variant="link" size="sm" asChild className="px-0 h-auto mt-1 text-xs">
                          <a href={notification.link}>Ver detalhes</a>
                        </Button>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleReadStatus(notification.id)}
                        title={notification.read ? "Marcar como não lida" : "Marcar como lida"}
                        className={cn("h-8 w-8", notification.read ? "text-muted-foreground hover:text-foreground" : "text-primary hover:text-primary/80")}
                      >
                        {notification.read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
