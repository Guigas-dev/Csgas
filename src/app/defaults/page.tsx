
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit, PlusCircle, Filter, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
  Timestamp,
} from "firebase/firestore";
import type { DefaultEntry, DefaultFormData } from "./actions";
import { addOrUpdateDefault, deleteDefault, markDefaultAsPaid } from "./actions";
import type { Customer } from "../customers/actions";
import { useAuth } from "@/contexts/auth-context";

const paymentStatuses = ["Pending", "Paid"];
const ITEMS_PER_PAGE = 10;

export default function DefaultsPage() {
  const [allDefaultsCache, setAllDefaultsCache] = useState<DefaultEntry[]>([]);
  const [paginatedDefaults, setPaginatedDefaults] = useState<DefaultEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefault, setEditingDefault] = useState<DefaultEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const initialFormData = useMemo((): DefaultFormData => ({
    customerId: null, 
    customerName: '',   
    value: 0,
    dueDate: new Date(),
    paymentStatus: 'Pending',
    saleId: '',
  }), []);

  const [formData, setFormData] = useState<DefaultFormData>(initialFormData);

  const fetchDefaults = useCallback(async () => {
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
      setAllDefaultsCache(defaultsData);
      setCurrentPage(1);
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
  }, [toast]);

  useEffect(() => {
    fetchDefaults();

    const fetchCustomersData = async () => {
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
    fetchCustomersData();
  }, [fetchDefaults, toast]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedDefaults(allDefaultsCache.slice(startIndex, endIndex));
  }, [allDefaultsCache, currentPage]);

  const totalPages = Math.ceil(allDefaultsCache.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  useEffect(() => {
    if (isFormOpen) {
      setCustomerSearchTerm('');
      if (editingDefault) {
        const customer = customers.find(c => c.id === editingDefault.customerId);
        setFormData({
          customerId: editingDefault.customerId || null,
          customerName: editingDefault.customerName || (editingDefault.customerId ? (customer?.name || "Cliente não encontrado") : ""),
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
    const result = await markDefaultAsPaid(id);
    if(result.success) {
      toast({ title: "Pendência Paga!", description: "O status da pendência foi atualizado para pago."});
      await fetchDefaults();
    } else {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: result.error });
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
    const result = await deleteDefault(id);
    if(result.success) {
      toast({ title: "Pendência excluída!", description: "O registro foi removido com sucesso." });
      await fetchDefaults();
    } else {
      toast({ variant: "destructive", title: "Erro ao excluir", description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para esta ação." });
      return;
    }

    if (!formData.customerId) {
      toast({
        variant: "destructive",
        title: "Cliente Obrigatório",
        description: "Por favor, selecione um cliente para registrar a pendência.",
      });
      return;
    }
    
    setIsSubmitting(true);

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    if (!selectedCustomer) {
        toast({ variant: "destructive", title: "Erro de Cliente", description: "Cliente selecionado não foi encontrado. Tente novamente." });
        setIsSubmitting(false);
        return;
    }

    const payload: DefaultFormData = {
      ...formData,
      customerName: selectedCustomer.name,
    };
    
    const result = await addOrUpdateDefault(payload, editingDefault?.id);

    if (result.success) {
      toast({ 
        title: editingDefault ? "Pendência Atualizada!" : "Pendência Adicionada!", 
        description: `Os dados da pendência foram ${editingDefault ? 'atualizados' : 'adicionados'}.`
      });
      setIsFormOpen(false);
      await fetchDefaults();
    } else {
      toast({ 
        variant: "destructive", 
        title: "Erro ao Salvar", 
        description: result.error 
      });
    }

    setIsSubmitting(false);
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredCustomersForSelect = useMemo(() => {
    if (!customerSearchTerm) return customers;
    return customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );
  }, [customers, customerSearchTerm]);


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
            <>
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
                  {paginatedDefaults.map((item) => (
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
              {!isLoading && paginatedDefaults.length === 0 && allDefaultsCache.length > 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma pendência encontrada para esta página.</p>
              )}
              {!isLoading && allDefaultsCache.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma pendência registrada.</p>
              )}
              {!isLoading && totalPages > 0 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
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
                    value={formData.customerId || ""}
                    onValueChange={val => {
                        const selectedCust = customers.find(c => c.id === val);
                        setFormData({...formData, customerId: val, customerName: selectedCust?.name || "" });
                        setCustomerSearchTerm('');
                    }}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setCustomerSearchTerm('');
                        }
                    }}
                    disabled={isSubmitting || isLoadingCustomers}
                >
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder={isLoadingCustomers ? "Carregando clientes..." : (customers.length === 0 ? "Nenhum cliente cadastrado" : "Selecione um cliente")} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 sticky top-0 bg-popover z-10">
                        <Input
                            placeholder="Pesquisar cliente..."
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            className="mb-2 bg-input text-foreground"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                    {isLoadingCustomers ? (
                        <div className="p-2 text-center text-muted-foreground">Carregando clientes...</div>
                    ) : customers.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground">Nenhum cliente cadastrado.</div>
                    ) : filteredCustomersForSelect.length === 0 && customerSearchTerm ? (
                        <div className="p-2 text-center text-muted-foreground">Nenhum cliente encontrado para "{customerSearchTerm}".</div>
                    ): (
                        filteredCustomersForSelect.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                    )}
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

    
