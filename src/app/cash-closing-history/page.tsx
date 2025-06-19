
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
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
  startOfDay,
  endOfDay,
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
  periodKey: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  totalSalesValue: number;
  salesCount: number;
  averageTicket: number;
  totalGrossProfit: number;
}

interface DetailedPeriodData {
  sales: SaleForHistory[];
  summaryByPaymentMethod: {
    [key: string]: { count: number; value: number; profit: number };
  };
}

type PeriodType = "daily" | "weekly" | "monthly" | "annual";

const ITEMS_PER_PAGE = 15;

export default function CashClosingHistoryPage() {
  const [allSalesCache, setAllSalesCache] = useState<SaleForHistory[]>([]);
  const [historyEntries, setHistoryEntries] = useState<PeriodSummary[]>([]);
  const [paginatedEntries, setPaginatedEntries] = useState<PeriodSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodType>("daily");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPeriodForDetails, setSelectedPeriodForDetails] = useState<PeriodSummary | null>(null);
  const [detailedPeriodData, setDetailedPeriodData] = useState<DetailedPeriodData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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
        description: "Não foi possível carregar os dados para o histórico de caixa. Verifique o console.",
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
    (sales: SaleForHistory[], periodType: PeriodType): PeriodSummary[] => {
      if (!sales.length) return [];
      const groupedData: { [key: string]: PeriodSummary } = {};

      sales.forEach((sale) => {
        let periodKey = "";
        let periodLabel = "";
        let pStartDate: Date;
        let pEndDate: Date;

        switch (periodType) {
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
          };
        }

        const group = groupedData[periodKey];
        group.totalSalesValue += sale.value;
        group.salesCount++;
        group.totalGrossProfit += sale.lucro_bruto;
      });

      return Object.values(groupedData)
        .map(group => ({
          ...group,
          averageTicket: group.salesCount > 0 ? group.totalSalesValue / group.salesCount : 0,
        }))
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    },
    []
  );

  useEffect(() => {
    if (allSalesCache.length > 0) {
      setIsLoading(true);
      const processedData = aggregateSalesData(allSalesCache, selectedPeriodType);
      setHistoryEntries(processedData);
      setCurrentPage(1);
      setIsLoading(false);
    } else if (!isLoading && !currentUser) {
      setHistoryEntries([]);
    } else if (!isLoading && currentUser && allSalesCache.length === 0) {
      setHistoryEntries([]);
    }
  }, [allSalesCache, selectedPeriodType, aggregateSalesData, isLoading, currentUser]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedEntries(historyEntries.slice(startIndex, endIndex));
  }, [historyEntries, currentPage]);

  const fetchDetailedSalesForPeriod = async (startDate: Date, endDate: Date) => {
    if (!currentUser) return;
    setIsLoadingDetails(true);
    setDetailedPeriodData(null);
    try {
      const detailedSalesQuery = query(
        collection(db, "sales"),
        where("date", ">=", Timestamp.fromDate(startOfDay(startDate))),
        where("date", "<=", Timestamp.fromDate(endOfDay(endDate))),
        where("status", "==", "Paid"),
        orderBy("date", "asc")
      );
      const querySnapshot = await getDocs(detailedSalesQuery);
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

      const summaryByPayment: { [key: string]: { count: number; value: number; profit: number } } = {};
      salesData.forEach(sale => {
        const method = sale.paymentMethod || "Não especificado";
        if (!summaryByPayment[method]) {
          summaryByPayment[method] = { count: 0, value: 0, profit: 0 };
        }
        summaryByPayment[method].count++;
        summaryByPayment[method].value += sale.value;
        summaryByPayment[method].profit += sale.lucro_bruto;
      });

      setDetailedPeriodData({ sales: salesData, summaryByPaymentMethod: summaryByPayment });
    } catch (error) {
      console.error("Error fetching detailed sales for period: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar detalhes do período",
        description: "Não foi possível carregar os detalhes. Verifique o console.",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewDetails = (period: PeriodSummary) => {
    setSelectedPeriodForDetails(period);
    setIsDetailModalOpen(true);
    fetchDetailedSalesForPeriod(period.startDate, period.endDate);
  };

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
          <Tabs value={selectedPeriodType} onValueChange={(value) => setSelectedPeriodType(value as PeriodType)}>
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
              selectedPeriodType === 'daily' ? 'Diário' :
              selectedPeriodType === 'weekly' ? 'Semanal' :
              selectedPeriodType === 'monthly' ? 'Mensal' : 'Anual'
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
                    <TableHead className="text-center">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <TableRow key={entry.periodKey} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{entry.periodLabel}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.totalSalesValue)}</TableCell>
                      <TableCell className="text-right">{entry.salesCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.averageTicket)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.totalGrossProfit)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(entry)} title="Ver Detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
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

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Período: {selectedPeriodForDetails?.periodLabel}</DialogTitle>
            <DialogDescription>
              Resumo detalhado das vendas pagas para o período selecionado.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-2">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Carregando detalhes...</p>
              </div>
            ) : !detailedPeriodData || detailedPeriodData.sales.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">Nenhuma venda paga encontrada para este período.</p>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas por Forma de Pagamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(detailedPeriodData.summaryByPaymentMethod).length > 0 ? (
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
                          {Object.entries(detailedPeriodData.summaryByPaymentMethod).map(([method, data]) => (
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
                      <p className="text-muted-foreground text-center py-4">Nenhuma venda para detalhar por forma de pagamento neste período.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes das Vendas Pagas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Data/Horário</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Lucro Bruto</TableHead>
                          <TableHead>Forma de Pagamento</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailedPeriodData.sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{sale.customerName || "Consumidor Final"}</TableCell>
                            <TableCell>{format(sale.date, "dd/MM/yy HH:mm:ss", { locale: ptBR })}</TableCell>
                            <TableCell>{formatCurrency(sale.value)}</TableCell>
                            <TableCell>{formatCurrency(sale.lucro_bruto)}</TableCell>
                            <TableCell>{sale.paymentMethod}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={sale.observations}>{sale.observations || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4">
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
