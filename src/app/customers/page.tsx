
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  serverTimestamp,
  where 
} from "firebase/firestore";
import type { Customer, CustomerFormData } from "./actions";
import { revalidateCustomersPage } from "./actions";
import { useAuth } from "@/contexts/auth-context";
// import { format } from "date-fns"; // Not strictly needed if no dates displayed here anymore, but kept for safety
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Removed for AI prediction


export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const initialFormData: CustomerFormData = { 
    name: '', 
    cpf: '', 
    street: '',
    number: '',
    neighborhood: '',
    referencePoint: '',
    phone: ''
  };
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "customers"), orderBy("name", "asc")); // Order by name
      const querySnapshot = await getDocs(q);
      const customersData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          // Ensure Timestamps are converted if they exist
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
          // data_prevista_proxima_compra: data.data_prevista_proxima_compra, // Removed AI field
          // prediction_reasoning: data.prediction_reasoning, // Removed AI field
        } as Customer;
      });
      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar clientes",
        description: "Não foi possível carregar a lista de clientes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [toast]); 

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ 
      name: customer.name, 
      cpf: customer.cpf, 
      street: customer.street || '',
      number: customer.number || '',
      neighborhood: customer.neighborhood || '',
      referencePoint: customer.referencePoint || '',
      phone: customer.phone 
    });
    setIsFormOpen(true);
  };
  
  const handleDeleteCustomer = async (id: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para excluir." });
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    setIsSubmitting(true);
    try {
      const customerRef = doc(db, 'customers', id);
      await deleteDoc(customerRef);
      toast({ title: "Cliente excluído!", description: "O cliente foi removido com sucesso." });
      await revalidateCustomersPage(); 
      fetchCustomers(); 
    } catch (e: unknown) {
      console.error('Error deleting customer:', e);
      let errorMessage = 'Falha ao excluir cliente.';
      if (e instanceof Error) errorMessage = e.message;
      else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao excluir", description: errorMessage });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para salvar." });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    
    try {
      if (editingCustomer) {
        if (formData.cpf !== editingCustomer.cpf) {
          const q = query(collection(db, "customers"), where("cpf", "==", formData.cpf));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const existingCustomerDoc = querySnapshot.docs.find(d => d.id !== editingCustomer.id);
            if (existingCustomerDoc) {
              toast({
                variant: "destructive",
                title: "Erro ao Atualizar Cliente",
                description: "Já existe outro cliente cadastrado com este CPF.",
              });
              setIsSubmitting(false);
              return;
            }
          }
        }
        const customerRef = doc(db, 'customers', editingCustomer.id);
        await updateDoc(customerRef, {
          ...formData,
          updatedAt: serverTimestamp(), 
        });
        toast({ title: "Cliente atualizado!", description: "Os dados do cliente foram atualizados." });
      } else {
        const q = query(collection(db, "customers"), where("cpf", "==", formData.cpf));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast({
            variant: "destructive",
            title: "Erro ao Adicionar Cliente",
            description: "Já existe um cliente cadastrado com este CPF.",
          });
          setIsSubmitting(false);
          return;
        }
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(), 
        });
        toast({ title: "Cliente adicionado!", description: "Novo cliente cadastrado com sucesso." });
      }
      setIsFormOpen(false);
      await revalidateCustomersPage(); 
      fetchCustomers(); 
    } catch (e: unknown) {
      console.error('Error saving customer:', e);
      let errorMessage = 'Falha ao salvar cliente.';
       if (e instanceof Error) errorMessage = e.message;
       else if (typeof e === 'string') errorMessage = e;
      toast({ variant: "destructive", title: "Erro ao salvar", description: errorMessage });
    }
    setIsSubmitting(false);
  };


  return (
    <div>
      <PageHeader
        title="Gerenciamento de Clientes"
        description="Adicione, edite ou remova registros de clientes."
        actions={
          <Button onClick={handleAddCustomer} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Cliente
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando clientes...</p>
            </div>
          ) : (
            // <TooltipProvider> // Removed TooltipProvider for AI
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Telefone</TableHead>
                  {/* <TableHead>Próx. Compra (IA)</TableHead> // Removed AI column */}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.cpf}</TableCell>
                    <TableCell>
                      {`${customer.street || ''}${customer.number ? `, ${customer.number}` : ''}${customer.neighborhood ? ` - ${customer.neighborhood}` : ''}` || 'N/A'}
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    {/* <TableCell> // Removed AI cell content
                      {customer.data_prevista_proxima_compra ? (
                        isValidDateString(customer.data_prevista_proxima_compra) ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default flex items-center">
                                {format(new Date(customer.data_prevista_proxima_compra as string), "dd/MM/yy")}
                                {customer.prediction_reasoning && <Info className="h-3 w-3 ml-1 text-muted-foreground" />}
                              </span>
                            </TooltipTrigger>
                            {customer.prediction_reasoning && (
                              <TooltipContent className="bg-popover text-popover-foreground max-w-xs p-2">
                                <p className="text-xs font-medium">Raciocínio da IA:</p>
                                <p className="text-xs">{customer.prediction_reasoning}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        ) : (
                           <Tooltip>
                            <TooltipTrigger asChild>
                               <span className="cursor-default flex items-center">
                                {customer.data_prevista_proxima_compra}
                                {customer.prediction_reasoning && <Info className="h-3 w-3 ml-1 text-muted-foreground" />}
                               </span>
                            </TooltipTrigger>
                            {customer.prediction_reasoning && (
                              <TooltipContent className="bg-popover text-popover-foreground max-w-xs p-2">
                                <p className="text-xs font-medium">Raciocínio da IA:</p>
                                <p className="text-xs">{customer.prediction_reasoning}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )
                      ) : (
                        "N/D" 
                      )}
                    </TableCell> */}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCustomer(customer)} className="hover:text-accent" disabled={isSubmitting}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomer(customer.id)} className="hover:text-destructive" disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            // </TooltipProvider> // Removed TooltipProvider for AI
          )}
          {!isLoading && customers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum cliente cadastrado.</p>
          )}
        </CardContent>
      </Card>

      <Sheet open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editingCustomer ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</SheetTitle>
            <SheetDescription>
              {editingCustomer ? 'Atualize os dados do cliente.' : 'Preencha os dados do novo cliente.'}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <form onSubmit={handleFormSubmit} id="customer-form" className="py-4 pr-6 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-muted-foreground">
                  Nome
                </Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cpf" className="text-muted-foreground">
                  CPF
                </Label>
                <Input id="cpf" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="neighborhood" className="text-muted-foreground">Bairro</Label>
                <Input id="neighborhood" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="street" className="text-muted-foreground">Rua</Label>
                <Input id="street" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="number" className="text-muted-foreground">Número</Label>
                <Input id="number" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="referencePoint" className="text-muted-foreground">Ponto de Referência (Opcional)</Label>
                <Input id="referencePoint" value={formData.referencePoint || ''} onChange={e => setFormData({...formData, referencePoint: e.target.value})} className="bg-input text-foreground" disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-muted-foreground">
                  Telefone
                </Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-input text-foreground" disabled={isSubmitting}/>
              </div>
            </form>
          </ScrollArea>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </SheetClose>
            <Button type="submit" form="customer-form" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingCustomer ? 'Salvar Alterações' : 'Adicionar Cliente')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
