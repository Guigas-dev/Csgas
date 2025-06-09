
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { DefaultEntry, DefaultFormData } from "./actions";
import { revalidateDefaultsRelatedPages } from "./actions";
import type { Customer } from "../customers/actions";
import { useAuth } from "@/contexts/auth-context";


const paymentStatuses = ["Pending", "Paid"];
const CONSUMIDOR_FINAL_SELECT_VALUE = "_CONSUMIDOR_FINAL_";


export default function DefaultsPage() {
  const [defaults, setDefaults] = useState<DefaultEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefault, setEditingDefault] = useState<DefaultEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const initialFormData = useMemo((): DefaultFormData => ({
    customerId: null,
    customerName: 'Consumidor Final',
    value: 0,
    dueDate: new Date(),
    paymentStatus: 'Pending',
    saleId: '',
  }), []);

  const [formData, setFormData] = useState<DefaultFormData>(initialFormData);

  const fetchDefaults = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "defaults"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const defaultsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
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

  useEffect(() => {
    fetchDefaults();

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
        setFormData(prev => ({
          ...initialFormData,
          dueDate: new Date()
        }));
      }
    }
  }, [isFormOpen, editingDefault, customers, initialFormData]);

  const handleAddDefault = () => {
    setEditingDefault(null);
    setFormData(prev => ({
      ...initialFormData,
      dueDate: new Date()
    }));
    setIsFormOpen(true);
  };

  const handleEditDefault = (defaultItem: DefaultEntry) => {
    setEditingDefault(defaultItem);
    setIsFormOpen(true); 
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para esta ação." });
      return;
    }
    setIsSubmitting(true);
    try {
      const defaultRef = doc(db, 'defaults', id);
      await updateDoc(defaultRef, {
        paymentStatus: "Paid",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Pendência Paga!", description: "O status da pendência foi atualizado para pago."});
      await revalidateDefaultsRelatedPages();
      fetchDefaults();
    } catch (e: unknown) {
      console.error('Error marking default as paid:', e);
      let errorMessage = 'Falha ao marcar como pago.';
      if (e instanceof Error) errorMessage = e.message; else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao atualizar", description: errorMessage });
    }
    setIsSubmitting(false);
  };

  const handleDeleteDefault = async (id: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para esta ação." });
      return;
    }
    if (!confirm("Tem certeza que deseja excluir esta pendência?")) return;
    setIsSubmitting(true);
    try {
      const defaultRef = doc(db, 'defaults', id);
      await deleteDoc(defaultRef);
      toast({ title: "Pendência excluída!", description: "O registro foi removido com sucesso." });
      await revalidateDefaultsRelatedPages();
      fetchDefaults();
    } catch (e: unknown) {
      console.error('Error deleting default:', e);
      let errorMessage = 'Falha ao excluir pendência.';
      if (e instanceof Error) errorMessage = e.message; else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao excluir", description: errorMessage });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para esta ação." });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);

    const selectedCustomer = formData.customerId ? customers.find(c => c.id === formData.customerId) : null;
    const payload: Omit<DefaultEntry, 'id' | 'createdAt' | 'updatedAt' | 'dueDate'> & { dueDate: Timestamp; createdAt?: any; updatedAt?: any } = {
      customerId: formData.customerId || null,
      customerName: selectedCustomer ? selectedCustomer.name : (formData.customerId === null ? "Consumidor Final" : "Cliente não encontrado"),
      value: parseFloat(String(formData.value)) || 0,
      dueDate: Timestamp.fromDate(formData.dueDate),
      paymentStatus: formData.paymentStatus,
      saleId: formData.saleId || '',
    };

    try {
      if (editingDefault) {
        const defaultRef = doc(db, 'defaults', editingDefault.id);
        await updateDoc(defaultRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Pendência Atualizada!", description: "Os dados da pendência foram atualizados."});
      } else {
        await addDoc(collection(db, 'defaults'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Pendência Adicionada!", description: "Nova pendência registrada com sucesso."});
      }
      setIsFormOpen(false);
      await revalidateDefaultsRelatedPages();
      fetchDefaults();
    } catch (e: unknown) {
      console.error('Error saving default:', e);
      let errorMessage = 'Falha ao salvar pendência.';
      if (e instanceof Error) errorMessage = e.message; else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao salvar", description: errorMessage });
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

      <Sheet open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editingDefault ? "Editar Pendência" : "Adicionar Nova Pendência"}</SheetTitle>
            <SheetDescription>
              Preencha os detalhes da pendência de pagamento.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <form onSubmit={handleFormSubmit} id="default-form" className="py-4 pr-6 space-y-4">
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
            </form>
          </ScrollArea>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </SheetClose>
            <Button type="submit" form="default-form" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingDefault ? "Salvar Alterações" : "Adicionar Pendência")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
