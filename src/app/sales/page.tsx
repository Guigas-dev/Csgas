
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Filter, UserPlus, Package, Loader2 } from "lucide-react";
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
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  serverTimestamp 
} from "firebase/firestore";
import type { Sale, SaleFormData } from "./actions";
import { revalidateSalesRelatedPages } from "./actions";
import type { Customer } from "../customers/actions"; 
import type { StockMovementFormData } from "../stock/actions"; // Import for stock movement

const paymentMethods = ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Boleto"];
const saleStatuses = [
    { value: "Paid", label: "Pago"}, 
    { value: "Pending", label: "Pendente"}, 
    { value: "Overdue", label: "Atrasado"}
];

const CONSUMIDOR_FINAL_SELECT_VALUE = "_CONSUMIDOR_FINAL_";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const initialFormData: SaleFormData = {
    customerId: null, 
    customerName: "Consumidor Final",
    value: 0,
    paymentMethod: paymentMethods[0] || '',
    date: new Date(),
    status: 'Paid',
    gasCanistersQuantity: 1,
    observations: '',
    subtractFromStock: true,
  };
  const [formData, setFormData] = useState<SaleFormData>(initialFormData);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(),
          createdAt: data.createdAt, 
        } as Sale;
      });
      setSales(salesData);
    } catch (error) {
      console.error("Error fetching sales: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar vendas",
        description: "Não foi possível carregar o histórico de vendas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();

    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const q = query(collection(db, "customers"), orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const customersData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Customer));
        setCustomers(customersData);
      } catch (error) {
        console.error("Error fetching customers: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao buscar clientes",
          description: "Não foi possível carregar a lista de clientes para o formulário.",
        });
      } finally {
        setIsLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, [toast]); // Removed fetchSales from dependencies

  useEffect(() => {
    if (isFormOpen) {
      if (editingSale) {
        const customer = customers.find(c => c.id === editingSale.customerId);
        setFormData({
          customerId: editingSale.customerId || null,
          customerName: editingSale.customerName || (editingSale.customerId ? (customer?.name || "Cliente não encontrado") : "Consumidor Final"),
          value: editingSale.value,
          paymentMethod: editingSale.paymentMethod,
          date: editingSale.date instanceof Date ? editingSale.date : new Date(editingSale.date),
          status: editingSale.status,
          gasCanistersQuantity: editingSale.gasCanistersQuantity,
          observations: editingSale.observations || '',
          subtractFromStock: editingSale.subtractFromStock !== undefined ? editingSale.subtractFromStock : true,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [isFormOpen, editingSale, customers, initialFormData]);


  const handleAddSale = () => {
    setEditingSale(null);
    setFormData(initialFormData); 
    setIsFormOpen(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
  };

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta venda?")) return;
    setIsSubmitting(true);
    try {
      const saleRef = doc(db, 'sales', id);
      await deleteDoc(saleRef);
      toast({ title: "Venda Removida!", description: "O registro da venda foi removido com sucesso." });
      await revalidateSalesRelatedPages();
      fetchSales(); 
    } catch (e: unknown) {
      console.error('Error deleting sale:', e);
      let errorMessage = 'Falha ao excluir venda.';
      if (e instanceof Error) errorMessage = e.message;
      else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao excluir", description: errorMessage });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const selectedCustomer = formData.customerId ? customers.find(c => c.id === formData.customerId) : null;
    const salePayload: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formData,
      customerId: formData.customerId || null,
      customerName: selectedCustomer ? selectedCustomer.name : "Consumidor Final",
      value: parseFloat(String(formData.value)) || 0,
      gasCanistersQuantity: parseInt(String(formData.gasCanistersQuantity)) || 0,
      date: Timestamp.fromDate(formData.date), // Convert to Firestore Timestamp
    };

    try {
      let saleIdForStockMovement: string | undefined;

      if (editingSale) {
        const saleRef = doc(db, 'sales', editingSale.id);
        await updateDoc(saleRef, {
          ...salePayload,
          updatedAt: serverTimestamp(),
        });
        saleIdForStockMovement = editingSale.id;
        toast({ title: "Venda Atualizada!", description: "Os dados da venda foram atualizados." });
      } else {
        const docRef = await addDoc(collection(db, 'sales'), {
          ...salePayload,
          createdAt: serverTimestamp(),
        });
        saleIdForStockMovement = docRef.id;
        toast({ title: "Venda Registrada!", description: "A nova venda foi adicionada com sucesso." });
      }

      // Handle stock movement if subtractFromStock is true
      // This part is only for NEW sales or if editing requires stock adjustment (complex case, not handled here for simplicity for edit)
      if (formData.subtractFromStock && saleIdForStockMovement && !editingSale) { 
        const stockMovementPayload: StockMovementFormData = {
          type: 'OUTPUT',
          origin: 'Venda',
          quantity: salePayload.gasCanistersQuantity,
          notes: `Saída automática por venda ID: ${saleIdForStockMovement}`,
          relatedSaleId: saleIdForStockMovement,
        };
        await addDoc(collection(db, 'stockMovements'), {
          ...stockMovementPayload,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Estoque Atualizado!", description: `${salePayload.gasCanistersQuantity} unidade(s) removida(s) do estoque.`});
      }
      // TODO: If editing a sale and quantity changes, or subtractFromStock changes, stock adjustment logic here would be more complex.
      // For now, stock adjustment on edit is not implemented to keep it simple.

      setIsFormOpen(false);
      await revalidateSalesRelatedPages();
      fetchSales();
    } catch (e: unknown) {
      console.error('Error saving sale:', e);
      let errorMessage = 'Falha ao salvar venda.';
      if (e instanceof Error) errorMessage = e.message;
      else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao salvar", description: errorMessage });
    }
    setIsSubmitting(false);
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
            <Button onClick={handleAddSale} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
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
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando vendas...</p>
            </div>
          ) : (
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
                    <TableCell>{format(sale.date instanceof Timestamp ? sale.date.toDate() : sale.date, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{saleStatuses.find(s => s.value === sale.status)?.label || sale.status}</TableCell>
                    <TableCell>{sale.gasCanistersQuantity}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={sale.observations}>{sale.observations || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditSale(sale)} className="hover:text-accent" disabled={isSubmitting}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSale(sale.id)} className="hover:text-destructive" disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && sales.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma venda registrada.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingSale ? "Editar Venda" : "Detalhes da Venda"}</DialogTitle>
            <DialogDescription>
              {editingSale ? "Atualize os detalhes da transação." : "Preencha os detalhes da nova transação."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1">
                <Label htmlFor="customer" className="text-muted-foreground">Cliente</Label>
                <div className="flex items-center gap-2">
                  <Select 
                    value={formData.customerId || CONSUMIDOR_FINAL_SELECT_VALUE} 
                    onValueChange={val => {
                        const selectedCust = customers.find(c => c.id === val);
                        setFormData({...formData, customerId: val === CONSUMIDOR_FINAL_SELECT_VALUE ? null : val, customerName: val === CONSUMIDOR_FINAL_SELECT_VALUE ? "Consumidor Final" : (selectedCust?.name || "")})
                    }}
                    disabled={isSubmitting || isLoadingCustomers}
                  >
                    <SelectTrigger className="w-full bg-input text-foreground">
                      <SelectValue placeholder={isLoadingCustomers ? "Carregando clientes..." : "Consumidor Final"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CONSUMIDOR_FINAL_SELECT_VALUE}>Consumidor Final</SelectItem>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="flex-shrink-0" disabled={isSubmitting}>
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="value" className="text-muted-foreground">Valor (R$)</Label>
                  <Input id="value" type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} className="bg-input text-foreground" required disabled={isSubmitting}/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gasCanistersQuantity" className="text-muted-foreground">Quantidade de Botijões</Label>
                  <Input id="gasCanistersQuantity" type="number" value={formData.gasCanistersQuantity} onChange={e => setFormData({...formData, gasCanistersQuantity: parseInt(e.target.value)})} className="bg-input text-foreground" required disabled={isSubmitting}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod" className="text-muted-foreground">Forma de Pagamento</Label>
                  <Select value={formData.paymentMethod} onValueChange={val => setFormData({...formData, paymentMethod: val})} disabled={isSubmitting}>
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
                  <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val})} disabled={isSubmitting}>
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
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="items-top flex space-x-2 pt-2">
                <Checkbox 
                  id="subtractFromStock" 
                  checked={formData.subtractFromStock}
                  onCheckedChange={(checked) => setFormData({...formData, subtractFromStock: !!checked})}
                  disabled={isSubmitting}
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
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingSale ? "Salvar Alterações" : "Registrar Venda")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
