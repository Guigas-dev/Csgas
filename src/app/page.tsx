import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Package, AlertTriangle } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  className?: string;
}

function MetricCard({ title, value, icon: Icon, description, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  // Placeholder data
  const metrics = {
    dailySales: 1250.75,
    monthlySales: 25300.50,
    outstandingDebt: 3150.00,
    activeClients: 120,
    gasStock: 85,
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="container mx-auto">
      <PageHeader title="Dashboard" description="Visão geral do seu negócio." />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Vendas do Dia"
          value={formatCurrency(metrics.dailySales)}
          icon={DollarSign}
          description="+15.5% vs ontem"
          className="bg-card shadow-lg"
        />
        <MetricCard
          title="Vendas do Mês"
          value={formatCurrency(metrics.monthlySales)}
          icon={TrendingUp}
          description="+8.2% vs mês passado"
          className="bg-card shadow-lg"
        />
        <MetricCard
          title="Dívida Ativa Total"
          value={formatCurrency(metrics.outstandingDebt)}
          icon={AlertTriangle}
          description="De 15 clientes"
          className="bg-card shadow-lg"
        />
        <MetricCard
          title="Clientes Ativos"
          value={metrics.activeClients.toString()}
          icon={Users}
          description="+5 novos este mês"
          className="bg-card shadow-lg"
        />
        <MetricCard
          title="Estoque de Botijões"
          value={`${metrics.gasStock} unidades`}
          icon={Package}
          description="Nível bom"
          className="bg-card shadow-lg"
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Funcionalidade de vendas recentes será implementada aqui.</p>
            {/* Placeholder for a mini sales list or chart */}
          </CardContent>
        </Card>
        <Card className="bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Alertas de Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Funcionalidade de alertas de estoque será implementada aqui.</p>
            {/* Placeholder for stock alerts */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
