"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit, PlusCircle, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";


// Dummy data
const initialDefaults = [
  { id: "d1", customerId: "2", customerName: "Maria Oliveira", saleId: "s2", value: 241.00, dueDate: new Date(2024, 7, 14), paymentStatus: "Pending" },
  { id: "d2", customerId: "4", customerName: "Pedro Almeida", saleId: "s4", value: 150.00, dueDate: new Date(2024, 6, 30), paymentStatus: "Pending" },
];

const customers = [
  { id: "1", name: "João Silva" },
  { id: "2", name: "Maria Oliveira" },
  { id: "4", name: "Pedro Almeida" },
];

const paymentStatuses = ["Pending", "Paid"];

export default function DefaultsPage() {
  const [defaults, setDefaults] = useState(initialDefaults);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefault, setEditingDefault] = useState<typeof initialDefaults[0] | null>(null);
  
  const initialFormData = {
    customerId: '',
    value: '',
    dueDate: new Date(),
    paymentStatus: 'Pending',
    saleId: '',
  };
  const [formData, setFormData] = useState(initialFormData);

  const handleAddDefault = () => {
    setEditingDefault(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleEditDefault = (defaultItem: typeof initialDefaults[0]) => {
    setEditingDefault(defaultItem);
    setFormData({
      customerId: defaultItem.customerId || '',
      value: String(defaultItem.value),
      dueDate: defaultItem.dueDate,
      paymentStatus: defaultItem.paymentStatus,
      saleId: defaultItem.saleId || '',
    });
    setIsFormOpen(true);
  };

  const handleMarkAsPaid = (id: string) => {
    setDefaults(prev => 
      prev.map(d => d.id === id ? { ...d, paymentStatus: "Paid" } : d)
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === formData.customerId);
    const defaultData = {
      ...formData,
      customerName: customer ? customer.name : "N/A",
      value: parseFloat(formData.value) || 0,
      dueDate: formData.dueDate || new Date(),
    };

    if (editingDefault) {
      setDefaults(prev => prev.map(d => d.id === editingDefault.id ? { ...editingDefault, ...defaultData } : d));
    } else {
      setDefaults(prev => [...prev, { ...defaultData, id: String(Date.now()) }]);
    }
    setIsFormOpen(false);
  };
  
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


  return (
    <div>
      <PageHeader
        title="Controle de Inadimplência"
        description="Acompanhe e gerencie os pagamentos pendentes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="text-foreground border-input hover:bg-accent hover:text-accent-foreground">
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
            <Button onClick={handleAddDefault} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pendência
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Pendências de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaults.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.customerName}</TableCell>
                  <TableCell>{formatCurrency(item.value)}</TableCell>
                  <TableCell>{format(item.dueDate, "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${item.paymentStatus === "Paid" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {item.paymentStatus === "Paid" ? "Pago" : "Pendente"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.paymentStatus === "Pending" && (
                       <Button variant="ghost" size="icon" onClick={() => handleMarkAsPaid(item.id)} className="hover:text-green-500" title="Marcar como Pago">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEditDefault(item)} className="hover:text-accent">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {defaults.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma pendência registrada.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingDefault ? "Editar Pendência" : "Adicionar Nova Pendência"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da pendência de pagamento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer" className="text-right text-muted-foreground">Cliente</Label>
                <Select value={formData.customerId} onValueChange={val => setFormData({...formData, customerId: val})}>
                  <SelectTrigger className="col-span-3 bg-input text-foreground">
                    <SelectValue placeholder="Selecione o cliente" />
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
                <Label htmlFor="dueDate" className="text-right text-muted-foreground">Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal bg-input text-foreground hover:bg-accent hover:text-accent-foreground",
                        !formData.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => setFormData({...formData, dueDate: date || new Date()})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentStatus" className="text-right text-muted-foreground">Status</Label>
                 <Select value={formData.paymentStatus} onValueChange={val => setFormData({...formData, paymentStatus: val})}>
                  <SelectTrigger className="col-span-3 bg-input text-foreground">
                    <SelectValue placeholder="Status do pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatuses.map(ps => <SelectItem key={ps} value={ps}>{ps === "Paid" ? "Pago" : "Pendente"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="saleId" className="text-right text-muted-foreground">ID Venda (Opc)</Label>
                <Input id="saleId" value={formData.saleId} onChange={e => setFormData({...formData, saleId: e.target.value})} className="col-span-3 bg-input text-foreground" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingDefault ? "Salvar Alterações" : "Adicionar Pendência"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
