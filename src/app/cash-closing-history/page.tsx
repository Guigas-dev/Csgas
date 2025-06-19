
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getWeek,
  getMonth,
  getYear,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfDay, // Adicionado
  endOfDay,   // Adicionado
} from "date-fns";
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

type SaleForHistory = Omit<FirestoreSale, 'date' | 'paymentDueDate' | 'lucro_bruto'> & {
  date: Date;
  paymentDueDate: Date | null;
  lucro_bruto: number;
};

interface PeriodSummary {
  periodKey: string; // e.g., '2023-06-15', '2023-W24', '2023-05' (0-indexed month), '2023'
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  totalSalesValue: number;
  salesCount: number;
  averageTicket: number;
  totalGrossProfit: number;
  // salesByPaymentMethod: {
  //   [key: string]: { count: number; value: number; profit: number };
  // };
}

type PeriodType = "daily" | "weekly" | "monthly" | "annual";

const ITEMS_PER_PAGE = 15;

export default function CashClosingHistoryPage() {
  const [allSalesCache, setAllSalesCache] = useState<SaleForHistory[]>([]);
  const [historyEntries, setHistoryEntries] = useState<PeriodSummary[]>([]);
  const [paginatedEntries, setPaginatedEntries] = useState<PeriodSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("daily");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchAllPaidSales = useCallback(async () => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const salesQuery = query(
        collection(db, "sales"),
        where("status", "==", "Paid"),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(salesQuery);
      const salesData = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          customerId: data.customerId || null,
          customerName: data.customerName || undefined,
          value: data.value,
          paymentMethod: data.paymentMethod,
          status: data.status,
          gasCanistersQuantity: data.gasCanistersQuantity,
          observations: data.observations,
          subtractFromStock: data.subtractFromStock,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          date: (data.date as Timestamp).toDate(),
          paymentDueDate: data.paymentDueDate
            ? (data.paymentDueDate as Timestamp).toDate()
            : null,
          lucro_bruto: data.lucro_bruto || 0,
        } as SaleForHistory;
      });
      setAllSalesCache(salesData);
    } catch (error) {
      console.error("Error fetching all paid sales: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar histórico de vendas",
        description:
          "Não foi possível carregar os dados para o histórico de caixa. Verifique o console.",
      });
      setAllSalesCache([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => {
    fetchAllPaidSales();
  }, [fetchAllPaidSales]);

  const aggregateSalesData = useCallback(
    (sales: SaleForHistory[], period: PeriodType): PeriodSummary[] => {
      if (!sales.length) return [];

      const groupedData: { [key: string]: PeriodSummary } = {};

      sales.forEach((sale) => {
        let periodKey = "";
        let periodLabel = "";
        let pStartDate: Date;
        let pEndDate: Date;

        switch (period) {
          case "daily":
            periodKey = format(sale.date, "yyyy-MM-dd");
            periodLabel = format(sale.date, "dd/MM/yyyy", { locale: ptBR });
            pStartDate = startOfDay(sale.date);
            pEndDate = endOfDay(sale.date);
            break;
          case "weekly":
            const year = getYear(sale.date);
            const week = getWeek(sale.date, { locale: ptBR, weekStartsOn: 1 });
            periodKey = `${year}-W${String(week).padStart(2, '0')}`;
            pStartDate = startOfWeek(sale.date, { locale: ptBR, weekStartsOn: 1 });
            pEndDate = endOfWeek(sale.date, { locale: ptBR, weekStartsOn: 1 });
            periodLabel = `Semana ${week} (${format(pStartDate, "dd/MM", { locale: ptBR })} - ${format(pEndDate, "dd/MM/yyyy", { locale: ptBR })})`;
            break;
          case "monthly":
            periodKey = format(sale.date, "yyyy-MM");
            periodLabel = format(sale.date, "MMMM/yyyy", { locale: ptBR });
            pStartDate = startOfMonth(sale.date);
            pEndDate = endOfMonth(sale.date);
            break;
          case "annual":
            periodKey = format(sale.date, "yyyy");
            periodLabel = format(sale.date, "yyyy", { locale: ptBR });
            pStartDate = startOfYear(sale.date);
            pEndDate = endOfYear(sale.date);
            break;
        }

        if (!groupedData[periodKey]) {
          groupedData[periodKey] = {
            periodKey,
            periodLabel,
            startDate: pStartDate,
            endDate: pEndDate,
            totalSalesValue: 0,
            salesCount: 0,
            averageTicket: 0,
            totalGrossProfit: 0,
            // salesByPaymentMethod: {},
          };
        }

        const group = groupedData[periodKey];
        group.totalSalesValue += sale.value;
        group.salesCount++;
        group.totalGrossProfit += sale.lucro_bruto;

        // const paymentMethod = sale.paymentMethod || "Não especificado";
        // if (!group.salesByPaymentMethod[paymentMethod]) {
        //   group.salesByPaymentMethod[paymentMethod] = { count: 0, value: 0, profit: 0 };
        // }
        // group.salesByPaymentMethod[paymentMethod].count++;
        // group.salesByPaymentMethod[paymentMethod].value += sale.value;
        // group.salesByPaymentMethod[paymentMethod].profit += sale.lucro_bruto;
      });

      return Object.values(groupedData)
        .map(group => ({
          ...group,
          averageTicket: group.salesCount > 0 ? group.totalSalesValue / group.salesCount : 0,
        }))
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime()); // Most recent first
    },
    []
  );

  useEffect(() => {
    if (allSalesCache.length > 0) {
      setIsLoading(true);
      const processedData = aggregateSalesData(allSalesCache, selectedPeriod);
      setHistoryEntries(processedData);
      setCurrentPage(1); 
      setIsLoading(false);
    } else if (!isLoading && !currentUser) { // Covers case where sales are empty because user not logged in
        setHistoryEntries([]);
    } else if (!isLoading && currentUser && allSalesCache.length === 0) { // User logged in, but no sales
        setHistoryEntries([]);
    }
  }, [allSalesCache, selectedPeriod, aggregateSalesData, isLoading, currentUser]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedEntries(historyEntries.slice(startIndex, endIndex));
  }, [historyEntries, currentPage]);

  const totalPages = Math.ceil(historyEntries.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!currentUser && !isLoading) {
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
        title="Histórico de Fechamento de Caixa"
        description="Visualize os resumos financeiros de períodos anteriores."
        actions={
            <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
                <TabsList className="bg-background border border-input">
                    <TabsTrigger value="daily" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-foreground">Diário</TabsTrigger>
                    <TabsTrigger value="weekly" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-foreground">Semanal</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-foreground">Mensal</TabsTrigger>
                    <TabsTrigger value="annual" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-foreground">Anual</TabsTrigger>
                </TabsList>
            </Tabs>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Resumo {
                selectedPeriod === 'daily' ? 'Diário' :
                selectedPeriod === 'weekly' ? 'Semanal' :
                selectedPeriod === 'monthly' ? 'Mensal' : 'Anual'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (!paginatedEntries.length || allSalesCache.length === 0) ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : !isLoading && historyEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
                Nenhum dado de venda paga encontrado para gerar o histórico.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Vendas Totais</TableHead>
                    <TableHead className="text-right">Qtd. Vendas</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Lucro Bruto Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <TableRow key={entry.periodKey}>
                      <TableCell className="font-medium">{entry.periodLabel}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.totalSalesValue)}</TableCell>
                      <TableCell className="text-right">{entry.salesCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.averageTicket)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.totalGrossProfit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {paginatedEntries.length === 0 && historyEntries.length > 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhum registro para esta página do período selecionado.</p>
              )}
              {totalPages > 0 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

