
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Customer, CustomerFormData } from "./actions";
import { addCustomer, updateCustomer, deleteCustomer } from "./actions";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const initialFormData: CustomerFormData = { name: '', cpf: '', address: '', phone: ''};
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const customersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
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
    fetchCustomers();
  }, [toast]);

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, cpf: customer.cpf, address: customer.address, phone: customer.phone });
    setIsFormOpen(true);
  };
  
  const handleDeleteCustomer = async (id: string) => {
    // Basic confirmation for now
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    setIsSubmitting(true);
    const result = await deleteCustomer(id);
    if (result.success) {
      toast({ title: "Cliente excluído!", description: "O cliente foi removido com sucesso." });
      // Optimistic update or re-fetch, revalidatePath handles this mostly
      setCustomers(prev => prev.filter(c => c.id !== id));
    } else {
      toast({ variant: "destructive", title: "Erro ao excluir", description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let result;
    if (editingCustomer) {
      result = await updateCustomer(editingCustomer.id, formData);
      if (result.success) {
        toast({ title: "Cliente atualizado!", description: "Os dados do cliente foram atualizados." });
      }
    } else {
      result = await addCustomer(formData);
      if (result.success) {
        toast({ title: "Cliente adicionado!", description: "Novo cliente cadastrado com sucesso." });
      }
    }

    if (result.success) {
      setIsFormOpen(false);
      // Data will be re-fetched by revalidatePath, but we can optimistically update for quicker UI response
      // For simplicity, we rely on revalidatePath and useEffect re-fetch for now or manually trigger
    } else {
      toast({ variant: "destructive", title: "Erro ao salvar", description: result.error });
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
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.cpf}</TableCell>
                    <TableCell>{customer.address}</TableCell>
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
          )}
          {!isLoading && customers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum cliente cadastrado.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingCustomer ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Atualize os dados do cliente.' : 'Preencha os dados do novo cliente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4 py-4">
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
                <Label htmlFor="address" className="text-muted-foreground">
                  Endereço
                </Label>
                <Input id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-input text-foreground" disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-muted-foreground">
                  Telefone
                </Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-input text-foreground" disabled={isSubmitting}/>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingCustomer ? 'Salvar Alterações' : 'Adicionar Cliente')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
