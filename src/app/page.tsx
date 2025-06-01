"use client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Lightbulb, TrendingUp, DollarSign, Users, Info, CalendarDays, ShoppingCart } from "lucide-react";
import Image from "next/image";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const salesChartData = [
  { date: "Mar 01", vendas: 2800, mesAnterior: 2400 },
  { date: "Mar 08", vendas: 2500, mesAnterior: 2700 },
  { date: "Mar 15", vendas: 3200, mesAnterior: 2900 },
  { date: "Mar 22", vendas: 3500, mesAnterior: 3100 },
  { date: "Mar 29", vendas: 4100, mesAnterior: 3300 },
  { date: "Abr 05", vendas: 3800, mesAnterior: 3700 },
  { date: "Abr 08", vendas: 4500, mesAnterior: 3900 },
];

const chartConfig = {
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

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DashboardPage() {
  return (
    <div className="container mx-auto">
      <PageHeader title="Dashboard" description="Visão geral do seu negócio." />
      
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
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart
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
                    <Area
                      dataKey="mesAnterior"
                      type="natural"
                      fill="hsl(var(--chart-2)/0.3)"
                      stroke="hsl(var(--chart-2))"
                      stackId="a"
                    />
                    <Area
                      dataKey="vendas"
                      type="natural"
                      fill="hsl(var(--chart-1)/0.4)"
                      stroke="hsl(var(--chart-1))"
                      stackId="a"
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
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

          {/* Vendas Recentes */}
          <Card className="shadow-xl bg-card border-border/30">
            <CardHeader>
              <CardTitle className="text-xl">Vendas Recentes</CardTitle>
              <CardDescription>Últimas transações registradas no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSalesData.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.customerName}</TableCell>
                      <TableCell>{sale.amount}</TableCell>
                      <TableCell>{sale.date}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${sale.status === "Pago" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                          {sale.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="hover:bg-accent/50">Detalhes</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita */}
        <div className="lg:col-span-1 space-y-6">
          {/* Saldo Total de Vendas */}
          <Card className="shadow-xl bg-card border-border/30 overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Saldo Total de Vendas</CardTitle>
                  <CardDescription className="text-sm">Soma de todas as vendas.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">USD $</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary my-4">{formatCurrency(23094.57)}</div>
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-6">
                <span>Comparado ao mês passado: <span className="text-destructive">-37.16%</span></span>
                <span className="flex items-center cursor-pointer hover:text-accent">
                  Como funciona? <Info className="ml-1 h-3 w-3"/>
                </span>
              </div>

              {/* AI Assistant */}
              <div className="relative p-6 rounded-lg bg-card/50 backdrop-blur-md border border-[hsl(var(--subtle-border))]">
                 <Image 
                    src="https://placehold.co/400x250/1A1A1A/4FC3F7.png?text=AI" 
                    alt="AI Assistant Visual" 
                    width={400} 
                    height={250} 
                    className="absolute inset-0 w-full h-full object-cover opacity-10 rounded-lg z-0"
                    data-ai-hint="abstract wave"
                  />
                <div className="relative z-10">
                  <div className="flex items-center mb-2">
                    <Lightbulb className="h-5 w-5 text-accent mr-2" />
                    <h4 className="font-semibold text-foreground">Assistente IA</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Estou atualizando os dados do seu balanço agora...
                  </p>
                  <div className="w-full bg-border/30 rounded-full h-1.5">
                    <div className="bg-accent h-1.5 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destaques / Oportunidades */}
          <Card className="shadow-xl bg-card border-border/30">
            <CardHeader>
              <CardTitle className="text-xl">Oportunidades</CardTitle>
              <CardDescription>Ações recomendadas para seu negócio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start p-4 rounded-lg bg-background hover:bg-accent/10 transition-colors">
                    <div className="bg-destructive/20 text-destructive p-2 rounded-full mr-4">
                        <DollarSign className="h-5 w-5"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Analisar Inadimplência</h4>
                        <p className="text-xs text-muted-foreground">Você tem <strong>{formatCurrency(3150)}</strong> em dívidas ativas.</p>
                        <Button variant="link" size="sm" className="p-0 h-auto text-accent hover:text-accent/80 mt-1">
                            Ver Inadimplentes <ArrowRight className="ml-1 h-3 w-3"/>
                        </Button>
                    </div>
                </div>
                 <div className="flex items-start p-4 rounded-lg bg-background hover:bg-accent/10 transition-colors">
                    <div className="bg-success/20 text-success p-2 rounded-full mr-4">
                        <Users className="h-5 w-5"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Engajar Clientes</h4>
                        <p className="text-xs text-muted-foreground">5 novos clientes este mês. Considere uma oferta!</p>
                         <Button variant="link" size="sm" className="p-0 h-auto text-accent hover:text-accent/80 mt-1">
                            Ver Clientes <ArrowRight className="ml-1 h-3 w-3"/>
                        </Button>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
