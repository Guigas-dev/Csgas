
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit, PlusCircle, Filter, Loader2, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import type { DefaultEntry, DefaultFormData } from "./actions";
import { addDefault, updateDefault, deleteDefault, markDefaultAsPaid } from "./actions";
import type { Customer } from "../customers/actions"; // Import Customer type

const paymentStatuses = ["Pending", "Paid"];
const CONSUMIDOR_FINAL_SELECT_VALUE = "_CONSUMIDOR_FINAL_";


export default function DefaultsPage() {
  const [defaults, setDefaults] = useState<DefaultEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]); // State for Firestore customers
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefault, setEditingDefault] = useState<DefaultEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const initialFormData: DefaultFormData = {
    customerId: null, // Null means "Consumidor Final"
    customerName: 'Consumidor Final',
    value: 0,
    dueDate: new Date(),
    paymentStatus: 'Pending',
    saleId: '',
  };
  const [formData, setFormData] = useState<DefaultFormData>(initialFormData);

  useEffect(() => {
    const fetchDefaults = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "defaults"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const defaultsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dueDate: (data.dueDate as Timestamp)?.toDate ? (data.dueDate as Timestamp).toDate() : new Date(),
            createdAt: data.createdAt,
          } as DefaultEntry;
        });
        setDefaults(defaultsData);
      } catch (error) {
        console.error("Error fetching defaults: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao buscar pendências",
          description: "Não foi possível carregar a lista de inadimplências.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const q = query(collection(db, "customers"), orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const customersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
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

    fetchDefaults();
    fetchCustomers();
  }, [toast]);

  useEffect(() => {
    if (isFormOpen) {
      if (editingDefault) {
        const customer = customers.find(c => c.id === editingDefault.customerId);
        setFormData({
          customerId: editingDefault.customerId || null,
          customerName: editingDefault.customerName || (editingDefault.customerId ? (customer?.name || "Cliente não encontrado") : "Consumidor Final"),
          value: editingDefault.value,
          dueDate: editingDefault.dueDate instanceof Date ? editingDefault.dueDate : new Date(editingDefault.dueDate),
          paymentStatus: editingDefault.paymentStatus,
          saleId: editingDefault.saleId || '',
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [isFormOpen, editingDefault, customers]);

  const handleAddDefault = () => {
    setEditingDefault(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleEditDefault = (defaultItem: DefaultEntry) => {
    setEditingDefault(defaultItem);
    setIsFormOpen(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    setIsSubmitting(true);
    const result = await markDefaultAsPaid(id);
    if (result.success) {
        toast({ title: "Pendência Paga!", description: "O status da pendência foi atualizado para pago."});
        // Re-fetch or optimistic update needed
    } else {
        toast({ variant: "destructive", title: "Erro ao atualizar", description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleDeleteDefault = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta pendência?")) return;
    setIsSubmitting(true);
    const result = await deleteDefault(id);
    if (result.success) {
      toast({ title: "Pendência excluída!", description: "O registro foi removido com sucesso." });
      // Re-fetch or optimistic update needed
    } else {
      toast({ variant: "destructive", title: "Erro ao excluir", description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedCustomer = formData.customerId ? customers.find(c => c.id === formData.customerId) : null;
    const defaultPayload: DefaultFormData = {
      ...formData,
      customerId: formData.customerId || null,
      customerName: selectedCustomer ? selectedCustomer.name : (formData.customerId === null ? "Consumidor Final" : "Cliente não encontrado"),
      value: parseFloat(String(formData.value)) || 0,
    };
    
    let result;
    if (editingDefault) {
      result = await updateDefault(editingDefault.id, defaultPayload);
      if (result.success) {
         toast({ title: "Pendência Atualizada!", description: "Os dados da pendência foram atualizados."});
      }
    } else {
      result = await addDefault(defaultPayload);
       if (result.success) {
         toast({ title: "Pendência Adicionada!", description: "Nova pendência registrada com sucesso."});
      }
    }

    if (result.success) {
      setIsFormOpen(false);
      // Data will be re-fetched by revalidatePath
    } else {
      toast({ variant: "destructive", title: "Erro ao salvar", description: result.error });
    }
    setIsSubmitting(false);
  };
  
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


  return (
    <div>
      <PageHeader
        title="Controle de Inadimplência"
        description="Acompanhe e gerencie os pagamentos pendentes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="text-foreground border-input hover:bg-accent-hover-bg hover:text-accent-foreground">
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
            <Button onClick={handleAddDefault} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
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
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando pendências...</p>
            </div>
          ) : (
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
                      <span className={`px-2 py-1 text-xs rounded-full ${item.paymentStatus === "Paid" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                        {item.paymentStatus === "Paid" ? "Pago" : "Pendente"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.paymentStatus === "Pending" && (
                        <Button variant="ghost" size="icon" onClick={() => handleMarkAsPaid(item.id)} className="hover:text-success" title="Marcar como Pago" disabled={isSubmitting}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEditDefault(item)} className="hover:text-accent" disabled={isSubmitting}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteDefault(item.id)} className="hover:text-destructive" disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && defaults.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma pendência registrada.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingDefault ? "Editar Pendência" : "Adicionar Nova Pendência"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da pendência de pagamento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-1">
                <Label htmlFor="customer" className="text-muted-foreground">Cliente</Label>
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
              </div>
              <div className="space-y-1">
                <Label htmlFor="value" className="text-muted-foreground">Valor (R$)</Label>
                <Input id="value" type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
               <div className="space-y-1">
                <Label htmlFor="dueDate" className="text-muted-foreground">Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-input text-foreground hover:bg-accent-hover-bg hover:text-accent-foreground",
                        !formData.dueDate && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentStatus" className="text-muted-foreground">Status</Label>
                 <Select value={formData.paymentStatus} onValueChange={val => setFormData({...formData, paymentStatus: val})} disabled={isSubmitting}>
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder="Status do pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatuses.map(ps => <SelectItem key={ps} value={ps}>{ps === "Paid" ? "Pago" : "Pendente"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-1">
                <Label htmlFor="saleId" className="text-muted-foreground">ID Venda (Opc)</Label>
                <Input id="saleId" value={formData.saleId} onChange={e => setFormData({...formData, saleId: e.target.value})} className="bg-input text-foreground" disabled={isSubmitting}/>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingDefault ? "Salvar Alterações" : "Adicionar Pendência")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
