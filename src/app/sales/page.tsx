
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  serverTimestamp,
  writeBatch,
  where,
  limit
} from "firebase/firestore";
import type { Sale, SaleFormData } from "./actions";
import { revalidateSalesRelatedPages } from "./actions";
import type { Customer } from "../customers/actions";
import type { StockMovementEntry } from "../stock/actions";
import { useAuth } from "@/contexts/auth-context";
import type { DefaultEntry } from "../defaults/actions";


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
  const { currentUser } = useAuth();

  const initialFormData = useMemo((): SaleFormData => ({
    customerId: null,
    customerName: "Consumidor Final",
    value: 0,
    paymentMethod: paymentMethods[0] || '',
    date: new Date(),
    status: 'Paid',
    paymentDueDate: null,
    gasCanistersQuantity: 1,
    observations: '',
    subtractFromStock: true,
  }), []);

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
          paymentDueDate: (data.paymentDueDate as Timestamp)?.toDate ? (data.paymentDueDate as Timestamp).toDate() : null,
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
  }, [toast]);

  useEffect(() => {
    if (isFormOpen) {
      if (editingSale) {
        const customer = customers.find(c => c.id === editingSale.customerId);
        setFormData({
          customerId: editingSale.customerId || null,
          customerName: editingSale.customerName || (editingSale.customerId ? (customer?.name || "Cliente não encontrado") : "Consumidor Final"),
          value: editingSale.value,
          paymentMethod: editingSale.paymentMethod,
          date: editingSale.date instanceof Date ? editingSale.date : (editingSale.date as unknown as Timestamp).toDate(),
          status: editingSale.status,
          paymentDueDate: editingSale.paymentDueDate instanceof Date ? editingSale.paymentDueDate : (editingSale.paymentDueDate ? (editingSale.paymentDueDate as unknown as Timestamp).toDate() : null),
          gasCanistersQuantity: editingSale.gasCanistersQuantity,
          observations: editingSale.observations || '',
          subtractFromStock: editingSale.subtractFromStock !== undefined ? editingSale.subtractFromStock : true,
        });
      } else {
        setFormData(prev => ({
          ...initialFormData,
          date: new Date(), // Ensure date is current for new sales
          paymentDueDate: null, // Ensure paymentDueDate is null for new sales initially
        }));
      }
    }
  }, [isFormOpen, editingSale, customers, initialFormData]);

  // Reset paymentDueDate if status is not 'Pending'
  useEffect(() => {
    if (formData.status !== 'Pending') {
      setFormData(prev => ({ ...prev, paymentDueDate: null }));
    }
  }, [formData.status]);


  const handleAddSale = () => {
    setEditingSale(null);
    setFormData(prev => ({
        ...initialFormData,
        date: new Date(),
        paymentDueDate: null,
    }));
    setIsFormOpen(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true); 
  };

  const handleDeleteSale = async (id: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para excluir." });
      return;
    }
    if (!confirm("Tem certeza que deseja excluir esta venda? Esta ação também removerá a pendência associada, se houver.")) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const saleRef = doc(db, 'sales', id);
      batch.delete(saleRef);

      // Check for and delete associated default entry
      const defaultsQuery = query(collection(db, "defaults"), where("saleId", "==", id), limit(1));
      const defaultsSnapshot = await getDocs(defaultsQuery);
      if (!defaultsSnapshot.empty) {
        const defaultDocRef = defaultsSnapshot.docs[0].ref;
        batch.delete(defaultDocRef);
      }
      
      await batch.commit();
      toast({ title: "Venda Removida!", description: "O registro da venda e qualquer pendência associada foram removidos." });
      await revalidateSalesRelatedPages();
      fetchSales();
    } catch (e: unknown) {
      console.error('Error deleting sale and associated default:', e);
      let errorMessage = 'Falha ao excluir venda.';
      if (e instanceof Error) errorMessage = e.message;
      else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao excluir", description: errorMessage });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Usuário não autenticado",
        description: "Por favor, faça login para registrar uma venda.",
      });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);

    const selectedCustomer = formData.customerId ? customers.find(c => c.id === formData.customerId) : null;
    
    // Prepare sale payload
    const salePayloadForFirestore: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: any, updatedAt?: any } = {
      customerId: formData.customerId || null,
      customerName: selectedCustomer ? selectedCustomer.name : (formData.customerId === CONSUMIDOR_FINAL_SELECT_VALUE || !formData.customerId ? "Consumidor Final" : (customers.find(c=>c.id === formData.customerId)?.name || "Cliente não encontrado")),
      value: parseFloat(String(formData.value)) || 0,
      paymentMethod: formData.paymentMethod,
      date: Timestamp.fromDate(formData.date),
      status: formData.status,
      paymentDueDate: formData.status === 'Pending' && formData.paymentDueDate ? Timestamp.fromDate(formData.paymentDueDate) : null,
      gasCanistersQuantity: parseInt(String(formData.gasCanistersQuantity)) || 0,
      observations: formData.observations || '',
      subtractFromStock: formData.subtractFromStock,
    };

    try {
      const batch = writeBatch(db);
      let saleIdForStockMovement: string;
      let saleDocRef;

      if (editingSale) {
        saleDocRef = doc(db, 'sales', editingSale.id);
        batch.update(saleDocRef, {
          ...salePayloadForFirestore,
          updatedAt: serverTimestamp(),
        });
        saleIdForStockMovement = editingSale.id;
      } else {
        saleDocRef = doc(collection(db, 'sales')); 
        batch.set(saleDocRef, {
          ...salePayloadForFirestore,
          createdAt: serverTimestamp(),
        });
        saleIdForStockMovement = saleDocRef.id;
      }

      // Handle stock movement
      if (formData.subtractFromStock && saleIdForStockMovement && salePayloadForFirestore.gasCanistersQuantity > 0) {
        const stockMovementRef = doc(collection(db, 'stockMovements'));
        const stockMovementPayload: Omit<StockMovementEntry, 'id' | 'createdAt'> = {
          type: 'OUTPUT',
          origin: 'Venda',
          quantity: salePayloadForFirestore.gasCanistersQuantity,
          notes: `Saída automática por venda ID: ${saleIdForStockMovement}`,
          relatedSaleId: saleIdForStockMovement,
          createdAt: Timestamp.now() // This will be overwritten by serverTimestamp in a real scenario but good for type
        };
        batch.set(stockMovementRef, {
          ...stockMovementPayload,
          createdAt: serverTimestamp(), // Use serverTimestamp for actual creation
        });
      }
      
      // Handle default entry creation/update/deletion
      const defaultsQuery = query(collection(db, "defaults"), where("saleId", "==", saleIdForStockMovement), limit(1));
      const defaultsSnapshot = await getDocs(defaultsQuery);
      const existingDefaultDoc = defaultsSnapshot.docs.length > 0 ? defaultsSnapshot.docs[0] : null;

      if (salePayloadForFirestore.status === 'Pending' && salePayloadForFirestore.paymentDueDate) {
        const defaultPayload: Omit<DefaultEntry, 'id' | 'createdAt' | 'updatedAt'> & {createdAt?: any, updatedAt?: any} = {
            customerId: salePayloadForFirestore.customerId,
            customerName: salePayloadForFirestore.customerName,
            value: salePayloadForFirestore.value,
            dueDate: salePayloadForFirestore.paymentDueDate, // This is already a Timestamp
            paymentStatus: 'Pending', // A sale with 'Pending' status means the default is also 'Pending'
            saleId: saleIdForStockMovement,
        };
        if (existingDefaultDoc) {
            batch.update(existingDefaultDoc.ref, {...defaultPayload, updatedAt: serverTimestamp()});
        } else {
            const newDefaultRef = doc(collection(db, 'defaults'));
            batch.set(newDefaultRef, {...defaultPayload, createdAt: serverTimestamp()});
        }
      } else if (existingDefaultDoc) { 
        // If sale is no longer 'Pending' or has no due date, or if sale is 'Paid', remove/update the default
        if (salePayloadForFirestore.status === 'Paid') {
          batch.update(existingDefaultDoc.ref, { paymentStatus: 'Paid', updatedAt: serverTimestamp() });
        } else {
          // If not 'Pending' and not 'Paid' (e.g., "Overdue" without a specific due date in sales form, or status changed)
          // we might want to delete it if it's no longer relevant as a "pending payment" from the sale's perspective.
          // Or, if the sale status is "Overdue", the default should remain "Pending" or become "Overdue".
          // For now, if not 'Pending' and not 'Paid', and has an associated default, delete the default.
          // This logic might need refinement based on exact business rules for "Overdue" status from sales.
          batch.delete(existingDefaultDoc.ref);
        }
      }


      await batch.commit();

      toast({ 
        title: editingSale ? "Venda Atualizada!" : "Venda Registrada!", 
        description: (editingSale ? "Os dados da venda" : "A nova venda") + 
                     " e quaisquer pendências/estoque associados foram atualizados." 
      });
      
      setIsFormOpen(false);
      await revalidateSalesRelatedPages();
      fetchSales();
    } catch (e: unknown) {
      console.error('Error saving sale and/or stock movement/default:', e);
      let errorMessage = 'Falha ao salvar venda/movimentação de estoque/pendência.';
       if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      toast({ variant: "destructive", title: "Erro ao Salvar", description: errorMessage });
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
                  <TableHead>Data Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Venc. Pag.</TableHead>
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
                    <TableCell>
                      {sale.status === 'Pending' && sale.paymentDueDate 
                        ? format(sale.paymentDueDate instanceof Timestamp ? sale.paymentDueDate.toDate() : sale.paymentDueDate, "dd/MM/yyyy") 
                        : "-"}
                    </TableCell>
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
              
              {formData.status === 'Pending' && (
                <div className="space-y-1">
                  <Label htmlFor="paymentDueDate" className="text-muted-foreground">Data Venc. Pagamento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-input text-foreground hover:bg-accent-hover-bg hover:text-accent-foreground",
                          !formData.paymentDueDate && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.paymentDueDate ? format(formData.paymentDueDate, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card">
                      <Calendar
                        mode="single"
                        selected={formData.paymentDueDate}
                        onSelect={(date) => setFormData({...formData, paymentDueDate: date || null})}
                        initialFocus
                        disabled={isSubmitting}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

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
