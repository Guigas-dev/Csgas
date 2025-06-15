
"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ArrowRight, UserX, Archive, ListChecks, Users, DollarSign, ShoppingCart, CheckCircle2, AlertTriangle, PackageSearch, Flame, Banknote, CreditCard, Edit, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, isWithinInterval, isToday, getISOWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, Timestamp, where, limit } from "firebase/firestore";
import type { StockMovementEntry } from "./stock/actions";
import type { DefaultEntry } from "./defaults/actions";
import type { Sale } from "./sales/actions";


const salesBarChartConfig = {
  vendas: {
    label: "Vendas Atuais",
    color: "hsl(var(--chart-1))",
  },
};

const maxStock = 100;
const LOW_STOCK_THRESHOLD = 20; 

const stockPieChartConfig = {
  value: { label: "Unidades" },
  "Em Estoque": { label: "Em Estoque", color: "hsl(var(--chart-1))" },
  "Capacidade Livre": { label: "Capacidade Livre", color: "hsl(var(--border))" }
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface KpiCardProps {
  title: string;
  value: string | number | null | undefined;
  subText?: string;
  icon: React.ReactNode;
  valueColor?: string;
  subTextColor?: string;
  isLoading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subText, icon, valueColor = "text-foreground", subTextColor = "text-muted-foreground", isLoading = false }) => {
  const shouldFormatCurrency = typeof value === 'number' &&
    (title.toLowerCase().includes("vendas totais") ||
     title.toLowerCase().includes("ticket médio") ||
     title.toLowerCase().includes("vendas pendentes") ||
     title.toLowerCase().includes("preço"));

  return (
    <Card className="shadow-md bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
           <div className="text-2xl font-bold text-foreground flex items-center">
             <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
           </div>
        ) : (
          <div className={`text-2xl font-bold ${valueColor}`}>{shouldFormatCurrency ? formatCurrency(value as number) : value}</div>
        )}
        {subText && !isLoading && (
          <p className={`text-xs ${subTextColor} flex items-center`}>
            {subText}
          </p>
        )}
      </CardContent>
    </Card>
  );
};


export default function DashboardPage() {
  const [currentStockLevel, setCurrentStockLevel] = useState<number | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [defaultingCustomers, setDefaultingCustomers] = useState<DefaultEntry[]>([]);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const { toast } = useToast();

  const defaultGasPrices = {
    current: 115.00,
    cash: 110.00,
    card: 118.00,
  };
  const [gasPrices, setGasPrices] = useState(defaultGasPrices);
  const [editedPrices, setEditedPrices] = useState(defaultGasPrices);
  const [isEditingPrices, setIsEditingPrices] = useState(false);

  const [totalSalesMonth, setTotalSalesMonth] = useState<number | null>(null);
  const [paidSalesMonthCount, setPaidSalesMonthCount] = useState<number | null>(null);
  const [averageTicketMonth, setAverageTicketMonth] = useState<number | null>(null);
  const [newSalesTodayCount, setNewSalesTodayCount] = useState<number | null>(null);
  const [totalCustomersCount, setTotalCustomersCount] = useState<number | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  const [isLoadingSalesKpi, setIsLoadingSalesKpi] = useState(true);
  const [isLoadingCustomersKpi, setIsLoadingCustomersKpi] = useState(true);
  const [isLoadingRecentSales, setIsLoadingRecentSales] = useState(true);
  const [dynamicSalesChartData, setDynamicSalesChartData] = useState<any[]>([]);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date | null>(null);


  useEffect(() => {
    setLastUpdatedTime(new Date());
    let activeGasPrices = { ...defaultGasPrices }; 

    const storedPricesJSON = localStorage.getItem('gasPrices');
    if (storedPricesJSON) {
      try {
        const parsedPrices = JSON.parse(storedPricesJSON);
        if (
          parsedPrices &&
          typeof parsedPrices.current === 'number' &&
          typeof parsedPrices.cash === 'number' &&
          typeof parsedPrices.card === 'number'
        ) {
          activeGasPrices = parsedPrices; 
        } else {
          localStorage.removeItem('gasPrices');
        }
      } catch (error) {
        console.error("Failed to parse gas prices from localStorage:", error);
        localStorage.removeItem('gasPrices'); 
      }
    }
    setGasPrices(activeGasPrices);
    setEditedPrices(activeGasPrices); 
  }, []);


  useEffect(() => {
    const fetchStockMovements = async () => {
      setIsLoadingStock(true);
      try {
        const q = query(collection(db, "stockMovements"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const movementsData = querySnapshot.docs.map(doc => doc.data() as StockMovementEntry);
        const stockLevel = movementsData.reduce((acc, mov) => {
          return mov.type === "INPUT" ? acc + mov.quantity : acc - mov.quantity;
        }, 0);
        setCurrentStockLevel(stockLevel);
      } catch (error) {
        console.error("Error fetching stock movements: ", error);
        toast({ variant: "destructive", title: "Erro ao buscar estoque", description: "Não foi possível carregar o nível de estoque." });
      } finally {
        setIsLoadingStock(false);
      }
    };

    const fetchDefaults = async () => {
      setIsLoadingDefaults(true);
      try {
        const q = query(collection(db, "defaults"), orderBy("dueDate", "asc"));
        const querySnapshot = await getDocs(q);
        const defaultsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dueDate: (data.dueDate as Timestamp)?.toDate ? (data.dueDate as Timestamp).toDate() : new Date(),
          } as DefaultEntry;
        }).filter(d => d.paymentStatus === "Pending");
        setDefaultingCustomers(defaultsData);
      } catch (error) {
        console.error("Error fetching defaults: ", error);
        toast({ variant: "destructive", title: "Erro ao buscar inadimplências", description: "Não foi possível carregar a lista de inadimplências." });
      } finally {
        setIsLoadingDefaults(false);
      }
    };

    const fetchSalesData = async () => {
      setIsLoadingSalesKpi(true);
      setIsLoadingRecentSales(true);
      try {
        const salesQuery = query(collection(db, "sales"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(salesQuery);
        const salesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(),
          } as Sale; // Sale type here will include lucro_bruto if it exists
        });

        setRecentSales(salesData.slice(0, 4));

        const now = new Date();
        const firstDayOfMonth = startOfMonth(now);
        const lastDayOfMonth = endOfMonth(now);

        let currentMonthSalesValue = 0;
        let currentMonthPaidSalesCount = 0;
        let currentMonthSalesCount = 0;
        let todaySalesCount = 0;

        const weeklySalesData: { [week: string]: { weekLabel: string, vendas: number } } = {};
        const currentYear = getYear(now);

        salesData.forEach(sale => {
          const saleDate = sale.date;
          
          if (isWithinInterval(saleDate, { start: firstDayOfMonth, end: lastDayOfMonth })) {
            currentMonthSalesValue += sale.value;
            currentMonthSalesCount++;
            if (sale.status === "Paid") {
              currentMonthPaidSalesCount++;
            }

            const weekNumber = getISOWeek(saleDate);
            const weekKey = `${currentYear}-W${weekNumber}`;
            if (!weeklySalesData[weekKey]) {
              weeklySalesData[weekKey] = { weekLabel: `Sem ${weekNumber}`, vendas: 0 }; 
            }
            weeklySalesData[weekKey].vendas += sale.value;
          }
          if (isToday(saleDate)) {
            todaySalesCount++;
          }
        });
        
        const chartDataFormatted = Object.values(weeklySalesData).sort((a,b) => a.weekLabel.localeCompare(b.weekLabel));
        setDynamicSalesChartData(chartDataFormatted.length > 0 ? chartDataFormatted : [{ weekLabel: format(now, "MMM dd", {locale: ptBR}), vendas: 0 }]);


        setTotalSalesMonth(currentMonthSalesValue);
        setPaidSalesMonthCount(currentMonthPaidSalesCount);
        setNewSalesTodayCount(todaySalesCount);
        setAverageTicketMonth(currentMonthSalesCount > 0 ? currentMonthSalesValue / currentMonthSalesCount : 0);

      } catch (error) {
        console.error("Error fetching sales data for KPIs: ", error);
        toast({ variant: "destructive", title: "Erro ao buscar dados de vendas", description: "Não foi possível carregar os KPIs de vendas." });
      } finally {
        setIsLoadingSalesKpi(false);
        setIsLoadingRecentSales(false);
      }
    };

    const fetchCustomerCount = async () => {
      setIsLoadingCustomersKpi(true);
      try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        setTotalCustomersCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching customer count: ", error);
        toast({ variant: "destructive", title: "Erro ao buscar clientes", description: "Não foi possível carregar o total de clientes."});
      } finally {
        setIsLoadingCustomersKpi(false);
      }
    };


    fetchStockMovements();
    fetchDefaults();
    fetchSalesData();
    fetchCustomerCount();
  }, [toast]);

  const handleEditPrices = () => {
    setEditedPrices(gasPrices); 
    setIsEditingPrices(true);
  };

  const handleSavePrices = () => {
    setGasPrices(editedPrices);
    try {
      localStorage.setItem('gasPrices', JSON.stringify(editedPrices));
      toast({
        title: "Preços Atualizados!",
        description: "Os preços do gás foram salvos com sucesso no seu navegador.",
      });
    } catch (e) {
      console.error("Failed to save gas prices to localStorage", e);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar Preços",
        description: "Não foi possível salvar os preços localmente.",
      });
    }
    setIsEditingPrices(false);
  };

  const handleCancelEditPrices = () => {
    setEditedPrices(gasPrices); 
    setIsEditingPrices(false);
  };

  const handlePriceInputChange = (key: keyof typeof gasPrices, value: string) => {
    setEditedPrices(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const currentStockForChart = currentStockLevel ?? 0;
  const stockChartData = [
    { name: "Em Estoque", value: currentStockForChart, fill: "hsl(var(--chart-1))" },
    { name: "Capacidade Livre", value: Math.max(0, maxStock - currentStockForChart), fill: "hsl(var(--border))" }
  ];
  
  const totalDueFromDefaults = defaultingCustomers.reduce((sum, item) => sum + item.value, 0);
  const isStockLow = currentStockLevel !== null && currentStockLevel < LOW_STOCK_THRESHOLD;

  return (
    <div className="container mx-auto">
      <PageHeader title="Dashboard" description="Visão geral do seu negócio." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard
          title="Vendas Totais (Mês)"
          value={totalSalesMonth}
          icon={<DollarSign className="h-5 w-5 text-foreground" />}
          valueColor="text-foreground"
          isLoading={isLoadingSalesKpi}
        />
        <KpiCard
          title="Vendas Pagas (Mês)"
          value={paidSalesMonthCount}
          icon={<CheckCircle2 className="h-5 w-5 text-foreground" />}
          valueColor="text-foreground"
          isLoading={isLoadingSalesKpi}
        />
        <KpiCard
          title="Vendas Pendentes"
          value={totalDueFromDefaults}
          subText={isLoadingDefaults ? "Carregando..." : `${defaultingCustomers.length} Pendentes`}
          icon={<AlertTriangle className="h-5 w-5 text-foreground" />}
          valueColor="text-foreground" 
          subTextColor="text-destructive"
          isLoading={isLoadingDefaults}
        />
        <KpiCard
          title="Botijões em Estoque"
          value={currentStockLevel}
          icon={<PackageSearch className="h-5 w-5 text-foreground" />}
          isLoading={isLoadingStock}
          valueColor={isLoadingStock ? "text-foreground" : (isStockLow ? "text-yellow-500" : "text-foreground")}
          subText={
            isLoadingStock 
              ? undefined
              : currentStockLevel !== null 
                ? `${currentStockLevel}/${maxStock} unidades ${isStockLow ? " - Atenção!" : ""}` 
                : `0/${maxStock} unidades`
          }
          subTextColor={isLoadingStock ? "text-muted-foreground" : (isStockLow ? "text-yellow-600" : "text-muted-foreground")}
        />
      </div>

      <Card className="shadow-sm bg-card mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center">
            <Flame className="mr-2 h-5 w-5 text-foreground" /> Preços do Gás
          </CardTitle>
          {!isEditingPrices && (
            <Button onClick={handleEditPrices} variant="ghost" size="sm" className="text-muted-foreground">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Flame className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Atual</span>
              </div>
              {isEditingPrices ? (
                <Input 
                  type="number" 
                  value={editedPrices.current} 
                  onChange={(e) => handlePriceInputChange('current', e.target.value)} 
                  className="bg-input text-foreground text-xl font-bold p-2 h-auto"
                />
              ) : (
                <p className="text-xl font-bold text-foreground">{formatCurrency(gasPrices.current)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Botijão P13</p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">À Vista</span>
              </div>
              {isEditingPrices ? (
                <Input 
                  type="number" 
                  value={editedPrices.cash} 
                  onChange={(e) => handlePriceInputChange('cash', e.target.value)}
                  className="bg-input text-foreground text-xl font-bold p-2 h-auto"
                />
              ) : (
                <p className="text-xl font-bold text-foreground">{formatCurrency(gasPrices.cash)}</p>
              )}
               <p className="text-xs text-success mt-0.5">
                {isEditingPrices && editedPrices.current > editedPrices.cash 
                  ? `Desconto de ${formatCurrency(editedPrices.current - editedPrices.cash)}`
                  : !isEditingPrices && gasPrices.current > gasPrices.cash
                  ? `Desconto de ${formatCurrency(gasPrices.current - gasPrices.cash)}`
                  : " " 
                }
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-1">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cartão</span>
              </div>
              {isEditingPrices ? (
                <Input 
                  type="number" 
                  value={editedPrices.card} 
                  onChange={(e) => handlePriceInputChange('card', e.target.value)}
                  className="bg-input text-foreground text-xl font-bold p-2 h-auto"
                />
              ) : (
                <p className="text-xl font-bold text-foreground">{formatCurrency(gasPrices.card)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Débito ou Crédito</p>
            </div>
          </div>
          {isEditingPrices && (
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={handleCancelEditPrices} variant="outline">Cancelar</Button>
              <Button onClick={handleSavePrices}>
                <Check className="mr-2 h-4 w-4" /> Salvar Alterações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm bg-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-foreground">Visão Geral de Vendas</CardTitle>
                <Tabs defaultValue="month" className="w-auto">
                  <TabsList className="bg-background border border-input">
                    <TabsTrigger value="24h" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-foreground">24h</TabsTrigger>
                    <TabsTrigger value="week" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-foreground">Semana</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-foreground">Mês</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <CardDescription>Acompanhe o desempenho das suas vendas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {isLoadingSalesKpi ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                <ChartContainer config={salesBarChartConfig} className="h-full w-full">
                  <BarChart
                    accessibilityLayer
                    data={dynamicSalesChartData}
                    margin={{
                      left: -20,
                      right: 10,
                      top: 5,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                    <XAxis
                      dataKey="weekLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R$${value/1000}k`}
                    />
                     <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar
                      dataKey="vendas"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                      barSize={15}
                    />
                    <ChartLegend content={<ChartLegendContent className="text-xs text-foreground" />} />
                  </BarChart>
                </ChartContainer>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                <div></div> 
                {lastUpdatedTime ? (
                  <p className="text-xs text-muted-foreground">Atualizado: {format(lastUpdatedTime, "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Carregando hora...</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center text-foreground">
                  <Archive className="mr-2 h-5 w-5 text-foreground" />
                  Nível de Estoque
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
                  <Link href="/stock">Ver Detalhes <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </Button>
              </div>
              <CardDescription>Visão geral do seu inventário atual de botijões.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
             {isLoadingStock ? (
                <div className="flex justify-center items-center w-full md:w-1/2 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
              <div className="h-[180px] w-full md:w-1/2 max-w-[220px] mx-auto">
                <ChartContainer config={stockPieChartConfig} className="h-full w-full">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel nameKey="name" />}
                    />
                    <Pie
                      data={stockChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      startAngle={90}
                      endAngle={450}
                      paddingAngle={2}
                    >
                      {stockChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                      ))}
                    </Pie>
                     <ChartLegend content={<ChartLegendContent nameKey="name" className="text-xs text-foreground" />} />
                  </PieChart>
                </ChartContainer>
              </div>
              )}
              <div className="text-center md:text-left flex-1">
               {isLoadingStock ? (
                  <div className="flex flex-col items-center md:items-start">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  </div>
                ) : (
                  <>
                    <p className={`text-3xl font-bold ${isStockLow ? 'text-yellow-500' : 'text-foreground'}`}>{currentStockForChart}
                      <span className={`text-xl ${isStockLow ? 'text-yellow-500' : 'text-foreground'}`}> / {maxStock}</span>
                    </p>
                    <p className={`text-sm mb-3 ${isStockLow ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      Botijões em estoque {isStockLow && "(Atenção: Baixo!)"}
                    </p>
                    <Progress value={(currentStockForChart / maxStock) * 100} className="w-full h-2.5" />
                    <p className="text-xs text-foreground mt-4">
                      {((currentStockForChart / maxStock) * 100).toFixed(0)}% da capacidade total utilizada.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-foreground">
                <ListChecks className="mr-2 h-5 w-5 text-foreground" />
                Métricas Chave
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4 text-foreground" />Total de Clientes</span>
                {isLoadingCustomersKpi ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="text-sm font-semibold text-foreground">{totalCustomersCount ?? 0}</span>}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><DollarSign className="mr-2 h-4 w-4 text-foreground" />Ticket Médio (Mês)</span>
                 {isLoadingSalesKpi ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="text-sm font-semibold text-foreground">{formatCurrency(averageTicketMonth)}</span>}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><ShoppingCart className="mr-2 h-4 w-4 text-foreground" />Novas Vendas (Hoje)</span>
                 {isLoadingSalesKpi ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="text-sm font-semibold text-foreground">{newSalesTodayCount ?? 0}</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm bg-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center text-foreground">
                  <UserX className="mr-2 h-5 w-5 text-foreground" />
                  Clientes Inadimplentes
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
                  <Link href="/defaults">Ver Todos <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </Button>
              </div>
              <CardDescription>Clientes com pagamentos pendentes.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDefaults ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-destructive font-semibold mb-2">
                    Total devido: {formatCurrency(totalDueFromDefaults)}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-foreground">Cliente</TableHead>
                        <TableHead className="text-foreground">Valor Devido</TableHead>
                        <TableHead className="text-foreground">Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {defaultingCustomers.slice(0, 3).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-card-foreground">{item.customerName}</TableCell>
                          <TableCell className="text-destructive">{formatCurrency(item.value)}</TableCell>
                          <TableCell className="text-card-foreground">{format(item.dueDate, "dd/MM/yy", { locale: ptBR })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {defaultingCustomers.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum cliente inadimplente.</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-foreground">Vendas Recentes</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
                  <Link href="/sales">Ver Todas <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </Button>
              </div>
              <CardDescription>Últimas transações registradas no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRecentSales ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Cliente</TableHead>
                      <TableHead className="text-foreground">Valor</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium text-card-foreground">{sale.customerName || "Consumidor Final"}</TableCell>
                        <TableCell className="text-card-foreground">{formatCurrency(sale.value)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${sale.status === "Paid" ? "bg-success/20 text-success" : sale.status === "Pending" ? "bg-destructive/20 text-destructive" : "bg-muted/50 text-muted-foreground"}`}>
                            {sale.status === "Paid" ? "Pago" : sale.status === "Pending" ? "Pendente" : sale.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!isLoadingRecentSales && recentSales.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma venda recente.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

