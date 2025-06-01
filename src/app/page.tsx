
"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, TrendingUp, UserX, Archive, ListChecks, Users, DollarSign, ShoppingCart, CheckCircle2, AlertTriangle, PackageSearch } from "lucide-react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


const salesChartData = [
  { date: "Mar 01", vendas: 2800, mesAnterior: 2400 },
  { date: "Mar 08", vendas: 2500, mesAnterior: 2700 },
  { date: "Mar 15", vendas: 3200, mesAnterior: 2900 },
  { date: "Mar 22", vendas: 3500, mesAnterior: 3100 },
  { date: "Mar 29", vendas: 4100, mesAnterior: 3300 },
  { date: "Abr 05", vendas: 3800, mesAnterior: 3700 },
  { date: "Abr 08", vendas: 4500, mesAnterior: 3900 },
];

const salesBarChartConfig = {
  vendas: {
    label: "Vendas Atuais",
    color: "hsl(var(--chart-1))",
  },
  mesAnterior: {
    label: "Mês Anterior",
    color: "hsl(var(--chart-2))",
  },
};

const recentSalesData = [
  { id: "1", customerName: "Carlos Lima", amount: "R$ 150,00", date: "08/04/2024", status: "Pago" },
  { id: "2", customerName: "Ana Pereira", amount: "R$ 230,50", date: "07/04/2024", status: "Pendente" },
  { id: "3", customerName: "Lucas Souza", amount: "R$ 99,00", date: "07/04/2024", status: "Pago" },
  { id: "4", customerName: "Mariana Costa", amount: "R$ 310,00", date: "06/04/2024", status: "Pago" },
];

const defaultingCustomersData = [
  { customerId: "2", customerName: "Maria Oliveira", value: 241.00, saleId: "s2", dueDate: new Date(2024, 7, 14), paymentStatus: "Pending" },
  { customerId: "4", customerName: "Pedro Almeida", value: 150.00, saleId: "s4", dueDate: new Date(2024, 6, 30), paymentStatus: "Pending" },
  { customerId: "5", customerName: "Julia Santos", value: 85.75, saleId: "s7", dueDate: new Date(2024, 7, 5), paymentStatus: "Pending" },
];
const totalDue = defaultingCustomersData.reduce((sum, item) => sum + item.value, 0);


const maxStock = 100;
const stockPieChartConfig = {
  value: { label: "Unidades" },
  "Em Estoque": { label: "Em Estoque", color: "hsl(var(--chart-1))" },
  "Capacidade Livre": { label: "Capacidade Livre", color: "hsl(var(--border))" }
};

const totalCustomers = 35;
const averageTicket = 185.50;
const newSalesToday = 5;


const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface KpiCardProps {
  title: string;
  value: string | number;
  subText?: string;
  icon: React.ReactNode;
  trendIcon?: React.ReactNode;
  valueColor?: string;
  subTextColor?: string;
  isLoading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subText, icon, trendIcon, valueColor = "text-foreground", subTextColor = "text-muted-foreground", isLoading = false }) => {
  return (
    <Card className="shadow-lg bg-card border-border/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
           <div className="text-2xl font-bold text-foreground">Carregando...</div>
        ) : (
          <div className={`text-2xl font-bold ${valueColor}`}>{typeof value === 'number' && (title.toLowerCase().includes("vendas totais") || title.toLowerCase().includes("ticket médio")) ? formatCurrency(value) : value}</div>
        )}
        {subText && !isLoading && (
          <p className={`text-xs ${subTextColor} flex items-center`}>
            {subText} {trendIcon && <span className="ml-1">{trendIcon}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
};


export default function DashboardPage() {
  const [stockCount, setStockCount] = useState<number | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStockCount(75); 
      setIsLoadingStock(false);
    }, 1500); 
    return () => clearTimeout(timer);
  }, []);

  const currentStockForChart = stockCount ?? 0;
  const stockChartData = [
    { name: "Em Estoque", value: currentStockForChart, fill: "hsl(var(--chart-1))" },
    { name: "Capacidade Livre", value: maxStock - currentStockForChart, fill: "hsl(var(--border))" }
  ];


  return (
    <div className="container mx-auto">
      <PageHeader title="Dashboard" description="Visão geral do seu negócio." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Vendas Totais (Mês)"
          value={12345}
          subText="+15% Mês Anterior"
          icon={<DollarSign className="h-5 w-5 text-foreground" />}
          trendIcon={<TrendingUp className="h-4 w-4 text-foreground" />}
          valueColor="text-primary"
        />
        <KpiCard
          title="Vendas Pagas (Mês)"
          value={85}
          subText="+5 Mês Anterior"
          icon={<CheckCircle2 className="h-5 w-5 text-foreground" />}
          trendIcon={<TrendingUp className="h-4 w-4 text-foreground" />}
          valueColor="text-success"
        />
        <KpiCard
          title="Vendas Pendentes"
          value={12}
          subText={formatCurrency(1250.00)}
          icon={<AlertTriangle className="h-5 w-5 text-foreground" />}
          valueColor="text-destructive"
          subTextColor="text-destructive"
        />
        <KpiCard
          title="Botijões em Estoque"
          value={stockCount ?? ""}
          icon={<PackageSearch className="h-5 w-5 text-foreground" />}
          isLoading={isLoadingStock}
          valueColor="text-foreground"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visão Geral de Vendas */}
          <Card className="shadow-xl bg-card border-border/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Visão Geral de Vendas</CardTitle>
                <Tabs defaultValue="month" className="w-auto">
                  <TabsList className="bg-background border border-input">
                    <TabsTrigger value="24h" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">24h</TabsTrigger>
                    <TabsTrigger value="week" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Semana</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Mês</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <CardDescription>Acompanhe o desempenho das suas vendas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ChartContainer config={salesBarChartConfig} className="h-full w-full">
                  <BarChart
                    accessibilityLayer
                    data={salesChartData}
                    margin={{
                      left: -20,
                      right: 10,
                      top: 5,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 6)}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R$${value/1000}k`}
                    />
                     <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar
                      dataKey="mesAnterior"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                      barSize={15}
                    />
                    <Bar
                      dataKey="vendas"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                      barSize={15}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                <div className="text-3xl font-bold text-success flex items-center">
                  <TrendingUp className="mr-2 h-7 w-7" /> +19.23%
                </div>
                <p className="text-xs text-muted-foreground">Atualizado: Hoje, 09:15 AM</p>
              </div>
            </CardContent>
          </Card>

          {/* Nível de Estoque */}
          <Card className="shadow-xl bg-card border-border/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center">
                  <Archive className="mr-2 h-5 w-5 text-foreground" />
                  Nível de Estoque
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-accent hover:text-accent/80" asChild>
                  <Link href="/stock">Ver Detalhes <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </Button>
              </div>
              <CardDescription>Visão geral do seu inventário atual de botijões.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
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
                     <ChartLegend content={<ChartLegendContent nameKey="name" className="text-xs" />} />
                  </PieChart>
                </ChartContainer>
              </div>
              <div className="text-center md:text-left flex-1">
                <p className="text-3xl font-bold text-foreground">{currentStockForChart}
                  <span className="text-xl text-muted-foreground"> / {maxStock}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-3">Botijões em estoque</p>
                <Progress value={(currentStockForChart / maxStock) * 100} className="w-full h-2.5" />
                 <p className="text-xs text-muted-foreground mt-4">
                  {((currentStockForChart / maxStock) * 100).toFixed(0)}% da capacidade total utilizada.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Métricas Chave */}
          <Card className="shadow-xl bg-card border-border/30">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-foreground" />
                Métricas Chave
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground" />Total de Clientes</span>
                <span className="text-sm font-semibold text-foreground">{totalCustomers}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />Ticket Médio</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(averageTicket)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />Novas Vendas (Hoje)</span>
                <span className="text-sm font-semibold text-foreground">{newSalesToday}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita */}
        <div className="lg:col-span-1 space-y-6">
          {/* Clientes Inadimplentes */}
          <Card className="shadow-xl bg-card border-border/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center">
                  <UserX className="mr-2 h-5 w-5 text-foreground" />
                  Clientes Inadimplentes
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-accent hover:text-accent/80" asChild>
                  <Link href="/defaults">Ver Todos <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </Button>
              </div>
              <CardDescription>Clientes com pagamentos pendentes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-destructive font-semibold mb-2">
                Total devido: {formatCurrency(totalDue)}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Devido</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaultingCustomersData.slice(0, 3).map((item) => (
                    <TableRow key={item.customerId}>
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(item.value)}</TableCell>
                      <TableCell>{format(item.dueDate, "dd/MM/yy", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {defaultingCustomersData.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum cliente inadimplente.</p>}
            </CardContent>
          </Card>

          {/* Vendas Recentes */}
          <Card className="shadow-xl bg-card border-border/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Vendas Recentes</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-accent hover:text-accent/80" asChild>
                  <Link href="/sales">Ver Todas <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </Button>
              </div>
              <CardDescription>Últimas transações registradas no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSalesData.slice(0,4).map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.customerName}</TableCell>
                      <TableCell>{sale.amount}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${sale.status === "Pago" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                          {sale.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               {recentSalesData.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma venda recente.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

