
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Filter, UserPlus, Package } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";


// Dummy data
const initialSales = [
  { id: "s1", customerId: "1", customerName: "João Silva", value: 120.50, paymentMethod: "Pix", date: new Date(2024, 6, 15), status: "Paid", gasCanistersQuantity: 1, observations: "Entregar após as 18h", subtractFromStock: true },
  { id: "s2", customerId: "2", customerName: "Maria Oliveira", value: 241.00, paymentMethod: "Card", date: new Date(2024, 6, 14), status: "Pending", gasCanistersQuantity: 2, observations: "", subtractFromStock: true },
  { id: "s3", customerId: null, customerName: "Consumidor Final", value: 120.50, paymentMethod: "Cash", date: new Date(2024, 6, 13), status: "Paid", gasCanistersQuantity: 1, observations: "Cliente pediu troco para R$150", subtractFromStock: false },
];

const customers = [
  { id: "1", name: "João Silva" },
  { id: "2", name: "Maria Oliveira" },
];

const paymentMethods = ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Boleto"];
const saleStatuses = [
    { value: "Paid", label: "Pago"}, 
    { value: "Pending", label: "Pendente"}, 
    { value: "Overdue", label: "Atrasado"}
];

export default function SalesPage() {
  const [sales, setSales] = useState(initialSales);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<typeof initialSales[0] | null>(null);
  const { toast } = useToast();
  
  const initialFormData = {
    customerId: '',
    value: '0',
    paymentMethod: '',
    date: new Date(),
    status: 'Paid',
    gasCanistersQuantity: '1',
    observations: '',
    subtractFromStock: true,
  };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (isFormOpen && editingSale) {
      setFormData({
        customerId: editingSale.customerId || '',
        value: String(editingSale.value),
        paymentMethod: editingSale.paymentMethod,
        date: editingSale.date,
        status: editingSale.status,
        gasCanistersQuantity: String(editingSale.gasCanistersQuantity),
        observations: editingSale.observations || '',
        subtractFromStock: editingSale.subtractFromStock !== undefined ? editingSale.subtractFromStock : true,
      });
    } else if (isFormOpen && !editingSale) {
      setFormData(initialFormData);
    }
  }, [isFormOpen, editingSale]);


  const handleAddSale = () => {
    setEditingSale(null);
    // setFormData(initialFormData); // Moved to useEffect
    setIsFormOpen(true);
  };

  const handleEditSale = (sale: typeof initialSales[0]) => {
    setEditingSale(sale);
    // setFormData({...}); // Moved to useEffect
    setIsFormOpen(true);
  };

  const handleDeleteSale = (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
    toast({ title: "Venda Removida!", description: "O registro da venda foi removido com sucesso." });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === formData.customerId);
    const saleData = {
      ...formData,
      customerName: customer ? customer.name : "Consumidor Final",
      value: parseFloat(formData.value) || 0,
      gasCanistersQuantity: parseInt(formData.gasCanistersQuantity) || 0,
      date: formData.date || new Date(),
      observations: formData.observations,
      subtractFromStock: formData.subtractFromStock,
    };

    if (editingSale) {
      setSales(prev => prev.map(s => s.id === editingSale.id ? { ...editingSale, ...saleData } : s));
      toast({ title: "Venda Atualizada!", description: "Os dados da venda foram atualizados." });
    } else {
      setSales(prev => [...prev, { ...saleData, id: String(Date.now()) }]);
      toast({ title: "Venda Registrada!", description: "A nova venda foi adicionada com sucesso." });
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
            <Button variant="outline" className="text-foreground border-input hover:bg-accent-hover-bg hover:text-accent-foreground">
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
            <Button onClick={handleAddSale} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">
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
                <TableHead>Obs.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.customerName || "Consumidor Final"}</TableCell>
                  <TableCell>{formatCurrency(sale.value)}</TableCell>
                  <TableCell>{sale.paymentMethod}</TableCell>
                  <TableCell>{format(sale.date, "dd/MM/yyyy")}</TableCell>
                  <TableCell>{saleStatuses.find(s => s.value === sale.status)?.label || sale.status}</TableCell>
                  <TableCell>{sale.gasCanistersQuantity}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={sale.observations}>{sale.observations || "-"}</TableCell>
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
            <DialogTitle className="text-foreground">{editingSale ? "Editar Venda" : "Detalhes da Venda"}</DialogTitle>
            {!editingSale && <DialogDescription>Preencha os detalhes da nova transação.</DialogDescription>}
             {editingSale && <DialogDescription>Atualize os detalhes da transação.</DialogDescription>}
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1">
                <Label htmlFor="customer" className="text-muted-foreground">Cliente</Label>
                <div className="flex items-center gap-2">
                  <Select value={formData.customerId} onValueChange={val => setFormData({...formData, customerId: val})}>
                    <SelectTrigger className="w-full bg-input text-foreground">
                      <SelectValue placeholder="Consumidor Final" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Consumidor Final</SelectItem>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="flex-shrink-0">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="date" className="text-muted-foreground">Data da Venda</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-input text-foreground hover:bg-accent-hover-bg hover:text-accent-foreground",
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="value" className="text-muted-foreground">Valor (R$)</Label>
                  <Input id="value" type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="bg-input text-foreground" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gasCanistersQuantity" className="text-muted-foreground">Quantidade de Botijões</Label>
                  <Input id="gasCanistersQuantity" type="number" value={formData.gasCanistersQuantity} onChange={e => setFormData({...formData, gasCanistersQuantity: e.target.value})} className="bg-input text-foreground" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod" className="text-muted-foreground">Forma de Pagamento</Label>
                  <Select value={formData.paymentMethod} onValueChange={val => setFormData({...formData, paymentMethod: val})}>
                    <SelectTrigger className="w-full bg-input text-foreground">
                      <SelectValue placeholder="Selecione a forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="status" className="text-muted-foreground">Status da Venda</Label>
                  <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val})}>
                    <SelectTrigger className="w-full bg-input text-foreground">
                      <SelectValue placeholder="Status da venda" />
                    </SelectTrigger>
                    <SelectContent>
                      {saleStatuses.map(ss => <SelectItem key={ss.value} value={ss.value}>{ss.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="observations" className="text-muted-foreground">Observações (Opcional)</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={e => setFormData({...formData, observations: e.target.value})}
                  className="bg-input text-foreground"
                  placeholder="Alguma observação sobre a venda?"
                />
              </div>
              
              <div className="items-top flex space-x-2 pt-2">
                <Checkbox 
                  id="subtractFromStock" 
                  checked={formData.subtractFromStock}
                  onCheckedChange={(checked) => setFormData({...formData, subtractFromStock: !!checked})}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="subtractFromStock"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground flex items-center"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Subtrair {formData.gasCanistersQuantity || 0} botijão(ões) do estoque
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Marque para remover automaticamente a quantidade de botijões vendida do seu inventário.
                  </p>
                </div>
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">
                {editingSale ? "Salvar Alterações" : "Registrar Venda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    