
"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
} from "firebase/firestore";
import type { Customer, CustomerFormData } from "./actions";
import { addCustomer, updateCustomer, deleteCustomer } from "./actions";
import { useAuth } from "@/contexts/auth-context";

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const [allCustomersCache, setAllCustomersCache] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData: CustomerFormData = useMemo(() => ({ 
    name: '', 
    cpf: '', 
    street: '',
    number: '',
    neighborhood: '',
    referencePoint: '',
    phone: ''
  }), []);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "customers"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const customersData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
          id: docSnap.id,
          name: data.name,
          cpf: data.cpf,
          street: data.street,
          number: data.number,
          neighborhood: data.neighborhood,
          referencePoint: data.referencePoint,
          phone: data.phone,
        } as Customer;
      });
      setAllCustomersCache(customersData);
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
  }, []); 

  const filteredCustomers = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowercasedSearchTerm) {
      return allCustomersCache;
    }
    return allCustomersCache.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedSearchTerm) ||
      customer.cpf.toLowerCase().includes(lowercasedSearchTerm) ||
      (customer.phone && customer.phone.toLowerCase().includes(lowercasedSearchTerm)) ||
      (customer.street && customer.street.toLowerCase().includes(lowercasedSearchTerm)) ||
      (customer.neighborhood && customer.neighborhood.toLowerCase().includes(lowercasedSearchTerm)) ||
      (customer.referencePoint && customer.referencePoint.toLowerCase().includes(lowercasedSearchTerm))
    );
  }, [allCustomersCache, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, allCustomersCache]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);


  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1)); // Ensure totalPages is at least 1
  };

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
    const result = await deleteCustomer(id);
    if (result.success) {
      toast({ title: "Cliente excluído!", description: "O cliente foi removido com sucesso." });
      await fetchCustomers();
    } else {
      toast({ variant: "destructive", title: "Erro ao excluir", description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para salvar." });
      return;
    }
    setIsSubmitting(true);
    
    let result;
    if (editingCustomer) {
      result = await updateCustomer(editingCustomer.id, formData);
    } else {
      result = await addCustomer(formData);
    }

    if (result.success) {
      toast({ 
        title: editingCustomer ? "Cliente atualizado!" : "Cliente adicionado!", 
        description: `Os dados do cliente foram ${editingCustomer ? 'atualizados' : 'cadastrados'}.` 
      });
      setIsFormOpen(false);
      await fetchCustomers();
    } else {
      toast({ 
        variant: "destructive", 
        title: editingCustomer ? "Erro ao Atualizar" : "Erro ao Adicionar", 
        description: result.error 
      });
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
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Lista de Clientes</CardTitle>
            <div className="relative w-full sm:w-auto sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, telefone, endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando clientes...</p>
            </div>
          ) : allCustomersCache.length === 0 ? (
             <p className="text-center text-muted-foreground py-10">Nenhum cliente cadastrado.</p>
          ) : filteredCustomers.length === 0 ? (
             <p className="text-center text-muted-foreground py-10">Nenhum cliente encontrado para "{searchTerm}".</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.cpf}</TableCell>
                      <TableCell>
                        {`${customer.street || ''}${customer.number ? `, ${customer.number}` : ''}${customer.neighborhood ? ` - ${customer.neighborhood}` : ''}` || 'N/A'}
                      </TableCell>
                      <TableCell>{customer.phone}</TableCell>
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
              
              {totalPages > 0 && (
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
    
