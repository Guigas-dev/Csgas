
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
import { format, startOfDay, endOfDay, subHours } from "date-fns";
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
import type { Sale } from "../sales/actions"; 
import { useAuth } from "@/contexts/auth-context";

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

const CUSTO_BOTIJAO = 94.00; // Definindo o custo aqui também para consistência no mock

export default function CashClosingPage() {
  const [dailySales, setDailySales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<DailySummary>(initialSummary);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const currentDate = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!currentUser && process.env.NODE_ENV !== 'development') { 
      setIsLoading(false);
      return;
    }

    const fetchDailySales = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const mockSalesData: Sale[] = [
          {
            id: "mock1",
            customerId: "cust123",
            customerName: "João Silva",
            value: 55.75,
            paymentMethod: "Pix",
            date: Timestamp.fromDate(subHours(today, 2)), 
            status: "Paid",
            gasCanistersQuantity: 1,
            observations: "Entrega rápida.",
            subtractFromStock: true,
            createdAt: Timestamp.fromDate(subHours(today, 2)),
            lucro_bruto: 55.75 - (CUSTO_BOTIJAO * 1),
          },
          {
            id: "mock2",
            customerName: "Consumidor Final",
            value: 110.00,
            paymentMethod: "Dinheiro",
            date: Timestamp.fromDate(subHours(today, 1)), 
            status: "Paid",
            gasCanistersQuantity: 1,
            observations: "",
            subtractFromStock: true,
            createdAt: Timestamp.fromDate(subHours(today, 1)),
            lucro_bruto: 110.00 - (CUSTO_BOTIJAO * 1),
          },
          {
            id: "mock3",
            customerId: "cust456",
            customerName: "Maria Oliveira",
            value: 75.50,
            paymentMethod: "Cartão de Crédito",
            date: Timestamp.fromDate(subHours(today, 3)), 
            status: "Paid",
            gasCanistersQuantity: 1,
            observations: "Cliente pediu troco para R$100.",
            subtractFromStock: true,
            createdAt: Timestamp.fromDate(subHours(today, 3)),
            lucro_bruto: 75.50 - (CUSTO_BOTIJAO * 1),
          },
           {
            id: "mock4",
            customerName: "Consumidor Final",
            value: 30.00,
            paymentMethod: "Pix",
            date: Timestamp.fromDate(subHours(today, 0.5)), 
            status: "Paid",
            gasCanistersQuantity: 0, 
            observations: "Apenas mangueira",
            subtractFromStock: false,
            createdAt: Timestamp.fromDate(subHours(today, 0.5)),
            lucro_bruto: 0,
          },
          {
            id: "mock5",
            customerId: "cust789",
            customerName: "Carlos Souza",
            value: 105.00,
            paymentMethod: "Talão de luz",
            date: Timestamp.fromDate(subHours(today, 4)), 
            status: "Paid", 
            paymentDueDate: Timestamp.fromDate(today),
            gasCanistersQuantity: 1,
            observations: "Pago no ato.",
            subtractFromStock: true,
            createdAt: Timestamp.fromDate(subHours(today, 4)),
            lucro_bruto: 105.00 - (CUSTO_BOTIJAO * 1),
          },
           {
            id: "mock6", 
            customerId: "cust101",
            customerName: "Ana Pereira",
            value: 110.00,
            paymentMethod: "Pix",
            date: Timestamp.fromDate(subHours(today, 1)),
            status: "Pending",
            paymentDueDate: Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000)), 
            gasCanistersQuantity: 1,
            observations: "Pagamento agendado.",
            subtractFromStock: true,
            createdAt: Timestamp.fromDate(subHours(today, 1)),
            lucro_bruto: 110.00 - (CUSTO_BOTIJAO * 1), // Lucro é calculado mesmo se pendente
          },
        ];
        
        const salesDataToProcess = mockSalesData.map(sale => ({
          ...sale,
          date: (sale.date as Timestamp).toDate(),
          paymentDueDate: sale.paymentDueDate ? (sale.paymentDueDate as Timestamp).toDate() : null,
        })) as unknown as Sale[]; 

        setDailySales(salesDataToProcess.filter(s => s.status === "Paid"));
        calculateSummary(salesDataToProcess.filter(s => s.status === "Paid"));
        
      } catch (error) {
        console.error("Error fetching daily sales: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao buscar vendas do dia",
          description: "Não foi possível carregar os dados para o fechamento de caixa.",
        });
        setDailySales([]);
        setSummary(initialSummary);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailySales();
  }, [toast, currentDate, currentUser]);


  const calculateSummary = (sales: Sale[]) => {
    const newSummary: DailySummary = { ...initialSummary, salesByPaymentMethod: {} };
    sales.forEach(sale => {
      if (sale.status === "Paid") { 
        newSummary.totalSalesValue += sale.value;
        newSummary.salesCount++;
        newSummary.totalGrossProfit += sale.lucro_bruto || 0;
        const method = sale.paymentMethod || "Não especificado";
        if (!newSummary.salesByPaymentMethod[method]) {
          newSummary.salesByPaymentMethod[method] = { count: 0, value: 0, profit: 0 };
        }
        newSummary.salesByPaymentMethod[method].count++;
        newSummary.salesByPaymentMethod[method].value += sale.value;
        newSummary.salesByPaymentMethod[method].profit += sale.lucro_bruto || 0;
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
  
  if (!currentUser && process.env.NODE_ENV !== 'development') {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-muted-foreground">Por favor, faça login para acessar esta página.</p>
        <Button onClick={() => window.location.href = '/login'} className="mt-4">Ir para Login</Button>
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
          {dailySales.filter(sale => sale.status === "Paid").length > 0 ? (
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
                {dailySales.filter(sale => sale.status === "Paid").map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.customerName || "Consumidor Final"}</TableCell>
                    <TableCell>{format(sale.date, "HH:mm:ss")}</TableCell>
                    <TableCell>{formatCurrency(sale.value)}</TableCell>
                    <TableCell>{formatCurrency(sale.lucro_bruto || 0)}</TableCell>
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
