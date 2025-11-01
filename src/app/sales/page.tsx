
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Filter, UserPlus, Package, Loader2, Calendar as CalendarIcon, Zap, Users as UsersIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfDay, endOfDay } from "date-fns";
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
  Timestamp,
} from "firebase/firestore";
import type { Sale as FirestoreSale, SaleFormData } from "./actions";
import { addOrUpdateSale, deleteSale } from "./actions";
import type { Customer } from "../customers/actions";
import { useAuth } from "@/contexts/auth-context";

const basePaymentMethods = ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"];
const customerSpecificPaymentMethod = "Talão de luz";

const saleStatuses = [
    { value: "Paid", label: "Pago"},
    { value: "Pending", label: "Pendente"},
    { value: "Overdue", label: "Atrasado"}
];

const ITEMS_PER_PAGE = 10;

// Local type for page state, converting Timestamps to Dates for UI components
type SaleForPage = Omit<FirestoreSale, 'date' | 'paymentDueDate' | 'createdAt' | 'updatedAt'> & {
  date: Date;
  paymentDueDate: Date | null;
  createdAt?: Timestamp;
};


interface SalesFilterCriteria {
  customerName: string;
  status: string; 
  paymentMethod: string; 
  startDate: Date | null;
  endDate: Date | null;
}

export default function SalesPage() {
  const [allSalesCache, setAllSalesCache] = useState<SaleForPage[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleForPage[]>([]);
  const [paginatedSales, setPaginatedSales] = useState<SaleForPage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleForPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter(); 

  const [isSaleTypeDialogOpen, setIsSaleTypeDialogOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [saleMode, setSaleMode] = useState<'quick' | 'customer' | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [costPrice, setCostPrice] = useState(94.00);

  const initialFilterCriteria: SalesFilterCriteria = useMemo(() => ({
    customerName: '',
    status: 'All',
    paymentMethod: 'All',
    startDate: null,
    endDate: null,
  }), []);
  const [filterCriteria, setFilterCriteria] = useState<SalesFilterCriteria>(initialFilterCriteria);
  
  const getAvailablePaymentMethods = useCallback((currentSaleMode: 'quick' | 'customer' | null, currentEditingSale: SaleForPage | null) => {
    const isCustomerSale = currentSaleMode === 'customer' || (currentEditingSale && currentEditingSale.customerId);
    if (isCustomerSale) {
      return [...basePaymentMethods, customerSpecificPaymentMethod];
    }
    return basePaymentMethods;
  }, []);

  const availablePaymentMethods = useMemo(() => getAvailablePaymentMethods(saleMode, editingSale), [saleMode, editingSale, getAvailablePaymentMethods]);

  const initialFormData = useMemo((): SaleFormData => ({
    customerId: null,
    customerName: "Consumidor Final", 
    value: 0,
    paymentMethod: basePaymentMethods[0] || '',
    date: new Date(),
    status: 'Paid',
    paymentDueDate: null,
    gasCanistersQuantity: 1,
    observations: '',
    subtractFromStock: true,
    custo_botijao: costPrice,
  }), [costPrice]);

  const [formData, setFormData] = useState<SaleFormData>(initialFormData);

  useEffect(() => {
    const storedPricesJSON = localStorage.getItem('gasPrices');
    if (storedPricesJSON) {
      try {
        const parsedPrices = JSON.parse(storedPricesJSON);
        if (parsedPrices && typeof parsedPrices.current === 'number') {
          setCostPrice(parsedPrices.current);
        }
      } catch (error) {
        console.error("Failed to parse gas prices from localStorage for cost price:", error);
      }
    }
  }, []);

  const applyFilters = useCallback((dataToFilter: SaleForPage[], criteria: SalesFilterCriteria) => {
    let processedSales = [...dataToFilter];

    if (criteria.customerName) {
      processedSales = processedSales.filter(sale =>
        sale.customerName?.toLowerCase().includes(criteria.customerName.toLowerCase())
      );
    }
    if (criteria.status && criteria.status !== "All") {
      processedSales = processedSales.filter(sale => sale.status === criteria.status);
    }
    if (criteria.paymentMethod && criteria.paymentMethod !== "All") {
      processedSales = processedSales.filter(sale => sale.paymentMethod === criteria.paymentMethod);
    }
    if (criteria.startDate) {
      const startDateFilter = startOfDay(criteria.startDate);
      processedSales = processedSales.filter(sale => {
        const saleDate = sale.date; // Already a Date object
        return saleDate >= startDateFilter;
      });
    }
    if (criteria.endDate) {
      const endDateFilter = endOfDay(criteria.endDate);
      processedSales = processedSales.filter(sale => {
        const saleDate = sale.date; // Already a Date object
        return saleDate <= endDateFilter;
      });
    }
    setFilteredSales(processedSales);
    setCurrentPage(1); 
  }, []);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          customerId: data.customerId,
          customerName: data.customerName,
          value: data.value,
          paymentMethod: data.paymentMethod,
          status: data.status,
          gasCanistersQuantity: data.gasCanistersQuantity,
          observations: data.observations,
          subtractFromStock: data.subtractFromStock,
          lucro_bruto: data.lucro_bruto,
          custo_botijao: data.custo_botijao,
          date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(),
          paymentDueDate: (data.paymentDueDate as Timestamp)?.toDate ? (data.paymentDueDate as Timestamp).toDate() : null,
          createdAt: data.createdAt,
        } as SaleForPage;
      });
      setAllSalesCache(salesData);
      applyFilters(salesData, filterCriteria); 
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
  }, [toast, filterCriteria, applyFilters]);


  useEffect(() => {
    fetchSales();

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
  }, [fetchSales, toast]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedSales(filteredSales.slice(startIndex, endIndex));
  }, [filteredSales, currentPage]);


  useEffect(() => {
    if (isFormOpen) {
      setCustomerSearchTerm(''); 
      const currentAvailablePaymentMethods = getAvailablePaymentMethods(saleMode, editingSale);
      let defaultPaymentMethod = currentAvailablePaymentMethods[0] || '';

      if (editingSale) {
        setSaleMode(editingSale.customerId ? 'customer' : 'quick');
        const customer = customers.find(c => c.id === editingSale.customerId);
        if (!currentAvailablePaymentMethods.includes(editingSale.paymentMethod)) {
          defaultPaymentMethod = currentAvailablePaymentMethods[0] || '';
        } else {
          defaultPaymentMethod = editingSale.paymentMethod;
        }
        setFormData({
          customerId: editingSale.customerId || null,
          customerName: editingSale.customerName || (editingSale.customerId ? (customer?.name || "") : "Consumidor Final"),
          value: editingSale.value,
          paymentMethod: defaultPaymentMethod,
          date: editingSale.date,
          status: editingSale.status,
          paymentDueDate: editingSale.paymentDueDate,
          gasCanistersQuantity: editingSale.gasCanistersQuantity,
          observations: editingSale.observations || '',
          subtractFromStock: editingSale.subtractFromStock !== undefined ? editingSale.subtractFromStock : true,
          custo_botijao: editingSale.custo_botijao || costPrice,
        });
      } else {
         if (saleMode === 'quick') {
            setFormData({
                ...initialFormData, 
                paymentMethod: currentAvailablePaymentMethods[0] || '',
                customerId: null,
                date: new Date(),
                paymentDueDate: null,
            });
        } else { 
            setFormData({
                ...initialFormData,
                paymentMethod: currentAvailablePaymentMethods[0] || '',
                customerId: null, 
                customerName: "", 
                date: new Date(),
                paymentDueDate: null,
            });
        }
      }
    }
  }, [isFormOpen, editingSale, customers, initialFormData, saleMode, getAvailablePaymentMethods, costPrice]);

  useEffect(() => {
    if (formData.status !== 'Pending') {
      setFormData(prev => ({ ...prev, paymentDueDate: null }));
    }
  }, [formData.status]);

  const openSaleTypeSelectionDialog = () => {
    setIsSaleTypeDialogOpen(true);
  };

  const handleInitiateQuickSale = () => {
    setEditingSale(null);
    setSaleMode('quick');
    setIsFormOpen(true);
    setIsSaleTypeDialogOpen(false);
  };

  const handleInitiateRegisteredCustomerSale = () => {
    setEditingSale(null);
    setSaleMode('customer');
    setIsFormOpen(true);
    setIsSaleTypeDialogOpen(false);
  };


  const handleEditSale = (sale: SaleForPage) => {
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
    const result = await deleteSale(id);
    if(result.success) {
      toast({ title: "Venda Removida!", description: "O registro da venda e qualquer pendência associada foram removidos." });
      await fetchSales();
    } else {
      toast({ variant: "destructive", title: "Erro ao excluir", description: result.error });
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
      return;
    }
    setIsSubmitting(true);
    
    const customersForAction = customers.map(c => ({ id: c.id, name: c.name }));

    // Ensure the latest cost price is included in the payload
    const payload = { ...formData, custo_botijao: costPrice };

    const result = await addOrUpdateSale(
      payload,
      customersForAction,
      saleMode,
      editingSale?.id
    );

    if (result.success) {
      toast({ 
        title: editingSale ? "Venda Atualizada!" : "Venda Registrada!", 
        description: (editingSale ? "Os dados da venda" : "A nova venda") + 
                     " e quaisquer pendências/estoque associados foram atualizados." 
      });
      setIsFormOpen(false);
      await fetchSales();
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

  const handleApplyFilters = () => {
    applyFilters(allSalesCache, filterCriteria);
    setIsFilterSheetOpen(false);
  };

  const handleClearFilters = () => {
    setFilterCriteria(initialFilterCriteria);
    applyFilters(allSalesCache, initialFilterCriteria); 
    setIsFilterSheetOpen(false);
  };

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const showQuickSaleNameField = (saleMode === 'quick' && !editingSale) || (editingSale && !editingSale.customerId && !customers.find(c => c.id === editingSale.customerId));


  const filteredCustomersForSelect = useMemo(() => {
    if (!customerSearchTerm) return customers;
    return customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );
  }, [customers, customerSearchTerm]);

  const allPaymentMethodsForFilter = useMemo(() => [...basePaymentMethods, customerSpecificPaymentMethod], []);


  return (
    <div>
      <PageHeader
        title="Registro de Vendas"
        description="Gerencie o histórico de vendas e registre novas transações."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="text-foreground border-input hover:bg-accent-hover-bg hover:text-accent-foreground"
              onClick={() => setIsFilterSheetOpen(true)}
            >
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
            <Button onClick={openSaleTypeSelectionDialog} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Registrar Venda
            </Button>
          </div>
        }
      />

      <AlertDialog open={isSaleTypeDialogOpen} onOpenChange={setIsSaleTypeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selecione o Tipo de Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha se a venda é para um cliente não cadastrado (rápida) ou para um cliente existente/novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              variant="outline"
              onClick={handleInitiateQuickSale}
              className="w-40 h-40 p-4 text-sm flex flex-col items-center justify-center text-center gap-2 rounded-lg"
            >
              <Zap className="h-7 w-7 mb-1" />
              <span className="whitespace-normal">Venda Rápida (Consumidor Final)</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleInitiateRegisteredCustomerSale}
              className="w-40 h-40 p-4 text-sm flex flex-col items-center justify-center text-center gap-2 rounded-lg"
            >
              <UsersIcon className="h-7 w-7 mb-1" />
              <span className="whitespace-normal">Venda para Cliente Cadastrado</span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Lucro Bruto</TableHead>
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
                  {paginatedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.customerName || "Consumidor Final"}</TableCell>
                      <TableCell>{formatCurrency(sale.value)}</TableCell>
                      <TableCell>{sale.lucro_bruto !== undefined ? formatCurrency(sale.lucro_bruto) : "N/A"}</TableCell>
                      <TableCell>{sale.paymentMethod}</TableCell>
                      <TableCell>{format(sale.date, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{saleStatuses.find(s => s.value === sale.status)?.label || sale.status}</TableCell>
                      <TableCell>
                        {sale.status === 'Pending' && sale.paymentDueDate 
                          ? format(sale.paymentDueDate, "dd/MM/yyyy") 
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
              {!isLoading && paginatedSales.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma venda encontrada para os filtros atuais.</p>}
            </>
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
        </CardContent>
      </Card>

      {/* Formulário de Venda (Sheet) */}
      <Sheet open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-foreground">
                 {editingSale
                    ? `Editar Venda ${editingSale.customerId ? '(Cliente)' : '(Rápida)'}`
                    : saleMode === 'quick'
                    ? "Nova Venda Rápida"
                    : "Nova Venda para Cliente"}
            </SheetTitle>
            <SheetDescription>
              {editingSale ? "Atualize os detalhes da transação." : "Preencha os detalhes da nova transação."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <form onSubmit={handleFormSubmit} id="sale-form" className="py-4 pr-6 space-y-4">
              
              {showQuickSaleNameField ? (
                <div className="space-y-1">
                  <Label htmlFor="quickSaleCustomerName" className="text-muted-foreground">Nome (Consumidor Final)</Label>
                  <Input
                    id="quickSaleCustomerName"
                    value={formData.customerName}
                    onChange={e => setFormData({...formData, customerName: e.target.value, customerId: null})} 
                    className="bg-input text-foreground"
                    placeholder="Nome do cliente (opcional)"
                    disabled={isSubmitting}
                  />
                </div>
              ) : saleMode === 'customer' || (editingSale && editingSale.customerId) ? ( 
                <div className="space-y-1">
                  <Label htmlFor="customer" className="text-muted-foreground">Cliente</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.customerId || ""}
                      onValueChange={val => {
                          const selectedCust = customers.find(c => c.id === val);
                          setFormData({
                            ...formData, 
                            customerId: val, 
                            customerName: selectedCust?.name || ""
                          });
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
                             <div className="p-2 text-center text-muted-foreground">Nenhum cliente cadastrado. Cadastre um primeiro.</div>
                        ) : filteredCustomersForSelect.length === 0 && customerSearchTerm ? (
                            <div className="p-2 text-center text-muted-foreground">Nenhum cliente encontrado para "{customerSearchTerm}".</div>
                        ): (
                            filteredCustomersForSelect.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="flex-shrink-0" 
                      onClick={() => router.push('/customers')} 
                      disabled={isSubmitting}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null }


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
                  <Input id="value" type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} className="bg-input text-foreground" required disabled={isSubmitting}/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gasCanistersQuantity" className="text-muted-foreground">Quantidade de Botijões</Label>
                  <Input id="gasCanistersQuantity" type="number" value={formData.gasCanistersQuantity} onChange={e => setFormData({...formData, gasCanistersQuantity: parseInt(e.target.value) || 0})} className="bg-input text-foreground" required disabled={isSubmitting}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod" className="text-muted-foreground">Forma de Pagamento</Label>
                  <Select 
                    value={formData.paymentMethod} 
                    onValueChange={val => setFormData({...formData, paymentMethod: val})} 
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full bg-input text-foreground">
                      <SelectValue placeholder="Selecione a forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePaymentMethods.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
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
                        selected={formData.paymentDueDate || undefined}
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

            </form>
          </ScrollArea>
          <SheetFooter>
            <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </SheetClose>
            <Button type="submit" form="sale-form" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting || !!(saleMode === 'customer' && !formData.customerId && !editingSale) || !!(editingSale && editingSale.customerId && !formData.customerId)}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingSale ? "Salvar Alterações" : "Registrar Venda")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Filtros Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-foreground">Filtrar Vendas</SheetTitle>
            <SheetDescription>
              Aplique filtros para refinar a lista de vendas.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow p-1"> 
            <div className="py-4 pr-6 space-y-4"> 
              <div className="space-y-1">
                <Label htmlFor="filterCustomerName" className="text-muted-foreground">Nome do Cliente</Label>
                <Input 
                  id="filterCustomerName" 
                  value={filterCriteria.customerName} 
                  onChange={e => setFilterCriteria(prev => ({...prev, customerName: e.target.value}))}
                  className="bg-input text-foreground"
                  placeholder="Digite parte do nome"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="filterStatus" className="text-muted-foreground">Status da Venda</Label>
                <Select 
                  value={filterCriteria.status} 
                  onValueChange={val => setFilterCriteria(prev => ({...prev, status: val}))}
                >
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Todos os status</SelectItem>
                    {saleStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="filterPaymentMethod" className="text-muted-foreground">Forma de Pagamento</Label>
                <Select 
                  value={filterCriteria.paymentMethod} 
                  onValueChange={val => setFilterCriteria(prev => ({...prev, paymentMethod: val}))}
                >
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder="Todas as formas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Todas as formas</SelectItem>
                    {allPaymentMethodsForFilter.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="filterStartDate" className="text-muted-foreground">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-input text-foreground hover:bg-accent-hover-bg hover:text-accent-foreground",
                        !filterCriteria.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterCriteria.startDate ? format(filterCriteria.startDate, "dd/MM/yyyy") : <span>Data inicial</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card">
                    <Calendar
                      mode="single"
                      selected={filterCriteria.startDate || undefined}
                      onSelect={(date) => setFilterCriteria(prev => ({...prev, startDate: date || null}))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label htmlFor="filterEndDate" className="text-muted-foreground">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-input text-foreground hover:bg-accent-hover-bg hover:text-accent-foreground",
                        !filterCriteria.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterCriteria.endDate ? format(filterCriteria.endDate, "dd/MM/yyyy") : <span>Data final</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card">
                    <Calendar
                      mode="single"
                      selected={filterCriteria.endDate || undefined}
                      onSelect={(date) => setFilterCriteria(prev => ({...prev, endDate: date || null}))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </ScrollArea>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClearFilters}>Limpar Filtros</Button>
            <Button type="button" onClick={handleApplyFilters} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">Aplicar Filtros</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
