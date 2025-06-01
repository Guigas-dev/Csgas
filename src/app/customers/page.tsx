
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
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

// Dummy data for now
const initialCustomers = [
  { id: "1", name: "João Silva", cpf: "123.456.789-00", address: "Rua A, 123, Centro", phone: "(11) 98765-4321" },
  { id: "2", name: "Maria Oliveira", cpf: "987.654.321-00", address: "Av. B, 456, Bairro Sul", phone: "(21) 91234-5678" },
  { id: "3", name: "Carlos Pereira", cpf: "111.222.333-44", address: "Praça C, 789, Vila Nova", phone: "(31) 99999-8888" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<typeof initialCustomers[0] | null>(null);

  const [formData, setFormData] = useState({ name: '', cpf: '', address: '', phone: ''});

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setFormData({ name: '', cpf: '', address: '', phone: ''});
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: typeof initialCustomers[0]) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setIsFormOpen(true);
  };
  
  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    // Add toast notification here
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...formData, id: c.id } : c));
      // Add toast: "Cliente atualizado!"
    } else {
      setCustomers(prev => [...prev, { ...formData, id: String(Date.now()) }]);
      // Add toast: "Cliente adicionado!"
    }
    setIsFormOpen(false);
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditCustomer(customer)} className="hover:text-accent">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomer(customer.id)} className="hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {customers.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum cliente cadastrado.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-input text-foreground" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cpf" className="text-muted-foreground">
                  CPF
                </Label>
                <Input id="cpf" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="bg-input text-foreground" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-muted-foreground">
                  Endereço
                </Label>
                <Input id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-input text-foreground" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-muted-foreground">
                  Telefone
                </Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-input text-foreground" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">{editingCustomer ? 'Salvar Alterações' : 'Adicionar Cliente'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
