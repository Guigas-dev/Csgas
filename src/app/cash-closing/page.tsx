
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Printer, DollarSign, ShoppingCart, BarChart2 } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import type { Sale as FirestoreSale } from "../sales/actions"; 
import { useAuth } from "@/contexts/auth-context";

// Local type for sales data transformed for this page
type CashClosingSale = Omit<FirestoreSale, 'date' | 'paymentDueDate' | 'lucro_bruto'> & {
  date: Date;
  paymentDueDate: Date | null;
  lucro_bruto: number; // Ensured to be a number
};

interface DailySummary {
  totalSalesValue: number;
  salesCount: number;
  averageTicket: number;
  totalGrossProfit: number; 
  salesByPaymentMethod: {
    [key: string]: { count: number; value: number; profit: number };
  };
}

const initialSummary: DailySummary = {
  totalSalesValue: 0,
  salesCount: 0,
  averageTicket: 0,
  totalGrossProfit: 0,
  salesByPaymentMethod: {},
};

export default function CashClosingPage() {
  const [dailySales, setDailySales] = useState<CashClosingSale[]>([]);
  const [summary, setSummary] = useState<DailySummary>(initialSummary);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const currentDate = useMemo(() => new Date(), []);

  useEffect(() => {
    const fetchDailySales = async () => {
      setIsLoading(true);
      try {
        // Stricter check: If there's no currentUser, don't attempt to fetch.
        // The component's render logic will handle showing a login prompt if necessary (for non-dev).
        if (!currentUser) {
          // console.log("CashClosing: No currentUser, aborting fetch.");
          setDailySales([]); 
          setSummary(initialSummary);
          setIsLoading(false);
          return;
        }

        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        const salesQuery = query(
          collection(db, "sales"),
          where("date", ">=", Timestamp.fromDate(startOfToday)),
          where("date", "<=", Timestamp.fromDate(endOfToday)),
          where("status", "==", "Paid"), 
          orderBy("date", "asc")
        );

        const querySnapshot = await getDocs(salesQuery);
        const salesData = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            // Spread other fields from FirestoreSale
            customerId: data.customerId || null,
            customerName: data.customerName || undefined,
            value: data.value,
            paymentMethod: data.paymentMethod,
            status: data.status,
            gasCanistersQuantity: data.gasCanistersQuantity,
            observations: data.observations,
            subtractFromStock: data.subtractFromStock,
            createdAt: data.createdAt, // Keep as Timestamp if not used directly, or convert
            updatedAt: data.updatedAt, // Keep as Timestamp if not used directly, or convert
            // Transform specific fields
            date: (data.date as Timestamp).toDate(),
            paymentDueDate: data.paymentDueDate ? (data.paymentDueDate as Timestamp).toDate() : null,
            lucro_bruto: data.lucro_bruto || 0, // Ensure lucro_bruto is a number
          } as CashClosingSale; 
        });

        setDailySales(salesData);
        calculateSummary(salesData);
        
      } catch (error) {
        console.error("Error fetching daily sales: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao buscar vendas do dia",
          description: "Não foi possível carregar os dados para o fechamento de caixa. Verifique o console para mais detalhes ou se um índice do Firestore é necessário.",
        });
        setDailySales([]);
        setSummary(initialSummary);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailySales();
  }, [toast, currentDate, currentUser]);


  const calculateSummary = (sales: CashClosingSale[]) => {
    const newSummary: DailySummary = { ...initialSummary, salesByPaymentMethod: {} };
    sales.forEach(sale => {
      // The query already filters for "Paid" status, but double-checking here is harmless.
      if (sale.status === "Paid") { 
        newSummary.totalSalesValue += sale.value;
        newSummary.salesCount++;
        newSummary.totalGrossProfit += sale.lucro_bruto; // Already a number
        const method = sale.paymentMethod || "Não especificado";
        if (!newSummary.salesByPaymentMethod[method]) {
          newSummary.salesByPaymentMethod[method] = { count: 0, value: 0, profit: 0 };
        }
        newSummary.salesByPaymentMethod[method].count++;
        newSummary.salesByPaymentMethod[method].value += sale.value;
        newSummary.salesByPaymentMethod[method].profit += sale.lucro_bruto;
      }
    });
    newSummary.averageTicket = newSummary.salesCount > 0 ? newSummary.totalSalesValue / newSummary.salesCount : 0;
    setSummary(newSummary);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando dados do fechamento...</p>
      </div>
    );
  }
  
  // This block handles UI for non-dev, non-logged-in users.
  // The useEffect above now prevents fetch if !currentUser, so this UI will show.
  if (!currentUser && process.env.NODE_ENV !== 'development') {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-muted-foreground">Por favor, faça login para acessar esta página.</p>
        <Button onClick={() => window.location.href = '/login'} className="mt-4">Ir para Login</Button>
      </div>
    );
  }
  // If in dev mode and still no currentUser after loading, it implies an issue or an unauthenticated test case.
  // The fetch would have been aborted. Show a message or allow dev to proceed with empty data.
   if (!currentUser && process.env.NODE_ENV === 'development' && dailySales.length === 0 && summary.salesCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-muted-foreground">Modo de desenvolvimento: Nenhum usuário logado e nenhum dado de venda carregado.</p>
        <p className="text-xs text-muted-foreground mt-2">A busca por vendas foi abortada por falta de usuário.</p>
      </div>
    );
  }


  return (
    <div>
      <PageHeader
        title={`Fechamento de Caixa - ${format(currentDate, "dd/MM/yyyy", { locale: ptBR })}`}
        description="Resumo das transações financeiras pagas do dia."
        actions={
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">
            <Printer className="mr-2 h-4 w-4" /> Imprimir Relatório
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard title="Total de Vendas Pagas (Dia)" value={formatCurrency(summary.totalSalesValue)} icon={<DollarSign className="h-5 w-5 text-foreground" />} />
        <KpiCard title="Número de Vendas Pagas (Dia)" value={summary.salesCount.toString()} icon={<ShoppingCart className="h-5 w-5 text-foreground" />} />
        <KpiCard title="Ticket Médio (Dia)" value={formatCurrency(summary.averageTicket)} icon={<BarChart2 className="h-5 w-5 text-foreground" />} />
        <KpiCard title="Lucro Bruto Total (Dia)" value={formatCurrency(summary.totalGrossProfit)} icon={<DollarSign className="h-5 w-5 text-success" />} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Vendas por Forma de Pagamento (Dia)</CardTitle>
          <CardDescription>Valores totais, lucro e quantidade de vendas pagas por cada método.</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(summary.salesByPaymentMethod).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Qtd. Vendas</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Lucro Bruto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.salesByPaymentMethod).map(([method, data]) => (
                  <TableRow key={method}>
                    <TableCell className="font-medium">{method}</TableCell>
                    <TableCell className="text-right">{data.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhuma venda paga registrada hoje para detalhar por forma de pagamento.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Vendas Pagas do Dia</CardTitle>
          <CardDescription>Lista de todas as vendas pagas realizadas hoje.</CardDescription>
        </CardHeader>
        <CardContent>
          {dailySales.filter(sale => sale.status === "Paid").length > 0 ? ( // Ensure we are iterating over already filtered sales if needed
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Lucro Bruto</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySales.map((sale) => ( // No need to filter by status again if query does it
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.customerName || "Consumidor Final"}</TableCell>
                    <TableCell>{format(sale.date, "HH:mm:ss")}</TableCell>
                    <TableCell>{formatCurrency(sale.value)}</TableCell>
                    <TableCell>{formatCurrency(sale.lucro_bruto)}</TableCell>
                    <TableCell>{sale.paymentMethod}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={sale.observations}>{sale.observations || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhuma venda paga registrada hoje.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon }) => {
  return (
    <Card className="shadow-md bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
};
    
