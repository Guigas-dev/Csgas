"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";


// Dummy data
const initialSales = [
  { id: "s1", customerId: "1", customerName: "João Silva", value: 120.50, paymentMethod: "Pix", date: new Date(2024, 6, 15), status: "Paid", gasCanistersQuantity: 1 },
  { id: "s2", customerId: "2", customerName: "Maria Oliveira", value: 241.00, paymentMethod: "Card", date: new Date(2024, 6, 14), status: "Pending", gasCanistersQuantity: 2 },
  { id: "s3", customerId: null, customerName: "N/A", value: 120.50, paymentMethod: "Cash", date: new Date(2024, 6, 13), status: "Paid", gasCanistersQuantity: 1 },
];

const customers = [
  { id: "1", name: "João Silva" },
  { id: "2", name: "Maria Oliveira" },
];

const paymentMethods = ["Pix", "Card", "Cash"];
const saleStatuses = ["Paid", "Pending", "Overdue"];

export default function SalesPage() {
  const [sales, setSales] = useState(initialSales);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<typeof initialSales[0] | null>(null);
  
  const initialFormData = {
    customerId: '',
    value: '',
    paymentMethod: '',
    date: new Date(),
    status: '',
    gasCanistersQuantity: ''
  };
  const [formData, setFormData] = useState(initialFormData);


  const handleAddSale = () => {
    setEditingSale(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleEditSale = (sale: typeof initialSales[0]) => {
    setEditingSale(sale);
    setFormData({
      customerId: sale.customerId || '',
      value: String(sale.value),
      paymentMethod: sale.paymentMethod,
      date: sale.date,
      status: sale.status,
      gasCanistersQuantity: String(sale.gasCanistersQuantity)
    });
    setIsFormOpen(true);
  };

  const handleDeleteSale = (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === formData.customerId);
    const saleData = {
      ...formData,
      customerName: customer ? customer.name : "N/A",
      value: parseFloat(formData.value) || 0,
      gasCanistersQuantity: parseInt(formData.gasCanistersQuantity) || 0,
      date: formData.date || new Date(),
    };

    if (editingSale) {
      setSales(prev => prev.map(s => s.id === editingSale.id ? { ...editingSale, ...saleData } : s));
    } else {
      setSales(prev => [...prev, { ...saleData, id: String(Date.now()) }]);
    }
    setIsFormOpen(false);
  };
  
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div>
      <PageHeader
        title="Registro de Vendas"
        description="Gerencie o histórico de vendas e registre novas transações."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="text-foreground border-input hover:bg-accent hover:text-accent-foreground">
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
            <Button onClick={handleAddSale} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Registrar Venda
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Botijões</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.customerName || "N/A"}</TableCell>
                  <TableCell>{formatCurrency(sale.value)}</TableCell>
                  <TableCell>{sale.paymentMethod}</TableCell>
                  <TableCell>{format(sale.date, "dd/MM/yyyy")}</TableCell>
                  <TableCell>{sale.status}</TableCell>
                  <TableCell>{sale.gasCanistersQuantity}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditSale(sale)} className="hover:text-accent">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSale(sale.id)} className="hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sales.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma venda registrada.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingSale ? "Editar Venda" : "Registrar Nova Venda"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da transação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer" className="text-right text-muted-foreground">Cliente</Label>
                <Select value={formData.customerId} onValueChange={val => setFormData({...formData, customerId: val})}>
                  <SelectTrigger className="col-span-3 bg-input text-foreground">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value" className="text-right text-muted-foreground">Valor (R$)</Label>
                <Input id="value" type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="col-span-3 bg-input text-foreground" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right text-muted-foreground">Pagamento</Label>
                 <Select value={formData.paymentMethod} onValueChange={val => setFormData({...formData, paymentMethod: val})}>
                  <SelectTrigger className="col-span-3 bg-input text-foreground">
                    <SelectValue placeholder="Método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right text-muted-foreground">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal bg-input text-foreground hover:bg-accent hover:text-accent-foreground",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({...formData, date: date || new Date()})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right text-muted-foreground">Status</Label>
                 <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val})}>
                  <SelectTrigger className="col-span-3 bg-input text-foreground">
                    <SelectValue placeholder="Status da venda" />
                  </SelectTrigger>
                  <SelectContent>
                    {saleStatuses.map(ss => <SelectItem key={ss} value={ss}>{ss}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gasCanistersQuantity" className="text-right text-muted-foreground">Botijões</Label>
                <Input id="gasCanistersQuantity" type="number" value={formData.gasCanistersQuantity} onChange={e => setFormData({...formData, gasCanistersQuantity: e.target.value})} className="col-span-3 bg-input text-foreground" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingSale ? "Salvar Venda" : "Registrar Venda"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
